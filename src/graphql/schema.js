const { schemaComposer } = require('graphql-compose')
const { GraphQLUpload } = require('apollo-upload-server')

require('@app/graphql/types')

const { isAuth, isGuest, isUnverfied /* isVerified */ } = require('@app/middleware')
const {
  signUpValidator,
  newPasswordValidator,
  changePasswordValidator,
  updateUserValidator
} = require('@app/validator')
const { UserTC } = require('@app/module')

schemaComposer.add(GraphQLUpload)

schemaComposer.Query.addFields({
  user: UserTC.getResolver('user', [isAuth])
})

schemaComposer.Mutation.addFields({
  signIn: UserTC.getResolver('signIn', [isGuest]),
  signUp: UserTC.getResolver('signUp', [isGuest, signUpValidator]),
  logout: UserTC.getResolver('logout', [isAuth]),
  verifyRequest: UserTC.getResolver('verifyRequest', [isAuth, isUnverfied]),
  verify: UserTC.getResolver('verify'),
  resetPassword: UserTC.getResolver('resetPassword', [isGuest]),
  newPassword: UserTC.getResolver('newPassword', [
    isGuest,
    newPasswordValidator
  ]),
  changePassword: UserTC.getResolver('changePassword', [
    isAuth,
    changePasswordValidator
  ]),
  updateUser: UserTC.getResolver('updateUser', [isAuth, updateUserValidator]),
  switchLocale: UserTC.getResolver('switchLocale', [isAuth])
})

const schema = schemaComposer.buildSchema()

module.exports = schema
