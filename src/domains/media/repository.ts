import { Types } from 'mongoose'
import type { ClientSession } from 'mongoose'
import { Media } from './model.ts'
import { mediaEnv as env } from '../../app/config/media.ts'
import { MAX_CONVERSION_BYTES } from './policy.ts'
import type { StoredImageDto } from './dto.ts'

const imageProjection =
  'owner originalname encoding mimetype destination filename path size'
export const mediaRepository = {
  async usage(owner: string, session: ClientSession) {
    const [usage] = await Media.aggregate<{ count: number; bytes: number }>([
      { $match: { owner: new Types.ObjectId(owner) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          bytes: {
            $sum: {
              $ifNull: [
                '$storageBytes',
                { $add: ['$size', MAX_CONVERSION_BYTES] }
              ]
            }
          }
        }
      }
    ]).session(session)
    return usage ?? { count: 0, bytes: 0 }
  },
  reserve: (image: StoredImageDto, owner: string, session: ClientSession) =>
    new Media({
      ...image,
      owner,
      state: 'pending',
      storageBytes: image.size + MAX_CONVERSION_BYTES,
      expiresAt: new Date(Date.now() + env.MEDIA_UPLOAD_LEASE_MS)
    }).save({ session }),
  publish: (id: string, owner: string, session: ClientSession) =>
    Media.findOneAndUpdate(
      { _id: id, owner, state: 'pending', expiresAt: { $gt: new Date() } },
      {
        $set: {
          state: 'ready',
          expiresAt: new Date(Date.now() + env.MEDIA_UNUSED_RETENTION_MS)
        }
      },
      { session, returnDocument: 'after' }
    )
      .lean()
      .exec(),
  getAvatar: (user: string) =>
    Media.findOne({
      owner: user,
      refType: 'User',
      refId: user,
      state: { $ne: 'deleting' }
    })
      .select(imageProjection)
      .lean(),
  async existsOwned(
    id: string,
    owner: string,
    session: ClientSession
  ): Promise<boolean> {
    return Boolean(
      await Media.exists({
        _id: id,
        owner,
        state: { $in: ['ready', null] },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      })
        .session(session)
        .exec()
    )
  },
  listOwned: (owner: string, session: ClientSession) =>
    Media.find({ owner }, imageProjection, { session }).lean(),
  detachAvatar: (owner: string, session: ClientSession) =>
    Media.updateMany(
      { owner, refType: 'User', refId: owner },
      {
        $unset: { refType: '', refId: '' },
        $set: {
          expiresAt: new Date(Date.now() + env.MEDIA_UNUSED_RETENTION_MS)
        }
      },
      { session }
    ),
  attachAvatar: (id: string, owner: string, session: ClientSession) =>
    Media.updateOne(
      { _id: id, owner, state: { $in: ['ready', null] } },
      {
        $set: { refType: 'User', refId: owner, state: 'ready' },
        $unset: { expiresAt: '' }
      },
      { session, runValidators: true }
    ),
  markOwnedForDeletion: (owner: string, session: ClientSession) =>
    Media.updateMany(
      { owner },
      {
        $set: { state: 'deleting' },
        $unset: { refType: '', refId: '', expiresAt: '' }
      },
      { session }
    ),
  markForDeletion: (id: string, owner: string) =>
    Media.updateOne(
      { _id: id, owner, state: 'pending' },
      { $set: { state: 'deleting', expiresAt: new Date() } }
    ).exec(),
  finishDeletion: (id: string) =>
    Media.deleteOne({ _id: id, state: 'deleting' }).exec()
}
