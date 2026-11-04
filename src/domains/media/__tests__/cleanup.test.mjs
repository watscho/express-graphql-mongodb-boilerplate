import { test, beforeEach, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  mkdtemp,
  mkdir,
  writeFile,
  utimes,
  access,
  rm,
  symlink
} from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import {
  replace,
  methods,
  session,
  database,
  user,
  logger,
  reset
} from '../../../__tests__/helpers.mjs'
const root = await mkdtemp(join(tmpdir(), 'media-cleanup-'))
after(() => rm(root, { recursive: true, force: true }))
let candidates = [],
  claimed,
  existing = false,
  failClaim,
  failRemove
const findQuery = {
  sort() {
    return this
  },
  limit() {
    return this
  },
  lean() {
    return this
  },
  exec: async () => candidates
}
const claimQuery = {
  lean() {
    return this
  },
  exec: async () => {
    if (failClaim) throw Error('conflict')
    return claimed
  }
}
const Media = {
  find: mock.fn(() => findQuery),
  findOneAndUpdate: mock.fn(() => claimQuery),
  exists: mock.fn(() => ({ exec: async () => existing }))
}
const repo = methods(['finishDeletion'])
const image = methods(['deleteFile'])
replace('app/database/mongodb.js', { database })
replace('app/runtime/logger.js', { logger })
replace('domains/media/model.js', { Media })
replace('domains/media/repository.js', { mediaRepository: repo })
replace('domains/media/utils.js', {
  storageRoot: root,
  storagePath: path => join(root, path)
})
replace('domains/media/image.js', {
  Image: class {
    async deleteFile() {
      image.deleteFile()
      if (failRemove) throw Error('disk')
    }
  }
})
const { cleanupMedia } =
  await import('../../../../dist/domains/media/cleanup.js')
const lock = mock.fn(async () => user)
const row = {
  _id: user.id,
  owner: user.id,
  mimetype: 'image/png',
  filename: 'unit',
  path: 'unit',
  size: 1,
  originalname: 'unit.png',
  encoding: 'binary',
  destination: '.'
}
beforeEach(async () => {
  candidates = []
  claimed = undefined
  existing = false
  failClaim = false
  failRemove = false
  reset(repo, image, logger, database, { lock }, Media)
  await rm(join(root, 'conversions'), { recursive: true, force: true })
})
test('cleanup claims under owner lock and removes durable inventory only after files', async () => {
  candidates = [row]
  claimed = row
  assert.deepEqual(await cleanupMedia(lock), {
    deleted: 1,
    orphaned: 0,
    failed: 0
  })
  assert.deepEqual(lock.mock.calls[0].arguments, [user.id, session])
  assert.equal(
    Media.findOneAndUpdate.mock.calls[0].arguments[1].$set.state,
    'deleting'
  )
  assert(
    Media.findOneAndUpdate.mock.calls[0].arguments[1].$set.expiresAt >
      new Date()
  )
  assert.equal(repo.finishDeletion.mock.calls[0].arguments[0], user.id)
})
test('attachment after scan cannot be deleted by stale candidate', async () => {
  candidates = [row]
  assert.equal((await cleanupMedia(lock)).deleted, 0)
  assert.equal(image.deleteFile.mock.callCount(), 0)
})
for (const failure of ['claim', 'filesystem'])
  test(`failed ${failure} leaves inventory for retry`, async () => {
    candidates = [row]
    claimed = row
    failClaim = failure === 'claim'
    failRemove = failure === 'filesystem'
    assert.equal((await cleanupMedia(lock)).failed, 1)
    assert.equal(repo.finishDeletion.mock.callCount(), 0)
  })
test('orphan sweep removes old generated files while preserving recent, referenced, arbitrary and symlink paths', async () => {
  await mkdir(join(root, 'conversions'), { recursive: true })
  const uuid = randomUUID()
  const old = join(root, uuid)
  await writeFile(old, 'orphan')
  await utimes(old, 0, 0)
  const converted = join(root, 'conversions', uuid + '_150x150.webp')
  await writeFile(converted, 'orphan')
  await utimes(converted, 0, 0)
  const temporary = join(root, 'conversions', randomUUID() + '.tmp')
  await writeFile(temporary, 'old temporary')
  await utimes(temporary, 0, 0)
  const fresh = join(root, randomUUID())
  await writeFile(fresh, 'active')
  const named = join(root, 'operator-file')
  await writeFile(named, 'preserve')
  const link = join(root, randomUUID())
  await symlink(named, link)
  let result = await cleanupMedia(lock)
  assert.equal(result.orphaned, 3)
  await assert.rejects(() => access(old))
  await access(fresh)
  await access(named)
  await access(link)
  const retained = join(root, randomUUID())
  await writeFile(retained, 'owned')
  await utimes(retained, 0, 0)
  existing = true
  result = await cleanupMedia(lock)
  assert.equal(result.orphaned, 0)
  await access(retained)
  for (const path of [fresh, named, link, retained])
    await rm(path, { force: true })
})
