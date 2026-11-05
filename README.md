# @mliem2k/kit

Code that more than one of the mliem2k apps (erp, bms, rms, omnisell) needs, kept in one place so it is written, tested and fixed once. It ships as TypeScript source: Bun, Vite and esbuild compile it inside the consuming app, so there is no build step and no registry.

## What is in it

| Import | What it is |
|---|---|
| `@mliem2k/kit/api/date` | Timestamp contract for the billiard and restaurant databases: naive UTC digits in storage, tagged instants on the wire |
| `@mliem2k/kit/api/ip` | Client IP from proxy headers |
| `@mliem2k/kit/api/user-agent` | Small user agent parser for login logs |
| `@mliem2k/kit/api/password` | bcrypt and scrypt password hashing and verification, with migration from the old hash |
| `@mliem2k/kit/api/security-log` | One JSON line per security event, for the platform log drain |
| `@mliem2k/kit/api/rate-limit` | `createRateLimiter({ db, rateLimits })`, a fixed window limiter in one upsert |
| `@mliem2k/kit/api/audit` | `createAuditPlugin({ extractUser, write })`, an Elysia plugin that audits mutating requests |
| `@mliem2k/kit/api/migrate` | `runMigrationsFromEnv(folder)` for each app's `db/migrate.ts` |
| `@mliem2k/kit/api/roles` | `createRoleService({ db, role, notFound })` and the Elysia `roleModels` |
| `@mliem2k/kit/api/login-logs` | `createLoginLogService({ db, loginLog })` and the Elysia `loginLogModels` |
| `@mliem2k/kit/web/cn` | `cn()`, clsx plus tailwind-merge |
| `@mliem2k/kit/web/ui/*` | shadcn style `card`, `label`, `tabs`, `toast`, `toaster`, `avatar`, `radio-group`, `separator` |
| `@mliem2k/kit/web/ui/button` | `createButton({ sizes })`, plus the default `Button` and `buttonVariants` |
| `@mliem2k/kit/web/components/theme-toggle` | `createThemeToggle(useTheme)` |
| `@mliem2k/kit/web/hooks/use-toast` | The toast store the toaster reads |
| `@mliem2k/kit/web/hooks/use-theme` | `createUseTheme(storageKey)` |
| `@mliem2k/kit/web/auth` | `createAuthContext({ eden, logoutFlagKey })`, the session provider and `useAuth` |
| `@mliem2k/kit/web/company` | `createCompanyContext({ apiUrl, defaultName })`, the company name/logo provider |

Things that differ per app on purpose (dialog chrome, badge palettes, erp's separate design system) stay in the app. A file belongs here when two apps have the same bytes, or differ only by a constant that can be a parameter (a size, a storage key, an API client).

## Using it in an app

```sh
bun add https://github.com/mliem2k/kit/archive/refs/tags/v0.3.0.tar.gz
```

The tarball URL is pinned to a tag and `bun.lock` records its integrity hash, so installs need no token, no git binary and no registry (Docker images, Fly and Vercel builds included). To move to a newer version, install the newer tag's URL.

Keep each app's existing import paths working by turning the old file into a one line re-export instead of rewriting every import:

```ts
// apps/api/src/utils/ip.ts
export * from '@mliem2k/kit/api/ip'
```

Projects that wire a factory do it once, next to the old file. For a component the old file becomes the factory call:

```ts
// apps/api/src/utils/rate-limit.ts
import { createRateLimiter } from '@mliem2k/kit/api/rate-limit'
import { db, rateLimits } from '../db/index.js'

export type { RateLimitResult } from '@mliem2k/kit/api/rate-limit'
export const rateLimit = createRateLimiter({ db, rateLimits })
```

### Tailwind

Tailwind v4 skips `node_modules` when it looks for class names, so an app that uses the UI primitives must add the kit as a source in its main stylesheet or the classes will not be generated:

```css
@source "../node_modules/@mliem2k/kit/src/web";
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
