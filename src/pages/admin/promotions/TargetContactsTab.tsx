import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add, Trash, UserAdd } from "iconsax-react";
import { useSnackbar } from "notistack";
import discountsService, { TargetContact } from "api/discounts";

interface TargetContactsTabProps {
	discountId: string;
	discountCode: string;
	onUpdate?: () => void;
	onCountChange?: (count: number) => void;
}

const TargetContactsTab = ({ discountId, discountCode, onUpdate, onCountChange }: TargetContactsTabProps) => {
	const { enqueueSnackbar } = useSnackbar();

	const [contacts, setContacts] = useState<TargetContact[]>([]);
	const [loading, setLoading] = useState(true);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<TargetContact[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [selected, setSelected] = useState<TargetContact[]>([]);
	const [adding, setAdding] = useState(false);
	const [removing, setRemoving] = useState<string | null>(null);

	const fetchContacts = useCallback(async () => {
		try {
			setLoading(true);
			const res = await discountsService.getTargetContacts(discountId);
			setContacts(res.data.targetContacts);
			onCountChange?.(res.data.totalTargetContacts);
		} catch (err: any) {
			console.error(err);
			enqueueSnackbar(err.message || "Error al cargar contactos objetivo", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [discountId, enqueueSnackbar, onCountChange]);

	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	// Search con debounce
	useEffect(() => {
		if (searchQuery.length < 2) {
			setSearchResults([]);
			return;
		}
		const id = setTimeout(async () => {
			try {
				setSearchLoading(true);
				const res = await discountsService.searchContacts(searchQuery, 20);
				// Excluir los ya agregados
				const currentIds = new Set(contacts.map((c) => c._id));
				setSearchResults(res.data.filter((c) => !currentIds.has(c._id)));
			} catch (err: any) {
				console.error(err);
			} finally {
				setSearchLoading(false);
			}
		}, 300);
		return () => clearTimeout(id);
	}, [searchQuery, contacts]);

	const handleAdd = async () => {
		if (selected.length === 0) return;
		try {
			setAdding(true);
			const res = await discountsService.addTargetContacts(
				discountId,
				selected.map((c) => c._id),
			);
			enqueueSnackbar(res.message, { variant: "success" });
			setAddDialogOpen(false);
			setSelected([]);
			setSearchQuery("");
			setSearchResults([]);
			await fetchContacts();
			onUpdate?.();
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al agregar contactos", { variant: "error" });
		} finally {
			setAdding(false);
		}
	};

	const handleRemove = async (contactId: string) => {
		try {
			setRemoving(contactId);
			await discountsService.removeTargetContacts(discountId, [contactId]);
			enqueueSnackbar("Contacto removido del descuento", { variant: "success" });
			await fetchContacts();
			onUpdate?.();
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al quitar contacto", { variant: "error" });
		} finally {
			setRemoving(null);
		}
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" py={4}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
				<Typography variant="subtitle1" color="text.secondary">
					Contactos individuales (de la base de marketing) que verán el descuento{" "}
					<strong>{discountCode}</strong> al registrarse con su mismo email.
				</Typography>
				<Button variant="contained" size="small" startIcon={<Add size={18} />} onClick={() => setAddDialogOpen(true)}>
					Agregar Contactos
				</Button>
			</Stack>

			<Alert severity="info" sx={{ mb: 2 }}>
				Útil para otorgar el descuento de forma discrecional a prospectos que aún no son usuarios de la plataforma. Cuando creen su
				cuenta con el mismo email, verán el código en su panel.
			</Alert>

			{contacts.length > 0 ? (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Email</TableCell>
								<TableCell>Nombre</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell align="center">¿Ya tiene cuenta?</TableCell>
								<TableCell align="center" width={80}>
									Acciones
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{contacts.map((c) => (
								<TableRow key={c._id} hover>
									<TableCell>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{c.email}
										</Typography>
									</TableCell>
									<TableCell>{c.fullName || "-"}</TableCell>
									<TableCell align="center">
										<Chip label={c.status || "—"} size="small" variant="outlined" />
									</TableCell>
									<TableCell align="center">
										{c.hasRegisteredUser ? (
											<Chip label="Sí" size="small" color="success" />
										) : (
											<Chip label="Pendiente" size="small" variant="outlined" />
										)}
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Quitar del descuento">
											<IconButton
												size="small"
												color="error"
												onClick={() => handleRemove(c._id)}
												disabled={removing === c._id}
											>
												{removing === c._id ? <CircularProgress size={16} /> : <Trash size={18} />}
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			) : (
				<Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
					<UserAdd size={48} style={{ opacity: 0.4 }} />
					<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
						No hay contactos asignados a este descuento.
					</Typography>
				</Paper>
			)}

			{/* Dialog: agregar contactos */}
			<Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Agregar contactos al descuento</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Buscá por email, nombre o apellido. Los contactos que agregues podrán usar el descuento al registrarse con ese mismo
						email.
					</Typography>
					<Autocomplete
						multiple
						options={searchResults}
						value={selected}
						onChange={(_, v) => setSelected(v)}
						getOptionLabel={(c) => `${c.fullName} <${c.email}>`}
						isOptionEqualToValue={(a, b) => a._id === b._id}
						loading={searchLoading}
						filterSelectedOptions
						renderInput={(params) => (
							<TextField
								{...params}
								label="Buscar contactos"
								placeholder="email, nombre o apellido"
								onChange={(e) => setSearchQuery(e.target.value)}
								InputProps={{
									...params.InputProps,
									endAdornment: (
										<>
											{searchLoading && <CircularProgress size={16} />}
											{params.InputProps.endAdornment}
										</>
									),
								}}
							/>
						)}
						renderOption={(props, c) => (
							<li {...props} key={c._id}>
								<Stack direction="row" spacing={1} alignItems="center">
									<Box>
										<Typography variant="body2">{c.fullName}</Typography>
										<Typography variant="caption" color="text.secondary">
											{c.email}
										</Typography>
									</Box>
									{c.hasRegisteredUser && <Chip size="small" label="ya registrado" color="success" />}
								</Stack>
							</li>
						)}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleAdd} disabled={adding || selected.length === 0}>
						{adding ? <CircularProgress size={20} /> : `Agregar ${selected.length || ""}`}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default TargetContactsTab;
