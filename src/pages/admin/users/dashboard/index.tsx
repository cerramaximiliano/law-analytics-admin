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
	Paper,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Tabs,
	Tab,
	Stack,
	Alert,
	Avatar,
	LinearProgress,
	FormControlLabel,
	Switch,
	Select,
	MenuItem,
} from "@mui/material";
import { Refresh, People, Profile2User, Crown1, Card, Magicpen, UserAdd, UserTick, Warning2, Login, MoneyRecive } from "iconsax-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import MainCard from "components/MainCard";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PREMIUM_GOLD } from "themes/dashboardTokens";
import UserDashboardService from "api/userDashboard";
import AdminAiUsageService, { AiUsageRow } from "api/adminAiUsage";
import { UserDashboardOverview, ActivityRankingRow, InactiveUserRow, NewUnactivatedRow, PaymentRiskRow } from "types/user-dashboard";
import { useSnackbar } from "notistack";

dayjs.extend(relativeTime);
dayjs.locale("es");

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

const fmtNum = (n: number | undefined | null): string => new Intl.NumberFormat("es-AR").format(n || 0);

const fmtDate = (date?: string | null): string => {
	if (!date) return "—";
	return dayjs(date).format("DD/MM/YY HH:mm");
};

const fmtFromNow = (date?: string | null): string => {
	if (!date) return "Nunca";
	return dayjs(date).fromNow();
};

const fmtUsd = (n: number | undefined): string =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);

const PLAN_COLOR: Record<string, "default" | "info" | "success" | "warning"> = {
	free: "default",
	standard: "info",
	pro: "success",
	premium: "warning",
};

const planChip = (plan?: string) => (
	<Chip size="small" label={(plan || "free").toUpperCase()} color={PLAN_COLOR[plan || "free"] || "default"} variant="outlined" />
);

const initials = (name?: string, email?: string): string => {
	const base = (name && name.trim()) || email || "?";
	const parts = base.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
	return base.slice(0, 2).toUpperCase();
};

// Chip de antigüedad de inactividad
const inactivityChip = (days: number | null) => {
	if (days === null) return <Chip size="small" label="Sin login" color="error" variant="outlined" />;
	const color: "warning" | "error" = days >= 60 ? "error" : "warning";
	return <Chip size="small" label={`${days} días`} color={color} variant="outlined" />;
};

// ----------------------------------------------------------------------
// Stat Card
// ----------------------------------------------------------------------

interface StatCardProps {
	title: string;
	value: number | string;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper
			elevation={0}
			sx={{
				p: 2.5,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				transition: "transform 200ms ease, box-shadow 200ms ease",
				"&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 20px ${alpha(color, 0.12)}` },
			}}
		>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
				<Box>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ letterSpacing: 0.3, textTransform: "uppercase", display: "block", mb: 0.5 }}
					>
						{title}
					</Typography>
					{loading ? (
						<Skeleton width={70} height={38} />
					) : (
						<Typography variant="h3" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
							{value}
						</Typography>
					)}
					{subtitle && (
						<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{subtitle}
						</Typography>
					)}
				</Box>
				<Box
					sx={{
						width: 44,
						height: 44,
						borderRadius: 1.25,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: alpha(color, 0.1),
						color,
					}}
				>
					{icon}
				</Box>
			</Stack>
		</Paper>
	);
};

// Celda de usuario reutilizable (avatar + nombre + email)
const UserCell: React.FC<{ name?: string; email?: string }> = ({ name, email }) => (
	<Stack direction="row" spacing={1.5} alignItems="center">
		<Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: alpha(BRAND_BLUE, 0.12), color: BRAND_BLUE }}>
			{initials(name, email)}
		</Avatar>
		<Box sx={{ minWidth: 0 }}>
			<Typography variant="body2" fontWeight={500} noWrap>
				{name || "—"}
			</Typography>
			<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
				{email || "—"}
			</Typography>
		</Box>
	</Stack>
);

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
	<div role="tabpanel" hidden={value !== index}>
		{value === index && <Box sx={{ pt: 2.5 }}>{children}</Box>}
	</div>
);

// ----------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------

const ROWS_PER_PAGE = 10;

