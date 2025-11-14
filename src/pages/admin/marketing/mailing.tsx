import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

// material-ui
import {
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	Chip,
	Divider,
	Grid,
	IconButton,
	InputAdornment,
	MenuItem,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	useTheme,
	Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// project imports
import MainCard from "components/MainCard";
import { Add, Edit2, SearchNormal1, Trash, MessageText1, People, Refresh } from "iconsax-react";
import CampaignFormModal from "sections/admin/marketing/CampaignFormModal";
import DeleteCampaignDialog from "sections/admin/marketing/DeleteCampaignDialog";
import CampaignEmailList from "sections/admin/marketing/CampaignEmailList";
import CampaignContactsList from "sections/admin/marketing/CampaignContactsList";
import CampaignDetailModal from "sections/admin/marketing/CampaignDetailModal";
import TableSkeleton from "components/UI/TableSkeleton";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";
import { useRequestQueueRefresh } from "hooks/useRequestQueueRefresh";

// types
import { Campaign, CampaignStatus, CampaignType } from "types/campaign";
import { CampaignService } from "store/reducers/campaign";

// Server Status Types
interface ServiceStatus {
	name: string;
	url: string;
	ip: string;
	baseUrl: string;
	status: "online" | "offline" | "checking";
	timestamp?: string;
	message?: string;
}

// Styled components
const StatusIndicator = styled(Box)<{ status: "online" | "offline" | "checking" }>(({ theme, status }) => ({
	width: 12,
	height: 12,
	borderRadius: "50%",
	backgroundColor:
		status === "online" ? theme.palette.success.main : status === "offline" ? theme.palette.error.main : theme.palette.warning.main,
	marginRight: theme.spacing(1),
	animation: status === "checking" ? "pulse 1.5s infinite" : "none",
	"@keyframes pulse": {
		"0%": {
			opacity: 1,
		},
		"50%": {
			opacity: 0.4,
		},
		"100%": {
			opacity: 1,
		},
	},
}));

// ==============================|| ADMIN - MAILING CAMPAIGNS ||============================== //

const MailingCampaigns = () => {
	const theme = useTheme();

	// State for campaigns data
	const [campaigns, setCampaigns] = useState<Campaign[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [filterType, setFilterType] = useState<string>("");
	const [filterStatus, setFilterStatus] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("createdAt");
	const [sortDir, setSortDir] = useState<string>("desc");

	// Use ref to track if initial load has been done
	const hasInitialLoad = useRef(false);

	// State for modals
	const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
	const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
	const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
	const [emailListOpen, setEmailListOpen] = useState<boolean>(false);
	const [contactsListOpen, setContactsListOpen] = useState<boolean>(false);
	const [campaignDetailOpen, setCampaignDetailOpen] = useState<boolean>(false);
	const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

	// State for pagination
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// Campaign statistics
	const [stats, setStats] = useState({
		totalCampaigns: 0,
		averageOpenRate: 0,
		totalContacts: 0,
		statusCounts: {
			draft: 0,
			active: 0,
			paused: 0,
			completed: 0,
			archived: 0,
		},
	});

	// Server status state
	const [serverStatus, setServerStatus] = useState<ServiceStatus>({
		name: "Servidor de Marketing",
		url: "https://mkt.lawanalytics.app",
		ip: "15.229.93.121",
		baseUrl: "https://mkt.lawanalytics.app",
		status: "checking",
	});
	const [checkingStatus, setCheckingStatus] = useState(false);

	// Check server status
	const checkServerStatus = useCallback(async () => {
		setCheckingStatus(true);
		setServerStatus((prev) => ({ ...prev, status: "checking" }));

		const serverUrl = "https://mkt.lawanalytics.app";

		try {
			const response = await fetch(serverUrl, {
				method: "GET",
				mode: "cors",
				headers: {
					Accept: "application/json",
				},
			});

			if (response.ok) {
				try {
					const data = await response.json();
					setServerStatus((prev) => ({
						...prev,
						status: "online",
						timestamp: data.timestamp || new Date().toISOString(),
						message: data.message,
					}));
				} catch {
					setServerStatus((prev) => ({
						...prev,
						status: "online",
						timestamp: new Date().toISOString(),
						message: "Respuesta exitosa (no JSON)",
					}));
				}
			} else {
				setServerStatus((prev) => ({
					...prev,
					status: "offline",
					timestamp: new Date().toISOString(),
				}));
			}
		} catch (error) {
			// Si es un error de CORS, asumir que está online
			if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
				setServerStatus((prev) => ({
					...prev,
					status: "online",
					timestamp: new Date().toISOString(),
					message: "CORS restrictivo - Estado verificado externamente",
				}));
			} else {
				setServerStatus((prev) => ({
					...prev,
					status: "offline",
					timestamp: new Date().toISOString(),
					message: error instanceof Error ? error.message : "Error desconocido",
				}));
			}
		} finally {
			setCheckingStatus(false);
		}
	}, []);

	// Initial mount effect
	useEffect(() => {
		fetchCampaigns();
		fetchStats();
		checkServerStatus();

		// Set up periodic server status check
		const interval = setInterval(checkServerStatus, 60000); // Check every minute
		return () => {
			clearInterval(interval);
		};
	}, []); // Only on mount

	// Filter/pagination change effect
	useEffect(() => {
		if (hasInitialLoad.current) {
			fetchCampaigns();
			fetchStats();
		} else {
			hasInitialLoad.current = true;
		}
	}, [page, rowsPerPage, filterType, filterStatus, sortBy, sortDir]);

	// Refresh server status when processing queued requests
	useRequestQueueRefresh(() => {
		checkServerStatus();
	}, [checkServerStatus]);

	// Function to fetch campaigns from API
	const fetchCampaigns = async () => {
		try {
			setLoading(true);
			setError(null);

			// Build filter object
			const filters: Record<string, any> = {};
			if (searchTerm) filters.search = searchTerm;
			if (filterType) filters.type = filterType;
			if (filterStatus) filters.status = filterStatus;

			const response = await CampaignService.getCampaigns(page + 1, rowsPerPage, filters, sortBy, sortDir);
			setCampaigns(response.data || []);
			// Use pagination.total if available, otherwise fallback to legacy total
			const totalRecords = response.pagination?.total ?? response.total ?? 0;
			setTotalCount(totalRecords);
		} catch (err) {
			setError("Error al cargar las campañas. Por favor, intente de nuevo más tarde.");
		} finally {
			setLoading(false);
		}
	};

	// Fetch campaign statistics
	const fetchStats = async () => {
		try {
			const response = await CampaignService.getCampaignStats();
			setStats({
				totalCampaigns: response.totalCampaigns || 0,
				averageOpenRate: response.averageOpenRate || 0,
				totalContacts: response.totalContacts || 0,
				statusCounts: response.statusCounts || {
					draft: 0,
					active: 0,
					paused: 0,
					completed: 0,
					archived: 0,
				},
			});
		} catch (error) {}
	};

	// Pagination handlers
	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Search handler
	const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	// Apply search filter
	const handleApplySearch = () => {
		setPage(0);
		fetchCampaigns();
	};

	// Filter handlers
	const handleTypeFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilterType(event.target.value);
		setPage(0);
	};

	const handleStatusFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilterStatus(event.target.value);
		setPage(0);
	};

	// Sorting handlers
	const handleSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSortBy(event.target.value);
	};

	const handleSortDirChange = () => {
		setSortDir(sortDir === "asc" ? "desc" : "asc");
	};

	// Modal handlers
	const handleOpenCreateModal = () => {
		setCreateModalOpen(true);
	};

	const handleCloseCreateModal = () => {
		setCreateModalOpen(false);
	};

	const handleOpenEditModal = (campaign: Campaign) => {
		setSelectedCampaign(campaign);
		setEditModalOpen(true);
	};

	const handleCloseEditModal = () => {
		setSelectedCampaign(null);
		setEditModalOpen(false);
	};

	const handleOpenDeleteDialog = (campaign: Campaign) => {
		setSelectedCampaign(campaign);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setSelectedCampaign(null);
		setDeleteDialogOpen(false);
	};

	// Email list modal handlers
	const handleOpenEmailList = (campaign: Campaign) => {
		setSelectedCampaign(campaign);
		setEmailListOpen(true);
	};

	const handleCloseEmailList = () => {
		setEmailListOpen(false);
	};

	// Contacts list modal handlers
	const handleOpenContactsList = (campaign: Campaign) => {
		setSelectedCampaign(campaign);
		setContactsListOpen(true);
	};

	const handleCloseContactsList = () => {
		setContactsListOpen(false);
	};

	// Campaign detail modal handlers
	const handleOpenCampaignDetail = (campaign: Campaign) => {
		// Asegurarnos de que _id no sea undefined antes de asignarlo
		if (campaign._id) {
			setSelectedCampaignId(campaign._id);
			setCampaignDetailOpen(true);
		} else {
		}
	};

	const handleCloseCampaignDetail = () => {
		setSelectedCampaignId(null);
		setCampaignDetailOpen(false);
	};

	// Success handlers
	const handleCampaignCreated = () => {
		setCreateModalOpen(false);
		// Refresh campaigns and stats
		fetchCampaigns();
		fetchStats();
	};

	const handleCampaignUpdated = () => {
		setEditModalOpen(false);
		setSelectedCampaign(null);
		// Refresh campaigns and stats
		fetchCampaigns();
		fetchStats();
	};

	const handleCampaignDeleted = () => {
		setDeleteDialogOpen(false);
		setSelectedCampaign(null);
		// Refresh campaigns and stats
		fetchCampaigns();
		fetchStats();
	};

	// Status chip color mapping
	const getStatusColor = (status: CampaignStatus) => {
		switch (status) {
			case "draft":
				return { color: "default", label: "Borrador" };
			case "active":
				return { color: "success", label: "Activa" };
			case "paused":
				return { color: "warning", label: "Pausada" };
			case "completed":
				return { color: "info", label: "Completada" };
			case "archived":
				return { color: "secondary", label: "Archivada" };
			default:
				return { color: "default", label: status };
		}
	};

	// Type label mapping
	const getTypeLabel = (type: CampaignType) => {
		switch (type) {
			case "onetime":
				return "Una vez";
			case "automated":
				return "Automatizada";
			case "sequence":
				return "Secuencia";
			case "recurring":
				return "Recurrente";
			default:
				return type;
		}
	};

	return (
		<MainCard>
			<Box sx={{ mb: 2 }}>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h3">Campañas de Email Marketing</Typography>
					</Grid>
					<Grid item>
						<Button variant="contained" color="primary" startIcon={<Add />} sx={{ textTransform: "none" }} onClick={handleOpenCreateModal}>
							Nueva campaña
						</Button>
					</Grid>
				</Grid>
			</Box>

			{/* Marketing Quick Navigation */}
			<MarketingQuickNav />

			{/* Server Status Alert */}
			<Box sx={{ mb: 2 }}>
				<Alert
					severity={serverStatus.status === "online" ? "success" : serverStatus.status === "offline" ? "error" : "warning"}
					icon={
						<Box display="flex" alignItems="center">
							<StatusIndicator status={serverStatus.status} />
						</Box>
					}
					action={
						<Tooltip title="Verificar estado">
							<IconButton
								size="small"
								onClick={checkServerStatus}
								disabled={checkingStatus}
								sx={{
									animation: checkingStatus ? "spin 1s linear infinite" : "none",
									"@keyframes spin": {
										"0%": {
											transform: "rotate(0deg)",
										},
										"100%": {
											transform: "rotate(360deg)",
										},
									},
								}}
							>
								<Refresh size={16} />
							</IconButton>
						</Tooltip>
					}
				>
					<Box>
						<Typography variant="subtitle2" fontWeight="bold">
							{serverStatus.name}
						</Typography>
						<Typography variant="body2">
							Estado:{" "}
							{serverStatus.status === "online" ? "En línea" : serverStatus.status === "offline" ? "Fuera de línea" : "Verificando..."}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{serverStatus.baseUrl} • IP: {serverStatus.ip}
						</Typography>
						{serverStatus.message && (
							<Typography variant="caption" display="block" sx={{ fontStyle: "italic", mt: 0.5 }}>
								{serverStatus.message}
							</Typography>
						)}
					</Box>
				</Alert>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<MainCard content={false}>
				<Box sx={{ p: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								label="Buscar campaña"
								placeholder="Buscar por nombre"
								size="small"
								value={searchTerm}
								onChange={handleSearch}
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										handleApplySearch();
									}
								}}
								InputProps={{
									endAdornment: (
										<InputAdornment position="end">
											<IconButton onClick={handleApplySearch} edge="end">
												<SearchNormal1 size={18} />
											</IconButton>
										</InputAdornment>
									),
								}}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={8}>
							<Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
								<TextField select size="small" label="Ordenar por" value={sortBy} onChange={handleSortChange} sx={{ minWidth: 120 }}>
									<MenuItem value="name">Nombre</MenuItem>
									<MenuItem value="createdAt">Fecha de creación</MenuItem>
									<MenuItem value="startDate">Fecha de inicio</MenuItem>
									<MenuItem value="status">Estado</MenuItem>
								</TextField>
								<Button variant="outlined" size="small" onClick={handleSortDirChange} sx={{ minWidth: 100, height: 40 }}>
									{sortDir === "asc" ? "Ascendente" : "Descendente"}
								</Button>
								<TextField select size="small" label="Tipo" value={filterType} onChange={handleTypeFilterChange} sx={{ minWidth: 120 }}>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="onetime">Una vez</MenuItem>
									<MenuItem value="automated">Automatizada</MenuItem>
									<MenuItem value="sequence">Secuencia</MenuItem>
									<MenuItem value="recurring">Recurrente</MenuItem>
								</TextField>
								<TextField
									select
									size="small"
									label="Estado"
									value={filterStatus}
									onChange={handleStatusFilterChange}
									sx={{ minWidth: 120 }}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="draft">Borrador</MenuItem>
									<MenuItem value="active">Activa</MenuItem>
									<MenuItem value="paused">Pausada</MenuItem>
									<MenuItem value="completed">Completada</MenuItem>
									<MenuItem value="archived">Archivada</MenuItem>
								</TextField>
							</Stack>
						</Grid>
					</Grid>
				</Box>
				<Divider />

				<TableContainer component={Paper} sx={{ boxShadow: "none" }}>
					<Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
						<TableHead>
							<TableRow>
								<TableCell>Nombre</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Categoría</TableCell>
								<TableCell align="right">Contactos</TableCell>
								<TableCell align="right">Emails</TableCell>
								<TableCell align="right">Tasa apertura</TableCell>
								<TableCell align="right">Fecha inicio</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								<TableSkeleton columns={9} rows={10} />
							) : campaigns.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9} align="center" sx={{ py: 3 }}>
										<Typography variant="subtitle1">No hay campañas disponibles</Typography>
									</TableCell>
								</TableRow>
							) : (
								campaigns.map((campaign) => {
									const statusInfo = getStatusColor(campaign.status);
									const typeLabel = getTypeLabel(campaign.type);
									const openRate =
										campaign.metrics?.opens > 0 && campaign.metrics?.totalEmailsSent > 0
											? ((campaign.metrics.opens / campaign.metrics.totalEmailsSent) * 100).toFixed(1)
											: "0";
									const isEditable = campaign.status !== "completed" && campaign.status !== "archived";

									return (
										<TableRow hover key={campaign._id} tabIndex={-1}>
											<TableCell>
												<Typography variant="subtitle2">{campaign.name}</Typography>
												{campaign.description && (
													<Typography variant="caption" color="textSecondary">
														{campaign.description.length > 50 ? `${campaign.description.substring(0, 50)}...` : campaign.description}
													</Typography>
												)}
											</TableCell>
											<TableCell>{typeLabel}</TableCell>
											<TableCell>
												<Chip label={statusInfo.label} color={statusInfo.color as any} size="small" />
											</TableCell>
											<TableCell>{campaign.category || "-"}</TableCell>
											<TableCell align="right">{campaign.metrics?.totalContacts || 0}</TableCell>
											<TableCell align="right">{campaign.metrics?.emailCount || 0}</TableCell>
											<TableCell align="right">{`${openRate}%`}</TableCell>
											<TableCell align="right">{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : "-"}</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={1} justifyContent="center">
													<Tooltip title="Gestionar emails">
														<IconButton
															aria-label="emails"
															size="small"
															color="secondary"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenEmailList(campaign);
															}}
														>
															<MessageText1 size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Gestionar contactos">
														<IconButton
															aria-label="contacts"
															size="small"
															color="info"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenContactsList(campaign);
															}}
														>
															<People size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Ver detalles">
														<IconButton
															aria-label="detalles"
															size="small"
															color="primary"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenCampaignDetail(campaign);
															}}
														>
															<SearchNormal1 size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Editar campaña">
														<IconButton
															aria-label="editar"
															size="small"
															color="primary"
															disabled={!isEditable}
															onClick={(e) => {
																e.stopPropagation();
																handleOpenEditModal(campaign);
															}}
														>
															<Edit2 size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Eliminar campaña">
														<IconButton
															aria-label="eliminar"
															size="small"
															color="error"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenDeleteDialog(campaign);
															}}
														>
															<Trash size={18} />
														</IconButton>
													</Tooltip>
												</Stack>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</TableContainer>

				<TablePagination
					rowsPerPageOptions={[5, 10, 25, 50, 100]}
					component="div"
					count={totalCount}
					rowsPerPage={rowsPerPage}
					page={page}
					onPageChange={handleChangePage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					labelRowsPerPage="Filas por página:"
					labelDisplayedRows={({ from, to, count, page }) => {
						const totalPages = Math.ceil(count / rowsPerPage);
						const currentPage = page + 1;
						return `Página ${currentPage} de ${totalPages} (${from}-${to} de ${count})`;
					}}
				/>
			</MainCard>

			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mt: 2 }}>
				<Grid item xs={12} md={6} lg={4}>
					<Card>
						<CardHeader title="Estadísticas de campañas" />
						<CardContent>
							<Stack spacing={2}>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Total de campañas
									</Typography>
									<Typography variant="h4">{stats.totalCampaigns}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Tasa de apertura promedio
									</Typography>
									<Typography variant="h4">{`${stats.averageOpenRate.toFixed(1)}%`}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Contactos totales
									</Typography>
									<Typography variant="h4">{stats.totalContacts}</Typography>
								</Box>
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				<Grid item xs={12} md={6} lg={8}>
					<Card>
						<CardHeader title="Estado de campañas" />
						<CardContent>
							<Grid container spacing={2}>
								{(["draft", "active", "paused", "completed", "archived"] as CampaignStatus[]).map((status) => {
									const count = stats.statusCounts[status] || 0;
									const statusInfo = getStatusColor(status);

									return (
										<Grid item xs={6} sm={2.4} key={status}>
											<Box
												sx={{
													p: 2.5,
													bgcolor: theme.palette.mode === "dark" ? theme.palette.dark.main : theme.palette.grey[50],
													borderRadius: 2,
													textAlign: "center",
												}}
											>
												<Typography variant="h4">{count}</Typography>
												<Chip label={statusInfo.label} color={statusInfo.color as any} size="small" sx={{ mt: 1 }} />
											</Box>
										</Grid>
									);
								})}
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Campaign Form Modals */}
			<CampaignFormModal open={createModalOpen} onClose={handleCloseCreateModal} onSuccess={handleCampaignCreated} mode="create" />

			<CampaignFormModal
				open={editModalOpen}
				onClose={handleCloseEditModal}
				onSuccess={handleCampaignUpdated}
				campaign={selectedCampaign}
				mode="edit"
			/>

			{/* Delete Confirmation Dialog */}
			<DeleteCampaignDialog
				open={deleteDialogOpen}
				onClose={handleCloseDeleteDialog}
				onSuccess={handleCampaignDeleted}
				campaign={selectedCampaign}
			/>

			{/* Campaign Email List Modal */}
			{selectedCampaign && <CampaignEmailList open={emailListOpen} onClose={handleCloseEmailList} campaign={selectedCampaign} />}

			{/* Campaign Contacts List Modal */}
			{selectedCampaign && (
				<CampaignContactsList
					open={contactsListOpen}
					onClose={handleCloseContactsList}
					campaign={selectedCampaign}
					onContactsChange={() => {
						fetchCampaigns(); // Actualizar la tabla de campañas
						fetchStats(); // Actualizar las estadísticas
					}}
				/>
			)}

			{/* Campaign Detail Modal */}
			<CampaignDetailModal open={campaignDetailOpen} onClose={handleCloseCampaignDetail} campaignId={selectedCampaignId} />
		</MainCard>
	);
};

export default MailingCampaigns;
