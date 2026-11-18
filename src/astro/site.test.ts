import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { defineSite } from './site'

const src = resolve(process.cwd(), 'src')
const vite = (config: ReturnType<typeof defineSite>) => config.vite!

describe('defineSite', () => {
  test('adds Tailwind, the @ alias and the kit to Vite, and passes everything else through untouched', () => {
    const config = defineSite({ site: 'https://acme.test', output: 'static', prefetch: false, build: { format: 'directory' } })
    expect(config.site).toBe('https://acme.test')
    expect(config.output).toBe('static')
    expect(config.prefetch).toBe(false)
    expect(config.build).toEqual({ format: 'directory' })
    expect(vite(config).plugins).toHaveLength(1)
    expect(vite(config).resolve?.alias).toEqual({ '@': src })
    expect(vite(config).ssr?.noExternal).toEqual(['@mliem2k/kit'])
  })

  test('tailwind can be turned off, and the site\'s own plugins and Vite settings are kept', () => {
    const own = { name: 'own' }
    const config = defineSite({ site: 'https://acme.test', tailwind: false, vite: { plugins: [own], build: { minify: true } } })
    expect(vite(config).plugins).toEqual([own])
    expect(vite(config).build).toEqual({ minify: true })
    const both = defineSite({ site: 'https://acme.test', vite: { plugins: [own] } })
    expect(vite(both).plugins).toHaveLength(2)
    expect(vite(both).plugins!.at(-1)).toBe(own)
  })

  test('a site that already defines @ or other aliases keeps them, in object and array form', () => {
    const object = defineSite({ site: 'https://acme.test', vite: { resolve: { alias: { '@': '/elsewhere', '~': '/tilde' } } } })
    expect(vite(object).resolve?.alias).toEqual({ '@': '/elsewhere', '~': '/tilde' })
    const array = defineSite({ site: 'https://acme.test', vite: { resolve: { alias: [{ find: '~', replacement: '/tilde' }] } } })
    expect(vite(array).resolve?.alias).toEqual([{ find: '@', replacement: src }, { find: '~', replacement: '/tilde' }])
    const claimed = defineSite({ site: 'https://acme.test', vite: { resolve: { alias: [{ find: '@', replacement: '/mine' }] } } })
    expect(vite(claimed).resolve?.alias).toEqual([{ find: '@', replacement: '/mine' }])
  })

  test('the alias follows a custom root, and noExternal keeps what the site listed once', () => {
    expect(vite(defineSite({ site: 'https://acme.test', root: 'sub' })).resolve?.alias).toEqual({ '@': resolve(process.cwd(), 'sub', 'src') })
    expect(vite(defineSite({ site: 'https://acme.test', vite: { ssr: { noExternal: 'other' } } })).ssr?.noExternal).toEqual(['other', '@mliem2k/kit'])
    expect(vite(defineSite({ site: 'https://acme.test', vite: { ssr: { noExternal: ['@mliem2k/kit'] } } })).ssr?.noExternal).toEqual(['@mliem2k/kit'])
    expect(vite(defineSite({ site: 'https://acme.test', vite: { ssr: { noExternal: true } } })).ssr?.noExternal).toBe(true)
  })
})
