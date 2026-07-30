import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	Box,
	Card,
	Typography,
	Chip,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
	TextField,
	Button,
	ToggleButton,
	ToggleButtonGroup,
	Switch,
	FormControlLabel,
	Select,
	MenuItem,
	Divider,
	useTheme,
	alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { ArrowLeft, DocumentText, TickCircle, Warning2 } from "iconsax-react";
import EtapaAnotacionesService, { AnotacionMovimiento, CausaParaAnotar, EstadoAnotacion } from "api/etapaAnotaciones";
import { BRAND_BLUE } from "themes/dashboardTokens";

// Ruido administrativo que se oculta con el filtro "solo relevantes"
const RE_RUIDO = /^(EN LETRA|EN DESPACHO|EN CONFRONTE|SIN DEFINIR|EN SECRETARIA|SACADO DE PARALIZADO|PRESTAMO|EN CAJA FUERTE)/i;

const DIM_LABELS: Record<string, { titulo: string; opciones: Record<string, string> }> = {
	tipoResolucion: {
		titulo: "Tipo de resolución",
		opciones: {
			providencia: "Providencia",
			interlocutoria: "Interlocutoria",
			definitiva: "Definitiva",
			no_resolucion: "No es resolución",
		},
	},
	instancia: {
		titulo: "Instancia",
		opciones: { primera: "Primera", segunda: "Cámara", csjn: "CSJN" },
	},
	objetoResolucion: {
		titulo: "Objeto",
		opciones: {
			fondo: "Fondo",
			incidental: "Incidental",
			honorarios: "Honorarios",
			ejecucion: "Ejecución",
			terminacion: "Terminación",
			impulso: "Impulso",
		},
	},
	modoTerminacion: {
		titulo: "Modo de terminación",
		opciones: {
			firmeza: "Firmeza",
			allanamiento: "Allanamiento",
			desistimiento: "Desistimiento",
			conciliacion: "Conciliación",
			caducidad: "Caducidad",
			otro: "Otro",
		},
	},
	resultado: {
		titulo: "Resultado",
		opciones: {
			hace_lugar: "Hace lugar",
			rechaza: "Rechaza",
			parcial: "Parcial",
			confirma: "Confirma",
			revoca: "Revoca",
			desierto: "Desierto",
			concede: "Concede",
			deniega: "Deniega",
			homologa: "Homologa",
			otro: "Otro",
		},
	},
};

const ESTADO_COLOR: Record<EstadoAnotacion, "default" | "warning" | "info" | "success" | "error"> = {
	pendiente: "default",
	en_progreso: "warning",
	anotada: "info",
	verificada: "success",
	descartada: "error",
};

