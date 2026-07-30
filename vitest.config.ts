import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const workspaceAliases = {
  "@gravity-runner/game-core": fileURLToPath(
    new URL("./packages/game-core/src/index.ts", import.meta.url)
  ),
  "@gravity-runner/shared-contracts": fileURLToPath(
    new URL("./packages/shared-contracts/src/index.ts", import.meta.url)
  ),
  "@gravity-runner/test-fixtures": fileURLToPath(
    new URL("./packages/test-fixtures/src/index.ts", import.meta.url)
  )
};

export default defineConfig({
  resolve: {
    alias: workspaceAliases
  },
  test: {
    projects: [
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "web",
          root: "apps/web",
          environment: "node",
          include: ["src/**/*.test.ts"]
        }
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "api",
          root: "apps/api",
          environment: "node",
          include: ["src/**/*.test.ts"]
        }
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: "packages",
          root: "packages",
          environment: "node",
          include: ["*/src/**/*.test.ts"]
        }
      }
    ]
  }
});
