import { afterEach, describe, expect, it } from 'bun:test'
import { formatLogLine, installJsonConsole } from './json-console'

describe('formatLogLine', () => {
  it('writes one line of JSON with the severity and the formatted message', () => {
    const line = formatLogLine('INFO', ['Login successful for user:', 'abc'])
    expect(line.endsWith('\n')).toBe(true)
    expect(JSON.parse(line)).toEqual({
      severity: 'INFO',
      message: 'Login successful for user: abc',
    })
  })

  it('keeps a multi line stack trace inside a single entry', () => {
    const error = new Error('boom')
    const line = formatLogLine('ERROR', ['[bills] failed', error])
    expect(line.trim().split('\n')).toHaveLength(1)
    const parsed = JSON.parse(line)
    expect(parsed.severity).toBe('ERROR')
    expect(parsed.message).toContain('boom')
    expect(parsed.message).toContain('\n')
  })

  it('keeps the fields of a call that already passes one JSON object', () => {
    const event = JSON.stringify({
      ts: 't',
      level: 'security',
      type: 'auth.sign_in.failure',
      ip: '1.2.3.4',
    })
    expect(JSON.parse(formatLogLine('INFO', [event]))).toEqual({
      severity: 'INFO',
      message: 'auth.sign_in.failure',
      ts: 't',
      level: 'security',
      type: 'auth.sign_in.failure',
      ip: '1.2.3.4',
    })
  })

  it('treats text that only starts with a brace as plain text', () => {
    expect(JSON.parse(formatLogLine('INFO', ['{not json'])).message).toBe('{not json')
  })
})

describe('installJsonConsole', () => {
  let restore: (() => void) | undefined
  afterEach(() => restore?.())

  it('maps each console method to a severity and restores the originals', () => {
    const lines: string[] = []
    const originalLog = console.log
    restore = installJsonConsole((line) => lines.push(line))
    console.log('a')
    console.warn('b')
    console.error('c')
    restore()
    restore = undefined
    expect(lines.map((l) => JSON.parse(l).severity)).toEqual(['INFO', 'WARNING', 'ERROR'])
    expect(console.log).toBe(originalLog)
  })
})
