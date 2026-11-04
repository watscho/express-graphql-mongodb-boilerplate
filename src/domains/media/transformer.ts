import { imageMimeSchema } from './schemas.ts'
import type { OwnedImageRecordDto, OwnedImageDto } from './dto.ts'

export const toOwnedImageDto = (media: OwnedImageRecordDto): OwnedImageDto => ({
  id: media._id.toString(),
  owner: media.owner.toString(),
  originalname: media.originalname,
  encoding: media.encoding,
  mimetype: imageMimeSchema.parse(media.mimetype),
  destination: media.destination,
  filename: media.filename,
  path: media.path,
  size: media.size
})
