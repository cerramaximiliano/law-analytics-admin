import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Grid, Typography, Box, Skeleton, IconButton, Tooltip, useTheme, alpha, Paper, Chip } from "@mui/material";
import {
	Refresh,
	UserSquare,
	ReceiptItem,
	Folder,
	Sms,
	Profile2User,
	MessageProgramming,
	InfoCircle,
	TickCircle,
	Clock,
	Timer1,
	ArrowRight2,
} from "iconsax-react";
import { useNavigate } from "react-router-dom";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Legend,
	Tooltip as RechartsTooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
} from "recharts";
import MainCard from "components/MainCard";
import { DashboardService } from "store/reducers/dashboard";
import { DashboardSummary } from "types/dashboard";
import { useRequestQueueRefresh } from "hooks/useRequestQueueRefresh";
import { useSnackbar } from "notistack";

// Simplified color palette with clear hierarchy
// Rule: 1 primary + 2 semantic + 1 premium-only
const COLORS = {
	// Primary - Blue/Indigo: Navigation, highlights, main metrics
	primary: {
		main: "#4F46E5",
		light: "#6366F1",
		lighter: "#EEF2FF",
	},
	// Success - Green: Active, verified, live mode
	success: {
		main: "#10B981",
		light: "#34D399",
		lighter: "#ECFDF5",
	},
	// Warning - Orange: ONLY for test mode and pending states
	warning: {
		main: "#F59E0B",
		light: "#FBBF24",
		lighter: "#FFFBEB",
	},
	// Neutral - Gray: Inactive, unverified, secondary info
	neutral: {
		main: "#64748B",
		light: "#94A3B8",
		lighter: "#F1F5F9",
		text: "#475569",
	},
	// Premium - Violet: ONLY for Premium plan (upsell)
	premium: {
		main: "#8B5CF6",
		light: "#A78BFA",
		lighter: "#F5F3FF",
	},
};

// Metric info descriptions
const metricInfo: Record<string, string> = {
	// Users
	totalUsers: "Cantidad total de usuarios registrados en la plataforma, incluyendo activos e inactivos.",
	activeUsers: "Usuarios que tienen su cuenta activa y pueden acceder a la plataforma.",
	verifiedUsers: "Usuarios que han verificado su correo electrónico.",
	// Subscriptions
	totalSubscriptions: "Total de suscripciones creadas en el sistema.",
	activeSubscriptions: "Suscripciones con estado activo que permiten acceso a las funcionalidades del plan.",
	freePlan: "Usuarios con plan gratuito que tienen acceso limitado a funcionalidades.",
	standardPlan: "Usuarios con plan Standard que tienen acceso a funcionalidades intermedias.",
	premiumPlan: "Usuarios con plan Premium que tienen acceso completo a todas las funcionalidades.",
	// Subscriptions - Live mode
	liveSubscriptions: "Suscripciones en modo PRODUCCIÓN de Stripe. Estas son suscripciones reales con pagos reales.",
	liveActive: "Suscripciones activas en modo producción.",
	// Subscriptions - Test mode
	testSubscriptions: "Suscripciones en modo TEST de Stripe. Usadas para desarrollo y pruebas, sin pagos reales.",
	testActive: "Suscripciones activas en modo test.",
	// Folders
	totalFolders: "Total de carpetas/causas creadas por todos los usuarios en la plataforma.",
	verifiedFolders: "Carpetas vinculadas y verificadas con fuentes externas (PJN + MEV).",
	// PJN Folders
	pjnTotal: "Total de causas PJN (Poder Judicial de la Nación) = Verificadas + No Verificadas.",
	pjnVerified: "Causas PJN verificadas y válidas (verified: true, isValid: true). Corresponde a la ruta 'Carpetas Verificadas (App)'.",
	pjnNonVerified: "Causas PJN verificadas pero no válidas (verified: true, isValid: false). Corresponde a la ruta 'Carpetas No Verificadas'.",
	// MEV Folders
	mevTotal: "Total de causas MEV (Mesa de Entradas Virtual de la Provincia de Buenos Aires) = Verificadas + No Verificadas.",
	mevVerified: "Causas MEV verificadas y válidas (verified: true, isValid: true). Corresponde a la ruta 'MEV Verificadas (App)'.",
	mevNonVerified: "Causas MEV verificadas pero no válidas (verified: true, isValid: false). Corresponde a la ruta 'MEV No Verificadas'.",
	// Marketing - Campaigns
	totalCampaigns: "Total de campañas de email marketing creadas.",
	activeCampaigns: "Campañas que están actualmente en ejecución enviando correos.",
	scheduledCampaigns: "Campañas programadas para ejecutarse en una fecha futura.",
	// Marketing - Contacts
	totalContacts: "Total de contactos en la base de datos de marketing.",
	activeContacts: "Contactos activos que pueden recibir correos (no desuscritos ni rebotados).",
	// Marketing - Email Verification
	emailVerifiedContacts: "Contactos cuyo email ha sido verificado a través del sistema de validación.",
	emailNotVerifiedContacts: "Contactos cuyo email aún no ha sido verificado.",
	verificationValidContacts: "Contactos verificados con resultado VÁLIDO (el email existe y puede recibir correos).",
	verificationNotValidContacts: "Contactos verificados pero con resultado NO VÁLIDO o pendiente de verificación.",
	// Marketing - Segments
	totalSegments: "Total de segmentos creados para organizar contactos.",
	dynamicSegments: "Segmentos que se actualizan automáticamente según criterios definidos.",
	staticSegments: "Segmentos con lista fija de contactos agregados manualmente.",
};

