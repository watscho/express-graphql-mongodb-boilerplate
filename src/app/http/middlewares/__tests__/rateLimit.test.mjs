import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { replace } from '../../../../__tests__/helpers.mjs'
const calls = []
mock.module('express-rate-limit', {
  exports: {
    rateLimit: options => {
      calls.push(options)
      return options
    }
  }
})
mock.module('rate-limit-redis', {
  exports: {
    RedisStore: class {
      constructor(options) {
        this.options = options
      }
    }
  }
})
const sendCommand = mock.fn(async () => 1)
replace('app/database/redis.js', { redis: { sendCommand } })
const { createRateLimits } =
  await import('../../../../../dist/app/http/middlewares/rateLimit.js')
test('rate limits use independent Redis prefixes, fail closed and forward commands', async () => {
  const limits = createRateLimits()
  assert.equal(calls.length, 1)
  assert.equal(
    limits.apiRateLimit.store.options.prefix,
    'rateLimit:graphql:api:'
  )
  for (const options of calls) {
    assert.equal(options.passOnStoreError, false)
    assert.equal(options.message({ path: '/health/ready' }).status, 429)
    assert.equal(options.standardHeaders, 'draft-8')
  }
  await calls[0].store.options.sendCommand('GET', 'key')
  assert.deepEqual(sendCommand.mock.calls[0].arguments, [['GET', 'key']])
})

test('GraphQL HTTP throttling returns GraphQL errors', () => {
  const payload = calls[0].message({ path: '/graphql/' })
  assert.equal(payload.errors[0].extensions.code, 'RATE_LIMITED')
})
