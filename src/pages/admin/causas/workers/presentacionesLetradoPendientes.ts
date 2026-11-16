// Bugs, limitaciones y trabajos pendientes del circuito "Presentaciones del letrado".
// Lista curada a mano (se actualiza con cada cambio del circuito). Las alertas automáticas
// salen del endpoint de estado; esto es lo que no se puede detectar solo.

export type TipoItem = "bug" | "limitacion" | "pendiente";
export type EstadoItem = "abierto" | "en_curso" | "resuelto" | "decidido";

export interface ItemSeguimiento {
	tipo: TipoItem;
	estado: EstadoItem;
	/** Fecha del último cambio (DD/MM/AAAA). */
	fecha: string;
	titulo: string;
	detalle: string;
	referencia?: string;
}

export const ITEMS_PRESENTACIONES: ItemSeguimiento[] = [
	{
		tipo: "pendiente",
		estado: "abierto",
		fecha: "16/11/2026",
		titulo: "Deploy de la UI de usuario (hub + front)",
		detalle:
			"Widget del panel, línea sobre los movimientos, pestaña Presentaciones y filtro del listado. Ramas feat/actividad-propia de law-analytics-server y law-analytics-front, sin push; falta rebasar sobre main, probar en local y desplegar (primero el hub).",
		referencia: "law-analytics-server 2b38cd1 · law-analytics-front 7031dc6d",
	},
	{
		tipo: "pendiente",
		estado: "en_curso",
		fecha: "16/11/2026",
		titulo: "Registro de corridas y pestaña Estado",
		detalle:
			"Los workers escriben una fila por corrida en pjn-actos-letrado-runs; las anteriores se cargan desde los logs de PM2 (scripts/backfill-actos-runs.js). Hasta el deploy del worker y del admin-api, el relevamiento por día muestra solo lo leído y lo vinculado.",
		referencia: "pjn-mis-causas feat/actos-runs · admin-api /api/actos-letrado/estado",
	},
	{
		tipo: "bug",
		estado: "resuelto",
		fecha: "11/11/2026",
		titulo: "Vínculo con un despacho del mismo título",
		detalle:
			"Un escrito sin hora se vinculaba por día y título con el despacho que lo proveía (caso «APELA», CSS 37181/2011). Ahora el cruce por día exige un movimiento de escrito. La pasada de revinculación sumó 208 vínculos y cambió 8 carpetas.",
		referencia: "pjn-mis-causas 4aa1aea",
	},
	{
		tipo: "bug",
		estado: "abierto",
		fecha: "11/11/2026",
		titulo: "Choques: dos presentaciones para un mismo movimiento",
		detalle:
			"Cuando dos escritos del mismo día caen en el mismo movimiento, ninguno se vincula y los dos quedan pendientes (64 en la última pasada completa). Falta una regla de desempate (título, orden del día).",
	},
	{
		tipo: "bug",
		estado: "abierto",
		fecha: "16/11/2026",
		titulo: "Pico de carpetas cambiadas el 11/11",
		detalle:
			"Dos recálculos cambiaron 362 y 3.198 carpetas (20:41 y 22:40 UTC). Coincide con la carga histórica de una credencial nueva y con una reorganización masiva de carpetas de una cuenta; no se repitió, pero no se investigó.",
	},
	{
		tipo: "limitacion",
		estado: "abierto",
		fecha: "11/11/2026",
		titulo: "Escritos firmados por otro CUIL del estudio",
		detalle:
			"La bandeja solo lista lo presentado con el CUIL de la credencial. Un escrito del mismo estudio firmado por otro letrado llega al expediente pero no mueve el contador (ej. «APELA» del 30/10 en CSS 4580/2024 y CSS 37955/2014).",
	},
	{
		tipo: "limitacion",
		estado: "decidido",
		fecha: "11/11/2026",
		titulo: "Escritos enviados sin aceptación del juzgado (2018)",
		detalle:
			"El portal deja algunos escritos en ENVIADO_A_DEPENDENCIA, sin fecha de aceptación y sin movimiento en el expediente. Son huecos del propio PJN de esos años: se dejan como \"sin proveer\", sin regla especial.",
	},
	{
		tipo: "limitacion",
		estado: "abierto",
		fecha: "16/11/2026",
		titulo: "Presentaciones en causas que no están en la base",
		detalle:
			"Quedan como sin_causa (unos 7.200 escritos y 2.400 DEOX). Se vinculan solas si la causa entra más adelante (alta de carpeta o listado de la credencial).",
	},
	{
		tipo: "bug",
		estado: "abierto",
		fecha: "11/11/2026",
		titulo: "Movimientos con fechas imposibles en algunas causas",
		detalle:
			"Hay movimientos con años como 3863 u 8013 y fechas guardadas como texto. No afectan el contador, pero son datos mal cargados en las causas (fuera de este worker).",
	},
	{
		tipo: "pendiente",
		estado: "abierto",
		fecha: "11/11/2026",
		titulo: "Ajustes menores de la UI",
		detalle:
			"Opcionales: que la celda del listado diga \"Solo presentaciones sin proveer\" como el widget, y mostrar solo la fecha cuando el escrito viene sin hora (00:00).",
	},
];
