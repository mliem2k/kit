// The head tags every landing page repeats: title, description, canonical, robots, Open Graph, Twitter card and JSON-LD. The function is
// plain data so it can be tested without rendering; Seo.astro only writes the tags out. A site keeps what is its own (icons, font preloads,
// manifest, analytics) in its layout.
export interface SeoProps {
  /** The full document title; a site that appends its name does so before passing it. */
  title: string
  description: string
  /** Absolute URL of this page. */
  canonical: string | URL
  /** Absolute URL of the social share image. Without one the Twitter card is the small `summary`. */
  image?: string | URL
  siteName?: string
  /** Open Graph type, `website` unless a page says otherwise. */
  type?: string
  /** Open Graph locale such as `id_ID`. */
  locale?: string
  /** Writes `noindex, follow`. Use `robots` for any other value. */
  noindex?: boolean
  /** The exact robots meta value; wins over `noindex`. Without either, no robots tag is written. */
  robots?: string
  keywords?: readonly string[]
  author?: string
  themeColor?: string
  twitterCard?: 'summary' | 'summary_large_image'
  /** Search console verification tokens. */
  verification?: { google?: string }
  /** One schema.org object or several; each becomes its own script tag. */
  jsonLd?: object | readonly object[]
}

export type SeoTag =
  | { tag: 'title'; text: string }
  | { tag: 'meta' | 'link'; attrs: Record<string, string> }
  | { tag: 'script'; json: string }

/** JSON for a script tag: `<` is escaped so no value can close the tag or open a comment. */
export const jsonForScript = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c')

export function seoTags(props: SeoProps): SeoTag[] {
  const { title, description, siteName, type = 'website', locale, keywords, author, themeColor, verification } = props
  const canonical = String(props.canonical)
  const image = props.image === undefined ? undefined : String(props.image)
  const robots = props.robots ?? (props.noindex ? 'noindex, follow' : undefined)
  const meta = (attrs: Record<string, string>): SeoTag => ({ tag: 'meta', attrs })
  const tags: SeoTag[] = [{ tag: 'title', text: title }, meta({ name: 'description', content: description })]
  if (keywords?.length) tags.push(meta({ name: 'keywords', content: keywords.join(', ') }))
  if (robots) tags.push(meta({ name: 'robots', content: robots }))
  if (author) tags.push(meta({ name: 'author', content: author }))
  tags.push({ tag: 'link', attrs: { rel: 'canonical', href: canonical } })
  if (themeColor) tags.push(meta({ name: 'theme-color', content: themeColor }))
  tags.push(meta({ property: 'og:type', content: type }))
  if (siteName) tags.push(meta({ property: 'og:site_name', content: siteName }))
  tags.push(meta({ property: 'og:title', content: title }), meta({ property: 'og:description', content: description }), meta({ property: 'og:url', content: canonical }))
  if (image) tags.push(meta({ property: 'og:image', content: image }))
  if (locale) tags.push(meta({ property: 'og:locale', content: locale }))
  tags.push(meta({ name: 'twitter:card', content: props.twitterCard ?? (image ? 'summary_large_image' : 'summary') }), meta({ name: 'twitter:title', content: title }), meta({ name: 'twitter:description', content: description }))
  if (image) tags.push(meta({ name: 'twitter:image', content: image }))
  if (verification?.google) tags.push(meta({ name: 'google-site-verification', content: verification.google }))
  const ld = props.jsonLd === undefined ? [] : Array.isArray(props.jsonLd) ? props.jsonLd : [props.jsonLd]
  for (const item of ld) tags.push({ tag: 'script', json: jsonForScript(item) })
  return tags
}
