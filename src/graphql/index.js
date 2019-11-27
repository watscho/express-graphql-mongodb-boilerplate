const graphqlHTTP = require('express-graphql')

const schema = require('@app/graphql/schema')

module.exports = graphqlHTTP(async request => ({
  schema,
  graphiql: true,
  context: {
    user: request.user,
    headers: request.headers,
    accessToken: request.accessToken,
    i18n: request.i18n
  }
}))
