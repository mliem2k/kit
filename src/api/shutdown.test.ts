import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { createShutdown } from './shutdown'

describe('createShutdown', () => {
  it('exits only after the server has finished stopping', async () => {
    const events: string[] = []
    let finishStop: () => void = () => {}
    const server = {
      stop: () =>
        new Promise<void>((resolve) => {
          finishStop = () => {
            events.push('stopped')
            resolve()
          }
        }),
    }
    const shutdown = createShutdown(server, {
      exit: (code) => events.push(`exit ${code}`),
      log: () => {},
    })
    const pending = shutdown('SIGTERM')
    await Bun.sleep(20)
    expect(events).toEqual([])
    finishStop()
    await pending
    expect(events).toEqual(['stopped', 'exit 0'])
  })

  it('forces exit 1 when the server never finishes stopping', async () => {
    const codes: number[] = []
    const server = { stop: () => new Promise<void>(() => {}) }
    const shutdown = createShutdown(server, {
      exit: (code) => codes.push(code),
      timeoutMs: 30,
      log: () => {},
    })
    void shutdown('SIGTERM')
    await Bun.sleep(80)
    expect(codes).toEqual([1])
  })

  it('ignores a second signal while shutting down', async () => {
    let stops = 0
    const server = { stop: async () => void stops++ }
    const shutdown = createShutdown(server, { exit: () => {}, log: () => {} })
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')])
    expect(stops).toBe(1)
  })

  it('lets a real in flight request finish before exiting', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: async () => {
        await Bun.sleep(300)
        return new Response('done')
      },
    })
    const codes: number[] = []
    const request = fetch(`http://127.0.0.1:${server.port}/`).then((r) => r.text())
    await Bun.sleep(50)
    await createShutdown(server, { exit: (code) => codes.push(code), log: () => {} })('SIGTERM')
    expect(await request).toBe('done')
    expect(codes).toEqual([0])
  })

  it('lets a real in flight request finish when the server is an Elysia app, as in production', async () => {
    const app = new Elysia()
      .get('/slow', async () => {
        await Bun.sleep(300)
        return 'done'
      })
      .listen(0)
    const codes: number[] = []
    const request = fetch(`http://127.0.0.1:${app.server?.port}/slow`).then((r) => r.text())
    await Bun.sleep(50)
    await createShutdown(app, { exit: (code) => codes.push(code), log: () => {} })('SIGTERM')
    expect(await request).toBe('done')
    expect(codes).toEqual([0])
  })
})
