import { CausaUserViewEntry, UserViewGate, UserViewList } from "api/pjnCredentials";
import { baseFolder, okView } from "./CausaUserViewDialog";

/**
 * Casuística de la lista de carpetas PJN del usuario, derivada de leer TODOS
 * los escritores de `Folder`: pjn-workers (verify / app-update / privacy-checker /
 * stuck / recovery), law-analytics-server (createFolder, linkFolderToCausa,
 * causaService pivotes, reverify, unlink, archivar) y pjn-mis-causas
 * (causa-sync-service, private-causas-update-worker, reconcile).
 * Cada grupo = una fila distinta que ve el usuario; cada sub-caso = una forma
 * distinta de llegar a esa fila (productor + campos).
 */

type F = Partial<CausaUserViewEntry["folder"]>;
type V = Partial<CausaUserViewEntry["view"]>;

export interface GuideCase {
	key: string;
	title: string;
	producer: string;
	fields: string;
	entry: CausaUserViewEntry;
	warn?: string;
}

export interface GuideGroup {
	row: string;
	title: string;
	whatUserSees: string;
	cases: GuideCase[];
}

const entry = (folder: F, view: V, links: CausaUserViewEntry["links"] = []): CausaUserViewEntry => ({
	user: { id: "u", email: "usuario@ejemplo.com", name: null },
	folder: baseFolder(folder),
	links,
	view: okView(view),
});

const pendingView = (extra: V = {}): V => ({
	list: "pending",
	expanded: { label: "Vinculado con PJN", accent: "green", badge: "pending" },
	detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "pending" }, gate: "pending" },
	inAttentionTable: true,
	...extra,
});

const failedView = (extra: V = {}): V => ({
	list: "failed",
	expanded: { label: "Vinculado con PJN", accent: "green", badge: "pending" },
	detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "pending" }, gate: "failed" },
	inAttentionTable: true,
	...extra,
});

const invalidView = (extra: V = {}): V => ({
	list: "invalid",
	expanded: { label: "Vinculado con PJN", accent: "green", badge: "invalid" },
	detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "invalid" }, gate: "invalid" },
	inAttentionTable: true,
	...extra,
});

const credOk = [
	{
		credentialId: "abcdef",
		removedFromSync: false,
		removedAt: null,
		access: "full",
		accessChangedAt: null,
		credentialEnabled: true,
		credentialValid: true,
		credentialSyncStatus: "completed",
		credentialLastErrorCode: null,
	},
];

