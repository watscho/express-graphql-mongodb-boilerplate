import type { Resolvers } from '../../../app/graphql/generated.ts'
import { requireAuth, requireGuest } from '../../../app/graphql/context.ts'
import { authService } from '../service.ts'
import {
  credentialsSchema,
  signUpSchema,
  emailRequestSchema,
  newPasswordSchema,
  updatePasswordSchema,
  deleteProfileSchema,
  tokenParamsSchema
} from '../schemas.ts'

export const authResolvers: Resolvers = {
  Mutation: {
    signIn: async (_parent, { input }, context) => {
      requireGuest(context)
      await context.rateLimitAuth()
      return authService.signIn(credentialsSchema.parse(input))
    },
    signUp: async (_parent, { input }, context) => {
      requireGuest(context)
      await context.rateLimitAuth()
      return authService.signUp(signUpSchema.parse(input), context.language)
    },
    signOut: async (_parent, _args, context) => {
      await authService.signOut(requireAuth(context))
      // Later mutation fields must not keep using the revoked session.
      context.auth = undefined
      return { messageKey: 'auth.signed_out' }
    },
    resetPassword: async (_parent, { email }, context) => {
      requireGuest(context)
      await context.rateLimitAuth()
      await authService.resetPassword(
        emailRequestSchema.parse({ email }),
        context.language
      )
      return { messageKey: 'auth.password_reset_requested' }
    },
    newPassword: async (_parent, { token, input }, context) => {
      requireGuest(context)
      await context.rateLimitAuth()
      return authService.newPassword(
        tokenParamsSchema.parse({ accessToken: token }).accessToken,
        newPasswordSchema.parse(input),
        context.language
      )
    },
    updateEmail: async (_parent, { input }, context) => {
      const { user } = requireAuth(context)
      await context.rateLimitAuth()
      const result = await authService.updateEmail(
        user,
        credentialsSchema.parse(input),
        context.language
      )
      if (result.accessToken) context.auth = undefined
      return result
    },
    updatePassword: async (_parent, { input }, context) => {
      const { user } = requireAuth(context)
      await context.rateLimitAuth()
      const result = await authService.updatePassword(
        user,
        updatePasswordSchema.parse(input),
        context.language
      )
      context.auth = undefined
      return result
    },
    deleteProfile: async (_parent, { input }, context) => {
      const { user } = requireAuth(context)
      await context.rateLimitAuth()
      await authService.deleteProfile(
        user,
        deleteProfileSchema.parse(input),
        context.language
      )
      context.auth = undefined
      return { messageKey: 'users.profile_deleted' }
    }
  }
}
