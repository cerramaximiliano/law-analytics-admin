// Spec del diagrama de los procesos del hub (15.229.93.121) que no son APIs de
// otro repo: los 5 procesos PM2 de law-analytics-server (ecosystem.config.js) y
// los 2 crons de la-user-lifecycle, que corren en el mismo box y escriben en la
// misma base. Relevado el 15/11/2026 contra `sudo pm2 list`.
//
// Las dos APIs corren siempre; los cinco crons son procesos PM2 con
// autorestart:false + cron_restart, así que figuran stopped entre corridas (en
// cross-monitor van como mustExist). Inventario escrito:
// la-infra-docs/arquitectura/procesos-law-analytics-server.md.
import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export function buildHubProcesosSpec(): FlowSpec {
	const nodes: FlowNode[] = [
		// ── Quién entra
		{ id: "user", x: 24, y: 60, w: 170, h: 62, kind: "actor", label: "Usuario", sub: ["app web y móvil"] },
		{ id: "adminui", x: 24, y: 220, w: 170, h: 62, kind: "ui", label: "UI Admin", sub: ["este panel"] },
		{ id: "ia", x: 24, y: 360, w: 170, h: 62, kind: "actor", label: "Claude.ai · ChatGPT", sub: ["vía la-mcp-server"] },

		// ── Las dos APIs (siempre online)
		{
			id: "server",
			x: 230,
			y: 30,
			w: 230,
			h: 136,
			kind: "hub",
			label: "law-analytics-server-prod",
			sub: [
				"API principal · :5000",
				"auth: Google OAuth + JWT",
				"crons internos: sesiones, logs,",
				"Google Calendar, recordatorios",
				"de turnos",
			],
		},
		{
			id: "adminapi",
			x: 230,
			y: 196,
			w: 230,
			h: 118,
			kind: "hub",
			label: "law-analytics-admin-api-prod",
			sub: [
				":5002 · backend del admin",
				"11 crons internos con heartbeat",
				"(watchdog, digests, contratos",
				"de workers, reconciliaciones)",
			],
		},

		// ── Datos
		{
			id: "causas",
			x: 520,
			y: 30,
			w: 200,
			h: 92,
			kind: "db",
			label: "causas-* · prioridad",
			sub: ["app-update, pdf-backfill,", "RAG y OCR ordenan sus colas", "por prioridad.score"],
		},
		{
			id: "atlas",
			x: 520,
			y: 160,
			w: 200,
			h: 92,
			kind: "db",
			label: "Atlas",
			sub: ["usuarios · folders · equipos", "suscripciones · cron-health", "user-lifecycle-*"],
		},
		{
			id: "hydra",
			x: 520,
			y: 296,
			w: 200,
			h: 76,
			kind: "ext",
			label: "Hydra (OAuth 2.1)",
			sub: ["consents y clients DCR", "Postgres local"],
		},

		// ── Crons PM2 (stopped entre corridas)
		{
			id: "prio",
			x: 790,
			y: 20,
			w: 220,
			h: 84,
			kind: "hub",
			label: "causa-priority-recompute",
			sub: ["cada hora a los :05", "plan, add-on, actividad,", "antigüedad en cola"],
		},
		{
			id: "resp",
			x: 790,
			y: 126,
			w: 220,
			h: 84,
			kind: "hub",
			label: "responsables-reglas-apply",
			sub: ["cada hora a los :20", "regla de alta + ubicación actual", "por equipo · idempotente"],
		},
		{
			id: "mcpclean",
			x: 790,
			y: 232,
			w: 220,
			h: 84,
			kind: "hub",
			label: "mcp-consent-cleanup",
			sub: ["lunes 09 UTC", "revoca consents sin uso en 60 d", "borra clients DCR huérfanos"],
		},
		{
			id: "lifecycle",
			x: 790,
			y: 340,
			w: 220,
			h: 104,
			kind: "private",
			label: "la-user-lifecycle",
			sub: ["diario 12 UTC · otro repo", "aviso de última oportunidad", "purga de no verificadas", "bajas pedidas · snapshot de stats"],
		},
		{
			id: "early",
			x: 790,
			y: 466,
			w: 220,
			h: 70,
			kind: "private",
			label: "la-user-lifecycle-early",
			sub: [":15 de 11 a 23 UTC", "recordatorio a las 24 h del alta"],
		},

		// ── Efectos
		{ id: "ses", x: 1070, y: 410, w: 170, h: 70, kind: "ok", label: "AWS SES", sub: ["emails al usuario"] },
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "user", to: "server", kind: "handoff", label: "JWT" },
		{ id: "e2", from: "adminui", to: "adminapi", kind: "handoff" },
		{ id: "e3", from: "ia", to: "hydra", label: "OAuth", fromSide: "right", toSide: "left", labelDy: 10 },
		{ id: "e4", from: "server", to: "causas", kind: "ok", label: "al vincular o archivar", fromSide: "right", toSide: "left", labelDy: -8 },
		{ id: "e5", from: "server", to: "atlas", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e6", from: "server", to: "hydra", label: "login y consent", fromSide: "right", toSide: "left", labelDy: 20 },
		{ id: "e7", from: "adminapi", to: "atlas", kind: "ok", label: "heartbeat de crons", fromSide: "right", toSide: "left", labelDy: 8 },
		{ id: "e8", from: "prio", to: "causas", kind: "ok", label: "prioridad", fromSide: "left", toSide: "right" },
		{ id: "e9", from: "resp", to: "atlas", kind: "ok", label: "responsable", fromSide: "left", toSide: "right" },
		{ id: "e10", from: "mcpclean", to: "hydra", label: "revoca y borra", fromSide: "left", toSide: "right" },
		{ id: "e11", from: "lifecycle", to: "atlas", kind: "ok", label: "purga · avisos", fromSide: "left", toSide: "right", labelDy: 10 },
		{ id: "e12", from: "lifecycle", to: "ses", kind: "ok", label: "verificación", fromSide: "right", toSide: "left" },
		{ id: "e13", from: "early", to: "ses", kind: "ok", label: "24 h", fromSide: "right", toSide: "left" },
	];

	return {
		id: "hub-procesos",
		title: "Procesos del hub — law-analytics-server y la-user-lifecycle",
		intro:
			"Las dos APIs que corren siempre (la principal, con la autenticación de todo el ecosistema, y la del admin) y los cinco crons PM2 del box: tres de law-analytics-server y dos de la-user-lifecycle. Los crons figuran stopped entre corridas; es lo normal.",
		width: 1260,
		height: 560,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "A la izquierda, quién entra: el usuario, este panel y los clientes IA. En el centro, las dos APIs y los datos que comparten. A la derecha, los crons: cada uno es un proceso PM2 aparte, que arranca a su hora, hace su trabajo y termina. cross-monitor los vigila como mustExist: alerta si desaparecen de PM2, no por estar detenidos.",
			},
			{
				title: "Las dos APIs",
				text: "law-analytics-server-prod es la API principal y el hub de autenticación: emite los JWT que validan todos los demás servicios, así que si se cae falla el ecosistema entero. Lleva además crons dentro del proceso: limpieza de sesiones y de logs, la sincronización con Google Calendar seis veces por día y los recordatorios de turnos cada hora. law-analytics-admin-api-prod es el backend de este panel y aloja 11 crons internos que dejan su heartbeat en cron-health (watchdog de crons, digests, contratos de salud de workers, reconciliaciones de causas y de descuentos). Su estado se ve en Estado del servidor.",
				nodes: ["user", "adminui", "server", "adminapi", "atlas", "causas"],
				edges: ["e1", "e2", "e4", "e5", "e7"],
			},
			{
				title: "La prioridad de las causas",
				text: "causa-priority-recompute corre cada hora a los :05 y puntúa todas las causas PJN que tienen carpeta: carpeta viva, plan y add-on del dueño, cuenta de prueba, cantidad de usuarios, actividad reciente y antigüedad en cola. Solo escribe el campo prioridad. Los workers no calculan nada: ordenan sus colas (app-update, pdf-backfill, extractores RAG, OCR) por prioridad.score. Cuando una carpeta se vincula o se archiva, la API recalcula su causa al instante; el cron cubre lo que cambia sin que nadie toque la carpeta.",
				nodes: ["prio", "causas", "server"],
				edges: ["e8", "e4"],
			},
			{
				title: "Las reglas de responsables",
				text: "responsables-reglas-apply corre cada hora a los :20, solo para los equipos que tienen alguna regla encendida. Primero aplica la regla de alta (las carpetas nuevas sin responsable se asignan según el reparto guardado) y después la de ubicación actual (lo que está en Cámara lo sigue X, solo PJN). Es idempotente: correrlo dos veces no cambia nada. Las corridas de Mis Causas son a las 10, 16 y 22 UTC, así que una carpeta que cambia de instancia se reasigna dentro de esa misma hora.",
				nodes: ["resp", "atlas"],
				edges: ["e9"],
			},
			{
				title: "La limpieza de autorizaciones MCP",
				text: "mcp-consent-cleanup corre los lunes a las 09 UTC. Revoca en Hydra las autorizaciones de clientes IA que el usuario no usó en 60 días, nunca la más reciente de cada usuario y proveedor, y después borra los clients DCR huérfanos (más de 7 días, sin consent ni tokens). El login y el consent del día a día los hace la API principal.",
				nodes: ["mcpclean", "hydra", "ia", "server"],
				edges: ["e10", "e3", "e6"],
			},
			{
				title: "El ciclo de vida de los usuarios",
				text: "la-user-lifecycle (repo propio) corre una vez por día a las 12 UTC: manda el aviso de última oportunidad a quien no verificó la cuenta, purga las cuentas sin verificar y sin login hace más de 90 días (con chequeo de datos antes de borrar), procesa las bajas pedidas y guarda el snapshot diario de stats. la-user-lifecycle-early corre cada hora a los :15 entre las 11 y las 23 UTC y manda el recordatorio amable a las 24 horas del alta, nunca de madrugada. La configuración se edita en caliente desde Usuarios → Dashboard → Ciclo de vida, y ambos excluyen las cuentas de prueba.",
				nodes: ["lifecycle", "early", "atlas", "ses"],
				edges: ["e11", "e12", "e13"],
			},
		],
	};
}