export const PJN_GROUPS: GuideGroup[] = [
	{
		row: "ok",
		title: "OK — carátula + tilde azul",
		whatUserSees:
			"Carátula normal, tilde azul a la derecha (tooltip “Causa vinculada a PJN”). Fila expandida y detalle: pill verde “Vinculado con PJN”.",
		cases: [
			{
				key: "ok.verify",
				title: "Verificada por pjn-workers",
				producer:
					"pjn-workers verify-worker.js:412-427 → updateAssociatedFolders(isValid=true): causaVerified=doc.verified, causaIsValid=true, causaAssociationStatus='success'",
				fields: "source=auto · verified=true · isValid=true · assoc=success",
				entry: entry({}, {}),
			},
			{
				key: "ok.cache",
				title: "Alta desde causa ya conocida (BD local / caché)",
				producer:
					"hub folderController.js:2483-2534 (local_db) y :2579-2635 (cache): copia verified/isValid de la causa y hardcodea assoc='success'",
				fields: "source=auto · verified=<causa> · isValid=<causa> · assoc=success",
				entry: entry({}, {}),
				warn: "Si la causa estaba verified=false, isValid=null el folder queda (false, null, 'success') → se ve como PENDIENTE pero con status success.",
			},
			{
				key: "ok.miscausas",
				title: "Creada por el sync de Mis Causas",
				producer:
					"pjn-mis-causas causa-sync-service.js:892-975 (new Folder): source='pjn-login', causaVerified=TRUE hardcodeado, causaIsValid=existingCausa?.isValid!==false, assoc='success', overwrite=true",
				fields: "source=pjn-login · verified=true · isValid=true · assoc=success",
				entry: entry({ source: "pjn-login" }, {}, credOk),
				warn: "causaVerified=true aunque la causa nunca haya sido verificada (scrapingProgress.status puede quedar 'pending').",
			},
			{
				key: "ok.revoked",
				title: "Acceso revocado (privada + credencial ya no la cubre)",
				producer:
					"pjn-mis-causas private-causas-update-worker.js:1840-1867 (not_found → removedFromSync + access:'revoked') + recomputeFolderCoverage:1340 → causaCredentialCovered=false",
				fields: "source=pjn-login · causaCredentialCovered=false (causaIsPrivate suele quedar ausente)",
				entry: entry(
					{ source: "pjn-login", causaCredentialCovered: false },
					{
						list: "revoked",
						expanded: { label: "PJN — Acceso restringido", accent: "amber", badge: "revoked" },
						detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "reserved_revoked" },
						contentBlocked: true,
					},
					[{ ...credOk[0], removedFromSync: true, access: "revoked" }],
				),
				warn: "Desde F2 (2026-08-25) la lista lo muestra con candado ámbar “Acceso restringido”; el detalle bloquea con el gate y el server responde 403 en movimientos/PDFs.",
			},
			{
				key: "ok.inaccessible",
				title: "Inaccesible en el update público, todavía sin marcar",
				producer:
					"pjn-workers app-update-worker.js:1815 (isValid=false → solo $inc accessFailureCount); el privacy-checker recién la marca privada al cruzar el umbral (default 3) en el cron de 3AM/3PM",
				fields: "source=auto · verified=true · isValid=true · assoc=success · accessFailureCount=1..2",
				entry: entry({}, {}),
				warn: "Puede verse OK durante días mientras la causa ya no es accesible: no existe estado intermedio “sospechosa”.",
			},
		],
	},
	{
		row: "ok_cred_error",
		title: "OK con credencial rechazada — warning ámbar",
		whatUserSees:
			"Carátula normal pero el tilde azul se reemplaza por un warning ámbar (tooltip “PJN — Sincronización pausada: tus credenciales fueron rechazadas…”). Solo en carpetas source=pjn-login.",
		cases: [
			{
				key: "ok_cred_error.global",
				title: "Credencial del usuario en error",
				producer:
					"front usePjnCredentialError: credencial syncStatus='error' + lastError.code ∈ {CREDENTIAL_INVALID, REQUIRED_ACTION} (lo escribe pjn-mis-causas pjn-credentials.js recordError/markInvalid). Es GLOBAL por usuario, no por carpeta",
				fields: "source=pjn-login · credencial syncStatus=error",
				entry: entry(
					{ source: "pjn-login" },
					{
						list: "ok_cred_error",
						credError: { code: "CREDENTIAL_INVALID", message: "Error de login: CUIT/CUIL o contraseña incorrectos." },
					},
					[{ ...credOk[0], credentialValid: false, credentialSyncStatus: "error", credentialLastErrorCode: "CREDENTIAL_INVALID" }],
				),
				warn: "Ni la fila expandida ni el detalle muestran este warning (solo la lista). Las carpetas source=auto del mismo usuario no lo muestran nunca.",
			},
		],
	},
	{
		row: "pending",
		title: "Pendiente de verificación — chip ámbar + botón refresh",
		whatUserSees:
			"En lugar de la carátula, chip ámbar “Pendiente de verificación” con un botón de refresh. Va a la tabla “Carpetas que requieren tu atención”. Detalle: gate “Estamos buscando este expediente”.",
		cases: [
			{
				key: "pending.new",
				title: "Causa PJN nueva esperando al verify-worker (estado inicial normal)",
				producer:
					"hub folderController.js:2678-2755 (microservicio pjn-api associate-folder): causaVerified=false, causaIsValid=null, assoc='pending'",
				fields: "source=auto · verified=false · isValid=null · assoc=pending",
				entry: entry({ causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" }, pendingView()),
			},
			{
				key: "pending.reverify",
				title: "Reverificación pedida por el usuario",
				producer:
					"hub folderController.js:5218-5340 reverifyFolder: causaVerified=false, causaIsValid=$unset, assoc='pending', verificationAttempts+1 (máx 2), lastReverifyRequestedAt",
				fields: "source=auto · verified=false · isValid=(ausente) · assoc=pending · verificationAttempts=1..2",
				entry: entry(
					{ causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
					pendingView(),
				),
				warn: "Para 24 de los 28 fueros PJN el reset de la causa se saltea (modelo inexistente en el hub) y verify-worker solo toma causas source='app' sin carátula ni movimientos → la carpeta puede quedar pendiente PARA SIEMPRE y el usuario gastó 1 de 2 intentos. verificationAttempts nunca se resetea.",
			},
			{
				key: "pending.not_attempted",
				title: "Sin asociación intentada (not_attempted)",
				producer:
					"hub Folder.create (folderController.js:655) defaults del schema: causaVerified=false, assoc='not_attempted'. Persiste si el proceso murió antes de asociar, o tras clearPendingCausas (causaService.js:940)",
				fields: "source=auto|manual · verified=false · isValid=(ausente|null) · assoc=not_attempted",
				entry: entry({ causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "not_attempted" }, pendingView()),
				warn: "El front no conoce 'not_attempted': cae en “pendiente” y el refresh no hace nada útil.",
			},
			{
				key: "pending.handoff",
				title: "Handoff a privada sin actualizar el folder (Fase B)",
				producer:
					"pjn-workers verify-worker.js:976-991: portal público la rechaza pero la causa tiene linkedCredentials → causa verified=true,isPrivate=true; el FOLDER no se toca. Solo private-causas-update-worker.js:2052 lo promueve, y solo para usuarios cubiertos",
				fields: "source=auto · verified=false · isValid=null · assoc=pending (congelado)",
				entry: entry({ causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" }, pendingView()),
				warn: "Los folders de terceros que apuntan a esa causa quedan pendientes indefinidamente.",
			},
			{
				key: "pending.keep",
				title: "Desvinculación de credencial en modo “keep”",
				producer:
					"hub pjnCredentialsController.js:217-232 executeKeepMode (driver crudo): source='manual', pjn=false, causaId=null, causaVerified=false, causaIsValid=false, assoc=NULL, previousSyncSource='pjn'",
				fields: "source=manual · pjn=false · verified=false · isValid=false · assoc=null · previousSyncSource=pjn",
				entry: entry(
					{ source: "manual", pjn: false, causaVerified: false, causaIsValid: false, causaAssociationStatus: undefined },
					{
						list: "plain",
						expanded: { label: "Sincronización pausada (era PJN)", accent: "amber", badge: "pending" },
						detail: { chip: { label: "Sincronización pausada (era PJN)", accent: "amber", badge: "pending" }, gate: null },
					},
				),
				warn: "pjn=false → la lista NO muestra ningún indicador (solo la fila expandida/detalle dicen “Sincronización pausada”). assoc=null viola el enum del schema.",
			},
		],
	},
	{
		row: "pending_selection",
		title: "Seleccionar expediente — chip ámbar clickeable",
		whatUserSees:
			"Chip ámbar “Seleccionar expediente” (abre el selector) + warning. Tabla de atención. Detalle: gate “Encontramos más de un expediente”.",
		cases: [
			{
				key: "pending_selection.pivot",
				title: "La búsqueda devolvió varios expedientes (pivote)",
				producer:
					"hub causaService.js:641-663 storePendingCausasInFolder: pendingCausaIds, assoc='pending_selection', causaId apunta al PIVOTE; folderController.js:936/1066 marca causaVerified=true si es pivote",
				fields: "source=auto · verified=true|false · isValid=null · assoc=pending_selection · pendingCausaIds=[…]",
				entry: entry(
					{ causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
					{
						list: "pending_selection",
						expanded: { label: "Vinculado con PJN", accent: "green", badge: "pending" },
						detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "pending" }, gate: "pending_selection" },
						inAttentionTable: true,
					},
				),
				warn: "Si el usuario nunca elige, queda así indefinidamente; si cancela, pasa a manual/not_attempted (causaService.js:940).",
			},
		],
	},
	{
		row: "failed",
		title: "Asociación fallida — chip rojo",
		whatUserSees:
			"Chip rojo “Asociación fallida” + ícono rojo (tooltip “No se pudo vincular la causa - Verifique los datos ingresados”). Tabla de atención. Detalle: gate “No pudimos encontrar este expediente” con reintento (máx 2).",
		cases: [
			{
				key: "failed.notfound",
				title: "El portal no devolvió el expediente",
				producer:
					"pjn-workers verify-worker.js:412-427 updateAssociatedFolders(isValid=false): assoc='failed', causaVerified=doc.verified, causaIsValid=false; folderName='Causa inválida…' si overwrite",
				fields: "source=auto · verified=true · isValid=false · assoc=failed",
				entry: entry(
					{ causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" },
					failedView({
						expanded: { label: "Vinculado con PJN", accent: "green", badge: "invalid" },
						detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "invalid" }, gate: "failed" },
					}),
				),
				warn: "La lista dice “Asociación fallida” pero la fila expandida muestra badge “Causa inválida” — dos mensajes para el mismo estado.",
			},
			{
				key: "failed.error",
				title: "Excepción durante la verificación",
				producer:
					"pjn-workers verify-worker.js:609-628 updateFoldersOnError (solo si la causa NO tiene credencial vinculada): assoc='failed', causaAssociationError, causaVerified=false, causaIsValid=false",
				fields: "source=auto · verified=false · isValid=false · assoc=failed",
				entry: entry({ causaVerified: false, causaIsValid: false, causaAssociationStatus: "failed" }, failedView()),
			},
			{
				key: "failed.hub",
				title: "Falló la asociación en el hub (sin causaId)",
				producer:
					"hub folderController.js:502-517 / :526-540 / :2799-2814 / :4890-4910: assoc='failed' + causaAssociationError; pjn sigue en true y causaId queda null",
				fields: "source=auto · pjn=true · causaId=null · assoc=failed",
				entry: entry({ causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "failed", causaId: null }, failedView()),
				warn: "No hay causa que verificar: el reintento del usuario resetea flags y espera un worker que nunca la va a levantar. Solo el retry del admin la reconstruye desde judFolder.",
			},
		],
	},
	{
		row: "invalid",
		title: "Causa inválida — chip rojo",
		whatUserSees:
			"Chip rojo “Causa inválida” + ícono rojo (tooltip “Causa inválida - No se pudo verificar en el Poder Judicial”). Tabla de atención. Detalle: gate “El expediente no es accesible”.",
		cases: [
			{
				key: "invalid.verify",
				title: "Verificada e inválida",
				producer:
					"pjn-workers verify-worker.js:1395-1405: error al verificar sin credencial → causa verified=true,isValid=false,update=false; stuck-documents-worker.js:584 (portal dice inexistente)",
				fields: "source=auto · verified=true · isValid=false · assoc=failed|success",
				entry: entry({ causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" }, invalidView()),
				warn: "En la lista gana el branch “failed” si assoc=failed; solo se ve “Causa inválida” cuando assoc=success (p. ej. stuck-worker o el sync de Mis Causas).",
			},
			{
				key: "invalid.miscausas",
				title: "Sync de Mis Causas sobre causa inválida",
				producer:
					"pjn-mis-causas causa-sync-service.js:948-950: causaIsValid=false, folderName='Causa inválida o no pública', pero assoc='success' (nunca se degrada)",
				fields: "source=pjn-login · verified=true · isValid=false · assoc=success",
				entry: entry(
					{ source: "pjn-login", folderName: "Causa inválida o no pública", causaVerified: true, causaIsValid: false },
					invalidView(),
					credOk,
				),
				warn: "Status 'success' con causa inválida: los filtros por status la cuentan como éxito. Se repara sola si reaparece en Mis Causas (causa-sync-service.js:1193).",
			},
		],
	},
	{
		row: "reserved",
		title: "Causa reservada — warning rojo",
		whatUserSees:
			"Carátula + warning ROJO a la derecha (tooltip “Causa reservada — el tribunal restringió la consulta web pública…”). Solo en carpetas source≠pjn-login con causaIsPrivate=true. Fila expandida: pill roja “PJN — Causa reservada”.",
		cases: [
			{
				key: "reserved.checker",
				title: "Marcada por el privacy-checker (sin cobertura calculada)",
				producer:
					"pjn-workers pjn-privacy-checker-worker.js:312-315 markPrivate: accessFailureCount ≥ umbral → causaIsPrivate=true + causa isPrivate=true. NO escribe causaCredentialCovered",
				fields: "source=auto · verified=true · isValid=true · causaIsPrivate=true · causaCredentialCovered=(ausente)",
				entry: entry(
					{ causaIsPrivate: true },
					{
						list: "reserved",
						expanded: { label: "PJN — Causa reservada", accent: "red", badge: "reserved" },
						detail: { chip: { label: "PJN — Causa reservada", accent: "red", badge: "valid" }, gate: null },
					},
				),
				warn: "Sin causaCredentialCovered el detalle NO bloquea nada (gate solo con covered=false): el usuario ve “reservada” en rojo pero entra al detalle completo.",
			},
			{
				key: "reserved.uncovered",
				title: "Reservada y el usuario no tiene credencial que la cubra",
				producer:
					"pjn-mis-causas recomputeFolderCoverage (private-causas-update-worker.js:1340) o reconcile-has-active-credential.js:106: causaCredentialCovered=false para userIds fuera de coveredUserIds",
				fields: "source=auto · causaIsPrivate=true · causaCredentialCovered=false",
				entry: entry(
					{ causaIsPrivate: true, causaCredentialCovered: false },
					{
						list: "reserved",
						expanded: { label: "PJN — Causa reservada", accent: "red", badge: "reserved" },
						detail: { chip: { label: "PJN — Causa reservada", accent: "red", badge: "valid" }, gate: "reserved" },
						contentBlocked: true,
					},
				),
			},
			{
				key: "reserved.covered",
				title: "Reservada pero el usuario SÍ la cubre con su credencial",
				producer:
					"pjn-mis-causas recomputeFolderCoverage:1335 (credencial enabled, link sin removedFromSync ni access:'revoked') o promoción private-causas-update-worker.js:2052",
				fields: "source=auto · causaIsPrivate=true · causaCredentialCovered=true",
				entry: entry(
					{ causaIsPrivate: true, causaCredentialCovered: true },
					{
						list: "reserved_covered",
						expanded: { label: "PJN — Reservada (con acceso)", accent: "green", badge: "covered" },
						detail: { chip: { label: "PJN — Reservada (con acceso)", accent: "green", badge: "valid" }, gate: null },
						isPjnPrivateCovered: true,
					},
					credOk,
				),
				warn: "Desde F2 (2026-08-25) la lista muestra candado verde “Reservada con acceso”, igual que el detalle.",
			},
			{
				key: "reserved.nofolderflag",
				title: "Privada con causaCredentialCovered pero SIN causaIsPrivate en el folder",
				producer:
					"pjn-mis-causas: causaIsPrivate solo se escribe en la TRANSICIÓN (worker :1767 / :1560). Un folder creado sobre una causa ya privada (o desde caché privado, causa-sync-service.js:1268) nunca recibe causaIsPrivate=true, pero W6/W13 sí le escriben causaCredentialCovered",
				fields: "source=pjn-login|auto · causaIsPrivate=(ausente) · causaCredentialCovered=true|false",
				entry: entry(
					{ causaCredentialCovered: false },
					{ detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "reserved" }, contentBlocked: true },
				),
				warn: "Era la combinación más frecuente (F3 la corrigió sellando causaIsPrivate en pjn-login). Desde F2 la lista muestra candado ámbar aunque falte causaIsPrivate, porque la rama revocada solo mira covered=false.",
			},
		],
	},
	{
		row: "list_removed",
		title: "Ya no en la lista — warning ámbar",
		whatUserSees:
			"Carátula + warning ÁMBAR (tooltip “Esta causa ya no aparece en tu lista de Mis Causas del portal PJN…”). Solo en carpetas source=pjn-login. Fila expandida: pill ámbar “PJN — Ya no en la lista”. No bloquea el detalle.",
		cases: [
			{
				key: "list_removed.sync",
				title: "La causa dejó de aparecer en el listado completo del portal",
				producer:
					"pjn-mis-causas causa-sync-service.js:1808-1837 syncPjnNotFoundStatus (bulkWrite): listRemoved=true, listRemovedSource='pjn', listRemovedAt",
				fields: "source=pjn-login · listRemoved=true · listRemovedSource=pjn",
				entry: entry(
					{ source: "pjn-login", listRemoved: true, listRemovedSource: "pjn" },
					{
						list: "list_removed",
						expanded: { label: "PJN — Ya no en la lista", accent: "amber", badge: "list_removed" },
						detail: { chip: { label: "PJN — Ya no en la lista", accent: "amber", badge: "valid" }, gate: null },
					},
					credOk,
				),
				warn: "INDICADOR MUERTO: listRemoved/listRemovedSource/listRemovedAt no están declarados en el schema local de Folder de pjn-mis-causas y el bulkWrite corre en modo strict → el $set se descarta. Ninguna carpeta recibe esta marca desde el 24/04/2026 (las 64 que la tienen son anteriores).",
			},
			{
				key: "list_removed.auto",
				title: "listRemoved en carpeta source=auto",
				producer: "Marcas históricas (44 carpetas) sobre folders source=auto",
				fields: "source=auto · listRemoved=true",
				entry: entry({ listRemoved: true, listRemovedSource: "pjn" }, {}),
				warn: "La lista solo evalúa listRemoved si source=pjn-login → estas carpetas se ven OK.",
			},
		],
	},
	{
		row: "hidden_archived",
		title: "No aparece — archivada",
		whatUserSees:
			"No está en la lista principal (solo en el modal “Archivadas”). Si se abre el detalle: gate “Esta carpeta está archivada” con botón Desarchivar, que prevalece sobre cualquier otro estado.",
		cases: [
			{
				key: "archived.plan",
				title: "Creada archivada por límite de plan en el sync de Mis Causas",
				producer:
					"pjn-mis-causas subscription-limits-service.js:586-612 getNextFolderState → 'archived' → causa-sync-service.js:892 archived=true, archivedAt, archivedBy. Nunca se desarchiva sola",
				fields: "source=pjn-login · archived=true · archivedBy=<userId>",
				entry: entry(
					{ source: "pjn-login", archived: true },
					{ hiddenFromList: true, detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "archived" } },
					credOk,
				),
				warn: "Es el 88% de las carpetas PJN de la base. Si el plan no da más, la causa siguiente directamente NO crea carpeta (pendingByStorageLimit).",
			},
			{
				key: "archived.user",
				title: "Archivada por el usuario",
				producer: "hub folderController.js:~3690-3745 updateFolder (archived en el body). No toca ningún campo causa*",
				fields: "cualquier source · archived=true",
				entry: entry(
					{ archived: true },
					{ hiddenFromList: true, detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "archived" } },
				),
			},
		],
	},
];

export interface GuideFinding {
	id: string;
	severity: "alta" | "media" | "baja";
	title: string;
	detail: string;
	where: string;
}

export const PJN_FINDINGS: GuideFinding[] = [
	{
		id: "F1",
		severity: "alta",
		title: "[RESUELTO 2026-08-25, F1] “Ya no en la lista” no se marca desde el 24/04/2026",
		detail:
			"El schema local de Folder en pjn-mis-causas no declara listRemoved/listRemovedSource/listRemovedAt y Folder.bulkWrite corre en modo strict: el $set se descarta y solo se ejecuta $unset pjnNotFound. Los contadores y logs reportan “N marcados” igual.",
		where: "pjn-mis-causas src/models/folder.js (falta el campo) · src/services/causa-sync-service.js:1808-1837",
	},
	{
		id: "F2",
		severity: "alta",
		title: "[RESUELTO 2026-08-25, F2] Acceso revocado / reservada invisible en la lista",
		detail:
			"La lista no recibe causaCredentialCovered (store/reducers/folder.ts:271,298,572,620 no lo proyectan) y solo marca “reservada” si causaIsPrivate=true y source≠pjn-login. Resultado: carpetas con gate de reservada en el detalle se ven OK en la lista (5 no archivadas hoy; 146 archivadas).",
		where: "law-analytics-front folders.tsx:2733 · store/reducers/folder.ts · details.tsx:710",
	},
	{
		id: "F3",
		severity: "alta",
		title: "[RESUELTO 2026-08-25, F3] causaIsPrivate solo se escribe en la transición",
		detail:
			"Un folder creado sobre una causa que YA era privada (o desde caché privado) nunca recibe causaIsPrivate=true, pero sí causaCredentialCovered. Los predicados del front que exigen causaIsPrivate===true no matchean → ni “reservada” en la lista ni “Reservada (con acceso)” en el detalle.",
		where:
			"pjn-mis-causas private-causas-update-worker.js:1767 y :1560 (únicos escritores) · causa-sync-service.js:1268 (ensureFolder con existingCausa=null)",
	},
	{
		id: "F4",
		severity: "alta",
		title: "[RESUELTO 2026-08-25, F4] Despritavización asimétrica → gate residual",
		detail:
			"El privacy-checker (resetToPublic) hace $unset causaPrivateDetectedAt pero NO $unset causaCredentialCovered; el worker privado sí. Una causa vuelta pública por el checker puede quedar con causaCredentialCovered=false y el detalle sigue bloqueando (403 CAUSA_RESERVED).",
		where: "pjn-workers pjn-privacy-checker-worker.js:381-388 vs pjn-mis-causas private-causas-update-worker.js:1560-1566",
	},
	{
		id: "F5",
		severity: "media",
		title: "[RESUELTO 2026-09-06, F5] Reverificación del usuario casi nunca llega al worker",
		detail:
			"Era: reverifyFolder reseteaba la causa solo si mongoose.models[causaType] existía, y verify-worker tomaba solo causas source='app' sin carátula ni movimientos. Fix: el hub resetea verified:false/isValid:null (+errorCount/lastError/isError, strict:false) y setea reverifyRequestedAt; verify-worker toma también causas app/cache con reverifyRequestedAt, saltea el guard “ya tiene datos válidos” y limpia el flag al procesarlas. El re-scrape reemplaza el array movimiento (no duplica). Verificado end-to-end el 2026-09-06 (ver F13): log ‘Reverificación manual solicitada por el usuario — se omite el guard de datos válidos’ en pjn-verify/civil y reverifyRequestedAt limpiado tras procesar.",
		where: "law-analytics-server folderController.js (reverifyFolder) · pjn-workers verify-worker.js (reverifyFilter + esReverify)",
	},
	{
		id: "F6",
		severity: "media",
		title: "[RESUELTO 2026-09-06, F6] Estados fuera del enum / no contemplados por el front",
		detail:
			"Era: unlink keep escribía causaAssociationStatus=null con el driver crudo. Fix: executeKeepMode escribe los mismos campos que folderUnlinkService (status 'unlinked', previousSyncSource 'pjn', $unset causaIsValid/causaAssociationError/listRemoved*). Migración one-shot corrida el 2026-09-06 (0 folders con status null). El mismo bug en scbaCredentialsController.js (executeScbaKeepMode) se corrigió el 2026-09-06 con los mismos campos.",
		where: "law-analytics-server pjnCredentialsController.js · scbaCredentialsController.js (executeKeepMode)",
	},
	{
		id: "F7",
		severity: "media",
		title: "[RESUELTO 2026-09-06, F7] Status 'success' hardcodeado con causa inválida o no verificada",
		detail:
			"Era: alta por BD local/caché y sync de Mis Causas hardcodeaban assoc='success' sin mirar verified/isValid. Fix: helper pjnAssociationStatusFromCausa() en el hub (verified ? (isValid===false ? 'failed' : 'success') : 'pending') aplicado en createFolder/link; en pjn-mis-causas los folders nuevos y relinkeados derivan causaVerified/causaAssociationStatus de la causa real.",
		where: "law-analytics-server folderController.js (pjnAssociationStatusFromCausa) · pjn-mis-causas causa-sync-service.js",
	},
	{
		id: "F8",
		severity: "media",
		title: "[RESUELTO 2026-09-06, F8] Handoff a privada deja el folder congelado en pendiente",
		detail:
			"Era: al rechazar el portal público una causa con credencial vinculada, verify-worker marcaba la causa privada pero no tocaba los folders. Fix: el handoff hace updateMany sobre los folders source≠pjn-login (causaVerified:true, causaIsPrivate:true, causaPrivateDetectedAt, status 'success'). La cobertura (causaCredentialCovered) la fija reconcileFolderCoverage de pjn-mis-causas al inicio de cada corrida privada — ventana transitoria en la que el no cubierto ve el chip “reservada” sin el 403.",
		where: "pjn-workers verify-worker.js (bloque handoff) · pjn-mis-causas scripts/reconcile-has-active-credential.js",
	},
	{
		id: "F9",
		severity: "media",
		title: "[CERRADO 2026-09-06, F9] Sin estado intermedio cuando la causa deja de ser accesible",
		detail:
			"Resuelto el ping-pong público↔privado: el paso 2 del privacy-checker (resetToPublic) ya no vuelve la causa a pública ni manda el email “restored” por accessFailureCount bajo (el pool del app-update-worker excluye isPrivate:true, así que ese conteo no era evidencia); ahora solo limpia causaIsPrivate/causaPrivateDetectedAt/causaCredentialCovered de los folders cuando la causa YA es pública. Decisión de producto (2026-09-06): NO mostrar estado intermedio entre el primer fallo y el umbral del checker (cron 3AM/3PM) — el PJN falla de forma transitoria con frecuencia y un chip que aparece y desaparece genera más consultas que valor; el usuario se entera cuando hay evidencia real.",
		where: "pjn-workers pjn-privacy-checker-worker.js (resetToPublic) · app-update-worker.js:241/325 (pool excluye privadas)",
	},
	{
		id: "F10",
		severity: "baja",
		title: "[RESUELTO 2026-09-06, F10] Mensajes distintos para el mismo estado",
		detail:
			"Era: failed+verified se veía “Asociación fallida” en la lista, “Causa inválida” en la fila expandida y gate failed en el detalle; reservada cubierta roja en la lista y verde en el detalle. Fix: util src/utils/pjnBindingState.ts (getPjnBindingState: revoked > reserved_covered > reserved > pending_selection > list_removed > failed > pending > ok) con labels y tooltips únicos, consumido por folders.tsx, FolderView.tsx y details.tsx. failed también contempla verified:true + isValid:false aunque el status no diga failed.",
		where: "law-analytics-front src/utils/pjnBindingState.ts · folders.tsx · FolderView.tsx · details.tsx",
	},
	{
		id: "F11",
		severity: "baja",
		title: "[RESUELTO 2026-09-06, F11] scrapingProgress y metadata son globales por causa, no por usuario",
		detail:
			"Era: updateFoldersScrapingProgress hacía updateMany({causaId}) sobre todos los folders de la causa. Fix: acepta un scope y el worker privado escribe el progreso solo en los folders source:'pjn-login' del userId dueño de la credencial que sincroniza. updateAssociatedFolders/overwrite de metadata sigue global (decisión pendiente).",
		where: "pjn-mis-causas private-causas-update-worker.js (updateFoldersScrapingProgress + setFoldersProgress)",
	},
	{
		id: "F12",
		severity: "baja",
		title: "[RESUELTO 2026-09-06, F12] Re-link tras keep no limpia previousSyncSource y fuerza overwrite",
		detail:
			"Era: el folder volvía a pjn-login con previousSyncSource='pjn' residual y overwrite=true pisaba el nombre puesto durante el keep. Fix: el re-link limpia previousSyncSource (set strict:false, el schema local no lo declara), causaAssociationError y listRemoved*, y solo defaultea overwrite=true si estaba vacío. Pendiente: migración one-shot de los folders pjn-login con previousSyncSource='pjn' residual (requiere consentimiento).",
		where: "pjn-mis-causas causa-sync-service.js (bloque re-link)",
	},
	{
		id: "F13",
		severity: "media",
		title: "[RESUELTO 2026-09-06, F13] El detalle perdía el estado in-flight del reintento y siempre ofrecía 2 reintentos",
		detail:
			"Era: GET /api/folders/:id tenía un select() explícito sin verificationAttempts ni lastReverifyRequestedAt. Tras 'Verificar ahora' el primer poll (10 s) traía el folder sin esos campos → inFlight=false, el auto-refresh se apagaba y el detalle quedaba en 'Pendiente' aunque el worker ya hubiera fallado; attempts volvía a 0 y el CTA decía 'Tenés 2 reintentos' hasta que el hub respondía 409 REVERIFY_LIMIT_REACHED. Fix: el select incluye ambos campos. Verificado end-to-end el 2026-09-06 con carpeta de test 999999/2026 (CIV): reintento 1 → worker re-toma en <2 min y falla; con el fix, 'Reintento 1/2 · queda 1 intento' → reintento 2 → polling vivo hasta 'Reintentos agotados (2/2)' sin intervención.",
		where: "law-analytics-server folderController.js (getFoldersById .select) · front PendingVerificationView.tsx (inFlight/attempts)",
	},
	{
		id: "F14",
		severity: "baja",
		title:
			"[RESUELTO 2026-09-06, F14] Credencial PJN rechazada: la lista avisaba, la fila expandida y el detalle decían 'Vinculado con PJN'",
		detail:
			"Era: solo folders.tsx consultaba usePjnCredentialError (punto ámbar + tooltip 'PJN — Sincronización pausada'); FolderView.tsx y details.tsx usaban getPjnBindingState sin esa señal y mostraban el pill verde 'Vinculado con PJN'. Para SCBA las tres vistas ya leían useScbaCredentialError y para MEV el estado viaja en el folder (mevCredentialStatus). Fix: getPjnBindingState(folder, { credError }) devuelve el nuevo estado cred_error (solo source pjn-login, después de todos los estados propios de la carpeta, antes de ok) con label 'PJN — Sincronización pausada', copy único y pill ámbar que lleva a Perfil → Cuentas Judiciales; la lista usa el mismo copy. No bloquea el detalle: la causa pública sigue actualizándose por scraping, lo pausado es la sync de Mis Causas. Verificado con juancamino713 (cred error CREDENTIAL_INVALID desde 2026-06-20, 5 carpetas pjn-login).",
		where: "law-analytics-front src/utils/pjnBindingState.ts · folders.tsx · FolderView.tsx · details.tsx · hooks/usePjnCredentialError.ts",
	},
	{
		id: "F15",
		severity: "media",
		title:
			"[RESUELTO 2026-09-08] El hub ocultaba credentialInvalid y los contadores de rechazo del worker; el front mostraba el error crudo",
		detail:
			"pjn-mis-causas escribe credentialInvalid/credentialInvalidAt/explicitRejections/firstExplicitRejectionAt pero models/PjnCredentials.js no los declaraba: strict los descartaba, credentialInvalid llegaba undefined y FoldersSyncBadges nunca mostraba 'Requiere atención'. Además usePjnCredentialError, pollSyncStatus, pjnSyncError y el snackbar imprimían lastError.message tal cual lo escribe el worker ('Login falló - …'). Ahora el hub deriva statusReason (credential_invalid | required_action | rejection_pending | unlinked | portal_maintenance | portal_unstable | sync_error | syncing | never_synced | ok) y rejectionProgress en services/pjnCredentialStatusService.js, y el front traduce todo con pjnStatusNotice() (utils/pjnBindingState.ts): card, hook, snackbar y tooltips de lista/fila/detalle (el ícono ámbar de la lista ahora lleva a Integraciones → PJN). PJN_BINDING_COPY.cred_error decía 'Perfil → Cuentas Judiciales'.",
		where:
			"law-analytics-server models/PjnCredentials.js · services/pjnCredentialStatusService.js · pjnCredentialsController.js (0b9d3e8) · front utils/pjnBindingState.ts · hooks/usePjnCredentialError.ts · PjnAccountConnect.tsx · ResourceUsageWidget.tsx · folders.tsx / FolderView.tsx / details.tsx (04791d05)",
	},
	{
		id: "F16",
		severity: "media",
		title: "[RESUELTO 2026-09-08] Desvincular con 'conservar carpetas' dejaba al usuario como destinatario de las causas compartidas",
		detail:
			"executeKeepMode convertía las carpetas a manuales pero no tocaba la causa: el usuario seguía en userCausaIds / userUpdatesEnabled / linkedCredentials y sus carpetas en folderIds. El worker privado arma los destinatarios con userUpdatesEnabled (fallback userCausaIds) y la-notification no verifica carpeta → seguía recibiendo los movimientos de las causas compartidas con otro usuario activo (delete también dejaba userCausaIds/userUpdatesEnabled). Ahora keep y delete llaman a pruneUserFromCausas: $pull de folderIds y linkedCredentials y, si el usuario no conserva otra carpeta sobre la causa (p. ej. una 'auto' del flujo público), de userCausaIds y su entrada de userUpdatesEnabled. Al re-vincular, ensureFolder de pjn-mis-causas vuelve a agregar folderIds + userCausaIds (antes no re-agregaba ni folderIds). También se quitó el código muerto de teamContext en estas rutas (ningún middleware lo setea; el guard de propietario sigue).",
		where:
			"law-analytics-server pjnCredentialsController.js pruneUserFromCausas (830a669, 0e46baa; test tests/pjn-credentials/keep-mode.test.js) · pjn-mis-causas causa-sync-service.js ensureFolder (fc91771)",
	},
	{
		id: "F17",
		severity: "alta",
		title: "[RESUELTO 2026-09-08] Las causas nacidas del sync de Mis Causas no notificaban movimientos a nadie",
		detail:
			"El sync por credencial creaba la causa con folderIds y linkedCredentials pero nunca agregaba al usuario a userCausaIds (sólo lo hacían el alta solo-listado y el flujo público del hub). Como esas causas quedan update:false + hasActiveCredential:true, el único que las actualiza es private-causas-update-worker, y al notificar encontraba userUpdatesEnabled y userCausaIds vacíos: 'No hay usuarios con notificaciones habilitadas' en ~50 % de los lotes con movimientos nuevos (362 vs 379 notificados desde el 04/09; siempre justo después de 'Folders actualizados para causa …'). En prod el 99 % de las carpetas de Mis Causas (938 de 944, 12 usuarios) no tenía destinatario. Fix: ensureFolder hace $addToSet userCausaIds al crear y al re-vincular; backfill scripts/backfill-user-causa-ids.js aplicado (938 causas). Verificado el mismo día: 141 causas procesadas, 2 con movimientos nuevos, 2 notificadas, 0 sin destinatario. Regla de producto: se notifica igual sin plan y con la carpeta archivada (no hay filtro por plan; notifyArchivedFolders por defecto true).",
		where:
			"pjn-mis-causas causa-sync-service.js ensureFolder + scripts/backfill-user-causa-ids.js (609d2e8) · utils/notification-sync.js getEnabledUsers (sin cambios)",
	},
	{
		id: "F18",
		severity: "baja",
		title: "[RESUELTO 2026-09-08] Contexto del último archivado de una carpeta (todas las jurisdicciones)",
		detail:
			"Archivar a mano (archiveItems) sólo escribía archived:true; el downgrade de la-subscriptions escribía un motivo en texto libre con un modelo que no declaraba el campo (se perdía); pjn-mis-causas ponía archivedBy = dueño en las creadas por tope del plan (no era una acción del usuario). Ahora Folder.archivedReason ∈ user (con archivedBy = quién y archivedAt) | plan_limit (creada archivada por tope: scba-workers y pjn-mis-causas) | plan_downgrade (automático al bajar de plan: hub y la-subscriptions); desarchivar limpia los tres y marca unarchivedAt. El modal Archivados muestra 'Por vos · fecha / Límite del plan / Cambio de plan'. Backfill SCBA: 841 carpetas de 4 usuarios → plan_limit.",
		where:
			"law-analytics-server models/Folder.js · services/subscriptionService.js · controllers/subscriptionController.js · folderController.js (541ed31, 6089a18) · la-subscriptions models/Folder.js + subscriptionService.js (8e10e6f) · pjn-mis-causas causa-sync-service.js (11797da) · scba-workers folder-service.ts (d12bc8d) + scripts/backfill-archived-reason.js · front ArchivedItemsModal.tsx (10d42c31)",
	},
];

// =====================================================================
// MEV — Mesa de Entradas Virtual (Buenos Aires). Sin flujo "Mis Causas":
// todo folder MEV nace del hub (createFolder / linkFolderToCausa) con
// source=auto y exige la credencial de cuenta del usuario (MevCredentials
// causaId=null). El estado de esa credencial se replica por carpeta en
// mevCredentialStatus (pending → valid | expired | disabled | missing) y lo
// escribe el worker al loguear. Relevado 2026-09-05 contra hub, mev-workers,
// mev-api y el front (folders.tsx / FolderView.tsx / details.tsx).
// =====================================================================

const mevBase: F = { source: "auto", pjn: false, mev: true, mevCredentialStatus: "valid" };

const mevView = (list: UserViewList, badge: string | null, gate: UserViewGate, extra: V = {}): V => ({
	list,
	expanded: { label: "Vinculado con MEV", accent: "green", badge },
	detail: { chip: { label: "Vinculado con MEV", accent: "green", badge }, gate },
	inAttentionTable: gate !== null && gate !== "archived",
	...extra,
});

// M2 (resuelto 2026-09-05): pill/chip ámbar "MEV — <problema>" con link al perfil, sin badge de verificación.
const mevCredView = (label: string, gate: UserViewGate, extra: V = {}): V => ({
	list: "cred_status",
	expanded: { label: `MEV — ${label}`, accent: "amber", badge: "cred_status" },
	detail: { chip: { label: `MEV — ${label}`, accent: "amber", badge: "cred_status" }, gate },
	inAttentionTable: false,
	...extra,
});

const mevUnlinkedView = (): V => ({
	list: "unlinked",
	expanded: { label: "Desvinculada — volver a vincular", accent: "amber", badge: "unlinked" },
	detail: { chip: { label: "Desvinculada — volver a vincular", accent: "amber", badge: "unlinked" }, gate: null },
	inAttentionTable: false,
});

export const MEV_GROUPS: GuideGroup[] = [
	{
		row: "ok",
		title: "OK — carátula + tilde azul",
		whatUserSees:
			"Carátula + tilde azul (tooltip “Causa vinculada a MEV”). Fila expandida y detalle: pill verde “Vinculado con MEV” con badge según causaIsValid (valid / invalid / nada si es null). Tabla principal.",
		cases: [
			{
				key: "mev.ok.valid",
				title: "Verificada con credencial válida (estado feliz)",
				producer:
					"mev-workers utils/folder-updater.js:99 updateAssociatedFolders(isValid=true) → causaVerified/causaIsValid/assoc='success' + services/user-credential-notifier.js:179 mevCredentialStatus='valid'",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=valid",
				entry: entry({ ...mevBase }, mevView("ok", "valid", null)),
			},
			{
				key: "mev.ok.pending_cred",
				title: "Verificada pero mevCredentialStatus sigue en 'pending'",
				producer:
					"folder-updater.js:99 corrió y el notifier no (dedup: la credencial ya fue notificada 'valid' por otra causa, user-credential-notifier.js:190) — o link/asociación a una causa ya verificada (hub folderController.js:4380-4400: copia verified/isValid de la causa y escribe mevCred='pending')",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=pending",
				entry: entry({ ...mevBase, mevCredentialStatus: "pending" }, mevView("ok", "valid", null)),
				warn: "Transitorio normal: la lista ignora 'pending' y muestra OK. Queda así hasta que el update cluster loguee con la credencial del usuario y el notifier lo confirme.",
			},
			{
				key: "mev.ok.disabled_toggle",
				title: "Credencial deshabilitada por el usuario (toggle)",
				producer: "hub mevCredentialsController.js:546 toggleCredentials: solo MevCredentials.enabled — NO escribe folders",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=valid",
				entry: entry({ ...mevBase }, mevView("ok", "valid", null)),
				warn: "Ningún indicador en la lista: el usuario apagó el seguimiento y la carpeta se ve sincronizada.",
			},
			{
				key: "mev.ok.archived_manual",
				title: "Archivada por el usuario y desarchivada (sin cambios de vínculo)",
				producer:
					"hub subscriptionService.js archiveFoldersByIds / unarchiveFoldersByIds (política 2026-09-05): archivar NO desvincula ni pausa la causa; al desarchivar vuelve tal cual",
				fields: "source=auto · archived=false · verified=true · isValid=true · assoc=success",
				entry: entry({ ...mevBase }, mevView("ok", "valid", null)),
			},
		],
	},
	{
		row: "cred_status",
		title: "Credencial MEV requerida / expirada / desactivada — chip ámbar",
		whatUserSees:
			"En la lista, debajo de la carátula, el chip ámbar clickeable (“Credencial requerida” / “Credencial inválida” / “Contraseña expirada” / “Credencial desactivada”) lleva a Perfil → Integraciones → MEV (desde 2026-09-05 ya no reemplaza la carátula, M11). Desde 2026-09-05 (M1/M2) gana sobre “Asociación fallida” cuando el login falló (invalid/expired/disabled), la fila expandida y el detalle muestran la pill ámbar “MEV — <problema>” con link al perfil, y el detalle no se bloquea con “Causa inválida”: la carpeta queda en la tabla principal con los datos ya sincronizados. Con 'missing' el orden anterior se mantiene (failed gana: el diagnóstico es previo a quitar la credencial).",
		cases: [
			{
				key: "mev.cred.missing",
				title: "Sin credencial (missing) con la causa ya verificada",
				producer:
					"mev-workers services/user-credential-notifier.js:251 markCredentialMissing (resolveCredentials → 'none'; solo desde null|valid|pending) o hub mevCredentialsController.js:435 deleteCredentials (desde cualquier estado). El worker además bumpea lastCheckedDate (back-off) y la causa se saltea hasta update_frequency_hours.",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=missing",
				entry: entry({ ...mevBase, mevCredentialStatus: "missing" }, mevCredView("Credencial requerida", null)),
			},
			{
				key: "mev.cred.missing_pending",
				title: "Sin credencial (missing) y nunca verificada",
				producer:
					"Igual que arriba pero sobre un alta que el verify cluster salteó por falta de credencial (update-worker.js:290-350 / verify equivalente)",
				fields: "source=auto · verified=false · isValid=null · assoc=pending · mevCred=missing",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", mevCredentialStatus: "missing" },
					mevCredView("Credencial requerida", "pending", { inAttentionTable: true }),
				),
				warn: "Es el caso más frecuente en producción (deleteCredentials pisa 'expired'/'disabled' con 'missing' y se pierde el diagnóstico).",
			},
			{
				key: "mev.cred.expired",
				title: "Contraseña expirada",
				producer:
					"mev-workers user-credential-notifier.js:169-182 notifyCredentialResult (isExpired) → mevCredentialStatus='expired' + causaVerified=true, causaIsValid=false (sin tocar assoc, a propósito)",
				fields: "source=auto · verified=true · isValid=false · assoc=success|pending · mevCred=expired",
				entry: entry(
					{ ...mevBase, causaVerified: true, causaIsValid: false, mevCredentialStatus: "expired" },
					mevCredView("Contraseña expirada", null),
				),
			},
			{
				key: "mev.cred.disabled",
				title: "Credencial auto-desactivada por fallos repetidos",
				producer:
					"mev-workers verify-worker.js:1172 / update-worker.js:594: failResult.disabled tras 5 fallos → notifyCredentialResult → mevCredentialStatus='disabled' + verified=true, isValid=false",
				fields: "source=auto · verified=true · isValid=false · mevCred=disabled",
				entry: entry(
					{ ...mevBase, causaVerified: true, causaIsValid: false, mevCredentialStatus: "disabled" },
					mevCredView("Credencial desactivada", null),
				),
			},
			{
				key: "mev.cred.invalid",
				title: "Credencial inválida (prácticamente inalcanzable)",
				producer:
					"user-credential-notifier.js:159 newStatus='invalid' solo si !success && !isExpired && !disabled, pero el debounce (verify-worker.js:1169: definitive = isExpiration || disabled) nunca lo deja pasar",
				fields: "source=auto · verified=true · isValid=false · mevCred=invalid",
				entry: entry(
					{ ...mevBase, causaVerified: true, causaIsValid: false, mevCredentialStatus: "invalid" },
					mevCredView("Credencial inválida", null),
				),
				warn: "El front, el reset del hub y los emails contemplan 'invalid', pero un usuario con contraseña mal cargada ve 5 ciclos de “Pendiente” y salta directo a 'disabled'.",
			},
		],
	},
	{
		row: "pending",
		title: "Pendiente de verificación — chip ámbar",
		whatUserSees:
			"Chip ámbar “Pendiente de verificación” + refresh. Tabla de atención. Fila expandida: pill verde con badge reloj. Detalle: gate “Estamos buscando este expediente”.",
		cases: [
			{
				key: "mev.pending.new",
				title: "Alta nueva esperando al verify cluster",
				producer:
					"hub folderController.js:2230 (mev-api associate-folder, verified=false → assoc='pending') + :2286 mevCredentialStatus='pending'. createFolder exige MevCredentials enabled (:2054-2070) o borra la carpeta.",
				fields: "source=auto · verified=false · isValid=null · assoc=pending · mevCred=pending",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", mevCredentialStatus: "pending" },
					mevView("pending", "pending", "pending"),
				),
			},
			{
				key: "mev.pending.link",
				title: "Vinculada por número desde la carpeta (linkFolderToCausa) a una causa aún no verificada",
				producer:
					"hub folderController.js:4300-4405 rama MEV de link: exige MevCredentials enabled (400 si no hay), llama associate-folder, copia verified/isValid de la causa, mevCred='pending', previousSyncSource=null, mev=true",
				fields: "source=auto · verified=false · assoc=pending · mevCred=pending · previousSyncSource=null",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", mevCredentialStatus: "pending" },
					mevView("pending", "pending", "pending"),
				),
			},
			{
				key: "mev.pending.relink",
				title: "Re-vinculada tras desvincular (mismo flujo de link)",
				producer:
					"Desde el detalle de una carpeta desvinculada (“Desvinculada — volver a vincular”) → linkFolderToCausa. Si la causa estaba pausada (update=false) mev-api la reactiva; el update cluster la retoma en la ventana 8–20 ART.",
				fields: "source=auto · verified=(copiado de la causa) · assoc=pending|success · mevCred=pending · previousSyncSource=null",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", mevCredentialStatus: "pending" },
					mevView("pending", "pending", "pending"),
				),
			},
			{
				key: "mev.pending.reset",
				title: "Usuario recargó la credencial (reset)",
				producer:
					"hub mevCredentialsController.js:50-68 resetMevFolders: mevCred='pending' + causaVerified=false, assoc='pending', $unset causaIsValid (solo folders en invalid|expired|disabled|missing)",
				fields: "source=auto · verified=false · isValid=(ausente) · assoc=pending · mevCred=pending",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", mevCredentialStatus: "pending" },
					mevView("pending", "pending", "pending"),
				),
			},
			{
				key: "mev.pending.reverify",
				title: "Reverificación manual",
				producer:
					"hub folderController.js:5288 reverifyFolder: causaVerified=false, assoc='pending', +1 intento; NO toca mevCredentialStatus",
				fields: "source=auto · verified=false · assoc=pending · mevCred=(sin cambio)",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
					mevView("pending", "pending", "pending"),
				),
			},
		],
	},
	{
		row: "pending_selection",
		title: "Seleccionar expediente — chip ámbar clickeable",
		whatUserSees:
			"Chip “Seleccionar expediente” + warning en la lista; fila expandida pill ámbar “Seleccionar expediente”. Detalle: gate “Encontramos más de un expediente”. Gana sobre el chip de credencial.",
		cases: [
			{
				key: "mev.pending_selection",
				title: "Búsqueda MEV con varios resultados",
				producer:
					"hub causaService.js:641 storePendingCausasInFolder: pendingCausaIds, pendingCausaType='MEV', assoc='pending_selection' (no toca verified/isValid ni mevCredentialStatus)",
				fields: "source=auto · assoc=pending_selection · pendingCausaIds=[…] · mevCred=null",
				entry: entry(
					{
						...mevBase,
						causaVerified: false,
						causaIsValid: undefined,
						causaAssociationStatus: "pending_selection",
						mevCredentialStatus: null,
					},
					{
						list: "pending_selection",
						expanded: { label: "Seleccionar expediente", accent: "amber", badge: "pending_selection" },
						detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "pending" }, gate: "pending_selection" },
						inAttentionTable: true,
					},
				),
			},
		],
	},
	{
		row: "failed",
		title: "Asociación fallida — chip rojo",
		whatUserSees:
			"Chip rojo “Asociación fallida” (tooltip “Verifique los datos ingresados”) en la lista. Gana sobre el chip de credencial solo con mevCred=missing; con invalid/expired/disabled gana la credencial (M1, 2026-09-05). Fila expandida y detalle: pill verde “Vinculado con MEV” (no leen 'failed'). Detalle: gate fallida.",
		cases: [
			{
				key: "mev.failed.notfound",
				title: "El portal no arrojó resultados",
				producer:
					"mev-workers verify-worker.js:942 (“La consulta No arroja resultados”) → expediente verified=true,isValid=false → folder-updater.js:45 assoc='failed', folderName='Causa inválida o no accesible'",
				fields: "source=auto · verified=true · isValid=false · assoc=failed · mevCred=valid|pending",
				entry: entry(
					{
						...mevBase,
						folderName: "Causa inválida o no accesible",
						causaVerified: true,
						causaIsValid: false,
						causaAssociationStatus: "failed",
					},
					mevView("failed", "invalid", "failed"),
				),
			},
			{
				key: "mev.failed.techerror",
				title: "Error técnico del scraping (colapsa al mismo estado)",
				producer:
					"verify-worker.js:947-961: isError=true sin tocar isValid → updateAssociatedFolders(exp, isValid||false) → assoc='failed'",
				fields: "source=auto · verified=true · isValid=false · assoc=failed",
				entry: entry(
					{ ...mevBase, causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" },
					mevView("failed", "invalid", "failed"),
				),
				warn: "Indistinguible de “no existe el expediente”; el usuario lee “Verifique los datos ingresados”.",
			},
			{
				key: "mev.failed.api_down",
				title: "mev-api caído en el alta",
				producer: "hub folderController.js:2395: assoc='failed', causaAssociationError, sin causaId; mevCredentialStatus='pending' (:2400)",
				fields: "source=auto · causaId=null · assoc=failed · mevCred=pending",
				entry: entry(
					{
						...mevBase,
						causaVerified: false,
						causaIsValid: undefined,
						causaAssociationStatus: "failed",
						causaId: null,
						mevCredentialStatus: "pending",
					},
					mevView("failed", "pending", "failed"),
				),
				warn: "El reintento del usuario pone 'pending' y espera un worker que nunca la tomará (no hay causaId).",
			},
			{
				key: "mev.failed.cred_masked",
				title: "Fallida + credencial expirada/desactivada (resuelto: gana la credencial)",
				producer: "folder-updater.js:45 escribe 'failed' aunque el notifier lo evita a propósito (user-credential-notifier.js:167)",
				fields: "source=auto · assoc=failed · mevCred=expired|disabled",
				entry: entry(
					{ ...mevBase, causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed", mevCredentialStatus: "expired" },
					mevCredView("Contraseña expirada", null),
				),
				warn: "Desde 2026-09-05 la lista muestra “Contraseña expirada” (no “Asociación fallida”), el detalle abre sin gate y la carpeta está en la tabla principal. El 'failed' sigue escrito en la carpeta: se limpia solo al re-verificar con credencial válida.",
			},
		],
	},
	{
		row: "invalid",
		title: "Causa inválida — chip rojo",
		whatUserSees:
			"Chip rojo “Causa inválida” en la lista (verified=true + isValid=false sin 'failed' ni problema de credencial). Fila expandida: badge rojo. Detalle: gate “Causa inválida”. Tabla de atención.",
		cases: [
			{
				key: "mev.invalid.link_to_invalid",
				title: "Vinculada por número a una causa ya verificada como inválida",
				producer:
					"hub folderController.js:4380-4410 rama MEV de link: la causa existente tiene verified=true,isValid=false → assoc='success' (no 'failed'), folderName=INVALID_FOLDER_NAME, mevCred='pending'",
				fields:
					"source=auto · verified=true · isValid=false · assoc=success · mevCred=pending · folderName='Causa inválida o no accesible'",
				entry: entry(
					{
						...mevBase,
						folderName: "Causa inválida o no accesible",
						causaVerified: true,
						causaIsValid: false,
						mevCredentialStatus: "pending",
					},
					mevView("invalid", "invalid", "invalid"),
				),
				warn: "Único productor de esta fila con credencial sana: el worker siempre acopla isValid=false ⇒ 'failed' (folder-updater.js:45).",
			},
		],
	},
	{
		row: "unlinked",
		title: "Desvinculada — warning ámbar",
		whatUserSees:
			"Carátula + warning ámbar (tooltip “Desvinculada de MEV — conserva todos sus datos pero ya no se sincroniza. Hacé clic para volver a vincularla desde la carpeta.”), clic → detalle. Fila expandida y detalle: pill ámbar “Desvinculada — volver a vincular” (clic abre el modal de vinculación por número). Sin gate: el detalle abre completo. Tabla principal.",
		cases: [
			{
				key: "mev.unlinked",
				title: "Desvinculada por el usuario desde el detalle",
				producer:
					"hub folderController.js:5804 unlinkFolderFromCausa + services/folderUnlinkService.js:137 camposDeDesvinculacion: source='manual', assoc='unlinked', causaVerified=false, previousSyncSource='mev', mev=false; $unset causaId/causaType/causaIsValid/listRemoved*/mevCredential*/navigationCode. mev-api desasocia (folderIds/userCausaIds/userUpdatesEnabled) y pausa la causa si queda sin carpetas.",
				fields:
					"source=manual · mev=false · previousSyncSource=mev · assoc=unlinked · verified=false · causaId=(ausente) · mevCred=(ausente)",
				entry: entry(
					{
						...mevBase,
						mev: false,
						source: "manual",
						previousSyncSource: "mev",
						causaId: null,
						causaVerified: false,
						causaIsValid: undefined,
						causaAssociationStatus: "unlinked",
						mevCredentialStatus: null,
					},
					mevUnlinkedView(),
				),
				warn: "Hasta la build 20260905.182721 del front esta rama era código muerto en la lista (estaba después del early-return sin flags): el usuario veía la carpeta como manual, sin aviso.",
			},
		],
	},
	{
		row: "list_removed",
		title: "Ya no en la lista — sin productor en MEV",
		whatUserSees:
			"El front contempla source='mev-login' + listRemoved + listRemovedSource='mev' (folders.tsx / details.tsx:491 “MEV — Ya no en la lista”), pero MEV no tiene flujo Mis Causas: ningún worker ni endpoint escribe esos valores.",
		cases: [],
	},
	{
		row: "hidden_archived",
		title: "No aparece — archivada",
		whatUserSees:
			"No está en la lista principal (solo en “Archivadas”). Detalle: gate archivada gana sobre cualquier otro. La causa sigue vinculada y actualizándose.",
		cases: [
			{
				key: "mev.archived.user",
				title: "Archivada por el usuario",
				producer:
					"hub subscriptionService.js:2708 archiveFoldersByIds — política 2026-09-05: NO desvincula ni pausa; la carpeta sigue en causa.folderIds y se actualiza para estar al día al desarchivar",
				fields: "source=auto · archived=true · resto sin cambios",
				entry: entry({ ...mevBase, archived: true }, mevView("ok", "valid", "archived", { hiddenFromList: true })),
			},
			{
				key: "mev.archived.downgrade",
				title: "Archivada por baja de plan",
				producer:
					"hub subscriptionService.js archiveFolders (las más viejas por updatedAt) — mismo efecto: no desasocia, el worker sigue escribiendo el folder",
				fields: "source=auto · archived=true",
				entry: entry({ ...mevBase, archived: true }, mevView("ok", "valid", "archived", { hiddenFromList: true })),
				warn: "La mayoría de las carpetas MEV están archivadas; el scraping sigue consumiendo la credencial del usuario sobre carpetas que no ve (decisión explícita: al desarchivar debe estar al día).",
			},
		],
	},
];

export const MEV_FINDINGS: GuideFinding[] = [
	{
		id: "M1",
		severity: "baja",
		title: "[RESUELTO 2026-09-05] “Asociación fallida” tapaba el estado de credencial",
		detail:
			"folder-updater.js acopla isValid=false ⇒ assoc='failed'. Ahora la lista (folders.tsx) salta la rama 'failed' cuando mevCredentialStatus ∈ invalid/expired/disabled (helper utils/mevCredential.ts isMevCredLoginFailure) y muestra el chip ámbar de credencial; esas carpetas van a la tabla principal, no cuentan como inválidas y conservan sus acciones. Con 'missing' sigue ganando 'failed' (diagnóstico previo a quitar la credencial). Espejo en admin-api computeListRowAny.",
		where:
			"law-analytics-front utils/mevCredential.ts · folders.tsx (rama failed + filtros de tablas + isErrorFolder) · admin-api pjnCredentialsController.js computeListRowAny",
	},
	{
		id: "M2",
		severity: "baja",
		title: "[RESUELTO 2026-09-05] “Causa inválida” en fila expandida y detalle cuando el problema era la credencial",
		detail:
			"notifyCredentialResult sigue escribiendo causaVerified=true,causaIsValid=false ante fallo de login, pero FolderView y details ahora leen mevCredentialStatus: pill/chip ámbar “MEV — Contraseña expirada / Credencial desactivada / Credencial inválida / Credencial requerida” (Warning2, click → Perfil → MEV, sin badge de verificación), y el gate del detalle no bloquea con 'failed'/'invalid' cuando el login falló (queda 'pending' solo si nunca se verificó). Espejo en admin-api computeUserView.",
		where:
			"law-analytics-front FolderView.tsx (rama mev) · details.tsx (renderJudicialLink + verificationGate) · admin-api computeUserView",
	},
	{
		id: "M3",
		severity: "media",
		title: "[RESUELTO 2026-09-06] mevCredentialStatus='invalid' inalcanzable",
		detail:
			"Era: el debounce solo dejaba pasar expiración o disabled; contraseña mal cargada → ~7 h de “Pendiente” (back-off 30 min→6 h) hasta el auto-disable. Fix: reportCredentialFailure devuelve likelyInvalid (credencial nunca verificada + ≥2 rechazos explícitos con ≥5 min de racha) y los workers lo tratan como fallo definitivo → 'invalid' + email, sin deshabilitar ni martillar el portal. El hub además sondea el login antes de guardar (rechazo = no se guarda) y limpia firstExplicitRejectionAt al re-guardar.",
		where:
			"mev-workers credentials-resolver.js (reportCredentialFailure) · verify-worker.js · update-worker.js · hub mevCredentialsController.js (saveCredentials)",
	},
	{
		id: "M4",
		severity: "baja",
		title: "[RESUELTO 2026-09-05] linkFolderToCausa MEV no exigía credencial",
		detail:
			"La rama MEV de link ahora rechaza con 400 si el usuario no tiene MevCredentials enabled y escribe mevCredentialStatus='pending' + previousSyncSource=null (misma política que createFolder). Ya no quedan altas con mevCred=null por esta vía.",
		where: "law-analytics-server folderController.js:4300-4405",
	},
	{
		id: "M5",
		severity: "media",
		title: "[RESUELTO 2026-09-06] mev-api caído = “verifique los datos” sin salida",
		detail:
			"Era: assoc='failed' sin causaId y el reverify no tenía nada que reverificar. Fix: services/mevAssociateService.js — POST a mev-api con timeout 15 s y, ante error de disponibilidad (sin respuesta o 5xx), fallback local que escribe causas-mev con la misma forma que associateFolder (causa nueva verified:false o $addToSet de la carpeta); la carpeta queda 'pending' con causaId y el verify-worker la toma. Un 4xx de mev-api (incluido el 409 recuperable) se propaga igual. El reverify sin causaId ya devolvía 400 SIN_CAUSA_QUE_VERIFICAR sin consumir intentos.",
		where: "law-analytics-server services/mevAssociateService.js · folderController.js (createFolder / linkFolderToCausa rama MEV)",
	},
	{
		id: "M6",
		severity: "media",
		title: "[RESUELTO 2026-09-06] deleteCredentials pisa 'expired'/'disabled' con 'missing'",
		detail:
			"El updateMany ahora solo pisa mevCredentialStatus null/pending/valid (mismo criterio que markCredentialMissing en mev-workers); invalid/expired/disabled conservan su diagnóstico. El conteo del email sigue contando todas las carpetas no cubiertas.",
		where: "law-analytics-server mevCredentialsController.js (deleteCredentials)",
	},
	{
		id: "M7",
		severity: "baja",
		title: "[ACEPTADO 2026-09-06] Rama “Ya no en la lista” MEV es código muerto",
		detail:
			"source='mev-login' y listRemovedSource='mev' están en el enum y en el front pero ningún productor los escribe (no existe Mis Causas MEV). previousSyncSource='mev' SÍ se escribe desde 2026-09-05 (unlink). Decisión: se deja como está — quitar los valores del enum y del front no aporta nada al usuario y rompería la simetría con PJN si algún día hay un listado MEV autenticado. No hay que documentar ese estado en los flujos MEV.",
		where: "Folder.js:323,337 · folders.tsx:3142 · details.tsx:491",
	},
	{
		id: "M8",
		severity: "baja",
		title: "Archivar no pausa el scraping (decisión explícita 2026-09-05)",
		detail:
			"archiveFoldersByIds / archiveFolders ya no intentan desasociar: la causa sigue actualizándose para que la carpeta esté al día al desarchivar. Costo: credencial del usuario gastada en carpetas que no ve. Solo unlink o borrar la carpeta cortan el vínculo.",
		where: "law-analytics-server subscriptionService.js:2708 · :3560",
	},
	{
		id: "M9",
		severity: "baja",
		title: "[RESUELTO 2026-09-06] Cancelar selección deja mevCredentialStatus residual",
		detail:
			"clearPendingCausasFromFolder ahora hace $unset de mevCredentialStatus/mevCredentialId/mevCredentialError/mevCredentialCheckedAt al devolver la carpeta a manual.",
		where: "law-analytics-server causaService.js (clearPendingCausasFromFolder)",
	},
	{
		id: "M10",
		severity: "media",
		title: "[RESUELTO 2026-09-05] La lista nunca mostraba “Desvinculada”",
		detail:
			"El bloque isUnlinked de folders.tsx estaba después del early-return `if (!showStatusIndicators) return name` y unlink apaga todos los flags: la rama era inalcanzable. Se movió antes del early-return; la carpeta desvinculada muestra warning ámbar con tooltip y clic al detalle.",
		where: "law-analytics-front folders.tsx:2858",
	},
	{
		id: "M11",
		severity: "baja",
		title: "[RESUELTO 2026-09-05] El chip de credencial reemplazaba la carátula en la lista",
		detail:
			"La celda Carátula ahora muestra el nombre de la carpeta (o “Buscaste …” si el nombre es el placeholder “Causa inválida o no accesible”) y debajo el chip ámbar clickeable, como la rama de asociación fallida.",
		where: "law-analytics-front folders.tsx (rama mevCredIssue) · utils/mevCredential.ts INVALID_FOLDER_NAME",
	},
	{
		id: "M12",
		severity: "baja",
		title: "[RESUELTO 2026-09-05] Detalle sin aviso para 'missing' con causa verificada",
		detail:
			"Una carpeta OK cuyo usuario borró la credencial queda con verified=true/isValid=true/mevCred='missing'. Sigue sin gate (a propósito: los datos ya sincronizados se ven), pero desde M2 el pill de la fila expandida y el chip del detalle son ámbar “MEV — Credencial requerida” con link al perfil, en vez del verde “Vinculado con MEV”.",
		where: "mev-workers update-worker.js:290-350 · details.tsx:814",
	},
	{
		id: "M13",
		severity: "media",
		title: "[RESUELTO 2026-09-05] Actividad decía “pendiente de primera sincronización” con la causa ya sincronizada",
		detail:
			"getMovementsByFolderId setea causaLastSyncDate por fuente (PJN/SCBA/EJE/IOL) pero la rama MEV no lo hacía → FolderSyncStatus mostraba “Expediente MEV … pendiente de primera sincronización” aunque causas-mev tuviera movimientos. Ahora resolveMevLastSyncDate lee causas-mev (verified + movimientos ⇒ lastUpdate; si no, null) y la línea dice “sincronizado hace …”.",
		where: "law-analytics-server movementController.js resolveMevLastSyncDate (hub d781101) · front FolderSyncStatus.tsx",
	},
	{
		id: "M14",
		severity: "baja",
		title: "[RESUELTO 2026-09-05] “Actualizar credencial” MEV no prellenaba el usuario",
		detail:
			"A diferencia de SCBA/PJN, el form de re-link MEV abría con usuario vacío y editable: el usuario podía cambiarlo y dejar la credencial con identificador incorrecto. getCredentialsStatus ahora expone username (descifrado) solo de la credencial de cuenta —la contraseña nunca viaja— y MevAccountConnect lo prellena bloqueado con helper text; la card muestra “Usuario … · con esta credencial consultamos …”.",
		where:
			"law-analytics-server mevCredentialsController.js getCredentialsStatus (hub f20b76f) · front api/mevCredentials.ts + MevAccountConnect.tsx (7b0cf09c)",
	},
	{
		id: "M15",
		severity: "baja",
		title:
			"[RESUELTO 2026-09-08] La card MEV mostraba el mensaje crudo del worker y pintaba 'Inválida' ante un error transitorio del portal",
		detail:
			"MevAccountConnect.tsx imprimía g.lastError.message ('Login falló - USUARIO O CLAVE INCORRECTA', 'Página de contraseña expirada detectada: …') y deriveStatus devolvía 'invalid' con cualquier lastError, incluido PORTAL_ERROR (transitorio, no penaliza la credencial). Ahora utils/mevCredential.ts tiene getMevStatusReason (disabled_by_failures | password_expired | credential_invalid | portal_unstable | pending | ok, derivado de enabled / isExpired / verified / lastError.code) y mevStatusNotice con copy propio; la card usa ambos y el copy de carpetas apunta a 'Integraciones → MEV' en vez de 'tu perfil'. Misma fuente única que SCBA (scbaStatusNotice) y PJN (pjnStatusNotice, F15).",
		where: "law-analytics-front utils/mevCredential.ts · sections/apps/profiles/account/MevAccountConnect.tsx (04791d05)",
	},
];

// =====================================================================
// EJE — Expediente Judicial Electrónico (CABA). Sin credencial, sin
// Mis Causas: verificación por búsqueda; los pivotes son el caso central.
// =====================================================================

const ejeBase: F = { source: "auto", pjn: false, eje: true };
const ejePill = (badge: string) => ({ label: "Vinculado con EJE", accent: "green" as const, badge });

export const EJE_GROUPS: GuideGroup[] = [
	{
		row: "ok",
		title: "OK — carátula + tilde azul",
		whatUserSees: "Carátula + tilde azul (“Causa vinculada a EJE”). Fila expandida: pill verde “Vinculado con EJE”.",
		cases: [
			{
				key: "eje.ok.single",
				title: "Búsqueda con 1 resultado (causa nueva)",
				producer:
					"eje-workers verification-worker.ts:222-234 updateFoldersOnSingleResult: causaId, assoc='success', verified=true, isValid=true, limpia pendingCausaIds/searchTerm",
				fields: "source=auto · verified=true · isValid=true · assoc=success",
				entry: entry({ ...ejeBase }, { expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: null } }),
			},
			{
				key: "eje.ok.dedupe",
				title: "1 resultado que ya existía (dedupe)",
				producer: "verification-worker.ts:470-492: mismo $set pero NO limpia pendingCausaIds/pendingCausaType/searchTerm ni setea eje:true",
				fields: "source=auto · verified=true · isValid=true · assoc=success · pendingCausaIds residuales",
				entry: entry({ ...ejeBase }, { expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: null } }),
				warn: "Resuelto E4 (2026-09-09, eje-workers 5d3bb04): el dedupe usa el mismo helper que el resultado nuevo — limpia pendingCausaIds/searchTerm y copia carátula, materia, jurisdicción, CUIJ y fecha. Antes la carpeta quedaba verde pero llamada “Pendiente de verificación: …” y sin datos.",
			},
			{
				key: "eje.ok.selected",
				title: "Usuario eligió una causa del pivote",
				producer:
					"hub causaService.js:886-905 selectPendingCausaForFolder: assoc='success', causaVerified=causa.verified||false, causaIsValid=causa.isValid!==false (optimista), causaUpdateEnabled=hasPaidSubscription; no limpia searchTerm",
				fields: "source=auto · verified=<causa> · isValid=true · assoc=success",
				entry: entry({ ...ejeBase }, { expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: null } }),
				warn: "Resuelto E6 (2026-09-09, hub d5cc640): el estado sigue al de la causa elegida — candidata sin verificar → pending / verified:false / isValid:null; verificada → success. Fila expandida (E5, front 6c0304db): la pill verde EJE sólo con verified+válida.",
			},
			{
				key: "eje.ok.admin_resolve",
				title: "Admin resolvió el pivote",
				producer: "eje-api causasEjeController.js:672-694 resolvePivot: para cada folder del pivote → causaId elegido, assoc='success'",
				fields: "source=auto · verified=true · isValid=true · assoc=success",
				entry: entry({ ...ejeBase }, { expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: null } }),
				warn: "Resuelto E3/E3a: el hub hace $pull de pivot.folderIds al seleccionar/cancelar y resolvePivot (eje-api ba65966) sólo re-apunta folders que siguen en pending_selection sobre ese pivote.",
			},
		],
	},
	{
		row: "pending",
		title: "Pendiente de verificación — chip ámbar",
		whatUserSees:
			"Chip ámbar “Pendiente de verificación”. Fila expandida: pill verde genérica “Vinculado con EJE” con badge InfoCircle ámbar (no hay pill de pendiente propia).",
		cases: [
			{
				key: "eje.pending.new",
				title: "Alta nueva (verified=false)",
				producer:
					"hub folderController.js:966-990 (eje-api associate-folder): assoc='pending' cuando result.verified=false; fallback local :1102 idem",
				fields: "source=auto · verified=false · isValid=null · assoc=pending",
				entry: entry(
					{ ...ejeBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" },
					pendingView({ expanded: ejePill("pending"), detail: { chip: ejePill("pending"), gate: "pending" } }),
				),
			},
			{
				key: "eje.pending.reverify_pivot",
				title: "Reverificación sobre un pivote (callejón sin salida)",
				producer:
					"hub folderController.js:5294 reverifyFolder acepta pending_selection → 'pending' y resetea la causa… que es el PIVOTE; verification-worker.ts:84 filtra isPivot:{$ne:true}",
				fields: "source=auto · verified=false · assoc=pending · pendingCausaIds residuales",
				entry: entry(
					{ ...ejeBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
					pendingView({ expanded: ejePill("pending"), detail: { chip: ejePill("pending"), gate: "pending" } }),
				),
				warn: "Resuelto E2: reverificar una carpeta en selección (o cuyo causaId es un pivote sin resolver, hub d5cc640) devuelve 400 “elegí uno o cancelá” sin consumir intentos.",
			},
			{
				key: "eje.pending.not_attempted",
				title: "Ventana entre Folder.create y la respuesta de eje-api",
				producer: "hub folderController.js:655 + :808 (pre-set eje:true) antes de :966; persiste si el proceso muere",
				fields: "source=auto · verified=false · assoc=not_attempted",
				entry: entry(
					{ ...ejeBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "not_attempted" },
					pendingView({ expanded: ejePill("pending"), detail: { chip: ejePill("pending"), gate: "pending" } }),
				),
			},
		],
	},
	{
		row: "pending_selection",
		title: "Seleccionar expediente — chip ámbar clickeable",
		whatUserSees:
			"Chip “Seleccionar expediente” + warning; fila expandida: callout “Acción requerida: seleccionar expediente”; detalle: gate “Encontramos más de un expediente”.",
		cases: [
			{
				key: "eje.pivot.worker",
				title: "Pivote real del worker (N resultados)",
				producer:
					"eje-workers verification-worker.ts:258-284 updateFoldersOnMultipleResults: causaId=PIVOTE, assoc='pending_selection', pendingCausaIds, causaVerified=true, causaIsValid=null; carátula del pivote “Búsqueda: … N (de M) resultados”",
				fields: "source=auto · verified=true · isValid=null · assoc=pending_selection · causaId=pivote",
				entry: entry(
					{ ...ejeBase, causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
					{
						list: "pending_selection",
						expanded: ejePill("pending"),
						detail: { chip: ejePill("pending"), gate: "pending_selection" },
						inAttentionTable: true,
					},
				),
			},
			{
				key: "eje.pivot.hub",
				title: "Pivote devuelto por eje-api en el alta",
				producer: "hub folderController.js:966-990 rama isPivot: pendingCausaIds, causaVerified=true, causaIsValid=null",
				fields: "source=auto · verified=true · isValid=null · assoc=pending_selection",
				entry: entry(
					{ ...ejeBase, causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
					{
						list: "pending_selection",
						expanded: ejePill("pending"),
						detail: { chip: ejePill("pending"), gate: "pending_selection" },
						inAttentionTable: true,
					},
				),
			},
			{
				key: "eje.pivot.store",
				title: "storePendingCausas manual (no toca verified)",
				producer: "hub causaService.js:641-663: solo pendingCausaIds + assoc='pending_selection'",
				fields: "source=auto · verified=false · assoc=pending_selection",
				entry: entry(
					{ ...ejeBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
					{
						list: "pending_selection",
						expanded: ejePill("pending"),
						detail: { chip: ejePill("pending"), gate: "pending_selection" },
						inAttentionTable: true,
					},
				),
			},
		],
	},
	{
		row: "failed",
		title: "Asociación fallida — chip rojo",
		whatUserSees: "Chip rojo “Asociación fallida”. Fila expandida: pill verde genérica con badge rojo (EJE no tiene pill de fallida).",
		cases: [
			{
				key: "eje.failed.zero",
				title: "Búsqueda con 0 resultados",
				producer:
					"eje-workers verification-worker.ts:108-125 updateFoldersOnNotFound: assoc='failed', causaVerified=true, causaIsValid=false",
				fields: "source=auto · verified=true · isValid=false · assoc=failed",
				entry: entry(
					{ ...ejeBase, causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" },
					failedView({ expanded: ejePill("invalid"), detail: { chip: ejePill("invalid"), gate: "failed" } }),
				),
			},
			{
				key: "eje.failed.api",
				title: "eje-api caído y fallback local fallido (sin causaId)",
				producer: "hub folderController.js:1134-1147 / :4348 / :4387: assoc='failed' + causaAssociationError, eje:true sin causaId",
				fields: "source=auto · causaId=null · assoc=failed",
				entry: entry(
					{ ...ejeBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "failed", causaId: null },
					failedView({ expanded: ejePill("pending"), detail: { chip: ejePill("pending"), gate: "failed" } }),
				),
				warn: "Reverificar devuelve 400 SIN_CAUSA_QUE_VERIFICAR con la instrucción de volver a vincular desde la carpeta (no consume intentos).",
			},
		],
	},
	{
		row: "pending_selection",
		title: "Link a un pivote — seleccionar expediente (antes INVISIBLE)",
		whatUserSees:
			"Igual que el pivote del worker: chip ámbar “Seleccionar expediente” en la lista (tabla “requieren tu atención”), pill en la fila expandida y gate con CausaSelector en el detalle.",
		cases: [
			{
				key: "eje.invisible.link_pivot",
				title: "linkFolderToCausa contra un pivote (E1 resuelto)",
				producer:
					"hub folderController.js linkFolderToCausa: isEjePivot = result.isPivot && pendingCausaIds.length → assoc='pending_selection' + pendingCausaIds/pendingCausaType/searchTerm, causaVerified=true, causaIsValid=null. Antes escribía 'success' con causaId=pivote y la carpeta no entraba en ninguna tabla",
				fields: "source=auto · verified=true · isValid=null · assoc=pending_selection · causaId=pivote · pendingCausaIds=[…]",
				entry: entry(
					{ ...ejeBase, causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
					{
						list: "pending_selection",
						expanded: { label: "Seleccionar expediente", accent: "amber", badge: "pending_selection" },
						detail: { chip: { label: "Seleccionar expediente", accent: "amber", badge: "pending_selection" }, gate: "pending_selection" },
						inAttentionTable: true,
					},
				),
			},
		],
	},
	{
		row: "hidden_archived",
		title: "No aparece — archivada",
		whatUserSees: "Solo en el modal Archivadas; gate archivada en el detalle.",
		cases: [
			{
				key: "eje.archived",
				title: "Archivada por downgrade de plan",
				producer:
					"hub subscriptionService.js archived=true (+ archivedAt/archivedReason desde el 08/09). Los workers EJE NO filtran archived a propósito: archivar no desvincula y la carpeta debe estar al día si se desarchiva. Desde el 09/09 sí exigen que la carpeta siga apuntando a la causa (causaId) — antes el stuck-worker escribía en carpetas desvinculadas (E3b)",
				fields: "source=auto · archived=true",
				entry: entry(
					{ ...ejeBase, archived: true },
					{ hiddenFromList: true, expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: "archived" } },
				),
			},
		],
	},
];

export const EJE_FINDINGS: GuideFinding[] = [
	{
		id: "E1",
		severity: "alta",
		title: "[RESUELTO (ya estaba) 2026-09-09] Link a un pivote → carpeta invisible",
		detail:
			"linkFolderToCausa ya detecta isPivot y escribe pending_selection + pendingCausaIds; la lista incluye assoc=pending_selection en “requieren tu atención” (T21) y el detalle tiene gate con CausaSelector. Verificado en código el 09/09; la guía lo tenía como abierto.",
		where: "law-analytics-server folderController.js linkFolderToCausa · front folders.tsx (tablas) · details.tsx (gate)",
	},
	{
		id: "E2",
		severity: "alta",
		title: "[RESUELTO 2026-09-09] Reverificar un pivote era un callejón sin salida",
		detail:
			"El hub ya rechazaba (400) reverificar una carpeta en pending_selection. Quedaba el caso de deriva: carpeta 'failed'/'pending' cuyo causaId es un pivote sin resolver → el reset dejaba el pivote en un estado que ningún verifier vuelve a tomar. Ahora reverifyFolder lee la causa y responde 400 PIVOTE_SIN_RESOLVER. La búsqueda no se re-ejecuta (el usuario elige o cancela); re-buscar con el mismo término queda como mejora aparte.",
		where:
			"law-analytics-server folderController.js reverifyFolder (d5cc640) · eje-workers verification-worker.ts findPendingDocuments (isPivot excluido, sin cambios)",
	},
	{
		id: "E3",
		severity: "media",
		title: "[RESUELTO 2026-09-09] Pivote pisado por el admin; workers escribiendo en carpetas desvinculadas",
		detail:
			"(a) El hub ya hace $pull del folder en pivot.folderIds al seleccionar/cancelar (best-effort); ahora resolvePivot de eje-api sólo re-apunta folders que siguen en pending_selection sobre ese pivote, así una elección del usuario no se pisa aunque el $pull haya fallado. (b) stuck-worker escribía en TODOS los folderIds de la causa sin exigir que siguieran apuntando a ella (el update-worker sí lo exigía): materia/juzgado/fechas y hasta 'failed' en carpetas desvinculadas o re-vinculadas. Ahora todas las escrituras a folders de eje-workers llevan causaId. Archivadas: se siguen actualizando a propósito (archivar no desvincula).",
		where:
			"eje-api causasEjeController.js resolvePivot (ba65966) · eje-workers stuck-worker.ts markPermanentlyFailed/first-touch, verification-worker.ts (5d3bb04)",
	},
	{
		id: "E4",
		severity: "alta",
		title: "[RESUELTO 2026-09-09] Dedupe (1 resultado que ya existía) dejaba la carpeta vacía",
		detail:
			"Peor de lo relevado: además de no limpiar pendingCausaIds/searchTerm ni setear eje:true, no copiaba carátula, materia, jurisdicción, fuero, CUIJ ni fecha de inicio — la carpeta quedaba verde pero llamada “Pendiente de verificación: 12345/2024” para siempre, sin juzgado ni materia. Ahora usa el mismo helper que el resultado nuevo (updateFoldersOnSingleResult) con los datos de la causa existente, respetando overwrite.",
		where: "eje-workers verification-worker.ts (5d3bb04)",
	},
	{
		id: "E5",
		severity: "media",
		title: "[RESUELTO 2026-09-09] pending y failed en verde en la fila expandida",
		detail:
			"La rama verde de EJE en FolderView se evaluaba antes que la rama IOL (que sí pinta “Pendiente de verificación · EJE” / “Vinculación fallida · EJE”). Ahora la rama verde exige causaVerified=true y causaIsValid≠false; el resto cae en la IOL. El detalle ya estaba protegido por el gate.",
		where: "law-analytics-front FolderView.tsx (6c0304db)",
	},
	{
		id: "E6",
		severity: "baja",
		title: "[RESUELTO 2026-09-09] causaIsValid optimista al seleccionar",
		detail:
			"selectPendingCausaForFolder escribía (verified:false, isValid:true, 'success') si la candidata no estaba verificada. Ahora el estado sigue al de la causa: pending si no está verificada, isValid null si no se sabe. Test tests/eje/eje-folders.test.js.",
		where: "law-analytics-server services/causaService.js (d5cc640)",
	},
	{
		id: "E7",
		severity: "baja",
		title: "[RESUELTO 2026-09-09] Duplicados EJE no controlados",
		detail:
			"El guard de duplicado por expediente de createFolder filtraba pjn|mev. Ahora también eje, con clave CUIJ o numero/anio (lo mismo que queda en judFolder.numberJudFolder) → 409 con la carpeta existente. Mismo hueco pendiente en PJ Salta/Catamarca/Mendoza (se ve en el bloque IOL).",
		where: "law-analytics-server folderController.js createFolder (d5cc640)",
	},
	{
		id: "E8",
		severity: "baja",
		title: "[RESUELTO (ya estaba) 2026-09-09] folderJuris divergente",
		detail:
			"Link, alta y worker escriben el mismo item canónico (“CABA - Contencioso Administrativo y Tributario”, o “Penal Contravencional y Faltas” si la causa es privada), presentes en el selector (folder.json). Verificado el 09/09.",
		where: "law-analytics-server folderController.js · eje-workers verification-worker.ts",
	},
	{
		id: "E9",
		severity: "media",
		title: "[RESUELTO 2026-09-09] Desvincular EJE sin fallback si eje-api no responde",
		detail:
			"folderUnlinkService declaraba modelo:null para CausasEje (el hub sí tiene models/CausasEje.js). Si el DELETE dissociate-folder de eje-api fallaba, la carpeta pasaba a manual pero la causa la conservaba en folderIds con update:true: se seguía scrapeando y el stuck-worker le escribía (E3b). Ahora el fallback local hace el $pull y ajusta update.",
		where: "law-analytics-server services/folderUnlinkService.js (d5cc640)",
	},
];

// =====================================================================
// SCBA — portal autenticado con credencial (Mis Causas SCBA). Folders
// creados por el sync con verified/isValid hardcodeados en true.
// =====================================================================

const scbaBase: F = { source: "scba-login", pjn: false, scba: true };
const scbaPill = (label: string, accent: "green" | "amber", badge: string) => ({ label, accent, badge });

/**
 * SCBA (Suprema Corte de Buenos Aires — "Mis Causas" con credencial). Única
 * puerta: la cuenta SCBA conectada desde el wizard o Integraciones; las
 * carpetas las crea scba-workers. Estado de carpeta y de credencial en el
 * front salen de una sola fuente (utils/scbaBindingState.ts, S15):
 * unlinked > list_removed > cred_error > ok. Relevado 2026-09-05 y
 * actualizado el 2026-09-07 tras el hardening S1–S24 (la-infra-docs
 * flujos/estado-actual/scba-front.md §7).
 */
export const SCBA_GROUPS: GuideGroup[] = [
	{
		row: "ok",
		title: "OK — carátula + tilde azul",
		whatUserSees:
			"Carátula + tilde azul (“Causa vinculada a SCBA”). Fila expandida/detalle: pill verde “Vinculado con SCBA”. Un rechazo de login todavía no confirmado NO cambia la fila (sólo la card de Integraciones).",
		cases: [
			{
				key: "scba.ok.synced",
				title: "Sincronizada y scrapeada (nominal)",
				producer:
					"scba-workers folder-service.ts ensureFolder (insertOne con causaVerified=true, causaIsValid=true, assoc='success': “verificada” = figura en Mis Causas del portal con login OK) + updateFolderFromCausa tras cada scraping (recorre TODAS las carpetas de la causa, S1)",
				fields: "source=scba-login · verified=true · isValid=true · assoc=success",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					credOk,
				),
			},
			{
				key: "scba.ok.unscraped",
				title: "Recién creada, sin movimientos aún (o scraping inicial fallido)",
				producer:
					"folder-service.ts con scrapingProgress pending; initial-scraping-worker escribe el error sólo en la causa (causas-scba.scrapingProgress), el folder queda igual. Desde S9 el front no queda clavado en 65 %: verification emite completed si no queda nada por extraer",
				fields: "source=scba-login · verified=true · isValid=true · movementsCount=0 · scrapingProgress=pending|error",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					credOk,
				),
				warn: "Tilde desde el instante 0 aunque la causa nunca se haya scrapeado; un fallo del scraping inicial sólo se ve en Actividad (0 movimientos). Aceptado (S21): la verificación SCBA es la lista del portal, no el scraping.",
			},
			{
				key: "scba.ok.rejection_pending",
				title: "Rechazo de login pendiente de confirmación (N de 3)",
				producer:
					"scba-workers credential-state.ts handleExplicitRejection: 'Datos inválidos' cuenta sólo si es del holder del lease, fuera de cuarentena de red y espaciado ≥30 min del primero (política 3/30 en configuracion-scba.credentialPolicy); la cred sigue enabled, syncStatus='pending', lastError.code='CREDENTIAL_REJECTED'. Hub: statusReason='rejection_pending' + rejectionProgress {count, required} (S10)",
				fields: "source=scba-login · cred.enabled=true · cred.syncStatus=pending · cred.lastError.code=CREDENTIAL_REJECTED",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					[{ ...credOk[0], credentialSyncStatus: "pending", credentialLastErrorCode: "CREDENTIAL_REJECTED" }],
				),
				warn: "La lista no cambia (correcto: puede ser rate-limit o la sesión del propio usuario). Integraciones muestra aviso ámbar “N de 3 rechazos” + “Actualizar contraseña”; POST /sync responde 400 RETRY_DEFERRED (S12). Credencial recién cargada: misma política (S8).",
			},
			{
				key: "scba.ok.shared",
				title: "Causa compartida por dos usuarios: cada uno tiene su carpeta",
				producer:
					"folder-service.ts ensureFolder busca {causaId, causaType, userId ∈ {owner del equipo, userId}} (S1, 9001c90): el segundo usuario recibe su propia carpeta; propagateTracking por usuario (S3) no apaga la de otro cuando una credencial cae",
				fields: "source=scba-login · verified=true · isValid=true (una carpeta por usuario)",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					credOk,
				),
			},
			{
				key: "scba.ok.toggle_off",
				title: "Credencial pausada por el administrador (toggle en admin)",
				producer:
					"admin-api PATCH /api/scba-credentials/:id/toggle {enabled:false} (S23): enabled=false, disabledReason='admin', disabledByAdminAt + propagateTracking(false) → causaUpdateEnabled=false en las carpetas y update=false en las causas del usuario. El hub deriva statusReason='disabled_by_admin'; POST / y POST /sync responden 403/400 DISABLED_BY_ADMIN hasta que el admin la re-habilite (queda pending para el próximo ciclo)",
				fields: "source=scba-login · causaUpdateEnabled=false · cred.enabled=false · cred.disabledReason=admin",
				entry: entry(
					{ ...scbaBase },
					{
						list: "ok_cred_error",
						expanded: scbaPill("SCBA — Sincronización pausada", "amber", "valid"),
						detail: { chip: scbaPill("SCBA — Sincronización pausada", "amber", "valid"), gate: null },
						credError: { code: "DISABLED_BY_ADMIN", message: "…pausada por el administrador de Law Analytics. Contactá a soporte…" },
					},
					[{ ...credOk[0], credentialEnabled: false }],
				),
				warn: "Integraciones muestra “Sincronización pausada” + aviso de soporte, sin “Actualizar contraseña” ni re-sync; las carpetas llevan el warning ámbar con el mismo copy. El admin confirma en un diálogo que explica el efecto.",
			},
		],
	},
	{
		row: "ok_cred_error",
		title: "OK con credencial rota — warning ámbar",
		whatUserSees:
			"Carátula + warning ámbar clickeable a Integraciones → SCBA. Fila expandida/detalle: pill “SCBA — Sincronización pausada”. Global por usuario (useScbaCredentialError, un fetch para N carpetas). Copy según statusReason (scbaStatusNotice).",
		cases: [
			{
				key: "scba.cred.rejected",
				title: "Rechazo de contraseña confirmado (3 rechazos espaciados)",
				producer:
					"scba-workers credential-state.ts markCredentialErroredAndNotify (tras la confirmación de handleExplicitRejection): cred enabled=false, syncStatus='error', isExpired=true, lastError.code='CREDENTIAL_INVALID', email “Cuenta SCBA desactivada”; propagateTracking(false) por usuario → causaUpdateEnabled=false sólo en sus carpetas (S3). Hub statusReason='credential_invalid'",
				fields: "source=scba-login · cred.syncStatus=error · cred.isExpired=true · causaUpdateEnabled=false",
				entry: entry(
					{ ...scbaBase },
					{
						list: "ok_cred_error",
						expanded: scbaPill("SCBA — Sincronización pausada", "amber", "valid"),
						detail: { chip: scbaPill("SCBA — Sincronización pausada", "amber", "valid"), gate: null },
						credError: { code: "CREDENTIAL_INVALID", message: "El Portal SCBA rechazó tus credenciales…" },
					},
					[{ ...credOk[0], credentialValid: false, credentialSyncStatus: "error", credentialLastErrorCode: "CREDENTIAL_INVALID" }],
				),
			},
			{
				key: "scba.cred.syncerror",
				title: "Error de scraping (no de contraseña) — mismo aviso, otro copy",
				producer:
					"scba-workers verification-worker markSyncError → syncStatus='error' (SYNC_ERROR) sin tocar folders. Hub statusReason='sync_error' (S10) → copy “Pudimos ingresar al Portal SCBA pero falló la lectura de tus causas…” (S15); el tracking sigue activo",
				fields: "source=scba-login · cred.syncStatus=error · cred.isExpired=false · causaUpdateEnabled=true",
				entry: entry(
					{ ...scbaBase },
					{
						list: "ok_cred_error",
						expanded: scbaPill("SCBA — Sincronización pausada", "amber", "valid"),
						detail: { chip: scbaPill("SCBA — Sincronización pausada", "amber", "valid"), gate: null },
						credError: { code: "SYNC_ERROR", message: "Pudimos ingresar al Portal SCBA pero falló la lectura…" },
					},
					[{ ...credOk[0], credentialSyncStatus: "error", credentialLastErrorCode: "SYNC_ERROR" }],
				),
			},
		],
	},
	{
		row: "list_removed",
		title: "Ya no en la lista — warning ámbar",
		whatUserSees:
			"Carátula + warning ámbar (“…tu lista de Mis Causas del portal SCBA”). Fila expandida/detalle: pill ámbar “SCBA — Ya no en la lista”. No bloquea.",
		cases: [
			{
				key: "scba.list_removed",
				title: "Baja detectada por list-audit (3 ART)",
				producer:
					"scba-workers list-audit-worker: listRemoved=true, listRemovedSource='scba', listRemovedAt (updateMany por causaId) + email “ℹ️ SCBA: M causa(s) ya no figura(n)”. Se limpia en scba-upsert si la causa reaparece; el unlink keep hace $unset de listRemoved* (84255a5) y el re-link no lo revive. Desde S19 una credencial sin lease a las 3 ART se reintenta al final del ciclo",
				fields: "source=scba-login · listRemoved=true · listRemovedSource=scba",
				entry: entry(
					{ ...scbaBase, listRemoved: true, listRemovedSource: "scba" },
					{
						list: "list_removed",
						expanded: scbaPill("SCBA — Ya no en la lista", "amber", "list_removed"),
						detail: { chip: scbaPill("SCBA — Ya no en la lista", "amber", "valid"), gate: null },
					},
					credOk,
				),
			},
		],
	},
	{
		row: "unlinked",
		title: "Desvinculada (keep) — “Sincronización pausada (era SCBA)”",
		whatUserSees:
			"Carátula + ícono gris con tooltip “Esta carpeta fue desvinculada de SCBA… vinculá tu cuenta desde Integraciones → SCBA” (scbaBindingState 'unlinked'). Fila expandida/detalle: pill “Sincronización pausada (era SCBA)”. Movimientos: snapshot materializado en `movements` (source 'scba-snapshot') + PDFs copiados a folders/{id}/.",
		cases: [
			{
				key: "scba.keep",
				title: "Unlink modo keep (y su re-vinculación)",
				producer:
					"hub scbaCredentialsController.js executeScbaKeepMode: snapshot best-effort → source='manual', scba=false, causaId=null, causaType=null, causaVerified=false, assoc='unlinked', causaUpdateEnabled=false, previousSyncSource='scba', $unset listRemoved*; $pull folderIds/userCausaIds en causas-scba (S13, 2816abe). Al re-conectar la cuenta, ensureFolder re-ata la MISMA carpeta por previousSyncSource + judFolder.numberJudFolder, borra los Movement scba-snapshot y el worker re-propaga update:true (572d236)",
				fields: "source=manual · scba=false · assoc=unlinked · previousSyncSource=scba · causaId=null · judFolder intacto",
				entry: entry(
					{
						...scbaBase,
						source: "manual",
						scba: false,
						causaVerified: false,
						causaIsValid: undefined,
						causaAssociationStatus: "unlinked",
						previousSyncSource: "scba",
					},
					{
						list: "unlinked",
						expanded: scbaPill("Sincronización pausada (era SCBA)", "amber", "unlinked"),
						detail: { chip: scbaPill("Sincronización pausada (era SCBA)", "amber", "unlinked"), gate: null },
						inAttentionTable: false,
					},
				),
			},
		],
	},
	{
		row: "pending",
		title: "Pendiente de verificación — chip ámbar (hoy no alcanzable)",
		whatUserSees: "Chip ámbar “Pendiente de verificación” + refresh. Ninguna carpeta SCBA llega acá.",
		cases: [
			{
				key: "scba.pending.reverify",
				title: "Reverificación manual — sin productor ni consumidor",
				producer:
					"hub folderController.js reverifyFolder admite scba=true (causaVerified=false, assoc='pending') pero el botón vive en PendingVerificationView, que sólo se muestra con causaVerified=false — y las carpetas SCBA nacen verificadas y el keep las convierte en 'unlinked'. Ningún worker SCBA escribe causaVerified fuera de la creación/re-link",
				fields: "source=scba-login · verified=false · assoc=pending (sólo por escritura manual en DB)",
				entry: entry(
					{ ...scbaBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
					pendingView({
						expanded: scbaPill("Vinculado con SCBA", "green", "pending"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "pending"), gate: "pending" },
					}),
					credOk,
				),
				warn: "Si alguna vez se produce (edición en DB), es terminal: nadie la vuelve a verificar (S22, no aplica en la práctica).",
			},
		],
	},
	{
		row: "hidden_archived",
		title: "No aparece — archivada",
		whatUserSees:
			"Solo en el modal Archivadas. Con updatePolicy 'unified' el update-worker la sigue actualizando; la notificación depende de notifyArchivedFolders.",
		cases: [
			{
				key: "scba.archived.plan",
				title: "Creada archivada por límite de plan",
				producer:
					"scba-workers subscription-limits.ts getNextFolderState → 'archived' → folder-service.ts archived=true (sin archivedAt/archivedBy). Si tampoco hay storage: 'pending' → NO se crea folder (queda en foldersPending del email de sync)",
				fields: "source=scba-login · archived=true",
				entry: entry(
					{ ...scbaBase, archived: true },
					{
						hiddenFromList: true,
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: "archived" },
					},
					credOk,
				),
				warn: "La gran mayoría de las carpetas SCBA (837/846 al 2026-09-05). Indistinguible de un archivado manual del usuario: falta archivedAt/archivedBy (S24, abierto, baja).",
			},
		],
	},
];

