import authAxios from "utils/authAxios";
import { dispatch } from "../index";

// ACTION TYPES
export const SET_USERS = "@users/SET_USERS";
export const SET_USER = "@users/SET_USER";
export const SET_LOADING = "@users/SET_LOADING";
export const SET_ERROR = "@users/SET_ERROR";
export const UPDATE_USER = "@users/UPDATE_USER";
export const DELETE_USER = "@users/DELETE_USER";
export const SET_LIGHT_DATA = "@users/SET_LIGHT_DATA";
export const CLEAR_USER_DATA = "@users/CLEAR_USER_DATA";

export interface UsersStateProps {
	users: any[];
	user: any | null;
	lightData: any | null;
	loading: boolean;
	error: object | string | null;
}

export const initialState: UsersStateProps = {
	users: [],
	user: null,
	lightData: null,
	loading: false,
	error: null,
};

// Datos de ejemplo para usar si la API no devuelve datos
const mockUsers = [
	{
		id: "1",
		name: "John Doe",
		email: "john.doe@example.com",
		role: "ADMIN_ROLE",
		status: "active",
		lastLogin: "2023-01-01T10:30:00Z",
		createdAt: "2022-01-01T10:00:00Z",
		updatedAt: "2023-01-01T10:30:00Z",
	},
	{
		id: "2",
		name: "Jane Smith",
		email: "jane.smith@example.com",
		role: "USER_ROLE",
		status: "active",
		lastLogin: "2023-02-15T14:20:00Z",
		createdAt: "2022-02-10T09:00:00Z",
		updatedAt: "2023-02-15T14:20:00Z",
	},
	{
		id: "3",
		name: "Robert Johnson",
		email: "robert.johnson@example.com",
		role: "USER_ROLE",
		status: "inactive",
		lastLogin: "2022-12-10T08:45:00Z",
		createdAt: "2022-03-05T11:30:00Z",
		updatedAt: "2023-03-01T16:40:00Z",
	},
	{
		id: "4",
		name: "Maria García",
		email: "maria.garcia@example.com",
		role: "ADMIN_ROLE",
		status: "active",
		lastLogin: "2023-03-20T09:15:00Z",
		createdAt: "2022-04-12T13:20:00Z",
		updatedAt: "2023-03-20T09:15:00Z",
	},
	{
		id: "5",
		name: "Carlos Rodríguez",
		email: "carlos.rodriguez@example.com",
		role: "USER_ROLE",
		status: "pending",
		createdAt: "2022-05-18T10:10:00Z",
		updatedAt: "2022-05-18T10:10:00Z",
	},
];

// Reducer
const users = (state = initialState, action: any) => {
	switch (action.type) {
		case SET_USERS:
			return {
				...state,
				users: action.payload,
			};
		case SET_USER:
			return {
				...state,
				user: action.payload,
			};
		case UPDATE_USER:
			// Actualizar el usuario tanto en la lista de usuarios como en el usuario activo
			return {
				...state,
				user: action.payload,
				users: state.users.map((user: any) => {
					const userId = user._id || user.id;
					const payloadId = action.payload._id || action.payload.id;
					return userId === payloadId ? action.payload : user;
				}),
			};
		case DELETE_USER:
			// Eliminar el usuario de la lista
			return {
				...state,
				users: state.users.filter((user: any) => {
					const userId = user._id || user.id;
					return userId !== action.payload;
				}),
				// Si el usuario activo es el eliminado, limpiarlo
				user: state.user && (state.user._id || state.user.id) === action.payload ? null : state.user,
			};
		case SET_LOADING:
			return {
				...state,
				loading: action.payload,
			};
		case SET_ERROR:
			return {
				...state,
				error: action.payload,
			};
		case SET_LIGHT_DATA:
			return {
				...state,
				lightData: action.payload,
			};
		case CLEAR_USER_DATA:
			return {
				...state,
				user: null,
				lightData: null,
			};
		default:
			return state;
	}
};

export default users;

