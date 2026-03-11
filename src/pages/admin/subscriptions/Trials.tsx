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
	Tabs,
	Tab,
	TextField,
	Button,
	InputAdornment,
	Alert,
} from "@mui/material";
import {
	Refresh,
	Clock,
	Warning2,
	TickCircle,
	CloseCircle,
	People,
	ArrowDown,
	CardPos,
	Setting2,
	Edit2,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import MainCard from "components/MainCard";
import TrialsService, {
	TrialSubscription,
	TrialStats,
	TrialUrgency,
	GracePeriod,
	GraceStats,
	PlanTrialConfig,
	GetTrialSubscriptionsParams,
	GetGracePeriodsParams,
} from "api/trials";

dayjs.extend(relativeTime);
dayjs.locale("es");

// ── Helpers ───────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<
	TrialUrgency,
	{ color: "success" | "warning" | "error" | "default"; label: string }
> = {
	ok:        { color: "success", label: "En curso"    },
	attention: { color: "warning", label: "7 días"      },
	warning:   { color: "warning", label: "3 días"      },
	critical:  { color: "error",   label: "Hoy/mañana"  },
	expired:   { color: "error",   label: "Vencido"     },
	unknown:   { color: "default", label: "Sin fecha"   },
};

const PLAN_COLOR: Record<string, "default" | "primary" | "warning"> = {
	free: "default", standard: "primary", premium: "warning",
};

const formatDate = (d: string | null | undefined) => (d ? dayjs(d).format("DD/MM/YYYY") : "—");

const getDaysUrgency = (days: number | null): TrialUrgency => {
	if (days === null) return "unknown";
	if (days < 0) return "expired";
	if (days <= 1) return "critical";
	if (days <= 3) return "warning";
	if (days <= 7) return "attention";
	return "ok";
};

// ── Componentes pequeños ──────────────────────────────────────────────────────

const DaysChip = ({ days, urgency }: { days: number | null; urgency: TrialUrgency }) => {
	const cfg = URGENCY_CONFIG[urgency];
	const label =
		days === null ? "—"
		: days < 0   ? `Vencido hace ${Math.abs(days)}d`
		: days === 0 ? "Vence hoy"
		:              `${days}d restante${days !== 1 ? "s" : ""}`;
	return <Chip label={label} size="small" color={cfg.color} variant="filled" />;
};

const ResourceBar = ({ label, current, limit, atRisk }: { label: string; current: number; limit: number; atRisk: number }) => {
	const theme = useTheme();
	const pct = Math.min((current / Math.max(limit, 1)) * 100, 100);
	const color = atRisk > 0 ? theme.palette.error.main : theme.palette.success.main;
	return (
		<Box>
			<Typography variant="caption" color="text.secondary">
				{label}: {current}/{limit}
				{atRisk > 0 && <Typography component="span" variant="caption" color="error" sx={{ ml: 0.5 }}>(-{atRisk})</Typography>}
			</Typography>
			<Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(color, 0.15), mt: 0.3 }}>
				<Box sx={{ height: "100%", width: `${pct}%`, borderRadius: 2, bgcolor: color }} />
			</Box>
		</Box>
	);
};

interface StatCardProps {
	title: string; value: number | undefined; subtitle: string;
	icon: React.ReactNode; color: "primary" | "warning" | "error" | "success"; loading: boolean;
}
const StatCard = ({ title, value, subtitle, icon, color, loading }: StatCardProps) => {
	const theme = useTheme();
	const pal = theme.palette[color];
	return (
		<Card sx={{ height: "100%", border: `1px solid ${alpha(pal.main, 0.2)}` }}>
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="subtitle2" color="text.secondary" gutterBottom>{title}</Typography>
						{loading ? <Skeleton width={60} height={40} /> : (
							<Typography variant="h3" color={`${color}.main`} fontWeight={700}>{value ?? "—"}</Typography>
						)}
						<Typography variant="caption" color="text.secondary">{subtitle}</Typography>
					</Box>
					<Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(pal.main, 0.1), color: pal.main, display: "flex" }}>
						{icon}
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
};

