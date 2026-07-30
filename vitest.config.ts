import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "web",
          root: "apps/web",
          environment: "node",
          include: ["src/**/*.test.ts"]
        }
      },
      {
        test: {
          name: "api",
          root: "apps/api",
          environment: "node",
          include: ["src/**/*.test.ts"]
        }
      },
      {
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
