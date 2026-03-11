import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
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
	TablePagination,
	Paper,
	Chip,
	TextField,
	MenuItem,
	Stack,
	Card,
	CardContent,
	Skeleton,
	Alert,
	InputAdornment,
	Avatar,
	Select,
	FormControl,
	InputLabel,
} from "@mui/material";
import { Refresh, SearchNormal1, Eye, People, Crown1, TickCircle, Warning2, Archive, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import GroupsService, { Group, GroupStats, GroupFilters } from "api/groups";
import GroupDetailModal from "./GroupDetailModal";

// ====================================
// HELPERS
// ====================================

const STATUS_CHIP: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
	active: { color: "success", label: "Activo" },
	suspended: { color: "warning", label: "Suspendido" },
	archived: { color: "default", label: "Archivado" },
	deleted: { color: "error", label: "Eliminado" },
};

const PLAN_CHIP: Record<string, { color: "default" | "primary" | "warning"; label: string }> = {
	free: { color: "default", label: "Free" },
	standard: { color: "primary", label: "Standard" },
	premium: { color: "warning", label: "Premium" },
};

const getUserFullName = (user?: { firstName?: string; lastName?: string; email?: string } | null) => {
	if (!user) return "—";
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
	return name || user.email || "—";
};

// ====================================
// STAT CARD
// ====================================

interface StatCardProps {
	title: string;
	value: number | string;
	subtitle?: string;
	loading?: boolean;
	icon?: React.ReactNode;
	color?: string;
}