// ── Tab 1: Períodos de Gracia ─────────────────────────────────────────────────

const GraceTab = ({ testMode }: { testMode: boolean }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [stats, setStats] = useState<GraceStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);
	const [rows, setRows] = useState<GracePeriod[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState<"" | "downgrade" | "payment">("");
	const [statusFilter, setStatusFilter] = useState<"" | "active" | "expired">("");

	const fetchStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const res = await TrialsService.getGraceStats();
			setStats(res.data);
		} catch {
			enqueueSnackbar("Error al cargar estadísticas de períodos de gracia", { variant: "error" });
		} finally {
			setStatsLoading(false);
		}
	}, [enqueueSnackbar]);

	const fetchRows = useCallback(async () => {
		setLoading(true);
		try {
			const params: GetGracePeriodsParams = { page, limit: 50, testMode };
			if (typeFilter) params.type = typeFilter;
			if (statusFilter) params.status = statusFilter;
			const res = await TrialsService.getGracePeriods(params);
			setRows(res.data);
			setTotal(res.stats.total);
			setTotalPages(res.stats.totalPages);
		} catch {
			enqueueSnackbar("Error al cargar períodos de gracia", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, typeFilter, statusFilter, testMode, enqueueSnackbar]);

	useEffect(() => { fetchStats(); }, [fetchStats]);
	useEffect(() => { setPage(1); }, [typeFilter, statusFilter, testMode]);
	useEffect(() => { fetchRows(); }, [fetchRows]);

	return (
		<Box>
			{/* Stats */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Total períodos" value={stats?.total} subtitle="downgrade + pago" icon={<Clock size={24} />} color="primary" loading={statsLoading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Downgrade activos" value={stats?.downgrade.active} subtitle="aún no vencidos" icon={<ArrowDown size={24} />} color="warning" loading={statsLoading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Downgrade vencidos" value={stats?.downgrade.expired} subtitle="sin procesar" icon={<Warning2 size={24} />} color="error" loading={statsLoading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Gracia por pago" value={stats?.payment.total} subtitle="pago fallido" icon={<CardPos size={24} />} color="error" loading={statsLoading} />
				</Grid>
			</Grid>

			{/* Filtros */}
			<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
				<ToggleButtonGroup size="small" value={typeFilter} exclusive onChange={(_, v) => setTypeFilter(v ?? "")}>
					<ToggleButton value="">Todos</ToggleButton>
					<ToggleButton value="downgrade">Downgrade</ToggleButton>
					<ToggleButton value="payment">Pago fallido</ToggleButton>
				</ToggleButtonGroup>
				<ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => setStatusFilter(v ?? "")}>
					<ToggleButton value="">Todos</ToggleButton>
					<ToggleButton value="active">Activos</ToggleButton>
					<ToggleButton value="expired">Vencidos</ToggleButton>
				</ToggleButtonGroup>
				<Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>{total} resultado{total !== 1 ? "s" : ""}</Typography>
			</Stack>

			{/* Tabla */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<TableCell sx={{ fontWeight: 600 }}>Usuario</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Plan anterior → destino</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Inicio</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Vencimiento</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Días restantes</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Recursos en riesgo</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Recordatorios</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}
									</TableRow>
								))
							: rows.length === 0
							? (
								<TableRow>
									<TableCell colSpan={8} align="center" sx={{ py: 4 }}>
										<Typography color="text.secondary">No hay períodos de gracia con los filtros seleccionados</Typography>
									</TableCell>
								</TableRow>
							)
							: rows.map((row) => {
									const urgency = getDaysUrgency(row.daysRemaining);
									const rowBg = row.isExpired
										? alpha(theme.palette.error.main, 0.04)
										: urgency === "warning" || urgency === "critical"
										? alpha(theme.palette.warning.main, 0.04)
										: "inherit";

									return (
										<TableRow key={row._id} sx={{ bgcolor: rowBg }}>
											{/* Usuario */}
											<TableCell>
												<Stack direction="row" spacing={1} alignItems="center">
													<People size={16} color={theme.palette.text.secondary} />
													<Box>
														<Typography variant="body2" fontWeight={500}>{row.user?.email ?? "—"}</Typography>
														{row.user?.name && <Typography variant="caption" color="text.secondary">{row.user.name}</Typography>}
													</Box>
												</Stack>
											</TableCell>
											{/* Tipo */}
											<TableCell>
												<Chip
													label={row.type === "downgrade" ? "Downgrade" : "Pago fallido"}
													size="small"
													color={row.type === "downgrade" ? "warning" : "error"}
													icon={row.type === "downgrade" ? <ArrowDown size={12} /> : <CardPos size={12} />}
												/>
											</TableCell>
											{/* Planes */}
											<TableCell>
												<Stack direction="row" spacing={0.5} alignItems="center">
													<Chip label={row.previousPlan ?? "—"} size="small" color={PLAN_COLOR[row.previousPlan ?? ""] ?? "default"} variant="outlined" />
													<Typography variant="caption">→</Typography>
													<Chip label={row.targetPlan ?? "—"} size="small" color={PLAN_COLOR[row.targetPlan ?? ""] ?? "default"} variant="outlined" />
												</Stack>
											</TableCell>
											{/* Fechas */}
											<TableCell><Typography variant="body2">{formatDate(row.startedAt)}</Typography></TableCell>
											<TableCell>
												<Typography variant="body2" color={row.isExpired ? "error" : "text.primary"} fontWeight={row.isExpired ? 600 : 400}>
													{formatDate(row.expiresAt)}
												</Typography>
											</TableCell>
											{/* Días */}
											<TableCell><DaysChip days={row.daysRemaining} urgency={urgency} /></TableCell>
											{/* Recursos */}
											<TableCell sx={{ minWidth: 180 }}>
												{row.resources ? (
													row.resources.totalAtRisk > 0 ? (
														<Stack spacing={0.5}>
															{row.resources.folders.atRisk > 0 && <ResourceBar label="Carpetas" current={row.resources.folders.current} limit={row.resources.folders.limit} atRisk={row.resources.folders.atRisk} />}
															{row.resources.calculators.atRisk > 0 && <ResourceBar label="Calculadoras" current={row.resources.calculators.current} limit={row.resources.calculators.limit} atRisk={row.resources.calculators.atRisk} />}
															{row.resources.contacts.atRisk > 0 && <ResourceBar label="Contactos" current={row.resources.contacts.current} limit={row.resources.contacts.limit} atRisk={row.resources.contacts.atRisk} />}
															<Typography variant="caption" color="error" fontWeight={600}>Total: {row.resources.totalAtRisk}</Typography>
														</Stack>
													) : (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<TickCircle size={14} color={theme.palette.success.main} />
															<Typography variant="caption" color="success.main">Sin exceso</Typography>
														</Stack>
													)
												) : <Typography variant="caption" color="text.disabled">—</Typography>}
											</TableCell>
											{/* Recordatorios */}
											<TableCell>
												{row.type === "downgrade" ? (
													<Stack spacing={0.5}>
														<Chip size="small" label="3 días" color={row.reminder3DaysSent ? "success" : "default"} variant={row.reminder3DaysSent ? "filled" : "outlined"} />
														<Chip size="small" label="1 día" color={row.reminder1DaySent ? "success" : "default"} variant={row.reminder1DaySent ? "filled" : "outlined"} />
													</Stack>
												) : (
													<Chip size="small" label="Enviado" color={row.reminderSent ? "success" : "default"} variant={row.reminderSent ? "filled" : "outlined"} />
												)}
											</TableCell>
										</TableRow>
									);
								})}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Paginación */}
			{totalPages > 1 && (
				<Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
					<Stack direction="row" spacing={1}>
						{Array.from({ length: totalPages }).map((_, i) => (
							<Chip key={i} label={i + 1} size="small" color={page === i + 1 ? "primary" : "default"} onClick={() => setPage(i + 1)} clickable />
						))}
					</Stack>
				</Stack>
			)}
		</Box>
	);
};

