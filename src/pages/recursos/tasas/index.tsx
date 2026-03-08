import { useState, useEffect, SyntheticEvent } from "react";
import {
	Box,
	Card,
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
} from "@mui/material";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { Refresh, SearchNormal1, Edit, CloseCircle, TickCircle, Chart } from "iconsax-react";
import { getTasasListado, consultarTasas, actualizarValorTasa, TasaConfig, TasaResultItem } from "utils/tasasService";

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

	// Inline editing
	const [editingRow, setEditingRow] = useState<string | null>(null);
	const [editValue, setEditValue] = useState<string>("");
	const [savingRow, setSavingRow] = useState<string | null>(null);

	// ── Load listado on mount ────────────────────────────────────────────────

	const fetchListado = async () => {
		try {
			setLoadingListado(true);
			const data = await getTasasListado();
			setListado(data);
			if (data.length > 0 && !campo) {
				setCampo(data[0].value);
			}
		} catch (error: unknown) {
			const err = error as { response?: { data?: { mensaje?: string } } };
			enqueueSnackbar(err?.response?.data?.mensaje || "Error al cargar las tasas", { variant: "error" });
		} finally {
			setLoadingListado(false);
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
			setResultados((prev) => prev.map((r) => (r.fecha === item.fecha ? { ...r, valor: nuevoValor } : r)));
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

	const selectedTasaLabel = listado.find((t) => t.value === campo)?.label || campo;

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
					<Box display="flex" justifyContent="flex-end">
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
										<TableRow key={tasa.value} hover>
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
								<FormControl fullWidth>
									<InputLabel>Tipo de Tasa</InputLabel>
									<Select value={campo} onChange={(e) => setCampo(e.target.value)} label="Tipo de Tasa">
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
								<Typography variant="h6">
									{selectedTasaLabel} — {resultados.length} registro{resultados.length !== 1 ? "s" : ""}
								</Typography>
							</Box>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Valor</TableCell>
										<TableCell align="center" sx={{ width: 100 }}>
											Acciones
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{resultados.map((item) => {
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
