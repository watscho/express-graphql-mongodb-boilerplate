import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import sharp from 'sharp'
import bcrypt from 'bcrypt'

// Only disposable, isolated containers are used. No developer .env or external providers.
const prefix = `graphql-integration-${process.pid}`
const image = 'express-graphql-mongodb-boilerplate:local'
const directory = await mkdtemp(join(tmpdir(), prefix))
const request = (url, init = {}) =>
  fetch(url, { ...init, headers: { connection: 'close', ...init.headers } })
const containers = []
const uploadVolume = prefix + '-uploads'
const cleanupEnvFile = join(directory, 'cleanup.env')
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', timeout: 180_000 })
const envFile = join(directory, 'test.env')
const waitFor = async (description, check) => {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const result = await check()
      if (result) return result
    } catch {
      /* Retry dependency startup. */
    }
    await delay(250)
  }
  throw new Error(`Timed out: ${description}`)
}
const start = (role, args) => {
  const name = `${prefix}-${role}`
  containers.push(name)
  docker('run', '-d', '--name', name, '--network', prefix, ...args)
  return name
}
const port = (container, internal) =>
  Number(docker('port', container, `${internal}/tcp`).trim().split(':').at(-1))
let assertions = 0
const equal = (actual, expected) => {
  assert.deepEqual(actual, expected)
  assertions++
}
try {
  console.log('Building the current production image')
  execFileSync('docker', ['build', '-f', 'ops/Dockerfile', '-t', image, '.'], {
    stdio: 'inherit',
    timeout: 600_000
  })
  docker('network', 'create', prefix)
  docker('volume', 'create', uploadVolume)
  await writeFile(
    cleanupEnvFile,
    'NODE_ENV=production\nMONGODB_URI=mongodb://mongodb:27017/graphql_integration?replicaSet=rs0\nMONGODB_AUTO_INDEX=false\nLOG_LEVEL=error\n',
    { mode: 0o600 }
  )
  await writeFile(
    envFile,
    [
      'NODE_ENV=production',
      'APP_HOST=0.0.0.0',
      'APP_PORT=8000',
      'APP_URL=http://localhost:8000',
      'CLIENT_URL=http://localhost:3000',
      'MONGODB_URI=mongodb://mongodb:27017/graphql_integration?replicaSet=rs0',
      'MONGODB_AUTO_INDEX=false',
      'REDIS_URI=redis://redis:6379',
      `JWT_SECRET=${randomBytes(32).toString('hex')}`,
      `MAIL_QUEUE_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
      'BCRYPT_ROUNDS=10',
      'MAIL_HOST=mailpit',
      'MAIL_PORT=1025',
      'MAIL_FROM=Test <no-reply@example.test>',
      'MAIL_WORKER_POLL_MS=100',
      'RATE_LIMIT_MAX=500',
      'AUTH_RATE_LIMIT_MAX=100',
      'ACCOUNT_RATE_LIMIT_MAX=12',
      'MAIL_RECIPIENT_COOLDOWN_MS=1000',
      'MEDIA_OWNER_MAX_FILES=2',
      'LOG_LEVEL=error'
    ].join('\n'),
    { mode: 0o600 }
  )
  const mongo = start('mongodb', [
    '--network-alias',
    'mongodb',
    'mongo:8',
    '--replSet',
    'rs0',
    '--bind_ip_all'
  ])
  const redisContainer = start('redis', [
    '--network-alias',
    'redis',
    'redis:8.10.1-alpine3.23'
  ])
  const mail = start('mailpit', [
    '--network-alias',
    'mailpit',
    '-p',
    '127.0.0.1::8025',
    'axllent/mailpit:latest'
  ])
  await waitFor('MongoDB replica set', () => {
    const output = docker(
      'exec',
      mongo,
      'mongosh',
      '--quiet',
      '--eval',
      'try { print(rs.status().myState) } catch { rs.initiate({_id:"rs0",members:[{_id:0,host:"mongodb:27017"}]}); print(0) }'
    )
    return output.trim() === '1'
  })
  console.log('Checking legacy migration and production-only runtime')
  const legacyHash = await bcrypt.hash('legacy-secret', 10)
  docker(
    'exec',
    mongo,
    'mongosh',
    '--quiet',
    'graphql_integration',
    '--eval',
    `db.users.insertMany([{email:" LEGACY@example.test ",password:${JSON.stringify(legacyHash)},account:{verification:{verified:true,token:"obsolete",expiresIn:new Date()},resetPassword:{token:"obsolete"}},createdAt:new Date(),updatedAt:new Date()},{email:" DUPLICATE@example.test "},{email:"duplicate@example.test"}])`
  )
  const migrate = () =>
    docker(
      'run',
      '--rm',
      '--network',
      prefix,
      '--env-file',
      envFile,
      image,
      'node',
      'dist/app/runtime/commands/database/migrate.js'
    )
  assert.throws(migrate)
  assertions++
  equal(
    docker(
      'exec',
      mongo,
      'mongosh',
      '--quiet',
      'graphql_integration',
      '--eval',
      'print(db.users.countDocuments({email:" LEGACY@example.test ",authVersion:{$exists:false}}))'
    ).trim(),
    '1'
  )
  docker(
    'exec',
    mongo,
    'mongosh',
    '--quiet',
    'graphql_integration',
    '--eval',
    'db.users.deleteMany({email:{$in:[" DUPLICATE@example.test ","duplicate@example.test"]}})'
  )
  migrate()
  migrate()
  const legacy = JSON.parse(
    docker(
      'exec',
      mongo,
      'mongosh',
      '--quiet',
      'graphql_integration',
      '--eval',
      'print(JSON.stringify(db.users.findOne({email:"legacy@example.test"})))'
    )
  )
  equal(legacy.verified, true)
  equal(legacy.password, legacyHash)
  equal(legacy.authVersion, 0)
  equal(legacy.account.verification.token, undefined)
  equal(legacy.account.resetPassword.token, undefined)
  equal(
    docker(
      'run',
      '--rm',
      image,
      'node',
      '-e',
      'process.stdout.write(String(process.getuid()))'
    ),
    '1000'
  )
  assert(
    docker(
      'run',
      '--rm',
      image,
      'node',
      'dist/app/runtime/commands/schema.js'
    ).includes('type Query')
  )
  assertions++
  docker(
    'run',
    '--rm',
    image,
    'node',
    '--input-type=module',
    '-e',
    `for(const name of ['tsx','typescript','@graphql-codegen/cli']) { try { import.meta.resolve(name); process.exit(1) } catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND') throw error } }`
  )
  assertions++
  docker(
    'run',
    '--rm',
    '--network',
    prefix,
    '--env-file',
    envFile,
    image,
    'node',
    'dist/app/runtime/commands/database/indexes.js'
  )
  console.log(
    'Checking recipient admission, idempotency, UTC rollover and alias budgets'
  )
  const mailBudgetProbe = String.raw`
    import assert from 'node:assert/strict'
    import { database } from './dist/app/database/mongodb.js'
    import { enqueueTemplate } from './dist/domains/notifications/delivery/service.js'
    import { MailRecipientBudget } from './dist/domains/notifications/delivery/model.js'
    let checks=0
    const equal=(a,b)=>{assert.deepEqual(a,b);checks++}
    const denied=async operation=>{await assert.rejects(operation,{messageKey:'notifications.recipient_rate_limited'});checks++}
    await database.connect({autoIndex:false})
    try {
      const input={email:'budget-inbox@example.test',template:'signUp'}
      const a=await enqueueTemplate(input,{options:{idempotencyKey:'budget-replay'}})
      const b=await enqueueTemplate(input,{options:{idempotencyKey:'budget-replay'}})
      equal(a.id,b.id)
      const ledger=await MailRecipientBudget.findOne().lean()
      equal(ledger.count,1)
      await MailRecipientBudget.updateOne({_id:ledger._id},{$set:{day:'2000-01-01',count:99,'cooldowns.signUp':new Date(Date.now()+3600000)}})
      await denied(()=>enqueueTemplate(input))
      equal((await MailRecipientBudget.findById(ledger._id).lean()).count,99)
      await MailRecipientBudget.updateOne({_id:ledger._id},{$set:{'cooldowns.signUp':new Date(0)}})
      await enqueueTemplate(input)
      equal((await MailRecipientBudget.findById(ledger._id).lean()).count,1)
      await MailRecipientBudget.updateOne({_id:ledger._id},{$set:{'purposes.signUp':2,'cooldowns.signUp':new Date(0)}})
      await denied(()=>enqueueTemplate(input))
      await MailRecipientBudget.updateOne({_id:ledger._id},{$set:{count:3,'purposes.signUp':0}})
      await denied(()=>enqueueTemplate(input))
      await enqueueTemplate({email:'j.a.n.e+one@gmail.com',template:'signUp'})
      await denied(()=>enqueueTemplate({email:'jan.e+two@googlemail.com',template:'signUp'}))
      equal(await MailRecipientBudget.countDocuments(),2)
      const results=await Promise.allSettled(Array.from({length:8},()=>enqueueTemplate({email:'concurrent@example.test',template:'signUp'})))
      equal(results.filter(result=>result.status==='fulfilled').length,1)
      equal(await MailRecipientBudget.countDocuments(),3)
      equal(await MailRecipientBudget.countDocuments({count:{$gt:3}}),0)
      process.stdout.write(JSON.stringify({checks}))
    } finally { await database.disconnect() }
  `
  const admission = JSON.parse(
    docker(
      'run',
      '--rm',
      '--network',
      prefix,
      '--env-file',
      envFile,
      '-e',
      'MAIL_RECIPIENT_DAILY_MAX=3',
      '-e',
      'MAIL_PURPOSE_DAILY_MAX=2',
      '-e',
      'MAIL_RECIPIENT_COOLDOWN_MS=60000',
      image,
      'node',
      '--input-type=module',
      '-e',
      mailBudgetProbe
    )
  )
  assertions += admission.checks
  equal(
    docker(
      'run',
      '--rm',
      image,
      'node',
      '-e',
      'const fs=require("node:fs");const p=require("./package.json");if(p.name!=="express-graphql-mongodb-boilerplate"||p.author!=="Vacho Aivazov"||!fs.readFileSync("LICENSE","utf8").includes("2026 Vacho Aivazov"))process.exit(1);process.stdout.write("metadata-ok")'
    ),
    'metadata-ok'
  )
  const api = start('api', [
    '--env-file',
    envFile,
    '-p',
    '127.0.0.1::8000',
    '-v',
    uploadVolume + ':/app/storage',
    image
  ])
  start('worker', [
    '--env-file',
    envFile,
    image,
    'node',
    'dist/app/runtime/mail/worker.js'
  ])
  const base = `http://127.0.0.1:${port(api, 8000)}`
  const mailBase = `http://127.0.0.1:${port(mail, 8025)}`
  await waitFor(
    'API readiness',
    async () => (await request(`${base}/health/ready`)).ok
  )
  equal((await (await request(`${base}/health/live`)).json()).status, 'ok')
  let token
  const gql = async (query, variables, authenticated = true) => {
    const response = await request(`${base}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept-language': 'ka',
        ...(authenticated && token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ query, variables })
    })
    return response.json()
  }
  const ok = result => {
    assert.equal(result.errors, undefined, JSON.stringify(result.errors))
    assertions++
    return result.data
  }
  equal(
    (
      await gql(
        'mutation{signUp(input:{email:"weak@example.test",password:"weak"}){accessToken}}',
        undefined,
        false
      )
    ).errors[0].extensions.code,
    'BAD_USER_INPUT'
  )
  token = ok(
    await gql(
      'mutation{signIn(input:{email:"legacy@example.test",password:"legacy-secret"}){accessToken}}',
      undefined,
      false
    )
  ).signIn.accessToken
  equal(ok(await gql('{me{verified}}')).me.verified, true)
  token = undefined
  const email = 'integration@example.test'
  const credentials = { email, password: 'initial-secret-passphrase' }
  equal((await gql('{me{id}}')).errors[0].extensions.code, 'UNAUTHENTICATED')
  token = ok(
    await gql(
      'mutation($input:CredentialsInput!){signUp(input:$input){accessToken}}',
      { input: credentials },
      false
    )
  ).signUp.accessToken
  equal(
    ok(await gql('{me{id email verified} emailTemplates{key}}')).me.email,
    email
  )
  equal(
    (
      await gql(
        'mutation($input:CredentialsInput!){signUp(input:$input){accessToken}}',
        { input: credentials },
        false
      )
    ).errors[0].extensions.code,
    'CONFLICT'
  )
  const mailToken = async (recipient, action) =>
    waitFor(`captured ${action} email`, async () => {
      const messages = await (
        await request(`${mailBase}/api/v1/messages`)
      ).json()
      for (const message of messages.messages ?? []) {
        if (!(message.To ?? []).some(to => to.Address === recipient)) continue
        const full = await (
          await request(`${mailBase}/api/v1/message/${message.ID}`)
        ).json()
        const match = `${full.Text}\n${full.HTML}`.match(
          new RegExp(`/${action}/([a-f0-9]{96})`)
        )
        if (match) {
          assert(/[\u10A0-\u10FF]/.test(`${full.Text} ${full.HTML}`))
          assertions++
          return match[1]
        }
      }
    })
  ok(
    await gql(
      'mutation {requestVerification(email:"integration@example.test"){messageKey}}'
    )
  )
  const verification = await mailToken(email, 'verification')
  token = ok(
    await gql(
      'mutation($token:String!){confirmVerification(token:$token){accessToken}}',
      { token: verification },
      false
    )
  ).confirmVerification.accessToken
  equal(ok(await gql('{me{verified}}')).me.verified, true)
  assert(
    (
      await gql(
        'mutation($token:String!){confirmVerification(token:$token){accessToken}}',
        { token: verification },
        false
      )
    ).errors
  )
  assertions++
  equal(
    ok(
      await gql(
        'mutation{updateProfile(input:{firstName:"Integration",lastName:"Test"}){firstName}}'
      )
    ).updateProfile.firstName,
    'Integration'
  )
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: 'red' }
  })
    .png()
    .toBuffer()
  const form = new FormData()
  form.set(
    'operations',
    JSON.stringify({
      query: 'mutation($file:File!){uploadImage(file:$file){id image}}',
      variables: { file: null }
    })
  )
  form.set('map', JSON.stringify({ 0: ['variables.file'] }))
  form.set('0', new File([png], 'avatar.png', { type: 'image/png' }))
  const upload = ok(
    await (
      await request(`${base}/graphql`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'X-GraphQL-Preflight': '1'
        },
        body: form
      })
    ).json()
  ).uploadImage
  ok(
    await gql('mutation($id:ID!){updateAvatar(imageId:$id){messageKey}}', {
      id: upload.id
    })
  )
  const me = ok(await gql('{me{image}}')).me
  const path = new URL(me.image).pathname
  equal((await request(base + path)).status, 200)
  // A second account cannot attach the first account's image.
  // Concurrent uploads compete for one remaining slot under the same owner lock.
  const uploadAgain = async () => {
    const body = new FormData()
    body.set(
      'operations',
      JSON.stringify({
        query: 'mutation($file:File!){uploadImage(file:$file){id image}}',
        variables: { file: null }
      })
    )
    body.set('map', JSON.stringify({ 0: ['variables.file'] }))
    body.set('0', new File([png], 'extra.png', { type: 'image/png' }))
    return request(`${base}/graphql`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'X-GraphQL-Preflight': '1' },
      body
    }).then(r => r.json())
  }
  const concurrent = await Promise.all([uploadAgain(), uploadAgain()])
  equal(concurrent.filter(result => result.data?.uploadImage).length, 1)
  equal(
    concurrent.filter(
      result => result.errors?.[0]?.message === 'media.owner_quota_exceeded'
    ).length,
    1
  )
  const unused = concurrent.find(result => result.data?.uploadImage).data
    .uploadImage
  docker(
    'exec',
    mongo,
    'mongosh',
    '--quiet',
    'graphql_integration',
    '--eval',
    'db.media.updateMany({refType:{$exists:false}},{$set:{expiresAt:new Date(0)}})'
  )
  const cleanup = () =>
    JSON.parse(
      docker(
        'run',
        '--rm',
        '--network',
        prefix,
        '--env-file',
        cleanupEnvFile,
        '-v',
        uploadVolume + ':/app/storage',
        image,
        'node',
        'dist/app/runtime/commands/media.js'
      )
    )
  equal(cleanup().deleted, 1)
  equal((await request(base + new URL(unused.image).pathname)).status, 404)
  equal((await request(base + path)).status, 200)
  equal(cleanup().deleted, 0)
  const ownerToken = token
  token = ok(
    await gql(
      'mutation($input:CredentialsInput!){signUp(input:$input){accessToken}}',
      {
        input: {
          email: 'other@example.test',
          password: 'other-secret-passphrase'
        }
      },
      false
    )
  ).signUp.accessToken
  equal(
    (
      await gql('mutation($id:ID!){updateAvatar(imageId:$id){messageKey}}', {
        id: upload.id
      })
    ).errors[0].extensions.code,
    'NOT_FOUND'
  )
  ok(
    await gql(
      'mutation{deleteProfile(input:{password:"other-secret-passphrase"}){messageKey}}'
    )
  )
  token = ownerToken
  ok(
    await gql(
      'mutation{resetPassword(email:"integration@example.test"){messageKey}}',
      undefined,
      false
    )
  )
  ok(
    await gql(
      'mutation{resetPassword(email:"integration@example.test"){messageKey}}',
      undefined,
      false
    )
  )
  const accountId = ok(await gql('{me{id}}')).me.id
  const accountBucket = docker(
    'run',
    '--rm',
    '--env-file',
    envFile,
    image,
    'node',
    '--input-type=module',
    '-e',
    'import {createHmac} from "node:crypto";process.stdout.write(createHmac("sha256",process.env.JWT_SECRET).update("account-budget\\0").update("id:"+' +
      JSON.stringify(accountId) +
      ').digest("hex"))'
  )
  docker(
    'exec',
    redisContainer,
    'redis-cli',
    'SET',
    'rateLimit:account:' + accountBucket,
    '12',
    'PX',
    '900000'
  )
  equal(
    ok(
      await gql(
        'mutation{resetPassword(email:"integration@example.test"){messageKey}}',
        undefined,
        false
      )
    ).resetPassword.messageKey,
    'auth.password_reset_requested'
  )
  equal(
    docker(
      'exec',
      redisContainer,
      'redis-cli',
      'GET',
      'rateLimit:account:' + accountBucket
    ).trim(),
    '13'
  )
  docker(
    'exec',
    redisContainer,
    'redis-cli',
    'DEL',
    'rateLimit:account:' + accountBucket
  )
  const reset = await mailToken(email, 'reset-password')
  token = ok(
    await gql(
      'mutation($token:String!){newPassword(token:$token,input:{password:"reset-secret-passphrase"}){accessToken}}',
      { token: reset },
      false
    )
  ).newPassword.accessToken
  equal(
    (
      await request(`${base}/graphql`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ownerToken}`
        },
        body: JSON.stringify({ query: '{me{id}}' })
      }).then(r => r.json())
    ).errors[0].extensions.code,
    'UNAUTHENTICATED'
  )
  assert(
    (
      await gql(
        'mutation($token:String!){newPassword(token:$token,input:{password:"again-secret-passphrase"}){accessToken}}',
        { token: reset },
        false
      )
    ).errors
  )
  assertions++
  await delay(1100) // Separate successful password-change notifications after the configured cooldown.
  token = ok(
    await gql(
      'mutation{updatePassword(input:{oldPassword:"reset-secret-passphrase",newPassword:"updated-secret-passphrase"}){accessToken}}'
    )
  ).updatePassword.accessToken
  token = ok(
    await gql(
      'mutation{updateEmail(input:{email:"changed@example.test",password:"updated-secret-passphrase"}){email accessToken}}'
    )
  ).updateEmail.accessToken
  equal(ok(await gql('{me{email verified}}')).me.email, 'changed@example.test')
  equal(ok(await gql('{me{verified}}')).me.verified, false)
  ok(await gql('mutation{signOut{messageKey}}'))
  equal((await gql('{me{id}}')).errors[0].extensions.code, 'UNAUTHENTICATED')
  token = ok(
    await gql(
      'mutation{signIn(input:{email:"changed@example.test",password:"updated-secret-passphrase"}){accessToken}}',
      undefined,
      false
    )
  ).signIn.accessToken
  ok(
    await gql(
      'mutation{deleteProfile(input:{password:"updated-secret-passphrase"}){messageKey}}'
    )
  )
  equal((await gql('{me{id}}')).errors[0].extensions.code, 'UNAUTHENTICATED')
  equal((await request(base + path)).status, 404)
  equal(
    (await gql('{__schema{queryType{name}}}', undefined, false)).errors.length >
      0,
    true
  )
  // This identity has a separate shared budget, lower than the IP allowance.
  for (let i = 0; i < 12; i++)
    equal(
      (
        await gql(
          'mutation{signIn(input:{email:" Budget@example.test ",password:"wrong"}){accessToken}}',
          undefined,
          false
        )
      ).errors[0].extensions.code,
      'UNAUTHENTICATED'
    )
  equal(
    (
      await gql(
        'mutation{signIn(input:{email:"budget@example.test",password:"wrong"}){accessToken}}',
        undefined,
        false
      )
    ).errors[0].message,
    'auth.account_rate_limited'
  )
  console.log(
    `Integration passed: ${assertions} assertions against the production image, MongoDB, Redis and SMTP capture`
  )
} catch (error) {
  for (const name of containers.filter(name => /-(api|worker)$/.test(name))) {
    try {
      console.error(docker('logs', '--tail', '30', name))
    } catch {
      /* Container may not have started. */
    }
  }
  throw error
} finally {
  for (const name of containers.reverse()) {
    try {
      docker('rm', '-fv', name)
    } catch {
      /* Remove all remaining isolated resources. */
    }
  }
  try {
    docker('network', 'rm', prefix)
  } catch {
    /* Network may not have been created. */
  }
  try {
    docker('volume', 'rm', uploadVolume)
  } catch {
    /* Volume may not have been created. */
  }
  await rm(directory, { recursive: true, force: true })
}
