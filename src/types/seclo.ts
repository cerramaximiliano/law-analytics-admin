// types/seclo.ts — Tipos TypeScript para el módulo SECLO

export type SecloStatus = "pending" | "processing" | "submitted" | "completed" | "error" | "dry_run_completed";
export type SecloTipoTramite = "obligatoria" | "espontanea";
export type SecloIniciadoPor = "trabajador" | "empleador";
export type SecloCaracter = "apoderado" | "patrocinante" | "rep_gremial" | "rep_empresarial";
export type SecloDocTipo = "dni" | "credencial" | "poder" | "formulario" | "otros";

export const OBJETO_RECLAMO_OPTIONS = [
	"Accidentes – Trabajador No Registrado y Empleador sin ART",
	"Acoso Laboral",
	"Cobro de salarios",
	"Consignación",
	"Daño Moral",
	"Desalojo",
	"Despido",
	"Diferencia de salarios",
	"Indemnización fallecimiento del empleador (art. 249 LCT)",
	"Indemnización fallecimiento del trabajador (art. 248 LCT)",
	"Indemnización por enfermedad (art. 212 LCT)",
	"Jubilación Artículo 252",
	"Ley 22250 (construcción)",
	"Modificación de Cond Laborales",
	"Multas de ley – varias",
	"Multas ley 24013",
	"Período de Prueba Artículo 92 bis",
	"Reclamo certificado de trabajo (art. 80 LCT)",
	"Salarios por suspensión",
	"Seguro de Vida",
] as const;

export interface SecloContact {
	_id: string;
	name: string;
	lastName?: string;
	cuit?: string;
	document?: string;
	phone?: string;
	phoneCodArea?: string;
	phoneCelular?: string;
	email?: string;
	/** Domicilio en formato libre (legacy). Se reconstruye desde los campos
	 *  estructurados al guardar desde formularios actualizados. */
	address?: string;
	street?: string;
	streetNumber?: string;
	floor?: string;
	apartment?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	company?: string;
	type?: string;
	/** Subtipo específico de persona jurídica (cmbTipoSociedad del portal SECLO).
	 *  Vacío para personas físicas o contactos legacy aún sin completar. */
	tipoSociedad?: string;
	folderIds?: string[];
}

// Tipos de persona jurídica del portal SECLO. Sólo se exponen al usuario
// cuando type === "Persona Jurídica". Para personas físicas el sistema
// asume "Persona Física" automáticamente.
export const TIPO_SOCIEDAD_OPTIONS = [
	"Persona Física",
	"Sociedades de Hecho",
	"Sociedad Colectiva",
	"Sociedad en Comandita Simple",
	"Sociedad de Capital e Industria",
	"Sociedad de Responsabilidad Limitada",
	"Sociedad Anónima",
	"Sociedad Anónima con Part. Estatal",
	"Sociedad Comandita por Acciones",
	"Sociedad Accidental o en Participación",
	"Asociación Civil",
	"Sociedades Civiles",
	"Fundaciones",
	"O.N.G.",
	"Cooperativas",
	"Cooperativas de trabajo",
	"Otro",
] as const;
export type TipoSociedad = typeof TIPO_SOCIEDAD_OPTIONS[number];

export interface SecloDatosLaborales {
	fechaNacimiento?: string | null;
	fechaIngreso?: string | null;
	fechaEgreso?: string | null;
	fechaAccidente?: string | null;
	remuneracion?: number | null;
	importeReclamo?: number | null;
	cct?: string;
	categoria?: string;
	estadoTrabajador?: "regular" | "irregular" | "no_registrado" | null;
	sexo?: "M" | "F" | null;
}

export interface SecloMissingRequiredField {
	label?: string;
	id?: string;
	name?: string;
	step?: string;
}

export interface SecloDocumento {
	tipo: SecloDocTipo;
	s3Key: string;
	fileName?: string;
}

export interface SecloConciliador {
	nombre?: string | null;
	telefono?: string | null;
	email?: string | null;
	sala?: string | null;
}

export interface SecloAudiencia {
	fecha?: string | null;
	hora?: string | null;
	lugar?: string | null;
	constanciaKey?: string | null;
	conciliador?: SecloConciliador | null;
	eventId?: string;
	agendaScrapeAt?: string;
	agendaRetryCount?: number;
	suppressNextEmail?: boolean;
}

export interface SecloDatosAbogado {
	caracter: SecloCaracter;
	tomo: string;
	folio: string;
	nombre?: string;
	apellido?: string;
	email?: string;
	telefono?: string;
	celular?: { codArea: string; numero: string };
	domicilio?: {
		descripcionCompleta?: string;
		provincia?: string;
		partido?: string;
		localidad?: string;
		calle?: string;
		numero?: string;
		piso?: string;
		depto?: string;
		cpa?: string;
	};
}

export interface SecloFolder {
	_id: string;
	folderName: string;
	folderId?: string;
	materia?: string;
	status?: string;
}

export interface SecloDryRunScreenshot {
	step: string;
	s3Key: string;
	takenAt?: string;
}

export interface SecloDryRunResult {
	runAt?: string;
	workerId?: string;
	screenshots: SecloDryRunScreenshot[];
	formSnapshot?: {
		capturedAt?: string;
		url?: string;
		fields?: Array<{ name?: string | null; id?: string | null; tag: string; type: string; value: string; checked?: boolean }>;
	} | null;
	htmlSnapshotKey?: string | null;
	error?: string | null;
	missingRequiredFields?: SecloMissingRequiredField[];
}

export interface SecloSolicitud {
	_id: string;
	userId: { _id: string; name: string; email: string } | string;
	credentialId: string | { _id: string; enabled: boolean; syncStatus: string };
	folderId?: SecloFolder | string | null;
	requirentes: Array<{
		contactId: SecloContact | string;
		datosLaborales?: SecloDatosLaborales;
		snapshot?: Partial<SecloContact>;
	}>;
	requeridos: Array<{
		contactId: SecloContact | string;
		snapshot?: Partial<SecloContact>;
	}>;
	documentos: SecloDocumento[];
	tipoTramite: SecloTipoTramite;
	iniciadoPor: SecloIniciadoPor;
	objetoReclamo: string[];
	comentarioReclamo?: string;
	datosAbogado?: SecloDatosAbogado;
	status: SecloStatus;
	submittedAt?: string | null;
	completedAt?: string | null;
	resultado?: {
		numeroExpediente?: string;
		numeroTramite?: string;
		audiencias?: SecloAudiencia[];
		textoPdf?: string;
	} | null;
	errorInfo?: { message: string; code: string; timestamp: string } | null;
	retryCount: number;
	dryRun?: boolean;
	dryRunWithHtml?: boolean;
	dryRunResult?: SecloDryRunResult | null;
	createdAt: string;
	updatedAt: string;
}

export interface TrabajoCredential {
	_id: string;
	userId: { _id: string; name: string; email: string } | string;
	cuil?: string;
	enabled: boolean;
	syncStatus: string;
	credentialInvalid: boolean;
	credentialInvalidAt?: string | null;
	credentialInvalidReason?: string | null;
	credentialsValidated?: boolean;
	credentialsValidatedAt?: string | null;
	notificationsSent?: { validated?: boolean; invalid?: boolean };
	lastSync?: string | null;
	consecutiveErrors: number;
	createdAt: string;
}

export interface SecloStats {
	solicitudes: {
		pending: number;
		processing: number;
		submitted: number;
		completed: number;
		error: number;
		total: number;
	};
	credentials: {
		total: number;
		active: number;
	};
}

export interface SecloUser {
	_id: string;
	name: string;
	email: string;
	role?: string;
}
