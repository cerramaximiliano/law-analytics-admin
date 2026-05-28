import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";

// Instancia de Axios para la API de PJ Catamarca (portal IOL)
const pjcatamarcaAxios: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_PJCATAMARCA || "https://pjsal.lawanalytics.app/api",
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: false,
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
pjcatamarcaAxios.interceptors.request.use(
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
pjcatamarcaAxios.interceptors.response.use(
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
		const status = error.response?.status;

		// Si recibimos un 401 o 403 del servidor y no hemos intentado refrescar aún
		if ((status === 401 || status === 403) && !originalRequest._retry && !originalRequest._queued) {
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
				return pjcatamarcaAxios(originalRequest);
			} catch (refreshError) {
				// Si el refresh falla, encolar la petición y mostrar modal de autenticación
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

export default pjcatamarcaAxios;
