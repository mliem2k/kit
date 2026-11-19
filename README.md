# @mliemm/kit

Code that more than one of the mliemm apps (erp, bms, rms, invoice, omnidesk, the games and the landing sites) needs, kept in one place so it is written, tested and fixed once. It ships as TypeScript source: Bun, Vite and esbuild compile it inside the consuming app, so there is no build step and no registry.

## What is in it

| Import | What it is |
|---|---|
| `@mliemm/kit/api/date` | Timestamp contract for the billiard and restaurant databases: naive UTC digits in storage, tagged instants on the wire |
| `@mliemm/kit/api/ip` | Client IP from `fly-client-ip` or the rightmost `x-forwarded-for` hop |
| `@mliemm/kit/api/user-agent` | Small user agent parser for login logs |
| `@mliemm/kit/api/password` | bcrypt and scrypt password hashing and verification, with migration from the old hash |
| `@mliemm/kit/api/security-log` | One JSON line per security event, for the platform log drain |
| `@mliemm/kit/api/rate-limit` | `createRateLimiter({ db, rateLimits })`, a fixed window limiter in one upsert |
| `@mliemm/kit/api/memory-rate-limit` | `createMemoryRateLimiter()`, the same fixed window for public, mostly stateless APIs |
| `@mliemm/kit/api/ttl-cache` | `createTtlCache()`, an in-process cache with a time to live |
| `@mliemm/kit/api/shutdown` | `createShutdown()`, a graceful stop for an Elysia server on SIGTERM |
| `@mliemm/kit/api/json-console` | `installJsonConsole()`, one JSON line per console call so Cloud Run reads the severity |
| `@mliemm/kit/api/audit` | `createAuditPlugin({ extractUser, write })`, an Elysia plugin that audits mutating requests |
| `@mliemm/kit/api/migrate` | `runMigrationsFromEnv(folder)` for each app's `db/migrate.ts` |
| `@mliemm/kit/api/roles` | `createRoleService({ db, role, notFound })` and the Elysia `roleModels`; `db`/`role` are drizzle's own types |
| `@mliemm/kit/api/login-logs` | `createLoginLogService({ db, loginLog })` and the Elysia `loginLogModels`; `db`/`loginLog` are drizzle's own types |
| `@mliemm/kit/web/cn` | `cn()`, clsx plus tailwind-merge |
| `@mliemm/kit/web/ui/*` | shadcn style `card`, `dialog`, `label`, `tabs`, `toast`, `toaster`, `avatar`, `radio-group`, `separator`, `alert-dialog`, `checkbox`, `dropdown-menu`, `popover`, `select`, `skeleton`, `table`, `textarea`, `scroll-area`, `badge` |
| `@mliemm/kit/web/ui/switch` | `createSwitch({ track, thumb })`, plus the default `Switch` |
| `@mliemm/kit/web/ui/input` | `createInput({ focusClass })`, plus the default `Input` |
| `@mliemm/kit/web/ui/button` | `createButton({ sizes })`, plus the default `Button` and `buttonVariants` |
| `@mliemm/kit/web/components/theme-toggle` | `createThemeToggle(useTheme)` |
| `@mliemm/kit/web/hooks/use-toast` | The toast store the toaster reads |
| `@mliemm/kit/web/hooks/use-theme` | `createUseTheme(storageKey)` |
| `@mliemm/kit/web/hooks/eden` | `useEdenQuery`, `useEdenMutation` and `toError` for Eden + react-query |
| `@mliemm/kit/web/auth` | `createAuthContext({ eden, logoutFlagKey })`, the session provider and `useAuth` |
| `@mliemm/kit/web/company` | `createCompanyContext({ apiUrl, defaultName })`, the company name/logo provider |
| `@mliemm/kit/api/errors` | `createErrorHandler({ development, map })`, the JSON `{ error, code }` handler for Elysia APIs (registered global, so errors from every module reach it), the `NotFoundError`, `ValidationError` and `ConflictError` classes and `errorPlugin`; an app's own errors go through `map` |
| `@mliemm/kit/biome/app.json` | Biome base for the Bun and React apps (erp, bms, rms, invoice): git ignore, build and migration folders skipped, two space indent, line width 100, the a11y rule settings |
| `@mliemm/kit/astro/site` | `defineSite({ site, ... })`, an Astro config that adds the Tailwind v4 Vite plugin, the `@` alias for `<project>/src` and compiles the kit's `.astro` files; every other Astro option passes through |
| `@mliemm/kit/astro/Seo.astro` | `<Seo />` for the site's own `<head>`: title, description, canonical, hreflang alternates, robots, Open Graph (image details, locales), Twitter card, JSON-LD, and a slot for tags only one site needs; a `noindex` page leaves out the canonical and the alternates |
| `@mliemm/kit/astro/seo` | `seoTags(props)`, the data behind `<Seo />`, and `jsonForScript` |
| `@mliemm/kit/astro/i18n` | `createI18n({ locales, defaultLocale, messages })`: ICU `translator(locale)`, `localePath`, `stripLocale`, `localeFromPath`, `alternates` |
| `@mliemm/kit/astro/locale-path` | `createLocalePaths({ locales, defaultLocale })`, the path rules alone, with no formatter |
| `@mliemm/kit/astro/whatsapp` | `whatsappUrl(phone, text?)`, a wa.me link from a number in any format |
| `@mliemm/kit/astro/google-form` | `submitGoogleForm(action, fields)`, a contact form post to a Google Form, refusing a URL that is not `formResponse` |
| `@mliemm/kit/astro/client` | `bindMenu` and `bindScrolled` for a site's bundled scripts |
| `@mliemm/kit/astro/biome.json` | Biome base for Astro sites: git ignore, `dist` and `.astro` skipped, two space indent, recommended linter, import sorting, Tailwind directives in CSS |

