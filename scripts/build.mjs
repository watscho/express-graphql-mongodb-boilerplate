import { execFileSync } from 'node:child_process'
import { cp, rm, readdir, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const output = new URL('dist/', root)

await rm(output, { recursive: true, force: true })
execFileSync(
  process.execPath,
  [fileURLToPath(new URL('node_modules/@typescript/native/bin/tsc', root))],
  { cwd: fileURLToPath(root), stdio: 'inherit' }
)
await cp(
  new URL('src/domains/notifications/templates/', root),
  new URL('domains/notifications/templates/', output),
  { recursive: true }
)

for (const file of await readdir(new URL('src/', root), { recursive: true })) {
  if (!file.endsWith('.graphql')) continue
  const destination = new URL(file, output)
  await mkdir(new URL('.', destination), { recursive: true })
  await cp(new URL(file, new URL('src/', root)), destination)
}
