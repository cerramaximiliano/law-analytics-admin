import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	Box,
	Tabs,
	Tab,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	TableSortLabel,
	TextField,
	InputAdornment,
	IconButton,
	Chip,
	Paper,
	Grid,
	Skeleton,
	useTheme,
	alpha,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	Checkbox,
	FormControlLabel,
	Switch,
	Stack,
	CircularProgress,
} from "@mui/material";
import {
	SearchNormal1,
	CloseCircle,
	Folder,
	People,
	Calculator,
	Task,
	Calendar,
	ProfileCircle,
	CloudConnection,
	Activity,
	Login,
	Chart,
	DocumentText,
	Eye,
	Trash,
	Copy,
	Magicpen,
	Refresh,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { BRAND_BLUE } from "themes/dashboardTokens";
import PostalDocumentsAdminService, { PostalDocument, PostalDocumentStats } from "api/postalDocumentsAdmin";
import AdminResourcesService, {
	ResourceType,
	Resource,
	FolderResource,
	ContactResource,
	CalculatorResource,
	TaskResource,
	EventResource,
	MovementResource,
	ResourceUser,
	UserWithResources,
} from "api/adminResources";
import UserSessionsService from "api/userSessions";
import FoldersService from "api/folders";
import { UserSessionMetrics, SessionStats, UserWithSessionMetrics } from "types/user-session";
import AdminAiUsageService, {
	AiUsageRow,
	AiUsageStats,
	AiUsageMonthlyFilters,
	AiUsageLogEntry,
	AiUsageBreakdown,
	AiPlan,
} from "api/adminAiUsage";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

// Tab configuration
interface TabConfig {
	type: ResourceType | "users" | "activity" | "escritos" | "aiUsage";
	label: string;
	icon: React.ReactElement;
}

const tabs: TabConfig[] = [
	{ type: "folder", label: "Carpetas", icon: <Folder size={18} /> },
	{ type: "contact", label: "Contactos", icon: <People size={18} /> },
	{ type: "calculator", label: "Calculadores", icon: <Calculator size={18} /> },
	{ type: "task", label: "Tareas", icon: <Task size={18} /> },
	{ type: "event", label: "Eventos", icon: <Calendar size={18} /> },
	{ type: "movement", label: "Movimientos", icon: <Activity size={18} /> },
	{ type: "users", label: "Usuarios", icon: <ProfileCircle size={18} /> },
	{ type: "activity", label: "Actividad", icon: <Login size={18} /> },
	{ type: "escritos", label: "Escritos", icon: <DocumentText size={18} /> },
	{ type: "aiUsage", label: "Uso IA", icon: <Magicpen size={18} /> },
];

const getCurrentPeriod = (): string => dayjs().format("YYYY-MM");

const formatCostUsd = (n: number | undefined): string => {
	if (n === undefined || n === null) return "-";
	return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(n);
};

const formatNumber = (n: number | undefined): string => {
	if (n === undefined || n === null) return "-";
	return new Intl.NumberFormat("es-AR").format(n);
};

const planChipColor = (plan?: AiPlan): "default" | "success" | "warning" | "info" => {
	if (plan === "premium") return "success";
	if (plan === "standard") return "info";
	if (plan === "free") return "warning";
	return "default";
};

// Column definitions per type
interface ColumnDef {
	id: string;
	label: string;
	sortable: boolean;
	render: (resource: Resource) => React.ReactNode;
}

const getUserDisplay = (userId: ResourceUser | string): string => {
	if (typeof userId === "string") return userId;
	if (!userId) return "-";
	return userId.email || `${userId.firstName || ""} ${userId.lastName || ""}`.trim() || "-";
};

const formatDate = (date: string | undefined): string => {
	if (!date) return "-";
	return dayjs(date).format("DD/MM/YYYY HH:mm");
};

const formatCurrency = (amount: number | undefined): string => {
	if (amount === undefined || amount === null) return "-";
	return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
};

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getColumnsByType = (type: ResourceType, theme: any): ColumnDef[] => {
	const commonColumns: ColumnDef[] = [
		{
			id: "userId",
			label: "Usuario",
			sortable: false,
			render: (r) => getUserDisplay(r.userId),
		},
	];

	const createdAtColumn: ColumnDef = {
		id: "createdAt",
		label: "Creado",
		sortable: true,
		render: (r) => formatDate(r.createdAt),
	};

	switch (type) {
		case "folder":
			return [
				...commonColumns,
				{ id: "folderName", label: "Nombre", sortable: true, render: (r) => (r as FolderResource).folderName || "-" },
				{
					id: "platform",
					label: "Plataforma",
					sortable: false,
					render: (r) => {
						const f = r as FolderResource;
						// Prioridad: pjn > mev > eje > scba > manual. Solo una debería estar activa.
						if (f.pjn) return <Chip label="PJN" size="small" color="primary" />;
						if (f.mev) return <Chip label="MEV" size="small" color="secondary" />;
						if (f.eje) return <Chip label="EJE" size="small" color="info" />;
						if (f.scba) return <Chip label="SCBA" size="small" color="warning" />;
						return <Chip label="Manual" size="small" variant="outlined" />;
					},
				},
				{
					id: "expediente",
					label: "Expediente",
					sortable: false,
					render: (r) => {
						const f = r as FolderResource;
						const num = f.judFolder?.numberJudFolder;
						if (!num) return <Typography variant="caption" color="text.secondary">—</Typography>;
						return (
							<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
								{num}
							</Typography>
						);
					},
				},
				{
					id: "fuero",
					label: "Fuero",
					sortable: true,
					render: (r) => {
						const f = (r as FolderResource).folderFuero;
						return f ? (
							<Typography variant="caption" color="text.secondary">
								{f}
							</Typography>
						) : (
							"-"
						);
					},
				},
				{ id: "materia", label: "Materia", sortable: true, render: (r) => (r as FolderResource).materia || "-" },
				{
					id: "status",
					label: "Estado",
					sortable: true,
					render: (r) => {
						const status = (r as FolderResource).status;
						const colorMap: Record<string, string> = {
							Nueva: theme.palette.info.main,
							"En Proceso": theme.palette.warning.main,
							Cerrada: theme.palette.success.main,
							Pendiente: theme.palette.error.main,
						};
						return status ? (
							<Chip
								label={status}
								size="small"
								sx={{
									bgcolor: alpha(colorMap[status] || theme.palette.grey[500], 0.1),
									color: colorMap[status] || theme.palette.grey[500],
								}}
							/>
						) : (
							"-"
						);
					},
				},
				{
					id: "causaVerified",
					label: "Verificada",
					sortable: true,
					render: (r) =>
						(r as FolderResource).causaVerified ? (
							<Chip label="Sí" size="small" color="success" />
						) : (
							<Chip label="No" size="small" variant="outlined" />
						),
				},
				{
					id: "causaIsValid",
					label: "Válida",
					sortable: true,
					render: (r) => {
						const f = r as FolderResource;
						// Distinguimos 3 estados: true (válida), false (inválida = no encontrada),
						// null/undefined (aún no verificada).
						if (f.causaIsValid === true) return <Chip label="Sí" size="small" color="success" />;
						if (f.causaIsValid === false) return <Chip label="No" size="small" color="error" />;
						return <Chip label="—" size="small" variant="outlined" />;
					},
				},
				{ id: "amount", label: "Monto", sortable: true, render: (r) => formatCurrency((r as FolderResource).amount) },
				createdAtColumn,
			];

		case "contact":
			return [
				...commonColumns,
				{
					id: "name",
					label: "Nombre",
					sortable: true,
					render: (r) => {
						const contact = r as ContactResource;
						return `${contact.name || ""} ${contact.lastName || ""}`.trim() || "-";
					},
				},
				{ id: "email", label: "Email", sortable: true, render: (r) => (r as ContactResource).email || "-" },
				{ id: "phone", label: "Teléfono", sortable: false, render: (r) => (r as ContactResource).phone || "-" },
				{ id: "type", label: "Tipo", sortable: true, render: (r) => (r as ContactResource).type || "-" },
				{ id: "role", label: "Rol", sortable: true, render: (r) => (r as ContactResource).role || "-" },
				createdAtColumn,
			];

		case "calculator":
			return [
				...commonColumns,
				{ id: "amount", label: "Monto", sortable: true, render: (r) => formatCurrency((r as CalculatorResource).amount) },
				{ id: "type", label: "Tipo", sortable: true, render: (r) => (r as CalculatorResource).type || "-" },
				{ id: "classType", label: "Clase", sortable: true, render: (r) => (r as CalculatorResource).classType || "-" },
				{
					id: "isVerified",
					label: "Verificado",
					sortable: true,
					render: (r) =>
						(r as CalculatorResource).isVerified ? (
							<Chip label="Sí" size="small" color="success" />
						) : (
							<Chip label="No" size="small" variant="outlined" />
						),
				},
				{ id: "folderName", label: "Carpeta", sortable: false, render: (r) => (r as CalculatorResource).folderName || "-" },
				createdAtColumn,
			];

		case "task":
			return [
				...commonColumns,
				{ id: "name", label: "Nombre", sortable: true, render: (r) => (r as TaskResource).name || "-" },
				{
					id: "status",
					label: "Estado",
					sortable: true,
					render: (r) => {
						const status = (r as TaskResource).status;
						const colorMap: Record<string, string> = {
							pendiente: theme.palette.warning.main,
							en_progreso: theme.palette.info.main,
							revision: theme.palette.secondary.main,
							completada: theme.palette.success.main,
							cancelada: theme.palette.error.main,
						};
						return status ? (
							<Chip
								label={status.replace("_", " ")}
								size="small"
								sx={{
									bgcolor: alpha(colorMap[status] || theme.palette.grey[500], 0.1),
									color: colorMap[status] || theme.palette.grey[500],
								}}
							/>
						) : (
							"-"
						);
					},
				},
				{
					id: "priority",
					label: "Prioridad",
					sortable: true,
					render: (r) => {
						const priority = (r as TaskResource).priority;
						const colorMap: Record<string, string> = {
							baja: theme.palette.success.main,
							media: theme.palette.warning.main,
							alta: theme.palette.error.main,
						};
						return priority ? (
							<Chip
								label={priority}
								size="small"
								sx={{
									bgcolor: alpha(colorMap[priority] || theme.palette.grey[500], 0.1),
									color: colorMap[priority] || theme.palette.grey[500],
								}}
							/>
						) : (
							"-"
						);
					},
				},
				{ id: "dueDate", label: "Vencimiento", sortable: true, render: (r) => formatDate((r as TaskResource).dueDate) },
				{
					id: "checked",
					label: "Completada",
					sortable: true,
					render: (r) =>
						(r as TaskResource).checked ? (
							<Chip label="Sí" size="small" color="success" />
						) : (
							<Chip label="No" size="small" variant="outlined" />
						),
				},
				createdAtColumn,
			];

		case "event":
			return [
				...commonColumns,
				{ id: "title", label: "Título", sortable: true, render: (r) => (r as EventResource).title || "-" },
				{ id: "type", label: "Tipo", sortable: true, render: (r) => (r as EventResource).type || "-" },
				{ id: "start", label: "Inicio", sortable: true, render: (r) => formatDate((r as EventResource).start) },
				{ id: "end", label: "Fin", sortable: true, render: (r) => formatDate((r as EventResource).end) },
				{
					id: "allDay",
					label: "Todo el día",
					sortable: false,
					render: (r) =>
						(r as EventResource).allDay ? (
							<Chip label="Sí" size="small" color="info" />
						) : (
							<Chip label="No" size="small" variant="outlined" />
						),
				},
				createdAtColumn,
			];

		case "movement":
			return [
				...commonColumns,
				{ id: "title", label: "Título", sortable: true, render: (r) => (r as MovementResource).title || "-" },
				{ id: "movement", label: "Movimiento", sortable: true, render: (r) => (r as MovementResource).movement || "-" },
				{ id: "time", label: "Fecha", sortable: true, render: (r) => formatDate((r as MovementResource).time) },
				{ id: "dateExpiration", label: "Vencimiento", sortable: true, render: (r) => formatDate((r as MovementResource).dateExpiration) },
				{
					id: "completed",
					label: "Completado",
					sortable: true,
					render: (r) =>
						(r as MovementResource).completed ? (
							<Chip label="Sí" size="small" color="success" />
						) : (
							<Chip label="No" size="small" variant="outlined" />
						),
				},
				createdAtColumn,
			];

		default:
			return [...commonColumns, createdAtColumn];
	}
};

// Stat Card Component
interface StatCardProps {
	label: string;
	value: number;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper
			elevation={0}
			sx={{
				p: { xs: 1.5, sm: 2 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				transition: "transform 200ms ease, box-shadow 200ms ease",
				"&:hover": {
					transform: "translateY(-2px)",
					boxShadow: `0 6px 20px ${alpha(color, 0.12)}`,
				},
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
				<Box
					sx={{
						width: { xs: 30, sm: 36 },
						height: { xs: 30, sm: 36 },
						borderRadius: 1.25,
						bgcolor: alpha(color, 0.1),
						color: color,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{icon}
				</Box>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="caption" color="textSecondary" noWrap sx={{ letterSpacing: 0.3, textTransform: "uppercase" }}>
						{label}
					</Typography>
					{loading ? (
						<Skeleton variant="text" width={40} height={28} />
					) : (
						<Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, fontVariantNumeric: "tabular-nums" }}>
							{value.toLocaleString()}
						</Typography>
					)}
				</Box>
			</Box>
		</Paper>
	);
};

const UserResources: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [resources, setResources] = useState<Resource[]>([]);
	const [users, setUsers] = useState<UserWithResources[]>([]);
	const [sessionMetrics, setSessionMetrics] = useState<Record<string, UserSessionMetrics>>({});
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [stats, setStats] = useState({ folders: 0, contacts: 0, calculators: 0, tasks: 0, events: 0, movements: 0, total: 0 });
	const [statsLoading, setStatsLoading] = useState(true);

	// Bulk retry de causa-association para folders
	const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
	const [retryHasPaid, setRetryHasPaid] = useState(false);

	// Notification status por folder (último envío en emaillogs). Lookup batch
	// después de cargar la lista — solo aplica al tab Carpetas.
	type FolderNotifStatus = {
		count: number;
		last: {
			sentAt: string;
			status: "sent" | "failed" | "bounced" | "complained" | "delivered";
			subject: string | null;
			templateName: string | null;
			templateCategory: string | null;
			source: string | null;
			sesMessageId: string | null;
			errorMessage: string | null;
			eventType: string | null;
		} | null;
	};
	const [folderNotifStatus, setFolderNotifStatus] = useState<Record<string, FolderNotifStatus>>({});
	const [folderNotifLoading, setFolderNotifLoading] = useState(false);
	const [retryDialogOpen, setRetryDialogOpen] = useState(false);
	const [retryLoading, setRetryLoading] = useState(false);

	// Activity tab states
	const [activityStats, setActivityStats] = useState<SessionStats | null>(null);
	const [activityUsers, setActivityUsers] = useState<UserWithSessionMetrics[]>([]);
	const [activityLoading, setActivityLoading] = useState(true);

	// JSON viewer modal state
	const [jsonViewOpen, setJsonViewOpen] = useState(false);
	const [jsonViewResource, setJsonViewResource] = useState<Resource | null>(null);

	// Escritos tab states
	const [escritos, setEscritos] = useState<PostalDocument[]>([]);
	const [escritosTotal, setEscritosTotal] = useState(0);
	const [escritosLoading, setEscritosLoading] = useState(false);
	const [escritosStats, setEscritosStats] = useState<PostalDocumentStats | null>(null);
	const [escritosFilterStatus, setEscritosFilterStatus] = useState("");
	const [escritosDetailOpen, setEscritosDetailOpen] = useState(false);
	const [escritosDetailDoc, setEscritosDetailDoc] = useState<PostalDocument | null>(null);

	// AI Usage tab states
	const [aiUsage, setAiUsage] = useState<AiUsageRow[]>([]);
	const [aiUsageStats, setAiUsageStats] = useState<AiUsageStats | null>(null);
	const [aiUsageLoading, setAiUsageLoading] = useState(false);
	const [aiPeriod, setAiPeriod] = useState<string>(getCurrentPeriod());
	const [aiPlanFilter, setAiPlanFilter] = useState<"" | AiPlan>("");
	const [aiPeriods, setAiPeriods] = useState<string[]>([]);
	const [aiDetailOpen, setAiDetailOpen] = useState(false);
	const [aiDetailRow, setAiDetailRow] = useState<AiUsageRow | null>(null);
	const [aiDetailLogs, setAiDetailLogs] = useState<AiUsageLogEntry[]>([]);
	const [aiDetailBreakdown, setAiDetailBreakdown] = useState<AiUsageBreakdown | null>(null);
	const [aiDetailLoading, setAiDetailLoading] = useState(false);
	const [aiResetOpen, setAiResetOpen] = useState(false);
	const [aiResetRow, setAiResetRow] = useState<AiUsageRow | null>(null);
	const [aiResetting, setAiResetting] = useState(false);

	const currentType = tabs[activeTab].type;
	const isUsersTab = currentType === "users";
	const isActivityTab = currentType === "activity";
	const isEscritosTab = currentType === "escritos";
	const isAiUsageTab = currentType === "aiUsage";
	const isFolderTab = currentType === "folder";

	/**
	 * Una carpeta es elegible para "Reintentar verificación" cuando:
	 * - Tiene al menos una plataforma activa (no es manual: pjn|mev|eje|scba).
	 * - NO está ya verificada (causaVerified !== true).
	 * Las verificadas no se pueden re-verificar; las manuales no tienen worker
	 * que las procese.
	 */
	const isFolderRetryEligible = (resource: Resource): boolean => {
		const f = resource as FolderResource;
		const hasPlatform = !!(f.pjn || f.mev || f.eje || f.scba);
		const alreadyVerified = f.causaVerified === true;
		return hasPlatform && !alreadyVerified;
	};

	const folderRetryIneligibleReason = (resource: Resource): string => {
		const f = resource as FolderResource;
		if (f.causaVerified === true) return "Ya está verificada — no se puede re-verificar.";
		const hasPlatform = !!(f.pjn || f.mev || f.eje || f.scba);
		if (!hasPlatform) return "Es una carpeta manual — no hay worker que la verifique.";
		return "";
	};

	// Handlers para bulk retry de carpetas
	const toggleFolderSelected = (id: string) => {
		setSelectedFolderIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAllFoldersInPage = () => {
		setSelectedFolderIds((prev) => {
			// Solo operamos sobre las elegibles de la página actual
			const eligibleIdsInPage = resources.filter(isFolderRetryEligible).map((r) => r._id);
			const allSelected = eligibleIdsInPage.length > 0 && eligibleIdsInPage.every((id) => prev.has(id));
			const next = new Set(prev);
			if (allSelected) eligibleIdsInPage.forEach((id) => next.delete(id));
			else eligibleIdsInPage.forEach((id) => next.add(id));
			return next;
		});
	};

	// Reset de selección al cambiar de tab/página/búsqueda
	useEffect(() => {
		setSelectedFolderIds(new Set());
	}, [currentType, page, rowsPerPage, search]);

	// Lookup batch de notificaciones cuando cambian los folders visibles
	useEffect(() => {
		if (!isFolderTab || resources.length === 0) {
			setFolderNotifStatus({});
			return;
		}
		let cancelled = false;
		const ids = resources.map((r) => r._id);
		(async () => {
			try {
				setFolderNotifLoading(true);
				const res = await FoldersService.getEmailLogsBatch(ids);
				if (!cancelled) setFolderNotifStatus(res.data);
			} catch (err: any) {
				if (!cancelled) console.error("Error cargando notif status:", err);
			} finally {
				if (!cancelled) setFolderNotifLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isFolderTab, resources]);

	const handleRetryAssociation = async () => {
		// Safety net — filtrar contra los flags actuales por si el state quedó stale
		// con folders que entre tanto pasaron a verified=true. La UI ya deshabilita
		// los checkboxes de no-elegibles, este filtro es defensa en profundidad.
		const eligibleSelectedIds = Array.from(selectedFolderIds).filter((id) => {
			const r = resources.find((res) => res._id === id);
			return r ? isFolderRetryEligible(r) : true; // si no está en la página actual, dejar pasar y que el backend decida
		});

		if (eligibleSelectedIds.length === 0) {
			enqueueSnackbar("Las carpetas seleccionadas ya están verificadas o son manuales — nada que reintentar.", {
				variant: "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setRetryDialogOpen(false);
			setSelectedFolderIds(new Set());
			return;
		}

		try {
			setRetryLoading(true);
			const response = await FoldersService.retryCausaAssociation(eligibleSelectedIds, retryHasPaid);
			const { summary } = response.data;
			const msg =
				`Reintentadas ${summary.totalRequested} carpeta(s): ` +
				`${summary.queued} en cola, ${summary.skipped} salteadas, ${summary.failed} fallidas` +
				(summary.notFound ? `, ${summary.notFound} no encontradas` : "");
			enqueueSnackbar(msg, {
				variant: summary.queued > 0 ? "success" : summary.failed > 0 ? "error" : "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setRetryDialogOpen(false);
			setSelectedFolderIds(new Set());
			// Refresh resources para mostrar el nuevo causaAssociationStatus
			fetchResources();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || err?.message || "Error al reintentar asociación", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setRetryLoading(false);
		}
	};
	const baseColumns = isUsersTab || isActivityTab || isEscritosTab || isAiUsageTab ? [] : getColumnsByType(currentType as ResourceType, theme);

	// Columna extra "Notif." solo para folders — chip mínimo del último envío.
	// Se inserta antes de "Monto" / "createdAt" (= antes de las dos últimas).
	const columns = useMemo(() => {
		if (!isFolderTab) return baseColumns;
		const notifColumn: ColumnDef = {
			id: "notif",
			label: "Notif.",
			sortable: false,
			render: (r) => {
				const ns = folderNotifStatus[r._id];
				if (!ns || ns.count === 0) {
					if (folderNotifLoading) return <Skeleton variant="rounded" width={56} height={20} />;
					return (
						<Tooltip title="Sin notificaciones registradas para esta carpeta">
							<Chip label="—" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
						</Tooltip>
					);
				}
				const last = ns.last!;
				const sentAt = last.sentAt ? new Date(last.sentAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
				const tooltip = (
					<Box>
						<Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
							{last.subject || last.templateName || "(sin subject)"}
						</Typography>
						<Typography variant="caption" sx={{ display: "block", opacity: 0.85 }}>
							Estado: {last.status}
						</Typography>
						<Typography variant="caption" sx={{ display: "block", opacity: 0.85 }}>
							Enviado: {sentAt}
						</Typography>
						{last.source && (
							<Typography variant="caption" sx={{ display: "block", opacity: 0.7 }}>
								Origen: {last.source}
							</Typography>
						)}
						{ns.count > 1 && (
							<Typography variant="caption" sx={{ display: "block", opacity: 0.7, mt: 0.5 }}>
								Total envíos: {ns.count}
							</Typography>
						)}
						{last.errorMessage && (
							<Typography variant="caption" sx={{ display: "block", color: "error.light", mt: 0.5 }}>
								{last.errorMessage}
							</Typography>
						)}
					</Box>
				);
				let color: "success" | "error" | "warning" | "info" | "default" = "default";
				let label: string = last.status;
				switch (last.status) {
					case "sent":
					case "delivered":
						color = "success";
						label = last.status === "delivered" ? "✉️ entregado" : "✉️ enviado";
						break;
					case "failed":
						color = "error";
						label = "✉️ falló";
						break;
					case "bounced":
						color = "warning";
						label = "✉️ bounced";
						break;
					case "complained":
						color = "warning";
						label = "✉️ complaint";
						break;
				}
				const chip = (
					<Chip
						label={label + (ns.count > 1 ? ` (${ns.count})` : "")}
						size="small"
						color={color}
						variant="outlined"
						sx={{ height: 20, fontSize: "0.7rem" }}
					/>
				);
				return <Tooltip title={tooltip}>{chip}</Tooltip>;
			},
		};
		// Insertar antes de "amount" si existe, sino antes de "createdAt".
		const idx = baseColumns.findIndex((c) => c.id === "amount");
		const insertAt = idx >= 0 ? idx : baseColumns.length - 1;
		return [...baseColumns.slice(0, insertAt), notifColumn, ...baseColumns.slice(insertAt)];
	}, [baseColumns, isFolderTab, folderNotifStatus, folderNotifLoading]);

	// Fetch stats
	const fetchStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const response = await AdminResourcesService.getResourcesStats();
			if (response.success) {
				setStats(response.data);
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		} finally {
			setStatsLoading(false);
		}
	}, []);

	// Fetch resources
	const fetchResources = useCallback(async () => {
		if (isUsersTab) return;
		setLoading(true);
		try {
			const response = await AdminResourcesService.getResources({
				type: currentType as ResourceType,
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				sortBy,
				sortOrder,
			});
			if (response.success) {
				setResources(response.data);
				setTotal(response.pagination.total);
			}
		} catch (error) {
			console.error("Error fetching resources:", error);
		} finally {
			setLoading(false);
		}
	}, [currentType, page, rowsPerPage, search, sortBy, sortOrder, isUsersTab]);

	// Fetch users with resources
	const fetchUsers = useCallback(async () => {
		if (!isUsersTab) return;
		setLoading(true);
		try {
			const response = await AdminResourcesService.getUsersSummary({
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				sortBy,
				sortOrder,
			});
			if (response.success) {
				setUsers(response.data);
				setTotal(response.pagination.total);

				// Fetch session metrics for these users
				if (response.data.length > 0) {
					const userIds = response.data.map((u) => u._id).join(",");
					try {
						const metricsResponse = await UserSessionsService.getUsersSessionMetrics({ userIds, days: 30 });
						if (metricsResponse.success) {
							setSessionMetrics(metricsResponse.data);
						}
					} catch (metricsError) {
						console.error("Error fetching session metrics:", metricsError);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching users:", error);
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, search, sortBy, sortOrder, isUsersTab]);

	// Fetch activity data
	const fetchActivityData = useCallback(async () => {
		if (!isActivityTab) return;
		setActivityLoading(true);
		try {
			const [statsResponse, usersResponse] = await Promise.all([
				UserSessionsService.getSessionStats(30),
				UserSessionsService.getUsersWithSessionMetrics({
					page: page + 1,
					limit: rowsPerPage,
					search: search || undefined,
					sortBy: sortBy as "lastLogin" | "activeDays" | "totalLogins" | "email" | "createdAt",
					sortOrder,
					days: 30,
				}),
			]);

			if (statsResponse.success) {
				setActivityStats(statsResponse.data);
			}
			if (usersResponse.success) {
				setActivityUsers(usersResponse.data);
				setTotal(usersResponse.pagination.total);
			}
		} catch (error) {
			console.error("Error fetching activity data:", error);
		} finally {
			setActivityLoading(false);
		}
	}, [isActivityTab, page, rowsPerPage, search, sortBy, sortOrder]);

	// Fetch escritos data
	const fetchEscritos = useCallback(async () => {
		if (!isEscritosTab) return;
		setEscritosLoading(true);
		try {
			const [listRes, statsRes] = await Promise.all([
				PostalDocumentsAdminService.getAll({
					page: page + 1,
					limit: rowsPerPage,
					search: search || undefined,
					status: escritosFilterStatus || undefined,
				}),
				escritosStats === null ? PostalDocumentsAdminService.getStats() : Promise.resolve(null),
			]);
			setEscritos(listRes.data);
			setEscritosTotal(listRes.count);
			if (statsRes) setEscritosStats(statsRes.data);
		} catch (error) {
			console.error("Error fetching escritos:", error);
		} finally {
			setEscritosLoading(false);
		}
	}, [isEscritosTab, page, rowsPerPage, search, escritosFilterStatus, escritosStats]);

	// Fetch AI usage rows
	const fetchAiUsage = useCallback(async () => {
		if (!isAiUsageTab) return;
		setAiUsageLoading(true);
		try {
			const allowedSorts = ["count", "tokensTotal", "costUsd", "lastUsedAt", "email", "plan"];
			const params: AiUsageMonthlyFilters = {
				period: aiPeriod,
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				sortBy: (allowedSorts.includes(sortBy) ? sortBy : "count") as AiUsageMonthlyFilters["sortBy"],
				sortOrder,
			};
			if (aiPlanFilter) params.plan = aiPlanFilter;
			const response = await AdminAiUsageService.getMonthly(params);
			if (response.success) {
				setAiUsage(response.data);
				setAiUsageStats(response.stats);
				setTotal(response.pagination.total);
			}
		} catch (error) {
			console.error("Error fetching AI usage:", error);
		} finally {
			setAiUsageLoading(false);
		}
	}, [isAiUsageTab, aiPeriod, aiPlanFilter, page, rowsPerPage, search, sortBy, sortOrder]);

	const fetchAiPeriods = useCallback(async () => {
		try {
			const response = await AdminAiUsageService.getPeriods();
			if (response.success) {
				const periods = response.data.length > 0 ? response.data : [getCurrentPeriod()];
				setAiPeriods(periods);
			}
		} catch (error) {
			console.error("Error fetching AI usage periods:", error);
		}
	}, []);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		if (isUsersTab) {
			fetchUsers();
		} else if (isActivityTab) {
			fetchActivityData();
		} else if (isEscritosTab) {
			fetchEscritos();
		} else if (isAiUsageTab) {
			fetchAiUsage();
		} else {
			fetchResources();
		}
	}, [fetchResources, fetchUsers, fetchActivityData, fetchEscritos, fetchAiUsage, isUsersTab, isActivityTab, isEscritosTab, isAiUsageTab]);

	useEffect(() => {
		if (isAiUsageTab) fetchAiPeriods();
	}, [isAiUsageTab, fetchAiPeriods]);

	// Handlers
	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
		setPage(0);
		setSearch("");
		setSearchInput("");
		const newType = tabs[newValue].type;
		setSortBy(newType === "aiUsage" ? "count" : "createdAt");
		setSortOrder("desc");
	};

	const handleOpenAiDetail = async (row: AiUsageRow) => {
		setAiDetailRow(row);
		setAiDetailOpen(true);
		setAiDetailLogs([]);
		setAiDetailBreakdown(null);
		setAiDetailLoading(true);
		try {
			const res = await AdminAiUsageService.getDetail(row.userId, row.period, 1, 100);
			if (res.success) {
				setAiDetailLogs(res.data);
				setAiDetailBreakdown(res.breakdown);
			}
		} catch (error) {
			console.error("Error fetching AI usage detail:", error);
			enqueueSnackbar("No se pudo obtener el detalle de uso", { variant: "error" });
		} finally {
			setAiDetailLoading(false);
		}
	};

	const handleConfirmAiReset = async () => {
		if (!aiResetRow) return;
		setAiResetting(true);
		try {
			const res = await AdminAiUsageService.reset(aiResetRow.userId, aiResetRow.period);
			if (res.success) {
				enqueueSnackbar(res.message || "Contador reseteado", { variant: "success" });
				setAiResetOpen(false);
				setAiResetRow(null);
				fetchAiUsage();
			}
		} catch (error) {
			console.error("Error resetting AI usage:", error);
			enqueueSnackbar("Error al resetear el contador", { variant: "error" });
		} finally {
			setAiResetting(false);
		}
	};

	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleSort = (columnId: string) => {
		const isAsc = sortBy === columnId && sortOrder === "asc";
		setSortOrder(isAsc ? "desc" : "asc");
		setSortBy(columnId);
	};

	const handleSearch = () => {
		setSearch(searchInput);
		setPage(0);
	};

	const handleClearSearch = () => {
		setSearchInput("");
		setSearch("");
		setPage(0);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	return (
		<MainCard title="Recursos de usuarios" content={false}>
			{/* Stats Cards */}
			<Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: "divider" }}>
				<Grid container spacing={{ xs: 1, sm: 2 }}>
					<Grid item xs={6} sm={4} md>
						<StatCard label="Carpetas" value={stats.folders} icon={<Folder size={20} />} color={BRAND_BLUE} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md>
						<StatCard
							label="Contactos"
							value={stats.contacts}
							icon={<People size={20} />}
							color={theme.palette.info.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md>
						<StatCard
							label="Calculadores"
							value={stats.calculators}
							icon={<Calculator size={20} />}
							color={theme.palette.success.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md>
						<StatCard
							label="Tareas"
							value={stats.tasks}
							icon={<Task size={20} />}
							color={theme.palette.warning.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md>
						<StatCard
							label="Eventos"
							value={stats.events}
							icon={<Calendar size={20} />}
							color={theme.palette.secondary.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md>
						<StatCard
							label="Movimientos"
							value={stats.movements}
							icon={<Activity size={20} />}
							color={theme.palette.error.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md>
						<StatCard
							label="Total"
							value={stats.total}
							icon={<Folder size={20} />}
							color={theme.palette.text.primary}
							loading={statsLoading}
						/>
					</Grid>
				</Grid>
			</Box>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={activeTab}
					onChange={handleTabChange}
					aria-label="resource tabs"
					variant="scrollable"
					scrollButtons="auto"
					allowScrollButtonsMobile
					TabIndicatorProps={{ sx: { height: 2.5, backgroundColor: BRAND_BLUE } }}
					sx={{
						"& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.875rem" },
						"& .Mui-selected": { fontWeight: 600, color: BRAND_BLUE + " !important" },
					}}
				>
					{tabs.map((tab, index) => (
						<Tab
							key={tab.type}
							icon={tab.icon}
							iconPosition="start"
							label={tab.label}
							id={`resource-tab-${index}`}
							sx={{ minHeight: { xs: 48, sm: 64 }, px: { xs: 1.5, sm: 2 } }}
						/>
					))}
				</Tabs>
			</Box>

			{/* Search */}
			<Box sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", gap: 2 }}>
				<TextField
					size="small"
					placeholder="Buscar..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					onKeyPress={handleKeyPress}
					fullWidth
					sx={{ maxWidth: { xs: "100%", sm: 300 } }}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchNormal1 size={18} />
							</InputAdornment>
						),
						endAdornment: searchInput && (
							<InputAdornment position="end">
								<IconButton size="small" onClick={handleClearSearch}>
									<CloseCircle size={16} />
								</IconButton>
							</InputAdornment>
						),
					}}
				/>
			</Box>

			{/* Activity Tab Content */}
			{isActivityTab ? (
				<>
					{/* Activity Stats Cards */}
					<Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: "divider" }}>
						<Grid container spacing={{ xs: 1, sm: 2 }}>
							<Grid item xs={6} sm={3}>
								<Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
										<Box
											sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}
										>
											<Login size={20} />
										</Box>
										<Box>
											<Typography variant="body2" color="textSecondary">
												Logins exitosos
											</Typography>
											{activityLoading ? (
												<Skeleton variant="text" width={40} height={28} />
											) : (
												<Typography variant="h5" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
													{activityStats?.summary.successfulLogins.toLocaleString() || 0}
												</Typography>
											)}
										</Box>
									</Box>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
										<Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }}>
											<ProfileCircle size={20} />
										</Box>
										<Box>
											<Typography variant="body2" color="textSecondary">
												Usuarios activos
											</Typography>
											{activityLoading ? (
												<Skeleton variant="text" width={40} height={28} />
											) : (
												<Typography variant="h5" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
													{activityStats?.summary.uniqueUsers.toLocaleString() || 0}
												</Typography>
											)}
										</Box>
									</Box>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
										<Box
											sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }}
										>
											<Chart size={20} />
										</Box>
										<Box>
											<Typography variant="body2" color="textSecondary">
												Por Google
											</Typography>
											{activityLoading ? (
												<Skeleton variant="text" width={40} height={28} />
											) : (
												<Typography variant="h5" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
													{activityStats?.byLoginMethod?.google?.toLocaleString() || 0}
												</Typography>
											)}
										</Box>
									</Box>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
										<Box
											sx={{
												p: 1,
												borderRadius: 1.5,
												bgcolor: alpha(theme.palette.secondary.main, 0.1),
												color: theme.palette.secondary.main,
											}}
										>
											<Calculator size={20} />
										</Box>
										<Box>
											<Typography variant="body2" color="textSecondary">
												Por password
											</Typography>
											{activityLoading ? (
												<Skeleton variant="text" width={40} height={28} />
											) : (
												<Typography variant="h5" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
													{activityStats?.byLoginMethod?.password?.toLocaleString() || 0}
												</Typography>
											)}
										</Box>
									</Box>
								</Paper>
							</Grid>
						</Grid>
					</Box>

					{/* Activity Users Table */}
					<TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }}>
						<Table size="small" sx={{ minWidth: { xs: 600, md: "100%" } }}>
							<TableHead>
								<TableRow>
									<TableCell>
										<TableSortLabel
											active={sortBy === "email"}
											direction={sortBy === "email" ? sortOrder : "asc"}
											onClick={() => handleSort("email")}
										>
											Usuario
										</TableSortLabel>
									</TableCell>
									<TableCell>
										<TableSortLabel
											active={sortBy === "lastLogin"}
											direction={sortBy === "lastLogin" ? sortOrder : "asc"}
											onClick={() => handleSort("lastLogin")}
										>
											Último Login
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "totalLogins"}
											direction={sortBy === "totalLogins" ? sortOrder : "asc"}
											onClick={() => handleSort("totalLogins")}
										>
											Total Logins
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "activeDays"}
											direction={sortBy === "activeDays" ? sortOrder : "asc"}
											onClick={() => handleSort("activeDays")}
										>
											Días Activos
										</TableSortLabel>
									</TableCell>
									<TableCell>
										<TableSortLabel
											active={sortBy === "createdAt"}
											direction={sortBy === "createdAt" ? sortOrder : "asc"}
											onClick={() => handleSort("createdAt")}
										>
											Registrado
										</TableSortLabel>
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{activityLoading ? (
									Array.from({ length: rowsPerPage }).map((_, index) => (
										<TableRow key={index}>
											{Array.from({ length: 5 }).map((_, i) => (
												<TableCell key={i}>
													<Skeleton variant="text" />
												</TableCell>
											))}
										</TableRow>
									))
								) : activityUsers.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} align="center">
											<Typography color="textSecondary" sx={{ py: 4 }}>
												No se encontraron usuarios con actividad
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									activityUsers.map((user) => (
										<TableRow key={user._id} hover>
											<TableCell>
												<Box>
													<Typography variant="body2" fontWeight="medium">
														{user.email}
													</Typography>
													{user.name && (
														<Typography variant="caption" color="textSecondary">
															{user.name}
														</Typography>
													)}
												</Box>
											</TableCell>
											<TableCell>
												{user.lastLogin ? (
													<Box>
														<Typography variant="body2">{dayjs(user.lastLogin).fromNow()}</Typography>
														<Typography variant="caption" color="textSecondary">
															{dayjs(user.lastLogin).format("DD/MM/YY HH:mm")}
														</Typography>
													</Box>
												) : (
													<Typography variant="body2" color="textSecondary">
														-
													</Typography>
												)}
											</TableCell>
											<TableCell align="center">
												<Chip
													label={user.totalLogins}
													size="small"
													color={user.totalLogins >= 30 ? "success" : user.totalLogins >= 10 ? "warning" : "default"}
													sx={{ minWidth: 40 }}
												/>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={user.activeDays}
													size="small"
													color={user.activeDays >= 20 ? "success" : user.activeDays >= 10 ? "warning" : "default"}
													sx={{ minWidth: 40 }}
												/>
											</TableCell>
											<TableCell>{formatDate(user.createdAt)}</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</>
			) : isEscritosTab ? (
				<>
					{/* Escritos Stats */}
					{escritosStats && (
						<Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: "divider" }}>
							<Grid container spacing={{ xs: 1, sm: 2 }}>
								{[
									{ label: "Total", value: escritosStats.totals.total, color: theme.palette.primary.main },
									{ label: "Generados", value: escritosStats.totals.generated, color: theme.palette.success.main },
									{ label: "Borradores", value: escritosStats.totals.draft, color: theme.palette.warning.main },
									{ label: "Enviados", value: escritosStats.totals.sent, color: theme.palette.info.main },
									{ label: "Archivados", value: escritosStats.totals.archived, color: theme.palette.text.secondary },
									{ label: "Hoy", value: escritosStats.totals.createdToday, color: theme.palette.secondary.main },
								].map((s) => (
									<Grid item xs={6} sm={4} md={2} key={s.label}>
										<Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
											<Typography variant="caption" color="textSecondary" display="block">
												{s.label}
											</Typography>
											<Typography variant="h6" fontWeight="bold" sx={{ color: s.color }}>
												{s.value.toLocaleString()}
											</Typography>
										</Paper>
									</Grid>
								))}
							</Grid>
						</Box>
					)}

					{/* Escritos Filters */}
					<Box sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", gap: 2, flexWrap: "wrap", borderBottom: 1, borderColor: "divider" }}>
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel>Estado</InputLabel>
							<Select
								label="Estado"
								value={escritosFilterStatus}
								onChange={(e) => {
									setEscritosFilterStatus(e.target.value);
									setPage(0);
								}}
							>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="draft">Borrador</MenuItem>
								<MenuItem value="generated">Generado</MenuItem>
								<MenuItem value="sent">Enviado</MenuItem>
								<MenuItem value="archived">Archivado</MenuItem>
							</Select>
						</FormControl>
					</Box>

					{/* Escritos Table */}
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ minWidth: { xs: 700, md: "100%" } }}>
							<TableHead>
								<TableRow>
									<TableCell>Usuario</TableCell>
									<TableCell>Título</TableCell>
									<TableCell>Template</TableCell>
									<TableCell>Categoría</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell>Creado</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{escritosLoading ? (
									Array.from({ length: rowsPerPage }).map((_, i) => (
										<TableRow key={i}>
											{Array.from({ length: 7 }).map((_, j) => (
												<TableCell key={j}>
													<Skeleton variant="text" />
												</TableCell>
											))}
										</TableRow>
									))
								) : escritos.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} align="center">
											<Typography color="textSecondary" sx={{ py: 4 }}>
												No se encontraron escritos
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									escritos.map((doc) => {
										const STATUS_CONFIG: Record<string, { color: "default" | "warning" | "success" | "info" | "error"; label: string }> = {
											draft: { color: "warning", label: "Borrador" },
											generated: { color: "success", label: "Generado" },
											sent: { color: "info", label: "Enviado" },
											archived: { color: "default", label: "Archivado" },
										};
										const statusCfg = STATUS_CONFIG[doc.status] || { color: "default", label: doc.status };
										const userDisplay =
											typeof doc.userId === "object" && doc.userId ? doc.userId.email || doc.userId.name || "-" : String(doc.userId || "-");
										return (
											<TableRow key={doc._id} hover>
												<TableCell>
													<Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
														{userDisplay}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
														{doc.title}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
														{doc.templateName}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" color="textSecondary">
														{doc.templateCategory || "-"}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip label={statusCfg.label} color={statusCfg.color} size="small" />
												</TableCell>
												<TableCell>{formatDate(doc.createdAt)}</TableCell>
												<TableCell align="center">
													<Tooltip title="Ver detalle">
														<IconButton
															size="small"
															onClick={() => {
																setEscritosDetailDoc(doc);
																setEscritosDetailOpen(true);
															}}
														>
															<Eye size={16} />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</TableContainer>

					{/* Detail Dialog */}
					<Dialog open={escritosDetailOpen} onClose={() => setEscritosDetailOpen(false)} maxWidth="sm" fullWidth>
						<DialogTitle>Detalle del Escrito</DialogTitle>
						<DialogContent dividers>
							{escritosDetailDoc && (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
									{[
										{ label: "ID", value: escritosDetailDoc._id },
										{
											label: "Usuario",
											value:
												typeof escritosDetailDoc.userId === "object" && escritosDetailDoc.userId
													? escritosDetailDoc.userId.email || escritosDetailDoc.userId.name
													: String(escritosDetailDoc.userId),
										},
										{ label: "Título", value: escritosDetailDoc.title },
										{ label: "Descripción", value: escritosDetailDoc.description || "-" },
										{ label: "Template", value: escritosDetailDoc.templateName },
										{ label: "Slug", value: escritosDetailDoc.templateSlug },
										{ label: "Categoría", value: escritosDetailDoc.templateCategory || "-" },
										{ label: "Estado", value: escritosDetailDoc.status },
										{ label: "S3 Key", value: escritosDetailDoc.s3Key || "-" },
										{ label: "Generado", value: escritosDetailDoc.generatedAt ? formatDate(escritosDetailDoc.generatedAt) : "-" },
										{ label: "Enviado", value: escritosDetailDoc.sentAt ? formatDate(escritosDetailDoc.sentAt) : "-" },
										{ label: "Vía", value: escritosDetailDoc.sentVia || "-" },
										{ label: "Creado", value: formatDate(escritosDetailDoc.createdAt) },
									].map(({ label, value }) => (
										<Box key={label} sx={{ display: "flex", gap: 1 }}>
											<Typography variant="body2" color="textSecondary" sx={{ minWidth: 100 }}>
												{label}:
											</Typography>
											<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
												{value}
											</Typography>
										</Box>
									))}
									{escritosDetailDoc.s3Key && (
										<Button
											size="small"
											variant="outlined"
											startIcon={<Eye size={14} />}
											onClick={async () => {
												try {
													const res = await PostalDocumentsAdminService.getPresignedUrl(escritosDetailDoc._id);
													window.open(res.data.presignedUrl, "_blank");
												} catch {
													enqueueSnackbar("No se pudo obtener la URL del PDF", { variant: "error" });
												}
											}}
										>
											Abrir PDF
										</Button>
									)}
								</Box>
							)}
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setEscritosDetailOpen(false)}>Cerrar</Button>
						</DialogActions>
					</Dialog>
				</>
			) : isAiUsageTab ? (
				<>
					{/* AI Usage Stats */}
					{aiUsageStats && (
						<Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: "divider" }}>
							<Grid container spacing={{ xs: 1, sm: 2 }}>
								{[
									{ label: "Período", value: aiUsageStats.period, color: theme.palette.text.primary },
									{ label: "Usuarios con uso", value: formatNumber(aiUsageStats.usersWithUsage), color: theme.palette.primary.main },
									{ label: "Consultas IA", value: formatNumber(aiUsageStats.totalQueries), color: theme.palette.info.main },
									{ label: "Tokens totales", value: formatNumber(aiUsageStats.totalTokens), color: theme.palette.warning.main },
									{ label: "Costo USD", value: formatCostUsd(aiUsageStats.totalCostUsd), color: theme.palette.success.main },
								].map((s) => (
									<Grid item xs={6} sm={4} md={2.4} key={s.label}>
										<Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
											<Typography variant="caption" color="textSecondary" display="block">
												{s.label}
											</Typography>
											<Typography variant="h6" fontWeight="bold" sx={{ color: s.color }}>
												{s.value}
											</Typography>
										</Paper>
									</Grid>
								))}
							</Grid>
						</Box>
					)}

					{/* Filters: período + plan */}
					<Box sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", gap: 2, flexWrap: "wrap", borderBottom: 1, borderColor: "divider" }}>
						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Período</InputLabel>
							<Select
								label="Período"
								value={aiPeriod}
								onChange={(e) => {
									setAiPeriod(e.target.value);
									setPage(0);
								}}
							>
								{(aiPeriods.length > 0 ? aiPeriods : [aiPeriod]).map((p) => (
									<MenuItem key={p} value={p}>
										{p}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel>Plan</InputLabel>
							<Select
								label="Plan"
								value={aiPlanFilter}
								onChange={(e) => {
									setAiPlanFilter(e.target.value as "" | AiPlan);
									setPage(0);
								}}
							>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="free">Free</MenuItem>
								<MenuItem value="standard">Standard</MenuItem>
								<MenuItem value="premium">Premium</MenuItem>
							</Select>
						</FormControl>
					</Box>

					{/* AI Usage Table */}
					<TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }}>
						<Table size="small" sx={{ minWidth: { xs: 900, md: "100%" } }}>
							<TableHead>
								<TableRow>
									<TableCell>
										<TableSortLabel
											active={sortBy === "email"}
											direction={sortBy === "email" ? sortOrder : "asc"}
											onClick={() => handleSort("email")}
										>
											Usuario
										</TableSortLabel>
									</TableCell>
									<TableCell>
										<TableSortLabel
											active={sortBy === "plan"}
											direction={sortBy === "plan" ? sortOrder : "asc"}
											onClick={() => handleSort("plan")}
										>
											Plan
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "count"}
											direction={sortBy === "count" ? sortOrder : "asc"}
											onClick={() => handleSort("count")}
										>
											Consultas
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "tokensTotal"}
											direction={sortBy === "tokensTotal" ? sortOrder : "asc"}
											onClick={() => handleSort("tokensTotal")}
										>
											Tokens (in / out / total)
										</TableSortLabel>
									</TableCell>
									<TableCell align="right">
										<TableSortLabel
											active={sortBy === "costUsd"}
											direction={sortBy === "costUsd" ? sortOrder : "asc"}
											onClick={() => handleSort("costUsd")}
										>
											Costo USD
										</TableSortLabel>
									</TableCell>
									<TableCell>
										<TableSortLabel
											active={sortBy === "lastUsedAt"}
											direction={sortBy === "lastUsedAt" ? sortOrder : "asc"}
											onClick={() => handleSort("lastUsedAt")}
										>
											Última consulta
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{aiUsageLoading ? (
									Array.from({ length: rowsPerPage }).map((_, i) => (
										<TableRow key={i}>
											{Array.from({ length: 7 }).map((_, j) => (
												<TableCell key={j}>
													<Skeleton variant="text" />
												</TableCell>
											))}
										</TableRow>
									))
								) : aiUsage.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} align="center">
											<Typography color="textSecondary" sx={{ py: 4 }}>
												No hay registros de uso de IA en el período seleccionado
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									aiUsage.map((row) => {
										const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ") || row.name || "";
										return (
											<TableRow key={row._id} hover>
												<TableCell>
													<Box>
														<Typography
															variant="body2"
															fontWeight="medium"
															color={row.email ? "textPrimary" : "textSecondary"}
															fontStyle={row.email ? "normal" : "italic"}
														>
															{row.email || "(usuario eliminado)"}
														</Typography>
														{fullName && (
															<Typography variant="caption" color="textSecondary">
																{fullName}
															</Typography>
														)}
													</Box>
												</TableCell>
												<TableCell>
													<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
														<Chip
															label={row.plan}
															size="small"
															color={planChipColor(row.plan)}
															sx={{ minWidth: 70, textTransform: "capitalize" }}
														/>
														{row.currentPlan && row.currentPlan !== row.plan && (
															<Tooltip title="Plan actual del usuario (snapshot del periodo difiere)">
																<Typography variant="caption" color="textSecondary">
																	hoy: {row.currentPlan}
																</Typography>
															</Tooltip>
														)}
													</Box>
												</TableCell>
												<TableCell align="center">
													<Chip
														label={formatNumber(row.count)}
														size="small"
														color={row.count >= 1000 ? "error" : row.count >= 200 ? "warning" : "default"}
														sx={{ minWidth: 50 }}
													/>
												</TableCell>
												<TableCell align="center">
													<Box>
														<Typography variant="body2">{formatNumber(row.tokensTotal)}</Typography>
														<Typography variant="caption" color="textSecondary">
															{formatNumber(row.tokensInput)} in · {formatNumber(row.tokensOutput)} out
														</Typography>
													</Box>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2" fontWeight="medium">
														{formatCostUsd(row.costUsd)}
													</Typography>
												</TableCell>
												<TableCell>
													{row.lastUsedAt ? (
														<Box>
															<Typography variant="body2">{dayjs(row.lastUsedAt).fromNow()}</Typography>
															<Typography variant="caption" color="textSecondary">
																{dayjs(row.lastUsedAt).format("DD/MM/YY HH:mm")}
															</Typography>
														</Box>
													) : (
														<Typography variant="body2" color="textSecondary">
															-
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													<Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
														<Tooltip title="Ver detalle">
															<IconButton size="small" onClick={() => handleOpenAiDetail(row)}>
																<Eye size={16} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Resetear contador del período">
															<IconButton
																size="small"
																color="warning"
																onClick={() => {
																	setAiResetRow(row);
																	setAiResetOpen(true);
																}}
															>
																<Refresh size={16} />
															</IconButton>
														</Tooltip>
													</Box>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</TableContainer>

					{/* AI Usage Detail Dialog */}
					<Dialog
						open={aiDetailOpen}
						onClose={() => {
							setAiDetailOpen(false);
							setAiDetailRow(null);
						}}
						maxWidth="md"
						fullWidth
					>
						<DialogTitle>
							Detalle de uso de IA
							{aiDetailRow && (
								<Typography variant="caption" color="textSecondary" display="block">
									{aiDetailRow.email || "(usuario eliminado)"} — {aiDetailRow.period}
								</Typography>
							)}
						</DialogTitle>
						<DialogContent dividers>
							{aiDetailLoading ? (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton key={i} variant="text" />
									))}
								</Box>
							) : (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
									{aiDetailBreakdown && (aiDetailBreakdown.byAction.length > 0 || aiDetailBreakdown.byModel.length > 0) && (
										<Grid container spacing={2}>
											<Grid item xs={12} md={6}>
												<Typography variant="subtitle2" gutterBottom>
													Por acción
												</Typography>
												<Table size="small">
													<TableHead>
														<TableRow>
															<TableCell>Acción</TableCell>
															<TableCell align="right">N°</TableCell>
															<TableCell align="right">Tokens</TableCell>
															<TableCell align="right">USD</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{aiDetailBreakdown.byAction.map((b) => (
															<TableRow key={b._id || "na"}>
																<TableCell>{b._id || "-"}</TableCell>
																<TableCell align="right">{formatNumber(b.count)}</TableCell>
																<TableCell align="right">{formatNumber(b.tokensTotal)}</TableCell>
																<TableCell align="right">{formatCostUsd(b.costUsd)}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</Grid>
											<Grid item xs={12} md={6}>
												<Typography variant="subtitle2" gutterBottom>
													Por modelo
												</Typography>
												<Table size="small">
													<TableHead>
														<TableRow>
															<TableCell>Modelo</TableCell>
															<TableCell align="right">N°</TableCell>
															<TableCell align="right">In/Out</TableCell>
															<TableCell align="right">USD</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{aiDetailBreakdown.byModel.map((b) => (
															<TableRow key={b._id || "na"}>
																<TableCell>{b._id || "-"}</TableCell>
																<TableCell align="right">{formatNumber(b.count)}</TableCell>
																<TableCell align="right">
																	{formatNumber(b.tokensInput)}/{formatNumber(b.tokensOutput)}
																</TableCell>
																<TableCell align="right">{formatCostUsd(b.costUsd)}</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</Grid>
										</Grid>
									)}

									<Box>
										<Typography variant="subtitle2" gutterBottom>
											Últimas {aiDetailLogs.length} consultas
										</Typography>
										<TableContainer sx={{ maxHeight: 360 }}>
											<Table size="small" stickyHeader>
												<TableHead>
													<TableRow>
														<TableCell>Fecha</TableCell>
														<TableCell>Acción</TableCell>
														<TableCell>Modelo</TableCell>
														<TableCell align="right">In</TableCell>
														<TableCell align="right">Out</TableCell>
														<TableCell align="right">Total</TableCell>
														<TableCell align="right">USD</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{aiDetailLogs.length === 0 ? (
														<TableRow>
															<TableCell colSpan={7} align="center">
																<Typography color="textSecondary" sx={{ py: 2 }}>
																	Sin logs detallados
																</Typography>
															</TableCell>
														</TableRow>
													) : (
														aiDetailLogs.map((log) => (
															<TableRow key={log._id} hover>
																<TableCell>{formatDate(log.createdAt)}</TableCell>
																<TableCell>{log.action}</TableCell>
																<TableCell>{log.model}</TableCell>
																<TableCell align="right">{formatNumber(log.tokensInput)}</TableCell>
																<TableCell align="right">{formatNumber(log.tokensOutput)}</TableCell>
																<TableCell align="right">{formatNumber(log.tokensTotal)}</TableCell>
																<TableCell align="right">{formatCostUsd(log.costUsd)}</TableCell>
															</TableRow>
														))
													)}
												</TableBody>
											</Table>
										</TableContainer>
									</Box>
								</Box>
							)}
						</DialogContent>
						<DialogActions>
							<Button
								onClick={() => {
									setAiDetailOpen(false);
									setAiDetailRow(null);
								}}
							>
								Cerrar
							</Button>
						</DialogActions>
					</Dialog>

					{/* Reset Confirmation Dialog */}
					<Dialog open={aiResetOpen} onClose={() => !aiResetting && setAiResetOpen(false)} maxWidth="xs" fullWidth>
						<DialogTitle>Resetear contador de uso</DialogTitle>
						<DialogContent dividers>
							{aiResetRow && (
								<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
									<Typography variant="body2">
										¿Estás seguro de resetear el contador de IA para <strong>{aiResetRow.email || "(usuario eliminado)"}</strong> en el
										período <strong>{aiResetRow.period}</strong>?
									</Typography>
									<Typography variant="caption" color="textSecondary">
										La acción pone count, tokens y costo a 0 sin borrar el documento. El usuario va a poder volver a hacer consultas hasta
										el límite del plan.
									</Typography>
									<Box sx={{ mt: 1, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 1 }}>
										<Typography variant="caption" color="textSecondary">
											Antes del reset: <strong>{formatNumber(aiResetRow.count)}</strong> consultas ·{" "}
											<strong>{formatNumber(aiResetRow.tokensTotal)}</strong> tokens · <strong>{formatCostUsd(aiResetRow.costUsd)}</strong>
										</Typography>
									</Box>
								</Box>
							)}
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setAiResetOpen(false)} disabled={aiResetting}>
								Cancelar
							</Button>
							<Button
								onClick={handleConfirmAiReset}
								color="warning"
								variant="contained"
								startIcon={<Trash size={14} />}
								disabled={aiResetting}
							>
								{aiResetting ? "Reseteando..." : "Resetear"}
							</Button>
						</DialogActions>
					</Dialog>
				</>
			) : (
				<>
					{/* Toolbar de bulk retry — solo en tab folder cuando hay selección */}
					{isFolderTab && selectedFolderIds.size > 0 && (
						<Paper
							sx={{
								mb: 2,
								p: 2,
								bgcolor: alpha(theme.palette.primary.main, 0.06),
								borderLeft: `4px solid ${theme.palette.primary.main}`,
							}}
						>
							<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
								<Typography variant="body2" fontWeight={600}>
									{selectedFolderIds.size} carpeta(s) seleccionada(s)
								</Typography>
								<FormControlLabel
									control={<Switch checked={retryHasPaid} onChange={(e) => setRetryHasPaid(e.target.checked)} size="small" />}
									label={<Typography variant="caption">Habilitar updates automáticos (suscripción paga)</Typography>}
								/>
								<Box sx={{ flex: 1 }} />
								<Button size="small" variant="outlined" onClick={() => setSelectedFolderIds(new Set())}>
									Limpiar
								</Button>
								<Button
									size="small"
									variant="contained"
									color="primary"
									startIcon={<Refresh size={16} />}
									onClick={() => setRetryDialogOpen(true)}
								>
									Reintentar verificación
								</Button>
							</Stack>
						</Paper>
					)}

					{/* Table */}
					<TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }}>
						<Table size="small" sx={{ minWidth: { xs: 800, md: "100%" } }}>
							<TableHead>
								<TableRow>
									{isUsersTab ? (
										<>
											<TableCell>
												<TableSortLabel
													active={sortBy === "email"}
													direction={sortBy === "email" ? sortOrder : "asc"}
													onClick={() => handleSort("email")}
												>
													Usuario
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "folders"}
													direction={sortBy === "folders" ? sortOrder : "asc"}
													onClick={() => handleSort("folders")}
												>
													Carpetas
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "contacts"}
													direction={sortBy === "contacts" ? sortOrder : "asc"}
													onClick={() => handleSort("contacts")}
												>
													Contactos
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "calculators"}
													direction={sortBy === "calculators" ? sortOrder : "asc"}
													onClick={() => handleSort("calculators")}
												>
													Calculadores
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "tasks"}
													direction={sortBy === "tasks" ? sortOrder : "asc"}
													onClick={() => handleSort("tasks")}
												>
													Tareas
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "events"}
													direction={sortBy === "events" ? sortOrder : "asc"}
													onClick={() => handleSort("events")}
												>
													Eventos
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "movements"}
													direction={sortBy === "movements" ? sortOrder : "asc"}
													onClick={() => handleSort("movements")}
												>
													Movimientos
												</TableSortLabel>
											</TableCell>
											<TableCell align="center">
												<TableSortLabel
													active={sortBy === "total"}
													direction={sortBy === "total" ? sortOrder : "asc"}
													onClick={() => handleSort("total")}
												>
													Total
												</TableSortLabel>
											</TableCell>
											<TableCell align="right">
												<TableSortLabel
													active={sortBy === "storage"}
													direction={sortBy === "storage" ? sortOrder : "asc"}
													onClick={() => handleSort("storage")}
												>
													<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
														<CloudConnection size={16} />
														Storage
													</Box>
												</TableSortLabel>
											</TableCell>
											<TableCell>Último Login</TableCell>
											<TableCell align="center">Días Activos</TableCell>
											<TableCell>
												<TableSortLabel
													active={sortBy === "createdAt"}
													direction={sortBy === "createdAt" ? sortOrder : "asc"}
													onClick={() => handleSort("createdAt")}
												>
													Registrado
												</TableSortLabel>
											</TableCell>
										</>
									) : (
										<>
											{isFolderTab && (
												<TableCell padding="checkbox">
													{(() => {
														const eligibleInPage = resources.filter(isFolderRetryEligible);
														const allEligibleSelected =
															eligibleInPage.length > 0 && eligibleInPage.every((r) => selectedFolderIds.has(r._id));
														const someEligibleSelected =
															eligibleInPage.some((r) => selectedFolderIds.has(r._id)) && !allEligibleSelected;
														return (
															<Tooltip title="Seleccionar todas las elegibles de la página (omite verificadas y manuales)">
																<Checkbox
																	size="small"
																	indeterminate={someEligibleSelected}
																	checked={allEligibleSelected}
																	onChange={toggleAllFoldersInPage}
																	disabled={eligibleInPage.length === 0}
																/>
															</Tooltip>
														);
													})()}
												</TableCell>
											)}
											{columns.map((column) => (
												<TableCell key={column.id}>
													{column.sortable ? (
														<TableSortLabel
															active={sortBy === column.id}
															direction={sortBy === column.id ? sortOrder : "asc"}
															onClick={() => handleSort(column.id)}
														>
															{column.label}
														</TableSortLabel>
													) : (
														column.label
													)}
												</TableCell>
											))}
											<TableCell align="center">Acciones</TableCell>
										</>
									)}
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									Array.from({ length: rowsPerPage }).map((_, index) => (
										<TableRow key={index}>
											{isUsersTab ? (
												<>
													{Array.from({ length: 13 }).map((_, i) => (
														<TableCell key={i}>
															<Skeleton variant="text" />
														</TableCell>
													))}
												</>
											) : (
												<>
													{isFolderTab && (
														<TableCell padding="checkbox">
															<Skeleton variant="rectangular" width={20} height={20} />
														</TableCell>
													)}
													{columns.map((column) => (
														<TableCell key={column.id}>
															<Skeleton variant="text" />
														</TableCell>
													))}
													<TableCell>
														<Skeleton variant="text" />
													</TableCell>
												</>
											)}
										</TableRow>
									))
								) : isUsersTab ? (
									users.length === 0 ? (
										<TableRow>
											<TableCell colSpan={13} align="center">
												<Typography color="textSecondary" sx={{ py: 4 }}>
													No se encontraron usuarios
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										users.map((user) => (
											<TableRow key={user._id} hover>
												<TableCell>
													<Box>
														<Typography variant="body2" fontWeight="medium">
															{user.email}
														</Typography>
														{user.name && user.name !== "-" && (
															<Typography variant="caption" color="textSecondary">
																{user.name}
															</Typography>
														)}
													</Box>
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.folders} size="small" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.contacts} size="small" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.calculators} size="small" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.tasks} size="small" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.events} size="small" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.movements} size="small" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="center">
													<Chip label={user.resources.total} size="small" color="primary" sx={{ minWidth: 40 }} />
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
														{formatBytes(user.storage.total)}
													</Typography>
												</TableCell>
												<TableCell>
													{sessionMetrics[user._id]?.lastLogin ? (
														<Box>
															<Typography variant="body2">{dayjs(sessionMetrics[user._id].lastLogin).fromNow()}</Typography>
															<Typography variant="caption" color="textSecondary">
																{dayjs(sessionMetrics[user._id].lastLogin).format("DD/MM/YY HH:mm")}
															</Typography>
														</Box>
													) : (
														<Typography variant="body2" color="textSecondary">
															-
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													<Chip
														label={sessionMetrics[user._id]?.activeDays || 0}
														size="small"
														color={
															(sessionMetrics[user._id]?.activeDays || 0) >= 20
																? "success"
																: (sessionMetrics[user._id]?.activeDays || 0) >= 10
																? "warning"
																: "default"
														}
														sx={{ minWidth: 40 }}
													/>
												</TableCell>
												<TableCell>{formatDate(user.createdAt)}</TableCell>
											</TableRow>
										))
									)
								) : resources.length === 0 ? (
									<TableRow>
										<TableCell colSpan={columns.length + (isFolderTab ? 2 : 1)} align="center">
											<Typography color="textSecondary" sx={{ py: 4 }}>
												No se encontraron recursos
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									resources.map((resource) => (
										<TableRow
											key={resource._id}
											hover
											selected={isFolderTab && selectedFolderIds.has(resource._id)}
										>
											{isFolderTab && (
												<TableCell padding="checkbox">
													{(() => {
														const eligible = isFolderRetryEligible(resource);
														const reason = eligible ? "" : folderRetryIneligibleReason(resource);
														const checkbox = (
															<Checkbox
																size="small"
																checked={eligible && selectedFolderIds.has(resource._id)}
																onChange={() => eligible && toggleFolderSelected(resource._id)}
																disabled={!eligible}
															/>
														);
														return reason ? (
															<Tooltip title={reason}>
																<span>{checkbox}</span>
															</Tooltip>
														) : (
															checkbox
														);
													})()}
												</TableCell>
											)}
											{columns.map((column) => (
												<TableCell key={column.id}>{column.render(resource)}</TableCell>
											))}
											<TableCell align="center">
												<Tooltip title="Ver JSON">
													<Button
														size="small"
														variant="outlined"
														startIcon={<Eye size={14} />}
														onClick={() => {
															setJsonViewResource(resource);
															setJsonViewOpen(true);
														}}
														sx={{ minWidth: 60 }}
													>
														VER
													</Button>
												</Tooltip>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</>
			)}

			{/* Dialog de confirmación de retry bulk */}
			<Dialog open={retryDialogOpen} onClose={() => setRetryDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Reintentar verificación de carpetas</DialogTitle>
				<DialogContent>
					<Typography variant="body2" sx={{ mb: 2 }}>
						Vas a marcar <strong>{selectedFolderIds.size}</strong> carpeta(s) como elegibles para que los workers de scraping (PJN /
						MEV / EJE) las procesen en su próxima ejecución.
					</Typography>
					<Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
						- <strong>PJN</strong>: si no existe el documento en la collection de causas, se crea con <code>verified: false</code> →
						el verify-worker lo levanta en su próximo tick.
					</Typography>
					<Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
						- <strong>MEV / EJE</strong>: solo se re-trigger si la carpeta ya tiene una asociación previa (con causaId). Las que no
						tengan asociación previa serán salteadas.
					</Typography>
					<Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
						- Carpetas sin plataforma activa (<code>pjn/mev/eje</code> todos en false) se saltean.
					</Typography>
					<Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 1 }}>
						<FormControlLabel
							control={<Switch checked={retryHasPaid} onChange={(e) => setRetryHasPaid(e.target.checked)} />}
							label={
								<Box>
									<Typography variant="body2" fontWeight={600}>
										Habilitar updates automáticos
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Si se activa, las causas vinculadas quedarán con <code>userUpdatesEnabled: true</code> (equivale a una
										suscripción paga).
									</Typography>
								</Box>
							}
						/>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setRetryDialogOpen(false)} disabled={retryLoading}>
						Cancelar
					</Button>
					<Button
						variant="contained"
						color="primary"
						onClick={handleRetryAssociation}
						disabled={retryLoading}
						startIcon={retryLoading ? <CircularProgress size={16} color="inherit" /> : <Refresh size={16} />}
					>
						{retryLoading ? "Procesando..." : "Confirmar retry"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* JSON Viewer Dialog */}
			<Dialog open={jsonViewOpen} onClose={() => setJsonViewOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 2 }}>
					<Typography variant="h6">Documento JSON — {tabs.find((t) => t.type === currentType)?.label}</Typography>
					<Tooltip title="Copiar JSON">
						<Button
							size="small"
							variant="outlined"
							startIcon={<Copy size={14} />}
							onClick={() => {
								if (jsonViewResource) {
									navigator.clipboard.writeText(JSON.stringify(jsonViewResource, null, 2));
									enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
								}
							}}
						>
							Copiar
						</Button>
					</Tooltip>
				</DialogTitle>
				<DialogContent dividers>
					<Box
						component="pre"
						sx={{
							m: 0,
							p: 2,
							borderRadius: 1,
							bgcolor: "background.default",
							border: "1px solid",
							borderColor: "divider",
							overflowX: "auto",
							fontSize: "0.8rem",
							fontFamily: "monospace",
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
							maxHeight: 500,
							overflowY: "auto",
						}}
					>
						{jsonViewResource ? JSON.stringify(jsonViewResource, null, 2) : ""}
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setJsonViewOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Pagination */}
			<TablePagination
				component="div"
				count={total}
				page={page}
				onPageChange={handleChangePage}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={handleChangeRowsPerPage}
				rowsPerPageOptions={[10, 25, 50, 100]}
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
				sx={{
					".MuiTablePagination-toolbar": {
						flexWrap: { xs: "wrap", sm: "nowrap" },
						justifyContent: { xs: "center", sm: "flex-end" },
						gap: { xs: 1, sm: 0 },
						py: { xs: 1, sm: 0 },
					},
					".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
						fontSize: { xs: "0.75rem", sm: "0.875rem" },
					},
					".MuiTablePagination-actions": {
						ml: { xs: 0, sm: 2 },
					},
				}}
			/>
		</MainCard>
	);
};

export default UserResources;
