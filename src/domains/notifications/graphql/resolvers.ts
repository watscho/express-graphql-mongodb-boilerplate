import type { Resolvers } from '../../../app/graphql/generated.ts'
import { requireAuth } from '../../../app/graphql/context.ts'
import { listEmailTemplates } from '../registry.ts'

export const notificationResolvers: Resolvers = {
  Query: {
    emailTemplates: (_parent, _args, context) => {
      requireAuth(context)
      return listEmailTemplates()
    }
  }
}
