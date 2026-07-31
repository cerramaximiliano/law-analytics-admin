// Taxonomía v2 del gold set (2026-07-31) — mantener en sincronía con
// pjn-api/src/controllers/etapaAnotacionesController.js (DIMENSIONES).

export const DIMENSIONES_ORDEN = [
	"tipoResolucion",
	"instancia",
	"materia",
	"contexto",
	"funcion",
	"resultado",
] as const;
export type DimKey = (typeof DIMENSIONES_ORDEN)[number] | "modoTerminacion" | "estadoImpugnatorio";

export interface DimDef {
	titulo: string;
	corto: string;
	opciones: [string, string][];
	// Texto de ayuda que se muestra debajo del título de la dimensión.
	ayuda?: string;
	// Agrupación visual de opciones con subtítulo explicativo (ej. resultado).
	grupos?: { titulo: string; valores: string[] }[];
}

export const DIM_LABELS: Record<DimKey, DimDef> = {
	tipoResolucion: {
		titulo: "Tipo de resolución",
		corto: "Tipo",
		opciones: [
			["providencia_simple", "Providencia simple"],
			["sentencia_interlocutoria", "Sent. interlocutoria"],
			["sentencia_definitiva", "Sent. definitiva"],
			["otra_resolucion", "Otra resolución"],
			["no_es_resolucion", "No es resolución"],
		],
	},
	instancia: {
		titulo: "Instancia (del órgano emisor)",
		corto: "Instancia",
		opciones: [
			["primera_instancia", "Primera"],
			["segunda_instancia", "Segunda"],
			["superior_tribunal_provincial", "Sup. Trib. provincial"],
			["csjn", "CSJN"],
			["instancia_unica", "Única"],
			["otro", "Otro"],
			["indeterminada", "Indeterminada"],
		],
	},
	materia: {
		titulo: "Materia decisoria",
		corto: "Materia",
		opciones: [
			["fondo", "Fondo"],
			["prueba", "Prueba"],
			["competencia", "Competencia"],
			["cautelar", "Cautelar"],
			["conciliacion", "Conciliación"],
			["honorarios", "Honorarios"],
			["costas", "Costas"],
			["liquidacion", "Liquidación"],
			["ejecucion", "Ejecución"],
			["recurso", "Recurso"],
			["nulidad", "Nulidad"],
			["otro", "Otro"],
		],
	},
	contexto: {
		titulo: "Contexto procesal",
		corto: "Contexto",
		opciones: [
			["principal", "Principal"],
			["incidental", "Incidental"],
			["ejecucion", "Ejecución"],
			["recursiva", "Recursiva"],
			["cautelar", "Cautelar"],
			["otro", "Otro"],
		],
	},
	funcion: {
		titulo: "Función / efecto",
		corto: "Función",
		opciones: [
			["impulso", "Impulso"],
			["ordenacion", "Ordenación"],
			["decision", "Decisión"],
			["terminacion", "Terminación"],
			["suspension", "Suspensión"],
			["reanudacion", "Reanudación"],
			["otro", "Otro"],
		],
	},
	modoTerminacion: {
		titulo: "Modo de terminación",
		corto: "Modo term.",
		opciones: [
			["sentencia_sobre_fondo", "Sentencia sobre fondo"],
			["allanamiento", "Allanamiento"],
			["desistimiento_del_proceso", "Desist. del proceso"],
			["desistimiento_del_derecho", "Desist. del derecho"],
			["transaccion", "Transacción"],
			["conciliacion", "Conciliación"],
			["caducidad_de_instancia", "Caducidad de instancia"],
			["homologacion_de_acuerdo", "Homologación"],
			["sustraccion_de_materia", "Sustracción de materia"],
			["declaracion_de_abstraccion", "Abstracción"],
			["archivo", "Archivo"],
			["incompetencia_con_remision", "Incompetencia c/remisión"],
			["otro", "Otro"],
		],
	},
	estadoImpugnatorio: {
		titulo: "Estado impugnatorio",
		corto: "Firmeza",
		ayuda:
			"Dejalo VACÍO salvo que el propio documento declare la firmeza ('firme', 'consentida') o dé cuenta del recurso — el motor la deriva de los eventos posteriores.",
		opciones: [
			["recurrible", "Recurrible"],
			["recurrida", "Recurrida"],
			["firme", "Firme"],
			["no_determinado", "No determinado"],
		],
	},
	resultado: {
		titulo: "Resultado (decisión principal)",
		corto: "Resultado",
		ayuda: "Solo cuando Función = decisión o terminación. Para impulso/ordenación: 'No aplica'.",
		opciones: [
			["hace_lugar", "Hace lugar"],
			["hace_lugar_parcialmente", "Hace lugar parcialmente"],
			["rechaza", "Rechaza"],
			["confirma", "Confirma"],
			["revoca", "Revoca"],
			["modifica", "Modifica"],
			["concede", "Concede"],
			["deniega", "Deniega"],
			["desierto", "Desierto"],
			["homologa", "Homologa"],
			["no_aplica", "No aplica"],
			["otro", "Otro"],
		],
		grupos: [
			{ titulo: "Sobre pretensiones o peticiones", valores: ["hace_lugar", "hace_lugar_parcialmente", "rechaza"] },
			{ titulo: "Revisión (alzada sobre lo apelado)", valores: ["confirma", "revoca", "modifica"] },
			{ titulo: "Sobre recursos o solicitudes", valores: ["concede", "deniega", "desierto"] },
			{ titulo: "Acuerdos", valores: ["homologa"] },
			{ titulo: "Sin resultado", valores: ["no_aplica", "otro"] },
		],
	},
};

