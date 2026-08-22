// Spec del diagrama del worker CIJur para el motor FlowDiagram (causas/flujos).
//
// CIJur es una selección CURADA de la Procuración General de Buenos Aires:
// publica ~1 fallo por mes y por canal. Eso explica todo el diseño — cron
// diario en vez de continuo, y un backfill que corre una sola vez.
//
// Dos particularidades del sitio están dibujadas porque condicionan el flujo:
// la paginación no corta con 404 (repite la primera página) y cada fallo viene
// duplicado en el HTML, con el PDF colgando de una sola de las dos variantes.

import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export function buildCijurWorkersSpec(): FlowSpec {
	const nodes: FlowNode[] = [
		{
			id: "cijur",
			x: 40,
			y: 170,
			w: 215,
			h: 96,
			kind: "ext",
			label: "cijur.mpba.gov.ar",
			sub: ["HTML estático, sin auth", "paginado ?p=N", "~1 alta por mes y canal"],
		},
		{
			id: "provincial",
			x: 320,
			y: 60,
			w: 225,
			h: 72,
			kind: "public",
			label: "Canal PROVINCIAL",
			sub: ["/actualidadjurisprudenciaprovincial", "45 fallos · 2018 → hoy"],
		},
		{
			id: "nacional",
			x: 320,
			y: 290,
			w: 225,
			h: 72,
			kind: "public",
			label: "Canal NACIONAL",
			sub: ["/actualidadjurisprudencianacional", "52 fallos · 2017 → hoy"],
		},
		{
			id: "backfill",
			x: 320,
			y: 168,
			w: 225,
			h: 84,
			kind: "hub",
			label: "backfill.js",
			sub: ["recorre TODA la paginación", "corre una sola vez"],
		},
		{
			id: "worker",
			x: 320,
			y: 400,
			w: 225,
			h: 84,
			kind: "private",
			label: "worker_CIJUR_0",
			sub: ["cron diario 10 UTC (7 ART)", "solo las primeras 3 páginas"],
		},
		{
			id: "parse",
			x: 625,
			y: 168,
			w: 235,
			h: 108,
			kind: "hub",
			label: "parsePagina",
			sub: ["tribunal · carátula · fecha", "voces (editorial)", "dedup escritorio/móvil"],
		},
		{
			id: "pdf",
			x: 625,
			y: 320,
			w: 235,
			h: 84,
			kind: "hub",
			label: "Descarga del PDF",
			sub: ["sentencia completa", "texto digital, sin OCR"],
		},
		{
			id: "coleccion",
			x: 940,
			y: 200,
			w: 220,
			h: 96,
			kind: "db",
			label: "cijur-fallos",
			sub: ["dedup por cijurId (URL del PDF)", "rs0 · 97 fallos", "3,46M caracteres"],
		},
		{
			id: "admin",
			x: 1240,
			y: 120,
			w: 210,
			h: 84,
			kind: "ui",
			label: "UI Admin",
			sub: ["/admin/workers/cijur", "estado · datos · config"],
		},
		{
			id: "aviso",
			x: 1240,
			y: 280,
			w: 210,
			h: 72,
			kind: "ok",
			label: "Aviso al admin",
			sub: ["solo cuando hay altas nuevas"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e-prov", from: "cijur", to: "provincial", fromSide: "right", toSide: "left" },
		{ id: "e-nac", from: "cijur", to: "nacional", fromSide: "right", toSide: "left" },
		{ id: "e-bf", from: "cijur", to: "backfill", label: "histórico", fromSide: "right", toSide: "left" },
		{ id: "e-wk", from: "cijur", to: "worker", label: "novedades", fromSide: "bottom", toSide: "left" },

		{ id: "e-bf-parse", from: "backfill", to: "parse", fromSide: "right", toSide: "left" },
		{ id: "e-wk-parse", from: "worker", to: "parse", fromSide: "right", toSide: "bottom" },
		{ id: "e-parse-pdf", from: "parse", to: "pdf", fromSide: "bottom", toSide: "top" },
		{ id: "e-parse-col", from: "parse", to: "coleccion", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e-pdf-col", from: "pdf", to: "coleccion", kind: "ok", label: "texto", fromSide: "right", toSide: "bottom" },

		{ id: "e-col-admin", from: "coleccion", to: "admin", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e-col-aviso", from: "coleccion", to: "aviso", fromSide: "right", toSide: "left" },
	];

	const steps = [
		{
			title: "Una selección curada, no un repositorio",
			text:
				"CIJur publica alrededor de un fallo por mes y por canal: 97 entradas en ocho años. Su valor no es el " +
				"volumen sino el criterio editorial de la Procuración y que cada entrada trae el PDF completo de la " +
				"sentencia. Complementa a SAIJ, que aporta volumen crudo.",
			nodes: ["cijur", "provincial", "nacional"],
			edges: ["e-prov", "e-nac"],
		},
		{
			title: "Backfill una vez, vigilancia todos los días",
			text:
				"backfill.js recorre la paginación completa de los dos canales y se corre una sola vez. Después el " +
				"worker mira solo las primeras páginas, una vez por día: el dedup por cijurId hace que releer la " +
				"cabeza del listado sea barato y no ensucie la colección.",
			nodes: ["backfill", "worker", "coleccion"],
			edges: ["e-bf", "e-wk", "e-parse-col"],
		},
		{
			title: "La paginación no corta con 404",
			text:
				"Pedir ?p=999 no da error: el sitio sirve otra vez la primera página. Si el corte dependiera del " +
				"código HTTP, el barrido no terminaría nunca. Se detecta comparando contra la huella de p=1, y así " +
				"se encontraron los límites reales: 45 páginas en provincial y 52 en nacional.",
			nodes: ["cijur", "backfill"],
			edges: ["e-bf"],
		},
		{
			title: "Cada fallo viene duplicado",
			text:
				"El HTML repite cada entrada en dos bloques —uno para escritorio y otro para móvil— y solo uno cuelga " +
				"el iframe con el PDF. parsePagina agrupa por título y se queda con la variante que trae el adjunto; " +
				"sin eso, cada fallo entraría dos veces, una con PDF y otra sin.",
			nodes: ["parse", "pdf"],
			edges: ["e-parse-pdf", "e-bf-parse", "e-wk-parse"],
		},
		{
			title: "Qué es publicable y qué no",
			text:
				"El campo voces es redacción editorial de la Procuración, no del tribunal: sirve para clasificar y " +
				"buscar, pero no se republica — mismo criterio que con los sumarios de SAIJ. Lo publicable es el PDF, " +
				"que es sentencia pública, y los resúmenes propios que se generen sobre su texto.",
			nodes: ["pdf", "coleccion", "admin"],
			edges: ["e-pdf-col", "e-col-admin"],
		},
	];

	return {
		id: "cijur-workers",
		title: "Worker CIJur",
		intro:
			"Captura de la sección Actualidad en Jurisprudencia del Ministerio Público de Buenos Aires: una selección " +
			"curada de fallos provinciales y nacionales, con el texto completo de cada sentencia.",
		width: 1490,
		height: 520,
		nodes,
		edges,
		steps,
	};
}