// Info Tooltip Component
interface InfoTooltipProps {
	metricKey: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ metricKey }) => {
	const theme = useTheme();
	const info = metricInfo[metricKey];

	if (!info) return null;

	return (
		<Tooltip
			title={
				<Typography variant="body2" sx={{ p: 0.5 }}>
					{info}
				</Typography>
			}
			arrow
			placement="top"
		>
			<Box
				component="span"
				sx={{
					display: "inline-flex",
					cursor: "help",
					color: theme.palette.text.secondary,
					opacity: 0.6,
					"&:hover": { opacity: 1 },
					ml: 0.5,
				}}
			>
				<InfoCircle size={14} />
			</Box>
		</Tooltip>
	);
};

// Custom Tooltip for Charts
interface CustomTooltipProps {
	active?: boolean;
	payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
	const theme = useTheme();

	if (active && payload && payload.length) {
		return (
			<Paper
				elevation={3}
				sx={{
					p: 1.5,
					bgcolor: theme.palette.background.paper,
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: 1,
				}}
			>
				<Typography variant="body2" sx={{ fontWeight: 600, color: payload[0].payload.color }}>
					{payload[0].name}: {payload[0].value.toLocaleString()}
				</Typography>
			</Paper>
		);
	}
	return null;
};

// Primary KPI Card Component - Clean, number-focused design
interface PrimaryKPICardProps {
	title: string;
	value: number;
	icon: React.ReactNode;
	valueColor: string;
	loading?: boolean;
	infoKey: string;
	linkTo?: string;
	onClick?: () => void;
}

const PrimaryKPICard: React.FC<PrimaryKPICardProps> = ({ title, value, icon, valueColor, loading, infoKey, linkTo, onClick }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isClickable = linkTo || onClick;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (linkTo) {
			navigate(linkTo);
		}
	};

	return (
		<Paper
			elevation={0}
			onClick={isClickable ? handleClick : undefined}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: isClickable ? "pointer" : "default",
				transition: "all 0.2s ease",
				...(isClickable && {
					"&:hover": {
						boxShadow: theme.shadows[2],
						borderColor: COLORS.primary.light,
					},
				}),
			}}
		>
			{/* Header: Icon + Title + Info */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Box sx={{ color: COLORS.neutral.light, display: "flex" }}>
						{icon}
					</Box>
					<Typography variant="body2" sx={{ color: COLORS.neutral.text, fontWeight: 500 }}>
						{title}
					</Typography>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<InfoTooltip metricKey={infoKey} />
					{isClickable && <ArrowRight2 size={14} style={{ color: COLORS.neutral.light }} />}
				</Box>
			</Box>
			{/* Value - The hero */}
			{loading ? (
				<Skeleton variant="text" width={80} height={48} />
			) : (
				<Typography variant="h3" sx={{ fontWeight: 700, color: valueColor, lineHeight: 1 }}>
					{value.toLocaleString()}
				</Typography>
			)}
		</Paper>
	);
};

