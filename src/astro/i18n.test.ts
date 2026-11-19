import { describe, expect, test } from 'bun:test'
import { createI18n } from './i18n'

const messages = {
  id: { hello: 'Halo {name}', items: '{n, plural, other {# barang}}', only: 'Hanya ID', tag: 'a <b>b</b>' },
  en: { hello: 'Hello {name}', items: '{n, plural, one {# item} other {# items}}' },
}

describe('createI18n', () => {
  const i18n = createI18n({ locales: ['id', 'en'] as const, defaultLocale: 'id', messages })

  test('formats ICU messages per locale', () => {
    expect(i18n.translator('en')('hello', { name: 'Ana' })).toBe('Hello Ana')
    expect(i18n.translator('en')('items', { n: 1 })).toBe('1 item')
    expect(i18n.translator('id')('items', { n: 3 })).toBe('3 barang')
  })

  test('a key missing in a locale falls back to the default, a key missing everywhere throws', () => {
    expect(i18n.translator('en')('only')).toBe('Hanya ID')
    expect(() => i18n.translator('en')('nope' as 'hello')).toThrow('missing key "nope" in every locale')
    const strict = createI18n({ locales: ['id', 'en'] as const, defaultLocale: 'id', messages, missing: 'throw' })
    expect(() => strict.translator('en')('only')).toThrow('missing key "only" in en')
  })

  test('raw and has', () => {
    expect(i18n.raw('en', 'only')).toBe('Hanya ID')
    expect(i18n.has('en', 'only')).toBe(true)
    expect(i18n.has('en', 'nope')).toBe(false)
  })

  test('ignoreTag keeps markup as text', () => {
    const plain = createI18n({ locales: ['id'] as const, defaultLocale: 'id', messages: { id: messages.id }, ignoreTag: true })
    expect(plain.translator('id')('tag')).toBe('a <b>b</b>')
  })

  test('default locale at the root, others under a prefix, paths kept as given', () => {
    expect(i18n.localePath('id', '/')).toBe('/')
    expect(i18n.localePath('en', '/')).toBe('/en/')
    expect(i18n.localePath('en', '/about')).toBe('/en/about')
    expect(i18n.localePath('en', '/about#team')).toBe('/en/about#team')
    expect(i18n.localePath('id', '/about?x=1')).toBe('/about?x=1')
  })

  test('prefixDefaultLocale and trailingSlash', () => {
    const okt = createI18n({ locales: ['id', 'en'] as const, defaultLocale: 'id', messages, prefixDefaultLocale: true, trailingSlash: true })
    expect(okt.localePath('id', '/')).toBe('/id/')
    expect(okt.localePath('en', '/products#x')).toBe('/en/products/#x')
    expect(okt.localePath('en', '/brochure.pdf')).toBe('/en/brochure.pdf')
    expect(okt.alternates('/en/products/')).toEqual({ id: '/id/products/', en: '/en/products/' })
  })

  test('stripLocale, localeFromPath and alternates', () => {
    expect(i18n.stripLocale('/en')).toBe('/')
    expect(i18n.stripLocale('/en/about')).toBe('/about')
    expect(i18n.stripLocale('/english')).toBe('/english')
    expect(i18n.localeFromPath('/en/about')).toBe('en')
    expect(i18n.localeFromPath('/about')).toBe('id')
    expect(i18n.alternates('/en/about')).toEqual({ id: '/about', en: '/en/about' })
  })
})
