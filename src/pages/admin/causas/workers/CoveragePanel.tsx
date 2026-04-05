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
	Collapse,
	IconButton,
} from "@mui/material";
import { Refresh, AddCircle, TickCircle, Warning2, SearchNormal1, Flash, CloseCircle, ArrowDown2, ArrowUp2, Ranking } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, ScrapingCoverageData, CoverageGap, WorkerConfig } from "api/workers";
import CreateConfigModal from "./CreateConfigModal";

// ─── Constantes ───────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface YearData {
	status: "idle" | "loading" | "success" | "error";
	coverage: ScrapingCoverageData | null;
	expanded: boolean;
}

interface GlobalGap {
	fuero: string;
	year: string;
	gap: CoverageGap;
	suggestedWorkers: WorkerConfig[];
}

type SuggestionType = "gap" | "empty_year";

interface SmartSuggestion {
	worker: WorkerConfig;
	type: SuggestionType;
	fuero: string;
	year: string;
	range: { start: number; end: number };
	score: number;
	description: string;
}

interface AssignDialogState {
	open: boolean;
	workerId: string;
	workerLabel: string;
	fuero: string;
	year: string;
	range: { start: number; end: number };
	enableWorker: boolean;
	loading: boolean;
	// Para modo individual/fuero: gap original por si hay que abrir CreateConfigModal
	gap: CoverageGap | null;
}

// ─── Barra visual de cobertura ────────────────────────────────────────────────
const CoverageBar: React.FC<{ data: ScrapingCoverageData; compact?: boolean }> = ({ data, compact = false }) => {
	const { coveredRanges, gaps, maxRange, activeWorkers } = data;
	if (maxRange === 0) return null;

	type Segment = { type: "covered" | "gap-free" | "gap-assigned"; start: number; end: number; workerId?: string | null };

	const allSegments: Segment[] = [
		...coveredRanges.map(r => ({ type: "covered" as const, start: r.start, end: r.end })),
		...gaps.map(g => ({
			type: (g.assigned ? "gap-assigned" : "gap-free") as "gap-free" | "gap-assigned",
			start: g.start,
			end: g.end,
			workerId: g.workerId,
		})),
	].sort((a, b) => a.start - b.start);

	const segments: Segment[] = allSegments.map(seg => {
		const activeWorker = activeWorkers.find(w => w.range_start <= seg.end && w.range_end >= seg.start);
		return activeWorker && seg.type !== "covered" ? { ...seg, type: "gap-assigned" as const, workerId: activeWorker.worker_id } : seg;
	});

	const colorMap = { covered: "#2e7d32", "gap-free": "#d32f2f", "gap-assigned": "#ed6c02" };

	return (
		<Box>
			{!compact && (
				<Typography variant="caption" color="text.secondary" gutterBottom>
					Cobertura visual (1 — {maxRange.toLocaleString()})
				</Typography>
			)}
			<Box
				sx={{
					display: "flex",
					height: compact ? 12 : 24,
					borderRadius: 0.5,
					overflow: "hidden",
					border: "1px solid",
					borderColor: "divider",
					mt: compact ? 0 : 0.5,
				}}
			>
				{segments.map((seg, i) => {
					const widthPct = ((seg.end - seg.start + 1) / maxRange) * 100;
					const label = `${seg.type === "covered" ? "Cubierto" : seg.type === "gap-free" ? "Sin cubrir" : "Asignado"}: ${seg.start.toLocaleString()} — ${seg.end.toLocaleString()}`;
					return (
						<Tooltip key={i} title={label} arrow>
							<Box
								sx={{
									width: `${Math.max(widthPct, 0.3)}%`,
									bgcolor: colorMap[seg.type],
									flexShrink: 0,
									borderRight: i < segments.length - 1 ? "1px solid rgba(255,255,255,0.15)" : "none",
									"&:hover": { opacity: 0.8, cursor: "default" },
								}}
							/>
						</Tooltip>
					);
				})}
			</Box>
			{!compact && (
				<Stack direction="row" spacing={2} mt={0.75} flexWrap="wrap">
					{([["covered", "Cubierto"], ["gap-free", "Sin cubrir"], ["gap-assigned", "Asignado"]] as const).map(([k, l]) => (
						<Stack key={k} direction="row" alignItems="center" spacing={0.5}>
							<Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: colorMap[k] }} />
							<Typography variant="caption" color="text.secondary">{l}</Typography>
						</Stack>
					))}
				</Stack>
			)}
		</Box>
	);
};

