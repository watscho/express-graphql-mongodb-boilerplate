import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { mediaEnv as env } from '../../app/config/media.ts'
import { AppError } from '../../app/http/errors.ts'
import { imageMimeSchema } from './schemas.ts'
import { storageRoot } from './utils.ts'
import type { StoredImageDto } from './dto.ts'

export const describeUpload = (file: File): StoredImageDto => {
  if (file.size > env.MAX_UPLOAD_BYTES)
    throw new AppError(413, 'media.file_too_large')
  const mimetype = imageMimeSchema.safeParse(file.type)
  if (!mimetype.success)
    throw new AppError(400, 'media.unsupported_image_format')
  const filename = randomUUID()
  const path = join(storageRoot, filename)
  return {
    originalname: file.name,
    encoding: 'binary',
    mimetype: mimetype.data,
    destination: storageRoot,
    filename,
    path,
    size: file.size
  }
}

export const storeUpload = async (
  file: File,
  stored: StoredImageDto = describeUpload(file)
): Promise<StoredImageDto> => {
  const { path } = stored
  await mkdir(storageRoot, { recursive: true })
  try {
    await writeFile(path, Buffer.from(await file.arrayBuffer()), {
      flag: 'wx',
      mode: 0o600
    })
  } catch (error) {
    await rm(path, { force: true }).catch(() => {})
    throw error
  }
  return stored
}