function StatCard({ title, value, subtitle, loading, icon, color }: StatCardProps) {
	const theme = useTheme();

	return (
		<Card variant="outlined">
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="caption" color="text.secondary">{title}</Typography>
						{loading ? (
							<Skeleton width={60} height={40} />
						) : (
							<Typography variant="h4" fontWeight={700} color={color ?? "text.primary"}>{value}</Typography>
						)}
						{subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
					</Box>
					{icon && (
						<Box sx={{ p: 1, borderRadius: 2, bgcolor: theme.palette.grey[100] }}>
							{icon}
						</Box>
					)}
				</Stack>
			</CardContent>
		</Card>
	);
}

// ====================================
// MAIN PAGE
// ====================================

export default function GroupsPage() {
	const { enqueueSnackbar } = useSnackbar();

	// Data
	const [groups, setGroups] = useState<Group[]>([]);
	const [stats, setStats] = useState<GroupStats | null>(null);
	const [total, setTotal] = useState(0);

	// Loading states
	const [loadingGroups, setLoadingGroups] = useState(false);
	const [loadingStats, setLoadingStats] = useState(false);

	// Filters
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [statusFilter, setStatusFilter] = useState("");

	// Modal
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState(false);

	// ---- Data fetching ----

	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const res = await GroupsService.getStats();
			setStats(res.data);
		} catch {
			// stats are non-critical
		} finally {
			setLoadingStats(false);
		}
	}, []);

	const fetchGroups = useCallback(async () => {
		setLoadingGroups(true);
		try {
			const filters: GroupFilters = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy: "createdAt",
				sortOrder: "desc",
			};
			if (search) filters.search = search;
			if (statusFilter) filters.status = statusFilter;

			const res = await GroupsService.getGroups(filters);
			setGroups(res.data.groups);
			setTotal(res.data.pagination.total);
		} catch {
			enqueueSnackbar("Error al cargar grupos", { variant: "error" });
		} finally {
			setLoadingGroups(false);
		}
	}, [page, rowsPerPage, search, statusFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchGroups();
	}, [fetchGroups]);

	// ---- Handlers ----

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearch(searchInput);
		setPage(0);
	};

	const handleClearSearch = () => {
		setSearchInput("");
		setSearch("");
		setPage(0);
	};

	const handleOpenModal = (groupId: string) => {
		setSelectedGroupId(groupId);
		setModalOpen(true);
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setSelectedGroupId(null);
	};

	const handleStatusChanged = () => {
		fetchGroups();
		fetchStats();
	};

	// ---- Render ----

	return (
		<MainCard title="Grupos de Usuarios">
			{/* Stats */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={6} sm={3}>
					<StatCard
						title="Total grupos"
						value={stats?.total ?? 0}
						loading={loadingStats}
						icon={<People size={20} />}
					/>
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard
						title="Activos"
						value={stats?.byStatus.active ?? 0}
						loading={loadingStats}
						color="success.main"
						icon={<TickCircle size={20} />}
					/>
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard
						title="Suspendidos"
						value={stats?.byStatus.suspended ?? 0}
						loading={loadingStats}
						color="warning.main"
						icon={<Warning2 size={20} />}
					/>
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard
						title="Miembros totales"
						value={stats?.members.total ?? 0}
						subtitle={stats ? `Promedio: ${stats.members.average}` : undefined}
						loading={loadingStats}
						icon={<Crown1 size={20} />}
					/>
				</Grid>
			</Grid>

			{/* Filters */}
			<Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
				<Box component="form" onSubmit={handleSearch} sx={{ flex: 1, display: "flex", gap: 1 }}>
					<TextField
						size="small"
						placeholder="Buscar por nombre o email del owner..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchNormal1 size={16} />
								</InputAdornment>
							),
						}}
						sx={{ flex: 1 }}
					/>
					{search && (
						<Tooltip title="Limpiar búsqueda">
							<IconButton size="small" onClick={handleClearSearch}>
								<SearchNormal1 size={16} />
							</IconButton>
						</Tooltip>
					)}
				</Box>

				<FormControl size="small" sx={{ minWidth: 160 }}>
					<InputLabel>Estado</InputLabel>
					<Select
						value={statusFilter}
						label="Estado"
						onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
					>
						<MenuItem value="">Todos</MenuItem>
						<MenuItem value="active">Activo</MenuItem>
						<MenuItem value="suspended">Suspendido</MenuItem>
						<MenuItem value="archived">Archivado</MenuItem>
						<MenuItem value="deleted">Eliminado</MenuItem>
					</Select>
				</FormControl>

				<Tooltip title="Actualizar">
					<IconButton onClick={() => { fetchGroups(); fetchStats(); }} disabled={loadingGroups}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* Table */}
			{loadingGroups ? (
				<Stack spacing={1}>
					{[...Array(5)].map((_, i) => <Skeleton key={i} height={52} variant="rounded" />)}
				</Stack>
			) : groups.length === 0 ? (
				<Alert severity="info">No se encontraron grupos con los filtros seleccionados</Alert>
			) : (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Grupo</TableCell>
								<TableCell>Owner</TableCell>
								<TableCell>Plan</TableCell>
								<TableCell align="center">Miembros</TableCell>
								<TableCell align="center">Invit. pend.</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Creado</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{groups.map((group) => {
								const ownerPlan = group.owner?.subscriptionPlan ?? "free";
								const planConfig = PLAN_CHIP[ownerPlan] ?? { color: "default" as const, label: ownerPlan };
								const statusConfig = STATUS_CHIP[group.status] ?? { color: "default" as const, label: group.status };

								return (
									<TableRow key={group._id} hover>
										<TableCell>
											<Stack direction="row" spacing={1} alignItems="center">
												<Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: "primary.main" }}>
													{group.name.charAt(0).toUpperCase()}
												</Avatar>
												<Box>
													<Typography variant="body2" fontWeight={500}>{group.name}</Typography>
													{group.description && (
														<Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180, display: "block" }}>
															{group.description}
														</Typography>
													)}
												</Box>
											</Stack>
										</TableCell>
										<TableCell>
											<Box>
												<Typography variant="body2">{getUserFullName(group.owner)}</Typography>
												<Typography variant="caption" color="text.secondary">{group.owner?.email}</Typography>
											</Box>
										</TableCell>
										<TableCell>
											<Chip size="small" label={planConfig.label} color={planConfig.color} variant="outlined" />
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
												<People size={14} />
												<Typography variant="body2">{group.totalMemberCount} / {group.memberLimit ?? "—"}</Typography>
											</Stack>
										</TableCell>
										<TableCell align="center">
											<Typography variant="body2" color={group.pendingInvitationsCount > 0 ? "warning.main" : "text.secondary"}>
												{group.pendingInvitationsCount}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip size="small" label={statusConfig.label} color={statusConfig.color} />
										</TableCell>
										<TableCell>
											<Typography variant="caption">
												{new Date(group.createdAt).toLocaleDateString("es-AR")}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Tooltip title="Ver detalle">
												<IconButton size="small" onClick={() => handleOpenModal(group._id)}>
													<Eye size={16} />
												</IconButton>
											</Tooltip>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={(_, p) => setPage(p)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Filas:"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				</TableContainer>
			)}

			{/* Modal */}
			<GroupDetailModal
				open={modalOpen}
				onClose={handleCloseModal}
				groupId={selectedGroupId}
				onStatusChanged={handleStatusChanged}
			/>
		</MainCard>
	);
}
