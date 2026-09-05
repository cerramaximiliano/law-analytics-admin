import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Grid, Typography, Box, Skeleton, IconButton, Tooltip, useTheme, alpha, Paper, Chip, Theme } from "@mui/material";
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
	ArrowRight2,
	Wallet2,
	Chart,
	DocumentText,
	Key,
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
import { WorkersService } from "api/workers";
import adminAxios from "utils/adminAxios";
import { CausasPjnService, EligibilityStats } from "api/causasPjn";
import { StuckDocumentsService, StuckDocumentsStats } from "api/stuckDocuments";
import { CausasEjeService, WorkerStatsResponse, EligibilityStatsResponse as EjeEligibilityStatsResponse } from "api/causasEje";
import { CausasMEVService, EligibilityStatsMEV } from "api/causasMEV";
import {
	CausasPjSaltaService,
	WorkerStatsResponse as PjSaltaWorkerStatsResponse,
	EligibilityStatsResponse as PjSaltaEligibilityStatsResponse,
} from "api/causasPjSalta";
import {
	CausasPjCatamarcaService,
	WorkerStatsResponse as PjCatamarcaWorkerStatsResponse,
	EligibilityStatsResponse as PjCatamarcaEligibilityStatsResponse,
} from "api/causasPjCatamarca";
import {
	CausasPjMendozaService,
	WorkerStatsResponse as PjMendozaWorkerStatsResponse,
	EligibilityStatsResponse as PjMendozaEligibilityStatsResponse,
} from "api/causasPjMendoza";
import pjnCredentialsService, { MisCausasCoverage, HealthAnomaly } from "api/pjnCredentials";
import scbaCausasService, { ScbaUpdateCoverage } from "api/scbaCausas";
import { ManagerConfigService, PjnSiteStatus } from "api/managerConfig";
import LinearProgress from "@mui/material/LinearProgress";
import { Warning2, LockSlash } from "iconsax-react";
import { getTasasStatus, TasasStatus } from "utils/tasasService";
import { getStats as getDatosPrevisionales, Stats as DatosPrevsStats } from "utils/datosPrevsionalesService";
import GroupsService from "api/groups";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PREMIUM_GOLD, PRO_TEAL, headerBorder, headerShadow } from "themes/dashboardTokens";
import IncidentsWidget from "./IncidentsWidget";
import ServicesStatusWidget from "./ServicesStatusWidget";
import CronsStatusWidget from "./CronsStatusWidget";
import IntegrationsStatusWidget from "./IntegrationsStatusWidget";
import PrivacyStatsWidget from "./PrivacyStatsWidget";
import PostalTrackingWidget from "./PostalTrackingWidget";

// Theme-aware color helper - maps semantic roles to MUI theme palette tokens
// Usage: const COLORS = getThemeColors(theme) inside any component with useTheme()
const getThemeColors = (theme: Theme) => ({
	// Primary - Navigation, highlights, main metrics
	primary: {
		main: theme.palette.primary.main,
		light: theme.palette.primary.light,
	},
	// Success - Active, verified, live mode
	success: {
		main: theme.palette.success.main,
		light: theme.palette.success.light,
	},
	// Warning - ONLY for test mode and pending states
	warning: {
		main: theme.palette.warning.main,
		light: theme.palette.warning.light,
	},
	// Neutral - Inactive, unverified, secondary info
	neutral: {
		main: theme.palette.text.secondary,
		light: theme.palette.grey[400],
		text: theme.palette.text.secondary,
	},
	// Error - Failures, critical issues
	error: {
		main: theme.palette.error.main,
	},
	// Premium - Violet: ONLY for Premium plan (upsell)
	premium: {
		main: theme.palette.secondary.main,
		light: theme.palette.secondary.light,
	},
});

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
	proPlan: "Usuarios con plan Pro, el tier intermedio entre Standard y Premium.",
	premiumPlan: "Usuarios con plan Premium que tienen acceso completo a todas las funcionalidades.",
	activeGroups: "Grupos de usuarios activos en la plataforma.",
	// Subscriptions - Live mode
	liveSubscriptions: "Suscripciones en modo PRODUCCIÓN de Stripe. Estas son suscripciones reales con pagos reales.",
	liveActive: "Suscripciones activas en modo producción.",
	// Subscriptions - Test mode
	testSubscriptions: "Suscripciones en modo TEST de Stripe. Usadas para desarrollo y pruebas, sin pagos reales.",
	testActive: "Suscripciones activas en modo test.",
	// Folders
	totalFolders: "Total de carpetas/causas creadas por todos los usuarios en la plataforma.",
	verifiedFolders: "Carpetas vinculadas y verificadas con fuentes externas (PJN + MEV + EJE + PJ Salta).",
	pendingFolders: "Carpetas pendientes de verificación (aún no han sido procesadas por el sistema de verificación).",
	// PJN Folders
	pjnTotal: "Total de causas PJN (Poder Judicial de la Nación) = Verificadas + No Verificadas + Pendientes.",
	pjnVerified: "Causas PJN verificadas y válidas (verified: true, isValid: true). Corresponde a la ruta 'Carpetas Verificadas (App)'.",
	pjnNonVerified:
		"Causas PJN verificadas pero no válidas (verified: true, isValid: false). Corresponde a la ruta 'Carpetas No Verificadas'.",
	pjnPending: "Causas PJN pendientes de verificación (verified: false). Aún no han sido procesadas.",
	// MEV Folders
	mevTotal: "Total de causas MEV (Mesa de Entradas Virtual de la Provincia de Buenos Aires) = Verificadas + No Verificadas + Pendientes.",
	mevVerified: "Causas MEV verificadas y válidas (verified: true, isValid: true). Corresponde a la ruta 'MEV Verificadas (App)'.",
	mevNonVerified: "Causas MEV verificadas pero no válidas (verified: true, isValid: false). Corresponde a la ruta 'MEV No Verificadas'.",
	mevPending: "Causas MEV pendientes de verificación (verified: false). Aún no han sido procesadas.",
	// EJE Folders
	ejeVerified: "Causas EJE (Expediente Judicial Electrónico - CABA) verificadas y válidas. Corresponde a la ruta 'EJE Verificadas (App)'.",
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
	// Services
	neverBounceCredits: "Créditos disponibles en NeverBounce para verificación de emails. Se consumen al verificar direcciones de correo.",
	capsolverBalance:
		"Saldo disponible en Capsolver para resolución de captchas. Se consume al resolver captchas en los workers de scraping.",
	openaiBalance:
		"Saldo estimado de OpenAI calculado como: Saldo inicial configurado - Costos consumidos desde la fecha inicial. Configurable en la sección de Gastos.",
	// User data
	userContacts: "Total de contactos creados por todos los usuarios en la plataforma (agenda de contactos).",
	userCalculators: "Total de cálculos realizados por todos los usuarios en la plataforma.",
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
				elevation={0}
				sx={{
					p: 1.5,
					bgcolor: theme.palette.background.paper,
					border: `1px solid ${headerBorder(theme.palette.mode === "dark")}`,
					borderRadius: 1.5,
					boxShadow: headerShadow(theme.palette.mode === "dark"),
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

// Porcentaje seguro para el KPI central de las donas
const pctOf = (part: number | undefined, total: number | undefined) => (total ? `${Math.round(((part || 0) / total) * 100)}%` : "\u2014");

// Donut chart con KPI central - anillo fino, gap de 2px entre porciones
// (relief de identidad junto con la leyenda de valores directos), sin
// etiquetas sobre las porciones. Estilo de los widgets de la app principal.
interface DonutChartProps {
	data: Array<{ name: string; value: number; color: string }>;
	centerValue: string;
	centerLabel?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, centerValue, centerLabel }) => {
	const theme = useTheme();
	return (
		<Box sx={{ position: "relative", width: "100%", height: "100%" }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={data}
						cx="50%"
						cy="50%"
						innerRadius="70%"
						outerRadius="94%"
						paddingAngle={2}
						cornerRadius={4}
						dataKey="value"
						stroke={theme.palette.background.paper}
						strokeWidth={2}
					>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={entry.color} />
						))}
					</Pie>
					<RechartsTooltip content={<CustomChartTooltip />} />
				</PieChart>
			</ResponsiveContainer>
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					pointerEvents: "none",
				}}
			>
				<Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
					{centerValue}
				</Typography>
				{centerLabel && (
					<Typography variant="caption" color="text.secondary">
						{centerLabel}
					</Typography>
				)}
			</Box>
		</Box>
	);
};

// Primary KPI Card Component - Clean, number-focused design.
// Lenguaje visual alineado con law-analytics-front (WidgetDataCard): icon chip
// tintado BRAND_BLUE, valor en text.primary (color semántico solo para estados),
// hover con sombra tintada brand en vez de shadow negra genérica.
interface PrimaryKPICardProps {
	title: string;
	value: number;
	icon: React.ReactNode;
	/** Solo para señalar estado (warning/error). Por defecto text.primary. */
	valueColor?: string;
	/** Prefijo de unidad (ej. "US$"): formatea el valor con 2 decimales. */
	prefix?: string;
	loading?: boolean;
	infoKey: string;
	linkTo?: string;
	onClick?: () => void;
}

const PrimaryKPICard: React.FC<PrimaryKPICardProps> = ({ title, value, icon, valueColor, prefix, loading, infoKey, linkTo, onClick }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const navigate = useNavigate();
	const isClickable = linkTo || onClick;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (linkTo) {
			navigate(linkTo);
		}
	};

	const formattedValue = prefix
		? value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		: value.toLocaleString();

	return (
		<Paper
			elevation={0}
			onClick={isClickable ? handleClick : undefined}
			sx={{
				p: { xs: 1.5, sm: 2.5 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: isClickable ? "pointer" : "default",
				transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
				...(isClickable && {
					"&:hover": {
						boxShadow: headerShadow(isDark),
						borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
						transform: "translateY(-2px)",
					},
				}),
			}}
		>
			{/* Header: Icon chip + Title + Info */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 1.25, sm: 1.75 } }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.25 }, minWidth: 0 }}>
					<Box
						sx={{
							width: 34,
							height: 34,
							borderRadius: 1.25,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
							border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
							color: BRAND_BLUE,
							"& > svg": { color: BRAND_BLUE },
						}}
					>
						{icon}
					</Box>
					<Typography
						variant="body2"
						sx={{
							color: theme.palette.text.secondary,
							fontWeight: 500,
							fontSize: { xs: "0.75rem", sm: "0.875rem" },
							letterSpacing: "-0.005em",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{title}
					</Typography>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
					<InfoTooltip metricKey={infoKey} />
					{isClickable && <ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, opacity: 0.6 }} />}
				</Box>
			</Box>
			{/* Value - The hero */}
			{loading ? (
				<Skeleton variant="text" width={80} height={48} />
			) : (
				<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
					{prefix && (
						<Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
							{prefix}
						</Typography>
					)}
					<Typography
						variant="h3"
						sx={{
							fontWeight: 700,
							color: valueColor || theme.palette.text.primary,
							lineHeight: 1,
							fontSize: { xs: "1.5rem", sm: "2rem" },
							letterSpacing: "-0.02em",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{formattedValue}
					</Typography>
				</Box>
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
	const isDark = theme.palette.mode === "dark";

	return (
		<Box sx={{ mb: { xs: 1.5, sm: 2.5 } }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.25 } }}>
				<Box
					sx={{
						width: 30,
						height: 30,
						borderRadius: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
						border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
						color: BRAND_BLUE,
						"& > svg": { color: BRAND_BLUE },
					}}
				>
					{icon}
				</Box>
				<Typography variant="h4" fontWeight={600} sx={{ fontSize: { xs: "1.05rem", sm: "1.25rem" }, letterSpacing: "-0.02em" }}>
					{title}
				</Typography>
			</Box>
			{subtitle && (
				<Typography
					variant="body2"
					color="textSecondary"
					sx={{
						mt: 0.5,
						ml: { xs: 4.5, sm: 5.25 },
						fontSize: { xs: "0.75rem", sm: "0.875rem" },
						display: { xs: "none", sm: "block" },
					}}
				>
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
	mobileHeight?: number;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, linkTo, height = 280, mobileHeight }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
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
				p: { xs: 1.5, sm: 2.5 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: linkTo ? "pointer" : "default",
				transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
				...(linkTo && {
					"&:hover": {
						boxShadow: headerShadow(isDark),
						borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
						transform: "translateY(-2px)",
					},
				}),
			}}
			onClick={linkTo ? handleClick : undefined}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					mb: { xs: 1.5, sm: 2 },
					pb: { xs: 1, sm: 1.5 },
					borderBottom: `1px solid ${headerBorder(isDark)}`,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
					<Box sx={{ color: BRAND_BLUE, display: "flex" }}>{icon}</Box>
					<Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, letterSpacing: "-0.005em" }}>
						{title}
					</Typography>
				</Box>
				{linkTo && <ArrowRight2 size={16} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
			</Box>
			<Box sx={{ height: { xs: mobileHeight || height * 0.8, sm: height } }}>{children}</Box>
		</Paper>
	);
};

