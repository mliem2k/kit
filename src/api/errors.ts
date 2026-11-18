// The JSON error contract the Elysia APIs share: thrown NotFoundError, ValidationError and ConflictError, Elysia's own validation
// failures and Postgres constraint errors all come back as `{ error, code }` with the right status, and anything else is a 500 that
// hides its message outside development. An app adds its own error classes through `map`.
import { Elysia } from 'elysia'

export interface ErrorResponse {
  error: string
  code?: string
  message?: string
  details?: unknown
}

/** An error that carries the HTTP status it should be answered with. */
export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = new.target.name
  }
}
export class ValidationError extends HttpError {
  constructor(message: string) { super(message, 400) }
}
export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') { super(message, 404) }
}
export class ConflictError extends HttpError {
  constructor(message: string) { super(message, 409) }
}

/** Registers the error classes with Elysia so `error('NOT_FOUND', ...)` and `throw new NotFoundError()` both type. */
export const errorPlugin = new Elysia({ name: 'plugin.errors' }).error({
  VALIDATION_ERROR: ValidationError,
  NOT_FOUND: NotFoundError,
  CONFLICT: ConflictError,
})

const CODES = new Map<Function, string>([[ValidationError, 'VALIDATION_ERROR'], [NotFoundError, 'NOT_FOUND'], [ConflictError, 'CONFLICT']])

export interface ErrorHandlerOptions {
  /** Adds the original message to 500s and the details to validation failures. Off by default. */
  development?: boolean
  /** The app's own errors. Return the status and body to answer with, or undefined to let the shared rules decide. Tried first. */
  map?: (error: unknown) => { status: number; body: ErrorResponse } | undefined
  /** Where unexpected errors are logged. Defaults to console.error. */
  log?: (error: unknown) => void
}

/**
 * Hooks are local to the Elysia instance that declares them unless marked global, and this plugin declares none of the routes, so without
 * `as: 'global'` every module's errors would skip it and Elysia's default handler would answer them as plain text.
 */
export function createErrorHandler({ development = false, map, log = (error) => console.error('[Elysia Error]', error) }: ErrorHandlerOptions = {}) {
  return new Elysia({ name: 'plugin.errorHandler' }).onError({ as: 'global' }, ({ code, error, set }): ErrorResponse => {
    const custom = map?.(error)
    if (custom) {
      set.status = custom.status
      return custom.body
    }
    if (error instanceof HttpError) {
      set.status = error.status
      return { error: error.message, code: CODES.get(error.constructor) ?? 'ERROR' }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Validation failed', code: 'VALIDATION', message: (error as Error).message, ...(development && { details: error }) }
    }
    // Postgres constraint errors reach here as driver errors with a string SQLSTATE in `code`.
    const sqlState = (error as { code?: unknown } | null)?.code
    if (sqlState === '23505') {
      set.status = 409
      return { error: 'Conflict: duplicate value', code: 'CONFLICT' }
    }
    if (sqlState === '23503') {
      set.status = 409
      return { error: 'Conflict: related record exists', code: 'CONFLICT' }
    }
    log(error)
    set.status = 500
    return { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR', message: development && error instanceof Error ? error.message : undefined }
  })
}
