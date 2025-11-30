/// <reference types="vitest" />
///// <reference types="vitest/config" />
/// <reference types="vite/client" />

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST as string | null;

function injectDevTools() {
	return {
		name: "inject-devtools",
		transformIndexHtml(html: string) {
			if (process.env.NODE_ENV === "development") {
				return html.replace(
					"</head>",
					'<script src="http://localhost:8097"></script></head>',
				);
			}
			return html;
		},
	};
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		injectDevTools(),
	],
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
			include: ["src/**/*.{ts,tsx,js,jsx}"],
		},
		clearMocks: true,
	},
});
