# Development

Use Node from `.nvmrc` and the committed Yarn CLI. Install with `yarn install --immutable`. Configure `.env` using `.env.example`; MongoDB transactions require a replica set or Atlas. Run the API and mail worker separately.

## Add a domain

1. Create `src/domains/<name>/schemas.ts` for runtime contracts and `dto.ts` for inferred input/output types. Reuse existing field schemas when their meaning matches.
2. Add the domain's model, explicit repository operations and service. Pass MongoDB sessions through every transactional write. Keep external I/O outside retryable transactions.
3. Expose deliberate cross-domain functions through `index.ts`; do not import another domain's private repository/model.
4. Put the public SDL in `graphql/schema.graphql`, extending the appropriate root type. Only `users` defines the base Query/Mutation types.
5. Add the domain name to `app/graphql/typeDefs.ts`, then run `yarn codegen`. Implement resolvers against `Resolvers` from `app/graphql/generated.ts`. Validate inputs before calling services and use `requireAuth`/`requireGuest` as needed.
6. Compose its resolvers in `app/graphql/schema.ts`. Add per-call auth throttling to credential/token workflows; request-level throttling alone does not limit aliases.
7. Add behavior tests under the owning `__tests__` directory, including access, invalid inputs, projections and failure paths. Add model indexes to the explicit maintenance command when needed.
8. Run `yarn format`, `yarn check`, and export the schema for client consumers. Update the contract/migration documentation for breaking changes.

Root fields are nullable so one expected application error does not null all independent results. Choose nested nullability according to actual domain guarantees. Avoid exposing internal Mongoose shapes or a generic arbitrary-recipient mail mutation.

The `File` scalar accepts only actual multipart File values. Uploads require `X-GraphQL-Preflight: 1`, a bearer token and the configured size/MIME constraints; image decoding remains a service responsibility.
