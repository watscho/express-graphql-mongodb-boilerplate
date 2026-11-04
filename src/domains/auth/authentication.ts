import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { redis } from '../../app/database/redis.ts'
import { AppError } from '../../app/http/errors.ts'
import { userService } from '../users/index.ts'
import { jwtVerify, hashToken } from './utils.ts'
import type { AuthContextDto, TokenClaimsDto } from './dto.ts'

export const resolveAuth = async (
  authorization?: string
): Promise<AuthContextDto | undefined> => {
  if (!authorization) return undefined
  const accessToken = authorization.match(/^Bearer ([^\s]+)$/i)?.[1]
  if (!accessToken) throw new AppError(401, 'auth.invalid_access_token')
  let claims: TokenClaimsDto
  try {
    claims = jwtVerify(accessToken)
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof ZodError)
      throw new AppError(401, 'auth.invalid_access_token')
    throw error
  }
  if (await redis.exists(`expiredToken:${hashToken(accessToken)}`))
    throw new AppError(401, 'auth.invalid_access_token')
  const user = await userService.getById(claims.sub)
  if (!user || user.authVersion !== claims.version)
    throw new AppError(401, 'auth.invalid_access_token')
  return {
    user,
    accessToken,
    expiresAt: claims.exp
  } satisfies AuthContextDto
}
