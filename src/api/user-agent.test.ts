import { describe, expect, test } from 'bun:test'
import { parseUserAgent } from './user-agent.js'

describe('parseUserAgent', () => {
  test('parses desktop Chrome on Windows', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('desktop')
    expect(result.browserName).toBe('Chrome')
    expect(result.browserVersion).toBe('120')
    expect(result.osName).toBe('Windows')
    expect(result.osVersion).toBe('10')
  })

  test('parses desktop Safari on macOS', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('desktop')
    expect(result.browserName).toBe('Safari')
    expect(result.browserVersion).toBe('17.5')
    expect(result.osName).toBe('macOS')
    expect(result.osVersion).toBe('14.5')
  })

  test('parses mobile Safari on iOS', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('mobile')
    expect(result.browserName).toBe('Safari')
    expect(result.browserVersion).toBe('17.5')
    expect(result.osName).toBe('iOS')
    expect(result.osVersion).toBe('17.5')
  })

  test('parses tablet Chrome on Android (iPad falls back to tablet via Macintosh+Mobile check is out of scope; this covers an Android tablet UA)', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('tablet')
    expect(result.browserName).toBe('Chrome')
    expect(result.browserVersion).toBe('120')
    expect(result.osName).toBe('Android')
    expect(result.osVersion).toBe('13')
  })

  test('parses mobile Chrome on Android phone', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    const result = parseUserAgent(ua)
    expect(result.deviceType).toBe('mobile')
    expect(result.browserName).toBe('Chrome')
    expect(result.osName).toBe('Android')
  })

  test('parses Firefox on Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    const result = parseUserAgent(ua)
    expect(result.browserName).toBe('Firefox')
    expect(result.browserVersion).toBe('121.0')
    expect(result.osName).toBe('Windows')
  })

  test('parses Edge on Windows (must not be misidentified as Chrome)', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    const result = parseUserAgent(ua)
    expect(result.browserName).toBe('Edge')
  })

  test('returns desktop and null fields for empty string', () => {
    const result = parseUserAgent('')
    expect(result.deviceType).toBe('desktop')
    expect(result.browserName).toBeNull()
    expect(result.browserVersion).toBeNull()
    expect(result.osName).toBeNull()
    expect(result.osVersion).toBeNull()
  })

  test('returns desktop and null fields for null input', () => {
    const result = parseUserAgent(null)
    expect(result.deviceType).toBe('desktop')
    expect(result.browserName).toBeNull()
  })

  test('returns desktop and null fields for undefined input', () => {
    const result = parseUserAgent(undefined)
    expect(result.deviceType).toBe('desktop')
    expect(result.browserName).toBeNull()
  })

  test('returns desktop and null fields for a nonsense string', () => {
    const result = parseUserAgent('not a real user agent string 12345')
    expect(result.deviceType).toBe('desktop')
    expect(result.browserName).toBeNull()
    expect(result.osName).toBeNull()
  })
})
