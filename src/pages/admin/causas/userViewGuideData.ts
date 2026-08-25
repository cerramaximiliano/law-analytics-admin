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

export const PJN_FINDINGS: GuideFinding[] = [
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

// =====================================================================
// MEV — Mesa de Entradas Virtual (Buenos Aires). Sin flujo "Mis Causas":
// todo folder MEV nace del hub con source=auto. Credencial por folder
// (mevCredentialStatus) que el worker actualiza al loguear.
// =====================================================================

const mevBase: F = { source: "auto", pjn: false, mev: true };

const credStatusView = (): V => ({
	list: "cred_status",
	expanded: { label: "Vinculado con MEV", accent: "green", badge: "valid" },
	detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "valid" }, gate: null },
});

export const MEV_GROUPS: GuideGroup[] = [
	{
		row: "ok",
		title: "OK — carátula + tilde azul",
		whatUserSees: "Carátula + tilde azul (tooltip “Causa vinculada a MEV”). Fila expandida/detalle: pill verde “Vinculado con MEV”.",
		cases: [
			{
				key: "mev.ok.valid",
				title: "Verificada con credencial válida (estado feliz)",
				producer:
					"mev-workers folder-updater.js:99 updateAssociatedFolders(isValid=true) → verified/isValid/‘success’ + user-credential-notifier.js:179 mevCredentialStatus='valid'",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=valid",
				entry: entry({ ...mevBase }, {}),
			},
			{
				key: "mev.ok.pending_cred",
				title: "Verificada pero credencial aún en 'pending'",
				producer:
					"folder-updater.js:99 corrió pero el notifier no (dedup por credencial ya notificada 'valid' en otra causa, user-credential-notifier.js:190)",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=pending",
				entry: entry({ ...mevBase }, {}),
				warn: "Se ve OK aunque el estado de credencial del folder nunca se confirmó.",
			},
			{
				key: "mev.ok.disabled_toggle",
				title: "Credencial deshabilitada por el usuario (toggle)",
				producer: "hub mevCredentialsController.js:546 toggleCredentials: solo MevCredentials.enabled — NO escribe folders",
				fields: "source=auto · verified=true · isValid=true · assoc=success · mevCred=valid",
				entry: entry({ ...mevBase }, {}),
				warn: "Ningún indicador en la lista: el usuario apagó el seguimiento y la carpeta se ve sincronizada.",
			},
		],
	},
	{
		row: "cred_status",
		title: "Credencial MEV requerida / expirada / desactivada — chip ámbar",
		whatUserSees:
			"Chip ámbar clickeable (“Credencial requerida” / “Credencial inválida” / “Contraseña expirada” / “Credencial desactivada”) que lleva a Perfil → Integraciones → MEV. Se evalúa ANTES de pendiente/inválida pero DESPUÉS de fallida.",
		cases: [
			{
				key: "mev.cred.missing",
				title: "Sin credencial (missing)",
				producer:
					"mev-workers user-credential-notifier.js:251 markCredentialMissing (resolveCredentials → 'none', solo desde null|valid) o hub mevCredentialsController.js:435 deleteCredentials (desde cualquier estado)",
				fields: "source=auto · mevCred=missing · verified/isValid como estaban",
				entry: entry({ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" }, credStatusView()),
				warn: "Es el 69% de las carpetas MEV no archivadas hoy. deleteCredentials pisa 'expired'/'disabled' con 'missing' y se pierde el diagnóstico.",
			},
			{
				key: "mev.cred.expired",
				title: "Contraseña expirada",
				producer:
					"mev-workers user-credential-notifier.js:169-182 notifyCredentialResult (isExpired) → mevCredentialStatus='expired' + causaVerified=true, causaIsValid=false (sin tocar assoc, a propósito)",
				fields: "source=auto · verified=true · isValid=false · assoc=success|pending · mevCred=expired",
				entry: entry({ ...mevBase, causaVerified: true, causaIsValid: false }, credStatusView()),
				warn: "La fila expandida y el detalle NO leen mevCredentialStatus: muestran badge rojo “Causa inválida” cuando el problema es la contraseña.",
			},
			{
				key: "mev.cred.disabled",
				title: "Credencial auto-desactivada por fallos repetidos",
				producer:
					"mev-workers verify-worker.js:1172 / update-worker.js:594: failResult.disabled tras 5 fallos → notifyCredentialResult → mevCredentialStatus='disabled'",
				fields: "source=auto · verified=true · isValid=false · mevCred=disabled",
				entry: entry({ ...mevBase, causaVerified: true, causaIsValid: false }, credStatusView()),
			},
			{
				key: "mev.cred.invalid",
				title: "Credencial inválida (prácticamente inalcanzable)",
				producer:
					"user-credential-notifier.js:159 newStatus='invalid' solo si !success && !isExpired && !disabled, pero el debounce (verify-worker.js:1169: definitive = isExpiration || disabled) nunca lo deja pasar",
				fields: "source=auto · mevCred=invalid",
				entry: entry({ ...mevBase, causaVerified: true, causaIsValid: false }, credStatusView()),
				warn: "El front, el reset del hub y los emails contemplan 'invalid', pero un usuario con contraseña mal cargada ve 5 ciclos de “Pendiente” y salta directo a 'disabled'.",
			},
		],
	},
	{
		row: "pending",
		title: "Pendiente de verificación — chip ámbar",
		whatUserSees: "Chip ámbar “Pendiente de verificación” + refresh. Tabla de atención. Detalle: gate “Estamos buscando este expediente”.",
		cases: [
			{
				key: "mev.pending.new",
				title: "Alta nueva esperando al verify cluster",
				producer:
					"hub folderController.js:2230 (mev-api associate-folder, verified=false → assoc='pending') + :2276 mevCredentialStatus='pending'",
				fields: "source=auto · verified=false · isValid=null · assoc=pending · mevCred=pending",
				entry: entry({ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" }, pendingView()),
			},
			{
				key: "mev.pending.reset",
				title: "Usuario recargó la credencial (reset)",
				producer:
					"hub mevCredentialsController.js:50-68 resetMevFolders: mevCred='pending' + causaVerified=false, assoc='pending', $unset causaIsValid (solo folders en invalid|expired|disabled|missing)",
				fields: "source=auto · verified=false · isValid=(ausente) · assoc=pending · mevCred=pending",
				entry: entry({ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" }, pendingView()),
			},
			{
				key: "mev.pending.link_nocred",
				title: "Vinculada por linkFolderToCausa sin credencial",
				producer: "hub folderController.js:4025-4130 (rama MEV de link): no exige credencial ni escribe mevCredentialStatus (queda null)",
				fields: "source=auto · verified=false · assoc=pending · mevCred=null",
				entry: entry({ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" }, pendingView()),
				warn: "Pendiente sin acción posible hasta que el worker la saltee y la marque 'missing'.",
			},
			{
				key: "mev.pending.reverify",
				title: "Reverificación manual",
				producer:
					"hub folderController.js:5288 reverifyFolder: causaVerified=false, assoc='pending', +1 intento; NO toca mevCredentialStatus",
				fields: "source=auto · verified=false · assoc=pending · mevCred=(sin cambio)",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
					pendingView(),
				),
			},
		],
	},
	{
		row: "pending_selection",
		title: "Seleccionar expediente — chip ámbar clickeable",
		whatUserSees: "Chip “Seleccionar expediente” + warning. Detalle: gate “Encontramos más de un expediente”.",
		cases: [
			{
				key: "mev.pending_selection",
				title: "Búsqueda MEV con varios resultados",
				producer:
					"hub causaService.js:641 storePendingCausasInFolder: pendingCausaIds, pendingCausaType='MEV', assoc='pending_selection' (no toca verified/isValid ni mevCredentialStatus)",
				fields: "source=auto · assoc=pending_selection · pendingCausaIds=[…] · mevCred=null",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending_selection" },
					{
						list: "pending_selection",
						expanded: { label: "Vinculado con MEV", accent: "green", badge: "pending" },
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
		whatUserSees: "Chip rojo “Asociación fallida” (tooltip “Verifique los datos ingresados”). Gana sobre el chip de credencial.",
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
					failedView({
						expanded: { label: "Vinculado con MEV", accent: "green", badge: "invalid" },
						detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "invalid" }, gate: "failed" },
					}),
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
					failedView({
						expanded: { label: "Vinculado con MEV", accent: "green", badge: "invalid" },
						detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "invalid" }, gate: "failed" },
					}),
				),
				warn: "Indistinguible de “no existe el expediente”; el usuario lee “Verifique los datos ingresados”.",
			},
			{
				key: "mev.failed.api_down",
				title: "mev-api caído en el alta",
				producer: "hub folderController.js:2395: assoc='failed', causaAssociationError, sin causaId ni mevCredentialStatus",
				fields: "source=auto · causaId=null · assoc=failed · mevCred=null",
				entry: entry(
					{ ...mevBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "failed", causaId: null },
					failedView({
						expanded: { label: "Vinculado con MEV", accent: "green", badge: "pending" },
						detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "pending" }, gate: "failed" },
					}),
				),
				warn: "El reintento del usuario pone 'pending' y espera un worker que nunca la tomará (no hay causaId).",
			},
			{
				key: "mev.failed.cred_masked",
				title: "Fallida + credencial expirada/desactivada",
				producer: "folder-updater.js:45 escribe 'failed' aunque el notifier lo evita a propósito (user-credential-notifier.js:167)",
				fields: "source=auto · assoc=failed · mevCred=expired|disabled",
				entry: entry(
					{ ...mevBase, causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" },
					failedView({
						expanded: { label: "Vinculado con MEV", accent: "green", badge: "invalid" },
						detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "invalid" }, gate: "failed" },
					}),
				),
				warn: "“Asociación fallida — verifique los datos” tapa el chip de credencial: no hay nada que verificar en los datos.",
			},
		],
	},
	{
		row: "hidden_archived",
		title: "No aparece — archivada",
		whatUserSees: "No está en la lista principal. Detalle: gate archivada.",
		cases: [
			{
				key: "mev.archived.downgrade",
				title: "Archivada por baja de plan",
				producer:
					"hub subscriptionService.js:2977 archiveFolders (las más viejas por updatedAt) — no desasocia la causa, el worker sigue escribiendo el folder",
				fields: "source=auto · archived=true",
				entry: entry(
					{ ...mevBase, archived: true },
					{ hiddenFromList: true, detail: { chip: { label: "Vinculado con MEV", accent: "green", badge: "valid" }, gate: "archived" } },
				),
				warn: "73% de las carpetas MEV están archivadas; el scraping sigue consumiendo la credencial del usuario sobre carpetas que no ve.",
			},
		],
	},
];

