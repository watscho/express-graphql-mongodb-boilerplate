# Testing

Run `yarn test` from the project root. It builds the TypeScript application, copies email templates, and runs Node's test runner against colocated application and tooling tests. No additional test framework or running MongoDB, Redis, SMTP service is required. The pinned Node.js version is required; module mocks use Node's experimental `--experimental-test-module-mocks` API.

Tests are colocated with the code they check. For example, auth service tests are in `src/domains/auth/__tests__/service.test.mjs`, and delivery tests are in `src/domains/notifications/delivery/__tests__`. Shared doubles and environment initialization are in `src/__tests__`. Plain ESM test files keep test helpers out of the emitted TypeScript application. Tests exercise built JavaScript; `yarn test` rebuilds it on every run.

The setup ignores developer `.env` values and supplies deterministic test-only secrets and unreachable service addresses. External clients are replaced with module doubles. Image conversion tests use real Sharp against temporary files and remove their directory afterward. Each test file runs in its own Node process; mutable mocks reset between cases. The shared launcher bounds execution to four test files at once and a 30-second timeout per test. Configuration probes receive only the required launch flags, rather than inheriting internal Node test-worker flags.

## Scope

The suite checks configuration bounds and secret-file diagnostics, account and verification services, JWT/password utilities, authorization guards, repository query predicates and session forwarding, profile/media transformations, image conversion and cleanup, locale negotiation, all built-in email templates in English and Georgian, queue encryption/idempotency, queue administration, worker retry/expiry/cancellation and acknowledgement behavior, HTTP errors and validation, request IDs, GraphQL transport/schema/resolvers, startup orchestration, and connection diagnostics.

Repository doubles verify query construction and failure handling. They do not simulate MongoDB transaction isolation, unique indexes, TTL timing, or concurrent lease acquisition. Real-service acceptance remains a separate check. Process entrypoints and CLI/lifecycle behavior are tested with controlled dependency doubles. Deployment scripts and external-provider delivery remain separate checks.

## Enforced coverage

`yarn test:coverage` builds the application, instruments **every emitted JavaScript module from `src`** with Istanbul, runs the suite, merges process-local counters, and fails unless statements, branches, functions, and lines are all 100%. Unloaded modules start at zero; mocked dependencies do not count as executions of their real implementation. No application files or branches are excluded. Type-only modules have no executable statements. Tests, test fixtures, dependency code, and build/coverage tooling are outside the application coverage denominator.

The preload hook serves instrumented code only inside test processes. It preserves original module URLs and leaves `dist` and running services untouched. Reports are generated in ignored `coverage/`: `index.html`, `coverage-summary.json`, `coverage-final.json`, `lcov.info`, `gaps.json`, and `manifest.json`. The manifest records the Node version, timestamps, process result, source/module counts, and SHA-256 hash of each compiled module. Raw counters and instrumented copies live in a unique temporary directory and are removed after reporting. The previous report remains available until its replacement has been generated. The normal `yarn test` run uses uninstrumented built modules. For investigation without enforcing the threshold, run `yarn test:coverage:report`. The lower-level `node scripts/coverage.mjs --report-only` requires a current build. The runner checks that every application TypeScript module has a compiled counterpart; an incomplete build fails before testing.

The 100% threshold establishes execution of application statements and branch arms with assertions around tested behavior. It does not establish production acceptance, MongoDB concurrency guarantees, or absence of all defects.

## Quality gate and CI

Run `yarn check` before handing off a change. It stops at the first failure and runs formatting, ESLint, generated resolver drift, and the coverage suite. The suite performs one TypeScript build, which checks application types and copies templates before testing. No global Yarn launcher is required: the scripts call the committed Yarn release or Node directly. Commands rebuild the shared `dist` directory, so run one quality/test command at a time per checkout.

The GitHub Actions Quality workflow uses the pinned Node version and an immutable dependency installation, then runs the same command on pushes and pull requests. Its permissions are limited to reading repository contents. Official actions are pinned to commit SHAs, with Dependabot configured for weekly action updates. Coverage reports are retained as a CI artifact for 14 days. Adding the workflow does not establish that a hosted CI run has passed; inspect the actual run after pushing.

Tooling tests cover zero-execution modules, missing build outputs, strict coverage counts (including percentages rounded to 100%), skipped code, subprocess failures, and shared launch arguments. Test infrastructure is in `scripts/testing`, separate from the ignored root `/coverage/` directory. Generated reports and `__tests__` directories are excluded from the Docker build context.

## Runtime verification

GraphQL transport tests execute real Express/Yoga parsing, validation, execution and response behavior with service/client doubles. They cover aliases, fragments, partial errors, guard enforcement, JSON/multipart policy, production introspection/GraphiQL policy and parser budgets. Upload/image tests use temporary files and real image decoding where appropriate.

Local tests do not establish real MongoDB transaction/concurrency semantics, Redis recovery, SMTP provider acceptance or hosted deployment. Rehearse the documented migration on a restored staging copy and verify the application/worker together before release. Never copy acceptance claims from the REST reference into this project's release record.

## Disposable integration runner

`yarn test:integration` requires Docker and builds the current production image. It creates a unique network and temporary MongoDB replica-set, Redis, Mailpit, API and worker containers. Only API/Mailpit test ports are published, on host loopback with dynamic port numbers. MongoDB/Redis have no host-published ports. It uses freshly generated test-only JWT/queue keys, an isolated database and temporary credentials; no developer `.env` or external SMTP provider is used.

The runner checks migration conflict preflight, preservation of legacy password/verification state, old-link removal, rerunnable migration, explicit index creation, non-root production runtime, absent development tools, credential-free SDL export, account workflows, token reuse/revocation, public image conversion, cross-owner rejection, Georgian SMTP capture and account/file deletion. Test containers, their upload/anonymous volumes, the network and temporary credentials are removed in `finally`; the built local image remains available. The test image tags are controlled fixture choices, not production deployment recommendations.

Security regressions now cover password-policy enforcement outside transport validation, normalized/stable authentication budgets, generic recovery at shared-account denial, recipient admission/idempotency/rollover/alias cases, quota reservations, deletion tombstones, orphan sweeps and cleanup versus attachment. The integration runner uses a shared disposable upload volume and deliberately tests concurrent admissions against real MongoDB transactions.
