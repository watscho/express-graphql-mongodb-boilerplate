import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { replace } from '../../../__tests__/helpers.mjs'
let count = 1,
  fail
const evalCommand = mock.fn(async () => {
  if (fail) throw fail
  return count
})
replace('app/database/redis.js', { redis: { eval: evalCommand } })
const { consumeAccountBudget } =
  await import('../../../../dist/domains/auth/limits.js')
test('account budget normalizes identities, hides emails, sets a bounded window and rejects over-budget attempts', async () => {
  await consumeAccountBudget(' UNIT@example.test ')
  await consumeAccountBudget('unit@example.test')
  const first = evalCommand.mock.calls[0].arguments
  assert.equal(first[1].keys[0], evalCommand.mock.calls[1].arguments[1].keys[0])
  assert(!first[1].keys[0].includes('unit'))
  assert(first[0].includes('PEXPIRE'))
  assert.equal(first[1].arguments[0], '900000')
  count = 31
  await assert.rejects(() => consumeAccountBudget('unit@example.test'), {
    messageKey: 'auth.account_rate_limited'
  })
  fail = new Error('redis unavailable')
  await assert.rejects(
    () => consumeAccountBudget('unit@example.test'),
    error => error === fail
  )
})
