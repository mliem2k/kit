import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// The stored logo can be any image format the admin uploaded (JPEG, PNG, ...).
// Data URIs have no HTTP Content-Type header for the browser to sniff against,
// so a wrong declared mime (e.g. always "image/png") silently fails to render
// as a favicon even though the bytes decode fine as an <img>.
const detectImageMime = (base64: string) => {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/png'
}

type CompanyInfo = {
  name: string
  logo: string | null
  isLoading: boolean
}

export type CompanyContextValue = {
  companyName: string
  companyLogo: string | null
  isLoading: boolean
  refreshCompanyInfo: () => Promise<void>
}

export type CreateCompanyContextOptions = {
  /** Base URL for the app-settings calls; a function so it can read Vite env lazily. */
  apiUrl: () => string
  /** Name shown before the API answers (and when it has no company name set). */
  defaultName: string
  /** How often the name and logo are re-read. */
  refreshIntervalMs?: number
}

/**
 * Builds the company name/logo provider. The fetching, caching in
 * localStorage, document title and favicon handling are identical in every
 * app; only the API base URL and the fallback name differ.
 */
export function createCompanyContext({
  apiUrl,
  defaultName,
  refreshIntervalMs = 5 * 60 * 1000,
}: CreateCompanyContextOptions) {
  const CompanyContext = createContext<CompanyContextValue | null>(null)

  const CompanyProvider = ({ children }: { children: React.ReactNode }) => {
    // Initialize from localStorage first for instant loading
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => ({
      name: typeof window !== 'undefined' ? localStorage.getItem('company_name') || defaultName : defaultName,
      logo: typeof window !== 'undefined' ? localStorage.getItem('company_logo') : null,
      isLoading: false,
    }))

    const fetchCompanyInfo = useCallback(async () => {
      try {
        const [nameResult, logoResult] = await Promise.all([
          fetch(`${apiUrl()}/api/app-settings/company-name`),
          fetch(`${apiUrl()}/api/app-settings/company-logo`),
        ])

        let name = defaultName
        let logo = null

        if (nameResult.ok) {
          const data = await nameResult.json()
          name = data.companyName || defaultName
        }

        if (logoResult.ok) {
          const data = await logoResult.json()
          logo = data.logo || null
        }

        // Update state, preserving existing values if API returns null
        setCompanyInfo((prev) => {
          const newName = name !== defaultName ? name : prev.name
          const newLogo = logo !== null ? logo : prev.logo

          // Only update localStorage when we have values
          if (newName !== defaultName || newLogo) {
            localStorage.setItem('company_name', newName)
            if (newLogo) {
              localStorage.setItem('company_logo', newLogo)
            }
          }

          return { name: newName, logo: newLogo, isLoading: false }
        })
      } catch {
        // Silently fail — company info is not critical
      }
    }, [])

    // Update document title with company name
    useEffect(() => {
      if (companyInfo.name) {
        document.title = companyInfo.name
      }
    }, [companyInfo.name])

    // Update favicon with company logo. Browsers pick whichever icon link was
    // parsed from the initial HTML over one appended later by JS, so this must
    // reuse/update the existing link in place (and remove any other icon links,
    // e.g. index.html's static /favicon.ico) rather than adding a competing one.
    useEffect(() => {
      if (!companyInfo.logo) return

      document.querySelectorAll("link[rel~='icon']").forEach((el) => {
        if (el.getAttribute('data-company-favicon') !== 'true') el.remove()
      })

      let link = document.querySelector("link[data-company-favicon='true']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        link.setAttribute('data-company-favicon', 'true')
        document.head.appendChild(link)
      }
      const mime = detectImageMime(companyInfo.logo)
      link.type = mime
      link.href = `data:${mime};base64,${companyInfo.logo}`
    }, [companyInfo.logo])

    // Fetch company info on mount and periodically. The interval skips its
    // fetch while the tab is hidden, and catches up immediately once it becomes
    // visible again, so a backgrounded tab does not keep a scale-to-zero API
    // awake.
    useEffect(() => {
      fetchCompanyInfo()
      const interval = setInterval(() => {
        if (!document.hidden) fetchCompanyInfo()
      }, refreshIntervalMs)

      const onVisibilityChange = () => {
        if (!document.hidden) fetchCompanyInfo()
      }
      document.addEventListener('visibilitychange', onVisibilityChange)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
    }, [fetchCompanyInfo])

    const value = useMemo(
      () => ({
        companyName: companyInfo.name,
        companyLogo: companyInfo.logo,
        isLoading: companyInfo.isLoading,
        refreshCompanyInfo: fetchCompanyInfo,
      }),
      [companyInfo.name, companyInfo.logo, companyInfo.isLoading, fetchCompanyInfo],
    )

    return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  }

  const useCompany = () => {
    const context = useContext(CompanyContext)
    if (!context) {
      return {
        companyName: localStorage.getItem('company_name') || defaultName,
        companyLogo: localStorage.getItem('company_logo'),
        isLoading: false,
        refreshCompanyInfo: () => {},
      }
    }
    return context
  }

  return { CompanyProvider, useCompany }
}
