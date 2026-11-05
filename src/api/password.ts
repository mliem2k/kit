import bcrypt from 'bcryptjs'
import { hashPassword as hashScrypt, verifyPassword as verifyScrypt } from 'better-auth/crypto'

// New passwords should always be hashed with BetterAuth's own scrypt hasher so
// they verify through both signInEmail and checkSupervisor without a fallback.
export async function hashCredentialPassword(password: string): Promise<string> {
  return hashScrypt(password)
}

// Employee accounts created or updated through the employees module have a
// bcrypt hash in account.password instead of BetterAuth's scrypt format. Try
// the current scrypt format first, then fall back to bcrypt so those already
// deployed accounts keep working until their password is next changed.
export async function verifyCredentialPassword(hash: string, password: string): Promise<boolean> {
  try {
    if (await verifyScrypt({ hash, password })) return true
  } catch {
    // not a scrypt-format hash, fall through to bcrypt
  }

  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}
