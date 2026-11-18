// The Astro config the landing sites share: the Tailwind v4 Vite plugin, an `@` alias for `<project>/src`, and the kit itself compiled by the
// site's own Vite (the `.astro` components in it are source, not prebuilt). Everything else (integrations, i18n, adapter, prefetch, build)
// stays in the site's config, passed straight through.
import tailwindcss from '@tailwindcss/vite'
import type { AstroUserConfig } from 'astro'
import { resolve } from 'node:path'

export interface SiteOptions extends AstroUserConfig {
  /** The canonical origin of the site, used for absolute URLs and the sitemap. */
  site: string
  /** The Tailwind v4 Vite plugin. On by default. */
  tailwind?: boolean
}

type Alias = NonNullable<NonNullable<NonNullable<AstroUserConfig['vite']>['resolve']>['alias']>
type NoExternal = NonNullable<NonNullable<NonNullable<AstroUserConfig['vite']>['ssr']>['noExternal']>

/** `@` points at `<project>/src` unless the site already defines `@`. */
function withSrcAlias(alias: Alias | undefined, src: string): Alias {
  if (Array.isArray(alias)) return alias.some((entry) => entry.find === '@') ? alias : [{ find: '@', replacement: src }, ...alias]
  return { '@': src, ...alias }
}

/** The kit's `.astro` files are source, so the site's Vite has to compile them rather than load them as external modules. */
function withKit(noExternal: NoExternal | undefined): NoExternal {
  if (noExternal === true) return true
  const kit = '@mliem2k/kit'
  if (noExternal === undefined) return [kit]
  const list = Array.isArray(noExternal) ? noExternal : [noExternal]
  return list.includes(kit) ? list : [...list, kit]
}

export function defineSite({ tailwind = true, vite = {}, ...config }: SiteOptions): AstroUserConfig {
  const src = resolve(process.cwd(), config.root ?? '.', 'src')
  return {
    ...config,
    vite: {
      ...vite,
      plugins: [...(tailwind ? [tailwindcss()] : []), ...(vite.plugins ?? [])],
      resolve: { ...vite.resolve, alias: withSrcAlias(vite.resolve?.alias, src) },
      ssr: { ...vite.ssr, noExternal: withKit(vite.ssr?.noExternal) },
    },
  }
}
