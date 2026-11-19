// Translation and locale paths for the multilingual landing sites. Messages are ICU patterns formatted with intl-messageformat; paths
// put a non default locale under `/<locale>/`, and the default one at the root unless `prefixDefaultLocale` is set.
import { IntlMessageFormat } from 'intl-messageformat'

export type MessageValues = Record<string, string | number>

export interface I18nOptions<L extends string, K extends string> {
  locales: readonly L[]
  defaultLocale: L
  /** The default locale's catalog must hold every key; another locale may miss some (see `missing`). */
  messages: Record<L, Partial<Record<K, string>>>
  /** Every locale gets a prefix, the default too (`/id/...`). Off by default: the default locale lives at the root. */
  prefixDefaultLocale?: boolean
  /** Page paths end in `/` (`/en/about/`); a path with a file extension never does. Off by default: paths stay as given. */
  trailingSlash?: boolean
  /** BCP 47 tag per locale for number and date formatting; the locale code itself when not given. */
  intlLocales?: Partial<Record<L, string>>
  /** Treat `<tag>` in a message as text instead of rich text markup. */
  ignoreTag?: boolean
  /** A key missing in the requested locale: `fallback` uses the default locale with a warning, `throw` fails. A key missing everywhere always throws. */
  missing?: 'fallback' | 'throw'
}

const HAS_EXTENSION = /\.[a-z0-9]+$/i

export function createI18n<L extends string, K extends string>(options: I18nOptions<L, K>) {
  const { locales, defaultLocale, messages, prefixDefaultLocale = false, trailingSlash = false, ignoreTag = false, missing = 'fallback' } = options
  const intlLocales: Partial<Record<L, string>> = options.intlLocales ?? {}
  const compiled = new Map<string, IntlMessageFormat>()
  const warned = new Set<string>()

  const isLocale = (value: string | undefined): value is L => value !== undefined && (locales as readonly string[]).includes(value)

  /** The locale whose catalog answers `key` for `locale`, after the fallback rule. */
  function source(locale: L, key: K): L {
    if (messages[locale]?.[key] !== undefined) return locale
    if (messages[defaultLocale]?.[key] === undefined) throw new Error(`i18n: missing key "${key}" in every locale`)
    if (missing === 'throw') throw new Error(`i18n: missing key "${key}" in ${locale}`)
    if (!warned.has(`${locale}:${key}`)) {
      warned.add(`${locale}:${key}`)
      console.warn(`i18n: "${key}" missing in ${locale}, using ${defaultLocale}`)
    }
    return defaultLocale
  }

  /** The raw ICU pattern, for a client script that formats it with a runtime value. */
  const raw = (locale: L, key: K): string => messages[source(locale, key)][key] as string

  const has = (locale: L, key: string): boolean => messages[locale]?.[key as K] !== undefined || messages[defaultLocale]?.[key as K] !== undefined

  function format(locale: L, key: K, values?: MessageValues): string {
    const from = source(locale, key)
    const id = `${from}\0${key}`
    let formatter = compiled.get(id)
    if (!formatter) {
      formatter = new IntlMessageFormat(messages[from][key] as string, intlLocales[from] ?? from, undefined, { ignoreTag })
      compiled.set(id, formatter)
    }
    const output = formatter.format(values)
    return Array.isArray(output) ? output.join('') : String(output)
  }

  /** A `t(key, values)` bound to one locale. */
  const translator = (locale: L) => (key: K, values?: MessageValues) => format(locale, key, values)

  /** `path` without a locale prefix, in `locale`. The query and hash are kept. */
  function localePath(locale: L, path = '/'): string {
    const [, rawPath, suffix] = path.match(/^([^?#]*)(.*)$/) as RegExpMatchArray
    let p = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
    if (trailingSlash && !p.endsWith('/') && !HAS_EXTENSION.test(p)) p += '/'
    if (locale !== defaultLocale || prefixDefaultLocale) p = p === '/' ? `/${locale}/` : `/${locale}${p}`
    return p + suffix
  }

  /** Removes a leading locale segment; the result always starts with `/`. */
  function stripLocale(pathname: string): string {
    for (const l of locales) {
      if (pathname === `/${l}`) return '/'
      if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1)
    }
    return pathname
  }

  /** The locale of a URL path, by its first segment; the default locale when the segment is not one. */
  const localeFromPath = (pathname: string): L => {
    const first = pathname.split('/')[1]
    return isLocale(first) ? first : defaultLocale
  }

  /** The same page in every locale, keyed by locale; pass it to Seo's `alternates`. */
  const alternates = (pathname: string): Record<L, string> => {
    const base = stripLocale(pathname)
    return Object.fromEntries(locales.map((l) => [l, localePath(l, base)])) as Record<L, string>
  }

  return { locales, defaultLocale, isLocale, format, translator, raw, has, localePath, stripLocale, localeFromPath, alternates }
}
