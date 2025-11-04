/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_AUTH0_GOOGLE_ID: string;
	readonly VITE_GOOGLE_API_KEY: string;
	readonly VITE_AUTH_URL: string;
	readonly VITE_WORKERS_URL: string;
	readonly VITE_DEV_EMAIL: string;
	readonly VITE_DEV_PASSWORD: string;
	readonly VITE_MAINTENANCE_MODE: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
