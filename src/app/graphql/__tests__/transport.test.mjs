import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { GraphQLError, parse, validate, buildSchema } from 'graphql'
import { z } from 'zod'
import mongoose from 'mongoose'
import {
  replace,
  methods,
  user,
  logger,
  reset
} from '../../../__tests__/helpers.mjs'
import { request } from '../../../__tests__/http.mjs'
const auth = methods([
  'signIn',
  'signUp',
  'signOut',
  'resetPassword',
  'newPassword',
  'updateEmail',
  'updatePassword',
  'deleteProfile'
])
const verification = methods(['request', 'confirm'])
const users = methods(['updateProfile'])
const media = methods(['upload', 'updateAvatar', 'avatarUrl'])
let currentAuth,
  authFailure,
  count = 0
replace('domains/auth/index.js', {
  resolveAuth: async () => {
    if (authFailure) throw authFailure
    return currentAuth
  }
})
replace('domains/auth/service.js', { authService: auth })
replace('domains/auth/verification/service.js', {
  verificationService: verification
})
replace('domains/users/service.js', { userService: users })
replace('domains/media/service.js', { mediaService: media })
replace('domains/media/index.js', {
  mediaService: media,
  storageRoot: '/tmp/absent-graphql-test-storage'
})
replace('domains/media/upload.js', {
  storeUpload: async file => ({ filename: file.name })
})
replace('app/runtime/logger.js', { logger })
replace('app/database/redis.js', {
  redis: { isReady: true, eval: async () => ++count }
})
replace('app/http/middlewares/rateLimit.js', {
  createRateLimits: () => ({ apiRateLimit: (_req, _res, next) => next() })
})
const { createApp } = await import('../../../../dist/app/http/app.js')
const { schema } = await import('../../../../dist/app/graphql/schema.js')
const { maskGraphQLError } =
  await import('../../../../dist/app/graphql/errors.js')
const { operationLimits } =
  await import('../../../../dist/app/graphql/limits.js')
const { requireAuth, requireGuest } =
  await import('../../../../dist/app/graphql/context.js')
const app = createApp()
const run = (query, variables) =>
  request(app, '/graphql', { method: 'POST', body: { query, variables } })
