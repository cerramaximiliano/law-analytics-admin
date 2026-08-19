// Datos del flujo de sentencias: de la captura en el portal al consumo.
//
// Sigue el modelo de `pages/admin/infrastructure/dataflow.tsx` (nodos por
// columna + aristas con path explícito) para que ambos diagramas se lean igual.
// Se separa en un archivo propio porque son datos, no render: cuando cambie el
// pipeline se toca acá y el SVG no se entera.
//
// Fuente de verdad al 2026-08-19: pm2.*.config.js y src/tasks/* de
// pjn-workers-scraping, src/models/SentenciaCapturada.js (los estados), y las
// rutas de pjn-rag-api/src/routes/sentencias.routes.js.

import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL, PREMIUM_GOLD } from "themes/dashboardTokens";

// Mismo rosa que usa el data plane para el salto HTTP. Se repite el valor en vez
// de importarlo de dataflow.tsx para no acoplar dos páginas por una constante.
export const API_HOP = "#DB2777";

export type SFKind = "source" | "worker" | "store" | "api" | "client";

export interface SFNode {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	title: string;
	sub?: string[];
	kind: SFKind;
	accent?: string;
	chip?: { text: string; color: string };
	dim?: boolean;
}

export interface SFEdge {
	id: string;
	from: string;
	to: string;
	d: string;
	color: string;
	animated?: boolean;
	dashed?: boolean;
}

export interface SFLabel {
	x: number;
	y: number;
	text: string;
	color: string;
}

// Ficha de detalle (zona 2), misma forma que WORKER_DETAILS del data plane.
export interface SFDetail {
	title: string;
	server: string;
	pm2: string;
	steps: string[];
	escribe: string;
	frecuencia: string;
	estado?: string;
}

// ── Columnas ────────────────────────────────────────────────────────────────
export const SRC_X = 24;
export const CAP_X = 208;
export const PRC_X = 424;
export const STO_X = 660;
export const API_X = 930;
export const CLI_X = 1188;

export const SRC_W = 152;
export const CAP_W = 184;
export const PRC_W = 204;
export const STO_W = 224;
export const API_W = 216;
export const CLI_W = 188;

export const COLUMNS: { x: number; label: string }[] = [
	{ x: SRC_X, label: "FUENTES" },
	{ x: CAP_X, label: "CAPTURA" },
	{ x: PRC_X, label: "PROCESAMIENTO" },
	{ x: STO_X, label: "ALMACENAMIENTO" },
	{ x: API_X, label: "APIs" },
	{ x: CLI_X, label: "CONSUMO" },
];

