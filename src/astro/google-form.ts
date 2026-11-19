// Contact forms on the landing sites send their fields to a Google Form. The response is opaque (Google sends no CORS headers), so a
// resolved promise means the request reached Google; a network failure rejects.

const ACTION = /^https:\/\/docs\.google\.com\/forms\/(?:u\/\d+\/)?d\/e\/[\w-]+\/formResponse$/

type Fields = Record<string, string> | FormData | URLSearchParams

/** The fields as a urlencoded body, the same encoding a plain HTML form post uses. */
export function googleFormBody(fields: Fields): URLSearchParams {
  if (fields instanceof URLSearchParams) return fields
  const body = new URLSearchParams()
  const entries = typeof FormData !== 'undefined' && fields instanceof FormData ? fields.entries() : Object.entries(fields as Record<string, string>)
  for (const [name, value] of entries) if (typeof value === 'string') body.append(name, value)
  return body
}

/**
 * Posts `fields` (`entry.<id>` names) to a Google Form's `formResponse` URL. A `viewform` or other URL is refused, since Google would
 * accept the request and record nothing.
 */
export async function submitGoogleForm(action: string, fields: Fields, fetcher: typeof fetch = fetch): Promise<void> {
  if (!ACTION.test(action)) throw new Error(`submitGoogleForm: "${action}" is not a Google Forms formResponse URL`)
  await fetcher(action, { method: 'POST', mode: 'no-cors', body: googleFormBody(fields) })
}
