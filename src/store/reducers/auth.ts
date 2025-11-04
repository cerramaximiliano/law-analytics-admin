// action - state management
import {
	REGISTER,
	LOGIN,
	LOGOUT,
	UPDATE_PICTURE,
	UPDATE_USER,
	CHANGE_PASSWORD_SUCCESS,
	SET_NEEDS_VERIFICATION,
	UPDATE_SUBSCRIPTION,
	UPDATE_PAYMENT_HISTORY,
	ADD_USER_SKILLS,
	DELETE_USER_SKILL,
} from "./actions";
import axios from "axios";

// types
import { AuthProps, AuthActionProps } from "types/auth";
import { RootState } from "store";
import { Dispatch } from "redux";
import { openSnackbar } from "store/reducers/snackbar";
import { UserProfile } from "types/auth";
import { Subscription } from "types/user";
import { Payment } from "./ApiService";
import { resetFoldersState } from "./folder";
import { resetContactsState } from "./contacts";
import { resetCalculatorsState } from "./calculator";
import { extractErrorMessage } from "utils/errorMessages";

// initial state
export const initialState: AuthProps = {
	isLoggedIn: false,
	isInitialized: true, // Cambiar a true por defecto
	user: null, // Cambiar a null en lugar de objeto vacío
	email: "",
	needsVerification: false,
	subscription: null,
	paymentHistory: null,
	customer: null,
};

// ==============================|| AUTH REDUCER ||============================== //

const auth = (state = initialState, action: AuthActionProps) => {
	switch (action.type) {
		case REGISTER: {
			const { user, email, needsVerification, subscription, paymentHistory, customer } = action.payload!;
			return {
				...state,
				user,
				isInitialized: true,
				email,
				needsVerification: needsVerification || false,
				subscription: subscription || null,
				paymentHistory: paymentHistory || null,
				customer: customer || null,
			};
		}
		case LOGIN: {
			const { user, email, needsVerification, subscription, paymentHistory, customer } = action.payload!;
			return {
				...state,
				isLoggedIn: true,
				isInitialized: true,
				user,
				email, // Guarda el correo en el estado
				needsVerification: needsVerification || false,
				subscription: subscription || null,
				paymentHistory: paymentHistory || null,
				customer: customer || null,
			};
		}
		case UPDATE_PICTURE: {
			const { picture } = action.payload!;
			return {
				...state,
				user: {
					...(state.user || {}), // Usa un objeto vacío si `user` es null o undefined
					picture, // Actualiza la propiedad picture
				},
			};
		}
		case UPDATE_USER: {
			const payload = action.payload as { userData: Partial<UserProfile> };
			const { userData } = payload;
			return {
				...state,
				user: state.user
					? {
							...state.user,
							...userData,
					  }
					: (userData as UserProfile),
			};
		}
		case CHANGE_PASSWORD_SUCCESS: {
			// No necesitamos modificar el estado cuando se cambia la contraseña
			// pero podríamos agregar un indicador si fuera necesario
			return {
				...state,
				// passwordChanged: true (opcional)
			};
		}
		case SET_NEEDS_VERIFICATION: {
			return {
				...state,
				email: action.payload?.email || state.email,
				needsVerification: true,
			};
		}
		case UPDATE_SUBSCRIPTION: {
			return {
				...state,
				subscription: action.payload?.subscription || null,
			};
		}
		case UPDATE_PAYMENT_HISTORY: {
			return {
				...state,
				paymentHistory: action.payload?.paymentHistory || null,
				customer: action.payload?.customer || null,
			};
		}
		case LOGOUT: {
			return {
				...initialState,
				isInitialized: true,
			};
		}
		case ADD_USER_SKILLS: {
			const { skills } = action.payload!;
			return {
				...state,
				user: state.user
					? {
							...state.user,
							skill: skills,
					  }
					: null,
			};
		}
		case DELETE_USER_SKILL: {
			const { skills } = action.payload!;
			return {
				...state,
				user: state.user
					? {
							...state.user,
							skill: skills,
					  }
					: null,
			};
		}
		default: {
			return { ...state };
		}
	}
};

