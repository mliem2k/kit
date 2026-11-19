// Cloud Run sends SIGTERM and allows 10 seconds before killing the instance. Stopping the server first lets the
// requests already in flight finish (new connections are refused); exiting straight away cut them off. The
// timeout keeps a stuck connection from using up the grace period.
export const SHUTDOWN_TIMEOUT_MS = 8000

export function createShutdown(
  server: { stop(closeActiveConnections?: boolean): unknown },
  options: {
    exit?: (code: number) => void
    timeoutMs?: number
    log?: (message: string) => void
  } = {},
) {
  const exit = options.exit ?? ((code: number) => process.exit(code))
  const timeoutMs = options.timeoutMs ?? SHUTDOWN_TIMEOUT_MS
  const log = options.log ?? ((message: string) => console.log(message))
  let started = false

  return async function shutdown(signal: string) {
    if (started) return
    started = true
    log(`[${signal}] shutting down, waiting for in flight requests...`)
    const timer = setTimeout(() => {
      log(`[${signal}] in flight requests did not finish in ${timeoutMs} ms, exiting`)
      exit(1)
    }, timeoutMs)
    try {
      await server.stop()
    } finally {
      clearTimeout(timer)
      exit(0)
    }
  }
}
