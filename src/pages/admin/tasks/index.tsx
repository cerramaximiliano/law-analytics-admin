import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Grid,
	Paper,
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
	Button,
	Chip,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Checkbox,
	Tooltip,
	Menu,
	ListItemIcon,
	ListItemText,
	Skeleton,
	useTheme,
	alpha,
	Divider,
	LinearProgress,
	Stack,
} from "@mui/material";
import {
	SearchNormal1,
	CloseCircle,
	Add,
	Edit2,
	Trash,
	TickCircle,
	Clock,
	Warning2,
	More,
	Archive,
	ArchiveSlash,
	Flag,
	Tag,
	Calendar,
	MessageText,
	TaskSquare,
	Filter,
	Refresh,
} from "iconsax-react";
import MainCard from "components/MainCard";
import AdminTasksService from "api/adminTasks";
import {
	AdminTask,
	TaskStatus,
	TaskPriority,
	TaskCategory,
	TaskStats,
	TaskFilterOptions,
	CreateTaskRequest,
	STATUS_LABELS,
	STATUS_COLORS,
	PRIORITY_LABELS,
	PRIORITY_COLORS,
	CATEGORY_LABELS,
} from "types/admin-task";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

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
				<Box
					sx={{
						p: 1,
						borderRadius: 1.5,
						bgcolor: alpha(color, 0.1),
						color: color,
						display: "flex",
					}}
				>
					{icon}
				</Box>
				<Box>
					<Typography variant="body2" color="textSecondary">
						{label}
					</Typography>
					{loading ? <Skeleton variant="text" width={40} height={28} /> : <Typography variant="h5" fontWeight="bold">{value}</Typography>}
				</Box>
			</Box>
		</Paper>
	);
};

