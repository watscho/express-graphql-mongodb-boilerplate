const crypto = require('crypto-random-string')
const moment = require('moment')

const UserModel = require('@app/module/auth/user')

class UserService {
  async verifyRequest (user) {
    const token = crypto({ length: 48, type: 'url-safe' })
    const expireIn = moment().add(7, 'days')

    user.account.verification = {
      token: token,
      expireIn: expireIn
    }

    await user.save()

    return token
  }

  clearExpiredVerifications () {
    UserModel.updateMany(
      {
        'account.verification.expireIn': { $lte: moment() }
      },
      {
        'account.verification.expireIn': null,
        'account.verification.token': null
      }
    ).exec()
  }

  clearExpiredResetPasswords () {
    UserModel.updateMany(
      {
        'account.resetPassword.expireIn': { $lte: moment() }
      },
      {
        'account.resetPassword.expireIn': null,
        'account.resetPassword.token': null
      }
    ).exec()
  }

  static getInstance () {
    return new this()
  }
}

module.exports = UserService
