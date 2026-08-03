import { Fragment } from "react";
import { useState } from "react";
import { Box, Drawer, IconButton, Stack, Typography, Divider, Chip, Button, useTheme, alpha } from "@mui/material";
import { ArrowLeft, CloseSquare } from "iconsax-react";

// ─────────────────────────────────────────────────────────────────────────────
// Guía del operador — reúne las convenciones doctrinales y de UI fijadas
// durante el diseño del gold set (taxonomía v2). Es la referencia rápida para
// anotar de forma consistente. La versión extendida vive en
// pjn-workers-scraping/docs/taxonomia-gold-set-v2.md.
// ─────────────────────────────────────────────────────────────────────────────

interface Seccion {
	titulo: string;
	cuerpo: JSX.Element;
}

const B = ({ children }: { children: React.ReactNode }) => (
	<Box component="span" sx={{ fontWeight: 700 }}>
		{children}
	</Box>
);

const Codigo = ({ children }: { children: React.ReactNode }) => (
	<Box
		component="span"
		sx={{
			fontFamily: "monospace",
			fontSize: "0.78em",
			px: 0.5,
			py: 0.1,
			borderRadius: 0.5,
			bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
		}}
	>
		{children}
	</Box>
);

const P = ({ children }: { children: React.ReactNode }) => (
	<Typography variant="body2" sx={{ mb: 0.75, lineHeight: 1.55 }}>
		{children}
	</Typography>
);

const LI = ({ children }: { children: React.ReactNode }) => (
	<Typography component="li" variant="body2" sx={{ mb: 0.4, lineHeight: 1.5 }}>
		{children}
	</Typography>
);