// Task Form Dialog
interface TaskFormDialogProps {
	open: boolean;
	task: AdminTask | null;
	filterOptions: TaskFilterOptions | null;
	onClose: () => void;
	onSave: (data: CreateTaskRequest) => Promise<void>;
}

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({ open, task, filterOptions, onClose, onSave }) => {
	const [formData, setFormData] = useState<CreateTaskRequest>({
		title: "",
		description: "",
		status: "todo",
		priority: "medium",
		category: "other",
		tags: [],
		project: "",
		assignedTo: "",
		dueDate: "",
	});
	const [saving, setSaving] = useState(false);
	const [tagInput, setTagInput] = useState("");

	useEffect(() => {
		if (task) {
			setFormData({
				title: task.title,
				description: task.description || "",
				status: task.status,
				priority: task.priority,
				category: task.category,
				tags: task.tags || [],
				project: task.project || "",
				assignedTo: task.assignedTo || "",
				dueDate: task.dueDate ? dayjs(task.dueDate).format("YYYY-MM-DD") : "",
			});
		} else {
			setFormData({
				title: "",
				description: "",
				status: "todo",
				priority: "medium",
				category: "other",
				tags: [],
				project: "",
				assignedTo: "",
				dueDate: "",
			});
		}
	}, [task, open]);

	const handleSubmit = async () => {
		if (!formData.title.trim()) return;
		setSaving(true);
		try {
			await onSave(formData);
			onClose();
		} finally {
			setSaving(false);
		}
	};

	const handleAddTag = () => {
		if (tagInput.trim() && !formData.tags?.includes(tagInput.trim().toLowerCase())) {
			setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim().toLowerCase()] });
			setTagInput("");
		}
	};

	const handleRemoveTag = (tag: string) => {
		setFormData({ ...formData, tags: formData.tags?.filter((t) => t !== tag) });
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{task ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 1 }}>
					<TextField
						label="Título"
						value={formData.title}
						onChange={(e) => setFormData({ ...formData, title: e.target.value })}
						fullWidth
						required
						autoFocus
					/>
					<TextField
						label="Descripción"
						value={formData.description}
						onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						fullWidth
						multiline
						rows={3}
					/>
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={formData.status}
									label="Estado"
									onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
								>
									{filterOptions?.statuses.map((s) => (
										<MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth size="small">
								<InputLabel>Prioridad</InputLabel>
								<Select
									value={formData.priority}
									label="Prioridad"
									onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
								>
									{filterOptions?.priorities.map((p) => (
										<MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth size="small">
								<InputLabel>Categoría</InputLabel>
								<Select
									value={formData.category}
									label="Categoría"
									onChange={(e) => setFormData({ ...formData, category: e.target.value as TaskCategory })}
								>
									{filterOptions?.categories.map((c) => (
										<MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<TextField
								label="Fecha límite"
								type="date"
								value={formData.dueDate}
								onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
								fullWidth
								size="small"
								InputLabelProps={{ shrink: true }}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								label="Proyecto"
								value={formData.project}
								onChange={(e) => setFormData({ ...formData, project: e.target.value })}
								fullWidth
								size="small"
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								label="Asignado a"
								value={formData.assignedTo}
								onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
								fullWidth
								size="small"
							/>
						</Grid>
					</Grid>
					<Box>
						<Typography variant="body2" color="textSecondary" gutterBottom>
							Tags
						</Typography>
						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
							{formData.tags?.map((tag) => (
								<Chip key={tag} label={tag} size="small" onDelete={() => handleRemoveTag(tag)} />
							))}
						</Box>
						<TextField
							placeholder="Agregar tag..."
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
							size="small"
							InputProps={{
								endAdornment: (
									<InputAdornment position="end">
										<IconButton size="small" onClick={handleAddTag}>
											<Add size={16} />
										</IconButton>
									</InputAdornment>
								),
							}}
						/>
					</Box>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={saving || !formData.title.trim()}>
					{saving ? "Guardando..." : task ? "Actualizar" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// Main Component
const AdminTasks: React.FC = () => {
	const theme = useTheme();

	// State
	const [tasks, setTasks] = useState<AdminTask[]>([]);
	const [stats, setStats] = useState<TaskStats | null>(null);
	const [filterOptions, setFilterOptions] = useState<TaskFilterOptions | null>(null);
	const [loading, setLoading] = useState(true);
	const [statsLoading, setStatsLoading] = useState(true);

	// Pagination & Sorting
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Filters
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [priorityFilter, setPriorityFilter] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("");

	// Selection
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Dialogs
	const [formOpen, setFormOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [taskToDelete, setTaskToDelete] = useState<AdminTask | null>(null);

	// Menu
	const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
	const [menuTask, setMenuTask] = useState<AdminTask | null>(null);

	// Fetch functions
	const fetchStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const response = await AdminTasksService.getStats();
			if (response.success) setStats(response.data);
		} catch (error) {
			console.error("Error fetching stats:", error);
		} finally {
			setStatsLoading(false);
		}
	}, []);

	const fetchFilterOptions = useCallback(async () => {
		try {
			const response = await AdminTasksService.getFilterOptions();
			if (response.success) setFilterOptions(response.data);
		} catch (error) {
			console.error("Error fetching filter options:", error);
		}
	}, []);

	const fetchTasks = useCallback(async () => {
		setLoading(true);
		try {
			const response = await AdminTasksService.getTasks({
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				status: statusFilter || undefined,
				priority: priorityFilter || undefined,
				category: categoryFilter || undefined,
				sortBy,
				sortOrder,
			});
			if (response.success) {
				setTasks(response.data);
				setTotal(response.pagination.total);
			}
		} catch (error) {
			console.error("Error fetching tasks:", error);
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, search, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder]);

	useEffect(() => {
		fetchStats();
		fetchFilterOptions();
	}, [fetchStats, fetchFilterOptions]);

	useEffect(() => {
		fetchTasks();
	}, [fetchTasks]);

	// Handlers
	const handleSearch = () => {
		setSearch(searchInput);
		setPage(0);
	};

	const handleClearSearch = () => {
		setSearchInput("");
		setSearch("");
		setPage(0);
	};

	const handleSort = (column: string) => {
		const isAsc = sortBy === column && sortOrder === "asc";
		setSortOrder(isAsc ? "desc" : "asc");
		setSortBy(column);
	};

	const handleCreateTask = () => {
		setEditingTask(null);
		setFormOpen(true);
	};

	const handleEditTask = (task: AdminTask) => {
		setEditingTask(task);
		setFormOpen(true);
		setMenuAnchor(null);
	};

	const handleSaveTask = async (data: CreateTaskRequest) => {
		if (editingTask) {
			await AdminTasksService.updateTask(editingTask._id, data);
		} else {
			await AdminTasksService.createTask(data);
		}
		fetchTasks();
		fetchStats();
	};

	const handleDeleteClick = (task: AdminTask) => {
		setTaskToDelete(task);
		setDeleteDialogOpen(true);
		setMenuAnchor(null);
	};

	const handleDeleteConfirm = async () => {
		if (taskToDelete) {
			await AdminTasksService.deleteTask(taskToDelete._id);
			fetchTasks();
			fetchStats();
		}
		setDeleteDialogOpen(false);
		setTaskToDelete(null);
	};

	const handleStatusChange = async (task: AdminTask, status: TaskStatus) => {
		await AdminTasksService.updateTaskStatus(task._id, status);
		fetchTasks();
		fetchStats();
		setMenuAnchor(null);
	};

	const handleTogglePin = async (task: AdminTask) => {
		await AdminTasksService.togglePin(task._id);
		fetchTasks();
		setMenuAnchor(null);
	};

	const handleToggleArchive = async (task: AdminTask) => {
		await AdminTasksService.toggleArchive(task._id);
		fetchTasks();
		fetchStats();
		setMenuAnchor(null);
	};

	const handleSelectAll = (checked: boolean) => {
		setSelectedIds(checked ? tasks.map((t) => t._id) : []);
	};

	const handleSelectOne = (id: string, checked: boolean) => {
		setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter((i) => i !== id));
	};

	const handleBulkDelete = async () => {
		if (selectedIds.length > 0) {
			await AdminTasksService.bulkDelete(selectedIds);
			setSelectedIds([]);
			fetchTasks();
			fetchStats();
		}
	};

	const handleBulkStatus = async (status: TaskStatus) => {
		if (selectedIds.length > 0) {
			await AdminTasksService.bulkUpdateStatus(selectedIds, status);
			setSelectedIds([]);
			fetchTasks();
			fetchStats();
		}
	};

	const getStatusColor = (status: TaskStatus) => {
		const colorMap: Record<string, string> = {
			backlog: theme.palette.grey[500],
			todo: theme.palette.info.main,
			in_progress: theme.palette.warning.main,
			review: theme.palette.secondary.main,
			completed: theme.palette.success.main,
			cancelled: theme.palette.error.main,
			blocked: theme.palette.error.dark,
		};
		return colorMap[status] || theme.palette.grey[500];
	};

	const getPriorityColor = (priority: TaskPriority) => {
		const colorMap: Record<string, string> = {
			low: theme.palette.success.main,
			medium: theme.palette.info.main,
			high: theme.palette.warning.main,
			urgent: theme.palette.error.main,
		};
		return colorMap[priority] || theme.palette.grey[500];
	};

	return (
		<MainCard title="Tareas Administrativas" content={false}>
			{/* Stats Cards */}
			<Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
				<Grid container spacing={2}>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Total" value={stats?.total || 0} icon={<TaskSquare size={20} />} color={theme.palette.primary.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Pendientes" value={stats?.statusCounts?.todo || 0} icon={<Clock size={20} />} color={theme.palette.info.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="En Progreso" value={stats?.statusCounts?.in_progress || 0} icon={<Flag size={20} />} color={theme.palette.warning.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Completadas" value={stats?.statusCounts?.completed || 0} icon={<TickCircle size={20} />} color={theme.palette.success.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Vencidas" value={stats?.overdue || 0} icon={<Warning2 size={20} />} color={theme.palette.error.main} loading={statsLoading} />
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard label="Esta Semana" value={stats?.completedThisWeek || 0} icon={<Calendar size={20} />} color={theme.palette.secondary.main} loading={statsLoading} />
					</Grid>
				</Grid>
			</Box>

			{/* Toolbar */}
			<Box sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
				<TextField
					size="small"
					placeholder="Buscar tareas..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					onKeyPress={(e) => e.key === "Enter" && handleSearch()}
					sx={{ width: 250 }}
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

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Estado</InputLabel>
					<Select value={statusFilter} label="Estado" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
						<MenuItem value="">Todos</MenuItem>
						{filterOptions?.statuses.map((s) => (
							<MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Prioridad</InputLabel>
					<Select value={priorityFilter} label="Prioridad" onChange={(e) => { setPriorityFilter(e.target.value); setPage(0); }}>
						<MenuItem value="">Todas</MenuItem>
						{filterOptions?.priorities.map((p) => (
							<MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Categoría</InputLabel>
					<Select value={categoryFilter} label="Categoría" onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}>
						<MenuItem value="">Todas</MenuItem>
						{filterOptions?.categories.map((c) => (
							<MenuItem key={c} value={c}>{CATEGORY_LABELS[c]}</MenuItem>
						))}
					</Select>
				</FormControl>

				<Box sx={{ flexGrow: 1 }} />

				{selectedIds.length > 0 && (
					<>
						<Typography variant="body2" color="textSecondary">
							{selectedIds.length} seleccionadas
						</Typography>
						<Button size="small" color="success" onClick={() => handleBulkStatus("completed")}>
							Completar
						</Button>
						<Button size="small" color="error" onClick={handleBulkDelete}>
							Eliminar
						</Button>
						<Divider orientation="vertical" flexItem />
					</>
				)}

				<IconButton onClick={() => { fetchTasks(); fetchStats(); }}>
					<Refresh size={20} />
				</IconButton>

				<Button variant="contained" startIcon={<Add size={18} />} onClick={handleCreateTask}>
					Nueva Tarea
				</Button>
			</Box>

			{/* Table */}
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell padding="checkbox">
								<Checkbox
									indeterminate={selectedIds.length > 0 && selectedIds.length < tasks.length}
									checked={tasks.length > 0 && selectedIds.length === tasks.length}
									onChange={(e) => handleSelectAll(e.target.checked)}
								/>
							</TableCell>
							<TableCell>
								<TableSortLabel active={sortBy === "title"} direction={sortBy === "title" ? sortOrder : "asc"} onClick={() => handleSort("title")}>
									Tarea
								</TableSortLabel>
							</TableCell>
							<TableCell>
								<TableSortLabel active={sortBy === "status"} direction={sortBy === "status" ? sortOrder : "asc"} onClick={() => handleSort("status")}>
									Estado
								</TableSortLabel>
							</TableCell>
							<TableCell>
								<TableSortLabel active={sortBy === "priority"} direction={sortBy === "priority" ? sortOrder : "asc"} onClick={() => handleSort("priority")}>
									Prioridad
								</TableSortLabel>
							</TableCell>
							<TableCell>Categoría</TableCell>
							<TableCell>
								<TableSortLabel active={sortBy === "dueDate"} direction={sortBy === "dueDate" ? sortOrder : "asc"} onClick={() => handleSort("dueDate")}>
									Vencimiento
								</TableSortLabel>
							</TableCell>
							<TableCell>Progreso</TableCell>
							<TableCell align="right">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: rowsPerPage }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}><Skeleton variant="text" /></TableCell>
									))}
								</TableRow>
							))
						) : tasks.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} align="center">
									<Typography color="textSecondary" sx={{ py: 4 }}>
										No se encontraron tareas
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							tasks.map((task) => (
								<TableRow key={task._id} hover selected={selectedIds.includes(task._id)}>
									<TableCell padding="checkbox">
										<Checkbox
											checked={selectedIds.includes(task._id)}
											onChange={(e) => handleSelectOne(task._id, e.target.checked)}
										/>
									</TableCell>
									<TableCell>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
											{task.isPinned && <Flag size={14} color={theme.palette.warning.main} />}
											<Box>
												<Typography variant="body2" fontWeight="medium" sx={{ textDecoration: task.status === "completed" ? "line-through" : "none" }}>
													{task.title}
												</Typography>
												{task.project && (
													<Typography variant="caption" color="textSecondary">
														{task.project}
													</Typography>
												)}
											</Box>
										</Box>
									</TableCell>
									<TableCell>
										<Chip
											label={STATUS_LABELS[task.status]}
											size="small"
											sx={{
												bgcolor: alpha(getStatusColor(task.status), 0.1),
												color: getStatusColor(task.status),
											}}
										/>
									</TableCell>
									<TableCell>
										<Chip
											label={PRIORITY_LABELS[task.priority]}
											size="small"
											sx={{
												bgcolor: alpha(getPriorityColor(task.priority), 0.1),
												color: getPriorityColor(task.priority),
											}}
										/>
									</TableCell>
									<TableCell>
										<Typography variant="body2">{CATEGORY_LABELS[task.category]}</Typography>
									</TableCell>
									<TableCell>
										{task.dueDate ? (
											<Box>
												<Typography
													variant="body2"
													color={task.isOverdue ? "error" : "textPrimary"}
													fontWeight={task.isOverdue ? "bold" : "normal"}
												>
													{dayjs(task.dueDate).format("DD/MM/YY")}
												</Typography>
												<Typography variant="caption" color={task.isOverdue ? "error" : "textSecondary"}>
													{dayjs(task.dueDate).fromNow()}
												</Typography>
											</Box>
										) : (
											<Typography variant="body2" color="textSecondary">-</Typography>
										)}
									</TableCell>
									<TableCell>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 100 }}>
											<LinearProgress
												variant="determinate"
												value={task.progress}
												sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
												color={task.progress === 100 ? "success" : "primary"}
											/>
											<Typography variant="caption">{task.progress}%</Typography>
										</Box>
									</TableCell>
									<TableCell align="right">
										<IconButton
											size="small"
											onClick={(e) => {
												setMenuAnchor(e.currentTarget);
												setMenuTask(task);
											}}
										>
											<More size={18} />
										</IconButton>
									</TableCell>
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
				onPageChange={(_, newPage) => setPage(newPage)}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
				rowsPerPageOptions={[10, 20, 50, 100]}
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>

			{/* Context Menu */}
			<Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
				<MenuItem onClick={() => menuTask && handleEditTask(menuTask)}>
					<ListItemIcon><Edit2 size={18} /></ListItemIcon>
					<ListItemText>Editar</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleStatusChange(menuTask, "completed")}>
					<ListItemIcon><TickCircle size={18} /></ListItemIcon>
					<ListItemText>Completar</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleTogglePin(menuTask)}>
					<ListItemIcon><Flag size={18} /></ListItemIcon>
					<ListItemText>{menuTask?.isPinned ? "Desfijar" : "Fijar"}</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleToggleArchive(menuTask)}>
					<ListItemIcon>{menuTask?.isArchived ? <ArchiveSlash size={18} /> : <Archive size={18} />}</ListItemIcon>
					<ListItemText>{menuTask?.isArchived ? "Desarchivar" : "Archivar"}</ListItemText>
				</MenuItem>
				<Divider />
				<MenuItem onClick={() => menuTask && handleDeleteClick(menuTask)} sx={{ color: "error.main" }}>
					<ListItemIcon><Trash size={18} color={theme.palette.error.main} /></ListItemIcon>
					<ListItemText>Eliminar</ListItemText>
				</MenuItem>
			</Menu>

			{/* Task Form Dialog */}
			<TaskFormDialog
				open={formOpen}
				task={editingTask}
				filterOptions={filterOptions}
				onClose={() => setFormOpen(false)}
				onSave={handleSaveTask}
			/>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
				<DialogTitle>Confirmar eliminación</DialogTitle>
				<DialogContent>
					<Typography>
						¿Estás seguro de que deseas eliminar la tarea "{taskToDelete?.title}"?
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
					<Button color="error" variant="contained" onClick={handleDeleteConfirm}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default AdminTasks;
