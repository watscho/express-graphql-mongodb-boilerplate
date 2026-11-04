import { parseArgs } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { buildSchema, printSchema } from 'graphql'
import { typeDefs } from '../../graphql/typeDefs.ts'
import { bootstrap } from '../bootstrap.ts'

await bootstrap('docs:export', async () => {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean' },
      output: { type: 'string' }
    }
  })
  if (values.help) {
    process.stdout.write(
      'Export GraphQL SDL: --output schema.graphql (default: stdout)\n'
    )
    return
  }
  const content = printSchema(buildSchema(typeDefs)) + '\n'
  if (values.output) await writeFile(values.output, content, { flag: 'wx' })
  else process.stdout.write(content)
})
