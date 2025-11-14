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
import SegmentFormModal from "./SegmentFormModal";
import DeleteSegmentDialog from "./DeleteSegmentDialog";
import SegmentContactsModal from "./SegmentContactsModal";

// project imports
import { Add, Edit2, SearchNormal1, Trash, People } from "iconsax-react";
import { Segment } from "types/segment";
import { SegmentService } from "store/reducers/segments";

// ==============================|| SEGMENTS PANEL ||============================== //

const SegmentsPanel = () => {
	const theme = useTheme();

	// State for segments data
	const [segments, setSegments] = useState<Segment[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
	const [sortBy, setSortBy] = useState<string>("createdAt");
	const [sortDir, setSortDir] = useState<string>("desc");
	const [openSegmentModal, setOpenSegmentModal] = useState<boolean>(false);

	// State for edit mode
	const [editingSegment, setEditingSegment] = useState<Segment | null>(null);

	// State for viewing contacts
	const [viewingContactsSegment, setViewingContactsSegment] = useState<Segment | null>(null);
	const [contactsModalOpen, setContactsModalOpen] = useState<boolean>(false);

	// State for delete dialog
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
	const [deletingSegment, setDeletingSegment] = useState<Segment | null>(null);
	const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

	// State for pagination
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// Segment statistics
	const [stats, setStats] = useState({
		totalSegments: 0,
		activeSegments: 0,
		inactiveSegments: 0,
		averageSize: 0,
		typeCounts: {
			static: 0,
			dynamic: 0,
			compound: 0,
		},
	});

	// Load segments on component mount and when dependencies change
	useEffect(() => {
		fetchSegments();
		fetchStats();
	}, [page, rowsPerPage, filterActive, sortBy, sortDir]);

	// Function to fetch segments from API
	const fetchSegments = async () => {
		try {
			setLoading(true);
			setError(null);

			// Build filter object
			const filters: Record<string, any> = {};
			if (filterActive !== undefined) filters.isActive = filterActive;

			const response = await SegmentService.getSegments(page + 1, rowsPerPage, sortBy, sortDir, filters);

			// Apply search filter client-side since the API might not support it
			let filteredSegments = response.data;
			if (searchTerm) {
				const term = searchTerm.toLowerCase();
				filteredSegments = filteredSegments.filter(
					(segment) =>
						segment.name.toLowerCase().includes(term) || (segment.description && segment.description.toLowerCase().includes(term)),
				);
			}

			setSegments(filteredSegments);
			setTotalCount(response.pagination.total);
		} catch (err) {
			setError("Error al cargar los segmentos. Por favor, intente de nuevo más tarde.");
		} finally {
			setLoading(false);
		}
	};

	// Fetch segment statistics
	const fetchStats = async () => {
		try {
			const response = await SegmentService.getSegmentStats();
			setStats({
				totalSegments: response.totalSegments || 0,
				activeSegments: response.activeSegments || 0,
				inactiveSegments: response.inactiveSegments || 0,
				averageSize: response.averageSize || 0,
				typeCounts: response.typeCounts || {
					static: 0,
					dynamic: 0,
					compound: 0,
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
		fetchSegments(); // This will now filter by search term
	};

	// Filter handlers
	const handleActiveFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setFilterActive(value === "" ? undefined : value === "true");
		setPage(0);
	};

	// Sorting handlers
	const handleSortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSortBy(event.target.value);
	};

	const handleSortDirChange = () => {
		setSortDir(sortDir === "asc" ? "desc" : "asc");
	};

	// Get type label
	const getTypeLabel = (type: string) => {
		switch (type) {
			case "static":
				return { label: "Estático", color: "primary" };
			case "dynamic":
				return { label: "Dinámico", color: "secondary" };
			case "compound":
				return { label: "Compuesto", color: "info" };
			default:
				return { label: type, color: "default" };
		}
	};

	// Handler for segment modal
	const handleCloseSegmentModal = () => {
		setOpenSegmentModal(false);
		setEditingSegment(null); // Reset editing segment when closing modal
	};

	// Handler for segment creation/update success
	const handleSegmentSaved = () => {
		fetchSegments();
		fetchStats();
	};

	// Handler for edit segment
	const handleEditSegment = (segment: Segment) => {
		setEditingSegment(segment);
		setOpenSegmentModal(true);
	};

	// Handler for viewing segment contacts
	const handleViewContacts = (segment: Segment) => {
		setViewingContactsSegment(segment);
		setContactsModalOpen(true);
	};

	// Handler for closing contacts modal
	const handleCloseContactsModal = () => {
		setContactsModalOpen(false);
		setViewingContactsSegment(null);
	};

	// Handlers for segment deletion
	const handleOpenDeleteDialog = (segment: Segment) => {
		setDeletingSegment(segment);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setDeletingSegment(null);
	};

	const handleConfirmDelete = async () => {
		if (!deletingSegment) return;

		try {
			setDeleteLoading(true);
			setError(null);

			await SegmentService.deleteSegment(deletingSegment._id || "");

			// Success - refresh data
			fetchSegments();
			fetchStats();

			// Close dialog
			setDeleteDialogOpen(false);
			setDeletingSegment(null);
		} catch (err: any) {
			setError(err?.message || "Error al eliminar el segmento. Por favor, intente de nuevo más tarde.");
		} finally {
			setDeleteLoading(false);
		}
	};

	return (
		<>
			{/* Segment Creation/Edit Modal */}
			<SegmentFormModal open={openSegmentModal} onClose={handleCloseSegmentModal} onSave={handleSegmentSaved} segment={editingSegment} />

			{/* Segment Contacts Modal */}
			<SegmentContactsModal open={contactsModalOpen} onClose={handleCloseContactsModal} segment={viewingContactsSegment} />

			{/* Segment Deletion Modal */}
			{deletingSegment && (
				<DeleteSegmentDialog
					open={deleteDialogOpen}
					segmentName={deletingSegment.name}
					onClose={handleCloseDeleteDialog}
					onConfirm={handleConfirmDelete}
					loading={deleteLoading}
				/>
			)}

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
							label="Buscar segmento"
							placeholder="Buscar por nombre o descripción"
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
								<MenuItem value="updatedAt">Última actualización</MenuItem>
								<MenuItem value="estimatedCount">Tamaño</MenuItem>
							</TextField>
							<Button variant="outlined" size="small" onClick={handleSortDirChange} sx={{ minWidth: 100, height: 40 }}>
								{sortDir === "asc" ? "Ascendente" : "Descendente"}
							</Button>
							<TextField
								select
								size="small"
								label="Estado"
								value={filterActive === undefined ? "" : filterActive.toString()}
								onChange={handleActiveFilterChange}
								sx={{ minWidth: 120 }}
							>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="true">Activo</MenuItem>
								<MenuItem value="false">Inactivo</MenuItem>
							</TextField>
							<Button
								variant="contained"
								color="primary"
								startIcon={<Add />}
								sx={{ textTransform: "none" }}
								onClick={() => setOpenSegmentModal(true)}
							>
								Nuevo segmento
							</Button>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			<TableContainer component={Paper} sx={{ boxShadow: "none" }}>
				<Table sx={{ minWidth: 750 }} aria-labelledby="tableTitle">
					<TableHead>
						<TableRow>
							<TableCell>Nombre</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell>Descripción</TableCell>
							<TableCell align="right">Contactos</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell>Creado</TableCell>
							<TableCell>Última actualización</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableSkeleton columns={8} rows={10} />
						) : segments.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} align="center" sx={{ py: 3 }}>
									<Typography variant="subtitle1">No hay segmentos disponibles</Typography>
								</TableCell>
							</TableRow>
						) : (
							segments.map((segment) => {
								const typeInfo = getTypeLabel(segment.type || "static");

								return (
									<TableRow hover key={segment._id} tabIndex={-1}>
										<TableCell>
											<Typography variant="subtitle2">{segment.name}</Typography>
										</TableCell>
										<TableCell>
											<Chip label={typeInfo.label} color={typeInfo.color as any} size="small" />
										</TableCell>
										<TableCell>
											<Typography variant="body2">
												{segment.description
													? segment.description.length > 50
														? `${segment.description.substring(0, 50)}...`
														: segment.description
													: "-"}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{segment.estimatedCount || 0}</Typography>
										</TableCell>
										<TableCell>
											<Chip
												label={segment.isActive ? "Activo" : "Inactivo"}
												color={segment.isActive ? "success" : "default"}
												size="small"
											/>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{segment.createdAt ? new Date(segment.createdAt).toLocaleDateString() : "-"}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{segment.updatedAt ? new Date(segment.updatedAt).toLocaleDateString() : "-"}</Typography>
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={1} justifyContent="center">
												<Tooltip title="Ver contactos">
													<IconButton aria-label="contacts" size="small" color="primary" onClick={() => handleViewContacts(segment)}>
														<People size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Editar segmento">
													<IconButton aria-label="editar" size="small" color="secondary" onClick={() => handleEditSegment(segment)}>
														<Edit2 size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Eliminar segmento">
													<IconButton aria-label="eliminar" size="small" color="error" onClick={() => handleOpenDeleteDialog(segment)}>
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
				rowsPerPageOptions={[5, 10, 25, 50]}
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
						<CardHeader title="Estadísticas de segmentos" />
						<CardContent>
							<Stack spacing={2}>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Total de segmentos
									</Typography>
									<Typography variant="h4">{stats.totalSegments}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Segmentos activos
									</Typography>
									<Typography variant="h4">{stats.activeSegments}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Tamaño promedio
									</Typography>
									<Typography variant="h4">{stats.averageSize} contactos</Typography>
								</Box>
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				<Grid item xs={12} md={6}>
					<Card>
						<CardHeader title="Tipos de segmentos" />
						<CardContent>
							<Grid container spacing={2}>
								{(["static", "dynamic", "compound"] as string[]).map((type) => {
									const count = stats.typeCounts[type as keyof typeof stats.typeCounts] || 0;
									const typeInfo = getTypeLabel(type);

									return (
										<Grid item xs={4} key={type}>
											<Box
												sx={{
													p: 2.5,
													bgcolor: theme.palette.mode === "dark" ? theme.palette.dark.main : theme.palette.grey[50],
													borderRadius: 2,
													textAlign: "center",
												}}
											>
												<Typography variant="h4">{count}</Typography>
												<Chip label={typeInfo.label} color={typeInfo.color as any} size="small" sx={{ mt: 1 }} />
											</Box>
										</Grid>
									);
								})}
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</>
	);
};

export default SegmentsPanel;
