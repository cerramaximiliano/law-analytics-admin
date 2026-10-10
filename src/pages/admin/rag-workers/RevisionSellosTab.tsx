/**
 * Revisión manual de sellos del oficial notificador (protocolo cerrado v1).
 *
 * Por cada caso del lote: la página con el sello a la izquierda (se dibuja un recuadro por sello)
 * y a la derecha el formulario PRECARGADO con lo que leyó el modelo; se corrige lo que haga falta.
 * Reglas del protocolo:
 *  - opciones del sello (respondieron, vive, firmó, copia): la que quedó vigente tras los tachados;
 *  - frases tachadas: solo las de la lista cerrada del sello estándar;
 *  - manuscrito: se tipea literal, sin corregir; si no se lee, "no se lee" (no adivinar);
 *  - no se retipea el texto impreso ni se edita la imagen;
 *  - el resultado lo calcula el sistema; solo se confirma o se indica el correcto.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	CircularProgress,
	Divider,
	FormControl,
	FormControlLabel,
	Grid,
	InputLabel,
	LinearProgress,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import RagExtraccionService, { ExtraccionDetalle } from "api/ragExtraccion";
import RagRevisionService, {
	Accion,
	CamposSello,
	CasoLote,
	EstadoDoc,
	Etiqueta,
	Familia,
	FRASES_TACHABLES,
	LoteResumen,
	Resultado,
	resultadoDesdeEtiqueta,
	SelloEtiqueta,
} from "api/ragRevision";
import PdfPaginaRecuadros, { Recuadro } from "components/PdfPaginaRecuadros";

const ACCIONES: Array<[Accion, string]> = [
	["entrega", "Entrega (notificó)"],
	["aviso", "Aviso (dejó aviso)"],
	["fijacion", "Fijación"],
	["bajo_responsabilidad", "Bajo responsabilidad de la parte"],
	["negativa", "Negativa (no vive / no existe)"],
	["devolucion", "Devolución sin diligenciar"],
	["intimacion", "Intimación"],
	["embargo", "Embargo"],
	["constatacion", "Constatación"],
	["otro", "Otro"],
];
const FAMILIAS: Array<[Familia, string]> = [
	["estandar", "Sello estándar"],
	["informe_libre", "Informe libre"],
	["mandamiento", "Mandamiento"],
	["otro", "Otro"],
];
const ESTADOS: Array<[EstadoDoc, string]> = [
	["diligenciada", "Diligenciada"],
	["devuelta_sin_diligenciar", "Devuelta sin diligenciar"],
	["en_blanco", "En blanco (sin sello)"],
	["no_es_notificacion", "No es una notificación"],
];
const RESULTADOS: Array<[Resultado, string]> = [
	["positiva", "Positiva"],
	["negativa", "Negativa"],
	["sin_diligenciar", "Sin diligenciar"],
	["indeterminado", "Indeterminado"],
	["en_blanco", "En blanco"],
];
// Para precargar las frases tachadas desde la transcripción del modelo (lo tachado va entre ~~ ~~).
const CLAVE_FRASE: Record<string, RegExp> = {
	"una persona que dijo ser": /dijo ser|una persona/,
	"aquel vive allí": /vive/,
	"procedí a notificarle": /notific/,
	"haciéndole entrega de": /entrega/,
	"duplicado de igual tenor": /duplicado|igual tenor/,
	"previa lectura": /lectura/,
	"recibiéndose de ello": /recibi/,
	firmó: /firm/,
};
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const camposVacios = (): CamposSello => ({
	fecha: null,
	fechaFuente: null,
	hora: null,
	respondieron: null,
	vive: null,
	firmo: null,
	copia: null,
	accion: null,
	entregaTachada: null,
	atendio: null,
	motivo: null,
	observacion: null,
	oficial: null,
	avisoPara: null,
	noSeLee: [],
});
const selloVacio = (pagina: number | null): SelloEtiqueta => ({
	pagina,
	recuadro: null,
	familia: "estandar",
	anulado: false,
	campos: camposVacios(),
	frasesTachadas: [],
});

/** Precarga desde la lectura del modelo (v4 trae campos; v3 solo transcripción). */
function desdeVision(det: ExtraccionDetalle): Etiqueta {
	const v: any = (det.estado as any)?.vision?.json || {};
	const dorso = v.dorso || {};
	const sellos: SelloEtiqueta[] = (dorso.sellos || v.sellos || []).map((s: any) => {
		const c = s.campos || {};
		const tachado = [...String(s.transcripcion || "").matchAll(/~~([^~]+)~~/g)].map((m) => sinTildes(m[1])).join(" | ");
		return {
			pagina: Number.isInteger(s.pagina) ? s.pagina : dorso.pagina ?? null,
			recuadro: null,
			familia: (["estandar", "informe_libre", "mandamiento", "otro"].includes(s.familia) ? s.familia : "estandar") as Familia,
			anulado: !!s.anulado,
			campos: {
				...camposVacios(),
				fecha: c.fecha || null,
				fechaFuente: c.fechaFuente || null,
				hora: c.hora || null,
				respondieron: typeof c.respondieron === "boolean" ? c.respondieron : null,
				vive: typeof c.vive === "boolean" ? c.vive : null,
				firmo: typeof c.firmo === "boolean" ? c.firmo : null,
				copia: c.copia === "con" || c.copia === "sin" ? c.copia : null,
				accion: ACCIONES.some(([k]) => k === c.accion) ? c.accion : null,
				entregaTachada: typeof c.entregaTachada === "boolean" ? c.entregaTachada : null,
				atendio: c.atendio || null,
				motivo: c.motivo || null,
				observacion: c.observacion || null,
				oficial: c.oficial || null,
				avisoPara: c.avisoPara || null,
			},
			frasesTachadas: tachado ? FRASES_TACHABLES.filter((f) => CLAVE_FRASE[f].test(tachado)) : [],
		};
	});
	const estado: EstadoDoc = ESTADOS.some(([k]) => k === v.estado) ? v.estado : sellos.length ? "diligenciada" : "en_blanco";
	return {
		estado,
		instrumento: v.instrumento === "mandamiento" ? "mandamiento" : v.instrumento === "cedula" ? "cedula" : null,
		sellos,
		resultadoCalculado: resultadoDesdeEtiqueta(estado, sellos),
		resultadoConfirmado: true,
	};
}

