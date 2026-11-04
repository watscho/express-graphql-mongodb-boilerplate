import { File as UploadFile } from '@whatwg-node/fetch'
import { GraphQLScalarType, GraphQLError } from 'graphql'
import type { Resolvers } from '../../../app/graphql/generated.ts'
import { requireAuth } from '../../../app/graphql/context.ts'
import { mediaService } from '../service.ts'
import { updateAvatarSchema } from '../schemas.ts'

export const mediaResolvers: Resolvers = {
  File: new GraphQLScalarType({
    name: 'File',
    parseValue(value: unknown) {
      if (!(value instanceof UploadFile || value instanceof File))
        throw new GraphQLError('media.invalid_upload')
      return value
    },
    parseLiteral() {
      throw new GraphQLError('media.invalid_upload')
    },
    serialize() {
      throw new GraphQLError('media.invalid_upload')
    }
  }),
  Mutation: {
    uploadImage: async (_parent, { file }, context) => {
      const { user } = requireAuth(context)
      return mediaService.upload(file, user)
    },
    updateAvatar: async (_parent, { imageId }, context) => {
      await mediaService.updateAvatar(
        requireAuth(context).user,
        updateAvatarSchema.parse({ imageId })
      )
      return { messageKey: 'media.avatar_updated' }
    }
  }
}
