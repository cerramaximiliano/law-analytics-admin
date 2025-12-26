import React, { useEffect, useState } from "react";
import {
	Box,
	Typography,
	Stack,
	Chip,
	CircularProgress,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Tabs,
	Tab,
	TablePagination,
	useTheme,
	alpha,
	Tooltip,
	IconButton,
	Collapse,
} from "@mui/material";
import { Folder2, Calculator, Profile2User, Refresh, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { UserResourcesService, UserFolder, UserCalculator, UserContact, FolderStats, CalculatorStats, ContactStats } from "api/userResources";

interface UserResourcesTabProps {
	userId: string;
}

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function ResourceTabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

const UserResourcesTab: React.FC<UserResourcesTabProps> = ({ userId }) => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Folders state
	const [folders, setFolders] = useState<UserFolder[]>([]);
	const [foldersStats, setFoldersStats] = useState<FolderStats | null>(null);
	const [foldersPage, setFoldersPage] = useState(0);
	const [foldersTotal, setFoldersTotal] = useState(0);

	// Calculators state
	const [calculators, setCalculators] = useState<UserCalculator[]>([]);
	const [calculatorsStats, setCalculatorsStats] = useState<CalculatorStats | null>(null);
	const [calculatorsPage, setCalculatorsPage] = useState(0);
	const [calculatorsTotal, setCalculatorsTotal] = useState(0);

	// Contacts state
	const [contacts, setContacts] = useState<UserContact[]>([]);
	const [contactsStats, setContactsStats] = useState<ContactStats | null>(null);
	const [contactsPage, setContactsPage] = useState(0);
	const [contactsTotal, setContactsTotal] = useState(0);

	// Stats expanded
	const [statsExpanded, setStatsExpanded] = useState(true);

	const rowsPerPage = 10;

	const fetchFolders = async (page = 0) => {
		try {
			const response = await UserResourcesService.getFolders(userId, { page: page + 1, limit: rowsPerPage });
			if (response.success) {
				setFolders(response.data);
				setFoldersStats(response.stats);
				setFoldersTotal(response.pagination.total);
			}
		} catch (err: any) {
			console.error("Error fetching folders:", err);
		}
	};

	const fetchCalculators = async (page = 0) => {
		try {
			const response = await UserResourcesService.getCalculators(userId, { page: page + 1, limit: rowsPerPage });
			if (response.success) {
				setCalculators(response.data);
				setCalculatorsStats(response.stats);
				setCalculatorsTotal(response.pagination.total);
			}
		} catch (err: any) {
			console.error("Error fetching calculators:", err);
		}
	};

	const fetchContacts = async (page = 0) => {
		try {
			const response = await UserResourcesService.getContacts(userId, { page: page + 1, limit: rowsPerPage });
			if (response.success) {
				setContacts(response.data);
				setContactsStats(response.stats);
				setContactsTotal(response.pagination.total);
			}
		} catch (err: any) {
			console.error("Error fetching contacts:", err);
		}
	};

	const loadAllData = async () => {
		setLoading(true);
		setError(null);
		try {
			await Promise.all([fetchFolders(0), fetchCalculators(0), fetchContacts(0)]);
		} catch (err: any) {
			setError(err.message || "Error al cargar los recursos del usuario");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (userId) {
			loadAllData();
		}
	}, [userId]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-AR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	// Stats Card Component
	const StatCard = ({ label, value, color }: { label: string; value: number | string; color?: string }) => (
		<Box
			sx={{
				p: 1.5,
				borderRadius: 1,
				bgcolor: alpha(color || theme.palette.primary.main, 0.1),
				border: `1px solid ${alpha(color || theme.palette.primary.main, 0.2)}`,
				textAlign: "center",
				minWidth: 80,
			}}
		>
			<Typography variant="h5" sx={{ color: color || theme.palette.primary.main, fontWeight: 600 }}>
				{value}
			</Typography>
			<Typography variant="caption" color="textSecondary">
				{label}
			</Typography>
		</Box>
	);

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				{error}
			</Alert>
		);
	}

	return (
		<Box>
			{/* Header with refresh button */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="h6">Recursos del Usuario</Typography>
					<Tooltip title={statsExpanded ? "Ocultar estadísticas" : "Mostrar estadísticas"}>
						<IconButton size="small" onClick={() => setStatsExpanded(!statsExpanded)}>
							{statsExpanded ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
						</IconButton>
					</Tooltip>
				</Stack>
				<Tooltip title="Actualizar datos">
					<IconButton size="small" onClick={loadAllData} disabled={loading}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* Summary Stats */}
			<Collapse in={statsExpanded}>
				<Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
					<StatCard label="Carpetas" value={foldersStats?.total || 0} color={theme.palette.primary.main} />
					<StatCard label="Activas" value={foldersStats?.active || 0} color={theme.palette.success.main} />
					<StatCard label="Calculadoras" value={calculatorsStats?.total || 0} color={theme.palette.info.main} />
					<StatCard label="Verificadas" value={calculatorsStats?.verified || 0} color={theme.palette.success.main} />
					<StatCard label="Contactos" value={contactsStats?.total || 0} color={theme.palette.secondary.main} />
					<StatCard label="Con Email" value={contactsStats?.withEmail || 0} color={theme.palette.warning.main} />
				</Stack>
			</Collapse>

			{/* Tabs */}
			<Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tab
					icon={<Folder2 size={16} />}
					iconPosition="start"
					label={`Carpetas (${foldersStats?.total || 0})`}
					sx={{ minHeight: 48 }}
				/>
				<Tab
					icon={<Calculator size={16} />}
					iconPosition="start"
					label={`Calculadoras (${calculatorsStats?.total || 0})`}
					sx={{ minHeight: 48 }}
				/>
				<Tab
					icon={<Profile2User size={16} />}
					iconPosition="start"
					label={`Contactos (${contactsStats?.total || 0})`}
					sx={{ minHeight: 48 }}
				/>
			</Tabs>

			{/* Folders Tab */}
			<ResourceTabPanel value={activeTab} index={0}>
				{folders.length === 0 ? (
					<Alert severity="info">Este usuario no tiene carpetas creadas</Alert>
				) : (
					<>
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Nombre</TableCell>
										<TableCell>Materia</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell align="right">Monto</TableCell>
										<TableCell align="center">Cálculos</TableCell>
										<TableCell align="center">Contactos</TableCell>
										<TableCell align="center">Causa</TableCell>
										<TableCell>Actualizado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{folders.map((folder) => (
										<TableRow key={folder._id} hover>
											<TableCell>
												<Typography variant="body2" fontWeight={500}>
													{folder.folderName}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{folder.materia}</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={folder.archived ? "Archivada" : folder.status}
													size="small"
													color={folder.archived ? "default" : folder.status === "En Proceso" ? "primary" : "success"}
													variant="outlined"
												/>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2">{folder.amount ? formatCurrency(folder.amount) : "-"}</Typography>
											</TableCell>
											<TableCell align="center">{folder.calculatorsCount || 0}</TableCell>
											<TableCell align="center">{folder.contactsCount || 0}</TableCell>
											<TableCell align="center">
												{folder.causaVerified ? (
													<Chip label="Vinculada" size="small" color="success" variant="outlined" />
												) : (
													<Typography variant="caption" color="textSecondary">
														-
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Typography variant="caption">{formatDate(folder.updatedAt)}</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							count={foldersTotal}
							page={foldersPage}
							onPageChange={(_e, newPage) => {
								setFoldersPage(newPage);
								fetchFolders(newPage);
							}}
							rowsPerPage={rowsPerPage}
							rowsPerPageOptions={[10]}
							labelRowsPerPage="Por página:"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</>
				)}
			</ResourceTabPanel>

			{/* Calculators Tab */}
			<ResourceTabPanel value={activeTab} index={1}>
				{calculators.length === 0 ? (
					<Alert severity="info">Este usuario no tiene calculadoras creadas</Alert>
				) : (
					<>
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Tipo</TableCell>
										<TableCell>Clase</TableCell>
										<TableCell>Carpeta</TableCell>
										<TableCell align="right">Monto</TableCell>
										<TableCell align="right">Capital</TableCell>
										<TableCell align="right">Interés</TableCell>
										<TableCell align="center">Verificado</TableCell>
										<TableCell>Actualizado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{calculators.map((calc) => (
										<TableRow key={calc._id} hover>
											<TableCell>
												<Chip label={calc.type} size="small" variant="outlined" />
											</TableCell>
											<TableCell>
												<Typography variant="body2">{calc.classType}</Typography>
												{calc.subClassType && (
													<Typography variant="caption" color="textSecondary">
														{calc.subClassType}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Typography variant="caption">{calc.folderName || "-"}</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" fontWeight={500}>
													{formatCurrency(calc.amount)}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="caption">{calc.capital ? formatCurrency(calc.capital) : "-"}</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="caption">{calc.interest ? formatCurrency(calc.interest) : "-"}</Typography>
											</TableCell>
											<TableCell align="center">
												{calc.isVerified ? (
													<Chip label="Sí" size="small" color="success" />
												) : (
													<Typography variant="caption" color="textSecondary">
														No
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Typography variant="caption">{formatDate(calc.updatedAt)}</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							count={calculatorsTotal}
							page={calculatorsPage}
							onPageChange={(_e, newPage) => {
								setCalculatorsPage(newPage);
								fetchCalculators(newPage);
							}}
							rowsPerPage={rowsPerPage}
							rowsPerPageOptions={[10]}
							labelRowsPerPage="Por página:"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</>
				)}
			</ResourceTabPanel>

			{/* Contacts Tab */}
			<ResourceTabPanel value={activeTab} index={2}>
				{contacts.length === 0 ? (
					<Alert severity="info">Este usuario no tiene contactos creados</Alert>
				) : (
					<>
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Nombre</TableCell>
										<TableCell>Rol</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Email</TableCell>
										<TableCell>Teléfono</TableCell>
										<TableCell>Ubicación</TableCell>
										<TableCell align="center">Carpetas</TableCell>
										<TableCell>Actualizado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{contacts.map((contact) => (
										<TableRow key={contact._id} hover>
											<TableCell>
												<Typography variant="body2" fontWeight={500}>
													{contact.name} {contact.lastName}
												</Typography>
												{contact.company && (
													<Typography variant="caption" color="textSecondary">
														{contact.company}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Chip label={contact.role} size="small" variant="outlined" />
											</TableCell>
											<TableCell>
												<Typography variant="caption">{contact.type}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{contact.email || "-"}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{contact.phone || "-"}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{contact.city && contact.state ? `${contact.city}, ${contact.state}` : "-"}
												</Typography>
											</TableCell>
											<TableCell align="center">{contact.folderIds?.length || 0}</TableCell>
											<TableCell>
												<Typography variant="caption">{formatDate(contact.updatedAt)}</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<TablePagination
							component="div"
							count={contactsTotal}
							page={contactsPage}
							onPageChange={(_e, newPage) => {
								setContactsPage(newPage);
								fetchContacts(newPage);
							}}
							rowsPerPage={rowsPerPage}
							rowsPerPageOptions={[10]}
							labelRowsPerPage="Por página:"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</>
				)}
			</ResourceTabPanel>
		</Box>
	);
};

export default UserResourcesTab;