// ── Controles chicos ─────────────────────────────────────────────────────────
const SiNo = ({
	label,
	valor,
	noSeLee,
	onChange,
}: {
	label: string;
	valor: boolean | null;
	noSeLee: boolean;
	onChange: (v: boolean | null, nl: boolean) => void;
}) => (
	<Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
		<Typography variant="body2">{label}</Typography>
		<ToggleButtonGroup
			size="small"
			exclusive
			value={noSeLee ? "nl" : valor === true ? "si" : valor === false ? "no" : null}
			onChange={(_, x) => onChange(x === "si" ? true : x === "no" ? false : null, x === "nl")}
		>
			<ToggleButton value="si">Sí</ToggleButton>
			<ToggleButton value="no">No</ToggleButton>
			<ToggleButton value="nl">No se lee</ToggleButton>
		</ToggleButtonGroup>
	</Stack>
);

const Texto = ({
	label,
	valor,
	noSeLee,
	onChange,
	multiline = false,
	ayuda,
}: {
	label: string;
	valor: string | null;
	noSeLee: boolean;
	onChange: (v: string | null, nl: boolean) => void;
	multiline?: boolean;
	ayuda?: string;
}) => (
	<Stack direction="row" spacing={1} alignItems="flex-start">
		<TextField
			fullWidth
			size="small"
			label={label}
			value={valor || ""}
			disabled={noSeLee}
			multiline={multiline}
			minRows={multiline ? 2 : undefined}
			helperText={ayuda}
			onChange={(e) => onChange(e.target.value || null, false)}
		/>
		<FormControlLabel
			sx={{ whiteSpace: "nowrap", mr: 0 }}
			control={<Checkbox size="small" checked={noSeLee} onChange={(e) => onChange(null, e.target.checked)} />}
			label={<Typography variant="caption">No se lee</Typography>}
		/>
	</Stack>
);

