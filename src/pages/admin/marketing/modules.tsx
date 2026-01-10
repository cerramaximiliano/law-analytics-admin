import React from "react";
import { useState, useEffect, useCallback } from "react";
import mktAxios from "utils/mktAxios";

// material-ui
import {
	Autocomplete,
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	FormControlLabel,
	Tab,
	Tabs,
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
} from "@mui/material";

// project imports
import MainCard from "components/MainCard";
import { Add, Edit2, Eye, Trash, Copy } from "iconsax-react";
import { useSnackbar } from "notistack";
import AnimateButton from "components/@extended/AnimateButton";
import TableSkeleton from "components/UI/TableSkeleton";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";

// types
interface EmailModule {
	_id: string;
	name: string;
	displayName: string;
	category: string;
	description: string;
	htmlContent: string;
	variables: string[];
	isActive: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface ModuleCategory {
	value: string;
	label: string;
	description: string;
}

interface NewEmailModule {
	name: string;
	displayName: string;
	category: string;
	description: string;
	htmlContent: string;
	variables: string[];
	sortOrder: number;
	isActive: boolean;
}

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} id={`module-tabpanel-${index}`} {...other}>
			{value === index && <Box sx={{ p: 0 }}>{children}</Box>}
		</div>
	);
}

// Category display mapping
const categoryDisplay: Record<string, string> = {
	footer: "Footer",
	header: "Header",
	signature: "Firma",
	cta: "Call to Action",
	social: "Redes Sociales",
	legal: "Legal",
	divider: "Separador",
	other: "Otro",
};

// Category colors
const categoryColors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
	footer: "primary",
	header: "secondary",
	signature: "info",
	cta: "success",
	social: "warning",
	legal: "error",
	divider: "default",
	other: "default",
};

// Default blank module HTML
const defaultHtmlContent = `<div style="text-align: center; padding: 20px; background-color: #f8f8f8;">
  <p style="margin: 0; color: #666; font-size: 12px;">
    &copy; \${year} Law||Analytics. Todos los derechos reservados.
  </p>
  <p style="margin: 10px 0 0; color: #999; font-size: 11px;">
    <a href="\${process.env.BASE_URL}/unsubscribe?email=\${email}" style="color: #3b82f6; text-decoration: none;">Cancelar suscripción</a>
  </p>
</div>`;

// ==============================|| ADMIN - EMAIL MODULES ||============================== //

