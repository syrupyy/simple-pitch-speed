import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier/flat";
import sveltePlugin from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/", "release/", "transpose-pitch-speed-loop/"]),
  tseslint.configs.recommended,
  sveltePlugin.configs["flat/recommended"],
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
  sveltePlugin.configs["flat/prettier"],
  prettierConfig,
]);