export default auth;

// ==============================|| ACTIONS ||============================== //
interface LoginPayload {
	user?: any;
	email?: string;
	needsVerification?: boolean;
	subscription?: Subscription;
}

interface PasswordChangeData {
	currentPassword: string;
	newPassword: string;
}

// Acción para obtener los datos de autenticación desde el store
export const fetchAuth = () => (dispatch: Dispatch, getState: () => RootState) => {
	// Obtiene los datos de autenticación desde el estado actual
	const { user, email, isLoggedIn, needsVerification } = getState().auth;
	return async () => {
		dispatch({
			type: LOGIN,
			payload: {
				user,
				email,
				isLoggedIn,
				needsVerification,
			},
		});
	};
};

// Acción para registrar al usuario en el estado sin hacer una llamada a la API
export const registerUser =
	(user: any, email: string, needsVerification: boolean = false) =>
	(dispatch: Dispatch) => {
		dispatch({
			type: REGISTER,
			payload: {
				user,
				email,
				needsVerification,
			},
		});
	};

// Acción para iniciar sesión y actualizar el estado usando los datos actuales del store
export const loginUser = (payload: LoginPayload) => (dispatch: Dispatch) => {
	dispatch({
		type: LOGIN,
		payload: {
			...payload,
			isLoggedIn: true,
		},
	});
};

export const updatePicture = (picture: string) => (dispatch: Dispatch) => {
	dispatch({
		type: UPDATE_PICTURE,
		payload: { picture },
	});
};

// NUEVA ACCIÓN: Actualizar usuario con llamada a la API
export const updateUser = (userData: any) => (dispatch: Dispatch) => {
	// Solo actualizar el estado con los datos recibidos
	dispatch({
		type: UPDATE_USER,
		payload: { userData },
	});
};

// Acción para actualizar el perfil del usuario con llamada a la API
export const updateUserProfile = (profileData: any) => async (dispatch: Dispatch, getState: () => RootState) => {
	try {
		// Realizar la llamada a la API
		const response = await axios.put(`${import.meta.env.VITE_BASE_URL}/api/auth/update`, profileData, {
			withCredentials: true,
		});

		// Si la actualización fue exitosa
		if (response.data && response.data.success) {
			// Obtener los datos actualizados del usuario
			const userData = response.data.data;

			// Verificar si hay un puntaje de completitud en la respuesta
			// Si no existe, calcularlo manualmente basado en los campos completados
			if (userData && !userData.profileCompletionScore) {
				// Array de campos requeridos para un perfil completo
				const requiredFields = ["firstName", "lastName", "email", "dob", "contact", "designation", "address", "country", "state"];

				// Contar cuántos campos están completos
				const completedFields = requiredFields.filter((field) => userData[field] && userData[field].toString().trim() !== "").length;

				// Calcular porcentaje de completitud
				const completionScore = Math.round((completedFields / requiredFields.length) * 100);

				// Añadir el puntaje calculado a los datos del usuario
				userData.profileCompletionScore = completionScore;
			}

			// Actualizar el estado con los datos actualizados
			dispatch({
				type: UPDATE_USER,
				payload: { userData },
			});

			// Mostrar mensaje de éxito
			dispatch(
				openSnackbar({
					open: true,
					message: "Perfil actualizado satisfactoriamente",
					variant: "alert",
					alert: {
						color: "success",
					},
					close: false,
				}),
			);

			return response.data;
		} else {
			throw new Error(response.data.message || "Error al actualizar el perfil");
		}
	} catch (error: any) {
		// Mostrar mensaje de error
		dispatch(
			openSnackbar({
				open: true,
				message: extractErrorMessage(error),
				variant: "alert",
				alert: {
					color: "error",
				},
				close: false,
			}),
		);

		throw error;
	}
};

