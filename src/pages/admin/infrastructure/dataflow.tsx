import React, { useMemo, useState } from "react";
import { Grid, Typography, Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Hierarchy, InfoCircle } from "iconsax-react";
import MainCard from "components/MainCard";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL, PREMIUM_GOLD, headerBorder } from "themes/dashboardTokens";

// Salto HTTP (lectura vía API). Es la única clase de flecha que no tiene color
// en `dashboardTokens` porque es exclusiva de este diagrama. Se eligió rosa y
// no violeta: el violeta se confunde con BRAND_BLUE bajo deuteranopía (misma
// razón por la que PRO_TEAL reemplazó al violeta en los tokens).
const API_HOP = "#DB2777";

// Conexión común de todos los workers de worker_01 al replica set.
const WORKER_CONEXION =
	"rs0 vía SENTENCIAS_MONGO_URI (AWS Secrets Manager) · readPreference: primary (corren en el mismo box que el PRIMARY)";

// ============================================================================
// Datos de fichas — Zona 2 (panel de detalle)
// ============================================================================

interface WorkerDetail {
	title: string;
	server: string;
	pm2: string;
	steps: string[];
	escribe: string;
	frecuencia: string;
	conexion: string;
	estado?: string;
}

const WORKER_DETAILS: Record<string, WorkerDetail> = {
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
		conexion: WORKER_CONEXION,
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
		conexion: WORKER_CONEXION,
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
		conexion: WORKER_CONEXION,
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
		frecuencia: "event-driven (BullMQ) + scan periódico — hoy sin encolar nada",
		conexion: WORKER_CONEXION,
		estado:
			"Pausado por configuración desde el 2026-05-09: pipeline-config tiene escritosWorker.enabled = false, así que el scan no encola jobs y los 4 sub-workers quedan idle. Por eso global_documents no crece — no es una falla del worker, del portal ni de la ingesta a Qdrant. Se reanuda poniendo el flag en true desde pjn-rag-api (/rag/admin/escritos-worker/*).",
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
		conexion: WORKER_CONEXION,
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
		conexion: WORKER_CONEXION,
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
		conexion: WORKER_CONEXION,
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
		conexion: WORKER_CONEXION,
	},
	cacheApi: {
		title: "pjn/cache-api",
		server: "hub :8084",
		pm2: "pjn/cache-api",
		steps: [
			"Recibe requests de la UI admin (api.lawanalytics.app/cache/) y de causaCacheService de law-analytics-server (vinculación de causas)",
			"Lee del SECONDARY de rs0 (~1ms, readPreference secondaryPreferred)",
			"Las escrituras (configs desde la UI) las rutea el driver al PRIMARY automáticamente",
		],
		escribe: "—(lector; configs van al primary vía driver)",
		frecuencia: "on-demand",
		conexion:
			"arranca con MONGO_TARGET=rs0 y resuelve la URI del replica set desde el secreto de AWS Secrets Manager — no quedan credenciales en el dump de PM2 · readPreference: secondaryPreferred",
	},
};

interface InfraWarn {
	title: string;
	head: string[];
	rows: string[][];
	nota: string;
}

