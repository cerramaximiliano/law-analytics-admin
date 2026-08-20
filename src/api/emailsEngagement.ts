import adminAxios from "utils/adminAxios";

// ----------------------------------------------------------------------
// Tab "Emails" de Usuarios → Recursos: envíos de emails de notificación
// (notificationlogs de la-notification) + engagement real por usuario:
//   - ingresos a la vista pública de movimientos (/m/:token, sin bots)
//   - visitas LOGUEADAS a la app atribuidas a emails (?source=email_*)
// ----------------------------------------------------------------------

export interface EmailEngagementRow {
	userId: string;
	email: string | null;
	name: string | null;
	totalSent: number;
	lastSentAt: string | null;
	/** Conteo por entityType del NotificationLog (judicial_movement, event, task, movement, ...) */
	sentByType: Record<string, number>;
	/** Ingresos a la vista pública de movimientos (eventos open/view_confirmed, sin bots) */
	movementViewEntries: number;
	lastMovementViewAt: string | null;
	/** Visitas logueadas a la app llegando con ?source=email_* */
	emailVisits: number;
	lastEmailVisitAt: string | null;
	emailVisitSources: string[];
	/** Entrega real (tracking SES vía SNS, desde el 18/08). */
	delivery?: {
		/** Enviados que pueden tener estado: los previos al tracking no cuentan. */
		withTracking: number;
		delivered: number;
		failed: number;
		bouncePermanent: number;
		complaints: number;
	};
}

export interface EmailsEngagementResponse {
	success: boolean;
	data: EmailEngagementRow[];
	summary: {
		usersWithEmails: number;
		totalSent: number;
		withTracking?: number;
		delivered?: number;
		failed?: number;
		bouncePermanent?: number;
		complaints?: number;
	};
	pagination: { page: number; limit: number; total: number; pages: number };
}

// ── Actividad unificada de un usuario (embudo por fuente) ─────────────────────
// Los correos viven en tres colecciones distintas; el backend las une. `tracking`
// dice qué está instrumentado en cada fuente: sin eso, un 0 en "aperturas" se
// lee como "nadie abrió" cuando en realidad es "no se mide".
export interface EmailSourceFunnel {
	key: string;
	label: string;
	correos: number;
	entidades: number | null;
	entregados: number;
	conTracking: number;
	fallidos: number;
	aperturas: number | null;
	clicks: number;
	conversiones: number | null;
	ultimo: string | null;
	tracking: { apertura: boolean; click: boolean; conversion: boolean };
}

export interface UserEmailActivity {
	success: boolean;
	user: { _id: string; email: string | null; name: string | null };
	fuentes: EmailSourceFunnel[];
	campanias: {
		_id: string;
		nombre: string;
		enviados: number;
		entregados: number;
		aperturas: number;
		clicks: number;
		ultimo: string | null;
	}[];
	transaccionales: { categoria: string; n: number; ultimo: string | null }[];
	movimientoEventos: Record<string, { n: number; causas: number; ultimo: string }>;
}

const EmailsEngagementService = {
	async list(params: { page?: number; limit?: number; search?: string }): Promise<EmailsEngagementResponse> {
		const response = await adminAxios.get("/api/user-resources/emails-engagement", { params });
		return response.data;
	},

	async activity(userId: string): Promise<UserEmailActivity> {
		const response = await adminAxios.get<UserEmailActivity>(`/api/user-resources/${userId}/email-activity`);
		return response.data;
	},
};

export default EmailsEngagementService;
