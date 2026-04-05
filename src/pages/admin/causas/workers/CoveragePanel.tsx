import React, { useState, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Button,
	Card,
	CardContent,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	Alert,
	Tooltip,
	LinearProgress,
	Tabs,
	Tab,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	CircularProgress,
	Divider,
	FormControlLabel,
	Checkbox,
} from "@mui/material";
import { Refresh, AddCircle, TickCircle, Warning2, SearchNormal1, Flash, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, ScrapingCoverageData, CoverageGap, WorkerConfig } from "api/workers";
import CreateConfigModal from "./CreateConfigModal";

const FUERO_OPTIONS = [
	{ value: "CIV", label: "Civil" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
	{ value: "COM", label: "Comercial" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2015 + 1 }, (_, i) => String(CURRENT_YEAR - i));

const FUERO_COLORS: Record<string, string> = {
	CIV: "#1976d2",
	CSS: "#388e3c",
	CNT: "#f57c00",
	COM: "#7b1fa2",
};

const calculateProgress = (config: WorkerConfig): number => {
	if (!config.range_start || !config.range_end || !config.number) return 0;
	const total = config.range_end - config.range_start;
	const current = config.number - config.range_start;
	return Math.min(100, Math.max(0, (current / total) * 100));
};

const getConfigId = (config: WorkerConfig): string => {
	if (typeof config._id === "string") return config._id;
	return (config._id as { $oid: string }).$oid;
};

// ─── Barra visual de cobertura segmentada ────────────────────────────────────
const CoverageBar: React.FC<{ data: ScrapingCoverageData }> = ({ data }) => {
	const { coveredRanges, gaps, maxRange, activeWorkers } = data;

	if (maxRange === 0) return null;

	type Segment = { type: "covered" | "gap-free" | "gap-assigned" | "active"; start: number; end: number; workerId?: string | null };

	const segments: Segment[] = [];

	const allSegments: Segment[] = [
		...coveredRanges.map(r => ({ type: "covered" as const, start: r.start, end: r.end })),
		...gaps.map(g => ({
			type: (g.assigned ? "gap-assigned" : "gap-free") as "gap-free" | "gap-assigned",
			start: g.start,
			end: g.end,
			workerId: g.workerId,
		})),
	];
	allSegments.sort((a, b) => a.start - b.start);

	for (const seg of allSegments) {
		const activeWorker = activeWorkers.find(w => w.range_start <= seg.end && w.range_end >= seg.start);
		if (activeWorker && seg.type !== "covered") {
			segments.push({ ...seg, type: "gap-assigned", workerId: activeWorker.worker_id });
		} else {
			segments.push(seg);
		}
	}

	const colorMap = {
		covered: "#2e7d32",
		"gap-free": "#d32f2f",
		"gap-assigned": "#ed6c02",
		active: "#1565c0",
	};

	return (
		<Box>
			<Typography variant="caption" color="text.secondary" gutterBottom>
				Cobertura visual (1 — {maxRange.toLocaleString()})
			</Typography>
			<Box
				sx={{
					display: "flex",
					height: 28,
					borderRadius: 1,
					overflow: "hidden",
					border: "1px solid",
					borderColor: "divider",
					mt: 0.5,
				}}
			>
				{segments.map((seg, i) => {
					const widthPct = ((seg.end - seg.start + 1) / maxRange) * 100;
					const label = `${seg.type === "covered" ? "Cubierto" : seg.type === "gap-free" ? "Sin cubrir" : "Asignado"}: ${seg.start.toLocaleString()} — ${seg.end.toLocaleString()}`;
					return (
						<Tooltip key={i} title={label} arrow>
							<Box
								sx={{
									width: `${Math.max(widthPct, 0.2)}%`,
									bgcolor: colorMap[seg.type],
									flexShrink: 0,
									borderRight: i < segments.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none",
									transition: "opacity 0.15s",
									"&:hover": { opacity: 0.8, cursor: "default" },
								}}
							/>
						</Tooltip>
					);
				})}
			</Box>
			<Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
				{[
					{ color: colorMap.covered, label: "Cubierto" },
					{ color: colorMap["gap-free"], label: "Sin cubrir" },
					{ color: colorMap["gap-assigned"], label: "Asignado (en curso)" },
				].map(({ color, label }) => (
					<Stack key={label} direction="row" alignItems="center" spacing={0.5}>
						<Box sx={{ width: 12, height: 12, borderRadius: "2px", bgcolor: color }} />
						<Typography variant="caption" color="text.secondary">
							{label}
						</Typography>
					</Stack>
				))}
			</Stack>
		</Box>
	);
};

// ─── Tipos para modo global ───────────────────────────────────────────────────
interface GlobalGap {
	fuero: string;
	year: string;
	gap: CoverageGap;
	suggestedWorkers: WorkerConfig[];
}

interface AssignDialogState {
	open: boolean;
	globalGap: GlobalGap | null;
	selectedWorkerId: string;
	enableWorker: boolean;
	loading: boolean;
}

// ─── Dialog de asignación automática ─────────────────────────────────────────
const AssignWorkerDialog: React.FC<{
	state: AssignDialogState;
	onClose: () => void;
	onWorkerSelect: (id: string) => void;
	onEnableChange: (v: boolean) => void;
	onConfirm: () => void;
}> = ({ state, onClose, onWorkerSelect, onEnableChange, onConfirm }) => {
	const { open, globalGap, selectedWorkerId, enableWorker, loading } = state;
	if (!globalGap) return null;

	const { fuero, year, gap, suggestedWorkers } = globalGap;

	return (
		<Dialog open={open} onClose={() => !loading && onClose()} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Stack direction="row" alignItems="center" spacing={1}>
					<Flash size={20} />
					<span>Asignar worker a período sin cobertura</span>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					{/* Detalle del gap */}
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
							<Typography variant="caption" color="text.secondary" gutterBottom>
								Período a cubrir
							</Typography>
							<Stack direction="row" spacing={2} flexWrap="wrap">
								<Box>
									<Typography variant="caption" color="text.secondary">Fuero</Typography>
									<Typography variant="body2" fontWeight={600}>
										<Box component="span" sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", bgcolor: FUERO_COLORS[fuero] ?? "#999", mr: 0.5 }} />
										{FUERO_OPTIONS.find(f => f.value === fuero)?.label ?? fuero}
									</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Año</Typography>
									<Typography variant="body2" fontWeight={600}>{year}</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Rango</Typography>
									<Typography variant="body2" fontFamily="monospace" fontWeight={600}>
										{gap.start.toLocaleString()} — {gap.end.toLocaleString()}
									</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Tamaño</Typography>
									<Typography variant="body2" fontWeight={600}>{gap.size.toLocaleString()}</Typography>
								</Box>
							</Stack>
						</CardContent>
					</Card>

					<Divider />

					{/* Selección de worker */}
					<Box>
						<Typography variant="subtitle2" gutterBottom>
							Workers disponibles ({suggestedWorkers.length})
						</Typography>
						{suggestedWorkers.length === 0 ? (
							<Alert severity="warning" variant="outlined">
								No hay workers completados al 100% disponibles para el fuero {fuero}.
								Podés crear una nueva configuración desde el modo individual.
							</Alert>
						) : (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell padding="checkbox" />
											<TableCell>Worker ID</TableCell>
											<TableCell>Año actual</TableCell>
											<TableCell align="right">Rango actual</TableCell>
											<TableCell align="right">Progreso</TableCell>
											<TableCell align="center">Estado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{suggestedWorkers.map(w => {
											const wId = getConfigId(w);
											const prog = calculateProgress(w);
											const selected = selectedWorkerId === wId;
											return (
												<TableRow
													key={wId}
													hover
													selected={selected}
													onClick={() => onWorkerSelect(wId)}
													sx={{ cursor: "pointer", bgcolor: selected ? "primary.lighter" : undefined }}
												>
													<TableCell padding="checkbox">
														<Box
															sx={{
																width: 16,
																height: 16,
																borderRadius: "50%",
																border: "2px solid",
																borderColor: selected ? "primary.main" : "divider",
																bgcolor: selected ? "primary.main" : "transparent",
																mx: "auto",
															}}
														/>
													</TableCell>
													<TableCell>
														<Typography variant="body2" fontFamily="monospace">{w.worker_id}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="body2">{w.year}</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography variant="caption" fontFamily="monospace">
															{(w.range_start ?? 0).toLocaleString()} — {(w.range_end ?? 0).toLocaleString()}
														</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography variant="body2" color="success.main" fontWeight={600}>
															{prog.toFixed(0)}%
														</Typography>
													</TableCell>
													<TableCell align="center">
														<Chip
															label={w.enabled ? "Habilitado" : "Deshabilitado"}
															size="small"
															color={w.enabled ? "success" : "default"}
															variant="outlined"
														/>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Box>

					{suggestedWorkers.length > 0 && (
						<>
							<Alert severity="info" variant="outlined">
								Se reasignará el rango del worker seleccionado a{" "}
								<strong>{gap.start.toLocaleString()} — {gap.end.toLocaleString()}</strong> para el año <strong>{year}</strong>.
								El worker comenzará a procesar desde el inicio del nuevo rango.
							</Alert>
							<FormControlLabel
								control={<Checkbox checked={enableWorker} onChange={e => onEnableChange(e.target.checked)} size="small" />}
								label={<Typography variant="body2">Habilitar worker automáticamente al asignar</Typography>}
							/>
						</>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>Cancelar</Button>
				<Button
					variant="contained"
					color="primary"
					onClick={onConfirm}
					disabled={loading || !selectedWorkerId || suggestedWorkers.length === 0}
					startIcon={loading ? <CircularProgress size={16} /> : <Flash size={16} />}
				>
					{loading ? "Asignando..." : "Confirmar asignación"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ─── Componente principal ─────────────────────────────────────────────────────
const CoveragePanel: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();

	// ── Modo: individual | global ──
	const [mode, setMode] = useState<"individual" | "global">("individual");

	// ── Estado modo individual ──
	const [fuero, setFuero] = useState<string>("CIV");
	const [year, setYear] = useState<string>(String(CURRENT_YEAR));
	const [loading, setLoading] = useState(false);
	const [coverage, setCoverage] = useState<ScrapingCoverageData | null>(null);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [selectedGap, setSelectedGap] = useState<CoverageGap | null>(null);

	// ── Estado modo global ──
	const [globalLoading, setGlobalLoading] = useState(false);
	const [globalGaps, setGlobalGaps] = useState<GlobalGap[]>([]);
	const [globalScanned, setGlobalScanned] = useState(false);
	const [globalScanInfo, setGlobalScanInfo] = useState<{ combos: number; freeWorkers: number } | null>(null);
	const [assignDialog, setAssignDialog] = useState<AssignDialogState>({
		open: false,
		globalGap: null,
		selectedWorkerId: "",
		enableWorker: true,
		loading: false,
	});

	// ── Handlers modo individual ──
	const fetchCoverage = useCallback(async () => {
		if (!fuero || !year) return;
		setLoading(true);
		try {
			const res = await WorkersService.getScrapingCoverage(fuero, year);
			if (res.success) {
				setCoverage(res.data);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al obtener cobertura", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [fuero, year, enqueueSnackbar]);

	const handleAssignGap = (gap: CoverageGap) => {
		setSelectedGap(gap);
		setCreateModalOpen(true);
	};

	const handleCreateSuccess = () => {
		setCreateModalOpen(false);
		setSelectedGap(null);
		fetchCoverage();
	};

	const freeGaps = coverage?.gaps.filter(g => !g.assigned) ?? [];
	const assignedGaps = coverage?.gaps.filter(g => g.assigned) ?? [];

	// ── Handlers modo global ──
	const handleGlobalScan = useCallback(async () => {
		setGlobalLoading(true);
		setGlobalGaps([]);
		setGlobalScanned(false);
		setGlobalScanInfo(null);

		try {
			// 1. Obtener todos los configs de scraping (buscar workers libres y combos fuero/año)
			const configsRes = await WorkersService.getScrapingConfigs({ limit: 500 });
			const allConfigs: WorkerConfig[] = Array.isArray(configsRes.data) ? configsRes.data : [configsRes.data as WorkerConfig];

			// 2. Workers libres = progreso 100%
			const freeWorkers = allConfigs.filter(c => calculateProgress(c) >= 100);

			// 3. Extraer combos únicos fuero/año
			const comboSet = new Set<string>();
			for (const c of allConfigs) {
				if (c.fuero && c.year) {
					comboSet.add(`${c.fuero}|${c.year}`);
				}
			}
			// Añadir también combos del año actual para cada fuero si no están
			for (const f of FUERO_OPTIONS) {
				comboSet.add(`${f.value}|${CURRENT_YEAR}`);
			}

			const combos = Array.from(comboSet).map(s => {
				const [f, y] = s.split("|");
				return { fuero: f, year: y };
			});

			// 4. Obtener cobertura para cada combo en paralelo
			const coverageResults = await Promise.allSettled(
				combos.map(({ fuero: f, year: y }) =>
					WorkersService.getScrapingCoverage(f, y).then(res => ({ fuero: f, year: y, data: res.data })),
				),
			);

			// 5. Agregar gaps libres con sugerencias de workers
			const aggregated: GlobalGap[] = [];
			for (const result of coverageResults) {
				if (result.status !== "fulfilled") continue;
				const { fuero: f, year: y, data } = result.value;
				if (!data || data.maxRange === 0) continue;

				for (const gap of data.gaps) {
					if (gap.assigned) continue; // solo gaps libres
					// Workers libres del mismo fuero
					const suggested = freeWorkers.filter(w => w.fuero === f);
					aggregated.push({ fuero: f, year: y, gap, suggestedWorkers: suggested });
				}
			}

			// Ordenar: primero los que tienen workers sugeridos, luego por fuero/año
			aggregated.sort((a, b) => {
				const aHas = a.suggestedWorkers.length > 0 ? 0 : 1;
				const bHas = b.suggestedWorkers.length > 0 ? 0 : 1;
				if (aHas !== bHas) return aHas - bHas;
				if (a.fuero !== b.fuero) return a.fuero.localeCompare(b.fuero);
				return Number(b.year) - Number(a.year);
			});

			setGlobalGaps(aggregated);
			setGlobalScanInfo({ combos: combos.length, freeWorkers: freeWorkers.length });
			setGlobalScanned(true);

			if (aggregated.length === 0) {
				enqueueSnackbar("Sin gaps: cobertura completa en todos los fueros y años analizados.", { variant: "success" });
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al realizar el análisis global", { variant: "error" });
		} finally {
			setGlobalLoading(false);
		}
	}, [enqueueSnackbar]);

	const handleOpenAssign = (gg: GlobalGap) => {
		const firstWorker = gg.suggestedWorkers[0];
		setAssignDialog({
			open: true,
			globalGap: gg,
			selectedWorkerId: firstWorker ? getConfigId(firstWorker) : "",
			enableWorker: true,
			loading: false,
		});
	};

	const handleConfirmAssign = async () => {
		const { globalGap, selectedWorkerId, enableWorker } = assignDialog;
		if (!globalGap || !selectedWorkerId) return;

		setAssignDialog(prev => ({ ...prev, loading: true }));
		try {
			// Reasignar rango
			await WorkersService.updateScrapingRange(selectedWorkerId, {
				range_start: globalGap.gap.start,
				range_end: globalGap.gap.end,
				year: Number(globalGap.year),
			});

			// Re-habilitar si se pidió
			if (enableWorker) {
				await WorkersService.updateScrapingConfig(selectedWorkerId, { enabled: true });
			}

			enqueueSnackbar(`Worker reasignado correctamente al rango ${globalGap.gap.start.toLocaleString()} — ${globalGap.gap.end.toLocaleString()}`, {
				variant: "success",
			});
			setAssignDialog({ open: false, globalGap: null, selectedWorkerId: "", enableWorker: true, loading: false });

			// Refrescar escaneo global
			handleGlobalScan();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al asignar worker", { variant: "error" });
			setAssignDialog(prev => ({ ...prev, loading: false }));
		}
	};

	// ─── Render ───────────────────────────────────────────────────────────────
	return (
		<Stack spacing={2}>
			{/* Selector de modo */}
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ minHeight: 36 }}>
					<Tab value="individual" label="Individual" sx={{ minHeight: 36, py: 0.5 }} />
					<Tab
						value="global"
						label={
							<Stack direction="row" alignItems="center" spacing={0.5}>
								<Flash size={14} />
								<span>Análisis Global</span>
							</Stack>
						}
						sx={{ minHeight: 36, py: 0.5 }}
					/>
				</Tabs>
			</Box>

			{/* ── Modo Individual ── */}
			{mode === "individual" && (
				<Stack spacing={2}>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end">
						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Fuero</InputLabel>
							<Select value={fuero} onChange={e => setFuero(e.target.value)} label="Fuero">
								{FUERO_OPTIONS.map(o => (
									<MenuItem key={o.value} value={o.value}>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: FUERO_COLORS[o.value] }} />
											<span>{o.label}</span>
										</Stack>
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl size="small" sx={{ minWidth: 110 }}>
							<InputLabel>Año</InputLabel>
							<Select value={year} onChange={e => setYear(e.target.value)} label="Año">
								{YEAR_OPTIONS.map(y => (
									<MenuItem key={y} value={y}>
										{y}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<Button
							variant="contained"
							startIcon={loading ? undefined : <Refresh size={16} />}
							onClick={fetchCoverage}
							disabled={loading}
							size="small"
						>
							{loading ? "Analizando..." : "Analizar"}
						</Button>
					</Stack>

					{loading && <LinearProgress />}

					{!loading && !coverage && (
						<Alert severity="info">Seleccioná fuero y año, luego hacé click en "Analizar" para ver la cobertura.</Alert>
					)}

					{!loading && coverage && coverage.maxRange === 0 && (
						<Alert severity="warning">No hay registros de historial para {fuero} — {year}.</Alert>
					)}

					{!loading && coverage && coverage.maxRange > 0 && (
						<Stack spacing={2}>
							<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
								{[
									{ label: "Rango total", value: `1 — ${coverage.maxRange.toLocaleString()}`, color: "text.primary" },
									{ label: "Cubierto", value: `${coverage.totalCovered.toLocaleString()} (${coverage.coveragePercent}%)`, color: "success.main" },
									{ label: "Gaps libres", value: freeGaps.length, color: freeGaps.length > 0 ? "error.main" : "success.main" },
									{ label: "Gaps asignados", value: assignedGaps.length, color: "warning.main" },
									{ label: "Workers activos", value: coverage.activeWorkers.length, color: "info.main" },
								].map(({ label, value, color }) => (
									<Card key={label} variant="outlined" sx={{ flex: 1, minWidth: 120 }}>
										<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
											<Typography variant="caption" color="text.secondary">{label}</Typography>
											<Typography variant="h6" color={color} fontWeight="bold">{value}</Typography>
										</CardContent>
									</Card>
								))}
							</Stack>

							<Card variant="outlined">
								<CardContent>
									<CoverageBar data={coverage} />
								</CardContent>
							</Card>

							{coverage.activeWorkers.length > 0 && (
								<Box>
									<Typography variant="subtitle2" gutterBottom>Workers activos ({coverage.activeWorkers.length})</Typography>
									<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
										{coverage.activeWorkers.map(w => (
											<Tooltip
												key={w.worker_id}
												title={`Rango: ${w.range_start.toLocaleString()} — ${w.range_end.toLocaleString()} | Actual: ${w.current?.toLocaleString() ?? "—"}`}
												arrow
											>
												<Chip
													label={w.worker_id}
													size="small"
													color="primary"
													variant="outlined"
													sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
												/>
											</Tooltip>
										))}
									</Stack>
								</Box>
							)}

							{coverage.gaps.length > 0 ? (
								<Box>
									<Typography variant="subtitle2" gutterBottom>Períodos faltantes ({coverage.gaps.length})</Typography>
									<TableContainer component={Paper} variant="outlined">
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Inicio</TableCell>
													<TableCell>Fin</TableCell>
													<TableCell align="right">Tamaño</TableCell>
													<TableCell align="center">Estado</TableCell>
													<TableCell align="center">Acción</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{coverage.gaps.map((gap, i) => (
													<TableRow
														key={i}
														sx={{ bgcolor: gap.assigned ? "warning.lighter" : "error.lighter", "&:hover": { opacity: 0.9 } }}
													>
														<TableCell>
															<Typography variant="body2" fontFamily="monospace">{gap.start.toLocaleString()}</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="body2" fontFamily="monospace">{gap.end.toLocaleString()}</Typography>
														</TableCell>
														<TableCell align="right">
															<Typography variant="body2">{gap.size.toLocaleString()}</Typography>
														</TableCell>
														<TableCell align="center">
															{gap.assigned ? (
																<Tooltip title={`Worker: ${gap.workerId}`} arrow>
																	<Chip icon={<Warning2 size={14} />} label="Asignado" size="small" color="warning" variant="outlined" />
																</Tooltip>
															) : (
																<Chip icon={<CloseCircle size={14} />} label="Libre" size="small" color="error" variant="outlined" />
															)}
														</TableCell>
														<TableCell align="center">
															<Button
																size="small"
																variant="outlined"
																color={gap.assigned ? "warning" : "primary"}
																startIcon={<AddCircle size={14} />}
																onClick={() => handleAssignGap(gap)}
																disabled={gap.assigned}
															>
																Asignar
															</Button>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							) : (
								<Alert severity="success" icon={<TickCircle size={20} />}>
									Cobertura completa — no hay períodos faltantes para {fuero} — {year}.
								</Alert>
							)}
						</Stack>
					)}

					<CreateConfigModal
						open={createModalOpen}
						onClose={() => { setCreateModalOpen(false); setSelectedGap(null); }}
						onSuccess={handleCreateSuccess}
						initialValues={selectedGap ? { fuero, year: Number(year), rangeStart: selectedGap.start, rangeEnd: selectedGap.end } : undefined}
					/>
				</Stack>
			)}

			{/* ── Modo Global ── */}
			{mode === "global" && (
				<Stack spacing={2}>
					{/* Header con descripción y botón */}
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
						<Box>
							<Typography variant="subtitle1" fontWeight={600}>
								Análisis Global de Cobertura
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Detecta períodos sin cobertura en todos los fueros y años, y sugiere workers completados al 100% para reasignarlos automáticamente.
							</Typography>
						</Box>
						<Button
							variant="contained"
							color="primary"
							startIcon={globalLoading ? <CircularProgress size={16} color="inherit" /> : <SearchNormal1 size={16} />}
							onClick={handleGlobalScan}
							disabled={globalLoading}
							size="small"
							sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
						>
							{globalLoading ? "Escaneando..." : "Escanear todo"}
						</Button>
					</Stack>

					{globalLoading && (
						<Box>
							<LinearProgress />
							<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
								Analizando todos los fueros y años con registros de historial...
							</Typography>
						</Box>
					)}

					{/* Resumen del escaneo */}
					{globalScanned && globalScanInfo && (
						<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
							{[
								{ label: "Combinaciones analizadas", value: globalScanInfo.combos, color: "info.main" },
								{ label: "Workers libres (100%)", value: globalScanInfo.freeWorkers, color: globalScanInfo.freeWorkers > 0 ? "success.main" : "text.disabled" },
								{ label: "Gaps sin cobertura", value: globalGaps.length, color: globalGaps.length > 0 ? "error.main" : "success.main" },
								{
									label: "Con worker sugerido",
									value: globalGaps.filter(g => g.suggestedWorkers.length > 0).length,
									color: "warning.main",
								},
							].map(({ label, value, color }) => (
								<Card key={label} variant="outlined" sx={{ flex: 1, minWidth: 120 }}>
									<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="caption" color="text.secondary">{label}</Typography>
										<Typography variant="h6" color={color} fontWeight="bold">{value}</Typography>
									</CardContent>
								</Card>
							))}
						</Stack>
					)}

					{/* Resultado: sin gaps */}
					{globalScanned && globalGaps.length === 0 && (
						<Alert severity="success" icon={<TickCircle size={20} />}>
							Cobertura completa — no se encontraron períodos sin cobertura en ningún fuero ni año analizado.
						</Alert>
					)}

					{/* Tabla de gaps globales */}
					{globalGaps.length > 0 && (
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Períodos sin cobertura ({globalGaps.length})
							</Typography>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fuero</TableCell>
											<TableCell align="center">Año</TableCell>
											<TableCell align="right">Inicio</TableCell>
											<TableCell align="right">Fin</TableCell>
											<TableCell align="right">Tamaño</TableCell>
											<TableCell>Worker sugerido</TableCell>
											<TableCell align="center">Acción</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{globalGaps.map((gg, i) => {
											const hasSuggestion = gg.suggestedWorkers.length > 0;
											return (
												<TableRow
													key={i}
													sx={{
														bgcolor: hasSuggestion ? "warning.lighter" : "error.lighter",
														"&:hover": { opacity: 0.9 },
													}}
												>
													<TableCell>
														<Stack direction="row" alignItems="center" spacing={0.75}>
															<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: FUERO_COLORS[gg.fuero] ?? "#999", flexShrink: 0 }} />
															<Typography variant="body2">
																{FUERO_OPTIONS.find(f => f.value === gg.fuero)?.label ?? gg.fuero}
															</Typography>
														</Stack>
													</TableCell>
													<TableCell align="center">
														<Typography variant="body2">{gg.year}</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography variant="body2" fontFamily="monospace">{gg.gap.start.toLocaleString()}</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography variant="body2" fontFamily="monospace">{gg.gap.end.toLocaleString()}</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography variant="body2">{gg.gap.size.toLocaleString()}</Typography>
													</TableCell>
													<TableCell>
														{hasSuggestion ? (
															<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
																{gg.suggestedWorkers.slice(0, 3).map(w => (
																	<Tooltip
																		key={getConfigId(w)}
																		title={`Año: ${w.year} | Rango: ${(w.range_start ?? 0).toLocaleString()}–${(w.range_end ?? 0).toLocaleString()} | ${calculateProgress(w).toFixed(0)}% completado`}
																		arrow
																	>
																		<Chip
																			label={w.worker_id}
																			size="small"
																			color="warning"
																			variant="outlined"
																			sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
																		/>
																	</Tooltip>
																))}
																{gg.suggestedWorkers.length > 3 && (
																	<Chip label={`+${gg.suggestedWorkers.length - 3}`} size="small" variant="outlined" />
																)}
															</Stack>
														) : (
															<Typography variant="caption" color="text.disabled">Sin workers libres</Typography>
														)}
													</TableCell>
													<TableCell align="center">
														<Button
															size="small"
															variant="contained"
															color={hasSuggestion ? "warning" : "primary"}
															startIcon={hasSuggestion ? <Flash size={14} /> : <AddCircle size={14} />}
															onClick={() => handleOpenAssign(gg)}
														>
															{hasSuggestion ? "Auto-asignar" : "Crear config"}
														</Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>

							<Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
								<strong>Workers con sugerencia:</strong> podés usar "Auto-asignar" para reasignar el rango de un worker completado al 100% a este período.
								{" "}<strong>Sin sugerencia:</strong> usá "Crear config" para generar una nueva configuración de worker.
							</Alert>
						</Box>
					)}
				</Stack>
			)}

			{/* Dialog de asignación automática */}
			<AssignWorkerDialog
				state={assignDialog}
				onClose={() => setAssignDialog({ open: false, globalGap: null, selectedWorkerId: "", enableWorker: true, loading: false })}
				onWorkerSelect={id => setAssignDialog(prev => ({ ...prev, selectedWorkerId: id }))}
				onEnableChange={v => setAssignDialog(prev => ({ ...prev, enableWorker: v }))}
				onConfirm={handleConfirmAssign}
			/>
		</Stack>
	);
};

export default CoveragePanel;