// Stats Legend Component for charts
interface StatsLegendProps {
	items: Array<{ label: string; value: number; color: string; infoKey?: string }>;
	loading?: boolean;
}

const StatsLegend: React.FC<StatsLegendProps> = ({ items, loading }) => {
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
							<Typography
								variant="h6"
								sx={{ fontWeight: 600, color: item.color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
							>
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
	const isDark = theme.palette.mode === "dark";
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
				p: { xs: 1.5, sm: 2.5 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: isClickable ? "pointer" : "default",
				transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
				...(isClickable && {
					"&:hover": {
						boxShadow: headerShadow(isDark),
						borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
						transform: "translateY(-2px)",
					},
				}),
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					mb: { xs: 1.5, sm: 2 },
					pb: { xs: 1, sm: 1.5 },
					borderBottom: `1px solid ${headerBorder(isDark)}`,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
					<Box sx={{ color: BRAND_BLUE, display: "flex" }}>{icon}</Box>
					<Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, letterSpacing: "-0.005em" }}>
						{title}
					</Typography>
				</Box>
				{isClickable && <ArrowRight2 size={16} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
			</Box>
			{children}
		</Paper>
	);
};

// Stat Strip - franja horizontal de métricas secundarias. Evita el "muro de
// cards": las métricas de contexto viven juntas en una sola superficie con
// divisores, debajo de los KPIs hero (patrón del dashboard de la app de usuario).
interface StatStripItem {
	label: string;
	value: number;
	infoKey: string;
	linkTo?: string;
	loading?: boolean;
}

const StatStrip: React.FC<{ items: StatStripItem[] }> = ({ items }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const navigate = useNavigate();

	return (
		<Paper
			elevation={0}
			sx={{
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				display: "flex",
				flexWrap: "wrap",
			}}
		>
			{items.map((item, index) => (
				<Box
					key={item.label}
					onClick={item.linkTo ? () => navigate(item.linkTo!) : undefined}
					sx={{
						flex: "1 1 0",
						minWidth: { xs: "50%", sm: "20%" },
						py: { xs: 1.5, sm: 2 },
						px: 1,
						textAlign: "center",
						cursor: item.linkTo ? "pointer" : "default",
						borderLeft: { xs: "none", sm: index > 0 ? `1px solid ${headerBorder(isDark)}` : "none" },
						transition: "background-color 200ms ease",
						...(item.linkTo && {
							"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.1 : 0.05) },
						}),
					}}
				>
					{item.loading ? (
						<Skeleton variant="text" width={48} height={32} sx={{ mx: "auto" }} />
					) : (
						<Typography
							variant="h5"
							sx={{
								fontWeight: 600,
								letterSpacing: "-0.02em",
								fontVariantNumeric: "tabular-nums",
								lineHeight: 1.2,
							}}
						>
							{item.value.toLocaleString()}
						</Typography>
					)}
					<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
						<Typography variant="caption" color="textSecondary" noWrap>
							{item.label}
						</Typography>
						<InfoTooltip metricKey={item.infoKey} />
					</Box>
				</Box>
			))}
		</Paper>
	);
};

// Credenciales válidas - stat destacado al pie de las cards de cobertura que
// dependen de login (Mis Causas, SCBA). Antes vivía como chip/caption y se perdía.
const CredentialsStat: React.FC<{ count: number; tooltip: string }> = ({ count, tooltip }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Tooltip title={tooltip} arrow>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1,
					mt: 1.5,
					pt: 1.25,
					borderTop: `1px dashed ${theme.palette.divider}`,
					cursor: "help",
				}}
			>
				<Box
					sx={{
						width: 28,
						height: 28,
						borderRadius: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						bgcolor: alpha(LIVE_GREEN, isDark ? 0.18 : 0.12),
						border: `1px solid ${alpha(LIVE_GREEN, isDark ? 0.36 : 0.24)}`,
						color: LIVE_GREEN,
					}}
				>
					<Key size={15} />
				</Box>
				<Typography
					variant="h5"
					sx={{ fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: LIVE_GREEN }}
				>
					{count.toLocaleString()}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					credenciales válidas
				</Typography>
			</Box>
		</Tooltip>
	);
};

