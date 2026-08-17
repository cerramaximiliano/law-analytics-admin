import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
	base: "/",
	plugins: [
		react(),
		tsconfigPaths(),
		svgr({
			svgrOptions: {
				icon: true,
			},
		}),
		visualizer({
			open: false,
			filename: "bundle-stats.html",
			gzipSize: true,
			brotliSize: true,
		}),
	],
	server: {
		port: 5174,
		open: false,
	},
	build: {
		outDir: "build",
		sourcemap: false,
		chunkSizeWarningLimit: 2000,
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: false,
				drop_debugger: true,
			},
		},
		rollupOptions: {
			treeshake: {
				moduleSideEffects: "no-external",
				preset: "recommended",
			},
			onwarn(warning, warn) {
				if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
				warn(warning);
			},
			output: {
				entryFileNames: `assets/[name]-[hash].js`,
				chunkFileNames: `assets/[name]-[hash].js`,
				assetFileNames: `assets/[name]-[hash].[ext]`,
				manualChunks: (id) => {
					// MUI en su propio chunk
					if (id.includes("node_modules/@mui")) {
						return "vendor-mui";
					}
					// Emotion (requerido por MUI)
					if (id.includes("node_modules/@emotion")) {
						return "vendor-emotion";
					}
					// Lodash
					if (id.includes("node_modules/lodash")) {
						return "vendor-lodash";
					}
					// Framer Motion
					if (id.includes("node_modules/framer-motion")) {
						return "vendor-animations";
					}
					// Simplebar
					if (id.includes("node_modules/simplebar")) {
						return "vendor-simplebar";
					}
					// Charts: solo los usa el dashboard y algunas vistas de stats,
					// no tiene sentido que viajen en el bundle inicial de todos.
					if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
						return "vendor-charts";
					}
					// Editor de texto enriquecido: lo usan plantillas y compositor.
					if (id.includes("node_modules/react-quill") || id.includes("node_modules/quill")) {
						return "vendor-editor";
					}
					// Fechas
					if (id.includes("node_modules/dayjs") || id.includes("node_modules/date-fns")) {
						return "vendor-dates";
					}
					// NO separar React en su propio chunk: react/react-dom quedan en
					// `vendor` junto a sus consumidores. Aislarlos genera una
					// dependencia circular entre chunks y en runtime falla con
					// "Cannot set properties of undefined (setting 'Children')",
					// dejando la app sin montar (incidente 2026-08-17).
					// Todo lo demás
					if (id.includes("node_modules")) {
						return "vendor";
					}
				},
			},
		},
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			assets: path.resolve(__dirname, "./src/assets"),
			components: path.resolve(__dirname, "./src/components"),
			contexts: path.resolve(__dirname, "./src/contexts"),
			hooks: path.resolve(__dirname, "./src/hooks"),
			layout: path.resolve(__dirname, "./src/layout"),
			pages: path.resolve(__dirname, "./src/pages"),
			routes: path.resolve(__dirname, "./src/routes"),
			sections: path.resolve(__dirname, "./src/sections"),
			services: path.resolve(__dirname, "./src/services"),
			store: path.resolve(__dirname, "./src/store"),
			themes: path.resolve(__dirname, "./src/themes"),
			types: path.resolve(__dirname, "./src/types"),
			utils: path.resolve(__dirname, "./src/utils"),
		},
	},
});
