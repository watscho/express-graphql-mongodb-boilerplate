import type { Resolvers } from '../../../../app/graphql/generated.ts'
import { requireAuth, requireGuest } from '../../../../app/graphql/context.ts'
import { emailRequestSchema, tokenParamsSchema } from '../../schemas.ts'
import { verificationService } from '../service.ts'

export const verificationResolvers: Resolvers = {
  Mutation: {
    requestVerification: async (_parent, { email }, context) => {
      const { user } = requireAuth(context)
      await context.rateLimitAuth()
      await verificationService.request(
        user,
        emailRequestSchema.parse({ email }),
        context.language
      )
      return { messageKey: 'auth.verification_requested' }
    },
    confirmVerification: async (_parent, { token }, context) => {
      requireGuest(context)
      await context.rateLimitAuth()
      return verificationService.confirm(
        tokenParamsSchema.parse({ accessToken: token }).accessToken,
        context.language
      )
    }
  }
}
