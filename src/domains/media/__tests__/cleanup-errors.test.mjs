import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { replace, database, logger } from '../../../__tests__/helpers.mjs'
let mode = 'directory'
mock.module('node:fs/promises', {
  exports: {
    opendir: async () => {
      if (mode === 'directory') throw new Error('permission')
      return {
        [Symbol.asyncIterator]: async function* () {
          yield {
            name: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            isFile: () => true
          }
        }
      }
    },
    stat: async () => {
      throw Error('stat failed')
    },
    rm: async () => {}
  }
})
replace('domains/media/image.js', { Image: class {} })
replace('app/database/mongodb.js', { database })
replace('app/runtime/logger.js', { logger })
replace('domains/media/model.js', {
  Media: {
    find: () => ({
      sort() {
        return this
      },
      limit() {
        return this
      },
      lean() {
        return this
      },
      exec: async () => []
    })
  }
})
const { cleanupMedia } =
  await import('../../../../dist/domains/media/cleanup.js')
test('directory errors propagate and per-file errors are counted for retry', async () => {
  await assert.rejects(() => cleanupMedia(async () => {}), /permission/)
  mode = 'stat'
  const result = await cleanupMedia(async () => {})
  assert.equal(result.failed, 1)
})