// Acciones requeridas (lista cerrada — evita variantes libres tipo
// "contestar" vs "contestar_demanda"). Espejo del catálogo de datasets #5.
export const ACCIONES_REQUERIDAS: [string, string][] = [
	["contestar_demanda", "Contestar demanda"],
	["contestar_traslado", "Contestar traslado"],
	["contestar_agravios", "Contestar agravios"],
	["expresar_agravios", "Expresar agravios"],
	["acompanar_documental", "Acompañar documental"],
	["acompanar_bono", "Acompañar bono profesional"],
	["acreditar_personeria", "Acreditar personería"],
	["constituir_domicilio", "Constituir domicilio"],
	["subsanar_defecto", "Subsanar defecto"],
	["depositar_suma", "Depositar suma"],
	["pagar_tasa", "Pagar tasa de justicia"],
	["presentar_liquidacion", "Presentar liquidación"],
	["impugnar_liquidacion", "Impugnar liquidación"],
	["impugnar_pericia", "Impugnar pericia"],
	["ofrecer_prueba", "Ofrecer prueba"],
	["producir_prueba", "Producir prueba"],
	["reconocer_desconocer_documental", "Reconocer/desconocer documental"],
	["presentar_informe", "Presentar informe (perito/organismo)"],
	["aceptar_cargo", "Aceptar el cargo (perito/martillero)"],
	["denunciar_datos_bancarios", "Denunciar CBU/CUIL/datos bancarios"],
	["prestar_caucion", "Prestar caución juratoria"],
	["comparecer_audiencia", "Comparecer a audiencia"],
	["diligenciar_cedula", "Diligenciar cédula"],
	["presentar_oficio", "Presentar/diligenciar oficio"],
	["integrar_copias", "Integrar copias al sistema"],
	["cumplir_intimacion", "Cumplir intimación (genérica)"],
	["otro", "Otro"],
];

// Etiqueta final: lista cerrada de etapas + hitos del motor (VERSION 17).
export const ETIQUETAS_FINALES: [string, string][] = [
	["demanda", "Etapa: demanda"],
	["traba_litis", "Etapa: traba de litis"],
	["prueba", "Etapa: prueba"],
	["puro_derecho", "Etapa: puro derecho"],
	["alegatos", "Etapa: alegatos"],
	["autos_sentencia", "Etapa: autos para sentencia"],
	["sentencia_primera", "Etapa: sentencia de 1ª instancia"],
	["segunda_instancia", "Etapa: segunda instancia"],
	["sentencia_camara", "Etapa: sentencia de Cámara"],
	["recurso_extraordinario", "Etapa: recurso extraordinario"],
	["sentencia_firme", "Etapa: sentencia firme"],
	["fin_litigio", "Etapa: fin del litigio"],
	["ejecucion", "Etapa: ejecución"],
	["sentencia_remate", "Etapa: sentencia de remate"],
	["archivo", "Etapa: archivo"],
	["apertura_sucesion", "Etapa (sucesorio): apertura"],
	["edictos", "Etapa (sucesorio): edictos"],
	["declaratoria", "Etapa (sucesorio): declaratoria"],
	["inscripcion", "Etapa (sucesorio): inscripción"],
	["particion", "Etapa (sucesorio): partición"],
	["apertura_concurso", "Etapa (concursal): apertura"],
	["verificacion", "Etapa (concursal): verificación"],
	["informe_general", "Etapa (concursal): informe general"],
	["categorizacion", "Etapa (concursal): categorización"],
	["acuerdo", "Etapa (concursal): acuerdo"],
	["homologacion", "Etapa (concursal): homologación"],
	["hito:sentencia_interlocutoria", "Hito: sentencia interlocutoria"],
	["hito:resolucion_incidente", "Hito: resolución de incidente"],
	["hito:audiencia", "Hito: audiencia"],
	["hito:homologacion_acuerdo", "Hito: homologación de acuerdo"],
	["hito:desercion", "Hito: deserción"],
	["hito:inhabilidad_instancia", "Hito: inhabilidad de instancia"],
	["hito:archivo", "Hito: archivo"],
	["ninguna", "Ninguna (no marca etapa ni hito)"],
];

