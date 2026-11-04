import { createHmac } from 'node:crypto'
import { apiEnv as env } from '../../app/config/api.ts'
import { redis } from '../../app/database/redis.ts'
import { AppError } from '../../app/http/errors.ts'

const increment = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return n`
// Shared across IPs and credential-confirmation paths; identities never appear in keys.
export const consumeAccountBudget = async (identity: string): Promise<void> => {
  const digest = createHmac('sha256', env.JWT_SECRET)
    .update('account-budget\0')
    .update(identity.trim().toLowerCase())
    .digest('hex')
  const count = await redis.eval(increment, {
    keys: [`rateLimit:account:${digest}`],
    arguments: [String(env.RATE_LIMIT_WINDOW_MS)]
  })
  if (Number(count) > env.ACCOUNT_RATE_LIMIT_MAX)
    throw new AppError(429, 'auth.account_rate_limited')
}
