import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  replace,
  modelDouble,
  session
} from '../../../../__tests__/helpers.mjs'
const m = modelDouble()
replace('domains/notifications/delivery/model.js', {
  MailRecipientBudget: m.Model
})
const { consumeRecipientBudget } =
  await import('../../../../../dist/domains/notifications/delivery/budget.js')
beforeEach(() => m.reset())
test('recipient and template budgets use opaque normalized identities and the caller transaction', async () => {
  m.setResult({ count: 1 })
  await consumeRecipientBudget(' UNIT@example.test ', 'verification', session)
  await consumeRecipientBudget('unit@example.test', 'resetPassword', session)
  const [filter, update, options] =
    m.Model.findOneAndUpdate.mock.calls[0].arguments
  assert.equal(
    filter._id,
    m.Model.findOneAndUpdate.mock.calls[1].arguments[0]._id
  )
  assert(!filter._id.includes('unit'))
  assert.equal(filter.$and[0].$or[1].count.$lt, 20)
  assert.equal(filter.$and[0].$or[1].$or[1]['purposes.verification'].$lt, 5)
  assert(update[1].$set['cooldowns.verification'] > new Date())
  assert.equal(options.session, session)
  assert.equal(update[0].$set.count.$add[1], 1)
})
for (const value of [
  null,
  Object.assign(new Error('duplicate'), { code: 11000 })
])
  test(`budget rejects exhausted or concurrent conflicting admission ${value === null ? 'null' : 'duplicate'}`, async () => {
    m.setResult(value)
    await assert.rejects(
      () =>
        consumeRecipientBudget('unit@example.test', 'verification', session),
      { messageKey: 'notifications.recipient_rate_limited' }
    )
  })
test('unexpected database failures are not converted to success', async () => {
  m.setResult(new Error('offline'))
  await assert.rejects(
    () => consumeRecipientBudget('unit@example.test', 'verification', session),
    /offline/
  )
})

test('personal Gmail aliases share one mailbox budget while custom domains retain their identities', async () => {
  m.setResult({ count: 1 })
  const key = async email => {
    await consumeRecipientBudget(email, 'verification', session)
    return m.Model.findOneAndUpdate.mock.calls.at(-1).arguments[0]._id
  }
  assert.equal(
    await key('Jane.Doe+one@gmail.com'),
    await key('janedoe+two@googlemail.com')
  )
  assert.notEqual(
    await key('jane.doe@example.test'),
    await key('janedoe@example.test')
  )
  assert.notEqual(
    await key('jane+one@example.test'),
    await key('jane+two@example.test')
  )
})

test('daily rollover resets counters without resetting the cross-midnight cooldown', async () => {
  m.setResult({ count: 1 })
  await consumeRecipientBudget('unit@example.test', 'verification', session)
  const [filter, pipeline, options] =
    m.Model.findOneAndUpdate.mock.calls[0].arguments
  assert.equal(options.updatePipeline, true)
  assert.equal(
    filter.$and[1].$or[1]['cooldowns.verification'].$lte instanceof Date,
    true
  )
  assert.equal(pipeline[0].$set.day, new Date().toISOString().slice(0, 10))
  assert.deepEqual(pipeline[0].$set.cooldowns, { $ifNull: ['$cooldowns', {}] })
})
