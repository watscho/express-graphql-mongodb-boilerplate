const Redis = require('ioredis')
const winston = require('winston')

const client = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST
})

let errored = false

client.on('error', error => {
  if (!errored) {
    winston.error(error)
    errored = true
  }
})

client.on('connect', () => {
  winston.info('Redis client connected')
  errored = false
})

module.exports = client
