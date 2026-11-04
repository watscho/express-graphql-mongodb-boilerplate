import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as auth from '../../../../dist/domains/auth/schemas.js'

for (const password of [
  'short',
  'x'.repeat(20),
  'passwordpassword',
  '123456789012345',
  '🙂'.repeat(8),
  '🙂a'.repeat(19)
])
  test(`reject weak password ${JSON.stringify(password)}`, () =>
    assert.equal(auth.passwordSchema.safeParse(password).success, false))
test('new passwords accept passphrases, Unicode and exactly 72 UTF-8 bytes', () => {
  for (const p of [
    'correct horse battery staple',
    'aB '.repeat(24),
    '🙂a'.repeat(14) + 'ab'
  ])
    assert(auth.passwordSchema.safeParse(p).success)
  assert(!auth.passwordSchema.safeParse('aB '.repeat(24) + 'x').success)
  assert(auth.currentPasswordSchema.safeParse('old').success)
})

test('email tokens require exactly 96 hex characters', () => {
  assert(
    auth.tokenParamsSchema.safeParse({ accessToken: 'a'.repeat(96) }).success
  )
  for (const t of ['a'.repeat(95), 'z'.repeat(96), 'jwt.token.value'])
    assert(!auth.tokenParamsSchema.safeParse({ accessToken: t }).success)
})
