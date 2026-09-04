/**
 * Del proceso que corre al panel donde se configura.
 *
 * Infraestructura contesta "dónde corre esto" pero se quedaba ahí: encontrabas
 * `worker_SAIJ_0` en worker_01 y no había forma de saltar a su panel para ver
 * su configuración, sus estadísticas o su flujo. Es el cuarto lado del
 * triángulo Datos ↔ Worker ↔ Flujo que el resto del admin ya tiene cerrado.
 *
 * El mapa es a mano y a propósito INCOMPLETO. No todo lo que corre tiene un
 * panel —los sidecars de monitoreo, el shipper de logs, Hydra, mongod— y varios
 * repos alimentan más de una vista. Donde no hay una respuesta clara no se pone
 * link: un link que lleva al panel equivocado es peor que ninguno, porque hace
 * perder el tiempo y erosiona la confianza en los demás.
 *
 * Se resuelve primero por nombre de proceso (más específico) y después por
 * repo, para que `pjn-workers-scraping` —que alimenta sentencias, movimientos,
 * plazos y el scraping en sí— mande cada proceso a su panel y no todos al
 * mismo.
 */

export interface PanelDeWorker {
	/** Ruta del panel en el admin. */
	to: string;
	/** Qué se va a encontrar ahí. */
	hint: string;
}

/** Por nombre exacto o por prefijo del proceso. Gana sobre el mapa por repo. */
const POR_PROCESO: { prefijo: string; panel: PanelDeWorker }[] = [
	{ prefijo: "sentencias-", panel: { to: "/admin/workers/sentencias", hint: "Panel del worker de sentencias" } },
	{ prefijo: "update-movimientos-", panel: { to: "/admin/workers/movimientos", hint: "Panel del worker de movimientos" } },
	{ prefijo: "plazos-dataset", panel: { to: "/admin/workers/plazos-dataset", hint: "Panel del dataset de plazos" } },
	{ prefijo: "plazos-", panel: { to: "/admin/workers/plazos", hint: "Panel del worker de plazos" } },
	{ prefijo: "scraping-", panel: { to: "/admin/causas/workers?worker=scraping", hint: "Configuración del scraping PJN" } },
	{ prefijo: "retry-worker", panel: { to: "/admin/causas/workers?worker=retry", hint: "Configuración del worker de reintentos" } },
	{ prefijo: "worker_SAIJ", panel: { to: "/admin/workers/saij", hint: "Panel del worker SAIJ" } },
	{ prefijo: "backfill-saij", panel: { to: "/admin/workers/saij", hint: "Panel del worker SAIJ" } },
	{ prefijo: "infoleg-", panel: { to: "/admin/workers/infoleg", hint: "Panel del worker de INFOLEG" } },
	{ prefijo: "postal-", panel: { to: "/admin/workers/scraper", hint: "Panel del scraper postal" } },
	{ prefijo: "pjn-liq-", panel: { to: "/admin/workers/liquidacion", hint: "Panel del worker de liquidaciones" } },
	{ prefijo: "pjn-email-", panel: { to: "/admin/workers/email-verification", hint: "Panel de verificación de emails" } },
	{ prefijo: "email-verification", panel: { to: "/admin/workers/email-verification", hint: "Panel de verificación de emails" } },
	{
		prefijo: "pjn-app-update-",
		panel: { to: "/admin/causas/workers?worker=app-update", hint: "Configuración del worker de actualización" },
	},
	{ prefijo: "pjn-verify/", panel: { to: "/admin/causas/workers?worker=verification", hint: "Configuración del worker de verificación" } },
];

/** Fallback por repo, para lo que no cayó en ningún prefijo. */
const POR_REPO: Record<string, PanelDeWorker> = {
	"eje-workers": { to: "/admin/eje/workers", hint: "Panel de los workers de EJE" },
	"pjsalta-workers": { to: "/admin/pjsalta/workers", hint: "Panel de los workers de PJ Salta" },
	"pjcatamarca-workers": { to: "/admin/pjcatamarca/workers", hint: "Panel de los workers de PJ Catamarca" },
	"pjmendoza-workers": { to: "/admin/pjmendoza/workers", hint: "Panel de los workers de PJ Mendoza" },
	"mev-workers": { to: "/admin/workers/mev", hint: "Panel de los workers de MEV" },
	"scba-workers": { to: "/admin/workers/mev?worker=scba", hint: "Panel del worker de SCBA" },
	"pjn-mis-causas": { to: "/admin/causas/workers?worker=mis-causas", hint: "Configuración de Mis Causas" },
	"pjn-escritos-worker": { to: "/admin/workers/escritos", hint: "Panel del worker de escritos" },
	"pjn-liquidacion-worker": { to: "/admin/workers/liquidacion", hint: "Panel del worker de liquidaciones" },
	"pjn-email-workers": { to: "/admin/workers/email-verification", hint: "Panel de verificación de emails" },
	"saij-workers": { to: "/admin/workers/saij", hint: "Panel del worker SAIJ" },
	infoleg: { to: "/admin/workers/infoleg", hint: "Panel del worker de INFOLEG" },
	"postal-tracking-service": { to: "/admin/workers/scraper", hint: "Panel del scraper postal" },
	"la-log-shipper": { to: "/admin/logs", hint: "Los logs que este sidecar envía" },
};

export function panelDeWorker(processName: string, repo: string | null | undefined): PanelDeWorker | null {
	const porProceso = POR_PROCESO.find((e) => processName.startsWith(e.prefijo));
	if (porProceso) return porProceso.panel;
	return (repo && POR_REPO[repo]) || null;
}
