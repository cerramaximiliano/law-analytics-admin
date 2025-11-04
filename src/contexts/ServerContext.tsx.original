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
import { UnauthorizedModal } from "../sections/auth/UnauthorizedModal";
import { LimitErrorModal } from "../sections/auth/LimitErrorModal";
import { AuthProps, ServerContextType, UserProfile, LoginResponse, RegisterResponse, VerifyCodeResponse } from "../types/auth";
import { Subscription } from "../types/user";
import { Payment } from "store/reducers/ApiService";
import { fetchUserStats } from "store/reducers/userStats";
import { AppDispatch } from "store";
import secureStorage from "services/secureStorage";
import { requestQueueService } from "services/requestQueueService";
import authTokenService from "services/authTokenService";
import { extractErrorMessage } from "utils/errorMessages";

// Global setting for hiding international banking data
export const HIDE_INTERNATIONAL_BANKING_DATA = import.meta.env.VITE_HIDE_BANKING_DATA === "true";

const initialState: AuthProps = {
	isLoggedIn: false,
	isInitialized: false,
	user: null,
	needsVerification: false,
	email: "",
};

// Definir el contexto de autenticación unificado
const AuthContext = createContext<ServerContextType | null>(null);

interface AuthProviderProps {
	children: ReactElement;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [state, localDispatch] = useReducer(authReducer, initialState);
	const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState<boolean>(false);
	const [showUnauthorizedModal, setShowUnauthorizedModal] = useState<boolean>(false);
	const [showLimitErrorModal, setShowLimitErrorModal] = useState<boolean>(false);
	const [limitErrorData, setLimitErrorData] = useState<any>({});
	const [hasPlanRestrictionError, setHasPlanRestrictionError] = useState<boolean>(false);
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
			await requestQueueService.processQueue(axios);
			// Emitir un evento para que los componentes se actualicen
			window.dispatchEvent(new CustomEvent("requestQueueProcessed"));
		}
	}, []);

	// Mostrar notificaciones
	const showSnackbar = useCallback((message: string, color: "success" | "error" | "info" = "success") => {
		reduxDispatch(
			openSnackbar({
				open: true,
				message,
				variant: "alert",
				alert: { color },
				close: false,
			}),
		);
	}, []);

	// Función unificada de logout
	const logout = async (showMessage = true): Promise<void> => {
		try {
			setIsLogoutProcess(true);
			navigate("/login", { replace: true });

			await axios.post(`${import.meta.env.VITE_BASE_URL}/api/auth/logout`);

			// Limpiar estado local
			if (isGoogleLoggedIn) {
				googleLogout();
				setIsGoogleLoggedIn(false);
				// Token de Google se maneja en cookies httpOnly desde el backend
			}

			// Limpiar toda la sesión de forma segura
			secureStorage.clearSession();

			// Limpiar la cola de peticiones pendientes
			requestQueueService.clearQueue();

			// Limpiar el token del servicio
			authTokenService.clearToken();

			// Actualizar states
			localDispatch({ type: LOGOUT });
			reduxDispatch(logoutUser());

			if (showMessage) {
				showSnackbar("Sesión cerrada correctamente", "info");
			}

			setShowUnauthorizedModal(false);

			setTimeout(() => {
				setIsLogoutProcess(false);
			}, 1000);
		} catch (error) {
			setTimeout(() => {
				setIsLogoutProcess(false);
			}, 1000);
		}
	};

	// Redirección después del logout
	const handleLogoutAndRedirect = async (): Promise<void> => {
		await logout();
		navigate("/login", {
			state: { from: location.pathname },
			replace: true,
		});
	};

	// Iniciar sesión con Google
	const loginWithGoogle = async (tokenResponse: CredentialResponse): Promise<boolean> => {
		try {
			const credential = tokenResponse.credential;
			if (credential) {
				const result = await axios.post<LoginResponse>(`${import.meta.env.VITE_BASE_URL}/api/auth/google`, { token: credential });

				const { user, success, subscription, paymentHistory, customer } = result.data;

				if (success) {
					setIsGoogleLoggedIn(true);
					// El token de Google debe ser manejado por el backend en cookies httpOnly
					// NO almacenar tokens en el frontend

					localDispatch({
						type: LOGIN,
						payload: {
							isLoggedIn: true,
							user,
							subscription,
							paymentHistory,
							customer,
						},
					});

					reduxDispatch({
						type: LOGIN,
						payload: {
							isLoggedIn: true,
							user,
							subscription,
							paymentHistory,
							customer,
						},
					});

					reduxDispatch(fetchUserStats());

					// Verificar conexión previa con Google Calendar
					const { checkGoogleCalendarConnection } = await import("store/reducers/googleCalendar");
					reduxDispatch(checkGoogleCalendarConnection());

					showSnackbar("¡Inicio de sesión con Google exitoso!", "success");

					// Procesar la cola de peticiones pendientes después de login exitoso
					await processRequestQueue();

					return true;
				} else {
					throw new Error("No se pudo autenticar. Intenta nuevamente.");
				}
			}
			throw new Error("No se recibió credencial de Google");
		} catch (error) {
			showSnackbar("Error al iniciar sesión con Google", "error");
			throw error;
		}
	};

	// Inicialización de la autenticación
	useEffect(() => {
		const init = async (): Promise<void> => {
			try {
				// Verificar la sesión actual con el token en cookies
				const response = await axios.get<{
					user: UserProfile;
					subscription?: Subscription;
					paymentHistory?: Payment[];
					customer?: { id: string; email: string | null };
				}>(`${import.meta.env.VITE_BASE_URL}/api/auth/me`);
				const { user, subscription, paymentHistory, customer } = response.data;

				localDispatch({
					type: LOGIN,
					payload: {
						isLoggedIn: true,
						user,
						isInitialized: true,
						subscription,
						paymentHistory,
						customer,
					},
				});

				reduxDispatch({
					type: LOGIN,
					payload: {
						isLoggedIn: true,
						user,
						isInitialized: true,
						subscription,
						paymentHistory,
						customer,
					},
				});

				reduxDispatch(fetchUserStats());

				// Verificar conexión previa con Google Calendar
				const { checkGoogleCalendarConnection } = await import("store/reducers/googleCalendar");
				reduxDispatch(checkGoogleCalendarConnection());
			} catch (error) {
				// No redirigir al login, solo inicializar el estado como logged out
				// Solo mostrar errores que no sean 401 para evitar ruido en los logs durante el registro
				if (axios.isAxiosError(error) && error.response?.status !== 401) {
				}

				localDispatch({
					type: LOGOUT,
					payload: {
						isInitialized: true,
					},
				});

				reduxDispatch({
					type: LOGOUT,
				});
			}
		};

		init();
	}, []);

	// Interceptor unificado de axios
	useEffect(() => {
		// Variable para almacenar los IDs de interceptores (para limpieza)
		const interceptors: number[] = [];

		// Interceptor de solicitud para ver qué peticiones se están haciendo
		const requestInterceptor = axios.interceptors.request.use(
			(config) => {
				return config;
			},
			(error) => {
				return Promise.reject(error);
			},
		);

		interceptors.push(requestInterceptor);

		// Crear un nuevo interceptor de respuesta para ver errores
		const responseInterceptor = axios.interceptors.response.use(
			(response) => {
				// Check if response contains auth token in headers or data
				const authHeader = response.headers["authorization"] || response.headers["x-auth-token"];
				const tokenFromData = response.data?.token || response.data?.accessToken || response.data?.authToken;

				if (authHeader) {
					const token = authHeader.replace("Bearer ", "");
					authTokenService.setToken(token);
					// También guardar en secureStorage para persistencia
					secureStorage.setAuthToken(token);
				} else if (tokenFromData) {
					authTokenService.setToken(tokenFromData);
					// También guardar en secureStorage para persistencia
					secureStorage.setAuthToken(tokenFromData);
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

				// Si es un error 401 y no es una petición de autenticación
				if (
					error.response?.status === 401 &&
					!url.includes("/api/auth/login") &&
					!url.includes("/api/auth/google") &&
					!url.includes("/api/auth/refresh-token") &&
					!url.includes("/api/auth/logout") &&
					!url.includes("/api/auth/me") // Excluir /api/auth/me para evitar problemas en registro
				) {
					// Si el backend indica que necesita refresh
					if (error.response?.data && (error.response.data as any).needRefresh === true) {
						try {
							// Intentar refrescar el token automáticamente
							const refreshResponse = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/auth/refresh-token`);

							// Si el refresh es exitoso, reintentar la petición original
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

				// Manejar errores 403 (límites de plan)
				if (error.response?.status === 403) {
					const responseData = error.response.data as any;

					// Verificar si es un error de límite o de característica
					// Condición más amplia para capturar diferentes formatos de respuesta
					if (
						responseData.limitInfo ||
						responseData.featureInfo ||
						responseData.upgradeRequired ||
						responseData.message?.includes("característica") ||
						responseData.message?.includes("plan") ||
						(responseData.success === false && responseData.data && responseData.data.feature)
					) {
						// Analizar si la respuesta tiene estructura específica de feature
						let featureInfo = responseData.featureInfo;
						if (responseData.data && responseData.data.feature) {
							featureInfo = {
								feature: responseData.data.feature || "Característica premium",
								plan: responseData.data.currentPlan || "Tu plan actual",
								availableIn: responseData.data.requiredPlan ? [responseData.data.requiredPlan] : ["Plan premium"],
							};
						}

						setLimitErrorData({
							message: responseData.message || "Esta característica no está disponible en tu plan actual",
							limitInfo: responseData.limitInfo,
							featureInfo: featureInfo,
							upgradeRequired: responseData.upgradeRequired || true,
						});

						// 1. Primero capturamos todos los diálogos abiertos en este momento
						// para cerrarlos específicamente y no afectar a otros componentes
						const openDialogsBeforeError = Array.from(document.querySelectorAll(".MuiDialog-root"));

						// 2. Marcar que estamos en medio de un error de restricción del plan ANTES de cualquier otra acción
						// Esto es importante para que otros componentes lo detecten y actúen en consecuencia
						setHasPlanRestrictionError(true);

						// 3. Emitir evento personalizado para componentes que tengan manejadores específicos
						// Esto permite a los componentes como LinkToJudicialPower cancelar sus operaciones
						const planRestrictionEvent = new CustomEvent("planRestrictionError", {
							detail: {
								message: responseData.message,
								feature: responseData.data?.feature || null,
								timestamp: Date.now(),
								// Añadir información sobre los diálogos que se encontraban abiertos
								openDialogsCount: openDialogsBeforeError.length,
							},
						});

						window.dispatchEvent(planRestrictionEvent);

						// 4. CAMBIO DE ENFOQUE: NO cerrar modales directamente para evitar efectos secundarios
						// Este método anterior está provocando problemas al hacer clic en botones

						// Crear propiedad global para forzar cierre de modales
						// Los componentes individuales deberán observar esta propiedad y cerrar sus propios modales
						window.FORCE_CLOSE_ALL_MODALS = true;

						// Programar la limpieza del estado global después de un tiempo suficiente
						setTimeout(() => {
							window.FORCE_CLOSE_ALL_MODALS = false;
						}, 2000);

						// 5. Esperar un poco antes de mostrar el modal de restricción del plan
						// para permitir que todos los diálogos se cierren correctamente
						setTimeout(() => {
							setShowLimitErrorModal(true);

							// 6. Programar reinicio del estado después de que se maneje todo
							setTimeout(() => {
								setHasPlanRestrictionError(false);
							}, 3000);
						}, 300);
					}
				}

				return Promise.reject(error);
			},
		);

		// Añadir el ID del interceptor a la lista para limpieza
		interceptors.push(responseInterceptor);

		// Limpiar todos los interceptores al desmontar
		return () => {
			interceptors.forEach((id) => {
				axios.interceptors.response.eject(id);
			});
		};
	}, [isLogoutProcess]);

	// Login normal
	const login = async (email: string, password: string): Promise<boolean> => {
		try {
			const response = await axios.post<LoginResponse>(`${import.meta.env.VITE_BASE_URL}/api/auth/login`, { email, password });

			const { user, subscription, paymentHistory, customer } = response.data;

			localDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription,
					paymentHistory,
					customer,
				},
			});

			reduxDispatch({
				type: LOGIN,
				payload: {
					isLoggedIn: true,
					user,
					subscription,
					paymentHistory,
					customer,
				},
			});

			reduxDispatch(fetchUserStats());

			showSnackbar("¡Inicio de sesión exitoso!", "success");

			// Procesar la cola de peticiones pendientes después de login exitoso
			await processRequestQueue();

			return true;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				if ((error.response.data as any).loginFailed) {
					throw new Error("Credenciales inválidas");
				}
				// Handle specific HTTP status codes
				if (error.response.status === 404) {
					throw new Error("El servicio de autenticación no está disponible");
				} else if (error.response.status === 500) {
					throw new Error("Error del servidor. Por favor, intente más tarde");
				} else if (error.response.status === 503) {
					throw new Error("Servicio temporalmente no disponible");
				}
			} else if (axios.isAxiosError(error) && error.code === "ECONNREFUSED") {
				throw new Error("No se puede conectar con el servidor");
			}

			throw error;
		}
	};

	// Registro
	const register = async (
		email: string,
		password: string,
		firstName: string,
		lastName: string,
	): Promise<{ email: string; isLoggedIn: boolean; needsVerification: boolean }> => {
		try {
			const response = await axios.post<RegisterResponse>(`${import.meta.env.VITE_BASE_URL}/api/auth/register`, {
				email,
				password,
				firstName,
				lastName,
			});

			// Siempre necesitará verificación para nuevos registros
			const { user } = response.data;

			// Actualizar el estado local primero
			localDispatch({
				type: REGISTER,
				payload: {
					isLoggedIn: false, // Siempre false hasta que se verifique
					user,
					email,
					needsVerification: true,
				},
			});

			// Luego actualizar el estado global de Redux
			reduxDispatch({
				type: REGISTER,
				payload: {
					isLoggedIn: false, // Siempre false hasta que se verifique
					user,
					email,
					needsVerification: true,
				},
			});

			// Verificación adicional: usar la acción específica para asegurar que needsVerification sea true
			reduxDispatch({
				type: SET_NEEDS_VERIFICATION,
				payload: { email },
			});

			showSnackbar("Registro exitoso", "success");

			return { email, isLoggedIn: false, needsVerification: true };
		} catch (error) {
			showSnackbar(extractErrorMessage(error), "error");
			throw error;
		}
	};

	// Verificar código
	const verifyCode = async (email: string, code: string): Promise<any> => {
		try {
			// Enviar email y code directamente al endpoint verify-code
			const response = await axios.post<VerifyCodeResponse>(`${import.meta.env.VITE_BASE_URL}/api/auth/verify-code`, {
				email,
				code,
			});

			if (response.data.success) {
				// Extraer el objeto usuario si está disponible en la respuesta
				const userData = response.data.user;
				const subscription = response.data.subscription;

				if (userData) {
					// Actualizar el estado con los datos del usuario
					localDispatch({
						type: LOGIN,
						payload: {
							isLoggedIn: true,
							user: userData,
							needsVerification: false,
							subscription,
						},
					});

					// También actualizar el estado global de Redux
					reduxDispatch({
						type: LOGIN,
						payload: {
							isLoggedIn: true,
							user: userData,
							needsVerification: false,
							subscription,
						},
					});

					// Cargar estadísticas de usuario si es necesario
					reduxDispatch(fetchUserStats());

					// Verificar conexión previa con Google Calendar
					const { checkGoogleCalendarConnection } = await import("store/reducers/googleCalendar");
					reduxDispatch(checkGoogleCalendarConnection());
				}

				setNeedsVerification(false);
				showSnackbar("Cuenta verificada con éxito", "success");

				// Devolver los datos completos de la respuesta para que el componente
				// pueda acceder a los datos del usuario si es necesario
				return response.data;
			} else {
				throw new Error(response.data.message || "Error de verificación");
			}
		} catch (error) {
			const errorMessage = extractErrorMessage(error);
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	// Restablecer contraseña
	const resetPassword = async (email: string): Promise<void> => {
		try {
			await axios.post(`${import.meta.env.VITE_BASE_URL}/api/auth/reset-request`, { email });
			showSnackbar("Instrucciones enviadas a tu correo", "success");
		} catch (error) {
			showSnackbar("Error al solicitar restablecimiento de contraseña", "error");
			throw error;
		}
	};

	// Actualizar perfil
	const updateProfile = async (userData: Partial<UserProfile>): Promise<void> => {
		try {
			const response = await axios.put<{ user: UserProfile }>(`${import.meta.env.VITE_BASE_URL}/api/auth/update-profile`, userData);

			const { user } = response.data;

			localDispatch({ type: LOGIN, payload: { isLoggedIn: true, user } });
			reduxDispatch({ type: LOGIN, payload: { isLoggedIn: true, user } });

			showSnackbar("Perfil actualizado correctamente", "success");
		} catch (error) {
			showSnackbar("Error al actualizar el perfil", "error");
			throw error;
		}
	};

	// Helpers para estado
	const setIsLoggedIn = (value: boolean) => {
		localDispatch({
			type: value ? LOGIN : LOGOUT,
			payload: { isLoggedIn: value },
		});
	};

	const setNeedsVerification = (value: boolean) => {
		localDispatch({
			type: LOGIN,
			payload: {
				isLoggedIn: state.isLoggedIn,
				needsVerification: value,
			},
		});
	};

	const setNewPassword = async (email: string, code: string, newPassword: string): Promise<boolean> => {
		try {
			const response = await axios.post<{ success: boolean; message: string }>(`${import.meta.env.VITE_BASE_URL}/api/auth/reset`, {
				email,
				code,
				newPassword,
			});

			if (response.data.success) {
				showSnackbar("Contraseña restablecida correctamente", "success");
				return true;
			} else {
				throw new Error(response.data.message || "Error al restablecer la contraseña");
			}
		} catch (error) {
			const errorMessage = extractErrorMessage(error);
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	const verifyResetCode = async (email: string, code: string): Promise<boolean> => {
		try {
			const response = await axios.post<{ success: boolean; message: string }>(
				`${import.meta.env.VITE_BASE_URL}/api/auth/verify-reset-code`,
				{
					email,
					code,
				},
			);

			if (response.data.success) {
				showSnackbar("Código verificado correctamente", "success");
				return true;
			} else {
				throw new Error(response.data.message || "Error al verificar el código");
			}
		} catch (error) {
			const errorMessage = extractErrorMessage(error);
			showSnackbar(errorMessage, "error");
			throw error;
		}
	};

	if (!state.isInitialized) {
		return <Loader />;
	}

	return (
		<AuthContext.Provider
			value={{
				...state,
				isGoogleLoggedIn,
				login,
				logout,
				register,
				verifyCode,
				resetPassword,
				updateProfile,
				loginWithGoogle,
				setIsLoggedIn,
				setNeedsVerification,
				handleLogoutAndRedirect,
				verifyResetCode,
				setNewPassword,
				hasPlanRestrictionError,
				hideInternationalBankingData: HIDE_INTERNATIONAL_BANKING_DATA,
			}}
		>
			{children}
			<UnauthorizedModal
				open={showUnauthorizedModal}
				onClose={() => setShowUnauthorizedModal(false)}
				onLogin={login}
				onGoogleLogin={loginWithGoogle}
				onLogout={handleLogoutAndRedirect}
			/>
			<LimitErrorModal
				open={showLimitErrorModal}
				onClose={() => setShowLimitErrorModal(false)}
				message={limitErrorData.message}
				limitInfo={limitErrorData.limitInfo}
				featureInfo={limitErrorData.featureInfo}
				upgradeRequired={limitErrorData.upgradeRequired}
			/>
		</AuthContext.Provider>
	);
};

export default AuthContext;
