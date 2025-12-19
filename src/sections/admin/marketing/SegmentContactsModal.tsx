import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	Grid,
	Typography,
	IconButton,
	Box,
	TableContainer,
	Table,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	TablePagination,
	Chip,
	Alert,
	Paper,
	Divider,
	Tooltip,
	CircularProgress,
	Tabs,
	Tab,
	Button,
	useTheme,
} from "@mui/material";
import { CloseCircle, Trash, Eye, Copy, TickCircle } from "iconsax-react";
import { Segment } from "types/segment";
import { MarketingContact } from "types/marketing-contact";
import { SegmentService } from "store/reducers/segments";
import TableSkeleton from "components/UI/TableSkeleton";
import { useSnackbar } from "notistack";
import ContactDetailModal from "./ContactDetailModal";

interface SegmentContactsModalProps {
	open: boolean;
	onClose: () => void;
	segment: Segment | null;
	onContactRemoved?: () => void;
}

// Tab panel component
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

const TabPanel = (props: TabPanelProps) => {
	const { children, value, index, ...other } = props;
	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`segment-tabpanel-${index}`}
			aria-labelledby={`segment-tab-${index}`}
			style={{ display: value === index ? "flex" : "none", flexDirection: "column", flex: 1, overflow: "hidden" }}
			{...other}
		>
			{value === index && <Box sx={{ pt: 2, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>{children}</Box>}
		</div>
	);
};

