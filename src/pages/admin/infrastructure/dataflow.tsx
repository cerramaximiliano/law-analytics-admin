import React, { useMemo, useState } from "react";
import { Grid, Typography, Box, Chip, Stack } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Hierarchy, InfoCircle } from "iconsax-react";
import MainCard from "components/MainCard";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL, PREMIUM_GOLD, headerBorder } from "themes/dashboardTokens";

// ============================================================================
// Datos de fichas — Zona 2 (panel de detalle)
// ============================================================================

const WORKER_DETAILS: Record<string, { title: string; server: string; pm2: string; steps: string[]; escribe: string; frecuencia: string }> =
	{
		scraping: {
			title: "Scraping de causas",
			server: "worker_01",
			pm2: "scraping-manager + scraping-{CIV,CNT,COM,CSS}-worker_N (pool dinámico)",
			steps: [
				"El manager lee configuracion-scraping (rs0) y escala el pool por fuero",
				"Cada worker toma el siguiente expediente de su rango (findNextGap)",
				"Resuelve captcha del portal SCW PJN y navega el expediente",
				"Parsea carátula, juzgado, objeto y movimientos",
				"Upsert de la causa en rs0 PRIMARY (verified/isValid) + causas-stats",
			],
			escribe: "causas-{civil,trabajo,segsocial,comercial}, configuracion-scraping, scraping-hourly-stats (rs0)",
			frecuencia: "continuo (cron por worker, 1 expediente por ciclo)",
		},
		updateMovimientos: {
			title: "Update de movimientos",
			server: "worker_01",
			pm2: "update-movimientos-manager + update-movimientos-{civ,cnt,com,css}",
			steps: [
				"Lock atómico de una causa elegible (update=true, sin cooldown)",
				"Re-scrapea el expediente en el portal (captcha)",
				"Detecta movimientos nuevos → $push a movimiento[]",
				"Detecta sentencias en los movimientos → bulkWrite a sentencias-capturadas (category novelty)",
				"Genera plazos-notificaciones (bulkWrite) y actualiza trayectoria/etapaProcesal",
				"Unlock + cooldown",
			],
			escribe: "causas-*, sentencias-capturadas, plazos-notificaciones (rs0); el manager espeja configs a Atlas (legacy UI)",
			frecuencia: "cron */2 a */5 min por fuero, 1 causa por tick",
		},
		sentencias: {
			title: "Pipeline de sentencias",
			server: "worker_01",
			pm2: "sentencias-{collector,worker,worker-2,semantic,embeddings,retry,manager} + ocr-worker",
			steps: [
				"collector: escanea causas históricas (100/min) → encola sentencias nuevas en sentencias-capturadas (category rutina, bulkWrite)",
				"worker/worker-2: toma una pending → descarga el PDF del viewer PJN → extrae texto → textGz (marca needsOcr si es escaneado)",
				"ocr-worker: los needsOcr → Tesseract → texto",
				"semantic: compara contra Qdrant → marca double (novedosa) o rejected (formulaica)",
				"embeddings: chunkea → OpenAI (3072 dims) → upsert a Qdrant qdrant-01 colección sentencias",
				"retry: updateMany de errores cada 30 min · manager: enciende/apaga el grupo según pipeline-config",
			],
			escribe: "sentencias-capturadas + pipeline-config + configuracion-* (rs0); vectores → Qdrant",
			frecuencia: "collector cada 1 min · workers cada 1-10 min",
		},
		escritos: {
			title: "Escritos (RAG)",
			server: "worker_01",
			pm2: "pjn-escritos-worker (4 sub-workers BullMQ: extractor, ocr, selector, recovery)",
			steps: [
				"scan.job: busca causas con movimientos nuevos (rs0 LOCAL) → encola en BullMQ (Redis)",
				"extractor: descarga el PDF del escrito → texto → fullTextGz → chunks (texto de chunks a S3) → global_documents (rs0)",
				"ocr: los escaneados → OCR → mismo destino",
				"selector: clasifica el escrito, marca globalProcessed en la causa y publicationStatus en sentencias vinculadas",
				"embeddings de chunks → OpenAI (1024 dims) → Qdrant colección escritos (cuantización binaria)",
				"recovery: re-encola stuck/errores por batch",
			],
			escribe: "global_documents + pipeline-config (rs0), chunks → S3, vectores → Qdrant",
			frecuencia: "event-driven (BullMQ) + scan periódico",
		},
		saij: {
			title: "SAIJ (jurisprudencia)",
			server: "worker_01",
			pm2: "worker_SAIJ_0 + worker_SAIJ_PROV_0 + worker_SAIJ_BACKFILL_0 + worker_SAIJ_enrich",
			steps: [
				"Scrapea el portal SAIJ por cursor (nacional / provincial / backfill histórico)",
				"Guarda el fallo en saij-sentencias (rs0) + PDF a S3",
				"Sincroniza a sentencias-capturadas (source.origin=saij) para el corpus unificado",
				"enrich: genera resúmenes IA (prompt de configuracion-sentencias-collector) para la sección pública /jurisprudencia",
				"Reporta campañas de email vía conexión central (Atlas: email_campaign, emaillogs)",
			],
			escribe: "saij-sentencias, sentencias-capturadas, configuraciones_scraping_saij (rs0); emaillogs/campañas → Atlas",
			frecuencia: "cron cada 3 min - 4 h según worker",
		},
		plazos: {
			title: "Plazos procesales",
			server: "worker_01",
			pm2: "plazos-worker + plazos-folders-worker + plazos-dataset-worker",
			steps: [
				"plazos-worker: toma cédulas de notificación (lock) → extrae el plazo del texto (textExcerptGz) → calcula vencimiento con feriados-judiciales",
				"plazos-folders: matchea plazos con folders de usuarios → crea foldernotifications (Atlas) para la app",
				"plazos-dataset: arma dataset de entrenamiento round-robin sobre ~28 fueros",
			],
			escribe: "plazos-notificaciones, plazos-dataset (rs0); foldernotifications → Atlas",
			frecuencia: "cada 1-5 min",
		},
		etapa: {
			title: "Etapa procesal",
			server: "worker_01",
			pm2: "etapa-stats",
			steps: [
				"Cursor sobre 6 colecciones de causas → deriva segmentos de etapaProcesal (bulkWrite chunks de 500)",
				"Consolida resúmenes por juzgado/fuero",
				"Replica los resúmenes a Atlas para vistas legacy",
			],
			escribe: "etapa-segmentos, etapa-resultados, etapa-stats (rs0) + réplica Atlas",
			frecuencia: "hechos cada hora · resúmenes 1×/día",
		},
		emails: {
			title: "Extracción y verificación de emails",
			server: "worker_01",
			pm2: "pjn-email-extraction + email-verification",
			steps: [
				"extraction: recorre causas (rs0) → descarga PDFs → extrae emails con limpieza de TLDs → upsert atómico en email_contacts (Atlas) → marca emailsScraped en la causa (rs0)",
				"verification: verifica contactos contra NeverBounce respetando límite diario → actualiza email_contacts",
			],
			escribe: "flags en causas-* (rs0); email_contacts → Atlas",
			frecuencia: "extraction diario 3 AM · verification según config",
		},
		cacheApi: {
			title: "pjn/cache-api",
			server: "hub :8084",
			pm2: "pjn/cache-api",
			steps: [
				"Recibe requests de la UI admin (api.lawanalytics.app/cache/) y de causaCacheService (vinculación de causas)",
				"Lee del SECONDARY de rs0 (~1ms, readPreference secondaryPreferred)",
				"Las escrituras (configs desde la UI) las rutea el driver al PRIMARY automáticamente",
			],
			escribe: "—(lector; configs van al primary vía driver)",
			frecuencia: "on-demand (reemplazó al túnel ngrok: 95ms → 2ms)",
		},
	};

