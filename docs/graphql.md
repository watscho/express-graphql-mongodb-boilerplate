# GraphQL contract

All business operations use `/graphql`. `GET` supports queries; `POST application/json` supports queries/mutations. Multipart POST supports `File` variables with `X-GraphQL-Preflight: 1`. HTTP health and static image conversions remain infrastructure endpoints.

The contract is the domain-owned `src/domains/**/graphql/schema.graphql` files. `yarn codegen` generates resolver signatures; `yarn codegen:check` detects drift. `yarn docs:export --output schema.graphql` produces a combined SDL without loading credentials, database clients or services. `yarn docs:export:prod` works from the compiled runtime image. Existing output files are never silently overwritten.

| Operation                       | Access        | Purpose                                        |
| ------------------------------- | ------------- | ---------------------------------------------- |
| `me`                            | authenticated | Public account and avatar                      |
| `emailTemplates`                | authenticated | Safe template catalog                          |
| `signIn`, `signUp`              | guest         | Credentials to access token                    |
| `resetPassword`, `newPassword`  | guest         | Request and consume password-reset link        |
| `confirmVerification`           | guest         | Consume verification link                      |
| `requestVerification`           | authenticated | Request current-account email verification     |
| `signOut`                       | authenticated | Revoke bearer token                            |
| `updateProfile`                 | authenticated | Change first/last name                         |
| `updateEmail`, `updatePassword` | authenticated | Password-protected identity/credential changes |
| `deleteProfile`                 | authenticated | Password-protected account deletion            |
| `uploadImage`, `updateAvatar`   | authenticated | Ingest owned image and attach avatar           |

Credential and token workflows consume a Redis-backed sensitive-operation budget on each invocation, including aliases. The outer HTTP limit is separate. Redis failures fail closed. Bearer JWTs verify signature, issuer, audience, expiration, revocation and the account's auth version.

## Limits and production behavior

JSON requests are limited to 100 KiB. Yoga also limits streaming request bodies to upload-size plus multipart overhead and restricts multipart to one file and two metadata fields. The parser accepts at most 2,000 tokens. Validation limits depth and expanded field count using `GRAPHQL_MAX_DEPTH` and `GRAPHQL_MAX_FIELDS`; fragment reuse and aliases count per expansion. Standard GraphQL validation also rejects cyclic/unknown fragments. HTTP array batching is disabled. Production disables introspection and GraphiQL. Development GraphiQL receives a narrowly scoped CSP for its CDN resources.

Errors follow the GraphQL specification: `errors[]` contains message/path/location, with safe application `extensions.code`, `extensions.status` and optional field `details`. A resolver error normally accompanies HTTP 200 with partial `data`; transport/parser/validation failures may use 4xx. Infrastructure rejections at `/graphql` also use `errors[]`. Always inspect both HTTP status and GraphQL errors. Unexpected exceptions become `http.status.500` and are logged through redacted diagnostics. Request correlation is carried by `X-Request-Id`.

A multi-field mutation is not one transaction. Store any replacement JWT before making later protected requests. After a credential-invalidating field, later protected fields in the same mutation fail authentication.

No subscriptions, federation or arbitrary model CRUD are advertised; the application currently has no domain requirement for those features.
