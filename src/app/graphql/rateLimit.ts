import { ipKeyGenerator } from 'express-rate-limit'
import { redis } from '../database/redis.ts'
import { apiEnv as env } from '../config/api.ts'
import { AppError } from '../http/errors.ts'

const increment = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return n`
export const rateLimitAuthOperation = async (ip: string): Promise<void> => {
  const count = await redis.eval(increment, {
    keys: [`rateLimit:graphql:auth:${ipKeyGenerator(ip)}`],
    arguments: [String(env.RATE_LIMIT_WINDOW_MS)]
  })
  if (Number(count) > env.AUTH_RATE_LIMIT_MAX) throw new AppError(429)
}
