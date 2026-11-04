import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const path = new URL('../src/app/graphql/generated.ts', import.meta.url)
const before = await readFile(path, 'utf8')
execFileSync(process.execPath, ['.yarn/releases/yarn-4.18.1.cjs', 'codegen'], {
  stdio: 'inherit'
})
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', path.pathname],
  { stdio: 'inherit' }
)
if (before !== (await readFile(path, 'utf8'))) {
  console.error(
    'Resolver types drifted from SDL. Run yarn codegen and yarn format.'
  )
  process.exitCode = 1
}
