import { test, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { replace, methods } from '../../../../__tests__/helpers.mjs'
const database = methods(['connect', 'disconnect'])
const load = mock.fn(async () => {})
let failed = false,
  waitFailure = false
replace('app/config/process.js', { loadProcessConfiguration: load })
replace('app/database/mongodb.js', { database })
replace('domains/users/repository.js', {
  userRepository: { lock: async () => {} }
})
replace('domains/media/cleanup.js', {
  cleanupMedia: async () => ({
    deleted: 1,
    orphaned: 0,
    failed: failed ? 1 : 0
  })
})
replace('app/runtime/diagnostics/report.js', { reportFailure: () => {} })
mock.module('node:timers/promises', {
  exports: {
    setTimeout: async () => {
      if (waitFailure) throw Error('timer')
      process.emit('SIGTERM')
      throw Error('aborted')
    }
  }
})
const argv = process.argv
let sequence = 0
const run = async args => {
  process.argv = ['node', 'media', ...args]
  await import(
    `../../../../../dist/app/runtime/commands/media.js?case=${++sequence}`
  )
}
afterEach(() => {
  process.argv = argv
  process.exitCode = 0
  failed = false
  waitFailure = false
})
test('cleanup help does not load service configuration', async () => {
  await run(['--help'])
  assert.equal(load.mock.callCount(), 0)
})
test('single cleanup pass connects, reports failures and disconnects', async () => {
  failed = true
  await run([])
  assert.equal(process.exitCode, 1)
  assert.equal(database.disconnect.mock.callCount(), 1)
})
test('watch drains on signal and removes handlers', async () => {
  const before = process.listenerCount('SIGTERM')
  await run(['--watch'])
  assert.equal(process.listenerCount('SIGTERM'), before)
  assert.equal(process.exitCode, 0)
})
test('unexpected watch timer faults fail the command', async () => {
  waitFailure = true
  await run(['--watch'])
  assert.equal(process.exitCode, 1)
})
