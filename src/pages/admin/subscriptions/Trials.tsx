import React, { useState, useEffect, useCallback } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import {
	Box,
	Grid,
	Typography,
	IconButton,
	Tooltip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Chip,
	Stack,
	Card,
	CardContent,
	Skeleton,
	ToggleButton,
	ToggleButtonGroup,
	FormControlLabel,
	Switch,
} from "@mui/material";
import { Refresh, Clock, Warning2, TickCircle, CloseCircle, People, Folder2, Calculator, Profile2User } from "iconsax-react";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import MainCard from "components/MainCard";
import TrialsService, { TrialSubscription, TrialStats, TrialUrgency, GetTrialSubscriptionsParams } from "api/trials";

dayjs.extend(relativeTime);
dayjs.locale("es");

// ====================================
// HELPERS
// ====================================

const URGENCY_CONFIG: Record<
	TrialUrgency,
	{ color: "success" | "warning" | "error" | "default"; label: string; bgKey: string }
> = {
	ok:        { color: "success", label: "En curso",   bgKey: "success" },
	attention: { color: "warning", label: "7 días",     bgKey: "warning" },
	warning:   { color: "warning", label: "3 días",     bgKey: "warning" },
	critical:  { color: "error",   label: "Hoy/mañana", bgKey: "error"   },
	expired:   { color: "error",   label: "Vencido",    bgKey: "error"   },
	unknown:   { color: "default", label: "Sin fecha",  bgKey: "default" },
};

const PLAN_LABEL: Record<string, string> = {
	free: "Free", standard: "Standard", premium: "Premium",
};

const formatDate = (d: string | null) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

const DaysChip = ({ days, urgency }: { days: number | null; urgency: TrialUrgency }) => {
	const cfg = URGENCY_CONFIG[urgency];
	const label =
		days === null ? "—"
		: days < 0   ? `Vencido hace ${Math.abs(days)}d`
		: days === 0 ? "Vence hoy"
		:              `${days} día${days !== 1 ? "s" : ""}`;
	return <Chip label={label} size="small" color={cfg.color} variant="filled" />;
};

const ResourceBar = ({
	label,
	current,
	limit,
	atRisk,
}: {
	label: string;
	current: number;
	limit: number;
	atRisk: number;
}) => {
	const theme = useTheme();
	const pct = Math.min((current / Math.max(limit, 1)) * 100, 100);
	const color = atRisk > 0 ? theme.palette.error.main : theme.palette.success.main;
	return (
		<Box sx={{ minWidth: 80 }}>
			<Typography variant="caption" color="text.secondary">
				{label}: {current}/{limit}
				{atRisk > 0 && (
					<Typography component="span" variant="caption" color="error" sx={{ ml: 0.5 }}>
						(-{atRisk})
					</Typography>
				)}
			</Typography>
			<Box
				sx={{
					height: 4,
					borderRadius: 2,
					bgcolor: alpha(color, 0.15),
					mt: 0.3,
				}}
			>
				<Box
					sx={{
						height: "100%",
						width: `${pct}%`,
						borderRadius: 2,
						bgcolor: color,
						transition: "width 0.3s",
					}}
				/>
			</Box>
		</Box>
	);
};

// ====================================
// STAT CARDS
// ====================================

interface StatCardProps {
	title: string;
	value: number | undefined;
	subtitle: string;
	icon: React.ReactNode;
	color: "primary" | "warning" | "error" | "success";
	loading: boolean;
}

