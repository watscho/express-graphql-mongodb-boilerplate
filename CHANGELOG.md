# Changelog

## 10.0.0 — 2026-11-04

Breaking migration from the JavaScript v9 application to a root TypeScript ESM project, using the domain architecture and application/infrastructure capabilities of the REST reference.

- Replace Lerna, CommonJS aliases, express-graphql and generated Mongoose GraphQL CRUD with Express 5, GraphQL Yoga 6, GraphQL 17, explicit domain SDL and generated resolver types.
- Compile with TypeScript 7; update direct and compatible transitive dependencies and pin the Yarn lockfile/runtime.
- Add auth/users/media/notifications domains, runtime Zod validation, versioned account transactions, single-use hashed tokens and Redis revocation/limits.
- Add owned image processing/avatar attachment, localized HTML/text templates, encrypted transactional outbox and a separate fenced mail worker.
- Add GraphQL error masking, operation/parser budgets, multipart preflight/size limits and per-invocation credential throttling.
- Add role-specific configuration/secrets, safe diagnostics, graceful shutdown, database/index/schema/queue commands, production Docker/Compose and CI checks.
- Add strict coverage checks and a disposable Docker integration runner, including legacy data migration checks.

See [migration](docs/migration.md) before upgrading an existing database or client. Old JWTs and embedded email links require replacement.

### Security policies and metadata follow-up

- Enforce new-password strength at both GraphQL validation and the password hashing boundary, preserving existing-hash login compatibility.
- Add HMAC-protected email/account-ID authentication budgets and transactional recipient/day/template admission, cross-midnight cooldowns, Gmail alias grouping and idempotent replay handling.
- Reserve owner media quotas before disk writes; retain pending/deleting inventory until durable filesystem cleanup, including expired unused files and crash leftovers.
- Add scheduled cleanup deployment and narrow maintenance credentials, with real concurrency/admission/cleanup regression tests.
- Replace deprecated Mongoose post-update options with `returnDocument: after`.
- Align MIT copyright and author metadata with the reference; add the README license section and GraphQL-specific JWT identity/limiter defaults.
