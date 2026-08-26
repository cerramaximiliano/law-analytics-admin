// Spec del diagrama GENERAL del repositorio pjn-mis-causas: sus 13 procesos PM2
// y cómo se relacionan.
//
// El repo tiene un solo hilo conductor: la credencial del usuario. Todo lo que
// hace es consecuencia de tenerla — verificarla, traer sus causas, mantenerlas
// al día, mirar su bandeja y vigilar que nada se caiga. El diagrama agrupa los
// procesos por ese ciclo en vez de listarlos, porque listados ya están en la
// pestaña de workers.
//
// Los procesos de scheduling propio (cron_restart) se distinguen de los que
// arranca y para el manager: es la diferencia entre "corre igual" y "corre si
// el manager lo decide".
import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export function buildMisCausasRepoSpec(): FlowSpec {
	const nodes: FlowNode[] = [
		// ── Entrada
		{ id: "user", x: 24, y: 200, w: 170, h: 62, kind: "actor", label: "Usuario", sub: ["carga su credencial PJN"] },
		{ id: "hub", x: 24, y: 300, w: 170, h: 66, kind: "hub", label: "law-analytics-server", sub: ["alta de credencial", "alta manual de carpeta"] },

		// ── Orquestador
		{
			id: "manager", x: 250, y: 240, w: 190, h: 96, kind: "hub", label: "manager",
			sub: ["pjn-mis-causas-manager", "escala y apaga workers", "config data-driven"],
		},

		// ── Ciclo de la credencial
		{
			id: "credproc", x: 500, y: 40, w: 200, h: 84, kind: "private", label: "credentials-processor",
			sub: ["valida la credencial", "extrae causas → staging"],
		},
		{
			id: "queue", x: 500, y: 152, w: 200, h: 70, kind: "db", label: "pjn-sync-queue",
			sub: ["staging de causas extraídas"],
		},
		{
			id: "queueproc", x: 500, y: 250, w: 200, h: 76, kind: "private", label: "sync-queue-processor",
			sub: ["crea causas + carpetas", "desde la staging"],
		},

		// ── Sincronización del listado
		{
			id: "full", x: 500, y: 356, w: 200, h: 80, kind: "private", label: "mis-causas",
			sub: ["sync completa on-demand", "todo el listado"],
		},
		{
			id: "daily", x: 500, y: 466, w: 200, h: 84, kind: "private", label: "update-sync",
			sub: ["una pasada por día", "altas y bajas del listado"],
		},

		// ── Actualización
		{
			id: "priv", x: 760, y: 356, w: 210, h: 100, kind: "private", label: "private-causas-update",
			sub: ["baja movimientos y PDFs", "vía lista + vía número", "dispara las novedades"],
		},
		{
			id: "pdf", x: 760, y: 480, w: 210, h: 70, kind: "private", label: "pdf-backfill ×2",
			sub: ["historial de PDFs a S3 (one-shot)"],
		},
		{
			id: "bandeja", x: 760, y: 40, w: 210, h: 84, kind: "private", label: "bandeja-sync",
			sub: ["cédulas y escritos del letrado", "API JSON, 07/13/19 ART"],
		},

		// ── Datos
		{ id: "portal", x: 1030, y: 150, w: 190, h: 74, kind: "ext", label: "portal PJN", sub: ["Mis Causas (SSO)", "sin captcha"] },
		{ id: "datos", x: 1030, y: 366, w: 190, h: 92, kind: "db", label: "causas-* · folders", sub: ["pjn-movements + S3", "causas-update-runs"] },
		{ id: "notif", x: 1030, y: 486, w: 190, h: 66, kind: "ok", label: "la-notification", sub: ["novedades al usuario"] },

		// ── Vigilancia (cron propio)
		{
			id: "vigilancia", x: 250, y: 400, w: 190, h: 130, kind: "warn", label: "Vigilancia (cron)",
			sub: ["coverage-monitor · cada hora", "credential-health · cada 6h", "pre-send-check · 18 ART", "movements-reconcile · 06 ART"],
		},
		{ id: "admin", x: 250, y: 88, w: 190, h: 76, kind: "ui", label: "UI Admin", sub: ["config del manager", "métricas y alertas"] },
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "user", to: "hub", kind: "handoff" },
		{ id: "e2", from: "hub", to: "manager", label: "credencial nueva" },
		{ id: "e3", from: "manager", to: "credproc", kind: "handoff", label: "pendientes de verificar" },
		{ id: "e4", from: "credproc", to: "queue", label: "causas extraídas" },
		{ id: "e5", from: "queue", to: "queueproc" },
		{ id: "e6", from: "manager", to: "full", kind: "handoff", label: "on-demand" },
		{ id: "e7", from: "manager", to: "daily", kind: "handoff", label: "diario" },
		{ id: "e8", from: "manager", to: "priv", kind: "handoff", label: "en horario", fromSide: "bottom", toSide: "left" },
		{ id: "e9", from: "credproc", to: "portal", label: "login SSO" },
		{ id: "e10", from: "full", to: "portal", label: "listado completo", fromSide: "right", toSide: "bottom" },
		{ id: "e11", from: "daily", to: "portal", fromSide: "right", toSide: "bottom" },
		{ id: "e12", from: "priv", to: "portal", label: "detalle de cada causa" },
		{ id: "e13", from: "bandeja", to: "portal", label: "API JSON" },
		{ id: "e14", from: "queueproc", to: "datos", kind: "ok" },
		{ id: "e15", from: "full", to: "datos", kind: "ok" },
		{ id: "e16", from: "daily", to: "datos", kind: "ok", label: "altas y bajas" },
		{ id: "e17", from: "priv", to: "datos", kind: "ok", label: "movimientos" },
		{ id: "e18", from: "priv", to: "notif", kind: "ok", label: "novedades del día" },
		{ id: "e19", from: "pdf", to: "datos", kind: "ok" },
		{ id: "e20", from: "bandeja", to: "notif", kind: "ok", label: "cédulas" },
		{ id: "e21", from: "vigilancia", to: "datos", label: "lee", fromSide: "right", toSide: "left" },
		{ id: "e22", from: "admin", to: "manager", kind: "handoff", label: "config" },
	];

	return {
		id: "pjn-mis-causas-repo",
		title: "pjn-mis-causas — el repositorio completo",
		intro:
			"Los 13 procesos del repo y cómo se encadenan. Todo cuelga de la credencial del usuario: verificarla, traer sus causas, mantenerlas al día, leer su bandeja y vigilar que nada se caiga en el camino.",
		width: 1250,
		height: 580,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "Cinco bloques: el manager que orquesta, el ciclo de alta de la credencial, la sincronización del listado, la actualización de movimientos, y la vigilancia. A la derecha, lo único externo: el portal PJN y las colecciones donde queda todo.",
			},
			{
				title: "El manager decide quién corre",
				text: "pjn-mis-causas-manager escala y apaga los workers según la cola de trabajo y la config de scraping-manager-state. Los workers tienen autorestart:false a propósito: su ciclo de vida lo controla el manager, no PM2. Las excepciones son los procesos de vigilancia, que tienen cron propio y corren aunque el manager esté caído.",
				nodes: ["manager", "admin", "credproc", "full", "daily", "priv"],
				edges: ["e3", "e6", "e7", "e8", "e22"],
			},
			{
				title: "Alta de una credencial",
				text: "credentials-processor entra al portal, confirma que la credencial sirve y deja las causas extraídas en la staging pjn-sync-queue. sync-queue-processor las convierte en causas y carpetas. El paso por staging existe para que un fallo a mitad de camino no deje entidades a medio crear.",
				nodes: ["user", "hub", "credproc", "queue", "queueproc", "datos"],
				edges: ["e1", "e2", "e3", "e4", "e5", "e14"],
			},
			{
				title: "Mantener el listado al día",
				text: "mis-causas hace la sync completa cuando el usuario valida una credencial o pide un resync. update-sync hace una pasada diaria: da de alta lo que el portal lista y no tiene carpeta, y marca como salido lo que dejó de aparecer. Los dos recorren el listado entero; ninguno baja movimientos.",
				nodes: ["full", "daily", "portal", "datos"],
				edges: ["e10", "e11", "e15", "e16"],
			},
			{
				title: "Bajar los movimientos",
				text: "private-causas-update es el único que abre cada causa. Reparte entre dos vías —entrar por el listado o buscarla por número, ambas con la credencial— y de ahí salen los movimientos, los PDFs a S3 y las novedades que le llegan al usuario. pdf-backfill completa el historial de PDFs de las causas que entraron por el caché del ecosistema, que llegan con movimientos pero sin documentos.",
				nodes: ["priv", "pdf", "portal", "datos", "notif"],
				edges: ["e12", "e17", "e18", "e19"],
			},
			{
				title: "La bandeja del letrado",
				text: "bandeja-sync es el único que no scrapea: usa la API JSON del portal para levantar cédulas recibidas y escritos enviados, tres veces por día. Alimenta el mismo email de novedades que los movimientos.",
				nodes: ["bandeja", "portal", "notif"],
				edges: ["e13", "e20"],
			},
			{
				title: "La vigilancia",
				text: "Cuatro procesos con cron propio que no tocan el portal, solo leen lo que quedó escrito: coverage-monitor vigila cada hora que la cobertura no se caiga, credential-health cada 6 horas busca credenciales sanas con causas rotas, pre-send-check emite el veredicto diario a las 18 ART antes de que salgan las notificaciones, y movements-reconcile repara el espejo de PDFs. Corren aunque el manager esté caído — son justamente los que avisan si lo está.",
				nodes: ["vigilancia", "datos"],
				edges: ["e21"],
			},
		],
	};
}
