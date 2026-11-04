import type {
  ErrorResponseDto,
  MessageKeyDto,
  ValidationIssueDto
} from './dto.ts'

export const getHttpMessageKey = (status: number): MessageKeyDto =>
  `http.status.${status}`

export const createErrorResponse = (
  status: number,
  messageKey = getHttpMessageKey(status),
  details?: ValidationIssueDto[]
): ErrorResponseDto => ({
  messageKey,
  status,
  ...(details ? { details } : {})
})
