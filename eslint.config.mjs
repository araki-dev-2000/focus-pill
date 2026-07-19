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
    "src/renderer/shared/components/ui/**", // Shadcn UIコンポーネントは自動生成されるため基本的には編集は控える
  ]),

  { settings: { react: { version: "19" } } },

  // Main / Preload プロセス（Node.js実行環境）
  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  // Renderer（ブラウザ実行環境）
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },

  // ビルド設定ファイル（Node.js実行環境）
  {
    files: ["*.config.{ts,mjs,js}"],
    languageOptions: { globals: globals.node },
  },

  // TypeScript ファイル専用
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // -----------------------------------------------------------------------
      // TypeScript
      // -----------------------------------------------------------------------

      // anyの使用を禁止（コメントで理由を明記すれば警告のみ）
      "@typescript-eslint/no-explicit-any": "warn",

      // 型アサーション（as）の使用を制限
      "@typescript-eslint/consistent-type-assertions": [
        "warn",
        { assertionStyle: "never" },
      ],

      // 型注釈を強制（引数・戻り値）
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,       // アロー関数は除外
          allowHigherOrderFunctions: true,
        },
      ],

      // -----------------------------------------------------------------------
      // 命名規則
      // -----------------------------------------------------------------------
      "@typescript-eslint/naming-convention": [
        "error",
        // 型・インターフェースはパスカルケース
        {
          selector: ["typeLike"],
          format: ["PascalCase"],
        },
        // 変数はcamelCase（定数のアッパースネークケースも許可）
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        // 関数はcamelCase
        {
          selector: "function",
          format: ["camelCase", "PascalCase"], // Reactコンポーネントはパスカルケース
        },
        // boolean型の変数はis/has/canで始める
        {
          selector: "variable",
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "can"],
        },
      ],

      // 未使用変数を警告
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",  // _始まりの引数は無視
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  // 全ファイル共通ルール
  {
    rules: {
      // セミコロンを禁止
      semi: ["error", "never"],

      // インデントをスペース2つに統一
      indent: ["error", 2, { SwitchCase: 1 }],

      // -----------------------------------------------------------------------
      // React
      // -----------------------------------------------------------------------

      // propsの型定義を強制
      "react/prop-types": "off", // TypeScriptで代替するためoff

      // コンポーネントの関数スタイルを統一（関数コンポーネントのみ）
      "react/function-component-definition": [
        "error",
        {
          namedComponents: "function-declaration",       // トップレベルはfunction
          unnamedComponents: "arrow-function",           // それ以外はアロー関数
        },
      ],

      // -----------------------------------------------------------------------
      // 共通
      // -----------------------------------------------------------------------

      // console.logを警告（本番コードに残さない）
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
])

export default eslintConfig
