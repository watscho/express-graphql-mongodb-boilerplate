const UserService = require('@app/module/auth/service/userService')

module.exports = {
  verifyRequestService: UserService.verifyRequest,
  clearExpiredVerificationsService: UserService.clearExpiredVerifications,
  clearExpiredResetPasswordsService: UserService.clearExpiredResetPasswords
}
