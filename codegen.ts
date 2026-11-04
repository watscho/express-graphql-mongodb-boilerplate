import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'src/domains/**/graphql/schema.graphql',
  generates: {
    'src/app/graphql/generated.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useTypeImports: true,
        contextType: './context.ts#GraphQLContext',
        scalars: { File: { input: 'File', output: 'never' } },
        strictScalars: true,
        enumsAsTypes: true
      }
    }
  }
}
export default config
