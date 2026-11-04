import type { ClientSession } from 'mongoose'
import { mediaEnv as env } from '../../app/config/media.ts'
import { MAX_CONVERSION_BYTES } from './policy.ts'
import { describeUpload, storeUpload } from './upload.ts'
import { database } from '../../app/database/mongodb.ts'
import { AppError } from '../../app/http/errors.ts'
import { logger } from '../../app/runtime/logger.ts'
import { userService } from '../users/index.ts'
import type { AccountDto } from '../users/index.ts'
import { mediaRepository } from './repository.ts'
import { Image } from './image.ts'
import { storageUrl } from './utils.ts'
import { toOwnedImageDto } from './transformer.ts'
import type {
  UploadImageResponseDto,
  UpdateAvatarDto,
  OwnedImageDto
} from './dto.ts'

export const mediaService = {
  async upload(file: File, user: AccountDto): Promise<UploadImageResponseDto> {
    const stored = describeUpload(file)
    // Reserve under the account mutation lock before any filesystem write.
    const reservation = await database.transaction(async session => {
      await userService.lockCurrent(user, session)
      const usage = await mediaRepository.usage(user.id, session)
      if (
        usage.count >= env.MEDIA_OWNER_MAX_FILES ||
        usage.bytes + stored.size + MAX_CONVERSION_BYTES >
          env.MEDIA_OWNER_MAX_BYTES
      )
        throw new AppError(413, 'media.owner_quota_exceeded')
      return mediaRepository.reserve(stored, user.id, session)
    })
    const id = reservation._id.toString()
    const image = new Image(stored)
    try {
      await storeUpload(file, stored)
      await image.validate()
      const url = storageUrl(await image.resize())
      await database.transaction(async session => {
        await userService.lockCurrent(user, session)
        if (!(await mediaRepository.publish(id, user.id, session)))
          throw new AppError(409, 'media.upload_expired')
      })
      return { id, image: url }
    } catch (error) {
      // A durable tombstone survives failed cleanup or a process crash.
      await mediaRepository.markForDeletion(id, user.id).catch(() => {})
      await image
        .deleteFile()
        .then(() => mediaRepository.finishDeletion(id))
        .catch(() =>
          logger.error('Failed to clean up rejected image', { mediaId: id })
        )
      throw error
    }
  },
  async avatarUrl(userId: string): Promise<string | undefined> {
    const image = await mediaRepository.getAvatar(userId)
    return image
      ? storageUrl(await new Image(toOwnedImageDto(image)).resize())
      : undefined
  },
  async updateAvatar(
    user: AccountDto,
    { imageId }: UpdateAvatarDto
  ): Promise<void> {
    await database.transaction(async session => {
      await userService.lockCurrent(user, session)
      if (!(await mediaRepository.existsOwned(imageId, user.id, session)))
        throw new AppError(404, 'media.image_not_found')
      await mediaRepository.detachAvatar(user.id, session)
      await mediaRepository.attachAvatar(imageId, user.id, session)
    })
  },
  async deleteOwned(
    userId: string,
    session: ClientSession
  ): Promise<OwnedImageDto[]> {
    const images = await mediaRepository.listOwned(userId, session)
    await mediaRepository.markOwnedForDeletion(userId, session)
    return images.map(toOwnedImageDto)
  },
  async cleanupFiles(images: OwnedImageDto[]): Promise<void> {
    const results = await Promise.allSettled(
      images.map(async image => {
        await new Image(image).deleteFile()
        await mediaRepository.finishDeletion(image.id)
      })
    )
    results.forEach((result, index) => {
      if (result.status === 'rejected')
        logger.error('Media cleanup failed', { mediaId: images[index]?.id })
    })
  }
}
