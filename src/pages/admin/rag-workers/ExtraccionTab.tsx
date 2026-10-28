import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	FormControlLabel,
	Grid,
	IconButton,
	LinearProgress,
	MenuItem,
	Paper,
	Skeleton,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Switch,
	Tabs,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentText, Link21, Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import { Link as RouterLink } from "react-router-dom";
import RagExtraccionService, {
	ExtraccionDetalle,
	ExtraccionFiltros,
	ExtraccionItem,
	ExtraccionResumen,
	EtapaExtraccion,
	FichaCedula,
	FichaResultado,
	TramoEscrito,
} from "api/ragExtraccion";
import { headerBorder } from "themes/dashboardTokens";
import PdfCanvasViewer from "components/PdfCanvasViewer";
import { clickableProps } from "utils/a11y";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtFecha = (v?: string | null, conHora = false) => {
	if (!v) return "—";
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	return d.toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
		timeZone: "America/Argentina/Buenos_Aires",
	});
};
// Fechas "YYYY-MM-DD" sin hora: se muestran tal cual, sin pasar por la zona horaria.
const fmtDia = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : fmtFecha(v));
const n = (v?: number) => (typeof v === "number" ? v.toLocaleString("es-AR") : "0");
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");

const STATUS_COLOR: Record<string, "success" | "warning" | "default" | "error"> = {
	extracted: "success",
	needs_ocr: "warning",
	skipped: "default",
	failed: "error",
};
const STATUS_LABEL: Record<string, string> = { extracted: "Extraído", needs_ocr: "Necesita OCR", skipped: "Omitido", failed: "Falló" };
const MOTIVO_LABEL: Record<string, string> = {
	sin_texto_de_resolucion: "Sin texto de la resolución",
	causa_sin_textos: "La causa no tiene despachos con texto",
	sin_coincidencia: "Ningún despacho coincide",
};
const METODO_LABEL: Record<string, string> = {
	sgj: "código del sistema",
	huella: "copia idéntica",
	similitud: "similitud",
	texto: "texto",
};
const RESULTADO_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
	positiva: "success",
	negativa: "error",
	sin_diligenciar: "default",
	indeterminado: "warning",
};
const RESULTADO_LABEL: Record<string, string> = {
	positiva: "positiva",
	negativa: "negativa",
	sin_diligenciar: "sin diligenciar",
	indeterminado: "sin determinar",
};
const DILIGENCIA_LABEL: Record<string, string> = {
	aviso: "Aviso (art. 339)",
	entrega: "Entrega",
	fijacion: "Fijación",
	negativa: "Negativa",
	sin_diligenciar: "Devuelta sin diligenciar",
	intimacion: "Intimación",
	embargo: "Embargo",
	bajo_responsabilidad: "Bajo responsabilidad de la parte",
	constatacion: "Constatación",
	otro: "Diligencia",
};
const CLASE_NOTIF_LABEL: Record<string, string> = {
	resultado: "Diligenciada",
	proyecto: "Sin diligenciar (de la parte)",
	escrito: "No contiene cédula",
};
const ETAPA_INFO: Record<string, { titulo: string; texto: string }> = {
	cedulas: {
		titulo: "Cédulas electrónicas",
		texto:
			"Ficha, resolución notificada y adjuntos remitidos a su movimiento de origen, por cada cédula de pjn-movements. Worker pjn-rag-cedulas (worker_02).",
	},
	resultados: {
		titulo: "Cédulas en papel diligenciadas",
		texto:
			"Escritos con una cédula o mandamiento en papel que volvió diligenciado: dorso leído con visión, resultado y fecha de notificación, vínculo con la cédula original y con el dato del sistema. Worker pjn-rag-cedulas-diligenciadas (worker_02).",
	},
	escritos: {
		titulo: "Escritos de parte",
		texto:
			"Escritos de parte con su texto (poppler) y tramos escrito / documental / escaneado. Los avisos de resultado de una notificación son de diligenciadas. Worker pjn-rag-escritos (worker_02).",
	},
	deo: {
		titulo: "DEO",
		texto: "Documentos electrónicos oficiados. Worker pjn-rag-deo (worker_02).",
	},
};
// Qué cuenta como "a revisar" en cada etapa (texto del aviso del resumen).
const REVISAR_INFO: Record<EtapaExtraccion, string> = {
	cedulas: "adjunto sin origen o reconocido solo por similitud baja, sin resolución vinculada, campos que faltan",
	resultados:
		"resultado sin determinar, dorso poco legible, discrepancia con el sistema, positiva sin fecha o cédula del tribunal sin su original",
	escritos: "sin escrito reconocido (solo documentación), escrito sin cierre, páginas ilegibles o leído con pdf.js de respaldo",
	deo: "páginas ilegibles o leído con pdf.js de respaldo",
};
const NOMBRE_DOCS: Record<EtapaExtraccion, string> = { cedulas: "Cédulas", resultados: "Escritos", escritos: "Escritos", deo: "DEO" };
const TRAMO_COLOR: Record<TramoEscrito["tipo"], "primary" | "default" | "warning"> = {
	escrito: "primary",
	documental: "default",
	escaneado: "warning",
};
const SUBTIPO_LABEL: Record<string, string> = { resolucion: "copia de resolución", cedula: "cédula", otro_escrito: "otro escrito" };
const pags = (t: TramoEscrito) => (t.desde === t.hasta ? `pág. ${t.desde}` : `págs. ${t.desde}-${t.hasta}`);
const MOTOR_LABEL: Record<string, string> = { poppler: "poppler", pdfjs: "pdf.js (respaldo)", sin_dato: "sin dato" };
const FILTROS_VACIOS = (etapa: EtapaExtraccion): ExtraccionFiltros => ({
	etapa,
	status: "",
	clase: "",
	familia: "",
	vinculo: "",
	motivo: "",
	resultado: "",
	claseNotif: "",
	libradaPor: "",
	revisar: "",
	fuero: "",
	q: "",
	causaId: "",
});
const corto = (id?: string | null) => (id ? id.split(":")[1] || id : "");

const TIPO_CORTO: Record<string, string> = {
	"CEDULA ELECTRONICA TRIBUNAL": "Electrónica · tribunal",
	"CEDULA ELECTRONICA PARTE": "Electrónica · parte",
	CEDULA: "Papel · juzgado",
};

// ── Resumen ──────────────────────────────────────────────────────────────────

const Cifra = ({ titulo, valor, sub }: { titulo: string; valor: React.ReactNode; sub?: React.ReactNode }) => (
	<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
		<Typography variant="caption" color="text.secondary">
			{titulo}
		</Typography>
		<Typography variant="h4" sx={{ mt: 0.25 }}>
			{valor}
		</Typography>
		{sub && (
			<Typography variant="caption" color="text.secondary">
				{sub}
			</Typography>
		)}
	</Paper>
);

