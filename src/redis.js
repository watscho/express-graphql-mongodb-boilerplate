const Redis = require('ioredis')
const winston = require('winston')

const client = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST
})

let wasError = false

client.on('error', error => {
  if (!wasError) {
    winston.error(error)
    wasError = true
  }
})

client.on('connect', () => {
  winston.info('Redis client connected')
  wasError = false
})

module.exports = client
