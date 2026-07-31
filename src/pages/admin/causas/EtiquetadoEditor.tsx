import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { ArrowLeft, DocumentText, DocumentDownload, TickCircle, Trash, Warning2 } from "iconsax-react";
import EtapaAnotacionesService, {
	AnotacionMovimiento,
	CausaParaAnotar,
	CuerpoOnDemand,
	Decision,
	EstadoAnotacion,
} from "api/etapaAnotaciones";
import { BRAND_BLUE } from "themes/dashboardTokens";
import Autocomplete from "@mui/material/Autocomplete";
import {
	ACTOS_PROCESALES,
	ACTO_AUTOFILL,
	DESTINATARIOS,
	DIM_CHIP_COLOR,
	DIM_LABELS,
	DIMENSIONES_ORDEN,
	DimKey,
} from "./etiquetadoTaxonomia";

// Ruido administrativo que se oculta con el filtro "sin ruido"
const RE_RUIDO = /^(EN LETRA|EN DESPACHO|EN CONFRONTE|SIN DEFINIR|EN SECRETARIA|SACADO DE PARALIZADO|PRESTAMO|EN CAJA FUERTE)/i;
// Movimientos con pinta de resolución (se resaltan en la lista)
const RE_RESOLUCION = /SENTENCIA|RESOLUCION|RESUELVE|FALLO|HOMOLOG|INTERLOCUTOR|DECLARATORIA|DESIERTO|CADUCIDAD|INCOMPETENCIA|ARCHIV/i;

