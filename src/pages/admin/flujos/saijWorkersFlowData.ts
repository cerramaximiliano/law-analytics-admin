// Spec del diagrama de workers SAIJ para el motor FlowDiagram (causas/flujos).
//
// Los cuatro workers corren el MISMO código (src/tasks/worker.js): lo único que
// los distingue es WORKER_ID, con el que cada proceso levanta su configuración
// en `configuraciones_scraping_saij`. De ahí salen jurisdicción, cursor, cron y
// ritmo — por eso sumar un canal es crear una config, no escribir un scraper.
//
// La bifurcación que importa es NACIONAL vs. el resto: solo el nacional
// alimenta el pipeline PJN completo (link a causa y movimiento en el
// expediente del usuario). Provincial se detiene en la colección.
//
// CSJN es el caso intermedio (2026-08): sus fallos no tienen causa PJN, pero
// igual se proyectan a SentenciaCapturada con causaId null, así que reciben
// resumen IA, página pública, embeddings y su sección propia en el boletín.
// El mismo mecanismo cubre los fallos nacionales cuyo expediente no matcheó
// (pipeline.createScSinCausa): antes quedaban invisibles.

import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export function buildSaijWorkersSpec(): FlowSpec {
	const nodes: FlowNode[] = [
		// ── Fuente ────────────────────────────────────────────────────────────
		{
			id: "saij",
			x: 40,
			y: 200,
			w: 210,
			h: 96,
			kind: "ext",
			label: "SAIJ",
			sub: ["API de búsqueda por facetas", "límite por IP: 403 seco", "(sin 429 ni headers de cuota)"],
		},

		// ── Canales: mismo worker.js, distinta config ────────────────────────
		{
			id: "nacional",
			x: 330,
			y: 40,
			w: 240,
			h: 84,
			kind: "public",
			label: "worker_SAIJ_0 · NACIONAL",
			sub: ["facet Jurisdicción/Nacional", "incremental por fecha-umod"],
		},
		{
			id: "provincial",
			x: 330,
			y: 168,
			w: 240,
			h: 84,
			kind: "public",
			label: "worker_SAIJ_PROV_0 · PROVINCIAL",
			sub: ["facet Jurisdicción/Local", "backfill 1904 → presente"],
		},
		{
			id: "csjn",
			x: 330,
			y: 296,
			w: 240,
			h: 84,
			kind: "public",
			label: "worker_SAIJ_CSJN_0 · CSJN",
			sub: ["Federal + Tribunal/CORTE SUPREMA", "backfill 1950 → presente"],
		},
		{
			id: "backfillNac",
			x: 330,
			y: 424,
			w: 240,
			h: 72,
			kind: "ext",
			label: "worker_SAIJ_BACKFILL_0",
			sub: ["histórico nacional puntual", "se auto-deshabilita al llegar"],
		},

		// ── Procesamiento por documento ──────────────────────────────────────
		{
			id: "doc",
			x: 650,
			y: 168,
			w: 230,
			h: 108,
			kind: "hub",
			label: "Procesamiento por doc",
			sub: ["view-document (provincia, adjunto)", "descarga PDF / HTM / DOC", "extracción de texto + charset"],
		},

		// ── Almacenamiento ───────────────────────────────────────────────────
		{
			id: "coleccion",
			x: 960,
			y: 168,
			w: 220,
			h: 96,
			kind: "db",
			label: "saij-sentencias",
			sub: ["dedup por saijId", "scrapeJurisdiccion marca el canal", "rs0 (no Atlas)"],
		},

		// ── Rama exclusiva del nacional ──────────────────────────────────────
		{
			id: "pipeline",
			x: 960,
			y: 30,
			w: 220,
			h: 96,
			kind: "private",
			label: "Pipeline PJN",
			sub: ["con causa: movimiento en el expediente", "sin causa: SC con causaId null", "resumen IA + embeddings"],
		},
		{
			id: "campania",
			x: 1250,
			y: 30,
			w: 210,
			h: 84,
			kind: "ok",
			label: "Boletín a usuarios",
			sub: ["5 generales + 2 de la Corte", "12h lun-vie, más reciente primero", "ventana de alta: 30 días"],
		},

		{
			id: "social",
			x: 1250,
			y: 150,
			w: 210,
			h: 96,
			kind: "ok",
			label: "Carruseles sociales",
			sub: ["multi-fallo: cron diario por rama", "fallo explicado: mar y jue", "quedan en BORRADOR"],
		},

		// ── Salidas comunes ──────────────────────────────────────────────────
		{
			id: "digest",
			x: 1250,
			y: 168,
			w: 210,
			h: 84,
			kind: "ok",
			label: "Digest al admin",
			sub: ["por ciclo, al llegar al presente", "+ aviso de fin de backfill"],
		},
		{
			id: "ui",
			x: 1250,
			y: 296,
			w: 210,
			h: 84,
			kind: "ui",
			label: "Vista pública",
			sub: ["lawanalytics.app/jurisprudencia", "solo con resumen IA"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e-nac", from: "saij", to: "nacional", label: "Jurisdicción/Nacional", fromSide: "right", toSide: "left" },
		{ id: "e-prov", from: "saij", to: "provincial", label: "Jurisdicción/Local", fromSide: "right", toSide: "left" },
		{ id: "e-csjn", from: "saij", to: "csjn", label: "Federal + Tribunal", fromSide: "right", toSide: "left" },
		{ id: "e-bf", from: "saij", to: "backfillNac", fromSide: "bottom", toSide: "left" },

		{ id: "e-nac-doc", from: "nacional", to: "doc", fromSide: "right", toSide: "left" },
		{ id: "e-prov-doc", from: "provincial", to: "doc", fromSide: "right", toSide: "left" },
		{ id: "e-csjn-doc", from: "csjn", to: "doc", fromSide: "right", toSide: "left" },
		{ id: "e-bf-doc", from: "backfillNac", to: "doc", fromSide: "right", toSide: "bottom" },

		{ id: "e-doc-col", from: "doc", to: "coleccion", kind: "ok", fromSide: "right", toSide: "left" },

		// Solo el nacional sigue hacia el pipeline PJN: hay un guard duro por
		// scrapeJurisdiccion, más allá de lo que diga la config.
		{
			id: "e-pipe-social",
			from: "pipeline",
			to: "social",
			kind: "handoff",
			label: "fallos con resumen",
			fromSide: "right",
			toSide: "left",
		},
		{
			id: "e-col-pipe",
			from: "coleccion",
			to: "pipeline",
			kind: "handoff",
			label: "NACIONAL y CSJN",
			fromSide: "top",
			toSide: "bottom",
		},
		{ id: "e-pipe-camp", from: "pipeline", to: "campania", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e-camp-ui", from: "campania", to: "ui", kind: "normal", label: "link al fallo", fromSide: "bottom", toSide: "top" },

		{ id: "e-col-digest", from: "coleccion", to: "digest", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e-pipe-ui", from: "pipeline", to: "ui", kind: "normal", label: "publica", fromSide: "bottom", toSide: "left" },
	];

	const steps = [
		{
			title: "Un solo código, cuatro canales",
			text:
				"Los cuatro workers ejecutan el mismo src/tasks/worker.js. Lo único que los diferencia es WORKER_ID, " +
				"con el que cada proceso levanta su propia configuración en Mongo: de ahí salen la jurisdicción, el " +
				"cursor, el cron y el ritmo. Agregar un canal es crear una configuración, no escribir un scraper.",
			nodes: ["saij", "nacional", "provincial", "csjn", "backfillNac"],
			edges: ["e-nac", "e-prov", "e-csjn", "e-bf"],
		},
		{
			title: "La Corte vive bajo Federal",
			text:
				"El buscador de jurisprudencia de la Corte no es un sistema aparte: es la misma API con el facet " +
				"Tribunal. La CSJN está catalogada bajo Jurisdicción/Federal, no Nacional, y por eso el canal " +
				"nacional nunca la alcanzó. Federal tiene 189.484 documentos en total; hoy solo traemos los 17.021 " +
				"de la Corte.",
			nodes: ["saij", "csjn"],
			edges: ["e-csjn"],
		},
		{
			title: "Procesamiento por documento",
			text:
				"Cada documento se enriquece con view-document (que trae provincia y adjunto) y se le extrae el texto. " +
				"El formato se decide por los magic bytes, no por el content-type: SAIJ sirve .DOC declarados como " +
				"texto, y confiar en el header hacía que el binario se guardara como texto ilegible.",
			nodes: ["doc", "coleccion"],
			edges: ["e-nac-doc", "e-prov-doc", "e-csjn-doc", "e-doc-col"],
		},
		{
			title: "La bifurcación que importa",
			text:
				"Solo el canal nacional alimenta el pipeline PJN —link a causa, movimientos, SentenciaCapturada, " +
				"embeddings y resumen IA— y de ahí salen las campañas a usuarios. Provincial y CSJN se detienen en la " +
				"colección: sus fallos no existen en las causas PJN. Hay un guard duro por scrapeJurisdiccion además " +
				"del flag de configuración.",
			nodes: ["coleccion", "pipeline", "campania", "ui"],
			edges: ["e-col-pipe", "e-pipe-camp", "e-camp-ui", "e-pipe-ui"],
		},
		{
			title: "Backfill y luego solo novedades",
			text:
				"Provincial y CSJN recorren su histórico por cursor mensual. Al llegar al presente avisan al admin y " +
				"pasan a modo incremental: dejan de recorrer el calendario y vigilan solo lo recién dado de alta, " +
				"ordenado por fecha-umod, igual que el nacional. El digest por ciclo se activa en ese momento.",
			nodes: ["provincial", "csjn", "digest"],
			edges: ["e-col-digest"],
		},
		{
			title: "El límite de SAIJ es por IP",
			text:
				"SAIJ no publica su política ni devuelve 429: responde 403 seco cuando se pasa de rosca, y el límite " +
				"es por IP, compartido por los cuatro workers. Pero el limitador de velocidad es una instancia por " +
				"proceso: ninguno ve el tráfico agregado, que es justo lo que SAIJ mide. Por eso cada worker persiste " +
				"sus rechazos, para poder sumarlos.",
			nodes: ["saij", "nacional", "provincial", "csjn", "backfillNac"],
			edges: ["e-nac", "e-prov", "e-csjn", "e-bf"],
		},
	];

	return {
		id: "saij-workers",
		title: "Workers SAIJ",
		intro:
			"Captura de jurisprudencia de SAIJ en cuatro canales — nacional, provincial, Corte Suprema y un backfill " +
			"histórico puntual — que comparten código y se diferencian solo por configuración.",
		width: 1500,
		height: 530,
		nodes,
		edges,
		steps,
	};
}
