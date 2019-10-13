const { transporter } = require('@app/nodemailer')

class UserMail {
  resetPassword (email, token) {
    return transporter.sendMail({
      from: '"Reset Password" <no-replay@example.com>',
      to: email,
      subject: 'Reset Password',
      html: token
    })
  }

  verifyRequest (email, token) {
    return transporter.sendMail({
      from: '"Verification" <no-replay@example.com>',
      to: email,
      subject: 'Verification',
      html: token
    })
  }
}

module.exports = new UserMail()
