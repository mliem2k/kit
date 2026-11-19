import { describe, expect, test } from 'bun:test'
import { bindMenu, bindScrolled } from './client'

function fakeElement() {
  const classes = new Set<string>()
  const attrs = new Map<string, string>()
  const listeners: Record<string, (() => void)[]> = {}
  return {
    classes,
    attrs,
    classList: {
      toggle: (t: string, force?: boolean) => {
        const on = force ?? !classes.has(t)
        if (on) classes.add(t)
        else classes.delete(t)
        return on
      },
      contains: (t: string) => classes.has(t),
    },
    toggleAttribute: (name: string, force?: boolean) => {
      const on = force ?? !attrs.has(name)
      if (on) attrs.set(name, '')
      else attrs.delete(name)
      return on
    },
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    addEventListener: (type: string, fn: () => void) => void (listeners[type] ??= []).push(fn),
    fire: (type: string, event?: unknown) => {
      for (const fn of listeners[type] ?? []) (fn as (e: unknown) => void)(event)
    },
    focused: false,
    focus() {
      this.focused = true
    },
  }
}

describe('bindScrolled', () => {
  test('toggles data-scrolled and the class past the threshold', () => {
    const el = fakeElement()
    const win = { scrollY: 0, ...fakeElement() }
    bindScrolled(el, { threshold: 50, className: 'shadow-md', target: win as never })
    expect(el.attrs.has('data-scrolled')).toBe(false)
    win.scrollY = 60
    win.fire('scroll')
    expect(el.attrs.has('data-scrolled')).toBe(true)
    expect(el.classes.has('shadow-md')).toBe(true)
    win.scrollY = 10
    win.fire('scroll')
    expect(el.classes.has('shadow-md')).toBe(false)
  })
})

describe('bindMenu', () => {
  test('opens, closes on a link and on Escape, and keeps aria-expanded in step', () => {
    const button = fakeElement()
    const link = fakeElement()
    const menu = { ...fakeElement(), querySelectorAll: () => [link] }
    menu.classes.add('hidden')
    const doc = fakeElement()
    bindMenu(button, menu, { openClass: 'flex', keyTarget: doc as never })

    button.fire('click')
    expect(menu.classes.has('hidden')).toBe(false)
    expect(menu.classes.has('flex')).toBe(true)
    expect(button.attrs.get('aria-expanded')).toBe('true')

    link.fire('click')
    expect(menu.classes.has('hidden')).toBe(true)
    expect(button.attrs.get('aria-expanded')).toBe('false')

    button.fire('click')
    doc.fire('keydown', { key: 'Escape' })
    expect(menu.classes.has('hidden')).toBe(true)
    expect(menu.classes.has('flex')).toBe(false)
    expect(button.focused).toBe(true)
  })

  test('does nothing without both elements', () => {
    expect(() => bindMenu(null, null)).not.toThrow()
  })
})