const AdminDashboard = () => {
	const theme = useTheme();
	const COLORS = getThemeColors(theme);
	const isDark = theme.palette.mode === "dark";
	// Fill apagado para la porción "resto" de las donas y barras neutras:
	// deliberadamente recesivo (split de estado, no categoría con identidad).
	const chartMuted = alpha(theme.palette.text.secondary, isDark ? 0.32 : 0.24);
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<DashboardSummary | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);
	const [neverBounceCredits, setNeverBounceCredits] = useState<number | null>(null);
	const [loadingCredits, setLoadingCredits] = useState(false);
	const [capsolverBalance, setCapsolverBalance] = useState<number | null>(null);
	const [loadingCapsolver, setLoadingCapsolver] = useState(false);
	const [openaiBalance, setOpenaiBalance] = useState<number | null>(null);
	const [loadingOpenai, setLoadingOpenai] = useState(false);
	const [eligibilityStats, setEligibilityStats] = useState<EligibilityStats | null>(null);
	const [loadingEligibility, setLoadingEligibility] = useState(false);
	const [mevEligibilityStats, setMevEligibilityStats] = useState<EligibilityStatsMEV | null>(null);
	const [loadingMevEligibility, setLoadingMevEligibility] = useState(false);
	const [ejeEligibilityStats, setEjeEligibilityStats] = useState<EjeEligibilityStatsResponse["data"] | null>(null);
	const [loadingEjeEligibility, setLoadingEjeEligibility] = useState(false);
	const [stuckDocumentsStats, setStuckDocumentsStats] = useState<StuckDocumentsStats | null>(null);
	const [loadingStuckDocuments, setLoadingStuckDocuments] = useState(false);
	const [ejeStats, setEjeStats] = useState<WorkerStatsResponse["data"] | null>(null);
	const [loadingEjeStats, setLoadingEjeStats] = useState(false);
	const [pjsaltaStats, setPjsaltaStats] = useState<PjSaltaWorkerStatsResponse["data"] | null>(null);
	const [loadingPjsaltaStats, setLoadingPjsaltaStats] = useState(false);
	const [pjsaltaEligibilityStats, setPjsaltaEligibilityStats] = useState<PjSaltaEligibilityStatsResponse["data"] | null>(null);
	const [loadingPjsaltaEligibility, setLoadingPjsaltaEligibility] = useState(false);
	const [pjcatamarcaStats, setPjcatamarcaStats] = useState<PjCatamarcaWorkerStatsResponse["data"] | null>(null);
	const [loadingPjcatamarcaStats, setLoadingPjcatamarcaStats] = useState(false);
	const [pjcatamarcaEligibilityStats, setPjcatamarcaEligibilityStats] = useState<PjCatamarcaEligibilityStatsResponse["data"] | null>(null);
	const [loadingPjcatamarcaEligibility, setLoadingPjcatamarcaEligibility] = useState(false);
	const [pjmendozaStats, setPjmendozaStats] = useState<PjMendozaWorkerStatsResponse["data"] | null>(null);
	const [loadingPjmendozaStats, setLoadingPjmendozaStats] = useState(false);
	const [pjmendozaEligibilityStats, setPjmendozaEligibilityStats] = useState<PjMendozaEligibilityStatsResponse["data"] | null>(null);
	const [loadingPjmendozaEligibility, setLoadingPjmendozaEligibility] = useState(false);
	const [misCausasCoverage, setMisCausasCoverage] = useState<MisCausasCoverage | null>(null);
	const [loadingMisCausasCoverage, setLoadingMisCausasCoverage] = useState(false);
	const [healthAnomalies, setHealthAnomalies] = useState<HealthAnomaly[]>([]);
	const [healthAnomaliesMeta, setHealthAnomaliesMeta] = useState<{ count: number; lastEvaluatedAt: string | null } | null>(null);
	const [scbaCoverage, setScbaCoverage] = useState<ScbaUpdateCoverage | null>(null);
	const [loadingScbaCoverage, setLoadingScbaCoverage] = useState(false);
	const [tasasStatus, setTasasStatus] = useState<TasasStatus | null>(null);
	const [loadingTasasStatus, setLoadingTasasStatus] = useState(false);
	const [datosPrevsStats, setDatosPrevsStats] = useState<DatosPrevsStats | null>(null);
	const [loadingDatosPrevsStats, setLoadingDatosPrevsStats] = useState(false);
	const [activeGroupsCount, setActiveGroupsCount] = useState<number>(0);
	const [loadingGroups, setLoadingGroups] = useState(false);
	// Estado del sitio PJN (mantenimiento detectado por los workers). Lo muestra
	// el widget "Cobertura Actualización PJN" cuando status !== "unknown".
	const [pjnSiteStatus, setPjnSiteStatus] = useState<PjnSiteStatus | null>(null);

	const fetchActiveGroups = useCallback(async () => {
		try {
			setLoadingGroups(true);
			const res = await GroupsService.getStats();
			setActiveGroupsCount(res.data.byStatus.active ?? 0);
		} catch (error: any) {
			console.error("Error fetching active groups count:", error);
		} finally {
			setLoadingGroups(false);
		}
	}, []);

	const fetchTasasStatus = useCallback(async () => {
		try {
			setLoadingTasasStatus(true);
			const data = await getTasasStatus();
			setTasasStatus(data);
		} catch (error: any) {
			console.error("Error fetching tasas status:", error);
		} finally {
			setLoadingTasasStatus(false);
		}
	}, []);

	const fetchDatosPrevsStats = useCallback(async () => {
		try {
			setLoadingDatosPrevsStats(true);
			const data = await getDatosPrevisionales();
			setDatosPrevsStats(data);
		} catch (error: any) {
			console.error("Error fetching datos previsionales stats:", error);
		} finally {
			setLoadingDatosPrevsStats(false);
		}
	}, []);

	const fetchEjeStats = useCallback(async () => {
		try {
			setLoadingEjeStats(true);
			const response = await CausasEjeService.getWorkerStats();
			if (response.success) {
				setEjeStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching EJE stats:", error);
		} finally {
			setLoadingEjeStats(false);
		}
	}, []);

	const fetchPjsaltaStats = useCallback(async () => {
		try {
			setLoadingPjsaltaStats(true);
			const response = await CausasPjSaltaService.getWorkerStats();
			if (response.success) {
				setPjsaltaStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching PJ Salta stats:", error);
		} finally {
			setLoadingPjsaltaStats(false);
		}
	}, []);

	const fetchPjsaltaEligibilityStats = useCallback(async () => {
		try {
			setLoadingPjsaltaEligibility(true);
			const response = await CausasPjSaltaService.getEligibilityStats();
			if (response.success) {
				setPjsaltaEligibilityStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching PJ Salta eligibility stats:", error);
		} finally {
			setLoadingPjsaltaEligibility(false);
		}
	}, []);

	const fetchPjcatamarcaStats = useCallback(async () => {
		try {
			setLoadingPjcatamarcaStats(true);
			const response = await CausasPjCatamarcaService.getWorkerStats();
			if (response.success) {
				setPjcatamarcaStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching PJ Catamarca stats:", error);
		} finally {
			setLoadingPjcatamarcaStats(false);
		}
	}, []);

	const fetchPjcatamarcaEligibilityStats = useCallback(async () => {
		try {
			setLoadingPjcatamarcaEligibility(true);
			const response = await CausasPjCatamarcaService.getEligibilityStats();
			if (response.success) {
				setPjcatamarcaEligibilityStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching PJ Catamarca eligibility stats:", error);
		} finally {
			setLoadingPjcatamarcaEligibility(false);
		}
	}, []);

	const fetchPjmendozaStats = useCallback(async () => {
		try {
			setLoadingPjmendozaStats(true);
			const response = await CausasPjMendozaService.getWorkerStats();
			if (response.success) setPjmendozaStats(response.data);
		} catch (error: any) {
			console.error("Error fetching PJ Mendoza stats:", error);
		} finally {
			setLoadingPjmendozaStats(false);
		}
	}, []);

	const fetchPjmendozaEligibilityStats = useCallback(async () => {
		try {
			setLoadingPjmendozaEligibility(true);
			const response = await CausasPjMendozaService.getEligibilityStats();
			if (response.success) setPjmendozaEligibilityStats(response.data);
		} catch (error: any) {
			console.error("Error fetching PJ Mendoza eligibility stats:", error);
		} finally {
			setLoadingPjmendozaEligibility(false);
		}
	}, []);

	// Trae el flag de "PJN en mantenimiento" del manager-config. Silencioso:
	// si falla, el resto del dashboard sigue funcionando sin la badge.
	const fetchPjnSiteStatus = useCallback(async () => {
		try {
			const res = await ManagerConfigService.getCurrentStatus();
			setPjnSiteStatus(res.data.pjnSiteStatus ?? null);
		} catch (error: any) {
			console.error("Error fetching PJN site status:", error);
		}
	}, []);

	const fetchEligibilityStats = useCallback(async () => {
		try {
			setLoadingEligibility(true);
			const response = await CausasPjnService.getEligibilityStats({ thresholdHours: 2 });
			if (response.success) {
				setEligibilityStats(response.data.totals);
			}
		} catch (error: any) {
			console.error("Error fetching eligibility stats:", error);
		} finally {
			setLoadingEligibility(false);
		}
	}, []);

	const fetchMisCausasCoverage = useCallback(async () => {
		try {
			setLoadingMisCausasCoverage(true);
			const response = await pjnCredentialsService.getUpdateCoverage();
			if (response.success) {
				setMisCausasCoverage(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching mis causas coverage:", error);
		} finally {
			setLoadingMisCausasCoverage(false);
		}
	}, []);

	const fetchHealthAnomalies = useCallback(async () => {
		try {
			const response = await pjnCredentialsService.getHealthAnomalies();
			if (response.success) {
				setHealthAnomalies(response.data || []);
				setHealthAnomaliesMeta(response.meta || null);
			}
		} catch (error: any) {
			console.error("Error fetching health anomalies:", error);
		}
	}, []);

	const fetchScbaCoverage = useCallback(async () => {
		try {
			setLoadingScbaCoverage(true);
			const response = await scbaCausasService.getUpdateCoverage();
			if (response.success) {
				setScbaCoverage(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching SCBA coverage:", error);
		} finally {
			setLoadingScbaCoverage(false);
		}
	}, []);

	const fetchMevEligibilityStats = useCallback(async () => {
		try {
			setLoadingMevEligibility(true);
			const response = await CausasMEVService.getEligibilityStats({ thresholdHours: 24 });
			if (response.success) {
				setMevEligibilityStats(response.data.totals);
			}
		} catch (error: any) {
			console.error("Error fetching MEV eligibility stats:", error);
		} finally {
			setLoadingMevEligibility(false);
		}
	}, []);

	const fetchEjeEligibilityStats = useCallback(async () => {
		try {
			setLoadingEjeEligibility(true);
			const response = await CausasEjeService.getEligibilityStats();
			if (response.success) {
				setEjeEligibilityStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching EJE eligibility stats:", error);
		} finally {
			setLoadingEjeEligibility(false);
		}
	}, []);

	const fetchStuckDocumentsStats = useCallback(async () => {
		try {
			setLoadingStuckDocuments(true);
			const response = await StuckDocumentsService.getStats(24);
			if (response.success) {
				setStuckDocumentsStats(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching stuck documents stats:", error);
		} finally {
			setLoadingStuckDocuments(false);
		}
	}, []);

	const fetchNeverBounceCredits = useCallback(async () => {
		try {
			setLoadingCredits(true);
			const response = await WorkersService.getEmailVerificationConfig();
			if (response.success && response.data) {
				setNeverBounceCredits(response.data.neverBounceCredits || 0);
			}
		} catch (error: any) {
			console.error("Error fetching NeverBounce credits:", error);
		} finally {
			setLoadingCredits(false);
		}
	}, []);

	const fetchCapsolverBalance = useCallback(async () => {
		try {
			setLoadingCapsolver(true);
			const response = await adminAxios.get("/api/capsolver/balance");
			if (response.data.success && response.data.data) {
				setCapsolverBalance(response.data.data.balance || 0);
			}
		} catch (error: any) {
			console.error("Error fetching Capsolver balance:", error);
		} finally {
			setLoadingCapsolver(false);
		}
	}, []);

	const fetchOpenaiBalance = useCallback(async () => {
		try {
			setLoadingOpenai(true);
			const response = await adminAxios.get("/api/openai/balance");
			if (response.data.success && response.data.data) {
				// Solo mostrar si está configurado
				if (response.data.data.configured) {
					setOpenaiBalance(response.data.data.estimatedBalance);
				} else {
					setOpenaiBalance(null);
				}
			}
		} catch (error: any) {
			console.error("Error fetching OpenAI balance:", error);
		} finally {
			setLoadingOpenai(false);
		}
	}, []);

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
		fetchNeverBounceCredits();
		fetchCapsolverBalance();
		fetchOpenaiBalance();
		fetchEligibilityStats();
		fetchMisCausasCoverage();
		fetchHealthAnomalies();
		fetchScbaCoverage();
		fetchMevEligibilityStats();
		fetchEjeEligibilityStats();
		fetchStuckDocumentsStats();
		fetchEjeStats();
		fetchPjsaltaStats();
		fetchPjsaltaEligibilityStats();
		fetchPjcatamarcaStats();
		fetchPjcatamarcaEligibilityStats();
		fetchPjmendozaStats();
		fetchPjmendozaEligibilityStats();
		fetchTasasStatus();
		fetchDatosPrevsStats();
		fetchActiveGroups();
		fetchPjnSiteStatus();
	}, [
		fetchData,
		fetchNeverBounceCredits,
		fetchCapsolverBalance,
		fetchOpenaiBalance,
		fetchEligibilityStats,
		fetchMisCausasCoverage,
		fetchHealthAnomalies,
		fetchScbaCoverage,
		fetchMevEligibilityStats,
		fetchEjeEligibilityStats,
		fetchStuckDocumentsStats,
		fetchEjeStats,
		fetchPjsaltaStats,
		fetchPjsaltaEligibilityStats,
		fetchPjcatamarcaStats,
		fetchPjcatamarcaEligibilityStats,
		fetchPjmendozaStats,
		fetchPjmendozaEligibilityStats,
		fetchTasasStatus,
		fetchDatosPrevsStats,
		fetchActiveGroups,
		fetchPjnSiteStatus,
	]);

	useRequestQueueRefresh(fetchData);

	const handleRefresh = () => {
		fetchData();
		fetchNeverBounceCredits();
		fetchCapsolverBalance();
		fetchOpenaiBalance();
		fetchEligibilityStats();
		fetchMisCausasCoverage();
		fetchHealthAnomalies();
		fetchScbaCoverage();
		fetchMevEligibilityStats();
		fetchEjeEligibilityStats();
		fetchStuckDocumentsStats();
		fetchEjeStats();
		fetchPjsaltaStats();
		fetchPjsaltaEligibilityStats();
		fetchPjcatamarcaStats();
		fetchPjcatamarcaEligibilityStats();
		fetchPjmendozaStats();
		fetchPjmendozaEligibilityStats();
		fetchTasasStatus();
		fetchDatosPrevsStats();
		fetchActiveGroups();
		fetchPjnSiteStatus();
	};

	// Chart data - Consistent colors: Green=Active/Verified, Gray=Inactive/Unverified
	const userStatusData = useMemo(
		() =>
			data
				? [
						{ name: "Activos", value: data.users.active, color: LIVE_GREEN },
						{ name: "Inactivos", value: data.users.total - data.users.active, color: chartMuted },
				  ]
				: [],
		[data, chartMuted],
	);

	const userVerificationData = useMemo(
		() =>
			data
				? [
						{ name: "Verificados", value: data.users.verified, color: LIVE_GREEN },
						{ name: "Sin verificar", value: data.users.total - data.users.verified, color: chartMuted },
				  ]
				: [],
		[data, chartMuted],
	);

	// Subscription plans: muted=Free, BRAND_BLUE=Standard, PRO_TEAL=Pro, PREMIUM_GOLD=Premium
	const subscriptionPlanData = useMemo(
		() =>
			data
				? [
						{ name: "Free", value: data.subscriptions.live?.byPlan?.free || 0, color: chartMuted },
						{ name: "Standard", value: data.subscriptions.live?.byPlan?.standard || 0, color: BRAND_BLUE },
						{ name: "Pro", value: data.subscriptions.live?.byPlan?.pro || 0, color: PRO_TEAL },
						{ name: "Premium", value: data.subscriptions.live?.byPlan?.premium || 0, color: PREMIUM_GOLD },
				  ].filter((item) => item.value > 0)
				: [],
		[data, chartMuted],
	);

	const foldersComparisonData = useMemo(
		() =>
			data
				? [
						{
							name: "PJN",
							verificadas: data.folders.pjn?.verified || 0,
							noVerificadas: data.folders.pjn?.nonVerified || 0,
							pendientes: data.folders.pjn?.pending || 0,
						},
						{
							name: "MEV",
							verificadas: data.folders.mev?.verified || 0,
							noVerificadas: data.folders.mev?.nonVerified || 0,
							pendientes: data.folders.mev?.pending || 0,
						},
				  ]
				: [],
		[data, chartMuted],
	);

	// Marketing - consistent: LIVE_GREEN=Active, muted=Inactive
	const marketingContactsData = useMemo(
		() =>
			data
				? [
						{ name: "Activos", value: data.marketing.contacts.active, color: LIVE_GREEN },
						{ name: "Inactivos", value: data.marketing.contacts.total - data.marketing.contacts.active, color: chartMuted },
				  ]
				: [],
		[data, chartMuted],
	);

	// Marketing - Email verification (isEmailVerified field)
	const emailVerificationData = useMemo(
		() =>
			data
				? [
						{ name: "Verificados", value: data.marketing.contacts.emailVerified || 0, color: LIVE_GREEN },
						{ name: "No Verificados", value: data.marketing.contacts.emailNotVerified || 0, color: chartMuted },
				  ]
				: [],
		[data, chartMuted],
	);

	// Marketing - Verification result (emailVerification.verified field - within verified emails)
	const verificationResultData = useMemo(
		() =>
			data
				? [
						{ name: "Válidos", value: data.marketing.contacts.verificationValid || 0, color: LIVE_GREEN },
						{ name: "No Válidos", value: data.marketing.contacts.verificationNotValid || 0, color: chartMuted },
				  ]
				: [],
		[data, chartMuted],
	);

	// Segments - BRAND_BLUE para dinámicos, muted para estáticos
	const segmentsData = useMemo(
		() =>
			data
				? [
						{ name: "Dinámicos", value: data.marketing.segments.dynamic, color: BRAND_BLUE },
						{ name: "Estáticos", value: data.marketing.segments.static, color: chartMuted },
				  ].filter((item) => item.value > 0)
				: [],
		[data, chartMuted],
	);

	return (
		<>
			<MainCard
				title="Dashboard"
				secondary={
					<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 }, flexWrap: "wrap", justifyContent: "flex-end" }}>
						{lastUpdated && (
							<Chip
								size="small"
								icon={<Clock size={14} />}
								label={`${new Date(lastUpdated).toLocaleString("es-ES")}`}
								variant="outlined"
								sx={{
									borderRadius: 1.5,
									display: { xs: "none", sm: "flex" },
								}}
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

				{/* Incidentes abiertos — lo primero que se ve, antes que cualquier métrica.
				    El dashboard muestra excepciones; el resto es drill-down bajo demanda. */}
				<Box sx={{ mb: { xs: 2, sm: 3 } }}>
					<IncidentsWidget />
				</Box>

				{/* Primary KPIs Row - jerarquía en dos niveles: 4 KPIs hero + strip de contexto */}
				<Box sx={{ mb: { xs: 2, sm: 4 } }}>
					<SectionHeader
						title="Resumen general"
						subtitle="Usuarios, suscripciones y causas de la plataforma"
						icon={<Chart size={16} variant="Bold" />}
					/>
					<Grid container spacing={{ xs: 1, sm: 2 }}>
						<Grid item xs={6} sm={6} md={3}>
							<PrimaryKPICard
								title="Total Usuarios"
								value={data?.users.total || 0}
								icon={<UserSquare size={18} />}
								loading={loading}
								infoKey="totalUsers"
								linkTo="/admin/users"
							/>
						</Grid>
						<Grid item xs={6} sm={6} md={3}>
							<PrimaryKPICard
								title="Suscripciones Activas"
								value={data?.subscriptions.active || 0}
								icon={<ReceiptItem size={18} />}
								loading={loading}
								infoKey="activeSubscriptions"
								linkTo="/admin/usuarios/suscripciones"
							/>
						</Grid>
						<Grid item xs={6} sm={6} md={3}>
							<Paper
								elevation={0}
								sx={{
									p: { xs: 1.5, sm: 2.5 },
									borderRadius: 2,
									bgcolor: theme.palette.background.paper,
									border: `1px solid ${theme.palette.divider}`,
									height: "100%",
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.25 }, mb: { xs: 1.25, sm: 1.75 } }}>
									<Box
										sx={{
											width: 34,
											height: 34,
											borderRadius: 1.25,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Folder size={18} />
									</Box>
									<Typography
										variant="body2"
										sx={{
											color: theme.palette.text.secondary,
											fontWeight: 500,
											fontSize: { xs: "0.75rem", sm: "0.875rem" },
											letterSpacing: "-0.005em",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										Carpetas Verificadas
									</Typography>
									<InfoTooltip metricKey="verifiedFolders" />
								</Box>
								{loading || loadingEjeStats || loadingPjsaltaStats || loadingPjcatamarcaStats || loadingPjmendozaStats ? (
									<Skeleton variant="text" width={80} height={48} />
								) : (
									<>
										<Typography
											variant="h3"
											sx={{
												fontWeight: 700,
												mb: 1,
												lineHeight: 1,
												fontSize: { xs: "1.5rem", sm: "2rem" },
												letterSpacing: "-0.02em",
												fontVariantNumeric: "tabular-nums",
											}}
										>
											{(
												(data?.folders.pjn?.verified || 0) +
												(data?.folders.mev?.verified || 0) +
												(ejeStats?.status.valid || 0) +
												(pjsaltaStats?.status.valid || 0) +
												(pjcatamarcaStats?.status.valid || 0) +
												(pjmendozaStats?.status.valid || 0)
											).toLocaleString()}
										</Typography>
										<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
											{[
												{ label: `PJN ${(data?.folders.pjn?.verified || 0).toLocaleString()}`, to: "/admin/causas/verified-app" },
												{ label: `MEV ${(data?.folders.mev?.verified || 0).toLocaleString()}`, to: "/admin/mev/verified-app" },
												{ label: `EJE ${(ejeStats?.status.valid || 0).toLocaleString()}`, to: "/admin/eje/verified-app" },
												{ label: `Salta ${(pjsaltaStats?.status.valid || 0).toLocaleString()}`, to: "/admin/pjsalta/verified-app" },
												{
													label: `Catamarca ${(pjcatamarcaStats?.status.valid || 0).toLocaleString()}`,
													to: "/admin/pjcatamarca/verified-app",
												},
												{
													label: `Mendoza ${(pjmendozaStats?.status.valid || 0).toLocaleString()}`,
													to: "/admin/pjmendoza/verified-app",
												},
											].map((chip) => (
												<Chip
													key={chip.to}
													label={chip.label}
													size="small"
													onClick={() => navigate(chip.to)}
													sx={{
														bgcolor: alpha(BRAND_BLUE, isDark ? 0.15 : 0.09),
														color: BRAND_BLUE,
														fontWeight: 600,
														fontSize: "0.65rem",
														height: 20,
														cursor: "pointer",
														border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
														"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.25 : 0.16) },
													}}
												/>
											))}
										</Box>
									</>
								)}
							</Paper>
						</Grid>
						<Grid item xs={6} sm={6} md={3}>
							<PrimaryKPICard
								title="Carpetas Pendientes"
								value={data?.folders.pending || 0}
								icon={<Folder size={18} />}
								valueColor={(data?.folders.pending || 0) > 0 ? theme.palette.warning.main : undefined}
								loading={loading}
								infoKey="pendingFolders"
								linkTo="/admin/causas/pending"
							/>
						</Grid>
					</Grid>

					{/* Métricas de contexto - una sola superficie con divisores, sin muro de cards */}
					<Box sx={{ mt: { xs: 1, sm: 2 } }}>
						<StatStrip
							items={[
								{ label: "Carpetas totales", value: data?.folders.total || 0, infoKey: "totalFolders", loading },
								{ label: "Contactos", value: data?.contacts?.total || 0, infoKey: "userContacts", loading },
								{ label: "Calculadores", value: data?.calculators?.total || 0, infoKey: "userCalculators", loading },
								{
									label: "Contactos marketing",
									value: data?.marketing.contacts.total || 0,
									infoKey: "totalContacts",
									linkTo: "/admin/marketing/contacts",
									loading,
								},
								{
									label: "Grupos activos",
									value: activeGroupsCount,
									infoKey: "activeGroups",
									linkTo: "/admin/groups",
									loading: loadingGroups,
								},
							]}
						/>
					</Box>
				</Box>

				{/* Créditos y recursos - saldos de servicios externos y datasets internos */}
				<Box sx={{ mb: { xs: 2, sm: 4 } }}>
					<SectionHeader
						title="Créditos y recursos"
						subtitle="Saldos de servicios externos y datasets internos"
						icon={<Wallet2 size={16} variant="Bold" />}
					/>
					<Grid container spacing={{ xs: 1, sm: 2 }}>
						<Grid item xs={6} sm={6} md={4} lg={2.4}>
							<PrimaryKPICard
								title="Créditos NeverBounce"
								value={neverBounceCredits || 0}
								icon={<Wallet2 size={18} />}
								loading={loadingCredits}
								infoKey="neverBounceCredits"
								linkTo="/admin/workers/email-verification"
							/>
						</Grid>
						<Grid item xs={6} sm={6} md={4} lg={2.4}>
							<PrimaryKPICard
								title="Saldo Capsolver"
								value={capsolverBalance !== null ? Number(capsolverBalance.toFixed(2)) : 0}
								icon={<Wallet2 size={18} />}
								prefix="US$"
								loading={loadingCapsolver}
								infoKey="capsolverBalance"
								linkTo="/admin/causas/workers"
							/>
						</Grid>
						<Grid item xs={6} sm={6} md={4} lg={2.4}>
							<PrimaryKPICard
								title={openaiBalance !== null ? "Saldo OpenAI" : "OpenAI (sin config)"}
								value={openaiBalance !== null ? Number(openaiBalance.toFixed(2)) : 0}
								icon={<Wallet2 size={18} />}
								prefix="US$"
								loading={loadingOpenai}
								infoKey="openaiBalance"
								linkTo="/admin/expenses"
							/>
						</Grid>
						{/* Tasas de Interés widget */}
						<Grid item xs={6} sm={6} md={4} lg={2.4}>
							<Paper
								elevation={0}
								onClick={() => navigate("/recursos/tasas")}
								sx={{
									p: { xs: 1.5, sm: 2.5 },
									borderRadius: 2,
									bgcolor: theme.palette.background.paper,
									border: `1px solid ${tasasStatus && tasasStatus.noActualizadas > 0 ? theme.palette.error.main : theme.palette.divider}`,
									height: "100%",
									cursor: "pointer",
									transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
									"&:hover": {
										boxShadow: headerShadow(isDark),
										borderColor:
											tasasStatus && tasasStatus.noActualizadas > 0 ? theme.palette.error.dark : alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
										transform: "translateY(-2px)",
									},
								}}
							>
								{/* Header */}
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 1.25, sm: 1.75 } }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.25 }, minWidth: 0 }}>
										<Box
											sx={{
												width: 34,
												height: 34,
												borderRadius: 1.25,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
												bgcolor:
													tasasStatus && tasasStatus.noActualizadas > 0
														? alpha(theme.palette.error.main, isDark ? 0.18 : 0.1)
														: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
												border: `1px solid ${
													tasasStatus && tasasStatus.noActualizadas > 0
														? alpha(theme.palette.error.main, isDark ? 0.32 : 0.18)
														: alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)
												}`,
												color: tasasStatus && tasasStatus.noActualizadas > 0 ? theme.palette.error.main : BRAND_BLUE,
											}}
										>
											{tasasStatus && tasasStatus.noActualizadas > 0 ? <Warning2 size={18} /> : <Chart size={18} />}
										</Box>
										<Typography
											variant="body2"
											sx={{
												color: theme.palette.text.secondary,
												fontWeight: 500,
												fontSize: { xs: "0.75rem", sm: "0.875rem" },
												letterSpacing: "-0.005em",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											Tasas de Interés
										</Typography>
									</Box>
									<ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, opacity: 0.6 }} />
								</Box>
								{/* Value */}
								{loadingTasasStatus ? (
									<Skeleton variant="text" width={80} height={48} />
								) : (
									<>
										<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.5 }}>
											<Typography
												variant="h3"
												sx={{
													fontWeight: 700,
													color: tasasStatus && tasasStatus.noActualizadas > 0 ? COLORS.error.main : COLORS.success.main,
													lineHeight: 1,
													fontSize: { xs: "1.5rem", sm: "2rem" },
												}}
											>
												{tasasStatus?.actualizadas ?? 0}
											</Typography>
											<Typography variant="body2" color="text.secondary">
												/ {tasasStatus?.total ?? 0} al día
											</Typography>
										</Box>
										{tasasStatus && tasasStatus.noActualizadas > 0 && (
											<Tooltip
												title={
													<Box>
														<Typography variant="caption" fontWeight={600}>
															Sin actualizar:
														</Typography>
														{tasasStatus.desactualizadas.map((d) => (
															<Typography key={d.tipoTasa} variant="caption" display="block">
																• {d.tipoTasa}
																{d.fechaUltima ? ` (${d.fechaUltima})` : ""}
															</Typography>
														))}
													</Box>
												}
												arrow
												placement="top"
											>
												<Chip
													label={`${tasasStatus.noActualizadas} sin actualizar`}
													size="small"
													color="error"
													variant="outlined"
													sx={{ fontSize: "0.65rem", cursor: "pointer" }}
												/>
											</Tooltip>
										)}
									</>
								)}
							</Paper>
						</Grid>
						{/* Datos Previsionales widget */}
						<Grid item xs={6} sm={6} md={4} lg={2.4}>
							<Paper
								elevation={0}
								onClick={() => navigate("/recursos/datos-previsionales")}
								sx={{
									p: { xs: 1.5, sm: 2.5 },
									borderRadius: 2,
									bgcolor: theme.palette.background.paper,
									border: `1px solid ${
										datosPrevsStats && datosPrevsStats.mesesFaltantes > 0 ? theme.palette.warning.main : theme.palette.divider
									}`,
									height: "100%",
									cursor: "pointer",
									transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
									"&:hover": {
										boxShadow: headerShadow(isDark),
										borderColor:
											datosPrevsStats && datosPrevsStats.mesesFaltantes > 0
												? theme.palette.warning.dark
												: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
										transform: "translateY(-2px)",
									},
								}}
							>
								{/* Header */}
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 1.25, sm: 1.75 } }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1.25 }, minWidth: 0 }}>
										<Box
											sx={{
												width: 34,
												height: 34,
												borderRadius: 1.25,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
												bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
												border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
												color: BRAND_BLUE,
											}}
										>
											<DocumentText size={18} />
										</Box>
										<Typography
											variant="body2"
											sx={{
												color: theme.palette.text.secondary,
												fontWeight: 500,
												fontSize: { xs: "0.75rem", sm: "0.875rem" },
												letterSpacing: "-0.005em",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
											}}
										>
											Datos Previsionales
										</Typography>
									</Box>
									<ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, opacity: 0.6 }} />
								</Box>
								{/* Value */}
								{loadingDatosPrevsStats ? (
									<Skeleton variant="text" width={80} height={48} />
								) : (
									<>
										<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.5 }}>
											<Typography
												variant="h3"
												sx={{
													fontWeight: 700,
													lineHeight: 1,
													fontSize: { xs: "1.5rem", sm: "2rem" },
													letterSpacing: "-0.02em",
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{datosPrevsStats?.total ?? 0}
											</Typography>
											<Typography variant="body2" color="text.secondary">
												registros
											</Typography>
										</Box>
										{datosPrevsStats && datosPrevsStats.mesesFaltantes > 0 && (
											<Chip
												label={`${datosPrevsStats.mesesFaltantes} meses faltantes`}
												size="small"
												color="warning"
												variant="outlined"
												sx={{ fontSize: "0.65rem", cursor: "pointer" }}
											/>
										)}
									</>
								)}
							</Paper>
						</Grid>
					</Grid>
				</Box>

				{/* Services Status Widget */}
				<Box sx={{ mb: { xs: 2, sm: 4 } }}>
					<SectionHeader
						title="Infraestructura"
						subtitle="Salud de servicios, crons e integraciones"
						icon={<MessageProgramming size={16} variant="Bold" />}
					/>
					<Grid container spacing={{ xs: 1, sm: 2 }}>
						<Grid item xs={12} sm={6} md={2.4}>
							<ServicesStatusWidget />
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<CronsStatusWidget />
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<IntegrationsStatusWidget />
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<PrivacyStatsWidget summary />
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<PostalTrackingWidget />
						</Grid>
					</Grid>
				</Box>

				{/* Worker Widgets Row */}
				<SectionHeader
					title="Cobertura de workers"
					subtitle="Actualización de causas por jurisdicción y salud de credenciales"
					icon={<Refresh size={16} variant="Bold" />}
				/>
				<Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, sm: 4 } }}>
					{/* PJN Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/causas/verified-app")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 0.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Cobertura Actualización PJN
									</Typography>
									{pjnSiteStatus && pjnSiteStatus.status === "maintenance" && (
										<Tooltip
											title={`Sitio PJN en mantenimiento desde ${
												pjnSiteStatus.maintenanceSince
													? new Date(pjnSiteStatus.maintenanceSince).toLocaleString("es-AR", {
															timeZone: "America/Argentina/Buenos_Aires",
													  })
													: "—"
											}${pjnSiteStatus.message ? ` — ${pjnSiteStatus.message}` : ""}${
												pjnSiteStatus.lastDetectedBy ? ` (detectado por ${pjnSiteStatus.lastDetectedBy})` : ""
											}`}
										>
											<Chip
												label="PJN en mantenimiento"
												size="small"
												color="warning"
												icon={<Warning2 size={12} />}
												onClick={(e) => {
													e.stopPropagation();
													navigate("/admin/causas/workers");
												}}
												sx={{ fontSize: "0.65rem", fontWeight: 500 }}
											/>
										</Tooltip>
									)}
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="PJN"
										size="small"
										sx={{
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.15 : 0.09),
											color: BRAND_BLUE,
											fontWeight: 600,
											fontSize: "0.65rem",
											height: 20,
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingEligibility ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : eligibilityStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Cobertura hoy
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													(eligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (eligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{eligibilityStats.coveragePercent}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={eligibilityStats.coveragePercent || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													(eligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (eligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{eligibilityStats.updatedToday.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Actualizados hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{(
														eligibilityStats.pendingToday ??
														eligibilityStats.eligible - eligibilityStats.updatedToday - eligibilityStats.eligibleWithErrors
													).toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.error.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{eligibilityStats.eligibleWithErrors.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Con errores
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
													{eligibilityStats.eligible.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total elegibles
												</Typography>
											</Box>
										</Grid>
									</Grid>
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* MEV Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/mev/verified-app")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Cobertura Actualización MEV
									</Typography>
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="MEV"
										size="small"
										sx={{
											bgcolor: alpha(COLORS.neutral.main, 0.1),
											color: COLORS.neutral.main,
											fontWeight: 500,
											fontSize: "0.65rem",
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingMevEligibility ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : mevEligibilityStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Cobertura hoy
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													(mevEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (mevEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{mevEligibilityStats.coveragePercent}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={mevEligibilityStats.coveragePercent || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													(mevEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (mevEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{mevEligibilityStats.updatedToday.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Actualizados hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{(
														mevEligibilityStats.pendingToday ??
														mevEligibilityStats.eligible - mevEligibilityStats.updatedToday - mevEligibilityStats.eligibleWithErrors
													).toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.error.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{mevEligibilityStats.eligibleWithErrors.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Con errores
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.neutral.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{mevEligibilityStats.eligible.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total elegibles
												</Typography>
											</Box>
										</Grid>
									</Grid>
									{(mevEligibilityStats.noCredential ?? 0) > 0 && (
										<Tooltip
											arrow
											title="Elegibles cuyo usuario no tiene credencial MEV habilitada. Los workers las omiten (no se puede entrar al portal sin credencial), así que no cuentan como pendientes ni en la cobertura."
										>
											<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, mt: 1.5, cursor: "help" }}>
												<LockSlash size={13} color={COLORS.neutral.main} />
												<Typography variant="caption" color="text.secondary">
													<strong>{(mevEligibilityStats.noCredential ?? 0).toLocaleString()}</strong> sin credencial (no actualizables)
												</Typography>
											</Box>
										</Tooltip>
									)}
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* EJE Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/eje/verified-app")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Cobertura Actualización EJE
									</Typography>
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="EJE"
										size="small"
										sx={{
											bgcolor: alpha(COLORS.success.main, 0.1),
											color: COLORS.success.main,
											fontWeight: 500,
											fontSize: "0.65rem",
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingEjeEligibility ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : ejeEligibilityStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Cobertura hoy
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													(ejeEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (ejeEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{ejeEligibilityStats.coveragePercent.toFixed(1)}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={ejeEligibilityStats.coveragePercent || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													(ejeEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (ejeEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{ejeEligibilityStats.actualizadosHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Actualizados hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{ejeEligibilityStats.pendientesHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{ejeEligibilityStats.totalElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total elegibles
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.neutral.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{ejeEligibilityStats.noElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													No elegibles
												</Typography>
											</Box>
										</Grid>
									</Grid>
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* PJ Salta Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/pjsalta/verified-app")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Cobertura Actualización Salta
									</Typography>
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="Salta"
										size="small"
										sx={{
											bgcolor: alpha(COLORS.success.main, 0.1),
											color: COLORS.success.main,
											fontWeight: 500,
											fontSize: "0.65rem",
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingPjsaltaEligibility ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : pjsaltaEligibilityStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Cobertura hoy
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													(pjsaltaEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (pjsaltaEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{pjsaltaEligibilityStats.coveragePercent.toFixed(1)}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={pjsaltaEligibilityStats.coveragePercent || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													(pjsaltaEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (pjsaltaEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									{/* Ventana de trabajo y umbral, leídos de la config del manager
									    (no hardcodeados): sin esto no se puede saber si una cobertura
									    baja es un problema o simplemente que la jornada no empezó. */}
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
										Ventana {pjsaltaEligibilityStats.schedule ?? "—"}
										{pjsaltaEligibilityStats.thresholdHours ? ` · cada ${pjsaltaEligibilityStats.thresholdHours} h` : ""}
									</Typography>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjsaltaEligibilityStats.actualizadosHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Actualizados hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjsaltaEligibilityStats.pendientesHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjsaltaEligibilityStats.totalElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total elegibles
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.neutral.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjsaltaEligibilityStats.noElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													No elegibles
												</Typography>
											</Box>
										</Grid>
									</Grid>
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* PJ Catamarca Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/pjcatamarca/verified-app")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Cobertura Actualización Catamarca
									</Typography>
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="Catamarca"
										size="small"
										sx={{
											bgcolor: alpha(COLORS.success.main, 0.1),
											color: COLORS.success.main,
											fontWeight: 500,
											fontSize: "0.65rem",
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingPjcatamarcaEligibility ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : pjcatamarcaEligibilityStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Cobertura hoy
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													(pjcatamarcaEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (pjcatamarcaEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{pjcatamarcaEligibilityStats.coveragePercent.toFixed(1)}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={pjcatamarcaEligibilityStats.coveragePercent || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													(pjcatamarcaEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (pjcatamarcaEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									{/* Ventana de trabajo y umbral, leídos de la config del manager
									    (no hardcodeados): sin esto no se puede saber si una cobertura
									    baja es un problema o simplemente que la jornada no empezó. */}
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
										Ventana {pjcatamarcaEligibilityStats.schedule ?? "—"}
										{pjcatamarcaEligibilityStats.thresholdHours ? ` · cada ${pjcatamarcaEligibilityStats.thresholdHours} h` : ""}
									</Typography>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjcatamarcaEligibilityStats.actualizadosHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Actualizados hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjcatamarcaEligibilityStats.pendientesHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjcatamarcaEligibilityStats.totalElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total elegibles
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.neutral.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjcatamarcaEligibilityStats.noElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													No elegibles
												</Typography>
											</Box>
										</Grid>
									</Grid>
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* PJ Mendoza Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/pjmendoza/verified-app")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Cobertura Actualización Mendoza
									</Typography>
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="Mendoza"
										size="small"
										sx={{
											bgcolor: alpha(COLORS.success.main, 0.1),
											color: COLORS.success.main,
											fontWeight: 500,
											fontSize: "0.65rem",
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingPjmendozaEligibility ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : pjmendozaEligibilityStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Cobertura hoy
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													(pjmendozaEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (pjmendozaEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{pjmendozaEligibilityStats.coveragePercent.toFixed(1)}%
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={pjmendozaEligibilityStats.coveragePercent || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													(pjmendozaEligibilityStats.coveragePercent || 0) > 90
														? COLORS.success.main
														: (pjmendozaEligibilityStats.coveragePercent || 0) > 70
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									{/* Ventana de trabajo y umbral, leídos de la config del manager
									    (no hardcodeados): sin esto no se puede saber si una cobertura
									    baja es un problema o simplemente que la jornada no empezó. */}
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
										Ventana {pjmendozaEligibilityStats.schedule ?? "—"}
										{pjmendozaEligibilityStats.thresholdHours ? ` · cada ${pjmendozaEligibilityStats.thresholdHours} h` : ""}
									</Typography>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjmendozaEligibilityStats.actualizadosHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Actualizados hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjmendozaEligibilityStats.pendientesHoy.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes hoy
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjmendozaEligibilityStats.totalElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total elegibles
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.neutral.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{pjmendozaEligibilityStats.noElegibles.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													No elegibles
												</Typography>
											</Box>
										</Grid>
									</Grid>
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* Stuck Documents Worker Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/causas/workers")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Warning2 size={15} />
									</Box>
									<Typography variant="subtitle1" fontWeight={600} sx={{ letterSpacing: "-0.005em" }}>
										Stuck Documents Worker
									</Typography>
									{stuckDocumentsStats?.worker && (
										<Chip
											size="small"
											label={stuckDocumentsStats.worker.enabled ? "Activo" : "Deshabilitado"}
											sx={{
												bgcolor: stuckDocumentsStats.worker.enabled ? alpha(COLORS.success.main, 0.15) : alpha(COLORS.neutral.main, 0.15),
												color: stuckDocumentsStats.worker.enabled ? COLORS.success.main : COLORS.neutral.main,
												fontWeight: 600,
												fontSize: "0.65rem",
											}}
										/>
									)}
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="PJN"
										size="small"
										sx={{
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.15 : 0.09),
											color: BRAND_BLUE,
											fontWeight: 600,
											fontSize: "0.65rem",
											height: 20,
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingStuckDocuments ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : stuckDocumentsStats ? (
								<>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Tasa de éxito (últimas 24h)
										</Typography>
										<Typography
											variant="h6"
											fontWeight="bold"
											sx={{
												fontVariantNumeric: "tabular-nums",
												color:
													parseFloat(stuckDocumentsStats.recent.successRate) > 50
														? COLORS.success.main
														: parseFloat(stuckDocumentsStats.recent.successRate) > 20
														? COLORS.warning.main
														: COLORS.error.main,
											}}
										>
											{stuckDocumentsStats.recent.successRate}
										</Typography>
									</Box>
									<LinearProgress
										variant="determinate"
										value={parseFloat(stuckDocumentsStats.recent.successRate) || 0}
										sx={{
											height: 8,
											borderRadius: 4,
											mb: 2,
											backgroundColor: alpha(COLORS.neutral.light, 0.3),
											"& .MuiLinearProgress-bar": {
												borderRadius: 4,
												backgroundColor:
													parseFloat(stuckDocumentsStats.recent.successRate) > 50
														? COLORS.success.main
														: parseFloat(stuckDocumentsStats.recent.successRate) > 20
														? COLORS.warning.main
														: COLORS.error.main,
											},
										}}
									/>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.warning.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{stuckDocumentsStats.pending.total.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Pendientes
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.success.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{stuckDocumentsStats.totals.fixed.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Reparados
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography
													variant="h5"
													sx={{ fontWeight: 700, color: COLORS.error.main, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
												>
													{stuckDocumentsStats.totals.failed.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Fallidos
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												<Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
													{stuckDocumentsStats.totals.processed.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Total procesados
												</Typography>
											</Box>
										</Grid>
									</Grid>
									{stuckDocumentsStats.repeatedFailures && stuckDocumentsStats.repeatedFailures.length > 0 && (
										<Box sx={{ mt: 2, pt: 2, borderTop: `1px dashed ${theme.palette.divider}` }}>
											<Typography variant="caption" color="error.main" fontWeight="bold">
												{stuckDocumentsStats.repeatedFailures.length} documento(s) con fallos repetidos
											</Typography>
										</Box>
									)}
									{stuckDocumentsStats.chronicStuck && stuckDocumentsStats.chronicStuck.length > 0 && (
										<Box
											sx={{
												mt: stuckDocumentsStats.repeatedFailures?.length ? 1 : 2,
												pt: stuckDocumentsStats.repeatedFailures?.length ? 0 : 2,
												borderTop: stuckDocumentsStats.repeatedFailures?.length ? "none" : `1px dashed ${theme.palette.divider}`,
											}}
										>
											<Typography variant="caption" color="error.main" fontWeight="bold">
												{stuckDocumentsStats.chronicStuck.length} documento(s) crónicamente atorados
												{stuckDocumentsStats.chronicStuck.some((d) => d.daysSinceFirst && d.daysSinceFirst >= 7) && (
													<span style={{ marginLeft: 4 }}>(algunos por más de 7 días)</span>
												)}
											</Typography>
										</Box>
									)}
								</>
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* Mis Causas (SSO) Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/causas/synced-credentials")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 0.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Credenciales PJN
									</Typography>
									<Tooltip
										arrow
										title={
											misCausasCoverage?.updatePolicy
												? `Política de update: un mismo worker (SSO) refresca públicas y privadas dentro de la ventana ${
														misCausasCoverage.updatePolicy.schedule
												  }${
														misCausasCoverage.updatePolicy.everyDay ? ", todos los días" : ", solo días hábiles"
												  }. Fuera de esa ventana la cobertura no avanza — no es un error.${
														misCausasCoverage.updatePolicy.enabled ? "" : " El schedule está deshabilitado en la config."
												  } Configurable en Workers → PJN manager.`
												: "Política de update: un mismo worker (SSO) refresca públicas y privadas dentro de su ventana horaria. Configurable en Workers → PJN manager."
										}
									>
										<Box
											component="span"
											onClick={(e) => e.stopPropagation()}
											sx={{ display: "inline-flex", alignItems: "center", cursor: "help", color: COLORS.neutral.light }}
										>
											<InfoCircle size={15} />
										</Box>
									</Tooltip>
									{pjnSiteStatus && pjnSiteStatus.status === "maintenance" && (
										<Tooltip
											title={`Sitio PJN en mantenimiento desde ${
												pjnSiteStatus.maintenanceSince
													? new Date(pjnSiteStatus.maintenanceSince).toLocaleString("es-AR", {
															timeZone: "America/Argentina/Buenos_Aires",
													  })
													: "—"
											}${pjnSiteStatus.message ? ` — ${pjnSiteStatus.message}` : ""}${
												pjnSiteStatus.lastDetectedBy ? ` (detectado por ${pjnSiteStatus.lastDetectedBy})` : ""
											}`}
										>
											<Chip
												label="PJN en mantenimiento"
												size="small"
												color="warning"
												icon={<Warning2 size={12} />}
												onClick={(e) => {
													e.stopPropagation();
													navigate("/admin/causas/workers");
												}}
												sx={{ fontSize: "0.65rem", fontWeight: 500 }}
											/>
										</Tooltip>
									)}
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="SSO"
										size="small"
										sx={{
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.15 : 0.09),
											color: BRAND_BLUE,
											fontWeight: 600,
											fontSize: "0.65rem",
											height: 20,
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingMisCausasCoverage ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : misCausasCoverage ? (
								(() => {
									// Doble barra: públicas (isPrivate≠true) + privadas (isPrivate===true).
									// Juntas cubren la totalidad de causas de pjn-mis-causas. Fallback al
									// shape viejo (sin split) mientras el backend no devuelva los buckets.
									const publicas = misCausasCoverage.publicas ?? {
										coveragePercent: misCausasCoverage.coveragePercent,
										updatedToday: misCausasCoverage.updatedToday,
										total: misCausasCoverage.total,
										pending: misCausasCoverage.pending,
										withErrors: misCausasCoverage.withErrors,
										schedule: "08:00–23:00 h",
									};
									const privadas = misCausasCoverage.privadas ?? {
										coveragePercent: 0,
										updatedToday: 0,
										total: 0,
										pending: 0,
										withErrors: 0,
										schedule: "08:00–23:00 h",
									};
									const barColor = (p: number) => (p >= 99 ? COLORS.success.main : p > 70 ? COLORS.warning.main : COLORS.error.main);
									const renderLine = (label: string, b: typeof publicas, accent: string) => (
										<Box sx={{ mb: 1.5 }}>
											<Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 0.25, gap: 1 }}>
												<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, minWidth: 0 }}>
													<Typography variant="body2" fontWeight={600}>
														{label}
													</Typography>
													<Typography variant="caption" color="text.secondary" noWrap>
														{b.schedule}
													</Typography>
												</Box>
												<Typography variant="h6" fontWeight="bold" sx={{ color: accent, flexShrink: 0 }}>
													{b.coveragePercent}%
												</Typography>
											</Box>
											<LinearProgress
												variant="determinate"
												value={b.coveragePercent || 0}
												sx={{
													height: 8,
													borderRadius: 4,
													backgroundColor: alpha(COLORS.neutral.light, 0.3),
													"& .MuiLinearProgress-bar": { borderRadius: 4, backgroundColor: accent },
												}}
											/>
											<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
												{b.updatedToday.toLocaleString()}/{b.total.toLocaleString()} actualizadas hoy
												{b.pending > 0 ? ` · ${b.pending.toLocaleString()} pendientes` : ""}
												{b.withErrors > 0 && (
													<Box
														component="span"
														onClick={(e) => {
															e.stopPropagation();
															navigate("/admin/causas/synced-credentials?conErrores=1");
														}}
														sx={{
															color: COLORS.error.main,
															fontWeight: 600,
															cursor: "pointer",
															"&:hover": { textDecoration: "underline" },
														}}
													>
														{` · ${b.withErrors.toLocaleString()} con errores`}
													</Box>
												)}
											</Typography>
										</Box>
									);
									return (
										<>
											{renderLine("Públicas", publicas, barColor(publicas.coveragePercent || 0))}
											{renderLine("Privadas", privadas, barColor(privadas.coveragePercent || 0))}
											{misCausasCoverage.activeCredentials != null && (
												<CredentialsStat
													count={misCausasCoverage.activeCredentials}
													tooltip="Credenciales PJN activas (habilitadas y válidas)"
												/>
											)}
										</>
									);
								})()
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>

					{/* Card: salud por credencial — credenciales sanas con causas en problema.
					    Cubre el caso "credencial verde pero 100% de sus causas rotas", invisible
					    en el agregado global. Datos del cron credential-health-monitor. */}
					{healthAnomalies.length > 0 && (
						<Grid item xs={12}>
							<Paper
								elevation={0}
								sx={{
									p: { xs: 1.5, sm: 2.5 },
									borderRadius: 2,
									bgcolor: theme.palette.background.paper,
									border: `1px solid ${alpha(theme.palette.warning.main, 0.5)}`,
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(theme.palette.warning.main, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(theme.palette.warning.main, isDark ? 0.32 : 0.18)}`,
											color: theme.palette.warning.main,
										}}
									>
										<Warning2 size={15} />
									</Box>
									<Typography variant="subtitle1" fontWeight={600} sx={{ letterSpacing: "-0.005em" }}>
										Credenciales con causas en problema
									</Typography>
									<Box sx={{ ml: "auto" }}>
										<Typography variant="caption" color="text.secondary">
											{healthAnomaliesMeta?.lastEvaluatedAt
												? `Último chequeo: ${new Date(healthAnomaliesMeta.lastEvaluatedAt).toLocaleString("es-AR")}`
												: ""}
										</Typography>
									</Box>
								</Box>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
									Credenciales habilitadas y válidas con ≥50% de sus causas con error o sin captura. Clic para ver sus causas.
								</Typography>
								{healthAnomalies.map((a) => (
									<Box
										key={a.credentialId}
										onClick={() => navigate(`/admin/causas/synced-credentials?credentialId=${a.credentialId}&conErrores=1`)}
										sx={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 1,
											py: 0.75,
											px: 1,
											borderRadius: 1,
											cursor: "pointer",
											transition: "background-color 0.15s ease",
											"&:hover": { bgcolor: theme.palette.action.hover },
										}}
									>
										<Typography variant="body2" fontWeight={500} noWrap sx={{ minWidth: 0 }}>
											{a.userEmail || a.userName || a.credentialId}
										</Typography>
										<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
											<Typography variant="caption" color="error.main">
												{a.problem}/{a.total} con problema
												{a.sinCaptura > 0 ? ` · ${a.sinCaptura} sin captura` : ""}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												cobertura {a.coveragePercent ?? "—"}%
											</Typography>
										</Box>
									</Box>
								))}
							</Paper>
						</Grid>
					)}

					{/* SCBA Update Coverage Widget */}
					<Grid item xs={12} sm={6} md={3}>
						<Paper
							elevation={0}
							onClick={() => navigate("/admin/mev/causes-by-credential")}
							sx={{
								p: { xs: 1.5, sm: 2.5 },
								borderRadius: 2,
								bgcolor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								cursor: "pointer",
								transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
								height: "100%",
								"&:hover": {
									boxShadow: headerShadow(isDark),
									borderColor: alpha(BRAND_BLUE, isDark ? 0.32 : 0.22),
									transform: "translateY(-2px)",
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Box
										sx={{
											width: 28,
											height: 28,
											borderRadius: 1,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
											color: BRAND_BLUE,
										}}
									>
										<Refresh size={15} />
									</Box>
									<Typography
										variant="subtitle1"
										fontWeight={600}
										sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" }, letterSpacing: "-0.005em" }}
									>
										Credenciales SCBA
									</Typography>
									<Tooltip
										arrow
										title={
											scbaCoverage?.updatePolicyMode === "unified"
												? `Política de update UNIFICADA: activas y archivadas se refrescan juntas en la ventana del update (${scbaCoverage?.active?.schedule ?? "ver SCBA manager"}). El desglose se mantiene para ver cada segmento por separado. Configurable en Workers → SCBA manager.`
												: `Política de update DIVIDIDA: las causas con carpeta activa se refrescan en la ventana del update (${scbaCoverage?.active?.schedule ?? "ver SCBA manager"}). Las de carpeta archivada se actualizan en su ventana propia (${scbaCoverage?.archived?.schedule ?? "madrugada"}) y solo si pasaron +24 h, por eso no suman a la cobertura del día hasta esa ventana — no es un error. Configurable en Workers → SCBA manager.`
										}
									>
										<Box
											component="span"
											onClick={(e) => e.stopPropagation()}
											sx={{ display: "inline-flex", alignItems: "center", cursor: "help", color: COLORS.neutral.light }}
										>
											<InfoCircle size={15} />
										</Box>
									</Tooltip>
								</Box>
								<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Chip
										label="SCBA"
										size="small"
										sx={{
											bgcolor: alpha(BRAND_BLUE, isDark ? 0.15 : 0.09),
											color: BRAND_BLUE,
											fontWeight: 600,
											fontSize: "0.65rem",
											height: 20,
											border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
										}}
									/>
									<ArrowRight2 size={16} style={{ color: COLORS.neutral.light }} />
								</Box>
							</Box>

							{loadingScbaCoverage ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
									<Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
								</Box>
							) : scbaCoverage ? (
								(() => {
									const unified = scbaCoverage.updatePolicyMode === "unified";
									const active = scbaCoverage.active ?? {
										coveragePercent: scbaCoverage.coveragePercent,
										updatedToday: scbaCoverage.updatedToday,
										total: scbaCoverage.total,
										pending: scbaCoverage.pending,
										withErrors: scbaCoverage.withErrors,
										schedule: "ventana del update (ver SCBA manager)",
									};
									const archived = scbaCoverage.archived ?? {
										coveragePercent: 0,
										updatedToday: 0,
										total: 0,
										pending: 0,
										withErrors: 0,
										schedule: unified ? "ventana del update (unificado)" : "madrugada (4-6 h)",
									};
									const barColor = (p: number) => (p >= 99 ? COLORS.success.main : p > 70 ? COLORS.warning.main : COLORS.error.main);
									const renderLine = (label: string, b: typeof active, big: boolean, accent: string) => (
										<Box sx={{ mb: big ? 1.5 : 0 }}>
											<Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 0.25, gap: 1 }}>
												<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, minWidth: 0 }}>
													<Typography variant="body2" fontWeight={600}>
														{label}
													</Typography>
													<Typography variant="caption" color="text.secondary" noWrap>
														{b.schedule}
													</Typography>
												</Box>
												<Typography variant={big ? "h6" : "subtitle2"} fontWeight="bold" sx={{ color: accent, flexShrink: 0 }}>
													{b.coveragePercent}%
												</Typography>
											</Box>
											<LinearProgress
												variant="determinate"
												value={b.coveragePercent || 0}
												sx={{
													height: big ? 8 : 6,
													borderRadius: 4,
													backgroundColor: alpha(COLORS.neutral.light, 0.3),
													"& .MuiLinearProgress-bar": { borderRadius: 4, backgroundColor: accent },
												}}
											/>
											<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
												{b.updatedToday.toLocaleString()}/{b.total.toLocaleString()} actualizadas hoy
												{b.withErrors > 0 ? ` · ${b.withErrors} con errores` : ""}
											</Typography>
										</Box>
									);
									return (
										<>
											{renderLine("Activas", active, true, barColor(active.coveragePercent || 0))}
											{/* En modo unificado las archivadas se refrescan en el día: aplica el mismo semáforo. En split, color neutro (su ventana es nocturna). */}
											{renderLine("Archivadas", archived, false, unified ? barColor(archived.coveragePercent || 0) : COLORS.primary.light)}
											{scbaCoverage.activeCredentials !== undefined && (
												<CredentialsStat
													count={scbaCoverage.activeCredentials}
													tooltip="Credenciales SCBA activas (habilitadas y válidas)"
												/>
											)}
										</>
									);
								})()
							) : (
								<Typography variant="body2" color="text.secondary" textAlign="center">
									No se pudieron cargar las estadísticas
								</Typography>
							)}
						</Paper>
					</Grid>
				</Grid>

				{/* Detailed Sections with Charts */}
				<Grid container spacing={{ xs: 2, sm: 3 }}>
					{/* Users Section with Charts */}
					<Grid item xs={12} lg={6}>
						<SectionHeader
							title="Usuarios"
							subtitle="Estadísticas de usuarios registrados"
							icon={<UserSquare size={22} variant="Bold" />}
						/>
						<Grid container spacing={{ xs: 1.5, sm: 2 }}>
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
												<DonutChart
													data={userStatusData}
													centerValue={pctOf(data?.users.active, data?.users.total)}
													centerLabel="activos"
												/>
											</Grid>
											<Grid item xs={5}>
												<StatsLegend
													items={[
														{ label: "Activos", value: data?.users.active || 0, color: COLORS.success.main, infoKey: "activeUsers" },
														{
															label: "Inactivos",
															value: (data?.users.total || 0) - (data?.users.active || 0),
															color: COLORS.neutral.light,
														},
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
												<DonutChart
													data={userVerificationData}
													centerValue={pctOf(data?.users.verified, data?.users.total)}
													centerLabel="verificados"
												/>
											</Grid>
											<Grid item xs={5}>
												<StatsLegend
													items={[
														{
															label: "Verificados",
															value: data?.users.verified || 0,
															color: COLORS.success.main,
															infoKey: "verifiedUsers",
														},
														{
															label: "Sin verificar",
															value: (data?.users.total || 0) - (data?.users.verified || 0),
															color: COLORS.neutral.light,
														},
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
						<Grid container spacing={{ xs: 1.5, sm: 2 }}>
							{/* Plan Distribution Pie Chart - Live Mode */}
							<Grid item xs={12} sm={6}>
								<ChartCard
									title="Distribución por Plan (Live)"
									icon={<TickCircle size={18} />}
									linkTo="/admin/usuarios/suscripciones"
									height={200}
								>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={150} height={150} />
										</Box>
									) : subscriptionPlanData.length > 0 ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={7}>
												<DonutChart
													data={subscriptionPlanData}
													centerValue={(data?.subscriptions.live?.total || 0).toLocaleString()}
													centerLabel="live"
												/>
											</Grid>
											<Grid item xs={5}>
												<StatsLegend
													items={[
														{
															label: "Free",
															value: data?.subscriptions.live?.byPlan?.free || 0,
															color: chartMuted,
															infoKey: "freePlan",
														},
														{
															label: "Standard",
															value: data?.subscriptions.live?.byPlan?.standard || 0,
															color: BRAND_BLUE,
															infoKey: "standardPlan",
														},
														{
															label: "Pro",
															value: data?.subscriptions.live?.byPlan?.pro || 0,
															color: PRO_TEAL,
															infoKey: "proPlan",
														},
														{
															label: "Premium",
															value: data?.subscriptions.live?.byPlan?.premium || 0,
															color: PREMIUM_GOLD,
															infoKey: "premiumPlan",
														},
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="body2" color="textSecondary">
												Sin datos
											</Typography>
										</Box>
									)}
								</ChartCard>
							</Grid>

							{/* Test Mode Stats */}
							<Grid item xs={12} sm={6}>
								<Paper
									elevation={0}
									sx={{
										p: { xs: 1.5, sm: 2.5 },
										borderRadius: 2,
										bgcolor: alpha(COLORS.warning.main, 0.04),
										border: `1px dashed ${alpha(COLORS.warning.main, 0.3)}`,
										height: "100%",
									}}
								>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: { xs: 1.5, sm: 2 } }}>
										<Chip
											size="small"
											label="TEST MODE"
											sx={{
												bgcolor: alpha(COLORS.warning.main, 0.15),
												color: COLORS.warning.main,
												fontWeight: 600,
												fontSize: { xs: "0.6rem", sm: "0.65rem" },
												borderRadius: 1,
												border: `1px solid ${alpha(COLORS.warning.main, 0.3)}`,
											}}
										/>
										<InfoTooltip metricKey="testSubscriptions" />
									</Box>
									<Grid container spacing={{ xs: 1, sm: 2 }}>
										<Grid item xs={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography
														variant="h5"
														sx={{ fontWeight: 600, color: COLORS.neutral.main, fontSize: { xs: "1rem", sm: "1.25rem" } }}
													>
														{(data?.subscriptions.test?.byPlan?.free || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
													Free
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography
														variant="h5"
														sx={{ fontWeight: 600, color: COLORS.neutral.main, fontSize: { xs: "1rem", sm: "1.25rem" } }}
													>
														{(data?.subscriptions.test?.byPlan?.standard || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
													Standard
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography
														variant="h5"
														sx={{ fontWeight: 600, color: COLORS.neutral.main, fontSize: { xs: "1rem", sm: "1.25rem" } }}
													>
														{(data?.subscriptions.test?.byPlan?.pro || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
													Pro
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={32} sx={{ mx: "auto" }} />
												) : (
													<Typography
														variant="h5"
														sx={{ fontWeight: 600, color: COLORS.neutral.main, fontSize: { xs: "1rem", sm: "1.25rem" } }}
													>
														{(data?.subscriptions.test?.byPlan?.premium || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
													Premium
												</Typography>
											</Box>
										</Grid>
									</Grid>
									<Box
										sx={{
											mt: { xs: 1.5, sm: 2 },
											pt: { xs: 1.5, sm: 2 },
											borderTop: `1px dashed ${theme.palette.divider}`,
											display: "flex",
											justifyContent: "space-between",
											flexWrap: "wrap",
											gap: 1,
										}}
									>
										<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
											Total: <strong>{(data?.subscriptions.test?.total || 0).toLocaleString()}</strong>
										</Typography>
										<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
											Activas:{" "}
											<strong style={{ color: COLORS.warning.main }}>{(data?.subscriptions.test?.active || 0).toLocaleString()}</strong>
										</Typography>
									</Box>
								</Paper>
							</Grid>

							{/* Live Mode Summary */}
							<Grid item xs={12}>
								<Paper
									elevation={0}
									sx={{
										p: { xs: 1.5, sm: 2 },
										borderRadius: 2,
										bgcolor: alpha(COLORS.success.main, 0.05),
										border: `1px solid ${alpha(COLORS.success.main, 0.2)}`,
									}}
								>
									<Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
										<Grid item xs={12} sm={6}>
											<Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: { xs: "center", sm: "flex-start" } }}>
												<Chip
													size="small"
													label="LIVE MODE"
													sx={{
														bgcolor: alpha(COLORS.success.main, 0.15),
														color: COLORS.success.main,
														fontWeight: 600,
														fontSize: { xs: "0.6rem", sm: "0.65rem" },
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
													<Typography
														variant="h4"
														sx={{ fontWeight: 600, fontSize: { xs: "1.25rem", sm: "1.5rem" }, fontVariantNumeric: "tabular-nums" }}
													>
														{(data?.subscriptions.live?.total || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
													Total
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography
														variant="h4"
														sx={{ fontWeight: 600, color: COLORS.success.main, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
													>
														{(data?.subscriptions.live?.active || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary" sx={{ fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
													Activas
												</Typography>
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
						<Grid container spacing={{ xs: 1.5, sm: 2 }}>
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
												<CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.6)} />
												<XAxis
													dataKey="name"
													tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
													axisLine={false}
													tickLine={false}
												/>
												<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
												<RechartsTooltip
													cursor={{ fill: alpha(theme.palette.text.secondary, 0.06) }}
													contentStyle={{
														backgroundColor: theme.palette.background.paper,
														border: `1px solid ${headerBorder(isDark)}`,
														borderRadius: 8,
														boxShadow: headerShadow(isDark),
													}}
												/>
												<Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
												<Bar dataKey="verificadas" name="Verificadas" fill={LIVE_GREEN} barSize={22} radius={[4, 4, 0, 0]} />
												<Bar dataKey="noVerificadas" name="No Verificadas" fill={chartMuted} barSize={22} radius={[4, 4, 0, 0]} />
												<Bar dataKey="pendientes" name="Pendientes" fill={STALE_AMBER} barSize={22} radius={[4, 4, 0, 0]} />
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
										p: { xs: 1.5, sm: 2 },
										borderRadius: 2,
										bgcolor: alpha(COLORS.primary.main, 0.05),
										border: `1px solid ${alpha(COLORS.primary.main, 0.15)}`,
										cursor: "pointer",
										transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
										"&:hover": {
											boxShadow: headerShadow(isDark),
											transform: "translateY(-2px)",
										},
									}}
								>
									<Typography variant="overline" color="textSecondary" sx={{ fontSize: { xs: "0.6rem", sm: "0.75rem" } }}>
										PJN
									</Typography>
									<Box sx={{ display: "flex", alignItems: "baseline", gap: { xs: 0.5, sm: 1 }, flexWrap: "wrap" }}>
										{loading ? (
											<Skeleton variant="text" width={60} height={40} />
										) : (
											<Typography
												variant="h3"
												sx={{
													fontWeight: 700,
													fontSize: { xs: "1.5rem", sm: "2rem" },
													letterSpacing: "-0.02em",
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{(data?.folders.pjn?.total || 0).toLocaleString()}
											</Typography>
										)}
										<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
											total
										</Typography>
									</Box>
									<Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, mt: 1, flexWrap: "wrap" }}>
										<Typography variant="caption" sx={{ color: COLORS.success.main, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
											✓ {(data?.folders.pjn?.verified || 0).toLocaleString()}
										</Typography>
										<Typography variant="caption" sx={{ color: COLORS.neutral.main, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
											○ {(data?.folders.pjn?.nonVerified || 0).toLocaleString()}
										</Typography>
										<Typography variant="caption" sx={{ color: COLORS.warning.main, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
											◇ {(data?.folders.pjn?.pending || 0).toLocaleString()}
										</Typography>
									</Box>
								</Paper>
							</Grid>
							<Grid item xs={6}>
								<Paper
									elevation={0}
									onClick={() => navigate("/admin/mev/verified-app")}
									sx={{
										p: { xs: 1.5, sm: 2 },
										borderRadius: 2,
										bgcolor: alpha(COLORS.primary.main, 0.05),
										border: `1px solid ${alpha(COLORS.primary.main, 0.15)}`,
										cursor: "pointer",
										transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
										"&:hover": {
											boxShadow: headerShadow(isDark),
											transform: "translateY(-2px)",
										},
									}}
								>
									<Typography variant="overline" color="textSecondary" sx={{ fontSize: { xs: "0.6rem", sm: "0.75rem" } }}>
										MEV
									</Typography>
									<Box sx={{ display: "flex", alignItems: "baseline", gap: { xs: 0.5, sm: 1 }, flexWrap: "wrap" }}>
										{loading ? (
											<Skeleton variant="text" width={60} height={40} />
										) : (
											<Typography
												variant="h3"
												sx={{
													fontWeight: 700,
													fontSize: { xs: "1.5rem", sm: "2rem" },
													letterSpacing: "-0.02em",
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{(data?.folders.mev?.total || 0).toLocaleString()}
											</Typography>
										)}
										<Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
											total
										</Typography>
									</Box>
									<Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, mt: 1, flexWrap: "wrap" }}>
										<Typography variant="caption" sx={{ color: COLORS.success.main, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
											✓ {(data?.folders.mev?.verified || 0).toLocaleString()}
										</Typography>
										<Typography variant="caption" sx={{ color: COLORS.neutral.main, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
											○ {(data?.folders.mev?.nonVerified || 0).toLocaleString()}
										</Typography>
										<Typography variant="caption" sx={{ color: COLORS.warning.main, fontSize: { xs: "0.65rem", sm: "0.75rem" } }}>
											◇ {(data?.folders.mev?.pending || 0).toLocaleString()}
										</Typography>
									</Box>
								</Paper>
							</Grid>
						</Grid>
					</Grid>

					{/* Marketing Section with Charts */}
					<Grid item xs={12} md={6}>
						<SectionHeader title="Marketing" subtitle="Email marketing y segmentación" icon={<Sms size={22} variant="Bold" />} />
						<Grid container spacing={{ xs: 1.5, sm: 2 }}>
							{/* Campaigns Stats */}
							<Grid item xs={12}>
								<GroupedCard title="Campañas" icon={<Sms size={18} />} linkTo="/admin/marketing/mailing">
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
														{(data?.marketing.campaigns.total || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Total
													</Typography>
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
													<Typography variant="caption" color="textSecondary">
														Activas
													</Typography>
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
													<Typography variant="caption" color="textSecondary">
														Programadas
													</Typography>
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
												<DonutChart
													data={marketingContactsData}
													centerValue={pctOf(data?.marketing.contacts.active, data?.marketing.contacts.total)}
													centerLabel="activos"
												/>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{
															label: "Activos",
															value: data?.marketing.contacts.active || 0,
															color: COLORS.success.main,
															infoKey: "activeContacts",
														},
														{
															label: "Inactivos",
															value: (data?.marketing.contacts.total || 0) - (data?.marketing.contacts.active || 0),
															color: COLORS.neutral.light,
														},
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
												<DonutChart
													data={segmentsData}
													centerValue={(data?.marketing.segments.total || 0).toLocaleString()}
													centerLabel="segmentos"
												/>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{
															label: "Dinámicos",
															value: data?.marketing.segments.dynamic || 0,
															color: COLORS.primary.main,
															infoKey: "dynamicSegments",
														},
														{
															label: "Estáticos",
															value: data?.marketing.segments.static || 0,
															color: COLORS.primary.light,
															infoKey: "staticSegments",
														},
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="h4" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
												{(data?.marketing.segments.total || 0).toLocaleString()}
											</Typography>
											<Typography variant="body2" color="textSecondary">
												Total segmentos
											</Typography>
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
									) : emailVerificationData.some((item) => item.value > 0) ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={6}>
												<DonutChart
													data={emailVerificationData}
													centerValue={pctOf(
														data?.marketing.contacts.emailVerified,
														(data?.marketing.contacts.emailVerified || 0) + (data?.marketing.contacts.emailNotVerified || 0),
													)}
													centerLabel="verificados"
												/>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{
															label: "Verificados",
															value: data?.marketing.contacts.emailVerified || 0,
															color: COLORS.success.main,
															infoKey: "emailVerifiedContacts",
														},
														{
															label: "No Verificados",
															value: data?.marketing.contacts.emailNotVerified || 0,
															color: COLORS.neutral.light,
															infoKey: "emailNotVerifiedContacts",
														},
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="body2" color="textSecondary">
												Sin datos de verificación
											</Typography>
										</Box>
									)}
								</ChartCard>
							</Grid>

							{/* Verification Result Pie Chart (emailVerification.verified - within verified emails) */}
							<Grid item xs={12} sm={6}>
								<ChartCard
									title="Resultado de Verificación"
									icon={<TickCircle size={18} />}
									linkTo="/admin/marketing/contacts"
									height={180}
								>
									{loading ? (
										<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Skeleton variant="circular" width={120} height={120} />
										</Box>
									) : verificationResultData.some((item) => item.value > 0) ? (
										<Grid container sx={{ height: "100%" }}>
											<Grid item xs={6}>
												<DonutChart
													data={verificationResultData}
													centerValue={pctOf(
														data?.marketing.contacts.verificationValid,
														(data?.marketing.contacts.verificationValid || 0) + (data?.marketing.contacts.verificationNotValid || 0),
													)}
													centerLabel="válidos"
												/>
											</Grid>
											<Grid item xs={6}>
												<StatsLegend
													items={[
														{
															label: "Válidos",
															value: data?.marketing.contacts.verificationValid || 0,
															color: COLORS.success.main,
															infoKey: "verificationValidContacts",
														},
														{
															label: "No Válidos",
															value: data?.marketing.contacts.verificationNotValid || 0,
															color: COLORS.neutral.light,
															infoKey: "verificationNotValidContacts",
														},
													]}
													loading={loading}
												/>
											</Grid>
										</Grid>
									) : (
										<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
											<Typography variant="body2" color="textSecondary">
												Sin datos de resultado
											</Typography>
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