const StatCard = ({ title, value, subtitle, icon, color, loading }: StatCardProps) => {
	const theme = useTheme();
	const palette = theme.palette[color];
	return (
		<Card sx={{ height: "100%", border: `1px solid ${alpha(palette.main, 0.2)}` }}>
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="subtitle2" color="text.secondary" gutterBottom>
							{title}
						</Typography>
						{loading ? (
							<Skeleton width={60} height={40} />
						) : (
							<Typography variant="h3" color={`${color}.main`} fontWeight={700}>
								{value ?? "—"}
							</Typography>
						)}
						<Typography variant="caption" color="text.secondary">
							{subtitle}
						</Typography>
					</Box>
					<Box
						sx={{
							p: 1,
							borderRadius: 2,
							bgcolor: alpha(palette.main, 0.1),
							color: palette.main,
							display: "flex",
						}}
					>
						{icon}
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
};

// ====================================
// MAIN PAGE
// ====================================

const Trials = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [stats, setStats] = useState<TrialStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	const [rows, setRows] = useState<TrialSubscription[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);

	// Filtros
	const [page, setPage] = useState(1);
	const [expiringSoon, setExpiringSoon] = useState<"" | "1" | "3" | "7">("");
	const [testMode, setTestMode] = useState(false);

	// --------------------------------
	const fetchStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const res = await TrialsService.getTrialStats();
			setStats(res.data);
		} catch {
			enqueueSnackbar("Error al cargar estadísticas de trials", { variant: "error" });
		} finally {
			setStatsLoading(false);
		}
	}, [enqueueSnackbar]);

	const fetchTrials = useCallback(async () => {
		setLoading(true);
		try {
			const params: GetTrialSubscriptionsParams = {
				page,
				limit: 50,
				sortBy: "trialEnd",
				sortOrder: "asc",
				testMode,
			};
			if (expiringSoon) params.expiringSoon = expiringSoon;
			const res = await TrialsService.getTrialSubscriptions(params);
			setRows(res.data);
			setTotal(res.stats.total);
			setTotalPages(res.stats.totalPages);
		} catch {
			enqueueSnackbar("Error al cargar períodos de prueba", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, expiringSoon, testMode, enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		setPage(1);
	}, [expiringSoon, testMode]);

	useEffect(() => {
		fetchTrials();
	}, [fetchTrials]);

	const handleRefresh = () => {
		fetchStats();
		fetchTrials();
	};

	// --------------------------------
	return (
		<MainCard
			title="Períodos de Prueba"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={testMode}
								onChange={(e) => setTestMode(e.target.checked)}
							/>
						}
						label={<Typography variant="caption">Test mode</Typography>}
					/>
					<Tooltip title="Actualizar">
						<IconButton onClick={handleRefresh} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			}
		>
			{/* STATS */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Total en trial"
						value={stats?.total}
						subtitle="suscripciones activas"
						icon={<Clock size={24} />}
						color="primary"
						loading={statsLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Vencen en 3 días"
						value={stats?.expiring3d}
						subtitle="requieren atención"
						icon={<Warning2 size={24} />}
						color="warning"
						loading={statsLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Vencen hoy o mañana"
						value={stats?.expiring1d}
						subtitle="acción urgente"
						icon={<CloseCircle size={24} />}
						color="error"
						loading={statsLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Trials vencidos"
						value={stats?.expired}
						subtitle="sin conversión aún"
						icon={<TickCircle size={24} />}
						color="success"
						loading={statsLoading}
					/>
				</Grid>
			</Grid>

			{/* FILTROS */}
			<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
				<Typography variant="body2" color="text.secondary">
					Filtrar por vencimiento:
				</Typography>
				<ToggleButtonGroup
					size="small"
					value={expiringSoon}
					exclusive
					onChange={(_, val) => setExpiringSoon(val ?? "")}
				>
					<ToggleButton value="">Todos</ToggleButton>
					<ToggleButton value="1">Hoy / mañana</ToggleButton>
					<ToggleButton value="3">3 días</ToggleButton>
					<ToggleButton value="7">7 días</ToggleButton>
				</ToggleButtonGroup>
				<Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
					{total} resultado{total !== 1 ? "s" : ""}
				</Typography>
			</Stack>

			{/* TABLA */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Inicio trial</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Vencimiento</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Días restantes</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Recursos en riesgo</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Método de pago</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 8 }).map((_, j) => (
											<TableCell key={j}>
												<Skeleton height={20} />
											</TableCell>
										))}
									</TableRow>
							  ))
							: rows.length === 0
							? (
								<TableRow>
									<TableCell colSpan={8} align="center" sx={{ py: 4 }}>
										<Typography color="text.secondary">No hay períodos de prueba con los filtros seleccionados</Typography>
									</TableCell>
								</TableRow>
							)
							: rows.map((row) => {
									const urgencyCfg = URGENCY_CONFIG[row.urgency];
									const rowBg =
										row.urgency === "critical" || row.urgency === "expired"
											? alpha(theme.palette.error.main, 0.04)
											: row.urgency === "warning"
											? alpha(theme.palette.warning.main, 0.04)
											: "inherit";

									return (
										<TableRow
											key={row._id}
											sx={{ bgcolor: rowBg, "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
										>
											{/* Usuario */}
											<TableCell>
												<Stack direction="row" spacing={1} alignItems="center">
													<People size={16} color={theme.palette.text.secondary} />
													<Box>
														<Typography variant="body2" fontWeight={500}>
															{row.user?.email ?? "—"}
														</Typography>
														{row.user?.name && (
															<Typography variant="caption" color="text.secondary">
																{row.user.name}
															</Typography>
														)}
													</Box>
												</Stack>
											</TableCell>

											{/* Plan */}
											<TableCell>
												<Chip
													label={PLAN_LABEL[row.plan] ?? row.plan}
													size="small"
													variant="outlined"
													color={row.plan === "premium" ? "warning" : row.plan === "standard" ? "primary" : "default"}
												/>
											</TableCell>

											{/* Estado urgencia */}
											<TableCell>
												<Chip
													label={urgencyCfg.label}
													size="small"
													color={urgencyCfg.color}
													variant={row.urgency === "ok" ? "outlined" : "filled"}
												/>
											</TableCell>

											{/* Fechas */}
											<TableCell>
												<Typography variant="body2">{formatDate(row.trialStart)}</Typography>
											</TableCell>
											<TableCell>
												<Typography
													variant="body2"
													color={
														row.urgency === "expired" || row.urgency === "critical"
															? "error"
															: "text.primary"
													}
													fontWeight={row.urgency !== "ok" ? 600 : 400}
												>
													{formatDate(row.trialEnd)}
												</Typography>
											</TableCell>

											{/* Días restantes */}
											<TableCell>
												<DaysChip days={row.daysRemaining} urgency={row.urgency} />
											</TableCell>

											{/* Recursos en riesgo */}
											<TableCell sx={{ minWidth: 200 }}>
												{row.resources ? (
													row.resources.totalAtRisk > 0 ? (
														<Stack spacing={0.5}>
															{row.resources.folders.atRisk > 0 && (
																<ResourceBar
																	label="Carpetas"
																	current={row.resources.folders.current}
																	limit={row.resources.folders.limit}
																	atRisk={row.resources.folders.atRisk}
																/>
															)}
															{row.resources.calculators.atRisk > 0 && (
																<ResourceBar
																	label="Calculadoras"
																	current={row.resources.calculators.current}
																	limit={row.resources.calculators.limit}
																	atRisk={row.resources.calculators.atRisk}
																/>
															)}
															{row.resources.contacts.atRisk > 0 && (
																<ResourceBar
																	label="Contactos"
																	current={row.resources.contacts.current}
																	limit={row.resources.contacts.limit}
																	atRisk={row.resources.contacts.atRisk}
																/>
															)}
															<Typography variant="caption" color="error" fontWeight={600}>
																Total en riesgo: {row.resources.totalAtRisk}
															</Typography>
														</Stack>
													) : (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<TickCircle size={14} color={theme.palette.success.main} />
															<Typography variant="caption" color="success.main">
																Sin exceso
															</Typography>
														</Stack>
													)
												) : (
													<Typography variant="caption" color="text.disabled">—</Typography>
												)}
											</TableCell>

											{/* Método de pago */}
											<TableCell>
												{row.paymentMethod ? (
													<Chip label={row.paymentMethod} size="small" color="success" variant="outlined" />
												) : (
													<Chip label="Sin método" size="small" color="error" variant="outlined" />
												)}
											</TableCell>
										</TableRow>
									);
							  })}
					</TableBody>
				</Table>
			</TableContainer>

			{/* PAGINACIÓN */}
			{totalPages > 1 && (
				<Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
					<Stack direction="row" spacing={1}>
						{Array.from({ length: totalPages }).map((_, i) => (
							<Chip
								key={i}
								label={i + 1}
								size="small"
								color={page === i + 1 ? "primary" : "default"}
								onClick={() => setPage(i + 1)}
								clickable
							/>
						))}
					</Stack>
				</Stack>
			)}
		</MainCard>
	);
};

export default Trials;
