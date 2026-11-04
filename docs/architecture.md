# Domain architecture

The REST reference provides the business/infrastructure baseline. The GraphQL project shares its explicit domain services, repositories, Zod DTOs, MongoDB transactions, media processing, encrypted email outbox and process lifecycle. Transport-specific REST controllers, route definitions and OpenAPI modules are replaced by domain-owned GraphQL SDL and resolvers.

| Owner                  | Responsibilities                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- |
| auth                   | Credentials, bcrypt, JWT signing/version checks/revocation, security mutations         |
| auth/verification      | Issue, replace, consume and invalidate email-verification records                      |
| users                  | Account persistence, normalized identity, version locks and public serialization       |
| media                  | Owned upload ingestion, decoded image validation, avatar conversion and cleanup        |
| notifications          | Template registration, translations and rendering policy                               |
| notifications/delivery | Encrypted transactional outbox, leases, retry, worker heartbeats and operator metadata |
| app/graphql            | Context, schema composition, generated types, error masking and operation budgets      |
| app/http               | Express middleware, health, CORS, static conversions and HTTP errors                   |
| app/runtime            | Configuration bootstrap, diagnostics, API and worker lifecycles, operator entrypoints  |

## Boundaries

`schemas.ts` owns runtime Zod validation; `dto.ts` infers its types. GraphQL SDL defines the external selection/input contract, and code generation makes resolver signatures match it. A resolver parses untrusted inputs with the owning Zod schema, checks access, calls a service and returns the selected public representation. A DTO annotation alone never validates or strips data.

Services own business rules, permissions, current-account checks and transaction orchestration. Repositories own explicit queries, projections and session propagation. Models never generate public CRUD. Use another domain's `index.ts`, `dto.ts` or `schemas.ts`; ESLint checks cross-domain imports. App composition may import GraphQL adapters. Nested verification/delivery features remain inside their parent domains.

Keep transformations that convert IDs/dates, normalize nulls or explicitly select public fields. Do not add forwarding classes, generic repositories, controller factories or a DI container merely to add layers. The reference is pragmatic domain-based architecture, not a claim of complete tactical DDD or event sourcing.

## Transaction boundaries

Sensitive account workflows lock a versioned user record and commit account changes, token invalidation and encrypted notification jobs in one MongoDB transaction. The driver may retry callbacks: callbacks contain database operations and local validation/encryption, never SMTP or filesystem deletion. Replacement JWTs are signed after commit. Verification issuance receives the caller's session.

Each root mutation field is a separate application operation. Multiple fields in one GraphQL document are not atomic together. Signout, password change, account deletion and email changes that replace credentials clear the request auth context, so later protected fields cannot reuse it. Parallel queries do not mutate account state. Services still enforce current versions inside transactions.

## Execution boundaries

The API enqueues mail; a separate worker renders deployed templates and submits SMTP outside the database transaction. Stable message identity and fenced leases reduce duplicates but do not promise exactly-once inbox delivery. Media deletion uses durable inventory and retryable filesystem cleanup. Quota reservations precede file writes, and cleanup/attachment share the account mutation lock. Public DTOs exclude password hashes, version counters and encrypted email payloads.

The bootstrap loads only role-specific configuration before clients. Templates and SDL are copied into `dist`; uploads remain outside the build output. Relative `.ts` imports are rewritten to `.js` by TypeScript 7 for ordinary Node ESM execution.
