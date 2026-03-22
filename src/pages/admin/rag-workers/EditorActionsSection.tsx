import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	Button,
	IconButton,
	Tooltip,
	Chip,
	Divider,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	DialogContentText,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	FormControlLabel,
	Switch,
	Checkbox,
	Alert,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Paper,
	Collapse,
	useTheme,
	alpha,
	InputAdornment,
} from "@mui/material";
import { Add, Refresh, Edit2, Trash, ArrowDown2, ArrowUp2, InfoCircle, Magicpen } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { EditorAction, EditorActionInput } from "api/ragWorkers";

// ── Constants ────────────────────────────────────────────────────────────────

const SCOPE_LABELS: Record<string, string> = {
	bubble: "Bubble",
	panel: "Panel",
	both: "Ambos",
};

const SCOPE_COLORS: Record<string, "primary" | "secondary" | "default"> = {
	bubble: "secondary",
	panel: "primary",
	both: "default",
};

const VISIBILITY_LABELS: Record<string, string> = {
	global: "Global",
	user: "Usuario",
	plan: "Plan",
};

const PROMPT_SUGGESTIONS = [
	{
		label: "Mejorar redacción",
		prompt: "Mejorá la redacción del siguiente texto manteniendo el significado y el registro jurídico formal:\n\n{{text}}\n\nDevolvé solo el texto mejorado, sin explicaciones.",
	},
	{
		label: "Simplificar lenguaje",
		prompt: "Simplificá el siguiente texto jurídico para que sea más claro y comprensible, sin perder precisión legal:\n\n{{text}}\n\nDevolvé solo el texto simplificado.",
	},
	{
		label: "Ampliar desarrollo",
		prompt: "Ampliá y desarrollá el siguiente texto con más detalle y fundamento jurídico:\n\n{{text}}\n\nDevolvé solo el texto ampliado.",
	},
	{
		label: "Acortar",
		prompt: "Resumí el siguiente texto conservando los puntos esenciales y el registro formal:\n\n{{text}}\n\nDevolvé solo el texto resumido.",
	},
	{
		label: "Corregir ortografía",
		prompt: "Corregí los errores ortográficos y gramaticales del siguiente texto sin cambiar el contenido ni el estilo:\n\n{{text}}\n\nDevolvé solo el texto corregido.",
	},
	{
		label: "Tono formal",
		prompt: "Reescribí el siguiente texto con un tono formal y técnico-jurídico apropiado para un escrito judicial:\n\n{{text}}\n\nDevolvé solo el texto reescrito.",
	},
];

const SYSTEM_PROMPT_SUGGESTIONS = [
	{
		label: "Asistente jurídico",
		prompt: "Sos un asistente jurídico especializado en derecho argentino. Tu tarea es editar y mejorar textos legales. Respondé siempre en español formal y jurídico. No agregues explicaciones, devolvé únicamente el texto editado.",
	},
	{
		label: "Editor de documentos",
		prompt: "Sos un editor experto en documentos legales argentinos. Tu objetivo es mejorar la calidad, claridad y precisión de los textos jurídicos. Mantené siempre el registro formal y técnico propio de los escritos judiciales.",
	},
];

const EMPTY_FORM: EditorActionInput = {
	label: "",
	hint: "",
	prompt: "",
	systemPromptOverride: null,
	context: { includeDocument: false, requiresSelection: false },
	scope: "both",
	order: 0,
	active: true,
	visibility: "global",
	userId: null,
	allowedPlans: [],
};

// ── Action form dialog ────────────────────────────────────────────────────────

interface ActionDialogProps {
	open: boolean;
	initial: EditorActionInput | null;
	onClose: () => void;
	onSave: (data: EditorActionInput) => Promise<void>;
	saving: boolean;
}

