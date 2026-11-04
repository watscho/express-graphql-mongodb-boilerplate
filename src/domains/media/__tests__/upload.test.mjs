import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { replace } from '../../../__tests__/helpers.mjs'
const root = await mkdtemp(join(tmpdir(), 'graphql-upload-'))
replace('domains/media/utils.js', { storageRoot: root })
const { storeUpload } = await import('../../../../dist/domains/media/upload.js')
after(() => rm(root, { recursive: true, force: true }))
test('upload stores generated server filename, never a user-controlled path', async () => {
  const result = await storeUpload(
    new File(['image-bytes'], '../../secret.png', { type: 'image/png' })
  )
  assert.match(result.filename, /^[a-f0-9-]{36}$/)
  assert.equal(await readFile(result.path, 'utf8'), 'image-bytes')
  assert.equal(result.mimetype, 'image/png')
  await rm(result.path)
})
test('upload rejects oversized files and unsupported MIME before creating files', async () => {
  await assert.rejects(() => storeUpload({ size: 20_000_000 }), { status: 413 })
  await assert.rejects(
    () => storeUpload(new File(['x'], 'image.svg', { type: 'image/svg+xml' })),
    { status: 400 }
  )
  assert.deepEqual(await readdir(root), [])
})
test('failed upload removes incomplete temporary file', async () => {
  await assert.rejects(
    () =>
      storeUpload({
        size: 1,
        type: 'image/png',
        arrayBuffer: async () => {
          throw Error('read failed')
        }
      }),
    /read failed/
  )
  assert.deepEqual(await readdir(root), [])
})
