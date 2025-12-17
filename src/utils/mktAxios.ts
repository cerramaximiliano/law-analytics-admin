import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";

// Create a dedicated axios instance for MKT API
const mktAxios: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_MKT_URL || "https://mkt.lawanalytics.app",
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

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

// Request interceptor to add auth token
mktAxios.interceptors.request.use(
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

// Helper to check if error indicates auth issue
const isAuthError = (error: any): boolean => {
	const status = error.response?.status;
	const message = error.response?.data?.message?.toLowerCase() || "";
	const errorCode = error.response?.data?.error?.toLowerCase() || "";

	// 401 is always an auth error
	if (status === 401) return true;

	// 400 can also indicate auth issues if the message suggests it
	if (status === 400) {
		const authKeywords = ["token", "unauthorized", "authentication", "expired", "invalid token", "jwt", "auth"];
		return authKeywords.some((keyword) => message.includes(keyword) || errorCode.includes(keyword));
	}

	return false;
};

// Response interceptor for error handling and token refresh
mktAxios.interceptors.response.use(
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
		const originalRequest = error.config;
		const status = error.response?.status;

		console.log(`🔴 [mktAxios] Error ${status} en ${originalRequest?.url}:`, error.response?.data);

		// Si recibimos un error de autenticación y no hemos intentado refrescar aún
		if (isAuthError(error) && !originalRequest._retry && !originalRequest._queued) {
			console.log("🔄 [mktAxios] Detectado error de autenticación, intentando refresh...");
			originalRequest._retry = true;

			try {
				// Intentar refrescar el token usando la API de autenticación
				const authBaseURL = import.meta.env.VITE_AUTH_URL || "https://api.lawanalytics.app";
				console.log("🔄 [mktAxios] Llamando a refresh-token...");
				const refreshResponse = await axios.post(`${authBaseURL}/api/auth/refresh-token`, {}, { withCredentials: true });
				console.log("✅ [mktAxios] Refresh exitoso:", refreshResponse.status);

				// Capturar el nuevo token de la respuesta del refresh
				const newToken =
					refreshResponse.headers["authorization"]?.replace("Bearer ", "") ||
					refreshResponse.headers["x-auth-token"] ||
					refreshResponse.data?.token;

				if (newToken) {
					console.log("✅ [mktAxios] Nuevo token obtenido");
					authTokenService.setToken(newToken);
					secureStorage.setAuthToken(newToken);
					if (originalRequest.headers) {
						originalRequest.headers.Authorization = `Bearer ${newToken}`;
					}
				} else {
					console.warn("⚠️ [mktAxios] Refresh exitoso pero no se obtuvo nuevo token");
				}

				// Reintentar la petición original con el nuevo token
				return mktAxios(originalRequest);
			} catch (refreshError: any) {
				// Si el refresh falla, encolar la petición y mostrar modal de autenticación
				console.log("❌ [mktAxios] Refresh fallido:", refreshError.response?.status, refreshError.response?.data);
				console.log("🔓 [mktAxios] Mostrando modal de sesión expirada...");

				// Marcar como encolada para evitar reencolar
				originalRequest._queued = true;

				const queuedPromise = requestQueueService.enqueue(originalRequest);

				// Emitir evento para que el contexto de autenticación muestre el modal
				window.dispatchEvent(new CustomEvent("showUnauthorizedModal"));
				console.log("📢 [mktAxios] Evento showUnauthorizedModal emitido");

				// Retornar la Promise encolada que se resolverá después del login
				return queuedPromise;
			}
		}

		return Promise.reject(error);
	},
);

export default mktAxios;
