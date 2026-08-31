// Spec del diagrama de apareo SAIJ ↔ causas PJN para el motor FlowDiagram.
//
// Documenta el circuito que la auditoría del 2026-08-31 obligó a endurecer:
// el apareo se hacía solo por (fuero, número, año) y colgaba fallos de causas
// ajenas — y como la SentenciaCapturada HEREDA la identidad de la causa
// (carátula, número, año, fuero, causaId), el error viajaba al corpus y a la
// metadata de los embeddings. De ahí las dos piezas nuevas: el linker con
// cinco gates y la vista de conciliación que deshace apareos enteros.
//
// La pregunta que este diagrama responde primero: ¿qué pasa con la
// SentenciaCapturada al desvincular? No "recupera su carátula anterior" — se
// RECONSTRUYE desde el propio fallo (titulo, o actor c/ demandado s/ sobre),
// queda con causaId null pero SIGUE publicada, y su embedding se re-encola
// para reindexar con la metadata correcta.

import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export function buildSaijApareoSpec(): FlowSpec {
	const nodes: FlowNode[] = [
		// ── El fallo, con su identidad propia ────────────────────────────────
		{
			id: "fallo",
			x: 40,
			y: 120,
			w: 240,
			h: 120,
			kind: "ext",
			label: "Fallo SAIJ · saij-sentencias",
			sub: ["identidad propia: titulo /", "actor c/ demandado s/ sobre", "expediente parseado del PDF", "(source + confidence del parser)"],
		},

		// ── El linker con sus gates ──────────────────────────────────────────
		{
			id: "linker",
			x: 360,
			y: 90,
			w: 270,
			h: 170,
			kind: "hub",
			label: "causaLinker · 5 gates",
			sub: [
				"1· fuero soportado  2· causa principal",
				"3· fuero del PDF coincide",
				"4· carátula: jaccard ≥ .35 / cont ≥ .5",
				"    (anonimizado → objeto procesal)",
				"5· indeterminado → según confianza",
			],
		},
		{
			id: "rechazo",
			x: 360,
			y: 330,
			w: 270,
			h: 110,
			kind: "warn",
			label: "Apareo rechazado",
			sub: ["apareoMotivo queda en el fallo:", "caratula-distinta · confianza-baja ·", "fuero-incoherente · es-incidente…"],
		},

		// ── Las cuatro puntas del apareo ─────────────────────────────────────
		{
			id: "causa",
			x: 720,
			y: 40,
			w: 260,
			h: 120,
			kind: "db",
			label: "Causa PJN (caché · worker_01)",
			sub: ["+ movimiento 'SENTENCIA SAIJ'", "+ saij.saijSentenciaIds", "+ updateHistory: saij_link"],
		},
		{
			id: "sc",
			x: 720,
			y: 230,
			w: 260,
			h: 130,
			kind: "db",
			label: "SentenciaCapturada",
			sub: ["HEREDA de la causa apareada:", "caratula · number/year · fuero · causaId", "texto: del PDF del fallo", "origin: 'saij'"],
		},
		{
			id: "emb",
			x: 1050,
			y: 230,
			w: 230,
			h: 110,
			kind: "private",
			label: "sentencias-embeddings",
			sub: ["vectoriza el texto con la", "caratula HEREDADA en metadata", "→ herencia mala = corpus sucio"],
		},
		{
			id: "publica",
			x: 1350,
			y: 230,
			w: 200,
			h: 110,
			kind: "ui",
			label: "Consumo",
			sub: ["/jurisprudencia · boletín", "búsqueda semántica", "RAG"],
		},

		// ── Conciliación ─────────────────────────────────────────────────────
		{
			id: "escaneo",
			x: 40,
			y: 510,
			w: 240,
			h: 110,
			kind: "hub",
			label: "Escaneo de conciliación",
			sub: ["mismo comparador que el linker", "reevalúa cada par causa ↔ fallo", "(un fallo bueno no tapa a uno malo)"],
		},
		{
			id: "cola",
			x: 360,
			y: 510,
			w: 270,
			h: 110,
			kind: "db",
			label: "saij-conciliacion",
			sub: ["único por (causaId, saijDocId)", "pendiente → confirmado / desvinculado /", "reapareado / ignorado"],
		},
		{
			id: "admin",
			x: 720,
			y: 510,
			w: 260,
			h: 110,
			kind: "actor",
			label: "Admin · /admin/saij/conciliacion",
			sub: ["confirmar · ignorar · desvincular ·", "mover a otra causa", "cada acción firma el historial"],
		},
		{
			id: "backup",
			x: 1050,
			y: 510,
			w: 230,
			h: 110,
			kind: "db",
			label: "saij-desvinculacion-backup",
			sub: ["movimiento + causaRefs + estado", "previo de las SC afectadas", "→ toda desvinculación es reversible"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e-fallo-linker", from: "fallo", to: "linker", label: "fuero + nro/año", fromSide: "right", toSide: "left" },
		{ id: "e-linker-causa", from: "linker", to: "causa", kind: "ok", label: "coincide → vincula", fromSide: "right", toSide: "left" },
		{ id: "e-linker-rechazo", from: "linker", to: "rechazo", kind: "problem", fromSide: "bottom", toSide: "top" },

		// La SC nace del texto del fallo pero con la identidad de la causa.
		{ id: "e-causa-sc", from: "causa", to: "sc", kind: "handoff", label: "hereda identidad", fromSide: "bottom", toSide: "top" },
		{ id: "e-fallo-sc", from: "fallo", to: "sc", label: "texto del PDF", fromSide: "bottom", toSide: "left", labelDy: -8 },

		// Rechazado no es descartado: puede publicarse sin causa.
		{
			id: "e-rechazo-sc",
			from: "rechazo",
			to: "sc",
			label: "createScSinCausa → causaId null",
			fromSide: "right",
			toSide: "bottom",
			labelDy: 10,
		},

		{ id: "e-sc-emb", from: "sc", to: "emb", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e-emb-pub", from: "emb", to: "publica", kind: "ok", fromSide: "right", toSide: "left" },

		// Conciliación
		{ id: "e-fallo-escaneo", from: "fallo", to: "escaneo", label: "relee lo apareado", fromSide: "bottom", toSide: "top" },
		{ id: "e-escaneo-cola", from: "escaneo", to: "cola", kind: "ok", label: "sospechosos", fromSide: "right", toSide: "left" },
		{ id: "e-cola-admin", from: "cola", to: "admin", kind: "handoff", label: "revisión manual", fromSide: "right", toSide: "left" },
		{
			id: "e-admin-sc",
			from: "admin",
			to: "sc",
			kind: "problem",
			label: "desvincular: causaId null · carátula del fallo · re-embed",
			fromSide: "top",
			toSide: "bottom",
			labelDy: 14,
		},
		{ id: "e-admin-backup", from: "admin", to: "backup", kind: "ok", label: "respaldo", fromSide: "right", toSide: "left" },
	];

	const steps = [
		{
			title: "El apareo pasa cinco gates",
			text:
				"Antes el linker apareaba solo por (fuero, número, año) — y el número se repite entre fueros, y el parser " +
				"del PDF a veces toma el expediente de una cita. Ahora, además de resolver el expediente, exige que la " +
				"carátula del fallo y la de la causa describan el mismo pleito (con fallback al objeto procesal cuando el " +
				"fallo viene anonimizado a iniciales), y cuando la carátula no alcanza para decidir, la política " +
				"configurable decide según la confianza del parser. El veredicto queda en el fallo (apareoMotivo), se " +
				"vincule o no.",
			nodes: ["fallo", "linker", "causa", "rechazo"],
			edges: ["e-fallo-linker", "e-linker-causa", "e-linker-rechazo"],
		},
		{
			title: "La SentenciaCapturada hereda la identidad de la causa",
			text:
				"La SC toma el TEXTO del PDF del fallo, pero la IDENTIDAD —carátula, número, año, fuero y causaId— la " +
				"hereda de la causa apareada. Es lo que la cuelga del expediente correcto… o del incorrecto: si el apareo " +
				"estuvo mal, la SC queda publicada bajo el nombre de un pleito ajeno, y esa carátula viaja a la metadata " +
				"del vector en el índice semántico. Por eso un apareo malo no es solo un movimiento de más en una causa: " +
				"contamina el corpus entero río abajo.",
			nodes: ["fallo", "causa", "sc", "emb", "publica"],
			edges: ["e-causa-sc", "e-fallo-sc", "e-sc-emb", "e-emb-pub"],
		},
		{
			title: "Rechazado no significa descartado",
			text:
				"Un fallo cuyo apareo se rechaza no se pierde: con createScSinCausa se proyecta igual a SentenciaCapturada " +
				"con causaId null — recibe resumen IA, página pública, embeddings y boletín, solo que sin expediente " +
				"vinculado. Es el mismo mecanismo que cubre a la CSJN y a los ~2.100 fallos nacionales cuyo expediente " +
				"nunca matcheó. Mejor sin causa que con la causa equivocada.",
			nodes: ["rechazo", "sc", "publica"],
			edges: ["e-linker-rechazo", "e-rechazo-sc"],
		},
		{
			title: "El escaneo reevalúa cada par, no cada causa",
			text:
				"El escaneo corre el mismo comparador del linker sobre todo lo YA apareado, par por par (causa, fallo): " +
				"una causa con un fallo bien apareado y otro mal muestra el malo, en vez de quedar tapada por el bueno. " +
				"Los sospechosos entran a la cola con su diagnóstico (similitud, banderas, expediente que declara el " +
				"fallo) y esperan resolución humana. Re-escanear refresca el diagnóstico sin duplicar ni reabrir lo ya " +
				"resuelto.",
			nodes: ["fallo", "escaneo", "cola"],
			edges: ["e-fallo-escaneo", "e-escaneo-cola"],
		},
		{
			title: "Desvincular deshace las cuatro puntas",
			text:
				"El apareo es una relación de cuatro puntas y desvincular las deshace todas: (1) saca el movimiento " +
				"'SENTENCIA SAIJ' de la causa y decrementa movimientosCount; (2) saca el id de saij.saijSentenciaIds y " +
				"escribe saij_unlink en el historial con el email del admin; (3) limpia causaRefs del fallo; (4) la SC " +
				"queda con causaId null pero SIGUE publicada, su carátula se RECONSTRUYE desde el propio fallo (titulo, o " +
				"actor c/ demandado s/ sobre — no un valor guardado), number/year/fuero vuelven a los del expediente del " +
				"fallo, y el embedding se re-encola para reindexar con la metadata correcta. Todo lo desarmado queda " +
				"respaldado antes de tocarse.",
			nodes: ["admin", "causa", "sc", "emb", "backup"],
			edges: ["e-admin-sc", "e-admin-backup"],
		},
		{
			title: "Mover a otra causa re-hereda",
			text:
				"'Mover a otra causa' es desvincular + vincular en una sola operación: saca el fallo de la causa " +
				"equivocada (con respaldo), lo cuelga de la correcta —movimiento incluido, insertado por fecha— y la SC " +
				"hereda la identidad nueva con un único re-embed al final. El gate de carátula corre también en el apareo " +
				"manual: si tampoco coincide con la causa destino, pide confirmación explícita y el historial registra " +
				"que se forzó.",
			nodes: ["admin", "cola", "causa", "sc"],
			edges: ["e-cola-admin", "e-admin-sc"],
		},
	];

	return {
		id: "saij-apareo",
		title: "Apareo SAIJ ↔ causas PJN",
		intro:
			"Cómo un fallo de SAIJ se cuelga de una causa del caché, qué hereda la SentenciaCapturada de ese apareo, " +
			"y cómo la conciliación deshace un apareo equivocado — reversiblemente y hasta el embedding.",
		width: 1590,
		height: 660,
		nodes,
		edges,
		steps,
	};
}
