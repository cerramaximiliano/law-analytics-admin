// Spec del flujo de plazos automáticos (base de usuarios, Atlas) para el motor
// FlowDiagram (causas/flujos). CONFIG-AWARE: recibe el estado vivo (monitor de
// pjn-api contra Atlas + config de la bandeja) y refleja en nodos y aristas el
// alcance del cálculo, el modo de entrega (dry run o real) y los workers caídos.
//
// Documento del feature: la-ads/docs/producto/plazos-automaticos.md.

import { FlowEdge, FlowNode, FlowSpec, NodeKind } from "../causas/flujos/flowTypes";

export interface PlazosFlowLive {
	/** plazos-worker-usuarios (worker_02) */
	calculoAlive: boolean;
	calculoEnabled: boolean;
	/** null = default (solo cuentas de prueba); {} = todas; otro = filtro */
	filtroUsuarios: Record<string, unknown> | null;
	/** plazos-folders-worker (worker_02) */
	entregaAlive: boolean;
	entregaEnabled: boolean;
	dryRun: boolean;
	userFilter: Record<string, unknown> | null;
	/** pjn-bandeja-sync (worker-cloud-02) */
	bandejaEnabled: boolean;
	/** conteos (Atlas, origen usuario) */
	cola: Record<string, number>;
	porFuente: Record<string, number>;
	/** no se pudo leer el estado: se dibuja con defaults */
	sinDatos: boolean;
}

const alcance = (f: Record<string, unknown> | null) =>
	f === null ? "solo cuentas de prueba" : !Object.keys(f).length ? "todas las causas de usuarios" : `filtro ${JSON.stringify(f)}`;

/** Tipo del nodo de un worker según su salud: rojo si está caído, naranja si está apagado. */
const kindWorker = (base: NodeKind, alive: boolean, enabled: boolean, sinDatos: boolean): NodeKind =>
	sinDatos ? base : !enabled ? "warn" : !alive ? "bad" : base;

const n = (v?: number) => (v ?? 0).toLocaleString("es-AR");

