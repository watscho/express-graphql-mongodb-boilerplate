const express = require('express')
const bodyParser = require('body-parser')
const { apolloUploadExpress } = require('apollo-upload-server')
const i18next = require('i18next')
const i18nextMiddleware = require('i18next-express-middleware')
require('dotenv').config()
require('module-alias/register')

require('@app/redis')
require('@app/i18next')

const authentication = require('@app/middleware/authentication')
const graphql = require('@app/graphql')

const app = express()

app.use(i18nextMiddleware.handle(i18next))

app.use(
  '/graphql',
  authentication,
  bodyParser.json(),
  apolloUploadExpress(),
  graphql
)

app.listen(process.env.APP_PORT)