interface InfraDetail {
	title: string;
	server: string;
	rol: string;
	detalle: string[];
}

const INFRA_DETAILS: Record<string, InfraDetail> = {
	rs0: {
		title: "rs0 — Replica Set MongoDB",
		server: "worker_01 + mongodb-rs-01 (EC2) + pjnworker",
		rol: "Storage principal de los datos judiciales: los workers escriben en el PRIMARY local (sub-ms) y el hub lee del SECONDARY (~1ms). Replicación por oplog con lag ~0s.",
		detalle: [
			"PRIMARY · worker_01 — recibe todas las escrituras de los workers",
			"SECONDARY · mongodb-rs-01 (EC2) — sirve las lecturas del hub (readPreference secondaryPreferred)",
			"ÁRBITRO · pjnworker — solo vota en elecciones, no almacena datos",
			"Colecciones: causas-*, sentencias-capturadas, global_documents, plazos-*, saij-sentencias, etapa-*, configuracion-*",
		],
	},
	primary: {
		title: "PRIMARY · worker_01",
		server: "worker_01",
		rol: "Nodo primario de rs0 — recibe todas las escrituras de los workers en la misma máquina (latencia sub-ms).",
		detalle: [
			"Escriben: scraping, update-movimientos, sentencias, escritos, SAIJ, plazos, etapa procesal, emails",
			"Replica al SECONDARY vía oplog (lag ~0s)",
		],
	},
	secondary: {
		title: "SECONDARY · mongodb-rs-01",
		server: "EC2 mongodb-rs-01",
		rol: "Nodo secundario de rs0 — sirve las lecturas del hub con ~1ms de latencia.",
		detalle: [
			"Leen: pjn/cache-api, pjn-api, pjn-rag-api, law-analytics-server",
			"readPreference secondaryPreferred (las escrituras van al PRIMARY vía driver)",
		],
	},
	arbiter: {
		title: "ÁRBITRO · pjnworker",
		server: "pjnworker",
		rol: "Árbitro del replica set — participa en elecciones de primario, no almacena datos.",
		detalle: ["Garantiza quórum (3 votos) con solo 2 nodos de datos"],
	},
	qdrant: {
		title: "Qdrant · qdrant-01",
		server: "EC2 qdrant-01",
		rol: "Base de datos vectorial para búsqueda semántica sobre el corpus judicial.",
		detalle: [
			"escritos: 14.4M vectores (1024 dims, cuantización binaria)",
			"sentencias: 2.1M vectores (3072 dims)",
			"style-corpus: 100k vectores",
			"Ingesta: pipelines de sentencias y escritos vía OpenAI (batch por Tailscale)",
			"Consulta: pjn-api y pjn-rag-api (búsqueda vectorial)",
		],
	},
	atlas: {
		title: "Atlas (core transaccional)",
		server: "MongoDB Atlas (cloud)",
		rol: "Cluster core del ecosistema — usuarios, folders, billing y marketing. Los workers judiciales solo escriben acá lo que sigue siendo del core.",
		detalle: [
			"usuarios · folders · billing · marketing",
			"foldernotifications (plazos-folders → app de usuarios)",
			"email_contacts (extracción y verificación de emails)",
			"emaillogs / email_campaign (SAIJ y marketing)",
			"Réplicas legacy de configs y resúmenes (update-movimientos, etapa procesal)",
		],
	},
	pjnApi: {
		title: "pjn-api",
		server: "worker_01",
		rol: "API REST principal de causas PJN — causas, sentencias, configuración de workers, captcha, movimientos.",
		detalle: [
			"Lee causas y sentencias del SECONDARY de rs0",
			"Búsqueda vectorial de sentencias contra Qdrant",
			"Endpoints de config de los services de sentencias (collector / semantic / capturadas)",
		],
	},
	ragApi: {
		title: "pjn-rag-api",
		server: "hub",
		rol: "API de chat RAG con documentos judiciales + búsqueda; endpoints admin de escritos y publicaciones de sentencias.",
		detalle: [
			"Socket.io + Bull MQ + OpenAI",
			"Búsqueda vectorial contra Qdrant (escritos / sentencias)",
			"Config del pipeline de escritos (/rag/admin/escritos-worker/*)",
		],
	},
	laServer: {
		title: "law-analytics-server",
		server: "hub",
		rol: "Hub central: auth JWT + API principal + admin-api. Sirve la sección pública /jurisprudencia leyendo del SECONDARY.",
		detalle: [
			"Emite los JWT que consumen todas las APIs del ecosistema",
			"Jurisprudencia pública (saij-sentencias enriquecidas)",
			"Core transaccional contra Atlas (usuarios, folders, billing)",
		],
	},
	ui: {
		title: "UI Admin / App usuarios",
		server: "dashboard.lawanalytics.app · lawanalytics.app",
		rol: "Frontends React que consumen las APIs del ecosistema.",
		detalle: [
			"UI admin: monitoreo de workers y configuración (vía cache-api y APIs)",
			"App de usuarios: causas vinculadas, jurisprudencia, RAG",
		],
	},
	srcPjn: {
		title: "Portal PJN (scw)",
		server: "scw.pjn.gov.ar (externo)",
		rol: "Portal de consulta web del Poder Judicial de la Nación — fuente de scraping y update de movimientos (con captcha).",
		detalle: ["Consumen: scraping de causas, update de movimientos"],
	},
	srcSaij: {
		title: "Portal SAIJ",
		server: "saij.gob.ar (externo)",
		rol: "Sistema Argentino de Información Jurídica — fuente de jurisprudencia nacional y provincial.",
		detalle: ["Consumen: workers SAIJ (nacional / provincial / backfill)"],
	},
	srcViewer: {
		title: "Viewer PDFs PJN",
		server: "PJN (externo)",
		rol: "Viewer de documentos judiciales del PJN — descarga de PDFs de sentencias, escritos y cédulas.",
		detalle: ["Consumen: pipeline de sentencias, escritos RAG, plazos, extracción de emails"],
	},
	srcOpenai: {
		title: "OpenAI API",
		server: "api.openai.com (externo)",
		rol: "Embeddings (1024 dims escritos · 3072 dims sentencias) y resúmenes IA. El tráfico batch sale por Tailscale.",
		detalle: ["Consumen: pipeline de sentencias, escritos RAG, SAIJ enrich"],
	},
};

