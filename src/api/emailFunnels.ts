import adminAxios from "utils/adminAxios";

// Embudos globales de correo por fuente (admin-api /api/email-funnels).
//
// OJO CON LAS UNIDADES, que no son todas la misma:
//   - `correos`   = envíos reales (notificationlogs agrupado por usuario+minuto,
//                   porque el digest mete varias entidades en un solo correo).
//   - `entidades` = filas de notificationlogs, o sea cosas notificadas.
//   - `entregados`/`conTracking`/`rebotes` son a nivel ENTIDAD.
// Por eso la tasa de entrega se calcula sobre `conTracking` y nunca sobre
// `correos`: mezclarlas da porcentajes mayores a 100.

export interface FunnelSeries {
	correos: Record<string, number>;
	aperturas: Record<string, number>;
	clicks: Record<string, number>;
	conversiones: Record<string, number>;
}

export interface EmailFunnelSource {
	key: string;
	label: string;
	servicio: string;
	correos: number;
	entidades: number | null;
	usuarios: number;
	entregados: number;
	conTracking: number;
	rebotes: number;
	fallidos: number;
	ultimo: string | null;
	aperturas: number | null;
	clicks: number;
	conversiones: number | null;
	usuariosQueAbrieron: number | null;
	series: FunnelSeries;
	tracking: { apertura: boolean; click: boolean; conversion: boolean };
	/** Fecha desde la que hay clicks; antes no se medía aunque haya envíos. */
	desdeClicks?: string | null;
	/** Vista con el embudo fino, si esa fuente tiene una. */
	detalle?: string;
}

export interface EmailFunnelsResponse {
	success: boolean;
	rango: { from: string; to: string };
	fuentes: EmailFunnelSource[];
}

export interface FunnelTopUser {
	userId: string | null;
	email: string | null;
	aperturas: number | null;
	clicks: number;
	conversiones: number | null;
	correos?: number;
	ultimo: string | null;
}

const EmailFunnelsService = {
	async list(params?: { from?: string; to?: string }): Promise<EmailFunnelsResponse> {
		const res = await adminAxios.get<EmailFunnelsResponse>("/api/email-funnels", { params });
		return res.data;
	},

	async topUsers(
		source: string,
		params?: { from?: string; to?: string; limit?: number },
	): Promise<{ success: boolean; items: FunnelTopUser[] }> {
		const res = await adminAxios.get(`/api/email-funnels/${source}/top-users`, { params });
		return res.data;
	},
};

export default EmailFunnelsService;