// Heurística de instancia por metadatos/encabezado (sugerencia, no inferencia
// del texto): "LA SALA"/"EL TRIBUNAL" en el encabezado del cuerpo → segunda.
const RE_ORGANO_SEGUNDA = /\b(LA\s+SALA|EL\s+TRIBUNAL|ESTA\s+SALA|CAMARA\s+NACIONAL|C[ÁA]MARA\s+FEDERAL)\b/i;

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
	// Modo de anotación: "libre" (todas las dimensiones) o una dimensión foco
	const [modo, setModo] = useState<"libre" | DimKey>("libre");
	// Cuerpos traídos bajo demanda, por idx de movimiento
	const [cuerposOnDemand, setCuerposOnDemand] = useState<Record<number, CuerpoOnDemand>>({});
	const [trayendoCuerpo, setTrayendoCuerpo] = useState(false);
	const listaRef = useRef<HTMLDivElement | null>(null);

	const cargar = useCallback(async () => {
		if (!fuero || !id) return;
		setLoading(true);
		setError(null);
		try {
			await EtapaAnotacionesService.agregarACola(fuero, id).catch(() => {});
			const d = await EtapaAnotacionesService.getCausa(fuero, id);
			setData(d);
			setAnotaciones((d.anotacion?.anotaciones as Record<string, AnotacionMovimiento>) || {});
			setNotasCausa(d.anotacion?.notasCausa || "");
			setEstado((d.anotacion?.estado as EstadoAnotacion) || "pendiente");
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
			if (cuerposOnDemand[idx]) return { ...cuerposOnDemand[idx], detalle: "", dia: null };
			if (!data) return null;
			const m = data.movimientos.find((x) => x.idx === idx);
			if (!m) return null;
			return (
				data.cuerpos.find((c) => c.dia === m.dia && c.detalle === m.detalle) ||
				data.cuerpos.find((c) => c.dia === m.dia) ||
				null
			);
		},
		[data, cuerposOnDemand],
	);

	const marcarDirty = (k: string) => setDirty((prev) => new Set(prev).add(k));

	const setDim = useCallback(
		(idx: number, dim: DimKey, valor: string, avanzar = false) => {
			const k = String(idx);
			setAnotaciones((prev) => {
				const actual = { ...(prev[k] || {}) };
				(actual as any)[dim] = (actual as any)[dim] === valor ? null : valor;
				return { ...prev, [k]: actual };
			});
			marcarDirty(k);
			if (avanzar) irA(1, idx);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[movimientosVisibles],
	);

	const setCampo = (idx: number, campo: keyof AnotacionMovimiento, valor: any) => {
		const k = String(idx);
		setAnotaciones((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [campo]: valor } }));
		marcarDirty(k);
	};

	// Acto-primero: setea el acto y autocompleta dimensiones VACÍAS con la
	// combinación típica; la instancia se sugiere desde el encabezado del cuerpo.
	const aplicarActo = (idx: number, acto: string | null) => {
		const k = String(idx);
		setAnotaciones((prev) => {
			const actual = { ...(prev[k] || {}) };
			actual.actoProcesal = acto;
			if (acto && ACTO_AUTOFILL[acto]) {
				for (const [dim, valor] of Object.entries(ACTO_AUTOFILL[acto])) {
					if (!(actual as any)[dim]) (actual as any)[dim] = valor;
				}
			}
			if (acto && !actual.instancia) {
				const cuerpo = cuerpoDe(idx);
				actual.instancia = cuerpo && RE_ORGANO_SEGUNDA.test(cuerpo.encabezado || "") ? "segunda_instancia" : "primera_instancia";
			}
			return { ...prev, [k]: actual };
		});
		marcarDirty(k);
	};

	const setDecisiones = (idx: number, decisiones: Decision[]) => {
		setCampo(idx, "decisiones", decisiones);
	};

	const limpiarMovimiento = (idx: number) => {
		const k = String(idx);
		setAnotaciones((prev) => {
			const nuevo = { ...prev };
			delete nuevo[k];
			return nuevo;
		});
		marcarDirty(k);
	};

	// Navegación relativa dentro de la lista visible
	const irA = useCallback(
		(delta: number, desde?: number) => {
			const base = desde !== undefined ? desde : seleccionado;
			if (base === null || !movimientosVisibles.length) return;
			const i = movimientosVisibles.findIndex((m) => m.idx === base);
			const destino = movimientosVisibles[Math.min(Math.max(i + delta, 0), movimientosVisibles.length - 1)];
			if (destino) {
				setSeleccionado(destino.idx);
				// Mantener visible en el scroll
				const el = document.getElementById(`mov-${destino.idx}`);
				if (el && listaRef.current) el.scrollIntoView({ block: "nearest" });
			}
		},
		[seleccionado, movimientosVisibles],
	);

	// Atajos de teclado: ↑/↓ navegan; en modo foco, 1..9 asignan y avanzan; 0 limpia la dimensión
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				e.preventDefault();
				irA(1);
			} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				e.preventDefault();
				irA(-1);
			} else if (modo !== "libre" && seleccionado !== null && /^[0-9]$/.test(e.key)) {
				e.preventDefault();
				const n = parseInt(e.key, 10);
				if (n === 0) {
					setCampoDim(seleccionado, modo, null);
				} else {
					const opcion = DIM_LABELS[modo].opciones[n - 1];
					if (opcion) setDim(seleccionado, modo, opcion[0], true);
				}
			}
		};
		const setCampoDim = (idx: number, dim: DimKey, valor: null) => {
			const k = String(idx);
			setAnotaciones((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [dim]: valor } }));
			marcarDirty(k);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [modo, seleccionado, irA, setDim]);

	const traerCuerpo = async (idx: number) => {
		if (!fuero || !id) return;
		setTrayendoCuerpo(true);
		try {
			const r = await EtapaAnotacionesService.getCuerpo(fuero, id, idx);
			setCuerposOnDemand((prev) => ({ ...prev, [idx]: r.cuerpo }));
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "warning" });
		} finally {
			setTrayendoCuerpo(false);
		}
	};

	const guardar = async (nuevoEstado?: EstadoAnotacion) => {
		if (!fuero || !id) return;
		setGuardando(true);
		try {
			const cambios: Record<string, AnotacionMovimiento | null> = {};
			dirty.forEach((k) => {
				if (/^\d+$/.test(k)) cambios[k] = anotaciones[k] && Object.keys(anotaciones[k]).length ? anotaciones[k] : null;
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

	const limpiarTodo = async () => {
		if (!fuero || !id) return;
		if (!window.confirm("¿Borrar TODAS las anotaciones de esta causa?")) return;
		setGuardando(true);
		try {
			await EtapaAnotacionesService.guardar(fuero, id, { limpiarTodo: true, estado: "pendiente" });
			setAnotaciones({});
			setDirty(new Set());
			setEstado("pendiente");
			enqueueSnackbar("Anotaciones borradas", { variant: "info" });
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
	const anotadosCount = Object.keys(anotaciones).filter((k) => Object.keys(anotaciones[k] || {}).length).length;

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
					<Chip size="small" variant="outlined" label={`${anotadosCount} anotados`} />
					{data.causa.familia && <Chip size="small" variant="outlined" label={`familia: ${data.causa.familia}`} />}
					{!data.cuerposDisponibles && (
						<Tooltip title="Sin conexión a Atlas — cuerpos capturados no disponibles (la descarga directa sigue funcionando)">
							<Warning2 size={18} color={theme.palette.warning.main} />
						</Tooltip>
					)}
				</Stack>
			}
			secondary={
				<Stack direction="row" spacing={1}>
					<Tooltip title="Borrar todas las anotaciones de la causa">
						<span>
							<IconButton size="small" color="error" disabled={guardando} onClick={limpiarTodo}>
								<Trash size={18} />
							</IconButton>
						</span>
					</Tooltip>
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
			<Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
				{data.causa.caratula}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{data.causa.objeto} · Juz. {data.causa.juzgado ?? "—"}
				{data.causa.sala ? ` · Sala ${data.causa.sala}` : ""} · {data.movimientos.length} movimientos · {data.cuerpos.length}{" "}
				cuerpos capturados
			</Typography>

			{/* ── Modo de anotación (foco por dimensión, con atajos) ── */}
			<Card variant="outlined" sx={{ p: 1, mt: 1.5, mb: 1.5, bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.03) }}>
				<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
					<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Modo
					</Typography>
					<ToggleButtonGroup size="small" exclusive value={modo} onChange={(_e, v) => v && setModo(v)}>
						<ToggleButton value="libre" sx={{ py: 0.25, px: 1.25, textTransform: "none", fontSize: "0.74rem" }}>
							Libre
						</ToggleButton>
						{DIMENSIONES_ORDEN.map((d) => (
							<ToggleButton key={d} value={d} sx={{ py: 0.25, px: 1.25, textTransform: "none", fontSize: "0.74rem" }}>
								{DIM_LABELS[d].corto}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Typography variant="caption" color="text.secondary">
						{modo === "libre"
							? "↑/↓ navegan movimientos. Elegí una dimensión para anotar en serie con las teclas 1-9 (0 limpia)."
							: `Anotando "${DIM_LABELS[modo as DimKey].titulo}": teclas 1-${DIM_LABELS[modo as DimKey].opciones.length} asignan y avanzan · 0 limpia · ↑/↓ navegan.`}
					</Typography>
				</Stack>
			</Card>

			<Grid container spacing={2}>
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
						<Box ref={listaRef} sx={{ maxHeight: "64vh", overflowY: "auto" }}>
							{movimientosVisibles.map((m) => {
								const a = anotaciones[String(m.idx)];
								const anotado = !!a && Object.keys(a).length > 0;
								const esEstado = /CAMBIO DE ESTADO/i.test(m.tipo);
								const esResol = !esEstado && RE_RESOLUCION.test(m.detalle);
								const tieneCuerpo = !!cuerpoDe(m.idx);
								const sel = m.idx === seleccionado;
								return (
									<Box
										key={m.idx}
										id={`mov-${m.idx}`}
										onClick={() => setSeleccionado(m.idx)}
										sx={{
											px: 1,
											py: 0.6,
											mb: 0.25,
											borderRadius: 1,
											cursor: "pointer",
											borderLeft: `4px solid ${sel ? BRAND_BLUE : anotado ? theme.palette.success.main : "transparent"}`,
											outline: sel ? `1.5px solid ${alpha(BRAND_BLUE, 0.6)}` : "none",
											bgcolor: sel
												? alpha(BRAND_BLUE, isDark ? 0.2 : 0.1)
												: esResol
													? alpha(theme.palette.warning.main, isDark ? 0.1 : 0.06)
													: esEstado
														? alpha(theme.palette.info.main, isDark ? 0.07 : 0.04)
														: "transparent",
											"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.12 : 0.06) },
										}}
									>
										<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
											<Typography
												variant="caption"
												sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", minWidth: 72 }}
											>
												{m.dia}
											</Typography>
											<Chip size="small" variant="outlined" label={m.tipo.slice(0, 16)} sx={{ height: 17, fontSize: "0.6rem" }} />
											{m.etiquetaDebil && (
												<Tooltip title="Etiqueta débil del motor (v17) — informativa, no es tu anotación">
													<Chip
														size="small"
														variant="outlined"
														color="info"
														label={`⚙ ${m.etiquetaDebil}`}
														sx={{ height: 17, fontSize: "0.6rem" }}
													/>
												</Tooltip>
											)}
											{m.corpus?.pdf === "downloaded" && (
												<Tooltip title="PDF espejado en S3 (pjn-movements)">
													<Chip size="small" label="PDF" color="success" variant="outlined" sx={{ height: 16, fontSize: "0.56rem" }} />
												</Tooltip>
											)}
											{(m.corpus?.texto === "extracted" || m.corpus?.texto === "ocr_done") && (
												<Tooltip title="Texto extraído (pjn-movement-texts)">
													<Chip size="small" label="TXT" color="success" sx={{ height: 16, fontSize: "0.56rem" }} />
												</Tooltip>
											)}
											{m.corpus?.texto === "needs_ocr" && (
												<Tooltip title="PDF escaneado — en cola de OCR">
													<Chip size="small" label="OCR" color="warning" variant="outlined" sx={{ height: 16, fontSize: "0.56rem" }} />
												</Tooltip>
											)}
											{tieneCuerpo && !m.corpus?.texto && <DocumentText size={13} color={theme.palette.success.main} />}
											{m.url && !tieneCuerpo && !m.corpus?.pdf && (
												<DocumentDownload size={13} color={theme.palette.text.disabled} />
											)}
										</Stack>
										<Typography variant="caption" sx={{ display: "block", lineHeight: 1.3, fontWeight: esResol ? 600 : 400 }}>
											{m.detalle.slice(0, 110)}
										</Typography>
										{anotado && (
											<Stack direction="row" spacing={0.4} sx={{ mt: 0.25 }} flexWrap="wrap" useFlexGap>
												{(["actoProcesal", ...DIMENSIONES_ORDEN, "modoTerminacion"] as string[])
													.filter((d) => (a as any)[d])
													.map((d) => (
														<Chip
															key={d}
															size="small"
															color={DIM_CHIP_COLOR[d] || "default"}
															label={(a as any)[d]}
															sx={{ height: 16, fontSize: "0.58rem" }}
														/>
													))}
												{a.descartar && <Chip size="small" color="error" label="descartar" sx={{ height: 16, fontSize: "0.58rem" }} />}
											</Stack>
										)}
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
							<Card
								variant="outlined"
								sx={{ p: 2, borderLeft: `4px solid ${BRAND_BLUE}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.05 : 0.02) }}
							>
								<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
									<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
										#{mSel.idx} · {mSel.dia} · {mSel.tipo}
									</Typography>
									{mSel.etiquetaDebil && (
										<Tooltip title="Etiqueta débil del motor (informativa)">
											<Chip size="small" variant="outlined" color="info" label={`⚙ ${mSel.etiquetaDebil}`} />
										</Tooltip>
									)}
									<Box sx={{ flex: 1 }} />
									<Tooltip title="Limpiar anotaciones de este movimiento">
										<span>
											<IconButton
												size="small"
												color="error"
												disabled={!Object.keys(aSel).length}
												onClick={() => limpiarMovimiento(mSel.idx)}
											>
												<Trash size={15} />
											</IconButton>
										</span>
									</Tooltip>
								</Stack>
								<Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, mb: 1.5, lineHeight: 1.35 }}>
									{mSel.detalle}
								</Typography>

								{/* Acto-primero: elegir el acto autocompleta las demás dimensiones (solo vacías) */}
								{modo === "libre" && (
									<Box sx={{ mb: 1.5 }}>
										<Typography
											variant="caption"
											fontWeight={700}
											sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "primary.main" }}
										>
											Acto procesal (autocompleta el resto)
										</Typography>
										<Autocomplete
											size="small"
											options={ACTOS_PROCESALES.map(([v]) => v)}
											getOptionLabel={(v) => ACTOS_PROCESALES.find(([x]) => x === v)?.[1] || v}
											value={aSel.actoProcesal || null}
											onChange={(_e, v) => aplicarActo(mSel.idx, v)}
											renderInput={(params) => <TextField {...params} placeholder="Buscar acto… (corre traslado, homologa, resuelve fondo…)" />}
											sx={{ mt: 0.5, maxWidth: 460 }}
										/>
									</Box>
								)}
								{(modo === "libre"
									? ([...DIMENSIONES_ORDEN, ...(aSel.funcion === "terminacion" ? (["modoTerminacion"] as DimKey[]) : []), "estadoImpugnatorio"] as DimKey[])
									: [modo as DimKey]
								).map((dim) => (
									<Box key={dim} sx={{ mb: 1.25 }}>
										<Typography
											variant="caption"
											fontWeight={700}
											sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: `${DIM_CHIP_COLOR[dim]}.main` }}
										>
											{DIM_LABELS[dim].titulo}
										</Typography>
										<Box>
											<ToggleButtonGroup size="small" exclusive value={(aSel as any)[dim] || null} sx={{ flexWrap: "wrap" }}>
												{DIM_LABELS[dim].opciones.map(([valor, label], oi) => (
													<ToggleButton
														key={valor}
														value={valor}
														onClick={() => setDim(mSel.idx, dim, valor, modo !== "libre")}
														sx={{
															py: modo === "libre" ? 0.25 : 0.75,
															px: modo === "libre" ? 1 : 1.75,
															fontSize: modo === "libre" ? "0.72rem" : "0.85rem",
															textTransform: "none",
														}}
													>
														{modo !== "libre" && (
															<Typography
																component="span"
																variant="caption"
																sx={{ mr: 0.6, opacity: 0.55, fontVariantNumeric: "tabular-nums" }}
															>
																{oi + 1}
															</Typography>
														)}
														{label}
													</ToggleButton>
												))}
											</ToggleButtonGroup>
										</Box>
									</Box>
								))}

								{/* Decisiones múltiples: una fila por disposición de la parte resolutiva */}
								{modo === "libre" && (
									<Box sx={{ mb: 1.25 }}>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
												Decisiones (una por disposición)
											</Typography>
											<Button
												size="small"
												variant="text"
												sx={{ py: 0, minWidth: 0 }}
												onClick={() => setDecisiones(mSel.idx, [...(aSel.decisiones || []), { objetoDecidido: "", resultado: null }])}
											>
												+ agregar
											</Button>
										</Stack>
										{(aSel.decisiones || []).map((dec, di) => (
											<Stack key={di} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
												<TextField
													size="small"
													placeholder="objeto decidido (ej. recurso_apelacion, costas)"
													value={dec.objetoDecidido}
													onChange={(e) => {
														const nuevas = [...(aSel.decisiones || [])];
														nuevas[di] = { ...nuevas[di], objetoDecidido: e.target.value };
														setDecisiones(mSel.idx, nuevas);
													}}
													sx={{ flex: 1, maxWidth: 320 }}
												/>
												<Select
													size="small"
													displayEmpty
													value={dec.resultado || ""}
													onChange={(e) => {
														const nuevas = [...(aSel.decisiones || [])];
														nuevas[di] = { ...nuevas[di], resultado: e.target.value || null };
														setDecisiones(mSel.idx, nuevas);
													}}
													renderValue={(v) =>
														v ? DIM_LABELS.resultado.opciones.find(([x]) => x === v)?.[1] || v : (
															<Typography variant="caption" color="text.secondary">resultado…</Typography>
														)
													}
													sx={{ minWidth: 170 }}
												>
													{DIM_LABELS.resultado.opciones.map(([v, l]) => (
														<MenuItem key={v} value={v}>{l}</MenuItem>
													))}
												</Select>
												<IconButton
													size="small"
													color="error"
													onClick={() => setDecisiones(mSel.idx, (aSel.decisiones || []).filter((_x, i) => i !== di))}
												>
													<Trash size={14} />
												</IconButton>
											</Stack>
										))}
									</Box>
								)}

								{/* Bloque opcional: acto completo (destinatario, acción, plazo, apercibimiento) */}
								{modo === "libre" && (
									<details style={{ marginBottom: 12 }}>
										<summary style={{ cursor: "pointer", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: 0.5, color: "var(--mui-palette-text-secondary, #888)", fontWeight: 700 }}>
											Acto completo (destinatario · acción · plazo · apercibimiento)
										</summary>
										<Grid container spacing={1.5} sx={{ mt: 0.25 }}>
											<Grid item xs={12} sm={5}>
												<Autocomplete
													multiple
													size="small"
													options={DESTINATARIOS.map(([v]) => v)}
													getOptionLabel={(v) => DESTINATARIOS.find(([x]) => x === v)?.[1] || v}
													value={aSel.destinatario || []}
													onChange={(_e, v) => setCampo(mSel.idx, "destinatario", v)}
													renderInput={(params) => <TextField {...params} label="Destinatario/s" />}
												/>
											</Grid>
											<Grid item xs={12} sm={7}>
												<TextField
													fullWidth
													size="small"
													label="Acción requerida"
													placeholder="contestar_traslado, impugnar_pericia, acompañar_documental…"
													value={aSel.accionRequerida || ""}
													onChange={(e) => setCampo(mSel.idx, "accionRequerida", e.target.value)}
												/>
											</Grid>
											<Grid item xs={4} sm={2}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Plazo"
													value={aSel.plazo?.cantidad ?? ""}
													onChange={(e) =>
														setCampo(mSel.idx, "plazo", e.target.value === ""
															? null
															: { cantidad: parseInt(e.target.value, 10), unidad: aSel.plazo?.unidad || "dias", tipo: aSel.plazo?.tipo || "procesales" })
													}
												/>
											</Grid>
											<Grid item xs={4} sm={2}>
												<Select
													fullWidth
													size="small"
													value={aSel.plazo?.unidad || "dias"}
													onChange={(e) => aSel.plazo && setCampo(mSel.idx, "plazo", { ...aSel.plazo, unidad: e.target.value as any })}
												>
													<MenuItem value="dias">días</MenuItem>
													<MenuItem value="horas">horas</MenuItem>
													<MenuItem value="meses">meses</MenuItem>
												</Select>
											</Grid>
											<Grid item xs={4} sm={2}>
												<Select
													fullWidth
													size="small"
													value={aSel.plazo?.tipo || "procesales"}
													onChange={(e) => aSel.plazo && setCampo(mSel.idx, "plazo", { ...aSel.plazo, tipo: e.target.value as any })}
												>
													<MenuItem value="procesales">procesales</MenuItem>
													<MenuItem value="corridos">corridos</MenuItem>
												</Select>
											</Grid>
											<Grid item xs={12} sm={6}>
												<TextField
													fullWidth
													size="small"
													label="Apercibimiento"
													value={aSel.apercibimiento || ""}
													onChange={(e) => setCampo(mSel.idx, "apercibimiento", e.target.value)}
												/>
											</Grid>
										</Grid>
									</details>
								)}

								{modo === "libre" && (
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
												onChange={(e) =>
													setCampo(mSel.idx, "replicaDe", e.target.value === "" ? null : parseInt(e.target.value, 10))
												}
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
													const desde = e.target.value as string;
													if (desde !== "") {
														const src = anotaciones[desde];
														if (src) {
															setAnotaciones((prev) => ({ ...prev, [String(mSel.idx)]: { ...src, notas: "" } }));
															marcarDirty(String(mSel.idx));
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
								)}
							</Card>

							{/* ── Cuerpo del documento ── */}
							{cuerpoSel ? (
								<Card variant="outlined" sx={{ p: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
										<DocumentText size={16} color={theme.palette.success.main} />
										<Typography variant="subtitle2">
											Cuerpo · {cuerpoSel.caracteres.toLocaleString("es-AR")} caracteres
											{"detalle" in cuerpoSel && cuerpoSel.detalle && cuerpoSel.detalle !== mSel.detalle
												? ` · doc del mismo día: "${(cuerpoSel as any).detalle.slice(0, 50)}"`
												: ""}
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
											fontSize: "0.78rem",
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
							) : mSel.url ? (
								<Card variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Button
										variant="outlined"
										size="small"
										startIcon={trayendoCuerpo ? <CircularProgress size={14} /> : <DocumentDownload size={16} />}
										disabled={trayendoCuerpo}
										onClick={() => traerCuerpo(mSel.idx)}
									>
										Traer documento del PJN
									</Button>
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
										El movimiento tiene documento asociado — se descarga del viewer y se segmenta al momento.
									</Typography>
								</Card>
							) : (
								<Alert severity="info" variant="outlined">
									Este movimiento no tiene documento asociado (solo título).
								</Alert>
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
								marcarDirty("__notas__");
							}}
							placeholder="Observaciones generales, criterios aplicados, dudas para verificación…"
						/>
					</Card>
					<Divider sx={{ my: 2 }} />
					<Stack direction="row" spacing={1} justifyContent="flex-end">
						<Button size="small" color="error" variant="text" disabled={guardando} onClick={limpiarTodo}>
							Limpiar todo
						</Button>
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
