import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	TextField,
	IconButton,
	Button,
	Tooltip,
	Chip,
	Alert,
	Skeleton,
	Divider,
	useTheme,
	useMediaQuery,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, Edit2, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { PipelineEditorConfig } from "api/ragWorkers";

// ── Config variable definition ──────────────────────────────────────────────

interface EditorConfigVar {
	key: keyof Omit<PipelineEditorConfig, "systemPrompt">;
	label: string;
	description: string;
	suffix?: string;
	type: "int" | "float" | "string";
	min?: number;
	max?: number;
}

const CONFIG_VARS: EditorConfigVar[] = [
	{
		key: "model",
		label: "Modelo",
		description: "Modelo de OpenAI utilizado para el chat del editor.",
		type: "string",
	},
	{
		key: "maxTokens",
		label: "Max Tokens",
		description: "Cantidad maxima de tokens en la respuesta del asistente.",
		suffix: "tokens",
		type: "int",
		min: 100,
		max: 8000,
	},
	{
		key: "temperature",
		label: "Temperature",
		description: "Controla la aleatoriedad de las respuestas (0 = determinista, 2 = muy creativo).",
		type: "float",
		min: 0,
		max: 2,
	},
	{
		key: "rateLimitMax",
		label: "Rate Limit (requests)",
		description: "Cantidad maxima de requests por usuario dentro de la ventana de tiempo.",
		suffix: "req",
		type: "int",
		min: 1,
		max: 200,
	},
	{
		key: "rateLimitWindowMs",
		label: "Rate Limit (ventana)",
		description: "Duracion de la ventana de rate limiting en milisegundos.",
		suffix: "ms",
		type: "int",
		min: 1000,
		max: 3600000,
	},
	{
		key: "documentMaxChars",
		label: "Document Max Chars",
		description: "Cantidad maxima de caracteres del documento actual enviados como contexto al LLM.",
		suffix: "chars",
		type: "int",
		min: 500,
		max: 32000,
	},
	{
		key: "pdfMaxChars",
		label: "PDF Max Chars",
		description: "Cantidad maxima de caracteres extraidos de un PDF adjunto enviados como contexto.",
		suffix: "chars",
		type: "int",
		min: 500,
		max: 32000,
	},
];

// ── Component ───────────────────────────────────────────────────────────────

