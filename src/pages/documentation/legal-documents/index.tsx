import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "store/index";

// material-ui
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	IconButton,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
	useTheme,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Paper,
} from "@mui/material";

// project imports
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import TableSkeleton from "components/UI/TableSkeleton";
import {
	fetchLegalDocuments,
	fetchLegalDocumentById,
	toggleLegalDocument,
	deleteLegalDocument,
	clearSelectedDocument,
} from "store/reducers/legal-documents";
import { DefaultRootStateProps } from "types/root";
import { LegalDocument, LegalDocumentSection } from "types/legal-document";
import EditLegalDocumentModal from "./EditLegalDocumentModal";

// assets
import { Eye, CloseCircle, ArrowDown2, DocumentText, TickCircle, CloseSquare, Trash, Edit } from "iconsax-react";

// table header options
const headCells = [
	{
		id: "title",
		label: "Titulo",
		align: "left",
	},
	{
		id: "documentType",
		label: "Tipo",
		align: "left",
	},
	{
		id: "version",
		label: "Version",
		align: "center",
	},
	{
		id: "language",
		label: "Idioma",
		align: "center",
	},
	{
		id: "isActive",
		label: "Estado",
		align: "center",
	},
	{
		id: "effectiveDate",
		label: "Fecha Efectiva",
		align: "left",
	},
	{
		id: "updatedAt",
		label: "Ultima Actualizacion",
		align: "left",
	},
	{
		id: "actions",
		label: "Acciones",
		align: "center",
	},
];

// Mapeo de tipos de documento a etiquetas legibles
const documentTypeLabels: Record<string, string> = {
	subscription: "Suscripcion",
	refund: "Reembolsos",
	billing: "Facturacion",
	privacy: "Privacidad",
	terms: "Terminos de Uso",
};

// Mapeo de idiomas
const languageLabels: Record<string, string> = {
	es: "Espanol",
	en: "Ingles",
	pt: "Portugues",
};

// ==============================|| LEGAL DOCUMENTS PAGE ||============================== //

