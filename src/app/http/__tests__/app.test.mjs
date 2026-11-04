import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { buildSchema } from 'graphql'
import mongoose from 'mongoose'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { replace, logger } from '../../../__tests__/helpers.mjs'
import { request } from '../../../__tests__/http.mjs'
import { apiEnvironmentSchema } from '../../../../dist/app/config/schemas.js'
const root = await mkdtemp(join(tmpdir(), 'unit-app-'))
after(() => rm(root, { recursive: true, force: true }))
await mkdir(join(root, 'conversions'))
await writeFile(join(root, 'conversions', 'image.webp'), 'webp')
const env = apiEnvironmentSchema.parse(process.env)
const redis = { isReady: false }
let authCalls = 0
replace('app/config/api.js', { apiEnv: env })
replace('app/database/redis.js', { redis })
replace('domains/media/index.js', { storageRoot: root })
replace('app/runtime/logger.js', { logger })
replace('domains/auth/index.js', {
  resolveAuth: async () => {
    authCalls++
    return undefined
  }
})
replace('app/graphql/schema.js', {
  schema: buildSchema('type Query { hello: String }')
})
replace('app/http/middlewares/rateLimit.js', {
  createRateLimits: () => ({
    apiRateLimit: (_req, _res, next) => next(),
    authRateLimit: (_req, _res, next) => next()
  })
})
const { createApp } = await import('../../../../dist/app/http/app.js')
test('liveness bypasses auth and readiness follows MongoDB/Redis', async () => {
  const app = createApp()
  assert.equal((await request(app, '/health/live')).body.status, 'ok')
  assert.equal((await request(app, '/health/ready')).status, 503)
  const state = Object.getOwnPropertyDescriptor(
    mongoose.connection,
    'readyState'
  )
  Object.defineProperty(mongoose.connection, 'readyState', {
    value: 1,
    configurable: true,
    writable: true
  })
  try {
    assert.equal((await request(app, '/health/ready')).status, 503)
    redis.isReady = true
    assert.equal((await request(app, '/health/ready')).status, 200)
    assert.equal(authCalls, 0)
  } finally {
    delete mongoose.connection.readyState
    if (state) Object.defineProperty(mongoose.connection, 'readyState', state)
  }
})
test('app serves only conversions and unknown routes return machine 404', async () => {
  const app = createApp()
  const image = await request(app, '/storage/public/conversions/image.webp')
  assert.equal(image.status, 200)
  assert.equal(image.text, 'webp')
  const missing = await request(app, '/missing')
  assert.equal(missing.status, 404)
  assert.equal(missing.body.messageKey, 'http.status.404')
  assert.equal(missing.headers['cache-control'], 'no-store')
})
test('production security, explicit proxy and CORS are composed', async () => {
  env.NODE_ENV = 'production'
  env.TRUST_PROXY = 'loopback, 10.0.0.0/8'
  const app = createApp()
  const res = await request(app, '/health/live', {
    headers: { origin: 'http://localhost:3000' }
  })
  assert.equal(
    res.headers['access-control-allow-origin'],
    'http://localhost:3000'
  )
  assert(res.headers['strict-transport-security'])
  assert.equal(typeof app.get('trust proxy fn'), 'function')
  env.NODE_ENV = 'development'
  env.TRUST_PROXY = ''
})

test('production disables GraphiQL and introspection while ordinary queries remain valid', async () => {
  env.NODE_ENV = 'production'
  try {
    const app = createApp()
    const result = await request(app, '/graphql', {
      method: 'POST',
      body: { query: '{ __schema { queryType { name } } }' }
    })
    assert(result.body.errors)
    const html = await request(app, '/graphql', {
      headers: { accept: 'text/html' }
    })
    assert(!html.text.includes('Yoga GraphiQL'))
  } finally {
    env.NODE_ENV = 'development'
  }
})
test('development GraphiQL has its scoped CSP and accepts no business request', async () => {
  const result = await request(createApp(), '/graphql', {
    headers: { accept: 'text/html' }
  })
  assert.equal(result.status, 200)
  assert(result.text.includes('GraphiQL'))
  assert(
    result.headers['content-security-policy'].includes('https://unpkg.com')
  )
})
