import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const __dirname = dirname(fileURLToPath(import.meta.url));

// eslint-config-next@15 ships *legacy* (eslintrc) presets. The previous config tried to
// `import()` them as flat-config arrays, silently fell back to `[]` when that failed, and so
// linted nothing at all ("File ignored because no matching configuration was supplied").
// FlatCompat is the supported bridge, and there is deliberately NO try/catch here: a broken
// config must fail loudly.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
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
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
];

export default eslintConfig;
