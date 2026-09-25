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
					<B>Tipo</B>: forma del documento. Providencia simple (trámite, sin fundamentos), sentencia interlocutoria
					(resuelve cuestión controvertida con fundamentos), sentencia definitiva (el fondo), sentencia homologatoria,{" "}
					<B>acta de audiencia</B> (no es resolución, pero es un acto del tribunal), otra, o no-es-resolución.
					El tipo se juzga por ESTRUCTURA y fundamentación, no por lo que resuelve: la reposición desestimada en
					despacho breve ("no ha lugar, presente la apelación") es providencia simple; solo es interlocutoria con
					AUTOS Y VISTOS / considerandos o fundamentación desarrollada. Un auto de apertura a prueba: providencia
					simple; si resuelve oposición con fundamentos, interlocutoria.
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
					caducidad, archivo…). Manda la vía real: la sentencia que se dicta por allanamiento (art. 307 CPCCN) lleva
					modo <Codigo>allanamiento</Codigo>, no "sentencia sobre fondo". La ejecución termina por{" "}
					<Codigo>cumplimiento</Codigo> (pago total), no por sentencia.
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
					proceso. <B>Terminación</B> = TODA forma de terminación del proceso, normal o anormal: con o sin
					pronunciamiento de mérito (sentencia definitiva,
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
					<LI>
						<B>Juicio ejecutivo</B>: el auto inicial (mandamiento de intimación de pago y citación de remate, art. 531)
						→ <Codigo>intima_pago_cita_remate</Codigo> · fondo · impulso (cumple la función del traslado de demanda); el
						embargo preventivo va como secundario y fila de Decisiones. La <B>sentencia de remate</B> (o de trance y
						remate) NO es terminación: cierra la etapa de conocimiento y, si manda llevar adelante la ejecución, el
						proceso sigue con la liquidación, la subasta y el pago → <Codigo>resuelve_fondo</Codigo> · interlocutoria ·
						decisión · <Codigo>hace_lugar</Codigo> (estimatoria) o <Codigo>rechaza</Codigo> (desestimatoria), sin modo de
						terminación, aunque medie allanamiento. Excepción: el rechazo <B>total</B> de la ejecución (remate
						desestimatorio o rechazo in límine de la demanda ejecutiva) no deja nada que ejecutar y cierra el proceso →
						terminación · <Codigo>sentencia_sobre_fondo</Codigo> · <Codigo>rechaza</Codigo>, aunque después la alzada lo
						revoque. El rechazo parcial (sigue contra otro codemandado) sigue siendo decisión.
					</LI>
					<LI>
						<B>Ejecución fiscal</B> (AFIP/ARCA, art. 92 ley 11.683, y cobros análogos): el juez tiene por promovida la
						demanda y decreta el embargo, pero el mandamiento de intimación lo diligencia el agente fiscal u oficial ad
						hoc. Ese auto igual va como <Codigo>intima_pago_cita_remate</Codigo> · fondo · impulso (es el auto inicial
						de la ejecución), con el embargo como secundario y fila de Decisiones. La sentencia que «declara expedita la
						vía de ejecución» es el remate → <Codigo>resuelve_fondo</Codigo> · decisión.
					</LI>
					<LI>
						<B>Medidas cautelares distintas del embargo</B> (inhibición general de bienes, secuestro, anotación de
						litis, prohibición de innovar o de contratar, intervención) → <Codigo>ordena_medida_cautelar</Codigo> ·
						cautelar · decisión, con fila <Codigo>medida_cautelar</Codigo>. El embargo sigue siendo{" "}
						<Codigo>ordena_embargo</Codigo>. Si el auto ordena ambas, el principal es la que responde al pedido y la
						otra va como secundario.
					</LI>
					<LI>
						<B>Preparación de la vía ejecutiva</B> (arts. 525-526 CPCCN): si el instrumento es privado y la firma no
						está certificada (contrato de locación, pagaré, reconocimiento de deuda), todavía no hay título: el juez
						cita al deudor a reconocer la firma en lugar de librar el mandamiento → <Codigo>cita_reconocimiento_firma</Codigo>{" "}
						· fondo · impulso (cumple la función del traslado de demanda), con carga «reconocer_desconocer_documental»
						si indica plazo y apercibimiento. Si en el mismo auto posterga el embargo por no estar preparada la vía,
						va una fila <Codigo>embargo → rechaza</Codigo>. Reconocida la firma (o tenida por reconocida), el auto que
						libra el mandamiento sigue siendo <Codigo>intima_pago_cita_remate</Codigo>.
					</LI>
					<LI>
						<B>Ampliación posterior a la sentencia</B> (art. 541 CPCCN, típico de expensas): la intimación por los nuevos
						períodos vencidos («presenten los documentos que acrediten la extinción… bajo apercibimiento de hacer
						extensiva la sentencia») → <Codigo>intima_pago_cita_remate</Codigo> · fondo · impulso, con carga; la
						resolución que hace extensiva la sentencia a los nuevos períodos → <Codigo>resuelve_fondo</Codigo> ·
						decisión · <Codigo>hace_lugar</Codigo> (como el remate, nunca terminación).
					</LI>
					<LI>
						<B>Subasta</B>: el decreto que ordena la subasta de los bienes embargados (modalidad, base, martillero) →{" "}
						<Codigo>ordena_subasta</Codigo> · ejecución · decisión · <Codigo>hace_lugar</Codigo>, con{" "}
						<Codigo>designa_perito</Codigo> como secundario por el martillero. Los previos (oficios del art. 576,
						título, constatación) siguen siendo oficios, intimaciones o mandamientos.
					</LI>
					<LI>
						<B>Rechazo de la conexidad o del fuero de atracción</B> (el juzgado al que llegó la causa por conexidad o
						por la sucesión del deudor la devuelve para su sorteo, antes de radicarse) →{" "}
						<Codigo>declara_incompetencia</Codigo> · competencia · decisión · <Codigo>declara</Codigo>, sin
						terminación: es un paso de asignación y la causa sigue en otro juzgado.
					</LI>
					<LI>
						<B>Ejecución de sentencia</B> (arts. 499-516 CPCCN, incluida la de honorarios): tiene articulado propio y
						se marca distinto del juicio ejecutivo. No hay mandamiento de intimación: primero se embarga (art. 502 →{" "}
						<Codigo>ordena_embargo</Codigo> · ejecución) y, trabada la medida, se <B>cita de venta</B> para oponer
						excepciones (art. 505) → <Codigo>cita_venta</Codigo> · ejecución · impulso (carga solo si el despacho indica
						el apercibimiento). Si el mismo auto embarga y ordena citar, el embargo es el principal y{" "}
						<Codigo>cita_venta</Codigo> va como secundario. La sentencia del <B>art. 508</B> (resuelve las excepciones y
						manda continuar la ejecución) → <Codigo>resuelve_ejecucion_sentencia</Codigo> · interlocutoria · ejecución ·
						decisión · <Codigo>hace_lugar</Codigo> (no prosperan o no se opusieron) o <Codigo>rechaza</Codigo>{" "}
						(prosperan), con fila de Decisiones de objeto <Codigo>ejecucion</Codigo>; nunca es terminación.
					</LI>
					<LI>
						<B>Terminación por cumplimiento</B> (modo <Codigo>cumplimiento</Codigo>): el proceso de conocimiento
						termina con la sentencia; la <B>ejecución</B> (ejecutivo, ejecuciones especiales) termina con el{" "}
						<B>cumplimiento</B>. Va en el documento que tiene por satisfecho el crédito y cierra la ejecución: levanta
						las medidas o cancela la garantía por pago total, tiene por cumplida la ejecución o archiva por pago →
						función terminación · modo <Codigo>cumplimiento</Codigo> (acto según lo que dispone:{" "}
						<Codigo>levanta_embargo</Codigo>, <Codigo>archiva</Codigo>, <Codigo>registra_pago</Codigo>). Los pagos
						parciales, las daciones en pago y los giros siguen siendo impulso/ordenación: no terminan. El archivo por
						inactividad sigue siendo modo <Codigo>archivo</Codigo>. La etapa de ejecución de sentencia de un proceso de
						conocimiento no usa este modo: ese proceso ya terminó con la sentencia.
						<br />
						<B>Cumplimiento ≠ desistimiento</B>: son modos distintos. Si el juez concluye el proceso sobre el pago
						denunciado («informa pago», «carta de pago… por concluidas») → <Codigo>cumplimiento</Codigo>. Si provee un{" "}
						<B>desistimiento</B> (escrito «desiste»; «téngase presente el desistimiento de la acción y del derecho»),
						aunque mencione una carta de pago → <Codigo>acepta_desistimiento</Codigo> · modo{" "}
						<Codigo>desistimiento_del_derecho</Codigo> (o <Codigo>desistimiento_del_proceso</Codigo> si solo desiste de
						la acción, art. 304), con <Codigo>registra_pago</Codigo> como secundario. Si el actor pide el archivo sin
						causa visible → modo <Codigo>archivo</Codigo>. Mirar el título del escrito que se provee.
					</LI>
					<LI>
						<B>Recurso «mal concedido»</B>: la alzada revisa la admisibilidad aunque el juez lo haya concedido. Si
						declara que no debió concederse (monto inferior al mínimo del art. 242, resolución inapelable,
						extemporáneo), NO trata el recurso → <Codigo>resuelve_recurso</Codigo> · segunda instancia · decisión ·{" "}
						<Codigo>deniega</Codigo> (la contracara de <Codigo>concede</Codigo>), con fila «recurso_apelacion → deniega:
						mal concedido (…)». No es <Codigo>confirma</Codigo> (no revisó lo resuelto) ni <Codigo>rechaza</Codigo> (no
						lo trató). Lo resuelto en primera instancia queda firme.
					</LI>
					<LI>
						<B>Allanamiento con varios demandados</B>: el modo <Codigo>allanamiento</Codigo> solo corresponde si se
						allanan todos y la sentencia cierra el proceso. Si se allana uno y contra los otros el juicio sigue (o se
						ejecuta), no hay terminación por allanamiento.
					</LI>
					<LI>
						<B>Llegada a la alzada</B>: el primer proveído de la Sala (hace saber la Sala que va a conocer, el{" "}
						<B>orden de votación</B> o la <B>integración</B>) → <Codigo>recibe_autos_alzada</Codigo> · segunda instancia ·
						recurso · recursiva · impulso, aunque no diga "por recibido".
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
					<B>Concede prórroga</B>: el pedido de más plazo (de un perito o de una parte) que el juzgado concede → acto{" "}
					<Codigo>concede_prorroga</Codigo> · decisión · <Codigo>concede</Codigo>. La materia sigue al plazo prorrogado
					(prueba, ejecución…). Si además fija el nuevo plazo con apercibimiento, el documento también intima: va{" "}
					<Codigo>intima</Codigo> como acto secundario y el plazo como carga (ej. perito → presentar informe · 10 días ·
					"remoción"). Si la deniega: acto <Codigo>otro</Codigo> · decisión · <Codigo>deniega</Codigo>.
				</P>
				<P>
					<B>Remoción del perito y citación de terceros</B>: no tienen acto propio. La remoción que se efectiviza va como{" "}
					<Codigo>efectiviza_apercibimiento</Codigo> con fila <Codigo>remocion_perito</Codigo>; la citación de terceros
					(arts. 90-94 CPCCN) que el juez admite o rechaza va como acto <Codigo>otro</Codigo> · decisión, con fila{" "}
					<Codigo>citacion_tercero</Codigo> y el sentido que corresponda. Si la citación se vuelve frecuente, se evaluará un
					acto propio.
				</P>
				<P>
					<B>Difiere proveer</B>: providencia simple que no trata lo pedido porque todavía no quedó firme, cumplido o
					notificado algo anterior ("firme que se encuentre la sentencia, peticiónese y se proveerá"; "trabada la litis
					con todos, se proveerá lo demás") → acto <Codigo>difiere_proveimiento</Codigo> · ordenación · no aplica; la
					materia sigue a lo pedido. Si es todo el proveído, va como acto principal; si acompaña a otro acto (tiene por
					presentado, intima, corre traslado), como secundario. No es un rechazo: no lleva fila de decisión implícita.
				</P>
				<P>
					<B>Declara negligencia</B>: resuelve el acuse de negligencia en la producción de la prueba de la contraria
					(art. 384 CPCCN) → acto <Codigo>declara_negligencia</Codigo> · materia prueba · decisión. Resultado{" "}
					<Codigo>hace_lugar</Codigo> si la declara (pierde el derecho a producir esa prueba), <Codigo>rechaza</Codigo> si
					no, <Codigo>hace_lugar_parcialmente</Codigo> si es mixta; una fila por medio probatorio y las costas. El tipo
					sigue a la estructura (suele ser interlocutoria). El traslado del acuse es <Codigo>corre_traslado</Codigo>.
					Distinto de <Codigo>declara_desistida_prueba</Codigo>: ese efectiviza un apercibimiento ya impuesto, sin acuse.
				</P>
				<P>
					<B>Desistimiento de prueba propia</B>: si la parte renuncia voluntariamente a una prueba que ella ofreció («a
					pedido de la actora, por desistida la pericial…») → <Codigo>acepta_desistimiento</Codigo> · prueba · decisión ·{" "}
					<Codigo>declara</Codigo>. <Codigo>declara_desistida_prueba</Codigo> queda solo para la sanción: el juez la tiene
					por desistida por silencio o por no cumplir una intimación. En un acta, el desistimiento voluntario va como
					secundario <Codigo>acepta_desistimiento</Codigo>.
				</P>
				<P>
					<B>Demanda interruptiva de prescripción</B>: el auto que la tiene por iniciada «al solo efecto de interrumpir la
					prescripción», sin traslado → <Codigo>tiene_por_presentado</Codigo> · fondo · impulso (intimaciones de tasa o
					bono como secundario y carga si hay plazo). Si después se corre traslado, la causa sigue las reglas de
					conocimiento.
				</P>
				<P>
					<B>La función sigue a lo que resuelve el acto al dictarse</B>, no a lo que pasa después: una sentencia que la
					Cámara revoca sigue siendo terminación, y una incompetencia con remisión que el otro juzgado rechaza (contienda
					negativa) sigue siendo terminación · <Codigo>incompetencia_con_remision</Codigo>; el auto que reasume la causa va
					como <Codigo>reanuda_proceso</Codigo>.
				</P>
				<P>
					<B>Recurso ley 27.348</B> (contra la Comisión Médica): se tramita como juicio completo en el juzgado, así que su
					sentencia es terminación · <Codigo>sentencia_sobre_fondo</Codigo> · <Codigo>resuelve_fondo</Codigo>, con el
					resultado según prospere el reclamo (confirmar a la Comisión = <Codigo>rechaza</Codigo>), no{" "}
					<Codigo>resuelve_recurso</Codigo>.
				</P>
				<P>
					<B>Rogatoria u oficio ley 22.172 recibido como causa</B> (otro juzgado pide diligenciar una prueba): todos los
					actos van con contexto <Codigo>otro</Codigo> y el acto que corresponda a lo que hacen (el auto de inicio suele ser{" "}
					<Codigo>designa_perito</Codigo> u <Codigo>ordena_oficio</Codigo>). La devolución al juzgado oficiante cierra la
					causa en este juzgado → terminación · modo <Codigo>otro</Codigo>.
				</P>
				<P>
					<B>Desalojo</B>: la sentencia de desalojo es la terminación. El decreto de lanzamiento va como{" "}
					<Codigo>ordena_lanzamiento</Codigo> · ejecución · decisión · <Codigo>hace_lugar</Codigo>; la desocupación inmediata
					del art. 684 bis, como <Codigo>ordena_medida_cautelar</Codigo> con carga <Codigo>prestar_caucion</Codigo>. La
					entrega del inmueble no es una segunda terminación: la ejecución de una sentencia de conocimiento no usa el modo{" "}
					<Codigo>cumplimiento</Codigo>. Sin sentencia: si el demandado restituye el inmueble y el juez da por concluido el
					proceso, terminación · modo <Codigo>cumplimiento</Codigo>; si se allana y el juez lo tiene por concluido,
					terminación · modo <Codigo>allanamiento</Codigo>. El lanzamiento dictado sin sentencia previa lleva contexto{" "}
					<Codigo>principal</Codigo>.
				</P>
				<P>
					<B>Quiebra</B>: la sentencia de quiebra va como <Codigo>declara_quiebra</Codigo> · fondo · decisión (abre el
					proceso, no lo termina). La resolución verificatoria (art. 36) es <Codigo>resuelve_fondo</Codigo> con una fila{" "}
					<Codigo>verificacion_credito</Codigo> por acreedor; la clausura por falta de activo (art. 232) es{" "}
					<Codigo>suspension</Codigo> (puede reabrirse); la conclusión es terminación · modo <Codigo>otro</Codigo>. El síndico
					sorteado se designa con <Codigo>designa_perito</Codigo>.
				</P>
				<P>
					<B>Sucesión</B>: el auto de apertura va como <Codigo>tiene_por_presentado</Codigo> · fondo · impulso; la
					declaratoria de herederos, como <Codigo>resuelve_fondo</Codigo> · interlocutoria · decisión ·{" "}
					<Codigo>declara</Codigo> (la sucesión sigue con inscripción y partición). En la testamentaria, el auto que declara
					válido el testamento en sus formas (art. 2339 CCCN) va igual, con fila <Codigo>validez_testamento</Codigo>; la
					partición o adjudicación de bienes es <Codigo>otro</Codigo> · decisión con fila <Codigo>particion</Codigo>{" "}
					(<Codigo>homologa</Codigo> si la presentan los herederos, <Codigo>hace_lugar</Codigo> si la decide el juez).
				</P>
				<P>
					<B>Contencioso administrativo y cobro contra el Estado</B>: la habilitación de la instancia va como fila{" "}
					<Codigo>habilitacion_instancia</Codigo> en el auto que provee la demanda; si se declara no habilitada, terminación ·
					modo <Codigo>inhabilidad_de_instancia</Codigo>. El pedido de liquidación al organismo es{" "}
					<Codigo>ordena_oficio</Codigo> con carga al organismo; el pago del Estado no es terminación.
				</P>
				<P>
					<B>Recurso directo contra un organismo</B> (p. ej. multas de la SRT ante la Cámara Comercial): la Cámara actúa
					como <Codigo>instancia_unica</Codigo>; su sentencia es terminación · <Codigo>resuelve_recurso</Codigo> con fila{" "}
					<Codigo>multa</Codigo>. <B>Acuerdo transaccional ANSES</B> (ley 27.260): un único acto homologatorio →
					terminación · modo <Codigo>transaccion</Codigo>. <B>Consignación</B>: el auto que tiene por consignado y corre
					traslado es <Codigo>corre_traslado</Codigo>; la liberación o distribución de los fondos lleva fila{" "}
					<Codigo>consignacion</Codigo>.
				</P>
				<P>
					<B>Sanción del art. 67 LO que cierra la causa</B> (demanda tenida por no presentada o actora tenida por
					desistida por no cumplir la intimación) → <Codigo>efectiviza_apercibimiento</Codigo> · fondo · terminación ·
					modo <Codigo>desistimiento_del_proceso</Codigo>: es un desistimiento tácito que no extingue el derecho. Si la parte
					lo pide, es <Codigo>acepta_desistimiento</Codigo> (addendum 32). <B>Prescripción admitida como defensa previa</B>{" "}
					→ terminación · <Codigo>resuelve_excepcion</Codigo> · <Codigo>hace_lugar</Codigo> · modo{" "}
					<Codigo>sentencia_sobre_fondo</Codigo>. <B>Cosa juzgada</B> que cierra la causa (declarada de oficio o
					admitida como excepción) → terminación · <Codigo>resuelve_excepcion</Codigo> · <Codigo>declara</Codigo> · modo{" "}
					<Codigo>cosa_juzgada</Codigo>: no se juzga el mérito, lo impide una decisión anterior. Si la excepción se
					rechaza o se declara abstracta, es decisión. <B>Homologación de un pacto de cuota litis</B> como acto propio →{" "}
					<Codigo>otro</Codigo> · honorarios · decisión · <Codigo>homologa</Codigo> con fila{" "}
					<Codigo>pacto_cuota_litis</Codigo>; <Codigo>homologa_acuerdo</Codigo> queda para el acuerdo que termina el pleito.
				</P>
				<P>
					<B>Acuerdos, mediación y beneficio de litigar sin gastos</B>: el acuerdo celebrado ante el juez en una audiencia y
					después ejecutado como título, aunque no haya auto homologatorio, termina el proceso en la propia acta (modo{" "}
					<Codigo>conciliacion</Codigo>); si se presentó por escrito y ningún acto le dio efecto, la terminación es el archivo.
					El rechazo in límine por no cumplir la mediación previa obligatoria es terminación · modo{" "}
					<Codigo>inhabilidad_de_instancia</Codigo> con fila <Codigo>habilitacion_instancia</Codigo>. El «allanamiento» de
					la actora a la contestación es <Codigo>desistimiento_del_derecho</Codigo>: se anota por lo que pasa, no por la
					etiqueta. El beneficio de litigar sin gastos es un incidente (contexto <Codigo>incidental</Codigo>); la resolución
					que lo concede o deniega es su terminación · <Codigo>resuelve_fondo</Codigo> con fila{" "}
					<Codigo>beneficio_litigar_sin_gastos</Codigo>.
				</P>
				<P>
					<B>Amparo desestimado</B>: la sentencia que desestima la vía de amparo por existir una vía ordinaria idónea (o lo
					rechaza in límine) cierra el amparo → terminación · modo <Codigo>otro</Codigo> · <Codigo>resuelve_fondo</Codigo>{" "}
					· <Codigo>rechaza</Codigo>, aunque después la parte intente ordinarizar el reclamo en el mismo expediente.
				</P>
				<P>
					<B>Decisión implícita</B>: si la dispositiva no dice "rechazo" pero impide lo pedido (remite a otro juez o
					proceso, "estése a lo dispuesto", "no ha lugar por ahora", un "previo…" que posterga sin plazo), la{" "}
					<B>Función sigue la forma</B> del proveído (ordenación / impulso) y el <B>sentido material</B> va en una fila
					de Decisiones: objeto = lo pedido, resultado = el efecto real (<Codigo>rechaza</Codigo>), y el detalle empieza
					con <Codigo>implícito:</Codigo> + la razón. En Notas citá la petición que responde (el título del escrito).
					Ejemplo: "peticione ante el juez del proceso liquidatorio" frente a un pedido de intimación de pago →{" "}
					<Codigo>ejecucion → rechaza</Codigo> "implícito: remite al proceso liquidatorio (fuero de atracción)".
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
		titulo: "6 · Audiencias y actas",
		cuerpo: (
			<>
				<Box component="ul" sx={{ pl: 2.25, m: 0 }}>
					<LI>
						<B>Fijación de audiencia</B>: acto <Codigo>fija_audiencia</Codigo> · ordenación · la <B>materia sigue al
						FIN</B> de la audiencia: conciliatoria (art. 80 LO, "a fin de arribar a un acuerdo") o ratificación de
						acuerdo → <Codigo>conciliacion</Codigo>; testimonial → <Codigo>prueba</Codigo>. Carga:
						comparecer_audiencia con <B>plazo vacío</B> (es fecha fija) y apercibimiento SOLO si el texto lo dice
						(art. 63 LO) — no se inventan sanciones que el documento no menciona.
					</LI>
					<LI>
						<B>Acta de audiencia</B> (celebrada O fracasada por incomparecencia): tipo <Codigo>acta</Codigo> · acto{" "}
						<Codigo>celebra_audiencia</Codigo>. El acta no es una resolución, pero documenta un acto del tribunal: el tipo
						dice la forma y el acto dice que hubo audiencia. Materia por el fin (prueba / conciliación / audiencia 360).
						Lo que el acta resuelve ("OÍDO LO CUAL SS RESUELVE…") va en función, resultado y decisiones: si solo
						declararon testigos → ordenación; si declara caídos testigos, tiene por desistida prueba o la declara
						inoficiosa → decisión, con una fila por cada cosa resuelta.
					</LI>
					<LI>
						<B>Si el acta incorpora una sentencia</B> (p. ej. homologa el acuerdo que cierra el pleito): manda la
						sentencia — acto principal el de la sentencia (<Codigo>homologa_acuerdo</Codigo>), tipo el de la
						sentencia (<Codigo>sentencia_homologatoria</Codigo>), terminación + modo, y{" "}
						<Codigo>celebra_audiencia</Codigo> como acto secundario. Lo que se decide dentro del acta sin ser una
						sentencia (homologar un pacto de cuota litis, tener por desistida una prueba) sigue siendo tipo{" "}
						<Codigo>acta</Codigo>.
					</LI>
					<LI>
						<B>Las constancias siguen como</B> <Codigo>ninguno</Codigo>: certificados (de prueba, de elevación), la
						orden de certificar o de librar un certificado, notas de secretaría (presentación de alegatos, reserva de
						documentación, retiro de oficios), oficios firmados y observaciones de confronte. No documentan un acto con
						contenido propio — la frontera es el contenido, no el formato.
					</LI>
				</Box>
			</>
		),
	},
	{
		titulo: "7 · Réplicas y vinculación",
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
		titulo: "8 · Acto = ninguno y descartar",
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
		titulo: "9 · Validaciones al marcar anotada",
		cuerpo: (
			<Box component="ul" sx={{ pl: 2.25, m: 0 }}>
				<LI>Función terminación → resultado Y modo de terminación obligatorios.</LI>
				<LI>Función decisión → resultado real obligatorio (no "no aplica").</LI>
				<LI>Impulso / ordenación / suspensión / reanudación → resultado solo "no aplica" (o vacío).</LI>
				<LI>Modo de terminación únicamente con función terminación.</LI>
				<LI>"No es resolución" solo admite acto "ninguno"; y "ninguno" exige ese tipo (el flujo lo arma solo). Un acta de audiencia NO es "no es resolución": va con tipo "acta".</LI>
				<LI>Decisiones con objeto → con resultado; cargas con datos → con acción.</LI>
			</Box>
		),
	},
	{
		titulo: "10 · Advertencias ⚠ de divergencia",
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
				<B>Terminación</B>: ESE documento clausura el proceso, por cualquier vía — normal (sentencia definitiva) o
				anormal (homologación que pone fin,
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
				incidente de recusación → <Codigo>recusacion</Codigo>; todo el episodio de <B>caducidad de instancia</B>{" "}
				(planteo, traslado, declaración o rechazo, de 1ª o 2ª instancia o de un incidente) →{" "}
				<Codigo>caducidad</Codigo>, nunca <Codigo>otro</Codigo>; apercibimiento efectivizado → la materia de la carga
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
