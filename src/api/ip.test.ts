import { describe, expect, test } from 'bun:test'
import { getClientIp } from './ip'

describe('getClientIp', () => {
  test('prefers the proxy-set fly-client-ip header', () => {
    const request = new Request('http://example.com', {
      headers: { 'fly-client-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' },
    })
    expect(getClientIp(request)).toBe('1.2.3.4')
  })

  test('uses the rightmost x-forwarded-for hop', () => {
    const request = new Request('http://example.com', {
      headers: { 'x-forwarded-for': '9.9.9.9, 5.6.7.8' },
    })
    expect(getClientIp(request)).toBe('5.6.7.8')
  })

  test('falls back to x-real-ip and then unknown', () => {
    expect(getClientIp(new Request('http://example.com', { headers: { 'x-real-ip': '2.3.4.5' } }))).toBe('2.3.4.5')
    expect(getClientIp(new Request('http://example.com'))).toBe('unknown')
    expect(getClientIp(new Request('http://example.com'), '10.0.0.1')).toBe('10.0.0.1')
  })
})
