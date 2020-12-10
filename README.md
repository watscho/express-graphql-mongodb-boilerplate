# [express-graphql-mongodb-boilerplate](https://github.com/watscho/express-graphql-mongodb-boilerplate)

**Also [express-mongodb-rest-api-boilerplate](https://github.com/watscho/express-mongodb-rest-api-boilerplate) - REST-API Boilerplate**

[![](https://img.shields.io/badge/author-@watscho-blue.svg)](https://www.linkedin.com/in/watscho)
[![](https://api.codacy.com/project/badge/Grade/0b49c33797cc49b98502e249f27326de)](https://www.codacy.com/manual/watscho/express-graphql-mongodb-boilerplate?utm_source=github.com&utm_medium=referral&utm_content=watscho/express-graphql-mongodb-boilerplate&utm_campaign=Badge_Grade)
[![GitHub license](https://img.shields.io/github/license/watscho/express-graphql-mongodb-boilerplate)](https://github.com/watscho/express-graphql-mongodb-boilerplate/blob/master/LICENSE)

## Authentication from scratch

### Sign In, Sign Up, Reset Password, Change Password, Update User

### E-mail verification, Multi language, Redis for token blacklisting

### Package list

| Package                    | Description                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bcryptjs                   | Optimized bcrypt in JavaScript with zero dependencies. Compatible to the C++ bcrypt binding on node.js and also working in the browser.                                                                                                                                                                                                                               |
| cors                       | CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.                                                                                                                                                                                                                                            |
| crypto-random-string       | Generate a cryptographically strong random string                                                                                                                                                                                                                                                                                                                     |
| dotenv                     | Dotenv is a zero-dependency module that loads environment variables from a .env file into process.env. Storing configuration in the environment separate from code is based on The Twelve-Factor App methodology.                                                                                                                                                     |
| ejs                        | Embedded JavaScript templates                                                                                                                                                                                                                                                                                                                                         |
| email-templates            | Create, preview, and send custom email templates for Node.js. Highly configurable and supports automatic inline CSS, stylesheets, embedded images and fonts, and much more! Made for sending beautiful emails with Lad.                                                                                                                                               |
| express                    | Fast, unopinionated, minimalist web framework for node.                                                                                                                                                                                                                                                                                                               |
| express-graphql            | Create a GraphQL HTTP server with any HTTP web framework that supports connect styled middleware, including Connect itself, Express and Restify.                                                                                                                                                                                                                      |
| graphql                    | The JavaScript reference implementation for GraphQL, a query language for APIs created by Facebook.                                                                                                                                                                                                                                                                   |
| graphql-compose            | GraphQL – is a query language for APIs. graphql-js is the reference implementation of GraphQL for nodejs which introduce GraphQL type system for describing schema (definition over configuration) and executes queries on the server side. express-graphql is a HTTP server which gets request data, passes it to graphql-js and returned result passes to response. |
| graphql-compose-mongoose   | This is a plugin for graphql-compose, which derives GraphQLType from your mongoose model. Also derives bunch of internal GraphQL Types. Provide all CRUD resolvers, including graphql connection, also provided basic search via operators ($lt, $gt and so on).                                                                                                      |
| i18next                    | i18next is a very popular internationalization framework for browser or any other javascript environment (eg. node.js).                                                                                                                                                                                                                                               |
| i18next-express-middleware | This is a middleware to use i18next in express.js.                                                                                                                                                                                                                                                                                                                    |
| ioredis                    | A robust, performance-focused and full-featured Redis client for Node.js.                                                                                                                                                                                                                                                                                             |
| jsonwebtoken               | This was developed against draft-ietf-oauth-json-web-token-08. It makes use of node-jws                                                                                                                                                                                                                                                                               |
| module-alias               | Create aliases of directories and register custom module paths in NodeJS like a boss!                                                                                                                                                                                                                                                                                 |
| moment                     | A lightweight JavaScript date library for parsing, validating, manipulating, and formatting dates.                                                                                                                                                                                                                                                                    |
| mongoose                   | Mongoose is a MongoDB object modeling tool designed to work in an asynchronous environment. Mongoose supports both promises and callbacks.                                                                                                                                                                                                                            |
| nodemailer                 | Send e-mails from Node.js – easy as cake!                                                                                                                                                                                                                                                                                                                             |
| validator                  | A library of string validators and sanitizers.                                                                                                                                                                                                                                                                                                                        |
| winston                    | A logger for just about everything.                                                                                                                                                                                                                                                                                                                                   |

### Redis

_Mac (using [homebrew](http://brew.sh/)):_

```bash
brew install redis
```

_Linux:_

```bash
sudo apt-get install redis-server
```

### First, we use [yarn](https://yarnpkg.com/) - [workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) with [lerna](https://www.npmjs.com/package/lerna)

[Introducing Yarn Workspaces](https://classic.yarnpkg.com/blog/2017/08/02/introducing-workspaces/)

```bash
cd workspaces/api
```

### COPY .env.example to .env

```bash
cp .env.example .env
```

**Note:** I highly recommend installing [nodemon](https://github.com/remy/nodemon).

nodemon is a tool that helps develop node.js based applications by automatically restarting the node application when file changes in the directory are detected.
nodemon does not require any additional changes to your code or method of development. nodemon is a replacement wrapper for `node`, to use `nodemon` replace the word `node` on the command line when executing your script.
`yarn global add nodemon`.

### API Start

```bash
yarn start
yarn start:local # with nodemon
```

### Docker compose

```bash
docker-compose up -d --build
docker-compose -f docker-compose.dev.yml up --build # with nodemon
```

### ESlint Start

```bash
yarn lint
yarn lint:write # with prefix --fix
```

### API Structure

```bash
├─ src
│  ├─ graphql
│  │  ├─ index.js
│  │  ├─ schema.js
│  │  └─ types.js
│  ├─ i18next
│  │  ├─ locales
│  │  │  ├─  en.json
│  │  │  └─  ge.json
│  │  └─ index.js
│  ├─ middleware
│  │  ├─ authentication.js
│  │  ├─ authMiddleware.js
│  │  └─  index.js
│  ├─ module
│  │  ├─ auth
│  │  │  ├─ mail
│  │  │  │  ├─ index.js
│  │  │  │  └─ userMail.js
│  │  │  ├─ service
│  │  │  │  ├─ index.js
│  │  │  │  └─ userService.js
│  │  │  ├─ index.js
│  │  │  ├─ resolvers.js
│  │  │  ├─ types.js
│  │  │  └─ user.js
│  │  └─ index.js
│  ├─ service
│  │  ├─ logger.js
│  │  └─ nodemailer.js
│  ├─ validator
│  │  ├─ index.js
│  │  └─ userValidator.js
│  ├─ view
│  │  └─ template
│  │     ├─ reset-password
│  │     │  └─ html.ejs
│  │     ├─ verify
│  │     │  └─ html.ejs
│  │     └─ verify-request
│  │        └─ html.ejs
│  ├─ index.js
│  ├─ mongoose.js
│  └─ redis.js
├─ .dockerignore
├─ .env.example
├─ .eslintignore
├─ .eslint
├─ .gitignore
├─ Dockerfile
├─ Dockerfile.dev
├─ LICENSE
├─ README.md
├─ docker-compose.dev.yml
├─ docker-compose.yml
└─ package.json
```

**Note:** To continue development, you should learn about [graphql-compose](https://graphql-compose.github.io) - this is the library that I use to write the API, you can read about it at the link: [docs](https://graphql-compose.github.io/docs/intro/quick-start.html)

## Queries

```graphql
query user {
  user {
    _id
    email
    firstName
    lastName
    locale
    account {
      verification {
        verified
      }
    }
    updatedAt
    createdAt
  }
}
```

## Mutations

```graphql
mutation signIn($email: String!, $password: String!) {
  signIn(email: $email, password: $password) {
    accessToken
  }
}

mutation signUp($email: String!, $password: String!) {
  signUp(email: $email, password: $password) {
    accessToken
  }
}

mutation logout {
  logout {
    succeed
  }
}

mutation verifyRequest {
  verifyRequest {
    succeed
  }
}

mutation verify($token: String!) {
  verify(token: $token) {
    accessToken
  }
}

mutation resetPassword($email: String!) {
  resetPassword(email: $email) {
    succeed
  }
}

mutation newPassword($token: String!, $newPassword: String!) {
  newPassword(token: $token, newPassword: $newPassword) {
    accessToken
  }
}

mutation changePassword($currentPassword: String!, $newPassword: String!) {
  changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    succeed
  }
}

mutation updateUser($email: String!, $firstName: String!, $lastName: String!) {
  updateUser(email: $email, firstName: $firstName, lastName: $lastName) {
    _id
    email
    firstName
    lastName
    locale
    account {
      verification {
        verified
      }
    }
    updatedAt
    createdAt
  }
}

mutation switchLocale($locale: Locale!) {
  switchLocale(locale: $locale) {
    _id
    email
    firstName
    lastName
    locale
    account {
      verification {
        verified
      }
    }
    updatedAt
    createdAt
  }
}
```

**Note:** For any question [issues](https://github.com/watscho/express-graphql-mongodb-boilerplate/issues)

## License

This project is an open-source with an [MIT License](https://github.com/watscho/express-graphql-mongodb-boilerplate/blob/master/LICENSE)
