import { useState, useEffect, useCallback } from "react";
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
	Alert,
	InputAdornment,
	Switch,
	FormControlLabel,
	Divider,
	LinearProgress,
} from "@mui/material";
import {
	Refresh,
	Trash,
	SearchNormal1,
	Filter,
	CloseCircle,
	Eye,
	Add,
	Edit2,
	PlayCircle,
	PauseCircle,
	ArrowDown2,
	ArrowUp2,
	Chart,
	Status,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import SurveyAdminService, {
	Survey,
	SurveyFilters,
	SurveyStatus,
	SurveyType,
	SurveyPayload,
	SurveyQuestion,
	QuestionType,
	SurveyReportResponse,
} from "api/surveys";

const STATUS_CONFIG: Record<SurveyStatus, { color: "warning" | "info" | "success" | "default" | "error"; label: string }> = {
	draft: { color: "default", label: "Borrador" },
	active: { color: "success", label: "Activa" },
	paused: { color: "warning", label: "Pausada" },
	closed: { color: "default", label: "Cerrada" },
};

const TYPE_LABEL: Record<SurveyType, string> = {
	nps: "NPS",
	csat: "CSAT",
	custom: "Custom",
	poll: "Poll",
	onboarding: "Onboarding",
	churn: "Churn",
};

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
	text: "Texto corto",
	long_text: "Texto largo",
	rating: "Rating",
	scale: "Escala",
	single_choice: "Opción única",
	multi_choice: "Opción múltiple",
	boolean: "Sí/No",
};

const QUESTION_TYPES_WITH_OPTIONS: QuestionType[] = ["single_choice", "multi_choice"];
const QUESTION_TYPES_WITH_RANGE: QuestionType[] = ["rating", "scale"];

const formatDate = (s?: string | null) => {
	if (!s) return "—";
	const d = new Date(s);
	return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
};

const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const emptyQuestion = (): SurveyQuestion => ({
	id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
	type: "text",
	question: "",
	description: "",
	required: true,
	options: [],
	min: null,
	max: null,
	minLabel: null,
	maxLabel: null,
	order: 0,
});

const emptySurvey = (): SurveyPayload => ({
	title: "",
	slug: "",
	description: "",
	type: "custom",
	questions: [],
	trigger: { event: null, page: null, delayDays: 0, minSessions: 0 },
	targetAudience: { roles: [], planIds: [], onlyActive: true },
	status: "draft",
	startDate: null,
	endDate: null,
	allowMultipleResponses: false,
	autoPublishResponses: false,
});