const EtiquetadoEditor = () => {
	const { fuero, id } = useParams<{ fuero: string; id: string }>();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	const [data, setData] = useState<CausaParaAnotar | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [anotaciones, setAnotaciones] = useState<Record<string, AnotacionMovimiento>>({});
	const [dirty, setDirty] = useState<Set<string>>(new Set());
	const [seleccionado, setSeleccionado] = useState<number | null>(null);
	const [soloRelevantes, setSoloRelevantes] = useState(true);
	const [notasCausa, setNotasCausa] = useState("");
	const [estado, setEstado] = useState<EstadoAnotacion>("pendiente");
	const [guardando, setGuardando] = useState(false);

	const cargar = useCallback(async () => {
		if (!fuero || !id) return;
		setLoading(true);
		setError(null);
		try {
			// Alta idempotente en cola (para causas abiertas directo desde verified)
			await EtapaAnotacionesService.agregarACola(fuero, id).catch(() => {});
			const d = await EtapaAnotacionesService.getCausa(fuero, id);
			setData(d);
			setAnotaciones((d.anotacion?.anotaciones as Record<string, AnotacionMovimiento>) || {});
			setNotasCausa(d.anotacion?.notasCausa || "");
			setEstado((d.anotacion?.estado as EstadoAnotacion) || "pendiente");
			// Selecciona el primer movimiento con etiqueta débil
			const primero = d.movimientos.find((m) => m.etiquetaDebil);
			setSeleccionado(primero ? primero.idx : d.movimientos.length ? d.movimientos[0].idx : null);
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message);
		} finally {
			setLoading(false);
		}
	}, [fuero, id]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const movimientosVisibles = useMemo(() => {
		if (!data) return [];
		const ms = [...data.movimientos].sort((a, b) => (a.dia || "").localeCompare(b.dia || "") || a.idx - b.idx);
		return soloRelevantes ? ms.filter((m) => !RE_RUIDO.test(m.detalle) || anotaciones[String(m.idx)]) : ms;
	}, [data, soloRelevantes, anotaciones]);

	const cuerpoDe = useCallback(
		(idx: number) => {
			if (!data) return null;
			const m = data.movimientos.find((x) => x.idx === idx);
			if (!m) return null;
			return (
				data.cuerpos.find((c) => c.dia === m.dia && c.detalle === m.detalle) ||
				data.cuerpos.find((c) => c.dia === m.dia) ||
				null
			);
		},
		[data],
	);

	const setDim = (idx: number, dim: keyof AnotacionMovimiento, valor: any) => {
		const k = String(idx);
		setAnotaciones((prev) => {
			const actual = { ...(prev[k] || {}) };
			// Toggle: click sobre el valor activo lo desmarca
			(actual as any)[dim] = (actual as any)[dim] === valor ? null : valor;
			return { ...prev, [k]: actual };
		});
		setDirty((prev) => new Set(prev).add(k));
	};

	const setCampo = (idx: number, campo: keyof AnotacionMovimiento, valor: any) => {
		const k = String(idx);
		setAnotaciones((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [campo]: valor } }));
		setDirty((prev) => new Set(prev).add(k));
	};

	const guardar = async (nuevoEstado?: EstadoAnotacion) => {
		if (!fuero || !id) return;
		setGuardando(true);
		try {
			const cambios: Record<string, AnotacionMovimiento> = {};
			dirty.forEach((k) => {
				if (/^\d+$/.test(k) && anotaciones[k]) cambios[k] = anotaciones[k];
			});
			await EtapaAnotacionesService.guardar(fuero, id, {
				anotaciones: cambios,
				notasCausa,
				estado: nuevoEstado || estado,
			});
			if (nuevoEstado) setEstado(nuevoEstado);
			setDirty(new Set());
			enqueueSnackbar("Anotaciones guardadas", { variant: "success" });
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	if (loading)
		return (
			<MainCard title="Etiquetado de dataset">
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			</MainCard>
		);
	if (error || !data)
		return (
			<MainCard title="Etiquetado de dataset">
				<Alert severity="error">{error || "Sin datos"}</Alert>
			</MainCard>
		);

	const mSel = seleccionado !== null ? data.movimientos.find((m) => m.idx === seleccionado) : null;
	const aSel: AnotacionMovimiento = seleccionado !== null ? anotaciones[String(seleccionado)] || {} : {};
	const cuerpoSel = seleccionado !== null ? cuerpoDe(seleccionado) : null;

	return (
		<MainCard
			title={
				<Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
					<IconButton size="small" onClick={() => navigate("/admin/causas/etiquetado")}>
						<ArrowLeft size={18} />
					</IconButton>
					<Typography variant="h5">
						{data.causa.fuero} {data.causa.number}/{data.causa.year}
					</Typography>
					<Chip size="small" label={estado} color={ESTADO_COLOR[estado]} />
					{data.causa.familia && <Chip size="small" variant="outlined" label={`familia: ${data.causa.familia}`} />}
					{data.causa.etapaActual && <Chip size="small" variant="outlined" label={`etapa: ${data.causa.etapaActual}`} />}
					{!data.cuerposDisponibles && (
						<Tooltip title="Sin conexión a Atlas — cuerpos no disponibles">
							<Warning2 size={18} color={theme.palette.warning.main} />
						</Tooltip>
					)}
				</Stack>
			}
			secondary={
				<Stack direction="row" spacing={1}>
					<Button size="small" variant="outlined" disabled={guardando || dirty.size === 0} onClick={() => guardar()}>
						Guardar {dirty.size > 0 ? `(${dirty.size})` : ""}
					</Button>
					<Button
						size="small"
						variant="contained"
						color="success"
						startIcon={<TickCircle size={16} />}
						disabled={guardando}
						onClick={() => guardar("anotada")}
					>
						Guardar y marcar anotada
					</Button>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
				{data.causa.caratula}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{data.causa.objeto} · Juz. {data.causa.juzgado ?? "—"}
				{data.causa.sala ? ` · Sala ${data.causa.sala}` : ""} · {data.movimientos.length} movimientos ·{" "}
				{data.cuerpos.length} cuerpos capturados
			</Typography>

			<Grid container spacing={2} sx={{ mt: 0.5 }}>
				{/* ── Columna izquierda: movimientos ── */}
				<Grid item xs={12} md={5} lg={4}>
					<Card variant="outlined" sx={{ p: 1 }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, pb: 0.5 }}>
							<Typography variant="subtitle2">Movimientos ({movimientosVisibles.length})</Typography>
							<FormControlLabel
								control={<Switch size="small" checked={soloRelevantes} onChange={(e) => setSoloRelevantes(e.target.checked)} />}
								label={<Typography variant="caption">sin ruido</Typography>}
							/>
						</Stack>
						<Box sx={{ maxHeight: "68vh", overflowY: "auto" }}>
							{movimientosVisibles.map((m) => {
								const anotado = !!anotaciones[String(m.idx)] && Object.keys(anotaciones[String(m.idx)]).length > 0;
								const esEstado = /CAMBIO DE ESTADO/i.test(m.tipo);
								const tieneCuerpo = !!cuerpoDe(m.idx);
								return (
									<Box
										key={m.idx}
										onClick={() => setSeleccionado(m.idx)}
										sx={{
											px: 1,
											py: 0.6,
											mb: 0.25,
											borderRadius: 1,
											cursor: "pointer",
											borderLeft: `3px solid ${
												m.idx === seleccionado ? BRAND_BLUE : anotado ? theme.palette.success.main : "transparent"
											}`,
											bgcolor:
												m.idx === seleccionado
													? alpha(BRAND_BLUE, isDark ? 0.16 : 0.08)
													: esEstado
														? alpha(theme.palette.info.main, isDark ? 0.08 : 0.04)
														: "transparent",
											"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.1 : 0.05) },
										}}
									>
										<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
											<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", minWidth: 74 }}>
												{m.dia}
											</Typography>
											<Chip size="small" variant="outlined" label={m.tipo.slice(0, 18)} sx={{ height: 18, fontSize: "0.62rem" }} />
											{m.etiquetaDebil && (
												<Chip size="small" color="info" label={m.etiquetaDebil} sx={{ height: 18, fontSize: "0.62rem" }} />
											)}
											{tieneCuerpo && <DocumentText size={13} color={theme.palette.success.main} />}
											{anotado && <TickCircle size={13} color={theme.palette.success.main} variant="Bold" />}
										</Stack>
										<Typography variant="caption" sx={{ display: "block", lineHeight: 1.3 }}>
											{m.detalle.slice(0, 110)}
										</Typography>
									</Box>
								);
							})}
						</Box>
					</Card>
				</Grid>

				{/* ── Columna derecha: anotación + cuerpo ── */}
				<Grid item xs={12} md={7} lg={8}>
					{mSel ? (
						<Stack spacing={2}>
							<Card variant="outlined" sx={{ p: 2 }}>
								<Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
									<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
										#{mSel.idx} · {mSel.dia} · {mSel.tipo}
									</Typography>
									{mSel.etiquetaDebil && <Chip size="small" color="info" label={`etiqueta débil: ${mSel.etiquetaDebil}`} />}
								</Stack>
								<Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, mb: 1.5 }}>
									{mSel.detalle}
								</Typography>

								{Object.entries(DIM_LABELS).map(([dim, cfg]) => (
									<Box key={dim} sx={{ mb: 1.25 }}>
										<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
											{cfg.titulo}
										</Typography>
										<Box>
											<ToggleButtonGroup size="small" exclusive value={(aSel as any)[dim] || null} sx={{ flexWrap: "wrap" }}>
												{Object.entries(cfg.opciones).map(([valor, label]) => (
													<ToggleButton
														key={valor}
														value={valor}
														onClick={() => setDim(mSel.idx, dim as keyof AnotacionMovimiento, valor)}
														sx={{ py: 0.25, px: 1, fontSize: "0.72rem", textTransform: "none" }}
													>
														{label}
													</ToggleButton>
												))}
											</ToggleButtonGroup>
										</Box>
									</Box>
								))}

								<Grid container spacing={1.5} sx={{ mt: 0.25 }}>
									<Grid item xs={12} sm={4}>
										<TextField
											fullWidth
											size="small"
											label="Etiqueta final (etapa/hito)"
											value={aSel.etiqueta || ""}
											onChange={(e) => setCampo(mSel.idx, "etiqueta", e.target.value)}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="Réplica de #"
											value={aSel.replicaDe ?? ""}
											onChange={(e) => setCampo(mSel.idx, "replicaDe", e.target.value === "" ? null : parseInt(e.target.value, 10))}
										/>
									</Grid>
									<Grid item xs={6} sm={2}>
										<FormControlLabel
											control={
												<Switch
													size="small"
													checked={!!aSel.descartar}
													onChange={(e) => setCampo(mSel.idx, "descartar", e.target.checked)}
												/>
											}
											label={<Typography variant="caption">Descartar</Typography>}
										/>
									</Grid>
									<Grid item xs={12} sm={3}>
										<Select
											fullWidth
											size="small"
											displayEmpty
											value=""
											onChange={(e) => {
												// Preset rápido: copia la anotación de otro movimiento anotado
												const desde = e.target.value as string;
												if (desde !== "") {
													const src = anotaciones[desde];
													if (src) {
														setAnotaciones((prev) => ({ ...prev, [String(mSel.idx)]: { ...src, notas: "" } }));
														setDirty((prev) => new Set(prev).add(String(mSel.idx)));
													}
												}
											}}
											renderValue={() => (
												<Typography variant="caption" color="text.secondary">
													Copiar de…
												</Typography>
											)}
										>
											{Object.keys(anotaciones)
												.filter((k) => k !== String(mSel.idx) && Object.keys(anotaciones[k]).length)
												.map((k) => (
													<MenuItem key={k} value={k}>
														#{k}
													</MenuItem>
												))}
										</Select>
									</Grid>
									<Grid item xs={12}>
										<TextField
											fullWidth
											size="small"
											multiline
											minRows={1}
											label="Notas del movimiento"
											value={aSel.notas || ""}
											onChange={(e) => setCampo(mSel.idx, "notas", e.target.value)}
										/>
									</Grid>
								</Grid>
							</Card>

							{cuerpoSel && (
								<Card variant="outlined" sx={{ p: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
										<DocumentText size={16} color={theme.palette.success.main} />
										<Typography variant="subtitle2">
											Cuerpo capturado · {cuerpoSel.caracteres.toLocaleString("es-AR")} caracteres
											{cuerpoSel.detalle !== mSel.detalle ? ` · doc del mismo día: "${cuerpoSel.detalle.slice(0, 50)}"` : ""}
										</Typography>
									</Stack>
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
										Encabezado
									</Typography>
									<Box
										sx={{
											fontFamily: "monospace",
											fontSize: "0.74rem",
											whiteSpace: "pre-wrap",
											bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.04),
											p: 1.25,
											borderRadius: 1,
											mb: 1.25,
										}}
									>
										{cuerpoSel.encabezado}
									</Box>
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
										{cuerpoSel.tieneDispositiva ? "Parte dispositiva" : "Final del documento (dispositiva no detectada)"}
									</Typography>
									<Box
										sx={{
											fontFamily: "monospace",
											fontSize: "0.74rem",
											whiteSpace: "pre-wrap",
											bgcolor: alpha(theme.palette.success.main, isDark ? 0.1 : 0.05),
											borderLeft: `3px solid ${theme.palette.success.main}`,
											p: 1.25,
											borderRadius: 1,
										}}
									>
										{cuerpoSel.tieneDispositiva ? cuerpoSel.dispositiva : cuerpoSel.colaTexto}
									</Box>
								</Card>
							)}
						</Stack>
					) : (
						<Alert severity="info">Seleccioná un movimiento de la lista.</Alert>
					)}

					<Card variant="outlined" sx={{ p: 2, mt: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Notas de la causa
						</Typography>
						<TextField
							fullWidth
							size="small"
							multiline
							minRows={2}
							value={notasCausa}
							onChange={(e) => {
								setNotasCausa(e.target.value);
								setDirty((prev) => new Set(prev).add("__notas__"));
							}}
							placeholder="Observaciones generales, criterios aplicados, dudas para verificación…"
						/>
					</Card>
					<Divider sx={{ my: 2 }} />
					<Stack direction="row" spacing={1} justifyContent="flex-end">
						<Button size="small" variant="outlined" disabled={guardando || dirty.size === 0} onClick={() => guardar()}>
							Guardar {dirty.size > 0 ? `(${dirty.size})` : ""}
						</Button>
						<Button size="small" variant="contained" color="success" disabled={guardando} onClick={() => guardar("anotada")}>
							Guardar y marcar anotada
						</Button>
					</Stack>
				</Grid>
			</Grid>
		</MainCard>
	);
};

export default EtiquetadoEditor;
