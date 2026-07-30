# Level format

`@gravity-runner/level-format` parses and validates data-driven level manifests
without depending on Phaser or a specific editor.

- `parseLevelManifest` accepts an unknown value or JSON string and performs
  structural plus domain validation.
- `validateLevelManifest` validates cross-field rules on a typed manifest.
- `createLevelChecksumInput` emits canonical JSON with sorted object keys while
  preserving array order.
- `supportedHazardTypes` lists the runtime-supported hazard vocabulary.

Errors use stable codes suitable for web UI messages, API logs, fixtures, and
future content tooling. A future Tiled adapter must convert Tiled JSON into the
same `LevelManifest` contract before calling this package.
