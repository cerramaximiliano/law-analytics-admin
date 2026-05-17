import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Chip,
	IconButton,
	CircularProgress,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Tooltip,
	Grid,
	Card,
	CardContent,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh2, Warning2, TickCircle, Timer, Clock } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ManagerConfigService, PjnSiteIncident } from "api/managerConfig";

function formatDateTime(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("es-AR", {
		timeZone: "America/Argentina/Buenos_Aires",
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function formatDuration(ms: number | null): string {
	if (ms === null || ms === undefined || ms < 0) return "—";
	const min = Math.floor(ms / 60000);
	if (min < 1) return `${Math.round(ms / 1000)} s`;
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h < 24) return `${h}h ${m}min`;
	const d = Math.floor(h / 24);
	const hr = h % 24;
	return `${d}d ${hr}h`;
}

function formatDurationLive(startedAtIso: string): string {
	const ms = Date.now() - new Date(startedAtIso).getTime();
	return formatDuration(ms);
}

const PERIOD_OPTIONS = [
	{ value: 0, label: "Todos" },
	{ value: 7, label: "Últimos 7 días" },
	{ value: 30, label: "Últimos 30 días" },
	{ value: 90, label: "Últimos 90 días" },
];

const PjnIncidentsPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [incidents, setIncidents] = useState<PjnSiteIncident[]>([]);
	const [summary, setSummary] = useState<{ totalDurationMs: number; avgDurationMs: number; closedCount: number; openCount: number } | null>(null);
	const [currentStatus, setCurrentStatus] = useState<string | null>(null);
	const [sinceDays, setSinceDays] = useState<number>(30);

	const fetchIncidents = useCallback(async () => {
		try {
			setLoading(true);
			const query = sinceDays > 0 ? { sinceDays, limit: 100 } : { limit: 100 };
			const res = await ManagerConfigService.getIncidents(query);
			setIncidents(res.data || []);
			setSummary(res.summary || null);
			setCurrentStatus(res.currentStatus?.status || null);
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error obteniendo historial de incidents", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [sinceDays, enqueueSnackbar]);

	useEffect(() => {
		fetchIncidents();
	}, [fetchIncidents]);

	const isInMaintenance = currentStatus === "maintenance";

	return (
		<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
			<CardContent>
				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Warning2 size={20} color={theme.palette.warning.main} />
						<Typography variant="h6">Historial de mantenimientos del PJN</Typography>
						{isInMaintenance && <Chip label="En curso" size="small" color="warning" icon={<Warning2 size={12} />} />}
					</Stack>
					<Stack direction="row" spacing={1} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Período</InputLabel>
							<Select value={sinceDays} label="Período" onChange={(e) => setSinceDays(Number(e.target.value))}>
								{PERIOD_OPTIONS.map((o) => (
									<MenuItem key={o.value} value={o.value}>
										{o.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<Tooltip title="Recargar">
							<IconButton size="small" onClick={fetchIncidents} disabled={loading}>
								<Refresh2 size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
						<CircularProgress />
					</Box>
				) : (
					<Stack spacing={2}>
						{/* Summary */}
						{summary && (
							<Grid container spacing={2}>
								<Grid item xs={6} sm={3}>
									<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 1 }}>
										<Warning2 size={20} color={theme.palette.warning.main} />
										<Typography variant="h5" fontWeight="bold">
											{summary.closedCount}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Caídas registradas
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 1 }}>
										<Timer size={20} color={theme.palette.error.main} />
										<Typography variant="h5" fontWeight="bold">
											{formatDuration(summary.totalDurationMs)}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Tiempo total
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
										<Clock size={20} color={theme.palette.info.main} />
										<Typography variant="h5" fontWeight="bold">
											{formatDuration(summary.avgDurationMs)}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Duración promedio
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 1 }}>
										{summary.openCount > 0 ? (
											<Warning2 size={20} color={theme.palette.warning.main} />
										) : (
											<TickCircle size={20} color={theme.palette.success.main} />
										)}
										<Typography variant="h5" fontWeight="bold">
											{summary.openCount}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											En curso
										</Typography>
									</Stack>
								</Grid>
							</Grid>
						)}

						{/* Tabla */}
						{incidents.length === 0 ? (
							<Box sx={{ textAlign: "center", py: 4 }}>
								<Typography variant="body2" color="text.secondary">
									Sin caídas registradas en el período seleccionado
								</Typography>
							</Box>
						) : (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Inicio</TableCell>
											<TableCell>Fin</TableCell>
											<TableCell>Duración</TableCell>
											<TableCell>Detectado por</TableCell>
											<TableCell>Resuelto por</TableCell>
											<TableCell align="center">Re-detecciones</TableCell>
											<TableCell>Mensaje del PJN</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{incidents.map((inc) => {
											const isOpen = !inc.endedAt;
											return (
												<TableRow key={inc._id} hover>
													<TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{formatDateTime(inc.startedAt)}</TableCell>
													<TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
														{isOpen ? (
															<Chip label="En curso" size="small" color="warning" sx={{ height: 20 }} />
														) : (
															formatDateTime(inc.endedAt)
														)}
													</TableCell>
													<TableCell sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
														{isOpen ? formatDurationLive(inc.startedAt) : formatDuration(inc.durationMs)}
													</TableCell>
													<TableCell>
														<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
															{inc.detectedBy || "—"}
														</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
															{inc.resolvedBy || "—"}
														</Typography>
													</TableCell>
													<TableCell align="center">{inc.consecutiveDetections}</TableCell>
													<TableCell sx={{ maxWidth: 280 }}>
														<Tooltip title={inc.message || ""} arrow>
															<Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
																{inc.message || "—"}
															</Typography>
														</Tooltip>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Stack>
				)}
			</CardContent>
		</Card>
	);
};

export default PjnIncidentsPanel;
