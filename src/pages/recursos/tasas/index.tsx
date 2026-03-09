import { useState, useEffect, useMemo, SyntheticEvent } from "react";
import {
	Box,
	Card,
	Collapse,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	IconButton,
	TextField,
	Button,
	Tooltip,
	Tab,
	Tabs,
	Switch,
	FormControlLabel,
	useTheme,
	alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { Refresh, SearchNormal1, Edit, CloseCircle, TickCircle, Chart, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { getTasasListado, consultarTasas, actualizarValorTasa, rellenarGaps, TasaConfig, TasaResultItem } from "utils/tasasService";

// ─── Tab panel ────────────────────────────────────────────────────────────────

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
	return (
		<div role="tabpanel" hidden={value !== index} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString("es-AR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: "UTC",
	});
};

const toYYYYMMDD = (dateStr: string): string => new Date(dateStr).toISOString().split("T")[0];

const isSameDay = (d1: string | null, d2: string | null): boolean => {
	if (!d1 || !d2) return false;
	return toYYYYMMDD(d1) === toYYYYMMDD(d2);
};

// ─── Status chip ──────────────────────────────────────────────────────────────

const StatusChip = ({ tasa }: { tasa: TasaConfig }) => {
	if (!tasa.fechaUltima) return <Chip label="Sin datos" color="default" size="small" />;
	if (!tasa.fechaUltimaCompleta) return <Chip label="Sin cobertura" color="error" size="small" />;
	if (isSameDay(tasa.fechaUltimaCompleta, tasa.fechaUltima)) return <Chip label="Completo" color="success" size="small" />;
	return <Chip label="Con fechas faltantes" color="warning" size="small" />;
};

// ─── Coverage detail ──────────────────────────────────────────────────────────

const CoverageDetail = ({ tasa }: { tasa: TasaConfig }) => {
	if (!tasa.fechaUltima) {
		return (
			<Typography variant="caption" color="text.secondary">
				Sin registros disponibles
			</Typography>
		);
	}

	if (!tasa.fechaUltimaCompleta) {
		return (
			<Typography variant="caption" color="error.main">
				Sin período continuo — inicio: {formatDate(tasa.fechaInicio)}
			</Typography>
		);
	}

	if (isSameDay(tasa.fechaUltimaCompleta, tasa.fechaUltima)) {
		return (
			<Typography variant="caption" color="success.main">
				Completo desde {formatDate(tasa.fechaInicio)} hasta {formatDate(tasa.fechaUltima)}
			</Typography>
		);
	}

	return (
		<Typography variant="caption" color="warning.main">
			Inicio: {formatDate(tasa.fechaInicio)} · Completo hasta: {formatDate(tasa.fechaUltimaCompleta)} · Fechas faltantes hasta{" "}
			{formatDate(tasa.fechaUltima)}
		</Typography>
	);
};

// ─── Fila expandible con fechas faltantes ─────────────────────────────────────

const MAX_VISIBLE_DATES = 60;

interface FechasFaltantesRowProps {
	tasa: TasaConfig;
	colSpan: number;
	onRellenar: () => void;
	loading: boolean;
}

const FechasFaltantesRow = ({ tasa, colSpan, onRellenar, loading }: FechasFaltantesRowProps) => {
	const theme = useTheme();
	const [open, setOpen] = useState(false);

	const sortedDates = useMemo(
		() => [...(tasa.fechasFaltantes ?? [])].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
		[tasa.fechasFaltantes],
	);
	const total = sortedDates.length;

	if (total === 0) return null;

	const visible = sortedDates.slice(0, MAX_VISIBLE_DATES);
	const hidden = total - visible.length;

	return (
		<>
			<TableRow
				hover
				onClick={() => setOpen((v) => !v)}
				sx={{ cursor: "pointer", bgcolor: open ? alpha(theme.palette.warning.main, 0.04) : undefined }}
			>
				<TableCell colSpan={colSpan} sx={{ py: 0.5, borderBottom: open ? "none" : undefined }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Stack direction="row" alignItems="center" spacing={1}>
							<IconButton size="small" sx={{ color: theme.palette.warning.main }}>
								{open ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
							</IconButton>
							<Typography variant="caption" color="warning.main" fontWeight={600}>
								{total} fecha{total !== 1 ? "s" : ""} faltante{total !== 1 ? "s" : ""}
							</Typography>
						</Stack>
						<Tooltip title={`Rellenar gaps de ${tasa.label} usando servicio nativo + CPACF`}>
							<span>
								<Button
									size="small"
									variant="outlined"
									color="warning"
									disabled={loading}
									onClick={(e) => {
										e.stopPropagation();
										onRellenar();
									}}
									startIcon={loading ? <CircularProgress size={12} /> : undefined}
									sx={{ fontSize: "0.7rem", py: 0.25, minWidth: 90 }}
								>
									{loading ? "Iniciando..." : "Rellenar"}
								</Button>
							</span>
						</Tooltip>
					</Stack>
				</TableCell>
			</TableRow>
			<TableRow>
				<TableCell colSpan={colSpan} sx={{ py: 0, border: open ? undefined : "none" }}>
					<Collapse in={open} unmountOnExit>
						<Box sx={{ px: 4, py: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
							<Stack direction="row" flexWrap="wrap" gap={0.75}>
								{visible.map((f) => (
									<Chip
										key={f}
										size="small"
										variant="outlined"
										color="warning"
										label={formatDate(f)}
										sx={{ fontSize: "0.7rem" }}
									/>
								))}
								{hidden > 0 && (
									<Chip
										size="small"
										variant="filled"
										color="warning"
										label={`+${hidden} más`}
										sx={{ fontSize: "0.7rem" }}
									/>
								)}
							</Stack>
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</>
	);
};

// ─── Fuente chip ──────────────────────────────────────────────────────────────

const FUENTE_COLORS: Record<string, "primary" | "secondary" | "success" | "warning" | "info" | "default"> = {
	"BCRA API": "info",
	"BNA Web": "primary",
	"BNA PDF": "secondary",
	"Consejo": "success",
	"Colegio": "success",
	"Admin Manual": "warning",
};

const FuenteChip = ({ fuente }: { fuente: string | null | undefined }) => {
	if (!fuente) return <Typography variant="caption" color="text.disabled">—</Typography>;
	const color = FUENTE_COLORS[fuente] ?? "default";
	return <Chip label={fuente} color={color} size="small" variant="outlined" />;
};

// ─── Main component ───────────────────────────────────────────────────────────

const TasasInteres = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Tabs
	const [tabValue, setTabValue] = useState(0);

	// Section A — estado actual
	const [listado, setListado] = useState<TasaConfig[]>([]);
	const [loadingListado, setLoadingListado] = useState(false);

	// Section B — consulta
	const [campo, setCampo] = useState("");
	const [fechaDesde, setFechaDesde] = useState("");
	const [fechaHasta, setFechaHasta] = useState("");
	const [completo, setCompleto] = useState(true);
	const [loadingConsulta, setLoadingConsulta] = useState(false);
	const [resultados, setResultados] = useState<TasaResultItem[]>([]);
	const [hasSearched, setHasSearched] = useState(false);

	// Fuente filter
	const [fuenteFilter, setFuenteFilter] = useState<string>("all");

	// Inline editing
	const [editingRow, setEditingRow] = useState<string | null>(null);
	const [editValue, setEditValue] = useState<string>("");
	const [savingRow, setSavingRow] = useState<string | null>(null);

	// Gap filling
	const [loadingRellenar, setLoadingRellenar] = useState(false);
	const [loadingRellenarTasa, setLoadingRellenarTasa] = useState<Record<string, boolean>>({});

	// ── Load listado on mount ────────────────────────────────────────────────

	const fetchListado = async () => {
		try {
			setLoadingListado(true);
			const data = await getTasasListado();
			setListado(data);
			// Pre-seleccionar la primera tasa y rellenar su rango de fechas
			if (data.length > 0 && !campo) {
				const primera = data[0];
				setCampo(primera.value);
				if (primera.fechaInicio) setFechaDesde(toYYYYMMDD(primera.fechaInicio));
				if (primera.fechaUltima) setFechaHasta(toYYYYMMDD(primera.fechaUltima));
			}
		} catch (error: unknown) {
			const err = error as { response?: { data?: { mensaje?: string } } };
			enqueueSnackbar(err?.response?.data?.mensaje || "Error al cargar las tasas", { variant: "error" });
		} finally {
			setLoadingListado(false);
		}
	};

	// Al cambiar el tipo de tasa, actualizar fechas con el rango conocido de esa tasa
	const handleCampoChange = (value: string) => {
		setCampo(value);
		setResultados([]);
		setHasSearched(false);
		setEditingRow(null);
		const tasa = listado.find((t) => t.value === value);
		if (tasa) {
			if (tasa.fechaInicio) setFechaDesde(toYYYYMMDD(tasa.fechaInicio));
			if (tasa.fechaUltima) setFechaHasta(toYYYYMMDD(tasa.fechaUltima));
		}
	};

	useEffect(() => {
		fetchListado();
	}, []);

	// ── Search ───────────────────────────────────────────────────────────────

	const handleSearch = async () => {
		if (!campo || !fechaDesde || !fechaHasta) {
			enqueueSnackbar("Completá todos los campos de búsqueda", { variant: "warning" });
			return;
		}
		try {
			setLoadingConsulta(true);
			setHasSearched(true);
			setEditingRow(null);
			setFuenteFilter("all");
			const data = await consultarTasas({ fechaDesde, fechaHasta, campo, completo });
			setResultados(data);
		} catch (error: unknown) {
			const err = error as { response?: { data?: { mensaje?: string } } };
			enqueueSnackbar(err?.response?.data?.mensaje || "Error al consultar tasas", { variant: "error" });
		} finally {
			setLoadingConsulta(false);
		}
	};

	// ── Inline edit handlers ─────────────────────────────────────────────────

	const handleStartEdit = (item: TasaResultItem) => {
		setEditingRow(item.fecha);
		setEditValue(item.valor != null ? item.valor.toString() : "");
	};

	const handleCancelEdit = () => {
		setEditingRow(null);
		setEditValue("");
	};

	const handleSaveEdit = async (item: TasaResultItem) => {
		const nuevoValor = parseFloat(editValue);
		if (isNaN(nuevoValor)) {
			enqueueSnackbar("El valor debe ser un número válido", { variant: "warning" });
			return;
		}
		try {
			setSavingRow(item.fecha);
			await actualizarValorTasa(toYYYYMMDD(item.fecha), campo, nuevoValor);
			setResultados((prev) => prev.map((r) => (r.fecha === item.fecha ? { ...r, valor: nuevoValor, fuente: "Admin Manual" } : r)));
			enqueueSnackbar("Valor actualizado correctamente", { variant: "success" });
			setEditingRow(null);
			setEditValue("");
		} catch (error: unknown) {
			const err = error as { response?: { data?: { mensaje?: string } } };
			enqueueSnackbar(err?.response?.data?.mensaje || "Error al actualizar el valor", { variant: "error" });
		} finally {
			setSavingRow(null);
		}
	};

	const handleRellenarTodos = async () => {
		try {
			setLoadingRellenar(true);
			await rellenarGaps();
			enqueueSnackbar("Relleno de gaps iniciado en el servidor (todas las tasas). Los datos se actualizarán en segundo plano.", { variant: "info" });
		} catch (error: unknown) {
			const err = error as { response?: { data?: { message?: string } } };
			enqueueSnackbar(err?.response?.data?.message || "Error al iniciar el relleno de gaps", { variant: "error" });
		} finally {
			setLoadingRellenar(false);
		}
	};

	const handleRellenarTasa = async (tipoTasa: string) => {
		try {
			setLoadingRellenarTasa((prev) => ({ ...prev, [tipoTasa]: true }));
			await rellenarGaps(tipoTasa);
			const label = listado.find((t) => t.value === tipoTasa)?.label ?? tipoTasa;
			enqueueSnackbar(`Relleno iniciado para ${label}. Los datos se actualizarán en segundo plano.`, { variant: "info" });
		} catch (error: unknown) {
			const err = error as { response?: { data?: { message?: string } } };
			enqueueSnackbar(err?.response?.data?.message || "Error al iniciar el relleno", { variant: "error" });
		} finally {
			setLoadingRellenarTasa((prev) => ({ ...prev, [tipoTasa]: false }));
		}
	};

	const selectedTasaLabel = listado.find((t) => t.value === campo)?.label || campo;

	// Fuente stats: count by source
	const fuenteStats = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const r of resultados) {
			const key = r.fuente ?? "Sin fuente";
			counts[key] = (counts[key] ?? 0) + 1;
		}
		return counts;
	}, [resultados]);

	const filteredResultados = useMemo(
		() => (fuenteFilter === "all" ? resultados : resultados.filter((r) => (r.fuente ?? "Sin fuente") === fuenteFilter)),
		[resultados, fuenteFilter],
	);

	// ── Render ───────────────────────────────────────────────────────────────

	return (
		<MainCard title="Tasas de Interés" secondary={<Chart size={24} />}>
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={tabValue} onChange={(_e: SyntheticEvent, v: number) => setTabValue(v)}>
					<Tab label="Estado Actual" />
					<Tab label="Consulta por Fecha" />
				</Tabs>
			</Box>

			{/* ═══════════════════════════════════════════════════════════════
			    TAB 0 — Estado actual
			══════════════════════════════════════════════════════════════════ */}
			<TabPanel value={tabValue} index={0}>
				<Stack spacing={2}>
					<Box display="flex" justifyContent="flex-end" gap={1} alignItems="center">
						<Tooltip title="Rellena automáticamente las fechas faltantes de todas las tasas usando CPACF. El proceso corre en segundo plano.">
							<span>
								<Button
									variant="outlined"
									color="warning"
									size="small"
									disabled={loadingRellenar}
									onClick={handleRellenarTodos}
									startIcon={loadingRellenar ? <CircularProgress size={14} /> : undefined}
								>
									{loadingRellenar ? "Iniciando..." : "Rellenar Gaps"}
								</Button>
							</span>
						</Tooltip>
						<Tooltip title="Refrescar">
							<IconButton onClick={fetchListado} disabled={loadingListado}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Box>

					{loadingListado ? (
						<Box display="flex" justifyContent="center" py={6}>
							<CircularProgress />
						</Box>
					) : listado.length === 0 ? (
						<Alert severity="info">No se encontraron tasas configuradas.</Alert>
					) : (
						<TableContainer component={Card}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Tipo de Tasa</TableCell>
										<TableCell>Fecha Inicio</TableCell>
										<TableCell>Última Fecha</TableCell>
										<TableCell>Última Completa</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell>Detalle de cobertura</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{listado.map((tasa) => (
										<>
											<TableRow key={tasa.value} hover sx={{ "& td": { borderBottom: (tasa.fechasFaltantes?.length ?? 0) > 0 ? "none" : undefined } }}>
												<TableCell>
													<Typography variant="body2" fontWeight={600}>
														{tasa.label}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{tasa.value}
													</Typography>
												</TableCell>
												<TableCell>{formatDate(tasa.fechaInicio)}</TableCell>
												<TableCell>{formatDate(tasa.fechaUltima)}</TableCell>
												<TableCell>{formatDate(tasa.fechaUltimaCompleta)}</TableCell>
												<TableCell align="center">
													<StatusChip tasa={tasa} />
												</TableCell>
												<TableCell>
													<CoverageDetail tasa={tasa} />
												</TableCell>
											</TableRow>
											<FechasFaltantesRow
											key={`gaps-${tasa.value}`}
											tasa={tasa}
											colSpan={6}
											onRellenar={() => handleRellenarTasa(tasa.value)}
											loading={!!loadingRellenarTasa[tasa.value]}
										/>
										</>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</Stack>
			</TabPanel>

			{/* ═══════════════════════════════════════════════════════════════
			    TAB 1 — Consulta y edición por fecha
			══════════════════════════════════════════════════════════════════ */}
			<TabPanel value={tabValue} index={1}>
				<Stack spacing={3}>
					{/* Formulario de búsqueda */}
					<Card sx={{ p: 2 }}>
						<Typography variant="h6" gutterBottom>
							Parámetros de búsqueda
						</Typography>
						<Grid container spacing={2} alignItems="flex-end">
							<Grid item xs={12} md={3}>
								<FormControl fullWidth disabled={loadingListado}>
									<InputLabel>Tipo de Tasa</InputLabel>
									<Select
										value={campo}
										onChange={(e) => handleCampoChange(e.target.value)}
										label="Tipo de Tasa"
									>
										{listado.map((t) => (
											<MenuItem key={t.value} value={t.value}>
												{t.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Fecha desde"
									type="date"
									value={fechaDesde}
									onChange={(e) => setFechaDesde(e.target.value)}
									InputLabelProps={{ shrink: true }}
									helperText={listado.find((t) => t.value === campo)?.fechaInicio ? `Inicio: ${formatDate(listado.find((t) => t.value === campo)!.fechaInicio)}` : ""}
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Fecha hasta"
									type="date"
									value={fechaHasta}
									onChange={(e) => setFechaHasta(e.target.value)}
									InputLabelProps={{ shrink: true }}
									helperText={listado.find((t) => t.value === campo)?.fechaUltima ? `Último dato: ${formatDate(listado.find((t) => t.value === campo)!.fechaUltima)}` : ""}
								/>
							</Grid>
							<Grid item xs={12} md={2}>
								<FormControlLabel
									control={<Switch checked={completo} onChange={(e) => setCompleto(e.target.checked)} />}
									label="Rango completo"
									sx={{ ml: 0.5 }}
								/>
							</Grid>
							<Grid item xs={12} md={1}>
								<Button
									fullWidth
									variant="contained"
									startIcon={<SearchNormal1 size={16} />}
									onClick={handleSearch}
									disabled={loadingConsulta}
									sx={{ height: "56px" }}
								>
									Buscar
								</Button>
							</Grid>
						</Grid>
					</Card>

					{/* Resultados */}
					{loadingConsulta ? (
						<Box display="flex" justifyContent="center" py={6}>
							<CircularProgress />
						</Box>
					) : hasSearched && resultados.length === 0 ? (
						<Alert severity="info">No se encontraron registros para los parámetros seleccionados.</Alert>
					) : resultados.length > 0 ? (
						<TableContainer component={Card}>
							<Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
								<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
									<Typography variant="h6">
										{selectedTasaLabel} — {resultados.length} registro{resultados.length !== 1 ? "s" : ""}
									</Typography>
									{/* Fuente stats + filter */}
									<Stack direction="row" spacing={1} flexWrap="wrap">
										<Tooltip title="Mostrar todos">
											<Chip
												label={`Todos (${resultados.length})`}
												size="small"
												variant={fuenteFilter === "all" ? "filled" : "outlined"}
												color={fuenteFilter === "all" ? "primary" : "default"}
												onClick={() => setFuenteFilter("all")}
												sx={{ cursor: "pointer" }}
											/>
										</Tooltip>
										{Object.entries(fuenteStats).map(([fuente, count]) => (
											<Tooltip key={fuente} title={`Filtrar por: ${fuente}`}>
												<Chip
													label={`${fuente} (${count})`}
													size="small"
													variant={fuenteFilter === fuente ? "filled" : "outlined"}
													color={fuenteFilter === fuente ? (FUENTE_COLORS[fuente] ?? "default") : "default"}
													onClick={() => setFuenteFilter(fuente === fuenteFilter ? "all" : fuente)}
													sx={{ cursor: "pointer" }}
												/>
											</Tooltip>
										))}
									</Stack>
								</Stack>
							</Box>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Valor</TableCell>
										<TableCell>Fuente</TableCell>
										<TableCell align="center" sx={{ width: 100 }}>
											Acciones
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{filteredResultados.map((item) => {
										const isEditing = editingRow === item.fecha;
										const isSaving = savingRow === item.fecha;
										return (
											<TableRow key={item.fecha} hover>
												<TableCell>{formatDate(item.fecha)}</TableCell>
												<TableCell>
													{isEditing ? (
														<TextField
															size="small"
															value={editValue}
															onChange={(e) => setEditValue(e.target.value)}
															type="number"
															inputProps={{ step: "any" }}
															sx={{ width: 160 }}
															autoFocus
															onKeyDown={(e) => {
																if (e.key === "Enter") handleSaveEdit(item);
																if (e.key === "Escape") handleCancelEdit();
															}}
														/>
													) : (
														<Typography variant="body2" fontFamily="monospace">
															{item.valor != null ? item.valor.toFixed(6) : "—"}
														</Typography>
													)}
												</TableCell>
												<TableCell>
													<FuenteChip fuente={item.fuente} />
												</TableCell>
												<TableCell align="center">
													{isEditing ? (
														<Stack direction="row" spacing={0.5} justifyContent="center">
															<Tooltip title="Guardar (Enter)">
																<span>
																	<IconButton
																		size="small"
																		color="success"
																		onClick={() => handleSaveEdit(item)}
																		disabled={isSaving}
																	>
																		{isSaving ? <CircularProgress size={16} /> : <TickCircle size={18} />}
																	</IconButton>
																</span>
															</Tooltip>
															<Tooltip title="Cancelar (Esc)">
																<IconButton size="small" color="error" onClick={handleCancelEdit} disabled={isSaving}>
																	<CloseCircle size={18} />
																</IconButton>
															</Tooltip>
														</Stack>
													) : (
														<Tooltip title="Editar valor">
															<IconButton size="small" color="primary" onClick={() => handleStartEdit(item)}>
																<Edit size={18} />
															</IconButton>
														</Tooltip>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					) : null}
				</Stack>
			</TabPanel>
		</MainCard>
	);
};

export default TasasInteres;