export function buildPlazosSpec(live: PlazosFlowLive): FlowSpec {
	const total = Object.values(live.cola).reduce((a, b) => a + b, 0);
	const nodes: FlowNode[] = [
		// ── Columna 1: fuentes de la cédula ──
		{
			id: "appupdate",
			x: 30,
			y: 30,
			w: 230,
			h: 92,
			kind: "public",
			label: "app-update-worker",
			sub: ["pjn-workers · pjnworker", "causas públicas de usuarios", `cédulas nuevas ≤ 5 días · ${n(live.porFuente["app-update"])}`],
		},
		{
			id: "miscausas",
			x: 30,
			y: 160,
			w: 230,
			h: 92,
			kind: "private",
			label: "private-causas-update",
			sub: ["pjn-mis-causas · worker-cloud-02", "causas privadas (credencial)", `cédulas nuevas · ${n(live.porFuente["mis-causas"])}`],
		},
		{
			id: "bandeja",
			x: 30,
			y: 290,
			w: 230,
			h: 108,
			kind: live.bandejaEnabled || live.sinDatos ? "private" : "warn",
			label: "pjn-bandeja-sync",
			sub: [
				"worker-cloud-02 · 10/16/22 UTC",
				"notif.pjn.gov.ar · RECIBIDAS",
				live.bandejaEnabled || live.sinDatos ? "recepción → pjn-movements" : "APAGADA",
				`plazo solo de hoy · ${n(live.porFuente.bandeja)}`,
			],
		},
		{
			id: "pjnnotif",
			x: 30,
			y: 440,
			w: 230,
			h: 76,
			kind: "db",
			label: "pjn-notifications",
			sub: ["una por credencial", "vinculo → causa / movimiento"],
		},

		// ── Columna 2: datos de la cédula ──
		{
			id: "pjnmov",
			x: 340,
			y: 30,
			w: 250,
			h: 108,
			kind: "db",
			label: "pjn-movements + S3",
			sub: ["movimiento espejado + PDF", "bloque cedula:", "documento · recepcion · plazo", "_id = causaId:sourceId"],
		},
		{
			id: "plazosnot",
			x: 340,
			y: 230,
			w: 250,
			h: 108,
			kind: "db",
			label: "plazos-notificaciones",
			sub: [
				"Atlas · origen usuario",
				`${n(total)} cédulas · ${n(live.cola.computed)} calculadas`,
				`pendientes ${n((live.cola.pending ?? 0) + (live.cola.no_url ?? 0))} · esperando doc. ${n(live.cola.esperando_documento)}`,
				`revisión manual ${n(live.cola.revision_manual)}`,
			],
		},
		{
			id: "refs",
			x: 670,
			y: 400,
			w: 240,
			h: 70,
			kind: "db",
			label: "reglas + feriados (rs0)",
			sub: ["plazos-normativa · feriados-judiciales", "PLAZOS_REFS=rs0"],
		},

		// ── Columna 3: procesamiento en worker_02 ──
		{
			id: "rag",
			x: 690,
			y: 12,
			w: 240,
			h: 86,
			kind: "ok",
			label: "pjn-rag-cedulas",
			sub: ["worker_02 · continuo", "PDF de S3 → texto + ficha", "escribe cedula.documento"],
		},
		{
			id: "calculo",
			x: 670,
			y: 230,
			w: 240,
			h: 108,
			kind: kindWorker("public", live.calculoAlive, live.calculoEnabled, live.sinDatos),
			label: "plazos-worker-usuarios",
			sub: [
				"worker_02 · cada 1 min",
				`alcance: ${alcance(live.filtroUsuarios)}`,
				"plazo del texto o de la norma",
				"→ vencimiento con feriados",
			],
		},

		// ── Columna 4: entrega ──
		{
			id: "entrega",
			x: 990,
			y: 230,
			w: 230,
			h: 108,
			kind: kindWorker("public", live.entregaAlive, live.entregaEnabled, live.sinDatos),
			label: "plazos-folders-worker",
			sub: [
				"worker_02 · cada 5 min",
				live.dryRun ? "DRY RUN: el hub simula" : "entrega real",
				`usuarios: ${JSON.stringify(live.userFilter || {})}`,
				"+ plazosAutomaticos.activo",
			],
		},
		{
			id: "hub",
			x: 990,
			y: 400,
			w: 230,
			h: 108,
			kind: "hub",
			label: "hub · sugerencias",
			sub: [
				"/api/internal/plazos/sugerencias",
				"decide por carpeta y usuario",
				"evento · aviso · sugerencia",
				"confirmado por bandeja o CUIT",
			],
		},
		{
			id: "calendario",
			x: 990,
			y: 560,
			w: 230,
			h: 76,
			kind: "ui",
			label: "Calendario + carpeta",
			sub: ["evento todo el día (Google)", "aviso en la carpeta"],
		},
		{
			id: "correo",
			x: 670,
			y: 530,
			w: 240,
			h: 76,
			kind: "ok",
			label: "la-notification · correo 19 h",
			sub: ["JudicialMovement + plazo validado", "PLAZOS_EN_CORREO"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e-app-plazos", from: "appupdate", to: "plazosnot", label: "cédula nueva", fromSide: "right", toSide: "left", labelDy: -6 },
		{
			id: "e-app-mov",
			from: "appupdate",
			to: "pjnmov",
			kind: "handoff",
			label: "movimiento + PDF",
			fromSide: "right",
			toSide: "left",
			labelDy: -6,
		},
		{ id: "e-mc-plazos", from: "miscausas", to: "plazosnot", label: "cédula nueva", fromSide: "right", toSide: "left", labelDy: 10 },
		{ id: "e-band-notif", from: "bandeja", to: "pjnnotif", label: "todas", fromSide: "bottom", toSide: "top" },
		{
			id: "e-band-plazos",
			from: "bandeja",
			to: "plazosnot",
			kind: "ok",
			label: "solo de hoy",
			fromSide: "right",
			toSide: "left",
			labelDy: 12,
		},
		{ id: "e-rag-mov", from: "rag", to: "pjnmov", kind: "ok", label: "cedula.documento", fromSide: "left", toSide: "right", labelDy: -6 },
		{
			id: "e-plazos-calc",
			from: "plazosnot",
			to: "calculo",
			label: "pendientes en alcance",
			fromSide: "right",
			toSide: "left",
			labelDy: -8,
		},
		{
			id: "e-mov-calc",
			from: "pjnmov",
			to: "calculo",
			label: "PDF S3 + destinatarios",
			fromSide: "right",
			toSide: "top",
			labelDx: -40,
			labelDy: 40,
		},
		{ id: "e-refs-calc", from: "refs", to: "calculo", label: "reglas · feriados", fromSide: "top", toSide: "bottom", labelDx: 56 },
		{
			id: "e-calc-entrega",
			from: "calculo",
			to: "entrega",
			kind: live.calculoAlive || live.sinDatos ? "ok" : "problem",
			label: "computed confiable",
			fromSide: "right",
			toSide: "left",
			labelDy: -8,
		},
		{
			id: "e-entrega-hub",
			from: "entrega",
			to: "hub",
			kind: live.dryRun ? "handoff" : "ok",
			label: live.dryRun ? "dryRun: simula" : "entrega",
			fromSide: "bottom",
			toSide: "top",
			labelDx: 46,
		},
		{
			id: "e-hub-cal",
			from: "hub",
			to: "calendario",
			kind: live.dryRun ? "handoff" : "ok",
			label: live.dryRun ? "en pausa" : "evento + aviso",
			fromSide: "bottom",
			toSide: "top",
			labelDx: 46,
		},
		{
			id: "e-plazos-correo",
			from: "plazosnot",
			to: "correo",
			label: "plazo validado (al armar el correo)",
			fromSide: "bottom",
			toSide: "left",
			labelDx: -10,
			labelDy: 10,
		},
	];

	const todos = undefined;
	return {
		id: "plazos-automaticos",
		title: "Plazos automáticos",
		intro:
			"De la cédula al vencimiento en la agenda del usuario: tres fuentes la registran, worker_02 lee el PDF y calcula, y el hub decide qué ve cada usuario en su carpeta, su calendario y su correo.",
		width: 1250,
		height: 660,
		nodes,
		edges,
		steps: [
			{
				title: "Todo el flujo",
				text: `Estado en vivo: cálculo con ${alcance(live.filtroUsuarios)}; entrega ${
					live.dryRun ? "en DRY RUN (no se crea nada para los usuarios)" : "real"
				}. Los nodos en rojo no tienen heartbeat; en naranja, están apagados.`,
				nodes: todos,
				edges: todos,
			},
			{
				title: "Fuentes",
				text: "La cédula de una causa de usuario entra por app-update (causas públicas) o por la actualización de Mis Causas (privadas): solo fueros CIV, CSS, CNT y COM, con hasta 5 días de antigüedad y nunca el histórico de la primera sincronización. Cada una crea su registro en plazos-notificaciones (Atlas) con origen 'usuario'.",
				nodes: ["appupdate", "miscausas", "plazosnot"],
				edges: ["e-app-plazos", "e-mc-plazos"],
			},
			{
				title: "Bandeja del PJN",
				text: "pjn-bandeja-sync baja las cédulas recibidas por cada credencial. Todas quedan en pjn-notifications y se vinculan con su causa y su movimiento (cedula.recepcion: fecha exacta y destinatarios con CUIT). Solo las de hoy generan plazo; si el movimiento todavía no llegó, quedan esperando el documento y se reconcilian solas.",
				nodes: ["bandeja", "pjnnotif", "pjnmov", "plazosnot"],
				edges: ["e-band-notif", "e-band-plazos"],
			},
			{
				title: "Texto y ficha",
				text: "Los scrapers espejan cada movimiento en pjn-movements y suben el PDF a S3 en la misma corrida. pjn-rag-cedulas (worker_02) lee ese PDF, extrae el texto y arma la ficha de la cédula (cedula.documento: número, emisor, destinatarios con CUIT, resolución vinculada).",
				nodes: ["appupdate", "pjnmov", "rag"],
				edges: ["e-app-mov", "e-rag-mov"],
			},
			{
				title: "Cálculo",
				text: `plazos-worker-usuarios toma las cédulas pendientes de las causas en su alcance (${alcance(
					live.filtroUsuarios,
				)}), lee el PDF de S3, busca el plazo expreso en el texto o aplica la regla normativa, y calcula el vencimiento con el calendario de feriados. Deja el resultado en plazos-notificaciones y la referencia en pjn-movements (cedula.plazo).`,
				nodes: ["plazosnot", "pjnmov", "refs", "calculo"],
				edges: ["e-plazos-calc", "e-mov-calc", "e-refs-calc"],
			},
			{
				title: "Entrega",
				text: `plazos-folders-worker toma los plazos calculados confiables y vigentes de las causas de los usuarios que activaron plazos automáticos (${JSON.stringify(
					live.userFilter || {},
				)}) y se los pasa al hub, que decide por carpeta: evento en el calendario si la cédula es del usuario (confirmado por su bandeja o por su CUIT), aviso si es de la otra parte, o sugerencia sin confirmar. ${
					live.dryRun ? "Hoy está en DRY RUN: el hub simula y no se crea nada." : ""
				}`,
				nodes: ["calculo", "entrega", "hub", "calendario"],
				edges: ["e-calc-entrega", "e-entrega-hub", "e-hub-cal"],
			},
			{
				title: "Correo",
				text: "La notificación del movimiento que ya existe (JudicialMovement, sale a las 19 h) muestra el plazo si el hub ya lo entregó a ese usuario: vencimiento, días, fundamento y cargo de gracia. No crea notificaciones nuevas. Interruptor PLAZOS_EN_CORREO en worker-003.",
				nodes: ["plazosnot", "correo"],
				edges: ["e-plazos-correo"],
			},
		],
	};
}
