const { schemaComposer } = require('graphql-compose')
const { composeWithMongoose } = require('graphql-compose-mongoose')
const i18next = require('i18next')

const UserModel = require('@app/module/auth/user')

const UserTC = composeWithMongoose(UserModel).removeField('password')

const userAccountTC = UserTC.getFieldTC('account')

userAccountTC.getFieldTC('verification').removeField(['token', 'expiresIn'])

userAccountTC.removeField('resetPassword')

schemaComposer.createObjectTC({
  name: 'AccessToken',
  fields: { accessToken: 'String!' }
})

schemaComposer.createEnumTC({
  name: 'Locale',
  values: i18next.graphQLEnumTC
})

module.exports = UserTC
