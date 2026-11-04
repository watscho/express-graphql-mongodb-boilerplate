import { createYoga } from 'graphql-yoga'
import { createFetch } from '@whatwg-node/fetch'
import type { Plugin } from 'graphql-yoga'
import { NoSchemaIntrospectionCustomRule, parse } from 'graphql'
import type { GraphQLContext, ExpressContext } from './context.ts'
import { schema } from './schema.ts'
import { maskGraphQLError } from './errors.ts'
import { operationLimits } from './limits.ts'
import { rateLimitAuthOperation } from './rateLimit.ts'
import { resolveAuth } from '../../domains/auth/index.ts'
import { apiEnv as env } from '../config/api.ts'

export const createGraphQLServer = () =>
  createYoga<ExpressContext, GraphQLContext>({
    schema,
    graphqlEndpoint: '/graphql',
    graphiql: env.NODE_ENV === 'development',
    landingPage: false,
    cors: false,
    batching: false,
    logging: false,
    parserAndValidationCache: false,
    maxRequestBodySize: env.MAX_UPLOAD_BYTES + 200_000,
    requestId: false,
    multipart: true,
    fetchAPI: createFetch({
      formDataLimits: {
        fileSize: env.MAX_UPLOAD_BYTES,
        files: 1,
        fields: 2,
        fieldSize: 100_000,
        headerSize: 10_000
      }
    }),
    maskedErrors: { maskError: error => maskGraphQLError(error), isDev: false },
    context: async ({ req, res }) => ({
      auth: await resolveAuth(req.headers.authorization),
      language: req.get('Accept-Language'),
      requestId: res.locals.requestId as string,
      rateLimitAuth: () =>
        rateLimitAuthOperation(req.ip ?? req.socket.remoteAddress ?? 'unknown')
    }),
    plugins: [
      {
        onParse({ setParseFn }) {
          setParseFn((source, options) =>
            parse(source, { ...options, maxTokens: 2000 })
          )
        },
        onValidate({ addValidationRule }) {
          addValidationRule(
            operationLimits(env.GRAPHQL_MAX_DEPTH, env.GRAPHQL_MAX_FIELDS)
          )
          if (env.NODE_ENV === 'production')
            addValidationRule(NoSchemaIntrospectionCustomRule)
        }
      } satisfies Plugin<GraphQLContext & ExpressContext>
    ]
  })
