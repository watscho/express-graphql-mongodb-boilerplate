# Verification record — 2026-11-04

The JavaScript v9 to TypeScript/GraphQL migration and security-policy follow-up were checked locally with Node.js 26.13.0.

| Check                                                                                         | Result                                                                         |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Direct dependency stable-version lookup and compatible transitive refresh                     | Completed; lockfile updated                                                    |
| Format, ESLint, generated resolver drift, TypeScript build and strict coverage (`yarn check`) | Passed                                                                         |
| Local tests                                                                                   | 399 passed, zero failures/skips                                                |
| Application coverage                                                                          | 1,699/1,699 statements; 982/982 branches; 325/325 functions; 1,638/1,638 lines |
| Instrumented module inventory                                                                 | All 113 application modules included; no application coverage exclusions       |
| Compiled credential-free schema export                                                        | Passed                                                                         |
| Production Docker build                                                                       | Passed on the local Docker target platform                                     |
| Disposable Docker integration (`yarn test:integration`)                                       | 90 assertions passed                                                           |

Integration used a new MongoDB 8 replica set, Redis 8, Mailpit, the compiled production API and a separate compiled worker. It checked legacy normalized-email conflict preflight before writes, successful/rerunnable migration, preservation of password hashes and verification state, invalidation of embedded links, index creation, non-root runtime, absence of development tools, SDL export, signup/duplicate-signup, profile, Georgian email capture, one-time verification/reset links, replacement JWTs, revocation, multipart image conversion, avatar ownership, email/password changes, logout, account deletion and file cleanup.

Integration creates random test-only secrets, uses no developer `.env`, publishes only ephemeral loopback API/Mailpit ports and removes its containers, upload/anonymous volumes, network and temporary secrets. The local image remains. The expected conflict-preflight scenario logs a controlled migration failure before its successful reconciliation/rerun.

SMTP capture proves submission to the local capture server, not external-provider or inbox delivery. These results do not establish hosted CI, production deployment, target-platform coverage beyond the tested platform, concurrency/load qualification or a complete security audit. No existing application database was migrated.

The hardening follow-up additionally checked strong-password rejection with historical-password login retained, stable account-ID and normalized-email budgets, generic recovery results at an exhausted ID budget, recipient daily/template limits, idempotent replay without another charge, cooldown preservation across UTC rollover, personal Gmail alias grouping, concurrent recipient admission, concurrent owner quota admission, cleanup of expired unused images with active-avatar preservation, repeated cleanup idempotency, and package/license metadata inside the runtime image. Production Compose configuration validation and immutable dependency installation passed. Deprecated Mongoose update-option warnings were removed.

Focused regression tests cover failed upload publication, stale cleanup candidates, failed filesystem deletion retaining inventory, orphan grace/reference/symlink handling, recovery/verification denial propagation, unchanged-profile mail suppression and direct hash-policy enforcement. The independent read-only candidate review identified the cleanup update casting error and personal Gmail alias bypass; both were corrected and exercised through real MongoDB integration. These scoped checks do not claim a repository-wide security audit.
