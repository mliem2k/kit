import { describe, expect, test } from 'bun:test'
import { Elysia, t } from 'elysia'
import { ConflictError, NotFoundError, ValidationError, createErrorHandler, errorPlugin } from './errors'

const quiet = () => {}
/** A child module throws; the handler is mounted on the parent, as the apps do. */
const appWith = (options: Parameters<typeof createErrorHandler>[0], thrown: () => never) =>
  new Elysia()
    .use(createErrorHandler({ log: quiet, ...options }))
    .use(new Elysia().use(errorPlugin).get('/boom', thrown).post('/body', ({ body }) => body, { body: t.Object({ n: t.Number() }) }))
const call = async (app: ReturnType<typeof appWith>, path = '/boom', init?: RequestInit) => {
  const res = await app.handle(new Request(`http://localhost${path}`, init))
  return { status: res.status, type: res.headers.get('content-type'), body: await res.json() as Record<string, unknown> }
}

describe('createErrorHandler', () => {
  test('errors thrown in a child module come back as JSON, which needs the handler to be global', async () => {
    const out = await call(appWith({}, () => { throw new NotFoundError('nope') }))
    expect(out).toEqual({ status: 404, type: 'application/json;charset=utf-8', body: { error: 'nope', code: 'NOT_FOUND' } })
  })

  test('each shared class has its status and code, and a default message for not found', async () => {
    expect((await call(appWith({}, () => { throw new ValidationError('bad') }))).body).toEqual({ error: 'bad', code: 'VALIDATION_ERROR' })
    expect((await call(appWith({}, () => { throw new ConflictError('dup') })))).toMatchObject({ status: 409, body: { code: 'CONFLICT' } })
    expect((await call(appWith({}, () => { throw new NotFoundError() }))).body.error).toBe('Resource not found')
  })

  test('the app\'s own errors are answered by map, which is tried before the shared rules', async () => {
    class AuthError extends Error {}
    const app = appWith({ map: (e) => (e instanceof AuthError ? { status: 401, body: { error: e.message, code: 'UNAUTHORIZED' } } : undefined) }, () => { throw new AuthError('sign in') })
    expect(await call(app)).toMatchObject({ status: 401, body: { error: 'sign in', code: 'UNAUTHORIZED' } })
    // an error map does not know falls through to the shared rules
    const other = appWith({ map: () => undefined }, () => { throw new NotFoundError('x') })
    expect((await call(other)).status).toBe(404)
  })

  test('Elysia validation failures are 400 with details only in development', async () => {
    const bad = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ n: 'x' }) }
    const prod = await call(appWith({}, () => { throw new Error('unused') }), '/body', bad)
    expect(prod).toMatchObject({ status: 400, body: { error: 'Validation failed', code: 'VALIDATION' } })
    expect('details' in prod.body).toBe(false)
    expect('details' in (await call(appWith({ development: true }, () => { throw new Error('unused') }), '/body', bad)).body).toBe(true)
  })

  test('Postgres unique and foreign key violations are 409 conflicts', async () => {
    const unique = Object.assign(new Error('duplicate key'), { code: '23505' })
    const fk = Object.assign(new Error('fk'), { code: '23503' })
    expect((await call(appWith({}, () => { throw unique }))).body).toEqual({ error: 'Conflict: duplicate value', code: 'CONFLICT' })
    expect((await call(appWith({}, () => { throw fk }))).body).toEqual({ error: 'Conflict: related record exists', code: 'CONFLICT' })
  })

  test('anything else is a logged 500 that shows its message only in development', async () => {
    const seen: unknown[] = []
    const hidden = await call(appWith({ log: (e) => seen.push(e) }, () => { throw new Error('secret detail') }))
    expect(hidden).toMatchObject({ status: 500, body: { error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } })
    expect(JSON.stringify(hidden.body)).not.toContain('secret detail')
    expect(seen).toHaveLength(1)
    expect((await call(appWith({ development: true }, () => { throw new Error('secret detail') }))).body.message).toBe('secret detail')
  })
})
