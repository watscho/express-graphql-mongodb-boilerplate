import { bootstrap } from '../../bootstrap.ts'
import { errorDiagnostic } from '../../diagnostics/diagnostic.ts'
import { reportFailure } from '../../diagnostics/report.ts'
import { createHash } from 'node:crypto'

await bootstrap('db:migrate:legacy', async () => {
  const [
    { database },
    { User },
    { Media },
    { ResetPassword },
    { Verification },
    { logger }
  ] = await Promise.all([
    import('../../../database/mongodb.ts'),
    import('../../../../domains/users/model.ts'),
    import('../../../../domains/media/model.ts'),
    import('../../../../domains/auth/model.ts'),
    import('../../../../domains/auth/verification/model.ts'),
    import('../../logger.ts')
  ])
  let stage = 'mongodb'
  // Run with the API stopped, after backing up the database. This script is rerunnable.
  try {
    await database.connect({ autoIndex: false })
    stage = 'normalized_email_preflight'
    const conflicts = await User.collection
      .aggregate(
        [
          {
            $project: {
              email: {
                $toLower: { $trim: { input: { $ifNull: ['$email', ''] } } }
              }
            }
          },
          { $group: { _id: '$email', count: { $sum: 1 } } },
          { $match: { $or: [{ _id: '' }, { count: { $gt: 1 } }] } },
          { $limit: 1 },
          { $project: { _id: 0, count: 1 } }
        ],
        { maxTimeMS: 60000 }
      )
      .toArray()
    if (conflicts.length)
      throw new Error(
        'Reconcile missing or duplicate normalized emails before migration'
      )
    stage = 'graphql_legacy_accounts'
    await User.collection.updateMany({}, [
      {
        $set: {
          email: { $toLower: { $trim: { input: '$email' } } },
          verified: {
            $ifNull: [
              '$verified',
              { $ifNull: ['$account.verification.verified', false] }
            ]
          }
        }
      }
    ])
    // Old embedded links have a different format and validation policy. Invalidate them.
    await User.collection.updateMany(
      {},
      {
        $unset: {
          'account.verification.token': '',
          'account.verification.expiresIn': '',
          'account.resetPassword.token': '',
          'account.resetPassword.expiresIn': ''
        }
      }
    )
    stage = 'account_versions'
    await User.collection.updateMany(
      { authVersion: { $exists: false } },
      { $set: { authVersion: 0 } }
    )
    await User.collection.updateMany(
      { mutationVersion: { $exists: false } },
      { $set: { mutationVersion: 0 } }
    )

    stage = 'token_hashes'
    for (const model of [ResetPassword, Verification]) {
      const collection = databaseCollection(model.collection.name)
      for await (const document of collection.find({
        accessToken: { $type: 'string' }
      })) {
        if (typeof document.accessToken !== 'string') continue
        await collection.updateOne(
          { _id: document._id },
          {
            $set: {
              tokenHash: createHash('sha256')
                .update(document.accessToken)
                .digest('hex')
            },
            $unset: { accessToken: '' }
          }
        )
      }
    }

    stage = 'media_ownership'
    // Only attached legacy media has provable ownership. Other files remain quarantined.
    await Media.collection.updateMany(
      {
        owner: { $exists: false },
        refType: 'User',
        refId: { $type: 'objectId' }
      },
      [{ $set: { owner: '$refId' } }]
    )
    const unknownOwnership = await Media.collection.countDocuments({
      owner: { $exists: false }
    })
    logger.info('Legacy migration completed', {
      quarantinedMedia: unknownOwnership
    })
  } catch (error) {
    logger.error(
      'Legacy migration failed; keep the API stopped and review migration requirements',
      {
        component: 'db:migrate:legacy',
        stage,
        ...errorDiagnostic(error, { component: 'db:migrate:legacy', stage })
      }
    )
    process.exitCode = 1
  } finally {
    try {
      await database.disconnect()
    } catch (error) {
      reportFailure(error, {
        component: 'db:migrate:legacy',
        stage: 'shutdown'
      })
      process.exitCode = 1
    }
  }

  function databaseCollection(name: string) {
    const connection = User.db.db
    if (!connection) throw new Error('Database is not connected')
    return connection.collection(name)
  }
})
