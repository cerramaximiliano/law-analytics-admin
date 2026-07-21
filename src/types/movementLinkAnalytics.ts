// Tipos del dashboard de analytics de la vista pública de documentos de
// movimientos (/m/:token). Matchea las respuestas de admin-api
// movementLinkAnalyticsController (law-analytics-server).

export interface MovementLinkQueryParams {
	from?: string;
	to?: string;
	includeBots?: "1";
	limit?: number;
}

export interface MovementLinkRange {
	from: string;
	to: string;
}

// GET /summary
export interface MovementLinkSummaryData {
	events_total: number;
	opens_total: number;
	opens_human: number;
	opens_bot: number;
	opens_served: number;
	opens_expired: number;
	opens_not_found: number;
	opens_with_pdf: number;
	views_confirmed: number;
	cta_clicks: number;
	downloads: number;
	fallback_clicks: number;
	login_continues: number;
	unique_users: number;
	unique_causas: number;
	rate_pdf_served: number | null;
	rate_bot: number | null;
	rate_view_to_cta: number | null;
	rate_view_to_download: number | null;
	rate_cta_per_open: number | null;
	rate_cta_to_login: number | null;
}

export interface MovementLinkSummaryResponse {
	success: boolean;
	range: MovementLinkRange;
	data: MovementLinkSummaryData;
}

// GET /by-fuero
export interface MovementLinkByFueroItem {
	fuero: string;
	opens: number;
	views: number;
	cta_clicks: number;
	downloads: number;
	unique_users: number;
}

export interface MovementLinkByFueroResponse {
	success: boolean;
	range: MovementLinkRange;
	items: MovementLinkByFueroItem[];
}

// GET /by-user
export interface MovementLinkByUserItem {
	userId: string;
	email?: string;
	name?: string;
	opens: number;
	views: number;
	cta_clicks: number;
	downloads: number;
	login_continues: number;
	last_activity: string;
	unique_causas: number;
}

export interface MovementLinkByUserResponse {
	success: boolean;
	range: MovementLinkRange;
	items: MovementLinkByUserItem[];
}

// GET /timeseries
export interface MovementLinkTimeseriesItem {
	date: string;
	opens: number;
	views: number;
	cta_clicks: number;
	downloads: number;
	fallback_clicks: number;
	login_continues: number;
}

export interface MovementLinkTimeseriesResponse {
	success: boolean;
	range: MovementLinkRange;
	items: MovementLinkTimeseriesItem[];
}

// GET /recent
export type MovementLinkEventName = "open" | "view_confirmed" | "cta_click" | "download" | "fallback_click" | "login_continue";

export interface MovementLinkRecentItem {
	_id?: string;
	userId?: string | null;
	causaId?: string | null;
	causaType?: string | null;
	movementId?: string | null;
	event: MovementLinkEventName;
	source?: string | null;
	hasPdf?: boolean | null;
	pdfStatus?: string | null;
	fuero?: string | null;
	reason?: string | null;
	botSuspected?: boolean;
	ts: string;
}

export interface MovementLinkRecentResponse {
	success: boolean;
	range: MovementLinkRange;
	items: MovementLinkRecentItem[];
}
