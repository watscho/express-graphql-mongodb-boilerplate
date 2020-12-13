const { schemaComposer } = require('graphql-compose')

require('@app/graphql/types')

const { authMiddleware: middleware } = require('@app/middleware')
const { userValidator: validator } = require('@app/validator')
const { UserTC } = require('@app/module')

schemaComposer.Query.addFields({
  user: UserTC.getResolver('user', [middleware.isAuth])
})

schemaComposer.Mutation.addFields({
  signIn: UserTC.getResolver('signIn', [middleware.isGuest, validator.signIn]),
  signUp: UserTC.getResolver('signUp', [middleware.isGuest, validator.signUp]),
  logout: UserTC.getResolver('logout', [middleware.isAuth]),
  verifyRequest: UserTC.getResolver('verifyRequest', [middleware.isAuth, middleware.isUnverfied]),
  verify: UserTC.getResolver('verify'),
  resetPassword: UserTC.getResolver('resetPassword', [middleware.isGuest, validator.resetPassword]),
  newPassword: UserTC.getResolver('newPassword', [middleware.isGuest, validator.newPassword]),
  changePassword: UserTC.getResolver('changePassword', [
    middleware.isAuth,
    validator.changePassword
  ]),
  updateUser: UserTC.getResolver('updateUser', [middleware.isAuth, validator.updateUser]),
  switchLocale: UserTC.getResolver('switchLocale', [middleware.isAuth])
})

const schema = schemaComposer.buildSchema()

module.exports = schema
