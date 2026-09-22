import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Prisma models can't be typed here until `prisma generate` has run
      // against a reachable engine — see server/PROJECT_STATUS.md.
      "@typescript-eslint/no-explicit-any": "warn",
      // `declare global { namespace Express { ... } }` is the standard,
      // documented way to augment Express's Request type — not a real issue.
      "@typescript-eslint/no-namespace": "off",
    },
  }
);
