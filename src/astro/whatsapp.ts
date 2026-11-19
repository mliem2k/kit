/**
 * A wa.me chat link. WhatsApp wants the number in international format as digits only, so spaces, dashes, brackets and a leading `+`
 * are removed here instead of by every caller (a `+` in the path is not part of the documented format).
 */
export function whatsappUrl(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) throw new Error(`whatsappUrl: no digits in "${phone}"`)
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`
}
