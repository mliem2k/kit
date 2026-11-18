import { describe, expect, test } from 'bun:test'
import { jsonForScript, seoTags, type SeoTag } from './seo'

const meta = (tags: SeoTag[], key: string) => tags.find((t) => t.tag === 'meta' && (t.attrs.name === key || t.attrs.property === key))
const content = (tags: SeoTag[], key: string) => {
  const found = meta(tags, key)
  return found && found.tag === 'meta' ? found.attrs.content : undefined
}
const base = { title: 'Home | Acme', description: 'What we do', canonical: 'https://acme.test/' }

describe('seoTags', () => {
  test('writes the title, description, canonical and the Open Graph and Twitter copies of them', () => {
    const tags = seoTags({ ...base, image: new URL('https://acme.test/og.png'), siteName: 'Acme', locale: 'id_ID' })
    expect(tags[0]).toEqual({ tag: 'title', text: 'Home | Acme' })
    expect(content(tags, 'description')).toBe('What we do')
    expect(tags).toContainEqual({ tag: 'link', attrs: { rel: 'canonical', href: 'https://acme.test/' } })
    for (const key of ['og:title', 'twitter:title']) expect(content(tags, key)).toBe('Home | Acme')
    for (const key of ['og:description', 'twitter:description']) expect(content(tags, key)).toBe('What we do')
    expect(content(tags, 'og:url')).toBe('https://acme.test/')
    expect(content(tags, 'og:type')).toBe('website')
    expect(content(tags, 'og:site_name')).toBe('Acme')
    expect(content(tags, 'og:locale')).toBe('id_ID')
    expect(content(tags, 'og:image')).toBe('https://acme.test/og.png')
    expect(content(tags, 'twitter:image')).toBe('https://acme.test/og.png')
    expect(content(tags, 'twitter:card')).toBe('summary_large_image')
  })

  test('without an image there is no image tag and the card is the small one; a page can still pick its card', () => {
    const tags = seoTags(base)
    expect(content(tags, 'twitter:card')).toBe('summary')
    expect(meta(tags, 'og:image')).toBeUndefined()
    expect(meta(tags, 'twitter:image')).toBeUndefined()
    expect(content(seoTags({ ...base, twitterCard: 'summary_large_image' }), 'twitter:card')).toBe('summary_large_image')
  })

  test('robots is written only when asked: noindex gives noindex, follow, and an explicit value wins', () => {
    expect(meta(seoTags(base), 'robots')).toBeUndefined()
    expect(content(seoTags({ ...base, noindex: true }), 'robots')).toBe('noindex, follow')
    expect(content(seoTags({ ...base, noindex: true, robots: 'noindex, nofollow' }), 'robots')).toBe('noindex, nofollow')
    expect(content(seoTags({ ...base, robots: 'index, follow' }), 'robots')).toBe('index, follow')
  })

  test('optional tags appear only when given, and an empty keyword list writes nothing', () => {
    const none = seoTags({ ...base, keywords: [] })
    for (const key of ['keywords', 'author', 'theme-color', 'og:site_name', 'og:locale', 'google-site-verification']) expect(meta(none, key)).toBeUndefined()
    const all = seoTags({ ...base, keywords: ['a', 'b'], author: 'Me', themeColor: '#09261B', verification: { google: 'tok' } })
    expect(content(all, 'keywords')).toBe('a, b')
    expect(content(all, 'author')).toBe('Me')
    expect(content(all, 'theme-color')).toBe('#09261B')
    expect(content(all, 'google-site-verification')).toBe('tok')
    expect(meta(seoTags({ ...base, verification: {} }), 'google-site-verification')).toBeUndefined()
  })

  test('each JSON-LD object is its own script, and nothing in it can close the script tag', () => {
    expect(seoTags(base).some((t) => t.tag === 'script')).toBe(false)
    const tags = seoTags({ ...base, jsonLd: [{ '@type': 'Organization', name: 'A</script><script>alert(1)</script>' }, { '@type': 'WebSite' }] })
    const scripts = tags.filter((t): t is Extract<SeoTag, { tag: 'script' }> => t.tag === 'script')
    expect(scripts).toHaveLength(2)
    expect(scripts[0]!.json).not.toContain('<')
    expect(JSON.parse(scripts[0]!.json).name).toBe('A</script><script>alert(1)</script>')
    expect(seoTags({ ...base, jsonLd: { '@type': 'WebSite' } }).filter((t) => t.tag === 'script')).toHaveLength(1)
  })

  test('jsonForScript round trips every value the escape touches', () => {
    const value = { a: '<!-- x -->', b: ['</SCRIPT>', 'plain'], c: 1 }
    expect(JSON.parse(jsonForScript(value))).toEqual(value)
  })

  test('hreflang alternates and the other Open Graph locales are written once each, in the order given', () => {
    const tags = seoTags({ ...base, locale: 'id_ID', localeAlternates: ['en_US', 'zh_TW'], alternates: { id: 'https://acme.test/', en: new URL('https://acme.test/en/'), 'x-default': 'https://acme.test/' } })
    const alternates = tags.filter((t) => t.tag === 'link' && t.attrs.rel === 'alternate').map((t) => (t.tag === 'link' ? [t.attrs.hreflang, t.attrs.href] : []))
    expect(alternates).toEqual([['id', 'https://acme.test/'], ['en', 'https://acme.test/en/'], ['x-default', 'https://acme.test/']])
    expect(tags.filter((t) => t.tag === 'meta' && t.attrs.property === 'og:locale:alternate').map((t) => (t.tag === 'meta' ? t.attrs.content : ''))).toEqual(['en_US', 'zh_TW'])
  })

  test('a noindex page has no canonical link and no alternates, but keeps og:url and its robots tag', () => {
    const tags = seoTags({ ...base, noindex: true, alternates: { en: 'https://acme.test/en/' } })
    expect(tags.some((t) => t.tag === 'link')).toBe(false)
    expect(content(tags, 'og:url')).toBe('https://acme.test/')
    expect(content(tags, 'robots')).toBe('noindex, follow')
    expect(tags.some((t) => t.tag === 'link')).toBe(false)
    // a site that writes its own robots value keeps the canonical
    expect(seoTags({ ...base, robots: 'noindex' }).some((t) => t.tag === 'link' && t.attrs.rel === 'canonical')).toBe(true)
  })

  test('image details and the Twitter site appear only with an image, or when given', () => {
    const tags = seoTags({ ...base, image: 'https://acme.test/og.webp', imageType: 'image/webp', imageWidth: 1024, imageHeight: 512, imageAlt: 'Acme', twitterSite: '@acme' })
    expect(content(tags, 'og:image:type')).toBe('image/webp')
    expect(content(tags, 'og:image:width')).toBe('1024')
    expect(content(tags, 'og:image:height')).toBe('512')
    expect(content(tags, 'og:image:alt')).toBe('Acme')
    expect(content(tags, 'twitter:image:alt')).toBe('Acme')
    expect(content(tags, 'twitter:site')).toBe('@acme')
    const none = seoTags({ ...base, imageWidth: 1, imageAlt: 'x' })
    for (const key of ['og:image:width', 'og:image:alt', 'twitter:image:alt', 'twitter:site']) expect(meta(none, key)).toBeUndefined()
  })

  test('without a description none of the three description tags is written', () => {
    const tags = seoTags({ title: 'T', canonical: 'https://acme.test/' })
    for (const key of ['description', 'og:description', 'twitter:description']) expect(meta(tags, key)).toBeUndefined()
    expect(content(tags, 'og:title')).toBe('T')
  })
})