// Acción para cambiar la contraseña del usuario
export const changeUserPassword = (passwordData: PasswordChangeData) => async (dispatch: Dispatch) => {
	try {
		// Realizar la llamada a la API
		const response = await axios.put(`${import.meta.env.VITE_BASE_URL}/api/auth/change-password`, passwordData, {
			headers: {
				"Content-Type": "application/json",
			},
			withCredentials: true,
		});

		// Si el cambio fue exitoso
		if (response.data && response.data.success) {
			// Despachar acción de éxito
			dispatch({
				type: CHANGE_PASSWORD_SUCCESS,
			});

			// Mostrar mensaje de éxito
			dispatch(
				openSnackbar({
					open: true,
					message: "Contraseña actualizada correctamente",
					variant: "alert",
					alert: {
						color: "success",
					},
					close: false,
				}),
			);

			return response.data;
		} else {
			throw new Error(response.data.message || "Error al cambiar la contraseña");
		}
	} catch (error: any) {
		// Mostrar mensaje de error
		dispatch(
			openSnackbar({
				open: true,
				message: extractErrorMessage(error),
				variant: "alert",
				alert: {
					color: "error",
				},
				close: false,
			}),
		);

		throw error;
	}
};

// Acción para cerrar sesión
export const logoutUser = () => (dispatch: Dispatch) => {
	dispatch({ type: LOGOUT });
	// Resetear el estado de folders al hacer logout
	dispatch(resetFoldersState());
	// Resetear el estado de contacts al hacer logout
	dispatch(resetContactsState());
	// Resetear el estado de calculators al hacer logout
	dispatch(resetCalculatorsState());
	// Resetear otros estados relacionados con el usuario
	dispatch({ type: "RESET_EVENTS_STATE" });
	dispatch({ type: "RESET_TASKS_STATE" });
	dispatch({ type: "RESET_MOVEMENTS_STATE" });
	dispatch({ type: "RESET_NOTIFICATIONS_STATE" });
};

// Acción para establecer que el usuario necesita verificación
export const setNeedsVerification = (email: string) => (dispatch: Dispatch) => {
	dispatch({
		type: SET_NEEDS_VERIFICATION,
		payload: { email },
	});
};

// Acción para actualizar la suscripción en el estado
export const updateSubscription = (subscription: Subscription | null) => (dispatch: Dispatch) => {
	dispatch({
		type: UPDATE_SUBSCRIPTION,
		payload: { subscription },
	});
};

