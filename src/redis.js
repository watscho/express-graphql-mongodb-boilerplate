const Redis = require('ioredis')

const client = new Redis({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST
})

client.on('connect', function () {
  console.log('Redis client connected')
})

client.on('error', function (err) {
  console.log('Something went wrong ' + err)
})

module.exports = client
