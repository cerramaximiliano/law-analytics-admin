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
} from "@mui/material";
import { CloseCircle } from "iconsax-react";
import { Segment } from "types/segment";
import { MarketingContact } from "types/marketing-contact";
import { SegmentService } from "store/reducers/segments";
import TableSkeleton from "components/UI/TableSkeleton";

interface SegmentContactsModalProps {
	open: boolean;
	onClose: () => void;
	segment: Segment | null;
}

const SegmentContactsModal: React.FC<SegmentContactsModalProps> = ({ open, onClose, segment }) => {
	// Estados para la paginación y carga
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [contacts, setContacts] = useState<MarketingContact[]>([]);
	const [totalContacts, setTotalContacts] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

			<DialogContent dividers>
				{segment && (
					<Box sx={{ mb: 3 }}>
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
						<Divider sx={{ mt: 2 }} />
					</Box>
				)}

				{error ? (
					<Alert severity="error" sx={{ my: 2 }}>
						{error}
					</Alert>
				) : (
					<>
						<TableContainer component={Paper} sx={{ boxShadow: "none" }}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Email</TableCell>
										<TableCell>Nombre</TableCell>
										<TableCell>Apellido</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Empresa</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{loading ? (
										<TableSkeleton columns={5} rows={10} />
									) : contacts.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} align="center" sx={{ py: 3 }}>
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
							sx={{ mt: 1 }}
						/>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default SegmentContactsModal;
