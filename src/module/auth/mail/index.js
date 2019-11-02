const UserMail = require('@app/module/auth/mail/userMail').getInstance()

module.exports = {
  verifyRequestMail: UserMail.verifyRequest,
  resetPasswordMail: UserMail.resetPassword
}
