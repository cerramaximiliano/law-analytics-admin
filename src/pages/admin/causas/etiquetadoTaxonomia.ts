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
			["inhabilidad_de_instancia", "Inhabilidad de instancia"],
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
	["presentar_alegato", "Presentar alegato"],
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
	["impulsar_proceso", "Impulsar el proceso / formular peticiones"],
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
	["da_vista", "Da vista (Ministerio Público / organismo)"],
	["intima", "Intima"],
	["fija_audiencia", "Fija audiencia"],
	["ordena_notificacion", "Ordena notificación"],
	["ordena_oficio", "Ordena oficio"],
	["ordena_cedula", "Ordena cédula"],
	["tiene_presente", "Tiene presente"],
	["agrega_documentacion", "Agrega documentación"],
	["abre_a_prueba", "Abre a prueba"],
	["medida_mejor_proveer", "Medida para mejor proveer"],
	["declara_causa_puro_derecho", "Declara puro derecho"],
	["pone_autos_para_alegar", "Pone autos para alegar"],
	["pasa_autos_sentencia", "Pasa autos a sentencia"],
	["pasa_autos_a_resolver", "Pasa autos a resolver (cuestión no-fondo)"],
	["regula_honorarios", "Regula honorarios"],
	["aprueba_liquidacion", "Aprueba liquidación"],
	["designa_perito", "Designa/sortea perito"],
	["declara_rebeldia", "Declara rebeldía"],
	["declara_caducidad", "Declara caducidad"],
	["declara_incompetencia", "Declara incompetencia / inhabilidad de instancia"],
	["resuelve_excepcion", "Resuelve excepción"],
	["concede_recurso", "Concede recurso"],
	["deniega_recurso", "Deniega recurso"],
	["eleva_autos", "Eleva autos a la alzada"],
	["recibe_autos_devueltos", "Recibe autos devueltos del Superior"],
	["resuelve_recurso", "Resuelve recurso (no-fondo)"],
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
	da_vista: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	intima: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	fija_audiencia: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_notificacion: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_oficio: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_cedula: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	tiene_presente: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	agrega_documentacion: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	abre_a_prueba: { tipoResolucion: "providencia_simple", materia: "prueba", funcion: "ordenacion", resultado: "no_aplica" },
	medida_mejor_proveer: { tipoResolucion: "providencia_simple", materia: "prueba", funcion: "ordenacion", resultado: "no_aplica" },
	declara_causa_puro_derecho: { tipoResolucion: "sentencia_interlocutoria", materia: "prueba", funcion: "decision" },
	pone_autos_para_alegar: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
	pasa_autos_sentencia: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	pasa_autos_a_resolver: { tipoResolucion: "providencia_simple", funcion: "impulso", resultado: "no_aplica" },
	regula_honorarios: { materia: "honorarios", funcion: "decision" },
	aprueba_liquidacion: { materia: "liquidacion", contexto: "ejecucion", funcion: "decision", resultado: "hace_lugar" },
	designa_perito: { tipoResolucion: "providencia_simple", materia: "prueba", funcion: "ordenacion", resultado: "no_aplica" },
	declara_rebeldia: { tipoResolucion: "sentencia_interlocutoria", funcion: "decision" },
	declara_caducidad: { tipoResolucion: "sentencia_interlocutoria", funcion: "terminacion", modoTerminacion: "caducidad_de_instancia" },
	declara_incompetencia: { tipoResolucion: "sentencia_interlocutoria", materia: "competencia", funcion: "terminacion" },
	resuelve_excepcion: { tipoResolucion: "sentencia_interlocutoria", contexto: "incidental", funcion: "decision" },
	concede_recurso: { tipoResolucion: "providencia_simple", materia: "recurso", funcion: "impulso", resultado: "concede" },
	deniega_recurso: { materia: "recurso", funcion: "decision", resultado: "deniega" },
	eleva_autos: { tipoResolucion: "providencia_simple", materia: "recurso", contexto: "recursiva", funcion: "impulso", resultado: "no_aplica" },
	recibe_autos_devueltos: { tipoResolucion: "providencia_simple", contexto: "recursiva", funcion: "impulso", resultado: "no_aplica" },
	resuelve_recurso: { tipoResolucion: "sentencia_interlocutoria", funcion: "decision" },
	resuelve_fondo: { tipoResolucion: "sentencia_definitiva", materia: "fondo", funcion: "decision" },
	homologa_acuerdo: { funcion: "terminacion", modoTerminacion: "homologacion_de_acuerdo", resultado: "homologa" },
	registra_pago: { tipoResolucion: "providencia_simple", materia: "ejecucion", contexto: "ejecucion", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_giro: { tipoResolucion: "providencia_simple", materia: "ejecucion", contexto: "ejecucion", funcion: "ordenacion", resultado: "no_aplica" },
	ordena_embargo: { tipoResolucion: "sentencia_interlocutoria", materia: "cautelar", funcion: "decision", resultado: "hace_lugar" },
	levanta_embargo: { tipoResolucion: "sentencia_interlocutoria", materia: "cautelar", funcion: "decision" },
	suspende_proceso: { funcion: "suspension" },
	reanuda_proceso: { funcion: "reanudacion" },
	// Archívese de rutina: ordena la disposición administrativa (el proceso ya
	// terminó por otro acto). Si el archivo CIERRA un trámite vivo (inactividad,
	// sin más trámite), corregir a funcion=terminacion + modo=archivo a mano.
	archiva: { tipoResolucion: "providencia_simple", funcion: "ordenacion", resultado: "no_aplica" },
};

// Vocabulario curado de objetos decididos (filas de Decisiones). El selector
// permite crear valores nuevos — se normalizan a snake_case y conviene
// promoverlos a esta lista cuando se repiten, para unificar el dataset.
export const OBJETOS_DECIDIDOS: [string, string][] = [
	["fondo", "Fondo / pretensión principal"],
	["revocatoria", "Revocatoria / reposición"],
	["apelacion_subsidiaria", "Apelación subsidiaria"],
	["recurso_apelacion", "Recurso de apelación"],
	["recurso_extraordinario", "Recurso extraordinario"],
	["recurso_queja", "Recurso de queja"],
	["aclaratoria", "Aclaratoria"],
	["nulidad", "Nulidad"],
	["excepcion_incompetencia", "Excepción de incompetencia"],
	["excepcion", "Excepción (otras)"],
	["caducidad_instancia", "Caducidad de instancia"],
	["medida_cautelar", "Medida cautelar"],
	["prueba", "Prueba (admisión/producción)"],
	["homologacion", "Homologación"],
	["liquidacion", "Liquidación"],
	["costas", "Costas"],
	["honorarios", "Honorarios"],
	["intereses", "Intereses"],
	["multa", "Multa / astreintes"],
	["tasa_justicia", "Tasa de justicia"],
	["embargo", "Embargo"],
	["beneficio_litigar_sin_gastos", "Beneficio de litigar sin gastos"],
];

// Normaliza un objeto decidido creado a mano: minúsculas, sin acentos,
// espacios y símbolos → "_" (ej. "Recurso de Queja" → "recurso_de_queja").
export const normalizarObjetoDecidido = (s: string): string =>
	s
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 60);

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