interface InfraDetail {
	title: string;
	server: string;
	rol: string;
	detalle: string[];
	warn?: InfraWarn;
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
			"Autenticación activa desde el 13/08: keyFile entre los miembros + usuarios con rol por base (antes el set escuchaba sin auth)",
			"Las URIs con credenciales viven en AWS Secrets Manager (SENTENCIAS_MONGO_URI para los workers, MONGO_TARGET=rs0 para cache-api)",
			"Colecciones: causas-*, sentencias-capturadas, global_documents, plazos-*, saij-sentencias, etapa-*, configuracion-*",
		],
	},
	primary: {
		title: "PRIMARY · worker_01",
		server: "worker_01",
		rol: "Nodo primario de rs0 — recibe todas las escrituras de los workers en la misma máquina (latencia sub-ms).",
		detalle: [
			"Escriben: scraping, update-movimientos, sentencias, escritos, SAIJ, plazos, etapa procesal, emails",
			"Los workers conectan con readPreference primary (leen y escriben del nodo local)",
			"Replica al SECONDARY vía oplog (lag ~0s)",
		],
	},
	secondary: {
		title: "SECONDARY · mongodb-rs-01",
		server: "EC2 mongodb-rs-01",
		rol: "Nodo secundario de rs0 — sirve las lecturas del hub con ~1ms de latencia.",
		detalle: [
			"Leen directo: pjn/cache-api, pjn-api, pjn-rag-api, law-analytics-server",
			"readPreference secondaryPreferred (las escrituras van al PRIMARY vía driver)",
			"Los frontends y la-mcp-server no conectan acá: llegan por HTTP a través de esas APIs",
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
			"La colección escritos no crece desde el 2026-05-09: el pipeline de escritos está pausado por config",
			"Consulta: pjn-api y pjn-rag-api (búsqueda vectorial)",
		],
	},
	atlas: {
		title: "Atlas (core transaccional)",
		server: "MongoDB Atlas (cloud)",
		rol: "Cluster core del ecosistema — usuarios, folders, billing y marketing. Es lo único vivo que queda acá: los datos judiciales pesados ya se mudaron a rs0.",
		detalle: [
			"Vivo: usuarios · folders · billing · marketing",
			"foldernotifications (plazos-folders → app de usuarios)",
			"email_contacts (extracción y verificación de emails)",
			"emaillogs / email_campaign (SAIJ y marketing)",
			"Congelado: las 7 colecciones migradas a rs0 siguen presentes pero sin escrituras nuevas — quedan como red de seguridad hasta el drop previsto para ~25/08",
			"Mientras existan, cualquier lectura que apunte acá devuelve la foto del día de la migración (ver la ficha de pjn-api)",
			"Réplicas legacy de configs y resúmenes (update-movimientos, etapa procesal)",
		],
	},
	pjnApi: {
		title: "pjn-api",
		server: "hub + worker_01",
		rol: "API REST principal de causas PJN — causas, sentencias, configuración de workers, captcha, movimientos. Lee directo del replica set.",
		detalle: [
			"Lee causas y sentencias del SECONDARY de rs0 (conexión Mongo directa)",
			"Búsqueda vectorial de sentencias contra Qdrant",
			"Endpoints de config de los services de sentencias (collector / semantic / capturadas)",
		],
		warn: {
			title: "⚠ Split-brain: 4 vistas del admin leen una copia stale",
			head: ["Vista", "Colección", "Atlas", "rs0"],
			rows: [
				["AppUpdateWorker", "configuracion-scraping", "20", "65"],
				["ManagerTab · FueroStatsPanel · IntegrationsStatusWidget", "scraping-manager-state", "8", "23"],
				["EtapaStats · Trayectorias", "causas-civil", "432", "854.829"],
			],
			nota: "Esas vistas usan pjnAxios «plain» (sin el prefijo de cache-api), que resuelve al pjn-api del hub — todavía conectado a Atlas, donde las colecciones migradas quedaron congeladas o vacías. El dato vivo está en rs0. Es un pendiente conocido: hay que repuntar esas cuatro vistas a cache-api antes del drop de Atlas (~25/08), o van a quedar en cero.",
		},
	},
	ragApi: {
		title: "pjn-rag-api",
		server: "hub",
		rol: "API de chat RAG con documentos judiciales + búsqueda; endpoints admin de escritos y publicaciones de sentencias. Lee directo del replica set.",
		detalle: [
			"Socket.io + Bull MQ + OpenAI",
			"Conexión Mongo directa al SECONDARY de rs0",
			"Búsqueda vectorial contra Qdrant (escritos / sentencias)",
			"Config del pipeline de escritos (/rag/admin/escritos-worker/*) — hoy con enabled=false",
			"Sirve la búsqueda de sentencias que consume la-mcp-server",
		],
	},
	laServer: {
		title: "law-analytics-server",
		server: "hub",
		rol: "Hub central: auth JWT + API principal + admin-api. Lee directo de rs0 y además consulta el caché de causas por HTTP.",
		detalle: [
			"Emite los JWT que consumen todas las APIs del ecosistema",
			"Lectura directa a rs0: jurisprudencia pública (saij-sentencias enriquecidas) y campañas SAIJ del admin-api",
			"causaCacheService: consulta el caché de causas por HTTP a pjn/cache-api en localhost:8084 (1-2ms)",
			"Ese salto salía por un túnel ngrok (~91ms) hasta el 15/08 — el túnel ya no está en ningún camino activo",
			"Core transaccional contra Atlas (usuarios, folders, billing)",
			"Es la puerta de entrada de law-analytics-front y de la-mcp-server (folders y permisos)",
		],
	},
	uiAdmin: {
		title: "UI Admin",
		server: "dashboard.lawanalytics.app",
		rol: "Frontend React de administración — monitoreo de workers, configuración y estadísticas. Nunca conecta a Mongo: todo lo lee por HTTP.",
		detalle: [
			"Lectura vía API: pjn/cache-api (rs0 en ~1ms), pjn-api, pjn-rag-api y admin-api de law-analytics-server",
			"Es correcto por diseño — un navegador no puede abrir una conexión al replica set",
			"4 vistas todavía pegan al pjn-api del hub y muestran la copia stale de Atlas (ver la ficha de pjn-api)",
		],
	},
	appUsers: {
		title: "law-analytics-front",
		server: "lawanalytics.app",
		rol: "App de usuarios (React) — causas vinculadas, movimientos, jurisprudencia pública y RAG.",
		detalle: [
			"Lectura vía API: todo pasa por law-analytics-server (jurisprudencia pública, movimientos, folders)",
			"Los datos judiciales llegan del rs0, pero siempre con el salto HTTP intermedio",
			"Sin conexión directa a Mongo (correcto por diseño)",
		],
	},
	mcpServer: {
		title: "la-mcp-server",
		server: "hub :3045 · mcp.lawanalytics.app",
		rol: "MCP público OAuth 2.1 para clientes IA externos (Claude.ai, ChatGPT). Expone 12 tools folder-first sin tocar Mongo directamente.",
		detalle: [
			"Lectura vía law-analytics-server: folders, permisos y drill-downs (movimientos, tareas, notas, eventos…)",
			"Lectura vía pjn-rag-api: búsqueda de sentencias y rag_query_causa",
			"Dos saltos HTTP, ambos legítimos: el MCP valida el JWT de Hydra y delega la autorización en las APIs de origen",
			"Nunca abre una conexión al replica set — el aislamiento es parte del modelo de permisos",
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
		detalle: ["Consumen: pipeline de sentencias, escritos RAG (pausado), plazos, extracción de emails"],
	},
	srcOpenai: {
		title: "OpenAI API",
		server: "api.openai.com (externo)",
		rol: "Embeddings (1024 dims escritos · 3072 dims sentencias) y resúmenes IA. El tráfico batch sale por Tailscale.",
		detalle: ["Consumen: pipeline de sentencias, escritos RAG (pausado), SAIJ enrich"],
	},
};

