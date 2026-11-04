import { readFileSync } from 'node:fs'

// Pure contract loading: schema export and code generation do not need credentials or clients.
const modules = [
  'auth',
  'auth/verification',
  'users',
  'media',
  'notifications'
] as const
export const typeDefs = modules
  .map(domain =>
    readFileSync(
      new URL(
        `../../domains/${domain}/graphql/schema.graphql`,
        import.meta.url
      ),
      'utf8'
    )
  )
  .join('\n')
