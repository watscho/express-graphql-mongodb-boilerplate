import type { Resolvers } from '../../../app/graphql/generated.ts'
import { requireAuth } from '../../../app/graphql/context.ts'
import { mediaService } from '../../media/index.ts'
import { userService } from '../service.ts'
import { updateProfileSchema } from '../schemas.ts'
import { toUserResponseDto } from '../transformer.ts'

export const userResolvers: Resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      const { user } = requireAuth(context)
      const { _id, ...profile } = toUserResponseDto(
        user,
        await mediaService.avatarUrl(user.id)
      )
      return { id: _id, ...profile }
    }
  },
  Mutation: {
    updateProfile: (_parent, { input }, context) =>
      userService.updateProfile(
        requireAuth(context).user,
        updateProfileSchema.parse(input),
        context.language
      )
  }
}
