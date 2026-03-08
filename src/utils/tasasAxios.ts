import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
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
			Cookies.set("token", token, { secure: true, sameSite: "none" });
			Cookies.set("authToken", token, { secure: true, sameSite: "none" });
			Cookies.set("auth_token", token, { secure: true, sameSite: "none" });
			if (config.headers) {
				config.headers.Authorization = `Bearer ${token}`;
			}
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
		const originalRequest = error.config;

		if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._queued) {
			originalRequest._retry = true;
			try {
				const authBaseURL = import.meta.env.VITE_AUTH_URL || "https://api.lawanalytics.app";
				const refreshResponse = await axios.post(`${authBaseURL}/api/auth/refresh-token`, {}, { withCredentials: true });

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
				return tasasAxios(originalRequest);
			} catch (_refreshError) {
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