beforeEach(() => {
  reset(auth, verification, users, media, logger)
  count = 0
  currentAuth = undefined
  authFailure = undefined
  for (const name of ['signIn', 'signUp', 'newPassword', 'updatePassword'])
    auth[name].mock.mockImplementation(async () => ({ accessToken: 'jwt' }))
  verification.confirm.mock.mockImplementation(async () => ({
    accessToken: 'jwt'
  }))
})
test('GraphQL schema exposes explicit public fields only', () => {
  const fields = Object.keys(schema.getType('User').getFields())
  assert(!fields.includes('password'))
  assert(!fields.includes('authVersion'))
  assert(!fields.includes('account'))
  assert(schema.getMutationType().getFields().uploadImage)
})
test('guards enforce authenticated and guest contexts', () => {
  assert.throws(() => requireAuth({}), { status: 401 })
  assert.throws(() => requireGuest({ auth: { user } }), { status: 403 })
  assert.equal(requireAuth({ auth: { user } }).user, user)
  requireGuest({})
})
test('sign-in validates and normalizes input through real HTTP, Yoga and resolver', async () => {
  const result = await run(
    'mutation($input:CredentialsInput!){signIn(input:$input){accessToken}}',
    {
      input: { email: ' UNIT@example.test ', password: 'correct-horse-secret' }
    }
  )
  assert.equal(result.status, 200)
  assert.equal(result.body.data.signIn.accessToken, 'jwt')
  assert.equal(
    auth.signIn.mock.calls[0].arguments[0].email,
    'unit@example.test'
  )
  assert.equal(result.headers['cache-control'], 'no-store')
  assert(result.headers['x-request-id'])
})
test('guest and auth operations validate inputs and return stable errors', async () => {
  let result = await run('query { me { id } }')
  assert.equal(result.body.errors[0].extensions.code, 'UNAUTHENTICATED')
  result = await run(
    'mutation { signUp(input:{email:"invalid",password:"x"}) {accessToken} }'
  )
  assert.equal(result.body.errors[0].extensions.code, 'BAD_USER_INPUT')
  assert.equal(result.body.errors[0].extensions.details[0].path, 'email')
  assert.equal(auth.signUp.mock.callCount(), 0)
  currentAuth = { user }
  result = await run(
    'mutation {signIn(input:{email:"unit@example.test",password:"correct-horse-secret"}) {accessToken}}'
  )
  assert.equal(result.body.errors[0].extensions.code, 'FORBIDDEN')
})
test('all guest workflows forward validated contracts and mail language', async () => {
  const token = 'a'.repeat(96)
  for (const [query, name, service] of [
    [
      'signUp(input:{email:"unit@example.test",password:"correct-horse-secret"}){accessToken}',
      'signUp',
      auth
    ],
    [
      'resetPassword(email:"unit@example.test"){messageKey}',
      'resetPassword',
      auth
    ],
    [
      `newPassword(token:"${token}",input:{password:"correct-horse-secret"}){accessToken}`,
      'newPassword',
      auth
    ],
    [
      `confirmVerification(token:"${token}"){accessToken}`,
      'confirm',
      verification
    ]
  ]) {
    const result = await request(app, '/graphql', {
      method: 'POST',
      headers: { 'accept-language': 'ka' },
      body: { query: `mutation {${query}}` }
    })
    assert.equal(result.body.errors, undefined, JSON.stringify(result.body))
    assert.equal(service[name].mock.callCount(), 1)
    assert.equal(service[name].mock.calls[0].arguments.at(-1), 'ka')
  }
})
test('profile, avatar, email and verification use authenticated account', async () => {
  currentAuth = { user, accessToken: 'old', expiresAt: 123 }
  media.avatarUrl.mock.mockImplementation(
    async () => 'https://example.test/avatar.webp'
  )
  let result = await run(
    '{me{id email image createdAt} emailTemplates{key languages defaultLanguage}}'
  )
  assert.equal(result.body.data.me.id, user.id)
  assert(result.body.data.emailTemplates.length > 0)
  users.updateProfile.mock.mockImplementation(async (_user, input) => input)
  auth.updateEmail.mock.mockImplementation(async () => ({ email: user.email }))
  for (const field of [
    'updateProfile(input:{firstName:"Unit",lastName:"Test"}){firstName}',
    `updateAvatar(imageId:"${'a'.repeat(24)}"){messageKey}`,
    'requestVerification(email:"unit@example.test"){messageKey}',
    'updateEmail(input:{email:"unit@example.test",password:"correct-horse-secret"}){email}'
  ]) {
    result = await run(`mutation {${field}}`)
    assert.equal(result.body.errors, undefined, JSON.stringify(result.body))
  }
  assert.equal(users.updateProfile.mock.calls[0].arguments[0], user)
})
test('security mutations clear context for later aliased fields', async () => {
  for (const field of [
    'signOut{messageKey}',
    'updatePassword(input:{oldPassword:"old",newPassword:"correct-horse-secret"}){accessToken}',
    'deleteProfile(input:{password:"correct-horse-secret"}){messageKey}',
    'updateEmail(input:{email:"new@example.test",password:"correct-horse-secret"}){email}'
  ]) {
    currentAuth = { user }
    auth.updateEmail.mock.mockImplementation(async () => ({
      email: 'new@example.test',
      accessToken: 'new'
    }))
    const result = await run(
      `mutation { ${field} after:updateProfile(input:{firstName:"Unit",lastName:"Test"}){firstName} }`
    )
    assert.equal(result.body.data.after, null)
    assert.equal(result.body.errors[0].extensions.code, 'UNAUTHENTICATED')
  }
})
test('aliasing cannot bypass sensitive operation rate limits', async () => {
  count = 9
  const result = await run(
    'mutation { a:signIn(input:{email:"unit@example.test",password:"correct-horse-secret"}){accessToken} b:signIn(input:{email:"unit@example.test",password:"correct-horse-secret"}){accessToken} }'
  )
  assert.equal(result.body.data.a.accessToken, 'jwt')
  assert.equal(result.body.data.b, null)
  assert.equal(result.body.errors[0].extensions.code, 'RATE_LIMITED')
})
test('token, parser, batching and mutation-over-GET errors happen before services', async () => {
  for (const query of [
    'mutation {newPassword(token:"bad",input:{password:"correct-horse-secret"}){accessToken}}',
    '{ unknown }',
    'query {'
  ]) {
    const result = await run(query)
    assert(result.body.errors)
  }
  const batch = await request(app, '/graphql', {
    method: 'POST',
    body: [{ query: '{me{id}}' }]
  })
  assert(batch.body.errors)
  const get = await request(
    app,
    '/graphql?query=' + encodeURIComponent('mutation {signOut{messageKey}}')
  )
  assert.equal(get.status, 405)
  assert.equal(auth.signOut.mock.callCount(), 0)
})
test('authentication infrastructure errors are masked and expected failures are public', async () => {
  authFailure = new Error('secret-connection-string')
  let result = await run('{me{id}}')
  assert(!JSON.stringify(result.body).includes('secret-connection-string'))
  assert.equal(result.body.errors[0].extensions.code, 'INTERNAL_SERVER_ERROR')
  const { AppError } = await import('../../../../dist/app/http/errors.js')
  authFailure = new AppError(401, 'auth.invalid_access_token')
  result = await run('{me{id}}')
  assert.equal(result.body.errors[0].extensions.code, 'UNAUTHENTICATED')
})
test('multipart requires explicit preflight and unsupported bodies are rejected', async () => {
  let result = await request(app, '/graphql', {
    method: 'POST',
    body: 'invalid',
    headers: { 'content-type': 'multipart/form-data; boundary=x' }
  })
  assert.equal(result.status, 400)
  assert.equal(result.body.errors[0].message, 'graphql.preflight_required')
  result = await request(app, '/graphql', {
    method: 'POST',
    body: 'query {me{id}}',
    headers: { 'content-type': 'text/plain' }
  })
  assert.equal(result.status, 415)
  result = await request(app, '/graphql', {
    method: 'POST',
    body: '{',
    headers: { 'content-type': 'application/json' }
  })
  assert.equal(result.status, 400)
  result = await request(app, '/graphql', {
    method: 'POST',
    body: { query: ' '.repeat(110000) }
  })
  assert.equal(result.status, 413)
})
test('operation budgets expand repeated fragments and bound nested fields', () => {
  const mini = buildSchema('type Query {child: Query, leaf: String}')
  for (const query of [
    '{a:leaf b:leaf c:leaf d:leaf}',
    '{child{child{leaf}}}',
    '{child{a:leaf b:leaf c:leaf} leaf}',
    'query { ...F ...F ...F } fragment F on Query {leaf}',
    '{ ... on Query {a:leaf b:leaf c:leaf} }'
  ])
    assert(validate(mini, parse(query), [operationLimits(2, 2)]).length)
  assert.equal(
    validate(mini, parse('{leaf}'), [operationLimits(2, 2)]).length,
    0
  )
  assert.equal(
    validate(mini, parse('query {...F} fragment F on Query {...F}'), [
      operationLimits(2, 2)
    ]).length,
    0
  )
  assert.equal(
    validate(mini, parse('{...Missing}'), [operationLimits(2, 2)]).length,
    0
  )
})
test('error conversion covers Zod, Mongo, known application errors and opaque failures', async () => {
  const { AppError } = await import('../../../../dist/app/http/errors.js')
  const zod = z.string().min(2).safeParse('').error
  for (const error of [
    new AppError(400, 'validation.failed', []),
    zod,
    new mongoose.Error.ValidationError(),
    new mongoose.Error.CastError('ObjectId', 'x', 'id'),
    Object.assign(new Error(), { code: 11000 }),
    new AppError(502),
    new Error('correct-horse-secret'),
    null
  ]) {
    const result = maskGraphQLError(
      new GraphQLError('wrapper', { originalError: error }),
      'request-id'
    )
    assert(result instanceof GraphQLError)
    if (error) assert.equal(result.extensions.requestId, 'request-id')
    assert(!JSON.stringify(result).includes('correct-horse-secret'))
  }
  const publicError = new GraphQLError('validation')
  assert.equal(maskGraphQLError(publicError), publicError)
})

