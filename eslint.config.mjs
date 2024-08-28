import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      "**/.husky",
      "**/.vscode",
      "**/coverage",
      "**/dist",
      "**/documentation",
      "**/node_modules",
      "**/public",
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: "script",

      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/return-await": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