const SurveysAdminPage = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<Survey[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	const [filterStatus, setFilterStatus] = useState<SurveyStatus | "">("");
	const [filterType, setFilterType] = useState<SurveyType | "">("");
	const [searchTerm, setSearchTerm] = useState("");

	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<Survey | null>(null);
	const [form, setForm] = useState<SurveyPayload>(emptySurvey());
	const [busy, setBusy] = useState(false);

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [selected, setSelected] = useState<Survey | null>(null);

	const [reportOpen, setReportOpen] = useState(false);
	const [report, setReport] = useState<SurveyReportResponse | null>(null);
	const [loadingReport, setLoadingReport] = useState(false);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const filters: SurveyFilters = {
				page: page + 1,
				limit: rowsPerPage,
			};
			if (filterStatus) filters.status = filterStatus;
			if (filterType) filters.type = filterType;
			if (searchTerm) filters.search = searchTerm;
			const res = await SurveyAdminService.list(filters);
			if (res.success) {
				setItems(res.items);
				setTotal(res.total);
			}
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al listar encuestas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterStatus, filterType, searchTerm, enqueueSnackbar]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const handleClearFilters = () => {
		setFilterStatus("");
		setFilterType("");
		setSearchTerm("");
		setPage(0);
	};

	const openCreate = () => {
		setEditing(null);
		setForm(emptySurvey());
		setEditorOpen(true);
	};

	const openEdit = (s: Survey) => {
		setEditing(s);
		setForm({
			title: s.title,
			slug: s.slug,
			description: s.description || "",
			type: s.type,
			questions: s.questions || [],
			trigger: s.trigger || { event: null, page: null, delayDays: 0, minSessions: 0 },
			targetAudience: s.targetAudience || { roles: [], planIds: [], onlyActive: true },
			status: s.status,
			startDate: s.startDate,
			endDate: s.endDate,
			allowMultipleResponses: s.allowMultipleResponses,
			autoPublishResponses: s.autoPublishResponses,
		});
		setEditorOpen(true);
	};

	const updateQuestion = (idx: number, patch: Partial<SurveyQuestion>) => {
		setForm((prev) => {
			const next = [...(prev.questions || [])];
			next[idx] = { ...next[idx], ...patch };
			return { ...prev, questions: next };
		});
	};

	const moveQuestion = (idx: number, dir: -1 | 1) => {
		setForm((prev) => {
			const arr = [...(prev.questions || [])];
			const target = idx + dir;
			if (target < 0 || target >= arr.length) return prev;
			[arr[idx], arr[target]] = [arr[target], arr[idx]];
			return { ...prev, questions: arr };
		});
	};

	const addQuestion = () => {
		setForm((prev) => ({ ...prev, questions: [...(prev.questions || []), emptyQuestion()] }));
	};

	const removeQuestion = (idx: number) => {
		setForm((prev) => ({ ...prev, questions: (prev.questions || []).filter((_, i) => i !== idx) }));
	};

	const addOption = (qIdx: number) => {
		setForm((prev) => {
			const arr = [...(prev.questions || [])];
			const opts = [...(arr[qIdx].options || [])];
			const v = `opt_${opts.length + 1}`;
			opts.push({ value: v, label: `Opción ${opts.length + 1}` });
			arr[qIdx] = { ...arr[qIdx], options: opts };
			return { ...prev, questions: arr };
		});
	};

	const updateOption = (qIdx: number, oIdx: number, patch: { value?: string; label?: string }) => {
		setForm((prev) => {
			const arr = [...(prev.questions || [])];
			const opts = [...(arr[qIdx].options || [])];
			opts[oIdx] = { ...opts[oIdx], ...patch };
			arr[qIdx] = { ...arr[qIdx], options: opts };
			return { ...prev, questions: arr };
		});
	};

	const removeOption = (qIdx: number, oIdx: number) => {
		setForm((prev) => {
			const arr = [...(prev.questions || [])];
			const opts = (arr[qIdx].options || []).filter((_, i) => i !== oIdx);
			arr[qIdx] = { ...arr[qIdx], options: opts };
			return { ...prev, questions: arr };
		});
	};

	const handleSave = async () => {
		if (!form.title || !form.title.trim()) {
			enqueueSnackbar("El título es requerido", { variant: "warning" });
			return;
		}
		if (!form.questions || form.questions.length === 0) {
			if (!window.confirm("La encuesta no tiene preguntas. ¿Guardar igual?")) return;
		}
		// Validar preguntas con opciones
		for (const q of form.questions || []) {
			if (QUESTION_TYPES_WITH_OPTIONS.includes(q.type) && (!q.options || q.options.length < 2)) {
				enqueueSnackbar(`La pregunta "${q.question || q.id}" necesita al menos 2 opciones`, { variant: "warning" });
				return;
			}
			if (!q.question || !q.question.trim()) {
				enqueueSnackbar("Todas las preguntas necesitan un enunciado", { variant: "warning" });
				return;
			}
		}

		try {
			setBusy(true);
			const payload: SurveyPayload = {
				...form,
				slug: form.slug ? slugify(form.slug) : undefined,
			};
			if (editing) {
				await SurveyAdminService.update(editing._id, payload);
				enqueueSnackbar("Encuesta actualizada", { variant: "success" });
			} else {
				await SurveyAdminService.create(payload);
				enqueueSnackbar("Encuesta creada", { variant: "success" });
			}
			setEditorOpen(false);
			fetchList();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e?.message || "Error al guardar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const handleChangeStatus = async (s: Survey, status: SurveyStatus) => {
		try {
			await SurveyAdminService.changeStatus(s._id, status);
			enqueueSnackbar(`Encuesta marcada como ${STATUS_CONFIG[status].label}`, { variant: "success" });
			fetchList();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error", { variant: "error" });
		}
	};

	const handleDelete = async (force = false) => {
		if (!selected) return;
		try {
			setBusy(true);
			const res = await SurveyAdminService.remove(selected._id, force);
			enqueueSnackbar(res.message || "Encuesta eliminada", { variant: "success" });
			setDeleteOpen(false);
			setSelected(null);
			fetchList();
		} catch (e: any) {
			const msg: string = e?.response?.data?.message || e?.message || "Error al eliminar";
			if (msg.includes("respuestas") && !force) {
				if (window.confirm(`${msg}\n\n¿Eliminar de todos modos? (No se borran las respuestas)`)) {
					await handleDelete(true);
				}
			} else {
				enqueueSnackbar(msg, { variant: "error" });
			}
		} finally {
			setBusy(false);
		}
	};

	const openReport = async (s: Survey) => {
		setSelected(s);
		setReportOpen(true);
		setReport(null);
		try {
			setLoadingReport(true);
			const r = await SurveyAdminService.report(s._id);
			setReport(r);
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al cargar reporte", { variant: "error" });
		} finally {
			setLoadingReport(false);
		}
	};

	return (
		<MainCard
			title="Encuestas"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button variant="contained" size="small" startIcon={<Add size={16} />} onClick={openCreate}>
						Nueva encuesta
					</Button>
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={() => fetchList()}>
						Actualizar
					</Button>
				</Stack>
			}
		>
			<Stack spacing={3}>
				{/* Filtros */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center" mb={2}>
						<Filter size={18} />
						<Typography variant="subtitle2">Filtros</Typography>
					</Stack>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={filterStatus}
									label="Estado"
									onChange={(e) => {
										setFilterStatus(e.target.value as SurveyStatus | "");
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="draft">Borrador</MenuItem>
									<MenuItem value="active">Activa</MenuItem>
									<MenuItem value="paused">Pausada</MenuItem>
									<MenuItem value="closed">Cerrada</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Tipo</InputLabel>
								<Select
									value={filterType}
									label="Tipo"
									onChange={(e) => {
										setFilterType(e.target.value as SurveyType | "");
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="custom">Custom</MenuItem>
									<MenuItem value="nps">NPS</MenuItem>
									<MenuItem value="csat">CSAT</MenuItem>
									<MenuItem value="poll">Poll</MenuItem>
									<MenuItem value="onboarding">Onboarding</MenuItem>
									<MenuItem value="churn">Churn</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={7}>
							<TextField
								fullWidth
								size="small"
								placeholder="Buscar por título o slug..."
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setPage(0);
								}}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchNormal1 size={18} />
										</InputAdornment>
									),
								}}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={1}>
							<Tooltip title="Limpiar filtros">
								<IconButton onClick={handleClearFilters} color="error">
									<CloseCircle size={20} />
								</IconButton>
							</Tooltip>
						</Grid>
					</Grid>
				</Paper>

				{/* Tabla */}
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Título</TableCell>
								<TableCell>Slug</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell align="center">Preguntas</TableCell>
								<TableCell align="center">Respuestas</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell>Período</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 8 }).map((__, j) => (
											<TableCell key={j}>
												<Skeleton variant="text" />
											</TableCell>
										))}
									</TableRow>
								))
							) : items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} align="center">
										<Alert severity="info" sx={{ justifyContent: "center" }}>
											No hay encuestas. Crea una con el botón "Nueva encuesta".
										</Alert>
									</TableCell>
								</TableRow>
							) : (
								items.map((s) => (
									<TableRow key={s._id} hover>
										<TableCell>
											<Typography variant="body2" fontWeight={500}>
												{s.title}
											</Typography>
											{s.description && (
												<Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 280, display: "block" }}>
													{s.description}
												</Typography>
											)}
										</TableCell>
										<TableCell>
											<Typography variant="caption" fontFamily="monospace">
												{s.slug}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip label={TYPE_LABEL[s.type] || s.type} size="small" variant="outlined" />
										</TableCell>
										<TableCell align="center">{s.questions?.length || 0}</TableCell>
										<TableCell align="center">{s.stats?.responseCount || 0}</TableCell>
										<TableCell align="center">
											<Chip label={STATUS_CONFIG[s.status]?.label} size="small" color={STATUS_CONFIG[s.status]?.color} />
										</TableCell>
										<TableCell>
											<Typography variant="caption" color="textSecondary">
												{s.startDate ? formatDate(s.startDate) : "—"}
											</Typography>
											<Typography variant="caption" color="textSecondary" display="block">
												→ {s.endDate ? formatDate(s.endDate) : "∞"}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Editar">
													<IconButton size="small" color="primary" onClick={() => openEdit(s)}>
														<Edit2 size={16} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Ver reporte">
													<IconButton size="small" color="info" onClick={() => openReport(s)}>
														<Chart size={16} />
													</IconButton>
												</Tooltip>
												{s.status !== "active" ? (
													<Tooltip title="Activar">
														<IconButton size="small" color="success" onClick={() => handleChangeStatus(s, "active")}>
															<PlayCircle size={16} />
														</IconButton>
													</Tooltip>
												) : (
													<Tooltip title="Pausar">
														<IconButton size="small" color="warning" onClick={() => handleChangeStatus(s, "paused")}>
															<PauseCircle size={16} />
														</IconButton>
													</Tooltip>
												)}
												<Tooltip title="Cerrar">
													<IconButton size="small" onClick={() => handleChangeStatus(s, "closed")}>
														<Status size={16} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Eliminar">
													<IconButton
														size="small"
														color="error"
														onClick={() => {
															setSelected(s);
															setDeleteOpen(true);
														}}
													>
														<Trash size={16} />
													</IconButton>
												</Tooltip>
											</Stack>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={(_, p) => setPage(p)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Filas por página:"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				</TableContainer>
			</Stack>

			{/* Editor */}
			<Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>{editing ? "Editar encuesta" : "Nueva encuesta"}</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={3}>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={8}>
								<TextField
									fullWidth
									label="Título"
									value={form.title || ""}
									onChange={(e) => setForm({ ...form, title: e.target.value })}
									required
								/>
							</Grid>
							<Grid item xs={12} sm={4}>
								<FormControl fullWidth>
									<InputLabel>Tipo</InputLabel>
									<Select
										value={form.type || "custom"}
										label="Tipo"
										onChange={(e) => setForm({ ...form, type: e.target.value as SurveyType })}
									>
										{(Object.keys(TYPE_LABEL) as SurveyType[]).map((k) => (
											<MenuItem key={k} value={k}>
												{TYPE_LABEL[k]}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									fullWidth
									label="Slug (URL amigable)"
									value={form.slug || ""}
									onChange={(e) => setForm({ ...form, slug: e.target.value })}
									helperText="Se autogenera del título si lo dejás vacío"
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<FormControl fullWidth>
									<InputLabel>Estado</InputLabel>
									<Select
										value={form.status || "draft"}
										label="Estado"
										onChange={(e) => setForm({ ...form, status: e.target.value as SurveyStatus })}
									>
										<MenuItem value="draft">Borrador</MenuItem>
										<MenuItem value="active">Activa</MenuItem>
										<MenuItem value="paused">Pausada</MenuItem>
										<MenuItem value="closed">Cerrada</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Descripción"
									multiline
									rows={2}
									value={form.description || ""}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									fullWidth
									type="datetime-local"
									label="Inicio"
									InputLabelProps={{ shrink: true }}
									value={form.startDate ? new Date(form.startDate).toISOString().slice(0, 16) : ""}
									onChange={(e) => setForm({ ...form, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									fullWidth
									type="datetime-local"
									label="Fin"
									InputLabelProps={{ shrink: true }}
									value={form.endDate ? new Date(form.endDate).toISOString().slice(0, 16) : ""}
									onChange={(e) => setForm({ ...form, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<FormControlLabel
									control={
										<Switch
											checked={!!form.allowMultipleResponses}
											onChange={(e) => setForm({ ...form, allowMultipleResponses: e.target.checked })}
										/>
									}
									label="Permitir múltiples respuestas por usuario"
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<FormControlLabel
									control={
										<Switch
											checked={!!form.autoPublishResponses}
											onChange={(e) => setForm({ ...form, autoPublishResponses: e.target.checked })}
										/>
									}
									label="Auto-publicar respuestas (saltea moderación)"
								/>
							</Grid>
						</Grid>

						<Divider />

						{/* Question builder */}
						<Box>
							<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
								<Typography variant="subtitle1">Preguntas ({form.questions?.length || 0})</Typography>
								<Button size="small" startIcon={<Add size={14} />} onClick={addQuestion}>
									Agregar pregunta
								</Button>
							</Stack>

							<Stack spacing={2}>
								{(form.questions || []).map((q, idx) => (
									<Paper key={q.id} variant="outlined" sx={{ p: 2 }}>
										<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
											<Typography variant="caption" color="textSecondary">
												Pregunta {idx + 1}
											</Typography>
											<Stack direction="row" spacing={0.5}>
												<IconButton size="small" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
													<ArrowUp2 size={14} />
												</IconButton>
												<IconButton size="small" onClick={() => moveQuestion(idx, 1)} disabled={idx === (form.questions || []).length - 1}>
													<ArrowDown2 size={14} />
												</IconButton>
												<IconButton size="small" color="error" onClick={() => removeQuestion(idx)}>
													<Trash size={14} />
												</IconButton>
											</Stack>
										</Stack>

										<Grid container spacing={2}>
											<Grid item xs={12} sm={8}>
												<TextField
													fullWidth
													label="Enunciado"
													value={q.question}
													onChange={(e) => updateQuestion(idx, { question: e.target.value })}
													size="small"
												/>
											</Grid>
											<Grid item xs={12} sm={4}>
												<FormControl fullWidth size="small">
													<InputLabel>Tipo</InputLabel>
													<Select
														value={q.type}
														label="Tipo"
														onChange={(e) => updateQuestion(idx, { type: e.target.value as QuestionType })}
													>
														{(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((k) => (
															<MenuItem key={k} value={k}>
																{QUESTION_TYPE_LABEL[k]}
															</MenuItem>
														))}
													</Select>
												</FormControl>
											</Grid>
											<Grid item xs={12} sm={6}>
												<TextField
													fullWidth
													label="ID interno"
													value={q.id}
													onChange={(e) => updateQuestion(idx, { id: e.target.value })}
													size="small"
													helperText="Usado para correlacionar respuestas"
												/>
											</Grid>
											<Grid item xs={12} sm={6}>
												<FormControlLabel
													control={<Switch checked={q.required} onChange={(e) => updateQuestion(idx, { required: e.target.checked })} />}
													label="Obligatoria"
												/>
											</Grid>

											{QUESTION_TYPES_WITH_RANGE.includes(q.type) && (
												<>
													<Grid item xs={6} sm={3}>
														<TextField
															type="number"
															fullWidth
															size="small"
															label="Mínimo"
															value={q.min ?? ""}
															onChange={(e) => updateQuestion(idx, { min: e.target.value === "" ? null : Number(e.target.value) })}
														/>
													</Grid>
													<Grid item xs={6} sm={3}>
														<TextField
															type="number"
															fullWidth
															size="small"
															label="Máximo"
															value={q.max ?? ""}
															onChange={(e) => updateQuestion(idx, { max: e.target.value === "" ? null : Number(e.target.value) })}
														/>
													</Grid>
													<Grid item xs={6} sm={3}>
														<TextField
															fullWidth
															size="small"
															label="Etiqueta min"
															value={q.minLabel || ""}
															onChange={(e) => updateQuestion(idx, { minLabel: e.target.value })}
														/>
													</Grid>
													<Grid item xs={6} sm={3}>
														<TextField
															fullWidth
															size="small"
															label="Etiqueta max"
															value={q.maxLabel || ""}
															onChange={(e) => updateQuestion(idx, { maxLabel: e.target.value })}
														/>
													</Grid>
												</>
											)}

											{QUESTION_TYPES_WITH_OPTIONS.includes(q.type) && (
												<Grid item xs={12}>
													<Typography variant="caption" color="textSecondary">
														Opciones
													</Typography>
													<Stack spacing={1} mt={1}>
														{(q.options || []).map((opt, oIdx) => (
															<Stack direction="row" spacing={1} key={oIdx}>
																<TextField
																	size="small"
																	placeholder="value"
																	value={opt.value}
																	onChange={(e) => updateOption(idx, oIdx, { value: e.target.value })}
																	sx={{ width: 140 }}
																/>
																<TextField
																	size="small"
																	placeholder="Etiqueta visible"
																	value={opt.label}
																	onChange={(e) => updateOption(idx, oIdx, { label: e.target.value })}
																	fullWidth
																/>
																<IconButton size="small" color="error" onClick={() => removeOption(idx, oIdx)}>
																	<Trash size={14} />
																</IconButton>
															</Stack>
														))}
														<Button size="small" startIcon={<Add size={14} />} onClick={() => addOption(idx)}>
															Agregar opción
														</Button>
													</Stack>
												</Grid>
											)}
										</Grid>
									</Paper>
								))}
							</Stack>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditorOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={handleSave} disabled={busy}>
						{busy ? "Guardando..." : editing ? "Actualizar" : "Crear"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete */}
			<Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
				<DialogTitle>Eliminar encuesta</DialogTitle>
				<DialogContent>
					<Typography>¿Eliminar "{selected?.title}"?</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						Si la encuesta tiene respuestas, te pediremos confirmación extra. Las respuestas previas no se borran.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" onClick={() => handleDelete(false)} disabled={busy}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Report */}
			<Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Reporte · {selected?.title}</DialogTitle>
				<DialogContent dividers>
					{loadingReport ? (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={60} />
							<Skeleton variant="rectangular" height={120} />
							<Skeleton variant="rectangular" height={120} />
						</Stack>
					) : !report ? (
						<Alert severity="info">Sin datos</Alert>
					) : (
						<Stack spacing={3}>
							<Paper variant="outlined" sx={{ p: 2 }}>
								<Stack direction="row" spacing={4} alignItems="center">
									<Box>
										<Typography variant="caption" color="textSecondary">
											Respuestas totales
										</Typography>
										<Typography variant="h4">{report.totals.responses}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="textSecondary">
											Última respuesta
										</Typography>
										<Typography variant="body2">{formatDate(report.totals.lastResponseAt)}</Typography>
									</Box>
								</Stack>
							</Paper>

							{report.perQuestion.map((q) => (
								<Paper variant="outlined" sx={{ p: 2 }} key={q.questionId}>
									<Typography variant="subtitle2">{q.question}</Typography>
									<Typography variant="caption" color="textSecondary">
										{QUESTION_TYPE_LABEL[q.type] || q.type} · {q.count} respuestas
									</Typography>

									{(q.type === "rating" || q.type === "scale") && (
										<Box mt={1}>
											{q.avg !== null && q.avg !== undefined && (
												<Typography variant="body2">
													Promedio: <strong>{q.avg.toFixed(2)}</strong>
												</Typography>
											)}
											{q.distribution && (
												<Stack spacing={0.5} mt={1}>
													{Object.entries(q.distribution)
														.sort((a, b) => Number(a[0]) - Number(b[0]))
														.map(([k, v]) => (
															<Stack key={k} direction="row" spacing={1} alignItems="center">
																<Typography variant="caption" sx={{ width: 30 }}>
																	{k}
																</Typography>
																<LinearProgress
																	variant="determinate"
																	value={(v / (q.count || 1)) * 100}
																	sx={{ flex: 1, height: 8, borderRadius: 1 }}
																/>
																<Typography variant="caption" sx={{ width: 30 }}>
																	{v}
																</Typography>
															</Stack>
														))}
												</Stack>
											)}
										</Box>
									)}

									{(q.type === "single_choice" || q.type === "multi_choice" || q.type === "boolean") && q.distribution && (
										<Stack spacing={0.5} mt={1}>
											{Object.entries(q.distribution).map(([k, v]) => (
												<Stack key={k} direction="row" spacing={1} alignItems="center">
													<Typography variant="caption" sx={{ minWidth: 100 }}>
														{k}
													</Typography>
													<LinearProgress
														variant="determinate"
														value={(v / (q.count || 1)) * 100}
														sx={{ flex: 1, height: 8, borderRadius: 1 }}
													/>
													<Typography variant="caption" sx={{ width: 30 }}>
														{v}
													</Typography>
												</Stack>
											))}
										</Stack>
									)}

									{(q.type === "text" || q.type === "long_text") && q.samples && (
										<Stack spacing={1} mt={1}>
											{q.samples.length === 0 ? (
												<Typography variant="caption" color="textSecondary">
													Sin respuestas de texto
												</Typography>
											) : (
												q.samples.map((s, i) => (
													<Paper variant="outlined" key={i} sx={{ p: 1, bgcolor: "background.default" }}>
														<Typography variant="body2">{s}</Typography>
													</Paper>
												))
											)}
										</Stack>
									)}
								</Paper>
							))}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setReportOpen(false)}>Cerrar</Button>
					<Button startIcon={<Eye size={14} />} onClick={() => selected && openReport(selected)} disabled={loadingReport}>
						Refrescar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default SurveysAdminPage;