const R = (d: string, t: string) => `[RESUELTO ${d}] ${t}`;

/**
 * Misma numeración que la-infra-docs flujos/estado-actual/scba-front.md §7
 * (S1–S20 del relevamiento del 2026-09-06/07) + S21–S24 (los hallazgos de
 * esta guía que no estaban en ese relevamiento). Historial completo con
 * commits y pruebas en prod: flujos/historial/scba-hardening.md.
 */
export const SCBA_FINDINGS: GuideFinding[] = [
	{
		id: "S1",
		severity: "alta",
		title: R("2026-09-06", "Un solo folder por causa compartida"),
		detail:
			"ensureFolder buscaba {causaId, causaType} sin userId: el segundo usuario con la misma causa nunca recibía carpeta y updateFolderFromCausa sólo actualizaba una. Ahora filtra userId ∈ {owner del equipo, userId} y recorre todas las carpetas de la causa.",
		where: "scba-workers folder-service.ts (9001c90)",
	},
	{
		id: "S2",
		severity: "media",
		title: "[ACEPTADO 2026-09-06] credentialId escalar en causas compartidas",
		detail:
			"Semántica explícita: “credencial que sirve la causa = la última cuya lista la vio”; S3 lo re-estampa a una habilitada cuando la actual no lo es. Prod tenía 0/851 causas compartidas.",
		where: "scba-workers scba-upsert.ts",
	},
	{
		id: "S3",
		severity: "alta",
		title: R("2026-09-06", "propagateTracking apagaba carpetas de otros usuarios"),
		detail:
			"Busca por userCausaIds; update = algún usuario con credencial habilitada; causaUpdateEnabled sólo en las carpetas del usuario/owner. Gemelos worker + hub.",
		where: "scba-workers credential-state.ts (9001c90) · hub scbaCredentialsController.js (cef5209)",
	},
	{
		id: "S4",
		severity: "alta",
		title: R("2026-09-07", "Borrar una carpeta SCBA no la excluía: el sync la recreaba"),
		detail:
			"$pull folderIds/userCausaIds + excludedCausas en la credencial; el upsert respeta la exclusión; restauración desde Integraciones y admin (primer pase sin backlog ni email).",
		where:
			"hub folderController.js / scbaFolderDissociateService.js (72944b2, b5674d7) · scba-workers scba-upsert.ts (96edfe7, bcb8519) · front e8686b1e · admin 8866b92",
	},
	{
		id: "S5",
		severity: "alta",
		title: R("2026-09-07", "POST /api/scba-manager/reset destruía la config del manager"),
		detail:
			"mev-api sin schema propio (utils/scbaManagerConfig.js), /reset → 410, botón quitado; getConfig/getStatus muestran los 5 workers; alertas reconocidas por índice real.",
		where: "mev-api scbaManagerController.js (acbf91e) · admin ScbaManagerTab.tsx (8aefd8b)",
	},
	{
		id: "S6",
		severity: "media",
		title: R("2026-09-06", "Login fallido dejaba la credencial in_progress 20 min"),
		detail: "deferSyncRetry() vuelve la cred a pending tras rechazo no confirmado / conflicto de sesión / cuarentena / fallo transitorio.",
		where: "scba-workers verification-worker.ts (819de75)",
	},
	{
		id: "S7",
		severity: "media",
		title: R("2026-09-06", "Toast rojo “Credenciales inválidas” con el perfil aún Conectado"),
		detail:
			"WS error sólo cuando handleExplicitRejection deshabilita; si no, fase 'deferred' (snackbar warning, aviso ámbar en la card, sin polling).",
		where: "scba-workers verification-worker.ts (819de75) · front e053a64d",
	},
	{
		id: "S8",
		severity: "alta",
		title: R("2026-09-07", "Credencial nueva se deshabilitaba al primer “Datos inválidos”"),
		detail:
			"Misma política de confirmación para nuevas y establecidas (3 rechazos espaciados ≥30 min, gate de sesión, cuarentena de red); saveCredentials resetea contadores; copy “N de 3” para cred recién cargada. Verificado E2E en prod.",
		where: "scba-workers credential-state.ts (ce98e1b, 44e1f95) · hub 0f6a213 · front 31c5f83a",
	},
	{
		id: "S9",
		severity: "media",
		title: R("2026-09-06", "Front clavado en 65 % “Extrayendo trámites…”"),
		detail:
			"verification emite completed 100 % si no queda nada por scrapear; initial-scraping también tras la última causa fallida. Verificado: 65 → 100 % en 6 s.",
		where: "scba-workers verification-worker.ts / initial-scraping-worker.ts (819de75)",
	},
	{
		id: "S10",
		severity: "media",
		title: R("2026-09-07", "El usuario no veía rechazos pendientes, portal inestable ni inactividad"),
		detail:
			"statusReason (credential_invalid | sync_error | user_inactive | unlinked | rejection_pending | session_conflict | portal_unstable | syncing | ok | never_synced) + rejectionProgress; lastError sin screenshotKey.",
		where: "hub models/ScbaCredentials.js · scbaCredentialStatusService.js (1acd866)",
	},
	{
		id: "S11",
		severity: "baja",
		title: R("2026-09-07", "Email de sync siempre con copy de “primer sync”"),
		detail: "isFirstSync = !lastSync || unlinkedAt > lastSync; copy neutral para re-sync; scbaCausasAdded deja de ser código muerto.",
		where: "scba-workers verification-worker.ts / email-service.ts (407c38e) · admin 5a51f93",
	},
	{
		id: "S12",
		severity: "media",
		title: R("2026-09-07", "POST /sync aceptaba credencial expirada o con reintento diferido"),
		detail: "400 CREDENTIAL_EXPIRED y 400 RETRY_DEFERRED (+retryReason); la card mantiene el aviso “N de M”.",
		where: "hub scbaCredentialsController.js requestSync (5c18856)",
	},
	{
		id: "S13",
		severity: "media",
		title: R("2026-09-07", "Unlink keep dejaba al usuario en userCausaIds → notificaciones de causas ajenas"),
		detail:
			"Los duplicados al re-vincular ya estaban resueltos (re-attach por judFolder). El efecto real: en causas compartidas el usuario keep-desvinculado seguía recibiendo movimientos (fallback userCausaIds + webhook sin chequeo de carpeta). Fix: $pull folderIds/userCausaIds como en delete + snapshot best-effort; el worker re-propaga update:true tras el sync (el hub lo hacía antes del sync y ya no encuentra las causas). Verificado E2E en prod.",
		where: "hub scbaCredentialsController.js executeScbaKeepMode (2816abe) · scba-workers verification-worker.ts (572d236)",
	},
	{
		id: "S14",
		severity: "baja",
		title: "[YA ESTABA 2026-09-07] Sync de marketing tras cambios de credencial",
		detail: "LAW_ANALYTICS_API_URL + INTERNAL_SERVICE_TOKEN presentes en el secreto; el hub loguea [marketingInternal] en cada sync.",
		where: "scba-workers notify-marketing.ts · hub marketingInternalRoutes.js",
	},
	{
		id: "S15",
		severity: "media",
		title: R("2026-09-07", "Tres criterios distintos de “cuenta conectada” y copy inconsistente"),
		detail:
			"utils/scbaBindingState.ts: estado de carpeta (unlinked > list_removed > cred_error > ok) y de credencial (isScbaConnected, isScbaCredentialBroken, isScbaRetryDeferred, scbaStatusNotice) en un solo lugar; badge 'attention'; reintento diferido no se muestra como “Sincronizando”.",
		where: "front utils/scbaBindingState.ts (1fc6e6cd, 33ffba1a, 0f31b12d)",
	},
	{
		id: "S16",
		severity: "baja",
		title: R("2026-09-07", "Front: copy del wizard, doble toast de completada, tipos, 401"),
		detail:
			"La card BA del wizard decía sólo “MEV”; pollSyncStatus no re-chequeaba isPolling tras el await (dos toasts con números distintos cuando el WS cortaba el polling con una request en vuelo); username tipado; 401 → “Sesión expirada” en getCredentialsStatus (SCBA y PJN); toggleCredentials muerto borrado.",
		where: "front judicialPowerSelection.tsx · api/scbaCredentials.ts · ScbaAccountConnect.tsx (79b625ca)",
	},
	{
		id: "S17",
		severity: "baja",
		title: R("2026-09-07", "Hub: guard de propietario, toggle no idempotente, unlink-impact, gating, N+1"),
		detail:
			"requireScbaOwner en las rutas de gestión; toggle lee {enabled}; unlink-impact usa el filtro de getCredentialsStatus (404 si ya está desvinculada); 'unlinked' en el enum de causaAssociationHistory; scbaAccess con gating real en la rama sin paginación de movimientos; analyzeScbaImpact con un find $in. teamContext sigue sin setearse (igual que PJN) — dejado a propósito con el guard puesto.",
		where: "hub routes/scbaCredentialsRoutes.js · scbaCredentialsController.js · movementController.js · models/Folder.js (f86664d)",
	},
	{
		id: "S18",
		severity: "media",
		title: R("2026-09-07", "Config del manager que nunca aplicó + estado de instancias ficticio"),
		detail:
			"listSnapshots.retentionDays y sessionMaxCausas no estaban en el schema: getConfig() (doc hidratado, strict) los descartaba — la retención 180 corría con 90 y sessionMaxCausas siempre 500. El manager persistía el óptimo, no las instancias reales de PM2. workEndHour default 24 (es exclusivo). Guard in_progress en la auto-rehabilitación.",
		where: "scba-models configuracion-scba.ts (a41bef2) · scba-workers scba-manager.ts / credential-state.ts (462246a)",
	},
	{
		id: "S19",
		severity: "baja",
		title: R("2026-09-07", "WS folders_created al usuario equivocado en equipos; list-audit perdía el día sin lease"),
		detail:
			"folders_created agrupado por el owner real de cada carpeta; las credenciales sin lease a las 3 ART se reintentan al final del ciclo (12 min).",
		where: "scba-workers verification-worker.ts · list-audit-worker.ts (462246a)",
	},
	{
		id: "S20",
		severity: "baja",
		title: R("2026-09-07", "Docs decían worker_02; prod es worker-cloud-02"),
		detail:
			"CLAUDE.md de scba-workers y del ecosistema: worker-cloud-02 100.102.208.69, scba-models por symlink, alias de deploy key github-w02, pm2 /usr/bin/pm2.",
		where: "scba-workers CLAUDE.md (b5f42db)",
	},
	{
		id: "S21",
		severity: "baja",
		title: "[ACEPTADO 2026-09-07] verified/isValid=true desde la creación",
		detail:
			"Para SCBA “verificada” significa que la causa figura en Mis Causas del portal con login OK, no que se haya scrapeado. Un fallo del scraping inicial sólo se ve como 0 movimientos en Actividad (y en la causa: scrapingProgress). Se acepta; si hace falta un estado propio, sería un flag de scraping en la carpeta.",
		where: "scba-workers folder-service.ts ensureFolder · initial-scraping-worker.ts",
	},
	{
		id: "S22",
		severity: "baja",
		title: "[NO APLICA 2026-09-07] Reverificación SCBA terminal",
		detail:
			"reverifyFolder admite scba=true pero el botón sólo aparece en PendingVerificationView (causaVerified=false), estado al que ninguna carpeta SCBA llega (nacen verificadas; el keep las convierte en 'unlinked'). Sólo reproducible editando la DB.",
		where: "hub folderController.js reverifyFolder · front PendingVerificationView.tsx",
	},
	{
		id: "S23",
		severity: "baja",
		title: R("2026-09-07", "Credencial deshabilitada por el admin era invisible para el usuario"),
		detail:
			"Antes el toggle sólo tocaba `enabled`: el usuario veía tilde en las carpetas e Integraciones “No conectado”, y cargar la contraseña re-habilitaba en silencio. Ahora: disabledReason='admin' + disabledByAdminAt + propagateTracking; statusReason 'disabled_by_admin'; GET /api/scba-credentials la devuelve; POST / → 403 y POST /sync → 400 DISABLED_BY_ADMIN; la card muestra “Sincronización pausada” + “contactá a soporte” sin form ni re-sync; carpetas con warning ámbar y el mismo copy; el update-worker omite credenciales enabled=false; el admin confirma en un diálogo que explica el efecto. Re-habilitar limpia la marca y deja la cred pending.",
		where:
			"hub models/ScbaCredentials.js · scbaCredentialStatusService.js · scbaCredentialsController.js · admin-api toggleCredential · front scbaBindingState.ts / ScbaAccountConnect.tsx · admin CredencialesSCBA.tsx · scba-workers update-worker.ts",
	},
	{
		id: "S24",
		severity: "baja",
		title: R("2026-09-07", "Archivada por límite de plan sin marca de motivo"),
		detail:
			"folder-service crea la carpeta con archived=true, archivedAt=now y archivedReason='plan_limit' (campo nuevo en Folder, enum ['plan_limit', null]); archivedBy queda para archivados manuales. Las carpetas anteriores al fix no tienen la marca.",
		where: "scba-workers folder-service.ts · hub models/Folder.js",
	},
	{
		id: "S25",
		severity: "media",
		title: R("2026-09-08", "El manager mataba el list-audit diario por CPU crítica y el día se perdía"),
		detail:
			"08/09 06:01 UTC: el propio scraping del audit (2ª de 4 credenciales, 11 páginas) llevó la CPU a 97 %, el manager aplicó 'CPU crítica → listAudit 1→0' (SIGINT a mitad de ciclo), lo respawneó 30 s después y el cron diario no vuelve hasta el día siguiente: 3 credenciales sin auditar, sin retención de snapshots ni reintento. Fix: los workers de cron diario (listAudit, updateArchived) quedan fuera de la reducción por CPU y el list-audit hace catch-up al arrancar si el disparo del día ya pasó y lastProcessedAt es anterior (SCBA_AUDIT_CATCHUP_DELAY_MS, 90 s). Verificado: catch-up 12:54–12:57 UTC, 4 credenciales, 152 s, 0 errores. cleanupOldListSnapshots loguea siempre la retención efectiva.",
		where:
			"scba-workers scba-manager.ts (CRON_DRIVEN_TYPES) · list-audit-worker.ts scheduleCatchUp (efc0249) · utils/list-snapshot.ts (9cf43f6)",
	},
];