test('File scalar rejects JSON and literal values and accepts both native and Yoga File', async () => {
  const { mediaResolvers } =
    await import('../../../../dist/domains/media/graphql/resolvers.js')
  const { File: YogaFile } = await import('@whatwg-node/fetch')
  const scalar = mediaResolvers.File
  const native = new File(['x'], 'native.png', { type: 'image/png' })
  const yoga = new YogaFile(['x'], 'yoga.png', { type: 'image/png' })
  assert.equal(scalar.parseValue(native), native)
  assert.equal(scalar.parseValue(yoga), yoga)
  assert.throws(() => scalar.parseValue({ name: 'fake' }))
  assert.throws(() =>
    scalar.parseLiteral({ kind: 'StringValue', value: 'fake' })
  )
  assert.throws(() => scalar.serialize(native))
  currentAuth = { user }
  media.upload.mock.mockImplementation(async () => ({
    id: 'a'.repeat(24),
    image: 'https://example.test/a.webp'
  }))
  const result = await mediaResolvers.Mutation.uploadImage(
    null,
    { file: native },
    { auth: currentAuth }
  )
  assert.equal(result.id, 'a'.repeat(24))
  assert.equal(media.upload.mock.calls[0].arguments[1], user)
})
test('parser token budget bounds oversized GraphQL documents', async () => {
  const result = await run(
    '{' +
      Array.from({ length: 2200 }, (_, i) => `f${i}:__typename`).join(' ') +
      '}'
  )
  assert(
    result.body.errors.some(error => error.message.includes('2000 tokens'))
  )
})
test('sensitive limiter falls back to socket identity when proxy IP is absent', async () => {
  const { createGraphQLServer } =
    await import('../../../../dist/app/graphql/server.js')
  for (const socket of [{ remoteAddress: '::1' }, {}]) {
    const result = await createGraphQLServer().fetch(
      'http://localhost/graphql',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query:
            'mutation {signIn(input:{email:"unit@example.test",password:"correct-horse-secret"}){accessToken}}'
        })
      },
      {
        req: { headers: {}, get: () => undefined, socket },
        res: { locals: { requestId: 'unit' } }
      }
    )
    assert.equal((await result.json()).data.signIn.accessToken, 'jwt')
  }
})
