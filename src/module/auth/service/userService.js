const crypto = require('crypto-random-string')
const moment = require('moment')

class UserService {
  async verifyRequest (user) {
    const token = crypto({ length: 48, type: 'url-safe' })
    const expireIn = moment().add(7, 'days')

    user.set({
      account: {
        verification: {
          token,
          expireIn
        }
      }
    })

    await user.save()

    return token
  }

  static getInstance () {
    if (!this.instance) {
      this.instance = new this()
    }
    return this.instance
  }
}

module.exports = UserService
