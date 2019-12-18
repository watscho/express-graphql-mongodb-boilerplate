const validator = require('validator')

class UserValidator {
  async changePassword (resolve, source, args, context, info) {
    const { newPassword } = args

    if (!validator.isLength(newPassword, { min: 6 })) {
      return Promise.reject(new Error('Error: newPassword'))
    }

    return resolve(source, args, context, info)
  }

  async newPassword (resolve, source, args, context, info) {
    const { newPassword } = args

    if (!validator.isLength(newPassword, { min: 6 })) {
      return Promise.reject(new Error('Error: newPassword'))
    }

    return resolve(source, args, context, info)
  }

  async resetPassword (resolve, source, args, context, info) {
    let { email } = args

    email = validator.normalizeEmail(email)
    email = validator.trim(email)

    Object.assign(args, { email })

    return resolve(source, args, context, info)
  }

  async signIn (resolve, source, args, context, info) {
    let { email } = args

    email = validator.normalizeEmail(email)
    email = validator.trim(email)

    Object.assign(args, { email })

    return resolve(source, args, context, info)
  }

  async signUp (resolve, source, args, context, info) {
    let { email } = args

    email = validator.normalizeEmail(email)
    email = validator.trim(email)

    Object.assign(args, { email })

    const { password } = args

    if (!validator.isEmail(email, { allow_utf8_local_part: false })) {
      return Promise.reject(new Error('Error: email'))
    }

    if (!validator.isLength(password, { min: 6 })) {
      return Promise.reject(new Error('Error: password'))
    }

    return resolve(source, args, context, info)
  }

  async updateUser (resolve, source, args, context, info) {
    let { email } = args

    email = validator.normalizeEmail(email)
    email = validator.trim(email)

    Object.assign(args, { email })

    const { firstName, lastName } = args

    if (!validator.isEmail(email, { allow_utf8_local_part: false })) {
      return Promise.reject(new Error('Error: email'))
    }
    if (!validator.isLength(firstName, { min: 2 })) {
      return Promise.reject(new Error('Error: firstName'))
    }
    if (!validator.isLength(lastName, { min: 2 })) {
      return Promise.reject(new Error('Error: lastName'))
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

module.exports = UserValidator