export const MEV_FINDINGS: GuideFinding[] = [
	{
		id: "M1",
		severity: "alta",
		title: "“Asociación fallida” tapa el estado de credencial",
		detail:
			"folder-updater.js acopla isValid=false ⇒ assoc='failed', y la lista evalúa failed antes que mevCredentialStatus. Con contraseña expirada/desactivada el usuario lee “Verifique los datos ingresados”.",
		where: "mev-workers utils/folder-updater.js:45 · law-analytics-front folders.tsx:2869 vs :2910",
	},
	{
		id: "M2",
		severity: "alta",
		title: "“Causa inválida” en el detalle cuando el problema es la credencial",
		detail:
			"notifyCredentialResult escribe causaVerified=true,causaIsValid=false ante fallo de login; FolderView/details no leen mevCredentialStatus y muestran badge rojo “Causa inválida”.",
		where: "mev-workers services/user-credential-notifier.js:176 · FolderView.tsx:428",
	},
	{
		id: "M3",
		severity: "media",
		title: "mevCredentialStatus='invalid' inalcanzable",
		detail: "El debounce solo deja pasar expiración o disabled. Contraseña mal cargada → 5 ciclos “Pendiente” → 'disabled'.",
		where: "mev-workers verify-worker.js:1169 · update-worker.js:594",
	},
	{
		id: "M4",
		severity: "media",
		title: "linkFolderToCausa MEV no exige credencial",
		detail:
			"createFolder borra el folder si falta credencial; link no valida nada y deja mevCredentialStatus=null → pendiente indefinido hasta que el worker la marque 'missing'.",
		where: "law-analytics-server folderController.js:4025-4130 vs :2054-2070",
	},
	{
		id: "M5",
		severity: "media",
		title: "mev-api caído = “verifique los datos” sin salida",
		detail: "assoc='failed' sin causaId; reverify pone 'pending' y espera un worker que nunca la tomará; consume verificationAttempts.",
		where: "law-analytics-server folderController.js:2395 · :5288",
	},
	{
		id: "M6",
		severity: "media",
		title: "deleteCredentials pisa 'expired'/'disabled' con 'missing'",
		detail: "No filtra por estado previo (markCredentialMissing sí) → se pierde el diagnóstico en el copy.",
		where: "law-analytics-server mevCredentialsController.js:435-441",
	},
	{
		id: "M7",
		severity: "baja",
		title: "Rama “Ya no en la lista” MEV es código muerto",
		detail:
			"source='mev-login', listRemovedSource='mev' y previousSyncSource='mev' están en el enum y en el front pero ningún productor los escribe (no existe Mis Causas MEV ni unlink keep).",
		where: "Folder.js:323,337,638 · folders.tsx:2734 · details.tsx:399",
	},
	{
		id: "M8",
		severity: "baja",
		title: "Archivado por downgrade no pausa el scraping",
		detail:
			"archiveFolders no desasocia; el worker sigue gastando la credencial y escribiendo carpetas archivadas. archiveFoldersByIds desasocia contra CAUSAS_SERVICE_URL, no MEV.",
		where: "law-analytics-server subscriptionService.js:2977 · :2769",
	},
	{
		id: "M9",
		severity: "baja",
		title: "Cancelar selección deja mevCredentialStatus residual",
		detail: "clearPendingCausas no limpia mevCredentialStatus/mevCredentialId/mevCredentialError en la carpeta que vuelve a manual.",
		where: "law-analytics-server causaService.js:941-975",
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
				warn: "Se ve OK pero conserva ids de selección colgados (índice pendingCausaIds los sigue encontrando).",
			},
			{
				key: "eje.ok.selected",
				title: "Usuario eligió una causa del pivote",
				producer:
					"hub causaService.js:886-905 selectPendingCausaForFolder: assoc='success', causaVerified=causa.verified||false, causaIsValid=causa.isValid!==false (optimista), causaUpdateEnabled=hasPaidSubscription; no limpia searchTerm",
				fields: "source=auto · verified=<causa> · isValid=true · assoc=success",
				entry: entry({ ...ejeBase }, { expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: null } }),
				warn: "Si la causa candidata nacía con verified=false, el folder queda (false, true, 'success'): pendiente en la tabla pero pill verde.",
			},
			{
				key: "eje.ok.admin_resolve",
				title: "Admin resolvió el pivote",
				producer: "eje-api causasEjeController.js:672-694 resolvePivot: para cada folder del pivote → causaId elegido, assoc='success'",
				fields: "source=auto · verified=true · isValid=true · assoc=success",
				entry: entry({ ...ejeBase }, { expanded: ejePill("valid"), detail: { chip: ejePill("valid"), gate: null } }),
				warn: "Pisa la selección previa del usuario porque EJE no saca el folder de pivot.folderIds al seleccionar.",
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
				warn: "Pendiente eterno: el pivote nunca se re-procesa, el flusher lo marca skipped y consumió 1 de 2 intentos.",
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
				warn: "Sin causa que reverificar; se ve igual que una fallida normal.",
			},
		],
	},
	{
		row: "invisible",
		title: "INVISIBLE — no aparece en ninguna tabla",
		whatUserSees:
			"No cae en la tabla principal (exige verified+isValid=true) ni en “requieren tu atención” (exige verified=false, inválida, failed o pending_selection). La carpeta existe pero el usuario no la ve en la lista; si entra por URL, ve el detalle completo de un pivote.",
		cases: [
			{
				key: "eje.invisible.link_pivot",
				title: "linkFolderToCausa contra un pivote",
				producer:
					"hub folderController.js:4246 associationStatus = verified===false ? 'pending' : 'success' — ignora isPivot y causaAssociationStatus de eje-api → (true, null, 'success') con causaId=pivote y sin pendingCausaIds",
				fields: "source=auto · verified=true · isValid=null · assoc=success · causaId=pivote",
				entry: entry(
					{ ...ejeBase, causaVerified: true, causaIsValid: undefined },
					{ list: "plain", expanded: ejePill("invalid"), detail: { chip: ejePill("invalid"), gate: null }, inAttentionTable: false },
				),
				warn: "Fila expandida: “Vinculado con EJE” + badge rojo “Causa inválida”; detalle: sin gate, muestra el pivote como si fuera la causa.",
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
					"hub subscriptionService.js (agnóstico de fuente) archived=true; los workers EJE no filtran archived y siguen escribiendo",
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
		title: "Link a un pivote → carpeta invisible",
		detail:
			"linkFolderToCausa ignora isPivot y deja (verified:true, isValid:null, 'success') con causaId=pivote: no entra en ninguna de las dos tablas de la lista; el detalle muestra el pivote sin gate.",
		where: "law-analytics-server folderController.js:4246 · folders.tsx:1945-1988",
	},
	{
		id: "E2",
		severity: "alta",
		title: "Reverificar un pivote es un callejón sin salida",
		detail:
			"reverify pone 'pending' y resetea el pivote, pero verification-worker excluye isPivot; el flusher lo marca skipped; consume 1 de 2 intentos.",
		where: "law-analytics-server folderController.js:5294 · eje-workers verification-worker.ts:84 · pending-selection-flusher.ts:256",
	},
	{
		id: "E3",
		severity: "media",
		title: "EJE no desreferencia el pivote al seleccionar/cancelar",
		detail:
			"causaService solo hace $pull de pivot.folderIds para PjSalta/PjCatamarca/PjMendoza. En EJE un resolvePivot posterior del admin pisa la elección del usuario, y una carpeta vuelta manual sigue recibiendo writes de update/stuck.",
		where: "law-analytics-server causaService.js:823-853, :984-994 · eje-api causasEjeController.js:672",
	},
	{
		id: "E4",
		severity: "media",
		title: "Dedupe deja pendingCausaIds residuales",
		detail: "El camino “1 resultado ya existente” no limpia pendingCausaIds/pendingCausaType/searchTerm ni setea eje:true.",
		where: "eje-workers verification-worker.ts:470-492 vs :161-166",
	},
	{
		id: "E5",
		severity: "media",
		title: "pending y failed se pintan verde en la fila expandida",
		detail:
			"FolderView no tiene pill propia para EJE pendiente/fallida: caen en la rama genérica verde “Vinculado con EJE” con solo el badge chico distinto.",
		where: "law-analytics-front FolderView.tsx:396, :492",
	},
	{
		id: "E6",
		severity: "baja",
		title: "causaIsValid optimista al seleccionar",
		detail:
			"selectPendingCausaForFolder escribe causaIsValid = causa.isValid !== false (true si null) → (false, true, 'success') contradictoria.",
		where: "law-analytics-server causaService.js:851",
	},
	{
		id: "E7",
		severity: "baja",
		title: "Duplicados EJE no controlados",
		detail:
			"El chequeo de duplicado por expediente en createFolder filtra pjn|mev; EJE no está → dos carpetas para el mismo CUIJ, ambas en CausasEje.folderIds.",
		where: "law-analytics-server folderController.js:620-626",
	},
	{
		id: "E8",
		severity: "baja",
		title: "folderJuris divergente",
		detail:
			"link escribe item 'EJE - Expediente Judicial Electrónico' que no existe en el selector; worker y alta usan 'CABA - Contencioso Administrativo y Tributario'.",
		where: "folderController.js:4265 vs :808 / verification-worker.ts:194",
	},
];

// =====================================================================
// SCBA — portal autenticado con credencial (Mis Causas SCBA). Folders
// creados por el sync con verified/isValid hardcodeados en true.
// =====================================================================

const scbaBase: F = { source: "scba-login", pjn: false, scba: true };
const scbaPill = (label: string, accent: "green" | "amber", badge: string) => ({ label, accent, badge });

export const SCBA_GROUPS: GuideGroup[] = [
	{
		row: "ok",
		title: "OK — carátula + tilde azul",
		whatUserSees: "Carátula + tilde azul (“Causa vinculada a SCBA”). Fila expandida: pill verde “Vinculado con SCBA”.",
		cases: [
			{
				key: "scba.ok.synced",
				title: "Sincronizada y scrapeada (nominal)",
				producer:
					"scba-workers folder-service.ts:398-463 ensureFolder (insertOne con causaVerified=true, causaIsValid=true, assoc='success' HARDCODEADOS) + :510 updateFolderFromCausa tras el scraping",
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
				title: "Recién creada, sin movimientos aún (o scraping fallido)",
				producer:
					"folder-service.ts:398 con scrapingProgress pending; initial-scraping-worker.ts:569 escribe el error solo en la causa, el folder queda igual",
				fields: "source=scba-login · verified=true · isValid=true · movementsCount=0 · scrapingProgress=pending",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					credOk,
				),
				warn: "Tilde verde desde el instante 0 aunque la causa nunca se haya scrapeado; un fallo del scraping inicial es indistinguible.",
			},
			{
				key: "scba.ok.toggle_off",
				title: "Usuario apagó el seguimiento (toggle)",
				producer:
					"hub scbaCredentialsController.js:34 propagateTracking(false) → causaUpdateEnabled=false en folders; el front no lee causaUpdateEnabled",
				fields: "source=scba-login · causaUpdateEnabled=false · cred.enabled=false",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					[{ ...credOk[0], credentialEnabled: false }],
				),
				warn: "Completamente invisible en la UI.",
			},
			{
				key: "scba.ok.shared",
				title: "Causa compartida: el 2º usuario no tiene carpeta",
				producer:
					"folder-service.ts:262-265 findOne({causaId, causaType}) sin userId → isNew:false y no se crea folder para el segundo usuario",
				fields: "(sin folder para ese usuario)",
				entry: entry(
					{ ...scbaBase },
					{
						expanded: scbaPill("Vinculado con SCBA", "green", "valid"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "valid"), gate: null },
					},
					credOk,
				),
				warn: "La causa está en su userCausaIds pero no aparece en su lista.",
			},
		],
	},
	{
		row: "ok_cred_error",
		title: "OK con credencial en error — warning ámbar",
		whatUserSees:
			"Carátula + warning ámbar (“SCBA — Sincronización pausada: tus credenciales fueron rechazadas…”). Fila expandida/detalle: pill “SCBA — Sincronización pausada”. Global por usuario.",
		cases: [
			{
				key: "scba.cred.rejected",
				title: "Rechazo de contraseña confirmado",
				producer:
					"scba-workers credential-state.ts:524 markCredentialErroredAndNotify → cred syncStatus='error' (CREDENTIAL_INVALID) + propagateTracking(false) → causaUpdateEnabled=false",
				fields: "source=scba-login · cred.syncStatus=error · causaUpdateEnabled=false",
				entry: entry(
					{ ...scbaBase },
					{
						list: "ok_cred_error",
						expanded: scbaPill("SCBA — Sincronización pausada", "amber", "valid"),
						detail: { chip: scbaPill("SCBA — Sincronización pausada", "amber", "valid"), gate: null },
						credError: { code: "SCBA_ERROR", message: "Credenciales rechazadas" },
					},
					[{ ...credOk[0], credentialValid: false, credentialSyncStatus: "error" }],
				),
			},
			{
				key: "scba.cred.syncerror",
				title: "Error de scraping (no de contraseña) — mismo aviso",
				producer:
					"scba-workers verification-worker.ts:203 markSyncError → syncStatus='error' (SYNC_ERROR) sin tocar folders; useScbaCredentialError solo mira syncStatus==='error'",
				fields: "source=scba-login · cred.syncStatus=error · causaUpdateEnabled=true",
				entry: entry(
					{ ...scbaBase },
					{
						list: "ok_cred_error",
						expanded: scbaPill("SCBA — Sincronización pausada", "amber", "valid"),
						detail: { chip: scbaPill("SCBA — Sincronización pausada", "amber", "valid"), gate: null },
						credError: { code: "SYNC_ERROR", message: "Fallo del scraping" },
					},
					[{ ...credOk[0], credentialSyncStatus: "error" }],
				),
				warn: "Copy falsa: dice “credenciales rechazadas” y el tracking sigue activo.",
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
				title: "Baja detectada por list-audit",
				producer:
					"scba-workers list-audit-worker.ts:298-315: listRemoved=true, listRemovedSource='scba', listRemovedAt (updateMany por causaId). Se limpia en scba-upsert.ts:224 si la causa reaparece",
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
				warn: "A diferencia de PJN, acá SÍ se escribe (driver nativo, sin strict). Sobrevive al unlink keep y revive al re-link aunque la causa esté activa.",
			},
		],
	},
	{
		row: "pending",
		title: "Pendiente de verificación — chip ámbar (terminal)",
		whatUserSees: "Chip ámbar “Pendiente de verificación” + refresh.",
		cases: [
			{
				key: "scba.pending.reverify",
				title: "Reverificación manual — sin consumidor",
				producer:
					"hub folderController.js:5288 reverifyFolder: causaVerified=false, assoc='pending'; ningún worker SCBA vuelve a escribir causaVerified fuera de la creación/re-link",
				fields: "source=scba-login · verified=false · assoc=pending · verificationAttempts=1..2",
				entry: entry(
					{ ...scbaBase, causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending", verificationAttempts: 1 },
					pendingView({
						expanded: scbaPill("Vinculado con SCBA", "green", "pending"),
						detail: { chip: scbaPill("Vinculado con SCBA", "green", "pending"), gate: "pending" },
					}),
					credOk,
				),
				warn: "Estado terminal: queda pendiente para siempre con los 2 intentos consumidos.",
			},
		],
	},
	{
		row: "plain",
		title: "Sin indicador — desvinculada (keep)",
		whatUserSees:
			"Carátula sin ícono (scba=false). Fila expandida/detalle: pill ámbar “Sincronización pausada (era SCBA)”; botón “Vincular con Poder Judicial” bloqueado.",
		cases: [
			{
				key: "scba.keep",
				title: "Unlink modo keep",
				producer:
					"hub scbaCredentialsController.js:258-273 executeScbaKeepMode (driver nativo): source='manual', scba=false, causaId=null, causaVerified=false, causaIsValid=false, assoc=NULL, causaUpdateEnabled=false, previousSyncSource='scba'; movimientos materializados como snapshot",
				fields: "source=manual · scba=false · assoc=null · previousSyncSource=scba",
				entry: entry(
					{ ...scbaBase, source: "manual", scba: false, causaVerified: false, causaIsValid: false, causaAssociationStatus: undefined },
					{
						list: "plain",
						expanded: scbaPill("Sincronización pausada (era SCBA)", "amber", "pending"),
						detail: { chip: scbaPill("Sincronización pausada (era SCBA)", "amber", "pending"), gate: null },
					},
				),
				warn: "assoc=null y causaType=null violan el enum del schema (un folder.save() posterior fallaría).",
			},
		],
	},
	{
		row: "hidden_archived",
		title: "No aparece — archivada",
		whatUserSees: "Solo en el modal Archivadas.",
		cases: [
			{
				key: "scba.archived.plan",
				title: "Creada archivada por límite de plan",
				producer:
					"scba-workers subscription-limits.ts:177-181 getNextFolderState → 'archived' → folder-service.ts:398 archived=true (sin archivedAt/archivedBy). Si tampoco hay storage: 'pending' → NO se crea folder",
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
				warn: "99% de las carpetas SCBA (837/846). Indistinguible de un archivado manual del usuario.",
			},
		],
	},
];

