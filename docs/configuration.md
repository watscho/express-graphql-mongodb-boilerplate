# Configuration and process roles

Configuration is validated when its owning module is imported. `schemas.ts` defines reusable settings; narrow modules select only fields needed by their process. There is no eagerly validated universal environment object.

API/worker bootstrap imports every required configuration profile before service clients, aggregates configuration failures, and reuses successful modules through ESM caching. Operator entrypoints preserve their narrower roles and credential-free help. See [runtime diagnostics](logging.md) for readable errors and stream/format behavior.

`loadEnvironment` infers each parsed profile as `Readonly<z.output<Schema>>`; separate environment DTO aliases are unnecessary. Boolean settings share the same strict `true`/`false` parser and default to `false`. Reuse validators only when constraints/defaults match; configuration coercion is distinct from already parsed domain values. The remaining configuration DTO adapts Mongoose's native connection options.

| Module             | Owner                                          | Required secrets                                                                   |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `runtime.ts`       | Logging and runtime mode                       | None                                                                               |
| `database.ts`      | MongoDB connection/pools                       | MongoDB URI                                                                        |
| `api.ts`           | HTTP, Redis, JWT, uploads, documentation       | Redis URI, JWT secret; docs credentials only when configured/enabled in production |
| `notifications.ts` | Client links, language defaults, template root | None                                                                               |
| `queue.ts`         | Producer/consumer payload encryption           | Queue encryption key                                                               |
| `delivery.ts`      | Retry/lease/retention/heartbeat limits         | None                                                                               |
| `mail.ts`          | SMTP submission and Message-ID domain          | SMTP credentials when required by the provider                                     |

The API imports runtime, MongoDB, API, notification, queue, and delivery settings. The mail worker imports runtime, MongoDB, notification, queue, delivery, and SMTP settings. It has no dependency on the API/JWT/Redis profile. Queue administration imports only MongoDB and delivery settings; GraphQL SDL export imports no environment configuration.

`dotenv/config` supports a local root `.env`; Node's `--env-file` or `DOTENV_CONFIG_PATH` can select another development file. Container environments use the separate examples in `ops/environments/`. Do not copy secrets or `.env` into an image.

Run local commands from the repository root so dotenv finds the intended `.env`, or provide `DOTENV_CONFIG_PATH` explicitly. With default dotenv behavior, an already supplied process environment value takes precedence over a value in `.env`. Each profile is parsed once when imported; editing a file does not reconfigure running clients.

| Process                  | Service connections / resources                                                     |
| ------------------------ | ----------------------------------------------------------------------------------- |
| API                      | MongoDB, Redis, JWT signing, queue encryption, writable upload storage              |
| Mail worker              | MongoDB, queue encryption, template files/dictionaries, SMTP                        |
| Queue CLI                | MongoDB and operational delivery settings; no decryption/JWT/Redis/SMTP credentials |
| Index/legacy maintenance | MongoDB and logging; maintenance privileges as needed                               |
| GraphQL SDL export       | Pure domain SDL; no environment profile or service connection                       |

## Secret files

These plain settings also accept a `_FILE` path:

- `MONGODB_URI`
- `REDIS_URI`
- `JWT_SECRET`
- `MAIL_QUEUE_ENCRYPTION_KEY`
- `MAIL_USER`
- `MAIL_PASSWORD`

For example, `JWT_SECRET_FILE=/run/secrets/jwt_secret` reads the secret at startup. Nonempty plain and file values together are rejected. Missing/unreadable/empty files stop startup with the setting name only. Trailing whitespace is stripped from secret files. Configuration errors contain field paths and issue codes rather than rejected values, raw filesystem paths, or secret-bearing error messages.

Changing files does not reload a running process. Restart affected services. Queue encryption-key rotation needs a drain/migration strategy; retain the key while pending/retained encrypted jobs or idempotency fingerprints depend on it.

## HTTP and authentication

