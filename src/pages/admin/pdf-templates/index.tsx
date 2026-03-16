import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Grid,
	Typography,
	Button,
	IconButton,
	Tooltip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Paper,
	Chip,
	TextField,
	MenuItem,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	FormControl,
	InputLabel,
	Select,
	Stack,
	Skeleton,
	InputAdornment,
	Switch,
	FormControlLabel,
	Divider,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	useTheme,
	alpha,
} from "@mui/material";
import {
	SearchNormal1,
	CloseCircle,
	Eye,
	Edit,
	Trash,
	Add,
	Refresh,
	DocumentText,
	ToggleOff,
	ToggleOn,
	ArrowDown2,
	Cloud,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import PdfTemplatesAdminService, { PdfTemplate, PdfTemplateStats, PdfField } from "api/pdfTemplatesAdmin";
import dayjs from "dayjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (d?: string) => (d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "-");

const CATEGORY_LABELS: Record<string, string> = {
	postal: "Postal",
	laboral: "Laboral",
	judicial: "Judicial",
	societario: "Societario",
	notarial: "Notarial",
	otros: "Otros",
};

const STATUS_CHIP: Record<string, { color: "default" | "success" | "warning" | "error"; label: string }> = {
	system: { color: "success", label: "Sistema" },
	user: { color: "warning", label: "Usuario" },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: number; color: string; loading?: boolean }> = ({ label, value, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
			<Typography variant="caption" color="textSecondary" display="block">
				{label}
			</Typography>
			{loading ? (
				<Skeleton variant="text" width={50} height={32} />
			) : (
				<Typography variant="h5" fontWeight="bold" sx={{ color }}>
					{value.toLocaleString()}
				</Typography>
			)}
		</Paper>
	);
};

// ── Detail Dialog ─────────────────────────────────────────────────────────────

interface DetailDialogProps {
	open: boolean;
	template: PdfTemplate | null;
	onClose: () => void;
	onToggleActive: (t: PdfTemplate) => void;
	onEdit: (t: PdfTemplate) => void;
	onDelete: (t: PdfTemplate) => void;
}

const DetailDialog: React.FC<DetailDialogProps> = ({ open, template, onClose, onToggleActive, onEdit, onDelete }) => {
	const [loadingUrl, setLoadingUrl] = useState(false);

	const handleOpenPdf = async () => {
		if (!template) return;
		setLoadingUrl(true);
		try {
			const res = await PdfTemplatesAdminService.getPresignedUrl(template._id);
			window.open(res.data.presignedUrl, "_blank");
		} catch {
			/* ignore */
		} finally {
			setLoadingUrl(false);
		}
	};

	if (!template) return null;
	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<Typography variant="h6">{template.name}</Typography>
					<Chip
						label={template.isActive ? "Activo" : "Inactivo"}
						color={template.isActive ? "success" : "default"}
						size="small"
					/>
				</Box>
			</DialogTitle>
			<DialogContent dividers>
				<Grid container spacing={2}>
					{/* Left column */}
					<Grid item xs={12} sm={6}>
						<Stack spacing={1.5}>
							{[
								{ label: "ID", value: template._id },
								{ label: "Slug", value: template.slug },
								{ label: "Descripción", value: template.description || "-" },
								{ label: "Categoría", value: CATEGORY_LABELS[template.category] || template.category },
								{ label: "Tipo", value: template.modelType },
								{ label: "Método de relleno", value: template.fillMethod },
								{ label: "Fuente", value: template.source },
							].map(({ label, value }) => (
								<Box key={label}>
									<Typography variant="caption" color="textSecondary">
										{label}
									</Typography>
									<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
										{value}
									</Typography>
								</Box>
							))}
						</Stack>
					</Grid>
					{/* Right column */}
					<Grid item xs={12} sm={6}>
						<Stack spacing={1.5}>
							{[
								{ label: "Seguimiento postal", value: template.supportsTracking ? "Sí" : "No" },
								{ label: "Público", value: template.isPublic ? "Sí" : "No" },
								{ label: "Campos", value: String(template.fields?.length ?? "-") },
								{ label: "S3 Key", value: template.s3Key },
								{ label: "Creado", value: formatDate(template.createdAt) },
								{ label: "Actualizado", value: formatDate(template.updatedAt) },
							].map(({ label, value }) => (
								<Box key={label}>
									<Typography variant="caption" color="textSecondary">
										{label}
									</Typography>
									<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
										{value}
									</Typography>
								</Box>
							))}
							<Button
								variant="outlined"
								size="small"
								startIcon={<Cloud size={14} />}
								onClick={handleOpenPdf}
								disabled={loadingUrl}
							>
								{loadingUrl ? "Generando URL..." : "Abrir PDF base en S3"}
							</Button>
						</Stack>
					</Grid>

					{/* Fields accordion */}
					{template.fields && template.fields.length > 0 && (
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
								<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
									<Typography variant="body2" fontWeight="medium">
										Campos del formulario ({template.fields.length})
									</Typography>
								</AccordionSummary>
								<AccordionDetails sx={{ p: 0 }}>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Nombre</TableCell>
													<TableCell>Label</TableCell>
													<TableCell>Tipo</TableCell>
													<TableCell>Grupo</TableCell>
													<TableCell align="center">Req.</TableCell>
													<TableCell align="center">X / Y</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{[...template.fields]
													.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
													.map((f: PdfField) => (
														<TableRow key={f.name}>
															<TableCell>
																<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
																	{f.name}
																</Typography>
															</TableCell>
															<TableCell>{f.label || "-"}</TableCell>
															<TableCell>
																<Chip label={f.type} size="small" variant="outlined" />
															</TableCell>
															<TableCell>{f.group || "-"}</TableCell>
															<TableCell align="center">
																{f.required ? <Chip label="Sí" size="small" color="error" /> : "-"}
															</TableCell>
															<TableCell align="center">
																{f.x != null ? `${f.x} / ${f.y}` : "-"}
															</TableCell>
														</TableRow>
													))}
											</TableBody>
										</Table>
									</TableContainer>
								</AccordionDetails>
							</Accordion>
						</Grid>
					)}
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => onDelete(template)} color="error" startIcon={<Trash size={16} />}>
					Eliminar
				</Button>
				<Button onClick={() => onToggleActive(template)} startIcon={template.isActive ? <ToggleOff size={16} /> : <ToggleOn size={16} />}>
					{template.isActive ? "Desactivar" : "Activar"}
				</Button>
				<Button onClick={() => onEdit(template)} variant="outlined" startIcon={<Edit size={16} />}>
					Editar
				</Button>
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
};

