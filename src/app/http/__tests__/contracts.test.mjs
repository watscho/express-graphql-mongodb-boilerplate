import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { toValidationIssueDto } from '../../../../dist/app/http/transformer.js'
import { createErrorResponse } from '../../../../dist/app/http/response.js'

test('validation errors expose constraints, never rejected values', () => {
  const r = z
    .object({ password: z.string().min(10) })
    .safeParse({ password: 'secret' })
  const dto = toValidationIssueDto(r.error.issues[0])
  assert.equal(dto.path, 'password')
  assert.equal(dto.params.min, 10)
  assert(!JSON.stringify(dto).includes('secret'))
  assert.deepEqual(
    toValidationIssueDto({
      code: 'custom',
      path: ['field', 0],
      message: 'auth.example',
      params: { max: 72, nested: { secret: true } }
    }),
    { path: 'field.0', messageKey: 'auth.example', params: { max: 72 } }
  )
  assert.equal(
    toValidationIssueDto({
      code: 'custom',
      path: [],
      message: 'English error text'
    }).messageKey,
    'validation.custom'
  )
})

test('numeric and bigint bounds are serialized as safe validation parameters', () => {
  for (const [issue, field, value] of [
    [
      { code: 'too_small', minimum: 1n, inclusive: true, origin: 'bigint' },
      'min',
      '1'
    ],
    [
      { code: 'too_big', maximum: 9n, inclusive: false, origin: 'bigint' },
      'max',
      '9'
    ],
    [
      { code: 'too_big', maximum: 10, inclusive: true, origin: 'number' },
      'max',
      10
    ]
  ]) {
    assert.equal(
      toValidationIssueDto({ ...issue, path: ['amount'] }).params[field],
      value
    )
  }
})

test('HTTP infrastructure errors preserve safe field details', () => {
  assert.deepEqual(createErrorResponse(400, 'validation.failed', []), {
    status: 400,
    messageKey: 'validation.failed',
    details: []
  })
})
