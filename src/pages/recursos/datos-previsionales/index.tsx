import { useState, useEffect, useMemo, SyntheticEvent, useCallback } from "react";
import {
	Box,
	Card,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	TableSortLabel,
	Typography,
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
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Collapse,
	useTheme,
	alpha,
	Paper,
	Skeleton,
	Switch,
	FormControlLabel,
	Divider,
} from "@mui/material";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import {
	Refresh,
	Edit,
	CloseCircle,
	TickCircle,
	DocumentText,
	Calendar,
	Chart,
	Add,
	ArrowDown2,
	ArrowUp2,
	Warning2,
} from "iconsax-react";
import {
	getListado,
	getStats,
	getCoverage,
	getYears,
	getMissing,
	updateById,
	create,
	toggleEstado,
	DatoPrevisional,
	CoverageEntry,
	Stats,
	YearEntry,
} from "utils/datosPrevsionalesService";

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
	return (
		<div role="tabpanel" hidden={value !== index}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const CAMPOS_NUMERICOS: { key: keyof DatoPrevisional; label: string }[] = [
	{ key: "maximoImponible", label: "Máx. Imponible" },
	{ key: "haberMinimoJubilacion", label: "Haber Mín. Jub." },
	{ key: "haberMaximoJubilacion", label: "Haber Máx. Jub." },
	{ key: "haberMinimoPension", label: "Haber Mín. Pens." },
	{ key: "haberMaximoPension", label: "Haber Máx. Pens." },
	{ key: "pbu", label: "PBU" },
	{ key: "salarioMVM", label: "Salario MVM" },
	{ key: "movilidadGeneral", label: "Movilidad Gral." },
	{ key: "suplemento82SMVM", label: "Supl. 82% SMVM" },
	{ key: "topePC", label: "Tope PC" },
	{ key: "haberGeneralBrigada", label: "Haber Gral. Brigada" },
	{ key: "minimoFerroviario406", label: "Mín. Ferroviario 406" },
	{ key: "minimoFerroviario662", label: "Mín. Ferroviario 662" },
	{ key: "valorAMPOoMOPRE", label: "AMPO/MOPRE" },
	{ key: "referenciaDiferencialMin", label: "Ref. Dif. Mín." },
	{ key: "referenciaDiferencialMax", label: "Ref. Dif. Máx." },
	{ key: "movilidadDiferencial", label: "Movilidad Dif." },
	{ key: "adicionales", label: "Adicionales" },
];

const CAMPOS_CALCULABLES: (keyof DatoPrevisional)[] = [
	"maximoImponible",
	"haberMaximoJubilacion",
	"haberMaximoPension",
	"haberMinimoJubilacion",
	"haberMinimoPension",
	"pbu",
	"topePC",
];

const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return "—";
	const d = new Date(dateStr);
	return d.toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });
};