export const ACTOS_PROCESALES: [string, string][] = [
	["corre_traslado", "Corre traslado"],
	["intima", "Intima"],
	["fija_audiencia", "Fija audiencia"],
	["ordena_notificacion", "Ordena notificación"],
	["ordena_oficio", "Ordena oficio"],
	["ordena_cedula", "Ordena cédula"],
	["tiene_presente", "Tiene presente"],
	["agrega_documentacion", "Agrega documentación"],
	["abre_a_prueba", "Abre a prueba"],
	["declara_causa_puro_derecho", "Declara puro derecho"],
	["pasa_autos_sentencia", "Pasa autos a sentencia"],
	["regula_honorarios", "Regula honorarios"],
	["aprueba_liquidacion", "Aprueba liquidación"],
	["designa_perito", "Designa/sortea perito"],
	["declara_rebeldia", "Declara rebeldía"],
	["declara_caducidad", "Declara caducidad"],
	["concede_recurso", "Concede recurso"],
	["deniega_recurso", "Deniega recurso"],
	["resuelve_fondo", "Resuelve el fondo"],
	["homologa_acuerdo", "Homologa acuerdo"],
	["registra_pago", "Registra pago / dación en pago"],
	["ordena_giro", "Ordena/libra giro"],
	["ordena_embargo", "Ordena embargo"],
	["levanta_embargo", "Levanta embargo"],
	["suspende_proceso", "Suspende el proceso"],
	["reanuda_proceso", "Reanuda el proceso"],
	["archiva", "Archiva"],
	["otro", "Otro"],
];

export const DESTINATARIOS: [string, string][] = [
	["actora", "Actora"],
	["demandada", "Demandada"],
	["ambas_partes", "Ambas partes"],
	["perito", "Perito"],
	["testigo", "Testigo"],
	["tercero", "Tercero"],
	["organismo_publico", "Organismo público"],
	["letrado", "Letrado"],
	["sindico", "Síndico"],
	["banco_o_registro", "Banco/Registro"],
	["oficial_de_justicia", "Oficial de justicia"],
	["otro", "Otro"],
];

// Acto-primero: elegir el acto autocompleta (solo campos vacíos) las demás
// dimensiones con la combinación típica. El anotador confirma o corrige.
export const ACTO_AUTOFILL: Record<
	string,
	Partial<Record<"tipoResolucion" | "materia" | "contexto" | "funcion" | "resultado" | "modoTerminacion", string>>
> = {
	corre_traslado: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	intima: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	fija_audiencia: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_notificacion: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_oficio: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_cedula: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	tiene_presente: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	agrega_documentacion: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	abre_a_prueba: { tipoResolucion: "providencia_simple", materia: "prueba", funcion: "ordenacion", resultado: "no_aplica" },
	declara_causa_puro_derecho: { tipoResolucion: "sentencia_interlocutoria", materia: "prueba", funcion: "decision" },
	pasa_autos_sentencia: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	regula_honorarios: { materia: "honorarios", funcion: "decision" },
	aprueba_liquidacion: { materia: "liquidacion", contexto: "ejecucion", funcion: "decision", resultado: "hace_lugar" },
	designa_perito: { tipoResolucion: "providencia_simple", materia: "prueba", funcion: "ordenacion", resultado: "no_aplica" },
	declara_rebeldia: { tipoResolucion: "sentencia_interlocutoria", funcion: "decision" },
	declara_caducidad: { tipoResolucion: "sentencia_interlocutoria", funcion: "terminacion", modoTerminacion: "caducidad_de_instancia" },
	concede_recurso: { tipoResolucion: "providencia_simple", materia: "recurso", funcion: "impulso", resultado: "concede" },
	deniega_recurso: { materia: "recurso", funcion: "decision", resultado: "deniega" },
	resuelve_fondo: { tipoResolucion: "sentencia_definitiva", materia: "fondo", funcion: "decision" },
	homologa_acuerdo: { funcion: "terminacion", modoTerminacion: "homologacion_de_acuerdo", resultado: "homologa" },
	registra_pago: { tipoResolucion: "providencia_simple", materia: "ejecucion", contexto: "ejecucion", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_giro: { tipoResolucion: "providencia_simple", materia: "ejecucion", contexto: "ejecucion", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_embargo: { tipoResolucion: "sentencia_interlocutoria", materia: "cautelar", funcion: "decision", resultado: "hace_lugar" },
	levanta_embargo: { tipoResolucion: "sentencia_interlocutoria", materia: "cautelar", funcion: "decision" },
	suspende_proceso: { funcion: "suspension" },
	reanuda_proceso: { funcion: "reanudacion" },
	archiva: { tipoResolucion: "providencia_simple", funcion: "terminacion", modoTerminacion: "archivo", resultado: "no_aplica" },
};

export const DIM_CHIP_COLOR: Record<string, "primary" | "secondary" | "info" | "warning" | "success" | "error" | "default"> = {
	tipoResolucion: "primary",
	instancia: "secondary",
	materia: "warning",
	contexto: "info",
	funcion: "success",
	modoTerminacion: "error",
	estadoImpugnatorio: "default",
	actoProcesal: "primary",
	resultado: "success",
};
