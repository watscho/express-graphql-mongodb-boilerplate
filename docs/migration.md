# Migration from JavaScript v9

Version 10 intentionally introduces a new GraphQL contract. Deploy clients and server as a coordinated breaking release. Keep the previous image/source and a restorable database/upload backup for rollback. The old and new servers must not write the same database during migration.

## Data migration

1. Stop API and workers, back up MongoDB/Redis/uploads and test restoration. Use a MongoDB replica set or Atlas before enabling new transactional workflows.
2. Reconcile invalid email values and collisions after trim/lowercase normalization. The migration checks normalized missing/duplicate emails before writes and stops on conflicts; it does not merge accounts or choose an owner.
3. Run `yarn db:migrate:legacy` (or its compiled `:prod` equivalent) against the intended database. This is an explicit maintenance operation, not startup behavior.
4. The migration normalizes emails, preserves flat `verified` when present or copies `account.verification.verified`, initializes missing auth/mutation versions, and removes embedded plaintext reset/verification links. Existing bcrypt hashes and account IDs remain unchanged. Passwords do not need rehashing merely because bcryptjs changed to bcrypt.
5. If upgrading a database that also contains separate legacy token collections, raw `accessToken` values are hashed and removed. Only attached legacy media with provable user references receives inferred ownership; other media stays quarantined.
6. Reconcile duplicate token/user/avatar records before `yarn db:indexes`. Index maintenance preflights uniqueness and creates missing collections/indexes without dropping operator indexes. Review [database](database.md).
7. Start the new API and mail worker with distinct JWT and queue-encryption keys, then verify the workflows in staging. Old JWT claims are incompatible and users must sign in again. Old embedded email links are invalidated; request fresh links.

The migration is rerunnable, but it is not a cross-collection atomic database upgrade. On failure keep writers stopped, inspect safe diagnostics, correct the cause and rerun or restore a backup. Do not run the old application again against a partially migrated database. Retained legacy `locale` is not a current API preference; clients send `Accept-Language`. Legacy documents without valid created/updated timestamps need reconciliation before public serialization.

## Client contract changes

| v9                                                  | v10                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `user`                                              | `me`; public `id` replaces `_id`                                               |
| `signIn(email,password)` / `signUp(email,password)` | `signIn(input:CredentialsInput!)` / `signUp(input:CredentialsInput!)`          |
| `logout` / `Succeed.succeed`                        | `signOut` / `Success.messageKey`                                               |
| `verifyRequest`                                     | `requestVerification(email:currentEmail)`                                      |
| `verify(token)`                                     | `confirmVerification(token)`                                                   |
| `newPassword(token,newPassword)`                    | `newPassword(token,input:{password})`                                          |
| `changePassword(currentPassword,newPassword)`       | `updatePassword(input:{oldPassword,newPassword})`, returning a replacement JWT |
| `updateUser(email,firstName,lastName)`              | Separate `updateProfile` and password-protected `updateEmail`                  |
| `switchLocale`                                      | Send the UI language in `Accept-Language`                                      |
| Nested `account.verification.verified`              | Public flat `verified`                                                         |
| Raw English exceptions                              | Stable message keys plus GraphQL error extensions                              |
| Lerna `workspaces/api` and CommonJS aliases         | Root ESM TypeScript application with explicit `.ts` imports                    |

New capabilities include account deletion, owned image upload/avatar management, template catalog, durable encrypted mail delivery, worker/operator commands and production deployment configuration. Export the SDL and regenerate clients after updating operations. Do not expose the old generated Mongoose schema alongside the new schema as a compatibility shortcut.

## Security hardening upgrade

Run `db:indexes` with writers stopped to provision `MailRecipientBudget` and its expiry index, plus the media lifecycle index. Existing owned media is counted conservatively as original size plus 256 KiB even without new fields; current avatars remain attached. Expired legacy unattached media with creation timestamps is eligible for cleanup. Unknown ownership or missing timestamps remains an operator reconciliation task.

Deploy the cleanup service with the same persistent volume and retention settings as the API. Pending reservations and deletion tombstones must not be removed with MongoDB TTL: file deletion must happen before quota inventory is released. Keep a backup before the first cleanup pass, since unused expired files are deliberately removed.

New passwords require at least 15 Unicode code points, reject common/repeated examples, and remain within bcrypt's 72 UTF-8 byte limit. Existing password hashes and sign-in/confirmation inputs remain compatible; weak historical passwords can be changed through the normal password/reset workflows. No password bytes are silently normalized or truncated by the new-password validator.

Default JWT issuer/audience are now `express-graphql-mongodb-api` and `express-graphql-mongodb-client`, and HTTP limiter prefixes are GraphQL-specific. Existing deployments using old defaults need deliberate configuration migration and reauthentication; keep distinct signing secrets and identity settings for separate applications.
