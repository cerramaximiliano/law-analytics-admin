import React, { useEffect, useState, useCallback } from "react";
import {
	Grid,
	Typography,
	Box,
	Skeleton,
	IconButton,
	Tooltip,
	useTheme,
	alpha,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Stack,
	Alert,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Divider,
} from "@mui/material";
import { Refresh, ArrowDown2, Calendar, Chart, InfoCircle } from "iconsax-react";
import MainCard from "components/MainCard";
import FunnelSnapshotsService, { FunnelSnapshot, FunnelBreakdownRow } from "api/funnelSnapshots";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";

// ==============================|| HELPERS ||============================== //

const fmtPercent = (n: number | null | undefined): string => {
	if (n == null) return "—";
	return `${(n * 100).toFixed(2)}%`;
};

const fmtDate = (iso?: string): string => {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("es-AR", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const fmtDateTime = (iso?: string): string => {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("es-AR", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// ==============================|| FUNNEL CARD ||============================== //

interface FunnelCardProps {
	snapshot: FunnelSnapshot | null;
	loading: boolean;
}

const FunnelCard: React.FC<FunnelCardProps> = ({ snapshot, loading }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	if (loading) {
		return (
			<MainCard>
				<Skeleton variant="text" width="60%" height={32} />
				<Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
				<Skeleton variant="rectangular" height={200} />
			</MainCard>
		);
	}

	if (!snapshot) {
		return (
			<MainCard>
				<Alert severity="info">
					Sin snapshots todavía. El cron diario corre a las 8 AM AR — esperá al primer run o ejecutalo manualmente
					con <code>npm run fetch</code> en <code>/var/www/la-ads</code>.
				</Alert>
			</MainCard>
		);
	}

	const stepKeys = Object.keys(snapshot.totals);
	const breakdownEntries = Object.entries(snapshot.breakdowns || {});

	return (
		<MainCard
			title={
				<Stack direction="row" spacing={1} alignItems="center">
					<Chart size={20} color={BRAND_BLUE} variant="Bold" />
					<Typography variant="h5">{snapshot.title}</Typography>
				</Stack>
			}
			secondary={
				<Chip
					size="small"
					label={snapshot.funnel.toUpperCase()}
					color={snapshot.funnel === "macro" ? "primary" : "secondary"}
					variant="filled"
					sx={{ fontVariantNumeric: "tabular-nums" }}
				/>
			}
		>
			<Stack spacing={2}>
				{/* Metadata */}
				<Box sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.07 : 0.045), p: 1.5, borderRadius: 1.5 }}>
					<Stack direction="row" spacing={2} flexWrap="wrap">
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Calendar size={14} color={theme.palette.text.secondary} />
							<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
								Rango: {fmtDate(snapshot.range.start)} → {fmtDate(snapshot.range.end)}
							</Typography>
						</Stack>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<InfoCircle size={14} color={theme.palette.text.secondary} />
							<Tooltip title={`Capturado: ${fmtDateTime(snapshot.capturedAt)}`}>
								<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
									Snapshot: {fmtDate(snapshot.date)}
								</Typography>
							</Tooltip>
						</Stack>
					</Stack>
				</Box>

				{/* Totales */}
				<TableContainer sx={{ border: `1px solid ${headerBorder(isDark)}`, borderRadius: 1.5 }}>
					<Table size="small">
						<TableHead>
							<TableRow sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.035) }}>
								<TableCell>Paso</TableCell>
								<TableCell align="right">Usuarios</TableCell>
								<TableCell align="right">% Finalización</TableCell>
								<TableCell align="right">% Abandono</TableCell>
								<TableCell align="right">Abandonos</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{stepKeys.map((key) => {
								const step = snapshot.totals[key];
								const isLast = key === stepKeys[stepKeys.length - 1];
								const completionColor = isLast
									? theme.palette.text.secondary
									: (step.completionRate ?? 0) > 0.5
										? LIVE_GREEN
										: (step.completionRate ?? 0) > 0.2
											? STALE_AMBER
											: theme.palette.error.main;
								return (
									<TableRow key={key} hover>
										<TableCell>
											<Typography variant="body2" fontWeight={500}>
												{step.name}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
												{step.users.toLocaleString("es-AR")}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography
												variant="body2"
												sx={{ fontVariantNumeric: "tabular-nums", color: completionColor, fontWeight: 600 }}
											>
												{isLast ? "—" : fmtPercent(step.completionRate)}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography
												variant="body2"
												color={isLast ? "text.secondary" : "error.main"}
												sx={{ fontVariantNumeric: "tabular-nums" }}
											>
												{isLast ? "—" : fmtPercent(step.abandonmentRate)}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
												{isLast ? "—" : step.abandonments?.toLocaleString("es-AR")}
											</Typography>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>

				<Divider />

				{/* Breakdowns */}
				<Box>
					<Typography variant="subtitle2" gutterBottom>
						Desgloses
					</Typography>
					{breakdownEntries.length === 0 && (
						<Alert severity="info" sx={{ mt: 1 }}>
							Sin desgloses disponibles en este snapshot.
						</Alert>
					)}
					{breakdownEntries.map(([key, rows]) => (
						<Accordion key={key} disableGutters sx={{ mt: 1, "&:before": { display: "none" } }}>
							<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
								<Stack direction="row" spacing={1} alignItems="center">
									<Typography variant="body2" fontWeight={500}>
										{prettifyBreakdownKey(key)}
									</Typography>
									<Chip size="small" label={`${rows.length} valores`} variant="outlined" />
								</Stack>
							</AccordionSummary>
							<AccordionDetails>
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Valor</TableCell>
												{stepKeys.map((sk) => (
													<TableCell key={sk} align="right">
														{snapshot.totals[sk].name}
													</TableCell>
												))}
											</TableRow>
										</TableHead>
										<TableBody>
											{rows.slice(0, 10).map((row, idx) => (
												<TableRow key={idx}>
													<TableCell>
														<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
															{row.name}
														</Typography>
													</TableCell>
													{stepKeys.map((sk) => {
														const stepName = snapshot.totals[sk].name;
														const value = row[stepName];
														return (
															<TableCell key={sk} align="right">
																<Typography variant="body2">
																	{typeof value === "number" ? value.toLocaleString("es-AR") : "—"}
																</Typography>
															</TableCell>
														);
													})}
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
								{rows.length > 10 && (
									<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
										Mostrando los primeros 10 de {rows.length} valores.
									</Typography>
								)}
							</AccordionDetails>
						</Accordion>
					))}
				</Box>
			</Stack>
		</MainCard>
	);
};

// Convierte "bySource" → "Por Source", "bySessionSource" → "Por Session Source"
const prettifyBreakdownKey = (key: string): string => {
	return key
		.replace(/^by/, "Por ")
		.replace(/([A-Z])/g, " $1")
		.replace(/^Por\s+/, "Por ")
		.trim();
};

// ==============================|| MAIN PAGE ||============================== //

const FunnelSnapshotsPage: React.FC = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [snapshots, setSnapshots] = useState<FunnelSnapshot[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await FunnelSnapshotsService.getLatest();
			setSnapshots(res.snapshots || []);
		} catch (err: any) {
			setError(err.response?.data?.message || err.message || "Error al cargar snapshots");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const macro = snapshots.find((s) => s.funnel === "macro") || null;
	const micro = snapshots.find((s) => s.funnel === "micro") || null;

	return (
		<Box sx={{ minHeight: "100dvh" }}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
				<Box sx={{ maxWidth: 760 }}>
					<Typography variant="h3" sx={{ mb: 0.75 }}>
						Funnel snapshots
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Último snapshot persistido por el cron diario de <code>la-ads</code> (a las 8 AM AR). Los datos vienen
						de la colección <code>funnelSnapshots</code>, no de queries en vivo a GA4.
					</Typography>
				</Box>
				<Tooltip title="Recargar">
					<IconButton
						onClick={fetchData}
						disabled={loading}
						sx={{
							color: BRAND_BLUE,
							transition: "transform 250ms ease",
							"&:hover": { transform: "rotate(90deg)" },
						}}
					>
						<Refresh size={20} />
					</IconButton>
				</Tooltip>
			</Stack>

			{error && (
				<Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
					{error}
				</Alert>
			)}

			<Grid container spacing={3}>
				<Grid item xs={12} md={6}>
					<FunnelCard snapshot={macro} loading={loading} />
				</Grid>
				<Grid item xs={12} md={6}>
					<FunnelCard snapshot={micro} loading={loading} />
				</Grid>
			</Grid>

			{/* Footer info */}
			{!loading && (macro || micro) && (
				<Box
					sx={{
						mt: 3,
						p: 2,
						bgcolor: alpha(BRAND_BLUE, isDark ? 0.07 : 0.045),
						border: `1px solid ${headerBorder(isDark)}`,
						borderRadius: 1.5,
					}}
				>
					<Typography variant="caption" color="text.secondary">
						Esta vista muestra el snapshot más reciente. Para evolución temporal o snapshots históricos, usar
						el endpoint <code>/api/funnel-snapshots/trend</code> o <code>/api/funnel-snapshots</code>.
					</Typography>
				</Box>
			)}
		</Box>
	);
};

export default FunnelSnapshotsPage;
