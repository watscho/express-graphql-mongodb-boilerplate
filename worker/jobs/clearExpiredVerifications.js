const { clearExpiredVerificationsService } = require('@app/module/auth/service')

module.exports = {
  name: 'clearExpiredVerifications',
  data: (job, done) => {
    try {
      clearExpiredVerificationsService()
      done()
    } catch (error) {
      return Promise.reject(error)
    }
  }
}
