const {
  clearExpiredResetPasswordsService
} = require('@app/module/auth/service')

module.exports = {
  name: 'clearExpiredResetPasswords',
  data: (job, done) => {
    try {
      clearExpiredResetPasswordsService()
      done()
    } catch (error) {
      return Promise.reject(error)
    }
  }
}
