import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { replace, methods, reset, user } from '../../../__tests__/helpers.mjs'
import { jwtSign } from '../../../../dist/domains/auth/utils.js'
const redis = methods(['exists'])
const users = methods(['getById'])
replace('app/database/redis.js', { redis })
replace('domains/users/index.js', { userService: users })
const { resolveAuth } =
  await import('../../../../dist/domains/auth/authentication.js')
beforeEach(() => {
  reset(redis, users)
  redis.exists.mock.mockImplementation(async () => 0)
  users.getById.mock.mockImplementation(async () => user)
})
test('anonymous authentication skips account lookups', async () => {
  assert.equal(await resolveAuth(), undefined)
  assert.equal(users.getById.mock.callCount(), 0)
})
for (const header of [
  'Basic abc',
  'Bearer',
  'Bearer two tokens',
  'Bearer invalid'
])
  test(`reject authorization ${header}`, async () =>
    assert.rejects(() => resolveAuth(header), { status: 401 }))
test('valid token resolves current account and bearer metadata', async () => {
  const token = jwtSign(user).accessToken
  const auth = await resolveAuth('Bearer ' + token)
  assert.equal(auth.user, user)
  assert.equal(auth.accessToken, token)
  assert(auth.expiresAt > 0)
})
for (const mode of ['revoked', 'deleted', 'version'])
  test(`reject ${mode} JWT`, async () => {
    if (mode === 'revoked') redis.exists.mock.mockImplementation(async () => 1)
    if (mode === 'deleted')
      users.getById.mock.mockImplementation(async () => null)
    if (mode === 'version')
      users.getById.mock.mockImplementation(async () => ({
        ...user,
        authVersion: 2
      }))
    await assert.rejects(
      () => resolveAuth('Bearer ' + jwtSign(user).accessToken),
      { status: 401 }
    )
  })
test('dependency failures propagate rather than becoming authentication success', async () => {
  redis.exists.mock.mockImplementation(async () => {
    throw Error('redis down')
  })
  await assert.rejects(
    () => resolveAuth('Bearer ' + jwtSign(user).accessToken),
    /redis down/
  )
})
