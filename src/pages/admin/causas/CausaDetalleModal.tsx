import { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	Box,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Alert,
	Divider,
	Stack,
	Tabs,
	Tab,
	Link,
} from "@mui/material";
import { Causa } from "api/causas";
import { CloseCircle, Link as LinkIcon } from "iconsax-react";

interface CausaDetalleModalProps {
	open: boolean;
	onClose: () => void;
	causa: Causa | null;
}

// Mapeo de fueros a nombres legibles
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
};

// Mapeo de colores por fuero
const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
};

const CausaDetalleModal = ({ open, onClose, causa }: CausaDetalleModalProps) => {
	// Estado para el tab activo
	const [activeTab, setActiveTab] = useState(0);

	// Estados para movimientos paginados
	const [movimientosPage, setMovimientosPage] = useState(0);
	const [movimientosRowsPerPage, setMovimientosRowsPerPage] = useState(10);

	// Resetear paginación y tab cuando se abre el modal
	useEffect(() => {
		if (open) {
			setActiveTab(0);
			setMovimientosPage(0);
		}
	}, [open]);

	if (!causa) return null;

	// Obtener ID como string
	const getId = (id: string | { $oid: string }): string => {
		return typeof id === "string" ? id : id.$oid;
	};

	// Formatear fecha
	const formatDate = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Obtener movimientos paginados
	const movimientos = (causa as any).movimientos || [];
	const paginatedMovimientos = movimientos.slice(
		movimientosPage * movimientosRowsPerPage,
		movimientosPage * movimientosRowsPerPage + movimientosRowsPerPage,
	);

	const handleChangeMovimientosPage = (_event: unknown, newPage: number) => {
		setMovimientosPage(newPage);
	};

	const handleChangeMovimientosRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setMovimientosRowsPerPage(parseInt(event.target.value, 10));
		setMovimientosPage(0);
	};

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Detalles de la Causa</Typography>
					<Chip
						label={FUERO_LABELS[causa.fuero || "CIV"]}
						color={FUERO_COLORS[causa.fuero || "CIV"]}
						sx={{
							...(causa.fuero === "CSS" && {
								color: "rgba(0, 0, 0, 0.87)",
							}),
						}}
					/>
				</Stack>
			</DialogTitle>

			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={activeTab} onChange={handleTabChange} aria-label="causa detail tabs">
					<Tab label="Información General" />
					<Tab label={`Movimientos (${movimientos.length})`} />
				</Tabs>
			</Box>

			<DialogContent dividers>
				{/* Tab Panel 0: Información General */}
				{activeTab === 0 && (
					<Grid container spacing={3}>
						{/* Información principal */}
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom>
								Información Principal
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={12} sm={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								ID
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{getId(causa._id)}
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Número
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{causa.number}
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Año
							</Typography>
							<Typography variant="body2" fontWeight="bold">
								{causa.year}
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Estado
							</Typography>
							<Box>
								{causa.verified && <Chip label="Verificada" color="success" size="small" sx={{ mr: 0.5 }} />}
								{causa.isValid && <Chip label="Válida" color="primary" size="small" />}
							</Box>
						</Grid>

						<Grid item xs={12}>
							<Typography variant="caption" color="textSecondary">
								Carátula
							</Typography>
							<Typography variant="body2">{causa.caratula || "Sin carátula"}</Typography>
						</Grid>

						<Grid item xs={12} md={6}>
							<Typography variant="caption" color="textSecondary">
								Juzgado
							</Typography>
							<Typography variant="body2">{causa.juzgado || "N/A"}</Typography>
						</Grid>

						<Grid item xs={12} md={6}>
							<Typography variant="caption" color="textSecondary">
								Objeto
							</Typography>
							<Typography variant="body2">{causa.objeto || "Sin objeto"}</Typography>
						</Grid>

						{/* Fechas */}
						<Grid item xs={12}>
							<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
								Fechas
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={12} sm={6} md={4}>
							<Typography variant="caption" color="textSecondary">
								Última Actualización
							</Typography>
							<Typography variant="body2">{formatDate(causa.lastUpdate)}</Typography>
						</Grid>

						<Grid item xs={12} sm={6} md={4}>
							<Typography variant="caption" color="textSecondary">
								Creado
							</Typography>
							<Typography variant="body2">{formatDate(causa.createdAt)}</Typography>
						</Grid>

						<Grid item xs={12} sm={6} md={4}>
							<Typography variant="caption" color="textSecondary">
								Modificado
							</Typography>
							<Typography variant="body2">{formatDate(causa.updatedAt)}</Typography>
						</Grid>

						{/* Carpetas y usuarios */}
						{(causa.folderIds && causa.folderIds.length > 0) || (causa.userCausaIds && causa.userCausaIds.length > 0) ? (
							<>
								<Grid item xs={12}>
									<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
										Vínculos
									</Typography>
									<Divider sx={{ mb: 2 }} />
								</Grid>

								{causa.folderIds && causa.folderIds.length > 0 && (
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="textSecondary">
											Carpetas Vinculadas
										</Typography>
										<Box>
											<Chip label={`${causa.folderIds.length} carpetas`} size="small" />
										</Box>
									</Grid>
								)}

								{causa.userCausaIds && causa.userCausaIds.length > 0 && (
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="textSecondary">
											Usuarios Vinculados
										</Typography>
										<Box>
											<Chip label={`${causa.userCausaIds.length} usuarios`} size="small" />
										</Box>
									</Grid>
								)}
							</>
						) : null}
					</Grid>
				)}

				{/* Tab Panel 1: Movimientos */}
				{activeTab === 1 && (
					<Box>
						{movimientos.length > 0 ? (
							<>
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Fecha</TableCell>
												<TableCell>Descripción</TableCell>
												<TableCell>Tipo</TableCell>
												<TableCell align="center">Enlace</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{paginatedMovimientos.map((mov: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>
														<Typography variant="caption">{formatDate(mov.fecha || mov.createdAt)}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="body2">{mov.descripcion || mov.texto || "Sin descripción"}</Typography>
													</TableCell>
													<TableCell>
														{mov.tipo && <Chip label={mov.tipo} size="small" variant="outlined" />}
													</TableCell>
													<TableCell align="center">
														{mov.url ? (
															<Link href={mov.url} target="_blank" rel="noopener noreferrer" underline="none">
																<Button size="small" startIcon={<LinkIcon size={16} />} variant="outlined">
																	Ver
																</Button>
															</Link>
														) : (
															<Typography variant="caption" color="textSecondary">
																N/A
															</Typography>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
								<TablePagination
									rowsPerPageOptions={[5, 10, 25, 50]}
									component="div"
									count={movimientos.length}
									rowsPerPage={movimientosRowsPerPage}
									page={movimientosPage}
									onPageChange={handleChangeMovimientosPage}
									onRowsPerPageChange={handleChangeMovimientosRowsPerPage}
									labelRowsPerPage="Filas por página:"
									labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
								/>
							</>
						) : (
							<Alert severity="info">Esta causa no tiene movimientos registrados</Alert>
						)}
					</Box>
				)}
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CausaDetalleModal;