// Acción para obtener la suscripción actual desde la API
export const fetchCurrentSubscription = () => async (dispatch: any, getState: () => RootState) => {
	try {
		// Verificar si ya tenemos la suscripción en el estado
		const { subscription } = getState().auth;
		if (subscription) {
			return subscription;
		}

		// Si no existe, hacer la llamada a la API
		const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/subscription/current`, {
			withCredentials: true,
		});

		if (response.data && response.data.success && response.data.subscription) {
			// Actualizar el estado con la suscripción
			dispatch(updateSubscription(response.data.subscription));
			return response.data.subscription;
		} else {
			throw new Error(response.data?.message || "Error al obtener la suscripción");
		}
	} catch (error: any) {
		// Si hay error, actualizar con null
		dispatch(updateSubscription(null));

		// No mostrar error si es 401 (usuario no autenticado)
		if (error.response?.status !== 401) {
			dispatch(
				openSnackbar({
					open: true,
					message: extractErrorMessage(error),
					variant: "alert",
					alert: {
						color: "error",
					},
					close: false,
				}),
			);
		}

		throw error;
	}
};

// Selector para obtener la suscripción del estado
export const selectSubscription = (state: RootState) => state.auth.subscription;

// Selector para obtener el historial de pagos del estado
export const selectPaymentHistory = (state: RootState) => state.auth.paymentHistory;

// Selector para obtener el customer del estado
export const selectCustomer = (state: RootState) => state.auth.customer;

// Acción para agregar skills
export const addUserSkills = (skills: any) => async (dispatch: Dispatch) => {
	try {
		// Convertir taxCode a número si viene como string
		const processedSkills = Array.isArray(skills)
			? skills.map((skill) => ({
					...skill,
					taxCode: typeof skill.taxCode === "string" ? parseInt(skill.taxCode.replace(/-/g, "")) : skill.taxCode,
			  }))
			: {
					...skills,
					taxCode: typeof skills.taxCode === "string" ? parseInt(skills.taxCode.replace(/-/g, "")) : skills.taxCode,
			  };

		const response = await axios.post(
			`${import.meta.env.VITE_BASE_URL}/api/auth/skills`,
			{ skills: processedSkills },
			{ withCredentials: true },
		);

		if (response.data.success) {
			// Actualizar el estado con los nuevos skills
			dispatch({
				type: ADD_USER_SKILLS,
				payload: { skills: response.data.skills },
			});

			dispatch(
				openSnackbar({
					open: true,
					message: response.data.message || "Datos agregados correctamente",
					variant: "alert",
					alert: {
						color: "success",
					},
					close: true,
				}),
			);

			return response.data;
		}
	} catch (error: any) {
		dispatch(
			openSnackbar({
				open: true,
				message: extractErrorMessage(error),
				variant: "alert",
				alert: {
					color: "error",
				},
				close: false,
			}),
		);
		throw error;
	}
};

// Acción para eliminar un skill
export const deleteUserSkill = (skillId: string) => async (dispatch: Dispatch) => {
	try {
		const response = await axios.delete(`${import.meta.env.VITE_BASE_URL}/api/auth/skills/${skillId}`, { withCredentials: true });

		if (response.data.success) {
			// Actualizar el estado con los skills restantes
			dispatch({
				type: DELETE_USER_SKILL,
				payload: { skills: response.data.skills },
			});

			dispatch(
				openSnackbar({
					open: true,
					message: response.data.message || "Dato eliminado correctamente",
					variant: "alert",
					alert: {
						color: "success",
					},
					close: true,
				}),
			);

			return response.data;
		}
	} catch (error: any) {
		dispatch(
			openSnackbar({
				open: true,
				message: extractErrorMessage(error),
				variant: "alert",
				alert: {
					color: "error",
				},
				close: false,
			}),
		);
		throw error;
	}
};

// Acción para actualizar el historial de pagos y customer en el estado
export const updatePaymentHistory =
	(paymentHistory: Payment[] | null, customer?: { id: string; email: string | null } | null) => (dispatch: Dispatch) => {
		dispatch({
			type: UPDATE_PAYMENT_HISTORY,
			payload: { paymentHistory, customer },
		});
	};

// Acción para obtener el historial de pagos desde la API
export const fetchPaymentHistory = () => async (dispatch: any, getState: () => RootState) => {
	try {
		// Verificar si ya tenemos el historial de pagos en el estado
		const { paymentHistory } = getState().auth;
		if (paymentHistory && paymentHistory.length > 0) {
			return { payments: paymentHistory, customer: getState().auth.customer };
		}

		// Si no existe, hacer la llamada a la API
		const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/subscriptions/payments`, {
			withCredentials: true,
		});

		if (response.data && response.data.success) {
			const payments = response.data.data?.payments || response.data.payments || [];
			const customer = response.data.data?.customer || response.data.customer || null;

			// Actualizar el estado con el historial de pagos
			dispatch(updatePaymentHistory(payments, customer));
			return { payments, customer };
		} else {
			throw new Error(response.data?.message || "Error al obtener el historial de pagos");
		}
	} catch (error: any) {
		// Si hay error, actualizar con null
		dispatch(updatePaymentHistory(null, null));

		// No mostrar error si es 401 (usuario no autenticado)
		if (error.response?.status !== 401) {
			dispatch(
				openSnackbar({
					open: true,
					message: extractErrorMessage(error),
					variant: "alert",
					alert: {
						color: "error",
					},
					close: false,
				}),
			);
		}

		throw error;
	}
};
