import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toOwnedImageDto } from '../../../../dist/domains/media/transformer.js'

test('owned media adapter converts identifiers and validates MIME', () => {
  const file = {
    _id: 123,
    owner: 456,
    originalname: 'a.png',
    encoding: 'binary',
    mimetype: 'image/png',
    filename: 'safe',
    destination: '.',
    path: 'safe',
    size: 10
  }
  const result = toOwnedImageDto(file)
  assert.equal(result.owner, '456')
  assert.equal(result.id, '123')
  assert.throws(() => toOwnedImageDto({ ...file, mimetype: 'image/svg+xml' }))
})
