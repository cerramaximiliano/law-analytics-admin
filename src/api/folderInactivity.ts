import adminAxios from "utils/adminAxios";

// ======================== TYPES ========================

export type AlertStatus = "vencido" | "hoy" | "alerta" | "ok" | "sinDatos";

export interface AlertInfo {
	date: string;
	dateFormatted: string;
	daysRemaining: number;
	status: AlertStatus;
	willNotify: boolean;
}

export interface FolderAlerts {
	hasData: boolean;
	lastActivityDate: string | null;
	lastActivityFormatted: string | null;
	daysSinceLastActivity: number | null;
	caducity: AlertInfo;
	prescription: AlertInfo;
}

export interface FolderSettings {
	caducityDays: number;
	prescriptionDays: number;
	daysInAdvance: number;
	notifyOnceOnly?: boolean;
}

export interface FolderUser {
	_id: string;
	name: string;
	email: string;
	settings?: FolderSettings;
}

export interface FolderNotification {
	date: string;
	type: string;
	alertType: "caducity" | "prescription";
	success: boolean;
}

export interface FolderDates {
	lastMovementDate: string | null;
	initialDateFolder: string | null;
	finalDateFolder: string | null;
	judFolder?: {
		initialDateJudFolder: string | null;
		finalDateJudFolder: string | null;
	};
}

export interface FolderInactivityItem {
	_id: string;
	folderName: string;
	materia: string;
	status: string;
	archived: boolean;
	user: FolderUser;
	settings: FolderSettings;
	alerts: FolderAlerts;
	dates?: FolderDates;
	notifications?: FolderNotification[];
	lastNotification?: FolderNotification;
	createdAt?: string;
	updatedAt: string;
}

export interface AlertCounts {
	vencido: number;
	hoy: number;
	alerta: number;
	ok: number;
	sinDatos?: number;
}

export interface FolderInactivitySummary {
	totalFolders: number;
	alertCounts: {
		caducity: AlertCounts;
		prescription: AlertCounts;
	};
	filters: {
		status: string | null;
		type: string;
		userId: string | null;
		archived: string;
	};
}

export interface ProximaNotificacion {
	folderId: string;
	folderName: string;
	daysRemaining: number;
	date: string;
}

// ======================== RESPONSE INTERFACES ========================

export interface FolderInactivityListResponse {
	success: boolean;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
	summary: FolderInactivitySummary;
	count: number;
	data: FolderInactivityItem[];
}

export interface FolderInactivitySummaryResponse {
	success: boolean;
	timestamp: string;
	data: {
		total: number;
		sinDatos: number;
		caducity: AlertCounts;
		prescription: AlertCounts;
		proximasNotificaciones: {
			caducity: ProximaNotificacion[];
			prescription: ProximaNotificacion[];
		};
	};
}

export interface FolderInactivityDetailResponse {
	success: boolean;
	data: FolderInactivityItem;
}

export interface FolderInactivityUserResponse {
	success: boolean;
	user: FolderUser;
	summary: {
		totalFolders: number;
		withCaducityAlert: number;
		withPrescriptionAlert: number;
	};
	data: FolderInactivityItem[];
}

// ======================== QUERY PARAMS ========================

export interface FolderInactivityListParams {
	page?: number;
	limit?: number;
	status?: AlertStatus;
	type?: "caducity" | "prescription" | "any";
	userId?: string;
	archived?: "true" | "false" | "all";
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

// ======================== SERVICE ========================

export class FolderInactivityService {
	private static readonly BASE_PATH = "/api/folder-inactivity";

	/**
	 * GET /api/folder-inactivity
	 * Lista todos los folders con información de alertas
	 */
	static async getList(params: FolderInactivityListParams = {}): Promise<FolderInactivityListResponse> {
		const response = await adminAxios.get(this.BASE_PATH, { params });
		return response.data;
	}

	/**
	 * GET /api/folder-inactivity/summary
	 * Resumen de todas las alertas
	 */
	static async getSummary(): Promise<FolderInactivitySummaryResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/summary`);
		return response.data;
	}

	/**
	 * GET /api/folder-inactivity/:folderId
	 * Detalles de alertas de un folder específico
	 */
	static async getDetail(folderId: string): Promise<FolderInactivityDetailResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/${folderId}`);
		return response.data;
	}

	/**
	 * GET /api/folder-inactivity/user/:userId
	 * Alertas de todos los folders de un usuario
	 */
	static async getByUser(userId: string): Promise<FolderInactivityUserResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/user/${userId}`);
		return response.data;
	}
}

export default FolderInactivityService;
