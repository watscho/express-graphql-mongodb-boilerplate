# Security policies and operations

## New passwords and authentication budgets

New passwords require at least 15 Unicode code points and reject a small local set of common examples and repeated single-character values. All character classes, Unicode and spaces remain available. The bcrypt input limit is 72 UTF-8 bytes; over-limit values are rejected, never silently truncated or normalized. Policy is enforced in runtime input schemas and again at `hashPassword`, so internal callers share the boundary. Existing hashes and current-password inputs remain compatible. The local example denylist is not a comprehensive breached-password service.

The length/character policy follows the [OWASP Authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). Account budgets are independent of the existing IP budget: the default is 30 admissions per normalized email and stable account ID in 15 minutes. Sign-in checks the email bucket before lookup and the account-ID bucket before bcrypt. Password-confirmation operations share those identities; changing an account's email does not reset its stable ID bucket. Successful calls do not reset counters. All Redis increments/expiry decisions are atomic and Redis failures fail closed. Keys contain HMAC digests rather than identities.

Password recovery uses the same email budget for existing and absent addresses. A denied stable-ID budget returns the generic recovery result without replacing a link. Registration retains its documented email-conflict/access-token contract.

## Recipient admission and transactions

All new email intents go through `enqueueTemplate`. Defaults are 20 new intents per recipient/UTC day, five per recipient/template/UTC day and a 60-second per-template cooldown. Daily counters reset atomically while cooldowns survive midnight. HMAC recipient identities share personal Gmail dot/plus/googlemail aliases, following [Google's dot rules](https://support.google.com/mail/answer/7436150?hl=en), [plus-addressing documentation](https://gmail.googleblog.com/2008/03/2-hidden-ways-to-get-more-from-your.html) and [googlemail equivalence](https://support.google.com/mail/answer/10313?hl=en). Actual delivery addresses and account identities retain their aliases; custom-domain addresses are kept distinct.

Admission and outbox insertion share the caller's MongoDB transaction. Calls without a session create a transaction. Existing idempotent jobs return without another budget charge. Denial rolls back account changes, token replacement/cancellation and the outbox together. Recovery/verification requests preserve their generic result and previous valid link; other limited mutations return a rate-limit error with no committed mutation. Unchanged profile submissions enqueue no email.

Budget records require their explicit indexes (`yarn db:indexes`). Their TTL removes inactive accounting records, not media or jobs. Queue keys must remain stable and settings consistent across producers. New-intent admission is distinct from SMTP retry: the existing worker attempt/deadline policies and explicit privileged operator retry remain in force. SMTP does not provide exactly-once inbox delivery.

## Media reservation and cleanup

Each owner is limited to 20 inventory records and 100 MiB of reserved storage by default. Reservation includes the original plus an enforced 256 KiB conversion allowance. Pending uploads, ready images and deletion tombstones all count. A user mutation lock serializes count/sum plus reservation inside a MongoDB transaction before any disk write. Conversion output is size-checked before publication. Publication checks the current account and unexpired pending reservation again.

Unattached ready images expire after 24 hours; replacing an avatar starts the old image's retention period. Current attached avatars are retained. Pending upload leases expire after one hour. Cleanup and attachment acquire the same account lock and recheck lifecycle state, so a stale cleanup candidate cannot delete a newly attached image.

Cleanup first commits a deletion tombstone, then removes the original/conversion, then removes inventory. A crash or filesystem failure retains inventory for retry and does not free quota prematurely. Claims use a 15-minute retry lease so failed batches do not permanently starve later candidates. Account deletion uses the same durable inventory rather than losing its file list at commit. A streaming filesystem sweep catches old generated original/conversion/temp filenames with no database record after the upload-lease grace; it skips arbitrary names, directory entries and symlinks. Storage directories remain server-owned and path containment remains lexical.

Run `yarn media:cleanup` for one pass or `yarn media:cleanup --watch` for periodic passes. The production Compose `media-cleanup` service shares the API upload volume and runs every 15 minutes with its own MongoDB credential. It needs no Redis, JWT, SMTP or queue-encryption key. API and cleanup must use identical volume/retention settings. Unknown legacy ownership or missing creation timestamps requires operator reconciliation. Monitor `failed` counters and filesystem capacity; per-owner quotas do not define a global storage-capacity limit.

See [configuration](configuration.md), [deployment](deployment.md), [migration](migration.md) and the [verification record](verification.md).
