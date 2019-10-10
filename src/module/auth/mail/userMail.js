const { transporter } = require('@app/nodemailer')

class UserMail {
  resetPassword (email, token) {
    return transporter.sendMail({
      from: '"Reset Password" <verify@ufo.io>',
      to: email,
      subject: 'Reset Password Request',
      html: `${token}`
    })
  }

  verifyRequest (email, token) {
    return transporter.sendMail({
      from: '"Verifications" <verify@ufo.io>',
      to: email,
      subject: 'Verification Request',
      text: 'Hello world?',
      html: `${token}`
    })
  }
}

module.exports = new UserMail()
