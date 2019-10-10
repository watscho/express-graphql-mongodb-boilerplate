const clearExpiredResetPasswords = require('@cron/jobs/clearExpiredResetPasswords')
const clearExpiredVerifications = require('@cron/jobs/clearExpiredVerifications')

module.exports = { clearExpiredResetPasswords, clearExpiredVerifications }
