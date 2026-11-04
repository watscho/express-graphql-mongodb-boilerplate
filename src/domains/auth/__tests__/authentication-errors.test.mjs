import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ZodError } from 'zod'
import { replace, methods } from '../../../__tests__/helpers.mjs'
let error
replace('domains/auth/utils.js', {
  jwtVerify: () => {
    throw error
  },
  hashToken: () => ''
})
replace('app/database/redis.js', { redis: methods(['exists']) })
replace('domains/users/index.js', { userService: methods(['getById']) })
const { resolveAuth } =
  await import('../../../../dist/domains/auth/authentication.js')
test('malformed token claims become 401 while unexpected verifier faults propagate', async () => {
  error = new ZodError([])
  await assert.rejects(() => resolveAuth('Bearer unit'), { status: 401 })
  error = Error('unexpected')
  await assert.rejects(
    () => resolveAuth('Bearer unit'),
    e => e === error
  )
})
