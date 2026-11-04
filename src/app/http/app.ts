import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { join } from 'node:path'
import { apiEnv as env } from '../config/api.ts'
import { redis } from '../database/redis.ts'
import { createGraphQLServer } from '../graphql/server.ts'
import { storageRoot } from '../../domains/media/index.ts'
import { corsMiddleware } from './middlewares/cors.ts'
import { errorMiddleware } from './middlewares/error.ts'
import { AppError } from './errors.ts'
import { requestMiddleware } from './middlewares/request.ts'
import { createRateLimits } from './middlewares/rateLimit.ts'
import type { LivenessResponseDto, ReadinessResponseDto } from './dto.ts'

export const createApp = () => {
  const app = express()
  const { apiRateLimit } = createRateLimits()
  app.disable('x-powered-by')
  if (env.TRUST_PROXY) {
    app.set(
      'trust proxy',
      env.TRUST_PROXY.split(',').map(value => value.trim())
    )
  }
  app.use(requestMiddleware)
  app.use(
    helmet({
      strictTransportSecurity:
        env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  )
  app.use(corsMiddleware)

  app.get('/health/live', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ status: 'ok' } satisfies LivenessResponseDto)
  })
  app.get('/health/ready', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const ready = mongoose.connection.readyState === 1 && redis.isReady
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'unavailable'
    } satisfies ReadinessResponseDto)
  })

  app.use(
    `${env.STORAGE_URL.replace(/\/$/, '')}/conversions`,
    express.static(join(storageRoot, 'conversions'), {
      dotfiles: 'deny',
      index: false,
      maxAge: '1d',
      fallthrough: false
    })
  )
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use(apiRateLimit)
  app.use(express.json({ limit: '100kb' }))
  // Multipart is a browser 'simple request'; require a preflight-triggering header.
  app.use('/graphql', (req, _res, next) => {
    if (
      req.method === 'POST' &&
      !req.is('application/json') &&
      !req.is('multipart/form-data')
    )
      throw new AppError(415)
    if (req.is('multipart/form-data') && req.get('X-GraphQL-Preflight') !== '1')
      throw new AppError(400, 'graphql.preflight_required')
    next()
  })
  const yoga = createGraphQLServer()
  if (env.NODE_ENV === 'development')
    app.use(
      '/graphql',
      helmet.contentSecurityPolicy({
        directives: {
          scriptSrc: ["'self'", 'https://unpkg.com', "'unsafe-inline'"],
          styleSrc: ["'self'", 'https://unpkg.com', "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://raw.githubusercontent.com'],
          workerSrc: ["'self'", 'blob:', 'https://unpkg.com'],
          connectSrc: ["'self'", 'https://unpkg.com']
        }
      })
    )
  app.use('/graphql', (req, res) => yoga(req, res, { req, res }))
  app.use(() => {
    throw new AppError(404)
  }, errorMiddleware)
  return app
}
