const { schemaComposer } = require('graphql-compose')
const { composeWithMongoose } = require('graphql-compose-mongoose')

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
  values: {
    en: { value: 'en' },
    ge: { value: 'ge' }
  }
})

module.exports = UserTC
