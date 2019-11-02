const winston = require('winston')
const { format: { combine, timestamp, json } } = winston

winston.configure({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({ filename: process.env.API_LOGS_FILENAME })
  ]
})

module.exports = winston
