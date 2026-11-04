import type { z } from 'zod'
import type {
  messageKeySchema,
  messageParamsSchema,
  validationIssueSchema,
  errorResponseSchema,
  livenessResponseSchema,
  readinessResponseSchema
} from './schemas.ts'

export type MessageKeyDto = z.infer<typeof messageKeySchema>
export type MessageParamsDto = z.infer<typeof messageParamsSchema>
export type ValidationIssueDto = z.infer<typeof validationIssueSchema>
export type ErrorResponseDto = z.infer<typeof errorResponseSchema>
export type LivenessResponseDto = z.infer<typeof livenessResponseSchema>
export type ReadinessResponseDto = z.infer<typeof readinessResponseSchema>
