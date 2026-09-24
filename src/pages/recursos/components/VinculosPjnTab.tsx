import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	FormControlLabel,
	Grid,
	InputLabel,
	Link,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import {
	ArrowDown2,
	ArrowUp2,
	CloseCircle,
	DocumentText,
	Eye,
	Refresh,
	Refresh2,
	SearchNormal1,
	TickCircle,
	Warning2,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	CandidatoCausa,
	DetalleVinculo,
	EstadoVinculo,
	ResumenVinculos,
	VeredictoVinculo,
	Vinculo,
	buscarCausaParaVinculo,
	confirmarVinculo,
	escanearVinculos,
	ignorarVinculo,
	listarVinculos,
	obtenerDetalleVinculo,
	obtenerResumenVinculos,
	reabrirVinculo,
	reasignarVinculo,
	reevaluarVinculo,
	rechazarVinculo,
} from "api/eldialVinculos";

/**
 * Pestaña "Vínculos PJN" de /recursos/jurisprudencia.
 *
 * Cola de revisión de los apareos entre fallos de El Dial y nuestras causas PJN
 * (colección `eldial-vinculos`, API legal). Lo claro queda aceptado solo ("auto");
 * acá se resuelve lo dudoso: causas sin datos, carátulas distintas, fallos sin
 * candidato. Ninguna acción escribe en las causas todavía.
 */

const FUEROS_PJN = [
	"CIV",
	"COM",
	"CNT",
	"CSS",
	"CAF",
	"CCF",
	"CCC",
	"CFP",
	"CPE",
	"CNE",
	"CSJ",
	"FBB",
	"FCB",
	"FCR",
	"FCT",
	"FGR",
	"FLP",
	"FMP",
	"FMZ",
	"FPA",
	"FPO",
	"FRE",
	"FRO",
	"FSA",
	"FSM",
	"FTU",
];

const ESTADOS: Record<
	EstadoVinculo,
	{ label: string; color: "default" | "primary" | "success" | "warning" | "error" | "info"; ayuda: string }
> = {
	pendiente: { label: "Pendiente", color: "warning", ayuda: "Requiere que una persona decida" },
	auto: { label: "Automático", color: "info", ayuda: "Match claro aceptado por el sistema; se puede revisar" },
	sin_candidato: { label: "Sin candidato", color: "default", ayuda: "No hay causa con ese número/año; se puede asignar a mano" },
	confirmado: { label: "Confirmado", color: "success", ayuda: "Una persona confirmó el candidato" },
	reasignado: { label: "Reasignado", color: "primary", ayuda: "Una persona eligió otra causa" },
	rechazado: { label: "Rechazado", color: "error", ayuda: "Ninguna causa corresponde" },
	ignorado: { label: "Ignorado", color: "default", ayuda: "Fuera de alcance" },
};

const VEREDICTOS: Record<VeredictoVinculo, { label: string; color: "default" | "success" | "warning" | "error" | "info"; ayuda: string }> =
	{
		"match-fuerte": { label: "Coincide", color: "success", ayuda: "Mismo fuero, número y año, y la carátula coincide" },
		"match-fuerte-iniciales": {
			label: "Coincide (iniciales)",
			color: "success",
			ayuda: "El Dial anonimizó la carátula; el objeto y las iniciales son compatibles",
		},
		"match-numero-causa-sin-datos": {
			label: "Causa sin datos",
			color: "info",
			ayuda: "La causa existe pero tiene carátula N/A o ERROR: El Dial aporta lo que el portal no dio",
		},
		"match-parcial": { label: "Parcial", color: "warning", ayuda: "La carátula se parece pero no alcanza el umbral" },
		"match-numero-caratula-distinta": {
			label: "Carátula distinta",
			color: "error",
			ayuda: "Mismo número y año, pero las carátulas no tienen relación",
		},
		"match-numero-sin-caratula-comparable": { label: "Sin carátula", color: "default", ayuda: "No hay carátula para comparar" },
		"sin-candidato": { label: "No está en la base", color: "default", ayuda: "No hay causa con ese fuero, número y año" },
		"sin-clave": { label: "Sin nº/año", color: "default", ayuda: "No se pudo leer número y año del título del fallo" },
		"sin-fuero": { label: "Sin fuero", color: "default", ayuda: "El fallo no tiene fuero PJN asignado" },
	};