// Section Header Component
interface SectionHeaderProps {
	title: string;
	subtitle?: string;
	icon: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon }) => {
	const theme = useTheme();

	return (
		<Box sx={{ mb: 2.5 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
				<Typography variant="h5" fontWeight="bold">
					{title}
				</Typography>
			</Box>
			{subtitle && (
				<Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, ml: 4 }}>
					{subtitle}
				</Typography>
			)}
		</Box>
	);
};

// Chart Card Component
interface ChartCardProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	linkTo?: string;
	height?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, linkTo, height = 280 }) => {
	const theme = useTheme();
	const navigate = useNavigate();

	const handleClick = () => {
		if (linkTo) {
			navigate(linkTo);
		}
	};

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: linkTo ? "pointer" : "default",
				transition: "all 0.2s ease",
				...(linkTo && {
					"&:hover": {
						boxShadow: theme.shadows[2],
						borderColor: alpha(theme.palette.primary.main, 0.3),
					},
				}),
			}}
			onClick={linkTo ? handleClick : undefined}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
					<Typography variant="subtitle1" fontWeight="bold">
						{title}
					</Typography>
				</Box>
				{linkTo && <ArrowRight2 size={16} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
			</Box>
			<Box sx={{ height }}>
				{children}
			</Box>
		</Paper>
	);
};

// Stats Legend Component for charts
interface StatsLegendProps {
	items: Array<{ label: string; value: number; color: string; infoKey?: string }>;
	loading?: boolean;
}

const StatsLegend: React.FC<StatsLegendProps> = ({ items, loading }) => {
	const theme = useTheme();

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, justifyContent: "center", height: "100%" }}>
			{items.map((item, index) => (
				<Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
					<Box
						sx={{
							width: 12,
							height: 12,
							borderRadius: "50%",
							bgcolor: item.color,
							flexShrink: 0,
						}}
					/>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
							<Typography variant="body2" color="textSecondary" noWrap>
								{item.label}
							</Typography>
							{item.infoKey && <InfoTooltip metricKey={item.infoKey} />}
						</Box>
						{loading ? (
							<Skeleton variant="text" width={40} height={24} />
						) : (
							<Typography variant="h6" sx={{ fontWeight: 600, color: item.color }}>
								{item.value.toLocaleString()}
							</Typography>
						)}
					</Box>
				</Box>
			))}
		</Box>
	);
};

// Grouped Card Component - For grouping related metrics
interface GroupedCardProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	linkTo?: string;
	onClick?: () => void;
}

const GroupedCard: React.FC<GroupedCardProps> = ({ title, icon, children, linkTo, onClick }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isClickable = linkTo || onClick;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (linkTo) {
			navigate(linkTo);
		}
	};

	return (
		<Paper
			elevation={0}
			onClick={isClickable ? handleClick : undefined}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: isClickable ? "pointer" : "default",
				transition: "all 0.2s ease",
				...(isClickable && {
					"&:hover": {
						boxShadow: theme.shadows[2],
						borderColor: alpha(theme.palette.primary.main, 0.3),
					},
				}),
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
					<Typography variant="subtitle1" fontWeight="bold">
						{title}
					</Typography>
				</Box>
				{isClickable && <ArrowRight2 size={16} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
			</Box>
			{children}
		</Paper>
	);
};

// Mini Stat Component - For inline stats
interface MiniStatProps {
	label: string;
	value: number;
	color?: string;
	loading?: boolean;
	infoKey: string;
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value, color, loading, infoKey }) => {
	const theme = useTheme();

	return (
		<Box sx={{ textAlign: "center", flex: 1 }}>
			{loading ? (
				<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
			) : (
				<Typography variant="h4" sx={{ fontWeight: 600, color: color || theme.palette.text.primary }}>
					{value.toLocaleString()}
				</Typography>
			)}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
				<Typography variant="caption" color="textSecondary">
					{label}
				</Typography>
				<InfoTooltip metricKey={infoKey} />
			</Box>
		</Box>
	);
};

