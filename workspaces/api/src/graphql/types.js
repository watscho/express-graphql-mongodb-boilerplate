const { schemaComposer } = require('graphql-compose')

schemaComposer.createObjectTC({
  name: 'Succeed',
  fields: { succeed: 'Boolean!' }
})
