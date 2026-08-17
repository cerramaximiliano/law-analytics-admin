import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";

// Factory: instancia de Axios para las APIs de workers con la misma cadena de
// auth (token + refresh + cola). Hay DOS bases posibles:
//   - VITE_WORKERS_URL (…/cache): pjn/cache-api contra el rs0 — corpus de causas
//     y datos que viven en el Mongo local de worker_01 (replicados en rs0).
//   - VITE_PJN_API_URL (raíz de api.lawanalytics.app): pjn/api contra ATLAS —
//     datos que viven en Atlas (config del scraping-manager de pjn-mis-causas,
//     failover, causas-update-config). ⚠️ Estos NO existen en el rs0: apuntarlos
//     al /cache da 500 "Config no encontrada" (incidente Integraciones 2026-08-17).
const createWorkersAxiosInstance = (baseURL: string): AxiosInstance => {
	const instance: AxiosInstance = axios.create({
		baseURL,
		timeout: 30000,
		headers: {
			"Content-Type": "application/json",
			"ngrok-skip-browser-warning": "true", // Requiere configuración de CORS en el backend
		},
		withCredentials: false, // No necesitamos cookies, usamos Authorization header
	});
	attachAuthInterceptors(instance);
	return instance;
};

// Helper function to get auth token
const getAuthToken = () => {
	// First try to get token from secureStorage (this is the primary method)
	const secureToken = secureStorage.getAuthToken();
	if (secureToken) {
		return secureToken;
	}

	// Then try authTokenService
	const serviceToken = authTokenService.getToken();
	if (serviceToken) {
		return serviceToken;
	}

	// Then try to get token from different possible cookie names
	const token =
		Cookies.get("authToken") ||
		Cookies.get("auth_token") ||
		Cookies.get("token") ||
		Cookies.get("access_token") ||
		Cookies.get("jwt") ||
		Cookies.get("session");

	if (token) {
		return token;
	}

	// If no token in cookies, check document.cookie directly
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (["authToken", "auth_token", "token", "jwt", "session"].includes(name)) {
			return decodeURIComponent(value);
		}
	}

	// Also check localStorage and sessionStorage
	const localToken =
		localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("auth_token") || localStorage.getItem("jwt");
	if (localToken) {
		return localToken;
	}

	const sessionToken =
		sessionStorage.getItem("token") ||
		sessionStorage.getItem("authToken") ||
		sessionStorage.getItem("auth_token") ||
		sessionStorage.getItem("jwt");
	if (sessionToken) {
		return sessionToken;
	}

	return null;
};

// Interceptores compartidos (token en request + refresh/cola en response)
function attachAuthInterceptors(instance: AxiosInstance) {
	// Request interceptor to add auth token
	instance.interceptors.request.use(
		(config: InternalAxiosRequestConfig) => {
			const token = getAuthToken();

			if (token && config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
			}

			return config;
		},
		(error) => {
			return Promise.reject(error);
		},
	);

	// Response interceptor for error handling and token refresh
	instance.interceptors.response.use(
	(response: AxiosResponse) => {
		// Capturar token del header si viene (para mantener token actualizado)
		const token = response.headers["authorization"] || response.headers["x-auth-token"];
		if (token) {
			const cleanToken = token.replace("Bearer ", "");
			authTokenService.setToken(cleanToken);
			secureStorage.setAuthToken(cleanToken);
		}

		// Si la respuesta contiene un token en el body
		if (response.data?.token) {
			authTokenService.setToken(response.data.token);
			secureStorage.setAuthToken(response.data.token);
		}

		return response;
	},
	async (error) => {
		// Cuenta autenticada pero sin rol admin (verifyAdmin en backend devuelve
		// accountNotAdmin: true) → modal de re-login inmediato. El token es válido,
		// el problema es el rol, no tiene sentido pasar por refresh-token.
		if (error.response?.status === 403 && error.response?.data?.accountNotAdmin) {
			window.dispatchEvent(new CustomEvent("showUnauthorizedModal"));
			return Promise.reject(error);
		}
		const originalRequest = error.config;

		// Si recibimos un 401 del servidor y no hemos intentado refrescar aún
		if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._queued) {
			originalRequest._retry = true;

			try {
				// Intentar refrescar el token usando la API de autenticación
				const authBaseURL = import.meta.env.VITE_AUTH_URL || "https://api.lawanalytics.app";
				const refreshResponse = await axios.post(`${authBaseURL}/api/auth/refresh-token`, {}, { withCredentials: true });

				// Capturar el nuevo token de la respuesta del refresh
				const newToken =
					refreshResponse.headers["authorization"]?.replace("Bearer ", "") ||
					refreshResponse.headers["x-auth-token"] ||
					refreshResponse.data?.token;

				if (newToken) {
					authTokenService.setToken(newToken);
					secureStorage.setAuthToken(newToken);
					if (originalRequest.headers) {
						originalRequest.headers.Authorization = `Bearer ${newToken}`;
					}
				}

				// Reintentar la petición original con el nuevo token
				return instance(originalRequest);
			} catch (refreshError) {
				// Si el refresh falla, encolar la petición y mostrar modal de autenticación
				// en lugar de redirigir directamente al login

				// Marcar como encolada para evitar reencolar
				originalRequest._queued = true;

				const queuedPromise = requestQueueService.enqueue(originalRequest);

				// Emitir evento para que el contexto de autenticación muestre el modal
				window.dispatchEvent(new CustomEvent("showUnauthorizedModal"));

				// Retornar la Promise encolada que se resolverá después del login
				return queuedPromise;
			}
		}

			return Promise.reject(error);
		},
	);
}

// Instancia principal: cache-api (rs0) — corpus de causas y datos worker_01-local.
const workersAxios: AxiosInstance = createWorkersAxiosInstance(import.meta.env.VITE_WORKERS_URL || "http://localhost:3035");

// Instancia hermana: pjn/api contra ATLAS (raíz de api.lawanalytics.app) — para
// services cuyos datos NO están en el rs0 (scraping-manager, failover, etc.).
export const pjnAtlasAxios: AxiosInstance = createWorkersAxiosInstance(
	import.meta.env.VITE_PJN_API_URL || "https://api.lawanalytics.app",
);

export default workersAxios;