Things that differ per app on purpose (dialog chrome, badge palettes, erp's separate design system) stay in the app. A file belongs here when two apps have the same bytes, or differ only by a constant that can be a parameter (a size, a storage key, an API client).

## Using it in an app

The package was `@mliem2k/kit` up to v0.13.0 and is `@mliemm/kit` from v0.14.0, after the GitHub account was renamed. Moving an app over means changing the dependency name and its import paths together with the tag; `import ... from '@mliem2k/kit/...'` stops resolving once the old name is no longer installed.

```sh
bun add https://github.com/mliemm/kit/archive/refs/tags/v0.14.0.tar.gz
```

The tarball URL is pinned to a tag and `bun.lock` records its integrity hash, so installs need no token, no git binary and no registry (Docker images, Fly and Vercel builds included). To move to a newer version, install the newer tag's URL.

Keep each app's existing import paths working by turning the old file into a one line re-export instead of rewriting every import:

```ts
// apps/api/src/utils/ip.ts
export * from '@mliemm/kit/api/ip'
```

Projects that wire a factory do it once, next to the old file. For a component the old file becomes the factory call:

```ts
// apps/api/src/utils/rate-limit.ts
import { createRateLimiter } from '@mliemm/kit/api/rate-limit'
import { db, rateLimits } from '../db/index.js'

export type { RateLimitResult } from '@mliemm/kit/api/rate-limit'
export const rateLimit = createRateLimiter({ db, rateLimits })
```

### Stack baseline

The versions the apps are kept on, so a bump is a change to this table first. Grouped Dependabot updates, as `games` has, keep a repo near it.

| | Version | Notes |
|---|---|---|
| Bun | 1.4.4 | `packageManager` and the CI `bun_version` |
| TypeScript | ^7.0.2 | `^6.0.3` for Astro sites, where `astro check` runs on 6; TypeScript 7 has no `baseUrl` |
| React | ^19.2.7 | with `@types/react` ^19.2.17 |
| Vite | ^8.1 | plugin-react ^6 |
| Tailwind | ^4.3 | |
| Elysia / Eden | ^1.4.29 / ^1.4.9 | |
| Drizzle | ^0.45.4 | drizzle-kit ^0.31 |
| better-auth | ^1.6 | |
| zod | ^4 | |
| TanStack | Query ^5.101, Router ^1.170 | |
| Biome | ^2.5 | extend `@mliemm/kit/biome/app.json` or `astro/biome.json` |
| Vitest | ^4.1 | |
| Astro | ^7 | with Tailwind through `defineSite` |

### Shared CI

`.github/workflows/ci-bun.yml` is the part of a Bun repo's CI that every repo repeats (checkout, Bun, cache, frozen install); the caller passes its own commands:

```yaml
jobs:
  ci:
    uses: mliemm/kit/.github/workflows/ci-bun.yml@v0.13.0
    with:
      run: |
        bun run typecheck
        bun run check
        bun run test
      env: '{"DATABASE_URL": "file:./ci.db"}'
```

`run` and `env` come from the calling workflow, so only pass values you control.

### Astro sites

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap'
import { defineSite } from '@mliemm/kit/astro/site'

export default defineSite({ site: 'https://example.com', integrations: [sitemap()], i18n: { /* ... */ } })
```

```astro
---
// src/layouts/BaseLayout.astro
import Seo from '@mliemm/kit/astro/Seo.astro'
---
<head>
  <Seo title="Home | Example" description="..." canonical={Astro.url.href} image={new URL('/og.png', Astro.site)} jsonLd={organization} />
  <!-- icons, font preloads, manifest: the site's own -->
</head>
```

```json
// biome.json
{ "extends": ["@mliemm/kit/astro/biome.json"], "formatter": { "lineWidth": 100 }, "javascript": { "formatter": { "quoteStyle": "single" } } }
```

`astro` and `@tailwindcss/vite` are optional peers: the site installs them. Quote style, semicolons and line width are left to each site, since they differ. There is no shared `tsconfig`: `paths` and `include` in an extended config resolve from the preset's own folder, so the site keeps its small one. The deploy workflow for Cloudflare Pages is `.github/workflows/deploy-pages.yml` (see the sites' `deploy.yml`).

### Tailwind

Tailwind v4 skips `node_modules` when it looks for class names, so an app that uses the UI primitives must add the kit as a source in its main stylesheet or the classes will not be generated:

```css
@source "../node_modules/@mliemm/kit/src/web";
```

(adjust the relative path to where `node_modules` sits for that app; in a Bun workspace it may be the repository root.)

## Changing it

```sh
bun install
bun test        # unit tests for the API utilities
bun run typecheck
```

Change the kit, tag a release (`git tag v0.2.0 && git push origin v0.2.0`), then bump the tarball URL in each app that needs the change. Apps pin their own version, so a kit change never lands in an app until that app updates and its own tests pass.

To try an unreleased change in an app without tagging, point the dependency at the local checkout (`bun add ../kit`) and switch back to a tag URL before committing.
