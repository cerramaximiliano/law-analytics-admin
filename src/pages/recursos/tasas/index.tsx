import { useState, useEffect, useMemo, SyntheticEvent } from "react";
import {
	Box,
	Card,
	Collapse,
	Divider,
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
	\t\t\t\t<Tab label="Consulta por Fecha" />\n\t\t\t\t<Tab label="Documentación" />
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

		{/* TAB 2 — Documentación */}
		<TabPanel value={tabValue} index={2}>
			<Stack spacing={3}>

				<Card sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>Arquitectura de fuentes</Typography>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						Los valores se almacenan como porcentaje de interés <strong>diario</strong> en la colección{" "}
						<code>Tasas</code>. La prioridad de obtención es siempre: servicio nativo primero, CPACF/Consejo como fallback.
					</Typography>
					<Stack spacing={1.5} mt={2}>
						{[
							{ label: "1° Servicio nativo", desc: "BNA Web scraping · BCRA API REST", color: "success" as const },
							{ label: "2° CPACF / Consejo", desc: "tasas.cpacf.org.ar — cubre cualquier rango histórico desde 1991", color: "warning" as const },
							{ label: "3° Edición manual", desc: "Corrección puntual via UI — fuente: Admin Manual", color: "default" as const },
						].map((row) => (
							<Stack key={row.label} direction="row" alignItems="center" spacing={2}>
								<Chip label={row.label} color={row.color} size="small" sx={{ minWidth: 160 }} />
								<Typography variant="body2" color="text.secondary">{row.desc}</Typography>
							</Stack>
						))}
					</Stack>
				</Card>

				<Card sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>Fuentes por tipo de tasa</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>tipoTasa</TableCell>
									<TableCell>Fuente primaria</TableCell>
									<TableCell>Fallback CPACF rateId</TableCell>
									<TableCell>Histórico disponible</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{[
									{ tipo: "tasaActivaBNA",      fuente: "BNA Web",  rateId: "1",  historico: "Solo día actual" },
									{ tipo: "tasaActivaTnaBNA",   fuente: "BNA Web",  rateId: "25", historico: "Solo día actual" },
									{ tipo: "tasaActivaCNAT2658", fuente: "BNA Web",  rateId: "22", historico: "Solo día actual" },
									{ tipo: "tasaActivaCNAT2764", fuente: "BNA Web",  rateId: "23", historico: "Solo día actual" },
									{ tipo: "tasaPasivaBNA",      fuente: "CPACF",    rateId: "2",  historico: "Desde 1991 via CPACF" },
									{ tipo: "tasaPasivaBCRA",     fuente: "BCRA API", rateId: "—",  historico: "Cualquier rango (idVar=43)" },
									{ tipo: "cer",                fuente: "BCRA API", rateId: "—",  historico: "Cualquier rango (idVar=30)" },
									{ tipo: "icl",                fuente: "BCRA API", rateId: "—",  historico: "Cualquier rango (idVar=40)" },
								].map((r) => (
									<TableRow key={r.tipo} hover>
										<TableCell><code>{r.tipo}</code></TableCell>
										<TableCell>
											<Chip
												label={r.fuente}
												size="small"
												color={r.fuente === "BNA Web" ? "primary" : r.fuente === "BCRA API" ? "info" : "success"}
												variant="outlined"
											/>
										</TableCell>
										<TableCell>{r.rateId}</TableCell>
										<TableCell>
											<Typography variant="caption" color="text.secondary">{r.historico}</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Card>

				<Card sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>Comportamiento BNA — Carry-forward</Typography>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						BNA publica tasas con <strong>fecha de vigencia futura</strong> (fines de semana y feriados). El sistema
						rellena los días intermedios con el último valor registrado.
					</Typography>
					<Box sx={{ mt: 1.5, p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
						<Typography variant="caption" fontFamily="monospace" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
							{"Hoy: viernes 07/03  →  BNA publica con vigencia 10/03 (lunes)\n\ndiaHastaVigencia = [08/03, 09/03]\n  \u21b3 Busca \u00faltimo registro real en Tasas (anterior a hoy)\n  \u21b3 Copia ese valor para 08/03 y 09/03\n  \u21b3 origenDato = \"completado_automaticamente\"\n  \u21b3 Limpia esas fechas de fechasFaltantes en TasasConfig\n\nCPACF tambi\u00e9n agrupa estos per\u00edodos nativamente:\n  06/03 \u2192 08/03  (misma tasa \u2192 un registro expandido a 3 d\u00edas)"}
						</Typography>
					</Box>
				</Card>

				<Card sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>Seguimiento de cobertura — TasasConfig</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Campo</TableCell>
									<TableCell>Descripción</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{[
									{ campo: "fechaInicio",        desc: "Primera fecha con datos en la colección Tasas" },
									{ campo: "fechaUltima",        desc: "Última fecha registrada (puede ser futura en BNA)" },
									{ campo: "fechaUltimaCompleta",desc: "Último día sin gaps desde fechaInicio. Si hay faltantes, es el día anterior al primero." },
									{ campo: "fechasFaltantes",    desc: "Array de fechas con datos ausentes. El gap filler las lee para determinar qué rangos consultar." },
									{ campo: "ultimaVerificacion", desc: "Timestamp del último scraping exitoso" },
								].map((r) => (
									<TableRow key={r.campo} hover>
										<TableCell><code>{r.campo}</code></TableCell>
										<TableCell>
											<Typography variant="body2" color="text.secondary">{r.desc}</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
					<Divider sx={{ my: 2 }} />
					<Typography variant="subtitle2" gutterBottom>Lógica de actualizarConfigTasa</Typography>
					<Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
						<Typography variant="caption" fontFamily="monospace" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
							{"Si fechasFaltantes no est\u00e1 vac\u00edo:\n  \u2192 Elimina la fecha reci\u00e9n guardada de fechasFaltantes\n  \u2192 Recalcula fechaUltimaCompleta (d\u00eda anterior al primer faltante)\n\nSi fechasFaltantes est\u00e1 vac\u00edo:\n  Si diff(nuevaFecha, fechaUltimaCompleta) \u2264 1 d\u00eda:\n    \u2192 Avanza fechaUltimaCompleta (per\u00edodo continuo \u2705)\n  Si diff > 1 d\u00eda:\n    \u2192 Gap impl\u00edcito detectado\n    \u2192 Agrega d\u00edas intermedios a fechasFaltantes \u26a0\ufe0f\n    \u2192 No avanza fechaUltimaCompleta"}
						</Typography>
					</Box>
				</Card>

				<Card sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>Gap Filler — Relleno automático de fechas faltantes</Typography>
					<Stack direction="row" spacing={2} flexWrap="wrap" mb={2}>
						<Chip label="Cron: 3:00 AM diario" color="info" size="small" />
						<Chip label="POST /api/tasas/rellenar-gaps" color="info" size="small" variant="outlined" />
						<Chip label="?tipoTasa= (opcional)" color="default" size="small" variant="outlined" />
					</Stack>
					<Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
						<Typography variant="caption" fontFamily="monospace" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
							{"fillGapsForTasa(tipoTasa):\n\n  1. \u00bfEs tasa BCRA? (tasaPasivaBCRA / cer / icl)\n       \u2192 findMissingDataServiceBcra()   [BCRA API \u2014 hist\u00f3rico completo]\n       \u2192 FIN\n\n  2. \u00bfEst\u00e1 en CPACF_TASA_MAP?\n       a. Si bnaCompatible=true:\n            \u2192 actualizarTasaEspecifica()   [BNA Web \u2014 dato del d\u00eda]\n       b. \u00bfQuedan gaps?\n            \u2192 findMissingDataColegio()     [CPACF Puppeteer \u2014 hist\u00f3rico]\n       \u2192 FIN\n\n  3. Tasa no soportada \u2192 omite"}
						</Typography>
					</Box>
					<Divider sx={{ my: 2 }} />
					<Typography variant="subtitle2" gutterBottom>Extracción CPACF — campos disponibles por tasa</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Tasa</TableCell>
									<TableCell>Modelo</TableCell>
									<TableCell align="center">% Diario</TableCell>
									<TableCell align="center">% Mensual</TableCell>
									<TableCell align="center">% Anual</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{[
									{ tasa: "tasaActivaBNA / tasaPasivaBNA",          modelo: "M1", diario: true, mensual: true,  anual: true },
									{ tasa: "tasaActivaCNAT2764",                     modelo: "M2", diario: true, mensual: false, anual: true },
									{ tasa: "tasaActivaCNAT2658 / tasaActivaTnaBNA",  modelo: "M3", diario: true, mensual: false, anual: true },
								].map((r) => (
									<TableRow key={r.tasa} hover>
										<TableCell><code>{r.tasa}</code></TableCell>
										<TableCell>{r.modelo}</TableCell>
										<TableCell align="center">
											<Chip label={r.diario ? "✓" : "✗"} color={r.diario ? "success" : "error"} size="small" />
										</TableCell>
										<TableCell align="center">
											<Chip label={r.mensual ? "✓" : "✗"} color={r.mensual ? "success" : "default"} size="small" />
										</TableCell>
										<TableCell align="center">
											<Chip label={r.anual ? "✓" : "✗"} color={r.anual ? "success" : "error"} size="small" />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
						Fallback de valor diario: porcentaje_diario → mensual / 30.4167 → anual / 365
					</Typography>
				</Card>

				<Card sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>Crons registrados</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Task ID</TableCell>
									<TableCell>Horario</TableCell>
									<TableCell>Descripción</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{[
									{ id: "bna-tasa-activa",               hora: "06:00 AM", desc: "Scraping diario BNA — tasas activas BNA/CNAT" },
									{ id: "bcra-tasa-pasiva-faltantes",     hora: "variable", desc: "Gap filler BCRA — tasaPasivaBCRA via API" },
									{ id: "cpacf-gap-filler",               hora: "03:00 AM", desc: "Gap filler global — nativo primero, CPACF fallback" },
									{ id: "verificacion-tasas-actualizadas",hora: "09:00 AM", desc: "Verificación y alerta email si tasas desactualizadas" },
								].map((r) => (
									<TableRow key={r.id} hover>
										<TableCell><code>{r.id}</code></TableCell>
										<TableCell>
											<Chip label={r.hora} size="small" color="info" variant="outlined" />
										</TableCell>
										<TableCell>
											<Typography variant="body2" color="text.secondary">{r.desc}</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Card>

			</Stack>
		</TabPanel>
		</MainCard>
	);
};

export default TasasInteres;
