// Locale paths for the multilingual landing sites: a non default locale lives under `/<locale>/`, the default one at the root unless
// `prefixDefaultLocale` is set. No translation here, so a site or a client script that only builds links does not load a formatter.

export interface LocalePathOptions<L extends string> {
  locales: readonly L[]
  defaultLocale: L
  /** Every locale gets a prefix, the default too (`/id/...`). Off by default: the default locale lives at the root. */
  prefixDefaultLocale?: boolean
  /** Page paths end in `/` (`/en/about/`); a path with a file extension never does. Off by default: paths stay as given. */
  trailingSlash?: boolean
}

const HAS_EXTENSION = /\.[a-z0-9]+$/i

export function createLocalePaths<L extends string>({ locales, defaultLocale, prefixDefaultLocale = false, trailingSlash = false }: LocalePathOptions<L>) {
  const isLocale = (value: string | undefined): value is L => value !== undefined && (locales as readonly string[]).includes(value)

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

  return { locales, defaultLocale, isLocale, localePath, stripLocale, localeFromPath, alternates }
}
