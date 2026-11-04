# Review and release handoff

Review domain rules, explicit GraphQL exposure, runtime Zod validation, generated-type drift, ownership, permission checks, current-account locks and session propagation. Sensitive-operation limits must count aliases. Filesystem/SMTP actions must remain outside retryable transactions. Review error/log output for credentials and queue payloads.

Run `yarn check`, export the combined SDL and inspect any breaking contract changes. The local gate enforces complete application statement/branch/function/line coverage; it does not substitute for real database concurrency or provider tests.

Before release, restore a staging backup, rehearse the legacy migration and index creation, verify replica-set transactions and Redis revocation across API instances, and exercise signup/reset/verification/password/email/profile/avatar/deletion with a separate worker and SMTP capture/provider. Validate invalid/expired/reused links, cross-owner media and replacement JWTs. Review production GraphiQL/introspection policy, trusted proxies, CORS, upload/request limits, secret permissions and worker health.

Build the runtime image for the target platform and verify production-only dependencies, mounted storage, role-specific credentials, startup failures and graceful shutdown. Deploy only after checking the release environment. No hosted deployment or external provider acceptance follows from a local test result.

## Security policies

New passwords use the strengthened policy, account/email identities have shared authentication budgets, recipient admission is transactional, and media has durable quota reservations and scheduled cleanup. Review [security policies and operations](security.md), including cooldowns, tombstone retries and the cleanup volume/identity, before changing defaults.

Registration retains the documented email-conflict response and automatic access-token contract. An enumeration-neutral registration flow would require a coordinated client contract change; it is not asserted by these controls.