// Actions
export interface SearchUsersParams {
	search?: string;
	role?: string;
	isActive?: boolean | string;
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export const getUsers = () => {
	return async (dispatch: any) => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			const response = await authAxios.get("/api/users");

			// Asegurarse de que estamos usando el formato correcto
			let userData = Array.isArray(response.data)
				? response.data
				: response.data.users
				? response.data.users
				: response.data.data
				? response.data.data
				: [];

			// Si no hay datos, usar datos de ejemplo
			if (!userData || userData.length === 0) {
				userData = mockUsers;
			} else {
				// Asegurar que cada usuario tenga un id además de _id
				userData = userData.map((user: any) => ({
					...user,
					id: user.id || user._id,
				}));
			}

			dispatch({
				type: SET_USERS,
				payload: userData,
			});
		} catch (error) {
			// En caso de error, usar datos de ejemplo

			dispatch({
				type: SET_USERS,
				payload: mockUsers,
			});

			dispatch({
				type: SET_ERROR,
				payload: error,
			});
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
};

export const searchUsers = (params: SearchUsersParams) => {
	return async (dispatch: any) => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			// Construir query string con parámetros
			const queryParams = new URLSearchParams();
			if (params.search) queryParams.append("search", params.search);
			if (params.role) queryParams.append("role", params.role);
			if (params.isActive !== undefined && params.isActive !== "") {
				queryParams.append("isActive", String(params.isActive));
			}
			if (params.page) queryParams.append("page", String(params.page));
			if (params.limit) queryParams.append("limit", String(params.limit));
			if (params.sortBy) queryParams.append("sortBy", params.sortBy);
			if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

			const queryString = queryParams.toString();
			const url = `/api/users/search${queryString ? `?${queryString}` : ""}`;

			const response = await authAxios.get(url);

			// Asegurarse de que estamos usando el formato correcto
			// La respuesta del backend es: { success: true, data: { users: [...], pagination: {...} } }
			let userData = Array.isArray(response.data)
				? response.data
				: response.data.data?.users
				? response.data.data.users
				: response.data.users
				? response.data.users
				: response.data.data
				? response.data.data
				: [];

			// Si no hay datos, devolver array vacío (no mockUsers cuando se filtra)
			if (!userData || !Array.isArray(userData)) {
				userData = [];
			} else {
				// Asegurar que cada usuario tenga un id además de _id
				userData = userData.map((user: any) => ({
					...user,
					id: user.id || user._id,
				}));
			}

			dispatch({
				type: SET_USERS,
				payload: userData,
			});

			return response.data;
		} catch (error) {
			dispatch({
				type: SET_ERROR,
				payload: error,
			});
			throw error;
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
};

export const updateUser = (userId: string, userData: any) => {
	return async (dispatch: any) => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			const response = await authAxios.put(`/api/users/${userId}`, userData);

			// Extraer el usuario actualizado dependiendo de la estructura de la respuesta
			const updatedUser = response.data.user || response.data;

			dispatch({
				type: UPDATE_USER,
				payload: updatedUser,
			});

			return updatedUser;
		} catch (error) {
			dispatch({
				type: SET_ERROR,
				payload: error,
			});
			throw error;
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
};

export const deleteUser = (userId: string) => {
	return async (dispatch: any) => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			await authAxios.delete(`/api/users/${userId}`);

			dispatch({
				type: DELETE_USER,
				payload: userId,
			});
		} catch (error) {
			dispatch({
				type: SET_ERROR,
				payload: error,
			});
			throw error;
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
};

export const getUserById = (userId: string) => {
	return async (dispatch: any) => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			const response = await authAxios.get(`/api/users/${userId}?includeLightData=true`);

			// La API devuelve success, user, subscription y lightData
			if (response.data.success && response.data.user) {
				// Combinar user con subscription en un solo objeto
				const userData = {
					...response.data.user,
					subscription: response.data.subscription || undefined,
				};

				dispatch({
					type: SET_USER,
					payload: userData,
				});

				// Guardar lightData por separado
				if (response.data.lightData) {
					dispatch({
						type: SET_LIGHT_DATA,
						payload: response.data.lightData,
					});
				}
			} else {
				// Fallback para estructura antigua
				const userData = response.data.data ? response.data.data : response.data;
				dispatch({
					type: SET_USER,
					payload: userData,
				});
			}
		} catch (error) {
			// En caso de error, buscar en datos de ejemplo
			const mockUser = mockUsers.find((user) => user.id === userId) || null;
			if (mockUser) {
				dispatch({
					type: SET_USER,
					payload: mockUser,
				});
			}

			dispatch({
				type: SET_ERROR,
				payload: error,
			});
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
};

export function getUsers_Static() {
	return async () => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			const response = await authAxios.get("/api/users");
			// Asegurarse de que estamos usando el formato correcto
			let userData = Array.isArray(response.data)
				? response.data
				: response.data.users
				? response.data.users
				: response.data.data
				? response.data.data
				: [];

			// Si no hay datos, usar datos de ejemplo
			if (!userData || userData.length === 0) {
				userData = mockUsers;
			} else {
				// Asegurar que cada usuario tenga un id además de _id
				userData = userData.map((user: any) => ({
					...user,
					id: user.id || user._id,
				}));
			}

			dispatch({
				type: SET_USERS,
				payload: userData,
			});
		} catch (error) {
			dispatch({
				type: SET_USERS,
				payload: mockUsers,
			});

			dispatch({
				type: SET_ERROR,
				payload: error,
			});
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
}

export function getUserById_Static(userId: string) {
	return async () => {
		try {
			dispatch({
				type: SET_LOADING,
				payload: true,
			});
			dispatch({
				type: SET_ERROR,
				payload: null,
			});

			const response = await authAxios.get(`/api/users/${userId}?includeLightData=true`);

			// La API devuelve success, user, subscription y lightData
			if (response.data.success && response.data.user) {
				// Combinar user con subscription en un solo objeto
				const userData = {
					...response.data.user,
					subscription: response.data.subscription || undefined,
				};

				dispatch({
					type: SET_USER,
					payload: userData,
				});

				// Guardar lightData por separado
				if (response.data.lightData) {
					dispatch({
						type: SET_LIGHT_DATA,
						payload: response.data.lightData,
					});
				}
			} else {
				// Fallback para estructura antigua
				const userData = response.data.data ? response.data.data : response.data;
				dispatch({
					type: SET_USER,
					payload: userData,
				});
			}
		} catch (error) {
			// En caso de error, buscar en datos de ejemplo
			const mockUser = mockUsers.find((user) => user.id === userId) || null;
			if (mockUser) {
				dispatch({
					type: SET_USER,
					payload: mockUser,
				});
			}

			dispatch({
				type: SET_ERROR,
				payload: error,
			});
		} finally {
			dispatch({
				type: SET_LOADING,
				payload: false,
			});
		}
	};
}

export const clearUserData = () => {
	return async () => {
		dispatch({
			type: CLEAR_USER_DATA,
		});
	};
};
