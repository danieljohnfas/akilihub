import { defineConfig, globalIgnores } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";

// eslint-config-next exports flat config arrays
let nextVitals = [];
let nextTs = [];
try {
  const vitals = await import("eslint-config-next/core-web-vitals.js");
  nextVitals = Array.isArray(vitals.default) ? vitals.default : [];
} catch {
  try {
    const vitals = await import("eslint-config-next/core-web-vitals");
    nextVitals = Array.isArray(vitals.default) ? vitals.default : [];
  } catch { /* ignore */ }
}
try {
  const ts = await import("eslint-config-next/typescript.js");
  nextTs = Array.isArray(ts.default) ? ts.default : [];
} catch {
  try {
    const ts = await import("eslint-config-next/typescript");
    nextTs = Array.isArray(ts.default) ? ts.default : [];
  } catch { /* ignore */ }
}

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
        { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scraper/**",
    "scratch/**",
    "render_cli/**",
    "koyeb_cli/**",
    "scripts/**",
    "src/lib/scrapers/parsers/**",
    "migrate.js",
    "push-env.js",
    "*.mjs",
    "*.cjs",
    "*.js"
  ]),
]);

export default eslintConfig;