const SECCIONES: Seccion[] = [
	{
		titulo: "1 · Flujo recomendado",
		cuerpo: (
			<>
				<P>
					<B>Acto primero.</B> Leé la parte dispositiva y elegí el <B>acto procesal</B> (qué hace el juzgado: corre
					traslado, intima, resuelve el fondo…). Al elegirlo aparecen <B>sugerencias ✦</B> (borde punteado) con la
					combinación típica de las demás dimensiones — nada se escribe solo: aceptalas una a una con click o todas con
					"Aplicar sugerencias".
				</P>
				<P>
					El <B>breadcrumb</B> bajo el título muestra la cadena elegida en orden de tabs; las cajitas punteadas son lo
					pendiente y cada una es click directo a su tab.
				</P>
				<P>
					Si el documento hace varias cosas, el acto principal es el de mayor peso procesal; el resto va en{" "}
					<B>actos secundarios</B>.
				</P>
			</>
		),
	},
	{
		titulo: "2 · Las nueve dimensiones",
		cuerpo: (
			<Box component="ul" sx={{ pl: 2.25, m: 0 }}>
				<LI>
					<B>Acto</B>: qué hace el documento (target del clasificador). <Codigo>ninguno</Codigo> = no es resolución
					(constancias, sorteos, listados) — bloquea y resuelve el resto.
				</LI>
				<LI>
					<B>Tipo</B>: forma de la resolución. Providencia simple (trámite, sin fundamentos), sentencia interlocutoria
					(resuelve cuestión controvertida con fundamentos), sentencia definitiva (el fondo), otra, o no-es-resolución.
					Un auto de apertura a prueba: providencia simple; si resuelve oposición, interlocutoria.
				</LI>
				<LI>
					<B>Instancia</B>: del órgano emisor, por metadatos/encabezado ("LA SALA…" → segunda). No del expediente.
				</LI>
				<LI>
					<B>Materia</B>: sobre qué versa lo decidido (fondo, prueba, competencia, honorarios, recurso…).
				</LI>
				<LI>
					<B>Contexto</B>: dónde ocurre (principal, incidental, ejecución, recursiva, cautelar). En una reposición, el
					contexto es el de la resolución atacada.
				</LI>
				<LI>
					<B>Función</B>: efecto procesal — impulso, ordenación, decisión, terminación, suspensión, reanudación. Es la
					dimensión que gobierna Resultado y Modo de terminación.
				</LI>
				<LI>
					<B>Resultado</B>: sentido de la decisión principal. Solo con función decisión/terminación; con
					impulso/ordenación queda "No aplica" automático.
				</LI>
				<LI>
					<B>Modo de terminación</B>: solo con función terminación (cómo terminó: sentencia sobre fondo, conciliación,
					caducidad, archivo…).
				</LI>
				<LI>
					<B>Firmeza</B>: dejala VACÍA salvo que el propio documento declare la firmeza o dé cuenta del recurso — el
					motor la deriva de los eventos posteriores.
				</LI>
			</Box>
		),
	},
	{
		titulo: "3 · Decisión vs. Terminación (la regla central)",
		cuerpo: (
			<>
				<P>
					<B>Decisión</B> = se pronuncia sobre el mérito de una cuestión (hace lugar, rechaza, confirma…) sin cerrar el
					proceso. <B>Terminación</B> = clausura el proceso, con o sin pronunciamiento de mérito (sentencia definitiva,
					homologación que pone fin, caducidad, archivo de trámite vivo).
				</P>
				<Box component="ul" sx={{ pl: 2.25, m: 0 }}>
					<LI>
						<B>Archívese de rutina</B> (el proceso ya terminó por otro acto): función <Codigo>ordenacion</Codigo>,
						resultado no aplica. Solo si el archivo CIERRA un trámite vivo (inactividad, "sin más trámite"): función{" "}
						<Codigo>terminacion</Codigo> + modo <Codigo>archivo</Codigo>.
					</LI>
					<LI>
						Una resolución que <B>ordena</B> el archivo como consecuencia de lo que decide es <Codigo>decision</Codigo>,
						no terminación.
					</LI>
					<LI>
						<B>Homologación</B>: si el acuerdo pone fin al pleito → terminación + modo según el negocio (conciliación /
						transacción / homologación de acuerdo). Si homologa algo parcial (pago a cuenta, acuerdo de honorarios) →
						decisión.
					</LI>
					<LI>
						<B>Terminación y alzada</B>: la función mide lo que ESTE documento hace al proceso, sin mirar el futuro. La
						primera que declara incompetencia y archiva → terminación (aunque después la revoquen). La alzada que{" "}
						<B>revoca</B> esa terminación → decisión (reabre). La alzada que <B>confirma</B> una terminación anterior →
						también decisión (confirma): no re-termina, agrega firmeza — y la firmeza la deriva el motor. Solo lleva
						terminación el documento de alzada que clausura de nuevo cuño algo vivo (revoca la sentencia y rechaza la
						demanda; declara caducidad).
					</LI>
				</Box>
			</>
		),
	},
	{
		titulo: "4 · Resultado y decisiones múltiples",
		cuerpo: (
			<>
				<P>
					Cuando un mismo acto resuelve varias cosas (incluso en sentidos opuestos), el <B>Resultado</B> toma el sentido
					de la <B>decisión principal</B> (lo que este órgano juzga en el mérito) y cada disposición va como fila de{" "}
					<B>Decisiones</B>.
				</P>
				<P>
					Ejemplo clásico — reposición con apelación en subsidio: "no ha lugar al planteo… presente la apelación
					subsidiaria" → Resultado <Codigo>rechaza</Codigo>; Decisiones: <Codigo>revocatoria → rechaza</Codigo> +{" "}
					<Codigo>apelacion_subsidiaria → concede</Codigo>.
				</P>
				<P>
					<B>De parte vs. de oficio</B>: la <Codigo>excepcion_incompetencia</Codigo> (planteada por una parte) se
					resuelve con hace lugar / rechaza; la <Codigo>incompetencia_de_oficio</Codigo> (el propio juzgado se declara
					incompetente, sin petición) lleva resultado <Codigo>declara</Codigo> — no hay petición que conceder. El mismo
					resultado "declara" sirve para otros pronunciamientos de oficio (caducidad, rebeldía).
				</P>
				<P>
					El <B>objeto decidido</B> es un selector con vocabulario curado; si falta un valor, escribilo y Enter — se
					normaliza a <Codigo>snake_case</Codigo> y reaparece como opción en la causa. En la mayoría de los documentos la
					sección queda vacía. El resultado de cada fila se limita a los sentidos coherentes con el objeto elegido
					("Otro" siempre disponible).
				</P>
				<P>
					<B>Pares de alzada</B>: si el movimiento parece una revisión de segunda instancia y antes hubo una decisión con
					objetos decididos seguida de concesión/elevación de recurso, aparece el aviso "✦ Posible par de alzada" con un
					botón para agregar la fila espejo (mismo objeto, resultado confirma/revoca/modifica). Es sugerencia: el par
					puede no existir — sin señal de apelación no se ofrece.
				</P>
			</>
		),
	},
	{
		titulo: "5 · Cargas procesales",
		cuerpo: (
			<>
				<P>
					La carga NO repite el acto: el acto clasifica ("este documento intima"), la carga extrae el contenido —{" "}
					<B>a quién</B> (destinatarios), <B>qué</B> (acción de lista cerrada), <B>plazo</B> y <B>apercibimiento</B>. Una
					fila por carga: un traslado a la demandada + intimación al letrado por el bono son DOS filas.
				</P>
				<P>
					Opcional y selectivo: completar cuando el acto impone conductas con plazo. En resoluciones largas, cargá las
					2-3 de mayor peso — calidad y variedad valen más que exhaustividad.
				</P>
			</>
		),
	},
	{
		titulo: "6 · Réplicas y vinculación",
		cuerpo: (
			<>
				<P>
					Movimientos que son el MISMO documento repetido se vinculan con "Vincular réplica" (modo pegajoso: un click por
					cada copia, Esc para terminar). Los números que se muestran son los de la lista visible.
				</P>
				<P>
					Los vinculados quedan <B>sincronizados</B>: todo cambio de anotación impacta en el grupo completo (excepto
					notas, descartar y el propio vínculo).
				</P>
			</>
		),
	},
	{
		titulo: "7 · Acto = ninguno y descartar",
		cuerpo: (
			<>
				<P>
					<B>Acto "Ninguno — no es resolución"</B>: para documentos de organismo que no son resoluciones. Fija tipo =
					no-es-resolución, limpia y bloquea las demás dimensiones, y el movimiento valida como completo (cuadraditos
					verde tenue).
				</P>
				<P>
					<B>Descartar</B>: para movimientos que no deben entrar al dataset (duplicados defectuosos, ruido). Un
					descartado no bloquea ningún tick.
				</P>
			</>
		),
	},
	{
		titulo: "8 · Validaciones al marcar anotada",
		cuerpo: (
			<Box component="ul" sx={{ pl: 2.25, m: 0 }}>
				<LI>Función terminación → resultado Y modo de terminación obligatorios.</LI>
				<LI>Función decisión → resultado real obligatorio (no "no aplica").</LI>
				<LI>Impulso / ordenación / suspensión / reanudación → resultado solo "no aplica" (o vacío).</LI>
				<LI>Modo de terminación únicamente con función terminación.</LI>
				<LI>"No es resolución" solo admite acto "ninguno"; y "ninguno" exige ese tipo (el flujo lo arma solo).</LI>
				<LI>Decisiones con objeto → con resultado; cargas con datos → con acción.</LI>
			</Box>
		),
	},
	{
		titulo: "9 · Advertencias ⚠ de divergencia",
		cuerpo: (
			<>
				<P>
					Si un valor elegido difiere de la <B>combinación típica del acto</B> (la que sugieren las ✦), el movimiento
					muestra un <B>⚠ ámbar</B> en la lista y el panel explica qué difiere y qué se esperaba.
				</P>
				<P>
					<B>No es un error</B>: la combinación típica es la frecuente, no la única válida (ej. un archívese que sí
					termina el proceso, un homologa parcial que es decisión). Si al releer confirmás tu elección, dejala — la
					advertencia es informativa y sirve para el pase de verificación. Si fue un descuido, corregila.
				</P>
			</>
		),
	},
];