export const NODES: SFNode[] = [
	// ── Fuentes externas ──
	{ id: "srcViewer", x: SRC_X, y: 52, w: SRC_W, h: 46, title: "Viewer PJN", sub: ["PDFs de sentencias"], kind: "source" },
	{ id: "srcPortal", x: SRC_X, y: 132, w: SRC_W, h: 46, title: "Portal SCW PJN", sub: ["movimientos de causas"], kind: "source" },
	{ id: "srcSaij", x: SRC_X, y: 250, w: SRC_W, h: 46, title: "Portal SAIJ", sub: ["jurisprudencia nacional"], kind: "source" },
	{
		id: "srcOpenai",
		x: SRC_X,
		y: 430,
		w: SRC_W,
		h: 52,
		title: "OpenAI",
		sub: ["embedding-3-large", "3072 dims"],
		kind: "source",
		accent: PRO_TEAL,
	},

	// ── Captura: las 3 vías por las que entra una sentencia ──
	{
		id: "updateMov",
		x: CAP_X,
		y: 118,
		w: CAP_W,
		h: 58,
		title: "update-movimientos",
		sub: ["detecta sentencias nuevas", "category: novelty"],
		kind: "worker",
	},
	{
		id: "collector",
		x: CAP_X,
		y: 40,
		w: CAP_W,
		h: 58,
		title: "sentencias-collector",
		sub: ["barre causas históricas", "category: rutina"],
		kind: "worker",
	},
	{
		id: "saij",
		x: CAP_X,
		y: 240,
		w: CAP_W,
		h: 58,
		title: "worker_SAIJ_*",
		sub: ["nacional · prov · backfill", "category: saij"],
		kind: "worker",
		accent: PREMIUM_GOLD,
	},

	// ── Procesamiento ──
	{
		id: "worker",
		x: PRC_X,
		y: 40,
		w: PRC_W,
		h: 62,
		title: "sentencias-worker (×2)",
		sub: ["descarga PDF → texto", "processingStatus: processed"],
		kind: "worker",
	},
	{
		id: "ocr",
		x: PRC_X,
		y: 124,
		w: PRC_W,
		h: 58,
		title: "ocr-worker",
		sub: ["Tesseract sobre escaneados", "ocrStatus: completed"],
		kind: "worker",
	},
	{
		id: "embeddings",
		x: PRC_X,
		y: 206,
		w: PRC_W,
		h: 62,
		title: "sentencias-embeddings",
		sub: ["chunkea → vectores", "embeddingStatus: completed"],
		kind: "worker",
		accent: PRO_TEAL,
	},
	{
		id: "semantic",
		x: PRC_X,
		y: 292,
		w: PRC_W,
		h: 62,
		title: "sentencias-semantic",
		sub: ["novedad capa 2", "status: double | rejected"],
		kind: "worker",
		accent: PRO_TEAL,
	},
	{
		id: "manager",
		x: PRC_X,
		y: 376,
		w: PRC_W,
		h: 58,
		title: "manager + retry",
		sub: ["enciende el grupo", "reintenta errores /30min"],
		kind: "worker",
		accent: STALE_AMBER,
	},

	// ── Almacenamiento ──
	{
		id: "mongo",
		x: STO_X,
		y: 52,
		w: STO_W,
		h: 74,
		title: "rs0 · sentencias-capturadas",
		sub: ["el documento y sus estados", "texto en textGz (gzip)"],
		kind: "store",
		accent: LIVE_GREEN,
	},
	{
		id: "s3",
		x: STO_X,
		y: 156,
		w: STO_W,
		h: 52,
		title: "S3",
		sub: ["chunks en JSON (s3ChunksKey)"],
		kind: "store",
		accent: LIVE_GREEN,
	},
	{
		id: "qdrant",
		x: STO_X,
		y: 240,
		w: STO_W,
		h: 74,
		title: "Qdrant · colección sentencias",
		sub: ["2.15M vectores · qdrant-01", "cuantización binaria (19/08)"],
		kind: "store",
		accent: PRO_TEAL,
	},
	{
		id: "saijColl",
		x: STO_X,
		y: 344,
		w: STO_W,
		h: 52,
		title: "rs0 · saij-sentencias",
		sub: ["fallo original + resumen IA"],
		kind: "store",
		accent: PREMIUM_GOLD,
	},

	// ── APIs ──
	{
		id: "ragApi",
		x: API_X,
		y: 52,
		w: API_W,
		h: 74,
		title: "pjn-rag-api :5005",
		sub: ["/rag/sentencias/ask", "/buscar · /chunks · /texto"],
		kind: "api",
		accent: LIVE_GREEN,
	},
	{
		id: "pjnApi",
		x: API_X,
		y: 156,
		w: API_W,
		h: 74,
		title: "pjn-api",
		sub: ["admin del corpus + configs", "búsqueda: respaldo sin uso"],
		kind: "api",
		accent: LIVE_GREEN,
		chip: { text: "respaldo", color: STALE_AMBER },
	},
	{
		id: "laServer",
		x: API_X,
		y: 260,
		w: API_W,
		h: 66,
		title: "law-analytics-server",
		sub: ["/api/public/sentencias", "jurisprudencia pública"],
		kind: "api",
		accent: LIVE_GREEN,
	},

	// ── Consumo ──
	{ id: "uiAdmin", x: CLI_X, y: 48, w: CLI_W, h: 56, title: "UI Admin", sub: ["búsqueda + prompt"], kind: "client", accent: API_HOP },
	{
		id: "mcp",
		x: CLI_X,
		y: 128,
		w: CLI_W,
		h: 56,
		title: "la-mcp-server",
		sub: ["Claude.ai · ChatGPT"],
		kind: "client",
		accent: API_HOP,
	},
	{
		id: "front",
		x: CLI_X,
		y: 268,
		w: CLI_W,
		h: 56,
		title: "law-analytics-front",
		sub: ["/jurisprudencia (público)"],
		kind: "client",
		accent: API_HOP,
	},
];