// =====================================================================
// IOL — PJ Salta / PJ Catamarca / PJ Mendoza (mismo patrón; sin credencial,
// verificación por búsqueda en el portal, pivotes cuando hay N resultados).
// =====================================================================

const iolGroups = (jur: "pjsalta" | "pjcatamarca" | "pjmendoza", label: string): GuideGroup[] => {
	const base: F = { source: "auto", pjn: false, [jur]: true };
	const pill = (badge: string) => ({ label: `Vinculado con ${label}`, accent: "green" as const, badge });
	const isMza = jur === "pjmendoza";
	return [
		{
			row: "ok",
			title: "OK — carátula + tilde azul",
			whatUserSees: `Carátula + tilde azul (“Causa vinculada a ${label}”). Fila expandida: pill verde “Vinculado con ${label}” — SIEMPRE verde para IOL, sin importar el estado (solo cambia el ícono chico).`,
			cases: [
				{
					key: `${jur}.ok.single`,
					title: "Búsqueda con 1 resultado",
					producer: `${jur}-workers folder-updater.js (W2) desde verifier.js: causaId, assoc='success', verified=true, isValid=true, limpia pendingCausaIds/searchTerm; propaga carátula/materia/folderJuris/judFolder si overwrite`,
					fields: "source=auto · verified=true · isValid=true · assoc=success",
					entry: entry({ ...base }, { expanded: pill("valid"), detail: { chip: pill("valid"), gate: null } }),
				},
				{
					key: `${jur}.ok.dedupe`,
					title: "Alta sobre causa ya verificada (dedup por expedienteId/CUIJ)",
					producer:
						"hub folderController.js (H3): assoc='success', verified/isValid de la causa; carátula si no empieza con “Pendiente de verificación”",
					fields: "source=auto · verified=true · isValid=true · assoc=success",
					entry: entry({ ...base }, { expanded: pill("valid"), detail: { chip: pill("valid"), gate: null } }),
				},
				{
					key: `${jur}.ok.resolved_api`,
					title: "Pivote resuelto por API (global)",
					producer: `${jur}-api causasController.js resolve-pivot → moveFoldersFromPivotToSelected: mueve solo los folders que siguen pending_selection sobre ese pivote (resolución por folder, IOL-6; body.folderIds acota)${
						isMza
							? " — versión degradada en Mendoza: no propaga carátula/materia/folderJuris/judFolder ni limpia causaAssociationError"
							: ""
					}`,
					fields: "source=auto · verified=true · isValid=true · assoc=success",
					entry: entry({ ...base }, { expanded: pill("valid"), detail: { chip: pill("valid"), gate: null } }),
					warn: isMza
						? "Queda con el nombre original del usuario, folderJuris “Catamarca” y numberJudFolder = término de búsqueda crudo."
						: "Si dos usuarios comparten el pivote, el segundo queda apuntando a la causa que eligió el primero.",
				},
				{
					key: `${jur}.ok.selected_ui`,
					title: "Usuario eligió desde CausaSelector (por folder)",
					producer:
						"hub causaService.js:696-925 selectPendingCausaForFolder: $pull del pivote, assoc='success', causaIsValid=causa.isValid!==false; NO limpia searchTerm; no actualiza judFolder (solo EJE)",
					fields: "source=auto · verified=<causa> · isValid=true · assoc=success · searchTerm residual",
					entry: entry({ ...base }, { expanded: pill("valid"), detail: { chip: pill("valid"), gate: null } }),
				},
				{
					key: `${jur}.ok.stale_reset`,
					title: "Causa reseteada por admin, folder no enterado",
					producer: `${jur}-api causasController.js resetVerification: la causa (verified=false, errorCount=0) y el folder vuelve a 'pending' + causaVerified=false (IOL-10)`,
					fields: "source=auto · verified=true · isValid=true · assoc=success (causa verified=false)",
					entry: entry({ ...base }, { expanded: pill("valid"), detail: { chip: pill("valid"), gate: null } }),
					warn: "Muestra “válida” sobre una causa sin verificar.",
				},
			],
		},
		{
			row: "pending",
			title: "Pendiente de verificación — chip ámbar",
			whatUserSees: "Chip ámbar “Pendiente de verificación” + refresh. Fila expandida: pill VERDE con InfoCircle ámbar.",
			cases: [
				{
					key: `${jur}.pending.new`,
					title: "Alta nueva esperando al verifier",
					producer:
						"hub folderController.js (H2): assoc='pending', causaVerified=false, causaIsValid=null (fallback local H5 idéntico si el micro está caído)",
					fields: "source=auto · verified=false · isValid=null · assoc=pending",
					entry: entry(
						{ ...base, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" },
						pendingView({ expanded: pill("pending"), detail: { chip: pill("pending"), gate: "pending" } }),
					),
				},
				{
					key: `${jur}.pending.stuck`,
					title: "Causa marcada inválida por stuck-worker, folder congelado",
					producer: `${jur}-workers stuck-worker.js: reencola errorCount≥3 cada 2h durante 48h y luego invalida (causa isValid=false) aplicando W1 al folder ('failed') + mail (IOL-2/T2)`,
					fields: "source=auto · verified=false · assoc=pending (causa isValid=false)",
					entry: entry(
						{ ...base, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" },
						pendingView({ expanded: pill("pending"), detail: { chip: pill("pending"), gate: "pending" } }),
					),
					warn: "“Pendiente de verificación” para siempre; el mail dice 'failed' pero la carpeta no.",
				},
				{
					key: `${jur}.pending.reverify`,
					title: "Reverificación manual",
					producer:
						"hub folderController.js:5218 reverifyFolder: causaVerified=false, causaIsValid=$unset, assoc='pending', +1 intento; resetea la causa (modelos IOL sí registrados en el hub)",
					fields: "source=auto · verified=false · assoc=pending · verificationAttempts=1..2",
					entry: entry(
						{ ...base, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
						pendingView({ expanded: pill("pending"), detail: { chip: pill("pending"), gate: "pending" } }),
					),
				},
			],
		},
		{
			row: "pending_selection",
			title: "Seleccionar expediente — chip ámbar clickeable",
			whatUserSees:
				"Chip “Seleccionar expediente” → CausaSelector con los candidatos; detalle: gate “Encontramos más de un expediente”. Email digest UNA sola vez por carpeta.",
			cases: [
				{
					key: `${jur}.pivot.n`,
					title: "N resultados (2 ≤ N ≤ pivotMaxResults)",
					producer: `${jur}-workers folder-updater.js (W3) desde verifier.js: causaId=PIVOTE, assoc='pending_selection', pendingCausaIds=[todos], causaVerified=true, causaIsValid=null`,
					fields: "source=auto · verified=true · isValid=null · assoc=pending_selection · causaId=pivote",
					entry: entry(
						{ ...base, causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
						{
							list: "pending_selection",
							expanded: pill("pending"),
							detail: { chip: pill("pending"), gate: "pending_selection" },
							inAttentionTable: true,
						},
					),
				},
				{
					key: `${jur}.pivot.toomany`,
					title: "Demasiados resultados (> pivotMaxResults) — sample de 10",
					producer: `${jur}-workers pjX-source.js:159 tooMany → trae 10; folder-updater.js (W4): MISMO $set que N resultados; tooManyResults/searchTotalResults solo en la causa y en el history`,
					fields: "source=auto · verified=true · isValid=null · assoc=pending_selection · pendingCausaIds=[10 de M]",
					entry: entry(
						{ ...base, causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
						{
							list: "pending_selection",
							expanded: pill("pending"),
							detail: { chip: pill("pending"), gate: "pending_selection" },
							inAttentionTable: true,
						},
					),
					warn: "El folder guarda tooManyResults/searchTotalResults y el selector muestra “se muestran 10 de M — refiná” (IOL-1, efectivo desde 2026-08-25).",
				},
				{
					key: `${jur}.pivot.reuse`,
					title: "Reuso de un pivote vivo con el mismo searchTerm",
					producer: "hub folderController.js (H4): assoc='pending_selection', pendingCausaIds del pivote existente",
					fields: "source=auto · verified=true · isValid=null · assoc=pending_selection",
					entry: entry(
						{ ...base, causaVerified: true, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
						{
							list: "pending_selection",
							expanded: pill("pending"),
							detail: { chip: pill("pending"), gate: "pending_selection" },
							inAttentionTable: true,
						},
					),
					warn: "Dos usuarios comparten pivote: una resolución global por API reescribe la carpeta del otro.",
				},
			],
		},
		{
			row: "failed",
			title: "Asociación fallida — chip rojo",
			whatUserSees: "Chip rojo “Asociación fallida”. Fila expandida: pill VERDE con CloseCircle rojo.",
			cases: [
				{
					key: `${jur}.failed.zero`,
					title: "0 resultados en el portal",
					producer: `${jur}-workers folder-updater.js (W1): assoc='failed', causaVerified=true, causaIsValid=false, causaAssociationError='Expediente no encontrado'; no limpia pendingCausaIds`,
					fields: "source=auto · verified=true · isValid=false · assoc=failed",
					entry: entry(
						{ ...base, causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" },
						failedView({ expanded: pill("invalid"), detail: { chip: pill("invalid"), gate: "failed" } }),
					),
				},
				{
					key: `${jur}.failed.api`,
					title: "Micro caído y fallback local fallido (sin causaId)",
					producer:
						"hub folderController.js (H6): assoc='failed' + causaAssociationError; causaVerified queda false (default) y sin causaId",
					fields: "source=auto · verified=false · causaId=null · assoc=failed",
					entry: entry(
						{ ...base, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "failed", causaId: null },
						failedView({ expanded: pill("pending"), detail: { chip: pill("pending"), gate: "failed" } }),
					),
					warn: "La fila expandida dice “Pendiente de verificación” (verified=false) cuando el estado real es failed.",
				},
			],
		},
		{
			row: "plain",
			title: "Sin indicador — vuelta a manual",
			whatUserSees:
				"Carátula sin ícono. Fila expandida: cae al chequeo de whitelist de jurisdicción y luego a “Vincular con Poder Judicial”.",
			cases: [
				{
					key: `${jur}.manual.cancel`,
					title: "Usuario canceló la selección",
					producer:
						"hub causaService.js:927-1008 clearPendingCausasFromFolder: source='manual', flags en false, causaId=null, assoc='not_attempted'; conserva judFolder, folderJuris y causaAssociationError viejos",
					fields: "source=manual · flags=false · assoc=not_attempted",
					entry: entry(
						{
							...base,
							source: "manual",
							[jur]: false,
							causaVerified: false,
							causaIsValid: undefined,
							causaAssociationStatus: "not_attempted",
						},
						{
							list: "plain",
							expanded: { label: "Vincular con Poder Judicial", accent: "green", badge: "pending" },
							detail: { chip: { label: "Vincular con Poder Judicial", accent: "green", badge: "pending" }, gate: null },
						},
					),
					warn: isMza
						? "Como nació con folderJuris “Catamarca”, la whitelist pasa por la razón equivocada y el destino apunta a Catamarca."
						: undefined,
				},
			],
		},
		{
			row: "hidden_archived",
			title: "No aparece — archivada",
			whatUserSees: "Solo en el modal Archivadas.",
			cases: [
				{
					key: `${jur}.archived`,
					title: "Archivada por el usuario / downgrade",
					producer: "hub updateFolder / subscriptionService (los flujos IOL nunca tocan archived)",
					fields: "source=auto · archived=true",
					entry: entry(
						{ ...base, archived: true },
						{ hiddenFromList: true, expanded: pill("valid"), detail: { chip: pill("valid"), gate: "archived" } },
					),
				},
			],
		},
	];
};

const iolFindings = (jur: "pjsalta" | "pjcatamarca" | "pjmendoza", prefix: string): GuideFinding[] => {
	const common: GuideFinding[] = [
		{
			id: `${prefix}1`,
			severity: "alta",
			title: "“Demasiados resultados” nunca llega a la UI",
			detail:
				"tooManyResults/searchTotalResults viven solo en la causa y en el history: el CausaSelector muestra 10 candidatos como si fueran el universo; el aviso “N de M — refinar” solo va por email y una sola vez.",
			where: `${jur}-workers pjX-source.js:159 · folder-updater.js (W4) · law-analytics-front CausaSelector.tsx`,
		},
		{
			id: `${prefix}2`,
			severity: "alta",
			title: "stuck-worker invalida la causa pero no el folder",
			detail: "Tras 48h con errores la causa pasa a isValid=false y el folder a 'failed' (W1) con mail; antes (≤48h) se reencola cada 2h.",
			where: `${jur}-workers stuck-worker.js:74-82`,
		},
		{
			id: `${prefix}3`,
			severity: "media",
			title: "Pill siempre verde en la fila expandida",
			detail:
				"La rama IOL de FolderView usa LIVE_GREEN y “Vinculado con …” sin mirar causaAssociationStatus (EJE sí exige success); solo cambia el ícono de 14px.",
			where: "law-analytics-front FolderView.tsx:493-514 · details.tsx:510-527",
		},
		{
			id: `${prefix}4`,
			severity: "media",
			title: "Dos semánticas de resolución de pivote",
			detail:
				"resolve-pivot (API) es global y mueve todos los folders; select-causa (hub) es por folder. Con pivote compartido por searchTerm, la resolución global reescribe la carpeta de otro usuario.",
			where: `${jur}-api causasController.js:218-257 · law-analytics-server causaService.js:820-840`,
		},
		{
			id: `${prefix}5`,
			severity: "media",
			title: "Sin señal cuando el expediente desaparece del portal",
			detail:
				"listRemovedSource admite pjsalta/pjcatamarca/pjmendoza: 3 'no encontrado' consecutivos (notFoundStreak) → listRemoved y badge “Ya no en el portal” (IOL-8).",
			where: "models/Folder.js:638 · updater.js (U2)",
		},
		{
			id: `${prefix}6`,
			severity: "baja",
			title: "storePendingCausas rechaza IOL",
			detail: "causaService y el controller aceptan los 3 tipos IOL (IOL-9); en la práctica pending_selection lo escriben los workers.",
			where: "law-analytics-server causaService.js:629 · folderController.js:5141",
		},
		{
			id: `${prefix}7`,
			severity: "baja",
			title: "Reset de verificación por admin no toca el folder",
			detail: "resetVerification resetea causa (verified=false, errorCount=0) y folder ('pending', causaVerified=false).",
			where: `${jur}-api causasController.js:295`,
		},
	];
	if (jur === "pjmendoza") {
		common.unshift(
			{
				id: `${prefix}0a`,
				severity: "alta",
				title: "Default de Mendoza corregido (“Mendoza - 1ª Circunscripción - Mendoza”, IOL-3; 3 carpetas backfilleadas)",
				detail:
					"defaultMendozaFolderJuris = { label: 'Catamarca', item: 'Catamarca - 1ª Circunscripción - Capital' }. Solo se corrige si el verifier encuentra 1 resultado con overwrite; nunca en pending/failed/pivote ni en la resolución por API.",
				where: "law-analytics-server folderController.js:1781, :1795, :1811",
			},
			{
				id: `${prefix}0b`,
				severity: "alta",
				title: "Resolución de pivote degradada",
				detail:
					"moveFoldersFromPivotToSelected de Mendoza no lee el folder, ignora overwrite y no propaga carátula/materia/folderJuris/judFolder ni limpia causaAssociationError.",
				where: "pjmendoza-workers/src/services/folder-updater.js:150-182 · pjmendoza-api folder-updater.js",
			},
			{
				id: `${prefix}0c`,
				severity: "media",
				title: "judFolder reemplazado entero en el escenario de 1 resultado",
				detail:
					"Mendoza escribe judFolder = { numberJudFolder } sin merge: borra courtNumber/secretaryNumber/initialDateJudFolder y nunca escribe judFolder.cuij (índice sparse vacío).",
				where: "pjmendoza-workers folder-updater.js:84-86 vs pjsalta :96-104",
			},
		);
	}
	if (jur !== "pjsalta") {
		common.push({
			id: `${prefix}8`,
			severity: "baja",
			title: "deleteFolder sin rama propia",
			detail: "Las 3 IOL tienen rama propia en deleteFolderById con fallback local (IOL-11) (sin updateHistory).",
			where: "law-analytics-server folderController.js:3097-3140",
		});
	}
	return common;
};

export const PJSALTA_GROUPS = iolGroups("pjsalta", "PJ Salta");
export const PJCATAMARCA_GROUPS = iolGroups("pjcatamarca", "PJ Catamarca");
export const PJMENDOZA_GROUPS = iolGroups("pjmendoza", "PJ Mendoza");
export const PJSALTA_FINDINGS = iolFindings("pjsalta", "SA");
export const PJCATAMARCA_FINDINGS = iolFindings("pjcatamarca", "CA");
export const PJMENDOZA_FINDINGS = iolFindings("pjmendoza", "MZ");

export type GuideJurisdiction = "pjn" | "mev" | "eje" | "scba" | "pjsalta" | "pjcatamarca" | "pjmendoza";

export const JURISDICTIONS: Array<{ key: GuideJurisdiction; label: string }> = [
	{ key: "pjn", label: "PJN" },
	{ key: "mev", label: "MEV" },
	{ key: "eje", label: "EJE (CABA)" },
	{ key: "scba", label: "SCBA" },
	{ key: "pjsalta", label: "PJ Salta" },
	{ key: "pjcatamarca", label: "PJ Catamarca" },
	{ key: "pjmendoza", label: "PJ Mendoza" },
];

export const GUIDE_BY_JURISDICTION: Record<
	GuideJurisdiction,
	{ groups: GuideGroup[]; findings: GuideFinding[]; note?: string; caption?: string }
> = {
	pjn: {
		groups: PJN_GROUPS,
		findings: PJN_FINDINGS,
		caption:
			"Todas las filas posibles del listado PJN (según los estados que escriben pjn-workers, el hub y pjn-mis-causas) y cómo se distribuyen hoy en la base.",
	},
	mev: {
		groups: MEV_GROUPS,
		findings: MEV_FINDINGS,
		caption:
			"Todas las filas posibles del listado MEV (según los estados que escriben mev-workers, mev-api y el hub — alta, link, unlink, credenciales, archivado) y cómo se distribuyen hoy en la base. Incluye las carpetas desvinculadas (previousSyncSource='mev').",
	},
	eje: { groups: EJE_GROUPS, findings: EJE_FINDINGS },
	scba: { groups: SCBA_GROUPS, findings: SCBA_FINDINGS },
	pjsalta: { groups: PJSALTA_GROUPS, findings: PJSALTA_FINDINGS },
	pjcatamarca: { groups: PJCATAMARCA_GROUPS, findings: PJCATAMARCA_FINDINGS },
	pjmendoza: { groups: PJMENDOZA_GROUPS, findings: PJMENDOZA_FINDINGS },
};
