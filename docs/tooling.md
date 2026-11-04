# Runtime and tooling

Node.js is pinned by `.nvmrc` and the production Dockerfile. `packageManager` pins Yarn 4.18.1; its committed CLI lives in `.yarn/releases/`. Use `node .yarn/releases/yarn-4.18.1.cjs <command>` when a global Yarn launcher is unavailable. The node-modules linker supports native packages and standard Node ESM.

The application compiler is TypeScript 7.0.2 through `@typescript/native: npm:typescript@7.0.2`. Build/typecheck invoke this compiler explicitly. Tooling that needs the JavaScript compiler API uses the complete TypeScript 6.0.3 SDK under `typescript`, matching the REST reference. The `@typescript/typescript6` shim produces a Yarn compatibility-patch warning and is intentionally not used. Do not replace the explicit compiler path with whichever `tsc` happens to be on PATH.

All direct runtime/development dependencies were checked against npm stable dist-tags for this migration. The API-compatibility SDK is deliberately pinned separately from the current compiler. `yarn.lock` pins the complete resolution graph. Use immutable installation in CI; update dependencies and lockfile together with compatibility checks. The project has no Lerna or legacy workspaces.

`yarn codegen` derives resolver signatures from domain SDL. Generated code is committed; `yarn codegen:check` regenerates/formats and fails when it differs. The generated file alone permits the generic `any` types emitted by the upstream generator; handwritten application code retains the rule.

`yarn build` clears only `dist`, compiles strict TypeScript, rewrites `.ts` imports and copies templates/SDL. Storage lives outside `dist`. API, worker, schema export and database/queue maintenance have compiled entrypoints. Production dependencies contain no compiler, codegen, tsx, formatter or linter. Docker's build stage contains development tools; its runtime stage runs as a non-root user.

`yarn check` runs formatting, lint, codegen drift and the build/test/strict coverage gate. The same command runs in the pinned GitHub Actions workflow. Local tests do not establish target Linux/native or container compatibility; verify those in the release environment.