// ── Tab 2: Períodos de Prueba + Configuración ─────────────────────────────────

const TrialsTab = ({ testMode }: { testMode: boolean }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [stats, setStats] = useState<TrialStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);
	const [rows, setRows] = useState<TrialSubscription[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [page, setPage] = useState(1);
	const [expiringSoon, setExpiringSoon] = useState<"" | "1" | "3" | "7">("");

	// Config
	const [config, setConfig] = useState<PlanTrialConfig[]>([]);
	const [configLoading, setConfigLoading] = useState(true);
	const [editingPlan, setEditingPlan] = useState<string | null>(null);
	const [editEnv, setEditEnv] = useState<"development" | "production">("production");
	const [editDays, setEditDays] = useState<string>("");
	const [saving, setSaving] = useState(false);

	const fetchStats = useCallback(async () => {
		setStatsLoading(true);
		try { const res = await TrialsService.getTrialStats(); setStats(res.data); }
		catch { enqueueSnackbar("Error al cargar estadísticas", { variant: "error" }); }
		finally { setStatsLoading(false); }
	}, [enqueueSnackbar]);

	const fetchRows = useCallback(async () => {
		setLoading(true);
		try {
			const params: GetTrialSubscriptionsParams = { page, limit: 50, sortBy: "trialEnd", sortOrder: "asc", testMode };
			if (expiringSoon) params.expiringSoon = expiringSoon;
			const res = await TrialsService.getTrialSubscriptions(params);
			setRows(res.data); setTotal(res.stats.total); setTotalPages(res.stats.totalPages);
		} catch { enqueueSnackbar("Error al cargar períodos de prueba", { variant: "error" }); }
		finally { setLoading(false); }
	}, [page, expiringSoon, testMode, enqueueSnackbar]);

	const fetchConfig = useCallback(async () => {
		setConfigLoading(true);
		try { const res = await TrialsService.getTrialConfig(); setConfig(res.data); }
		catch { enqueueSnackbar("Error al cargar configuración de trial", { variant: "error" }); }
		finally { setConfigLoading(false); }
	}, [enqueueSnackbar]);

	useEffect(() => { fetchStats(); fetchConfig(); }, [fetchStats, fetchConfig]);
	useEffect(() => { setPage(1); }, [expiringSoon, testMode]);
	useEffect(() => { fetchRows(); }, [fetchRows]);

	const startEdit = (plan: PlanTrialConfig) => {
		setEditingPlan(plan.planId);
		setEditDays(String(plan.trialDays[editEnv]));
	};

	const handleSave = async () => {
		if (!editingPlan) return;
		const days = parseInt(editDays, 10);
		if (isNaN(days) || days < 0) {
			enqueueSnackbar("Ingresa un número válido de días (≥ 0)", { variant: "warning" });
			return;
		}
		setSaving(true);
		try {
			await TrialsService.updateTrialConfig(editingPlan, { environment: editEnv, trialDays: days });
			enqueueSnackbar(`Período de prueba actualizado: ${days} días para ${editingPlan} (${editEnv})`, { variant: "success" });
			setEditingPlan(null);
			fetchConfig();
		} catch {
			enqueueSnackbar("Error al guardar configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Box>
			{/* Stats */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Total en trial" value={stats?.total} subtitle="suscripciones" icon={<Clock size={24} />} color="primary" loading={statsLoading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Vencen en 3 días" value={stats?.expiring3d} subtitle="requieren atención" icon={<Warning2 size={24} />} color="warning" loading={statsLoading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Vencen hoy/mañana" value={stats?.expiring1d} subtitle="acción urgente" icon={<CloseCircle size={24} />} color="error" loading={statsLoading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard title="Trials vencidos" value={stats?.expired} subtitle="sin conversión" icon={<TickCircle size={24} />} color="success" loading={statsLoading} />
				</Grid>
			</Grid>

			{/* Configuración de trial */}
			<Card variant="outlined" sx={{ mb: 3 }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Setting2 size={18} color={theme.palette.primary.main} />
						<Typography variant="subtitle1" fontWeight={600}>Configuración de período de prueba</Typography>
					</Stack>
					<Alert severity="info" sx={{ mb: 2 }}>
						El período de prueba se aplica automáticamente al crear una sesión de checkout en Stripe. Cambiar este valor afecta a nuevos suscriptores, no a los existentes.
					</Alert>

					{/* Selector de ambiente */}
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="body2" color="text.secondary">Ambiente:</Typography>
						<ToggleButtonGroup size="small" value={editEnv} exclusive onChange={(_, v) => { if (v) { setEditEnv(v); setEditingPlan(null); } }}>
							<ToggleButton value="production">Producción</ToggleButton>
							<ToggleButton value="development">Desarrollo</ToggleButton>
						</ToggleButtonGroup>
					</Stack>

					{configLoading ? (
						<Stack spacing={1}>{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={56} />)}</Stack>
					) : (
						<Stack spacing={2}>
							{config.map((plan) => (
								<Box key={plan.planId} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
									<Stack direction="row" justifyContent="space-between" alignItems="center">
										<Box>
											<Stack direction="row" spacing={1} alignItems="center">
												<Chip label={plan.displayName} size="small" color={PLAN_COLOR[plan.planId] ?? "default"} />
												<Typography variant="body2" color="text.secondary">
													Actual ({editEnv}):
													<Typography component="span" fontWeight={700} sx={{ ml: 0.5 }}>
														{plan.trialDays[editEnv]} días
													</Typography>
												</Typography>
											</Stack>
										</Box>
										{editingPlan === plan.planId ? (
											<Stack direction="row" spacing={1} alignItems="center">
												<TextField
													size="small"
													type="number"
													value={editDays}
													onChange={(e) => setEditDays(e.target.value)}
													sx={{ width: 120 }}
													InputProps={{
														endAdornment: <InputAdornment position="end">días</InputAdornment>,
														inputProps: { min: 0 }
													}}
												/>
												<Button size="small" variant="contained" onClick={handleSave} disabled={saving}>
													{saving ? "Guardando..." : "Guardar"}
												</Button>
												<Button size="small" onClick={() => setEditingPlan(null)}>Cancelar</Button>
											</Stack>
										) : (
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => startEdit(plan)}>
													<Edit2 size={16} />
												</IconButton>
											</Tooltip>
										)}
									</Stack>
								</Box>
							))}
						</Stack>
					)}
				</CardContent>
			</Card>

			{/* Tabla de usuarios en trial */}
			<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
				<Typography variant="subtitle2">Usuarios actualmente en trial</Typography>
				<ToggleButtonGroup size="small" value={expiringSoon} exclusive onChange={(_, v) => setExpiringSoon(v ?? "")}>
					<ToggleButton value="">Todos</ToggleButton>
					<ToggleButton value="1">Hoy/mañana</ToggleButton>
					<ToggleButton value="3">3 días</ToggleButton>
					<ToggleButton value="7">7 días</ToggleButton>
				</ToggleButtonGroup>
				<Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>{total} resultado{total !== 1 ? "s" : ""}</Typography>
			</Stack>

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
							? Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton height={20} /></TableCell>)}
									</TableRow>
								))
							: rows.length === 0
							? (
								<TableRow>
									<TableCell colSpan={8} align="center" sx={{ py: 4 }}>
										<Typography color="text.secondary">No hay usuarios en período de prueba con los filtros seleccionados</Typography>
									</TableCell>
								</TableRow>
							)
							: rows.map((row) => {
									const urgency = URGENCY_CONFIG[row.urgency];
									const rowBg = row.urgency === "critical" || row.urgency === "expired"
										? alpha(theme.palette.error.main, 0.04)
										: row.urgency === "warning" ? alpha(theme.palette.warning.main, 0.04)
										: "inherit";
									return (
										<TableRow key={row._id} sx={{ bgcolor: rowBg }}>
											<TableCell>
												<Stack direction="row" spacing={1} alignItems="center">
													<People size={16} color={theme.palette.text.secondary} />
													<Box>
														<Typography variant="body2" fontWeight={500}>{row.user?.email ?? "—"}</Typography>
														{row.user?.name && <Typography variant="caption" color="text.secondary">{row.user.name}</Typography>}
													</Box>
												</Stack>
											</TableCell>
											<TableCell><Chip label={row.plan} size="small" color={PLAN_COLOR[row.plan] ?? "default"} variant="outlined" /></TableCell>
											<TableCell><Chip label={urgency.label} size="small" color={urgency.color} variant={row.urgency === "ok" ? "outlined" : "filled"} /></TableCell>
											<TableCell><Typography variant="body2">{formatDate(row.trialStart)}</Typography></TableCell>
											<TableCell>
												<Typography variant="body2" color={row.urgency === "expired" || row.urgency === "critical" ? "error" : "text.primary"} fontWeight={row.urgency !== "ok" ? 600 : 400}>
													{formatDate(row.trialEnd)}
												</Typography>
											</TableCell>
											<TableCell><DaysChip days={row.daysRemaining} urgency={row.urgency} /></TableCell>
											<TableCell sx={{ minWidth: 180 }}>
												{row.resources ? (
													row.resources.totalAtRisk > 0 ? (
														<Stack spacing={0.5}>
															{row.resources.folders.atRisk > 0 && <ResourceBar label="Carpetas" current={row.resources.folders.current} limit={row.resources.folders.limit} atRisk={row.resources.folders.atRisk} />}
															{row.resources.calculators.atRisk > 0 && <ResourceBar label="Calculadoras" current={row.resources.calculators.current} limit={row.resources.calculators.limit} atRisk={row.resources.calculators.atRisk} />}
															{row.resources.contacts.atRisk > 0 && <ResourceBar label="Contactos" current={row.resources.contacts.current} limit={row.resources.contacts.limit} atRisk={row.resources.contacts.atRisk} />}
															<Typography variant="caption" color="error" fontWeight={600}>Total: {row.resources.totalAtRisk}</Typography>
														</Stack>
													) : (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<TickCircle size={14} color={theme.palette.success.main} />
															<Typography variant="caption" color="success.main">Sin exceso</Typography>
														</Stack>
													)
												) : <Typography variant="caption" color="text.disabled">—</Typography>}
											</TableCell>
											<TableCell>
												{row.paymentMethod
													? <Chip label={row.paymentMethod} size="small" color="success" variant="outlined" />
													: <Chip label="Sin método" size="small" color="error" variant="outlined" />}
											</TableCell>
										</TableRow>
									);
								})}
					</TableBody>
				</Table>
			</TableContainer>

			{totalPages > 1 && (
				<Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
					<Stack direction="row" spacing={1}>
						{Array.from({ length: totalPages }).map((_, i) => (
							<Chip key={i} label={i + 1} size="small" color={page === i + 1 ? "primary" : "default"} onClick={() => setPage(i + 1)} clickable />
						))}
					</Stack>
				</Stack>
			)}
		</Box>
	);
};

// ── Página principal ──────────────────────────────────────────────────────────

const Trials = () => {
	const [tab, setTab] = useState(0);
	const [testMode, setTestMode] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	const handleRefresh = () => setRefreshKey((k) => k + 1);

	return (
		<MainCard
			title="Suscripciones — Períodos"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<FormControlLabel
						control={<Switch size="small" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />}
						label={<Typography variant="caption">Test mode</Typography>}
					/>
					<Tooltip title="Actualizar">
						<IconButton onClick={handleRefresh} size="small"><Refresh size={18} /></IconButton>
					</Tooltip>
				</Stack>
			}
		>
			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
				<Tab label="Períodos de Gracia" icon={<ArrowDown size={16} />} iconPosition="start" />
				<Tab label="Períodos de Prueba" icon={<Clock size={16} />} iconPosition="start" />
			</Tabs>

			{tab === 0 && <GraceTab key={`grace-${refreshKey}-${testMode}`} testMode={testMode} />}
			{tab === 1 && <TrialsTab key={`trial-${refreshKey}-${testMode}`} testMode={testMode} />}
		</MainCard>
	);
};

export default Trials;
