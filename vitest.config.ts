import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["frontend/tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["frontend/*.{ts,tsx}"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
