/// <reference types="vitest" />
///// <reference types="vitest/config" />
/// <reference types="vite/client" />

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const host = process.env.TAURI_DEV_HOST as string | null;

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	css: {
		modules: {
			localsConvention: "camelCase",
		},
	},

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host ?? false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			// 3. tell vite to ignore watching `src-tauri`
			ignored: ["**/src-tauri/**"],
		},
	},

	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/__test__/setup.ts",
		css: true,
		coverage: {
			reporter: ["lcov"],
		},
	},
});
