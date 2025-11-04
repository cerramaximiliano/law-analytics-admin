import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";

// Instancia de Axios para la API de workers
const workersAxios: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_WORKERS_URL || "http://localhost:3035",
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
		"ngrok-skip-browser-warning": "true", // Requiere configuración de CORS en el backend
	},
	withCredentials: false, // No necesitamos cookies, usamos Authorization header
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
workersAxios.interceptors.request.use(
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
workersAxios.interceptors.response.use(
	(response: AxiosResponse) => {
		return response;
	},
	async (error) => {
		const originalRequest = error.config;

		// Si recibimos un 401 del servidor y no hemos intentado refrescar aún
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				// Intentar refrescar el token usando la API de autenticación
				const authBaseURL = import.meta.env.VITE_AUTH_URL || "https://api.lawanalytics.app";
				await axios.post(`${authBaseURL}/api/auth/refresh-token`, {}, { withCredentials: true });

				// Obtener el nuevo token y reintentar la petición original
				const newToken = getAuthToken();
				if (newToken && originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
				}

				// Reintentar la petición original
				return workersAxios(originalRequest);
			} catch (refreshError) {
				// Si el refresh falla, limpiar tokens y redirigir al login
				secureStorage.clearSession();
				authTokenService.clearToken();

				// Solo redirigir si no estamos ya en la página de login
				if (!window.location.pathname.includes("/login")) {
					window.location.href = "/login";
				}

				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	},
);

export default workersAxios;