const SegmentContactsModal: React.FC<SegmentContactsModalProps> = ({ open, onClose, segment, onContactRemoved }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estados para la paginación y carga
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [contacts, setContacts] = useState<MarketingContact[]>([]);
	const [totalContacts, setTotalContacts] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [removingContactId, setRemovingContactId] = useState<string | null>(null);

	// Estado para el modal de detalles del contacto
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

	// Estado para tabs y JSON copy
	const [tabValue, setTabValue] = useState<number>(0);
	const [jsonCopied, setJsonCopied] = useState<boolean>(false);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	const handleCopyJson = async () => {
		if (segment) {
			try {
				await navigator.clipboard.writeText(JSON.stringify(segment, null, 2));
				setJsonCopied(true);
				setTimeout(() => setJsonCopied(false), 2000);
			} catch (err) {
				console.error("Error copying to clipboard:", err);
			}
		}
	};

	// Handler para abrir el modal de detalles
	const handleViewDetails = (contactId: string) => {
		setSelectedContactId(contactId);
		setDetailModalOpen(true);
	};

	// Handler para cerrar el modal de detalles
	const handleCloseDetailModal = () => {
		setDetailModalOpen(false);
		setSelectedContactId(null);
	};

	// Cargar contactos cuando se abre el modal
	useEffect(() => {
		if (open && segment?._id) {
			fetchContacts();
		}
	}, [open, segment, page, rowsPerPage]);

	// Función para obtener los contactos del segmento
	const fetchContacts = async () => {
		if (!segment?._id) return;

		try {
			setLoading(true);
			setError(null);

			const response = await SegmentService.getSegmentContacts(
				segment._id,
				page + 1, // API espera página 1-indexed
				rowsPerPage,
			);

			setContacts(response.data);
			setTotalContacts(response.pagination.total);
		} catch (err: any) {
			setError(err?.message || "Error al cargar los contactos del segmento");
		} finally {
			setLoading(false);
		}
	};

	// Handlers para la paginación
	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Función para eliminar un contacto del segmento (solo para segmentos estáticos)
	const handleRemoveContact = async (contactId: string) => {
		if (!segment?._id || segment.type !== "static") return;

		setRemovingContactId(contactId);
		try {
			// Obtener el segmento actual para conseguir los contactos existentes
			const currentSegment = await SegmentService.getSegmentById(segment._id);
			const currentContacts = currentSegment.contacts || [];

			// Filtrar el contacto a eliminar
			const updatedContacts = currentContacts.filter((id: string) => id !== contactId);

			// Actualizar el segmento con el nuevo array de contactos
			await SegmentService.updateSegment(segment._id, { contacts: updatedContacts });

			enqueueSnackbar("Contacto eliminado del segmento exitosamente", { variant: "success" });

			// Recargar los contactos
			fetchContacts();

			// Notificar al padre para que actualice la lista de segmentos
			if (onContactRemoved) {
				onContactRemoved();
			}
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al eliminar el contacto del segmento", { variant: "error" });
		} finally {
			setRemovingContactId(null);
		}
	};

	// Obtener etiqueta de estado para un contacto
	const getStatusChip = (status: string) => {
		let color: "success" | "error" | "warning" | "default" = "default";

		switch (status) {
			case "active":
				color = "success";
				break;
			case "unsubscribed":
				color = "error";
				break;
			case "bounced":
			case "complained":
				color = "warning";
				break;
		}

		const label =
			{
				active: "Activo",
				unsubscribed: "Cancelado",
				bounced: "Rebotado",
				complained: "Reclamado",
			}[status] || status;

		return <Chip label={label} color={color} size="small" />;
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			sx={{
				"& .MuiDialog-paper": {
					borderRadius: 2,
					height: "80vh",
					maxHeight: "700px",
				},
			}}
		>
			<DialogTitle>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h5">Contactos del Segmento</Typography>
					</Grid>
					<Grid item>
						<IconButton onClick={onClose} size="small">
							<CloseCircle variant="Bold" />
						</IconButton>
					</Grid>
				</Grid>
			</DialogTitle>

			<DialogContent dividers sx={{ display: "flex", flexDirection: "column", overflow: "hidden", p: 2 }}>
				{segment && (
					<Box sx={{ mb: 2 }}>
						<Typography variant="h6">{segment.name}</Typography>
						{segment.description && (
							<Typography variant="body2" color="textSecondary">
								{segment.description}
							</Typography>
						)}
						<Box sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center" }}>
							<Chip
								label={segment.type === "dynamic" ? "Dinámico" : "Estático"}
								color={segment.type === "dynamic" ? "secondary" : "primary"}
								size="small"
							/>
							<Typography variant="body2">
								{totalContacts} contacto{totalContacts !== 1 ? "s" : ""}
							</Typography>
						</Box>

						{/* Advertencia de sincronización para segmentos dinámicos */}
						{segment.type === "dynamic" && (
							<Alert severity="info" sx={{ mt: 2 }}>
								<Typography variant="subtitle2" fontWeight="bold">
									Sincronización de contactos
								</Typography>
								<Typography variant="body2">
									Los contactos de este segmento dinámico se calculan en tiempo real, pero se sincronizan con la campaña cada{" "}
									{segment.autoUpdate?.frequency?.value || "?"}{" "}
									{segment.autoUpdate?.frequency?.unit === "minutes"
										? "minutos"
										: segment.autoUpdate?.frequency?.unit === "hours"
										? "horas"
										: segment.autoUpdate?.frequency?.unit === "days"
										? "días"
										: "?"}{" "}
									según la frecuencia configurada.
								</Typography>
							</Alert>
						)}
					</Box>
				)}

				{/* Tabs */}
				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={tabValue} onChange={handleTabChange} aria-label="segment tabs">
						<Tab label="Contactos" id="segment-tab-0" aria-controls="segment-tabpanel-0" />
						<Tab label="JSON Raw" id="segment-tab-1" aria-controls="segment-tabpanel-1" />
					</Tabs>
				</Box>

				{/* Tab 0: Contactos */}
				<TabPanel value={tabValue} index={0}>
					{error ? (
						<Alert severity="error" sx={{ my: 2 }}>
							{error}
						</Alert>
					) : (
						<Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
							<TableContainer component={Paper} sx={{ boxShadow: "none", flex: 1, overflow: "auto", minHeight: 0 }}>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>Email</TableCell>
											<TableCell>Nombre</TableCell>
											<TableCell>Apellido</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell>Empresa</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{loading ? (
											<TableSkeleton columns={6} rows={10} />
										) : contacts.length === 0 ? (
											<TableRow>
												<TableCell colSpan={6} align="center" sx={{ py: 3 }}>
													<Typography variant="body1">No hay contactos en este segmento</Typography>
												</TableCell>
											</TableRow>
										) : (
											contacts.map((contact) => (
												<TableRow key={contact._id} hover>
													<TableCell>
														<Typography variant="body2">{contact.email}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="body2">{contact.firstName || "-"}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="body2">{contact.lastName || "-"}</Typography>
													</TableCell>
													<TableCell>{getStatusChip(contact.status || "unknown")}</TableCell>
													<TableCell>
														<Typography variant="body2">{contact.company || "-"}</Typography>
													</TableCell>
													<TableCell align="center">
														<Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
															<Tooltip title="Ver detalles">
																<IconButton
																	size="small"
																	color="primary"
																	onClick={() => handleViewDetails(contact._id || "")}
																>
																	<Eye size={18} />
																</IconButton>
															</Tooltip>
															{segment?.type === "static" && (
																<Tooltip title="Eliminar del segmento">
																	<IconButton
																		size="small"
																		color="error"
																		onClick={() => handleRemoveContact(contact._id || "")}
																		disabled={removingContactId !== null}
																	>
																		{removingContactId === contact._id ? (
																			<CircularProgress size={18} color="inherit" />
																		) : (
																			<Trash size={18} />
																		)}
																	</IconButton>
																</Tooltip>
															)}
														</Box>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</TableContainer>

							<TablePagination
								rowsPerPageOptions={[5, 10, 25, 50]}
								component="div"
								count={totalContacts}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								labelRowsPerPage="Filas por página:"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
								sx={{ mt: 1, flexShrink: 0 }}
							/>
						</Box>
					)}
				</TabPanel>

				{/* Tab 1: JSON Raw */}
				<TabPanel value={tabValue} index={1}>
					<Box sx={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
						<Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
							<Button
								variant="outlined"
								size="small"
								startIcon={jsonCopied ? <TickCircle size={16} /> : <Copy size={16} />}
								onClick={handleCopyJson}
								color={jsonCopied ? "success" : "primary"}
							>
								{jsonCopied ? "Copiado" : "Copiar"}
							</Button>
						</Box>
						<Box
							component="pre"
							sx={{
								bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
								p: 2,
								pt: 5,
								borderRadius: 1,
								overflow: "auto",
								flex: 1,
								minHeight: 0,
								fontSize: "0.75rem",
								fontFamily: "monospace",
								border: `1px solid ${theme.palette.divider}`,
								"& code": {
									color: theme.palette.mode === "dark" ? "grey.300" : "grey.800",
								},
							}}
						>
							<code>{JSON.stringify(segment, null, 2)}</code>
						</Box>
					</Box>
				</TabPanel>
			</DialogContent>

			{/* Modal de detalles del contacto */}
			<ContactDetailModal open={detailModalOpen} onClose={handleCloseDetailModal} contactId={selectedContactId} />
		</Dialog>
	);
};

export default SegmentContactsModal;
