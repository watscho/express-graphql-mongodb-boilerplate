import { GraphQLError } from 'graphql'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError } from '../http/errors.ts'
import { toValidationIssueDto } from '../http/transformer.ts'
import { logger } from '../runtime/logger.ts'
import { errorDiagnostic } from '../runtime/diagnostics/diagnostic.ts'

const codes: Record<number, string> = {
  400: 'BAD_USER_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED'
}
export const maskGraphQLError = (
  error: unknown,
  requestId?: string
): GraphQLError => {
  const original = error instanceof GraphQLError ? error.originalError : error
  let failure: AppError | undefined
  if (original instanceof AppError) failure = original
  else if (original instanceof ZodError)
    failure = new AppError(
      400,
      'validation.failed',
      original.issues.map(toValidationIssueDto)
    )
  else if (
    original instanceof mongoose.Error.ValidationError ||
    original instanceof mongoose.Error.CastError
  )
    failure = new AppError(400)
  else if (
    original instanceof Error &&
    'code' in original &&
    original.code === 11000
  )
    failure = new AppError(409)
  // GraphQL parser/validation/coercion errors contain no underlying application exception.
  if (error instanceof GraphQLError && !original) return error
  if (!failure)
    logger.error('GraphQL operation failed', {
      component: 'api',
      stage: 'graphql',
      requestId,
      ...errorDiagnostic(original, { component: 'api', stage: 'graphql' })
    })
  return new GraphQLError(failure?.messageKey ?? 'http.status.500', {
    extensions: {
      code: failure
        ? (codes[failure.status] ?? 'INTERNAL_SERVER_ERROR')
        : 'INTERNAL_SERVER_ERROR',
      status: failure?.status ?? 500,
      ...(failure?.details ? { details: failure.details } : {}),
      ...(requestId ? { requestId } : {})
    }
  })
}