// ── Edit Dialog ───────────────────────────────────────────────────────────────

interface EditDialogProps {
	open: boolean;
	template: PdfTemplate | null;
	onClose: () => void;
	onSaved: () => void;
}

const EditDialog: React.FC<EditDialogProps> = ({ open, template, onClose, onSaved }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		name: "",
		slug: "",
		description: "",
		category: "judicial" as PdfTemplate["category"],
		s3Key: "",
		isActive: true,
		isPublic: true,
		fillMethod: "overlay" as PdfTemplate["fillMethod"],
		source: "system" as PdfTemplate["source"],
		modelType: "dynamic" as PdfTemplate["modelType"],
		supportsTracking: false,
	});

	useEffect(() => {
		if (template) {
			setForm({
				name: template.name,
				slug: template.slug,
				description: template.description,
				category: template.category,
				s3Key: template.s3Key,
				isActive: template.isActive,
				isPublic: template.isPublic,
				fillMethod: template.fillMethod,
				source: template.source,
				modelType: template.modelType,
				supportsTracking: template.supportsTracking,
			});
		} else {
			setForm({ name: "", slug: "", description: "", category: "judicial", s3Key: "", isActive: true, isPublic: true, fillMethod: "overlay", source: "system", modelType: "dynamic", supportsTracking: false });
		}
	}, [template, open]);

	const handleSave = async () => {
		if (!form.name.trim() || !form.s3Key.trim() || (!template && !form.slug.trim())) {
			enqueueSnackbar("Nombre, slug y S3 Key son requeridos", { variant: "warning" });
			return;
		}
		setSaving(true);
		try {
			if (template) {
				await PdfTemplatesAdminService.update(template._id, { ...form });
				enqueueSnackbar("Template actualizado", { variant: "success" });
			} else {
				await PdfTemplatesAdminService.create({ ...form });
				enqueueSnackbar("Template creado", { variant: "success" });
			}
			onSaved();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || err?.message || "Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{template ? "Editar Template" : "Nuevo Template"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 1 }}>
					<TextField label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} size="small" fullWidth required />
					<TextField
						label="Slug"
						value={form.slug}
						onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
						size="small"
						fullWidth
						required
						disabled={!!template}
						helperText={template ? "El slug no puede modificarse" : "Solo minúsculas y guiones bajos"}
					/>
					<TextField label="Descripción" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} size="small" fullWidth multiline rows={2} />
					<TextField label="S3 Key del PDF base" value={form.s3Key} onChange={(e) => setForm((f) => ({ ...f, s3Key: e.target.value }))} size="small" fullWidth required helperText="Ej: models/cedulas/cedula_notificacion.pdf" />
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<FormControl size="small" fullWidth>
								<InputLabel>Categoría</InputLabel>
								<Select label="Categoría" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as PdfTemplate["category"] }))}>
									{Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl size="small" fullWidth>
								<InputLabel>Método de relleno</InputLabel>
								<Select label="Método de relleno" value={form.fillMethod} onChange={(e) => setForm((f) => ({ ...f, fillMethod: e.target.value as PdfTemplate["fillMethod"] }))}>
									<MenuItem value="overlay">Overlay</MenuItem>
									<MenuItem value="acroform">AcroForm</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl size="small" fullWidth>
								<InputLabel>Fuente</InputLabel>
								<Select label="Fuente" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as PdfTemplate["source"] }))}>
									<MenuItem value="system">Sistema</MenuItem>
									<MenuItem value="user">Usuario</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl size="small" fullWidth>
								<InputLabel>Tipo de modelo</InputLabel>
								<Select label="Tipo de modelo" value={form.modelType} onChange={(e) => setForm((f) => ({ ...f, modelType: e.target.value as PdfTemplate["modelType"] }))}>
									<MenuItem value="dynamic">Dinámico</MenuItem>
									<MenuItem value="static">Estático</MenuItem>
								</Select>
							</FormControl>
						</Grid>
					</Grid>
					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
						<FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />} label="Activo" />
						<FormControlLabel control={<Switch checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} />} label="Público" />
						<FormControlLabel control={<Switch checked={form.supportsTracking} onChange={(e) => setForm((f) => ({ ...f, supportsTracking: e.target.checked }))} />} label="Seguimiento postal" />
					</Box>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>Cancelar</Button>
				<Button onClick={handleSave} variant="contained" disabled={saving}>
					{saving ? "Guardando..." : template ? "Guardar cambios" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

interface DeleteDialogProps {
	open: boolean;
	template: PdfTemplate | null;
	onClose: () => void;
	onConfirm: () => void;
	loading: boolean;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, template, onClose, onConfirm, loading }) => (
	<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
		<DialogTitle>Eliminar Template</DialogTitle>
		<DialogContent>
			{template && (
				<Alert severity="warning" sx={{ mt: 1 }}>
					¿Eliminar el template <strong>{template.name}</strong> ({template.slug})? Esta acción no se puede deshacer.
				</Alert>
			)}
		</DialogContent>
		<DialogActions>
			<Button onClick={onClose} disabled={loading}>Cancelar</Button>
			<Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
				{loading ? "Eliminando..." : "Eliminar"}
			</Button>
		</DialogActions>
	</Dialog>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const PdfTemplatesPage: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// List state
	const [templates, setTemplates] = useState<PdfTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	// Stats
	const [stats, setStats] = useState<PdfTemplateStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	// Filters
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [filterCategory, setFilterCategory] = useState("");
	const [filterIsActive, setFilterIsActive] = useState("");
	const [filterSource, setFilterSource] = useState("");

	// Dialogs
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailTemplate, setDetailTemplate] = useState<PdfTemplate | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [editTemplate, setEditTemplate] = useState<PdfTemplate | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteTemplate, setDeleteTemplate] = useState<PdfTemplate | null>(null);
	const [deleting, setDeleting] = useState(false);

	// ── Fetch ─────────────────────────────────────────────────────────────────

	const fetchStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const res = await PdfTemplatesAdminService.getStats();
			if (res.success) setStats(res.data);
		} catch (err) {
			console.error("Error fetching template stats:", err);
		} finally {
			setStatsLoading(false);
		}
	}, []);

	const fetchTemplates = useCallback(async () => {
		setLoading(true);
		try {
			const res = await PdfTemplatesAdminService.getAll({
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				category: filterCategory || undefined,
				isActive: filterIsActive !== "" ? filterIsActive === "true" : undefined,
				source: filterSource || undefined,
			});
			if (res.success) {
				setTemplates(res.data);
				setTotal(res.count);
			}
		} catch (err) {
			console.error("Error fetching templates:", err);
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, search, filterCategory, filterIsActive, filterSource]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchTemplates();
	}, [fetchTemplates]);

	// ── Handlers ──────────────────────────────────────────────────────────────

	const handleSearch = () => { setSearch(searchInput); setPage(0); };
	const handleClearSearch = () => { setSearchInput(""); setSearch(""); setPage(0); };

	const handleOpenDetail = async (t: PdfTemplate) => {
		try {
			const res = await PdfTemplatesAdminService.getById(t._id);
			setDetailTemplate(res.data);
			setDetailOpen(true);
		} catch {
			setDetailTemplate(t);
			setDetailOpen(true);
		}
	};

	const handleToggleActive = async (t: PdfTemplate) => {
		try {
			const res = await PdfTemplatesAdminService.toggleActive(t._id);
			enqueueSnackbar(`Template ${res.data.isActive ? "activado" : "desactivado"}`, { variant: "success" });
			// Update local state
			setTemplates((prev) => prev.map((x) => (x._id === t._id ? { ...x, isActive: res.data.isActive } : x)));
			if (detailTemplate?._id === t._id) setDetailTemplate((prev) => prev && { ...prev, isActive: res.data.isActive });
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al cambiar estado", { variant: "error" });
		}
	};

	const handleOpenEdit = (t: PdfTemplate) => {
		setEditTemplate(t);
		setDetailOpen(false);
		setEditOpen(true);
	};

	const handleOpenDelete = (t: PdfTemplate) => {
		setDeleteTemplate(t);
		setDetailOpen(false);
		setDeleteOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!deleteTemplate) return;
		setDeleting(true);
		try {
			await PdfTemplatesAdminService.remove(deleteTemplate._id);
			enqueueSnackbar("Template eliminado", { variant: "success" });
			setDeleteOpen(false);
			setDeleteTemplate(null);
			fetchTemplates();
			fetchStats();
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al eliminar", { variant: "error" });
		} finally {
			setDeleting(false);
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<MainCard
			title="Modelos PDF"
			content={false}
			secondary={
				<Stack direction="row" spacing={1}>
					<Tooltip title="Actualizar">
						<IconButton size="small" onClick={() => { fetchTemplates(); fetchStats(); }}>
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
					<Button variant="contained" size="small" startIcon={<Add size={16} />} onClick={() => { setEditTemplate(null); setEditOpen(true); }}>
						Nuevo template
					</Button>
				</Stack>
			}
		>
			{/* Stats */}
			<Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: "divider" }}>
				<Grid container spacing={{ xs: 1, sm: 2 }}>
					{[
						{ label: "Total", value: stats?.totals.total ?? 0, color: theme.palette.primary.main },
						{ label: "Activos", value: stats?.totals.active ?? 0, color: theme.palette.success.main },
						{ label: "Públicos", value: stats?.totals.public ?? 0, color: theme.palette.info.main },
						{ label: "Con Seguimiento", value: stats?.totals.supportsTracking ?? 0, color: theme.palette.warning.main },
					].map((s) => (
						<Grid item xs={6} sm={3} key={s.label}>
							<StatCard label={s.label} value={s.value} color={s.color} loading={statsLoading} />
						</Grid>
					))}
				</Grid>
			</Box>

			{/* Stats by Category */}
			{stats?.byCategory && stats.byCategory.length > 0 && (
				<Box sx={{ px: { xs: 1.5, sm: 2 }, pt: 2, pb: 1, borderBottom: 1, borderColor: "divider" }}>
					<Typography variant="caption" color="textSecondary" gutterBottom display="block">
						Por categoría
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
						{stats.byCategory.map((c) => (
							<Chip
								key={c._id}
								label={`${CATEGORY_LABELS[c._id] || c._id}: ${c.count} (${c.active} activos)`}
								size="small"
								variant="outlined"
								sx={{ cursor: "pointer" }}
								onClick={() => { setFilterCategory(c._id); setPage(0); }}
							/>
						))}
					</Box>
				</Box>
			)}

			{/* Filters */}
			<Box sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", gap: 2, flexWrap: "wrap", borderBottom: 1, borderColor: "divider" }}>
				<TextField
					size="small"
					placeholder="Buscar nombre, slug..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					onKeyPress={(e) => e.key === "Enter" && handleSearch()}
					sx={{ minWidth: 220 }}
					InputProps={{
						startAdornment: <InputAdornment position="start"><SearchNormal1 size={16} /></InputAdornment>,
						endAdornment: searchInput && (
							<InputAdornment position="end">
								<IconButton size="small" onClick={handleClearSearch}><CloseCircle size={14} /></IconButton>
							</InputAdornment>
						),
					}}
				/>
				<FormControl size="small" sx={{ minWidth: 130 }}>
					<InputLabel>Categoría</InputLabel>
					<Select label="Categoría" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}>
						<MenuItem value="">Todas</MenuItem>
						{Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Estado</InputLabel>
					<Select label="Estado" value={filterIsActive} onChange={(e) => { setFilterIsActive(e.target.value); setPage(0); }}>
						<MenuItem value="">Todos</MenuItem>
						<MenuItem value="true">Activos</MenuItem>
						<MenuItem value="false">Inactivos</MenuItem>
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Fuente</InputLabel>
					<Select label="Fuente" value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(0); }}>
						<MenuItem value="">Todas</MenuItem>
						<MenuItem value="system">Sistema</MenuItem>
						<MenuItem value="user">Usuario</MenuItem>
					</Select>
				</FormControl>
			</Box>

			{/* Table */}
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: { xs: 800, md: "100%" } }}>
					<TableHead>
						<TableRow>
							<TableCell>Nombre</TableCell>
							<TableCell>Slug</TableCell>
							<TableCell>Categoría</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell>Método</TableCell>
							<TableCell>Fuente</TableCell>
							<TableCell align="center">Activo</TableCell>
							<TableCell align="center">Público</TableCell>
							<TableCell align="center">Campos</TableCell>
							<TableCell>Actualizado</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: rowsPerPage > 10 ? 10 : rowsPerPage }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 11 }).map((_, j) => (
										<TableCell key={j}><Skeleton variant="text" /></TableCell>
									))}
								</TableRow>
							))
						) : templates.length === 0 ? (
							<TableRow>
								<TableCell colSpan={11} align="center">
									<Box sx={{ py: 4 }}>
										<DocumentText size={40} color={theme.palette.text.disabled} />
										<Typography color="textSecondary" sx={{ mt: 1 }}>
											No se encontraron templates
										</Typography>
									</Box>
								</TableCell>
							</TableRow>
						) : (
							templates.map((t) => (
								<TableRow key={t._id} hover>
									<TableCell>
										<Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 200 }}>
											{t.name}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace", color: theme.palette.primary.main }}>
											{t.slug}
										</Typography>
									</TableCell>
									<TableCell>
										<Chip
											label={CATEGORY_LABELS[t.category] || t.category}
											size="small"
											variant="outlined"
											sx={{ fontSize: "0.7rem" }}
										/>
									</TableCell>
									<TableCell>
										<Chip label={t.modelType} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
									</TableCell>
									<TableCell>
										<Typography variant="caption">{t.fillMethod}</Typography>
									</TableCell>
									<TableCell>
										<Chip
											label={STATUS_CHIP[t.source]?.label || t.source}
											color={STATUS_CHIP[t.source]?.color || "default"}
											size="small"
										/>
									</TableCell>
									<TableCell align="center">
										<Chip
											label={t.isActive ? "Sí" : "No"}
											color={t.isActive ? "success" : "default"}
											size="small"
											sx={{ minWidth: 36 }}
										/>
									</TableCell>
									<TableCell align="center">
										<Chip
											label={t.isPublic ? "Sí" : "No"}
											color={t.isPublic ? "info" : "default"}
											size="small"
											sx={{ minWidth: 36 }}
										/>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2">{"-"}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption">{formatDate(t.updatedAt)}</Typography>
									</TableCell>
									<TableCell align="center">
										<Stack direction="row" spacing={0.5} justifyContent="center">
											<Tooltip title="Ver detalle">
												<IconButton size="small" onClick={() => handleOpenDetail(t)}>
													<Eye size={15} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => handleOpenEdit(t)}>
													<Edit size={15} />
												</IconButton>
											</Tooltip>
											<Tooltip title={t.isActive ? "Desactivar" : "Activar"}>
												<IconButton
													size="small"
													onClick={() => handleToggleActive(t)}
													sx={{ color: t.isActive ? theme.palette.success.main : theme.palette.text.disabled }}
												>
													{t.isActive ? <ToggleOn size={15} /> : <ToggleOff size={15} />}
												</IconButton>
											</Tooltip>
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => handleOpenDelete(t)}>
													<Trash size={15} />
												</IconButton>
											</Tooltip>
										</Stack>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

			<TablePagination
				component="div"
				count={total}
				page={page}
				onPageChange={(_, newPage) => setPage(newPage)}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
				rowsPerPageOptions={[10, 20, 50]}
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>

			{/* Dialogs */}
			<DetailDialog
				open={detailOpen}
				template={detailTemplate}
				onClose={() => setDetailOpen(false)}
				onToggleActive={handleToggleActive}
				onEdit={handleOpenEdit}
				onDelete={handleOpenDelete}
			/>
			<EditDialog
				open={editOpen}
				template={editTemplate}
				onClose={() => setEditOpen(false)}
				onSaved={() => { fetchTemplates(); fetchStats(); }}
			/>
			<DeleteDialog
				open={deleteOpen}
				template={deleteTemplate}
				onClose={() => setDeleteOpen(false)}
				onConfirm={handleConfirmDelete}
				loading={deleting}
			/>
		</MainCard>
	);
};

export default PdfTemplatesPage;
