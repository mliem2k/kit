// Use the rightmost IP in X-Forwarded-For: GCP/nginx appends the real client IP last.
// Taking the last entry prevents clients from spoofing the key by injecting values at the front.
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (ips.length > 0) return ips[ips.length - 1]
  }
  return req.headers.get('x-real-ip') || 'unknown'
}
