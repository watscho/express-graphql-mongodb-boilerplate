const Bounce = require('@hapi/bounce')
const winston = require('winston')

const { transporter } = require('@app/service/nodemailer')

class UserMail {
  resetPassword (email, token) {
    return Bounce.background(() => transporter.sendMail({
      from: '"Reset Password" <no-replay@example.com>',
      to: email,
      subject: 'Reset Password',
      html: token
    }, error => {
      if (error) {
        winston.error(error)
      }
      transporter.close()
    }))
  }

  verifyRequest (email, token) {
    return Bounce.background(() => transporter.sendMail({
      from: '"Verification" <no-replay@example.com>',
      to: email,
      subject: 'Verification',
      html: token
    }, error => {
      if (error) {
        winston.error(error)
      }
      transporter.close()
    }))
  }

  static getInstance () {
    return new this()
  }
}

module.exports = UserMail