// ============================================================================
// Modelo del diagrama — Zona 1
// ============================================================================

type NodeKind = "source" | "worker" | "storage" | "api" | "ui";

interface DNode {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	title: string;
	sub?: string[];
	kind: NodeKind;
	accent?: string;
}

interface DEdge {
	id: string;
	from: string;
	to: string;
	d: string;
	color: string;
	animated?: boolean;
	dashed?: boolean;
}

interface DLabel {
	x: number;
	y: number;
	text: string;
	color: string;
}

const SRC_X = 24;
const SRC_W = 160;
const WRK_X = 240;
const WRK_W = 200;
const WRK_H = 58;
const WORKER_YS: Record<string, number> = {
	scraping: 30,
	updateMovimientos: 100,
	sentencias: 170,
	escritos: 240,
	saij: 310,
	plazos: 380,
	etapa: 450,
	emails: 520,
};

const NODES: DNode[] = [
	// Col 1 — fuentes
	{ id: "srcPjn", x: SRC_X, y: 52, w: SRC_W, h: 56, title: "Portal PJN (scw)", sub: ["scw.pjn.gov.ar · captcha"], kind: "source" },
	{ id: "srcViewer", x: SRC_X, y: 160, w: SRC_W, h: 56, title: "Viewer PDFs PJN", sub: ["documentos judiciales"], kind: "source" },
	{ id: "srcSaij", x: SRC_X, y: 312, w: SRC_W, h: 56, title: "Portal SAIJ", sub: ["jurisprudencia nac. + prov."], kind: "source" },
	{
		id: "srcOpenai",
		x: SRC_X,
		y: 548,
		w: SRC_W,
		h: 56,
		title: "OpenAI API",
		sub: ["embeddings · resúmenes"],
		kind: "source",
		accent: PRO_TEAL,
	},
	// Col 2 — worker_01
	{
		id: "scraping",
		x: WRK_X,
		y: WORKER_YS.scraping,
		w: WRK_W,
		h: WRK_H,
		title: "Scraping causas",
		sub: ["pool CIV·CNT·COM·CSS", "+ manager"],
		kind: "worker",
	},
	{
		id: "updateMovimientos",
		x: WRK_X,
		y: WORKER_YS.updateMovimientos,
		w: WRK_W,
		h: WRK_H,
		title: "Update movimientos",
		sub: ["manager + 4 workers"],
		kind: "worker",
	},
	{
		id: "sentencias",
		x: WRK_X,
		y: WORKER_YS.sentencias,
		w: WRK_W,
		h: WRK_H,
		title: "Pipeline sentencias",
		sub: ["collector · worker · ocr", "semantic · embeddings · retry"],
		kind: "worker",
	},
	{
		id: "escritos",
		x: WRK_X,
		y: WORKER_YS.escritos,
		w: WRK_W,
		h: WRK_H,
		title: "Escritos RAG",
		sub: ["scan · extractor · ocr", "selector · recovery"],
		kind: "worker",
	},
	{
		id: "saij",
		x: WRK_X,
		y: WORKER_YS.saij,
		w: WRK_W,
		h: WRK_H,
		title: "SAIJ",
		sub: ["worker_0 · PROV · BACKFILL", "+ enrich (resúmenes IA)"],
		kind: "worker",
	},
	{
		id: "plazos",
		x: WRK_X,
		y: WORKER_YS.plazos,
		w: WRK_W,
		h: WRK_H,
		title: "Plazos",
		sub: ["worker · folders · dataset"],
		kind: "worker",
	},
	{ id: "etapa", x: WRK_X, y: WORKER_YS.etapa, w: WRK_W, h: WRK_H, title: "Etapa procesal", sub: ["etapa-stats"], kind: "worker" },
	{
		id: "emails",
		x: WRK_X,
		y: WORKER_YS.emails,
		w: WRK_W,
		h: WRK_H,
		title: "Emails",
		sub: ["extraction + verification"],
		kind: "worker",
	},
	// Col 3 — almacenamiento (primary/secondary/arbiter viven dentro del contenedor rs0, que se dibuja aparte)
	{
		id: "primary",
		x: 544,
		y: 78,
		w: 252,
		h: 52,
		title: "PRIMARY · worker_01",
		sub: ["escrituras sub-ms"],
		kind: "storage",
		accent: LIVE_GREEN,
	},
	{
		id: "secondary",
		x: 544,
		y: 182,
		w: 252,
		h: 52,
		title: "SECONDARY · mongodb-rs-01 EC2",
		sub: ["lecturas del hub ~1ms"],
		kind: "storage",
		accent: LIVE_GREEN,
	},
	{ id: "arbiter", x: 544, y: 250, w: 180, h: 42, title: "ÁRBITRO · pjnworker", sub: ["solo vota"], kind: "storage", accent: LIVE_GREEN },
	{
		id: "qdrant",
		x: 544,
		y: 356,
		w: 252,
		h: 88,
		title: "Qdrant · qdrant-01 EC2",
		sub: ["escritos 14.4M · sentencias 2.1M", "style-corpus 100k"],
		kind: "storage",
		accent: PRO_TEAL,
	},
	{
		id: "atlas",
		x: 544,
		y: 474,
		w: 252,
		h: 72,
		title: "Atlas (core transaccional)",
		sub: ["usuarios · folders · billing", "· marketing"],
		kind: "storage",
		accent: PREMIUM_GOLD,
	},
	// Col 4 — consumo (hub)
	{ id: "ui", x: 920, y: 28, w: 240, h: 52, title: "UI Admin / App usuarios", sub: ["dashboard · lawanalytics.app"], kind: "ui" },
	{
		id: "cacheApi",
		x: 900,
		y: 104,
		w: 230,
		h: 56,
		title: "pjn/cache-api :8084",
		sub: ["lecturas del SECONDARY · hub"],
		kind: "api",
	},
	{ id: "pjnApi", x: 900, y: 192, w: 230, h: 56, title: "pjn-api", sub: ["causas · sentencias · configs"], kind: "api" },
	{ id: "ragApi", x: 900, y: 280, w: 230, h: 56, title: "pjn-rag-api", sub: ["RAG + búsqueda"], kind: "api" },
	{ id: "laServer", x: 900, y: 368, w: 230, h: 56, title: "law-analytics-server", sub: ["jurisprudencia pública"], kind: "api" },
];

