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
					<B>Materia</B>: sobre qué versa lo dispuesto. <B>Ojo con el default:</B> <Codigo>fondo</Codigo> SOLO si trata
					la pretensión (traslado de demanda/contestación, sentencia); los despachos de forma pura (personería, bono,
					tasa, copias, protocolo digital, hágase saber) van a <Codigo>tramite</Codigo>. En el carril de cobro:{" "}
					<Codigo>liquidacion</Codigo> = el cálculo (se practica/impugna/aprueba); <Codigo>honorarios</Codigo> = el
					crédito del profesional; <Codigo>ejecucion</Codigo> = el cobro genérico (giros, pagos, embargo ejecutorio).
					La mediación previa (ley 26.589) es PREJUDICIAL: sus ecos en el expediente (constancias, reapertura,
					intimación a acreditarla, rechazo por falta de mediación) son requisito de admisibilidad →{" "}
					<Codigo>tramite</Codigo>.
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
	["Pasen las actuaciones a proveer las pruebas / autos a sentencia / póngase los autos para alegar", "mueve el expediente a la próxima estación del iter previsto — abre una ventana legal, no exige"],
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

// ── Detalle de Decisiones y Cargas: moldes con ejemplos reales ────────────────
const DetalleDecisionesCargas = () => (
	<>
		<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
			Decisiones — cuándo y cómo
		</Typography>
		<P>
			Se crean filas cuando la parte dispositiva resuelve <B>varias cosas</B>. Si el documento decide UNA sola cosa, el
			Resultado principal alcanza y la sección queda vacía. Solo cuenta la <B>parte dispositiva</B>: menciones en el
			relato, apercibimientos de pérdida de honorarios o montos de giros NO generan filas.
		</P>
		<Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1, mb: 0.5, color: "primary.main" }}>
			Moldes reales (de FOLETTO y CENTURION)
		</Typography>
		<Box component="ul" sx={{ pl: 2.25, m: 0, mb: 1 }}>
			<LI>
				<B>Sentencia definitiva</B> — SIEMPRE tres filas: <Codigo>fondo = hace_lugar</Codigo> ·{" "}
				<Codigo>costas = impone</Codigo> "a la demandada (art. 68)" · <Codigo>honorarios = regula</Codigo> "letrados 19
				y 16 UMA; perito $80.000".
			</LI>
			<LI>
				<B>Interlocutoria de excepción</B>: <Codigo>excepcion_incompetencia = rechaza</Codigo> ·{" "}
				<Codigo>costas = impone</Codigo> "orden causado".
			</LI>
			<LI>
				<B>Incompetencia de oficio</B>: <Codigo>incompetencia_de_oficio = declara</Codigo> ·{" "}
				<Codigo>inconstitucionalidad = rechaza</Codigo> · <Codigo>costas = impone</Codigo> "por su orden".
			</LI>
			<LI>
				<B>Reposición con apelación en subsidio</B>: <Codigo>revocatoria = rechaza</Codigo> ·{" "}
				<Codigo>apelacion_subsidiaria = concede</Codigo>.
			</LI>
			<LI>
				<B>Alzada</B>: <Codigo>incompetencia_de_oficio = revoca</Codigo> · <Codigo>costas = impone</Codigo> "sin
				costas". (La revisión usa confirma/revoca/modifica.)
			</LI>
			<LI>
				<B>Homologatoria</B>: <Codigo>honorarios = regula</Codigo> "perito 4 UMA ($41.600), a cargo de la demandada".
			</LI>
			<LI>
				<B>Auto de apertura a prueba</B>: <Codigo>prueba = rechaza</Codigo> (oposición a testigos, confesional
				desestimada).
			</LI>
		</Box>
		<Box sx={{ p: 1, borderRadius: 1, bgcolor: (t) => alpha(t.palette.info.main, 0.07), mb: 1.5 }}>
			<Typography variant="caption" sx={{ display: "block", lineHeight: 1.5 }}>
				<B>Resultados por objeto:</B> costas de 1er grado → <Codigo>impone</Codigo>; honorarios de 1er grado →{" "}
				<Codigo>regula</Codigo>; pronunciamientos de oficio → <Codigo>declara</Codigo>; alzada →{" "}
				<Codigo>confirma/revoca/modifica</Codigo>; peticiones → <Codigo>hace_lugar/rechaza</Codigo>; recursos →{" "}
				<Codigo>concede/deniega</Codigo>.
				<br />
				<B>Campo detalle</B> (libre): la distribución fina — "orden causado", "por mitades", "70% demandada", "comunes
				por mitades y propias a su cargo", montos/UMA de honorarios.
			</Typography>
		</Box>

		<Divider sx={{ my: 1.5 }} />
		<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
			Cargas — cuándo y cómo
		</Typography>
		<P>
			La carga extrae el contenido operativo: <B>quién</B> debe hacer <B>qué</B>, en qué <B>plazo</B> y bajo qué{" "}
			<B>apercibimiento</B>. Una fila por carga (un proveído puede imponer varias). El acto clasifica ("este documento
			intima"); la carga extrae.
		</P>
		<Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1, mb: 0.5, color: "primary.main" }}>
			Moldes reales
		</Typography>
		<Box component="ul" sx={{ pl: 2.25, m: 0, mb: 1 }}>
			<LI>
				<B>Traslado de demanda</B>: demandada → contestar_demanda · 10/15 días.
			</LI>
			<LI>
				<B>Traslado del responde</B> (2 filas): actora → reconocer/desconocer documental · 3 días; actora → ofrecer
				prueba · 3 días.
			</LI>
			<LI>
				<B>Personería</B>: letrado → acreditar_personeria · 3 días · "tenerlo por no presentado".
			</LI>
			<LI>
				<B>Auto de prueba</B> (las 3 de mayor peso): ambas → denunciar_datos_testigos · 10 días · "desistidos los
				testigos"; demandada → cumplir_intimacion (libros a disposición del perito) · 3 días · "imposibilidad de la
				pericial por su culpa"; partes → presentar_oficio · 60 días · "caducidad de pleno derecho".
			</LI>
			<LI>
				<B>Perito designado</B> (2 filas): perito → aceptar_cargo · 3 días; perito → presentar_informe · 30 días ·
				"remoción, pérdida de honorarios y comunicación a la CNAT".
			</LI>
			<LI>
				<B>Tasa de justicia</B>: demandada → pagar_tasa · 5 días · "multa (art. 11 ley 23.898)".
			</LI>
			<LI>
				<B>Copias digitales</B>: actora → integrar_copias · 3 días · "multa".
			</LI>
			<LI>
				<B>Requisitos de giro</B> (sin plazo — condición operativa): actora → denunciar_datos_bancarios; letrado →
				prestar_caucion.
			</LI>
			<LI>
				<B>Impulso post-devolución</B>: ambas + perito → impulsar_proceso · 3 días · "archivo sin más trámite ni
				recurso".
			</LI>
			<LI>
				<B>Audiencia</B>: ambas + letrados → comparecer_audiencia · plazo vacío (fecha fija) · "art. 63 LO
				(incomparecencia)".
			</LI>
		</Box>
		<Box sx={{ p: 1, borderRadius: 1, bgcolor: (t) => alpha(t.palette.warning.main, 0.07) }}>
			<Typography variant="caption" sx={{ display: "block", lineHeight: 1.5 }}>
				<B>Criterios:</B>
				<br />· Cargar cuando hay conducta + plazo + apercibimiento. Sin plazo, SOLO condiciones operativas reales
				(requisitos de giro).
				<br />· En resoluciones largas: las 2-3 de mayor peso — calidad y variedad valen más que exhaustividad.
				<br />· La carga vive en el documento que la IMPONE: el que la refiere ("una vez denunciadas las casillas…") o
				el que registra su cumplimiento ("por denunciados los datos") NO la repiten.
				<br />· Fecha fija (audiencias) → plazo vacío y la fecha en el apercibimiento o nota.
			</Typography>
		</Box>
	</>
);

