// Structured security event logging.
//
// Emits one JSON line per event to stdout, which the platform log drain
// (Fly, Cloud Run) captures and indexes. Never log passwords, tokens, or PINs.

export interface SecurityEvent {
  /** Dotted event name, e.g. `auth.sign_in.failure`, `rbac.denied`. */
  type: string
  /** Originating client IP, when known. */
  ip?: string | null
  /** Request path. */
  path?: string
  /** HTTP status of the outcome, when applicable. */
  status?: number
  /** Account identifier (username or email) for auth events. */
  username?: string
  /** Email identifier for apps that key accounts by email instead of username. */
  email?: string
  /** Required role for RBAC denials. */
  requiredRole?: string
  /** Free-form context (no secrets). */
  detail?: string
}

export function logSecurityEvent(event: SecurityEvent): void {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level: 'security',
    ...event,
  }
  console.log(JSON.stringify(payload))
}
