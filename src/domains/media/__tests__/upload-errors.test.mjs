import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
const original = new Error('disk write failed')
let removed
mock.module('node:fs/promises', {
  exports: {
    mkdir: async () => {},
    writeFile: async () => {
      throw original
    },
    rm: async path => {
      removed = path
      throw new Error('cleanup failed')
    }
  }
})
const { storeUpload } = await import('../../../../dist/domains/media/upload.js')
test('failed cleanup preserves the upload failure and attempts generated path only', async () => {
  await assert.rejects(
    () =>
      storeUpload(new File(['x'], '../../secret.png', { type: 'image/png' })),
    error => error === original
  )
  assert.match(removed, /\/[a-f0-9-]{36}$/)
  assert(!removed.includes('secret.png'))
})
