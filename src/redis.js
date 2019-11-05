const Redis = require('ioredis')

const client = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST
})

client.on('connect', function () {
  // eslint-disable-next-line no-console
  console.log('Redis client connected')
})

client.on('error', function (err) {
  // eslint-disable-next-line no-console
  console.log('Something went wrong ' + err)
})

module.exports = client
