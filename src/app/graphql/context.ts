import type { Request, Response } from 'express'
import type { AuthContextDto } from '../../domains/auth/dto.ts'
import { AppError } from '../http/errors.ts'

export interface GraphQLContext {
  auth?: AuthContextDto
  language?: string
  requestId: string
  // A request may contain several aliased fields; throttle each sensitive invocation.
  rateLimitAuth: () => Promise<void>
}
export interface ExpressContext {
  req: Request
  res: Response
}
export const requireAuth = (context: GraphQLContext): AuthContextDto => {
  if (!context.auth) throw new AppError(401, 'auth.authentication_required')
  return context.auth
}
export const requireGuest = (context: GraphQLContext): void => {
  if (context.auth) throw new AppError(403, 'auth.guest_required')
}