const formatMonthYear = (dateStr: string): string => {
	const d = new Date(dateStr);
	return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const formatNum = (v: number | null | undefined): string => {
	if (v == null || v === 0) return "—";
	return v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Formulario de edición / creación ─────────────────────────────────────────

interface EditDialogProps {
	open: boolean;
	doc: DatoPrevisional | null;
	missingDate?: string | null; // para crear
	onClose: () => void;
	onSave: (id: string | null, data: Partial<DatoPrevisional>) => Promise<void>;
}

const EditDialog = ({ open, doc, missingDate, onClose, onSave }: EditDialogProps) => {
	const isNew = !doc;
	const theme = useTheme();
	const [form, setForm] = useState<Partial<DatoPrevisional>>({});
	const [saving, setSaving] = useState(false);
	const [autoCalc, setAutoCalc] = useState(false);
	const [prevDoc, setPrevDoc] = useState<DatoPrevisional | null>(null);
	const [loadingPrev, setLoadingPrev] = useState(false);

	useEffect(() => {
		if (doc) {
			setForm({ ...doc });
		} else if (missingDate) {
			setForm({ fecha: missingDate, estado: true, moneda: "pesos", movilidadGeneral: 1, movilidadDiferencial: 1 });
		} else {
			setForm({ estado: true, moneda: "pesos", movilidadGeneral: 1, movilidadDiferencial: 1 });
		}
		setAutoCalc(false);
		setPrevDoc(null);
	}, [doc, missingDate, open]);

	const prevMesLabel = useMemo(() => {
		if (!form.fecha) return "";
		const d = new Date(form.fecha);
		const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
		return `${MESES[prev.getUTCMonth()]} ${prev.getUTCFullYear()}`;
	}, [form.fecha]);

	const fetchPrevDoc = async (fecha: string): Promise<DatoPrevisional | null> => {
		const d = new Date(fecha);
		const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
		const prevAnio = prev.getUTCFullYear();
		const prevMes = prev.getUTCMonth();
		setLoadingPrev(true);
		try {
			const { data } = await getListado({ anio: prevAnio, limit: 12, sortField: "fecha", sortDir: "asc" });
			const match = data.find((r) => {
				const fd = new Date(r.fecha);
				return fd.getUTCFullYear() === prevAnio && fd.getUTCMonth() === prevMes;
			}) ?? null;
			setPrevDoc(match);
			return match;
		} finally {
			setLoadingPrev(false);
		}
	};

	const calcularDesde = (prev: DatoPrevisional, movilidad: number): Partial<DatoPrevisional> => {
		const updates: Record<string, number> = {};
		for (const campo of CAMPOS_CALCULABLES) {
			const prevVal = prev[campo] as number | undefined;
			if (prevVal != null && prevVal !== 0) {
				updates[campo] = Math.round(prevVal * movilidad * 100) / 100;
			}
		}
		return updates as Partial<DatoPrevisional>;
	};

	const handleAutoCalcToggle = async (checked: boolean) => {
		setAutoCalc(checked);
		if (checked && form.fecha) {
			const prev = await fetchPrevDoc(form.fecha);
			if (prev && form.movilidadGeneral && form.movilidadGeneral !== 1) {
				setForm((f) => ({ ...f, ...calcularDesde(prev, form.movilidadGeneral!) }));
			}
		}
	};

	const handleMovilidadChange = (rawValue: string) => {
		const value = parseFloat(rawValue) || 0;
		if (autoCalc && prevDoc && value !== 0) {
			setForm((f) => ({ ...f, movilidadGeneral: value, ...calcularDesde(prevDoc, value) }));
		} else {
			setForm((f) => ({ ...f, movilidadGeneral: value }));
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await onSave(doc?._id ?? null, form);
			onClose();
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>{isNew ? "Nuevo registro mensual" : `Editar — ${doc ? formatMonthYear(doc.fecha) : ""}`}</DialogTitle>
			<DialogContent dividers>
				<Grid container spacing={2}>
					{isNew && (
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Fecha (YYYY-MM-DD)"
								value={form.fecha ?? ""}
								onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
								helperText="Se normalizará al 1° del mes"
								size="small"
							/>
						</Grid>
					)}
					<Grid item xs={12} sm={isNew ? 6 : 12}>
						<FormControl fullWidth size="small">
							<InputLabel>Moneda</InputLabel>
							<Select
								value={form.moneda ?? "pesos"}
								label="Moneda"
								onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value as "australes" | "pesos" }))}
							>
								<MenuItem value="pesos">Pesos</MenuItem>
								<MenuItem value="australes">Australes</MenuItem>
							</Select>
						</FormControl>
					</Grid>

					{/* Recálculo automático — solo para nuevos registros */}
					{isNew && (
						<Grid item xs={12}>
							<Divider sx={{ mb: 1 }} />
							<Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
								<FormControlLabel
									control={
										<Switch
											checked={autoCalc}
											onChange={(e) => handleAutoCalcToggle(e.target.checked)}
											disabled={loadingPrev || !form.fecha}
											size="small"
										/>
									}
									label={
										<Typography variant="body2">
											Recalcular desde mes anterior{form.fecha ? ` (${prevMesLabel})` : ""}
										</Typography>
									}
								/>
								{loadingPrev && <CircularProgress size={16} />}
								{autoCalc && !prevDoc && !loadingPrev && (
									<Typography variant="caption" color="error">
										No se encontró registro para {prevMesLabel}
									</Typography>
								)}
								{autoCalc && prevDoc && (
									<Chip label={`Base: ${prevMesLabel}`} size="small" color="info" variant="outlined" />
								)}
							</Stack>
							{autoCalc && prevDoc && (
								<Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: "0.78rem" }}>
									Los campos marcados <strong>✦</strong> se calculan como{" "}
									<strong>valor anterior × Movilidad General</strong>. Podés editarlos manualmente.
								</Alert>
							)}
						</Grid>
					)}

					{CAMPOS_NUMERICOS.map(({ key, label }) => {
						const isCalculable = isNew && autoCalc && prevDoc && CAMPOS_CALCULABLES.includes(key as keyof DatoPrevisional);
						const isMovilidad = key === "movilidadGeneral";
						return (
							<Grid item xs={12} sm={6} md={4} key={key}>
								<TextField
									fullWidth
									size="small"
									label={isCalculable ? `${label} ✦` : isMovilidad && autoCalc ? `${label} ★` : label}
									type="number"
									inputProps={{ step: "any" }}
									value={form[key] ?? ""}
									onChange={(e) => {
										if (isMovilidad) {
											handleMovilidadChange(e.target.value);
										} else {
											setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }));
										}
									}}
									sx={isCalculable ? { "& .MuiOutlinedInput-root": { bgcolor: alpha(theme.palette.info.main, 0.05) } } : undefined}
									helperText={isCalculable && prevDoc ? `Anterior: ${formatNum(prevDoc[key as keyof DatoPrevisional] as number)}` : undefined}
								/>
							</Grid>
						);
					})}
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={14} /> : undefined}>
					{isNew ? "Crear" : "Guardar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ─── JSON viewer dialog ────────────────────────────────────────────────────────

const JsonDialog = ({ open, doc, onClose }: { open: boolean; doc: DatoPrevisional | null; onClose: () => void }) => {
	const { enqueueSnackbar } = useSnackbar();
	const json = useMemo(() => (doc ? JSON.stringify(doc, null, 2) : ""), [doc]);
	const handleCopy = () => {
		navigator.clipboard.writeText(json);
		enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
	};
	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<span>JSON — {doc ? formatMonthYear(doc.fecha) : ""}</span>
					<Button size="small" onClick={handleCopy}>
						Copiar
					</Button>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Box
					component="pre"
					sx={{
						fontFamily: "monospace",
						fontSize: "0.78rem",
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						bgcolor: "action.hover",
						p: 2,
						borderRadius: 1,
						m: 0,
					}}
				>
					{json}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
};

// ─── Coverage grid ─────────────────────────────────────────────────────────────

const CoverageGrid = ({
	coverage,
	loading,
	onAddMissing,
}: {
	coverage: CoverageEntry[];
	loading: boolean;
	onAddMissing: (fecha: string) => void;
}) => {
	const theme = useTheme();
	const [anioDesde, setAnioDesde] = useState<number>(2015);
	const [anioHasta, setAnioHasta] = useState<number>(new Date().getUTCFullYear());

	const anios = coverage.map((c) => c.anio);
	const minAnio = anios[0] ?? 1955;
	const maxAnio = anios[anios.length - 1] ?? new Date().getUTCFullYear();

	const filtered = coverage.filter((c) => c.anio >= anioDesde && c.anio <= anioHasta);
	const totalFaltantes = filtered.reduce((s, c) => s + c.faltantes, 0);

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
				<Typography variant="body2" color="text.secondary">
					Filtrar años:
				</Typography>
				<FormControl size="small" sx={{ minWidth: 100 }}>
					<InputLabel>Desde</InputLabel>
					<Select value={anioDesde} label="Desde" onChange={(e) => setAnioDesde(Number(e.target.value))}>
						{Array.from({ length: maxAnio - minAnio + 1 }, (_, i) => minAnio + i).map((a) => (
							<MenuItem key={a} value={a}>
								{a}
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 100 }}>
					<InputLabel>Hasta</InputLabel>
					<Select value={anioHasta} label="Hasta" onChange={(e) => setAnioHasta(Number(e.target.value))}>
						{Array.from({ length: maxAnio - minAnio + 1 }, (_, i) => minAnio + i).map((a) => (
							<MenuItem key={a} value={a}>
								{a}
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<Button
					size="small"
					variant="outlined"
					onClick={() => {
						setAnioDesde(minAnio);
						setAnioHasta(maxAnio);
					}}
				>
					Ver todo
				</Button>
				{totalFaltantes > 0 && (
					<Chip label={`${totalFaltantes} mes${totalFaltantes !== 1 ? "es" : ""} faltante${totalFaltantes !== 1 ? "s" : ""}`} color="error" size="small" />
				)}
			</Stack>

			{loading ? (
				<Box display="flex" justifyContent="center" py={4}>
					<CircularProgress />
				</Box>
			) : (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small" sx={{ minWidth: 700 }}>
						<TableHead>
							<TableRow>
								<TableCell sx={{ fontWeight: 700, minWidth: 60 }}>Año</TableCell>
								{MESES.map((m) => (
									<TableCell key={m} align="center" sx={{ fontWeight: 600, px: 0.5, minWidth: 36 }}>
										{m}
									</TableCell>
								))}
								<TableCell align="center" sx={{ fontWeight: 600 }}>
									Estado
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{filtered.map((row) => (
								<TableRow key={row.anio} hover>
									<TableCell sx={{ fontWeight: 600, fontSize: "0.8rem" }}>{row.anio}</TableCell>
									{row.meses.map((presente, idx) => {
										const fecha = new Date(Date.UTC(row.anio, idx, 1)).toISOString().split("T")[0];
										return (
											<TableCell key={idx} align="center" sx={{ px: 0.5, py: 0.75 }}>
												{presente ? (
													<Box
														sx={{
															width: 22,
															height: 22,
															borderRadius: 0.5,
															bgcolor: alpha(theme.palette.success.main, 0.7),
															mx: "auto",
														}}
													/>
												) : (
													<Tooltip title={`Agregar ${MESES[idx]} ${row.anio}`}>
														<Box
															onClick={() => onAddMissing(fecha)}
															sx={{
																width: 22,
																height: 22,
																borderRadius: 0.5,
																bgcolor: alpha(theme.palette.error.main, 0.15),
																border: `1px solid ${theme.palette.error.light}`,
																mx: "auto",
																cursor: "pointer",
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																"&:hover": { bgcolor: alpha(theme.palette.error.main, 0.3) },
															}}
														>
															<Add size={12} color={theme.palette.error.main} />
														</Box>
													</Tooltip>
												)}
											</TableCell>
										);
									})}
									<TableCell align="center">
										{row.completo ? (
											<Chip label="12/12" color="success" size="small" />
										) : (
											<Chip label={`${12 - row.faltantes}/12`} color={row.faltantes > 3 ? "error" : "warning"} size="small" />
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			)}
			<Stack direction="row" spacing={2} alignItems="center" mt={1}>
				<Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: alpha(theme.palette.success.main, 0.7) }} />
				<Typography variant="caption" color="text.secondary">
					Presente
				</Typography>
				<Box
					sx={{
						width: 16,
						height: 16,
						borderRadius: 0.5,
						bgcolor: alpha(theme.palette.error.main, 0.15),
						border: `1px solid ${theme.palette.error.light}`,
					}}
				/>
				<Typography variant="caption" color="text.secondary">
					Faltante (click para agregar)
				</Typography>
			</Stack>
		</Stack>
	);
};

// ─── Main component ───────────────────────────────────────────────────────────

const DatosPrevisionales = () => {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();

	// Tabs
	const [tabValue, setTabValue] = useState(0);

	// Stats
	const [stats, setStats] = useState<Stats | null>(null);
	const [loadingStats, setLoadingStats] = useState(false);

	// Listado
	const [rows, setRows] = useState<DatoPrevisional[]>([]);
	const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, pages: 1 });
	const [loadingList, setLoadingList] = useState(false);
	const [filterAnio, setFilterAnio] = useState<number | "">("");
	const [filterMoneda, setFilterMoneda] = useState<"" | "australes" | "pesos">("");
	const [sortField, setSortField] = useState("fecha");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [years, setYears] = useState<YearEntry[]>([]);

	// Cobertura
	const [coverage, setCoverage] = useState<CoverageEntry[]>([]);
	const [loadingCoverage, setLoadingCoverage] = useState(false);

	// Expandir fila
	const [expandedRow, setExpandedRow] = useState<string | null>(null);

	// Dialogs
	const [editDoc, setEditDoc] = useState<DatoPrevisional | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [jsonDoc, setJsonDoc] = useState<DatoPrevisional | null>(null);
	const [jsonOpen, setJsonOpen] = useState(false);
	const [missingDate, setMissingDate] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);

	// ── Fetch ────────────────────────────────────────────────────────────────

	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const data = await getStats();
			setStats(data);
		} catch {
			enqueueSnackbar("Error al cargar estadísticas", { variant: "error" });
		} finally {
			setLoadingStats(false);
		}
	}, [enqueueSnackbar]);

	const fetchYears = useCallback(async () => {
		try {
			const data = await getYears();
			setYears(data);
		} catch {
			// silencioso
		}
	}, []);

	const fetchList = useCallback(
		async (page = 1) => {
			try {
				setLoadingList(true);
				const { data, pagination: p } = await getListado({
					page,
					limit: pagination.limit,
					anio: filterAnio || undefined,
					moneda: filterMoneda || undefined,
					sortField,
					sortDir,
				});
				setRows(data);
				setPagination(p);
			} catch {
				enqueueSnackbar("Error al cargar listado", { variant: "error" });
			} finally {
				setLoadingList(false);
			}
		},
		[pagination.limit, filterAnio, filterMoneda, sortField, sortDir, enqueueSnackbar],
	);

	const fetchCoverage = useCallback(async () => {
		try {
			setLoadingCoverage(true);
			const data = await getCoverage();
			setCoverage(data);
		} catch {
			enqueueSnackbar("Error al cargar cobertura", { variant: "error" });
		} finally {
			setLoadingCoverage(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
		fetchYears();
	}, [fetchStats, fetchYears]);

	useEffect(() => {
		if (tabValue === 0) fetchList(1);
	}, [tabValue, filterAnio, filterMoneda, sortField, sortDir]);

	useEffect(() => {
		if (tabValue === 1) fetchCoverage();
	}, [tabValue]);

	// ── Handlers ─────────────────────────────────────────────────────────────

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("desc");
		}
	};

	const handleSave = async (id: string | null, data: Partial<DatoPrevisional>) => {
		try {
			if (id) {
				await updateById(id, data);
				enqueueSnackbar("Registro actualizado", { variant: "success" });
			} else {
				await create(data as DatoPrevisional & { fecha: string });
				enqueueSnackbar("Registro creado", { variant: "success" });
				fetchCoverage();
			}
			fetchList(pagination.page);
			fetchStats();
		} catch (err: unknown) {
			const e = err as { response?: { data?: { message?: string } } };
			enqueueSnackbar(e?.response?.data?.message ?? "Error al guardar", { variant: "error" });
			throw err;
		}
	};

	const handleToggle = async (id: string) => {
		try {
			await toggleEstado(id);
			setRows((prev) => prev.map((r) => (r._id === id ? { ...r, estado: !r.estado } : r)));
			enqueueSnackbar("Estado actualizado", { variant: "success" });
		} catch {
			enqueueSnackbar("Error al cambiar estado", { variant: "error" });
		}
	};

	const handleAddMissing = (fecha: string) => {
		setMissingDate(fecha);
		setCreateOpen(true);
	};

	// ── Render ───────────────────────────────────────────────────────────────

	return (
		<MainCard title="Datos Previsionales" secondary={<DocumentText size={24} />}>
			{/* Stats bar */}
			<Grid container spacing={2} sx={{ mb: 2 }}>
				{[
					{
						label: "Total registros",
						value: loadingStats ? null : stats?.total ?? 0,
						color: theme.palette.primary.main,
					},
					{
						label: "Meses faltantes",
						value: loadingStats ? null : stats?.mesesFaltantes ?? 0,
						color: (stats?.mesesFaltantes ?? 0) > 0 ? theme.palette.error.main : theme.palette.success.main,
					},
					{
						label: "Desde",
						value: loadingStats ? null : stats?.fechaInicio ? formatDate(stats.fechaInicio) : "—",
						color: theme.palette.text.primary,
					},
					{
						label: "Hasta",
						value: loadingStats ? null : stats?.fechaUltima ? formatDate(stats.fechaUltima) : "—",
						color: theme.palette.text.primary,
					},
				].map((s) => (
					<Grid item xs={6} sm={3} key={s.label}>
						<Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, textAlign: "center" }}>
							<Typography variant="caption" color="text.secondary" display="block">
								{s.label}
							</Typography>
							{s.value === null ? (
								<Skeleton variant="text" height={36} sx={{ mx: "auto", width: 80 }} />
							) : (
								<Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>
									{s.value}
								</Typography>
							)}
						</Paper>
					</Grid>
				))}
			</Grid>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={tabValue} onChange={(_e: SyntheticEvent, v: number) => setTabValue(v)}>
					<Tab label="Listado" icon={<DocumentText size={16} />} iconPosition="start" />
					<Tab
						label="Cobertura"
						icon={<Calendar size={16} />}
						iconPosition="start"
						sx={{ "& .MuiTab-iconWrapper": { mr: 0.5 } }}
					/>
					<Tab label="Estadísticas" icon={<Chart size={16} />} iconPosition="start" />
				</Tabs>
			</Box>

			{/* ══════════════════════════════════════════════════════════════
			    TAB 0 — LISTADO
			══════════════════════════════════════════════════════════════ */}
			<TabPanel value={tabValue} index={0}>
				<Stack spacing={2}>
					{/* Filtros */}
					<Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" justifyContent="space-between">
						<Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
							<FormControl size="small" sx={{ minWidth: 120 }}>
								<InputLabel>Año</InputLabel>
								<Select
									value={filterAnio}
									label="Año"
									onChange={(e) => setFilterAnio(e.target.value === "" ? "" : Number(e.target.value))}
								>
									<MenuItem value="">Todos</MenuItem>
									{years.map((y) => (
										<MenuItem key={y.anio} value={y.anio}>
											{y.anio} {!y.completo && <Warning2 size={12} style={{ marginLeft: 4, color: theme.palette.warning.main }} />}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 130 }}>
								<InputLabel>Moneda</InputLabel>
								<Select value={filterMoneda} label="Moneda" onChange={(e) => setFilterMoneda(e.target.value as "" | "australes" | "pesos")}>
									<MenuItem value="">Todas</MenuItem>
									<MenuItem value="pesos">Pesos</MenuItem>
									<MenuItem value="australes">Australes</MenuItem>
								</Select>
							</FormControl>
						</Stack>
						<Stack direction="row" spacing={1}>
							<Button
								variant="outlined"
								size="small"
								startIcon={<Add size={15} />}
								onClick={() => {
									setMissingDate(null);
									setCreateOpen(true);
								}}
							>
								Nuevo
							</Button>
							<Tooltip title="Refrescar">
								<IconButton size="small" onClick={() => { fetchList(1); fetchStats(); }} disabled={loadingList}>
									<Refresh size={18} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Stack>

					{loadingList ? (
						<Box display="flex" justifyContent="center" py={6}>
							<CircularProgress />
						</Box>
					) : rows.length === 0 ? (
						<Alert severity="info">No se encontraron registros.</Alert>
					) : (
						<Card>
							<TableContainer>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell sx={{ width: 32 }} />
											<TableCell>
												<TableSortLabel
													active={sortField === "fecha"}
													direction={sortField === "fecha" ? sortDir : "asc"}
													onClick={() => handleSort("fecha")}
												>
													Período
												</TableSortLabel>
											</TableCell>
											<TableCell>Moneda</TableCell>
											{["maximoImponible", "haberMinimoJubilacion", "haberMaximoJubilacion", "pbu", "salarioMVM", "movilidadGeneral"].map((f) => {
												const meta = CAMPOS_NUMERICOS.find((c) => c.key === f)!;
												return (
													<TableCell key={f} align="right">
														<TableSortLabel
															active={sortField === f}
															direction={sortField === f ? sortDir : "asc"}
															onClick={() => handleSort(f)}
														>
															{meta.label}
														</TableSortLabel>
													</TableCell>
												);
											})}
											<TableCell align="center">Estado</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{rows.map((row) => (
											<>
												<TableRow
													key={row._id}
													hover
													sx={{ "& td": { borderBottom: expandedRow === row._id ? "none" : undefined } }}
												>
													<TableCell sx={{ py: 0 }}>
														<IconButton
															size="small"
															onClick={() => setExpandedRow((v) => (v === row._id ? null : row._id))}
														>
															{expandedRow === row._id ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
														</IconButton>
													</TableCell>
													<TableCell>
														<Typography variant="body2" fontWeight={600}>
															{formatMonthYear(row.fecha)}
														</Typography>
														<Typography variant="caption" color="text.secondary">
															{formatDate(row.fecha)}
														</Typography>
													</TableCell>
													<TableCell>
														<Chip
															label={row.moneda}
															size="small"
															color={row.moneda === "pesos" ? "primary" : "secondary"}
															variant="outlined"
															sx={{ fontSize: "0.7rem" }}
														/>
													</TableCell>
													{["maximoImponible", "haberMinimoJubilacion", "haberMaximoJubilacion", "pbu", "salarioMVM", "movilidadGeneral"].map((f) => (
														<TableCell key={f} align="right" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
															{formatNum(row[f as keyof DatoPrevisional] as number)}
														</TableCell>
													))}
													<TableCell align="center">
														<Chip
															label={row.estado ? "Activo" : "Inactivo"}
															color={row.estado ? "success" : "default"}
															size="small"
															onClick={() => handleToggle(row._id)}
															sx={{ cursor: "pointer", fontSize: "0.65rem" }}
														/>
													</TableCell>
													<TableCell align="center">
														<Stack direction="row" spacing={0.5} justifyContent="center">
															<Tooltip title="Editar">
																<IconButton
																	size="small"
																	color="primary"
																	onClick={() => {
																		setEditDoc(row);
																		setEditOpen(true);
																	}}
																>
																	<Edit size={15} />
																</IconButton>
															</Tooltip>
															<Tooltip title="Ver JSON">
																<IconButton
																	size="small"
																	color="default"
																	onClick={() => {
																		setJsonDoc(row);
																		setJsonOpen(true);
																	}}
																>
																	<DocumentText size={15} />
																</IconButton>
															</Tooltip>
														</Stack>
													</TableCell>
												</TableRow>

												{/* Fila expandida — todos los campos */}
												<TableRow key={`exp-${row._id}`}>
													<TableCell colSpan={9} sx={{ py: 0, border: expandedRow === row._id ? undefined : "none" }}>
														<Collapse in={expandedRow === row._id} unmountOnExit>
															<Box sx={{ px: 4, py: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
																<Grid container spacing={1.5}>
																	{CAMPOS_NUMERICOS.map(({ key, label }) => (
																		<Grid item xs={6} sm={4} md={3} key={key}>
																			<Stack>
																				<Typography variant="caption" color="text.secondary">
																					{label}
																				</Typography>
																				<Typography variant="body2" fontFamily="monospace" fontWeight={600}>
																					{formatNum(row[key] as number)}
																				</Typography>
																			</Stack>
																		</Grid>
																	))}
																	<Grid item xs={6} sm={4} md={3}>
																		<Stack>
																			<Typography variant="caption" color="text.secondary">
																				SupMovilidad
																			</Typography>
																			<Chip
																				label={row.SupMovilidad ? "Sí" : "No"}
																				size="small"
																				color={row.SupMovilidad ? "info" : "default"}
																				sx={{ alignSelf: "flex-start" }}
																			/>
																		</Stack>
																	</Grid>
																</Grid>
															</Box>
														</Collapse>
													</TableCell>
												</TableRow>
											</>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<TablePagination
								component="div"
								count={pagination.total}
								page={pagination.page - 1}
								rowsPerPage={pagination.limit}
								rowsPerPageOptions={[25, 50, 100]}
								onPageChange={(_e, p) => fetchList(p + 1)}
								onRowsPerPageChange={(e) => {
									setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }));
								}}
								labelRowsPerPage="Filas:"
								labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
							/>
						</Card>
					)}
				</Stack>
			</TabPanel>

			{/* ══════════════════════════════════════════════════════════════
			    TAB 1 — COBERTURA
			══════════════════════════════════════════════════════════════ */}
			<TabPanel value={tabValue} index={1}>
				<Card sx={{ p: 2 }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
						<Typography variant="h6">Cobertura mensual por año</Typography>
						<Tooltip title="Refrescar">
							<IconButton size="small" onClick={fetchCoverage} disabled={loadingCoverage}>
								<Refresh size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
					<CoverageGrid coverage={coverage} loading={loadingCoverage} onAddMissing={handleAddMissing} />
				</Card>
			</TabPanel>

			{/* ══════════════════════════════════════════════════════════════
			    TAB 2 — ESTADÍSTICAS
			══════════════════════════════════════════════════════════════ */}
			<TabPanel value={tabValue} index={2}>
				<Grid container spacing={2}>
					<Grid item xs={12} md={6}>
						<Card sx={{ p: 3 }}>
							<Typography variant="h6" gutterBottom>
								Breakdown por moneda
							</Typography>
							{loadingStats ? (
								<CircularProgress size={24} />
							) : (
								<Stack spacing={1.5} mt={1}>
									{stats?.porMoneda.map((m) => (
										<Box key={m._id}>
											<Stack direction="row" justifyContent="space-between">
												<Typography variant="body2" fontWeight={600} textTransform="capitalize">
													{m._id}
												</Typography>
												<Chip label={`${m.count} registros`} size="small" />
											</Stack>
											<Typography variant="caption" color="text.secondary">
												{formatDate(m.desde)} → {formatDate(m.hasta)}
											</Typography>
										</Box>
									))}
								</Stack>
							)}
						</Card>
					</Grid>
					<Grid item xs={12} md={6}>
						<Card sx={{ p: 3 }}>
							<Typography variant="h6" gutterBottom>
								Cobertura por año (resumen)
							</Typography>
							<Box sx={{ maxHeight: 340, overflowY: "auto" }}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Año</TableCell>
											<TableCell align="center">Meses</TableCell>
											<TableCell align="center">Estado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{years.map((y) => (
											<TableRow key={y.anio} hover>
												<TableCell>{y.anio}</TableCell>
												<TableCell align="center">{y.count}/12</TableCell>
												<TableCell align="center">
													<Chip
														label={y.completo ? "Completo" : `Faltan ${12 - y.count}`}
														color={y.completo ? "success" : y.count >= 10 ? "warning" : "error"}
														size="small"
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Box>
						</Card>
					</Grid>
					<Grid item xs={12}>
						<Card sx={{ p: 3 }}>
							<Typography variant="h6" gutterBottom>
								Campos del documento
							</Typography>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Cada documento representa un mes. Los valores son montos en la moneda vigente del período.
							</Typography>
							<Grid container spacing={1} mt={0.5}>
								{CAMPOS_NUMERICOS.map(({ key, label }) => (
									<Grid item xs={12} sm={6} md={4} key={key}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
											<Typography variant="caption">
												<strong>{label}</strong>{" "}
												<Typography component="span" variant="caption" color="text.secondary">
													({key})
												</Typography>
											</Typography>
										</Stack>
									</Grid>
								))}
							</Grid>
						</Card>
					</Grid>
				</Grid>
			</TabPanel>

			{/* ── Dialogs ───────────────────────────────────────────────── */}
			<EditDialog
				open={editOpen}
				doc={editDoc}
				onClose={() => {
					setEditOpen(false);
					setEditDoc(null);
				}}
				onSave={handleSave}
			/>
			<EditDialog
				open={createOpen}
				doc={null}
				missingDate={missingDate ?? undefined}
				onClose={() => {
					setCreateOpen(false);
					setMissingDate(null);
				}}
				onSave={handleSave}
			/>
			<JsonDialog
				open={jsonOpen}
				doc={jsonDoc}
				onClose={() => {
					setJsonOpen(false);
					setJsonDoc(null);
				}}
			/>
		</MainCard>
	);
};

export default DatosPrevisionales;