// ── Detalle de Materia: sobre qué versa, con ejemplos reales ──────────────────
const DetalleMateria = () => (
	<>
		<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
			La pregunta única
		</Typography>
		<P>
			<B>¿Sobre qué versa la parte dispositiva?</B> No importa de dónde viene el expediente ni en qué etapa está — solo
			el objeto de lo que ESTE proveído dispone.
		</P>
		<Box sx={{ p: 1, borderRadius: 1, bgcolor: (t) => alpha(t.palette.warning.main, 0.07), mb: 1.5 }}>
			<Typography variant="caption" sx={{ display: "block", lineHeight: 1.5 }}>
				<B>Ojo con el default `fondo`:</B> fondo SOLO si trata la pretensión — traslados de demanda/contestación,
				sentencia definitiva, resolución del fondo. Todo despacho de forma pura va a <Codigo>tramite</Codigo>.
			</Typography>
		</Box>
		<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, color: "primary.main" }}>
			Casos reales por familia
		</Typography>
		<Box component="ul" sx={{ pl: 2.25, m: 0, mb: 1.5 }}>
			<LI>
				<B>Trámite (forma pura)</B>: personería, bono profesional, tasa de justicia, copias (digitales o físicas),
				protocolo digital Ac. 31/2020, ecos de la mediación prejudicial, pases (a sentencia, a alegar), declaración de
				rebeldía (la señal la lleva el ACTO <Codigo>declara_rebeldia</Codigo>), oficios a la IGJ por el domicilio de
				notificación.
			</LI>
			<LI>
				<B>Receptivos — sigue al objeto recibido</B>: contestación de oficio informativo o pericia presentada →{" "}
				<Codigo>prueba</Codigo>; liquidación presentada → <Codigo>liquidacion</Codigo>; constancias administrativas →{" "}
				<Codigo>tramite</Codigo>.
			</LI>
			<LI>
				<B>Audiencias — por su fin</B>: "a fin de que arriben a un acuerdo conciliatorio" (art. 80 LO) o ratificación
				de acuerdo → <Codigo>conciliacion</Codigo>; testimonial → <Codigo>prueba</Codigo>.
			</LI>
			<LI>
				<B>Embargos — dos mundos</B>: preventivo (art. 63 CPCCN, típico post-rebeldía, con presupuesto de intereses y
				costas, ANTES de la sentencia) → <Codigo>cautelar</Codigo>; ejecutorio (por incumplimiento de intimación de
				pago, DESPUÉS de la condena) → <Codigo>ejecucion</Codigo>.
			</LI>
			<LI>
				<B>Circuito recursivo</B>: la tramitación (concede, deniega, eleva, radica en alzada) → <Codigo>recurso</Codigo>;
				la RESOLUCIÓN del recurso en la alzada → la sustancia revisada (la Sala que confirma honorarios →{" "}
				<Codigo>honorarios</Codigo>; la que revoca una incompetencia → <Codigo>competencia</Codigo>).
			</LI>
			<LI>
				<B>Carril de cobro</B> (contexto = ejecución): <Codigo>liquidacion</Codigo> = el cálculo (se
				practica/traslada/impugna/aprueba/desestima); <Codigo>honorarios</Codigo> = el crédito del profesional
				(regulación, apelación, intimación a depositarlos); <Codigo>ejecucion</Codigo> = el cobro genérico (giros,
				pagos, dación, requisitos de transferencia).
			</LI>
			<LI>
				<B>Otras específicas</B>: excepción o declaración de incompetencia → <Codigo>competencia</Codigo>; formación de
				incidente de recusación → <Codigo>recusacion</Codigo>; apercibimiento efectivizado → la materia de la carga
				incumplida (bono → trámite; prueba → prueba).
			</LI>
		</Box>
		<Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
			`otro` queda reservado para materias reales que no están en la lista — nunca como comodín de trámite.
		</Typography>
	</>
);

