const express = require('express')
const bodyParser = require('body-parser')
const i18next = require('i18next')
const i18nextMiddleware = require('i18next-express-middleware')

require('module-alias/register')
require('dotenv').config()

require('@app/service/logger')
require('@app/redis')
require('@app/i18next')

const authentication = require('@app/middleware/authentication')
const graphql = require('@app/graphql')

const app = express()

app.use(
  '/graphql',
  i18nextMiddleware.handle(i18next),
  authentication,
  bodyParser.json(),
  graphql
)

app.listen(process.env.APP_PORT)
