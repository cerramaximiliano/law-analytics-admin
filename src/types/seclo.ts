// types/seclo.ts — Tipos TypeScript para el módulo SECLO

export type SecloStatus = "pending" | "processing" | "submitted" | "completed" | "error";
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
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	company?: string;
	type?: string;
}

export interface SecloDatosLaborales {
	fechaNacimiento?: string | null;
	fechaIngreso?: string | null;
	fechaEgreso?: string | null;
	remuneracion?: number | null;
	importeReclamo?: number | null;
	cct?: string;
	categoria?: string;
	estadoTrabajador?: "regular" | "irregular" | "no_registrado" | null;
	sexo?: "M" | "F" | null;
}

export interface SecloDocumento {
	tipo: SecloDocTipo;
	s3Key: string;
	fileName?: string;
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

export interface SecloSolicitud {
	_id: string;
	userId: { _id: string; name: string; email: string } | string;
	credentialId: string | { _id: string; enabled: boolean; syncStatus: string };
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
		fechaAudiencia?: string;
		horaAudiencia?: string;
		lugarAudiencia?: string;
	} | null;
	errorInfo?: { message: string; code: string; timestamp: string } | null;
	retryCount: number;
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
	credentialInvalidReason?: string | null;
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
