const validator = require('validator')
const { selfish } = require('selfish-proxy')
class UserValidator {
  constructor () {
    this.normalizeEmailOptions = {
      all_lowercase: true,
      gmail_lowercase: true,
      gmail_remove_dots: true,
      gmail_remove_subaddress: true,
      gmail_convert_googlemaildotcom: true,
      outlookdotcom_remove_subaddress: true,
      yahoo_lowercase: true,
      yahoo_remove_subaddress: true,
      icloud_lowercase: true,
      icloud_remove_subaddress: true
    }
  }

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
    args.email = validator.trim(args.email)
    args.email = validator.normalizeEmail(args.email, this.normalizeEmailOptions)

    return resolve(source, args, context, info)
  }

  async signIn (resolve, source, args, context, info) {
    args.email = validator.trim(args.email)
    args.email = validator.normalizeEmail(args.email, this.normalizeEmailOptions)

    return resolve(source, args, context, info)
  }

  async signUp (resolve, source, args, context, info) {
    args.email = validator.trim(args.email)
    args.email = validator.normalizeEmail(args.email, this.normalizeEmailOptions)

    const { email, password } = args

    if (!validator.isEmail(email, { allow_utf8_local_part: false })) {
      return Promise.reject(new Error('Error: email'))
    }

    if (!validator.isLength(password, { min: 6 })) {
      return Promise.reject(new Error('Error: password'))
    }

    return resolve(source, args, context, info)
  }

  async updateUser (resolve, source, args, context, info) {
    args.email = validator.trim(args.email)
    args.email = validator.normalizeEmail(args.email, this.normalizeEmailOptions)

    const { email, firstName, lastName } = args

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
      this.instance = selfish(new this())
    }
    return this.instance
  }
}

module.exports = UserValidator
