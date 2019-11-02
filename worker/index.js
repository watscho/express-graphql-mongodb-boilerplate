const Agenda = require('agenda')

require('module-alias/register')
require('dotenv').config()

const jobs = require('@cron/jobs')

const agenda = new Agenda({
  name: process.env.APP_NAME,
  db: {
    address: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    collection: process.env.JOBS_COLLECTION,
    options: { useNewUrlParser: true }
  },
  processEvery: process.env.JOBS_PROCESS_EVERY
})

agenda.on('start', job => {
  console.log('Job %s starting', job.attrs.name)
})

agenda.on('success', job => {
  console.log(`Job ${job.attrs.name} success`)
})

agenda.on('fail', (err, job) => {
  console.log(`Job failed with error: ${err.message}`)
})

agenda.on('complete', job => {
  console.log(`Job ${job.attrs.name} finished`)
})

async function graceful () {
  await agenda.stop()
  process.exit(0)
}

process.on('SIGTERM', graceful)
process.on('SIGINT', graceful)

for (const job in jobs) agenda.define(jobs[job].name, jobs[job].data)

agenda.on('ready', () => {
  agenda.schedule('at 00:00', 'clearExpiredVerifications')
  agenda.schedule('at 00:00', 'clearExpiredResetPasswords')

  agenda.start()
})

module.exports = agenda