// ============================================================================
// Modelo del diagrama — Zona 1
// ============================================================================

type NodeKind = "source" | "worker" | "storage" | "api" | "client";

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
	/** Chip de estado dibujado en la esquina superior derecha del nodo */
	chip?: { text: string; color: string };
	/** Atenúa el nodo — se usa para los grupos apagados por configuración */
	dim?: boolean;
}

interface DEdge {
	id: string;
	from: string;
	to: string;
	d: string;
	color: string;
	animated?: boolean;
	dashed?: boolean;
	/** Punteado fino de advertencia (camino conocido pero incorrecto) */
	warn?: boolean;
	/** Flujo que hoy no transporta nada porque su worker está pausado */
	paused?: boolean;
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
// Columna 4a — servicios que abren conexión Mongo contra el replica set
const API_X = 880;
const API_W = 210;
const API_H = 56;
// Columna 4b — clientes que solo hablan HTTP con esos servicios
const CLI_X = 1170;
const CLI_W = 200;

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

const API_YS: Record<string, number> = {
	cacheApi: 104,
	laServer: 190,
	pjnApi: 276,
	ragApi: 362,
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
		chip: { text: "pausado por config", color: STALE_AMBER },
		dim: true,
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
		sub: ["vivo: usuarios · folders · billing", "+ 7 colecciones congeladas (drop ~25/08)"],
		kind: "storage",
		accent: PREMIUM_GOLD,
	},
	// Col 4a — consumo con conexión Mongo directa al replica set
	{
		id: "cacheApi",
		x: API_X,
		y: API_YS.cacheApi,
		w: API_W,
		h: API_H,
		title: "pjn/cache-api :8084",
		sub: ["MONGO_TARGET=rs0 · hub", "lee del SECONDARY"],
		kind: "api",
		accent: LIVE_GREEN,
	},
	{
		id: "laServer",
		x: API_X,
		y: API_YS.laServer,
		w: API_W,
		h: API_H,
		title: "law-analytics-server",
		sub: ["jurisprudencia pública", "+ campañas SAIJ (admin-api)"],
		kind: "api",
		accent: LIVE_GREEN,
	},
	{
		id: "pjnApi",
		x: API_X,
		y: API_YS.pjnApi,
		w: API_W,
		h: API_H,
		title: "pjn-api",
		sub: ["causas · sentencias · configs"],
		kind: "api",
		accent: LIVE_GREEN,
		chip: { text: "⚠ stale", color: STALE_AMBER },
	},
	{
		id: "ragApi",
		x: API_X,
		y: API_YS.ragApi,
		w: API_W,
		h: API_H,
		title: "pjn-rag-api",
		sub: ["RAG + búsqueda de sentencias"],
		kind: "api",
		accent: LIVE_GREEN,
	},
	// Col 4b — clientes que llegan por HTTP
	{
		id: "uiAdmin",
		x: CLI_X,
		y: 60,
		w: CLI_W,
		h: 52,
		title: "UI Admin",
		sub: ["dashboard.lawanalytics.app"],
		kind: "client",
		accent: API_HOP,
	},
	{
		id: "appUsers",
		x: CLI_X,
		y: 196,
		w: CLI_W,
		h: 52,
		title: "law-analytics-front",
		sub: ["app de usuarios"],
		kind: "client",
		accent: API_HOP,
	},
	{
		id: "mcpServer",
		x: CLI_X,
		y: 372,
		w: CLI_W,
		h: 56,
		title: "la-mcp-server :3045",
		sub: ["MCP público OAuth 2.1", "Claude.ai · ChatGPT"],
		kind: "client",
		accent: API_HOP,
	},
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
		paused: id === "escritos",
	}));
	return [
		// Fuentes → workers
		{ id: "s1", from: "srcPjn", to: "scraping", d: hcurve(184, 68, WRK_X, 59), color: neutral },
		{ id: "s2", from: "srcPjn", to: "updateMovimientos", d: hcurve(184, 92, WRK_X, 129), color: neutral },
		{ id: "s3", from: "srcViewer", to: "sentencias", d: hcurve(184, 175, WRK_X, 199), color: neutral },
		{ id: "s4", from: "srcViewer", to: "escritos", d: hcurve(184, 190, WRK_X, 269), color: neutral, paused: true },
		{ id: "s5", from: "srcViewer", to: "plazos", d: "M 184 202 C 202 320, 200 409, 240 409", color: neutral },
		{ id: "s6", from: "srcViewer", to: "emails", d: "M 184 212 C 198 380, 196 549, 240 549", color: neutral },
		{ id: "s7", from: "srcSaij", to: "saij", d: hcurve(184, 340, WRK_X, 339), color: neutral },
		// Workers → PRIMARY (escrituras)
		...writes,
		// Oplog
		{ id: "oplog", from: "primary", to: "secondary", d: "M 670 130 L 670 182", color: LIVE_GREEN, animated: true },
		// Lecturas directas a Mongo (conexión al replica set)
		{ id: "r1", from: "secondary", to: "cacheApi", d: hcurve(796, 190, API_X, 132), color: LIVE_GREEN },
		{ id: "r2", from: "secondary", to: "laServer", d: hcurve(796, 200, API_X, 218), color: LIVE_GREEN },
		{ id: "r3", from: "secondary", to: "pjnApi", d: hcurve(796, 212, API_X, 304), color: LIVE_GREEN },
		{ id: "r4", from: "secondary", to: "ragApi", d: hcurve(796, 224, API_X, 390), color: LIVE_GREEN },
		// Embeddings: workers → OpenAI → Qdrant
		{ id: "e1", from: "sentencias", to: "srcOpenai", d: "M 240 214 C 208 244, 212 480, 170 548", color: PRO_TEAL, animated: true },
		{
			id: "e2",
			from: "escritos",
			to: "srcOpenai",
			d: "M 240 284 C 212 312, 216 500, 140 548",
			color: PRO_TEAL,
			animated: true,
			paused: true,
		},
		{ id: "e3", from: "srcOpenai", to: "qdrant", d: "M 184 582 C 330 622, 560 606, 636 446", color: PRO_TEAL, animated: true },
		// Qdrant → APIs (búsqueda vectorial)
		{ id: "q1", from: "qdrant", to: "pjnApi", d: hcurve(796, 384, API_X, 320), color: PRO_TEAL },
		{ id: "q2", from: "qdrant", to: "ragApi", d: hcurve(796, 412, API_X, 404), color: PRO_TEAL },
		// Flujos que siguen yendo al core (Atlas)
		{ id: "a1", from: "saij", to: "atlas", d: hcurve(440, 348, 544, 490, 0.6), color: STALE_AMBER, dashed: true },
		{ id: "a2", from: "plazos", to: "atlas", d: hcurve(440, 415, 544, 506, 0.6), color: STALE_AMBER, dashed: true },
		{ id: "a3", from: "emails", to: "atlas", d: hcurve(440, 555, 544, 530, 0.6), color: STALE_AMBER, dashed: true },
		// Split-brain: 4 vistas del admin pegan al pjn-api del hub, que lee Atlas
		{ id: "stale", from: "pjnApi", to: "atlas", d: "M 880 324 C 836 366, 854 480, 800 496", color: STALE_AMBER, warn: true },
		// causaCacheService: salto HTTP interno del hub (ex túnel ngrok, hoy localhost)
		{ id: "cache-hop", from: "laServer", to: "cacheApi", d: "M 1040 190 C 1104 188, 1104 162, 1040 160", color: API_HOP },
		// Lecturas vía API (salto HTTP) — clientes que no tocan Mongo
		{ id: "h1", from: "cacheApi", to: "uiAdmin", d: hcurve(1090, 140, CLI_X, 72), color: API_HOP },
		{ id: "h2", from: "laServer", to: "uiAdmin", d: hcurve(1090, 226, CLI_X, 84), color: API_HOP },
		{ id: "h3", from: "pjnApi", to: "uiAdmin", d: hcurve(1090, 300, CLI_X, 96), color: API_HOP },
		{ id: "h4", from: "ragApi", to: "uiAdmin", d: hcurve(1090, 386, CLI_X, 106), color: API_HOP },
		{ id: "h5", from: "laServer", to: "appUsers", d: hcurve(1090, 212, CLI_X, 218), color: API_HOP },
		{ id: "h6", from: "laServer", to: "mcpServer", d: hcurve(1090, 240, CLI_X, 390), color: API_HOP },
		{ id: "h7", from: "ragApi", to: "mcpServer", d: hcurve(1090, 402, CLI_X, 410), color: API_HOP },
	];
};

