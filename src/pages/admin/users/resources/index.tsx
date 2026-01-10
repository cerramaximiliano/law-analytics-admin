import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import { SearchNormal1, CloseCircle, Folder, People, Calculator, Task, Calendar } from "iconsax-react";
import MainCard from "components/MainCard";
import AdminResourcesService, {
	ResourceType,
	Resource,
	FolderResource,
	ContactResource,
	CalculatorResource,
	TaskResource,
	EventResource,
	ResourceUser,
} from "api/adminResources";
import dayjs from "dayjs";

// Tab configuration
interface TabConfig {
	type: ResourceType;
	label: string;
	icon: React.ReactElement;
}

const tabs: TabConfig[] = [
	{ type: "folder", label: "Carpetas", icon: <Folder size={18} /> },
	{ type: "contact", label: "Contactos", icon: <People size={18} /> },
	{ type: "calculator", label: "Calculadores", icon: <Calculator size={18} /> },
	{ type: "task", label: "Tareas", icon: <Task size={18} /> },
	{ type: "event", label: "Eventos", icon: <Calendar size={18} /> },
];

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
						return status ? <Chip label={status} size="small" sx={{ bgcolor: alpha(colorMap[status] || theme.palette.grey[500], 0.1), color: colorMap[status] || theme.palette.grey[500] }} /> : "-";
					},
				},
				{
					id: "causaVerified",
					label: "Verificada",
					sortable: true,
					render: (r) => ((r as FolderResource).causaVerified ? <Chip label="Sí" size="small" color="success" /> : <Chip label="No" size="small" variant="outlined" />),
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
					render: (r) => ((r as CalculatorResource).isVerified ? <Chip label="Sí" size="small" color="success" /> : <Chip label="No" size="small" variant="outlined" />),
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
						return status ? <Chip label={status.replace("_", " ")} size="small" sx={{ bgcolor: alpha(colorMap[status] || theme.palette.grey[500], 0.1), color: colorMap[status] || theme.palette.grey[500] }} /> : "-";
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
						return priority ? <Chip label={priority} size="small" sx={{ bgcolor: alpha(colorMap[priority] || theme.palette.grey[500], 0.1), color: colorMap[priority] || theme.palette.grey[500] }} /> : "-";
					},
				},
				{ id: "dueDate", label: "Vencimiento", sortable: true, render: (r) => formatDate((r as TaskResource).dueDate) },
				{
					id: "checked",
					label: "Completada",
					sortable: true,
					render: (r) => ((r as TaskResource).checked ? <Chip label="Sí" size="small" color="success" /> : <Chip label="No" size="small" variant="outlined" />),
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
					render: (r) => ((r as EventResource).allDay ? <Chip label="Sí" size="small" color="info" /> : <Chip label="No" size="small" variant="outlined" />),
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
				p: 2,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
				<Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(color, 0.1), color: color }}>{icon}</Box>
				<Box>
					<Typography variant="body2" color="textSecondary">
						{label}
					</Typography>
					{loading ? <Skeleton variant="text" width={40} height={28} /> : <Typography variant="h5" fontWeight="bold">{value.toLocaleString()}</Typography>}
				</Box>
			</Box>
		</Paper>
	);
};

const UserResources: React.FC = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [resources, setResources] = useState<Resource[]>([]);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [stats, setStats] = useState({ folders: 0, contacts: 0, calculators: 0, tasks: 0, events: 0, total: 0 });
	const [statsLoading, setStatsLoading] = useState(true);

	const currentType = tabs[activeTab].type;
	const columns = getColumnsByType(currentType, theme);

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
		setLoading(true);
		try {
			const response = await AdminResourcesService.getResources({
				type: currentType,
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
	}, [currentType, page, rowsPerPage, search, sortBy, sortOrder]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchResources();
	}, [fetchResources]);

	// Handlers
	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
		setPage(0);
		setSearch("");
		setSearchInput("");
		setSortBy("createdAt");
		setSortOrder("desc");
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
		<MainCard title="Recursos de Usuarios" content={false}>
			{/* Stats Cards */}
			<Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
				<Grid container spacing={2}>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Carpetas" value={stats.folders} icon={<Folder size={20} />} color={theme.palette.primary.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Contactos" value={stats.contacts} icon={<People size={20} />} color={theme.palette.info.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Calculadores" value={stats.calculators} icon={<Calculator size={20} />} color={theme.palette.success.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Tareas" value={stats.tasks} icon={<Task size={20} />} color={theme.palette.warning.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Eventos" value={stats.events} icon={<Calendar size={20} />} color={theme.palette.secondary.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Total" value={stats.total} icon={<Folder size={20} />} color={theme.palette.text.primary} loading={statsLoading} />
					</Grid>
				</Grid>
			</Box>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={activeTab} onChange={handleTabChange} aria-label="resource tabs">
					{tabs.map((tab, index) => (
						<Tab key={tab.type} icon={tab.icon} iconPosition="start" label={tab.label} id={`resource-tab-${index}`} />
					))}
				</Tabs>
			</Box>

			{/* Search */}
			<Box sx={{ p: 2, display: "flex", gap: 2 }}>
				<TextField
					size="small"
					placeholder="Buscar..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					onKeyPress={handleKeyPress}
					sx={{ minWidth: 300 }}
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

			{/* Table */}
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							{columns.map((column) => (
								<TableCell key={column.id}>
									{column.sortable ? (
										<TableSortLabel active={sortBy === column.id} direction={sortBy === column.id ? sortOrder : "asc"} onClick={() => handleSort(column.id)}>
											{column.label}
										</TableSortLabel>
									) : (
										column.label
									)}
								</TableCell>
							))}
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: rowsPerPage }).map((_, index) => (
								<TableRow key={index}>
									{columns.map((column) => (
										<TableCell key={column.id}>
											<Skeleton variant="text" />
										</TableCell>
									))}
								</TableRow>
							))
						) : resources.length === 0 ? (
							<TableRow>
								<TableCell colSpan={columns.length} align="center">
									<Typography color="textSecondary" sx={{ py: 4 }}>
										No se encontraron recursos
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							resources.map((resource) => (
								<TableRow key={resource._id} hover>
									{columns.map((column) => (
										<TableCell key={column.id}>{column.render(resource)}</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

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
			/>
		</MainCard>
	);
};

export default UserResources;