const EtiquetadoGuia = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
	const theme = useTheme();
	const [vista, setVista] = useState<"principal" | "funcion" | "decisiones-cargas" | "materia">("principal");
	return (
		<Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, p: 2.5 } }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
				<Stack direction="row" alignItems="center" spacing={1}>
					{vista !== "principal" && (
						<IconButton size="small" onClick={() => setVista("principal")}>
							<ArrowLeft size={18} />
						</IconButton>
					)}
					<Typography variant="h5">
						{vista === "funcion"
							? "Función: impulso vs ordenación"
							: vista === "decisiones-cargas"
							? "Decisiones y Cargas: cómo completarlas"
							: vista === "materia"
							? "Materia: sobre qué versa"
							: "Guía del operador"}
					</Typography>
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
			) : vista === "decisiones-cargas" ? (
				<DetalleDecisionesCargas />
			) : vista === "materia" ? (
				<DetalleMateria />
			) : (
				SECCIONES.map((s, i) => (
					<Fragment key={s.titulo}>
						{i > 0 && <Divider sx={{ my: 1.5, borderColor: alpha(theme.palette.divider, 0.6) }} />}
						<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
							{s.titulo}
						</Typography>
						{s.cuerpo}
						{i === 1 && (
							<Stack spacing={0}>
								<Button size="small" variant="text" sx={{ mt: 0.5, textTransform: "none", justifyContent: "flex-start" }} onClick={() => setVista("funcion")}>
									→ Función en detalle: impulso vs ordenación, con ejemplos reales
								</Button>
								<Button size="small" variant="text" sx={{ textTransform: "none", justifyContent: "flex-start" }} onClick={() => setVista("materia")}>
									→ Materia en detalle: fondo vs trámite y casos por familia
								</Button>
							</Stack>
						)}
						{(i === 3 || i === 4) && (
							<Button
								size="small"
								variant="text"
								sx={{ mt: 0.5, textTransform: "none" }}
								onClick={() => setVista("decisiones-cargas")}
							>
								→ Decisiones y Cargas en detalle: moldes reales y criterios
							</Button>
						)}
					</Fragment>
				))
			)}
		</Drawer>
	);
};

export default EtiquetadoGuia;