const AdminDashboard = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<DashboardSummary | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await DashboardService.getSummary();
			if (response.success) {
				setData(response.data);
				setLastUpdated(response.timestamp);
			}
		} catch (error: any) {
			console.error("Error fetching dashboard data:", error);
			enqueueSnackbar(error?.message || "Error al cargar datos del dashboard", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useRequestQueueRefresh(fetchData);

	const handleRefresh = () => {
		fetchData();
	};

	// Chart data - Consistent colors: Green=Active/Verified, Gray=Inactive/Unverified
	const userStatusData = useMemo(() => data ? [
		{ name: "Activos", value: data.users.active, color: COLORS.success.main },
		{ name: "Inactivos", value: data.users.total - data.users.active, color: COLORS.neutral.light },
	] : [], [data]);

	const userVerificationData = useMemo(() => data ? [
		{ name: "Verificados", value: data.users.verified, color: COLORS.success.main },
		{ name: "Sin verificar", value: data.users.total - data.users.verified, color: COLORS.neutral.light },
	] : [], [data]);

	// Subscription plans: Gray=Free, Primary=Standard, Premium=Violet (only place for violet)
	const subscriptionPlanData = useMemo(() => data ? [
		{ name: "Free", value: data.subscriptions.live?.byPlan?.free || 0, color: COLORS.neutral.main },
		{ name: "Standard", value: data.subscriptions.live?.byPlan?.standard || 0, color: COLORS.primary.main },
		{ name: "Premium", value: data.subscriptions.live?.byPlan?.premium || 0, color: COLORS.premium.main },
	].filter(item => item.value > 0) : [], [data]);

	const foldersComparisonData = useMemo(() => data ? [
		{
			name: "PJN",
			verificadas: data.folders.pjn?.verified || 0,
			noVerificadas: data.folders.pjn?.nonVerified || 0,
		},
		{
			name: "MEV",
			verificadas: data.folders.mev?.verified || 0,
			noVerificadas: data.folders.mev?.nonVerified || 0,
		},
	] : [], [data]);

	// Marketing - consistent: Green=Active, Gray=Inactive
	const marketingContactsData = useMemo(() => data ? [
		{ name: "Activos", value: data.marketing.contacts.active, color: COLORS.success.main },
		{ name: "Inactivos", value: data.marketing.contacts.total - data.marketing.contacts.active, color: COLORS.neutral.light },
	] : [], [data]);

	// Marketing - Email verification (isEmailVerified field)
	const emailVerificationData = useMemo(() => data ? [
		{ name: "Verificados", value: data.marketing.contacts.emailVerified || 0, color: COLORS.success.main },
		{ name: "No Verificados", value: data.marketing.contacts.emailNotVerified || 0, color: COLORS.neutral.light },
	] : [], [data]);

	// Marketing - Verification result (emailVerification.verified field - within verified emails)
	const verificationResultData = useMemo(() => data ? [
		{ name: "Válidos", value: data.marketing.contacts.verificationValid || 0, color: COLORS.success.main },
		{ name: "No Válidos", value: data.marketing.contacts.verificationNotValid || 0, color: COLORS.neutral.light },
	] : [], [data]);

	// Segments - use primary blue tones (no violet - not premium)
	const segmentsData = useMemo(() => data ? [
		{ name: "Dinámicos", value: data.marketing.segments.dynamic, color: COLORS.primary.main },
		{ name: "Estáticos", value: data.marketing.segments.static, color: COLORS.primary.light },
	].filter(item => item.value > 0) : [], [data]);

	const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
		if (percent < 0.05) return null;
		const RADIAN = Math.PI / 180;
		const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
		const x = cx + radius * Math.cos(-midAngle * RADIAN);
		const y = cy + radius * Math.sin(-midAngle * RADIAN);

		return (
			<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
				{`${(percent * 100).toFixed(0)}%`}
			</text>
		);
	};

	return (
		<>
			<MainCard
				title="Dashboard"
				secondary={
					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						{lastUpdated && (
							<Chip
								size="small"
								icon={<Clock size={14} />}
								label={`Actualizado: ${new Date(lastUpdated).toLocaleString("es-ES")}`}
								variant="outlined"
								sx={{ borderRadius: 1.5 }}
							/>
						)}
						<Tooltip title="Actualizar datos">
							<IconButton onClick={handleRefresh} disabled={loading} size="small" color="primary">
								<Refresh
									size={20}
									style={{
										animation: loading ? "spin 1s linear infinite" : "none",
									}}
								/>
							</IconButton>
						</Tooltip>
					</Box>
				}
			>
				<style>{`
					@keyframes spin {
						from { transform: rotate(0deg); }
						to { transform: rotate(360deg); }
					}
				`}</style>

				{/* Primary KPIs Row - Most Important Metrics */}
				<Box sx={{ mb: 4 }}>
					<Typography variant="overline" color="textSecondary" sx={{ mb: 2, display: "block", letterSpacing: 1.5 }}>
						Resumen General
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Total Usuarios"
								value={data?.users.total || 0}
								icon={<UserSquare size={20} />}
								valueColor={COLORS.primary.main}
								loading={loading}
								infoKey="totalUsers"
								linkTo="/admin/users"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Suscripciones Activas"
								value={data?.subscriptions.active || 0}
								icon={<ReceiptItem size={20} />}
								valueColor={COLORS.success.main}
								loading={loading}
								infoKey="activeSubscriptions"
								linkTo="/admin/usuarios/suscripciones"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Carpetas Verificadas"
								value={data?.folders.verified || 0}
								icon={<Folder size={20} />}
								valueColor={COLORS.success.main}
								loading={loading}
								infoKey="verifiedFolders"
								linkTo="/admin/causas/verified"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Contactos Marketing"
								value={data?.marketing.contacts.total || 0}
								icon={<Profile2User size={20} />}
								valueColor={COLORS.primary.main}
								loading={loading}
								infoKey="totalContacts"
								linkTo="/admin/marketing/contacts"
							/>
						</Grid>
					</Grid>
				</Box>

				{/* Detailed Sections with Charts */}
				<Grid container spacing={3}>
					{/* Users Section with Charts */}
					<Grid item xs={12} lg={6}>
						<SectionHeader title="Usuarios" subtitle="Estadísticas de usuarios registrados" icon={<UserSquare size={22} variant="Bold" />} />
						<Grid container spacing={2}>
							{/* User Status Donut Chart */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Estado de Usuarios" icon={<TickCircle size={18} />} linkTo="/admin/users" height={200}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={150} height={150} />
										</Box>
									) : (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={7}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={userStatusData}
															cx="50%"
															cy="50%"
															innerRadius={40}
															outerRadius={70}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{userStatusData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={5}>
												<StatsLegend
													items={[
														{ label: "Activos", value: data?.users.active || 0, color: COLORS.success.main, infoKey: "activeUsers" },
														{ label: "Inactivos", value: (data?.users.total || 0) - (data?.users.active || 0), color: COLORS.neutral.light },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									)}
								</ChartCard>
							</Grid>

							{/* User Verification Donut Chart */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Verificación de Email" icon={<TickCircle size={18} />} linkTo="/admin/users" height={200}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={150} height={150} />
										</Box>
									) : (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={7}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={userVerificationData}
															cx="50%"
															cy="50%"
															innerRadius={40}
															outerRadius={70}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{userVerificationData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={5}>
												<StatsLegend
													items={[
														{ label: "Verificados", value: data?.users.verified || 0, color: COLORS.success.main, infoKey: "verifiedUsers" },
														{ label: "Sin verificar", value: (data?.users.total || 0) - (data?.users.verified || 0), color: COLORS.neutral.light },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									)}
								</ChartCard>
							</Grid>
						</Grid>
					</Grid>

					{/* Subscriptions Section with Charts */}
					<Grid item xs={12} lg={6}>
						<SectionHeader
							title="Suscripciones"
							subtitle="Distribución por planes y modo"
							icon={<ReceiptItem size={22} variant="Bold" />}
						/>
						<Grid container spacing={2}>
							{/* Plan Distribution Pie Chart - Live Mode */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Distribución por Plan (Live)" icon={<TickCircle size={18} />} linkTo="/admin/usuarios/suscripciones" height={200}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={150} height={150} />
										</Box>
									) : subscriptionPlanData.length > 0 ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={7}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={subscriptionPlanData}
															cx="50%"
															cy="50%"
															innerRadius={40}
															outerRadius={70}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{subscriptionPlanData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={5}>
												<StatsLegend
													items={[
														{ label: "Free", value: data?.subscriptions.live?.byPlan?.free || 0, color: COLORS.neutral.main, infoKey: "freePlan" },
														{ label: "Standard", value: data?.subscriptions.live?.byPlan?.standard || 0, color: COLORS.primary.main, infoKey: "standardPlan" },
														{ label: "Premium", value: data?.subscriptions.live?.byPlan?.premium || 0, color: COLORS.premium.main, infoKey: "premiumPlan" },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="body2" color="textSecondary">Sin datos</Typography>
										</Box>
									)}
								</ChartCard>
							</Grid>

							{/* Test Mode Stats */}
							<Grid item xs={12} sm={6}>
								<Paper
									elevation={0}
									sx={{
										p: 2.5,
										borderRadius: 2,
										bgcolor: alpha(COLORS.warning.main, 0.04),
										border: `1px dashed ${alpha(COLORS.warning.main, 0.3)}`,
										height: "100%",
									}}
								>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
										<Chip
											size="small"
											label="TEST MODE"
											sx={{
												bgcolor: alpha(COLORS.warning.main, 0.15),
												color: COLORS.warning.main,
												fontWeight: 600,
												fontSize: "0.65rem",
											}}
										/>
										<InfoTooltip metricKey="testSubscriptions" />
									</Box>
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: COLORS.neutral.main }}>
														{(data?.subscriptions.test?.byPlan?.free || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">Free</Typography>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: COLORS.neutral.main }}>
														{(data?.subscriptions.test?.byPlan?.standard || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">Standard</Typography>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: COLORS.neutral.main }}>
														{(data?.subscriptions.test?.byPlan?.premium || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">Premium</Typography>
											</Box>
										</Grid>
									</Grid>
									<Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${theme.palette.divider}`, display: "flex", justifyContent: "space-between" }}>
										<Typography variant="body2" color="textSecondary">
											Total: <strong>{(data?.subscriptions.test?.total || 0).toLocaleString()}</strong>
										</Typography>
										<Typography variant="body2" color="textSecondary">
											Activas: <strong style={{ color: COLORS.warning.main }}>{(data?.subscriptions.test?.active || 0).toLocaleString()}</strong>
										</Typography>
									</Box>
								</Paper>
							</Grid>

							{/* Live Mode Summary */}
							<Grid item xs={12}>
								<Paper
									elevation={0}
									sx={{
										p: 2,
										borderRadius: 2,
										bgcolor: alpha(COLORS.success.main, 0.05),
										border: `1px solid ${alpha(COLORS.success.main, 0.2)}`,
									}}
								>
									<Grid container spacing={2} alignItems="center">
										<Grid item xs={12} sm={6}>
											<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
												<Chip
													size="small"
													label="LIVE MODE"
													sx={{
														bgcolor: alpha(COLORS.success.main, 0.15),
														color: COLORS.success.main,
														fontWeight: 600,
														fontSize: "0.65rem",
													}}
												/>
												<InfoTooltip metricKey="liveSubscriptions" />
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: COLORS.primary.main }}>
														{(data?.subscriptions.live?.total || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">Total</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: COLORS.success.main }}>
														{(data?.subscriptions.live?.active || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">Activas</Typography>
											</Box>
										</Grid>
									</Grid>
								</Paper>
							</Grid>
						</Grid>
					</Grid>

					{/* Folders Section with Bar Chart */}
					<Grid item xs={12} md={6}>
						<SectionHeader title="Carpetas / Causas" subtitle="Comparación PJN vs MEV" icon={<Folder size={22} variant="Bold" />} />
						<Grid container spacing={2}>
							{/* Bar Chart comparing PJN vs MEV */}
							<Grid item xs={12}>
								<ChartCard title="Comparación por Fuente" icon={<Folder size={18} />} height={220}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
										</Box>
									) : (
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={foldersComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
												<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
												<XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
												<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
												<RechartsTooltip
													contentStyle={{
														backgroundColor: theme.palette.background.paper,
														border: `1px solid ${theme.palette.divider}`,
														borderRadius: 8,
													}}
												/>
												<Legend />
												<Bar dataKey="verificadas" name="Verificadas" fill={COLORS.success.main} radius={[4, 4, 0, 0]} />
												<Bar dataKey="noVerificadas" name="No Verificadas" fill={COLORS.neutral.light} radius={[4, 4, 0, 0]} />
											</BarChart>
										</ResponsiveContainer>
									)}
								</ChartCard>
							</Grid>

							{/* Quick Stats Row */}
							<Grid item xs={6}>
								<Paper
									elevation={0}
									onClick={() => navigate("/admin/causas/verified-app")}
									sx={{
										p: 2,
										borderRadius: 2,
										bgcolor: alpha(COLORS.primary.main, 0.05),
										border: `1px solid ${alpha(COLORS.primary.main, 0.15)}`,
										cursor: "pointer",
										transition: "all 0.2s ease",
										"&:hover": {
											boxShadow: theme.shadows[2],
											transform: "translateY(-2px)",
										},
									}}
								>
									<Typography variant="overline" color="textSecondary">PJN</Typography>
									<Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
										{loading ? (
											<Skeleton variant="text" width={60} height={40} />
										) : (
											<Typography variant="h3" sx={{ fontWeight: 700, color: COLORS.primary.main }}>
												{(data?.folders.pjn?.total || 0).toLocaleString()}
											</Typography>
										)}
										<Typography variant="body2" color="textSecondary">total</Typography>
									</Box>
									<Box sx={{ display: "flex", gap: 2, mt: 1 }}>
										<Typography variant="caption" sx={{ color: COLORS.success.main }}>
											✓ {(data?.folders.pjn?.verified || 0).toLocaleString()} verif.
										</Typography>
										<Typography variant="caption" sx={{ color: COLORS.neutral.main }}>
											○ {(data?.folders.pjn?.nonVerified || 0).toLocaleString()} no verif.
										</Typography>
									</Box>
								</Paper>
							</Grid>
							<Grid item xs={6}>
								<Paper
									elevation={0}
									onClick={() => navigate("/admin/mev/verified-app")}
									sx={{
										p: 2,
										borderRadius: 2,
										bgcolor: alpha(COLORS.primary.main, 0.05),
										border: `1px solid ${alpha(COLORS.primary.main, 0.15)}`,
										cursor: "pointer",
										transition: "all 0.2s ease",
										"&:hover": {
											boxShadow: theme.shadows[2],
											transform: "translateY(-2px)",
										},
									}}
								>
									<Typography variant="overline" color="textSecondary">MEV</Typography>
									<Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
										{loading ? (
											<Skeleton variant="text" width={60} height={40} />
										) : (
											<Typography variant="h3" sx={{ fontWeight: 700, color: COLORS.primary.main }}>
												{(data?.folders.mev?.total || 0).toLocaleString()}
											</Typography>
										)}
										<Typography variant="body2" color="textSecondary">total</Typography>
									</Box>
									<Box sx={{ display: "flex", gap: 2, mt: 1 }}>
										<Typography variant="caption" sx={{ color: COLORS.success.main }}>
											✓ {(data?.folders.mev?.verified || 0).toLocaleString()} verif.
										</Typography>
										<Typography variant="caption" sx={{ color: COLORS.neutral.main }}>
											○ {(data?.folders.mev?.nonVerified || 0).toLocaleString()} no verif.
										</Typography>
									</Box>
								</Paper>
							</Grid>
						</Grid>
					</Grid>

					{/* Marketing Section with Charts */}
					<Grid item xs={12} md={6}>
						<SectionHeader title="Marketing" subtitle="Email marketing y segmentación" icon={<Sms size={22} variant="Bold" />} />
						<Grid container spacing={2}>
							{/* Campaigns Stats */}
							<Grid item xs={12}>
								<GroupedCard title="Campañas" icon={<Sms size={18} />} linkTo="/admin/marketing/mailing">
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: COLORS.primary.main }}>
														{(data?.marketing.campaigns.total || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">Total</Typography>
													<InfoTooltip metricKey="totalCampaigns" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: COLORS.success.main }}>
														{(data?.marketing.campaigns.active || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">Activas</Typography>
													<InfoTooltip metricKey="activeCampaigns" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: COLORS.primary.light }}>
														{(data?.marketing.campaigns.scheduled || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">Programadas</Typography>
													<InfoTooltip metricKey="scheduledCampaigns" />
												</Box>
											</Box>
										</Grid>
									</Grid>
								</GroupedCard>
							</Grid>

							{/* Contacts Pie Chart */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Contactos" icon={<Profile2User size={18} />} linkTo="/admin/marketing/contacts" height={180}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={120} height={120} />
										</Box>
									) : (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={6}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={marketingContactsData}
															cx="50%"
															cy="50%"
															innerRadius={35}
															outerRadius={60}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{marketingContactsData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{ label: "Activos", value: data?.marketing.contacts.active || 0, color: COLORS.success.main, infoKey: "activeContacts" },
														{ label: "Inactivos", value: (data?.marketing.contacts.total || 0) - (data?.marketing.contacts.active || 0), color: COLORS.neutral.light },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									)}
								</ChartCard>
							</Grid>

							{/* Segments Pie Chart */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Segmentos" icon={<MessageProgramming size={18} />} linkTo="/admin/marketing/contacts" height={180}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={120} height={120} />
										</Box>
									) : segmentsData.length > 0 ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={6}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={segmentsData}
															cx="50%"
															cy="50%"
															innerRadius={35}
															outerRadius={60}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{segmentsData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{ label: "Dinámicos", value: data?.marketing.segments.dynamic || 0, color: COLORS.primary.main, infoKey: "dynamicSegments" },
														{ label: "Estáticos", value: data?.marketing.segments.static || 0, color: COLORS.primary.light, infoKey: "staticSegments" },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="h4" sx={{ fontWeight: 600, color: COLORS.primary.main }}>
												{(data?.marketing.segments.total || 0).toLocaleString()}
											</Typography>
											<Typography variant="body2" color="textSecondary">Total segmentos</Typography>
										</Box>
									)}
								</ChartCard>
							</Grid>

							{/* Email Verification Pie Chart (isEmailVerified) */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Verificación de Email" icon={<TickCircle size={18} />} linkTo="/admin/marketing/contacts" height={180}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={120} height={120} />
										</Box>
									) : emailVerificationData.some(item => item.value > 0) ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={6}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={emailVerificationData}
															cx="50%"
															cy="50%"
															innerRadius={35}
															outerRadius={60}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{emailVerificationData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{ label: "Verificados", value: data?.marketing.contacts.emailVerified || 0, color: COLORS.success.main, infoKey: "emailVerifiedContacts" },
														{ label: "No Verificados", value: data?.marketing.contacts.emailNotVerified || 0, color: COLORS.neutral.light, infoKey: "emailNotVerifiedContacts" },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="body2" color="textSecondary">Sin datos de verificación</Typography>
										</Box>
									)}
								</ChartCard>
							</Grid>

							{/* Verification Result Pie Chart (emailVerification.verified - within verified emails) */}
							<Grid item xs={12} sm={6}>
								<ChartCard title="Resultado de Verificación" icon={<TickCircle size={18} />} linkTo="/admin/marketing/contacts" height={180}>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={120} height={120} />
										</Box>
									) : verificationResultData.some(item => item.value > 0) ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={6}>
												<ResponsiveContainer width="100%" height="100%">
													<PieChart>
														<Pie
															data={verificationResultData}
															cx="50%"
															cy="50%"
															innerRadius={35}
															outerRadius={60}
															paddingAngle={2}
															dataKey="value"
															labelLine={false}
															label={renderCustomLabel}
														>
															{verificationResultData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip content={<CustomChartTooltip />} />
													</PieChart>
												</ResponsiveContainer>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{ label: "Válidos", value: data?.marketing.contacts.verificationValid || 0, color: COLORS.success.main, infoKey: "verificationValidContacts" },
														{ label: "No Válidos", value: data?.marketing.contacts.verificationNotValid || 0, color: COLORS.neutral.light, infoKey: "verificationNotValidContacts" },
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="body2" color="textSecondary">Sin datos de resultado</Typography>
										</Box>
									)}
								</ChartCard>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</MainCard>
		</>
	);
};

export default AdminDashboard;
