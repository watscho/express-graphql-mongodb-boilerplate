class AuthMiddleware {
  async isAuth (resolve, source, args, context, info) {
    if (!context.user) {
      return Promise.reject(new Error('You must be authorized.'))
    }

    return resolve(source, args, context, info)
  }

  async isGuest (resolve, source, args, context, info) {
    if (context.user) {
      return Promise.reject(new Error('You have already authorized.'))
    }

    return resolve(source, args, context, info)
  }

  async isVerified (resolve, source, args, context, info) {
    if (!context.user.account.verification.verified) {
      return Promise.reject(new Error('You must be verified.'))
    }

    return resolve(source, args, context, info)
  }

  async isUnverfied (resolve, source, args, context, info) {
    if (context.user.account.verification.verified) {
      return Promise.reject(new Error('You have already verified.'))
    }

    return resolve(source, args, context, info)
  }

  static getInstance () {
    if (!this.instance) {
      this.instance = new this()
    }
    return this.instance
  }
}

module.exports = AuthMiddleware
