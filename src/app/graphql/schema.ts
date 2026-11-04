import { createSchema } from 'graphql-yoga'
import { typeDefs } from './typeDefs.ts'
import type { GraphQLContext, ExpressContext } from './context.ts'
import type { Resolvers } from './generated.ts'
import { authResolvers } from '../../domains/auth/graphql/resolvers.ts'
import { verificationResolvers } from '../../domains/auth/verification/graphql/resolvers.ts'
import { userResolvers } from '../../domains/users/graphql/resolvers.ts'
import { mediaResolvers } from '../../domains/media/graphql/resolvers.ts'
import { notificationResolvers } from '../../domains/notifications/graphql/resolvers.ts'

export const resolvers: Resolvers = {
  File: mediaResolvers.File,
  Query: { ...userResolvers.Query, ...notificationResolvers.Query },
  Mutation: {
    ...authResolvers.Mutation,
    ...verificationResolvers.Mutation,
    ...userResolvers.Mutation,
    ...mediaResolvers.Mutation
  }
}
export const schema = createSchema<GraphQLContext & ExpressContext>({
  typeDefs,
  resolvers
})
