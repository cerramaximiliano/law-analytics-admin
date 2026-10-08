import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { Add } from "iconsax-react";
import dayjs from "dayjs";
import {
	AdminTask,
	AiContext,
	CreateTaskRequest,
	TaskCategory,
	TaskFilterOptions,
	TaskPriority,
	TaskStatus,
	STATUS_LABELS,
	PRIORITY_LABELS,
	CATEGORY_LABELS,
} from "types/admin-task";
import { isSafeSessionId } from "utils/aiSessions";
import RepoPicker from "./RepoPicker";
import AiContextEditor from "./AiContextEditor";

/** Fin del día local: "2026-10-08" sin hora se interpretaba como medianoche UTC y mostraba el día anterior en Argentina. */
const dueDateToIso = (day: string): string => dayjs(day).endOf("day").toISOString();

interface TaskFormDialogProps {
	open: boolean;
	task: AdminTask | null;
	filterOptions: TaskFilterOptions | null;
	onClose: () => void;
	onSave: (data: CreateTaskRequest) => Promise<void>;
}

interface FormState {
	title: string;
	description: string;
	status: TaskStatus;
	priority: TaskPriority;
	category: TaskCategory;
	tags: string[];
	project: string;
	assignedTo: string;
	dueDate: string;
	repos: string[];
	aiContext: AiContext;
}

const EMPTY_FORM: FormState = {
	title: "",
	description: "",
	status: "todo",
	priority: "medium",
	category: "other",
	tags: [],
	project: "",
	assignedTo: "",
	dueDate: "",
	repos: [],
	aiContext: { prompt: "", sessions: [] },
};

const fromTask = (task: AdminTask): FormState => ({
	title: task.title,
	description: task.description || "",
	status: task.status,
	priority: task.priority,
	category: task.category,
	tags: task.tags || [],
	project: task.project || "",
	assignedTo: task.assignedTo || "",
	dueDate: task.dueDate ? dayjs(task.dueDate).format("YYYY-MM-DD") : "",
	repos: task.repos || [],
	aiContext: {
		prompt: task.aiContext?.prompt || "",
		agent: task.aiContext?.agent,
		sessions: (task.aiContext?.sessions || []).map((s) => ({ ...s })),
	},
});