// ── Pestaña ──────────────────────────────────────────────────────────────────
const RevisionSellosTab = () => {
	const [lotes, setLotes] = useState<LoteResumen[]>([]);
	const [loteId, setLoteId] = useState<string>("");
	const [casos, setCasos] = useState<CasoLote[]>([]);
	const [soloPendientes, setSoloPendientes] = useState(true);
	const [casoId, setCasoId] = useState<string>("");
	const [det, setDet] = useState<ExtraccionDetalle | null>(null);
	const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
	const [pagina, setPagina] = useState(1);
	const [totalPaginas, setTotalPaginas] = useState(0);
	const [et, setEt] = useState<Etiqueta | null>(null);
	const [activo, setActivo] = useState(0);
	const [cargando, setCargando] = useState(false);
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [aviso, setAviso] = useState<string | null>(null);

	useEffect(() => {
		RagRevisionService.lotes()
			.then((l) => {
				setLotes(l);
				if (l.length && !loteId) setLoteId(l[0].id);
			})
			.catch((e) => setError(e?.response?.data?.error || e.message));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const cargarLote = useCallback(async (id: string) => {
		if (!id) return;
		const l = await RagRevisionService.lote(id);
		setCasos(l.casos);
		return l.casos;
	}, []);
	useEffect(() => {
		cargarLote(loteId).catch((e) => setError(e?.response?.data?.error || e.message));
	}, [loteId, cargarLote]);

	const visibles = useMemo(() => casos.filter((c) => !soloPendientes || !c.etiquetado || c.id === casoId), [casos, soloPendientes, casoId]);
	const hechos = casos.filter((c) => c.etiquetado).length;

	useEffect(() => {
		if (!casoId && visibles.length) setCasoId(visibles[0].id);
	}, [visibles, casoId]);

	useEffect(() => {
		if (!casoId) return;
		let cancelado = false;
		(async () => {
			setCargando(true);
			setError(null);
			setAviso(null);
			setPdf(null);
			try {
				const [d, p, previa] = await Promise.all([
					RagExtraccionService.detalle(casoId),
					RagExtraccionService.pdf(casoId),
					RagRevisionService.etiqueta(casoId),
				]);
				if (cancelado) return;
				setDet(d);
				setPdf(p);
				const base = previa && previa.fuente === "ui" ? previa : desdeVision(d);
				setEt({ ...base, sellos: base.sellos || [] });
				setActivo(0);
				const pv = (d.estado as any)?.vision?.json?.dorso?.pagina;
				setPagina(base.sellos?.[0]?.pagina || pv || 1);
			} catch (e: any) {
				if (!cancelado) setError(e?.response?.data?.error || e.message);
			} finally {
				if (!cancelado) setCargando(false);
			}
		})();
		return () => {
			cancelado = true;
		};
	}, [casoId]);

	// Recalcular el resultado cada vez que cambia la etiqueta
	const calculado = et ? resultadoDesdeEtiqueta(et.estado, et.sellos) : "indeterminado";

	const cambiarSello = (i: number, f: (s: SelloEtiqueta) => SelloEtiqueta) =>
		setEt((e) => (e ? { ...e, sellos: e.sellos.map((s, k) => (k === i ? f(s) : s)) } : e));
	const campo = <K extends keyof CamposSello>(i: number, k: K, v: CamposSello[K], nl = false) =>
		cambiarSello(i, (s) => ({
			...s,
			campos: {
				...s.campos,
				[k]: nl ? null : v,
				noSeLee: nl ? Array.from(new Set([...s.campos.noSeLee, k as string])) : s.campos.noSeLee.filter((x) => x !== k),
			},
		}));

	const guardar = async () => {
		if (!et || !casoId) return;
		const faltanRecuadros = et.sellos.some((s) => !s.recuadro);
		if (faltanRecuadros && !window.confirm("Hay sellos sin recuadro. ¿Guardar igual?")) return;
		setGuardando(true);
		setError(null);
		try {
			await RagRevisionService.guardar(casoId, { ...et, resultadoCalculado: calculado, lote: loteId });
			const nuevos = (await cargarLote(loteId)) || [];
			setAviso("Guardado");
			const resto = nuevos.filter((c) => !c.etiquetado && c.id !== casoId);
			if (resto.length) setCasoId(resto[0].id);
		} catch (e: any) {
			setError(e?.response?.data?.error || e.message);
		} finally {
			setGuardando(false);
		}
	};

	const idx = visibles.findIndex((c) => c.id === casoId);
	const caso = casos.find((c) => c.id === casoId);

	if (!lotes.length && !error)
		return (
			<Box sx={{ p: 3 }}>
				<Typography color="text.secondary">No hay lotes de revisión todavía.</Typography>
			</Box>
		);

	return (
		<Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
			<Stack spacing={2}>
				<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
					<FormControl size="small" sx={{ minWidth: 280 }}>
						<InputLabel>Lote</InputLabel>
						<Select
							label="Lote"
							value={loteId}
							onChange={(e) => {
								setLoteId(e.target.value);
								setCasoId("");
							}}
						>
							{lotes.map((l) => (
								<MenuItem key={l.id} value={l.id}>
									{l.descripcion || l.id} ({l.etiquetados}/{l.total})
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Box sx={{ flex: 1 }}>
						<Typography variant="caption" color="text.secondary">
							{hechos} de {casos.length} etiquetados
						</Typography>
						<LinearProgress variant="determinate" value={casos.length ? (100 * hechos) / casos.length : 0} />
					</Box>
					<FormControlLabel
						control={<Switch checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />}
						label="Solo pendientes"
					/>
					<Stack direction="row" spacing={1}>
						<Button size="small" disabled={idx <= 0} onClick={() => setCasoId(visibles[idx - 1].id)}>
							Anterior
						</Button>
						<Button size="small" disabled={idx < 0 || idx >= visibles.length - 1} onClick={() => setCasoId(visibles[idx + 1].id)}>
							Siguiente
						</Button>
					</Stack>
				</Stack>

				{error && <Alert severity="error">{error}</Alert>}
				{aviso && (
					<Alert severity="success" onClose={() => setAviso(null)}>
						{aviso}
					</Alert>
				)}

				{caso && det && (
					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
							<Chip size="small" color={caso.motivo === "a revisar" ? "warning" : "default"} label={caso.motivo} />
							{caso.etiquetado && <Chip size="small" color="success" label="etiquetado" />}
							<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
								{casoId}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{det.movimiento?.fuero} · {det.movimiento?.detalle}
							</Typography>
							{(det.revisar || []).map((m) => (
								<Chip key={m} size="small" variant="outlined" color="warning" label={m} />
							))}
						</Stack>
					</Paper>
				)}

				{cargando && <LinearProgress />}

				{et && pdf && (
					<Grid container spacing={2}>
						<Grid item xs={12} md={7}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								<Button size="small" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
									◀
								</Button>
								<Typography variant="body2">
									Página {pagina} de {totalPaginas || "?"}
								</Typography>
								<Button size="small" disabled={!!totalPaginas && pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}>
									▶
								</Button>
								<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
									Arrastrá para marcar el recuadro del sello S{activo + 1}
								</Typography>
							</Stack>
							<PdfPaginaRecuadros
								data={pdf}
								pagina={pagina}
								onPaginas={setTotalPaginas}
								recuadros={et.sellos
									.map((s, i) => ({ s, i }))
									.filter(({ s }) => s.recuadro && s.pagina === pagina)
									.map(({ s, i }) => ({ caja: s.recuadro as Recuadro, etiqueta: `S${i + 1}`, activo: i === activo }))}
								onDibujar={(caja) => {
									if (!et.sellos.length) setEt({ ...et, sellos: [{ ...selloVacio(pagina), recuadro: caja }] });
									else cambiarSello(activo, (s) => ({ ...s, recuadro: caja, pagina }));
								}}
							/>
						</Grid>

						<Grid item xs={12} md={5}>
							<Stack spacing={1.5}>
								<Stack direction="row" spacing={1}>
									<FormControl size="small" fullWidth>
										<InputLabel>Documento</InputLabel>
										<Select label="Documento" value={et.estado} onChange={(e) => setEt({ ...et, estado: e.target.value as EstadoDoc })}>
											{ESTADOS.map(([k, l]) => (
												<MenuItem key={k} value={k}>
													{l}
												</MenuItem>
											))}
										</Select>
									</FormControl>
									<FormControl size="small" fullWidth>
										<InputLabel>Instrumento</InputLabel>
										<Select
											label="Instrumento"
											value={et.instrumento || ""}
											onChange={(e) => setEt({ ...et, instrumento: (e.target.value || null) as Etiqueta["instrumento"] })}
										>
											<MenuItem value="cedula">Cédula</MenuItem>
											<MenuItem value="mandamiento">Mandamiento</MenuItem>
											<MenuItem value="otro">Otro</MenuItem>
										</Select>
									</FormControl>
								</Stack>

								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
									{et.sellos.map((s, i) => (
										<Chip
											key={i}
											label={`S${i + 1}${s.pagina ? ` · pág. ${s.pagina}` : ""}${s.recuadro ? "" : " · sin recuadro"}`}
											color={i === activo ? "primary" : "default"}
											variant={i === activo ? "filled" : "outlined"}
											onClick={() => {
												setActivo(i);
												if (s.pagina) setPagina(s.pagina);
											}}
										/>
									))}
									<Button
										size="small"
										onClick={() => {
											setEt({ ...et, sellos: [...et.sellos, selloVacio(pagina)] });
											setActivo(et.sellos.length);
										}}
									>
										+ Sello
									</Button>
									{et.sellos.length > 0 && (
										<Button
											size="small"
											color="error"
											onClick={() => {
												setEt({ ...et, sellos: et.sellos.filter((_, k) => k !== activo) });
												setActivo(0);
											}}
										>
											Quitar S{activo + 1}
										</Button>
									)}
								</Stack>

								{et.sellos[activo] &&
									(() => {
										const s = et.sellos[activo];
										const c = s.campos;
										const nl = (k: string) => c.noSeLee.includes(k);
										return (
											<Paper variant="outlined" sx={{ p: 1.5 }}>
												<Stack spacing={1.25}>
													<Stack direction="row" spacing={1}>
														<FormControl size="small" fullWidth>
															<InputLabel>Familia</InputLabel>
															<Select
																label="Familia"
																value={s.familia || ""}
																onChange={(e) => cambiarSello(activo, (x) => ({ ...x, familia: e.target.value as Familia }))}
															>
																{FAMILIAS.map(([k, l]) => (
																	<MenuItem key={k} value={k}>
																		{l}
																	</MenuItem>
																))}
															</Select>
														</FormControl>
														<FormControlLabel
															control={
																<Switch
																	checked={s.anulado}
																	onChange={(e) => cambiarSello(activo, (x) => ({ ...x, anulado: e.target.checked }))}
																/>
															}
															label="Anulado"
														/>
													</Stack>
													<FormControl size="small" fullWidth>
														<InputLabel>Acción del oficial</InputLabel>
														<Select
															label="Acción del oficial"
															value={c.accion || ""}
															onChange={(e) => campo(activo, "accion", (e.target.value || null) as Accion)}
														>
															{ACCIONES.map(([k, l]) => (
																<MenuItem key={k} value={k}>
																	{l}
																</MenuItem>
															))}
														</Select>
													</FormControl>
													<Stack direction="row" spacing={1} alignItems="center">
														<TextField
															size="small"
															type="date"
															label="Fecha"
															InputLabelProps={{ shrink: true }}
															value={c.fecha || ""}
															disabled={nl("fecha")}
															onChange={(e) => campo(activo, "fecha", e.target.value || null)}
														/>
														<TextField
															size="small"
															label="Hora"
															placeholder="hh:mm"
															sx={{ width: 100 }}
															value={c.hora || ""}
															disabled={nl("hora")}
															onChange={(e) => campo(activo, "hora", e.target.value || null)}
														/>
														<ToggleButtonGroup
															size="small"
															exclusive
															value={c.fechaFuente}
															onChange={(_, v) => campo(activo, "fechaFuente", v)}
														>
															<ToggleButton value="fechador">Fechador</ToggleButton>
															<ToggleButton value="manuscrito">Manuscrito</ToggleButton>
														</ToggleButtonGroup>
													</Stack>
													<Stack direction="row" spacing={2}>
														<FormControlLabel
															control={
																<Checkbox
																	size="small"
																	checked={nl("fecha")}
																	onChange={(e) => campo(activo, "fecha", null, e.target.checked)}
																/>
															}
															label={<Typography variant="caption">Fecha no se lee</Typography>}
														/>
														<FormControlLabel
															control={
																<Checkbox
																	size="small"
																	checked={nl("hora")}
																	onChange={(e) => campo(activo, "hora", null, e.target.checked)}
																/>
															}
															label={<Typography variant="caption">Hora no se lee</Typography>}
														/>
													</Stack>
													<Divider textAlign="left">
														<Typography variant="caption">Opciones vigentes (después de los tachados)</Typography>
													</Divider>
													<SiNo
														label="Respondieron a los llamados"
														valor={c.respondieron}
														noSeLee={nl("respondieron")}
														onChange={(v, n) => campo(activo, "respondieron", v, n)}
													/>
													<SiNo label="Vive allí" valor={c.vive} noSeLee={nl("vive")} onChange={(v, n) => campo(activo, "vive", v, n)} />
													<SiNo label="Firmó" valor={c.firmo} noSeLee={nl("firmo")} onChange={(v, n) => campo(activo, "firmo", v, n)} />
													<Stack direction="row" alignItems="center" justifyContent="space-between">
														<Typography variant="body2">Copia</Typography>
														<ToggleButtonGroup
															size="small"
															exclusive
															value={nl("copia") ? "nl" : c.copia}
															onChange={(_, v) => campo(activo, "copia", v === "con" || v === "sin" ? v : null, v === "nl")}
														>
															<ToggleButton value="con">Con</ToggleButton>
															<ToggleButton value="sin">Sin</ToggleButton>
															<ToggleButton value="nl">No se lee</ToggleButton>
														</ToggleButtonGroup>
													</Stack>
													<Divider textAlign="left">
														<Typography variant="caption">Frases tachadas (solo esta lista)</Typography>
													</Divider>
													<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
														{FRASES_TACHABLES.map((f) => (
															<FormControlLabel
																key={f}
																control={
																	<Checkbox
																		size="small"
																		checked={s.frasesTachadas.includes(f)}
																		onChange={(e) =>
																			cambiarSello(activo, (x) => {
																				const frases = e.target.checked
																					? [...x.frasesTachadas, f]
																					: x.frasesTachadas.filter((y) => y !== f);
																				const tachada =
																					frases.includes("procedí a notificarle") || frases.includes("haciéndole entrega de");
																				return { ...x, frasesTachadas: frases, campos: { ...x.campos, entregaTachada: tachada } };
																			})
																		}
																	/>
																}
																label={
																	<Typography
																		variant="body2"
																		sx={{ textDecoration: s.frasesTachadas.includes(f) ? "line-through" : "none" }}
																	>
																		{f}
																	</Typography>
																}
															/>
														))}
													</Box>
													<Divider textAlign="left">
														<Typography variant="caption">Manuscrito: tipear literal, sin corregir</Typography>
													</Divider>
													<Texto
														label="Dijo ser (quién atendió)"
														valor={c.atendio}
														noSeLee={nl("atendio")}
														onChange={(v, n) => campo(activo, "atendio", v, n)}
													/>
													<Texto
														label="Motivo (negativa / devolución)"
														valor={c.motivo}
														noSeLee={nl("motivo")}
														onChange={(v, n) => campo(activo, "motivo", v, n)}
													/>
													<Texto
														label="Observación manuscrita libre"
														valor={c.observacion}
														noSeLee={nl("observacion")}
														multiline
														onChange={(v, n) => campo(activo, "observacion", v, n)}
													/>
													{c.accion === "aviso" && (
														<Stack direction="row" spacing={1}>
															<TextField
																size="small"
																type="date"
																label="Aviso para el día"
																InputLabelProps={{ shrink: true }}
																value={c.avisoPara?.fecha || ""}
																onChange={(e) =>
																	campo(activo, "avisoPara", { fecha: e.target.value || null, hora: c.avisoPara?.hora || null })
																}
															/>
															<TextField
																size="small"
																label="a las"
																placeholder="hh:mm"
																sx={{ width: 100 }}
																value={c.avisoPara?.hora || ""}
																onChange={(e) =>
																	campo(activo, "avisoPara", { fecha: c.avisoPara?.fecha || null, hora: e.target.value || null })
																}
															/>
														</Stack>
													)}
													<TextField
														size="small"
														label="Oficial (sello con el nombre)"
														value={c.oficial || ""}
														onChange={(e) => campo(activo, "oficial", e.target.value || null)}
													/>
												</Stack>
											</Paper>
										);
									})()}

								<Paper variant="outlined" sx={{ p: 1.5 }}>
									<Stack spacing={1}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="body2">Resultado calculado:</Typography>
											<Chip
												size="small"
												color={calculado === "positiva" ? "success" : calculado === "negativa" ? "error" : "default"}
												label={RESULTADOS.find(([k]) => k === calculado)?.[1] || calculado}
											/>
											{caso?.leido && (
												<Tooltip title="Lo que guardó el worker">
													<Typography variant="caption" color="text.secondary">
														(leído: {caso.leido})
													</Typography>
												</Tooltip>
											)}
										</Stack>
										<ToggleButtonGroup
											size="small"
											exclusive
											value={et.resultadoConfirmado ? "si" : "no"}
											onChange={(_, v) =>
												v && setEt({ ...et, resultadoConfirmado: v === "si", resultadoCorrecto: v === "si" ? null : et.resultadoCorrecto })
											}
										>
											<ToggleButton value="si">Coincide</ToggleButton>
											<ToggleButton value="no">No coincide</ToggleButton>
										</ToggleButtonGroup>
										{!et.resultadoConfirmado && (
											<FormControl size="small">
												<InputLabel>Resultado correcto</InputLabel>
												<Select
													label="Resultado correcto"
													value={et.resultadoCorrecto || ""}
													onChange={(e) => setEt({ ...et, resultadoCorrecto: e.target.value as Resultado })}
												>
													{RESULTADOS.map(([k, l]) => (
														<MenuItem key={k} value={k}>
															{l}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										)}
										<TextField
											size="small"
											label="Nota (opcional)"
											multiline
											minRows={2}
											value={et.nota || ""}
											onChange={(e) => setEt({ ...et, nota: e.target.value || null })}
										/>
										<Button
											variant="contained"
											onClick={guardar}
											disabled={guardando || (!et.resultadoConfirmado && !et.resultadoCorrecto)}
										>
											{guardando ? <CircularProgress size={18} /> : "Guardar y siguiente"}
										</Button>
									</Stack>
								</Paper>
							</Stack>
						</Grid>
					</Grid>
				)}
			</Stack>
		</Box>
	);
};

export default RevisionSellosTab;
