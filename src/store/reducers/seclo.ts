// store/reducers/seclo.ts

import adminAxios from "utils/adminAxios";
import { openSnackbar } from "./snackbar";
import type { SecloSolicitud, TrabajoCredential, SecloStats, SecloUser, SecloContact } from "types/seclo";

// ─── Action types ─────────────────────────────────────────────────────────────

export const SECLO_SET_LOADING = "@seclo/SET_LOADING";
export const SECLO_SET_SOLICITUDES = "@seclo/SET_SOLICITUDES";
export const SECLO_ADD_SOLICITUD = "@seclo/ADD_SOLICITUD";
export const SECLO_UPDATE_SOLICITUD = "@seclo/UPDATE_SOLICITUD";
export const SECLO_REMOVE_SOLICITUD = "@seclo/REMOVE_SOLICITUD";
export const SECLO_SET_CREDENTIALS = "@seclo/SET_CREDENTIALS";
export const SECLO_ADD_CREDENTIAL = "@seclo/ADD_CREDENTIAL";
export const SECLO_UPDATE_CREDENTIAL = "@seclo/UPDATE_CREDENTIAL";
export const SECLO_REMOVE_CREDENTIAL = "@seclo/REMOVE_CREDENTIAL";
export const SECLO_SET_STATS = "@seclo/SET_STATS";
export const SECLO_SET_USERS = "@seclo/SET_USERS";
export const SECLO_SET_CONTACTS = "@seclo/SET_CONTACTS";
export const SECLO_SET_ERROR = "@seclo/SET_ERROR";
export const SECLO_SET_SOL_TOTAL = "@seclo/SET_SOL_TOTAL";
export const SECLO_SET_CRED_TOTAL = "@seclo/SET_CRED_TOTAL";

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
				solicitudes: state.solicitudes.map((s) => (s._id === action.payload._id ? action.payload : s)),
			};
		case SECLO_REMOVE_SOLICITUD:
			return {
				...state,
				solicitudes: state.solicitudes.filter((s) => s._id !== action.payload),
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
				credentials: state.credentials.map((c) => (c._id === action.payload._id ? action.payload : c)),
			};
		case SECLO_REMOVE_CREDENTIAL:
			return {
				...state,
				credentials: state.credentials.filter((c) => c._id !== action.payload),
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

/**
 * Obtiene una URL presignada de descarga para un documento S3 del módulo SECLO.
 * Retorna la URL directamente (no modifica el estado de Redux).
 */
export const getSecloDownloadUrl =
	(s3Key: string) =>
	async (_dispatch: any): Promise<string | null> => {
		try {
			const { data } = await adminAxios.get("/api/seclo/download-url", { params: { key: s3Key } });
			return data.success ? data.downloadUrl : null;
		} catch (err: any) {
			console.error("getSecloDownloadUrl:", err.message);
			return null;
		}
	};

export const resetAgendaData =
	(id: string, resetEvent = false, suppressEmail = false) =>
	async (dispatch: any) => {
		try {
			const { data } = await adminAxios.post(`/api/seclo/solicitudes/${id}/reset-agenda`, { resetEvent, suppressEmail });
			if (data.success) {
				dispatch({ type: SECLO_UPDATE_SOLICITUD, payload: data.solicitud });
				dispatch(openSnackbar({ open: true, message: "Datos de agenda reseteados", variant: "alert", alert: { color: "success" } }));
			}
		} catch (err: any) {
			const msg = err.response?.data?.message || err.message;
			dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
		}
	};

/**
 * Re-ejecuta una solicitud existente en modo dry-run (DEV):
 * resetea status a 'pending' + dryRun=true. Después hay que disparar el
 * worker de envío manualmente (o esperar al cron).
 */
export const rerunAsDry =
	(id: string, withHtml = false) =>
	async (dispatch: any) => {
		try {
			const { data } = await adminAxios.post(`/api/seclo/solicitudes/${id}/rerun-as-dry`, { withHtml });
			if (data.success) {
				dispatch({ type: SECLO_UPDATE_SOLICITUD, payload: data.solicitud });
				dispatch(openSnackbar({ open: true, message: data.message || "Reseteada en modo prueba (DEV)", variant: "alert", alert: { color: "success" } }));
				return data.solicitud;
			}
		} catch (err: any) {
			const msg = err.response?.data?.message || err.message;
			dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
			throw err;
		}
	};

/**
 * Promueve una solicitud 'dry_run_completed' a envío real (status='pending', dryRun=false).
 * Si deleteArtifacts=true también borra los screenshots del dry-run de S3.
 */
export const promoteRealSolicitud =
	(id: string, deleteArtifacts = false) =>
	async (dispatch: any) => {
		try {
			const { data } = await adminAxios.post(`/api/seclo/solicitudes/${id}/promote-real`, { deleteArtifacts });
			if (data.success) {
				dispatch({ type: SECLO_UPDATE_SOLICITUD, payload: data.solicitud });
				dispatch(openSnackbar({ open: true, message: data.message || "Solicitud promovida a envío real", variant: "alert", alert: { color: "success" } }));
				return data.solicitud;
			}
		} catch (err: any) {
			const msg = err.response?.data?.message || err.message;
			dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
			throw err;
		}
	};

/**
 * Borra de S3 los screenshots/HTML del último dry-run. No cambia el status.
 */
export const deleteDryRunArtifacts = (id: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.delete(`/api/seclo/solicitudes/${id}/dry-run-artifacts`);
		if (data.success) {
			dispatch({ type: SECLO_UPDATE_SOLICITUD, payload: data.solicitud });
			dispatch(openSnackbar({ open: true, message: data.message || "Artefactos eliminados", variant: "alert", alert: { color: "success" } }));
			return data.solicitud;
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
		throw err;
	}
};

export const triggerWorkerRun = (workerName: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.post(`/api/seclo/workers/${workerName}/run`);
		if (data.success) {
			dispatch(
				openSnackbar({
					open: true,
					message: `Ejecución manual iniciada — el worker arrancará en ≤ 10 segundos`,
					variant: "alert",
					alert: { color: "info" },
				}),
			);
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
	}
};

export const fetchSolicitudById =
	(id: string) =>
	async (_dispatch: any): Promise<SecloSolicitud | null> => {
		try {
			const { data } = await adminAxios.get(`/api/seclo/solicitudes/${id}`);
			return data.success ? data.solicitud : null;
		} catch (err: any) {
			console.error("fetchSolicitudById:", err.message);
			return null;
		}
	};

export const fetchFoldersByUser =
	(userId: string, search?: string) =>
	async (_dispatch: any): Promise<any[]> => {
		try {
			const { data } = await adminAxios.get(`/api/seclo/users/${userId}/folders`, { params: { search, limit: 50 } });
			return data.success ? data.folders : [];
		} catch (err: any) {
			console.error("fetchFoldersByUser:", err.message);
			return [];
		}
	};

export const linkSolicitudFolder = (solicitudId: string, folderId: string | null) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.patch(`/api/seclo/solicitudes/${solicitudId}/folder`, { folderId });
		if (data.success) {
			dispatch({ type: SECLO_UPDATE_SOLICITUD, payload: data.solicitud });
			dispatch(
				openSnackbar({
					open: true,
					message: folderId ? "Carpeta vinculada" : "Carpeta desvinculada",
					variant: "alert",
					alert: { color: "success" },
				}),
			);
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
	}
};

