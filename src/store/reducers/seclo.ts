// store/reducers/seclo.ts

import adminAxios from "utils/adminAxios";
import { openSnackbar } from "./snackbar";
import type { SecloSolicitud, TrabajoCredential, SecloStats, SecloUser, SecloContact } from "types/seclo";

// ─── Action types ─────────────────────────────────────────────────────────────

export const SECLO_SET_LOADING        = "@seclo/SET_LOADING";
export const SECLO_SET_SOLICITUDES    = "@seclo/SET_SOLICITUDES";
export const SECLO_ADD_SOLICITUD      = "@seclo/ADD_SOLICITUD";
export const SECLO_UPDATE_SOLICITUD   = "@seclo/UPDATE_SOLICITUD";
export const SECLO_REMOVE_SOLICITUD   = "@seclo/REMOVE_SOLICITUD";
export const SECLO_SET_CREDENTIALS    = "@seclo/SET_CREDENTIALS";
export const SECLO_ADD_CREDENTIAL     = "@seclo/ADD_CREDENTIAL";
export const SECLO_UPDATE_CREDENTIAL  = "@seclo/UPDATE_CREDENTIAL";
export const SECLO_REMOVE_CREDENTIAL  = "@seclo/REMOVE_CREDENTIAL";
export const SECLO_SET_STATS          = "@seclo/SET_STATS";
export const SECLO_SET_USERS          = "@seclo/SET_USERS";
export const SECLO_SET_CONTACTS       = "@seclo/SET_CONTACTS";
export const SECLO_SET_ERROR          = "@seclo/SET_ERROR";
export const SECLO_SET_SOL_TOTAL      = "@seclo/SET_SOL_TOTAL";
export const SECLO_SET_CRED_TOTAL     = "@seclo/SET_CRED_TOTAL";

// ─── State ────────────────────────────────────────────────────────────────────

interface SecloState {
	loading: boolean;
	solicitudes: SecloSolicitud[];
	solicitudesTotal: number;
	credentials: TrabajoCredential[];
	credentialsTotal: number;
	stats: SecloStats | null;
	users: SecloUser[];
	contacts: SecloContact[];
	error: string | null;
}

const initialState: SecloState = {
	loading: false,
	solicitudes: [],
	solicitudesTotal: 0,
	credentials: [],
	credentialsTotal: 0,
	stats: null,
	users: [],
	contacts: [],
	error: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

export default function secloReducer(state = initialState, action: any): SecloState {
	switch (action.type) {
		case SECLO_SET_LOADING:
			return { ...state, loading: action.payload };
		case SECLO_SET_SOLICITUDES:
			return { ...state, solicitudes: action.payload };
		case SECLO_SET_SOL_TOTAL:
			return { ...state, solicitudesTotal: action.payload };
		case SECLO_ADD_SOLICITUD:
			return { ...state, solicitudes: [action.payload, ...state.solicitudes], solicitudesTotal: state.solicitudesTotal + 1 };
		case SECLO_UPDATE_SOLICITUD:
			return {
				...state,
				solicitudes: state.solicitudes.map(s => s._id === action.payload._id ? action.payload : s),
			};
		case SECLO_REMOVE_SOLICITUD:
			return {
				...state,
				solicitudes: state.solicitudes.filter(s => s._id !== action.payload),
				solicitudesTotal: Math.max(0, state.solicitudesTotal - 1),
			};
		case SECLO_SET_CREDENTIALS:
			return { ...state, credentials: action.payload };
		case SECLO_SET_CRED_TOTAL:
			return { ...state, credentialsTotal: action.payload };
		case SECLO_ADD_CREDENTIAL:
			return { ...state, credentials: [action.payload, ...state.credentials], credentialsTotal: state.credentialsTotal + 1 };
		case SECLO_UPDATE_CREDENTIAL:
			return {
				...state,
				credentials: state.credentials.map(c => c._id === action.payload._id ? action.payload : c),
			};
		case SECLO_REMOVE_CREDENTIAL:
			return {
				...state,
				credentials: state.credentials.filter(c => c._id !== action.payload),
				credentialsTotal: Math.max(0, state.credentialsTotal - 1),
			};
		case SECLO_SET_STATS:
			return { ...state, stats: action.payload };
		case SECLO_SET_USERS:
			return { ...state, users: action.payload };
		case SECLO_SET_CONTACTS:
			return { ...state, contacts: action.payload };
		case SECLO_SET_ERROR:
			return { ...state, error: action.payload };
		default:
			return state;
	}
}

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchSecloStats = () => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.get("/api/seclo/stats");
		if (data.success) dispatch({ type: SECLO_SET_STATS, payload: data.stats });
	} catch (err: any) {
		console.error("fetchSecloStats:", err.message);
	}
};