const ActionDialog = ({ open, initial, onClose, onSave, saving }: ActionDialogProps) => {
	const theme = useTheme();
	const [form, setForm] = useState<EditorActionInput>(EMPTY_FORM);
	const [showSystemPrompt, setShowSystemPrompt] = useState(false);
	const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
	const [showSystemSuggestions, setShowSystemSuggestions] = useState(false);

	useEffect(() => {
		if (open) {
			setForm(initial ?? EMPTY_FORM);
			setShowSystemPrompt(!!(initial?.systemPromptOverride));
			setShowPromptSuggestions(false);
			setShowSystemSuggestions(false);
		}
	}, [open, initial]);

	const set = (key: keyof EditorActionInput, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
	const setCtx = (key: keyof EditorActionInput["context"], value: boolean) =>
		setForm((f) => ({ ...f, context: { ...f.context, [key]: value } }));

	const isEdit = !!initial;
	const isValid = form.label.trim().length > 0 && form.prompt.trim().length > 0;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
			<DialogTitle sx={{ pb: 1 }}>
				<Typography variant="h5">{isEdit ? "Editar acción" : "Nueva acción"}</Typography>
				<Typography variant="caption" color="text.secondary">
					Las acciones aparecen en el bubble de selección y/o en el panel del chat
				</Typography>
			</DialogTitle>

			<DialogContent dividers>
				<Stack spacing={2.5}>
					{/* Label + hint */}
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<TextField
							label="Etiqueta"
							value={form.label}
							onChange={(e) => set("label", e.target.value)}
							fullWidth
							size="small"
							required
							inputProps={{ maxLength: 60 }}
							helperText={`${form.label.length}/60 — Nombre corto que ve el usuario. Ej: "Mejorar redacción"`}
						/>
						<TextField
							label="Descripción (hint)"
							value={form.hint}
							onChange={(e) => set("hint", e.target.value)}
							fullWidth
							size="small"
							inputProps={{ maxLength: 200 }}
							helperText='Aparece como tooltip. Ej: "Mejora la claridad y el estilo del texto"'
						/>
					</Stack>

					{/* Scope + visibility + order */}
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Alcance</InputLabel>
							<Select label="Alcance" value={form.scope} onChange={(e) => set("scope", e.target.value)}>
								<MenuItem value="bubble">
									<Stack>
										<Typography variant="body2">Bubble</Typography>
										<Typography variant="caption" color="text.secondary">Al seleccionar texto</Typography>
									</Stack>
								</MenuItem>
								<MenuItem value="panel">
									<Stack>
										<Typography variant="body2">Panel</Typography>
										<Typography variant="caption" color="text.secondary">Acciones rápidas del chat</Typography>
									</Stack>
								</MenuItem>
								<MenuItem value="both">
									<Stack>
										<Typography variant="body2">Ambos</Typography>
										<Typography variant="caption" color="text.secondary">Bubble y panel</Typography>
									</Stack>
								</MenuItem>
							</Select>
						</FormControl>

						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Visibilidad</InputLabel>
							<Select label="Visibilidad" value={form.visibility} onChange={(e) => set("visibility", e.target.value as EditorActionInput["visibility"])}>
								<MenuItem value="global">
									<Stack>
										<Typography variant="body2">Global</Typography>
										<Typography variant="caption" color="text.secondary">Todos los usuarios</Typography>
									</Stack>
								</MenuItem>
								<MenuItem value="user">
									<Stack>
										<Typography variant="body2">Usuario</Typography>
										<Typography variant="caption" color="text.secondary">Solo un usuario específico</Typography>
									</Stack>
								</MenuItem>
								<MenuItem value="plan">
									<Stack>
										<Typography variant="body2">Por plan</Typography>
										<Typography variant="caption" color="text.secondary">Según suscripción</Typography>
									</Stack>
								</MenuItem>
							</Select>
						</FormControl>

						<TextField
							label="Orden"
							type="number"
							value={form.order}
							onChange={(e) => set("order", parseInt(e.target.value, 10) || 0)}
							size="small"
							sx={{ width: 100 }}
							inputProps={{ min: 0, max: 999 }}
							helperText="Menor = primero"
						/>

						<FormControlLabel
							control={<Switch checked={form.active} onChange={(e) => set("active", e.target.checked)} />}
							label={<Typography variant="body2">Activa</Typography>}
							sx={{ mt: 0.5 }}
						/>
					</Stack>

					{/* Context flags */}
					<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
						<Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: "block" }}>
							Contexto enviado al modelo
						</Typography>
						<Stack direction="row" spacing={3}>
							<Tooltip title="Si está activo, el texto completo del documento se envía como contexto al LLM. Útil para acciones que necesitan coherencia con el resto del documento.">
								<FormControlLabel
									control={<Checkbox checked={form.context.includeDocument} onChange={(e) => setCtx("includeDocument", e.target.checked)} size="small" />}
									label={<Typography variant="body2">Incluir documento completo</Typography>}
								/>
							</Tooltip>
							<Tooltip title="Si está activo, esta acción solo se habilitará cuando el usuario haya seleccionado texto.">
								<FormControlLabel
									control={<Checkbox checked={form.context.requiresSelection} onChange={(e) => setCtx("requiresSelection", e.target.checked)} size="small" />}
									label={<Typography variant="body2">Requiere selección</Typography>}
								/>
							</Tooltip>
						</Stack>
					</Box>

					{/* Prompt */}
					<Box>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="subtitle2">Prompt *</Typography>
								<Tooltip title='Usá {{text}} para insertar el texto seleccionado por el usuario. Ejemplo: "Mejorá el siguiente texto: {{text}}"'>
									<Box sx={{ display: "flex", color: "text.secondary", cursor: "help" }}>
										<InfoCircle size={14} />
									</Box>
								</Tooltip>
							</Stack>
							<Button
								size="small"
								startIcon={<Magicpen size={13} />}
								onClick={() => setShowPromptSuggestions((s) => !s)}
								sx={{ fontSize: "0.72rem" }}
							>
								Sugerencias
							</Button>
						</Stack>

						<Collapse in={showPromptSuggestions}>
							<Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.secondary.main, 0.03) }}>
								<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
									Hacé clic para insertar una sugerencia como base
								</Typography>
								<Stack direction="row" flexWrap="wrap" gap={0.75}>
									{PROMPT_SUGGESTIONS.map((s) => (
										<Chip
											key={s.label}
											label={s.label}
											size="small"
											variant="outlined"
											onClick={() => { set("prompt", s.prompt); setShowPromptSuggestions(false); }}
											sx={{ cursor: "pointer", fontSize: "0.72rem" }}
										/>
									))}
								</Stack>
							</Box>
						</Collapse>

						<TextField
							multiline
							minRows={5}
							maxRows={12}
							fullWidth
							value={form.prompt}
							onChange={(e) => set("prompt", e.target.value)}
							inputProps={{ maxLength: 4000 }}
							placeholder='Ej: Mejorá la redacción del siguiente texto: {{text}}'
							helperText={
								<Stack direction="row" justifyContent="space-between">
									<span>Usá <code>{"{{text}}"}</code> para insertar el texto seleccionado</span>
									<span>{form.prompt.length}/4000</span>
								</Stack>
							}
							sx={{ "& textarea": { fontFamily: "monospace", fontSize: "0.82rem" } }}
						/>
					</Box>

					{/* System prompt override */}
					<Box>
						<Stack direction="row" justifyContent="space-between" alignItems="center">
							<Stack direction="row" spacing={1} alignItems="center">
								<FormControlLabel
									control={<Switch size="small" checked={showSystemPrompt} onChange={(e) => setShowSystemPrompt(e.target.checked)} />}
									label={<Typography variant="subtitle2">System prompt personalizado</Typography>}
								/>
								<Tooltip title="Si se completa, reemplaza el system prompt global solo para esta acción. Útil para cambiar el rol o el comportamiento del asistente en acciones específicas.">
									<Box sx={{ display: "flex", color: "text.secondary", cursor: "help" }}>
										<InfoCircle size={14} />
									</Box>
								</Tooltip>
							</Stack>
							{showSystemPrompt && (
								<Button
									size="small"
									startIcon={<Magicpen size={13} />}
									onClick={() => setShowSystemSuggestions((s) => !s)}
									sx={{ fontSize: "0.72rem" }}
								>
									Sugerencias
								</Button>
							)}
						</Stack>

						<Collapse in={showSystemPrompt}>
							<Stack spacing={1} sx={{ mt: 1 }}>
								<Collapse in={showSystemSuggestions}>
									<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.secondary.main, 0.03) }}>
										<Stack direction="row" flexWrap="wrap" gap={0.75}>
											{SYSTEM_PROMPT_SUGGESTIONS.map((s) => (
												<Chip
													key={s.label}
													label={s.label}
													size="small"
													variant="outlined"
													onClick={() => { set("systemPromptOverride", s.prompt); setShowSystemSuggestions(false); }}
													sx={{ cursor: "pointer", fontSize: "0.72rem" }}
												/>
											))}
										</Stack>
									</Box>
								</Collapse>
								<TextField
									multiline
									minRows={4}
									maxRows={10}
									fullWidth
									value={form.systemPromptOverride ?? ""}
									onChange={(e) => set("systemPromptOverride", e.target.value || null)}
									inputProps={{ maxLength: 8000 }}
									helperText={`${(form.systemPromptOverride ?? "").length}/8000 — Reemplaza el system prompt global para esta acción`}
									sx={{ "& textarea": { fontFamily: "monospace", fontSize: "0.82rem" } }}
								/>
							</Stack>
						</Collapse>
					</Box>
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={onClose} disabled={saving}>Cancelar</Button>
				<Button variant="contained" onClick={() => onSave(form)} disabled={saving || !isValid}>
					{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear acción"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ── Delete confirm dialog ────────────────────────────────────────────────────

interface DeleteDialogProps {
	action: EditorAction | null;
	onClose: () => void;
	onConfirm: (hard: boolean) => Promise<void>;
	deleting: boolean;
}

const DeleteDialog = ({ action, onClose, onConfirm, deleting }: DeleteDialogProps) => (
	<Dialog open={!!action} onClose={onClose} maxWidth="sm" fullWidth>
		<DialogTitle>Eliminar acción</DialogTitle>
		<DialogContent>
			<DialogContentText>
				¿Eliminar la acción <strong>{action?.label}</strong>?
			</DialogContentText>
			<Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
				La eliminación suave desactiva la acción (<code>active: false</code>) y se puede recuperar. La eliminación permanente la borra de la base de datos.
			</Alert>
		</DialogContent>
		<DialogActions sx={{ px: 3, py: 2 }}>
			<Button onClick={onClose} disabled={deleting}>Cancelar</Button>
			<Button onClick={() => onConfirm(false)} disabled={deleting} color="warning">
				Desactivar
			</Button>
			<Button onClick={() => onConfirm(true)} disabled={deleting} color="error">
				Eliminar permanentemente
			</Button>
		</DialogActions>
	</Dialog>
);

// ── Main component ────────────────────────────────────────────────────────────

const EditorActionsSection = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [actions, setActions] = useState<EditorAction[]>([]);
	const [loading, setLoading] = useState(true);
	const [showInactive, setShowInactive] = useState(false);

	// Dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingAction, setEditingAction] = useState<EditorAction | null>(null);
	const [saving, setSaving] = useState(false);

	// Delete state
	const [deleteTarget, setDeleteTarget] = useState<EditorAction | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Seed state
	const [seeding, setSeeding] = useState(false);

	const fetchActions = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getEditorActions();
			setActions(data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar acciones", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => { fetchActions(); }, [fetchActions]);

	const handleOpenCreate = () => {
		setEditingAction(null);
		setDialogOpen(true);
	};

	const handleOpenEdit = (action: EditorAction) => {
		setEditingAction(action);
		setDialogOpen(true);
	};

	const handleSave = async (data: EditorActionInput) => {
		try {
			setSaving(true);
			if (editingAction) {
				const updated = await RagWorkersService.updateEditorAction(editingAction._id, data);
				setActions((prev) => prev.map((a) => a._id === updated._id ? updated : a));
				enqueueSnackbar("Acción actualizada", { variant: "success" });
			} else {
				const created = await RagWorkersService.createEditorAction(data);
				setActions((prev) => [...prev, created]);
				enqueueSnackbar("Acción creada", { variant: "success" });
			}
			setDialogOpen(false);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (hard: boolean) => {
		if (!deleteTarget) return;
		try {
			setDeleting(true);
			await RagWorkersService.deleteEditorAction(deleteTarget._id, hard);
			if (hard) {
				setActions((prev) => prev.filter((a) => a._id !== deleteTarget._id));
			} else {
				setActions((prev) => prev.map((a) => a._id === deleteTarget._id ? { ...a, active: false } : a));
			}
			enqueueSnackbar(hard ? "Acción eliminada permanentemente" : "Acción desactivada", { variant: "success" });
			setDeleteTarget(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al eliminar", { variant: "error" });
		} finally {
			setDeleting(false);
		}
	};

	const handleSeed = async () => {
		try {
			setSeeding(true);
			const result = await RagWorkersService.seedEditorActions();
			enqueueSnackbar(`Seed completado: ${result.seeded} creadas, ${result.skipped} ya existían`, { variant: "success" });
			await fetchActions();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al hacer seed", { variant: "error" });
		} finally {
			setSeeding(false);
		}
	};

	const displayed = showInactive ? actions : actions.filter((a) => a.active);

	return (
		<Box sx={{ p: 0 }}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
				<Stack spacing={0.5}>
					<Typography variant="subtitle1" fontWeight={600}>
						Acciones del asistente IA
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Acciones rápidas que aparecen en el bubble de selección y en el panel del chat. El prompt global se puede sobreescribir por acción.
					</Typography>
				</Stack>
				<Stack direction="row" spacing={1} alignItems="center">
					<Tooltip title="Mostrar/ocultar acciones inactivas">
						<Chip
							label={showInactive ? "Mostrando todas" : `${actions.filter((a) => !a.active).length} inactivas ocultas`}
							size="small"
							variant="outlined"
							onClick={() => setShowInactive((s) => !s)}
							sx={{ fontSize: "0.7rem", cursor: "pointer" }}
						/>
					</Tooltip>
					<Tooltip title="Poblar con acciones predeterminadas (solo crea las que no existen)">
						<Button size="small" variant="outlined" onClick={handleSeed} disabled={seeding} startIcon={<Magicpen size={14} />}>
							{seeding ? "Cargando..." : "Seed"}
						</Button>
					</Tooltip>
					<Tooltip title="Refrescar">
						<IconButton size="small" onClick={fetchActions}>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
					<Button size="small" variant="contained" startIcon={<Add size={14} />} onClick={handleOpenCreate}>
						Nueva acción
					</Button>
				</Stack>
			</Stack>

			{/* Table */}
			{loading ? (
				<Stack spacing={1}>
					{[1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1 }} />)}
				</Stack>
			) : displayed.length === 0 ? (
				<Alert severity="info" sx={{ borderRadius: 1.5 }}>
					No hay acciones configuradas. Usá <strong>Seed</strong> para cargar las acciones predeterminadas o creá una nueva.
				</Alert>
			) : (
				<Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: "hidden" }}>
					<Table size="small">
						<TableHead>
							<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Etiqueta</TableCell>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Alcance</TableCell>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Visibilidad</TableCell>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Contexto</TableCell>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="center">Orden</TableCell>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="center">Estado</TableCell>
								<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="right">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{displayed.map((action) => (
								<TableRow
									key={action._id}
									hover
									sx={{ opacity: action.active ? 1 : 0.5, "&:last-child td": { borderBottom: 0 } }}
								>
									<TableCell>
										<Stack spacing={0.25}>
											<Typography variant="body2" fontWeight={500}>
												{action.label}
											</Typography>
											{action.hint && (
												<Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
													{action.hint}
												</Typography>
											)}
											{action.systemPromptOverride && (
												<Chip label="system prompt custom" size="small" color="warning" variant="outlined" sx={{ width: "fit-content", fontSize: "0.62rem", height: 16 }} />
											)}
										</Stack>
									</TableCell>
									<TableCell>
										<Chip
											label={SCOPE_LABELS[action.scope]}
											size="small"
											color={SCOPE_COLORS[action.scope]}
											variant="outlined"
											sx={{ fontSize: "0.7rem", height: 20 }}
										/>
									</TableCell>
									<TableCell>
										<Chip
											label={VISIBILITY_LABELS[action.visibility]}
											size="small"
											variant="outlined"
											sx={{ fontSize: "0.7rem", height: 20 }}
										/>
									</TableCell>
									<TableCell>
										<Stack direction="row" spacing={0.5} flexWrap="wrap">
											{action.context.includeDocument && (
												<Chip label="doc" size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
											)}
											{action.context.requiresSelection && (
												<Chip label="selección" size="small" sx={{ fontSize: "0.6rem", height: 18 }} />
											)}
										</Stack>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>{action.order}</Typography>
									</TableCell>
									<TableCell align="center">
										<Chip
											label={action.active ? "Activa" : "Inactiva"}
											size="small"
											color={action.active ? "success" : "default"}
											variant="filled"
											sx={{ fontSize: "0.68rem", height: 20 }}
										/>
									</TableCell>
									<TableCell align="right">
										<Stack direction="row" spacing={0.5} justifyContent="flex-end">
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => handleOpenEdit(action)}>
													<Edit2 size={14} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => setDeleteTarget(action)}>
													<Trash size={14} />
												</IconButton>
											</Tooltip>
										</Stack>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Paper>
			)}

			{/* Dialogs */}
			<ActionDialog
				open={dialogOpen}
				initial={editingAction ? {
					label: editingAction.label,
					hint: editingAction.hint,
					prompt: editingAction.prompt,
					systemPromptOverride: editingAction.systemPromptOverride,
					context: editingAction.context,
					scope: editingAction.scope,
					order: editingAction.order,
					active: editingAction.active,
					visibility: editingAction.visibility,
					userId: editingAction.userId,
					allowedPlans: editingAction.allowedPlans,
				} : null}
				onClose={() => setDialogOpen(false)}
				onSave={handleSave}
				saving={saving}
			/>

			<DeleteDialog
				action={deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={handleDelete}
				deleting={deleting}
			/>
		</Box>
	);
};

export default EditorActionsSection;
