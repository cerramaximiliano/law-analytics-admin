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
	Menu,
	ListItemIcon,
	ListItemText,
	Skeleton,
	useTheme,
	alpha,
	Divider,
	LinearProgress,
	Autocomplete,
	Tooltip,
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
	Calendar,
	TaskSquare,
	Refresh,
	Code1,
	MagicStar,
	Eye,
} from "iconsax-react";
import MainCard from "components/MainCard";
import AdminTasksService from "api/adminTasks";
import useAuth from "hooks/useAuth";
import { ECOSYSTEM_REPO_NAMES, repoGroup } from "utils/ecosystemRepos";
import TaskFormDialog from "./TaskFormDialog";
import TaskDetailDrawer from "./TaskDetailDrawer";
import {
	AdminTask,
	TaskStatus,
	TaskPriority,
	TaskStats,
	TaskFilterOptions,
	CreateTaskRequest,
	STATUS_LABELS,
	PRIORITY_LABELS,
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
				border: `1px solid ${alpha(color, 0.18)}`,
				transition: "transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease",
				"&:hover": {
					transform: "translateY(-1px)",
					borderColor: alpha(color, 0.34),
					boxShadow: `0 6px 14px ${alpha(color, 0.08)}`,
				},
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
				<Box
					sx={{
						p: 1,
						borderRadius: "10px",
						bgcolor: alpha(color, 0.1),
						color: color,
						display: "flex",
					}}
				>
					{icon}
				</Box>
				<Box>
					<Typography variant="caption" color="textSecondary" sx={{ letterSpacing: 0.3 }}>
						{label}
					</Typography>
					{loading ? (
						<Skeleton variant="text" width={40} height={28} />
					) : (
						<Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
							{value}
						</Typography>
					)}
				</Box>
			</Box>
		</Paper>
	);
};

