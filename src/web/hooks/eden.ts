import {
  keepPreviousData as keepPreviousDataPlaceholder,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'

export type EdenQueryOptions = {
  enabled?: boolean
  staleTime?: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean | 'always'
  retry?: number | boolean
  onError?: (err: unknown) => void
  onSuccess?: (data: unknown) => void
  /**
   * Keep the previous page's data on screen while a new query key (a filter
   * switch, a limit bump) fetches, instead of unmounting the list in favour of
   * a loading skeleton that was already showing data.
   */
  keepPreviousData?: boolean
  [key: string]: unknown
}

/**
 * Eden reports a failure as a plain `{ status, value }` object, not an Error,
 * so a caller doing `err instanceof Error ? err.message : fallback` would show
 * its fallback for every server error and throw away the message the API took
 * the trouble to write. Normalize to a real Error carrying that message.
 */
export function toError(error: unknown): Error {
  // Eden wraps every failure in a class that extends Error (so
  // `instanceof Error` is always true) but stamps its own .message to
  // `String(value)`, which is the literal text "[object Object]" whenever
  // value is the server's parsed JSON error body. Unwrap .value FIRST and
  // only fall back to the error's own .message when nothing usable is there.
  const value = (error as { value?: unknown })?.value
  const message =
    typeof value === 'string'
      ? value
      : ((value as { error?: string; message?: string })?.error ??
        (value as { message?: string })?.message)
  if (message) return new Error(message)
  if (error instanceof Error) return error
  return new Error('Terjadi kesalahan, coba lagi')
}

/** Wraps an Eden call as a react-query query with this app's defaults. */
export function useEdenQuery<T>(
  key: unknown[],
  fn: () => Promise<{ data: T | null; error: unknown }>,
  options: EdenQueryOptions = {},
) {
  const {
    onError,
    onSuccess,
    enabled,
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry,
    keepPreviousData,
    ...rest
  } = options
  const query = useQuery<T | null>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await fn()
      if (error) throw toError(error)
      return data ?? null
    },
    enabled: enabled !== false && key.every((k) => k !== null && k !== undefined && k !== ''),
    staleTime: staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: refetchOnWindowFocus ?? false,
    refetchOnMount: refetchOnMount,
    retry: retry ?? 1,
    ...(keepPreviousData ? { placeholderData: keepPreviousDataPlaceholder } : {}),
    ...rest,
  })

  useEffect(() => {
    if (query.error && onError) onError(query.error)
  }, [query.error, onError])

  useEffect(() => {
    if (query.data != null && onSuccess) onSuccess(query.data)
  }, [query.data, onSuccess])

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Wraps an Eden mutation and invalidates every query whose first key starts with `invalidatePrefix`. */
export function useEdenMutation<TInput, TOutput>(
  fn: (data: TInput) => Promise<{ data: TOutput | null; error: unknown }>,
  invalidatePrefix?: string | string[],
) {
  const queryClient = useQueryClient()
  const mutation = useMutation<TOutput | null, Error, TInput>({
    mutationFn: async (data: TInput) => {
      const { data: result, error } = await fn(data)
      if (error) throw toError(error)
      return result ?? null
    },
    onSuccess: () => {
      if (!invalidatePrefix) return
      const prefixes = Array.isArray(invalidatePrefix) ? invalidatePrefix : [invalidatePrefix]
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0]
          return typeof key === 'string' && prefixes.some((prefix) => key.startsWith(prefix))
        },
      })
    },
  })
  return {
    mutate: mutation.mutateAsync,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
