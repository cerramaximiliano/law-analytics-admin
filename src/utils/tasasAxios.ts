import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
import { refrescarSesion, esSesionTerminada } from "services/sessionRefreshService";
import { requestQueueService } from "services/requestQueueService";

// Instancia de Axios para la API de Tasas (admin.lawanalytics.app)
const tasasAxios: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_TASAS_URL || "https://admin.lawanalytics.app",
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

const getAuthToken = () => {
	const secureToken = secureStorage.getAuthToken();
	if (secureToken) return secureToken;

	const serviceToken = authTokenService.getToken();
	if (serviceToken) return serviceToken;

	const token =
		Cookies.get("authToken") ||
		Cookies.get("auth_token") ||
		Cookies.get("token") ||
		Cookies.get("access_token") ||
		Cookies.get("jwt") ||
		Cookies.get("session");
	if (token) return token;

	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (["authToken", "auth_token", "token", "jwt", "session"].includes(name)) {
			return decodeURIComponent(value);
		}
	}

	return (
		localStorage.getItem("token") ||
		localStorage.getItem("authToken") ||
		localStorage.getItem("auth_token") ||
		localStorage.getItem("jwt") ||
		sessionStorage.getItem("token") ||
		sessionStorage.getItem("authToken") ||
		sessionStorage.getItem("auth_token") ||
		sessionStorage.getItem("jwt") ||
		null
	);
};

tasasAxios.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getAuthToken();
		if (token) {
			// En producción setear la cookie con domain .lawanalytics.app para que sea
			// accesible desde admin.lawanalytics.app (el servidor lee req.cookies.access_token)
			const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
			const cookieOptions = isLocalhost
				? { secure: false, sameSite: "lax" as const }
				: { domain: ".lawanalytics.app", secure: true, sameSite: "none" as const };

			Cookies.set("access_token", token, cookieOptions);
		}
		return config;
	},
	(error) => Promise.reject(error),
);

tasasAxios.interceptors.response.use(
	(response: AxiosResponse) => {
		const token = response.headers["authorization"] || response.headers["x-auth-token"];
		if (token) {
			const cleanToken = token.replace("Bearer ", "");
			authTokenService.setToken(cleanToken);
			secureStorage.setAuthToken(cleanToken);
		}
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

		if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._queued) {
			originalRequest._retry = true;
			try {
				// Un único refresh compartido por todos los clientes: antes cada uno
				// disparaba el suyo y una carga con varios 401 llegaba al límite de
				// 30/min del endpoint.
				const newToken = await refrescarSesion();
				if (newToken && originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
				}
				return tasasAxios(originalRequest);
			} catch (refreshError) {
				// Un 429 del limiter, un 5xx o un corte de red no son una sesión
				// vencida: la petición falla con su propio error y el usuario sigue
				// donde estaba, en vez de ver "Sesión Expirada" sin motivo.
				if (!esSesionTerminada(refreshError)) {
					return Promise.reject(error);
				}

				originalRequest._queued = true;
				const queuedPromise = requestQueueService.enqueue(originalRequest);
				window.dispatchEvent(new CustomEvent("showUnauthorizedModal"));
				return queuedPromise;
			}
		}

		return Promise.reject(error);
	},
);

export default tasasAxios;