const EmailModules = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State
	const [modules, setModules] = useState<EmailModule[]>([]);
	const [categories, setCategories] = useState<ModuleCategory[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Modal states
	const [createOpen, setCreateOpen] = useState<boolean>(false);
	const [editOpen, setEditOpen] = useState<boolean>(false);
	const [detailOpen, setDetailOpen] = useState<boolean>(false);
	const [deleteOpen, setDeleteOpen] = useState<boolean>(false);

	const [selectedModule, setSelectedModule] = useState<EmailModule | null>(null);
	const [editModule, setEditModule] = useState<EmailModule | null>(null);
	const [moduleToDelete, setModuleToDelete] = useState<EmailModule | null>(null);

	const [creating, setCreating] = useState<boolean>(false);
	const [updating, setUpdating] = useState<boolean>(false);
	const [deleting, setDeleting] = useState<boolean>(false);

	const [viewTab, setViewTab] = useState<number>(0);
	const [createViewTab, setCreateViewTab] = useState<number>(0);
	const [editViewTab, setEditViewTab] = useState<number>(0);

	// Form state
	const [newModule, setNewModule] = useState<NewEmailModule>({
		name: "",
		displayName: "",
		category: "footer",
		description: "",
		htmlContent: defaultHtmlContent,
		variables: ["year", "email", "process.env.BASE_URL"],
		sortOrder: 0,
		isActive: true,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Pagination
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	// Filters
	const [filter, setFilter] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	// Fetch modules
	const fetchModules = useCallback(async () => {
		try {
			setLoading(true);
			const response = await mktAxios.get("/api/modules?includeInactive=true");
			if (response.data.success) {
				setModules(response.data.data);
				setError(null);
			} else {
				setError("Error fetching modules");
			}
		} catch (err: any) {
			console.error("Error fetching modules:", err);
			setError(err.message || "Error fetching modules");
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch categories
	const fetchCategories = useCallback(async () => {
		try {
			const response = await mktAxios.get("/api/modules/categories");
			if (response.data.success) {
				setCategories(response.data.data);
			}
		} catch (err: any) {
			console.error("Error fetching categories:", err);
		}
	}, []);

	useEffect(() => {
		fetchModules();
		fetchCategories();
	}, [fetchModules, fetchCategories]);

	// Handlers
	const handleChangePage = (_: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Create modal handlers
	const handleOpenCreate = () => {
		setCreateOpen(true);
		setCreateViewTab(0);
		setNewModule({
			name: "",
			displayName: "",
			category: "footer",
			description: "",
			htmlContent: defaultHtmlContent,
			variables: ["year", "email", "process.env.BASE_URL"],
			sortOrder: 0,
			isActive: true,
		});
		setErrors({});
	};

	const handleCloseCreate = () => {
		setCreateOpen(false);
	};

	// Detail modal handlers
	const handleOpenDetail = (module: EmailModule) => {
		setSelectedModule(module);
		setDetailOpen(true);
		setViewTab(0);
	};

	const handleCloseDetail = () => {
		setDetailOpen(false);
		setSelectedModule(null);
	};

	// Edit modal handlers
	const handleOpenEdit = (module: EmailModule) => {
		setEditModule(module);
		setEditOpen(true);
		setEditViewTab(0);
		setErrors({});
	};

	const handleCloseEdit = () => {
		setEditOpen(false);
		setEditModule(null);
	};

	// Delete modal handlers
	const handleOpenDelete = (module: EmailModule) => {
		setModuleToDelete(module);
		setDeleteOpen(true);
	};

	const handleCloseDelete = () => {
		setDeleteOpen(false);
		setModuleToDelete(null);
	};

	// Form handlers
	const handleModuleChange = (field: keyof NewEmailModule, value: string | boolean | string[] | number) => {
		setNewModule({ ...newModule, [field]: value });
		if (errors[field]) {
			setErrors({ ...errors, [field]: "" });
		}
	};

	const handleEditModuleChange = (field: keyof EmailModule, value: string | boolean | string[] | number) => {
		if (editModule) {
			setEditModule({ ...editModule, [field]: value });
			if (errors[field]) {
				setErrors({ ...errors, [field]: "" });
			}
		}
	};

	// Validate form
	const validateForm = (module: NewEmailModule | EmailModule): boolean => {
		const newErrors: Record<string, string> = {};

		if (!module.name.trim()) {
			newErrors.name = "El identificador es obligatorio";
		} else if (!/^[a-z0-9_]+$/.test(module.name)) {
			newErrors.name = "Solo letras minúsculas, números y guiones bajos";
		}

		if (!module.displayName.trim()) {
			newErrors.displayName = "El nombre es obligatorio";
		}

		if (!module.htmlContent.trim()) {
			newErrors.htmlContent = "El contenido HTML es obligatorio";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Create module
	const handleCreateModule = async () => {
		if (!validateForm(newModule)) return;

		setCreating(true);
		try {
			const response = await mktAxios.post("/api/modules", newModule);
			if (response.data.success) {
				await fetchModules();
				setCreateOpen(false);
				enqueueSnackbar("Módulo creado con éxito", { variant: "success" });
			} else {
				enqueueSnackbar(response.data.error || "Error al crear módulo", { variant: "error" });
			}
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.error || err.message || "Error al crear módulo", { variant: "error" });
		} finally {
			setCreating(false);
		}
	};

	// Update module
	const handleUpdateModule = async () => {
		if (!editModule || !validateForm(editModule)) return;

		setUpdating(true);
		try {
			const response = await mktAxios.put(`/api/modules/${editModule._id}`, editModule);
			if (response.data.success) {
				await fetchModules();
				setEditOpen(false);
				enqueueSnackbar("Módulo actualizado con éxito", { variant: "success" });
			} else {
				enqueueSnackbar(response.data.error || "Error al actualizar módulo", { variant: "error" });
			}
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.error || err.message || "Error al actualizar módulo", { variant: "error" });
		} finally {
			setUpdating(false);
		}
	};

	// Delete module
	const handleDeleteModule = async () => {
		if (!moduleToDelete) return;

		setDeleting(true);
		try {
			const response = await mktAxios.delete(`/api/modules/${moduleToDelete._id}`);
			if (response.data.success) {
				await fetchModules();
				setDeleteOpen(false);
				enqueueSnackbar("Módulo desactivado con éxito", { variant: "success" });
			} else {
				enqueueSnackbar(response.data.error || "Error al desactivar módulo", { variant: "error" });
			}
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.error || err.message || "Error al desactivar módulo", { variant: "error" });
		} finally {
			setDeleting(false);
		}
	};

	// Filter modules
	const filteredModules = modules.filter(
		(module) =>
			(categoryFilter === "all" || module.category === categoryFilter) &&
			(module.name.toLowerCase().includes(filter.toLowerCase()) ||
				module.displayName.toLowerCase().includes(filter.toLowerCase()) ||
				module.description.toLowerCase().includes(filter.toLowerCase())),
	);

	// Categories for filter
	const filterCategories = ["all", ...new Set(modules.map((m) => m.category))];

	return (
		<MainCard>
			<Box sx={{ mb: 2 }}>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h3">Módulos HTML</Typography>
						<Typography variant="body2" color="textSecondary">
							Componentes reutilizables para plantillas de email (footers, headers, etc.)
						</Typography>
					</Grid>
					<Grid item>
						<Button variant="contained" color="primary" startIcon={<Add />} onClick={handleOpenCreate}>
							Nuevo módulo
						</Button>
					</Grid>
				</Grid>
			</Box>

			<MarketingQuickNav />

			<MainCard content={false}>
				<Box sx={{ p: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								value={filter}
								onChange={(e) => {
									setFilter(e.target.value);
									setPage(0);
								}}
								label="Buscar módulo"
								placeholder="Buscar por nombre o descripción"
								size="small"
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
								{filterCategories.map((category) => (
									<Chip
										key={category}
										label={category === "all" ? "Todos" : categoryDisplay[category] || category}
										onClick={() => {
											setCategoryFilter(category);
											setPage(0);
										}}
										color={categoryFilter === category ? "primary" : "default"}
										variant={categoryFilter === category ? "filled" : "outlined"}
										size="small"
									/>
								))}
							</Box>
						</Grid>
					</Grid>
				</Box>
				<Divider />

				{error ? (
					<Box sx={{ p: 3, textAlign: "center" }}>
						<Typography color="error">{error}</Typography>
					</Box>
				) : (
					<>
						<TableContainer component={Paper} sx={{ boxShadow: "none" }}>
							<Table sx={{ minWidth: 750 }}>
								<TableHead>
									<TableRow>
										<TableCell>Nombre</TableCell>
										<TableCell>Identificador</TableCell>
										<TableCell>Categoría</TableCell>
										<TableCell>Descripción</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell align="center">Acciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{loading ? (
										<TableSkeleton columns={6} rows={5} />
									) : filteredModules.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} align="center" sx={{ py: 3 }}>
												<Typography variant="subtitle1">No hay módulos disponibles</Typography>
											</TableCell>
										</TableRow>
									) : (
										filteredModules.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((module) => (
											<TableRow hover key={module._id}>
												<TableCell>
													<Typography variant="subtitle2">{module.displayName}</Typography>
												</TableCell>
												<TableCell>
													<Chip label={`{{module:${module.name}}}`} size="small" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }} />
												</TableCell>
												<TableCell>
													<Chip label={categoryDisplay[module.category] || module.category} color={categoryColors[module.category] || "default"} size="small" />
												</TableCell>
												<TableCell>{module.description || "-"}</TableCell>
												<TableCell>
													<Chip label={module.isActive ? "Activo" : "Inactivo"} color={module.isActive ? "success" : "default"} size="small" />
												</TableCell>
												<TableCell align="center">
													<Stack direction="row" spacing={1} justifyContent="center">
														<IconButton size="small" color="info" onClick={() => handleOpenDetail(module)}>
															<Eye size={18} />
														</IconButton>
														<IconButton size="small" color="primary" onClick={() => handleOpenEdit(module)}>
															<Edit2 size={18} />
														</IconButton>
														<Tooltip title="Copiar sintaxis">
															<IconButton
																size="small"
																color="secondary"
																onClick={() => {
																	navigator.clipboard.writeText(`{{module:${module.name}}}`);
																	enqueueSnackbar("Sintaxis copiada al portapapeles", { variant: "success" });
																}}
															>
																<Copy size={18} />
															</IconButton>
														</Tooltip>
														<IconButton size="small" color="error" onClick={() => handleOpenDelete(module)} disabled={!module.isActive}>
															<Trash size={18} />
														</IconButton>
													</Stack>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>

						<TablePagination
							rowsPerPageOptions={[5, 10, 25]}
							component="div"
							count={filteredModules.length}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={handleChangePage}
							onRowsPerPageChange={handleChangeRowsPerPage}
							labelRowsPerPage="Filas por página:"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</>
				)}
			</MainCard>

			{/* Stats Cards */}
			<Grid container spacing={3} sx={{ mt: 2 }}>
				<Grid item xs={12} md={4}>
					<Card>
						<CardHeader title="Estadísticas" />
						<CardContent>
							<Stack spacing={2}>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Total de módulos
									</Typography>
									<Typography variant="h4">{modules.length}</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" color="textSecondary">
										Módulos activos
									</Typography>
									<Typography variant="h4">{modules.filter((m) => m.isActive).length}</Typography>
								</Box>
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} md={8}>
					<Card>
						<CardHeader title="Uso en templates" />
						<CardContent>
							<Typography variant="body2" sx={{ mb: 2 }}>
								Para usar un módulo en una plantilla, inserta la siguiente sintaxis en el código HTML:
							</Typography>
							<Box
								sx={{
									p: 2,
									bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[100],
									borderRadius: 1,
									fontFamily: "monospace",
								}}
							>
								{`{{module:nombre_del_modulo}}`}
							</Box>
							<Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
								El módulo se expandirá con su contenido HTML. Las variables dentro del módulo serán procesadas junto con las del template.
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Detail Modal */}
			<Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="md" fullWidth>
				{selectedModule && (
					<>
						<DialogTitle>
							{selectedModule.displayName}
							<Typography variant="body2" color="textSecondary">
								{`{{module:${selectedModule.name}}}`}
							</Typography>
						</DialogTitle>
						<Divider />
						<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
							<Tabs value={viewTab} onChange={(_, v) => setViewTab(v)}>
								<Tab label="Vista previa" />
								<Tab label="Código HTML" />
							</Tabs>
						</Box>
						<DialogContent sx={{ minHeight: 300 }}>
							<TabPanel value={viewTab} index={0}>
								<Box sx={{ mb: 2 }}>
									<Chip label={categoryDisplay[selectedModule.category]} color={categoryColors[selectedModule.category]} size="small" sx={{ mr: 1 }} />
									<Chip label={selectedModule.isActive ? "Activo" : "Inactivo"} color={selectedModule.isActive ? "success" : "default"} size="small" />
								</Box>
								{selectedModule.description && (
									<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
										{selectedModule.description}
									</Typography>
								)}
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Preview:
								</Typography>
								<Box
									sx={{
										border: 1,
										borderColor: "divider",
										borderRadius: 1,
										p: 2,
										bgcolor: theme.palette.background.default,
									}}
									dangerouslySetInnerHTML={{ __html: selectedModule.htmlContent }}
								/>
							</TabPanel>
							<TabPanel value={viewTab} index={1}>
								<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
									<IconButton
										onClick={() => {
											navigator.clipboard.writeText(selectedModule.htmlContent);
											enqueueSnackbar("HTML copiado", { variant: "success" });
										}}
									>
										<Copy size={18} />
									</IconButton>
								</Box>
								<Box
									component="pre"
									sx={{
										p: 2,
										bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
										borderRadius: 1,
										overflow: "auto",
										fontSize: "0.875rem",
										fontFamily: "monospace",
									}}
								>
									{selectedModule.htmlContent}
								</Box>
							</TabPanel>
						</DialogContent>
						<DialogActions>
							<Button onClick={handleCloseDetail}>Cerrar</Button>
							<Button color="primary" onClick={() => handleOpenEdit(selectedModule)}>
								Editar
							</Button>
						</DialogActions>
					</>
				)}
			</Dialog>

			{/* Create Modal */}
			<Dialog open={createOpen} onClose={handleCloseCreate} maxWidth="lg" fullWidth>
				<DialogTitle>Nuevo módulo HTML</DialogTitle>
				<Divider />
				<DialogContent sx={{ p: 3 }}>
					<Grid container spacing={3}>
						<Grid item xs={12} md={6}>
							<TextField
								label="Nombre para mostrar"
								fullWidth
								value={newModule.displayName}
								onChange={(e) => handleModuleChange("displayName", e.target.value)}
								error={!!errors.displayName}
								helperText={errors.displayName}
								required
								sx={{ mb: 2 }}
							/>

							<TextField
								label="Identificador (para usar en templates)"
								fullWidth
								value={newModule.name}
								onChange={(e) => handleModuleChange("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
								error={!!errors.name}
								helperText={errors.name || "Solo letras minúsculas, números y guiones bajos"}
								required
								sx={{ mb: 2 }}
							/>

							<FormControl fullWidth sx={{ mb: 2 }}>
								<InputLabel>Categoría</InputLabel>
								<Select value={newModule.category} label="Categoría" onChange={(e) => handleModuleChange("category", e.target.value)}>
									{categories.map((cat) => (
										<MenuItem key={cat.value} value={cat.value}>
											{cat.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<TextField
								label="Descripción"
								fullWidth
								value={newModule.description}
								onChange={(e) => handleModuleChange("description", e.target.value)}
								multiline
								rows={2}
								sx={{ mb: 2 }}
							/>

							<FormControlLabel
								control={<Switch checked={newModule.isActive} onChange={(e) => handleModuleChange("isActive", e.target.checked)} />}
								label="Activo"
							/>

							<Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.info.lighter, borderRadius: 1 }}>
								<Typography variant="caption" color="textSecondary">
									<strong>Sintaxis de uso:</strong>
								</Typography>
								<Typography variant="body2" sx={{ fontFamily: "monospace", mt: 0.5 }}>
									{`{{module:${newModule.name || "nombre"}}}`}
								</Typography>
							</Box>
						</Grid>

						<Grid item xs={12} md={6}>
							<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
								<Tabs value={createViewTab} onChange={(_, v) => setCreateViewTab(v)}>
									<Tab label="Vista previa" />
									<Tab label="Código HTML" />
								</Tabs>
							</Box>

							<TabPanel value={createViewTab} index={0}>
								<Box
									sx={{
										border: 1,
										borderColor: "divider",
										borderRadius: 1,
										p: 2,
										minHeight: 300,
										bgcolor: theme.palette.background.default,
									}}
									dangerouslySetInnerHTML={{ __html: newModule.htmlContent }}
								/>
							</TabPanel>

							<TabPanel value={createViewTab} index={1}>
								<TextField
									label="Código HTML"
									fullWidth
									multiline
									rows={14}
									value={newModule.htmlContent}
									onChange={(e) => handleModuleChange("htmlContent", e.target.value)}
									error={!!errors.htmlContent}
									helperText={errors.htmlContent}
									sx={{ fontFamily: "monospace", "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: "0.875rem" } }}
								/>
							</TabPanel>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCreate}>Cancelar</Button>
					<AnimateButton>
						<Button variant="contained" onClick={handleCreateModule} disabled={creating}>
							{creating ? "Creando..." : "Crear módulo"}
						</Button>
					</AnimateButton>
				</DialogActions>
			</Dialog>

			{/* Edit Modal */}
			<Dialog open={editOpen} onClose={handleCloseEdit} maxWidth="lg" fullWidth>
				{editModule && (
					<>
						<DialogTitle>Editar módulo: {editModule.displayName}</DialogTitle>
						<Divider />
						<DialogContent sx={{ p: 3 }}>
							<Grid container spacing={3}>
								<Grid item xs={12} md={6}>
									<TextField
										label="Nombre para mostrar"
										fullWidth
										value={editModule.displayName}
										onChange={(e) => handleEditModuleChange("displayName", e.target.value)}
										error={!!errors.displayName}
										helperText={errors.displayName}
										required
										sx={{ mb: 2 }}
									/>

									<TextField
										label="Identificador"
										fullWidth
										value={editModule.name}
										onChange={(e) => handleEditModuleChange("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
										error={!!errors.name}
										helperText={errors.name}
										required
										sx={{ mb: 2 }}
									/>

									<FormControl fullWidth sx={{ mb: 2 }}>
										<InputLabel>Categoría</InputLabel>
										<Select value={editModule.category} label="Categoría" onChange={(e) => handleEditModuleChange("category", e.target.value)}>
											{categories.map((cat) => (
												<MenuItem key={cat.value} value={cat.value}>
													{cat.label}
												</MenuItem>
											))}
										</Select>
									</FormControl>

									<TextField
										label="Descripción"
										fullWidth
										value={editModule.description}
										onChange={(e) => handleEditModuleChange("description", e.target.value)}
										multiline
										rows={2}
										sx={{ mb: 2 }}
									/>

									<FormControlLabel
										control={<Switch checked={editModule.isActive} onChange={(e) => handleEditModuleChange("isActive", e.target.checked)} />}
										label="Activo"
									/>
								</Grid>

								<Grid item xs={12} md={6}>
									<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
										<Tabs value={editViewTab} onChange={(_, v) => setEditViewTab(v)}>
											<Tab label="Vista previa" />
											<Tab label="Código HTML" />
										</Tabs>
									</Box>

									<TabPanel value={editViewTab} index={0}>
										<Box
											sx={{
												border: 1,
												borderColor: "divider",
												borderRadius: 1,
												p: 2,
												minHeight: 300,
												bgcolor: theme.palette.background.default,
											}}
											dangerouslySetInnerHTML={{ __html: editModule.htmlContent }}
										/>
									</TabPanel>

									<TabPanel value={editViewTab} index={1}>
										<TextField
											label="Código HTML"
											fullWidth
											multiline
											rows={14}
											value={editModule.htmlContent}
											onChange={(e) => handleEditModuleChange("htmlContent", e.target.value)}
											error={!!errors.htmlContent}
											helperText={errors.htmlContent}
											sx={{ fontFamily: "monospace", "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: "0.875rem" } }}
										/>
									</TabPanel>
								</Grid>
							</Grid>
						</DialogContent>
						<DialogActions>
							<Button onClick={handleCloseEdit}>Cancelar</Button>
							<AnimateButton>
								<Button variant="contained" onClick={handleUpdateModule} disabled={updating}>
									{updating ? "Guardando..." : "Guardar cambios"}
								</Button>
							</AnimateButton>
						</DialogActions>
					</>
				)}
			</Dialog>

			{/* Delete Confirmation Modal */}
			<Dialog open={deleteOpen} onClose={handleCloseDelete} maxWidth="xs">
				{moduleToDelete && (
					<>
						<DialogTitle>Desactivar módulo</DialogTitle>
						<DialogContent>
							<Typography>¿Estás seguro que deseas desactivar este módulo?</Typography>
							<Typography variant="subtitle2" sx={{ mt: 2 }}>
								<strong>Módulo:</strong> {moduleToDelete.displayName}
							</Typography>
							<Typography variant="caption" color="textSecondary">
								Al desactivar este módulo, no estará disponible para nuevos templates. Los templates existentes que lo usen mostrarán un comentario HTML indicando que el módulo
								no fue encontrado.
							</Typography>
						</DialogContent>
						<DialogActions>
							<Button onClick={handleCloseDelete}>Cancelar</Button>
							<AnimateButton>
								<Button variant="contained" color="error" onClick={handleDeleteModule} disabled={deleting}>
									{deleting ? "Desactivando..." : "Desactivar"}
								</Button>
							</AnimateButton>
						</DialogActions>
					</>
				)}
			</Dialog>
		</MainCard>
	);
};

export default EmailModules;