const colorScore = (s?: number | null) => {
	if (s === null || s === undefined) return "default" as const;
	if (s >= 0.5) return "success" as const;
	if (s >= 0.25) return "warning" as const;
	return "error" as const;
};

const fecha = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-AR") : "—");
const fechaHora = (d?: string | null) => (d ? new Date(d).toLocaleString("es-AR") : "—");
const expediente = (v: Pick<Vinculo, "fueroPjn" | "numeroCausa" | "anio">) =>
	v.numeroCausa ? `${v.fueroPjn} ${v.numeroCausa}${v.anio ? `/${v.anio}` : ""}` : v.fueroPjn;

const errorMsg = (e: any, def: string) => e?.response?.data?.message || def;

// ── Tarjeta de una causa candidata ─────────────────────────────────────────────

interface TarjetaCausaProps {
	c: CandidatoCausa;
	elegida?: boolean;
	accion?: { label: string; onClick: () => void; disabled?: boolean };
}

const TarjetaCausa = ({ c, elegida, accion }: TarjetaCausaProps) => {
	const theme = useTheme();
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
				borderColor: elegida ? theme.palette.success.main : undefined,
				bgcolor: elegida ? alpha(theme.palette.success.main, 0.05) : undefined,
			}}
		>
			<Stack spacing={0.75}>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Typography variant="subtitle2">
						{c.codigo} {c.number}/{c.year}
						{c.incidente ? ` · incidente ${c.incidente}` : ""}
					</Typography>
					{!c.sinDatos && (
						<Tooltip title="Similitud de carátula (0 a 1)">
							<Chip size="small" color={colorScore(c.score)} label={`score ${c.score.toFixed(2)}`} />
						</Tooltip>
					)}
					{c.inicialesOk && (
						<Tooltip title="Las iniciales de El Dial son compatibles con los nombres de la causa y el objeto coincide">
							<Chip size="small" color="success" variant="outlined" label="iniciales OK" />
						</Tooltip>
					)}
					{c.sinDatos && <Chip size="small" color="info" label="sin datos" />}
					{elegida && <Chip size="small" color="success" icon={<TickCircle size={14} />} label="elegida" />}
				</Stack>
				<Typography variant="body2" sx={{ fontWeight: 500 }}>
					{c.caratula || <em>{c.caratulaRaw || "(sin carátula)"}</em>}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					{[
						c.objeto && `Objeto: ${c.objeto}`,
						c.juzgado ? `Juzgado ${c.juzgado}` : null,
						c.secretaria ? `Sec. ${c.secretaria}` : null,
						c.sala ? `Sala ${c.sala}` : null,
						`Estado: ${c.estado}`,
						c.lastUpdate ? `Actualizada ${fecha(c.lastUpdate)}` : null,
					]
						.filter(Boolean)
						.join(" · ")}
				</Typography>
				<Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
					{c.coleccion} · {c.causaId}
				</Typography>
				{accion && (
					<Box>
						<Button
							size="small"
							variant="contained"
							onClick={accion.onClick}
							disabled={accion.disabled}
							startIcon={<TickCircle size={16} />}
						>
							{accion.label}
						</Button>
					</Box>
				)}
			</Stack>
		</Paper>
	);
};

// ── Pestaña ────────────────────────────────────────────────────────────────────

const VinculosPjnTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Lista
	const [items, setItems] = useState<Vinculo[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(20);
	const [cargando, setCargando] = useState(false);
	const [resumen, setResumen] = useState<ResumenVinculos | null>(null);
	const [escaneando, setEscaneando] = useState(false);

	// Filtros
	const [estado, setEstado] = useState<string>("pendiente");
	const [veredicto, setVeredicto] = useState<VeredictoVinculo | "">("");
	const [fuero, setFuero] = useState("");
	const [q, setQ] = useState("");
	const [qAplicada, setQAplicada] = useState("");

	// Detalle
	const [detalle, setDetalle] = useState<DetalleVinculo | null>(null);
	const [cargandoDetalle, setCargandoDetalle] = useState(false);
	const [accionando, setAccionando] = useState(false);
	const [notas, setNotas] = useState("");
	const [verHistorial, setVerHistorial] = useState(false);

	// Búsqueda manual de otra causa
	const [destino, setDestino] = useState({ fuero: "CIV", number: "", year: "" });
	const [corregirFallo, setCorregirFallo] = useState(false);
	const [resultadosBusqueda, setResultadosBusqueda] = useState<CandidatoCausa[] | null>(null);
	const [buscando, setBuscando] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const r = await listarVinculos({
				estado,
				veredicto: veredicto || undefined,
				fuero: fuero || undefined,
				q: qAplicada || undefined,
				page: page + 1,
				limit,
			});
			setItems(r.data);
			setTotal(r.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(errorMsg(e, "No se pudo cargar la cola de vínculos"), { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [estado, veredicto, fuero, qAplicada, page, limit, enqueueSnackbar]);

	const cargarResumen = useCallback(async () => {
		try {
			setResumen(await obtenerResumenVinculos());
		} catch {
			/* informativo: si falla, la tabla sigue sirviendo */
		}
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);
	useEffect(() => {
		cargarResumen();
	}, [cargarResumen]);

	const refrescarTodo = async () => {
		await Promise.all([cargar(), cargarResumen()]);
	};

	const abrirDetalle = async (id: string) => {
		setCargandoDetalle(true);
		setDetalle(null);
		setNotas("");
		setVerHistorial(false);
		setResultadosBusqueda(null);
		setCorregirFallo(false);
		try {
			const d = await obtenerDetalleVinculo(id);
			setDetalle(d);
			setNotas(d.vinculo.notas || "");
			setDestino({
				fuero: d.vinculo.fueroPjn || "CIV",
				number: d.vinculo.numeroCausa ? String(d.vinculo.numeroCausa) : "",
				year: d.vinculo.anio ? String(d.vinculo.anio) : "",
			});
		} catch (e: any) {
			enqueueSnackbar(errorMsg(e, "No se pudo abrir el caso"), { variant: "error" });
		} finally {
			setCargandoDetalle(false);
		}
	};

	/** Ejecuta una acción sobre el caso abierto y lo recarga para mostrar el estado y el historial nuevos. */
	const ejecutar = async (fn: () => Promise<unknown>, exito: string) => {
		if (!detalle) return;
		const idActual = detalle.vinculo._id;
		setAccionando(true);
		try {
			await fn();
			enqueueSnackbar(exito, { variant: "success" });
			await refrescarTodo();
			// Recargar el caso para mostrar el estado y el historial nuevos
			await abrirDetalle(idActual);
		} catch (e: any) {
			enqueueSnackbar(errorMsg(e, "La acción falló"), { variant: "error" });
		} finally {
			setAccionando(false);
		}
	};

	const siguiente = () => {
		if (!detalle) return;
		const idx = items.findIndex((x) => x._id === detalle.vinculo._id);
		const prox = items.slice(idx + 1).find((x) => x._id !== detalle.vinculo._id) || items.find((x) => x._id !== detalle.vinculo._id);
		if (prox) abrirDetalle(prox._id);
		else setDetalle(null);
	};

	const buscarDestino = async () => {
		if (!detalle || !destino.number || !destino.year) return;
		setBuscando(true);
		setResultadosBusqueda(null);
		try {
			setResultadosBusqueda(await buscarCausaParaVinculo(destino.fuero, destino.number, destino.year, detalle.vinculo._id));
		} catch (e: any) {
			enqueueSnackbar(errorMsg(e, "No se pudo buscar la causa"), { variant: "warning" });
		} finally {
			setBuscando(false);
		}
	};

	const lanzarEscaneo = async () => {
		setEscaneando(true);
		try {
			const r = await escanearVinculos();
			const partes = Object.entries(r.acciones)
				.map(([k, v]) => `${v} ${k}`)
				.join(", ");
			enqueueSnackbar(`Escaneo ${r.escaneoId}: ${r.revisados} fallos (${partes})`, { variant: "success" });
			await refrescarTodo();
		} catch (e: any) {
			enqueueSnackbar(errorMsg(e, "El escaneo falló"), { variant: "error" });
		} finally {
			setEscaneando(false);
		}
	};

	const tarjetas = useMemo(() => {
		const e = resumen?.porEstado || {};
		return [
			{ label: "Pendientes", valor: e.pendiente ?? 0, color: theme.palette.warning.main, filtro: "pendiente" },
			{ label: "Automáticos", valor: e.auto ?? 0, color: theme.palette.info.main, filtro: "auto" },
			{ label: "Sin candidato", valor: e.sin_candidato ?? 0, color: theme.palette.text.secondary, filtro: "sin_candidato" },
			{
				label: "Confirmados / reasignados",
				valor: (e.confirmado ?? 0) + (e.reasignado ?? 0),
				color: theme.palette.success.main,
				filtro: "confirmado,reasignado",
			},
			{
				label: "Rechazados / ignorados",
				valor: (e.rechazado ?? 0) + (e.ignorado ?? 0),
				color: theme.palette.error.main,
				filtro: "rechazado,ignorado",
			},
		];
	}, [resumen, theme]);

	const v = detalle?.vinculo;
	const f = detalle?.fallo;
	const resuelto = v ? ["confirmado", "reasignado", "rechazado", "ignorado"].includes(v.estado) : false;
	const sinDb = detalle ? !detalle.causasDbDisponible : resumen ? !resumen.causasDbDisponible : false;

	return (
		<Stack spacing={2.5}>
			<Alert severity="info" icon={<DocumentText size={20} />}>
				Cruce de los fallos de El Dial con nuestras causas PJN por fuero, número y año, comparando carátulas. Lo claro queda aceptado
				automáticamente; acá se resuelve lo dudoso. <strong>Estas decisiones todavía no se escriben en las causas</strong>: quedan en la
				cola para la etapa siguiente.
			</Alert>

			{resumen && !resumen.causasDbDisponible && (
				<Alert severity="warning">
					La API legal no tiene acceso a la base de causas (falta <code>CAUSAS_MONGO_URI</code>). Se pueden revisar y confirmar los
					candidatos ya encontrados, pero no buscar otra causa ni re-escanear.
				</Alert>
			)}

			{/* Tarjetas de resumen: también funcionan como filtro rápido */}
			<Grid container spacing={1.5}>
				{tarjetas.map((t) => (
					<Grid item xs={6} sm={4} md key={t.label}>
						<Paper
							variant="outlined"
							onClick={() => {
								setEstado(t.filtro);
								setPage(0);
							}}
							sx={{
								p: 1.5,
								cursor: "pointer",
								borderColor: estado === t.filtro ? t.color : undefined,
								bgcolor: estado === t.filtro ? alpha(t.color, 0.06) : undefined,
							}}
						>
							<Typography variant="h4" sx={{ color: t.color }}>
								{t.valor}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{t.label}
							</Typography>
						</Paper>
					</Grid>
				))}
			</Grid>

			{/* Filtros */}
			<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
				<FormControl size="small" sx={{ minWidth: 170 }}>
					<InputLabel>Estado</InputLabel>
					<Select
						label="Estado"
						value={estado}
						onChange={(e) => {
							setEstado(e.target.value);
							setPage(0);
						}}
					>
						<MenuItem value="todos">Todos</MenuItem>
						{Object.entries(ESTADOS).map(([k, x]) => (
							<MenuItem key={k} value={k}>
								{x.label}
							</MenuItem>
						))}
						<MenuItem value="confirmado,reasignado">Confirmados + reasignados</MenuItem>
						<MenuItem value="rechazado,ignorado">Rechazados + ignorados</MenuItem>
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 190 }}>
					<InputLabel>Veredicto</InputLabel>
					<Select
						label="Veredicto"
						value={veredicto}
						onChange={(e) => {
							setVeredicto(e.target.value as VeredictoVinculo | "");
							setPage(0);
						}}
					>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(VEREDICTOS).map(([k, x]) => (
							<MenuItem key={k} value={k}>
								{x.label}
								{resumen?.porVeredicto?.[k as VeredictoVinculo] ? ` (${resumen.porVeredicto[k as VeredictoVinculo]})` : ""}
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 110 }}>
					<InputLabel>Fuero</InputLabel>
					<Select
						label="Fuero"
						value={fuero}
						onChange={(e) => {
							setFuero(e.target.value);
							setPage(0);
						}}
					>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(resumen?.porFuero || {}).map(([k, n]) => (
							<MenuItem key={k} value={k}>
								{k} ({n})
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<TextField
					size="small"
					placeholder="Cita, carátula o 12345/2020"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							setQAplicada(q.trim());
							setPage(0);
						}
					}}
					InputProps={{ startAdornment: <SearchNormal1 size={16} style={{ marginRight: 8 }} /> }}
					sx={{ flex: 1, minWidth: 220 }}
				/>
				<Tooltip title="Actualizar">
					<span>
						<Button variant="outlined" onClick={refrescarTodo} disabled={cargando} sx={{ minWidth: 0, px: 1.5 }}>
							<Refresh size={18} />
						</Button>
					</span>
				</Tooltip>
				<Tooltip
					title={
						sinDb
							? "Requiere acceso de la API a la base de causas"
							: "Vuelve a buscar candidatos para todos los fallos. Respeta las decisiones ya tomadas."
					}
				>
					<span>
						<Button
							variant="contained"
							onClick={lanzarEscaneo}
							disabled={escaneando || sinDb}
							startIcon={escaneando ? <CircularProgress size={16} color="inherit" /> : <Refresh2 size={16} />}
						>
							Re-escanear
						</Button>
					</span>
				</Tooltip>
			</Stack>
			{resumen?.ultimoEscaneo && (
				<Typography variant="caption" color="text.secondary" sx={{ mt: -1.5 }}>
					Último escaneo: {fechaHora(resumen.ultimoEscaneo)} ({resumen.escaneoId})
				</Typography>
			)}

			{/* Tabla */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Cita</TableCell>
							<TableCell>Expediente</TableCell>
							<TableCell>Carátula El Dial</TableCell>
							<TableCell>Causa propuesta / candidata</TableCell>
							<TableCell>Veredicto</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell align="right" />
						</TableRow>
					</TableHead>
					<TableBody>
						{cargando && (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
									<CircularProgress size={24} />
								</TableCell>
							</TableRow>
						)}
						{!cargando && items.length === 0 && (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
									<Typography color="text.secondary">No hay vínculos con estos filtros</Typography>
								</TableCell>
							</TableRow>
						)}
						{!cargando &&
							items.map((x) => {
								const c = x.causaElegida || x.candidatos?.[0];
								const ver = VEREDICTOS[x.veredicto];
								const est = ESTADOS[x.estado];
								return (
									<TableRow key={x._id} hover sx={{ cursor: "pointer" }} onClick={() => abrirDetalle(x._id)}>
										<TableCell sx={{ fontFamily: "monospace" }}>{x.codigoCita}</TableCell>
										<TableCell sx={{ whiteSpace: "nowrap" }}>
											{expediente(x)}
											{x.conflictoPrefijo && (
												<Tooltip title={`El título dice ${x.prefijo}; el tribunal indica ${x.fueroPjn}`}>
													<Warning2 size={14} color={theme.palette.warning.main} style={{ marginLeft: 4, verticalAlign: "middle" }} />
												</Tooltip>
											)}
										</TableCell>
										<TableCell sx={{ maxWidth: 320 }}>
											<Typography variant="body2" noWrap title={x.caratulaFallo || x.titulo}>
												{x.caratulaFallo || <em>{x.titulo}</em>}
											</Typography>
										</TableCell>
										<TableCell sx={{ maxWidth: 320 }}>
											{c ? (
												<Stack direction="row" spacing={1} alignItems="center">
													{c.sinDatos ? (
														<Tooltip title="La causa no tiene carátula real (N/A o ERROR): no hay con qué comparar">
															<Chip size="small" color="info" variant="outlined" label="s/d" />
														</Tooltip>
													) : (
														<Chip size="small" color={colorScore(c.score)} label={c.score.toFixed(2)} />
													)}
													<Typography variant="body2" noWrap title={c.caratula || c.caratulaRaw}>
														{c.caratula || <em>{c.caratulaRaw || "(sin carátula)"}</em>}
													</Typography>
												</Stack>
											) : (
												<Typography variant="body2" color="text.disabled">
													—
												</Typography>
											)}
										</TableCell>
										<TableCell>
											{ver ? (
												<Tooltip title={ver.ayuda}>
													<Chip size="small" variant="outlined" color={ver.color} label={ver.label} />
												</Tooltip>
											) : (
												x.veredicto
											)}
										</TableCell>
										<TableCell>
											<Tooltip title={est?.ayuda || ""}>
												<Chip size="small" color={est?.color || "default"} label={est?.label || x.estado} />
											</Tooltip>
										</TableCell>
										<TableCell align="right">
											<Button size="small" startIcon={<Eye size={16} />}>
												Revisar
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
				<TablePagination
					component="div"
					count={total}
					page={page}
					rowsPerPage={limit}
					onPageChange={(_e, p) => setPage(p)}
					onRowsPerPageChange={(e) => {
						setLimit(parseInt(e.target.value, 10));
						setPage(0);
					}}
					rowsPerPageOptions={[10, 20, 50, 100]}
					labelRowsPerPage="Filas"
				/>
			</TableContainer>

			{/* Detalle */}
			<Dialog open={cargandoDetalle || !!detalle} onClose={() => !accionando && setDetalle(null)} maxWidth="lg" fullWidth>
				{cargandoDetalle && !detalle && (
					<DialogContent sx={{ py: 6, textAlign: "center" }}>
						<CircularProgress />
					</DialogContent>
				)}
				{v && (
					<>
						<DialogTitle>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
								<Typography variant="h5" component="span" sx={{ fontFamily: "monospace" }}>
									{v.codigoCita}
								</Typography>
								<Typography variant="h5" component="span">
									· {expediente(v)}
								</Typography>
								<Chip size="small" color={ESTADOS[v.estado]?.color || "default"} label={ESTADOS[v.estado]?.label || v.estado} />
								{VEREDICTOS[v.veredicto] && (
									<Tooltip title={VEREDICTOS[v.veredicto].ayuda}>
										<Chip size="small" variant="outlined" color={VEREDICTOS[v.veredicto].color} label={VEREDICTOS[v.veredicto].label} />
									</Tooltip>
								)}
								{v.resueltoPor && (
									<Typography variant="caption" color="text.secondary">
										Resuelto por {v.resueltoPor} el {fechaHora(v.resueltoAt)}
									</Typography>
								)}
							</Stack>
						</DialogTitle>
						<DialogContent dividers>
							<Grid container spacing={2.5}>
								{/* El Dial */}
								<Grid item xs={12} md={5}>
									<Typography variant="overline" color="text.secondary">
										Fallo de El Dial
									</Typography>
									<Stack spacing={1} sx={{ mt: 0.5 }}>
										<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
											{v.caratulaFallo || <em>(el título no trae carátula entre comillas)</em>}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											{v.titulo}
										</Typography>
										<Divider />
										<Typography variant="body2">
											<strong>Tribunal:</strong> {f?.tribunal?.nombre || v.tribunal || "—"}
											{f?.tribunal?.sala ? ` · Sala ${f.tribunal.sala}` : ""}
										</Typography>
										<Typography variant="body2">
											<strong>Expediente leído:</strong> {f?.expediente?.raw || "—"}{" "}
											<Typography component="span" variant="caption" color="text.secondary">
												({f?.expediente?.formato || v.formatoExpediente || "?"})
											</Typography>
										</Typography>
										{f?.partes?.objeto && (
											<Typography variant="body2">
												<strong>Objeto:</strong> {f.partes.objeto}
											</Typography>
										)}
										<Typography variant="body2">
											<strong>Sentencia:</strong> {fecha(f?.fechaSentencia || v.fechaSentencia)}
											{f?.firmeza ? ` (${f.firmeza})` : ""} · <strong>Publicado:</strong> {fecha(f?.fechaPublicacion || v.fechaPublicacion)}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Clasificación: {f?.jurisdiccion} / {f?.fuero} · regla {f?.clasificacion?.regla || "—"} · confianza{" "}
											{f?.clasificacion?.confianza || "—"}
											{f?.clasificacion?.metodo === "manual" ? " · corregida a mano" : ""}
										</Typography>
										{v.conflictoPrefijo && (
											<Alert severity="warning" sx={{ py: 0 }}>
												El título dice <strong>{v.prefijo}</strong> pero el tribunal indica <strong>{v.fueroPjn}</strong>. Se buscó en los
												dos fueros.
											</Alert>
										)}
										<Stack direction="row" spacing={2}>
											{f?.urlFallo && (
												<Link href={f.urlFallo} target="_blank" rel="noopener" variant="body2">
													Ver en El Dial
												</Link>
											)}
											{f?.urlPdf && (
												<Link href={f.urlPdf} target="_blank" rel="noopener" variant="body2">
													PDF
												</Link>
											)}
										</Stack>
									</Stack>
								</Grid>

								{/* Candidatas */}
								<Grid item xs={12} md={7}>
									<Typography variant="overline" color="text.secondary">
										Causas nuestras con ese número y año ({v.candidatos.length}) · probado: {v.codigosProbados.join(", ") || "—"}
									</Typography>
									<Stack spacing={1.25} sx={{ mt: 0.5 }}>
										{v.veredicto === "match-numero-causa-sin-datos" && (
											<Alert severity="info" sx={{ py: 0.5 }}>
												Nuestra causa existe pero el scraping no obtuvo datos (carátula N/A o ERROR), típico de causas reservadas. Si el
												número y el tribunal son coherentes, confirmar: más adelante El Dial le aportará la carátula.
											</Alert>
										)}
										{v.veredicto === "match-numero-caratula-distinta" && (
											<Alert severity="error" sx={{ py: 0.5 }}>
												Mismo número y año pero carátulas sin relación. Probablemente uno de los dos lados tiene el número mal: rechazar o
												buscar la causa correcta abajo.
											</Alert>
										)}
										{v.candidatos.length === 0 && (
											<Typography variant="body2" color="text.secondary">
												{v.nota || "No hay causas con ese fuero, número y año en nuestra base."}
											</Typography>
										)}
										{v.candidatos.map((c) => (
											<TarjetaCausa
												key={c.causaId}
												c={c}
												elegida={v.causaElegida?.causaId === c.causaId}
												accion={
													v.causaElegida?.causaId === c.causaId && v.estado === "confirmado"
														? undefined
														: {
																label: v.causaElegida?.causaId === c.causaId ? "Confirmar" : "Vincular a esta",
																disabled: accionando,
																onClick: () =>
																	ejecutar(
																		() => confirmarVinculo(v._id, { causaId: c.causaId, notas: notas || undefined }),
																		"Vínculo confirmado",
																	),
														  }
												}
											/>
										))}
										{v.causaElegida && !v.candidatos.some((c) => c.causaId === v.causaElegida?.causaId) && (
											<>
												<Typography variant="overline" color="text.secondary">
													Causa elegida a mano
												</Typography>
												<TarjetaCausa c={v.causaElegida} elegida />
											</>
										)}
									</Stack>

									{/* Búsqueda manual */}
									<Divider sx={{ my: 2 }} />
									<Typography variant="overline" color="text.secondary">
										Buscar otra causa
									</Typography>
									<Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.5 }} alignItems={{ sm: "center" }}>
										<FormControl size="small" sx={{ minWidth: 90 }}>
											<InputLabel>Fuero</InputLabel>
											<Select label="Fuero" value={destino.fuero} onChange={(e) => setDestino({ ...destino, fuero: e.target.value })}>
												{FUEROS_PJN.map((x) => (
													<MenuItem key={x} value={x}>
														{x}
													</MenuItem>
												))}
											</Select>
										</FormControl>
										<TextField
											size="small"
											label="Número"
											value={destino.number}
											onChange={(e) => setDestino({ ...destino, number: e.target.value.replace(/\D/g, "") })}
											sx={{ width: 130 }}
										/>
										<TextField
											size="small"
											label="Año"
											value={destino.year}
											onChange={(e) => setDestino({ ...destino, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
											sx={{ width: 90 }}
										/>
										<Button
											variant="outlined"
											onClick={buscarDestino}
											disabled={buscando || !destino.number || destino.year.length !== 4 || !detalle?.causasDbDisponible}
											startIcon={buscando ? <CircularProgress size={14} /> : <SearchNormal1 size={16} />}
										>
											Buscar
										</Button>
									</Stack>
									<FormControlLabel
										sx={{ mt: 0.5 }}
										control={<Switch size="small" checked={corregirFallo} onChange={(e) => setCorregirFallo(e.target.checked)} />}
										label={
											<Typography variant="caption">
												Corregir también fuero y número/año del fallo (el clasificador automático no lo volverá a pisar)
											</Typography>
										}
									/>
									{!detalle?.causasDbDisponible && (
										<Typography variant="caption" color="warning.main" display="block">
											Búsqueda deshabilitada: la API no tiene acceso a la base de causas.
										</Typography>
									)}
									{resultadosBusqueda && (
										<Stack spacing={1} sx={{ mt: 1 }}>
											{resultadosBusqueda.length === 0 && (
												<Typography variant="body2" color="text.secondary">
													No hay causas {destino.fuero} {destino.number}/{destino.year} en nuestra base.
												</Typography>
											)}
											{resultadosBusqueda.map((c) => (
												<TarjetaCausa
													key={c.causaId}
													c={c}
													accion={{
														label: "Vincular a esta",
														disabled: accionando,
														onClick: () =>
															ejecutar(
																() =>
																	reasignarVinculo(v._id, {
																		fuero: destino.fuero,
																		number: destino.number,
																		year: destino.year,
																		causaId: c.causaId,
																		notas: notas || undefined,
																		corregirFallo,
																	}),
																"Vinculado a la causa elegida",
															),
													}}
												/>
											))}
										</Stack>
									)}
								</Grid>

								{/* Notas + historial */}
								<Grid item xs={12}>
									<TextField
										fullWidth
										size="small"
										label="Notas (quedan en el historial de la decisión)"
										value={notas}
										onChange={(e) => setNotas(e.target.value)}
										multiline
										minRows={1}
									/>
									<Button
										size="small"
										sx={{ mt: 1 }}
										onClick={() => setVerHistorial(!verHistorial)}
										endIcon={verHistorial ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
									>
										Historial ({v.historial?.length || 0})
									</Button>
									<Collapse in={verHistorial}>
										<Table size="small">
											<TableBody>
												{(v.historial || [])
													.slice()
													.reverse()
													.map((h, i) => (
														<TableRow key={i}>
															<TableCell sx={{ whiteSpace: "nowrap" }}>{fechaHora(h.at)}</TableCell>
															<TableCell>{h.accion}</TableCell>
															<TableCell>{h.por}</TableCell>
															<TableCell>
																{h.estadoAntes || "∅"} → {h.estadoDespues}
															</TableCell>
															<TableCell sx={{ fontSize: 12 }}>{h.causaDespues || h.causaAntes || ""}</TableCell>
															<TableCell sx={{ fontSize: 12 }}>{h.notas}</TableCell>
														</TableRow>
													))}
											</TableBody>
										</Table>
									</Collapse>
								</Grid>
							</Grid>
						</DialogContent>
						<DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
							<Tooltip
								title={detalle?.causasDbDisponible ? "Vuelve a buscar candidatos para este fallo" : "Requiere acceso a la base de causas"}
							>
								<span>
									<Button
										onClick={() => ejecutar(() => reevaluarVinculo(v._id), "Candidatos actualizados")}
										disabled={accionando || !detalle?.causasDbDisponible}
										startIcon={<Refresh2 size={16} />}
									>
										Re-evaluar
									</Button>
								</span>
							</Tooltip>
							<Box sx={{ flex: 1 }} />
							{resuelto || v.estado === "auto" ? (
								<Button
									color="warning"
									onClick={() => ejecutar(() => reabrirVinculo(v._id, notas || undefined), "Caso reabierto")}
									disabled={accionando}
								>
									Reabrir
								</Button>
							) : null}
							{v.estado !== "ignorado" && (
								<Tooltip title="Fuera de alcance: no interesa vincularlo">
									<span>
										<Button
											onClick={() => ejecutar(() => ignorarVinculo(v._id, notas || undefined), "Marcado como ignorado")}
											disabled={accionando}
										>
											Ignorar
										</Button>
									</span>
								</Tooltip>
							)}
							{v.estado !== "rechazado" && (
								<Tooltip title="Ninguna de nuestras causas corresponde a este fallo">
									<span>
										<Button
											color="error"
											startIcon={<CloseCircle size={16} />}
											onClick={() => ejecutar(() => rechazarVinculo(v._id, notas || undefined), "Marcado como sin causa")}
											disabled={accionando}
										>
											Ninguna corresponde
										</Button>
									</span>
								</Tooltip>
							)}
							<Button variant="outlined" onClick={siguiente} disabled={accionando}>
								Siguiente
							</Button>
							<Button onClick={() => setDetalle(null)} disabled={accionando}>
								Cerrar
							</Button>
						</DialogActions>
					</>
				)}
			</Dialog>
		</Stack>
	);
};

export default VinculosPjnTab;
