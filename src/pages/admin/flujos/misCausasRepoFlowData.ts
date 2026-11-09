// Spec del diagrama GENERAL del repositorio pjn-mis-causas: sus 20 procesos PM2
// y cómo se relacionan (pm2.mis-causas.config.js, noviembre de 2026).
//
// El repo tiene un solo hilo conductor: la credencial del usuario. Todo lo que
// hace es consecuencia de tenerla — verificarla, traer sus causas, mantenerlas
// al día, mirar su bandeja y vigilar que nada se caiga. El diagrama agrupa los
// procesos por ese ciclo en vez de listarlos, porque listados ya están en la
// pestaña de workers.
//
// Desde noviembre de 2026 el portal son TRES fuentes, y conviene verlas aparte:
// el SCW clásico (JSF, browser o lector HTTP con la sesión), la API JSON del SCW
// nuevo (listado, actuaciones y PDFs, detrás de flags y con el SCW clásico de
// respaldo) y las APIs JSON del portal (bandeja, cuenta del usuario).
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
			id: "manager", x: 250, y: 220, w: 190, h: 116, kind: "hub", label: "manager",
			sub: ["pjn-mis-causas-manager", "escala y apaga workers", "digest de altas/bajas", "avisos de portal y contraseña"],
		},

		// ── Ciclo de la credencial
		{
			id: "credproc", x: 500, y: 40, w: 200, h: 96, kind: "private", label: "credentials-processor",
			sub: ["valida la credencial", "listado: API (flag) o browser", "extrae causas → staging"],
		},
		{
			id: "queue", x: 500, y: 160, w: 200, h: 62, kind: "db", label: "pjn-sync-queue",
			sub: ["staging de causas extraídas"],
		},
		{
			id: "queueproc", x: 500, y: 246, w: 200, h: 70, kind: "private", label: "sync-queue-processor",
			sub: ["crea causas + carpetas", "desde la staging"],
		},

		// ── Sincronización del listado
		{
			id: "full", x: 500, y: 350, w: 200, h: 74, kind: "private", label: "mis-causas",
			sub: ["sync completa on-demand", "todo el listado (browser)"],
		},
		{
			id: "daily", x: 500, y: 450, w: 200, h: 96, kind: "private", label: "update-sync",
			sub: ["una pasada por día", "listado: API (flag) o browser", "altas y bajas · evidencia a S3"],
		},
		{
			id: "pdfpub", x: 500, y: 572, w: 200, h: 70, kind: "private", label: "pdf-backfill ×2",
			sub: ["PDFs de causas públicas", "HTTP sin sesión, always-on"],
		},
		{
			id: "export", x: 500, y: 666, w: 200, h: 56, kind: "private", label: "expediente-export",
			sub: ["PDF del expediente (qpdf)"],
		},

		// ── Actualización
		{
			id: "bandeja", x: 760, y: 40, w: 210, h: 84, kind: "private", label: "bandeja-sync",
			sub: ["cédulas y escritos del letrado", "APIs JSON, 07/13/19 ART", "perfil y vencimiento de clave"],
		},
		{
			id: "interv", x: 760, y: 148, w: 210, h: 70, kind: "private", label: "intervinientes",
			sub: ["partes y letrados", "diario 05 ART, con login"],
		},
		{
			id: "priv", x: 760, y: 350, w: 210, h: 120, kind: "private", label: "private-causas-update",
			sub: ["+ initial-sync (sync inicial)", "sweep del listado, lector HTTP", "1ª lectura por API (flag)", "movimientos · PDFs · novedades"],
		},
		{
			id: "huecos", x: 760, y: 494, w: 210, h: 76, kind: "private", label: "huecos-backfill",
			sub: ["cada 3 h, cron propio", "históricas que la API da 500", "se completan por el SCW clásico"],
		},
		{
			id: "pdfpriv", x: 760, y: 594, w: 210, h: 84, kind: "private", label: "pdf-backfill-private",
			sub: ["PDFs de causas con sesión", "por la API (idActuacion)", "visor del SCW de respaldo"],
		},

		// ── Fuentes externas (tres)
		{ id: "scw", x: 1030, y: 40, w: 200, h: 84, kind: "ext", label: "SCW clásico (JSF)", sub: ["login SSO · sin captcha", "listado · detalle · históricas", "browser o lector HTTP"] },
		{
			id: "api", x: 1030, y: 148, w: 200, h: 110, kind: "ext", label: "API del SCW nuevo",
			sub: ["scw-beta.pjn.gov.ar/api (JSON)", "listado · actuaciones · PDFs", "token PKCE de la misma sesión", "beta: 500 en históricas viejas"],
		},
		{ id: "portalapi", x: 1030, y: 282, w: 200, h: 70, kind: "ext", label: "APIs JSON del portal", sub: ["api.pjn.gov.ar: bandeja", "usuario/info (clave, 2FA)"] },

		// ── Datos
		{ id: "datos", x: 1030, y: 400, w: 200, h: 100, kind: "db", label: "causas-* · folders", sub: ["pjn-movements + S3", "causas-update-runs", "mis-causas-syncs · huecos-runs"] },
		{ id: "notif", x: 1030, y: 540, w: 200, h: 84, kind: "ok", label: "la-notification · email", sub: ["novedades del día", "digest de altas y bajas", "cédulas"] },

		// ── Vigilancia (cron propio)
		{
			id: "vigilancia", x: 250, y: 420, w: 190, h: 176, kind: "warn", label: "Vigilancia (cron)",
			sub: ["coverage-monitor · cada hora", "credential-health · cada 6 h", "pre-send-check · 18 ART", "daily-digest · 08 ART", "movements-reconcile · 06 ART", "scw-beta-probe · 06:40 ART"],
		},
		{ id: "admin", x: 250, y: 70, w: 190, h: 90, kind: "ui", label: "UI Admin", sub: ["config del manager", "flags de la API del SCW nuevo", "métricas y alertas"] },
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "user", to: "hub", kind: "handoff" },
		{ id: "e2", from: "hub", to: "manager", label: "credencial nueva" },
		{ id: "e3", from: "manager", to: "credproc", kind: "handoff", label: "pendientes de verificar" },
		{ id: "e4", from: "credproc", to: "queue", label: "causas extraídas" },
		{ id: "e5", from: "queue", to: "queueproc" },
		{ id: "e6", from: "manager", to: "full", kind: "handoff", label: "on-demand" },
		{ id: "e7", from: "manager", to: "daily", kind: "handoff", label: "diario", fromSide: "bottom", toSide: "left" },
		{ id: "e8", from: "manager", to: "priv", kind: "handoff", label: "en horario", fromSide: "right", toSide: "left", labelDy: -10 },
		{ id: "e9", from: "credproc", to: "api", label: "listado JSON (flag)", fromSide: "right", toSide: "left", labelDy: -8 },
		{ id: "e10", from: "full", to: "scw", label: "listado completo", fromSide: "right", toSide: "bottom" },
		{ id: "e11", from: "daily", to: "api", kind: "ok", label: "listado JSON (flag)", fromSide: "right", toSide: "bottom" },
		{ id: "e12", from: "priv", to: "scw", label: "detalle de cada causa", fromSide: "top", toSide: "bottom" },
		{ id: "e13", from: "bandeja", to: "portalapi", label: "JSON", fromSide: "right", toSide: "left" },
		{ id: "e14", from: "queueproc", to: "datos", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e15", from: "full", to: "datos", kind: "ok" },
		{ id: "e16", from: "daily", to: "datos", kind: "ok", label: "altas y bajas" },
		{ id: "e17", from: "priv", to: "datos", kind: "ok", label: "movimientos" },
		{ id: "e18", from: "priv", to: "notif", kind: "ok", label: "novedades del día" },
		{ id: "e19", from: "pdfpub", to: "datos", kind: "ok" },
		{ id: "e20", from: "bandeja", to: "notif", kind: "ok", label: "cédulas", fromSide: "bottom", toSide: "top" },
		{ id: "e21", from: "vigilancia", to: "datos", label: "lee", fromSide: "right", toSide: "left" },
		{ id: "e22", from: "admin", to: "manager", kind: "handoff", label: "config" },
		{ id: "e23", from: "priv", to: "api", kind: "ok", label: "1ª lectura (flag)", fromSide: "right", toSide: "bottom" },
		{ id: "e24", from: "huecos", to: "scw", label: "históricas con hueco", fromSide: "right", toSide: "right", labelDy: 20 },
		{ id: "e25", from: "pdfpriv", to: "api", kind: "ok", label: "PDF por API", fromSide: "right", toSide: "bottom", labelDy: 30 },
		{ id: "e26", from: "pdfpriv", to: "datos", kind: "ok" },
		{ id: "e27", from: "interv", to: "scw", label: "con login", fromSide: "right", toSide: "left" },
		{ id: "e28", from: "manager", to: "notif", kind: "ok", label: "digest altas/bajas", fromSide: "bottom", toSide: "bottom", labelDy: 16 },
		{ id: "e29", from: "export", to: "datos", kind: "ok" },
		{ id: "e30", from: "vigilancia", to: "api", label: "sonda diaria", fromSide: "top", toSide: "bottom", labelDy: -6 },
	];

	return {
		id: "pjn-mis-causas-repo",
		title: "pjn-mis-causas — el repositorio completo",
		intro:
			"Los 20 procesos del repo y cómo se encadenan. Todo cuelga de la credencial del usuario: verificarla, traer sus causas, mantenerlas al día, leer su bandeja y vigilar que nada se caiga en el camino. A la derecha, las tres fuentes del portal: el SCW clásico, la API JSON del SCW nuevo y las APIs JSON del portal.",
		width: 1260,
		height: 740,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "Cinco bloques: el manager que orquesta, el ciclo de alta de la credencial, la sincronización del listado, la actualización de movimientos y documentos, y la vigilancia. A la derecha, lo externo: las tres fuentes del portal y las colecciones donde queda todo.",
			},
			{
				title: "El manager decide quién corre",
				text: "pjn-mis-causas-manager escala y apaga los workers según la cola de trabajo y la config de scraping-manager-state. Los workers tienen autorestart:false a propósito: su ciclo de vida lo controla el manager, no PM2. Dentro del manager corren además los barridos que no son workers: el digest de altas y bajas de causas, los avisos de incidentes del portal y el de vencimiento de contraseña. Las excepciones son los procesos con cron propio (vigilancia, intervinientes, huecos-backfill, bandeja) y los always-on (pdf-backfill, expediente-export), que corren aunque el manager esté caído.",
				nodes: ["manager", "admin", "credproc", "full", "daily", "priv", "notif"],
				edges: ["e3", "e6", "e7", "e8", "e22", "e28"],
			},
			{
				title: "Alta de una credencial",
				text: "credentials-processor entra al portal, confirma que la credencial sirve y deja las causas extraídas en la staging pjn-sync-queue. Con el flag cargaInicialApi lee el listado completo por la API del SCW nuevo en una sola llamada (con \"Ver todos\") y arma la cola igual que antes; si la API falla, pagina con el browser. sync-queue-processor convierte la staging en causas y carpetas. El paso por staging existe para que un fallo a mitad de camino no deje entidades a medio crear. Después, initial-sync (el mismo código de private-causas-update, modo sync inicial) baja los movimientos de todas las causas nuevas en una pasada del listado.",
				nodes: ["user", "hub", "credproc", "queue", "queueproc", "api", "datos", "priv"],
				edges: ["e1", "e2", "e3", "e4", "e5", "e9", "e14"],
			},
			{
				title: "Mantener el listado al día",
				text: "mis-causas hace la sync completa cuando el usuario valida una credencial o pide un resync. update-sync hace una pasada diaria: da de alta lo que el portal lista y no tiene carpeta, y marca como salido lo que dejó de aparecer. Desde el 9/11/2026 update-sync lee el listado por la API del SCW nuevo para las credenciales del flag listadoApiScwBeta (2.857 causas en ~70 s contra ~21 min con el browser), guarda el JSON como evidencia en S3 y vuelve al browser si la API no responde completa. Ninguno de los dos baja movimientos.",
				nodes: ["full", "daily", "scw", "api", "datos"],
				edges: ["e10", "e11", "e15", "e16"],
			},
			{
				title: "Bajar los movimientos",
				text: "private-causas-update es el único que abre cada causa. Recorre el listado una sola vez (sweep) y lee cada expediente con el lector HTTP del SCW clásico, con la misma sesión. Para una causa que todavía no tiene movimientos (primera lectura) usa la API del SCW nuevo detrás del flag movimientosApiInicial: 0,4 s por causa, con el identificador de cada actuación; si la API falla vuelve al HTTP. Las históricas viejas que la API no puede dar (500 en algunas páginas, casi todas CSS 1992–2015) quedan marcadas y las completa huecos-backfill por el SCW clásico cada 3 horas, abriendo sesión nueva cada 100 causas. De acá salen los movimientos, los PDFs a S3 y las novedades que le llegan al usuario.",
				nodes: ["priv", "huecos", "scw", "api", "datos", "notif"],
				edges: ["e12", "e23", "e24", "e17", "e18"],
			},
			{
				title: "Los documentos",
				text: "Tres procesos siempre encendidos completan los PDFs de los movimientos. pdf-backfill ×2 atiende las causas públicas que entraron por el caché del ecosistema (llegan con movimientos pero sin documentos) por HTTP sin sesión. pdf-backfill-private atiende las causas que exigen sesión: con la API del SCW nuevo baja cada PDF por el identificador de la actuación en tres peticiones, sin posicionar el browser en el listado (que en credenciales grandes costaba hasta 5 minutos por causa), y resuelve la URL del visor que faltaba; el visor del SCW clásico queda de respaldo. expediente-export arma el PDF completo del expediente a pedido del usuario.",
				nodes: ["pdfpub", "pdfpriv", "export", "api", "datos"],
				edges: ["e19", "e25", "e26", "e29"],
			},
			{
				title: "La bandeja y los intervinientes",
				text: "bandeja-sync no scrapea: usa las APIs JSON del portal para levantar cédulas recibidas y escritos enviados, tres veces por día, y de paso guarda el perfil de la cuenta (roles, 2FA, días hasta el vencimiento de la contraseña). Alimenta el mismo email de novedades que los movimientos. intervinientes lee partes y letrados de las causas de las credenciales activas, una vez por día, con login en el SCW clásico.",
				nodes: ["bandeja", "interv", "portalapi", "scw", "notif"],
				edges: ["e13", "e20", "e27"],
			},
			{
				title: "La vigilancia",
				text: "Seis procesos con cron propio. Cinco no tocan el portal, solo leen lo que quedó escrito: coverage-monitor vigila cada hora que la cobertura no se caiga, credential-health cada 6 horas busca credenciales sanas con causas rotas, pre-send-check emite el veredicto diario a las 18 ART antes de que salgan las notificaciones, daily-digest resume el día y movements-reconcile repara el espejo de PDFs. El sexto, scw-beta-probe, sí entra: una vez por día comprueba con una credencial real que la API del SCW nuevo sigue igual (contrato, listado, una causa de control y un PDF) y, si algo cambió o falla, avisa al admin y apaga los flags de la API para que todo vuelva solo al SCW clásico. Corren aunque el manager esté caído — son justamente los que avisan si lo está.",
				nodes: ["vigilancia", "datos", "api"],
				edges: ["e21", "e30"],
			},
		],
	};
}
