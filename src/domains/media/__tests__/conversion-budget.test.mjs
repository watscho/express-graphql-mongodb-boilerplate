import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { replace } from '../../../__tests__/helpers.mjs'
const pipeline = {
  rotate() {
    return this
  },
  resize() {
    return this
  },
  webp() {
    return this
  },
  toFile: async () => ({ size: 256 * 1024 + 1 })
}
mock.module('sharp', { exports: { default: () => pipeline } })
let renamed = false,
  removed = false
mock.module('node:fs/promises', {
  exports: {
    access: async () => {
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    },
    mkdir: async () => {},
    rename: async () => {
      renamed = true
    },
    rm: async () => {
      removed = true
    }
  }
})
replace('domains/media/utils.js', { storagePath: path => '/unit/' + path })
const { Image } = await import('../../../../dist/domains/media/image.js')
test('conversion cannot exceed the byte allowance reserved in owner quota', async () => {
  await assert.rejects(() => new Image({ filename: 'unit' }).resize(), {
    messageKey: 'media.conversion_too_large'
  })
  assert.equal(renamed, false)
  assert.equal(removed, true)
})
