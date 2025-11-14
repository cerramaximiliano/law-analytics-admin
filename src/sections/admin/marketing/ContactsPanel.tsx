import React from "react";
import { useState, useEffect } from "react";

// material-ui
import {
	Box,
	Button,
	Chip,
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
	Card,
	CardContent,
	CardHeader,
} from "@mui/material";

// project imports
import TableSkeleton from "components/UI/TableSkeleton";
import ContactDetailModal from "./ContactDetailModal";
import EditContactModal from "./EditContactModal";
import DeleteContactDialog from "./DeleteContactDialog";

// project imports
import { Add, Edit2, SearchNormal1, Trash, Eye } from "iconsax-react";
import { MarketingContact } from "types/marketing-contact";
import { MarketingContactService } from "store/reducers/marketing-contacts";

// ==============================|| CONTACTS PANEL ||============================== //

const ContactsPanel = () => {
	const theme = useTheme();

	// State for contacts data
	const [contacts, setContacts] = useState<MarketingContact[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [filterStatus, setFilterStatus] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("createdAt");
	const [sortDir, setSortDir] = useState<string>("desc");

	// State for pagination
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// State for modals and dialogs
	const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
	const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
	const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
	const [selectedContactName, setSelectedContactName] = useState<string>("");

	// Contact statistics
	const [stats, setStats] = useState({
		totalContacts: 0,
		activeContacts: 0,
		unsubscribedContacts: 0,
		bouncedContacts: 0,
		statusCounts: {
			active: 0,
			unsubscribed: 0,
			bounced: 0,
			inactive: 0,
		},
	});

	// Load contacts on component mount and when dependencies change
	useEffect(() => {
		fetchContacts();
		fetchStats();
	}, [page, rowsPerPage, filterStatus, sortBy, sortDir]);

	// Function to fetch contacts from API
	const fetchContacts = async () => {
		try {
			setLoading(true);
			setError(null);

			// Build filter object
			const filters: Record<string, any> = {};
			if (searchTerm) filters.search = searchTerm;
			if (filterStatus) filters.status = filterStatus;

			const response = await MarketingContactService.getContacts(page + 1, rowsPerPage, sortBy, sortDir, filters);
			setContacts(response.data);
			setTotalCount(response.pagination.total);
		} catch (err) {
			setError("Error al cargar los contactos. Por favor, intente de nuevo más tarde.");
		} finally {
			setLoading(false);
		}
	};

	// Fetch contact statistics
	const fetchStats = async () => {
		try {
			const response = await MarketingContactService.getContactStats();
			setStats({
				totalContacts: response.totalContacts || 0,
				activeContacts: response.activeContacts || 0,
				unsubscribedContacts: response.unsubscribedContacts || 0,
				bouncedContacts: response.bouncedContacts || 0,
				statusCounts: response.statusCounts || {
					active: 0,
					unsubscribed: 0,
					bounced: 0,
					inactive: 0,
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
		fetchContacts();
	};

	// Filter handlers
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

	// Status chip color mapping
	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return { color: "success", label: "Activo" };
			case "unsubscribed":
				return { color: "error", label: "Cancelado" };
			case "bounced":
				return { color: "warning", label: "Rebotado" };
			case "inactive":
				return { color: "default", label: "Inactivo" };
			default:
				return { color: "default", label: status };
		}
	};

	// Handlers for modals and dialogs
	const handleViewContact = (contactId: string) => {
		setSelectedContactId(contactId);
		setViewModalOpen(true);
	};

	const handleEditContact = (contactId: string) => {
		setSelectedContactId(contactId);
		setEditModalOpen(true);
	};

	const handleDeleteContact = (contactId: string, contactName: string) => {
		setSelectedContactId(contactId);
		setSelectedContactName(contactName);
		setDeleteDialogOpen(true);
	};

	const handleRefreshAfterEdit = () => {
		fetchContacts();
		fetchStats();
	};

	return (
		<>
			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<Box sx={{ p: 2 }}>
				<Grid container spacing={2} alignItems="center">
					<Grid item xs={12} sm={6} md={4}>
						<TextField
							fullWidth
							label="Buscar contacto"
							placeholder="Buscar por nombre o email"
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
								<MenuItem value="email">Email</MenuItem>
								<MenuItem value="firstName">Nombre</MenuItem>
								<MenuItem value="lastName">Apellido</MenuItem>
								<MenuItem value="createdAt">Fecha de creación</MenuItem>
								<MenuItem value="status">Estado</MenuItem>
							</TextField>
							<Button variant="outlined" size="small" onClick={handleSortDirChange} sx={{ minWidth: 100, height: 40 }}>
								{sortDir === "asc" ? "Ascendente" : "Descendente"}
							</Button>
							<TextField select size="small" label="Estado" value={filterStatus} onChange={handleStatusFilterChange} sx={{ minWidth: 120 }}>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="active">Activo</MenuItem>
								<MenuItem value="unsubscribed">Cancelado</MenuItem>
								<MenuItem value="bounced">Rebotado</MenuItem>
								<MenuItem value="inactive">Inactivo</MenuItem>
							</TextField>
							<Button
								variant="contained"
								color="primary"
								startIcon={<Add />}
								onClick={() => {
									setSelectedContactId("");
									setEditModalOpen(true);
								}}
								sx={{ textTransform: "none" }}
							>
								Nuevo contacto
							</Button>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			<TableContainer component={Paper} sx={{ boxShadow: "none" }}>
				<Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
					<TableHead>
						<TableRow>
							<TableCell>Email</TableCell>
							<TableCell>Nombre</TableCell>
							<TableCell>Apellido</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell>Fuente</TableCell>
							<TableCell>Campañas</TableCell>
							<TableCell>Segmentos</TableCell>
							<TableCell>Fecha registro</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableSkeleton columns={9} rows={10} />
						) : contacts.length === 0 ? (
							<TableRow>
								<TableCell colSpan={9} align="center" sx={{ py: 3 }}>
									<Typography variant="subtitle1">No hay contactos disponibles</Typography>
								</TableCell>
							</TableRow>
						) : (
							contacts.map((contact) => {
								const statusInfo = getStatusColor(contact.status || "");

								return (
									<TableRow hover key={contact._id} tabIndex={-1}>
										<TableCell>
											<Typography variant="body2">{contact.email}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{contact.firstName || "-"}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{contact.lastName || "-"}</Typography>
										</TableCell>
										<TableCell>
											<Chip label={statusInfo.label} color={statusInfo.color as any} size="small" />
										</TableCell>
										<TableCell>
											<Typography variant="body2">{contact.source || "-"}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">
												{contact.totalCampaigns || contact.campaignCount || (contact.campaigns && contact.campaigns.length) || 0}
											</Typography>
										</TableCell>
										<TableCell>
											{contact.segments && contact.segments.length > 0 ? (
												<Tooltip
													title={`${contact.segments.filter((s: any) => s.status === "active").length} activos de ${
														contact.segments.length
													} total`}
												>
													<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
														<Typography variant="body2">{contact.segments.filter((s: any) => s.status === "active").length}</Typography>
														{contact.segments.length > contact.segments.filter((s: any) => s.status === "active").length && (
															<Typography variant="caption" color="textSecondary">
																({contact.segments.length})
															</Typography>
														)}
													</Box>
												</Tooltip>
											) : (
												<Typography variant="body2">0</Typography>
											)}
										</TableCell>
										<TableCell>
											<Typography variant="body2">{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : "-"}</Typography>
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={1} justifyContent="center">
												<Tooltip title="Ver detalles">
													<IconButton aria-label="ver" size="small" color="secondary" onClick={() => handleViewContact(contact._id || "")}>
														<Eye size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Editar contacto">
													<IconButton aria-label="editar" size="small" color="primary" onClick={() => handleEditContact(contact._id || "")}>
														<Edit2 size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Cancelar suscripción">
													<IconButton
														aria-label="eliminar"
														size="small"
														color="error"
														onClick={() =>
															handleDeleteContact(
																contact._id || "",
																`${contact.firstName || ""} ${contact.lastName || ""} (${contact.email})`,
															)
														}
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
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>

			<Grid container spacing={3} sx={{ mt: 2 }}>
				<Grid item xs={12} md={6}>
					<Card>
						<CardHeader title="Estadísticas de contactos" />
						<CardContent>
							<Stack spacing={2}>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Total de contactos
									</Typography>
									<Typography variant="h4">{stats.totalContacts}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Contactos activos
									</Typography>
									<Typography variant="h4">{stats.activeContacts}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Contactos desuscritos
									</Typography>
									<Typography variant="h4">{stats.unsubscribedContacts}</Typography>
								</Box>
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				<Grid item xs={12} md={6}>
					<Card>
						<CardHeader title="Estado de contactos" />
						<CardContent>
							<Grid container spacing={2}>
								{(["active", "unsubscribed", "bounced", "inactive"] as string[]).map((status) => {
									const count = stats.statusCounts[status as keyof typeof stats.statusCounts] || 0;
									const statusInfo = getStatusColor(status);

									return (
										<Grid item xs={6} sm={3} key={status}>
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

			{/* Modales y diálogos */}
			<ContactDetailModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} contactId={selectedContactId} />

			<EditContactModal
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				contactId={selectedContactId}
				onSave={handleRefreshAfterEdit}
			/>

			<DeleteContactDialog
				open={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
				contactId={selectedContactId}
				contactName={selectedContactName}
				onDelete={handleRefreshAfterEdit}
			/>
		</>
	);
};

export default ContactsPanel;
