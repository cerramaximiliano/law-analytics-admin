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

// Helper function to check if token is expired
const isTokenExpired = (token: string): boolean => {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const exp = payload.exp * 1000; // Convertir a milisegundos
		const now = Date.now();
		return exp < now;
	} catch (e) {
		console.warn("⚠️ No se pudo decodificar el token");
		return true; // Considerar expirado si no se puede decodificar
	}
};

// Request interceptor to add auth token
workersAxios.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getAuthToken();

		console.log(`🌐 workersAxios: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
		console.log("🔑 Token disponible:", token ? `${token.substring(0, 20)}...` : "NO");

		// Verificar si el token existe y está expirado
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split(".")[1]));
				const exp = payload.exp * 1000; // Convertir a milisegundos
				const now = Date.now();
				const isExpired = exp < now;
				const expiresIn = Math.floor((exp - now) / 1000 / 60); // Minutos restantes

				console.log("🕐 Token expira en:", expiresIn, "minutos", isExpired ? "(⚠️ EXPIRADO)" : "(✅ Válido)");
				console.log("📅 Token exp:", new Date(exp).toLocaleString());
				console.log("📅 Ahora:", new Date(now).toLocaleString());

				// Si el token está expirado, prevenir la petición y redirigir al login
				if (isExpired) {
					console.error("🚫 workersAxios: Token expirado, previniendo petición");
					// Limpiar tokens expirados
					secureStorage.clearSession();
					authTokenService.clearToken();
					// Redirigir al login
					window.location.href = "/login";
					// Rechazar la petición
					return Promise.reject(new Error("Token has expired"));
				}
			} catch (e) {
				console.warn("⚠️ No se pudo decodificar el token");
			}
		}

		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
			console.log("✅ Authorization header agregado:", config.headers.Authorization.substring(0, 30) + "...");
		} else {
			console.warn("⚠️ No se pudo agregar Authorization header. Token:", !!token, "Headers:", !!config.headers);
		}

		// Log de todos los headers que se enviarán
		console.log("📤 Headers a enviar:", JSON.stringify(config.headers, null, 2));

		return config;
	},
	(error) => {
		console.error("❌ workersAxios: Request error:", error);
		return Promise.reject(error);
	},
);

// Response interceptor for error handling
workersAxios.interceptors.response.use(
	(response: AxiosResponse) => {
		console.log(`✅ workersAxios: Response ${response.status}:`, response.data);
		return response;
	},
	(error) => {
		console.error("❌ workersAxios: Response error:", error.response || error);

		// Si recibimos un 401 del servidor, el token es inválido o expirado
		if (error.response?.status === 401) {
			console.error("🚫 workersAxios: Error 401 - Token inválido o expirado");

			// Limpiar tokens
			secureStorage.clearSession();
			authTokenService.clearToken();

			// Redirigir al login
			window.location.href = "/login";
		}

		return Promise.reject(error);
	},
);

export default workersAxios;
