import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	TextField,
	IconButton,
	Tooltip,
	Chip,
	Alert,
	Skeleton,
	Divider,
	useTheme,
	useMediaQuery,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, Edit2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { PipelineConfig } from "api/ragWorkers";

// ── Config variable definition ──────────────────────────────────────────────

interface ConfigVar {
	key: string;
	label: string;
	description: string;
	editable: boolean;
	section: "chunker" | "embedding" | "batcher" | "modelLimits";
	field: string;
	suffix?: string;
	type?: "int" | "float";
	min?: number;
	max?: number;
}

const CONFIG_VARS: ConfigVar[] = [
	// Chunker
	{ key: "chunker.chunkSizeTokens", label: "Chunk Size", section: "chunker", field: "chunkSizeTokens", editable: true, suffix: "tokens", type: "int", min: 100, max: 5000, description: "Cantidad de tokens por chunk. Determina el tamano de cada fragmento de texto indexado." },
	{ key: "chunker.chunkOverlapTokens", label: "Overlap", section: "chunker", field: "chunkOverlapTokens", editable: true, suffix: "tokens", type: "int", min: 0, max: 500, description: "Superposicion entre chunks consecutivos. Mejora la continuidad semantica entre fragmentos." },
	{ key: "chunker.charsPerToken", label: "Chars por Token", section: "chunker", field: "charsPerToken", editable: true, suffix: "chars/tok", type: "float", min: 1, max: 10, description: "Factor de estimacion caracteres/token para texto legal en espanol. Valores menores son mas conservadores." },
	{ key: "chunker.maxEmbeddingTokens", label: "Max Embedding Tokens", section: "chunker", field: "maxEmbeddingTokens", editable: true, suffix: "tokens", type: "int", min: 1000, max: 8191, description: "Limite maximo de tokens por chunk antes del embedding. Cap de seguridad vs el limite del modelo." },
	// Embedding
	{ key: "embedding.model", label: "Modelo", section: "embedding", field: "model", editable: false, description: "Modelo de OpenAI utilizado para generar embeddings. Configurado via variable de entorno." },
	{ key: "embedding.dimensions", label: "Dimensiones", section: "embedding", field: "dimensions", editable: false, description: "Dimensiones del vector de embedding. Determinado por el modelo y la configuracion del servidor." },
	{ key: "embedding.maxInputChars", label: "Max Input Chars", section: "embedding", field: "maxInputChars", editable: true, suffix: "chars", type: "int", min: 1000, max: 100000, description: "Limite de caracteres por texto antes de truncar. Previene errores 400 por inputs demasiado largos." },
	{ key: "embedding.maxRetries", label: "Max Retries", section: "embedding", field: "maxRetries", editable: true, suffix: "intentos", type: "int", min: 0, max: 10, description: "Cantidad maxima de reintentos ante errores transitorios (rate limit, timeout). No reintenta errores 400/401." },
	// Batcher
	{ key: "batcher.maxBatchSize", label: "Batch Size", section: "batcher", field: "maxBatchSize", editable: true, suffix: "textos", type: "int", min: 1, max: 2048, description: "Cantidad de textos por lote enviado a la API de embeddings. Balancea latencia vs throughput." },
	{ key: "batcher.flushIntervalMs", label: "Flush Interval", section: "batcher", field: "flushIntervalMs", editable: true, suffix: "ms", type: "int", min: 100, max: 30000, description: "Tiempo maximo de espera antes de enviar un lote parcial." },
	// Model Limits
	{ key: "modelLimits.maxTokensPerInput", label: "Max Tokens por Input", section: "modelLimits", field: "maxTokensPerInput", editable: false, description: "Limite hard de OpenAI por input (8191 tokens para text-embedding-3-small). No es configurable." },
];

const SECTION_LABELS: Record<string, { title: string; description: string }> = {
	chunker: { title: "Chunker", description: "Configuracion del particionado de texto en fragmentos" },
	embedding: { title: "Embedding", description: "Configuracion del modelo de embeddings de OpenAI" },
	batcher: { title: "Batcher + Limites del modelo", description: "Configuracion del batching y limites del modelo" },
};

// ── Component ───────────────────────────────────────────────────────────────

