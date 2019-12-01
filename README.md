# express-graphql-mongodb-boilerplate

## Authentication from scratch

### Sign In, Sign Up, Reset Password, Change Password, Update User

### E-mail verification, Multi language, Redis for token blacklisting

### Package list

```bash
"@hapi/bounce"
"apollo-upload-server"
"bcryptjs"
"body-parser"
"crypto-random-string"
"dotenv"
"express"
"express-graphql"
"graphql"
"graphql-compose"
"graphql-compose-mongoose"
"i18next"
"i18next-express-middleware"
"ioredis"
"jsonwebtoken"
"module-alias"
"moment"
"mongoose"
"nodemailer"
"validator"
"winston"
```

### Project structure

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
│  ├─ index.js
│  ├─ mongoose.js
│  └─ redis.js
├─ .dockerignore
├─ .env.example
├─ .eslintignore
├─ .eslint
├─ .gitignore
├─ docker-compose.dev.yml
├─ docker-compose.yml
├─ Dockerfile
├─ Dockerfile.dev
├─ package.json
└─ README.md
```

### COPY .env - example file

```bash
cp .env.example .env
```

### API Start

```bash
npm run start
npm run start:local # with nodemon
```

### Docker compose

```bash
docker-compose up -d --build
docker-compose -f docker-compose.dev.yml up --build # with nodemon
```

### ESlint Start

```bash
npm run lint
npm run lint:write # with prefix --fix
```

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
  changePassword(currentPassword: $currentPassword, newPassword: $newPassword){
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
    locale
  }
}
```