export const revealCredential =
	(id: string) =>
	async (_dispatch: any): Promise<{ cuil: string; password: string } | null> => {
		try {
			const { data } = await adminAxios.get(`/api/seclo/credentials/${id}/reveal`);
			return data.success ? { cuil: data.cuil, password: data.password } : null;
		} catch (err: any) {
			console.error("revealCredential:", err.message);
			return null;
		}
	};

export const fetchTrabajoConfig =
	() =>
	async (_dispatch: any): Promise<any | null> => {
		try {
			const { data } = await adminAxios.get("/api/seclo/config");
			return data.success ? data.config : null;
		} catch (err: any) {
			console.error("fetchTrabajoConfig:", err.message);
			return null;
		}
	};

export const updateTrabajoConfig =
	(payload: Record<string, any>) =>
	async (_dispatch: any): Promise<any | null> => {
		try {
			const { data } = await adminAxios.patch("/api/seclo/config", payload);
			return data.success ? data.config : null;
		} catch (err: any) {
			console.error("updateTrabajoConfig:", err.message);
			return null;
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

/**
 * Pide al backend que dispare el credentialsChecker para revalidar esta
 * credencial. El worker corre en ≤ 10 s y el resultado queda reflejado en
 * los flags `credentialsValidated` / `credentialInvalid`.
 */
export const validateCredential = (id: string) => async (dispatch: any) => {
	try {
		const { data } = await adminAxios.post(`/api/seclo/credentials/${id}/validate`);
		if (data.success) {
			dispatch(openSnackbar({ open: true, message: data.message || "Validación solicitada", variant: "alert", alert: { color: "info" } }));
		}
	} catch (err: any) {
		const msg = err.response?.data?.message || err.message;
		dispatch(openSnackbar({ open: true, message: msg, variant: "alert", alert: { color: "error" } }));
		throw err;
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