const WorkerPipelineTab = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<PipelineConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [editingKey, setEditingKey] = useState<string | null>(null);
	const [editValue, setEditValue] = useState<string>("");
	const [saving, setSaving] = useState(false);

	const fetchConfig = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getPipelineConfig();
			setConfig(data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar configuracion del pipeline", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	const getFieldValue = (v: ConfigVar): string | number => {
		if (!config) return "-";
		const section = config[v.section as keyof PipelineConfig];
		if (!section || typeof section !== "object") return "-";
		return (section as any)[v.field] ?? "-";
	};

	const handleStartEdit = (v: ConfigVar) => {
		setEditingKey(v.key);
		setEditValue(String(getFieldValue(v)));
	};

	const handleCancelEdit = () => {
		setEditingKey(null);
		setEditValue("");
	};

	const handleSave = async (v: ConfigVar) => {
		if (!config) return;

		const parsed = v.type === "float" ? parseFloat(editValue) : parseInt(editValue, 10);
		if (isNaN(parsed)) {
			enqueueSnackbar("Valor invalido", { variant: "error" });
			return;
		}

		if (v.min !== undefined && parsed < v.min) {
			enqueueSnackbar(`Valor minimo: ${v.min}`, { variant: "warning" });
			return;
		}
		if (v.max !== undefined && parsed > v.max) {
			enqueueSnackbar(`Valor maximo: ${v.max}`, { variant: "warning" });
			return;
		}

		try {
			setSaving(true);
			const updatePayload: any = {};

			if (v.section === "modelLimits") return; // read-only

			updatePayload[v.section] = { [v.field]: parsed };

			const result = await RagWorkersService.updatePipelineConfig(updatePayload);
			setConfig(result.data);
			setEditingKey(null);
			setEditValue("");
			enqueueSnackbar("Configuracion actualizada", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent, v: ConfigVar) => {
		if (e.key === "Enter") handleSave(v);
		if (e.key === "Escape") handleCancelEdit();
	};

	if (loading) {
		return (
			<Stack spacing={2} sx={{ p: 2 }}>
				<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	if (!config) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error">No se pudo cargar la configuracion del pipeline</Alert>
			</Box>
		);
	}

	// Group vars by section, merging batcher + modelLimits
	const sections = [
		{ key: "chunker", vars: CONFIG_VARS.filter((v) => v.section === "chunker") },
		{ key: "embedding", vars: CONFIG_VARS.filter((v) => v.section === "embedding") },
		{ key: "batcher", vars: CONFIG_VARS.filter((v) => v.section === "batcher" || v.section === "modelLimits") },
	];

	return (
		<Stack spacing={3} sx={{ p: isMobile ? 1.5 : 2 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Stack>
					<Typography variant="h5">Configuracion del Pipeline</Typography>
					<Typography variant="body2" color="text.secondary">
						Parametros de chunking, embedding y batching para el procesamiento de documentos
					</Typography>
				</Stack>
				<Tooltip title="Refrescar">
					<IconButton onClick={fetchConfig} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			<Alert severity="info" sx={{ borderRadius: 1.5 }}>
				Los cambios se aplican a los jobs nuevos (cache TTL ~30s). No requiere reinicio de workers.
			</Alert>

			{sections.map((section) => {
				const meta = SECTION_LABELS[section.key];
				return (
					<Box key={section.key} sx={{ p: isMobile ? 1.5 : 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
						<Stack spacing={0.5} sx={{ mb: 2 }}>
							<Typography variant="subtitle1" fontWeight={600}>
								{meta.title}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{meta.description}
							</Typography>
						</Stack>

						<Divider sx={{ mb: 2 }} />

						<Stack spacing={isMobile ? 1.5 : 1}>
							{section.vars.map((v) => {
								const currentValue = getFieldValue(v);
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
											<Stack direction="row" spacing={1} alignItems="center">
												<Typography variant="body2" fontWeight={500} noWrap>
													{v.label}
												</Typography>
												{!v.editable && (
													<Chip label="Solo lectura" size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
												)}
											</Stack>
											<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
												{v.description}
											</Typography>
										</Box>

										{/* Value */}
										<Box sx={{ minWidth: isMobile ? "100%" : 200, display: "flex", alignItems: "center", gap: 1 }}>
											{isEditing ? (
												<>
													<TextField
														size="small"
														value={editValue}
														onChange={(e) => setEditValue(e.target.value)}
														onKeyDown={(e) => handleKeyDown(e, v)}
														autoFocus
														disabled={saving}
														type="number"
														inputProps={{ min: v.min, max: v.max, step: v.type === "float" ? 0.1 : 1 }}
														sx={{ width: 120, "& input": { fontFamily: "monospace", fontSize: "0.85rem" } }}
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
												</>
											) : (
												<>
													<Typography
														variant="body2"
														sx={{
															fontFamily: "monospace",
															fontWeight: 600,
															color: v.editable ? theme.palette.primary.main : theme.palette.text.secondary,
														}}
													>
														{currentValue}
													</Typography>
													{v.suffix && (
														<Typography variant="caption" color="text.secondary">
															{v.suffix}
														</Typography>
													)}
													{v.editable && (
														<Tooltip title="Editar">
															<IconButton size="small" onClick={() => handleStartEdit(v)}>
																<Edit2 size={14} />
															</IconButton>
														</Tooltip>
													)}
												</>
											)}
										</Box>
									</Box>
								);
							})}
						</Stack>
					</Box>
				);
			})}
		</Stack>
	);
};

export default WorkerPipelineTab;
