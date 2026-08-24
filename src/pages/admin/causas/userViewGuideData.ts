import { CausaUserViewEntry } from "api/pjnCredentials";
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

export const GUIDE_GROUPS: GuideGroup[] = [
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
						detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "reserved_revoked" },
						contentBlocked: true,
					},
					[{ ...credOk[0], removedFromSync: true, access: "revoked" }],
				),
				warn: "La LISTA la muestra como OK; recién al abrir el detalle aparece el gate “Tu credencial ya no accede a este expediente” y el server responde 403 en movimientos/PDFs.",
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
						list: "reserved",
						expanded: { label: "PJN — Causa reservada", accent: "red", badge: "reserved" },
						detail: { chip: { label: "PJN — Reservada (con acceso)", accent: "green", badge: "valid" }, gate: null },
						isPjnPrivateCovered: true,
					},
					credOk,
				),
				warn: "La LISTA la pinta en rojo “reservada” (no recibe causaCredentialCovered) mientras el detalle dice verde “Reservada (con acceso)”.",
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
				warn: "Es la combinación MÁS frecuente en la base hoy: se ve OK en la lista, y en el detalle salta el gate de reservada. Los predicados del front (causaIsPrivate===true && covered) no matchean.",
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

export const GUIDE_FINDINGS: GuideFinding[] = [
	{
		id: "F1",
		severity: "alta",
		title: "“Ya no en la lista” no se marca desde el 24/04/2026",
		detail:
			"El schema local de Folder en pjn-mis-causas no declara listRemoved/listRemovedSource/listRemovedAt y Folder.bulkWrite corre en modo strict: el $set se descarta y solo se ejecuta $unset pjnNotFound. Los contadores y logs reportan “N marcados” igual.",
		where: "pjn-mis-causas src/models/folder.js (falta el campo) · src/services/causa-sync-service.js:1808-1837",
	},
	{
		id: "F2",
		severity: "alta",
		title: "Acceso revocado / reservada invisible en la lista",
		detail:
			"La lista no recibe causaCredentialCovered (store/reducers/folder.ts:271,298,572,620 no lo proyectan) y solo marca “reservada” si causaIsPrivate=true y source≠pjn-login. Resultado: carpetas con gate de reservada en el detalle se ven OK en la lista (5 no archivadas hoy; 146 archivadas).",
		where: "law-analytics-front folders.tsx:2733 · store/reducers/folder.ts · details.tsx:710",
	},
	{
		id: "F3",
		severity: "alta",
		title: "causaIsPrivate solo se escribe en la transición",
		detail:
			"Un folder creado sobre una causa que YA era privada (o desde caché privado) nunca recibe causaIsPrivate=true, pero sí causaCredentialCovered. Los predicados del front que exigen causaIsPrivate===true no matchean → ni “reservada” en la lista ni “Reservada (con acceso)” en el detalle.",
		where:
			"pjn-mis-causas private-causas-update-worker.js:1767 y :1560 (únicos escritores) · causa-sync-service.js:1268 (ensureFolder con existingCausa=null)",
	},
	{
		id: "F4",
		severity: "alta",
		title: "Despritavización asimétrica → gate residual",
		detail:
			"El privacy-checker (resetToPublic) hace $unset causaPrivateDetectedAt pero NO $unset causaCredentialCovered; el worker privado sí. Una causa vuelta pública por el checker puede quedar con causaCredentialCovered=false y el detalle sigue bloqueando (403 CAUSA_RESERVED).",
		where: "pjn-workers pjn-privacy-checker-worker.js:381-388 vs pjn-mis-causas private-causas-update-worker.js:1560-1566",
	},
	{
		id: "F5",
		severity: "media",
		title: "Reverificación del usuario casi nunca llega al worker",
		detail:
			"reverifyFolder resetea la causa solo si mongoose.models[causaType] existe (4 de 28 fueros), y verify-worker toma solo causas source='app' sin carátula ni movimientos. La carpeta queda pendiente para siempre, gastando 1 de 2 intentos que nunca se resetean.",
		where: "law-analytics-server folderController.js:5218-5340 · pjn-workers verify-worker.js:284-303",
	},
	{
		id: "F6",
		severity: "media",
		title: "Estados fuera del enum / no contemplados por el front",
		detail:
			"Unlink keep escribe causaAssociationStatus=null con el driver crudo; not_attempted es default del schema. Ninguno tiene branch en el front: caen en “pendiente” con un refresh que no hace nada.",
		where: "law-analytics-server pjnCredentialsController.js:217-232 · folderController.js:655 · causaService.js:940",
	},
	{
		id: "F7",
		severity: "media",
		title: "Status 'success' hardcodeado con causa inválida o no verificada",
		detail:
			"Alta por BD local/caché y sync de Mis Causas hardcodean assoc='success' (y el sync causaVerified=true) sin mirar verified/isValid de la causa. Combos (false,null,'success') y (true,false,'success') existen en la base.",
		where: "law-analytics-server folderController.js:2489,2585,4474,4578 · pjn-mis-causas causa-sync-service.js:947-950",
	},
	{
		id: "F8",
		severity: "media",
		title: "Handoff a privada deja el folder congelado en pendiente",
		detail:
			"Cuando el portal público rechaza una causa con credencial vinculada, verify-worker marca la causa privada pero no toca el folder; solo se promueve para usuarios cubiertos. Terceros quedan pendientes indefinidamente.",
		where: "pjn-workers verify-worker.js:976-991 · pjn-mis-causas private-causas-update-worker.js:2052",
	},
	{
		id: "F9",
		severity: "media",
		title: "Sin estado intermedio cuando la causa deja de ser accesible",
		detail:
			"app-update-worker solo incrementa accessFailureCount; hasta que el privacy-checker cruce el umbral (cron 3AM/3PM) el folder se ve OK y verified. Además accessFailureCount es por folder pero causa.isPrivate es global: los demás usuarios de la misma causa no se marcan.",
		where: "pjn-workers app-update-worker.js:1815 · pjn-privacy-checker-worker.js:312",
	},
	{
		id: "F10",
		severity: "baja",
		title: "Mensajes distintos para el mismo estado",
		detail:
			"failed+verified: la lista dice “Asociación fallida”, la fila expandida “Causa inválida” y el detalle gate failed. reservada cubierta: lista roja “reservada”, detalle verde “con acceso”.",
		where: "law-analytics-front folders.tsx:2860 vs FolderView.tsx:356-393 vs details.tsx:439-462",
	},
	{
		id: "F11",
		severity: "baja",
		title: "scrapingProgress y metadata son globales por causa, no por usuario",
		detail:
			"updateFoldersScrapingProgress/updateAssociatedFolders hacen updateMany({causaId}) sobre todos los folders de la causa: el spinner del scrape de una credencial aparece en la lista de otro usuario, y overwrite pisa nombres de todos.",
		where: "pjn-mis-causas private-causas-update-worker.js:1356,1425",
	},
	{
		id: "F12",
		severity: "baja",
		title: "Re-link tras keep no limpia previousSyncSource y fuerza overwrite",
		detail:
			"El folder vuelve a pjn-login con previousSyncSource='pjn' residual (bloquea “Vincular con Poder Judicial”) y overwrite=true pisa el nombre que el usuario haya puesto durante el keep.",
		where: "pjn-mis-causas causa-sync-service.js:838-848",
	},
];
