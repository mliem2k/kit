import { format } from 'node:util'

// Cloud Run turns a stdout line that is a JSON object into one structured log entry, reading `severity` and
// `message` from it. Plain console output makes every line of a stack trace its own entry with no severity.
// This routes console.log, info, warn, error and debug through one JSON line each.

type Severity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

const SEVERITY: Record<ConsoleMethod, Severity> = {
  debug: 'DEBUG',
  log: 'INFO',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
}

export function formatLogLine(severity: Severity, args: unknown[]): string {
  // A call that already passes one JSON object (the security events) keeps its fields.
  if (args.length === 1 && typeof args[0] === 'string' && args[0].startsWith('{')) {
    try {
      const parsed = JSON.parse(args[0]) as Record<string, unknown>
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const message =
          typeof parsed.message === 'string' ? parsed.message : String(parsed.type ?? '')
        return `${JSON.stringify({ severity, message, ...parsed })}\n`
      }
    } catch {
      // Not JSON after all, fall through to plain formatting.
    }
  }
  return `${JSON.stringify({ severity, message: format(...args) })}\n`
}

/** Replaces the console methods; returns a function that puts the originals back. */
export function installJsonConsole(
  write: (line: string) => void = (line) => process.stdout.write(line),
) {
  const original = {} as Record<ConsoleMethod, (...args: unknown[]) => void>
  for (const method of Object.keys(SEVERITY) as ConsoleMethod[]) {
    original[method] = console[method]
    console[method] = (...args: unknown[]) => write(formatLogLine(SEVERITY[method], args))
  }
  return () => {
    for (const method of Object.keys(original) as ConsoleMethod[])
      console[method] = original[method]
  }
}
