// Translation for the multilingual landing sites: ICU messages formatted with intl-messageformat, plus the locale path rules from
// locale-path.ts.
import { IntlMessageFormat } from 'intl-messageformat'

import { createLocalePaths, type LocalePathOptions } from './locale-path'

export type MessageValues = Record<string, string | number>

export interface I18nOptions<L extends string, K extends string> extends LocalePathOptions<L> {
  /** The default locale's catalog must hold every key; another locale may miss some (see `missing`). */
  messages: Record<L, Partial<Record<K, string>>>
  /** BCP 47 tag per locale for number and date formatting; the locale code itself when not given. */
  intlLocales?: Partial<Record<L, string>>
  /** Treat `<tag>` in a message as text instead of rich text markup. */
  ignoreTag?: boolean
  /** A key missing in the requested locale: `fallback` uses the default locale with a warning, `throw` fails. A key missing everywhere always throws. */
  missing?: 'fallback' | 'throw'
}

export function createI18n<L extends string, K extends string>(options: I18nOptions<L, K>) {
  const { defaultLocale, messages, ignoreTag = false, missing = 'fallback' } = options
  const intlLocales: Partial<Record<L, string>> = options.intlLocales ?? {}
  const compiled = new Map<string, IntlMessageFormat>()
  const warned = new Set<string>()

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

  return { ...createLocalePaths(options), format, translator, raw, has }
}
