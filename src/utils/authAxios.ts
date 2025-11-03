import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";

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

// Helper function to check if token is expired
const isTokenExpired = (token: string): boolean => {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const exp = payload.exp * 1000; // Convertir a milisegundos
		const now = Date.now();
		return exp < now;
	} catch (e) {
		console.warn("⚠️ authAxios: No se pudo decodificar el token");
		return true; // Considerar expirado si no se puede decodificar
	}
};

// Request interceptor to add auth token
authAxios.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getAuthToken();

		// Verificar si el token existe y está expirado
		// PERO solo prevenir si NO es una petición de login/registro
		const isAuthEndpoint = config.url?.includes("/login") || config.url?.includes("/register") || config.url?.includes("/google");

		if (token) {
			// Verificar expiración
			if (!isAuthEndpoint && isTokenExpired(token)) {
				console.error("🚫 authAxios: Token expirado, previniendo petición");
				// Limpiar tokens expirados
				secureStorage.clearSession();
				authTokenService.clearToken();
				// Redirigir al login
				window.location.href = "/login";
				// Rechazar la petición
				return Promise.reject(new Error("Token has expired"));
			}

			// Si el token es válido o es un endpoint de auth, agregar header
			if (config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Response interceptor for error handling
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
	(error) => {
		// No manejar 401 aquí - dejar que el interceptor de ServerContext lo maneje
		// para evitar múltiples redirects y loops
		return Promise.reject(error);
	},
);

export default authAxios;
