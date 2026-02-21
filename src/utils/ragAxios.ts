import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";

// Instancia de Axios para la API de RAG (pjn-rag-api)
const ragAxios: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_RAG_URL || "http://localhost:5005",
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

// Helper function to get auth token
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

	const localToken =
		localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("auth_token") || localStorage.getItem("jwt");
	if (localToken) return localToken;

	const sessionToken =
		sessionStorage.getItem("token") ||
		sessionStorage.getItem("authToken") ||
		sessionStorage.getItem("auth_token") ||
		sessionStorage.getItem("jwt");
	if (sessionToken) return sessionToken;

	return null;
};

// Request interceptor to add auth token
ragAxios.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = getAuthToken();
		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

// Response interceptor for error handling and token refresh
ragAxios.interceptors.response.use(
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
				await axios.post(`${authBaseURL}/api/auth/refresh-token`, {}, { withCredentials: true });

				const newToken = getAuthToken();
				if (newToken && originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newToken}`;
				}

				return ragAxios(originalRequest);
			} catch (refreshError) {
				originalRequest._queued = true;
				const queuedPromise = requestQueueService.enqueue(originalRequest);
				window.dispatchEvent(new CustomEvent("showUnauthorizedModal"));
				return queuedPromise;
			}
		}

		return Promise.reject(error);
	},
);

export default ragAxios;
