import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type SessionUser = {
  id: string
  username?: string | null
  email?: string | null
  name?: string | null
  roleId?: string | null
  roleCd?: string | null
  outletId?: string | null
  outletCd?: string | null
  permissions?: string[]
}

export type SessionState<TSessionUser = SessionUser> = {
  session: unknown
  user: TSessionUser | null
} | null

export type MappedUser = SessionUser & {
  user_id: string
  username: string
  role_id: string
  role_cd: string
  outlet_id?: string | null
  outlet_cd?: string | null
  is_delete: string
}

export type AuthLoginResult<TSessionUser> =
  | { success: true; user: TSessionUser }
  | { success: false; error: { message: string } }

export type AuthContextValue<TUser = MappedUser, TSessionUser = SessionUser> = {
  user: TUser | null
  login: (identifier: string, password: string) => Promise<AuthLoginResult<TSessionUser>>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
  loadUser: () => Promise<boolean>
  session: SessionState<TSessionUser>
  sessionExpired: boolean
  clearSessionExpired: () => void
}

/** The error shape Eden returns from a failed call. */
export type AuthError = {
  status?: number
  message?: string
  value?: { error?: string }
}

/**
 * App-specific auth transport. A provider only needs to know how to fetch the
 * current session, sign in, sign out and map the session user to the shape the
 * app renders. Apps that use the BMS/RMS Eden endpoints can keep using
 * `createAuthContext`; apps with a different user shape use this adapter.
 */
export type AuthAdapter<TSessionUser, TUser> = {
  fetchSession: () => Promise<{ data?: SessionState<TSessionUser>; error?: AuthError }>
  login: (
    identifier: string,
    password: string,
  ) => Promise<{ data?: { user: TSessionUser }; error?: AuthError }>
  logout: () => Promise<unknown>
  mapUser: (sessionUser: TSessionUser | null | undefined) => TUser | null
}

/**
 * The app's Eden client, typed loosely here because the kit cannot import the
 * API's route types. These three calls are the only ones the default adapter
 * makes.
 */
export type AuthEden = {
  api: {
    auth: {
      // biome-ignore lint/suspicious/noExplicitAny: boundary to each app's treaty type
      session: { get: (...args: any[]) => Promise<any> }
      // biome-ignore lint/suspicious/noExplicitAny: boundary to each app's treaty type
      login: { post: (...args: any[]) => Promise<any> }
      // biome-ignore lint/suspicious/noExplicitAny: boundary to each app's treaty type
      logout: { post: (...args: any[]) => Promise<any> }
    }
  }
}

export type CreateAuthContextOptions = {
  eden: AuthEden
  /** Session storage key that marks an explicit logout, per app. */
  logoutFlagKey: string
  /** Keys cleared from localStorage on logout (legacy tokens). */
  legacyStorageKeys?: string[]
  /** How often an active tab re-checks the session. */
  sessionCheckIntervalMs?: number
  /** Stop background checks after this much inactivity. */
  idleTimeoutMs?: number
}

export type CreateAuthContextFromAdapterOptions<TSessionUser, TUser> = {
  adapter: AuthAdapter<TSessionUser, TUser>
  /** Session storage key that marks an explicit logout, per app. */
  logoutFlagKey: string
  /** Keys cleared from localStorage on logout (legacy tokens). */
  legacyStorageKeys?: string[]
  /** How often an active tab re-checks the session. */
  sessionCheckIntervalMs?: number
  /** Stop background checks after this much inactivity. */
  idleTimeoutMs?: number
}

export const defaultMapUser = (sessionUser: SessionUser | null | undefined): MappedUser | null => {
  if (!sessionUser) return null
  return {
    user_id: sessionUser.id,
    username: sessionUser.username || sessionUser.email || '',
    role_id: sessionUser.roleId || sessionUser.roleCd || 'STAFF',
    role_cd: sessionUser.roleId || sessionUser.roleCd || 'STAFF',
    name: sessionUser.name,
    email: sessionUser.email,
    outlet_id: sessionUser.outletId || sessionUser.outletCd,
    outlet_cd: sessionUser.outletId || sessionUser.outletCd,
    is_delete: 'N',
    ...sessionUser,
  } as MappedUser
}

