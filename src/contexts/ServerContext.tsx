import React from "react";
import { createContext, useEffect, useReducer, ReactElement, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { googleLogout } from "@react-oauth/google";
import { CredentialResponse } from "@react-oauth/google";
import { useDispatch } from "react-redux";
import { LOGIN, LOGOUT, REGISTER, SET_NEEDS_VERIFICATION } from "store/reducers/actions";
import { openSnackbar } from "store/reducers/snackbar";
import authReducer from "store/reducers/auth";
import { logoutUser } from "store/reducers/auth";
import Loader from "components/Loader";
import { AuthProps, ServerContextType, UserProfile, LoginResponse, RegisterResponse, VerifyCodeResponse } from "types/auth";
import { Subscription } from "types/user";
import { Payment } from "store/reducers/ApiService";
import { AppDispatch } from "store";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";
import authTokenService from "services/authTokenService";
import authAxios from "utils/authAxios";
import { UnauthorizedModal } from "sections/auth/UnauthorizedModal";

const initialState: AuthProps = {
	isLoggedIn: false,
	isInitialized: false,
	user: null,
	needsVerification: false,
	email: "",
};

// Contexto de autenticación
const AuthContext = createContext<ServerContextType | null>(null);

interface AuthProviderProps {
	children: ReactElement;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [state, localDispatch] = useReducer(authReducer, initialState);
	const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState<boolean>(false);
	const [showUnauthorizedModal, setShowUnauthorizedModal] = useState<boolean>(false);
	const navigate = useNavigate();
	const location = useLocation();
	const [isLogoutProcess, setIsLogoutProcess] = useState(false);
	const reduxDispatch = useDispatch<AppDispatch>();

	// Configuración global de axios
	useEffect(() => {
		axios.defaults.withCredentials = true;
	}, []);

	// Procesar la cola de peticiones pendientes
	const processRequestQueue = useCallback(async () => {
		if (requestQueueService.hasQueuedRequests()) {
			// Pequeña demora para asegurar que el token se haya propagado
			await new Promise((resolve) => setTimeout(resolve, 100));
			await requestQueueService.processQueue(axios);
			window.dispatchEvent(new CustomEvent("requestQueueProcessed"));
		}
	}, []);

	// Listener para mostrar el modal cuando los interceptores lo soliciten
	useEffect(() => {
		const handleShowModal = () => {
			setShowUnauthorizedModal(true);
		};

		window.addEventListener("showUnauthorizedModal", handleShowModal);

		return () => {
			window.removeEventListener("showUnauthorizedModal", handleShowModal);
		};
	}, []);

	// Mostrar notificaciones
	const showSnackbar = useCallback(
		(message: string, color: "success" | "error" | "info" = "success") => {
			reduxDispatch(
				openSnackbar({
					open: true,
					message,
					variant: "alert",
					alert: { color },
					close: false,
				}),
			);
		},
		[reduxDispatch],
	);

	// Función unificada de logout
	const logout = async (showMessage = true): Promise<void> => {
		try {
			setIsLogoutProcess(true);
			navigate("/login", { replace: true });

			await authAxios.post("/api/auth/logout");

			// Limpiar estado local
			if (isGoogleLoggedIn) {
				googleLogout();
				setIsGoogleLoggedIn(false);
			}

			// Limpiar toda la sesión de forma segura
			secureStorage.clearSession();

			// Limpiar la cola de peticiones pendientes
			requestQueueService.clear();

			// Limpiar tokens
			authTokenService.removeToken();

			// Despachar LOGOUT a Redux y local reducer
			reduxDispatch(logoutUser());
			localDispatch({ type: LOGOUT });

			// Disparar evento para reinicializar Google OAuth Provider
			window.dispatchEvent(new Event("reinit-google-oauth"));

			if (showMessage) {
				showSnackbar("Sesión cerrada correctamente", "success");
			}
		} catch (error) {
			console.error("Error during logout:", error);
		} finally {
			setIsLogoutProcess(false);
		}
	};

	// Función de login
	const login = async (email: string, password: string, recaptchaToken?: string): Promise<void> => {
		try {
			const response = await authAxios.post<LoginResponse>("/api/auth/login", {
				email,
				password,
				recaptchaToken,
			});

			const { user, subscription, paymentHistory, customer } = response.data;

			// Guardar en Redux y local reducer
			reduxDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription: subscription || undefined,
					paymentHistory: paymentHistory || undefined,
					customer: customer || undefined,
				},
			});

			localDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription: subscription || undefined,
					paymentHistory: paymentHistory || undefined,
					customer: customer || undefined,
				},
			});

			// Procesar cola de peticiones pendientes
			await processRequestQueue();

			showSnackbar(`Bienvenido ${user.firstName || user.email}!`, "success");
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al iniciar sesión";
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Función de Google login
	const googleLogin = async (credential: CredentialResponse): Promise<void> => {
		try {
			const response = await authAxios.post<LoginResponse>("/api/auth/google", {
				token: credential.credential,
			});

			const { user, subscription, paymentHistory, customer } = response.data;

			setIsGoogleLoggedIn(true);

			reduxDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription: subscription || undefined,
					paymentHistory: paymentHistory || null,
					customer: customer || null,
				},
			});

			localDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription: subscription || undefined,
					paymentHistory: paymentHistory || undefined,
					customer: customer || undefined,
				},
			});

			await processRequestQueue();

			showSnackbar(`Bienvenido ${user.firstName || user.email}!`, "success");
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al iniciar sesión con Google";
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Funciones wrapper para el UnauthorizedModal (deben retornar boolean)
	const handleModalLogin = async (email: string, password: string): Promise<boolean> => {
		try {
			await login(email, password);
			setShowUnauthorizedModal(false);
			return true;
		} catch (error) {
			return false;
		}
	};

	const handleModalGoogleLogin = async (credential: CredentialResponse): Promise<boolean> => {
		try {
			await googleLogin(credential);
			setShowUnauthorizedModal(false);
			return true;
		} catch (error) {
			return false;
		}
	};

	const handleModalLogout = () => {
		setShowUnauthorizedModal(false);
		requestQueueService.clearQueue();
		logout(false);
	};

	// Función de registro
	const register = async (
		email: string,
		password: string,
		firstName: string,
		lastName: string,
		recaptchaToken?: string,
	): Promise<void> => {
		try {
			const response = await authAxios.post<RegisterResponse>("/api/auth/register", {
				email,
				password,
				firstName,
				lastName,
				recaptchaToken,
			});

			const { user } = response.data;

			reduxDispatch({
				type: REGISTER,
				payload: {
					user,
				},
			});

			localDispatch({
				type: REGISTER,
				payload: {
					user,
				},
			});

			showSnackbar("Registro exitoso! Por favor verifica tu email.", "success");
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al registrar usuario";
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Función de verificación de código
	const verifyCode = async (email: string, code: string): Promise<void> => {
		try {
			const response = await authAxios.post<VerifyCodeResponse>("/api/auth/verify-code", {
				email,
				code,
			});

			const { user, subscription, paymentHistory, customer } = response.data;

			reduxDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription: subscription || undefined,
					paymentHistory: paymentHistory || null,
					customer: customer || null,
				},
			});

			localDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription: subscription || undefined,
					paymentHistory: paymentHistory || undefined,
					customer: customer || undefined,
				},
			});

			await processRequestQueue();

			showSnackbar("Verificación exitosa!", "success");
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al verificar código";
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Función de actualización de usuario
	const updateProfile = async (userData: Partial<UserProfile>): Promise<void> => {
		try {
			const response = await authAxios.put("/api/auth/update", userData);

			const updatedUser = response.data.user;

			reduxDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user: updatedUser,
				},
			});

			localDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user: updatedUser,
				},
			});

			showSnackbar("Perfil actualizado correctamente", "success");
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al actualizar perfil";
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Función de reset de contraseña
	const resetPassword = async (email: string): Promise<void> => {
		try {
			await authAxios.post("/api/auth/reset-request", { email });
			showSnackbar("Se ha enviado un email con instrucciones para resetear tu contraseña", "success");
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al solicitar reset de contraseña";
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Inicialización: verificar si el usuario ya está autenticado
	useEffect(() => {
		const init = async () => {
			try {
				const response = await authAxios.get("/api/auth/me");

				const { user, subscription, paymentHistory, customer } = response.data;

				if (user) {
					localDispatch({
						type: LOGIN,
						payload: {
							isLoggedIn: true,
							isInitialized: true,
							user,
							subscription: subscription || undefined,
							paymentHistory: paymentHistory || null,
							customer: customer || null,
						},
					});

					reduxDispatch({
						type: LOGIN,
						payload: {
							isLoggedIn: true,
							isInitialized: true,
							user,
							subscription: subscription || undefined,
							paymentHistory: paymentHistory || null,
							customer: customer || null,
						},
					});
				} else {
					localDispatch({
						type: LOGOUT,
						payload: {
							isInitialized: true,
						},
					});
					// Reinicializar Google OAuth cuando no hay sesión
					window.dispatchEvent(new Event("reinit-google-oauth"));
				}
			} catch (error) {
				console.error("Error verifying session:", error);
				localDispatch({
					type: LOGOUT,
					payload: {
						isInitialized: true,
					},
				});
				// Reinicializar Google OAuth cuando hay error de sesión
				window.dispatchEvent(new Event("reinit-google-oauth"));
			}
		};

		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Solo ejecutar una vez al montar

	// Interceptores de Axios para manejar tokens y errores
	useEffect(() => {
		// Interceptor de respuesta para capturar tokens
		const responseInterceptor = axios.interceptors.response.use(
			(response) => {
				// Capturar token del header si viene
				const authHeader = response.headers["authorization"] || response.headers["x-auth-token"];
				if (authHeader) {
					const token = authHeader.replace("Bearer ", "");
					authTokenService.setToken(token);
					secureStorage.setAuthToken(token);
				}
				return response;
			},
			async (error: AxiosError) => {
				if (!error.config) {
					return Promise.reject(error);
				}

				const originalRequest = error.config as any;
				const url = originalRequest.url || "";

				// Para evitar bucles infinitos
				if (originalRequest._hasBeenHandled) {
					return Promise.reject(error);
				}

				originalRequest._hasBeenHandled = true;

				if (isLogoutProcess) {
					return Promise.reject(error);
				}

				// Si es 401 y no es una petición de autenticación, intentar refresh
				if (
					error.response?.status === 401 &&
					!url.includes("/api/auth/login") &&
					!url.includes("/api/auth/google") &&
					!url.includes("/api/auth/refresh-token") &&
					!url.includes("/api/auth/logout") &&
					!url.includes("/api/auth/me") // Excluir /api/auth/me para evitar problemas
				) {
					// Si el backend indica que necesita refresh
					if (error.response?.data && (error.response.data as any).needRefresh === true) {
						try {
							// Intentar refresh del token
							const refreshResponse = await authAxios.post("/api/auth/refresh-token");

							if (refreshResponse.status === 200) {
								return axios({
									...originalRequest,
									_hasBeenHandled: false,
								});
							}
						} catch (refreshError) {
							// Si no es una petición ya encolada y no es una petición de retry
							if (!originalRequest._queued && !originalRequest._retry) {
								// Encolar la petición para reintentar después de la autenticación
								const queuedPromise = requestQueueService.enqueue(originalRequest);
								setShowUnauthorizedModal(true);
								return queuedPromise;
							}

							return Promise.reject(refreshError);
						}
					} else {
						// Si no necesita refresh, encolar la petición si no ha sido encolada
						if (!originalRequest._queued && !originalRequest._retry) {
							const queuedPromise = requestQueueService.enqueue(originalRequest);
							setShowUnauthorizedModal(true);
							return queuedPromise;
						}
					}
				}

				return Promise.reject(error);
			},
		);

		return () => {
			axios.interceptors.response.eject(responseInterceptor);
		};
	}, [isLogoutProcess, logout]);

	// Si no está inicializado, mostrar loader
	if (!state.isInitialized) {
		return <Loader />;
	}

	return (
		<AuthContext.Provider
			value={{
				...state,
				login,
				logout,
				register,
				googleLogin,
				loginWithGoogle: googleLogin, // Alias para compatibilidad
				verifyCode,
				updateProfile,
				resetPassword,
			}}
		>
			{children}
			<UnauthorizedModal
				open={showUnauthorizedModal}
				onClose={() => setShowUnauthorizedModal(false)}
				onLogin={handleModalLogin}
				onGoogleLogin={handleModalGoogleLogin}
				onLogout={handleModalLogout}
			/>
		</AuthContext.Provider>
	);
};

export default AuthProvider;
export { AuthContext };
