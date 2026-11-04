import { opendir, stat, rm } from 'node:fs/promises'
import { database } from '../../app/database/mongodb.ts'
import { mediaEnv as env } from '../../app/config/media.ts'
import type { ClientSession } from 'mongoose'
import { Media } from './model.ts'
import { mediaRepository } from './repository.ts'
import { toOwnedImageDto } from './transformer.ts'
import { Image } from './image.ts'
import { storageRoot, storagePath } from './utils.ts'
import { logger } from '../../app/runtime/logger.ts'

const eligible = (now: Date) => ({
  owner: { $type: 'objectId' as const },
  $or: [
    {
      state: 'deleting' as const,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $lte: now } }]
    },
    {
      refType: { $exists: false },
      state: { $in: ['pending' as const, 'ready' as const] },
      expiresAt: { $lte: now }
    },
    {
      refType: { $exists: false },
      state: { $exists: false },
      createdAt: {
        $lte: new Date(now.getTime() - env.MEDIA_UNUSED_RETENTION_MS)
      }
    }
  ]
})

export const cleanupMedia = async (
  lockOwner: (owner: string, session: ClientSession) => Promise<unknown>
): Promise<{ deleted: number; orphaned: number; failed: number }> => {
  const result = { deleted: 0, orphaned: 0, failed: 0 }
  const now = new Date()
  const candidates = await Media.find(eligible(now))
    .sort({ _id: 1 })
    .limit(100)
    .lean()
    .exec()
  for (const candidate of candidates) {
    try {
      const claimed = await database.transaction(async session => {
        await lockOwner(candidate.owner.toString(), session)
        return Media.findOneAndUpdate(
          { _id: candidate._id, ...eligible(now) },
          {
            $set: {
              state: 'deleting',
              expiresAt: new Date(Date.now() + 15 * 60000)
            },
            $unset: { refType: '', refId: '' }
          },
          { session, returnDocument: 'after' }
        )
          .lean()
          .exec()
      })
      if (!claimed) continue // It was attached or removed after the candidate read.
      await new Image(toOwnedImageDto(claimed)).deleteFile()
      await mediaRepository.finishDeletion(claimed._id.toString())
      result.deleted++
    } catch {
      result.failed++
      logger.error('Media cleanup will retry', {
        mediaId: candidate._id.toString()
      })
    }
  }
  // Catch crash leftovers with no DB inventory. Never follow symlinks or arbitrary names.
  const original = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/
  const conversion =
    /^([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})(?:_150x150\.webp|\.tmp)$/
  for (const folder of ['', 'conversions']) {
    let directory
    try {
      directory = await opendir(folder ? storagePath(folder) : storageRoot)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        continue
      throw error
    }
    for await (const entry of directory) {
      if (!entry.isFile()) continue
      const filename = folder
        ? conversion.exec(entry.name)?.[1]
        : original.test(entry.name)
          ? entry.name
          : undefined
      if (!filename) continue
      const path = storagePath(folder ? `${folder}/${entry.name}` : entry.name)
      try {
        if (
          (await stat(path)).mtimeMs >
          now.getTime() - env.MEDIA_UPLOAD_LEASE_MS
        )
          continue
        if (await Media.exists({ filename }).exec()) continue
        await rm(path, { force: true })
        result.orphaned++
      } catch {
        result.failed++
        logger.error('Orphan media cleanup will retry')
      }
    }
  }
  return result
}