const LABELS: DLabel[] = [
	{ x: 480, y: 64, text: "escrituras", color: BRAND_BLUE },
	{ x: 670, y: 156, text: "oplog (replicación, lag ~0s)", color: LIVE_GREEN },
	{ x: 846, y: 252, text: "lectura directa a rs0 ~1ms", color: LIVE_GREEN },
	{ x: 968, y: 175, text: "caché de causas (1-2ms)", color: API_HOP },
	{ x: 400, y: 610, text: "embeddings (batch por Tailscale)", color: PRO_TEAL },
	{ x: 852, y: 348, text: "búsqueda vectorial", color: PRO_TEAL },
	{ x: 905, y: 442, text: "⚠ 4 vistas admin leen copia stale", color: STALE_AMBER },
	{ x: 668, y: 564, text: "foldernotifications · email_contacts · emaillogs", color: STALE_AMBER },
	{ x: 1240, y: 476, text: "lectura vía API (HTTP)", color: API_HOP },
];

// El contenedor rs0 agrupa a sus miembros para el highlight de hover/selección
const expandIds = (id: string): string[] => (id === "rs0" ? ["rs0", "primary", "secondary", "arbiter"] : [id]);

const markerFor = (color: string): string => {
	if (color === BRAND_BLUE) return "arw-blue";
	if (color === LIVE_GREEN) return "arw-green";
	if (color === PRO_TEAL) return "arw-teal";
	if (color === STALE_AMBER) return "arw-amber";
	if (color === API_HOP) return "arw-hop";
	return "arw-neutral";
};

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