const hcurve = (x1: number, y1: number, x2: number, y2: number, bend = 0.5): string => {
	const dx = (x2 - x1) * bend;
	return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

export const buildSentenciasEdges = (neutral: string): SFEdge[] => [
	// Fuentes → captura
	{ id: "f1", from: "srcPortal", to: "collector", d: hcurve(SRC_X + SRC_W, 148, CAP_X, 69), color: neutral },
	{ id: "f2", from: "srcPortal", to: "updateMov", d: hcurve(SRC_X + SRC_W, 158, CAP_X, 147), color: neutral },
	{ id: "f3", from: "srcSaij", to: "saij", d: hcurve(SRC_X + SRC_W, 273, CAP_X, 269), color: neutral },
	{ id: "f4", from: "srcViewer", to: "worker", d: `M ${SRC_X + SRC_W} 68 C 300 20, 360 22, ${PRC_X} 60`, color: neutral },

	// Captura → el documento se crea en Mongo
	{ id: "c1", from: "collector", to: "mongo", d: `M ${CAP_X + CAP_W} 69 C 560 60, 600 70, ${STO_X} 74`, color: BRAND_BLUE, animated: true },
	{
		id: "c2",
		from: "updateMov",
		to: "mongo",
		d: `M ${CAP_X + CAP_W} 147 C 560 140, 600 96, ${STO_X} 88`,
		color: BRAND_BLUE,
		animated: true,
	},
	{
		id: "c3",
		from: "saij",
		to: "saijColl",
		d: `M ${CAP_X + CAP_W} 269 C 560 300, 600 366, ${STO_X} 370`,
		color: PREMIUM_GOLD,
		animated: true,
	},
	// SAIJ sincroniza al corpus unificado
	{
		id: "c4",
		from: "saijColl",
		to: "mongo",
		d: `M ${STO_X + 60} 344 C ${STO_X + 40} 240, ${STO_X + 30} 150, ${STO_X + 70} 126`,
		color: PREMIUM_GOLD,
		dashed: true,
	},

	// Procesamiento: cada worker lee y reescribe el mismo documento
	{ id: "p1", from: "worker", to: "mongo", d: hcurve(PRC_X + PRC_W, 71, STO_X, 62), color: BRAND_BLUE, animated: true },
	{ id: "p2", from: "worker", to: "ocr", d: `M ${PRC_X + 100} 102 L ${PRC_X + 100} 124`, color: STALE_AMBER },
	{ id: "p3", from: "ocr", to: "mongo", d: hcurve(PRC_X + PRC_W, 153, STO_X, 100), color: BRAND_BLUE, animated: true },
	{ id: "p4", from: "embeddings", to: "s3", d: hcurve(PRC_X + PRC_W, 226, STO_X, 176), color: PRO_TEAL },
	{ id: "p5", from: "embeddings", to: "qdrant", d: hcurve(PRC_X + PRC_W, 248, STO_X, 262), color: PRO_TEAL, animated: true },
	{ id: "p6", from: "semantic", to: "qdrant", d: hcurve(PRC_X + PRC_W, 322, STO_X, 292), color: PRO_TEAL },
	{ id: "p7", from: "semantic", to: "mongo", d: `M ${PRC_X + PRC_W} 312 C 600 300, 640 140, ${STO_X} 114`, color: BRAND_BLUE },

	// Embeddings ← OpenAI
	{
		id: "e1",
		from: "embeddings",
		to: "srcOpenai",
		d: `M ${PRC_X} 250 C 340 300, 260 400, ${SRC_X + SRC_W} 452`,
		color: PRO_TEAL,
		animated: true,
	},

	// Almacenamiento → APIs
	{ id: "a1", from: "mongo", to: "ragApi", d: hcurve(STO_X + STO_W, 80, API_X, 78), color: LIVE_GREEN },
	{ id: "a2", from: "qdrant", to: "ragApi", d: `M ${STO_X + STO_W} 262 C 890 250, 900 130, ${API_X} 104`, color: PRO_TEAL, animated: true },
	{ id: "a3", from: "mongo", to: "pjnApi", d: hcurve(STO_X + STO_W, 106, API_X, 180), color: LIVE_GREEN },
	{ id: "a4", from: "mongo", to: "laServer", d: `M ${STO_X + STO_W} 118 C 890 200, 890 270, ${API_X} 284`, color: LIVE_GREEN },
	{ id: "a5", from: "saijColl", to: "laServer", d: hcurve(STO_X + STO_W, 370, API_X, 308), color: PREMIUM_GOLD },

	// APIs → consumo (salto HTTP)
	{ id: "h1", from: "ragApi", to: "uiAdmin", d: hcurve(API_X + API_W, 76, CLI_X, 68), color: API_HOP },
	{ id: "h2", from: "ragApi", to: "mcp", d: hcurve(API_X + API_W, 104, CLI_X, 152), color: API_HOP },
	{ id: "h3", from: "pjnApi", to: "uiAdmin", d: hcurve(API_X + API_W, 180, CLI_X, 88), color: API_HOP },
	{ id: "h4", from: "laServer", to: "front", d: hcurve(API_X + API_W, 292, CLI_X, 292), color: API_HOP },
];

export const LABELS: SFLabel[] = [
	{ x: 592, y: 34, text: "crea el documento", color: BRAND_BLUE },
	{ x: 330, y: 116, text: "si el PDF es escaneado", color: STALE_AMBER },
	{ x: 300, y: 404, text: "vectores por Tailscale", color: PRO_TEAL },
	{ x: 872, y: 224, text: "búsqueda vectorial", color: PRO_TEAL },
	{ x: 596, y: 330, text: "sincroniza al corpus unificado", color: PREMIUM_GOLD },
	{ x: 1120, y: 372, text: "lectura vía API (HTTP)", color: API_HOP },
];

// ── Fichas de detalle ───────────────────────────────────────────────────────
export const SENTENCIAS_DETAILS: Record<string, SFDetail> = {
	collector: {
		title: "sentencias-collector",
		server: "worker_01",
		pm2: "sentencias-collector",
		steps: [
			"Barre causas históricas ya scrapeadas buscando movimientos que parezcan sentencia",
			"Filtra por patrones de texto del movimiento (definitiva, interlocutoria, honorarios…)",
			"bulkWrite a sentencias-capturadas con category='rutina' y processingStatus='pending'",
		],
		escribe: "sentencias-capturadas (rs0)",
		frecuencia: "cron cada 1 min · ~100 causas por corrida",
	},
	updateMov: {
		title: "update-movimientos",
		server: "worker_01",
		pm2: "update-movimientos-{civ,cnt,com,css}",
		steps: [
			"Re-scrapea causas con update=true y detecta movimientos nuevos",
			"Cuando el movimiento nuevo es una sentencia, la encola con category='novelty'",
			"Es la vía 'en caliente': lo que aparece hoy en el portal entra por acá",
		],
		escribe: "causas-*, sentencias-capturadas, plazos-notificaciones (rs0)",
		frecuencia: "cron */2 a */5 min por fuero",
	},
	saij: {
		title: "Workers SAIJ",
		server: "worker_01",
		pm2: "worker_SAIJ_{0,1} + _PROV_0 + _BACKFILL_0 + _enrich (solo _0 y _enrich son alwaysOnline)",
		steps: [
			"Scrapean el portal SAIJ por cursor (nacional, provincial y backfill histórico)",
			"Guardan el fallo en saij-sentencias + el PDF a S3",
			"Sincronizan a sentencias-capturadas con source.origin='saij' para unificar el corpus",
			"enrich: genera el resumen IA que consume la sección pública de jurisprudencia",
		],
		escribe: "saij-sentencias, sentencias-capturadas (rs0); PDFs a S3",
		frecuencia: "_0 y _enrich continuos; _PROV y _BACKFILL son intermitentes (corridas puntuales)",
	},
	worker: {
		title: "sentencias-worker",
		server: "worker_01",
		pm2: "sentencias-worker + sentencias-worker-2",
		steps: [
			"Toma una sentencia con processingStatus='pending' y la pasa a 'processing'",
			"Descarga el PDF del viewer del PJN",
			"Extrae el texto y lo guarda comprimido (textGz)",
			"Si el PDF es escaneado (sin capa de texto) marca 'extracted_needs_ocr' y lo deja al ocr-worker",
			"Si salió bien: processingStatus='processed'",
		],
		escribe: "sentencias-capturadas (rs0)",
		frecuencia: "cron cada 1-10 min",
	},
	ocr: {
		title: "ocr-worker",
		server: "worker_01",
		pm2: "ocr-worker",
		steps: [
			"Toma las que quedaron en 'extracted_needs_ocr' (ocrStatus='pending')",
			"Corre Tesseract en español sobre las páginas",
			"Guarda el texto en ocrResult.textGz y marca ocrStatus='completed'",
		],
		escribe: "sentencias-capturadas (rs0)",
		frecuencia: "cron · depende del backlog de escaneados",
	},
	embeddings: {
		title: "sentencias-embeddings",
		server: "worker_01",
		pm2: "sentencias-embeddings",
		steps: [
			"Toma las que tienen texto y embeddingStatus='pending'",
			"Parte el texto en chunks y guarda el JSON de chunks en S3 (s3ChunksKey)",
			"Pide los vectores a OpenAI (text-embedding-3-large, 3072 dims)",
			"Upsert a Qdrant (qdrant-01, colección 'sentencias') por Tailscale",
			"Marca embeddingStatus='completed' + embeddingChunksCount",
		],
		escribe: "sentencias-capturadas (rs0), chunks a S3, vectores a Qdrant",
		frecuencia: "cron · batch por corrida",
	},
	semantic: {
		title: "sentencias-semantic",
		server: "worker_01",
		pm2: "sentencias-semantic (arranque manual)",
		steps: [
			"Capa 2 de novedad: busca la sentencia contra el propio corpus en Qdrant",
			"Si no se parece a nada previo → status='double' (novedosa, sirve para difusión)",
			"Si es formulaica y ya hay equivalentes → status='rejected'",
			"Su config vive en configuracion-semantic-worker, la MISMA que lee el query planner de /ask",
		],
		escribe: "sentencias-capturadas (rs0)",
		frecuencia: "manual / por lote",
	},
	manager: {
		title: "manager + retry",
		server: "worker_01",
		pm2: "sentencias-manager · sentencias-retry",
		steps: [
			"manager: enciende y apaga el grupo de workers según pipeline-config",
			"retry: updateMany de los que quedaron en 'error' para que vuelvan a 'pending'",
		],
		escribe: "sentencias-capturadas, pipeline-config (rs0)",
		frecuencia: "manager continuo · retry cada 30 min",
	},
	qdrant: {
		title: "Qdrant — colección sentencias",
		server: "qdrant-01 (EC2 r6g.large, Tailscale 100.96.196.91)",
		pm2: "systemd `qdrant` v1.18.2",
		steps: [
			"2.15M vectores de 3072 dims, distancia coseno",
			"Cuantización BINARIA desde el 19/08 (antes escalar int8): liberó ~5.7GB de RAM",
			"Los clientes consultan con hnsw_ef=128 — ver ADR-12 en la-infra-docs",
			"Búsqueda con rescore + oversampling 2.0",
		],
		escribe: "lo escriben los workers de embeddings por Tailscale",
		frecuencia: "consulta bajo demanda (~250ms extremo a extremo)",
		estado: "El 18/08 la caja estaba swapeando y /ask tardaba 19s. Con ef=128 + binaria quedó en 768ms.",
	},
	ragApi: {
		title: "pjn-rag-api",
		server: "hub 15.229.93.121 · /var/www/pjn-rag-service",
		pm2: "pjn-rag-api (puerto 5005)",
		steps: [
			"POST /rag/sentencias/ask — prompt en lenguaje natural con query planner opcional",
			"POST /rag/sentencias/buscar — búsqueda semántica pura",
			"GET /rag/sentencias/:id/{chunks,texto}",
			"Es la API por defecto: desde 08/2026 el /ask se migró acá desde pjn-api",
		],
		escribe: "no escribe el corpus (solo lee rs0 + Qdrant)",
		frecuencia: "bajo demanda",
	},
	pjnApi: {
		title: "pjn-api",
		server: "hub 15.229.93.121 · /var/www/pjn-api",
		pm2: "pjn/api",
		steps: [
			"Administración del corpus: sentencias-capturadas, SAIJ, configs de los workers",
			"Sus rutas de BÚSQUEDA quedaron como respaldo tras la migración a pjn-rag-api",
			"Ningún consumidor del ecosistema las usa hoy (verificado el 19/08)",
		],
		escribe: "sentencias-capturadas y configs (rs0), vía endpoints admin",
		frecuencia: "bajo demanda",
		estado: "Candidata a retirar sus rutas de búsqueda: están huérfanas.",
	},
};
