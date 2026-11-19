// The head tags every landing page repeats: title, description, canonical, robots, Open Graph, Twitter card and JSON-LD. The function is
// plain data so it can be tested without rendering; Seo.astro only writes the tags out. A site keeps what is its own (icons, font preloads,
// manifest, analytics) in its layout, and anything one-off goes in Seo's slot.
export interface SeoProps {
  /** The full document title; a site that appends its name does so before passing it. */
  title: string
  /** Without one, no description, `og:description` or `twitter:description` is written. */
  description?: string
  /** Absolute URL of this page. */
  canonical: string | URL
  /** Absolute URL of the social share image. Without one the Twitter card is the small `summary`. */
  image?: string | URL
  imageWidth?: number
  imageHeight?: number
  /** MIME type of the image, for `og:image:type`. */
  imageType?: string
  /** Alt text, for `og:image:alt` and `twitter:image:alt`. */
  imageAlt?: string
  siteName?: string
  /** Open Graph type, `website` unless a page says otherwise. */
  type?: string
  /** Open Graph locale such as `id_ID`. */
  locale?: string
  /** The page's other languages as Open Graph locales (`en_US`), one `og:locale:alternate` each. */
  localeAlternates?: readonly string[]
  /** hreflang to absolute URL, including `x-default` if wanted; one `<link rel="alternate">` each. Not written on a `noindex` page. */
  alternates?: Readonly<Record<string, string | URL>>
  /** Writes `noindex, follow`, and leaves out the canonical link and the hreflang alternates, which a page that asks not to be indexed should not carry. Use `robots` for any other value. */
  noindex?: boolean
  /** The exact robots meta value; wins over `noindex`. Without either, no robots tag is written. */
  robots?: string
  keywords?: readonly string[]
  author?: string
  themeColor?: string
  twitterCard?: 'summary' | 'summary_large_image'
  /** The site's Twitter handle, `@name`. */
  twitterSite?: string
  /** `twitter:description` when it should differ from `description`. */
  twitterDescription?: string
  /** Writes `twitter:url`. Off by default; Open Graph's `og:url` already covers it. */
  twitterUrl?: boolean
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
  const { title, description, siteName, type = 'website', locale, keywords, author, themeColor, verification, imageType, imageAlt } = props
  const canonical = String(props.canonical)
  const image = props.image === undefined ? undefined : String(props.image)
  const robots = props.robots ?? (props.noindex ? 'noindex, follow' : undefined)
  const meta = (attrs: Record<string, string>): SeoTag => ({ tag: 'meta', attrs })
  const tags: SeoTag[] = [{ tag: 'title', text: title }]
  if (description !== undefined) tags.push(meta({ name: 'description', content: description }))
  if (keywords?.length) tags.push(meta({ name: 'keywords', content: keywords.join(', ') }))
  if (robots) tags.push(meta({ name: 'robots', content: robots }))
  if (author) tags.push(meta({ name: 'author', content: author }))
  if (!props.noindex) {
    tags.push({ tag: 'link', attrs: { rel: 'canonical', href: canonical } })
    for (const [hreflang, href] of Object.entries(props.alternates ?? {})) tags.push({ tag: 'link', attrs: { rel: 'alternate', hreflang, href: String(href) } })
  }
  if (themeColor) tags.push(meta({ name: 'theme-color', content: themeColor }))
  tags.push(meta({ property: 'og:type', content: type }))
  if (siteName) tags.push(meta({ property: 'og:site_name', content: siteName }))
  tags.push(meta({ property: 'og:title', content: title }))
  if (description !== undefined) tags.push(meta({ property: 'og:description', content: description }))
  tags.push(meta({ property: 'og:url', content: canonical }))
  if (image) {
    tags.push(meta({ property: 'og:image', content: image }))
    if (imageType) tags.push(meta({ property: 'og:image:type', content: imageType }))
    if (props.imageWidth) tags.push(meta({ property: 'og:image:width', content: String(props.imageWidth) }))
    if (props.imageHeight) tags.push(meta({ property: 'og:image:height', content: String(props.imageHeight) }))
    if (imageAlt) tags.push(meta({ property: 'og:image:alt', content: imageAlt }))
  }
  if (locale) tags.push(meta({ property: 'og:locale', content: locale }))
  for (const other of props.localeAlternates ?? []) tags.push(meta({ property: 'og:locale:alternate', content: other }))
  tags.push(meta({ name: 'twitter:card', content: props.twitterCard ?? (image ? 'summary_large_image' : 'summary') }))
  if (props.twitterSite) tags.push(meta({ name: 'twitter:site', content: props.twitterSite }))
  if (props.twitterUrl) tags.push(meta({ name: 'twitter:url', content: canonical }))
  tags.push(meta({ name: 'twitter:title', content: title }))
  const twitterDescription = props.twitterDescription ?? description
  if (twitterDescription !== undefined) tags.push(meta({ name: 'twitter:description', content: twitterDescription }))
  if (image) {
    tags.push(meta({ name: 'twitter:image', content: image }))
    if (imageAlt) tags.push(meta({ name: 'twitter:image:alt', content: imageAlt }))
  }
  if (verification?.google) tags.push(meta({ name: 'google-site-verification', content: verification.google }))
  const ld = props.jsonLd === undefined ? [] : Array.isArray(props.jsonLd) ? props.jsonLd : [props.jsonLd]
  for (const item of ld) tags.push({ tag: 'script', json: jsonForScript(item) })
  return tags
}