const UsersDashboard: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [windowDays, setWindowDays] = useState<number>(30);
	const [tab, setTab] = useState<number>(0);

	// Overview
	const [overview, setOverview] = useState<UserDashboardOverview | null>(null);
	const [overviewLoading, setOverviewLoading] = useState<boolean>(true);

	// Segmentos
	const [topUsers, setTopUsers] = useState<ActivityRankingRow[]>([]);
	const [topLoading, setTopLoading] = useState<boolean>(false);

	const [inactive, setInactive] = useState<InactiveUserRow[]>([]);
	const [inactiveTotal, setInactiveTotal] = useState<number>(0);
	const [inactivePage, setInactivePage] = useState<number>(0);
	const [inactiveOnlyPaid, setInactiveOnlyPaid] = useState<boolean>(false);
	const [inactiveLoading, setInactiveLoading] = useState<boolean>(false);

	const [newUsers, setNewUsers] = useState<NewUnactivatedRow[]>([]);
	const [newTotal, setNewTotal] = useState<number>(0);
	const [newPage, setNewPage] = useState<number>(0);
	const [newLoading, setNewLoading] = useState<boolean>(false);

	const [aiUsers, setAiUsers] = useState<AiUsageRow[]>([]);
	const [aiLoading, setAiLoading] = useState<boolean>(false);

	const [paymentRisk, setPaymentRisk] = useState<PaymentRiskRow[]>([]);
	const [paymentTotal, setPaymentTotal] = useState<number>(0);
	const [paymentPage, setPaymentPage] = useState<number>(0);
	const [paymentLoading, setPaymentLoading] = useState<boolean>(false);

	const [error, setError] = useState<string | null>(null);

	// --- Fetchers ---
	const fetchOverview = useCallback(async () => {
		setOverviewLoading(true);
		setError(null);
		try {
			const res = await UserDashboardService.getOverview(windowDays);
			setOverview(res.data);
		} catch (e: any) {
			setError(e.message || "Error al cargar el dashboard");
		} finally {
			setOverviewLoading(false);
		}
	}, [windowDays]);

	const fetchTop = useCallback(async () => {
		setTopLoading(true);
		try {
			const res = await UserDashboardService.getActivityRanking(windowDays, 20);
			setTopUsers(res.data);
		} catch (e: any) {
			enqueueSnackbar(e.message, { variant: "error" });
		} finally {
			setTopLoading(false);
		}
	}, [windowDays, enqueueSnackbar]);

	const fetchInactive = useCallback(async () => {
		setInactiveLoading(true);
		try {
			const res = await UserDashboardService.getInactive({
				days: windowDays,
				page: inactivePage + 1,
				limit: ROWS_PER_PAGE,
				onlyPaid: inactiveOnlyPaid,
			});
			setInactive(res.data);
			setInactiveTotal(res.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(e.message, { variant: "error" });
		} finally {
			setInactiveLoading(false);
		}
	}, [windowDays, inactivePage, inactiveOnlyPaid, enqueueSnackbar]);

	const fetchNew = useCallback(async () => {
		setNewLoading(true);
		try {
			const res = await UserDashboardService.getNewUnactivated({ days: windowDays, page: newPage + 1, limit: ROWS_PER_PAGE });
			setNewUsers(res.data);
			setNewTotal(res.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(e.message, { variant: "error" });
		} finally {
			setNewLoading(false);
		}
	}, [windowDays, newPage, enqueueSnackbar]);

	const fetchAi = useCallback(async () => {
		setAiLoading(true);
		try {
			const period = dayjs().format("YYYY-MM");
			const res = await AdminAiUsageService.getMonthly({ period, page: 1, limit: 20, sortBy: "count", sortOrder: "desc" });
			setAiUsers(res.data);
		} catch (e: any) {
			enqueueSnackbar(e.message, { variant: "error" });
		} finally {
			setAiLoading(false);
		}
	}, [enqueueSnackbar]);

	const fetchPayment = useCallback(async () => {
		setPaymentLoading(true);
		try {
			const res = await UserDashboardService.getPaymentRisk({ page: paymentPage + 1, limit: ROWS_PER_PAGE });
			setPaymentRisk(res.data);
			setPaymentTotal(res.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(e.message, { variant: "error" });
		} finally {
			setPaymentLoading(false);
		}
	}, [paymentPage, enqueueSnackbar]);

	// Overview + tab 0 al cambiar ventana
	useEffect(() => {
		fetchOverview();
	}, [fetchOverview]);

	// Cargar el segmento del tab activo (lazy por tab)
	useEffect(() => {
		if (tab === 0) fetchTop();
		else if (tab === 1) fetchInactive();
		else if (tab === 2) fetchNew();
		else if (tab === 3) fetchAi();
		else if (tab === 4) fetchPayment();
	}, [tab, fetchTop, fetchInactive, fetchNew, fetchAi, fetchPayment]);

	const handleRefresh = () => {
		fetchOverview();
		if (tab === 0) fetchTop();
		else if (tab === 1) fetchInactive();
		else if (tab === 2) fetchNew();
		else if (tab === 3) fetchAi();
		else if (tab === 4) fetchPayment();
	};

	// --- Render: distribución por plan ---
	const renderPlanDistribution = () => {
		if (!overview) return null;
		const { byPlan } = overview.subscriptions;
		const totalPlans = byPlan.free + byPlan.standard + byPlan.pro + byPlan.premium || 1;
		const segments = [
			{ label: "Free", value: byPlan.free, color: theme.palette.grey[400] },
			{ label: "Standard", value: byPlan.standard, color: BRAND_BLUE },
			{ label: "Pro", value: byPlan.pro, color: LIVE_GREEN },
			{ label: "Premium", value: byPlan.premium, color: PREMIUM_GOLD },
		];
		return (
			<Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ letterSpacing: 0.3, textTransform: "uppercase", display: "block", mb: 1.5 }}
				>
					Distribución por plan
				</Typography>
				<Box sx={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", mb: 1.5 }}>
					{segments.map((s) => (
						<Box key={s.label} sx={{ width: `${(s.value / totalPlans) * 100}%`, bgcolor: s.color }} />
					))}
				</Box>
				<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
					{segments.map((s) => (
						<Stack key={s.label} direction="row" spacing={0.75} alignItems="center">
							<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color }} />
							<Typography variant="caption" color="text.secondary">
								{s.label}: <b>{fmtNum(s.value)}</b>
							</Typography>
						</Stack>
					))}
				</Stack>
			</Paper>
		);
	};

	const emptyRow = (cols: number, msg: string) => (
		<TableRow>
			<TableCell colSpan={cols} align="center" sx={{ py: 4 }}>
				<Typography variant="body2" color="text.secondary">
					{msg}
				</Typography>
			</TableCell>
		</TableRow>
	);

	return (
		<MainCard
			title={
				<Stack direction="row" alignItems="center" spacing={1}>
					<Profile2User size={22} color={BRAND_BLUE} variant="Bold" />
					<Typography variant="h3">Dashboard de Usuarios</Typography>
				</Stack>
			}
			secondary={
				<Stack direction="row" spacing={1.5} alignItems="center">
					<Select size="small" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} sx={{ minWidth: 120 }}>
						<MenuItem value={7}>Últimos 7 días</MenuItem>
						<MenuItem value={30}>Últimos 30 días</MenuItem>
						<MenuItem value={90}>Últimos 90 días</MenuItem>
					</Select>
					<Tooltip title="Refrescar">
						<IconButton onClick={handleRefresh}>
							<Refresh size={20} />
						</IconButton>
					</Tooltip>
				</Stack>
			}
		>
			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{/* KPIs */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Usuarios totales"
						value={fmtNum(overview?.users.total)}
						subtitle={`${fmtNum(overview?.users.activeAccounts)} cuentas activas`}
						icon={<People size={22} variant="Bold" />}
						color={BRAND_BLUE}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title={`Activos (${windowDays}d)`}
						value={fmtNum(overview?.users.activeInWindow)}
						subtitle={`${fmtNum(overview?.users.newThisWeek)} nuevos esta semana`}
						icon={<Login size={22} variant="Bold" />}
						color={LIVE_GREEN}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title={`Inactivos (${windowDays}d)`}
						value={fmtNum(overview?.users.inactiveInWindow)}
						subtitle="Sin login en la ventana"
						icon={<Warning2 size={22} variant="Bold" />}
						color={STALE_AMBER}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Usuarios pagos"
						value={fmtNum(overview?.subscriptions.paidUsers)}
						subtitle={`${fmtNum(overview?.subscriptions.paymentRisk)} en riesgo de pago`}
						icon={<Card size={22} variant="Bold" />}
						color={PREMIUM_GOLD}
						loading={overviewLoading}
					/>
				</Grid>

				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Activación"
						value={overview ? `${overview.onboarding.completionRate}%` : "—"}
						subtitle={`${fmtNum(overview?.onboarding.completed)} onboarding completo`}
						icon={<UserTick size={22} variant="Bold" />}
						color={BRAND_BLUE}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Verificados"
						value={fmtNum(overview?.users.verified)}
						subtitle="Email verificado"
						icon={<UserTick size={22} variant="Bold" />}
						color={LIVE_GREEN}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} md={6}>
					{overviewLoading ? <Skeleton variant="rounded" height={96} /> : renderPlanDistribution()}
				</Grid>
			</Grid>

			{/* Segmentos */}
			<Box sx={{ mt: 3, borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
					<Tab icon={<Crown1 size={18} />} iconPosition="start" label="Top usuarios" />
					<Tab icon={<Warning2 size={18} />} iconPosition="start" label="Inactivos / churn" />
					<Tab icon={<UserAdd size={18} />} iconPosition="start" label="Nuevos sin activar" />
					<Tab icon={<Magicpen size={18} />} iconPosition="start" label="Heavy IA" />
					<Tab icon={<MoneyRecive size={18} />} iconPosition="start" label="Pagos en riesgo" />
				</Tabs>
			</Box>

			{/* Tab 0: Top usuarios */}
			<TabPanel value={tab} index={0}>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
					Score = días activos × 10 + logins (ventana de {windowDays} días)
				</Typography>
				{topLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>#</TableCell>
								<TableCell>Usuario</TableCell>
								<TableCell>Plan</TableCell>
								<TableCell align="right">Score</TableCell>
								<TableCell align="right">Logins</TableCell>
								<TableCell align="right">Días activos</TableCell>
								<TableCell>Último login</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!topLoading && topUsers.length === 0 && emptyRow(7, "Sin actividad en el período")}
							{topUsers.map((u, i) => (
								<TableRow key={u._id} hover>
									<TableCell>
										<Typography variant="body2" fontWeight={600} color={i < 3 ? PREMIUM_GOLD : "text.secondary"}>
											{i + 1}
										</Typography>
									</TableCell>
									<TableCell>
										<UserCell name={u.name} email={u.email} />
									</TableCell>
									<TableCell>{planChip(u.subscriptionPlan)}</TableCell>
									<TableCell align="right">
										<Chip size="small" label={fmtNum(u.score)} color="primary" />
									</TableCell>
									<TableCell align="right">{fmtNum(u.totalLogins)}</TableCell>
									<TableCell align="right">{fmtNum(u.activeDays)}</TableCell>
									<TableCell>
										<Tooltip title={fmtDate(u.lastLogin)}>
											<Typography variant="body2">{fmtFromNow(u.lastLogin)}</Typography>
										</Tooltip>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			</TabPanel>

			{/* Tab 1: Inactivos / churn */}
			<TabPanel value={tab} index={1}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
					<Typography variant="caption" color="text.secondary">
						Cuentas activas sin login en {windowDays} días, más antiguas primero
					</Typography>
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={inactiveOnlyPaid}
								onChange={(e) => {
									setInactivePage(0);
									setInactiveOnlyPaid(e.target.checked);
								}}
							/>
						}
						label={<Typography variant="caption">Solo pagos</Typography>}
					/>
				</Stack>
				{inactiveLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Usuario</TableCell>
								<TableCell>Plan</TableCell>
								<TableCell>Inactividad</TableCell>
								<TableCell>Último login</TableCell>
								<TableCell>Registrado</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!inactiveLoading && inactive.length === 0 && emptyRow(5, "Sin usuarios inactivos")}
							{inactive.map((u) => (
								<TableRow key={u._id} hover>
									<TableCell>
										<UserCell name={u.name} email={u.email} />
									</TableCell>
									<TableCell>
										<Stack direction="row" spacing={0.5} alignItems="center">
											{planChip(u.plan)}
											{u.isPaid && <Card size={14} color={PREMIUM_GOLD} variant="Bold" />}
										</Stack>
									</TableCell>
									<TableCell>{inactivityChip(u.daysSinceLastLogin)}</TableCell>
									<TableCell>
										<Typography variant="body2">{fmtFromNow(u.lastLogin)}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" color="text.secondary">
											{fmtDate(u.createdAt)}
										</Typography>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				<TablePagination
					component="div"
					count={inactiveTotal}
					page={inactivePage}
					onPageChange={(_, p) => setInactivePage(p)}
					rowsPerPage={ROWS_PER_PAGE}
					rowsPerPageOptions={[ROWS_PER_PAGE]}
				/>
			</TabPanel>

			{/* Tab 2: Nuevos sin activar */}
			<TabPanel value={tab} index={2}>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
					Registrados en los últimos {windowDays} días sin completar onboarding ni crear primera carpeta
				</Typography>
				{newLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Usuario</TableCell>
								<TableCell>Verificado</TableCell>
								<TableCell align="right">Sesiones onboarding</TableCell>
								<TableCell align="right">Antigüedad</TableCell>
								<TableCell>Registrado</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!newLoading && newUsers.length === 0 && emptyRow(5, "Sin registros pendientes de activación")}
							{newUsers.map((u) => (
								<TableRow key={u._id} hover>
									<TableCell>
										<UserCell name={u.name} email={u.email} />
									</TableCell>
									<TableCell>
										{u.isVerified ? (
											<Chip size="small" label="Sí" color="success" variant="outlined" />
										) : (
											<Chip size="small" label="No" color="default" variant="outlined" />
										)}
									</TableCell>
									<TableCell align="right">{fmtNum(u.onboardingSessionsCount)}</TableCell>
									<TableCell align="right">
										<Chip size="small" label={`${u.daysSinceRegistration} días`} variant="outlined" />
									</TableCell>
									<TableCell>
										<Typography variant="body2" color="text.secondary">
											{fmtDate(u.createdAt)}
										</Typography>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				<TablePagination
					component="div"
					count={newTotal}
					page={newPage}
					onPageChange={(_, p) => setNewPage(p)}
					rowsPerPage={ROWS_PER_PAGE}
					rowsPerPageOptions={[ROWS_PER_PAGE]}
				/>
			</TabPanel>

			{/* Tab 3: Heavy IA */}
			<TabPanel value={tab} index={3}>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
					Mayores consumidores de IA del período {dayjs().format("YYYY-MM")}
				</Typography>
				{aiLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Usuario</TableCell>
								<TableCell>Plan</TableCell>
								<TableCell align="right">Consultas</TableCell>
								<TableCell align="right">Tokens</TableCell>
								<TableCell align="right">Costo</TableCell>
								<TableCell>Última consulta</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!aiLoading && aiUsers.length === 0 && emptyRow(6, "Sin uso de IA en el período")}
							{aiUsers.map((u) => (
								<TableRow key={u._id} hover>
									<TableCell>
										<UserCell name={u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()} email={u.email} />
									</TableCell>
									<TableCell>{planChip(u.plan)}</TableCell>
									<TableCell align="right">
										<Chip size="small" label={fmtNum(u.count)} color={u.count >= 200 ? "warning" : "default"} />
									</TableCell>
									<TableCell align="right">{fmtNum(u.tokensTotal)}</TableCell>
									<TableCell align="right">{fmtUsd(u.costUsd)}</TableCell>
									<TableCell>
										<Typography variant="body2">{fmtFromNow(u.lastUsedAt)}</Typography>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			</TabPanel>

			{/* Tab 4: Pagos en riesgo */}
			<TabPanel value={tab} index={4}>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
					Suscripciones con pagos fallidos, en gracia o con cancelación programada
				</Typography>
				{paymentLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Usuario</TableCell>
								<TableCell>Plan</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell align="right">Fallos</TableCell>
								<TableCell>Vence</TableCell>
								<TableCell>Último fallo</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!paymentLoading && paymentRisk.length === 0 && emptyRow(6, "Sin suscripciones en riesgo")}
							{paymentRisk.map((s) => (
								<TableRow key={s._id} hover>
									<TableCell>
										<UserCell name={s.name} email={s.email} />
									</TableCell>
									<TableCell>{planChip(s.plan)}</TableCell>
									<TableCell>
										<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
											<Chip
												size="small"
												label={s.accountStatus || s.status}
												color={
													s.accountStatus === "grace_period" || s.accountStatus === "at_risk"
														? "warning"
														: s.accountStatus === "suspended"
														? "error"
														: "default"
												}
												variant="outlined"
											/>
											{s.cancelAtPeriodEnd && <Chip size="small" label="Cancela" color="error" variant="outlined" />}
										</Stack>
									</TableCell>
									<TableCell align="right">
										{s.paymentFailuresCount > 0 ? <Chip size="small" label={fmtNum(s.paymentFailuresCount)} color="error" /> : "—"}
									</TableCell>
									<TableCell>
										<Typography variant="body2" color="text.secondary">
											{s.currentPeriodEnd ? dayjs(s.currentPeriodEnd).format("DD/MM/YY") : "—"}
										</Typography>
									</TableCell>
									<TableCell>
										<Tooltip title={s.lastFailureReason || ""}>
											<Typography variant="body2">{fmtFromNow(s.lastFailedAt)}</Typography>
										</Tooltip>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				<TablePagination
					component="div"
					count={paymentTotal}
					page={paymentPage}
					onPageChange={(_, p) => setPaymentPage(p)}
					rowsPerPage={ROWS_PER_PAGE}
					rowsPerPageOptions={[ROWS_PER_PAGE]}
				/>
			</TabPanel>
		</MainCard>
	);
};

export default UsersDashboard;
