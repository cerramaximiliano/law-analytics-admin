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
}

export interface EmailsEngagementResponse {
	success: boolean;
	data: EmailEngagementRow[];
	summary: { usersWithEmails: number; totalSent: number };
	pagination: { page: number; limit: number; total: number; pages: number };
}

const EmailsEngagementService = {
	async list(params: { page?: number; limit?: number; search?: string }): Promise<EmailsEngagementResponse> {
		const response = await adminAxios.get("/api/user-resources/emails-engagement", { params });
		return response.data;
	},
};

export default EmailsEngagementService;
