const UserMail = require('@app/module/auth/mail/userMail')

module.exports = {
  verifyRequestMail: UserMail.verifyRequest,
  resetPasswordMail: UserMail.resetPassword
}