export const SCBA_FINDINGS: GuideFinding[] = [
	{
		id: "S1",
		severity: "alta",
		title: "Reverificación SCBA es terminal",
		detail:
			"reverify pone causaVerified=false/'pending' pero ningún worker SCBA escribe causaVerified fuera de la creación/re-link → “Pendiente de verificación” para siempre.",
		where: "law-analytics-server folderController.js:5288 · scba-workers folder-service.ts:267-297",
	},
	{
		id: "S2",
		severity: "alta",
		title: "Un solo folder por causa compartida",
		detail:
			"ensureFolder busca por {causaId, causaType} sin userId: el segundo usuario con la misma causa en Mis Causas nunca recibe carpeta.",
		where: "scba-workers folder-service.ts:262-265",
	},
	{
		id: "S3",
		severity: "media",
		title: "“Credenciales rechazadas” también ante error de scraping",
		detail:
			"useScbaCredentialError solo mira syncStatus==='error', que escriben tanto el rechazo de contraseña como markSyncError; en el segundo caso la copy es falsa y el tracking sigue activo.",
		where: "law-analytics-front useScbaCredentialError.ts:23 · scba-workers verification-worker.ts:203",
	},
	{
		id: "S4",
		severity: "media",
		title: "verified/isValid hardcodeados en la creación",
		detail:
			"El folder nace verificado y válido antes de cualquier scraping; un fallo del scraping inicial queda invisible (scrapingProgress pending eterno).",
		where: "scba-workers folder-service.ts:434-437 · initial-scraping-worker.ts:569",
	},
	{
		id: "S5",
		severity: "media",
		title: "Toggle de credencial invisible",
		detail: "propagateTracking baja causaUpdateEnabled pero el front nunca lo lee: carpetas con seguimiento apagado se ven sincronizadas.",
		where: "law-analytics-server scbaCredentialsController.js:34 · folders.tsx / FolderView.tsx / details.tsx",
	},
	{
		id: "S6",
		severity: "baja",
		title: "listRemoved sobrevive al keep y revive al re-link",
		detail:
			"executeScbaKeepMode no limpia listRemoved*; el re-link tampoco → el badge “Ya no en la lista” reaparece sobre una causa activa.",
		where: "scbaCredentialsController.js:258-273 · scba-workers folder-service.ts:362-383",
	},
	{
		id: "S7",
		severity: "baja",
		title: "assoc=null / causaType=null fuera del enum",
		detail: "El keep escribe con driver nativo valores que el schema no admite.",
		where: "law-analytics-server scbaCredentialsController.js:268",
	},
	{
		id: "S8",
		severity: "baja",
		title: "archived por plan sin archivedAt/archivedBy",
		detail: "Indistinguible de un archivado manual; solo queda un bell transitorio.",
		where: "scba-workers folder-service.ts:398",
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
			detail:
				"Tras 48h con errores la causa pasa a isValid=false y el folder a 'failed' (W1) con mail; antes (≤48h) se reencola cada 2h.",
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
			detail:
				"causaService y el controller aceptan los 3 tipos IOL (IOL-9); en la práctica pending_selection lo escriben los workers.",
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
			detail:
				"Las 3 IOL tienen rama propia en deleteFolderById con fallback local (IOL-11) (sin updateHistory).",
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

export const GUIDE_BY_JURISDICTION: Record<GuideJurisdiction, { groups: GuideGroup[]; findings: GuideFinding[]; note?: string }> = {
	pjn: { groups: PJN_GROUPS, findings: PJN_FINDINGS },
	mev: { groups: MEV_GROUPS, findings: MEV_FINDINGS },
	eje: { groups: EJE_GROUPS, findings: EJE_FINDINGS },
	scba: { groups: SCBA_GROUPS, findings: SCBA_FINDINGS },
	pjsalta: { groups: PJSALTA_GROUPS, findings: PJSALTA_FINDINGS },
	pjcatamarca: { groups: PJCATAMARCA_GROUPS, findings: PJCATAMARCA_FINDINGS },
	pjmendoza: { groups: PJMENDOZA_GROUPS, findings: PJMENDOZA_FINDINGS },
};