const LegalDocumentsPage = () => {
	const theme = useTheme();
	const dispatch = useDispatch();

	const { documents, selectedDocument, loading, loadingDetail, error } = useSelector(
		(state: DefaultRootStateProps) => state.legalDocuments
	);

	const [viewDialogOpen, setViewDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [documentToDelete, setDocumentToDelete] = useState<LegalDocument | null>(null);
	const [documentToEdit, setDocumentToEdit] = useState<LegalDocument | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);

	useEffect(() => {
		dispatch(fetchLegalDocuments());
	}, [dispatch]);

	const handleViewDocument = (document: LegalDocument) => {
		setViewDialogOpen(true);
		// Obtener el documento completo desde la API
		dispatch(fetchLegalDocumentById(document._id));
	};

	const handleEditDocument = (document: LegalDocument) => {
		// Primero obtener el documento completo y luego abrir el modal
		dispatch(fetchLegalDocumentById(document._id)).then(() => {
			setDocumentToEdit(document);
			setEditModalOpen(true);
		});
	};

	const handleCloseEditModal = () => {
		setEditModalOpen(false);
		setDocumentToEdit(null);
	};

	const handleEditSuccess = () => {
		// Refrescar la lista de documentos
		dispatch(fetchLegalDocuments());
	};

	const handleCloseViewDialog = () => {
		setViewDialogOpen(false);
		dispatch(clearSelectedDocument());
	};

	const handleToggleDocument = async (document: LegalDocument) => {
		setTogglingId(document._id);
		try {
			await dispatch(toggleLegalDocument(document._id));
		} finally {
			setTogglingId(null);
		}
	};

	const handleDeleteClick = (document: LegalDocument) => {
		setDocumentToDelete(document);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (documentToDelete) {
			await dispatch(deleteLegalDocument(documentToDelete._id));
			setDeleteDialogOpen(false);
			setDocumentToDelete(null);
		}
	};

	const handleCancelDelete = () => {
		setDeleteDialogOpen(false);
		setDocumentToDelete(null);
	};

	const getDocumentTypeLabel = (type: string) => {
		return documentTypeLabels[type] || type;
	};

	const getLanguageLabel = (lang: string) => {
		return languageLabels[lang] || lang;
	};

	const renderStatusChip = (isActive: boolean) => {
		return (
			<Chip
				icon={isActive ? <TickCircle size={14} /> : <CloseSquare size={14} />}
				label={isActive ? "Activo" : "Inactivo"}
				size="small"
				color={isActive ? "success" : "error"}
				sx={{
					borderRadius: "4px",
					"& .MuiChip-label": {
						px: 1,
					},
				}}
			/>
		);
	};

	const renderDocumentTypeChip = (type: string) => {
		const colorMap: Record<string, "primary" | "secondary" | "info" | "warning" | "success"> = {
			subscription: "primary",
			refund: "warning",
			billing: "info",
			privacy: "secondary",
			terms: "success",
		};

		return (
			<Chip
				label={getDocumentTypeLabel(type)}
				size="small"
				color={colorMap[type] || "default"}
				variant="outlined"
				sx={{
					borderRadius: "4px",
					"& .MuiChip-label": {
						px: 1,
					},
				}}
			/>
		);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<MainCard title="Documentos Legales" content={false}>
			<ScrollX>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 3 }}>
					<Typography variant="h5">Lista de Documentos</Typography>
				</Stack>
				<Divider />

				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								{headCells.map((headCell) => (
									<TableCell key={headCell.id} align={headCell.align as any} sx={{ py: 2 }}>
										{headCell.label}
									</TableCell>
								))}
							</TableRow>
						</TableHead>
						<TableBody>
							{/* Skeleton de carga */}
							{loading && <TableSkeleton columns={headCells.length} rows={5} />}

							{/* Mensaje de error */}
							{!loading && error && (
								<TableRow>
									<TableCell colSpan={headCells.length} align="center" sx={{ py: 8 }}>
										<Stack spacing={2} alignItems="center">
											<Box
												sx={{
													width: 80,
													height: 80,
													borderRadius: "50%",
													backgroundColor: theme.palette.mode === "dark" ? "error.dark" : "error.lighter",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													mb: 2,
												}}
											>
												<Typography variant="h2" color="error.main">
													!
												</Typography>
											</Box>
											<Typography variant="h5" color="text.primary" gutterBottom>
												Error al cargar documentos
											</Typography>
											<Typography variant="body1" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
												{error}
											</Typography>
											<Button variant="contained" color="primary" onClick={() => dispatch(fetchLegalDocuments())} sx={{ mt: 2 }}>
												Reintentar
											</Button>
										</Stack>
									</TableCell>
								</TableRow>
							)}

							{/* No hay resultados */}
							{!loading && !error && documents.length === 0 && (
								<TableRow>
									<TableCell colSpan={headCells.length} align="center" sx={{ py: 8 }}>
										<Stack spacing={2} alignItems="center">
											<Box
												sx={{
													width: 100,
													height: 100,
													borderRadius: "50%",
													backgroundColor: theme.palette.mode === "dark" ? "background.paper" : "grey.100",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													mb: 2,
												}}
											>
												<DocumentText size={48} color={theme.palette.text.secondary} />
											</Box>
											<Typography variant="h5" color="text.primary">
												No hay documentos legales
											</Typography>
											<Typography variant="body1" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
												Aun no se han creado documentos legales en el sistema.
											</Typography>
										</Stack>
									</TableCell>
								</TableRow>
							)}

							{/* Listado de documentos */}
							{!loading &&
								!error &&
								documents.length > 0 &&
								documents.map((doc: LegalDocument) => (
									<TableRow hover key={doc._id}>
										<TableCell>
											<Typography variant="subtitle1">{doc.title}</Typography>
										</TableCell>
										<TableCell>{renderDocumentTypeChip(doc.documentType)}</TableCell>
										<TableCell align="center">
											<Chip label={`v${doc.version}`} size="small" variant="outlined" sx={{ borderRadius: "4px" }} />
										</TableCell>
										<TableCell align="center">{getLanguageLabel(doc.language)}</TableCell>
										<TableCell align="center">
											<Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
												{togglingId === doc._id ? (
													<CircularProgress size={20} />
												) : (
													<Tooltip title={doc.isActive ? "Desactivar documento" : "Activar documento"}>
														<Switch
															checked={doc.isActive}
															onChange={() => handleToggleDocument(doc)}
															size="small"
															color="success"
														/>
													</Tooltip>
												)}
											</Stack>
										</TableCell>
										<TableCell>{formatDate(doc.effectiveDate)}</TableCell>
										<TableCell>{formatDate(doc.updatedAt)}</TableCell>
										<TableCell align="center">
											<Stack direction="row" justifyContent="center" spacing={0.5}>
												<Tooltip title="Ver documento completo">
													<IconButton color="primary" onClick={() => handleViewDocument(doc)}>
														<Eye size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Editar documento">
													<IconButton color="secondary" onClick={() => handleEditDocument(doc)}>
														<Edit size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Eliminar documento">
													<IconButton color="error" onClick={() => handleDeleteClick(doc)}>
														<Trash size={18} />
													</IconButton>
												</Tooltip>
											</Stack>
										</TableCell>
									</TableRow>
								))}
						</TableBody>
					</Table>
				</TableContainer>
			</ScrollX>

			{/* Dialogo para ver el documento completo */}
			<Dialog
				open={viewDialogOpen}
				onClose={handleCloseViewDialog}
				maxWidth="md"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						maxHeight: "90vh",
					},
				}}
			>
				{loadingDetail ? (
					<DialogContent>
						<Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
							<CircularProgress size={48} />
							<Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
								Cargando documento...
							</Typography>
						</Stack>
					</DialogContent>
				) : selectedDocument ? (
					<>
						<DialogTitle>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Stack direction="row" spacing={2} alignItems="center">
									<DocumentText size={24} color={theme.palette.primary.main} />
									<Box>
										<Typography variant="h5">{selectedDocument.title}</Typography>
										<Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
											{renderDocumentTypeChip(selectedDocument.documentType)}
											<Chip label={`v${selectedDocument.version}`} size="small" variant="outlined" sx={{ borderRadius: "4px" }} />
											{renderStatusChip(selectedDocument.isActive)}
										</Stack>
									</Box>
								</Stack>
								<IconButton onClick={handleCloseViewDialog} color="error">
									<CloseCircle size={24} />
								</IconButton>
							</Stack>
						</DialogTitle>
						<Divider />
						<DialogContent>
							<Stack spacing={3}>
								{/* Informacion del documento */}
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Typography variant="subtitle2" color="text.secondary" gutterBottom>
										Informacion del Documento
									</Typography>
									<Stack direction="row" spacing={4} flexWrap="wrap">
										<Box>
											<Typography variant="caption" color="text.secondary">
												Idioma
											</Typography>
											<Typography variant="body2">{getLanguageLabel(selectedDocument.language)}</Typography>
										</Box>
										<Box>
											<Typography variant="caption" color="text.secondary">
												Region
											</Typography>
											<Typography variant="body2">{selectedDocument.region}</Typography>
										</Box>
										<Box>
											<Typography variant="caption" color="text.secondary">
												Fecha Efectiva
											</Typography>
											<Typography variant="body2">{formatDate(selectedDocument.effectiveDate)}</Typography>
										</Box>
										<Box>
											<Typography variant="caption" color="text.secondary">
												Ultima Actualizacion
											</Typography>
											<Typography variant="body2">{formatDate(selectedDocument.updatedAt)}</Typography>
										</Box>
									</Stack>
								</Paper>

								{/* Introduccion */}
								{selectedDocument.introduction && (
									<Box>
										<Typography variant="subtitle1" gutterBottom fontWeight={600}>
											Introduccion
										</Typography>
										<Typography variant="body2" color="text.secondary">
											{selectedDocument.introduction}
										</Typography>
									</Box>
								)}

								{/* Secciones */}
								{selectedDocument.sections && selectedDocument.sections.length > 0 && (
									<Box>
										<Typography variant="subtitle1" gutterBottom fontWeight={600}>
											Secciones
										</Typography>
										{[...selectedDocument.sections]
											.sort((a: LegalDocumentSection, b: LegalDocumentSection) => a.order - b.order)
											.map((section: LegalDocumentSection, index: number) => (
												<Accordion key={index} defaultExpanded={index === 0}>
													<AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
														<Stack direction="row" spacing={2} alignItems="center">
															<Typography variant="subtitle2">
																{section.order}. {section.title}
															</Typography>
															{section.visibleFor && section.visibleFor.length > 0 && (
																<Stack direction="row" spacing={0.5}>
																	{section.visibleFor.map((plan: string) => (
																		<Chip
																			key={plan}
																			label={plan}
																			size="small"
																			variant="outlined"
																			sx={{ borderRadius: "4px", fontSize: "0.7rem", height: 20 }}
																		/>
																	))}
																</Stack>
															)}
														</Stack>
													</AccordionSummary>
													<AccordionDetails>
														<Typography variant="body2" color="text.secondary">
															{section.content}
														</Typography>
													</AccordionDetails>
												</Accordion>
											))}
									</Box>
								)}

								{/* Conclusion */}
								{selectedDocument.conclusion && (
									<Box>
										<Typography variant="subtitle1" gutterBottom fontWeight={600}>
											Conclusion
										</Typography>
										<Typography variant="body2" color="text.secondary">
											{selectedDocument.conclusion}
										</Typography>
									</Box>
								)}

								{/* Detalles de la empresa */}
								{selectedDocument.companyDetails && (
									<Paper variant="outlined" sx={{ p: 2 }}>
										<Typography variant="subtitle2" color="text.secondary" gutterBottom>
											Informacion de la Empresa
										</Typography>
										<Stack spacing={1}>
											<Typography variant="body2">
												<strong>Nombre:</strong> {selectedDocument.companyDetails.name}
											</Typography>
											<Typography variant="body2">
												<strong>Direccion:</strong> {selectedDocument.companyDetails.address}
											</Typography>
											<Typography variant="body2">
												<strong>Email:</strong> {selectedDocument.companyDetails.email}
											</Typography>
											<Typography variant="body2">
												<strong>Telefono:</strong> {selectedDocument.companyDetails.phone}
											</Typography>
											<Typography variant="body2">
												<strong>Numero de Registro:</strong> {selectedDocument.companyDetails.registrationNumber}
											</Typography>
										</Stack>
									</Paper>
								)}
							</Stack>
						</DialogContent>
					</>
				) : (
					<DialogContent>
						<Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
							<Typography variant="body1" color="text.secondary">
								No se pudo cargar el documento
							</Typography>
						</Stack>
					</DialogContent>
				)}
			</Dialog>

			{/* Dialogo de confirmacion para eliminar */}
			<Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
				<DialogTitle>Confirmar eliminacion</DialogTitle>
				<DialogContent>
					<DialogContentText>
						¿Estas seguro de que deseas eliminar el documento <strong>"{documentToDelete?.title}"</strong>? Esta accion no se
						puede deshacer.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCancelDelete} color="inherit">
						Cancelar
					</Button>
					<Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={loadingDetail}>
						{loadingDetail ? <CircularProgress size={20} /> : "Eliminar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal para editar documento */}
			{selectedDocument && (
				<EditLegalDocumentModal
					open={editModalOpen}
					onClose={handleCloseEditModal}
					document={selectedDocument}
					onSuccess={handleEditSuccess}
				/>
			)}
		</MainCard>
	);
};

export default LegalDocumentsPage;