export const fetchSolicitudes = (params?: Record<string, any>) => async (dispatch: any) => {
	dispatch({ type: SECLO_SET_LOADING, payload: true });
	try {
		const { data } = await adminAxios.get("/api/seclo/solicitudes", { params });
		if (data.success) {
			dispatch({ type: SECLO_SET_SOLICITUDES, payload: data.solicitudes });
			dispatch({ type: SECLO_SET_SOL_TOTAL, payload: data.total });
		}
	} catch (err: any) {
		dispatch({ type: SECLO_SET_ERROR, payload: err.message });
	} finally {
		dispatch({ type: SECLO_SET_LOADING, payload: false });
	}
};

export const createSolicitud = (payload: any) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.post("/api/seclo/solicitudes", payload);
		if (data.success) {
			dispatch({ type: SECLO_ADD_SOLICITUD, payload: data.solicitud });
			dispatch(openSnackbar({ open: true, message: "Solicitud creada correctamente", variant: "alert", alert: { color: "success" } }));
			return data.solicitud;
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
		throw err;
	}
};

export const reactivarSolicitud = (id: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.patch(`/api/seclo/solicitudes/${id}/reactivar`);
		if (data.success) {
			dispatch({ type: SECLO_UPDATE_SOLICITUD, payload: data.solicitud });
			dispatch(openSnackbar({ open: true, message: "Solicitud reactivada", variant: "alert", alert: { color: "success" } }));
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
	}
};

export const deleteSolicitud = (id: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.delete(`/api/seclo/solicitudes/${id}`);
		if (data.success) {
			dispatch({ type: SECLO_REMOVE_SOLICITUD, payload: id });
			dispatch(openSnackbar({ open: true, message: "Solicitud eliminada", variant: "alert", alert: { color: "success" } }));
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
	}
};

export const fetchCredentials = (params?: Record<string, any>) => async (dispatch: any) => {
	dispatch({ type: SECLO_SET_LOADING, payload: true });
	try {
		const { data } = await adminAxios.get("/api/seclo/credentials", { params });
		if (data.success) {
			dispatch({ type: SECLO_SET_CREDENTIALS, payload: data.credentials });
			dispatch({ type: SECLO_SET_CRED_TOTAL, payload: data.total });
		}
	} catch (err: any) {
		dispatch({ type: SECLO_SET_ERROR, payload: err.message });
	} finally {
		dispatch({ type: SECLO_SET_LOADING, payload: false });
	}
};

export const createCredential = (payload: { userId: string; cuil: string; password: string }) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.post("/api/seclo/credentials", payload);
		if (data.success) {
			dispatch({ type: SECLO_ADD_CREDENTIAL, payload: data.credential });
			dispatch(openSnackbar({ open: true, message: "Credencial creada correctamente", variant: "alert", alert: { color: "success" } }));
			return data.credential;
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
		throw err;
	}
};

export const updateCredential = (id: string, payload: any) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.patch(`/api/seclo/credentials/${id}`, payload);
		if (data.success) {
			dispatch({ type: SECLO_UPDATE_CREDENTIAL, payload: data.credential });
			dispatch(openSnackbar({ open: true, message: "Credencial actualizada", variant: "alert", alert: { color: "success" } }));
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
	}
};

export const deleteCredential = (id: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.delete(`/api/seclo/credentials/${id}`);
		if (data.success) {
			dispatch({ type: SECLO_REMOVE_CREDENTIAL, payload: id });
			dispatch(openSnackbar({ open: true, message: "Credencial eliminada", variant: "alert", alert: { color: "success" } }));
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
	}
};

export const fetchUsers = (search?: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.get("/api/seclo/users", { params: { search, limit: 50 } });
		if (data.success) dispatch({ type: SECLO_SET_USERS, payload: data.users });
	} catch (err: any) {
		console.error("fetchUsers:", err.message);
	}
};

export const fetchContactsByUser = (userId: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.get(`/api/seclo/users/${userId}/contacts`);
		if (data.success) dispatch({ type: SECLO_SET_CONTACTS, payload: data.contacts });
		return data.contacts as SecloContact[];
	} catch (err: any) {
		console.error("fetchContactsByUser:", err.message);
		return [];
	}
};

export const getPresignedUploadUrl = async (fileName: string, contentType: string, userId?: string) => {
	const { data } = await adminAxios.post("/api/seclo/upload/presign", { fileName, contentType, userId });
	if (!data.success) throw new Error(data.message || "Error generando URL de upload");
	return data as { uploadUrl: string; s3Key: string };
};