// ── Detalle de Función: impulso vs ordenación con ejemplos reales ────────────
const EJEMPLOS_IMPULSO: [string, string][] = [
	["Incorpórese al sistema la digitalización acompañada", "recibe y sigue — nada queda pendiente"],
	["Téngase presente lo manifestado / por presentada la memoria", "receptivo puro"],
	["Por contestado el oficio a AFIP. Hágase saber a las partes", "recibe prueba producida (materia: prueba)"],
	["Téngase por oblada la tasa de justicia / agréguese el CUIT", "receptivo administrativo"],
	["Por devueltos. Hágase saber (sin más disposiciones)", "mera constancia de reingreso"],
	["Por recibido, hágase saber la Sala que va a conocer", "de paso"],
	["Córrase traslado de la demanda / del responde", "impone contestar, pero ES la marcha prevista del contradictorio"],
	["Pasen las actuaciones a proveer las pruebas / autos a sentencia", "mueve el expediente a la próxima estación"],
];
const EJEMPLOS_ORDENACION: [string, string][] = [
	["Intímese al perito a presentar informe en 3 días bajo apercibimiento de remoción", "exige fuera de la marcha normal, con apercibimiento"],
	["Intímese a acreditar personería… una vez cumplido, se proveerá la presentación", "FRENA el trámite hasta el cumplimiento — señal máxima"],
	["Señálense las audiencias del día… por MEET… notifíquese a los testigos", "configura fecha, modo y condiciones"],
	["Desígnase perito… previa aceptación del cargo dentro de 3 días", "instrumenta la producción"],
	["Auto de apertura a prueba (audiencias + sorteo + oficios + intimaciones)", "el configurador por excelencia — 5 páginas de organización"],
	["Previo a resolver, líbrese oficio a la SRT (medida para mejor proveer)", "'previo a…' = condicionante"],
	["Requisitos de giro: CBU de titularidad exclusiva, caución, constancia impositiva", "configura el trámite del cobro"],
	["Archívese (de rutina, proceso ya terminado)", "disposición administrativa del expediente"],
];

