import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

// eslint-config-next@16 ships native flat-config arrays. There is deliberately NO try/catch around
// the imports: the old config swallowed a failed import and silently linted nothing, which made CI's
// lint step vacuous. A broken config must fail loudly.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "scraper/**",
    "scratch/**",
    "scripts/**",
    "graphify-out/**",
    // Root-level ops scripts (monitor.js, migrate.js) are plain untyped JS.
    "*.js",
    "*.cjs",
  ]),
]);

export default eslintConfig;