const ChatEditorTab = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();

	const [editorConfig, setEditorConfig] = useState<PipelineEditorConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const [editValue, setEditValue] = useState<string>("");
	const [saving, setSaving] = useState(false);

	// systemPrompt editing
	const [editingPrompt, setEditingPrompt] = useState(false);
	const [promptDraft, setPromptDraft] = useState("");
	const [savingPrompt, setSavingPrompt] = useState(false);

	const fetchConfig = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getPipelineConfig();
			setEditorConfig(data.editor ?? null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar configuracion del editor", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	// ── Inline field edit ──────────────────────────────────────────────────

	const handleStartEdit = (v: EditorConfigVar) => {
		setEditingKey(v.key);
		setEditValue(String(editorConfig?.[v.key] ?? ""));
	};

	const handleCancelEdit = () => {
		setEditingKey(null);
		setEditValue("");
	};

	const handleSave = async (v: EditorConfigVar) => {
		if (!editorConfig) return;

		let parsed: string | number = editValue;
		if (v.type === "int") {
			parsed = parseInt(editValue, 10);
			if (isNaN(parsed as number)) { enqueueSnackbar("Valor invalido", { variant: "error" }); return; }
		} else if (v.type === "float") {
			parsed = parseFloat(editValue);
			if (isNaN(parsed as number)) { enqueueSnackbar("Valor invalido", { variant: "error" }); return; }
		}

		if (v.min !== undefined && (parsed as number) < v.min) {
			enqueueSnackbar(`Valor minimo: ${v.min}`, { variant: "warning" }); return;
		}
		if (v.max !== undefined && (parsed as number) > v.max) {
			enqueueSnackbar(`Valor maximo: ${v.max}`, { variant: "warning" }); return;
		}

		try {
			setSaving(true);
			const result = await RagWorkersService.updatePipelineConfig({ editor: { [v.key]: parsed } });
			setEditorConfig(result.data.editor ?? null);
			setEditingKey(null);
			setEditValue("");
			enqueueSnackbar("Configuracion actualizada", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent, v: EditorConfigVar) => {
		if (e.key === "Enter") handleSave(v);
		if (e.key === "Escape") handleCancelEdit();
	};

	// ── System prompt edit ─────────────────────────────────────────────────

	const handleStartEditPrompt = () => {
		setPromptDraft(editorConfig?.systemPrompt ?? "");
		setEditingPrompt(true);
	};

	const handleCancelEditPrompt = () => {
		setEditingPrompt(false);
		setPromptDraft("");
	};

	const handleSavePrompt = async () => {
		try {
			setSavingPrompt(true);
			const result = await RagWorkersService.updatePipelineConfig({ editor: { systemPrompt: promptDraft } });
			setEditorConfig(result.data.editor ?? null);
			setEditingPrompt(false);
			setPromptDraft("");
			enqueueSnackbar("System prompt actualizado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al guardar system prompt", { variant: "error" });
		} finally {
			setSavingPrompt(false);
		}
	};

	// ── Render ─────────────────────────────────────────────────────────────

	if (loading) {
		return (
			<Stack spacing={2} sx={{ p: 2 }}>
				<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={250} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	if (!editorConfig) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">No se pudo cargar la configuracion del editor</Alert>
			</Box>
		);
	}

	return (
		<Stack spacing={3} sx={{ p: isMobile ? 1.5 : 2 }}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Stack>
					<Typography variant="h5">Configuracion del Chat Editor</Typography>
					<Typography variant="body2" color="text.secondary">
						Parametros del asistente IA para el editor de documentos legales
					</Typography>
				</Stack>
				<Tooltip title="Refrescar">
					<IconButton onClick={fetchConfig} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			<Alert severity="info" sx={{ borderRadius: 1.5 }}>
				Los cambios se aplican en las proximas requests (cache TTL ~30s). No requiere reinicio.
			</Alert>

			{/* Numeric / string fields */}
			<Box sx={{ p: isMobile ? 1.5 : 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
				<Stack spacing={0.5} sx={{ mb: 2 }}>
					<Typography variant="subtitle1" fontWeight={600}>
						Parametros del modelo
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Modelo, tokens, temperatura y rate limiting
					</Typography>
				</Stack>

				<Divider sx={{ mb: 2 }} />

				<Stack spacing={isMobile ? 1.5 : 1}>
					{CONFIG_VARS.map((v) => {
						const currentValue = editorConfig[v.key];
						const isEditing = editingKey === v.key;

						return (
							<Box
								key={v.key}
								sx={{
									display: "flex",
									flexDirection: isMobile ? "column" : "row",
									alignItems: isMobile ? "flex-start" : "center",
									gap: isMobile ? 0.5 : 2,
									py: 1,
									px: 1.5,
									borderRadius: 1,
									"&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) },
								}}
							>
								{/* Label + description */}
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography variant="body2" fontWeight={500} noWrap>
										{v.label}
									</Typography>
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
										{v.description}
									</Typography>
								</Box>

								{/* Value */}
								<Box sx={{ minWidth: isMobile ? "100%" : 220, display: "flex", alignItems: "center", gap: 1 }}>
									{isEditing ? (
										<>
											<TextField
												size="small"
												value={editValue}
												onChange={(e) => setEditValue(e.target.value)}
												onKeyDown={(e) => handleKeyDown(e, v)}
												autoFocus
												disabled={saving}
												type={v.type === "string" ? "text" : "number"}
												inputProps={{ min: v.min, max: v.max, step: v.type === "float" ? 0.1 : 1 }}
												sx={{ width: v.type === "string" ? 180 : 120, "& input": { fontFamily: "monospace", fontSize: "0.85rem" } }}
											/>
											{v.suffix && (
												<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
													{v.suffix}
												</Typography>
											)}
											<Tooltip title="Guardar (Enter)">
												<IconButton size="small" onClick={() => handleSave(v)} disabled={saving} color="success">
													<TickCircle size={18} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Cancelar (Esc)">
												<IconButton size="small" onClick={handleCancelEdit} disabled={saving}>
													<CloseCircle size={18} />
												</IconButton>
											</Tooltip>
										</>
									) : (
										<>
											<Typography
												variant="body2"
												sx={{ fontFamily: "monospace", fontWeight: 600, color: theme.palette.primary.main }}
											>
												{String(currentValue)}
											</Typography>
											{v.suffix && (
												<Typography variant="caption" color="text.secondary">
													{v.suffix}
												</Typography>
											)}
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => handleStartEdit(v)}>
													<Edit2 size={14} />
												</IconButton>
											</Tooltip>
										</>
									)}
								</Box>
							</Box>
						);
					})}
				</Stack>
			</Box>

			{/* System Prompt */}
			<Box sx={{ p: isMobile ? 1.5 : 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
					<Stack spacing={0.5}>
						<Typography variant="subtitle1" fontWeight={600}>
							System Prompt
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Instrucciones del sistema enviadas al LLM en cada conversacion del editor
						</Typography>
					</Stack>
					{!editingPrompt && (
						<Stack direction="row" spacing={1} alignItems="center">
							<Chip
								label={`${editorConfig.systemPrompt?.length ?? 0} chars`}
								size="small"
								variant="outlined"
								sx={{ fontSize: "0.7rem" }}
							/>
							<Tooltip title="Editar">
								<IconButton size="small" onClick={handleStartEditPrompt}>
									<Edit2 size={14} />
								</IconButton>
							</Tooltip>
						</Stack>
					)}
				</Stack>

				<Divider sx={{ mb: 2 }} />

				{editingPrompt ? (
					<Stack spacing={2}>
						<TextField
							multiline
							minRows={8}
							maxRows={20}
							fullWidth
							value={promptDraft}
							onChange={(e) => setPromptDraft(e.target.value)}
							disabled={savingPrompt}
							inputProps={{ maxLength: 8000 }}
							sx={{ "& textarea": { fontFamily: "monospace", fontSize: "0.82rem" } }}
							helperText={`${promptDraft.length} / 8000 caracteres`}
						/>
						<Stack direction="row" spacing={1} justifyContent="flex-end">
							<Button variant="outlined" size="small" onClick={handleCancelEditPrompt} disabled={savingPrompt}>
								Cancelar
							</Button>
							<Button variant="contained" size="small" onClick={handleSavePrompt} disabled={savingPrompt}>
								Guardar prompt
							</Button>
						</Stack>
					</Stack>
				) : (
					<Box
						sx={{
							p: 1.5,
							borderRadius: 1,
							bgcolor: alpha(theme.palette.text.primary, 0.03),
							border: `1px solid ${theme.palette.divider}`,
							maxHeight: 240,
							overflowY: "auto",
						}}
					>
						<Typography
							variant="body2"
							sx={{
								fontFamily: "monospace",
								fontSize: "0.8rem",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								color: theme.palette.text.secondary,
							}}
						>
							{editorConfig.systemPrompt || "(vacío)"}
						</Typography>
					</Box>
				)}
			</Box>
		</Stack>
	);
};

export default ChatEditorTab;
