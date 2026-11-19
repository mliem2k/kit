import { describe, expect, test } from 'bun:test'
import { googleFormBody, submitGoogleForm } from './google-form'

const ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSe_x-1/formResponse'

describe('submitGoogleForm', () => {
  test('posts the fields urlencoded with no-cors', async () => {
    const calls: [string, RequestInit][] = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push([url, init])
      return new Response(null)
    }) as unknown as typeof fetch
    await submitGoogleForm(ACTION, { 'entry.1': 'Ana & Co', 'entry.2': 'hi' }, fetcher)
    expect(calls[0][0]).toBe(ACTION)
    expect(calls[0][1].method).toBe('POST')
    expect(calls[0][1].mode).toBe('no-cors')
    expect(String(calls[0][1].body)).toBe('entry.1=Ana+%26+Co&entry.2=hi')
  })

  test('accepts the /u/0/ form of the URL and refuses a viewform URL', async () => {
    const ok = (async () => new Response(null)) as unknown as typeof fetch
    await submitGoogleForm('https://docs.google.com/forms/u/0/d/e/abc/formResponse', {}, ok)
    await expect(submitGoogleForm('https://docs.google.com/forms/d/e/abc/viewform', {}, ok)).rejects.toThrow('not a Google Forms formResponse URL')
  })

  test('a network failure rejects', async () => {
    const down = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(submitGoogleForm(ACTION, {}, down)).rejects.toThrow('Failed to fetch')
  })

  test('FormData keeps its text fields and drops files', () => {
    const data = new FormData()
    data.append('entry.1', 'x')
    data.append('upload', new Blob(['y']))
    expect(String(googleFormBody(data))).toBe('entry.1=x')
  })
})
