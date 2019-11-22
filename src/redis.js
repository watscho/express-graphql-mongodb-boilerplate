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

let connected = false

client.on('connect', () => {
  if (!connected) {
    winston.info('Redis client connected')
    connected = true
  }
})

module.exports = client
