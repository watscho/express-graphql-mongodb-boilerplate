# Express GraphQL MongoDB Boilerplate

A domain-based TypeScript GraphQL API. Version 2.0.0 replaces the JavaScript/Lerna application with the architecture and application capabilities of `express-mongodb-rest-api-boilerplate`, adapted to GraphQL.

Node.js 26.13.0 · TypeScript 7 · Express 5 · GraphQL 17 · GraphQL Yoga 6 · Mongoose 9 · Redis · Zod 4 · Yarn 4.

## Quick start

```sh
nvm install
nvm use
node .yarn/releases/yarn-4.18.1.cjs install --immutable
cp .env.example .env
# Generate two DIFFERENT keys and put them in JWT_SECRET and MAIL_QUEUE_ENCRYPTION_KEY:
openssl rand -hex 32
openssl rand -hex 32
```

Configure MongoDB (replica set or Atlas), Redis and SMTP in `.env`. For local SMTP, a capture server such as Mailpit can receive messages on port 1025. Never point development or tests at production dependencies.

```sh
yarn db:indexes
yarn dev
# In another terminal, with the same environment:
yarn dev:mail
# In a third terminal, run periodic cleanup against the same MongoDB and upload storage:
yarn media:cleanup --watch
```

The API listens at `http://localhost:8000/graphql`. GraphiQL is available there in development. Production disables both GraphiQL and schema introspection; export the SDL for client tooling instead. Health checks remain `/health/live` and `/health/ready`.

```graphql
mutation SignUp($input: CredentialsInput!) {
  signUp(input: $input) {
    accessToken
  }
}
```

Variables: `{"input":{"email":"you@example.com","password":"a-long-unique-password"}}`.

Send the returned token in `Authorization: Bearer <token>`. Supply `Accept-Language` for email language selection.

```graphql
query Account {
  me {
    id
    email
    firstName
    lastName
    verified
    image
  }
}
```

## Architecture

```text
src/
  app/
    config/       # Validated, role-specific configuration and secret-file loading
    database/     # MongoDB transactions and Redis connection lifecycle
    graphql/      # Schema composition, generated resolver types, context, limits, errors
    http/         # Express, health, static conversions, headers, CORS and HTTP limits
    runtime/      # API/worker bootstraps, diagnostics, logging and operator commands
  domains/
    auth/         # JWTs, credentials, revocation and sensitive account workflows
      verification/
    users/        # Account persistence, public projection and profile changes
    media/        # Owned uploads, image validation, conversions and avatar attachment
    notifications/# Email catalog, rendering and translations
      delivery/   # Encrypted transactional outbox and separate worker
```

Each domain owns `schemas.ts`, inferred `dto.ts`, services, repositories and models, plus a `graphql/` adapter with SDL and generated-type-checked resolvers. Cross-domain business calls use public `index.ts` facades. No generated Mongoose CRUD is exposed. This is the same pragmatic domain-based design as the REST reference, without generic repository classes or a DI container.

## Capabilities

| Area               | Included                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Accounts           | Signup/signin/signout, profile, email/password updates, deletion, reset and verification                                   |
| Security workflows | Bcrypt, JWT issuer/audience/version checks, hashed revocation keys and one-time email tokens                               |
| Consistency        | Versioned account locks and MongoDB transactions covering account, tokens and queued emails                                |
| Media              | Authenticated multipart upload, owner checks, JPEG/PNG decoding, bounded WebP avatars and cleanup                          |
| Email              | HTML/text templates, English/Georgian translations, encrypted outbox, retries, fenced leases and worker heartbeats         |
| GraphQL            | Explicit SDL, generated resolver types, Zod validation, masked errors, parser/depth/field limits, per-call auth throttling |
| Operations         | Graceful shutdown, request IDs, redacted diagnostics, role-specific secrets, queue CLI, indexes and legacy migration       |
| Delivery           | Multi-stage non-root Docker image, hardened production Compose, immutable install and CI quality checks                    |

GraphQL queries use normal `data`/`errors` results. Safe business error keys and validation details live in `errors[].extensions`. Nullable root fields allow independent partial results. Mutation fields execute separately; a document is not one database transaction. Batch requests are disabled. Security mutations invalidate the request auth context before later mutation fields execute.

## Commands

| Command                                              | Purpose                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `yarn dev` / `yarn dev:mail`                         | API / mail worker with source watching                                         |
| `yarn build`                                         | TypeScript 7 compilation, source maps, templates and SDL                       |
| `yarn start` / `yarn start:mail`                     | Compiled API / mail worker                                                     |
| `yarn codegen`                                       | Generate resolver types from domain SDL                                        |
| `yarn codegen:check`                                 | Fail on SDL/generated-type drift                                               |
| `yarn docs:export --output schema.graphql`           | Export SDL without credentials or services                                     |
| `yarn typecheck` / `yarn lint` / `yarn format:check` | Static checks                                                                  |
| `yarn test`                                          | Build and run the local test suite                                             |
| `yarn test:coverage`                                 | Build, test and enforce 100% application coverage                              |
| `yarn test:integration`                              | Build and verify disposable Docker API/worker, MongoDB, Redis and SMTP capture |
| `yarn check`                                         | Complete local quality gate, including codegen drift                           |
| `yarn db:migrate:legacy` / `yarn db:indexes`         | Explicit maintenance; read migration instructions first                        |
| `yarn media:cleanup` / `yarn media:cleanup --watch`  | One cleanup pass / periodic cleanup of expired uploads and crash leftovers     |
| `yarn mail:queue --help`                             | Queue inspection, retry and worker health                                      |

Every operator command also has a compiled `:prod` script for production-only installations. Tests use isolated test settings, mocks and temporary files; they do not connect to real MongoDB, Redis or SMTP. Passing local checks does not establish real provider delivery, production deployment or MongoDB concurrency acceptance.

See the [documentation index](docs/README.md), [GraphQL contract](docs/graphql.md), [legacy migration](docs/migration.md), [configuration](docs/configuration.md), [testing](docs/testing.md), and [deployment guide](docs/deployment.md).

See the [local verification record](docs/verification.md) for measured results and the [security policies](docs/security.md).

## License

[MIT](LICENSE) · Vacho Aivazov · 2026.
