import { defineConfig, globalIgnores } from "eslint/config"
import js from "@eslint/js"
import tseslint from "typescript-eslint"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],

  globalIgnores([
    "dist/**",
    "eslint.config.mjs",
    "src/renderer/shared/components/ui/**", // shadcn/ui generated components are auto-generated, so avoid editing them in general
  ]),

  { settings: { react: { version: "19" } } },

  // Main / Preload process (Node.js runtime environment)
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  // Renderer (browser runtime environment)
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },

  // Build config files (Node.js runtime environment)
  {
    files: ["*.config.{ts,mjs,js}"],
    languageOptions: { globals: globals.node },
  },

  // TypeScript files only
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // -----------------------------------------------------------------------
      // TypeScript
      // -----------------------------------------------------------------------

      // Disallow use of any (warn only, if the reason is documented in a comment)
      "@typescript-eslint/no-explicit-any": "warn",

      // Restrict use of type assertions (as)
      "@typescript-eslint/consistent-type-assertions": [
        "warn",
        { assertionStyle: "never" },
      ],

      // Enforce type annotations (parameters / return values)
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,       // Exclude arrow functions
          allowHigherOrderFunctions: true,
        },
      ],

      // -----------------------------------------------------------------------
      // Naming conventions
      // -----------------------------------------------------------------------
      "@typescript-eslint/naming-convention": [
        "error",
        // Types and interfaces are PascalCase
        {
          selector: ["typeLike"],
          format: ["PascalCase"],
        },
        // Variables are camelCase (UPPER_CASE constants also allowed)
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        // Functions are camelCase
        {
          selector: "function",
          format: ["camelCase", "PascalCase"], // React components are PascalCase
        },
        // Boolean variables start with is/has/can
        {
          selector: "variable",
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "can"],
        },
      ],

      // Warn on unused variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",  // Ignore arguments starting with _
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Rules common to all files
  {
    rules: {
      // Disallow semicolons
      semi: ["error", "never"],

      // Enforce 2-space indentation
      indent: ["error", 2, { SwitchCase: 1 }],

      // -----------------------------------------------------------------------
      // React
      // -----------------------------------------------------------------------

      // Enforce prop type definitions
      "react/prop-types": "off", // Off because TypeScript handles this instead

      // Enforce a consistent component function style (function components only)
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "function-declaration",       // Top-level components use function
          unnamedComponents: "arrow-function",           // Everything else uses arrow functions
        },
      ],

      // -----------------------------------------------------------------------
      // Common
      // -----------------------------------------------------------------------

      // Warn on console.log (don't leave it in production code)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
])

export default eslintConfig