const DetalleFuncion = () => (
	<>
		<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
			El test central
		</Typography>
		<P>
			<B>Impulso</B> = proveído <B>receptivo o de paso</B>: el juzgado recibe algo o mueve el expediente y el trámite
			sigue solo, sin que ese proveído deje nada pendiente ni configure nada.
		</P>
		<P>
			<B>Ordenación</B> = proveído <B>configurador o condicionante</B>: establece cómo, cuándo y quién — o directamente
			frena el avance hasta que algo se cumpla.
		</P>
		<Box sx={{ p: 1, borderRadius: 1, bgcolor: (t) => alpha(t.palette.info.main, 0.07), mb: 1.5 }}>
			<Typography variant="caption" sx={{ display: "block", lineHeight: 1.5 }}>
				<B>Tres reglas de oro:</B>
				<br />1 · "Una vez cumplido, se proveerá…" → siempre ordenación.
				<br />2 · El avance de etapa lo captura el <B>Acto</B> (abre_a_prueba es hito por sí mismo), NO la función — no
				uses impulso para decir "esto avanza el proceso".
				<br />3 · El traslado impone contestar, pero es la marcha normal del contradictorio → impulso. La intimación
				exige fuera de la marcha normal → ordenación.
			</Typography>
		</Box>
		<Typography variant="subtitle2" fontWeight={700} sx={{ color: "success.main", mb: 0.5 }}>
			✓ IMPULSO — casos reales
		</Typography>
		<Box component="ul" sx={{ pl: 2.25, m: 0, mb: 1.5 }}>
			{EJEMPLOS_IMPULSO.map(([ej, por]) => (
				<LI key={ej}>
					<i>"{ej}"</i> — {por}
				</LI>
			))}
		</Box>
		<Typography variant="subtitle2" fontWeight={700} sx={{ color: "warning.main", mb: 0.5 }}>
			✓ ORDENACIÓN — casos reales
		</Typography>
		<Box component="ul" sx={{ pl: 2.25, m: 0, mb: 1.5 }}>
			{EJEMPLOS_ORDENACION.map(([ej, por]) => (
				<LI key={ej}>
					<i>"{ej}"</i> — {por}
				</LI>
			))}
		</Box>
		<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
			Las otras funciones, en una línea
		</Typography>
		<Box component="ul" sx={{ pl: 2.25, m: 0 }}>
			<LI>
				<B>Decisión</B>: se pronuncia sobre el mérito de una cuestión (hace lugar, rechaza, confirma…) sin cerrar el
				proceso.
			</LI>
			<LI>
				<B>Terminación</B>: ESE documento clausura el proceso (sentencia definitiva, homologación que pone fin,
				caducidad, incompetencia que archiva). Sin lookahead: si después lo revocan, no se reescribe.
			</LI>
			<LI>
				<B>Suspensión / Reanudación</B>: detiene o reactiva formalmente el curso del proceso (no un plazo puntual — la
				suspensión del plazo de un perito va como parte del proveído, no cambia la función).
			</LI>
		</Box>
	</>
);

const EtiquetadoGuia = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
	const theme = useTheme();
	const [vista, setVista] = useState<"principal" | "funcion">("principal");
	return (
		<Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, p: 2.5 } }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
				<Stack direction="row" alignItems="center" spacing={1}>
					{vista !== "principal" && (
						<IconButton size="small" onClick={() => setVista("principal")}>
							<ArrowLeft size={18} />
						</IconButton>
					)}
					<Typography variant="h5">{vista === "funcion" ? "Función: impulso vs ordenación" : "Guía del operador"}</Typography>
					{vista === "principal" && <Chip size="small" variant="outlined" label="taxonomía v2" />}
				</Stack>
				<IconButton size="small" onClick={onClose}>
					<CloseSquare size={20} />
				</IconButton>
			</Stack>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
				Convenciones para anotar de forma consistente. Ante la duda, anotá lo que el documento efectivamente hace y dejá
				la duda en Notas — mejor una nota que una categoría inventada.
			</Typography>
			<Divider sx={{ mb: 1.5 }} />
			{vista === "funcion" ? (
				<DetalleFuncion />
			) : (
				SECCIONES.map((s, i) => (
					<Fragment key={s.titulo}>
						{i > 0 && <Divider sx={{ my: 1.5, borderColor: alpha(theme.palette.divider, 0.6) }} />}
						<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
							{s.titulo}
						</Typography>
						{s.cuerpo}
						{i === 1 && (
							<Button size="small" variant="text" sx={{ mt: 0.5, textTransform: "none" }} onClick={() => setVista("funcion")}>
								→ Función en detalle: impulso vs ordenación, con ejemplos reales
							</Button>
						)}
					</Fragment>
				))
			)}
		</Drawer>
	);
};

export default EtiquetadoGuia;
