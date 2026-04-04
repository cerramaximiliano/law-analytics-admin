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
} from "@mui/material";
import { Refresh, AddCircle, TickCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, ScrapingCoverageData, CoverageGap } from "api/workers";
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

// Barra visual de cobertura segmentada
const CoverageBar: React.FC<{ data: ScrapingCoverageData }> = ({ data }) => {
	const { coveredRanges, gaps, maxRange, activeWorkers } = data;

	if (maxRange === 0) return null;

	type Segment = { type: "covered" | "gap-free" | "gap-assigned" | "active"; start: number; end: number; workerId?: string | null };

	// Construir segmentos en orden
	const activeSet = new Set(activeWorkers.map(w => `${w.range_start}-${w.range_end}`));
	const segments: Segment[] = [];

	// Unir covered y gaps en orden
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

	// Marcar workers activos sobre gaps asignados
	for (const seg of allSegments) {
		// check si hay worker activo dentro de este segmento
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
			{/* Leyenda */}
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

const CoveragePanel: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [fuero, setFuero] = useState<string>("CIV");
	const [year, setYear] = useState<string>(String(CURRENT_YEAR));
	const [loading, setLoading] = useState(false);
	const [coverage, setCoverage] = useState<ScrapingCoverageData | null>(null);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [selectedGap, setSelectedGap] = useState<CoverageGap | null>(null);

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

	return (
		<Stack spacing={2}>
			{/* Controles */}
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

			{/* Loading */}
			{loading && <LinearProgress />}

			{/* Sin datos */}
			{!loading && !coverage && (
				<Alert severity="info">Seleccioná fuero y año, luego hacé click en "Analizar" para ver la cobertura.</Alert>
			)}

			{/* Sin registros */}
			{!loading && coverage && coverage.maxRange === 0 && (
				<Alert severity="warning">No hay registros de historial para {fuero} — {year}.</Alert>
			)}

			{/* Resultados */}
			{!loading && coverage && coverage.maxRange > 0 && (
				<Stack spacing={2}>
					{/* Métricas */}
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						{[
							{
								label: "Rango total",
								value: `1 — ${coverage.maxRange.toLocaleString()}`,
								color: "text.primary",
							},
							{
								label: "Cubierto",
								value: `${coverage.totalCovered.toLocaleString()} (${coverage.coveragePercent}%)`,
								color: "success.main",
							},
							{
								label: "Gaps libres",
								value: freeGaps.length,
								color: freeGaps.length > 0 ? "error.main" : "success.main",
							},
							{
								label: "Gaps asignados",
								value: assignedGaps.length,
								color: "warning.main",
							},
							{
								label: "Workers activos",
								value: coverage.activeWorkers.length,
								color: "info.main",
							},
						].map(({ label, value, color }) => (
							<Card key={label} variant="outlined" sx={{ flex: 1, minWidth: 120 }}>
								<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										{label}
									</Typography>
									<Typography variant="h6" color={color} fontWeight="bold">
										{value}
									</Typography>
								</CardContent>
							</Card>
						))}
					</Stack>

					{/* Barra visual */}
					<Card variant="outlined">
						<CardContent>
							<CoverageBar data={coverage} />
						</CardContent>
					</Card>

					{/* Workers activos */}
					{coverage.activeWorkers.length > 0 && (
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Workers activos ({coverage.activeWorkers.length})
							</Typography>
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

					{/* Tabla de gaps */}
					{coverage.gaps.length > 0 ? (
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Períodos faltantes ({coverage.gaps.length})
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
										{coverage.gaps.map((gap, i) => (
											<TableRow
												key={i}
												sx={{
													bgcolor: gap.assigned ? "warning.lighter" : "error.lighter",
													"&:hover": { opacity: 0.9 },
												}}
											>
												<TableCell>
													<Typography variant="body2" fontFamily="monospace">
														{gap.start.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontFamily="monospace">
														{gap.end.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2">{gap.size.toLocaleString()}</Typography>
												</TableCell>
												<TableCell align="center">
													{gap.assigned ? (
														<Tooltip title={`Worker: ${gap.workerId}`} arrow>
															<Chip
																icon={<Warning2 size={14} />}
																label="Asignado"
																size="small"
																color="warning"
																variant="outlined"
															/>
														</Tooltip>
													) : (
														<Chip
															icon={<TickCircle size={14} />}
															label="Libre"
															size="small"
															color="error"
															variant="outlined"
														/>
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
				onClose={() => {
					setCreateModalOpen(false);
					setSelectedGap(null);
				}}
				onSuccess={handleCreateSuccess}
				initialValues={
					selectedGap
						? {
								fuero,
								year: Number(year),
								rangeStart: selectedGap.start,
								rangeEnd: selectedGap.end,
							}
						: undefined
				}
			/>
		</Stack>
	);
};

export default CoveragePanel;
