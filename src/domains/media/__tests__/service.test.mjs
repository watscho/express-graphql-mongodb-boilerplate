import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  replace,
  methods,
  reset,
  user,
  session,
  database,
  logger
} from '../../../__tests__/helpers.mjs'
const repo = methods([
  'usage',
  'reserve',
  'publish',
  'markForDeletion',
  'finishDeletion',
  'getAvatar',
  'existsOwned',
  'detachAvatar',
  'attachAvatar',
  'listOwned',
  'markOwnedForDeletion'
])
const users = methods(['lockCurrent'])
const image = methods(['validate', 'resize', 'deleteFile'])
const upload = methods(['storeUpload'])
const row = {
  _id: user.id,
  owner: user.id,
  mimetype: 'image/png',
  filename: 'unit',
  path: 'unit',
  size: 10,
  originalname: 'unit.png',
  encoding: 'binary',
  destination: '.'
}
replace('app/database/mongodb.js', { database })
replace('app/runtime/logger.js', { logger })
replace('domains/users/index.js', { userService: users })
replace('domains/media/repository.js', { mediaRepository: repo })
replace('domains/media/upload.js', {
  describeUpload: () => row,
  storeUpload: upload.storeUpload
})
replace('domains/media/image.js', {
  Image: class {
    validate(...args) {
      return image.validate(...args)
    }
    resize(...args) {
      return image.resize(...args)
    }
    deleteFile(...args) {
      return image.deleteFile(...args)
    }
  }
})
const { mediaService: m } =
  await import('../../../../dist/domains/media/service.js')
beforeEach(() => {
  reset(repo, users, image, upload, logger, database)
  image.resize.mock.mockImplementation(async () => 'conversions/unit.webp')
  repo.usage.mock.mockImplementation(async () => ({ count: 0, bytes: 0 }))
  repo.reserve.mock.mockImplementation(async () => row)
  repo.publish.mock.mockImplementation(async () => row)
  repo.listOwned.mock.mockImplementation(async () => [row])
})
test('upload reserves quota before file I/O and publishes only under account lock', async () => {
  const result = await m.upload({}, user)
  assert.equal(result.id, user.id)
  assert.equal(repo.reserve.mock.calls[0].arguments[1], user.id)
  assert.equal(repo.reserve.mock.calls[0].arguments[2], session)
  assert.equal(users.lockCurrent.mock.callCount(), 2)
  assert.equal(image.validate.mock.callCount(), 1)
  assert.equal(repo.publish.mock.calls[0].arguments[0], user.id)
})
for (const usage of [
  { count: 20, bytes: 0 },
  { count: 0, bytes: 100 * 1024 ** 2 }
])
  test(`owner quota rejects ${JSON.stringify(usage)} before file writes`, async () => {
    repo.usage.mock.mockImplementation(async () => usage)
    await assert.rejects(() => m.upload({}, user), {
      messageKey: 'media.owner_quota_exceeded'
    })
    assert.equal(upload.storeUpload.mock.callCount(), 0)
    assert.equal(repo.reserve.mock.callCount(), 0)
  })
for (const mode of ['validate', 'resize', 'write', 'publish'])
  test(`failed ${mode} preserves tombstone until filesystem cleanup completes`, async () => {
    const fn =
      mode === 'write'
        ? upload.storeUpload
        : mode === 'publish'
          ? repo.publish
          : image[mode]
    fn.mock.mockImplementation(async () => {
      throw Error('failure')
    })
    await assert.rejects(() => m.upload({}, user), /failure/)
    assert.equal(repo.markForDeletion.mock.callCount(), 1)
    assert.equal(image.deleteFile.mock.callCount(), 1)
    assert.equal(repo.finishDeletion.mock.callCount(), 1)
  })
test('lost upload lease cannot publish or resurrect a removed reservation', async () => {
  repo.publish.mock.mockImplementation(async () => null)
  await assert.rejects(() => m.upload({}, user), {
    messageKey: 'media.upload_expired'
  })
})
test('cleanup and tombstone failures preserve original upload error', async () => {
  image.validate.mock.mockImplementation(async () => {
    throw Error('original')
  })
  image.deleteFile.mock.mockImplementation(async () => {
    throw Error('cleanup')
  })
  repo.markForDeletion.mock.mockImplementation(async () => {
    throw Error('mongo unavailable')
  })
  await assert.rejects(() => m.upload({}, user), /original/)
  assert.equal(repo.finishDeletion.mock.callCount(), 0)
  assert.equal(logger.error.mock.callCount(), 1)
})
test('avatar is optional and derived from owned media', async () => {
  assert.equal(await m.avatarUrl(user.id), undefined)
  repo.getAvatar.mock.mockImplementation(async () => row)
  assert.match(await m.avatarUrl(user.id), /conversions\/unit.webp$/)
})
test('avatar rejects foreign or expiring images before detaching current avatar', async () => {
  await assert.rejects(() => m.updateAvatar(user, { imageId: user.id }), {
    status: 404
  })
  assert.equal(repo.detachAvatar.mock.callCount(), 0)
  repo.existsOwned.mock.mockImplementation(async () => true)
  await m.updateAvatar(user, { imageId: user.id })
  assert.deepEqual(repo.attachAvatar.mock.calls[0].arguments, [
    user.id,
    user.id,
    session
  ])
})
test('account deletion retains durable file inventory after commit', async () => {
  const files = await m.deleteOwned(user.id, session)
  assert.equal(files[0].id, user.id)
  assert.equal(repo.markOwnedForDeletion.mock.callCount(), 1)
  image.deleteFile.mock.mockImplementation(async () => {
    throw Error('permission')
  })
  await m.cleanupFiles(files)
  assert.equal(logger.error.mock.callCount(), 1)
  assert.equal(repo.finishDeletion.mock.callCount(), 0)
})
test('successful cleanup removes tombstones after files', async () => {
  await m.cleanupFiles([{ ...row, id: user.id }])
  assert.equal(repo.finishDeletion.mock.calls[0].arguments[0], user.id)
  assert.equal(logger.error.mock.callCount(), 0)
})
