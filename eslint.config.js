import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";
import parser from "@typescript-eslint/parser";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";

export default tseslint.config(
	{ ignores: ["dist", "src-tauri/target/release"] },
	{
		settings: {
			react: {
				version: "detect",
			},
			"import-x/resolver-next": [createTypeScriptImportResolver()],
		},
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
			react.configs.flat.recommended,
			react.configs.flat["jsx-runtime"],
			eslintConfigPrettier,
			importX.flatConfigs.recommended,
			importX.flatConfigs.typescript,
		],
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			globals: globals.browser,
			parser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
				ecmaVersion: "latest",
				sourceType: "module",
				project: ["./tsconfig.json", "./tsconfig.node.json"],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			"@typescript-eslint/switch-exhaustiveness-check": "error",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
			"import-x/default": "off",
			"import-x/no-named-as-default": "off",
			"import-x/no-restricted-paths": [
				"error",
				{
					zones: [
						// enforce unidirectional codebase:
						{
							from: "./src/app",
							target: "./src/features",
						},
						{
							from: ["./src/features", "./src/app"],
							target: [
								"./src/components",
								"./src/hooks",
								"./src/lib",
								"./src/types",
								"./src/utils",
							],
						},
					],
				},
			],
		},
	},
);
