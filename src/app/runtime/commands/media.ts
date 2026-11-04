import { parseArgs } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { bootstrap } from '../bootstrap.ts'
import { loadProcessConfiguration } from '../../config/process.ts'

await bootstrap('media:cleanup', async () => {
  const { values } = parseArgs({
    options: { help: { type: 'boolean' }, watch: { type: 'boolean' } }
  })
  if (values.help) {
    process.stdout.write(
      'Media cleanup: [--watch] (otherwise one pass); run against the API upload volume.\n'
    )
    return
  }
  await loadProcessConfiguration('media-cleanup')
  const [{ database }, { cleanupMedia }, { userRepository }] =
    await Promise.all([
      import('../../database/mongodb.ts'),
      import('../../../domains/media/cleanup.ts'),
      import('../../../domains/users/repository.ts')
    ])
  const stop = new AbortController()
  const abort = () => stop.abort()
  process.once('SIGTERM', abort)
  process.once('SIGINT', abort)
  try {
    await database.connect({ autoIndex: false })
    do {
      const result = await cleanupMedia(userRepository.lock)
      process.stdout.write(JSON.stringify(result) + '\n')
      if (result.failed) process.exitCode = 1
      if (!values.watch || stop.signal.aborted) break
      await delay(15 * 60 * 1000, undefined, { signal: stop.signal }).catch(
        error => {
          if (!stop.signal.aborted) throw error
        }
      )
    } while (!stop.signal.aborted)
  } finally {
    process.removeListener('SIGTERM', abort)
    process.removeListener('SIGINT', abort)
    await database.disconnect()
  }
})
