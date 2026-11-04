import { recipientBudgetIdentity } from '../utils.ts'
import { createHmac } from 'node:crypto'
import type { ClientSession } from 'mongoose'
import { queueEnv } from '../../../app/config/queue.ts'
import { deliveryEnv as env } from '../../../app/config/delivery.ts'
import { AppError } from '../../../app/http/errors.ts'
import { MailRecipientBudget } from './model.ts'

export const consumeRecipientBudget = async (
  email: string,
  template: string,
  session: ClientSession
): Promise<void> => {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  const id = createHmac(
    'sha256',
    Buffer.from(queueEnv.MAIL_QUEUE_ENCRYPTION_KEY, 'hex')
  )
    .update('recipient-budget\0')
    .update(recipientBudgetIdentity(email))
    .digest('hex')
  try {
    const admitted = await MailRecipientBudget.findOneAndUpdate(
      {
        _id: id,
        $and: [
          {
            $or: [
              { day: { $ne: day } },
              {
                count: { $lt: env.MAIL_RECIPIENT_DAILY_MAX },
                $or: [
                  { [`purposes.${template}`]: { $exists: false } },
                  {
                    [`purposes.${template}`]: {
                      $lt: env.MAIL_PURPOSE_DAILY_MAX
                    }
                  }
                ]
              }
            ]
          },
          {
            $or: [
              { [`cooldowns.${template}`]: { $exists: false } },
              { [`cooldowns.${template}`]: { $lte: now } }
            ]
          }
        ]
      },
      [
        {
          $set: {
            count: {
              $add: [
                {
                  $cond: [{ $eq: ['$day', day] }, { $ifNull: ['$count', 0] }, 0]
                },
                1
              ]
            },
            purposes: {
              $cond: [
                { $eq: ['$day', day] },
                { $ifNull: ['$purposes', {}] },
                {}
              ]
            },
            cooldowns: { $ifNull: ['$cooldowns', {}] },
            day,
            purgeAt: new Date(now.getTime() + 2 * 86400000)
          }
        },
        {
          $set: {
            [`purposes.${template}`]: {
              $add: [{ $ifNull: [`$purposes.${template}`, 0] }, 1]
            },
            [`cooldowns.${template}`]: new Date(
              now.getTime() + env.MAIL_RECIPIENT_COOLDOWN_MS
            )
          }
        }
      ],
      { upsert: true, updatePipeline: true, returnDocument: 'after', session }
    )
      .lean()
      .exec()
    if (admitted) return
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 11000))
      throw error
  }
  throw new AppError(429, 'notifications.recipient_rate_limited')
}
