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
	ToggleButton,
	ToggleButtonGroup,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Tab,
	LinearProgress,
	Button,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Divider,
	Alert,
} from "@mui/material";
import { Refresh, Activity, Chart, People, Global, Mouse, Mobile, Monitor, Send2, ArrowRight, ArrowDown, Login, Logout, Routing, Filter, Add, Trash, Play, InfoCircle } from "iconsax-react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	FunnelChart,
	Funnel,
	LabelList,
} from "recharts";
import MainCard from "components/MainCard";
import GA4AnalyticsService from "api/ga4Analytics";
import { GA4AllData, GA4PeriodOption, GA4NavigationData, GA4AllEventsData, GA4CustomFunnelData, GA4PredefinedFunnel, GA4EventDetails } from "types/ga4-analytics";
import { useSnackbar } from "notistack";
import { SearchNormal1 } from "iconsax-react";

// Documentación de métricas
const METRIC_DESCRIPTIONS: Record<string, { title: string; description: string; interpretation: string }> = {
	totalUsers: {
		title: "Usuarios Totales",
		description: "Número total de usuarios únicos que visitaron el sitio en el período seleccionado.",
		interpretation: "Mide el alcance total. Un crecimiento constante indica buena adquisición de audiencia.",
	},
	newUsers: {
		title: "Usuarios Nuevos",
		description: "Usuarios que visitan el sitio por primera vez en el período seleccionado.",
		interpretation: "Indica efectividad de marketing. Comparar con usuarios totales para ver retención.",
	},
	sessions: {
		title: "Sesiones",
		description: "Número total de visitas al sitio. Un usuario puede tener múltiples sesiones.",
		interpretation: "Sesiones/Usuarios > 1 indica usuarios recurrentes. Ideal: ratio entre 1.2 y 2.0.",
	},
	pageViews: {
		title: "Páginas Vistas",
		description: "Total de páginas visualizadas. Incluye vistas repetidas de la misma página.",
		interpretation: "Páginas/Sesión indica profundidad de navegación. Más de 2 es bueno para sitios informativos.",
	},
	bounceRate: {
		title: "Tasa de Rebote",
		description: "Porcentaje de sesiones donde el usuario abandonó sin interactuar.",
		interpretation: "Menos de 40% es excelente, 40-55% es promedio, más de 70% necesita atención.",
	},
	engagedSessions: {
		title: "Sesiones Engaged",
		description: "Sesiones con más de 10 segundos, evento de conversión, o 2+ páginas vistas.",
		interpretation: "Engaged/Total indica calidad del tráfico. Objetivo: más del 60%.",
	},
	avgSessionDuration: {
		title: "Duración Promedio",
		description: "Tiempo promedio que los usuarios permanecen en el sitio por sesión.",
		interpretation: "Más de 2 minutos es bueno. Menos de 30 segundos indica problemas de contenido.",
	},
	engagementDuration: {
		title: "Tiempo de Engagement",
		description: "Tiempo total que los usuarios interactúan activamente con el contenido.",
		interpretation: "Diferente a duración de sesión: solo cuenta tiempo de interacción activa.",
	},
	realtimeUsers: {
		title: "Usuarios en Tiempo Real",
		description: "Usuarios activos en el sitio en los últimos 30 minutos.",
		interpretation: "Útil para monitorear campañas en vivo o detectar picos de tráfico.",
	},
};

// Documentación de gráficos
const CHART_DESCRIPTIONS: Record<string, { title: string; description: string; howToRead: string }> = {
	usersTrend: {
		title: "Tendencia de Usuarios",
		description: "Evolución diaria de usuarios totales, nuevos y sesiones.",
		howToRead: "Línea azul = usuarios totales, verde = nuevos, naranja = sesiones. Buscar tendencias alcistas.",
	},
	conversionFunnel: {
		title: "Funnel de Conversión",
		description: "Embudo que muestra la progresión de usuarios a través de pasos clave.",
		howToRead: "Cada paso muestra usuarios y % de conversión al siguiente. Identificar pasos con mayor caída.",
	},
	trafficSources: {
		title: "Fuentes de Tráfico",
		description: "De dónde provienen los visitantes: búsqueda orgánica, directo, redes sociales, etc.",
		howToRead: "Organic = SEO, Direct = escriben URL, Referral = otros sitios, Paid = publicidad.",
	},
	devices: {
		title: "Dispositivos",
		description: "Distribución de sesiones por tipo de dispositivo.",
		howToRead: "Mobile alto indica necesidad de optimización móvil. Desktop alto = usuarios más comprometidos.",
	},
	topPages: {
		title: "Páginas más Visitadas",
		description: "Las páginas con mayor número de visualizaciones.",
		howToRead: "Identificar contenido popular. Páginas con muchas vistas pero pocos usuarios = usuarios recurrentes.",
	},
	customEvents: {
		title: "Eventos Personalizados",
		description: "Acciones específicas rastreadas: clicks, scrolls, interacciones.",
		howToRead: "Eventos con alto conteo pero pocos usuarios = usuarios muy activos. Analizar conversiones.",
	},
	ctaClicks: {
		title: "Clicks en CTAs",
		description: "Clicks en botones de llamada a la acción del sitio.",
		howToRead: "Comparar CTAs para identificar cuáles son más efectivos. Optimizar los de bajo rendimiento.",
	},
	featureInterest: {
		title: "Interés en Features",
		description: "Qué herramientas/características generan más interés.",
		howToRead: "Features populares indican qué destacar en marketing. Poco interés = revisar presentación.",
	},
	countries: {
		title: "Países de Origen",
		description: "Distribución geográfica de los visitantes.",
		howToRead: "Identificar mercados principales. Evaluar si coincide con público objetivo.",
	},
};

// Documentación de columnas de tablas
const TABLE_COLUMN_DOCS: Record<string, Record<string, string>> = {
	topPages: {
		pagePath: "URL relativa de la página dentro del sitio",
		pageViews: "Número total de veces que la página fue visualizada",
		users: "Usuarios únicos que visitaron esta página",
	},
	customEvents: {
		eventName: "Nombre del evento rastreado en GA4",
		count: "Número total de veces que se disparó el evento",
		users: "Usuarios únicos que activaron este evento",
	},
	landingPages: {
		page: "Primera página que el usuario ve al entrar al sitio",
		sessions: "Sesiones que comenzaron en esta página",
		users: "Usuarios únicos que entraron por esta página",
		bounceRate: "% de usuarios que abandonaron sin interactuar",
	},
	exitPages: {
		page: "Última página antes de abandonar el sitio",
		exits: "Número de veces que los usuarios salieron desde esta página",
		pageViews: "Total de veces que se visualizó esta página",
		exitRate: "% de vistas que terminaron en abandono",
	},
	navigationPaths: {
		path: "Secuencia de páginas visitadas en orden",
		sessions: "Sesiones que siguieron esta ruta",
		users: "Usuarios únicos que siguieron esta ruta",
		avgDuration: "Tiempo promedio de la sesión en esta ruta",
	},
	pageFlow: {
		fromPage: "Página desde donde el usuario navegó",
		toPage: "Página a la que el usuario llegó",
		transitions: "Número de veces que ocurrió esta transición",
	},
	funnelEvents: {
		eventName: "Nombre del evento en GA4",
		description: "Qué acción del usuario representa",
		count: "Total de veces que se disparó",
		users: "Usuarios únicos que lo activaron",
		status: "Si el evento está seleccionado en el funnel",
	},
};

// Helper para crear header con tooltip
const DocTableCell: React.FC<{ children: React.ReactNode; tooltip?: string; align?: "left" | "right" | "center" }> = ({
	children,
	tooltip,
	align = "left",
}) => {
	const theme = useTheme();
	return (
		<TableCell align={align}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
				{children}
				{tooltip && (
					<Tooltip title={tooltip} arrow placement="top">
						<Box sx={{ display: "flex", cursor: "help" }}>
							<InfoCircle size={14} color={theme.palette.text.secondary} />
						</Box>
					</Tooltip>
				)}
			</Box>
		</TableCell>
	);
};

