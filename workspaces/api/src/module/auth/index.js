const UserTC = require('@app/module/auth/types')
const resolvers = require('@app/module/auth/resolvers')

for (const resolver in resolvers) {
  UserTC.addResolver(resolvers[resolver])
}

module.exports = UserTC