const ResumenDiligenciadas = ({ r, onRevisar }: { r: ExtraccionResumen; onRevisar: () => void }) => {
	const total = Object.values(r.atlas).reduce((a, b) => a + b, 0);
	const p = r.procesados;
	const procesados = Object.values(p.porStatus).reduce((a, b) => a + b, 0);
	const cuenta = (pred: (x: { clase?: string; resultado?: string; libradaPor?: string | null }) => boolean) =>
		(r.notificaciones || []).filter(pred).reduce((a, x) => a + x.n, 0);
	const dilig = cuenta((x) => x.clase === "resultado");
	return (
		<Stack spacing={1.5}>
			<Grid container spacing={1.5}>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Escritos candidatos (Atlas)"
						valor={n(total)}
						sub={`mencionan cédula / mandamiento / diligenciamiento · ${n(procesados)} procesados`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Notificaciones diligenciadas"
						valor={n(dilig)}
						sub={`${n(cuenta((x) => x.resultado === "positiva"))} positivas · ${n(
							cuenta((x) => x.resultado === "negativa"),
						)} negativas · ${n(cuenta((x) => x.resultado === "indeterminado"))} sin determinar`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Visión (dorso)"
						valor={`US$ ${(r.vision?.usd || 0).toFixed(2)}`}
						sub={`${n(r.vision?.documentos)} documentos leídos · gpt-4.1`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Worker"
						valor={
							<Chip
								size="small"
								color={r.worker?.activo ? "success" : "default"}
								label={r.worker ? (r.worker.activo ? "Activo" : "Detenido") : "Sin datos"}
							/>
						}
						sub={
							r.worker
								? `${r.worker.host} · ${r.worker.version} · último ciclo ${fmtFecha(r.worker.ultimoCicloAt, true)}`
								: "Todavía no corrió"
						}
					/>
				</Grid>
			</Grid>
			<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
				<Chip
					size="small"
					variant="outlined"
					color="primary"
					label={`libradas por el tribunal: ${n(cuenta((x) => x.libradaPor === "tribunal" && x.clase === "resultado"))}`}
				/>
				<Chip
					size="small"
					variant="outlined"
					color="primary"
					label={`confeccionadas por la parte: ${n(cuenta((x) => x.libradaPor === "parte" && x.clase === "resultado"))}`}
				/>
				<Chip size="small" variant="outlined" label={`sin diligenciar (de la parte): ${n(cuenta((x) => x.clase === "proyecto"))}`} />
				<Chip size="small" variant="outlined" label={`no contienen cédula: ${n(cuenta((x) => x.clase === "escrito"))}`} />
				{Object.entries(p.porStatus).map(([k, v]) => (
					<Chip key={`s-${k}`} size="small" variant="outlined" color="secondary" label={`${STATUS_LABEL[k] || k}: ${n(v)}`} />
				))}
			</Stack>
			{p.revisar > 0 && (
				<Alert
					severity="warning"
					action={
						<Button size="small" onClick={onRevisar}>
							Ver
						</Button>
					}
				>
					{n(p.revisar)} casos para revisar a mano (resultado sin determinar, dorso poco legible, discrepancia con el sistema, positiva sin
					fecha o cédula del tribunal sin su original).
				</Alert>
			)}
		</Stack>
	);
};

const Resumen = ({ r, onRevisar }: { r: ExtraccionResumen; onRevisar: () => void }) => {
	const pendientes = (r.atlas.not_applicable || 0) + (r.atlas.pending || 0) + (r.atlas.sin_estado || 0);
	const hechos = (r.atlas.extracted || 0) + (r.atlas.ocr_done || 0);
	const total = Object.values(r.atlas).reduce((a, b) => a + b, 0);
	const p = r.procesados;
	const procesados = Object.values(p.porStatus).reduce((a, b) => a + b, 0);
	// Escritos y DEO: sin plantilla ni vínculos; en su lugar, tramos (escritos), motor e ilegibles.
	const esCedulas = r.etapa === "cedulas";
	const motor = r.motorPdf || {};
	return (
		<Stack spacing={1.5}>
			<Grid container spacing={1.5}>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo={`${NOMBRE_DOCS[r.etapa] || "Documentos"} con PDF en S3 (Atlas)`}
						valor={n(total)}
						sub={`${n(hechos)} con texto · ${n(pendientes)} pendientes`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo={esCedulas ? "Procesadas por el worker" : "Procesados por el worker"}
						valor={n(procesados)}
						sub={`${n(p.porStatus.extracted)} ${esCedulas ? "extraídas" : "extraídos"} · ${n(p.porStatus.needs_ocr)} OCR · ${n(
							p.porStatus.failed,
						)} fallas`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					{esCedulas ? (
						<Cifra
							titulo="Vinculadas a su resolución"
							valor={pct(p.vinculadas, p.conTranscripcion)}
							sub={`${n(p.vinculadas)} de ${n(p.conTranscripcion)} con texto de la resolución (transcripta o adjunta)`}
						/>
					) : r.tramos ? (
						<Cifra
							titulo="Con escrito reconocido"
							valor={n(r.tramos.conEscrito)}
							sub={`${n(r.tramos.escritoCerrado)} con cierre · ${n(r.tramos.soloDocumental)} solo documentación`}
						/>
					) : (
						<Cifra
							titulo="Leídos con poppler"
							valor={pct(motor.poppler || 0, procesados)}
							sub={`${n(motor.pdfjs)} con pdf.js de respaldo · ${n(r.conIlegibles)} con páginas ilegibles`}
						/>
					)}
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Worker"
						valor={
							<Chip
								size="small"
								color={r.worker?.activo ? "success" : "default"}
								label={r.worker ? (r.worker.activo ? "Activo" : "Detenido") : "Sin datos"}
							/>
						}
						sub={
							r.worker
								? `${r.worker.host} · ${r.worker.version} · último ciclo ${fmtFecha(r.worker.ultimoCicloAt, true)}`
								: "Todavía no corrió"
						}
					/>
				</Grid>
			</Grid>
			{total > 0 && (
				<LinearProgress variant="determinate" value={Math.min(100, (100 * hechos) / total)} sx={{ height: 6, borderRadius: 3 }} />
			)}
			<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
				{Object.entries(p.porFuero).map(([k, v]) => (
					<Chip key={`f-${k}`} size="small" variant="outlined" label={`${k}: ${n(v)}`} />
				))}
				{esCedulas &&
					Object.entries(p.porFamilia).map(([k, v]) => (
						<Chip key={`p-${k}`} size="small" variant="outlined" color="primary" label={`plantilla ${k}: ${n(v)}`} />
					))}
				{r.tramos && (
					<>
						<Chip size="small" variant="outlined" color="primary" label={`con escrito: ${n(r.tramos.conEscrito)}`} />
						<Chip size="small" variant="outlined" color="primary" label={`escrito cerrado: ${n(r.tramos.escritoCerrado)}`} />
						<Chip size="small" variant="outlined" color="warning" label={`solo documentación: ${n(r.tramos.soloDocumental)}`} />
					</>
				)}
				{Object.entries(motor).map(([k, v]) => (
					<Chip
						key={`mo-${k}`}
						size="small"
						variant="outlined"
						color={k === "pdfjs" ? "warning" : "info"}
						label={`motor ${MOTOR_LABEL[k] || k}: ${n(v)}`}
					/>
				))}
				{r.conIlegibles !== undefined && (
					<Chip
						size="small"
						variant="outlined"
						color={r.conIlegibles > 0 ? "warning" : "default"}
						label={`con páginas ilegibles: ${n(r.conIlegibles)}`}
					/>
				)}
				{Object.entries(p.porClase).map(([k, v]) => (
					<Chip key={`c-${k}`} size="small" variant="outlined" color="secondary" label={`${k}: ${n(v)}`} />
				))}
				{Object.entries(p.sinVinculoPorMotivo || {}).map(([k, v]) => (
					<Chip key={`m-${k}`} size="small" variant="outlined" color="warning" label={`sin vínculo · ${MOTIVO_LABEL[k] || k}: ${n(v)}`} />
				))}
				{Object.entries(p.porVersion || {}).map(([k, v]) => (
					<Chip key={`v-${k}`} size="small" variant="outlined" label={`versión ${k}: ${n(v)}`} />
				))}
				{Object.entries(r.adjuntosPorMetodo || {})
					.filter(([k]) => k !== "sin_dato")
					.map(([k, v]) => (
						<Chip key={`a-${k}`} size="small" variant="outlined" color="info" label={`adjuntos por ${METODO_LABEL[k] || k}: ${n(v)}`} />
					))}
			</Stack>
			{p.revisar > 0 && (
				<Alert
					severity="warning"
					action={
						<Button size="small" onClick={onRevisar}>
							Ver
						</Button>
					}
				>
					{n(p.revisar)} {esCedulas ? "cédulas" : "documentos"} para revisar a mano ({REVISAR_INFO[r.etapa] || REVISAR_INFO.cedulas}).
				</Alert>
			)}
		</Stack>
	);
};

// ── Detalle ──────────────────────────────────────────────────────────────────

const Campo = ({ k, v }: { k: string; v: React.ReactNode }) => (
	<>
		<Grid item xs={4} sm={3}>
			<Typography variant="caption" color="text.secondary">
				{k}
			</Typography>
		</Grid>
		<Grid item xs={8} sm={9}>
			<Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
				{v === null || v === undefined || v === "" ? <span style={{ opacity: 0.5 }}>—</span> : v}
			</Typography>
		</Grid>
	</>
);

const FichaVista = ({
	f,
	causa,
	vinculosAdj,
}: {
	f: FichaCedula;
	causa: ExtraccionDetalle["causa"];
	vinculosAdj?: NonNullable<ExtraccionItem["vinculos"]>["adjuntos"];
}) => {
	const expLeido = f.expediente ? `${f.expediente.numero}/${f.expediente.anio || "????"}` : null;
	const expCausa = causa ? `${causa.number}/${causa.year}` : null;
	const expDistinto = expLeido && expCausa && f.expediente && String(f.expediente.numero) !== String(causa?.number);
	return (
		<Grid container spacing={0.75}>
			<Campo
				k="Plantilla"
				v={`${f.familia || "—"} · emitida por ${f.emisor || "—"}${
					f.instrumento && f.instrumento !== "cedula" ? ` · ${f.instrumento}` : ""
				}`}
			/>
			<Campo k="N° de cédula" v={f.numeroCedula} />
			<Campo k="Notificada" v={f.notificadoEl ? fmtFecha(f.notificadoEl, true) : null} />
			<Campo k="Emisión" v={fmtDia(f.fechaEmision)} />
			<Campo
				k="Destinatario"
				v={f.destinatario ? `${f.destinatario}${f.destinatarioLetrado ? ` (letrado: ${f.destinatarioLetrado})` : ""}` : null}
			/>
			{f.destinatarios && f.destinatarios.length > 1 && (
				<Campo
					k="Destinatarios"
					v={f.destinatarios.map((d) => `${d.nombre}${d.domicilio ? ` — ${d.domicilio}` : ""} (pág. ${d.paginas.join(",")})`).join(" · ")}
				/>
			)}
			<Campo
				k="Domicilio"
				v={
					f.domicilio
						? `${f.domicilio}${f.tipoDomicilio ? ` (${f.tipoDomicilio}${f.zona ? `, zona ${f.zona}` : ""})` : ""}`
						: f.tipoDomicilio
				}
			/>
			<Campo k="Tribunal" v={f.tribunal ? `${f.tribunal}${f.tribunalDireccion ? ` — ${f.tribunalDireccion}` : ""}` : null} />
			<Campo
				k="Expediente"
				v={
					expLeido ? (
						<>
							{expLeido}
							{expDistinto && <Chip size="small" color="warning" sx={{ ml: 1 }} label={`causa ${expCausa} (¿incidente?)`} />}
						</>
					) : null
				}
			/>
			<Campo k="Carátula" v={f.caratula} />
			{causa && <Campo k="Carátula de la causa" v={causa.caratula} />}
			<Campo
				k="Firmante"
				v={
					f.firmante
						? [f.firmante.nombre, f.firmante.cargo, f.firmante.cuit && `CUIT ${f.firmante.cuit}`].filter(Boolean).join(" · ")
						: null
				}
			/>
			<Campo k="Copias" v={f.copias === true ? "Sí" : f.copias === false ? "No" : null} />
			<Campo k="Observaciones" v={[f.caracter, f.observaciones].filter(Boolean).join(" · ") || null} />
			<Campo
				k="Páginas"
				v={`cédula ${f.paginasCedula?.join(",") || "—"}${
					f.paginasDorsoFormulario?.length ? ` (formulario de diligencia en blanco ${f.paginasDorsoFormulario.join(",")})` : ""
				} · copias ${(f.paginasAdjuntas || []).filter((p) => !p.enBlanco).length}${
					(f.paginasAdjuntas || []).some((p) => p.enBlanco)
						? ` · en blanco ${(f.paginasAdjuntas || [])
								.filter((p) => p.enBlanco)
								.map((p) => p.n)
								.join(",")}`
						: ""
				}`}
			/>
			{vinculosAdj && vinculosAdj.length > 0 && (
				<Campo
					k="Adjuntos"
					v={
						<Stack spacing={0.5}>
							{vinculosAdj.map((a, i) => (
								<Stack key={i} direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
									<Chip
										size="small"
										color={/DESPACHO|SENTENCIA/.test(a.tipoOrigen || "") ? "primary" : "secondary"}
										label={`${i + 1} · ${a.tipoOrigen || "?"}`}
									/>
									<Typography variant="caption">
										{a.paginas.length > 1 ? `págs. ${a.paginas[0]}–${a.paginas[a.paginas.length - 1]}` : `pág. ${a.paginas[0]}`}
										{a.detalleOrigen ? ` · «${a.detalleOrigen}»` : ""}
										{a.fechaOrigen ? ` · ${fmtFecha(a.fechaOrigen)}` : ""}
										{` · mov. ${corto(a.movementId)}`}
									</Typography>
									<Chip
										size="small"
										variant="outlined"
										color={a.metodo === "similitud" && (a.similitud || 0) < 0.85 ? "warning" : "default"}
										label={`${METODO_LABEL[a.metodo || ""] || a.metodo}${
											a.metodo === "similitud" ? ` ${Math.round((a.similitud || 0) * 100)}%` : ""
										}`}
									/>
								</Stack>
							))}
						</Stack>
					}
				/>
			)}
			{f.adjuntosSinOrigen && f.adjuntosSinOrigen.length > 0 && (
				<Campo
					k="Sin origen"
					v={<Chip size="small" color="warning" label={`págs. ${f.adjuntosSinOrigen.join(", ")}: sin movimiento de origen en la causa`} />}
				/>
			)}
			{f.camposFaltantes && f.camposFaltantes.length > 0 && (
				<Campo k="Faltan" v={<Chip size="small" color="warning" label={f.camposFaltantes.join(", ")} />} />
			)}
			<Grid item xs={12}>
				<Typography variant="caption" color="text.secondary">
					Resolución transcripta {!f.transcripcion ? "(no está transcripta en la cédula: ver adjuntos)" : ""}
				</Typography>
				{f.transcripcion && (
					<Paper variant="outlined" sx={{ p: 1, mt: 0.5, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 13 }}>
						{f.transcripcion}
					</Paper>
				)}
			</Grid>
		</Grid>
	);
};

const FichaResultadoVista = ({ f, e }: { f: Partial<FichaResultado>; e: NonNullable<ExtraccionDetalle["estado"]> }) => {
	const r = f.resultadoNotificacion;
	const v = e.vinculos || {};
	const inst = f.instrumento === "mandamiento" ? "Mandamiento" : "Cédula";
	return (
		<Grid container spacing={0.75}>
			<Campo
				k="Qué es"
				v={
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
						<Chip
							size="small"
							color={f.clase === "resultado" ? "primary" : "default"}
							label={CLASE_NOTIF_LABEL[f.clase || ""] || f.clase}
						/>
						<Chip size="small" variant="outlined" label={`${inst}${f.ley22172 ? " ley 22.172" : ""}`} />
						{f.libradaPor && (
							<Chip
								size="small"
								variant="outlined"
								label={f.libradaPor === "tribunal" ? "librada por el tribunal" : "confeccionada por la parte"}
							/>
						)}
						<Chip
							size="small"
							variant="outlined"
							label={f.presentadaCon === "escrito" ? "acompañada por escrito de parte" : "digitalizada (sin escrito)"}
						/>
					</Stack>
				}
			/>
			<Campo k="N° de cédula" v={f.numeroCedula} />
			<Campo k="Destinatario" v={f.destinatario ? `${f.destinatario}${f.domicilio ? ` — ${f.domicilio}` : ""}` : null} />
			<Campo
				k="Páginas"
				v={`cédula ${f.paginasCedula?.join(",") || "—"} · dorso ${f.paginasDorso?.join(",") || "—"}${
					f.criterioDorso
						? ` (${
								f.criterioDorso === "sello"
									? "detectado por el sello"
									: f.criterioDorso === "contiguo"
									? "página contigua al frente"
									: "no detectado por OCR"
						  })`
						: ""
				}`}
			/>
			{r && (
				<>
					<Campo
						k="Resultado"
						v={
							<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
								<Chip
									size="small"
									color={RESULTADO_COLOR[r.resultado]}
									label={(RESULTADO_LABEL[r.resultado] || r.resultado).toUpperCase()}
								/>
								{r.modalidad && r.modalidad !== "personal" && (
									<Chip
										size="small"
										variant="outlined"
										label={r.modalidad === "bajo_responsabilidad" ? "bajo responsabilidad de la parte" : "por fijación"}
									/>
								)}
								{r.fechaNotificacion && <Typography variant="body2">notificada el {fmtDia(r.fechaNotificacion)}</Typography>}
								{!r.fechaNotificacion && r.fechaUltimaDiligencia && (
									<Typography variant="body2">última diligencia {fmtDia(r.fechaUltimaDiligencia)}</Typography>
								)}
								{r.fuenteFecha && (
									<Chip size="small" variant="outlined" label={`fecha: ${r.fuenteFecha === "sistema" ? "dato del sistema" : "dorso"}`} />
								)}
								{r.legibilidad && (
									<Chip
										size="small"
										variant="outlined"
										color={r.legibilidad === "baja" ? "warning" : "default"}
										label={`legibilidad ${r.legibilidad}`}
									/>
								)}
							</Stack>
						}
					/>
					{r.motivo && <Campo k="Motivo" v={r.motivo} />}
					{r.discrepancias?.length > 0 && (
						<Campo k="Discrepancias" v={<Chip size="small" color="warning" label={r.discrepancias.join(" · ")} />} />
					)}
					<Grid item xs={12}>
						<Typography variant="caption" color="text.secondary">
							Diligencias del {f.instrumento === "mandamiento" ? "oficial de justicia" : "oficial notificador"} (leídas del dorso)
						</Typography>
						{r.diligencias?.length ? (
							<Table size="small" sx={{ mt: 0.5 }}>
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Hora</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Atendió</TableCell>
										<TableCell>Observaciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{r.diligencias.map((x, i) => (
										<TableRow key={i}>
											<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDia(x.fecha) || "ilegible"}</TableCell>
											<TableCell>{x.hora || "—"}</TableCell>
											<TableCell>{DILIGENCIA_LABEL[x.tipo] || x.tipo}</TableCell>
											<TableCell>{x.quienAtendio || "—"}</TableCell>
											<TableCell sx={{ fontSize: 12 }}>{x.observaciones || "—"}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<Alert severity="info" sx={{ mt: 0.5 }}>
								No se leyeron diligencias en el dorso.
							</Alert>
						)}
					</Grid>
				</>
			)}
			{(e.vision?.json?.dorso?.sellos || e.vision?.json?.sellos || []).length > 0 && (
				<Grid item xs={12}>
					<Typography variant="caption" color="text.secondary">
						Sellos / informes del oficial (transcripción; lo tachado entre ~~, lo manuscrito entre [ ])
					</Typography>
					<Stack spacing={0.5} sx={{ mt: 0.5 }}>
						{(e.vision?.json?.dorso?.sellos || e.vision?.json?.sellos || []).map(
							(x: { pagina: number; rotado?: boolean; transcripcion: string }, i: number) => (
								<Paper key={i} variant="outlined" sx={{ p: 1, fontSize: 12.5, whiteSpace: "pre-wrap" }}>
									<strong>
										pág. {x.pagina}
										{x.rotado ? " (rotado)" : ""}:
									</strong>{" "}
									{x.transcripcion}
								</Paper>
							),
						)}
					</Stack>
				</Grid>
			)}
			{e.vision?.lecturaGirada && (
				<Campo
					k="Lectura girada"
					v={
						<Chip
							size="small"
							color={e.vision.lecturaGirada.coincide ? "default" : "warning"}
							label={`pág. ${e.vision.lecturaGirada.pagina} girada: ${e.vision.lecturaGirada.resultado}${
								e.vision.lecturaGirada.fecha ? ` ${fmtDia(e.vision.lecturaGirada.fecha)}` : ""
							} — ${e.vision.lecturaGirada.coincide ? "coincide" : "NO coincide"}`}
						/>
					}
				/>
			)}
			<Campo
				k="Cédula original"
				v={
					v.original
						? `mov. ${corto(v.original.movementId)} · librada el ${fmtDia(v.original.fecha)} · N° ${v.original.numero || "—"} (por ${
								v.original.metodo
						  })`
						: null
				}
			/>
			<Campo
				k="Dato del sistema"
				v={
					v.datoSistema
						? `${v.datoSistema.tipo} · ${fmtDia(v.datoSistema.fechaNotificacion) || "sin fecha"}${
								v.datoSistema.resultado ? ` · ${v.datoSistema.resultado}` : ""
						  } (por ${v.datoSistema.metodo})`
						: null
				}
			/>
			<Campo
				k="Resolución que notifica"
				v={v.resolucion ? `mov. ${corto(v.resolucion.movementId)} · ${Math.round((v.resolucion.cobertura || 0) * 100)}% del texto` : null}
			/>
			{f.mismoDia && f.mismoDia.length > 0 && (
				<Campo
					k="Mismo día"
					v={
						<Stack spacing={0.25}>
							{f.mismoDia.map((m) => (
								<Typography key={m.movementId} variant="caption">
									{m.tipo} · «{(m.detalle || "").replace(/\s*\[Presentado[^\]]*\]/i, "")}» · mov. {corto(m.movementId)}
								</Typography>
							))}
						</Stack>
					}
				/>
			)}
			{(e.vision?.niveles || []).length > 0 && (
				<Campo
					k="Niveles de lectura"
					v={
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{(e.vision?.niveles || []).map((x, i) => (
								<Chip
									key={i}
									size="small"
									variant="outlined"
									color={x.ok ? "default" : "error"}
									label={`${i + 1}. ${x.modelo}${x.cuadrantes ? ` · pág. ${x.cuadrantes} ampliada` : ""}: ${
										x.resultado || x.estado || x.error || "?"
									}${x.legibilidad ? ` (${x.legibilidad})` : ""}`}
								/>
							))}
							{e.vision?.dudosa && <Chip size="small" color="warning" label="sigue dudosa" />}
						</Stack>
					}
				/>
			)}
			{e.vision && (
				<Campo
					k="Visión"
					v={`${e.vision.modelo || "gpt-4.1"} · págs. ${(e.vision.paginas || []).join(",")} · US$ ${(e.vision.usd || 0).toFixed(4)}${
						e.vision.reutilizada ? " (lectura anterior reutilizada)" : ""
					}${e.vision.rotada ? ` · pág. ${e.vision.rotada} releída girada 180°` : ""}`}
				/>
			)}
		</Grid>
	);
};

// Chips compactos de los tramos de un escrito (listado).
const TramosChips = ({ tramos, max = 4 }: { tramos: TramoEscrito[]; max?: number }) => (
	<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
		{tramos.slice(0, max).map((t, i) => (
			<Chip
				key={i}
				size="small"
				variant={t.tipo === "escrito" ? "filled" : "outlined"}
				color={TRAMO_COLOR[t.tipo]}
				label={`${t.tipo} ${t.desde}${t.hasta !== t.desde ? `-${t.hasta}` : ""}${t.cerrado ? " ✓" : ""}`}
			/>
		))}
		{tramos.length > max && <Chip size="small" variant="outlined" label={`+${tramos.length - max}`} />}
	</Stack>
);

// Ficha de escritos de parte y DEO: tramos (solo escritos), páginas ilegibles / sin texto y motor del PDF.
const FichaTextoVista = ({ e }: { e: NonNullable<ExtraccionDetalle["estado"]> }) => {
	const f = e.ficha;
	const tramos = f?.tramos || [];
	const ilegibles = f?.paginasIlegibles || [];
	return (
		<Grid container spacing={0.75}>
			{e.etapa === "escritos" && (
				<Campo
					k="Tramos"
					v={
						tramos.length ? (
							<Stack spacing={0.5}>
								{tramos.map((t, i) => (
									<Stack key={i} direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
										<Chip
											size="small"
											variant={t.tipo === "escrito" ? "filled" : "outlined"}
											color={TRAMO_COLOR[t.tipo]}
											label={`${t.tipo}${t.subtipo ? ` · ${SUBTIPO_LABEL[t.subtipo] || t.subtipo}` : ""}`}
										/>
										<Typography variant="body2">{pags(t)}</Typography>
										{t.titulo && (
											<Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
												· {t.titulo}
											</Typography>
										)}
										{t.tipo === "escrito" &&
											(t.cerrado ? (
												<Chip size="small" variant="outlined" color="success" label="✓ cerrado" />
											) : (
												<Chip size="small" variant="outlined" color="warning" label="sin cierre" />
											))}
										{t.tipo === "escaneado" && (
											<Typography variant="caption" color="text.secondary">
												sin texto, pendiente de OCR
											</Typography>
										)}
									</Stack>
								))}
								{!tramos.some((t) => t.tipo === "escrito") && (
									<Chip size="small" color="warning" sx={{ alignSelf: "flex-start" }} label="sin escrito reconocido: solo documentación" />
								)}
							</Stack>
						) : (
							"Sin tramos (PDF sin páginas con contenido)"
						)
					}
				/>
			)}
			<Campo
				k="Páginas ilegibles"
				v={
					ilegibles.length ? (
						<Chip size="small" color="warning" label={`págs. ${ilegibles.join(", ")}: texto ilegible, quedan sin texto y van a OCR`} />
					) : null
				}
			/>
			<Campo k="Páginas sin texto" v={e.paginasSinTexto?.length ? e.paginasSinTexto.join(", ") : null} />
			<Campo k="Páginas en blanco" v={e.paginasEnBlanco?.length ? e.paginasEnBlanco.join(", ") : null} />
			<Campo
				k="Motor del PDF"
				v={
					e.motorPdf ? (
						<Stack spacing={0.25}>
							<Box>
								<Chip
									size="small"
									variant="outlined"
									color={e.motorPdf === "pdfjs" ? "warning" : "default"}
									label={MOTOR_LABEL[e.motorPdf] || e.motorPdf}
								/>
							</Box>
							{e.errorPdfjs && (
								<Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
									error del otro motor: {e.errorPdfjs}
								</Typography>
							)}
						</Stack>
					) : null
				}
			/>
			<Campo k="Productor" v={e.producer} />
		</Grid>
	);
};

const DetalleDialog = ({ id, onClose, onReprocesado }: { id: string | null; onClose: () => void; onReprocesado?: () => void }) => {
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();
	const [d, setD] = useState<ExtraccionDetalle | null>(null);
	const [cargando, setCargando] = useState(false);
	const [vista, setVista] = useState<"ficha" | "texto" | "pdf" | "vinculos" | "json">("ficha");
	const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
	const [confirmarReproceso, setConfirmarReproceso] = useState(false);
	const [reprocesando, setReprocesando] = useState(false);

	useEffect(() => {
		if (!id) return;
		setD(null);
		setVista("ficha");
		setPdf(null);
		setConfirmarReproceso(false);
		setCargando(true);
		RagExtraccionService.detalle(id)
			.then(setD)
			.catch((e) => enqueueSnackbar(e?.response?.data?.error || "No se pudo cargar el detalle", { variant: "error" }))
			.finally(() => setCargando(false));
	}, [id, enqueueSnackbar]);

	const reprocesar = async () => {
		if (!id) return;
		setReprocesando(true);
		try {
			await RagExtraccionService.reprocesar(id);
			enqueueSnackbar("Reproceso pedido: el worker lo toma en su próximo ciclo", { variant: "success" });
			setConfirmarReproceso(false);
			// Recarga el detalle sin cambiar de vista (versión ~reproceso, Atlas en pending) y el listado.
			RagExtraccionService.detalle(id)
				.then(setD)
				.catch(() => undefined);
			onReprocesado?.();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo pedir el reproceso", { variant: "error" });
		} finally {
			setReprocesando(false);
		}
	};

	useEffect(() => {
		if (vista !== "pdf" || !id || pdf) return;
		RagExtraccionService.pdf(id)
			.then(setPdf)
			.catch(() => enqueueSnackbar("No se pudo bajar el PDF", { variant: "error" }));
	}, [vista, id, pdf, enqueueSnackbar]);

	const descargarPdf = () => {
		if (!pdf || !id) return;
		const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
		const a = document.createElement("a");
		a.href = url;
		a.download = `${id.replace(/[^\w-]/g, "_")}.pdf`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 10000);
	};

	const e = d?.estado;
	const res = e?.vinculos?.resolucion;
	return (
		<Dialog open={!!id} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
			<DialogTitle sx={{ pr: 6 }}>
				<Typography variant="h5">
					{d?.movimiento ? `${TIPO_CORTO[d.movimiento.tipo] || d.movimiento.tipo} · ${fmtFecha(d.movimiento.fecha)}` : "Detalle"}
				</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
					{id} {d?.movimiento?.detalle ? `· ${d.movimiento.detalle}` : ""}
				</Typography>
				<IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Cerrar">
					<CloseCircle size={20} />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{cargando && <LinearProgress />}
				{d && (
					<Stack spacing={1.5}>
						{d.revisar && d.revisar.length > 0 && (
							<Alert severity="warning">
								<strong>Revisar a mano:</strong> {d.revisar.join(" · ")}
							</Alert>
						)}
						{d.movimiento?.cedula?.plazo && id && (
							// Vista unificada de la cédula de usuario (plazos automáticos): ficha, bandeja, plazo, entrega y correo.
							<Alert
								severity="info"
								action={
									<Button size="small" component={RouterLink} to={`/admin/causas/plazos?base=usuarios&cedula=${encodeURIComponent(id)}`}>
										Ver plazo y entrega
									</Button>
								}
							>
								Esta cédula tiene un plazo calculado
								{d.movimiento.cedula.plazo.vencimiento
									? ` (vence el ${d.movimiento.cedula.plazo.vencimiento.slice(0, 10).split("-").reverse().join("/")})`
									: ""}
								.
							</Alert>
						)}
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
							{e && <Chip size="small" color={STATUS_COLOR[e.status]} label={STATUS_LABEL[e.status] || e.status} />}
							{e?.clase && (
								<Chip
									size="small"
									variant="outlined"
									label={`${e.clase} · ${e.paginas || 0} págs${
										(e.paginasSinTexto?.length ? ` (${e.paginasSinTexto.length} sin texto)` : "") +
										(e.paginasOcr?.length
											? ` · ${e.paginasOcr.length} por OCR${e.paginasOcrCache ? ` (${e.paginasOcrCache} de caché)` : ""}`
											: "") +
										(e.paginasOcrFallidas?.length ? ` · OCR falló en ${e.paginasOcrFallidas.join(",")}` : "")
									}`}
								/>
							)}
							{d.movimiento?.textoStatus && (
								<Chip
									size="small"
									variant="outlined"
									label={`Atlas: ${d.movimiento.textoStatus}${d.movimiento.textoMethod ? ` / ${d.movimiento.textoMethod}` : ""}`}
								/>
							)}
							{e?.aliasDe && <Chip size="small" color="info" label={`Duplicado de ${e.aliasDe.split(":")[1]}`} />}
							{e?.skipReason && <Chip size="small" label={`Omitido: ${e.skipReason}`} />}
							{e?.error && <Chip size="small" color="error" label={e.error} />}
							{res?.movementId ? (
								<Chip
									size="small"
									color="success"
									icon={<Link21 size={14} />}
									label={`Vinculada (${res.metodo === "fecha" ? "por fecha" : `${Math.round(res.cobertura * 100)}%`})`}
								/>
							) : (
								e?.ficha?.esCedula &&
								e?.etapa !== "resultados" && (
									<Chip
										size="small"
										variant="outlined"
										color="warning"
										label={`Sin resolución vinculada${
											e?.vinculos?.motivo ? `: ${MOTIVO_LABEL[e.vinculos.motivo] || e.vinculos.motivo}` : ""
										}`}
									/>
								)
							)}
							{e?.parserVersion && (
								<Chip size="small" variant="outlined" label={`${e.parserVersion} · ${e.ms ?? "?"} ms · ${fmtFecha(e.procesadoAt, true)}`} />
							)}
						</Stack>
						<Tabs
							value={vista}
							onChange={(_, v) => setVista(v)}
							sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none" } }}
						>
							<Tab value="ficha" label="Ficha" />
							<Tab value="texto" label={`Texto${d.texto ? ` (${n(d.texto.length)})` : ""}`} />
							<Tab value="pdf" label="PDF original" />
							<Tab value="vinculos" label={`Vinculados (${d.vinculados.length})`} />
							<Tab value="json" label="JSON" />
						</Tabs>
						{vista === "ficha" &&
							(e?.etapa === "resultados" && e.ficha ? (
								<FichaResultadoVista f={e.ficha} e={e} />
							) : e && (e.etapa === "escritos" || e.etapa === "deo") ? (
								<FichaTextoVista e={e} />
							) : e?.ficha?.esCedula ? (
								<FichaVista f={e.ficha} causa={d.causa} vinculosAdj={e.vinculos?.adjuntos} />
							) : (
								<Alert severity="info">
									No se reconoció la plantilla de cédula{e?.ficha?.camposFaltantes ? ` (${e.ficha.camposFaltantes.join(", ")})` : ""}.
								</Alert>
							))}
						{vista === "texto" &&
							(d.texto ? (
								<Paper
									variant="outlined"
									sx={{ p: 1.25, maxHeight: "60vh", overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12.5 }}
								>
									{d.texto}
									{d.textoTruncado && "\n\n[… recortado para la vista]"}
								</Paper>
							) : (
								<Alert severity="warning">Sin texto extraído.</Alert>
							))}
						{vista === "pdf" &&
							(pdf ? (
								<Stack spacing={1}>
									<Box>
										<Button size="small" variant="outlined" onClick={descargarPdf}>
											Descargar PDF
										</Button>
									</Box>
									<Box sx={{ maxHeight: "70vh", overflow: "auto", bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
										<PdfCanvasViewer data={pdf} />
									</Box>
								</Stack>
							) : (
								<Skeleton variant="rectangular" height={400} />
							))}
						{vista === "json" && (
							<Stack spacing={1}>
								<Box>
									<Button
										size="small"
										variant="outlined"
										onClick={() => navigator.clipboard?.writeText(JSON.stringify({ estado: d.estado, movimiento: d.movimiento }, null, 2))}
									>
										Copiar
									</Button>
								</Box>
								<Typography variant="caption" color="text.secondary">
									estado: rag-movement-docs (rs0) · movimiento: pjn-movements (Atlas)
								</Typography>
								<Paper
									variant="outlined"
									sx={{ p: 1.25, maxHeight: "60vh", overflow: "auto", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre" }}
								>
									{JSON.stringify({ estado: d.estado, movimiento: d.movimiento }, null, 2)}
								</Paper>
							</Stack>
						)}
						{vista === "vinculos" &&
							(d.vinculados.length ? (
								<Stack spacing={1}>
									{d.vinculados.map((v) => {
										const esRes = res?.movementId === v._id;
										const adj = e?.vinculos?.adjuntos?.find((a) => a.movementId === v._id);
										const vv = e?.vinculos || {};
										const extra = [
											vv.original?.movementId === v._id && "cédula original",
											vv.datoSistema?.movementId === v._id && "dato del sistema",
											vv.resultado?.movementId === v._id && `volvió diligenciada: ${vv.resultado?.resultado || ""}`,
											(vv.notificadoPor || []).some((x) => x.cedulaId === v._id) && "cédula que lo adjuntó",
										].filter(Boolean) as string[];
										return (
											<Paper key={v._id} variant="outlined" sx={{ p: 1.25 }}>
												<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
													<Typography variant="subtitle2">
														{v.tipo} · {fmtFecha(v.fecha)}
													</Typography>
													{esRes && (
														<Chip
															size="small"
															color="success"
															label={`resolución notificada · ${
																res?.metodo === "fecha" ? "por fecha" : `${Math.round((res?.cobertura || 0) * 100)}%`
															}`}
														/>
													)}
													{adj && (
														<Chip
															size="small"
															color="info"
															label={`adjunto, págs. ${adj.paginas.join(",")} · ${METODO_LABEL[adj.metodo || ""] || adj.metodo || ""}${
																adj.metodo === "similitud" ? ` ${Math.round((adj.similitud || 0) * 100)}%` : ""
															}`}
														/>
													)}
													{extra.map((x) => (
														<Chip key={x} size="small" color="secondary" label={x} />
													))}
													{e?.aliasDe === v._id && <Chip size="small" label="mismo documento" />}
												</Stack>
												<Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
													{v._id} · {v.detalle}
												</Typography>
												<Paper
													variant="outlined"
													sx={{ p: 1, mt: 0.75, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 12.5 }}
												>
													{v.extracto || "(sin texto)"}
												</Paper>
											</Paper>
										);
									})}
								</Stack>
							) : (
								<Alert severity="info">Sin movimientos vinculados.</Alert>
							))}
					</Stack>
				)}
			</DialogContent>
			<DialogActions sx={{ justifyContent: "space-between", px: 2 }}>
				<Tooltip
					title={
						e ? "Volver a leer este documento con la versión actual del worker" : "Sin estado de extracción: no hay nada que reprocesar"
					}
				>
					<span>
						<Button
							size="small"
							variant="outlined"
							color="warning"
							disabled={!e || reprocesando}
							onClick={() => setConfirmarReproceso(true)}
						>
							Reprocesar
						</Button>
					</span>
				</Tooltip>
				<Button size="small" onClick={onClose}>
					Cerrar
				</Button>
			</DialogActions>
			<Dialog open={confirmarReproceso} onClose={() => !reprocesando && setConfirmarReproceso(false)} maxWidth="xs" fullWidth>
				<DialogTitle>¿Reprocesar este documento?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						El movimiento vuelve a quedar pendiente y el worker de la etapa{" "}
						<strong>{e?.etapa ? ETAPA_INFO[e.etapa]?.titulo || e.etapa : ""}</strong> lo toma en su próximo ciclo, con la versión actual del
						parser. El texto actual sigue visible hasta que el worker lo reescriba.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmarReproceso(false)} disabled={reprocesando}>
						Cancelar
					</Button>
					<Button variant="contained" color="warning" onClick={reprocesar} disabled={reprocesando}>
						{reprocesando ? "Pidiendo…" : "Reprocesar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Dialog>
	);
};

// ── Tab ──────────────────────────────────────────────────────────────────────

const ExtraccionTab = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [resumen, setResumen] = useState<ExtraccionResumen | null>(null);
	const [items, setItems] = useState<ExtraccionItem[]>([]);
	const [total, setTotal] = useState(0);
	const [cargando, setCargando] = useState(false);
	const [filtros, setFiltros] = useState<ExtraccionFiltros>(FILTROS_VACIOS("cedulas"));
	const [busqueda, setBusqueda] = useState("");
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(25);
	const [abierto, setAbierto] = useState<string | null>(null);
	const etapa = (filtros.etapa || "cedulas") as EtapaExtraccion;
	const esDiligenciadas = etapa === "resultados";
	// Escritos de parte y DEO: solo texto (tramos en escritos), sin ficha de cédula ni vínculos.
	const esTexto = etapa === "escritos" || etapa === "deo";

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const [r, l] = await Promise.all([
				RagExtraccionService.resumen(etapa),
				RagExtraccionService.documentos({ ...filtros, page: page + 1, limit }),
			]);
			setResumen(r);
			setItems(l.data);
			setTotal(l.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudo cargar la extracción", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [etapa, filtros, page, limit, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const set = (k: keyof ExtraccionFiltros) => (ev: React.ChangeEvent<HTMLInputElement>) => {
		setPage(0);
		setFiltros((f) => ({ ...f, [k]: ev.target.value }));
	};
	const cambiarEtapa = (_: unknown, v: EtapaExtraccion | null) => {
		if (!v) return;
		setPage(0);
		setResumen(null);
		setItems([]);
		setBusqueda("");
		setFiltros(FILTROS_VACIOS(v));
	};
	const verRevisar = () => {
		setPage(0);
		setFiltros((f) => ({ ...f, revisar: "1" }));
	};
	const fueros = useMemo(() => Object.keys(resumen?.procesados.porFuero || {}).filter((f) => f !== "sin_dato"), [resumen]);
	const familias = useMemo(() => Object.keys(resumen?.procesados.porFamilia || {}).filter((f) => f !== "sin_dato"), [resumen]);
	const info = ETAPA_INFO[etapa] || ETAPA_INFO.cedulas;

	const chipRevisar = (it: ExtraccionItem) =>
		it.revisar && it.revisar.length > 0 ? (
			<Tooltip title={it.revisar.join(" · ")}>
				<Chip size="small" color="warning" label="revisar" />
			</Tooltip>
		) : null;

	return (
		<Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
			<Stack spacing={2}>
				<Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} spacing={1}>
					<Box sx={{ maxWidth: 820 }}>
						<Typography variant="h5">{info.titulo}</Typography>
						<Typography variant="body2" color="text.secondary">
							{info.texto}
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} alignItems="center">
						<ToggleButtonGroup size="small" exclusive value={etapa} onChange={cambiarEtapa} sx={{ flexWrap: "wrap" }}>
							<ToggleButton value="cedulas" sx={{ textTransform: "none" }}>
								Cédulas electrónicas
							</ToggleButton>
							<ToggleButton value="resultados" sx={{ textTransform: "none" }}>
								Cédulas en papel diligenciadas
							</ToggleButton>
							<ToggleButton value="escritos" sx={{ textTransform: "none" }}>
								Escritos de parte
							</ToggleButton>
							<ToggleButton value="deo" sx={{ textTransform: "none" }}>
								DEO
							</ToggleButton>
						</ToggleButtonGroup>
						<Tooltip title="Actualizar">
							<span>
								<IconButton aria-label="Actualizar" onClick={cargar} disabled={cargando}>
									<Refresh size={18} />
								</IconButton>
							</span>
						</Tooltip>
					</Stack>
				</Stack>

				{resumen && resumen.etapa === etapa ? (
					esDiligenciadas ? (
						<ResumenDiligenciadas r={resumen} onRevisar={verRevisar} />
					) : (
						<Resumen r={resumen} onRevisar={verRevisar} />
					)
				) : (
					<Skeleton variant="rectangular" height={110} />
				)}

				<Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
					<TextField select size="small" label="Estado" value={filtros.status} onChange={set("status")} sx={{ minWidth: 130 }}>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(STATUS_LABEL).map(([k, v]) => (
							<MenuItem key={k} value={k}>
								{v}
							</MenuItem>
						))}
					</TextField>
					{esDiligenciadas ? (
						<>
							<TextField select size="small" label="Qué es" value={filtros.claseNotif} onChange={set("claseNotif")} sx={{ minWidth: 200 }}>
								<MenuItem value="">Todos</MenuItem>
								{Object.entries(CLASE_NOTIF_LABEL).map(([k, v]) => (
									<MenuItem key={k} value={k}>
										{v}
									</MenuItem>
								))}
							</TextField>
							<TextField select size="small" label="Resultado" value={filtros.resultado} onChange={set("resultado")} sx={{ minWidth: 150 }}>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="positiva">Positiva</MenuItem>
								<MenuItem value="negativa">Negativa</MenuItem>
								<MenuItem value="sin_diligenciar">Devuelta sin diligenciar</MenuItem>
								<MenuItem value="indeterminado">Sin determinar</MenuItem>
							</TextField>
							<TextField
								select
								size="small"
								label="Librada por"
								value={filtros.libradaPor}
								onChange={set("libradaPor")}
								sx={{ minWidth: 150 }}
							>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="tribunal">Tribunal</MenuItem>
								<MenuItem value="parte">Parte</MenuItem>
							</TextField>
						</>
					) : esTexto ? (
						<TextField select size="small" label="Fuero" value={filtros.fuero} onChange={set("fuero")} sx={{ minWidth: 110 }}>
							<MenuItem value="">Todos</MenuItem>
							{fueros.map((f) => (
								<MenuItem key={f} value={f}>
									{f}
								</MenuItem>
							))}
						</TextField>
					) : (
						<>
							<TextField select size="small" label="Vínculo" value={filtros.vinculo} onChange={set("vinculo")} sx={{ minWidth: 150 }}>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="si">Con resolución</MenuItem>
								<MenuItem value="no">Sin resolución</MenuItem>
							</TextField>
							<TextField
								select
								size="small"
								label="Motivo sin vínculo"
								value={filtros.motivo}
								onChange={set("motivo")}
								sx={{ minWidth: 190 }}
							>
								<MenuItem value="">Todos</MenuItem>
								{Object.entries(MOTIVO_LABEL).map(([k, v]) => (
									<MenuItem key={k} value={k}>
										{v}
									</MenuItem>
								))}
							</TextField>
							<TextField select size="small" label="Fuero" value={filtros.fuero} onChange={set("fuero")} sx={{ minWidth: 110 }}>
								<MenuItem value="">Todos</MenuItem>
								{fueros.map((f) => (
									<MenuItem key={f} value={f}>
										{f}
									</MenuItem>
								))}
							</TextField>
							<TextField select size="small" label="Plantilla" value={filtros.familia} onChange={set("familia")} sx={{ minWidth: 130 }}>
								<MenuItem value="">Todas</MenuItem>
								{familias.map((f) => (
									<MenuItem key={f} value={f}>
										{f}
									</MenuItem>
								))}
							</TextField>
						</>
					)}
					{/* DEO no tiene campos para buscar (ni destinatario ni título): solo por causa. */}
					{etapa !== "deo" && (
						<TextField
							size="small"
							label={etapa === "escritos" ? "Buscar (título del escrito)" : "Buscar (destinatario, carátula, N°, tribunal)"}
							value={busqueda}
							onChange={(ev) => setBusqueda(ev.target.value)}
							onKeyDown={(ev) => {
								if (ev.key === "Enter") {
									setPage(0);
									setFiltros((f) => ({ ...f, q: busqueda.trim() }));
								}
							}}
							sx={{ flex: 1, minWidth: 200 }}
						/>
					)}
					<TextField
						size="small"
						label="Causa (id)"
						value={filtros.causaId || ""}
						onChange={set("causaId")}
						sx={{ minWidth: 220 }}
						error={!!filtros.causaId && !/^[a-f0-9]{24}$/i.test(filtros.causaId)}
					/>
					<FormControlLabel
						control={
							<Switch
								checked={filtros.revisar === "1"}
								onChange={(ev) => {
									setPage(0);
									setFiltros((f) => ({ ...f, revisar: ev.target.checked ? "1" : "" }));
								}}
							/>
						}
						label="Solo a revisar"
					/>
				</Stack>

				<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark) }}>
					{cargando && <LinearProgress />}
					<Table size="small">
						<TableHead>
							<TableRow sx={{ "& th": { bgcolor: alpha(theme.palette.primary.main, 0.04), fontWeight: 600 } }}>
								<TableCell>Fecha</TableCell>
								{esDiligenciadas ? (
									<>
										<TableCell>Escrito</TableCell>
										<TableCell>Destinatario</TableCell>
										<TableCell>Qué es</TableCell>
										<TableCell>Resultado</TableCell>
										<TableCell>Vínculos</TableCell>
										<TableCell align="right">Visión</TableCell>
									</>
								) : esTexto ? (
									<>
										<TableCell>Documento</TableCell>
										{etapa === "escritos" && <TableCell>Tramos</TableCell>}
										<TableCell>Páginas</TableCell>
										<TableCell>Motor</TableCell>
										<TableCell>Estado</TableCell>
									</>
								) : (
									<>
										<TableCell>Tipo</TableCell>
										<TableCell>Destinatario</TableCell>
										<TableCell>Notificada</TableCell>
										<TableCell>Expediente</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Resolución</TableCell>
										<TableCell align="right">Adjuntos</TableCell>
									</>
								)}
							</TableRow>
						</TableHead>
						<TableBody>
							{items.map((it) => {
								const r = it.vinculos?.resolucion;
								const f = it.ficha || {};
								const rn = f.resultadoNotificacion;
								return (
									<TableRow key={it._id} hover sx={{ cursor: "pointer" }} {...clickableProps(() => setAbierto(it._id), { asRow: true })}>
										<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtFecha(it.fecha)}</TableCell>
										{esDiligenciadas ? (
											<>
												<TableCell sx={{ maxWidth: 300 }}>
													<Typography variant="body2" noWrap title={it.detalle || ""}>
														{(it.detalle || it.tipo).replace(/\s*\[Presentado[^\]]*\]/i, "")}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{[
															it.tipo,
															it.status !== "extracted" ? `${STATUS_LABEL[it.status]}${it.skipReason ? `: ${it.skipReason}` : ""}` : null,
														]
															.filter(Boolean)
															.join(" · ")}
													</Typography>
												</TableCell>
												<TableCell sx={{ maxWidth: 220 }}>
													<Typography variant="body2" noWrap title={f.destinatario || ""}>
														{f.destinatario || "—"}
													</Typography>
												</TableCell>
												<TableCell>
													{f.clase ? (
														<Stack spacing={0.25}>
															<Typography variant="body2">{CLASE_NOTIF_LABEL[f.clase] || f.clase}</Typography>
															<Typography variant="caption" color="text.secondary">
																{[
																	f.instrumento === "mandamiento" ? "mandamiento" : "cédula",
																	f.ley22172 ? "ley 22.172" : null,
																	f.libradaPor === "tribunal" ? "del tribunal" : f.libradaPor === "parte" ? "de la parte" : null,
																]
																	.filter(Boolean)
																	.join(" · ")}
															</Typography>
														</Stack>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5} alignItems="center">
														{rn ? (
															<Chip
																size="small"
																color={RESULTADO_COLOR[rn.resultado]}
																label={RESULTADO_LABEL[rn.resultado] || rn.resultado}
															/>
														) : (
															"—"
														)}
														{chipRevisar(it)}
													</Stack>
													{rn && (rn.fechaNotificacion || rn.fechaUltimaDiligencia) && (
														<Typography variant="caption" color="text.secondary">
															{rn.fechaNotificacion
																? `notificada ${fmtDia(rn.fechaNotificacion)}`
																: `última diligencia ${fmtDia(rn.fechaUltimaDiligencia)}`}
														</Typography>
													)}
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
														{it.vinculos?.original && (
															<Chip size="small" variant="outlined" color="primary" icon={<Link21 size={12} />} label="original" />
														)}
														{it.vinculos?.datoSistema && <Chip size="small" variant="outlined" color="secondary" label="sistema" />}
														{r?.movementId && <Chip size="small" variant="outlined" color="success" label="resolución" />}
													</Stack>
												</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													{it.vision ? `US$ ${(it.vision.usd || 0).toFixed(3)}${it.vision.reutilizada ? " ↺" : ""}` : "—"}
												</TableCell>
											</>
										) : esTexto ? (
											<>
												<TableCell sx={{ maxWidth: 340 }}>
													<Typography variant="body2" noWrap title={it.detalle || ""}>
														{(it.detalle || it.tipo).replace(/\s*\[Presentado[^\]]*\]/i, "")}
													</Typography>
													<Typography variant="caption" color="text.secondary" noWrap display="block">
														{[it.tipo, it.fuero, (f.tramos || []).find((t) => t.titulo)?.titulo].filter(Boolean).join(" · ")}
													</Typography>
												</TableCell>
												{etapa === "escritos" && (
													<TableCell sx={{ minWidth: 180 }}>{f.tramos?.length ? <TramosChips tramos={f.tramos} /> : "—"}</TableCell>
												)}
												<TableCell sx={{ whiteSpace: "nowrap" }}>
													<Typography variant="body2">{it.paginas ?? "—"}</Typography>
													<Typography variant="caption" color="text.secondary" display="block">
														{[it.clase, f.paginasIlegibles?.length ? `${f.paginasIlegibles.length} ilegibles` : null]
															.filter(Boolean)
															.join(" · ")}
													</Typography>
												</TableCell>
												<TableCell>
													{it.motorPdf === "pdfjs" ? (
														<Tooltip title={it.errorPdfjs || "poppler falló: se leyó con pdf.js"}>
															<Chip size="small" variant="outlined" color="warning" label="pdf.js" />
														</Tooltip>
													) : (
														<Typography variant="caption" color="text.secondary">
															{it.motorPdf || "—"}
														</Typography>
													)}
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5}>
														<Chip size="small" color={STATUS_COLOR[it.status]} label={STATUS_LABEL[it.status] || it.status} />
														{chipRevisar(it)}
														{it.aliasDe && <Chip size="small" variant="outlined" label="dup" />}
													</Stack>
													{it.status !== "extracted" && (it.skipReason || it.error) && (
														<Typography variant="caption" color="text.secondary" noWrap display="block" title={it.error || it.skipReason}>
															{it.skipReason || it.error}
														</Typography>
													)}
												</TableCell>
											</>
										) : (
											<>
												<TableCell>
													<Typography variant="body2">{TIPO_CORTO[it.tipo] || it.tipo}</Typography>
													<Typography variant="caption" color="text.secondary">
														{[it.fuero, f.familia].filter(Boolean).join(" · ")}
													</Typography>
												</TableCell>
												<TableCell sx={{ maxWidth: 240 }}>
													<Typography variant="body2" noWrap title={f.destinatario || ""}>
														{f.destinatario || "—"}
													</Typography>
													<Typography variant="caption" color="text.secondary" noWrap display="block" title={f.tribunal || ""}>
														{f.tribunal || ""}
													</Typography>
												</TableCell>
												<TableCell sx={{ whiteSpace: "nowrap" }}>{f.notificadoEl ? fmtFecha(f.notificadoEl, true) : "—"}</TableCell>
												<TableCell sx={{ whiteSpace: "nowrap" }}>
													{f.expediente ? `${f.expediente.numero}/${f.expediente.anio || "?"}` : "—"}
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5}>
														<Chip size="small" color={STATUS_COLOR[it.status]} label={STATUS_LABEL[it.status] || it.status} />
														{chipRevisar(it)}
														{it.aliasDe && <Chip size="small" variant="outlined" label="dup" />}
													</Stack>
												</TableCell>
												<TableCell>
													{r?.movementId ? (
														<Chip
															size="small"
															color="success"
															variant="outlined"
															icon={<Link21 size={12} />}
															label={
																r.metodo === "fecha"
																	? "por fecha"
																	: r.metodo === "adjunto"
																	? "adjunta"
																	: `${Math.round(r.cobertura * 100)}%`
															}
														/>
													) : it.vinculos?.motivo ? (
														<Tooltip title={MOTIVO_LABEL[it.vinculos.motivo] || it.vinculos.motivo}>
															<Typography variant="caption" color="warning.main">
																{it.vinculos.motivo === "sin_texto_de_resolucion"
																	? "sin texto"
																	: it.vinculos.motivo === "causa_sin_textos"
																	? "causa sin textos"
																	: "no coincide"}
															</Typography>
														</Tooltip>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell align="right">
													{(it.vinculos?.adjuntos || []).length || "—"}
													{(f.adjuntosSinOrigen || []).length > 0 && (
														<Typography variant="caption" color="warning.main" display="block">
															{f.adjuntosSinOrigen?.length} sin origen
														</Typography>
													)}
												</TableCell>
											</>
										)}
									</TableRow>
								);
							})}
							{!cargando && items.length === 0 && (
								<TableRow>
									<TableCell colSpan={8}>
										<Stack alignItems="center" spacing={0.5} sx={{ py: 3 }}>
											<DocumentText size={28} />
											<Typography variant="body2" color="text.secondary">
												No hay documentos procesados con esos filtros.
											</Typography>
										</Stack>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<Divider />
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={(_, p) => setPage(p)}
						rowsPerPage={limit}
						onRowsPerPageChange={(ev) => {
							setLimit(parseInt(ev.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[25, 50, 100]}
						labelRowsPerPage="Por página"
					/>
				</TableContainer>
				<Stack direction="row" spacing={1}>
					<Button
						size="small"
						variant="text"
						sx={{ alignSelf: "flex-start" }}
						onClick={() => {
							setBusqueda("");
							setFiltros(FILTROS_VACIOS(etapa));
						}}
					>
						Limpiar filtros
					</Button>
					<Tooltip title="30 documentos procesados al azar, con los filtros actuales, para revisar a mano">
						<Button
							size="small"
							variant="outlined"
							onClick={() => {
								setPage(0);
								setFiltros((f) => ({ ...f, muestra: f.muestra ? "" : "30" }));
							}}
						>
							{filtros.muestra ? "Salir de la muestra" : "Muestra al azar (30)"}
						</Button>
					</Tooltip>
				</Stack>
			</Stack>
			<DetalleDialog id={abierto} onClose={() => setAbierto(null)} onReprocesado={cargar} />
		</Box>
	);
};

export default ExtraccionTab;