interface NodeChipProps {
	node: DNode;
}

// Chip de estado dentro del nodo (pausado / stale). Se ancla a la derecha.
const NodeChip = ({ node }: NodeChipProps) => {
	if (!node.chip) return null;
	const w = node.chip.text.length * 4.3 + 12;
	const x = node.x + node.w - w - 8;
	return (
		<g pointerEvents="none">
			<rect x={x} y={node.y + 6} width={w} height={13} rx={6.5} fill={alpha(node.chip.color, 0.16)} stroke={alpha(node.chip.color, 0.5)} />
			<text x={x + w / 2} y={node.y + 15} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={node.chip.color}>
				{node.chip.text}
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

	const nodeOpacity = (n: DNode): number => {
		const base = n.dim ? 0.55 : 1;
		if (!relatedNodeIds) return base;
		return relatedNodeIds.has(n.id) ? (n.dim ? 0.8 : 1) : 0.3;
	};
	const edgeOpacity = (e: DEdge): number => {
		const base = e.paused ? 0.28 : 0.85;
		if (!activeEdgeIds) return base;
		return activeEdgeIds.has(e.id) ? 1 : 0.1;
	};

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
				opacity={nodeOpacity(n)}
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
					fill={
						n.kind === "worker"
							? alpha(BRAND_BLUE, isDark ? 0.1 : 0.05)
							: n.kind === "client"
							? alpha(API_HOP, isDark ? 0.09 : 0.05)
							: nodeFill
					}
					stroke={isSelected ? BRAND_BLUE : isHovered ? alpha(BRAND_BLUE, 0.65) : nodeStroke}
					strokeWidth={isSelected ? 2.25 : isHovered ? 1.5 : 1}
					strokeDasharray={n.dim ? "5 3" : undefined}
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
				<NodeChip node={n} />
			</g>
		);
	};

	// Ficha activa (Zona 2)
	const workerDetail = selected && Object.prototype.hasOwnProperty.call(WORKER_DETAILS, selected) ? WORKER_DETAILS[selected] : undefined;
	const infraDetail =
		!workerDetail && selected && Object.prototype.hasOwnProperty.call(INFRA_DETAILS, selected) ? INFRA_DETAILS[selected] : undefined;

	const legendItems: { color: string; dashed?: boolean; dotted?: boolean; animated?: boolean; chip?: boolean; label: string }[] = [
		{ color: BRAND_BLUE, animated: true, label: "escrituras (workers → PRIMARY)" },
		{ color: LIVE_GREEN, label: "lectura directa a Mongo (rs0, ~1ms)" },
		{ color: API_HOP, label: "lectura vía API (salto HTTP)" },
		{ color: PRO_TEAL, label: "embeddings / búsqueda vectorial" },
		{ color: STALE_AMBER, dashed: true, label: "flujos al core (Atlas)" },
		{ color: STALE_AMBER, dotted: true, label: "⚠ lectura de copia stale (pendiente)" },
		{ color: neutralEdge, label: "fuentes externas → workers" },
		{ color: STALE_AMBER, chip: true, label: "grupo pausado por configuración" },
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
							viewBox="0 0 1400 648"
							sx={{ width: "100%", minWidth: 1160, height: "auto", display: "block", fontFamily: theme.typography.fontFamily }}
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
									["arw-hop", API_HOP],
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
							<text x={API_X} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
								CONSUMO — LECTURA DIRECTA
							</text>
							<text x={CLI_X} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
								CLIENTES — VÍA API
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
							{edges.map((e) => (
								<path
									key={e.id}
									d={e.d}
									fill="none"
									stroke={e.color}
									strokeWidth={e.warn ? 1.8 : 1.6}
									strokeDasharray={e.warn ? "2 3" : e.dashed && !e.animated ? "5 4" : undefined}
									className={e.animated ? "la-flow-anim" : undefined}
									markerEnd={`url(#${markerFor(e.color)})`}
									opacity={edgeOpacity(e)}
									style={{ transition: "opacity 0.2s ease" }}
									pointerEvents="none"
								/>
							))}

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
								{item.chip ? (
									<Box
										sx={{
											width: 34,
											height: 12,
											borderRadius: 6,
											bgcolor: alpha(item.color, 0.16),
											border: `1px solid ${alpha(item.color, 0.5)}`,
										}}
									/>
								) : (
									<Box component="svg" viewBox="0 0 34 8" sx={{ width: 34, height: 8, display: "block" }}>
										<line
											x1={1}
											y1={4}
											x2={33}
											y2={4}
											stroke={item.color}
											strokeWidth={2}
											strokeDasharray={item.dotted ? "2 3" : item.dashed ? "4 3" : item.animated ? "6 4" : undefined}
										/>
									</Box>
								)}
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
								{workerDetail.estado && <Chip label="pausado por config" size="small" color="warning" variant="outlined" />}
							</Stack>
							<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
								PM2: {workerDetail.pm2}
							</Typography>
							{workerDetail.estado && (
								<Box
									sx={{
										p: 1.5,
										borderRadius: 1,
										bgcolor: alpha(STALE_AMBER, isDark ? 0.12 : 0.08),
										border: `1px solid ${alpha(STALE_AMBER, 0.4)}`,
									}}
								>
									<Typography variant="body2">{workerDetail.estado}</Typography>
								</Box>
							)}
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
							<Typography variant="body2" color="text.secondary">
								<Box component="span" sx={{ fontWeight: 600 }}>
									Conexión:
								</Box>{" "}
								{workerDetail.conexion}
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
							{infraDetail.warn && (
								<Box
									sx={{
										p: 1.5,
										borderRadius: 1,
										bgcolor: alpha(STALE_AMBER, isDark ? 0.1 : 0.06),
										border: `1px solid ${alpha(STALE_AMBER, 0.4)}`,
									}}
								>
									<Typography variant="subtitle2" sx={{ color: STALE_AMBER, mb: 1 }}>
										{infraDetail.warn.title}
									</Typography>
									<Box sx={{ overflowX: "auto" }}>
										<Table size="small" sx={{ "& td, & th": { px: 1, py: 0.5, borderColor: headerBorder(isDark) } }}>
											<TableHead>
												<TableRow>
													{infraDetail.warn.head.map((h, i) => (
														<TableCell key={h} align={i > 1 ? "right" : "left"}>
															<Typography variant="caption" sx={{ fontWeight: 700 }}>
																{h}
															</Typography>
														</TableCell>
													))}
												</TableRow>
											</TableHead>
											<TableBody>
												{infraDetail.warn.rows.map((row) => (
													<TableRow key={row[0]}>
														{row.map((cell, i) => (
															<TableCell key={i} align={i > 1 ? "right" : "left"}>
																<Typography
																	variant="caption"
																	sx={{
																		fontFamily: i === 1 || i > 1 ? "monospace" : undefined,
																		color: i === 2 ? STALE_AMBER : i === 3 ? LIVE_GREEN : undefined,
																		fontWeight: i > 1 ? 700 : undefined,
																	}}
																>
																	{cell}
																</Typography>
															</TableCell>
														))}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</Box>
									<Typography variant="body2" sx={{ mt: 1.5 }}>
										{infraDetail.warn.nota}
									</Typography>
								</Box>
							)}
						</Stack>
					) : (
						<Stack direction="row" spacing={1} alignItems="center">
							<InfoCircle size={18} color={theme.palette.text.secondary as string} />
							<Typography variant="body2" color="text.secondary">
								Seleccioná un nodo del diagrama (grupo de workers, storage, API o cliente) para ver su ficha: procesos PM2, pipeline paso a
								paso, cómo conecta al replica set y colecciones que escribe.
							</Typography>
						</Stack>
					)}
				</MainCard>
			</Grid>
		</Grid>
	);
};

export default DataFlowPage;
