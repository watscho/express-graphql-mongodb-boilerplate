# Client message keys

Application errors use stable keys such as `auth.authentication_required`, `auth.invalid_access_token`, `auth.guest_required`, `auth.session_expired`, `validation.failed`, `media.invalid_upload` and `media.image_not_found`. HTTP infrastructure defaults use `http.status.<status>`.

In GraphQL, the key is `errors[].message`. Extensions contain an error category (`BAD_USER_INPUT`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED` or `INTERNAL_SERVER_ERROR`), application status, and optional validation details. Each detail has a field path, message key and safe scalar constraints. Parser/GraphQL validation failures use GraphQL diagnostics rather than application-domain keys.

No-data mutations return `Success.messageKey`, including `auth.signed_out`, `auth.password_reset_requested`, `auth.verification_requested`, `users.profile_deleted` and `media.avatar_updated`. Other mutations return selected data. Translate business keys in the client; email translations are isolated server resources.

Operation budgets return `graphql.operation_limit_exceeded`. Multipart without the required header returns `graphql.preflight_required`. Internal exceptions are masked as `http.status.500`; rejected values, stack traces, connection strings and encrypted mail content are not public error details.