// Main Component
const AdminTasks: React.FC = () => {
	const theme = useTheme();
	const { user } = useAuth();

	// State
	const [tasks, setTasks] = useState<AdminTask[]>([]);
	const [stats, setStats] = useState<TaskStats | null>(null);
	const [filterOptions, setFilterOptions] = useState<TaskFilterOptions | null>(null);
	const [loading, setLoading] = useState(true);
	const [statsLoading, setStatsLoading] = useState(true);

	// Pagination & Sorting
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [total, setTotal] = useState(0);
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Filters
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [priorityFilter, setPriorityFilter] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [repoFilter, setRepoFilter] = useState<string>("");
	const [aiOnly, setAiOnly] = useState(false);

	// Selection
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Panel de detalle (solo lectura)
	const [detailTask, setDetailTask] = useState<AdminTask | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

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
				repo: repoFilter || undefined,
				hasAi: aiOnly || undefined,
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
	}, [page, rowsPerPage, search, statusFilter, priorityFilter, categoryFilter, repoFilter, aiOnly, sortBy, sortOrder]);

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

	const handleOpenDetail = (task: AdminTask) => {
		setDetailTask(task);
		setDetailOpen(true);
		setMenuAnchor(null);
	};

	const handleCreateTask = () => {
		setEditingTask(null);
		setFormOpen(true);
	};

	const handleEditTask = (task: AdminTask) => {
		setEditingTask(task);
		setFormOpen(true);
		setMenuAnchor(null);
		setDetailOpen(false);
	};

	const handleSaveTask = async (data: CreateTaskRequest) => {
		if (editingTask) {
			await AdminTasksService.updateTask(editingTask._id, data);
		} else {
			await AdminTasksService.createTask({ ...data, createdBy: user?.email || undefined });
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
		<MainCard title="Tareas administrativas" content={false}>
			{/* Stats Cards */}
			<Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
				<Grid container spacing={2}>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							label="Total"
							value={stats?.total || 0}
							icon={<TaskSquare size={20} />}
							color={theme.palette.primary.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							label="Pendientes"
							value={stats?.statusCounts?.todo || 0}
							icon={<Clock size={20} />}
							color={theme.palette.info.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							label="En Progreso"
							value={stats?.statusCounts?.in_progress || 0}
							icon={<Flag size={20} />}
							color={theme.palette.warning.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							label="Completadas"
							value={stats?.statusCounts?.completed || 0}
							icon={<TickCircle size={20} />}
							color={theme.palette.success.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							label="Vencidas"
							value={stats?.overdue || 0}
							icon={<Warning2 size={20} />}
							color={theme.palette.error.main}
							loading={statsLoading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							label="Esta Semana"
							value={stats?.completedThisWeek || 0}
							icon={<Calendar size={20} />}
							color={theme.palette.secondary.main}
							loading={statsLoading}
						/>
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
					<Select
						value={statusFilter}
						label="Estado"
						onChange={(e) => {
							setStatusFilter(e.target.value);
							setPage(0);
						}}
					>
						<MenuItem value="">Todos</MenuItem>
						{filterOptions?.statuses.map((s) => (
							<MenuItem key={s} value={s}>
								{STATUS_LABELS[s]}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Prioridad</InputLabel>
					<Select
						value={priorityFilter}
						label="Prioridad"
						onChange={(e) => {
							setPriorityFilter(e.target.value);
							setPage(0);
						}}
					>
						<MenuItem value="">Todas</MenuItem>
						{filterOptions?.priorities.map((p) => (
							<MenuItem key={p} value={p}>
								{PRIORITY_LABELS[p]}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Categoría</InputLabel>
					<Select
						value={categoryFilter}
						label="Categoría"
						onChange={(e) => {
							setCategoryFilter(e.target.value);
							setPage(0);
						}}
					>
						<MenuItem value="">Todas</MenuItem>
						{filterOptions?.categories.map((c) => (
							<MenuItem key={c} value={c}>
								{CATEGORY_LABELS[c]}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<Autocomplete
					size="small"
					sx={{ minWidth: 190 }}
					options={ECOSYSTEM_REPO_NAMES}
					groupBy={repoGroup}
					value={repoFilter || null}
					onChange={(_, value) => {
						setRepoFilter(value || "");
						setPage(0);
					}}
					renderInput={(params) => <TextField {...params} label="Repositorio" />}
				/>

				<Chip
					icon={<MagicStar size={16} />}
					label="Con IA"
					clickable
					color={aiOnly ? "primary" : "default"}
					variant={aiOnly ? "filled" : "outlined"}
					onClick={() => {
						setAiOnly((v) => !v);
						setPage(0);
					}}
					aria-pressed={aiOnly}
				/>

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

				<IconButton
					onClick={() => {
						fetchTasks();
						fetchStats();
					}}
				>
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
								<TableSortLabel
									active={sortBy === "title"}
									direction={sortBy === "title" ? sortOrder : "asc"}
									onClick={() => handleSort("title")}
								>
									Tarea
								</TableSortLabel>
							</TableCell>
							<TableCell>
								<TableSortLabel
									active={sortBy === "status"}
									direction={sortBy === "status" ? sortOrder : "asc"}
									onClick={() => handleSort("status")}
								>
									Estado
								</TableSortLabel>
							</TableCell>
							<TableCell>
								<TableSortLabel
									active={sortBy === "priority"}
									direction={sortBy === "priority" ? sortOrder : "asc"}
									onClick={() => handleSort("priority")}
								>
									Prioridad
								</TableSortLabel>
							</TableCell>
							<TableCell>Categoría</TableCell>
							<TableCell>
								<TableSortLabel
									active={sortBy === "dueDate"}
									direction={sortBy === "dueDate" ? sortOrder : "asc"}
									onClick={() => handleSort("dueDate")}
								>
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
										<TableCell key={j}>
											<Skeleton variant="text" />
										</TableCell>
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
								<TableRow
									key={task._id}
									hover
									selected={selectedIds.includes(task._id)}
									onClick={() => handleOpenDetail(task)}
									sx={{ cursor: "pointer" }}
								>
									<TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
										<Checkbox checked={selectedIds.includes(task._id)} onChange={(e) => handleSelectOne(task._id, e.target.checked)} />
									</TableCell>
									<TableCell>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
											{task.isPinned && <Flag size={14} color={theme.palette.warning.main} />}
											<Box sx={{ minWidth: 0 }}>
												<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
													<Typography
														variant="body2"
														fontWeight="medium"
														sx={{ textDecoration: task.status === "completed" ? "line-through" : "none" }}
													>
														{task.title}
													</Typography>
													{(task.aiContext?.prompt || task.aiContext?.sessions?.length) && (
														<Tooltip title="Tiene prompt o sesiones de IA">
															<Box component="span" sx={{ display: "inline-flex", color: "primary.main" }}>
																<MagicStar size={14} />
															</Box>
														</Tooltip>
													)}
												</Box>
												{task.description && (
													<Typography
														variant="caption"
														color="textSecondary"
														sx={{
															display: "-webkit-box",
															WebkitLineClamp: 2,
															WebkitBoxOrient: "vertical",
															overflow: "hidden",
															maxWidth: 420,
														}}
													>
														{task.description}
													</Typography>
												)}
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 0.5,
														flexWrap: "wrap",
														mt: task.repos?.length || task.project ? 0.5 : 0,
													}}
												>
													{task.project && (
														<Typography variant="caption" color="textSecondary" sx={{ mr: 0.5 }}>
															{task.project}
														</Typography>
													)}
													{task.repos?.slice(0, 2).map((repo) => (
														<Chip
															key={repo}
															size="small"
															variant="outlined"
															icon={<Code1 size={12} />}
															label={repo}
															sx={{ height: 20, fontSize: "0.7rem" }}
														/>
													))}
													{(task.repos?.length || 0) > 2 && (
														<Tooltip title={task.repos!.slice(2).join(", ")}>
															<Chip size="small" label={`+${task.repos!.length - 2}`} sx={{ height: 20, fontSize: "0.7rem" }} />
														</Tooltip>
													)}
												</Box>
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
											<Typography variant="body2" color="textSecondary">
												-
											</Typography>
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
									<TableCell align="right" onClick={(e) => e.stopPropagation()}>
										<IconButton
											size="small"
											aria-label="Acciones de la tarea"
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
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 20, 50, 100]}
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>

			{/* Context Menu */}
			<Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
				<MenuItem onClick={() => menuTask && handleOpenDetail(menuTask)}>
					<ListItemIcon>
						<Eye size={18} />
					</ListItemIcon>
					<ListItemText>Ver detalle</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleEditTask(menuTask)}>
					<ListItemIcon>
						<Edit2 size={18} />
					</ListItemIcon>
					<ListItemText>Editar</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleStatusChange(menuTask, "completed")}>
					<ListItemIcon>
						<TickCircle size={18} />
					</ListItemIcon>
					<ListItemText>Completar</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleTogglePin(menuTask)}>
					<ListItemIcon>
						<Flag size={18} />
					</ListItemIcon>
					<ListItemText>{menuTask?.isPinned ? "Desfijar" : "Fijar"}</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => menuTask && handleToggleArchive(menuTask)}>
					<ListItemIcon>{menuTask?.isArchived ? <ArchiveSlash size={18} /> : <Archive size={18} />}</ListItemIcon>
					<ListItemText>{menuTask?.isArchived ? "Desarchivar" : "Archivar"}</ListItemText>
				</MenuItem>
				<Divider />
				<MenuItem onClick={() => menuTask && handleDeleteClick(menuTask)} sx={{ color: "error.main" }}>
					<ListItemIcon>
						<Trash size={18} color={theme.palette.error.main} />
					</ListItemIcon>
					<ListItemText>Eliminar</ListItemText>
				</MenuItem>
			</Menu>

			{/* Detalle de solo lectura */}
			<TaskDetailDrawer
				open={detailOpen}
				task={detailTask}
				currentUser={user?.email}
				getStatusColor={getStatusColor}
				getPriorityColor={getPriorityColor}
				onClose={() => setDetailOpen(false)}
				onEdit={handleEditTask}
				onChanged={() => {
					fetchTasks();
					fetchStats();
				}}
			/>

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
					<Typography>¿Estás seguro de que deseas eliminar la tarea "{taskToDelete?.title}"?</Typography>
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