// ─── Dialog de asignación ─────────────────────────────────────────────────────
const AssignDialog: React.FC<{
	state: AssignDialogState;
	onClose: () => void;
	onEnableChange: (v: boolean) => void;
	onConfirm: () => void;
}> = ({ state, onClose, onEnableChange, onConfirm }) => {
	const { open, workerLabel, fuero, year, range, enableWorker, loading } = state;

	return (
		<Dialog open={open} onClose={() => !loading && onClose()} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Stack direction="row" alignItems="center" spacing={1}>
					<Flash size={20} />
					<span>Confirmar reasignación de rango</span>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
							<Stack direction="row" spacing={3} flexWrap="wrap">
								<Box>
									<Typography variant="caption" color="text.secondary">Worker</Typography>
									<Typography variant="body2" fontFamily="monospace" fontWeight={600}>{workerLabel}</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Fuero</Typography>
									<Typography variant="body2" fontWeight={600}>
										<Box component="span" sx={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", bgcolor: FUERO_COLORS[fuero] ?? "#999", mr: 0.5 }} />
										{FUERO_OPTIONS.find(f => f.value === fuero)?.label ?? fuero}
									</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Año</Typography>
									<Typography variant="body2" fontWeight={600}>{year}</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Nuevo rango</Typography>
									<Typography variant="body2" fontFamily="monospace" fontWeight={600}>
										{range.start.toLocaleString()} — {range.end.toLocaleString()}
									</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">Tamaño</Typography>
									<Typography variant="body2" fontWeight={600}>{(range.end - range.start + 1).toLocaleString()}</Typography>
								</Box>
							</Stack>
						</CardContent>
					</Card>
					<Alert severity="info" variant="outlined">
						El rango del worker se reasignará y comenzará a procesar desde{" "}
						<strong>{range.start.toLocaleString()}</strong>. El historial anterior se conserva.
					</Alert>
					<FormControlLabel
						control={<Checkbox checked={enableWorker} onChange={e => onEnableChange(e.target.checked)} size="small" />}
						label={<Typography variant="body2">Habilitar worker automáticamente al asignar</Typography>}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>Cancelar</Button>
				<Button
					variant="contained"
					onClick={onConfirm}
					disabled={loading}
					startIcon={loading ? <CircularProgress size={16} /> : <Flash size={16} />}
				>
					{loading ? "Asignando..." : "Confirmar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ─── Componente principal ─────────────────────────────────────────────────────
const CoveragePanel: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Modo activo
	const [mode, setMode] = useState<"fuero" | "global">("fuero");

	// ── Estado modo "Por Fuero" ──
	const [fuero, setFuero] = useState<string>("CIV");
	const [yearDataMap, setYearDataMap] = useState<Record<string, YearData>>({});
	const [fueroLoading, setFueroLoading] = useState(false);
	// CreateConfigModal (asignación manual desde modo fuero)
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [createModalInitial, setCreateModalInitial] = useState<{ fuero: string; year: number; rangeStart: number; rangeEnd: number } | undefined>();

	// ── Estado modo "Análisis Global" ──
	const [globalLoading, setGlobalLoading] = useState(false);
	const [globalGaps, setGlobalGaps] = useState<GlobalGap[]>([]);
	const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
	const [globalScanned, setGlobalScanned] = useState(false);
	const [globalScanInfo, setGlobalScanInfo] = useState<{ combos: number; freeWorkers: number } | null>(null);

	// ── Dialog de asignación (compartido) ──
	const emptyAssignDialog: AssignDialogState = {
		open: false, workerId: "", workerLabel: "", fuero: "", year: "",
		range: { start: 0, end: 0 }, enableWorker: true, loading: false, gap: null,
	};
	const [assignDialog, setAssignDialog] = useState<AssignDialogState>(emptyAssignDialog);

	// ────────────────────────────────────────────────────────────────────────
	// Modo "Por Fuero" — carga todos los años en paralelo
	// ────────────────────────────────────────────────────────────────────────
	const handleLoadFuero = useCallback(async () => {
		setFueroLoading(true);

		// Inicializar todos los años como "loading"
		const initial: Record<string, YearData> = {};
		for (const y of YEAR_OPTIONS) {
			initial[y] = { status: "loading", coverage: null, expanded: false };
		}
		setYearDataMap(initial);

		// Cargar todos los años en paralelo
		const results = await Promise.allSettled(
			YEAR_OPTIONS.map(y => WorkersService.getScrapingCoverage(fuero, y).then(res => ({ year: y, data: res.data }))),
		);

		const updated: Record<string, YearData> = { ...initial };
		for (const result of results) {
			if (result.status === "fulfilled") {
				const { year: y, data } = result.value;
				// Auto-expandir años con gaps libres
				const hasFreeGaps = data.gaps.some(g => !g.assigned);
				updated[y] = { status: "success", coverage: data, expanded: hasFreeGaps };
			} else {
				const y = YEAR_OPTIONS[results.indexOf(result)];
				updated[y] = { status: "error", coverage: null, expanded: false };
			}
		}

		setYearDataMap(updated);
		setFueroLoading(false);
	}, [fuero]);

	const toggleYearExpanded = (y: string) => {
		setYearDataMap(prev => ({ ...prev, [y]: { ...prev[y], expanded: !prev[y]?.expanded } }));
	};

	// ────────────────────────────────────────────────────────────────────────
	// Modo "Análisis Global"
	// ────────────────────────────────────────────────────────────────────────
	const handleGlobalScan = useCallback(async () => {
		setGlobalLoading(true);
		setGlobalGaps([]);
		setSmartSuggestions([]);
		setGlobalScanned(false);
		setGlobalScanInfo(null);

		try {
			// 1. Obtener todos los configs
			const configsRes = await WorkersService.getScrapingConfigs({ limit: 500 });
			const allConfigs: WorkerConfig[] = Array.isArray(configsRes.data) ? configsRes.data : [configsRes.data as WorkerConfig];

			// 2. Workers al 100% (libres para reasignar)
			const freeWorkers = allConfigs.filter(c => calculateProgress(c) >= 100);

			// 3. Combos fuero/año: los de los configs + año actual de cada fuero
			const comboSet = new Set<string>();
			for (const c of allConfigs) {
				if (c.fuero && c.year) comboSet.add(`${c.fuero}|${c.year}`);
			}
			for (const f of FUERO_OPTIONS) comboSet.add(`${f.value}|${CURRENT_YEAR}`);

			const combos = Array.from(comboSet).map(s => { const [f, y] = s.split("|"); return { fuero: f, year: y }; });

			// 4. Cobertura de todos los combos en paralelo
			const coverageResults = await Promise.allSettled(
				combos.map(({ fuero: f, year: y }) =>
					WorkersService.getScrapingCoverage(f, y).then(res => ({ fuero: f, year: y, data: res.data })),
				),
			);

			// 5. Mapa fuero/año → datos de cobertura
			const coverageMap = new Map<string, { data: ScrapingCoverageData; fuero: string; year: string }>();
			for (const r of coverageResults) {
				if (r.status === "fulfilled") {
					coverageMap.set(`${r.value.fuero}|${r.value.year}`, r.value);
				}
			}

			// 6. Agregar gaps libres
			const aggregated: GlobalGap[] = [];
			for (const { fuero: f, year: y, data } of coverageMap.values()) {
				if (!data || data.maxRange === 0) continue;
				for (const gap of data.gaps) {
					if (!gap.assigned) {
						aggregated.push({ fuero: f, year: y, gap, suggestedWorkers: freeWorkers.filter(w => w.fuero === f) });
					}
				}
			}
			aggregated.sort((a, b) => {
				const aHas = a.suggestedWorkers.length > 0 ? 0 : 1;
				const bHas = b.suggestedWorkers.length > 0 ? 0 : 1;
				if (aHas !== bHas) return aHas - bHas;
				return b.gap.size - a.gap.size;
			});
			setGlobalGaps(aggregated);

			// 7. Sugerencias inteligentes por worker
			const suggestions: SmartSuggestion[] = [];

			for (const worker of freeWorkers) {
				if (!worker.fuero) continue;
				const wFuero = worker.fuero;
				const bestCandidates: SmartSuggestion[] = [];

				// Oportunidad tipo "brecha": gaps libres en el mismo fuero
				for (const { fuero: f, year: y, data } of coverageMap.values()) {
					if (f !== wFuero) continue;
					for (const gap of data.gaps) {
						if (gap.assigned) continue;
						bestCandidates.push({
							worker,
							type: "gap",
							fuero: f,
							year: y,
							range: { start: gap.start, end: gap.end },
							score: gap.size,
							description: `Brecha de ${gap.size.toLocaleString()} registros en ${f} ${y}`,
						});
					}
				}

				// Oportunidad tipo "año vacío": solo dentro del rango de años con historial real para este fuero
				const fueroYearsWithData = Array.from(coverageMap.values())
					.filter(e => e.fuero === wFuero && e.data.maxRange > 0)
					.map(e => Number(e.year));

				if (fueroYearsWithData.length > 0) {
					const minYear = Math.min(...fueroYearsWithData);
					const maxYear = Math.max(...fueroYearsWithData);

					for (let yr = minYear; yr <= maxYear; yr++) {
						const y = String(yr);
						const key = `${wFuero}|${y}`;
						const entry = coverageMap.get(key);
						const isEmpty = !entry || entry.data.maxRange === 0;
						if (isEmpty) {
							const workerSize = (worker.range_end ?? 50000) - (worker.range_start ?? 1);
							const newEnd = Math.max(workerSize, 50000);
							bestCandidates.push({
								worker,
								type: "empty_year",
								fuero: wFuero,
								year: y,
								range: { start: 1, end: newEnd },
								score: (maxYear + 1 - yr) * 1000, // años más antiguos dentro del rango > prioridad
								description: `Año sin cobertura — ${wFuero} ${y} (entre ${minYear} y ${maxYear})`,
							});
						}
					}
				}

				// Tomar la mejor oportunidad para este worker
				if (bestCandidates.length > 0) {
					bestCandidates.sort((a, b) => b.score - a.score);
					suggestions.push(bestCandidates[0]);
				}
			}

			// Ordenar: primero brechas (impacto directo), luego años vacíos, todo por score
			suggestions.sort((a, b) => {
				if (a.type !== b.type) return a.type === "gap" ? -1 : 1;
				return b.score - a.score;
			});
			setSmartSuggestions(suggestions);

			setGlobalScanInfo({ combos: combos.length, freeWorkers: freeWorkers.length });
			setGlobalScanned(true);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al realizar el análisis global", { variant: "error" });
		} finally {
			setGlobalLoading(false);
		}
	}, [enqueueSnackbar]);

	// ────────────────────────────────────────────────────────────────────────
	// Asignación
	// ────────────────────────────────────────────────────────────────────────
	const openAssignDialog = (workerId: string, workerLabel: string, fueroVal: string, yearVal: string, range: { start: number; end: number }, gap: CoverageGap | null = null) => {
		setAssignDialog({ open: true, workerId, workerLabel, fuero: fueroVal, year: yearVal, range, enableWorker: true, loading: false, gap });
	};

	const handleConfirmAssign = async () => {
		const { workerId, fuero: f, year: y, range, enableWorker } = assignDialog;
		setAssignDialog(prev => ({ ...prev, loading: true }));
		try {
			await WorkersService.updateScrapingRange(workerId, { range_start: range.start, range_end: range.end, year: Number(y) });
			if (enableWorker) {
				await WorkersService.updateScrapingConfig(workerId, { enabled: true });
			}
			enqueueSnackbar(`Worker reasignado: ${f} ${y} — ${range.start.toLocaleString()} a ${range.end.toLocaleString()}`, { variant: "success" });
			setAssignDialog(emptyAssignDialog);
			// Refrescar según modo activo
			if (mode === "fuero") handleLoadFuero();
			else handleGlobalScan();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al asignar worker", { variant: "error" });
			setAssignDialog(prev => ({ ...prev, loading: false }));
		}
	};

	// ─── Render ───────────────────────────────────────────────────────────────
	return (
		<Stack spacing={2}>
			{/* Tabs de modo */}
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ minHeight: 36 }}>
					<Tab value="fuero" label="Por Fuero" sx={{ minHeight: 36, py: 0.5 }} />
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

			{/* ═══════════════════════════════════════════════════════════════
			    Modo: Por Fuero — todos los años de un fuero en una vista
			    ═══════════════════════════════════════════════════════════════ */}
			{mode === "fuero" && (
				<Stack spacing={2}>
					<Stack direction="row" spacing={2} alignItems="flex-end">
						<FormControl size="small" sx={{ minWidth: 180 }}>
							<InputLabel>Fuero</InputLabel>
							<Select value={fuero} onChange={e => { setFuero(e.target.value); setYearDataMap({}); }} label="Fuero">
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
						<Button
							variant="contained"
							startIcon={fueroLoading ? <CircularProgress size={14} color="inherit" /> : <Refresh size={16} />}
							onClick={handleLoadFuero}
							disabled={fueroLoading}
							size="small"
						>
							{fueroLoading ? "Cargando..." : "Cargar todos los años"}
						</Button>
					</Stack>

					{Object.keys(yearDataMap).length === 0 && !fueroLoading && (
						<Alert severity="info">
							Seleccioná un fuero y hacé click en "Cargar todos los años" para ver la cobertura de todos los años disponibles.
						</Alert>
					)}

					{/* Tabla resumen + filas expandibles por año */}
					{Object.keys(yearDataMap).length > 0 && (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell width={20} />
										<TableCell>Año</TableCell>
										<TableCell>Cobertura visual</TableCell>
										<TableCell align="right">Cubierto</TableCell>
										<TableCell align="right">Gaps libres</TableCell>
										<TableCell align="right">Asignados</TableCell>
										<TableCell align="right">Workers activos</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{YEAR_OPTIONS.map(y => {
										const yd = yearDataMap[y];
										if (!yd) return null;
										const { status, coverage, expanded } = yd;
										const freeGaps = coverage?.gaps.filter(g => !g.assigned) ?? [];
										const assignedGaps = coverage?.gaps.filter(g => g.assigned) ?? [];
										const hasData = status === "success" && coverage && coverage.maxRange > 0;

										return (
											<React.Fragment key={y}>
												{/* Fila resumen */}
												<TableRow
													sx={{
														cursor: hasData ? "pointer" : "default",
														bgcolor: freeGaps.length > 0 ? "error.lighter" : undefined,
														"&:hover": hasData ? { bgcolor: "action.hover" } : undefined,
													}}
													onClick={() => hasData && toggleYearExpanded(y)}
												>
													<TableCell padding="checkbox">
														{hasData && (
															<IconButton size="small" tabIndex={-1}>
																{expanded ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
															</IconButton>
														)}
													</TableCell>
													<TableCell>
														<Typography variant="body2" fontWeight={freeGaps.length > 0 ? 700 : 400}>{y}</Typography>
													</TableCell>
													<TableCell sx={{ minWidth: 180 }}>
														{status === "loading" && <LinearProgress sx={{ height: 8, borderRadius: 1 }} />}
														{status === "error" && <Typography variant="caption" color="error">Error al cargar</Typography>}
														{status === "success" && coverage && coverage.maxRange === 0 && (
															<Typography variant="caption" color="text.disabled">Sin registros</Typography>
														)}
														{hasData && (
															<Box sx={{ position: "relative" }}>
																<CoverageBar data={coverage!} compact />
															</Box>
														)}
													</TableCell>
													<TableCell align="right">
														{hasData && (
															<Typography variant="body2" color="success.main">
																{coverage!.coveragePercent}%
															</Typography>
														)}
													</TableCell>
													<TableCell align="right">
														{hasData && (
															<Typography variant="body2" color={freeGaps.length > 0 ? "error.main" : "text.disabled"} fontWeight={freeGaps.length > 0 ? 700 : 400}>
																{freeGaps.length}
															</Typography>
														)}
													</TableCell>
													<TableCell align="right">
														{hasData && (
															<Typography variant="body2" color={assignedGaps.length > 0 ? "warning.main" : "text.disabled"}>
																{assignedGaps.length}
															</Typography>
														)}
													</TableCell>
													<TableCell align="right">
														{hasData && (
															<Typography variant="body2" color={coverage!.activeWorkers.length > 0 ? "info.main" : "text.disabled"}>
																{coverage!.activeWorkers.length}
															</Typography>
														)}
													</TableCell>
												</TableRow>

												{/* Fila expandible: detalle del año */}
												{hasData && (
													<TableRow>
														<TableCell colSpan={7} sx={{ p: 0, border: expanded ? undefined : "none" }}>
															<Collapse in={expanded} timeout="auto" unmountOnExit>
																<Box sx={{ px: 3, py: 2, bgcolor: "background.default" }}>
																	<Stack spacing={1.5}>
																		{/* Barra detallada */}
																		<CoverageBar data={coverage!} />

																		{/* Workers activos */}
																		{coverage!.activeWorkers.length > 0 && (
																			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
																				<Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
																					Workers activos:
																				</Typography>
																				{coverage!.activeWorkers.map(w => (
																					<Tooltip key={w.worker_id} title={`${w.range_start.toLocaleString()} — ${w.range_end.toLocaleString()} | pos: ${w.current?.toLocaleString() ?? "—"}`} arrow>
																						<Chip label={w.worker_id} size="small" color="primary" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
																					</Tooltip>
																				))}
																			</Stack>
																		)}

																		{/* Gaps */}
																		{coverage!.gaps.length > 0 ? (
																			<Box>
																				<Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: "block" }}>
																					Períodos faltantes ({coverage!.gaps.length})
																				</Typography>
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
																							{coverage!.gaps.map((gap, i) => (
																								<TableRow key={i} sx={{ bgcolor: gap.assigned ? "warning.lighter" : "error.lighter" }}>
																									<TableCell><Typography variant="body2" fontFamily="monospace">{gap.start.toLocaleString()}</Typography></TableCell>
																									<TableCell><Typography variant="body2" fontFamily="monospace">{gap.end.toLocaleString()}</Typography></TableCell>
																									<TableCell align="right"><Typography variant="body2">{gap.size.toLocaleString()}</Typography></TableCell>
																									<TableCell align="center">
																										{gap.assigned ? (
																											<Tooltip title={`Worker: ${gap.workerId}`} arrow>
																												<Chip icon={<Warning2 size={12} />} label="Asignado" size="small" color="warning" variant="outlined" />
																											</Tooltip>
																										) : (
																											<Chip icon={<CloseCircle size={12} />} label="Libre" size="small" color="error" variant="outlined" />
																										)}
																									</TableCell>
																									<TableCell align="center">
																										<Button
																											size="small"
																											variant="outlined"
																											startIcon={<AddCircle size={12} />}
																											disabled={gap.assigned}
																											onClick={() => {
																												setCreateModalInitial({ fuero, year: Number(y), rangeStart: gap.start, rangeEnd: gap.end });
																												setCreateModalOpen(true);
																											}}
																										>
																											Crear config
																										</Button>
																									</TableCell>
																								</TableRow>
																							))}
																						</TableBody>
																					</Table>
																				</TableContainer>
																			</Box>
																		) : (
																			<Alert severity="success" icon={<TickCircle size={16} />} sx={{ py: 0.5 }}>
																				Cobertura completa para {fuero} — {y}
																			</Alert>
																		)}
																	</Stack>
																</Box>
															</Collapse>
														</TableCell>
													</TableRow>
												)}
											</React.Fragment>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}

					<CreateConfigModal
						open={createModalOpen}
						onClose={() => { setCreateModalOpen(false); setCreateModalInitial(undefined); }}
						onSuccess={() => { setCreateModalOpen(false); setCreateModalInitial(undefined); handleLoadFuero(); }}
						initialValues={createModalInitial}
					/>
				</Stack>
			)}

			{/* ═══════════════════════════════════════════════════════════════
			    Modo: Análisis Global
			    ═══════════════════════════════════════════════════════════════ */}
			{mode === "global" && (
				<Stack spacing={2}>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
						<Box>
							<Typography variant="subtitle1" fontWeight={600}>Análisis Global de Cobertura</Typography>
							<Typography variant="body2" color="text.secondary">
								Detecta todos los períodos sin cobertura y sugiere workers al 100% listos para reasignar.
							</Typography>
						</Box>
						<Button
							variant="contained"
							startIcon={globalLoading ? <CircularProgress size={14} color="inherit" /> : <SearchNormal1 size={16} />}
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
							<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>Analizando todos los fueros y años con registros...</Typography>
						</Box>
					)}

					{/* Resumen del escaneo */}
					{globalScanned && globalScanInfo && (
						<Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
							{[
								{ label: "Combinaciones analizadas", value: globalScanInfo.combos, color: "info.main" },
								{ label: "Workers al 100%", value: globalScanInfo.freeWorkers, color: globalScanInfo.freeWorkers > 0 ? "success.main" : "text.disabled" },
								{ label: "Gaps sin cobertura", value: globalGaps.length, color: globalGaps.length > 0 ? "error.main" : "success.main" },
								{ label: "Con sugerencia de worker", value: globalGaps.filter(g => g.suggestedWorkers.length > 0).length, color: "warning.main" },
								{ label: "Sugerencias inteligentes", value: smartSuggestions.length, color: smartSuggestions.length > 0 ? "secondary.main" : "text.disabled" },
							].map(({ label, value, color }) => (
								<Card key={label} variant="outlined" sx={{ flex: 1, minWidth: 130 }}>
									<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="caption" color="text.secondary">{label}</Typography>
										<Typography variant="h6" color={color} fontWeight="bold">{value}</Typography>
									</CardContent>
								</Card>
							))}
						</Stack>
					)}

					{globalScanned && globalGaps.length === 0 && smartSuggestions.length === 0 && (
						<Alert severity="success" icon={<TickCircle size={20} />}>
							Cobertura completa — no se encontraron períodos sin cobertura en ningún fuero ni año analizado.
						</Alert>
					)}

					{/* ── Sección 1: Períodos sin cobertura ── */}
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
											<TableCell>Workers sugeridos</TableCell>
											<TableCell align="center">Acción</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{globalGaps.map((gg, i) => {
											const hasSuggestion = gg.suggestedWorkers.length > 0;
											return (
												<TableRow key={i} sx={{ bgcolor: hasSuggestion ? "warning.lighter" : "error.lighter", "&:hover": { opacity: 0.9 } }}>
													<TableCell>
														<Stack direction="row" alignItems="center" spacing={0.75}>
															<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: FUERO_COLORS[gg.fuero] ?? "#999", flexShrink: 0 }} />
															<Typography variant="body2">{FUERO_OPTIONS.find(f => f.value === gg.fuero)?.label ?? gg.fuero}</Typography>
														</Stack>
													</TableCell>
													<TableCell align="center"><Typography variant="body2">{gg.year}</Typography></TableCell>
													<TableCell align="right"><Typography variant="body2" fontFamily="monospace">{gg.gap.start.toLocaleString()}</Typography></TableCell>
													<TableCell align="right"><Typography variant="body2" fontFamily="monospace">{gg.gap.end.toLocaleString()}</Typography></TableCell>
													<TableCell align="right"><Typography variant="body2">{gg.gap.size.toLocaleString()}</Typography></TableCell>
													<TableCell>
														{hasSuggestion ? (
															<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
																{gg.suggestedWorkers.slice(0, 3).map(w => (
																	<Tooltip key={getConfigId(w)} title={`Año: ${w.year} | ${(w.range_start ?? 0).toLocaleString()}–${(w.range_end ?? 0).toLocaleString()} | ${calculateProgress(w).toFixed(0)}%`} arrow>
																		<Chip label={w.worker_id} size="small" color="warning" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
																	</Tooltip>
																))}
																{gg.suggestedWorkers.length > 3 && <Chip label={`+${gg.suggestedWorkers.length - 3}`} size="small" variant="outlined" />}
															</Stack>
														) : (
															<Typography variant="caption" color="text.disabled">Sin workers libres</Typography>
														)}
													</TableCell>
													<TableCell align="center">
														{hasSuggestion ? (
															<Button
																size="small"
																variant="contained"
																color="warning"
																startIcon={<Flash size={13} />}
																onClick={() => {
																	const w = gg.suggestedWorkers[0];
																	openAssignDialog(getConfigId(w), w.worker_id ?? "", gg.fuero, gg.year, { start: gg.gap.start, end: gg.gap.end }, gg.gap);
																}}
															>
																Auto-asignar
															</Button>
														) : (
															<Button
																size="small"
																variant="outlined"
																startIcon={<AddCircle size={13} />}
																onClick={() => {
																	setCreateModalInitial({ fuero: gg.fuero, year: Number(gg.year), rangeStart: gg.gap.start, rangeEnd: gg.gap.end });
																	setCreateModalOpen(true);
																}}
															>
																Crear config
															</Button>
														)}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>
						</Box>
					)}

					{/* ── Sección 2: Workers detenidos al 100% con sugerencias inteligentes ── */}
					{globalScanned && smartSuggestions.length > 0 && (
						<Box>
							<Divider sx={{ mb: 2 }} />
							<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
								<Ranking size={18} />
								<Typography variant="subtitle2">
									Workers detenidos — sugerencias de reasignación ({smartSuggestions.length})
								</Typography>
							</Stack>
							<Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
								Estos workers completaron su rango al 100% y están disponibles para cubrir nuevas áreas.
								El sistema rankeó la mejor oportunidad por worker según el impacto estimado.
							</Alert>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Worker</TableCell>
											<TableCell align="center">Tipo</TableCell>
											<TableCell>Oportunidad</TableCell>
											<TableCell align="right">Rango sugerido</TableCell>
											<TableCell align="right">Impacto</TableCell>
											<TableCell align="center">Acción</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{smartSuggestions.map((s, i) => (
											<TableRow key={i} hover sx={{ "&:hover": { bgcolor: "action.hover" } }}>
												<TableCell>
													<Stack>
														<Typography variant="body2" fontFamily="monospace" fontWeight={600}>{s.worker.worker_id}</Typography>
														<Typography variant="caption" color="text.secondary">
															{s.worker.fuero} {s.worker.year} — pos {(s.worker.number ?? 0).toLocaleString()}
														</Typography>
													</Stack>
												</TableCell>
												<TableCell align="center">
													<Chip
														label={s.type === "gap" ? "Brecha" : "Año vacío"}
														size="small"
														color={s.type === "gap" ? "error" : "secondary"}
														variant="outlined"
													/>
												</TableCell>
												<TableCell>
													<Stack direction="row" alignItems="center" spacing={0.75}>
														<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: FUERO_COLORS[s.fuero] ?? "#999", flexShrink: 0 }} />
														<Typography variant="body2">{FUERO_OPTIONS.find(f => f.value === s.fuero)?.label ?? s.fuero} {s.year}</Typography>
													</Stack>
													<Typography variant="caption" color="text.secondary">{s.description}</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="caption" fontFamily="monospace">
														{s.range.start.toLocaleString()} — {s.range.end.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2" fontWeight={600} color={s.type === "gap" ? "error.main" : "secondary.main"}>
														{s.type === "gap" ? s.score.toLocaleString() : `${s.year}`}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Button
														size="small"
														variant="contained"
														color={s.type === "gap" ? "error" : "secondary"}
														startIcon={<Flash size={13} />}
														onClick={() => openAssignDialog(getConfigId(s.worker), s.worker.worker_id ?? "", s.fuero, s.year, s.range)}
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
					)}

					{globalScanned && smartSuggestions.length === 0 && globalScanInfo && globalScanInfo.freeWorkers === 0 && (
						<Alert severity="warning">
							No hay workers al 100% disponibles para reasignar. Todos los workers están activos o en progreso.
						</Alert>
					)}

					<CreateConfigModal
						open={createModalOpen}
						onClose={() => { setCreateModalOpen(false); setCreateModalInitial(undefined); }}
						onSuccess={() => { setCreateModalOpen(false); setCreateModalInitial(undefined); handleGlobalScan(); }}
						initialValues={createModalInitial}
					/>
				</Stack>
			)}

			{/* Dialog de confirmación de asignación */}
			<AssignDialog
				state={assignDialog}
				onClose={() => setAssignDialog(emptyAssignDialog)}
				onEnableChange={v => setAssignDialog(prev => ({ ...prev, enableWorker: v }))}
				onConfirm={handleConfirmAssign}
			/>
		</Stack>
	);
};

export default CoveragePanel;
