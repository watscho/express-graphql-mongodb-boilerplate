import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  replace,
  modelDouble,
  session,
  user
} from '../../../__tests__/helpers.mjs'
const m = modelDouble()
let totals = []
m.Model.aggregate = mock.fn(() => ({ session: async () => totals }))
replace('domains/media/model.js', { Media: m.Model })
const { mediaRepository: r } =
  await import('../../../../dist/domains/media/repository.js')
beforeEach(() => {
  m.reset()
  totals = []
})
test('owner usage counts all reservations and conservative legacy bytes inside session', async () => {
  assert.deepEqual(await r.usage(user.id, session), { count: 0, bytes: 0 })
  totals = [{ count: 2, bytes: 500 }]
  assert.deepEqual(await r.usage(user.id, session), { count: 2, bytes: 500 })
  assert.equal(
    m.Model.aggregate.mock.calls[0].arguments[0][0].$match.owner.toString(),
    user.id
  )
})
test('all image lookups and mutations enforce owner and lifecycle state', async () => {
  await r.getAvatar('owner')
  assert.deepEqual(m.Model.findOne.mock.calls[0].arguments[0], {
    owner: 'owner',
    refType: 'User',
    refId: 'owner',
    state: { $ne: 'deleting' }
  })
  assert.equal(await r.existsOwned('image', 'owner', session), false)
  const predicate = m.Model.exists.mock.calls[0].arguments[0]
  assert.equal(predicate.owner, 'owner')
  assert.deepEqual(predicate.state, { $in: ['ready', null] })
  await r.listOwned('owner', session)
  await r.attachAvatar('image', 'owner', session)
  assert.equal(m.Model.updateOne.mock.calls[0].arguments[0].owner, 'owner')
  await r.detachAvatar('owner', session)
  assert(
    m.Model.updateMany.mock.calls[0].arguments[1].$set.expiresAt > new Date()
  )
  await r.markOwnedForDeletion('owner', session)
  assert.equal(
    m.Model.updateMany.mock.calls[1].arguments[1].$set.state,
    'deleting'
  )
  await r.markForDeletion('id', 'owner')
  assert.equal(m.Model.updateOne.mock.calls[1].arguments[0].state, 'pending')
  await r.finishDeletion('id')
  assert.deepEqual(m.Model.deleteOne.mock.calls[0].arguments[0], {
    _id: 'id',
    state: 'deleting'
  })
  await r.publish('id', 'owner', session)
  const publish = m.Model.findOneAndUpdate.mock.calls[0].arguments
  assert.equal(publish[0].state, 'pending')
  assert(publish[0].expiresAt.$gt instanceof Date)
})
test('reservation carries owner/session and existence returns a boolean', async () => {
  m.setResult({ id: 'image' })
  assert.deepEqual(
    await r.reserve({ filename: 'unit', size: 10 }, 'owner', session),
    { id: 'image' }
  )
  assert.deepEqual(m.save.mock.calls[0].arguments, [{ session }])
  assert.equal(await r.existsOwned('image', 'owner', session), true)
})
