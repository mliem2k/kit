import { expect, test } from 'bun:test'
import { whatsappUrl } from './whatsapp'

test('keeps only digits and encodes the text', () => {
  expect(whatsappUrl('+62 878-8618 1566')).toBe('https://wa.me/6287886181566')
  expect(whatsappUrl('6285668886168', 'Halo, saya mau tanya & pesan')).toBe('https://wa.me/6285668886168?text=Halo%2C%20saya%20mau%20tanya%20%26%20pesan')
  expect(() => whatsappUrl('call us')).toThrow('no digits')
})