const RS0_BOX = { x: 520, y: 36, w: 300, h: 292 };

// Curva horizontal suave entre dos puntos
const hcurve = (x1: number, y1: number, x2: number, y2: number, bend = 0.5): string => {
	const dx = (x2 - x1) * bend;
	return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

const buildEdges = (neutral: string): DEdge[] => {
	const workerIds = Object.keys(WORKER_YS);
	const writes: DEdge[] = workerIds.map((id, i) => ({
		id: `w-${id}`,
		from: id,
		to: "primary",
		d: hcurve(WRK_X + WRK_W, WORKER_YS[id] + 29, 544, 81 + i * 6, 0.45),
		color: BRAND_BLUE,
		animated: true,
	}));
	return [
		// Fuentes → workers
		{ id: "s1", from: "srcPjn", to: "scraping", d: hcurve(184, 68, WRK_X, 59), color: neutral },
		{ id: "s2", from: "srcPjn", to: "updateMovimientos", d: hcurve(184, 92, WRK_X, 129), color: neutral },
		{ id: "s3", from: "srcViewer", to: "sentencias", d: hcurve(184, 175, WRK_X, 199), color: neutral },
		{ id: "s4", from: "srcViewer", to: "escritos", d: hcurve(184, 190, WRK_X, 269), color: neutral },
		{ id: "s5", from: "srcViewer", to: "plazos", d: "M 184 202 C 202 320, 200 409, 240 409", color: neutral },
		{ id: "s6", from: "srcViewer", to: "emails", d: "M 184 212 C 198 380, 196 549, 240 549", color: neutral },
		{ id: "s7", from: "srcSaij", to: "saij", d: hcurve(184, 340, WRK_X, 339), color: neutral },
		// Workers → PRIMARY (escrituras)
		...writes,
		// Oplog + lecturas
		{ id: "oplog", from: "primary", to: "secondary", d: "M 670 130 L 670 182", color: LIVE_GREEN, animated: true },
		{ id: "r1", from: "secondary", to: "cacheApi", d: hcurve(796, 190, 900, 132), color: LIVE_GREEN },
		{ id: "r2", from: "secondary", to: "pjnApi", d: hcurve(796, 202, 900, 220), color: LIVE_GREEN },
		{ id: "r3", from: "secondary", to: "ragApi", d: hcurve(796, 214, 900, 308), color: LIVE_GREEN },
		{ id: "r4", from: "secondary", to: "laServer", d: hcurve(796, 226, 900, 396), color: LIVE_GREEN },
		// Embeddings: workers → OpenAI → Qdrant
		{ id: "e1", from: "sentencias", to: "srcOpenai", d: "M 240 214 C 208 244, 212 480, 170 548", color: PRO_TEAL, animated: true },
		{ id: "e2", from: "escritos", to: "srcOpenai", d: "M 240 284 C 212 312, 216 500, 140 548", color: PRO_TEAL, animated: true },
		{ id: "e3", from: "srcOpenai", to: "qdrant", d: "M 184 582 C 330 622, 560 606, 636 446", color: PRO_TEAL, animated: true },
		// Qdrant → APIs (búsqueda vectorial)
		{ id: "q1", from: "qdrant", to: "pjnApi", d: hcurve(796, 384, 900, 236), color: PRO_TEAL },
		{ id: "q2", from: "qdrant", to: "ragApi", d: hcurve(796, 412, 900, 324), color: PRO_TEAL },
		// Flujos que siguen yendo al core (Atlas)
		{ id: "a1", from: "saij", to: "atlas", d: hcurve(440, 348, 544, 490, 0.6), color: STALE_AMBER, dashed: true },
		{ id: "a2", from: "plazos", to: "atlas", d: hcurve(440, 415, 544, 506, 0.6), color: STALE_AMBER, dashed: true },
		{ id: "a3", from: "emails", to: "atlas", d: hcurve(440, 555, 544, 530, 0.6), color: STALE_AMBER, dashed: true },
		// APIs → UI
		{ id: "u1", from: "cacheApi", to: "ui", d: "M 990 104 C 986 94, 982 90, 978 82", color: neutral },
		{ id: "u2", from: "pjnApi", to: "ui", d: "M 1130 216 C 1182 216, 1180 98, 1075 82", color: neutral },
		{ id: "u3", from: "ragApi", to: "ui", d: "M 1130 304 C 1196 304, 1198 94, 1112 82", color: neutral },
		{ id: "u4", from: "laServer", to: "ui", d: "M 1130 392 C 1212 392, 1214 90, 1148 82", color: neutral },
	];
};

const LABELS: DLabel[] = [
	{ x: 480, y: 64, text: "escrituras", color: BRAND_BLUE },
	{ x: 670, y: 156, text: "oplog (replicación, lag ~0s)", color: LIVE_GREEN },
	{ x: 856, y: 170, text: "lecturas ~1ms", color: LIVE_GREEN },
	{ x: 400, y: 610, text: "embeddings (batch por Tailscale)", color: PRO_TEAL },
	{ x: 852, y: 352, text: "búsqueda vectorial", color: PRO_TEAL },
	{ x: 668, y: 564, text: "foldernotifications · email_contacts · emaillogs", color: STALE_AMBER },
];

// El contenedor rs0 agrupa a sus miembros para el highlight de hover/selección
const expandIds = (id: string): string[] => (id === "rs0" ? ["rs0", "primary", "secondary", "arbiter"] : [id]);

// ============================================================================
// Sub-componentes SVG
// ============================================================================

interface LabelChipProps {
	label: DLabel;
	bg: string;
}

const LabelChip = ({ label, bg }: LabelChipProps) => {
	const w = label.text.length * 5.2 + 16;
	return (
		<g pointerEvents="none">
			<rect x={label.x - w / 2} y={label.y - 9} width={w} height={18} rx={9} fill={bg} stroke={alpha(label.color, 0.45)} opacity={0.95} />
			<text x={label.x} y={label.y + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill={label.color}>
				{label.text}
			</text>
		</g>
	);
};

// ============================================================================
// Página
// ============================================================================

const DataFlowPage = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);

	const neutralEdge = isDark ? alpha(theme.palette.common.white, 0.32) : alpha(theme.palette.common.black, 0.28);
	const edges = useMemo(() => buildEdges(neutralEdge), [neutralEdge]);

	const activeId = hovered ?? selected;

	const { activeEdgeIds, relatedNodeIds } = useMemo(() => {
		if (!activeId) return { activeEdgeIds: null as Set<string> | null, relatedNodeIds: null as Set<string> | null };
		const activeSet = new Set(expandIds(activeId));
		const edgeIds = new Set<string>();
		const nodeIds = new Set<string>(activeSet);
		edges.forEach((e) => {
			if (activeSet.has(e.from) || activeSet.has(e.to)) {
				edgeIds.add(e.id);
				nodeIds.add(e.from);
				nodeIds.add(e.to);
			}
		});
		return { activeEdgeIds: edgeIds, relatedNodeIds: nodeIds };
	}, [activeId, edges]);

	const nodeOpacity = (id: string): number => (relatedNodeIds ? (relatedNodeIds.has(id) ? 1 : 0.3) : 1);
	const edgeOpacity = (e: DEdge): number => (activeEdgeIds ? (activeEdgeIds.has(e.id) ? 1 : 0.1) : 0.85);

	const paperBg = theme.palette.background.paper;
	const nodeFill = isDark ? alpha(theme.palette.common.white, 0.04) : paperBg;
	const nodeStroke = theme.palette.divider;
	const textPrimary = theme.palette.text.primary;
	const textSecondary = theme.palette.text.secondary;
	const colHeader = alpha(textSecondary as string, 0.85);

	const handleNodeClick = (id: string) => {
		setSelected((prev) => (prev === id ? null : id));
	};

	const renderNode = (n: DNode) => {
		const isSelected = selected === n.id;
		const isHovered = hovered === n.id;
		const accent = n.accent ?? (n.kind === "worker" ? BRAND_BLUE : n.kind === "source" ? (textSecondary as string) : BRAND_BLUE);
		const hasSub = n.sub && n.sub.length > 0;
		const titleY = hasSub ? n.y + 21 : n.y + n.h / 2 + 4;
		return (
			<g
				key={n.id}
				opacity={nodeOpacity(n.id)}
				style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
				onClick={(ev) => {
					ev.stopPropagation();
					handleNodeClick(n.id);
				}}
				onMouseEnter={() => setHovered(n.id)}
				onMouseLeave={() => setHovered((prev) => (prev === n.id ? null : prev))}
			>
				<rect
					x={n.x}
					y={n.y}
					width={n.w}
					height={n.h}
					rx={8}
					fill={n.kind === "worker" ? alpha(BRAND_BLUE, isDark ? 0.1 : 0.05) : nodeFill}
					stroke={isSelected ? BRAND_BLUE : isHovered ? alpha(BRAND_BLUE, 0.65) : nodeStroke}
					strokeWidth={isSelected ? 2.25 : isHovered ? 1.5 : 1}
				/>
				<rect x={n.x} y={n.y + 9} width={3} height={n.h - 18} rx={1.5} fill={accent} />
				<text x={n.x + 14} y={titleY} fontSize={11.5} fontWeight={600} fill={textPrimary}>
					{n.title}
				</text>
				{(n.sub ?? []).map((line, i) => (
					<text key={i} x={n.x + 14} y={n.y + 34 + i * 11.5} fontSize={8.5} fill={textSecondary}>
						{line}
					</text>
				))}
			</g>
		);
	};

	// Ficha activa (Zona 2)
	const workerDetail = selected && Object.prototype.hasOwnProperty.call(WORKER_DETAILS, selected) ? WORKER_DETAILS[selected] : undefined;
	const infraDetail =
		!workerDetail && selected && Object.prototype.hasOwnProperty.call(INFRA_DETAILS, selected) ? INFRA_DETAILS[selected] : undefined;

	const legendItems: { color: string; dashed?: boolean; animated?: boolean; label: string }[] = [
		{ color: BRAND_BLUE, animated: true, label: "escrituras (workers → PRIMARY)" },
		{ color: LIVE_GREEN, label: "oplog / lecturas ~1ms" },
		{ color: PRO_TEAL, label: "embeddings / búsqueda vectorial" },
		{ color: STALE_AMBER, dashed: true, label: "flujos al core (Atlas)" },
		{ color: neutralEdge, label: "fuentes / entrega a UI" },
	];

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<MainCard
					title={
						<Stack direction="row" spacing={1} alignItems="center">
							<Hierarchy size={20} color={BRAND_BLUE} />
							<span>Flujo de datos del ecosistema</span>
							<Chip label="rs0 · qdrant" size="small" variant="outlined" color="info" sx={{ ml: 1 }} />
						</Stack>
					}
					secondary={
						<Typography variant="caption" color="text.secondary">
							Click en un nodo para ver su ficha
						</Typography>
					}
				>
					<Box sx={{ overflowX: "auto", pb: 1 }}>
						<Box
							component="svg"
							viewBox="0 0 1220 648"
							sx={{ width: "100%", minWidth: 980, height: "auto", display: "block", fontFamily: theme.typography.fontFamily }}
							onClick={() => setSelected(null)}
						>
							<style>
								{`@keyframes laFlowDash { to { stroke-dashoffset: -24; } }
								.la-flow-anim { stroke-dasharray: 7 5; animation: laFlowDash 1.3s linear infinite; }
								@media (prefers-reduced-motion: reduce) { .la-flow-anim { animation: none; } }`}
							</style>
							<defs>
								{[
									["arw-blue", BRAND_BLUE],
									["arw-green", LIVE_GREEN],
									["arw-teal", PRO_TEAL],
									["arw-amber", STALE_AMBER],
									["arw-neutral", neutralEdge],
								].map(([id, color]) => (
									<marker
										key={id}
										id={id}
										viewBox="0 0 10 10"
										refX="8.5"
										refY="5"
										markerWidth="6.5"
										markerHeight="6.5"
										orient="auto-start-reverse"
									>
										<path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
									</marker>
								))}
							</defs>

							{/* Headers de columna */}
							<text x={SRC_X} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
								FUENTES
							</text>
							<text x={WRK_X} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
								WORKER_01 — PROCESAMIENTO
							</text>
							<text x={520} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
								ALMACENAMIENTO
							</text>
							<text x={900} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
								CONSUMO — HUB
							</text>

							{/* Contenedor rs0 */}
							<g
								opacity={relatedNodeIds ? (["rs0", "primary", "secondary", "arbiter"].some((id) => relatedNodeIds.has(id)) ? 1 : 0.3) : 1}
								style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
								onClick={(ev) => {
									ev.stopPropagation();
									handleNodeClick("rs0");
								}}
							>
								<rect
									x={RS0_BOX.x}
									y={RS0_BOX.y}
									width={RS0_BOX.w}
									height={RS0_BOX.h}
									rx={10}
									fill={alpha(LIVE_GREEN, isDark ? 0.05 : 0.035)}
									stroke={selected === "rs0" ? BRAND_BLUE : alpha(LIVE_GREEN, 0.4)}
									strokeWidth={selected === "rs0" ? 2.25 : 1.2}
								/>
								<text x={RS0_BOX.x + 16} y={RS0_BOX.y + 24} fontSize={11.5} fontWeight={700} fill={textPrimary}>
									rs0 — Replica Set MongoDB
								</text>
							</g>

							{/* Flechas */}
							{edges.map((e) => {
								const markerId =
									e.color === BRAND_BLUE
										? "arw-blue"
										: e.color === LIVE_GREEN
										? "arw-green"
										: e.color === PRO_TEAL
										? "arw-teal"
										: e.color === STALE_AMBER
										? "arw-amber"
										: "arw-neutral";
								return (
									<path
										key={e.id}
										d={e.d}
										fill="none"
										stroke={e.color}
										strokeWidth={1.6}
										strokeDasharray={e.dashed && !e.animated ? "5 4" : undefined}
										className={e.animated ? "la-flow-anim" : undefined}
										markerEnd={`url(#${markerId})`}
										opacity={edgeOpacity(e)}
										style={{ transition: "opacity 0.2s ease" }}
										pointerEvents="none"
									/>
								);
							})}

							{/* Etiquetas de flechas */}
							{LABELS.map((l) => (
								<LabelChip key={l.text} label={l} bg={paperBg} />
							))}

							{/* Nodos */}
							{NODES.map(renderNode)}
						</Box>
					</Box>

					{/* Leyenda */}
					<Stack
						direction="row"
						flexWrap="wrap"
						columnGap={3}
						rowGap={1}
						sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${headerBorder(isDark)}` }}
					>
						{legendItems.map((item) => (
							<Stack key={item.label} direction="row" spacing={1} alignItems="center">
								<Box component="svg" viewBox="0 0 34 8" sx={{ width: 34, height: 8, display: "block" }}>
									<line
										x1={1}
										y1={4}
										x2={33}
										y2={4}
										stroke={item.color}
										strokeWidth={2}
										strokeDasharray={item.dashed ? "4 3" : item.animated ? "6 4" : undefined}
									/>
								</Box>
								<Typography variant="caption" color="text.secondary">
									{item.label}
								</Typography>
							</Stack>
						))}
					</Stack>
				</MainCard>
			</Grid>

			{/* Zona 2 — panel de detalle */}
			<Grid item xs={12}>
				<MainCard>
					{workerDetail ? (
						<Stack spacing={1.5}>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={1}>
								<Typography variant="h5">{workerDetail.title}</Typography>
								<Chip label={workerDetail.server} size="small" color="primary" variant="outlined" />
								<Chip label={workerDetail.frecuencia} size="small" variant="outlined" />
							</Stack>
							<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
								PM2: {workerDetail.pm2}
							</Typography>
							<Box component="ol" sx={{ m: 0, pl: 3, "& li": { mb: 0.75 } }}>
								{workerDetail.steps.map((step, i) => (
									<Typography key={i} component="li" variant="body2">
										{step}
									</Typography>
								))}
							</Box>
							<Typography variant="body2" sx={{ pt: 0.5, borderTop: `1px solid ${headerBorder(isDark)}` }}>
								<Box component="span" sx={{ fontWeight: 600 }}>
									Escribe en:
								</Box>{" "}
								{workerDetail.escribe}
							</Typography>
						</Stack>
					) : infraDetail ? (
						<Stack spacing={1.5}>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={1}>
								<Typography variant="h5">{infraDetail.title}</Typography>
								<Chip label={infraDetail.server} size="small" color="primary" variant="outlined" />
							</Stack>
							<Typography variant="body2">{infraDetail.rol}</Typography>
							<Box component="ul" sx={{ m: 0, pl: 3, "& li": { mb: 0.5 } }}>
								{infraDetail.detalle.map((line, i) => (
									<Typography key={i} component="li" variant="body2" color="text.secondary">
										{line}
									</Typography>
								))}
							</Box>
						</Stack>
					) : (
						<Stack direction="row" spacing={1} alignItems="center">
							<InfoCircle size={18} color={theme.palette.text.secondary as string} />
							<Typography variant="body2" color="text.secondary">
								Seleccioná un nodo del diagrama (grupo de workers, storage o API) para ver su ficha: procesos PM2, pipeline paso a paso y
								colecciones que escribe.
							</Typography>
						</Stack>
					)}
				</MainCard>
			</Grid>
		</Grid>
	);
};

export default DataFlowPage;