function createAuthContextFromAdapter<TSessionUser, TUser>({
  adapter,
  logoutFlagKey,
  legacyStorageKeys = ['token', 'ut'],
  sessionCheckIntervalMs = 5 * 60 * 1000,
  idleTimeoutMs = 30 * 60 * 1000,
}: CreateAuthContextFromAdapterOptions<TSessionUser, TUser>) {
  const AuthContext = createContext<AuthContextValue<TUser, TSessionUser> | null>(null)

  const useAuth = (): AuthContextValue<TUser, TSessionUser> => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within an AuthProvider')
    return context
  }

  const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<SessionState<TSessionUser>>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [sessionExpired, setSessionExpired] = useState(false)
    const sessionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastActivityRef = useRef(Date.now())

    useEffect(() => {
      const handleActivity = () => {
        lastActivityRef.current = Date.now()
      }
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
      events.forEach((e) => {
        window.addEventListener(e, handleActivity)
      })
      return () => {
        events.forEach((e) => {
          window.removeEventListener(e, handleActivity)
        })
      }
    }, [])

    const refetch = useCallback(
      async (options: { silent?: boolean; skipAuthCheck?: boolean } = {}) => {
        const { silent = false, skipAuthCheck = false } = options
        if (!silent) setIsLoading(true)

        try {
          // An explicit logout takes precedence over whatever the server still
          // reports. logout() fires the backend call without awaiting it (see
          // below), so this session fetch — called fresh on the /login page
          // that logout() just navigated to — can win the race and see a
          // not-yet-invalidated session, silently bouncing the user right back
          // in. The flag is consumed (removed) here so it only overrides the
          // one check immediately following an explicit logout.
          if (sessionStorage.getItem(logoutFlagKey)) {
            sessionStorage.removeItem(logoutFlagKey)
            setSession({ session: null, user: null })
            return false
          }
          const { data, error } = await adapter.fetchSession()
          if (error) {
            // The session endpoint always answers 200 with {user:null} for a
            // genuinely logged-out request — an `error` here means the REQUEST
            // itself failed (network blip, CORS, a cold-started instance), not
            // that the user is logged out. On a silent background check (5-min
            // poll, window focus), leave the existing session state alone
            // rather than booting an actually-still-logged-in user; only a
            // clean 200 response with no user is treated as a real logout.
            if (silent) return false
            if (error.status === 401) setSessionExpired(true)
            setSession({ session: null, user: null })
            return false
          }
          const hasValidSession = !!data?.user
          setSession((data as SessionState<TSessionUser>) || { session: null, user: null })
          setSessionExpired(!hasValidSession && !skipAuthCheck)
          return hasValidSession
        } catch {
          // Same reasoning as the error branch above: a thrown fetch exception
          // is a transport failure, not proof the session expired.
          if (silent) return false
          setSession({ session: null, user: null })
          return false
        } finally {
          if (!silent) setIsLoading(false)
        }
      },
      [],
    )

    useEffect(() => {
      refetch()
    }, [refetch])

    useEffect(() => {
      if (sessionCheckIntervalRef.current) clearInterval(sessionCheckIntervalRef.current)
      sessionCheckIntervalRef.current = setInterval(() => {
        const idle = Date.now() - lastActivityRef.current
        if (idle < idleTimeoutMs) refetch({ silent: true, skipAuthCheck: true })
      }, sessionCheckIntervalMs)
      return () => {
        if (sessionCheckIntervalRef.current) clearInterval(sessionCheckIntervalRef.current)
      }
    }, [refetch])

    useEffect(() => {
      const handleFocus = () => refetch({ silent: true, skipAuthCheck: true })
      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }, [refetch])

    const user = session?.user ? adapter.mapUser(session.user) : null
    const isAuthenticated = !!session?.user && !sessionExpired

    const login = useCallback(async (identifier: string, password: string) => {
      try {
        const { data, error } = await adapter.login(identifier, password)
        if (error || !data?.user) {
          const msg = error?.value?.error || error?.message || 'Login failed'
          return { success: false as const, error: { message: msg } }
        }
        setSessionExpired(false)
        // Cookies set by login response; fetch session to hydrate auth state
        const { data: sessionData } = await adapter.fetchSession()
        if (sessionData?.user) {
          setSession(sessionData)
          return { success: true as const, user: sessionData.user }
        }
        // Fallback: use data from login response directly
        setSession({ session: {}, user: data.user })
        return { success: true as const, user: data.user }
      } catch (err) {
        return {
          success: false as const,
          error: { message: (err as Error)?.message || 'Login failed' },
        }
      }
    }, [])

    const logout = useCallback(async () => {
      // Clear local state and let the caller redirect immediately — do not
      // block on the backend call. A cold-started API can take several seconds
      // with zero visual feedback, making "Log out" look broken even though it
      // would have worked eventually. The user's intent to leave the app
      // shouldn't wait on a slow or cold backend.
      //
      // The flag lets the fresh /login page's own session check (see refetch)
      // know this is an explicit logout, so it doesn't get raced by the
      // not-yet-awaited backend call and bounce the user right back in.
      sessionStorage.setItem(logoutFlagKey, '1')
      for (const key of legacyStorageKeys) localStorage.removeItem(key)
      setSession({ session: null, user: null })
      setSessionExpired(false)
      adapter.logout().catch(() => {
        /* best-effort */
      })
    }, [])

    const clearSessionExpired = useCallback(() => setSessionExpired(false), [])
    const loadUser = useCallback(async () => refetch(), [refetch])

    const value = useMemo(
      () => ({
        user,
        login,
        logout,
        isAuthenticated,
        isLoading,
        loadUser,
        session,
        sessionExpired,
        clearSessionExpired,
      }),
      [
        user,
        login,
        logout,
        isAuthenticated,
        isLoading,
        loadUser,
        session,
        sessionExpired,
        clearSessionExpired,
      ],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }

  return { AuthProvider, useAuth }
}

/**
 * Builds the BMS/RMS auth provider from their Eden client. This keeps the
 * original API for existing apps; apps with another user shape use
 * `createAuthContextFromAdapter`.
 */
export function createAuthContext(options: CreateAuthContextOptions) {
  const { eden, ...rest } = options
  return createAuthContextFromAdapter<SessionUser, MappedUser>({
    ...rest,
    adapter: {
      async fetchSession() {
        const { data, error } = await eden.api.auth.session.get()
        return { data: data as SessionState<SessionUser>, error: error as AuthError | undefined }
      },
      async login(identifier, password) {
        const { data, error } = await eden.api.auth.login.post({ username: identifier, password }, {})
        return { data: data as { user: SessionUser } | undefined, error: error as AuthError | undefined }
      },
      logout: () => eden.api.auth.logout.post(),
      mapUser: defaultMapUser,
    },
  })
}

export { createAuthContextFromAdapter }