const SectionTitle: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
	<Box>
		<Typography variant="subtitle1" fontWeight={600}>
			{title}
		</Typography>
		{hint && (
			<Typography variant="caption" color="text.secondary">
				{hint}
			</Typography>
		)}
	</Box>
);

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({ open, task, filterOptions, onClose, onSave }) => {
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [tagInput, setTagInput] = useState("");
	// Día del vencimiento tal como se cargó: si no se toca, se conserva el instante guardado.
	const [initialDueDay, setInitialDueDay] = useState("");

	useEffect(() => {
		const next = task ? fromTask(task) : EMPTY_FORM;
		setForm(next);
		setInitialDueDay(next.dueDate);
		setTagInput("");
	}, [task, open]);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

	const hasInvalidSession = useMemo(
		() => (form.aiContext.sessions || []).some((s) => s.sessionId.length > 0 && !isSafeSessionId(s.sessionId)),
		[form.aiContext.sessions],
	);

	const handleAddTag = () => {
		const tag = tagInput.trim().toLowerCase();
		if (tag && !form.tags.includes(tag)) {
			set("tags", [...form.tags, tag]);
			setTagInput("");
		}
	};

	const handleSubmit = async () => {
		if (!form.title.trim() || hasInvalidSession) return;
		setSaving(true);
		try {
			const sessions = (form.aiContext.sessions || [])
				.filter((s) => s.sessionId.trim())
				.map((s) => ({ ...s, label: s.label?.trim() || undefined }));
			const payload: CreateTaskRequest = {
				title: form.title.trim(),
				description: form.description,
				status: form.status,
				priority: form.priority,
				category: form.category,
				tags: form.tags,
				project: form.project,
				assignedTo: form.assignedTo,
				...(form.dueDate !== initialDueDay ? { dueDate: form.dueDate ? dueDateToIso(form.dueDate) : "" } : {}),
				repos: form.repos,
				// Siempre se envía completo: así, vaciar el prompt o quitar sesiones también se guarda.
				aiContext: { prompt: form.aiContext.prompt?.trim() || "", agent: form.aiContext.agent, sessions },
			};
			await onSave(payload);
			onClose();
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
			<DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2.5} sx={{ pt: 1 }}>
					<SectionTitle title="General" />
					<TextField label="Título" value={form.title} onChange={(e) => set("title", e.target.value)} fullWidth required autoFocus />
					<TextField
						label="Descripción"
						value={form.description}
						onChange={(e) => set("description", e.target.value)}
						fullWidth
						multiline
						minRows={3}
						maxRows={10}
					/>
					<Box>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<FormControl fullWidth size="small">
									<InputLabel>Estado</InputLabel>
									<Select value={form.status} label="Estado" onChange={(e) => set("status", e.target.value as TaskStatus)}>
										{filterOptions?.statuses.map((s) => (
											<MenuItem key={s} value={s}>
												{STATUS_LABELS[s]}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={6} sm={3}>
								<FormControl fullWidth size="small">
									<InputLabel>Prioridad</InputLabel>
									<Select value={form.priority} label="Prioridad" onChange={(e) => set("priority", e.target.value as TaskPriority)}>
										{filterOptions?.priorities.map((p) => (
											<MenuItem key={p} value={p}>
												{PRIORITY_LABELS[p]}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={6} sm={3}>
								<FormControl fullWidth size="small">
									<InputLabel>Categoría</InputLabel>
									<Select value={form.category} label="Categoría" onChange={(e) => set("category", e.target.value as TaskCategory)}>
										{filterOptions?.categories.map((c) => (
											<MenuItem key={c} value={c}>
												{CATEGORY_LABELS[c]}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={6} sm={3}>
								<TextField
									label="Fecha límite"
									type="date"
									value={form.dueDate}
									onChange={(e) => set("dueDate", e.target.value)}
									fullWidth
									size="small"
									InputLabelProps={{ shrink: true }}
								/>
							</Grid>
							<Grid item xs={6}>
								<TextField label="Proyecto" value={form.project} onChange={(e) => set("project", e.target.value)} fullWidth size="small" />
							</Grid>
							<Grid item xs={6}>
								<TextField
									label="Asignado a"
									value={form.assignedTo}
									onChange={(e) => set("assignedTo", e.target.value)}
									fullWidth
									size="small"
								/>
							</Grid>
						</Grid>
					</Box>
					<Box>
						<Typography variant="body2" color="textSecondary" gutterBottom>
							Tags
						</Typography>
						{form.tags.length > 0 && (
							<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
								{form.tags.map((tag) => (
									<Chip
										key={tag}
										label={tag}
										size="small"
										onDelete={() =>
											set(
												"tags",
												form.tags.filter((t) => t !== tag),
											)
										}
									/>
								))}
							</Box>
						)}
						<TextField
							placeholder="Agregar tag…"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAddTag();
								}
							}}
							size="small"
							InputProps={{
								endAdornment: (
									<InputAdornment position="end">
										<IconButton size="small" aria-label="Agregar tag" onClick={handleAddTag}>
											<Add size={16} />
										</IconButton>
									</InputAdornment>
								),
							}}
						/>
					</Box>

					<Divider />
					<SectionTitle title="Repositorios" hint="Repos de GitHub del ecosistema Law Analytics a los que apunta la tarea." />
					<RepoPicker value={form.repos} onChange={(repos) => set("repos", repos)} />

					<Divider />
					<SectionTitle title="Consulta IA" hint="Prompt y sesiones de Claude Code o Codex para retomar el trabajo desde la terminal." />
					<AiContextEditor value={form.aiContext} onChange={(aiContext) => set("aiContext", aiContext)} />
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={saving || !form.title.trim() || hasInvalidSession}>
					{saving ? "Guardando…" : task ? "Actualizar" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default TaskFormDialog;
