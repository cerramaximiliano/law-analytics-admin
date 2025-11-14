import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";

// Instancia de Axios para la API de autenticación
const authAxios: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_AUTH_URL || "https://api.lawanalytics.app",
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Para manejar cookies httpOnly
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
authAxios.interceptors.request.use(
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
authAxios.interceptors.response.use(
	(response: AxiosResponse) => {
		// Log para debugging
		console.log("🔍 authAxios response URL:", response.config.url);
		console.log("🔍 authAxios response data:", response.data);
		console.log("🔍 authAxios response headers:", response.headers);

		// Capturar token del header si viene
		const token = response.headers["authorization"] || response.headers["x-auth-token"];
		if (token) {
			const cleanToken = token.replace("Bearer ", "");
			console.log("✅ Token capturado del header de respuesta:", cleanToken.substring(0, 20) + "...");
			authTokenService.setToken(cleanToken);
			secureStorage.setAuthToken(cleanToken);
		}

		// Si la respuesta contiene un token en el body (por ejemplo, en /api/auth/login)
		if (response.data?.token) {
			console.log("✅ Token encontrado en response.data.token:", response.data.token.substring(0, 20) + "...");
			authTokenService.setToken(response.data.token);
			secureStorage.setAuthToken(response.data.token);
		}

		return response;
	},
	async (error) => {
		const originalRequest = error.config;
		const url = originalRequest?.url || "";

		// Si es un error 401 y NO es una petición de autenticación
		if (
			error.response?.status === 401 &&
			!originalRequest._retry &&
			!originalRequest._queued &&
			!url.includes("/login") &&
			!url.includes("/admin-login") &&
			!url.includes("/register") &&
			!url.includes("/google") &&
			!url.includes("/refresh-token") &&
			!url.includes("/logout") &&
			!url.includes("/api/auth/me") // No intentar refresh en la verificación inicial
		) {
			originalRequest._retry = true;

			try {
				// Intentar refrescar el token
				const refreshResponse = await authAxios.post("/api/auth/refresh-token", {}, { withCredentials: true });

				// Obtener el nuevo token y reintentar la petición original
				const newToken = getAuthToken();
				if (newToken && originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
				}

				// Reintentar la petición original
				return authAxios(originalRequest);
			} catch (refreshError) {
				// Si el refresh falla, encolar la petición y mostrar modal de autenticación
				// en lugar de redirigir directamente al login
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

export default authAxios;
