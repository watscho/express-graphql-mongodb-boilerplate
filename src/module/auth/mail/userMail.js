const winston = require('winston')

const { mail } = require('@app/service/nodemailer')

class UserMail {
  verifyRequest (email, token) {
    return mail.send({
      template: 'verify-request',
      message: {
        from: '"Verification request" <no-replay@example.com>',
        to: email,
        subject: 'Verification request'
      },
      locals: { token }
    }).catch(error => {
      winston.error(error)
    })
  }

  verify (email, locale) {
    return mail.send({
      template: 'verify',
      message: {
        from: '"Verification" <no-replay@example.com>',
        to: email,
        subject: 'Verification'
      },
      locals: { locale }
    }).catch(error => {
      winston.error(error)
    })
  }

  resetPassword (email, token) {
    return mail.send({
      template: 'reset-password',
      message: {
        from: '"Reset Password" <no-replay@example.com>',
        to: email,
        subject: 'Reset Password'
      },
      locals: { token }
    }).catch(error => {
      winston.error(error)
    })
  }

  static getInstance () {
    if (!this.instance) {
      this.instance = new this()
    }
    return this.instance
  }
}

module.exports = UserMail