// Descripciones de eventos
const EVENT_DESCRIPTIONS: Record<string, string> = {
	// Eventos estándar de GA4
	page_view: "Usuario ve cualquier página del sitio",
	session_start: "Inicio de una nueva sesión de navegación",
	first_visit: "Primera visita del usuario al sitio",
	user_engagement: "Usuario interactúa activamente con la página",
	scroll: "Usuario hace scroll en la página (Enhanced Measurement)",
	scroll_depth: "Profundidad de scroll alcanzada (25%, 50%, 75%, 90%)",
	click: "Click genérico en elementos del sitio",
	// Eventos de scroll por sección
	scroll_section: "Usuario scrollea hasta ver una sección específica de la landing",
	// Eventos de CTA
	cta_click: "Click en cualquier botón CTA (genérico)",
	cta_click_hero: "Click en botón 'Probar Gratis' del hero principal",
	cta_click_citas: "Click en botón 'Activar sistema de citas'",
	cta_click_prueba_pagar: "Click en CTA de sección 'Prueba antes de pagar'",
	// Eventos de features/modals
	view_features_section: "Sección de herramientas visible al 50% en viewport",
	feature_interest: "Click en card de una herramienta específica",
	feature_modal_open: "Usuario abre el modal de detalle de una herramienta",
	feature_modal_close: "Usuario cierra el modal de herramienta",
	feature_modal_scroll: "Usuario scrollea 50%+ dentro del modal",
	feature_modal_cta_click: "Click en CTA dentro del modal de herramienta",
	// Eventos de registro
	register_view: "Usuario ve la página de registro",
	register_start: "Usuario comienza a completar el formulario de registro",
	register_complete: "Usuario completa el registro exitosamente",
	sign_up: "Registro completado (equivalente a register_complete)",
	// Eventos de login
	login_click: "Click en botón de login",
	form_start: "Usuario comienza a completar un formulario",
	// Eventos especiales
	high_scroll_no_cta: "Usuario de Instagram scrolleó pero no hizo click en CTA",
};

// Función para obtener descripción de evento
const getEventDescription = (eventName: string): string => {
	return EVENT_DESCRIPTIONS[eventName] || "Evento personalizado sin descripción";
};

// Funnels predefinidos
const PREDEFINED_FUNNELS: GA4PredefinedFunnel[] = [
	{
		id: "main-journey",
		name: "Journey Principal",
		description: "Desde visita hasta registro completo",
		events: ["page_view", "register_view", "register_start", "register_complete"],
	},
	{
		id: "feature-interest",
		name: "Interés en Features",
		description: "Desde vista de features hasta apertura de modal",
		events: ["page_view", "view_features_section", "feature_interest", "feature_modal_open"],
	},
	{
		id: "cta-conversion",
		name: "Conversión por CTA",
		description: "Clicks en CTAs hasta inicio de registro",
		events: ["page_view", "cta_click_hero", "register_view", "register_start"],
	},
	{
		id: "scroll-engagement",
		name: "Engagement de Scroll",
		description: "Profundidad de scroll en landing",
		events: ["page_view", "scroll_section", "view_features_section", "feature_interest"],
	},
];

// Tab Panel Component
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
	return (
		<div role="tabpanel" hidden={value !== index} id={`ga4-tabpanel-${index}`} aria-labelledby={`ga4-tab-${index}`}>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	);
};

const a11yProps = (index: number) => ({
	id: `ga4-tab-${index}`,
	"aria-controls": `ga4-tabpanel-${index}`,
});

// Color palette
const COLORS = {
	primary: { main: "#4F46E5", light: "#6366F1", lighter: "#EEF2FF" },
	success: { main: "#10B981", light: "#34D399", lighter: "#ECFDF5" },
	warning: { main: "#F59E0B", light: "#FBBF24", lighter: "#FFFBEB" },
	neutral: { main: "#64748B", light: "#94A3B8", lighter: "#F1F5F9", text: "#475569" },
	funnel: ["#4F46E5", "#6366F1", "#818CF8", "#A5B4FC"],
	pie: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"],
};

// Metric Card Component
interface MetricCardProps {
	title: string;
	value: number | string;
	icon: React.ReactNode;
	loading?: boolean;
	color?: string;
	subtitle?: string;
	metricKey?: keyof typeof METRIC_DESCRIPTIONS;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, loading, color, subtitle, metricKey }) => {
	const theme = useTheme();
	const resolvedColor = color || theme.palette.primary.main;
	const metricInfo = metricKey ? METRIC_DESCRIPTIONS[metricKey] : null;

	const cardContent = (
		<Paper
			elevation={0}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: metricInfo ? "help" : "default",
				transition: "border-color 0.2s",
				"&:hover": metricInfo ? { borderColor: alpha(theme.palette.primary.main, 0.5) } : {},
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
				<Box sx={{ color: theme.palette.text.secondary, display: "flex" }}>{icon}</Box>
				<Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
					{title}
				</Typography>
			</Box>
			{loading ? (
				<Skeleton variant="text" width={80} height={48} />
			) : (
				<>
					<Typography variant="h3" sx={{ fontWeight: 700, color: resolvedColor, lineHeight: 1 }}>
						{typeof value === "number" ? value.toLocaleString() : value}
					</Typography>
					{subtitle && (
						<Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: "block" }}>
							{subtitle}
						</Typography>
					)}
				</>
			)}
		</Paper>
	);

	if (metricInfo) {
		return (
			<Tooltip
				title={
					<Box sx={{ p: 0.5 }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
							{metricInfo.title}
						</Typography>
						<Typography variant="caption" sx={{ display: "block", mb: 1 }}>
							{metricInfo.description}
						</Typography>
						<Typography variant="caption" sx={{ display: "block", color: alpha(theme.palette.common.white, 0.8), fontStyle: "italic" }}>
							{metricInfo.interpretation}
						</Typography>
					</Box>
				}
				arrow
				placement="top"
			>
				{cardContent}
			</Tooltip>
		);
	}

	return cardContent;
};

// Chart Card Component
interface ChartCardProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	height?: number;
	chartKey?: keyof typeof CHART_DESCRIPTIONS;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, height = 280, chartKey }) => {
	const theme = useTheme();
	const chartInfo = chartKey ? CHART_DESCRIPTIONS[chartKey] : null;

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
				<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
				<Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
					{title}
				</Typography>
				{chartInfo && (
					<Tooltip
						title={
							<Box sx={{ p: 0.5 }}>
								<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
									{chartInfo.title}
								</Typography>
								<Typography variant="caption" sx={{ display: "block", mb: 1 }}>
									{chartInfo.description}
								</Typography>
								<Typography variant="caption" sx={{ display: "block", color: alpha(theme.palette.common.white, 0.8), fontStyle: "italic" }}>
									{chartInfo.howToRead}
								</Typography>
							</Box>
						}
						arrow
						placement="top"
					>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: 20,
								height: 20,
								borderRadius: "50%",
								bgcolor: alpha(theme.palette.primary.main, 0.1),
								color: theme.palette.primary.main,
								fontSize: 12,
								fontWeight: 600,
								cursor: "help",
							}}
						>
							?
						</Box>
					</Tooltip>
				)}
			</Box>
			<Box sx={{ height }}>{children}</Box>
		</Paper>
	);
};

// Realtime Users Component
interface RealtimeCardProps {
	activeUsers: number;
	loading?: boolean;
}

const RealtimeCard: React.FC<RealtimeCardProps> = ({ activeUsers, loading }) => {
	const theme = useTheme();
	const metricInfo = METRIC_DESCRIPTIONS.realtimeUsers;

	return (
		<Tooltip
			title={
				<Box sx={{ p: 0.5 }}>
					<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
						{metricInfo.title}
					</Typography>
					<Typography variant="caption" sx={{ display: "block", mb: 1 }}>
						{metricInfo.description}
					</Typography>
					<Typography variant="caption" sx={{ display: "block", color: alpha(theme.palette.common.white, 0.8), fontStyle: "italic" }}>
						{metricInfo.interpretation}
					</Typography>
				</Box>
			}
			arrow
			placement="top"
		>
			<Paper
				elevation={0}
				sx={{
					p: 2.5,
					borderRadius: 2,
					bgcolor: alpha(theme.palette.success.main, 0.05),
					border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
					height: "100%",
					position: "relative",
					overflow: "hidden",
					cursor: "help",
					transition: "border-color 0.2s",
					"&:hover": { borderColor: alpha(theme.palette.success.main, 0.5) },
				}}
			>
				<Box
					sx={{
						position: "absolute",
						top: 12,
						right: 12,
						width: 8,
						height: 8,
						borderRadius: "50%",
						bgcolor: theme.palette.success.main,
						animation: "pulse 2s infinite",
						"@keyframes pulse": {
							"0%": { opacity: 1, transform: "scale(1)" },
							"50%": { opacity: 0.5, transform: "scale(1.5)" },
							"100%": { opacity: 1, transform: "scale(1)" },
						},
					}}
				/>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
					<Activity size={20} color={theme.palette.success.main} variant="Bold" />
					<Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
						Usuarios Activos Ahora
					</Typography>
				</Box>
				{loading ? (
					<Skeleton variant="text" width={60} height={64} />
				) : (
					<Typography variant="h2" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
						{activeUsers}
					</Typography>
				)}
			</Paper>
		</Tooltip>
	);
};