| Setting                                  | Default                                                          | Notes                                                     |
| ---------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`                               | `development`                                                    | `development` or `production`                             |
| `APP_HOST` / `APP_PORT`                  | `0.0.0.0` / `8000`                                               | HTTP listener                                             |
| `APP_URL`                                | `http://localhost:8000`                                          | Public API base for image URLs and docs server path       |
| `CLIENT_URL`                             | `http://localhost:3000`                                          | Frontend base for email actions and CORS origin           |
| `REDIS_URI`                              | Required                                                         | `redis:` or `rediss:` URL                                 |
| `JWT_SECRET`                             | Required                                                         | At least 32 characters; persistent/random                 |
| `JWT_EXPIRATION`                         | `24h`                                                            | Positive duration converted to whole safe-integer seconds |
| `JWT_ISSUER` / `JWT_AUDIENCE`            | `express-graphql-mongodb-api` / `express-graphql-mongodb-client` | Verified when reading JWTs                                |
| `BCRYPT_ROUNDS`                          | `12`                                                             | Range 10–16                                               |
| `TRUST_PROXY`                            | Empty                                                            | Exact proxy addresses/CIDRs; avoid unconditional trust    |
| `SHUTDOWN_TIMEOUT_MS`                    | `10000`                                                          | API drain deadline                                        |
| `MAX_UPLOAD_BYTES`                       | `10485760`                                                       | Multipart image byte limit                                |
| `STORAGE_PATH` / `STORAGE_URL`           | `storage/public` / `/storage/public`                             | Persistent filesystem path / public path prefix           |
| `RATE_LIMIT_WINDOW_MS`                   | `900000`                                                         | Shared Redis limiter window                               |
| `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | `100` / `10`                                                     | API / sensitive-operation limits                          |

HTTP(S) application URLs may include a base path but cannot contain credentials, query strings, or fragments. Reverse proxies must preserve or deliberately rewrite these paths consistently. JWT lifetimes shorter than one whole second, zero, and overflows are rejected.

`APP_HOST`/`APP_PORT` control the listener; changing `APP_URL` does not move it or mount Express routes under a prefix. For example, with public `APP_URL=https://api.example.com/api`, the proxy must map external `/api/graphql` to application `/graphql`, and do the same for docs, health, and storage paths. Public image URLs include the configured base. GraphQL endpoint routing belongs to the proxy. Avoid adding the same prefix twice in `STORAGE_URL`. See [deployment](deployment.md#proxy-docs-and-logging).

## MongoDB

| Setting                                           | Default                        |
| ------------------------------------------------- | ------------------------------ |
| `MONGODB_URI`                                     | Required replica-set/Atlas URI |
| `MONGODB_AUTO_INDEX`                              | `false`                        |
| `MONGODB_MAX_POOL_SIZE` / `MONGODB_MIN_POOL_SIZE` | `20` / `0`                     |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS`             | `10000`                        |
| `MONGODB_CONNECT_TIMEOUT_MS`                      | `10000`                        |
| `MONGODB_WAIT_QUEUE_TIMEOUT_MS`                   | `10000`                        |
| `MONGODB_MAX_IDLE_TIME_MS`                        | `60000`                        |

The minimum pool cannot exceed the maximum. Pool budgets apply per process and replica; include health/maintenance clients when sizing server connections. Writes request majority acknowledgement, and transactions use primary/snapshot reads. Disabling automatic indexing also disables Mongoose's automatic collection creation; provision collections/indexes explicitly before writes. Operational commands force automatic model DDL off even if a development environment enables it.

## GraphQL

`GRAPHQL_MAX_DEPTH` defaults to 10 (maximum 50); `GRAPHQL_MAX_FIELDS` defaults to 100 (maximum 1,000). Fragment references count each time they expand. Parser tokens are limited to 2,000. Batch requests are disabled. Production always disables introspection and GraphiQL; development enables GraphiQL at `/graphql`. There are no Swagger or `DOCS_*` settings.

## Email and logs

See [notifications](notifications.md) for all delivery, lease, expiry, concurrency, and retry settings. `MAIL_REQUIRE_TLS=true` requires STARTTLS when using submission such as port 587; `MAIL_SECURE=true` selects implicit TLS. The production worker example requires STARTTLS and supplies its credential through a secret file.

`LOG_LEVEL` defaults to `info`. Development console output is readable text; production uses JSON. Warning/error records go to stderr and other enabled levels to stdout. `API_LOG_FILENAME` is a legacy optional sanitized JSON file-output setting shared by runtime logging; leave it unset in read-only containers and collect both streams externally. Early configuration/import failures use an independent stderr reporter even when the logger cannot load. Details and examples are in [logging](logging.md).

## Security budgets and media lifecycle

| Setting                      | Default     | Meaning                                                                          |
| ---------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `ACCOUNT_RATE_LIMIT_MAX`     | `30`        | Attempts per normalized email and stable account ID in the API rate-limit window |
| `MAIL_RECIPIENT_DAILY_MAX`   | `20`        | New email intents per recipient in a UTC day                                     |
| `MAIL_PURPOSE_DAILY_MAX`     | `5`         | New email intents per recipient/template in a UTC day                            |
| `MAIL_RECIPIENT_COOLDOWN_MS` | `60000`     | Per-recipient/template cooldown, preserved across UTC midnight                   |
| `MEDIA_OWNER_MAX_FILES`      | `20`        | All owner inventory, including pending/deleting records                          |
| `MEDIA_OWNER_MAX_BYTES`      | `104857600` | Reserved original bytes plus 256 KiB conversion allowance per file               |
| `MEDIA_UNUSED_RETENTION_MS`  | `86400000`  | Unattached ready-file retention                                                  |
| `MEDIA_UPLOAD_LEASE_MS`      | `3600000`   | Pending-upload deadline and orphan sweep grace                                   |

The API role now loads a media profile as well. Media cleanup loads runtime/database/media configuration only. Recipient budgets use MongoDB and the existing queue key, with no new Redis dependency for mail workers. Sender replicas must use identical budget settings and the same stable queue key. Run explicit index maintenance to provision recipient-budget expiry and media lifecycle indexes.
