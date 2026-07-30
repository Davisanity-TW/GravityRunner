# Shared contracts

This package is the single source of truth for values exchanged between the
game runtime, web shell, API, test fixtures, and future replay validator.

Every public contract exports:

- a TypeBox runtime schema, such as `GameCommandSchema`;
- a TypeScript type inferred from that schema, such as `GameCommand`.

Consumers must import these definitions from `@gravity-runner/shared-contracts`
instead of declaring app-local DTO interfaces.

## Runtime validation

Use `validateContract(schema, value)` at untrusted boundaries. A successful
result is `{ valid: true, errors: [] }`; failures include stable JSON paths and
human-readable messages. Structural validation belongs here. Cross-record rules
such as checkpoint uniqueness, event ordering, reachability, and run
plausibility belong to their domain validators in later tasks.

```ts
import {
  SubmitRunRequestSchema,
  validateContract
} from "@gravity-runner/shared-contracts";

const result = validateContract(SubmitRunRequestSchema, requestBody);
```

The package must remain independent from Phaser, React, Fastify, DOM APIs, and
Node-only modules.