// Funnel Step Component
interface FunnelStepProps {
	step: string;
	users: number;
	conversionRate: number;
	isLast: boolean;
	color: string;
	loading?: boolean;
}

const FunnelStep: React.FC<FunnelStepProps> = ({ step, users, conversionRate, isLast, color, loading }) => {
	const theme = useTheme();

	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
			<Box
				sx={{
					flex: 1,
					p: 2,
					borderRadius: 1,
					bgcolor: alpha(color, 0.1),
					border: `1px solid ${alpha(color, 0.3)}`,
				}}
			>
				<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<Typography variant="body2" fontWeight={500}>
						{step}
					</Typography>
					{loading ? (
						<Skeleton variant="text" width={60} />
					) : (
						<Typography variant="h6" sx={{ color, fontWeight: 600 }}>
							{users.toLocaleString()}
						</Typography>
					)}
				</Box>
			</Box>
			{!isLast && (
				<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
					<ArrowDown size={20} color={theme.palette.text.secondary} />
					{!loading && (
						<Typography variant="caption" sx={{ color: conversionRate >= 50 ? theme.palette.success.main : theme.palette.warning.main, fontWeight: 600 }}>
							{conversionRate}%
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);
};

const GA4Dashboard = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [navLoading, setNavLoading] = useState(false);
	const [funnelLoading, setFunnelLoading] = useState(false);
	const [data, setData] = useState<GA4AllData | null>(null);
	const [navData, setNavData] = useState<GA4NavigationData | null>(null);
	const [eventsData, setEventsData] = useState<GA4AllEventsData | null>(null);
	const [funnelData, setFunnelData] = useState<GA4CustomFunnelData | null>(null);
	const [period, setPeriod] = useState<GA4PeriodOption>("30d");
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
	const [tabValue, setTabValue] = useState(0);
	// Funnel builder state
	const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
	const [selectedPredefinedFunnel, setSelectedPredefinedFunnel] = useState<string>("");
	// Event explorer state
	const [selectedEventForExplorer, setSelectedEventForExplorer] = useState<string>("");
	const [eventDetails, setEventDetails] = useState<GA4EventDetails | null>(null);
	const [eventExplorerLoading, setEventExplorerLoading] = useState(false);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await GA4AnalyticsService.getAllData({ period });
			if (response.success) {
				setData(response.data);
				setLastUpdated(new Date());
			}
		} catch (error: any) {
			console.error("Error fetching GA4 data:", error);
			enqueueSnackbar(error?.message || "Error al cargar datos de GA4", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [period, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Refresh realtime every 30 seconds
	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const response = await GA4AnalyticsService.getRealtimeUsers();
				if (response.success && data) {
					setData((prev) => (prev ? { ...prev, realtime: response.data } : prev));
				}
			} catch (error) {
				console.error("Error fetching realtime users:", error);
			}
		}, 30000);

		return () => clearInterval(interval);
	}, [data]);

	const handlePeriodChange = (_: React.MouseEvent<HTMLElement>, newPeriod: GA4PeriodOption | null) => {
		if (newPeriod) {
			setPeriod(newPeriod);
		}
	};

	const handleRefresh = () => {
		fetchData();
		if (tabValue === 1 || tabValue === 2) {
			fetchNavData();
		}
	};

	const fetchNavData = useCallback(async () => {
		try {
			setNavLoading(true);
			const response = await GA4AnalyticsService.getNavigationAll({ period });
			if (response.success) {
				setNavData(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching navigation data:", error);
			enqueueSnackbar(error?.message || "Error al cargar datos de navegación", { variant: "error" });
		} finally {
			setNavLoading(false);
		}
	}, [period, enqueueSnackbar]);

	const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
		// Cargar datos de navegación cuando se cambia a esas tabs
		if ((newValue === 1 || newValue === 2) && !navData) {
			fetchNavData();
		}
		// Cargar eventos cuando se cambia al tab de funnels o event explorer
		if ((newValue === 3 || newValue === 4) && !eventsData) {
			fetchEventsData();
		}
	};

	const fetchEventsData = useCallback(async () => {
		try {
			setFunnelLoading(true);
			const response = await GA4AnalyticsService.getAllEvents({ period });
			if (response.success) {
				setEventsData(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching events data:", error);
			enqueueSnackbar(error?.message || "Error al cargar eventos", { variant: "error" });
		} finally {
			setFunnelLoading(false);
		}
	}, [period, enqueueSnackbar]);

	const generateFunnel = useCallback(async () => {
		if (selectedEvents.length < 2) {
			enqueueSnackbar("Selecciona al menos 2 eventos para crear un funnel", { variant: "warning" });
			return;
		}
		try {
			setFunnelLoading(true);
			const response = await GA4AnalyticsService.getCustomFunnel(selectedEvents, { period });
			if (response.success) {
				setFunnelData(response.data);
			}
		} catch (error: any) {
			console.error("Error generating funnel:", error);
			enqueueSnackbar(error?.message || "Error al generar funnel", { variant: "error" });
		} finally {
			setFunnelLoading(false);
		}
	}, [selectedEvents, period, enqueueSnackbar]);

	const handleAddEvent = (eventName: string) => {
		if (eventName && !selectedEvents.includes(eventName)) {
			setSelectedEvents([...selectedEvents, eventName]);
		}
	};

	const handleRemoveEvent = (index: number) => {
		setSelectedEvents(selectedEvents.filter((_, i) => i !== index));
		setFunnelData(null);
	};

	const handleSelectPredefinedFunnel = (funnelId: string) => {
		setSelectedPredefinedFunnel(funnelId);
		const funnel = PREDEFINED_FUNNELS.find((f) => f.id === funnelId);
		if (funnel) {
			setSelectedEvents(funnel.events);
			setFunnelData(null);
		}
	};

	const handleClearFunnel = () => {
		setSelectedEvents([]);
		setSelectedPredefinedFunnel("");
		setFunnelData(null);
	};

	// Event Explorer functions
	const fetchEventDetails = useCallback(async (eventName: string) => {
		if (!eventName) return;
		try {
			setEventExplorerLoading(true);
			const response = await GA4AnalyticsService.getEventDetails(eventName, { period });
			if (response.success) {
				setEventDetails(response.data);
			}
		} catch (error: any) {
			console.error("Error fetching event details:", error);
			enqueueSnackbar(error?.message || "Error al cargar detalles del evento", { variant: "error" });
		} finally {
			setEventExplorerLoading(false);
		}
	}, [period, enqueueSnackbar]);

	const handleSelectEventForExplorer = (eventName: string) => {
		setSelectedEventForExplorer(eventName);
		setEventDetails(null);
		if (eventName) {
			fetchEventDetails(eventName);
		}
	};

	// Format date for chart
	const formatDate = (dateStr: string) => {
		if (!dateStr || dateStr.length !== 8) return dateStr;
		const year = dateStr.substring(0, 4);
		const month = dateStr.substring(4, 6);
		const day = dateStr.substring(6, 8);
		return `${day}/${month}`;
	};

	// Format duration
	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}m ${secs}s`;
	};

	// Prepare chart data
	const usersTrendData = data?.usersTrend.map((item) => ({
		...item,
		date: formatDate(item.date),
	}));

	const trafficSourcesData = data?.trafficSources.map((item, index) => ({
		...item,
		color: COLORS.pie[index % COLORS.pie.length],
	}));

	const devicesData = data?.devices.map((item, index) => ({
		...item,
		color: COLORS.pie[index % COLORS.pie.length],
	}));

	return (
		<MainCard
			title="Analytics GA4"
			secondary={
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					<ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small" sx={{ bgcolor: theme.palette.background.paper }}>
						<ToggleButton value="7d">7d</ToggleButton>
						<ToggleButton value="30d">30d</ToggleButton>
						<ToggleButton value="90d">90d</ToggleButton>
					</ToggleButtonGroup>
					{lastUpdated && (
						<Chip
							size="small"
							label={`Actualizado: ${lastUpdated.toLocaleTimeString("es-ES")}`}
							variant="outlined"
							sx={{ borderRadius: 1.5 }}
						/>
					)}
					<Tooltip title="Actualizar datos">
						<IconButton onClick={handleRefresh} disabled={loading || navLoading} size="small" color="primary">
							<Refresh
								size={20}
								style={{
									animation: loading || navLoading ? "spin 1s linear infinite" : "none",
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

			{/* Tabs de navegación */}
			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 0 }}>
				<Tabs value={tabValue} onChange={handleTabChange} aria-label="GA4 analytics tabs">
					<Tab icon={<Chart size={18} />} iconPosition="start" label="Overview" {...a11yProps(0)} />
					<Tab icon={<Login size={18} />} iconPosition="start" label="Landing & Exit Pages" {...a11yProps(1)} />
					<Tab icon={<Routing size={18} />} iconPosition="start" label="Path Analysis" {...a11yProps(2)} />
					<Tab icon={<Filter size={18} />} iconPosition="start" label="Funnel Builder" {...a11yProps(3)} />
					<Tab icon={<SearchNormal1 size={18} />} iconPosition="start" label="Event Explorer" {...a11yProps(4)} />
				</Tabs>
			</Box>

			{/* TAB 0: Overview */}
			<TabPanel value={tabValue} index={0}>
			{/* Info Card */}
			<Paper
				elevation={0}
				sx={{
					p: 2,
					mb: 3,
					borderRadius: 2,
					bgcolor: alpha(theme.palette.primary.main, 0.05),
					border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
				}}
			>
				<Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, mb: 1 }}>
					Guía de Métricas - Pasa el cursor sobre cualquier tarjeta o gráfico para ver su descripción
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} md={4}>
						<Typography variant="body2" color="textSecondary">
							<strong>Métricas de Audiencia:</strong> Usuarios totales, nuevos y sesiones miden el alcance y crecimiento de tu sitio.
							Un ratio de Sesiones/Usuarios mayor a 1.2 indica buena retención.
						</Typography>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="body2" color="textSecondary">
							<strong>Métricas de Engagement:</strong> Bounce rate, sesiones engaged y tiempo de engagement miden la calidad de la interacción.
							Bounce rate menor a 40% es excelente.
						</Typography>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="body2" color="textSecondary">
							<strong>Métricas de Conversión:</strong> El funnel y eventos personalizados muestran el progreso hacia objetivos.
							Identifica pasos con alta caída para optimizar.
						</Typography>
					</Grid>
				</Grid>
			</Paper>

			{/* Top Row: Realtime + Key Metrics */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<RealtimeCard activeUsers={data?.realtime.activeUsers || 0} loading={loading} />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard title="Usuarios Totales" value={data?.overview.totalUsers || 0} icon={<People size={20} />} loading={loading} metricKey="totalUsers" />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard
						title="Usuarios Nuevos"
						value={data?.overview.newUsers || 0}
						icon={<People size={20} />}
						loading={loading}
						color={theme.palette.success.main}
						metricKey="newUsers"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard
						title="Sesiones"
						value={data?.overview.sessions || 0}
						icon={<Activity size={20} />}
						loading={loading}
						subtitle={`Duración prom: ${formatDuration(data?.overview.avgSessionDuration || 0)}`}
						metricKey="sessions"
					/>
				</Grid>
			</Grid>

			{/* Second Row: More Metrics */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard title="Páginas Vistas" value={data?.overview.pageViews || 0} icon={<Global size={20} />} loading={loading} metricKey="pageViews" />
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard
						title="Tasa de Rebote"
						value={`${((data?.overview.bounceRate || 0) * 100).toFixed(1)}%`}
						icon={<ArrowRight size={20} />}
						loading={loading}
						color={theme.palette.warning.main}
						metricKey="bounceRate"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard
						title="Sesiones Engaged"
						value={data?.overview.engagedSessions || 0}
						icon={<Mouse size={20} />}
						loading={loading}
						color={theme.palette.success.main}
						metricKey="engagedSessions"
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MetricCard
						title="Tiempo Engagement"
						value={formatDuration(data?.overview.engagementDuration || 0)}
						icon={<Activity size={20} />}
						loading={loading}
						metricKey="engagementDuration"
					/>
				</Grid>
			</Grid>

			{/* Charts Row */}
			<Grid container spacing={3}>
				{/* Users Trend Chart */}
				<Grid item xs={12} lg={8}>
					<ChartCard title="Tendencia de Usuarios" icon={<Chart size={18} />} height={300} chartKey="usersTrend">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={usersTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
									<XAxis dataKey="date" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
									<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
									<RechartsTooltip
										contentStyle={{
											backgroundColor: theme.palette.background.paper,
											border: `1px solid ${theme.palette.divider}`,
											borderRadius: 8,
										}}
									/>
									<Line type="monotone" dataKey="totalUsers" stroke={COLORS.primary.main} strokeWidth={2} name="Usuarios" dot={false} />
									<Line type="monotone" dataKey="newUsers" stroke={COLORS.success.main} strokeWidth={2} name="Nuevos" dot={false} />
									<Line type="monotone" dataKey="sessions" stroke={COLORS.warning.main} strokeWidth={2} name="Sesiones" dot={false} />
								</LineChart>
							</ResponsiveContainer>
						)}
					</ChartCard>
				</Grid>

				{/* Conversion Funnel */}
				<Grid item xs={12} lg={4}>
					<ChartCard title="Funnel de Conversión" icon={<Send2 size={18} />} height={300} chartKey="conversionFunnel">
						{loading ? (
							<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
								{[1, 2, 3, 4].map((i) => (
									<Skeleton key={i} variant="rectangular" height={50} sx={{ borderRadius: 1 }} />
								))}
							</Box>
						) : (
							<Box sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%", justifyContent: "center" }}>
								{data?.funnel.map((step, index) => (
									<FunnelStep
										key={step.event}
										step={step.step}
										users={step.users}
										conversionRate={step.conversionRate}
										isLast={index === data.funnel.length - 1}
										color={COLORS.funnel[index % COLORS.funnel.length]}
									/>
								))}
							</Box>
						)}
					</ChartCard>
				</Grid>

				{/* Traffic Sources */}
				<Grid item xs={12} md={6}>
					<ChartCard title="Fuentes de Tráfico" icon={<Global size={18} />} height={250} chartKey="trafficSources">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : (
							<Grid container sx={{ height: "100%" }}>
								<Grid item xs={6}>
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie data={trafficSourcesData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="sessions">
												{trafficSourcesData?.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<RechartsTooltip />
										</PieChart>
									</ResponsiveContainer>
								</Grid>
								<Grid item xs={6}>
									<Box sx={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center", height: "100%" }}>
										{trafficSourcesData?.slice(0, 5).map((item, index) => (
											<Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
												<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color }} />
												<Typography variant="caption" sx={{ flex: 1 }} noWrap>
													{item.channel}
												</Typography>
												<Typography variant="caption" fontWeight={600}>
													{item.sessions}
												</Typography>
											</Box>
										))}
									</Box>
								</Grid>
							</Grid>
						)}
					</ChartCard>
				</Grid>

				{/* Devices */}
				<Grid item xs={12} md={6}>
					<ChartCard title="Dispositivos" icon={<Mobile size={18} />} height={250} chartKey="devices">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : (
							<Grid container sx={{ height: "100%" }}>
								<Grid item xs={6}>
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie data={devicesData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="sessions">
												{devicesData?.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<RechartsTooltip />
										</PieChart>
									</ResponsiveContainer>
								</Grid>
								<Grid item xs={6}>
									<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, justifyContent: "center", height: "100%" }}>
										{devicesData?.map((item, index) => (
											<Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
												{item.device === "desktop" ? (
													<Monitor size={18} color={item.color} />
												) : item.device === "mobile" ? (
													<Mobile size={18} color={item.color} />
												) : (
													<Monitor size={18} color={item.color} />
												)}
												<Typography variant="body2" sx={{ flex: 1, textTransform: "capitalize" }}>
													{item.device}
												</Typography>
												<Typography variant="body2" fontWeight={600}>
													{item.sessions}
												</Typography>
											</Box>
										))}
									</Box>
								</Grid>
							</Grid>
						)}
					</ChartCard>
				</Grid>

				{/* Top Pages Table */}
				<Grid item xs={12} md={6}>
					<ChartCard title="Páginas más Visitadas" icon={<Global size={18} />} height={280} chartKey="topPages">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : (
							<TableContainer sx={{ maxHeight: 280 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<DocTableCell tooltip={TABLE_COLUMN_DOCS.topPages.pagePath}>Página</DocTableCell>
											<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.topPages.pageViews}>Vistas</DocTableCell>
											<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.topPages.users}>Usuarios</DocTableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{data?.topPages.map((page, index) => (
											<TableRow key={index} hover>
												<TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
													{page.pagePath}
												</TableCell>
												<TableCell align="right">{page.pageViews.toLocaleString()}</TableCell>
												<TableCell align="right">{page.users.toLocaleString()}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</ChartCard>
				</Grid>

				{/* Custom Events Table */}
				<Grid item xs={12} md={6}>
					<ChartCard title="Eventos Personalizados" icon={<Mouse size={18} />} height={280} chartKey="customEvents">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : (
							<TableContainer sx={{ maxHeight: 280 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<DocTableCell tooltip={TABLE_COLUMN_DOCS.customEvents.eventName}>Evento</DocTableCell>
											<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.customEvents.count}>Cantidad</DocTableCell>
											<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.customEvents.users}>Usuarios</DocTableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{data?.customEvents.map((event, index) => (
											<TableRow key={index} hover>
												<TableCell>{event.eventName}</TableCell>
												<TableCell align="right">{event.count.toLocaleString()}</TableCell>
												<TableCell align="right">{event.users.toLocaleString()}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</ChartCard>
				</Grid>

				{/* CTA Clicks */}
				<Grid item xs={12} md={6}>
					<ChartCard title="Clicks en CTAs" icon={<Mouse size={18} />} height={250} chartKey="ctaClicks">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : data?.ctaClicks && data.ctaClicks.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={data.ctaClicks} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
									<XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
									<YAxis type="category" dataKey="ctaType" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} width={80} />
									<RechartsTooltip />
									<Bar dataKey="clicks" fill={COLORS.primary.main} radius={[0, 4, 4, 0]} />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
								<Typography variant="body2" color="textSecondary">
									Sin datos de CTA clicks
								</Typography>
							</Box>
						)}
					</ChartCard>
				</Grid>

				{/* Feature Interest */}
				<Grid item xs={12} md={6}>
					<ChartCard title="Interés en Features" icon={<Chart size={18} />} height={250} chartKey="featureInterest">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : data?.featureInterest && data.featureInterest.length > 0 ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={data.featureInterest} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
									<XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
									<YAxis type="category" dataKey="feature" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} width={80} />
									<RechartsTooltip />
									<Bar dataKey="views" fill={COLORS.success.main} radius={[0, 4, 4, 0]} />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
								<Typography variant="body2" color="textSecondary">
									Sin datos de features
								</Typography>
							</Box>
						)}
					</ChartCard>
				</Grid>

				{/* Countries */}
				<Grid item xs={12}>
					<ChartCard title="Países de Origen" icon={<Global size={18} />} height={200} chartKey="countries">
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={data?.countries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
									<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
									<XAxis dataKey="country" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
									<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
									<RechartsTooltip />
									<Bar dataKey="sessions" fill={COLORS.primary.main} radius={[4, 4, 0, 0]} name="Sesiones" />
									<Bar dataKey="users" fill={COLORS.success.main} radius={[4, 4, 0, 0]} name="Usuarios" />
								</BarChart>
							</ResponsiveContainer>
						)}
					</ChartCard>
				</Grid>
			</Grid>
			</TabPanel>

			{/* TAB 1: Landing & Exit Pages */}
			<TabPanel value={tabValue} index={1}>
				{navLoading ? (
					<Box sx={{ width: "100%", py: 4 }}>
						<LinearProgress />
						<Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: "center" }}>
							Cargando datos de navegación...
						</Typography>
					</Box>
				) : (
					<Grid container spacing={3}>
						{/* Info Card */}
						<Grid item xs={12}>
							<Paper
								elevation={0}
								sx={{
									p: 2,
									borderRadius: 2,
									bgcolor: alpha(theme.palette.primary.main, 0.05),
									border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
								}}
							>
								<Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, mb: 1 }}>
									¿Cómo interpretar estos datos?
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={12} md={6}>
										<Typography variant="body2" color="textSecondary">
											<strong>Páginas de Entrada (Landing):</strong> Son las primeras páginas que ven los usuarios al entrar al sitio.
											Un <strong>Bounce Rate bajo (&lt;40%)</strong> indica que los usuarios continúan navegando después de llegar.
											Páginas con alto bounce rate pueden necesitar mejoras en contenido o llamados a la acción.
										</Typography>
									</Grid>
									<Grid item xs={12} md={6}>
										<Typography variant="body2" color="textSecondary">
											<strong>Páginas de Salida (Exit):</strong> Son las últimas páginas antes de abandonar el sitio.
											Un <strong>Exit Rate alto</strong> en páginas de conversión (checkout, registro) puede indicar problemas.
											En páginas finales como "gracias" o confirmación, un exit rate alto es normal.
										</Typography>
									</Grid>
								</Grid>
							</Paper>
						</Grid>

						{/* Landing Pages Table */}
						<Grid item xs={12} md={6}>
							<ChartCard title="Páginas de Entrada (Landing)" icon={<Login size={18} />} height={350}>
								<TableContainer sx={{ maxHeight: 350 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.landingPages.page}>Página</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.landingPages.sessions}>Sesiones</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.landingPages.users}>Usuarios</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.landingPages.bounceRate}>Bounce Rate</DocTableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{navData?.landingPages?.map((page, index) => (
												<TableRow key={index} hover>
													<TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														<Tooltip title={page?.page || ""}>
															<span>{page?.page || "-"}</span>
														</Tooltip>
													</TableCell>
													<TableCell align="right">{(page?.sessions ?? 0).toLocaleString()}</TableCell>
													<TableCell align="right">{(page?.users ?? 0).toLocaleString()}</TableCell>
													<TableCell align="right">
														<Chip
															size="small"
															label={`${((page?.bounceRate ?? 0) * 100).toFixed(1)}%`}
															color={(page?.bounceRate ?? 0) < 0.4 ? "success" : (page?.bounceRate ?? 0) < 0.6 ? "warning" : "error"}
															sx={{ minWidth: 60 }}
														/>
													</TableCell>
												</TableRow>
											))}
											{(!navData?.landingPages || navData.landingPages.length === 0) && (
												<TableRow>
													<TableCell colSpan={4} align="center">
														<Typography variant="body2" color="textSecondary">
															Sin datos disponibles
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</TableContainer>
							</ChartCard>
						</Grid>

						{/* Exit Pages Table */}
						<Grid item xs={12} md={6}>
							<ChartCard title="Páginas de Salida (Exit)" icon={<Logout size={18} />} height={350}>
								<TableContainer sx={{ maxHeight: 350 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.exitPages.page}>Página</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.exitPages.exits}>Salidas</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.exitPages.pageViews}>Vistas</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.exitPages.exitRate}>Exit Rate</DocTableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{navData?.exitPages?.map((page, index) => (
												<TableRow key={index} hover>
													<TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														<Tooltip title={page?.page || ""}>
															<span>{page?.page || "-"}</span>
														</Tooltip>
													</TableCell>
													<TableCell align="right">{(page?.exits ?? 0).toLocaleString()}</TableCell>
													<TableCell align="right">{(page?.pageViews ?? 0).toLocaleString()}</TableCell>
													<TableCell align="right">
														<Chip
															size="small"
															label={`${((page?.exitRate ?? 0) * 100).toFixed(1)}%`}
															color={(page?.exitRate ?? 0) < 0.3 ? "success" : (page?.exitRate ?? 0) < 0.5 ? "warning" : "error"}
															sx={{ minWidth: 60 }}
														/>
													</TableCell>
												</TableRow>
											))}
											{(!navData?.exitPages || navData.exitPages.length === 0) && (
												<TableRow>
													<TableCell colSpan={4} align="center">
														<Typography variant="body2" color="textSecondary">
															Sin datos disponibles
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</TableContainer>
							</ChartCard>
						</Grid>

						{/* Page Engagement */}
						<Grid item xs={12}>
							<ChartCard title="Engagement por Página" icon={<Activity size={18} />} height={300}>
								{navData?.pageEngagement?.length ? (
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={navData.pageEngagement.slice(0, 10)} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
											<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
											<XAxis
												dataKey="page"
												tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
												angle={-45}
												textAnchor="end"
												height={80}
												interval={0}
											/>
											<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
											<RechartsTooltip
												contentStyle={{
													backgroundColor: theme.palette.background.paper,
													border: `1px solid ${theme.palette.divider}`,
													borderRadius: 8,
												}}
											/>
											<Bar dataKey="avgTime" fill={COLORS.primary.main} radius={[4, 4, 0, 0]} name="Tiempo Promedio (seg)" />
											<Bar dataKey="views" fill={COLORS.success.main} radius={[4, 4, 0, 0]} name="Vistas" />
										</BarChart>
									</ResponsiveContainer>
								) : (
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
										<Typography variant="body2" color="textSecondary">
											Sin datos de engagement
										</Typography>
									</Box>
								)}
							</ChartCard>
						</Grid>
					</Grid>
				)}
			</TabPanel>

			{/* TAB 2: Path Analysis */}
			<TabPanel value={tabValue} index={2}>
				{navLoading ? (
					<Box sx={{ width: "100%", py: 4 }}>
						<LinearProgress />
						<Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: "center" }}>
							Cargando datos de navegación...
						</Typography>
					</Box>
				) : (
					<Grid container spacing={3}>
						{/* Info Card */}
						<Grid item xs={12}>
							<Paper
								elevation={0}
								sx={{
									p: 2,
									borderRadius: 2,
									bgcolor: alpha(theme.palette.primary.main, 0.05),
									border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
								}}
							>
								<Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, mb: 1 }}>
									¿Cómo interpretar estos datos?
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={12} md={4}>
										<Typography variant="body2" color="textSecondary">
											<strong>Rutas de Navegación:</strong> Muestran los caminos completos que siguen los usuarios.
											Identifica las rutas más populares hacia conversión y detecta patrones de comportamiento comunes.
										</Typography>
									</Grid>
									<Grid item xs={12} md={4}>
										<Typography variant="body2" color="textSecondary">
											<strong>Flujo entre Páginas:</strong> Muestra las transiciones directas de una página a otra.
											Útil para entender qué contenido lleva a los usuarios a otras secciones del sitio.
										</Typography>
									</Grid>
									<Grid item xs={12} md={4}>
										<Typography variant="body2" color="textSecondary">
											<strong>Top Transiciones:</strong> Las conexiones más frecuentes entre páginas.
											Ayuda a optimizar la arquitectura del sitio y mejorar el flujo de usuario hacia objetivos clave.
										</Typography>
									</Grid>
								</Grid>
							</Paper>
						</Grid>

						{/* Navigation Paths */}
						<Grid item xs={12} md={6}>
							<ChartCard title="Rutas de Navegación más Comunes" icon={<Routing size={18} />} height={400}>
								<TableContainer sx={{ maxHeight: 400 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.navigationPaths.path}>Ruta</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.navigationPaths.sessions}>Sesiones</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.navigationPaths.users}>Usuarios</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.navigationPaths.avgDuration}>Duración Prom.</DocTableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{navData?.navigationPaths?.map((path, index) => (
												<TableRow key={index} hover>
													<TableCell sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														<Tooltip title={path?.path || ""}>
															<span>{path?.path || "-"}</span>
														</Tooltip>
													</TableCell>
													<TableCell align="right">{(path?.sessions ?? 0).toLocaleString()}</TableCell>
													<TableCell align="right">{(path?.users ?? 0).toLocaleString()}</TableCell>
													<TableCell align="right">{formatDuration(path?.avgDuration ?? 0)}</TableCell>
												</TableRow>
											))}
											{(!navData?.navigationPaths || navData.navigationPaths.length === 0) && (
												<TableRow>
													<TableCell colSpan={4} align="center">
														<Typography variant="body2" color="textSecondary">
															Sin datos de rutas
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</TableContainer>
							</ChartCard>
						</Grid>

						{/* Page Flow - Sankey-like visualization */}
						<Grid item xs={12} md={6}>
							<ChartCard title="Flujo entre Páginas" icon={<ArrowRight size={18} />} height={400}>
								<TableContainer sx={{ maxHeight: 400 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.pageFlow.fromPage}>Página Origen</DocTableCell>
												<TableCell align="center">→</TableCell>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.pageFlow.toPage}>Página Destino</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.pageFlow.transitions}>Transiciones</DocTableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{navData?.pageFlow?.map((flow, index) => (
												<TableRow key={index} hover>
													<TableCell sx={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														<Tooltip title={flow?.fromPage || ""}>
															<span>{flow?.fromPage || "-"}</span>
														</Tooltip>
													</TableCell>
													<TableCell align="center">
														<ArrowRight size={16} color={theme.palette.primary.main} />
													</TableCell>
													<TableCell sx={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														<Tooltip title={flow?.toPage || ""}>
															<span>{flow?.toPage || "-"}</span>
														</Tooltip>
													</TableCell>
													<TableCell align="right">
														<Chip
															size="small"
															label={(flow?.transitions ?? 0).toLocaleString()}
															color="primary"
															variant="outlined"
															sx={{ minWidth: 50 }}
														/>
													</TableCell>
												</TableRow>
											))}
											{(!navData?.pageFlow || navData.pageFlow.length === 0) && (
												<TableRow>
													<TableCell colSpan={4} align="center">
														<Typography variant="body2" color="textSecondary">
															Sin datos de flujo
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</TableContainer>
							</ChartCard>
						</Grid>

						{/* Visual Flow Chart */}
						<Grid item xs={12}>
							<ChartCard title="Top Transiciones" icon={<Chart size={18} />} height={300}>
								{navData?.pageFlow?.length ? (
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={navData.pageFlow.slice(0, 10).map((f) => ({
												name: `${(f?.fromPage || "").substring(0, 15)}... → ${(f?.toPage || "").substring(0, 15)}...`,
												transitions: f?.transitions ?? 0,
												fullFrom: f?.fromPage || "",
												fullTo: f?.toPage || "",
											}))}
											layout="vertical"
											margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
										>
											<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
											<XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
											<YAxis type="category" dataKey="name" tick={{ fill: theme.palette.text.secondary, fontSize: 10 }} width={140} />
											<RechartsTooltip
												contentStyle={{
													backgroundColor: theme.palette.background.paper,
													border: `1px solid ${theme.palette.divider}`,
													borderRadius: 8,
												}}
												formatter={(value: number, _name: string, props: any) => [
													`${value.toLocaleString()} transiciones`,
													`${props.payload.fullFrom} → ${props.payload.fullTo}`,
												]}
											/>
											<Bar dataKey="transitions" fill={COLORS.primary.main} radius={[0, 4, 4, 0]} />
										</BarChart>
									</ResponsiveContainer>
								) : (
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
										<Typography variant="body2" color="textSecondary">
											Sin datos de transiciones
										</Typography>
									</Box>
								)}
							</ChartCard>
						</Grid>
					</Grid>
				)}
			</TabPanel>

			{/* TAB 3: Funnel Builder */}
			<TabPanel value={tabValue} index={3}>
				{funnelLoading && !eventsData ? (
					<Box sx={{ width: "100%", py: 4 }}>
						<LinearProgress />
						<Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: "center" }}>
							Cargando eventos disponibles...
						</Typography>
					</Box>
				) : (
					<Grid container spacing={3}>
						{/* Info Card */}
						<Grid item xs={12}>
							<Paper
								elevation={0}
								sx={{
									p: 2,
									borderRadius: 2,
									bgcolor: alpha(theme.palette.primary.main, 0.05),
									border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
								}}
							>
								<Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, mb: 1 }}>
									Constructor de Funnels Personalizado
								</Typography>
								<Typography variant="body2" color="textSecondary">
									Selecciona eventos en orden para crear un funnel y analizar las tasas de conversión entre cada paso.
									Puedes usar un <strong>funnel predefinido</strong> o <strong>crear uno personalizado</strong> seleccionando eventos individuales.
								</Typography>
							</Paper>
						</Grid>

						{/* Funnel Configuration */}
						<Grid item xs={12} md={5}>
							<Paper
								elevation={0}
								sx={{
									p: 2.5,
									borderRadius: 2,
									border: `1px solid ${theme.palette.divider}`,
									height: "100%",
								}}
							>
								<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
									Configurar Funnel
								</Typography>

								{/* Predefined Funnels */}
								<FormControl fullWidth size="small" sx={{ mb: 2 }}>
									<InputLabel>Funnels Predefinidos</InputLabel>
									<Select
										value={selectedPredefinedFunnel}
										label="Funnels Predefinidos"
										onChange={(e) => handleSelectPredefinedFunnel(e.target.value)}
									>
										<MenuItem value="">
											<em>Personalizado</em>
										</MenuItem>
										{PREDEFINED_FUNNELS.map((funnel) => (
											<MenuItem key={funnel.id} value={funnel.id}>
												<Box>
													<Typography variant="body2">{funnel.name}</Typography>
													<Typography variant="caption" color="textSecondary">
														{funnel.description}
													</Typography>
												</Box>
											</MenuItem>
										))}
									</Select>
								</FormControl>

								<Divider sx={{ my: 2 }} />

								{/* Event Selector */}
								<FormControl fullWidth size="small" sx={{ mb: 2 }}>
									<InputLabel>Agregar Evento</InputLabel>
									<Select
										value=""
										label="Agregar Evento"
										onChange={(e) => handleAddEvent(e.target.value)}
									>
										{eventsData?.allEvents
											?.filter((event) => !selectedEvents.includes(event.eventName))
											.map((event) => (
												<MenuItem key={event.eventName} value={event.eventName}>
													<Box sx={{ width: "100%" }}>
														<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
															<Typography variant="body2" fontWeight={500}>{event.eventName}</Typography>
															<Chip size="small" label={event.count.toLocaleString()} sx={{ ml: 1 }} />
														</Box>
														<Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
															{getEventDescription(event.eventName)}
														</Typography>
													</Box>
												</MenuItem>
											))}
									</Select>
								</FormControl>

								{/* Selected Events */}
								<Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
									Pasos del Funnel ({selectedEvents.length})
								</Typography>
								<Stack spacing={1} sx={{ mb: 2 }}>
									{selectedEvents.length === 0 ? (
										<Alert severity="info" sx={{ py: 0.5 }}>
											Selecciona eventos para crear el funnel
										</Alert>
									) : (
										selectedEvents.map((event, index) => (
											<Tooltip key={index} title={getEventDescription(event)} placement="right" arrow>
												<Paper
													elevation={0}
													sx={{
														p: 1.5,
														display: "flex",
														alignItems: "center",
														justifyContent: "space-between",
														bgcolor: alpha(COLORS.funnel[index % COLORS.funnel.length], 0.1),
														border: `1px solid ${alpha(COLORS.funnel[index % COLORS.funnel.length], 0.3)}`,
														borderRadius: 1,
														cursor: "help",
													}}
												>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<Chip
															size="small"
															label={index + 1}
															sx={{
																bgcolor: COLORS.funnel[index % COLORS.funnel.length],
																color: "common.white",
																fontWeight: 600,
																minWidth: 28,
															}}
														/>
														<Box>
															<Typography variant="body2" fontWeight={500}>{event}</Typography>
															<Typography variant="caption" color="textSecondary" sx={{ display: { xs: "none", sm: "block" } }}>
																{getEventDescription(event).substring(0, 40)}...
															</Typography>
														</Box>
													</Box>
													<IconButton size="small" onClick={() => handleRemoveEvent(index)} color="error">
														<Trash size={16} />
													</IconButton>
												</Paper>
											</Tooltip>
										))
									)}
								</Stack>

								{/* Action Buttons */}
								<Stack direction="row" spacing={1}>
									<Button
										variant="contained"
										startIcon={<Play size={18} />}
										onClick={generateFunnel}
										disabled={selectedEvents.length < 2 || funnelLoading}
										fullWidth
									>
										{funnelLoading ? "Generando..." : "Generar Funnel"}
									</Button>
									<Button
										variant="outlined"
										color="error"
										onClick={handleClearFunnel}
										disabled={selectedEvents.length === 0}
									>
										<Trash size={18} />
									</Button>
								</Stack>
							</Paper>
						</Grid>

						{/* Funnel Visualization */}
						<Grid item xs={12} md={7}>
							<Paper
								elevation={0}
								sx={{
									p: 2.5,
									borderRadius: 2,
									border: `1px solid ${theme.palette.divider}`,
									minHeight: 400,
								}}
							>
								<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
									Visualización del Funnel
								</Typography>

								{funnelLoading ? (
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 350 }}>
										<LinearProgress sx={{ width: "50%" }} />
									</Box>
								) : funnelData ? (
									<>
										{/* Summary */}
										<Grid container spacing={2} sx={{ mb: 3 }}>
											<Grid item xs={6} sm={3}>
												<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1, textAlign: "center" }}>
													<Typography variant="caption" color="textSecondary">Usuarios Inicio</Typography>
													<Typography variant="h6" fontWeight={600}>{funnelData.summary.startUsers.toLocaleString()}</Typography>
												</Paper>
											</Grid>
											<Grid item xs={6} sm={3}>
												<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 1, textAlign: "center" }}>
													<Typography variant="caption" color="textSecondary">Usuarios Final</Typography>
													<Typography variant="h6" fontWeight={600} color="success.main">{funnelData.summary.endUsers.toLocaleString()}</Typography>
												</Paper>
											</Grid>
											<Grid item xs={6} sm={3}>
												<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 1, textAlign: "center" }}>
													<Typography variant="caption" color="textSecondary">Conversión Total</Typography>
													<Typography variant="h6" fontWeight={600} color="warning.main">{funnelData.summary.overallConversionRate}%</Typography>
												</Paper>
											</Grid>
											<Grid item xs={6} sm={3}>
												<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.text.secondary, 0.05), borderRadius: 1, textAlign: "center" }}>
													<Typography variant="caption" color="textSecondary">Dropoff Total</Typography>
													<Typography variant="h6" fontWeight={600}>{funnelData.summary.totalDropoff.toLocaleString()}</Typography>
												</Paper>
											</Grid>
										</Grid>

										{/* Funnel Steps */}
										<Stack spacing={1}>
											{funnelData.steps.map((step, index) => {
												const isLast = index === funnelData.steps.length - 1;
												const widthPercent = funnelData.summary.startUsers > 0
													? Math.max(20, (step.users / funnelData.summary.startUsers) * 100)
													: 100;

												return (
													<Box key={index}>
														<Tooltip title={getEventDescription(step.eventName)} placement="left" arrow>
															<Box
																sx={{
																	p: 2,
																	borderRadius: 1,
																	bgcolor: alpha(COLORS.funnel[index % COLORS.funnel.length], 0.15),
																	border: `1px solid ${alpha(COLORS.funnel[index % COLORS.funnel.length], 0.4)}`,
																	width: `${widthPercent}%`,
																	transition: "width 0.5s ease",
																	mx: "auto",
																	cursor: "help",
																}}
															>
																<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
																	<Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
																		<Chip
																			size="small"
																			label={step.step}
																			sx={{
																				bgcolor: COLORS.funnel[index % COLORS.funnel.length],
																				color: "common.white",
																				fontWeight: 600,
																				flexShrink: 0,
																			}}
																		/>
																		<Box sx={{ minWidth: 0 }}>
																			<Typography variant="body2" fontWeight={500}>{step.eventName}</Typography>
																			<Typography variant="caption" color="textSecondary" noWrap>
																				{getEventDescription(step.eventName)}
																			</Typography>
																		</Box>
																	</Box>
																	<Box sx={{ textAlign: "right", flexShrink: 0, ml: 1 }}>
																		<Typography variant="body2" fontWeight={600}>{step.users.toLocaleString()} usuarios</Typography>
																		<Typography variant="caption" color="textSecondary">{step.count.toLocaleString()} eventos</Typography>
																	</Box>
																</Box>
															</Box>
														</Tooltip>
														{!isLast && (
															<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 0.5 }}>
																<ArrowDown size={20} color={theme.palette.text.secondary} />
																<Chip
																	size="small"
																	label={`${step.conversionRate}%`}
																	color={step.conversionRate >= 50 ? "success" : step.conversionRate >= 25 ? "warning" : "error"}
																	sx={{ mt: 0.5 }}
																/>
																{step.dropoff > 0 && (
																	<Typography variant="caption" color="error.main">
																		-{step.dropoff.toLocaleString()} usuarios
																	</Typography>
																)}
															</Box>
														)}
													</Box>
												);
											})}
										</Stack>
									</>
								) : (
									<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 350 }}>
										<Filter size={48} color={theme.palette.text.secondary} />
										<Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
											Selecciona eventos y haz click en "Generar Funnel"
										</Typography>
										<Typography variant="caption" color="textSecondary">
											El funnel mostrará las tasas de conversión entre cada paso
										</Typography>
									</Box>
								)}
							</Paper>
						</Grid>

						{/* Available Events Table */}
						<Grid item xs={12}>
							<ChartCard title="Eventos Disponibles en GA4" icon={<Activity size={18} />} height={350}>
								<TableContainer sx={{ maxHeight: 350 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.funnelEvents.eventName}>Evento</DocTableCell>
												<DocTableCell tooltip={TABLE_COLUMN_DOCS.funnelEvents.description}>Descripción</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.funnelEvents.count}>Conteo</DocTableCell>
												<DocTableCell align="right" tooltip={TABLE_COLUMN_DOCS.funnelEvents.users}>Usuarios</DocTableCell>
												<DocTableCell align="center" tooltip={TABLE_COLUMN_DOCS.funnelEvents.status}>Estado</DocTableCell>
												<TableCell align="center">Acción</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{eventsData?.allEvents?.map((event, index) => (
												<TableRow key={index} hover>
													<TableCell>
														<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 500 }}>
															{event.eventName}
														</Typography>
													</TableCell>
													<TableCell sx={{ maxWidth: 300 }}>
														<Typography variant="caption" color="textSecondary">
															{getEventDescription(event.eventName)}
														</Typography>
													</TableCell>
													<TableCell align="right">{event.count.toLocaleString()}</TableCell>
													<TableCell align="right">{event.users.toLocaleString()}</TableCell>
													<TableCell align="center">
														<Chip
															size="small"
															label={selectedEvents.includes(event.eventName) ? "Seleccionado" : "Disponible"}
															color={selectedEvents.includes(event.eventName) ? "primary" : "default"}
															variant={selectedEvents.includes(event.eventName) ? "filled" : "outlined"}
														/>
													</TableCell>
													<TableCell align="center">
														<Button
															size="small"
															variant="text"
															startIcon={<Add size={14} />}
															onClick={() => handleAddEvent(event.eventName)}
															disabled={selectedEvents.includes(event.eventName)}
														>
															Agregar
														</Button>
													</TableCell>
												</TableRow>
											))}
											{(!eventsData?.allEvents || eventsData.allEvents.length === 0) && (
												<TableRow>
													<TableCell colSpan={6} align="center">
														<Typography variant="body2" color="textSecondary">
															Sin eventos disponibles
														</Typography>
													</TableCell>
												</TableRow>
											)}
										</TableBody>
									</Table>
								</TableContainer>
							</ChartCard>
						</Grid>
					</Grid>
				)}
			</TabPanel>

			{/* TAB 4: Event Explorer */}
			<TabPanel value={tabValue} index={4}>
				{funnelLoading && !eventsData ? (
					<Box sx={{ width: "100%", py: 4 }}>
						<LinearProgress />
						<Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: "center" }}>
							Cargando eventos disponibles...
						</Typography>
					</Box>
				) : (
					<Grid container spacing={3}>
						{/* Info Card */}
						<Grid item xs={12}>
							<Paper
								elevation={0}
								sx={{
									p: 2,
									borderRadius: 2,
									bgcolor: alpha(theme.palette.primary.main, 0.05),
									border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
								}}
							>
								<Typography variant="subtitle2" sx={{ color: theme.palette.primary.main, mb: 1 }}>
									Explorador de Eventos
								</Typography>
								<Typography variant="body2" color="textSecondary">
									Selecciona un evento para ver su <strong>tendencia temporal</strong>, <strong>resumen</strong> y <strong>valores de parámetros</strong> asociados.
									Los parámetros se detectan automáticamente si están configurados como custom dimensions en GA4.
								</Typography>
							</Paper>
						</Grid>

						{/* Event Selector */}
						<Grid item xs={12} md={4}>
							<Paper
								elevation={0}
								sx={{
									p: 2.5,
									borderRadius: 2,
									border: `1px solid ${theme.palette.divider}`,
									height: "100%",
								}}
							>
								<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
									Seleccionar Evento
								</Typography>
								<FormControl fullWidth size="small">
									<InputLabel>Evento a explorar</InputLabel>
									<Select
										value={selectedEventForExplorer}
										label="Evento a explorar"
										onChange={(e) => handleSelectEventForExplorer(e.target.value)}
									>
										<MenuItem value="">
											<em>Seleccionar evento...</em>
										</MenuItem>
										{eventsData?.allEvents?.map((event) => (
											<MenuItem key={event.eventName} value={event.eventName}>
												<Box sx={{ width: "100%" }}>
													<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
														<Typography variant="body2" fontWeight={500}>{event.eventName}</Typography>
														<Chip size="small" label={event.count.toLocaleString()} sx={{ ml: 1 }} />
													</Box>
													<Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>
														{getEventDescription(event.eventName)}
													</Typography>
												</Box>
											</MenuItem>
										))}
									</Select>
								</FormControl>

								{/* Event Summary */}
								{eventDetails && (
									<Box sx={{ mt: 3 }}>
										<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
											Resumen del Evento
										</Typography>
										<Stack spacing={1.5}>
											<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
												<Typography variant="caption" color="textSecondary">Total de Eventos</Typography>
												<Typography variant="h6" fontWeight={600}>{eventDetails.summary.totalCount.toLocaleString()}</Typography>
											</Paper>
											<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 1 }}>
												<Typography variant="caption" color="textSecondary">Usuarios Únicos</Typography>
												<Typography variant="h6" fontWeight={600} color="success.main">{eventDetails.summary.totalUsers.toLocaleString()}</Typography>
											</Paper>
											<Paper elevation={0} sx={{ p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 1 }}>
												<Typography variant="caption" color="textSecondary">Eventos por Sesión</Typography>
												<Typography variant="h6" fontWeight={600} color="warning.main">{eventDetails.summary.eventsPerSession}</Typography>
											</Paper>
										</Stack>

										{/* Detected Parameters */}
										{eventDetails.detectedParameters.length > 0 && (
											<Box sx={{ mt: 3 }}>
												<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
													Parámetros Detectados
												</Typography>
												<Stack spacing={0.5}>
													{eventDetails.detectedParameters.map((param) => (
														<Chip
															key={param.parameterName}
															label={`${param.parameterName} (${param.uniqueValues} valores)`}
															size="small"
															variant="outlined"
															color="primary"
														/>
													))}
												</Stack>
											</Box>
										)}
									</Box>
								)}
							</Paper>
						</Grid>

						{/* Event Details */}
						<Grid item xs={12} md={8}>
							{eventExplorerLoading ? (
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400 }}>
									<LinearProgress sx={{ width: "50%" }} />
								</Box>
							) : eventDetails ? (
								<Stack spacing={3}>
									{/* Trend Chart */}
									<ChartCard title={`Tendencia de "${selectedEventForExplorer}"`} icon={<Chart size={18} />} height={250}>
										{eventDetails.trend.length > 0 ? (
											<ResponsiveContainer width="100%" height="100%">
												<LineChart data={eventDetails.trend.map((item) => ({ ...item, date: formatDate(item.date) }))} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
													<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
													<XAxis dataKey="date" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
													<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
													<RechartsTooltip
														contentStyle={{
															backgroundColor: theme.palette.background.paper,
															border: `1px solid ${theme.palette.divider}`,
															borderRadius: 8,
														}}
													/>
													<Line type="monotone" dataKey="count" stroke={COLORS.primary.main} strokeWidth={2} name="Eventos" dot={false} />
													<Line type="monotone" dataKey="users" stroke={COLORS.success.main} strokeWidth={2} name="Usuarios" dot={false} />
												</LineChart>
											</ResponsiveContainer>
										) : (
											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
												<Typography variant="body2" color="textSecondary">Sin datos de tendencia</Typography>
											</Box>
										)}
									</ChartCard>

									{/* Parameters Tables */}
									{Object.entries(eventDetails.parameters).map(([paramName, values]) => (
										<ChartCard key={paramName} title={`Parámetro: ${paramName}`} icon={<Activity size={18} />} height={250}>
											<Grid container spacing={2} sx={{ height: "100%" }}>
												<Grid item xs={12} md={6}>
													<TableContainer sx={{ maxHeight: 250 }}>
														<Table size="small" stickyHeader>
															<TableHead>
																<TableRow>
																	<TableCell>Valor</TableCell>
																	<TableCell align="right">Eventos</TableCell>
																	<TableCell align="right">Usuarios</TableCell>
																</TableRow>
															</TableHead>
															<TableBody>
																{values.slice(0, 10).map((val, idx) => (
																	<TableRow key={idx} hover>
																		<TableCell sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
																			<Tooltip title={val.value}>
																				<span>{val.value}</span>
																			</Tooltip>
																		</TableCell>
																		<TableCell align="right">{val.count.toLocaleString()}</TableCell>
																		<TableCell align="right">{val.users.toLocaleString()}</TableCell>
																	</TableRow>
																))}
															</TableBody>
														</Table>
													</TableContainer>
												</Grid>
												<Grid item xs={12} md={6}>
													<ResponsiveContainer width="100%" height="100%">
														<BarChart data={values.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
															<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
															<XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 10 }} />
															<YAxis
																type="category"
																dataKey="value"
																tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
																width={55}
																tickFormatter={(val: string) => val.length > 8 ? `${val.substring(0, 8)}...` : val}
															/>
															<RechartsTooltip />
															<Bar dataKey="count" fill={COLORS.primary.main} radius={[0, 4, 4, 0]} name="Eventos" />
														</BarChart>
													</ResponsiveContainer>
												</Grid>
											</Grid>
										</ChartCard>
									))}

									{Object.keys(eventDetails.parameters).length === 0 && (
										<Alert severity="info">
											<strong>No hay datos de parámetros disponibles aún.</strong>
											<br />
											Esto puede ocurrir porque:
											<ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
												<li>El evento es reciente (GA4 Data API tiene latencia de 24-48 horas)</li>
												<li>Los parámetros no están configurados como <strong>Custom Dimensions</strong> en GA4</li>
											</ul>
											<Typography variant="caption" sx={{ display: "block", mt: 1 }}>
												Usa el endpoint <code>/api/ga4/diagnostics/custom-dimensions</code> para verificar la configuración.
											</Typography>
										</Alert>
									)}
								</Stack>
							) : (
								<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400 }}>
									<SearchNormal1 size={48} color={theme.palette.text.secondary} />
									<Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
										Selecciona un evento para explorar sus detalles
									</Typography>
									<Typography variant="caption" color="textSecondary">
										Verás tendencia, resumen y valores de parámetros
									</Typography>
								</Box>
							)}
						</Grid>
					</Grid>
				)}
			</TabPanel>
		</MainCard>
	);
};

export default GA4Dashboard;
