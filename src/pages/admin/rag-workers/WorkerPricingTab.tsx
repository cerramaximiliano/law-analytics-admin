import React, { useState, useEffect, useCallback } from "react";
import {
	Stack,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	IconButton,
	Tooltip,
	Chip,
	TextField,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Skeleton,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Paper,
	Box,
} from "@mui/material";
import { Refresh, Edit2, Trash, AddCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { CostPricing, PipelineLlmConfig } from "api/ragWorkers";

const WorkerPricingTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [pricing, setPricing] = useState<CostPricing[]>([]);
	const [loading, setLoading] = useState(true);
	const [editModel, setEditModel] = useState<CostPricing | null>(null);
	const [editInput, setEditInput] = useState("");
	const [editOutput, setEditOutput] = useState("");
	const [editNotes, setEditNotes] = useState("");

	// LLM config state
	const [llmConfig, setLlmConfig] = useState<PipelineLlmConfig>({
		chatModel: "gpt-4o-mini",
		chatMaxTokens: 2000,
		chatTemperature: 0.3,
		generationModel: "gpt-4o",
		generationMaxTokens: 4000,
		generationTemperature: 0.4,
	});
	const [savingLlm, setSavingLlm] = useState(false);

	// Add model dialog
	const [addOpen, setAddOpen] = useState(false);
	const [addName, setAddName] = useState("");
	const [addType, setAddType] = useState<"llm" | "embedding">("llm");
	const [addInputPrice, setAddInputPrice] = useState("");
	const [addOutputPrice, setAddOutputPrice] = useState("");
	const [addNotes, setAddNotes] = useState("");
	const [addSaving, setAddSaving] = useState(false);

	// Delete confirmation
	const [deleteModel, setDeleteModel] = useState<CostPricing | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const [pricingData, pipelineData] = await Promise.all([RagWorkersService.getPricing(), RagWorkersService.getPipelineConfig()]);
			setPricing(pricingData);
			if (pipelineData.llm) {
				setLlmConfig(pipelineData.llm);
			}
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar datos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// ── LLM config handlers ──────────────────────────────────────────────

	const handleLlmChange = async (field: keyof PipelineLlmConfig, value: string | number) => {
		const prev = { ...llmConfig };
		setLlmConfig({ ...llmConfig, [field]: value });
		setSavingLlm(true);
		try {
			await RagWorkersService.updatePipelineConfig({ llm: { [field]: value } });
			enqueueSnackbar(`LLM config actualizada: ${field} = ${value}`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar config LLM", { variant: "error" });
			setLlmConfig(prev);
		} finally {
			setSavingLlm(false);
		}
	};

	const llmModels = pricing.filter((p) => p.modelType === "llm");

	// ── Edit pricing handlers ────────────────────────────────────────────

	const handleEdit = (model: CostPricing) => {
		setEditModel(model);
		setEditInput(model.inputPricePer1M.toString());
		setEditOutput(model.outputPricePer1M.toString());
		setEditNotes(model.notes || "");
	};

	const handleSave = async () => {
		if (!editModel) return;
		try {
			const updated = await RagWorkersService.updatePricing(editModel.modelName, {
				inputPricePer1M: parseFloat(editInput),
				outputPricePer1M: parseFloat(editOutput),
				notes: editNotes || undefined,
			});
			setPricing((prev) => prev.map((p) => (p.modelName === editModel.modelName ? updated : p)));
			enqueueSnackbar(`Precio de ${editModel.modelName} actualizado`, { variant: "success" });
			setEditModel(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar precio", { variant: "error" });
		}
	};

	// ── Add model handlers ───────────────────────────────────────────────

	const handleAddOpen = () => {
		setAddName("");
		setAddType("llm");
		setAddInputPrice("");
		setAddOutputPrice("");
		setAddNotes("");
		setAddOpen(true);
	};

	const handleAddSave = async () => {
		if (!addName || !addInputPrice || !addOutputPrice) return;
		setAddSaving(true);
		try {
			const created = await RagWorkersService.createPricing({
				modelName: addName,
				modelType: addType,
				inputPricePer1M: parseFloat(addInputPrice),
				outputPricePer1M: parseFloat(addOutputPrice),
				notes: addNotes || undefined,
			});
			setPricing((prev) => [...prev, created]);
			enqueueSnackbar(`Modelo ${addName} creado`, { variant: "success" });
			setAddOpen(false);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al crear modelo", { variant: "error" });
		} finally {
			setAddSaving(false);
		}
	};

	// ── Delete model handlers ────────────────────────────────────────────

	const handleDeleteConfirm = async () => {
		if (!deleteModel) return;
		try {
			await RagWorkersService.deletePricing(deleteModel.modelName);
			setPricing((prev) => prev.filter((p) => p.modelName !== deleteModel.modelName));
			enqueueSnackbar(`Modelo ${deleteModel.modelName} eliminado`, { variant: "success" });
			setDeleteModel(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al eliminar modelo", { variant: "error" });
		}
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
				))}
			</Stack>
		);
	}

	return (
		<Stack spacing={3}>
			{/* ── Modelo LLM Activo ─────────────────────────────────────────── */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Stack spacing={2}>
					<Typography variant="h6">Modelo LLM Activo</Typography>
					<Typography variant="body2" color="text.secondary">
						Modelo usado por el sistema para chat/resúmenes y generación de documentos. El cambio aplica en tiempo real.
					</Typography>
					{/* Chat / Resúmenes */}
					<Typography variant="subtitle2" sx={{ mt: 1 }}>
						Chat / Resúmenes
					</Typography>
					<Stack direction="row" spacing={2}>
						<FormControl size="small" sx={{ minWidth: 200 }}>
							<InputLabel>Modelo</InputLabel>
							<Select
								value={llmConfig.chatModel}
								label="Modelo"
								onChange={(e) => handleLlmChange("chatModel", e.target.value)}
								disabled={savingLlm}
							>
								{llmModels.map((m) => (
									<MenuItem key={m.modelName} value={m.modelName}>
										{m.modelName}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<TextField
							label="Max tokens"
							type="number"
							size="small"
							sx={{ width: 130 }}
							value={llmConfig.chatMaxTokens}
							onChange={(e) => handleLlmChange("chatMaxTokens", parseInt(e.target.value, 10) || 0)}
							inputProps={{ min: 100, max: 16000, step: 100 }}
							disabled={savingLlm}
						/>
						<TextField
							label="Temperature"
							type="number"
							size="small"
							sx={{ width: 130 }}
							value={llmConfig.chatTemperature}
							onChange={(e) => handleLlmChange("chatTemperature", parseFloat(e.target.value) || 0)}
							inputProps={{ min: 0, max: 2, step: 0.1 }}
							disabled={savingLlm}
						/>
					</Stack>

					{/* Generación / Estrategias */}
					<Typography variant="subtitle2">Generación / Estrategias</Typography>
					<Stack direction="row" spacing={2}>
						<FormControl size="small" sx={{ minWidth: 200 }}>
							<InputLabel>Modelo</InputLabel>
							<Select
								value={llmConfig.generationModel}
								label="Modelo"
								onChange={(e) => handleLlmChange("generationModel", e.target.value)}
								disabled={savingLlm}
							>
								{llmModels.map((m) => (
									<MenuItem key={m.modelName} value={m.modelName}>
										{m.modelName}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<TextField
							label="Max tokens"
							type="number"
							size="small"
							sx={{ width: 130 }}
							value={llmConfig.generationMaxTokens}
							onChange={(e) => handleLlmChange("generationMaxTokens", parseInt(e.target.value, 10) || 0)}
							inputProps={{ min: 100, max: 16000, step: 100 }}
							disabled={savingLlm}
						/>
						<TextField
							label="Temperature"
							type="number"
							size="small"
							sx={{ width: 130 }}
							value={llmConfig.generationTemperature}
							onChange={(e) => handleLlmChange("generationTemperature", parseFloat(e.target.value) || 0)}
							inputProps={{ min: 0, max: 2, step: 0.1 }}
							disabled={savingLlm}
						/>
					</Stack>
				</Stack>
			</Paper>

			{/* ── Tabla de Precios ──────────────────────────────────────────── */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Stack>
					<Typography variant="h5">Tabla de Precios por Modelo</Typography>
					<Typography variant="body2" color="text.secondary">
						Precios USD por 1M tokens. Usados para calcular costos en las estadisticas.
					</Typography>
				</Stack>
				<Stack direction="row" spacing={1}>
					<Button variant="outlined" size="small" startIcon={<AddCircle size={16} />} onClick={handleAddOpen}>
						Agregar modelo
					</Button>
					<Tooltip title="Refrescar">
						<IconButton onClick={fetchData} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Modelo</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell align="right">Input (USD/1M)</TableCell>
							<TableCell align="right">Output (USD/1M)</TableCell>
							<TableCell>Notas</TableCell>
							<TableCell>Vigencia</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{pricing.map((p) => (
							<TableRow key={p.modelName} hover>
								<TableCell>
									<Typography variant="subtitle2" sx={{ fontFamily: "monospace" }}>
										{p.modelName}
									</Typography>
								</TableCell>
								<TableCell>
									<Chip label={p.modelType} size="small" color={p.modelType === "llm" ? "primary" : "secondary"} variant="outlined" />
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
										${p.inputPricePer1M.toFixed(2)}
									</Typography>
								</TableCell>
								<TableCell align="right">
									<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
										${p.outputPricePer1M.toFixed(2)}
									</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="caption" color="text.secondary">
										{p.notes || "-"}
									</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
										{p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString("es-AR") : "-"}
									</Typography>
								</TableCell>
								<TableCell align="center">
									<Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
										<Tooltip title="Editar precio">
											<IconButton size="small" onClick={() => handleEdit(p)}>
												<Edit2 size={16} />
											</IconButton>
										</Tooltip>
										<Tooltip title="Eliminar modelo">
											<IconButton size="small" color="error" onClick={() => setDeleteModel(p)}>
												<Trash size={16} />
											</IconButton>
										</Tooltip>
									</Box>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			{/* ── Edit pricing dialog ──────────────────────────────────────── */}
			<Dialog open={!!editModel} onClose={() => setEditModel(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Editar Precio — {editModel?.modelName}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Input (USD por 1M tokens)"
							type="number"
							value={editInput}
							onChange={(e) => setEditInput(e.target.value)}
							inputProps={{ step: "0.01", min: "0" }}
							size="small"
							fullWidth
						/>
						<TextField
							label="Output (USD por 1M tokens)"
							type="number"
							value={editOutput}
							onChange={(e) => setEditOutput(e.target.value)}
							inputProps={{ step: "0.01", min: "0" }}
							size="small"
							fullWidth
						/>
						<TextField
							label="Notas"
							value={editNotes}
							onChange={(e) => setEditNotes(e.target.value)}
							size="small"
							fullWidth
							multiline
							rows={2}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditModel(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSave}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Add model dialog ─────────────────────────────────────────── */}
			<Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Agregar Modelo de Pricing</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Nombre del modelo"
							value={addName}
							onChange={(e) => setAddName(e.target.value)}
							size="small"
							fullWidth
							placeholder="ej: gpt-4.1-mini"
						/>
						<FormControl size="small" fullWidth>
							<InputLabel>Tipo</InputLabel>
							<Select value={addType} label="Tipo" onChange={(e) => setAddType(e.target.value as "llm" | "embedding")}>
								<MenuItem value="llm">LLM</MenuItem>
								<MenuItem value="embedding">Embedding</MenuItem>
							</Select>
						</FormControl>
						<TextField
							label="Input (USD por 1M tokens)"
							type="number"
							value={addInputPrice}
							onChange={(e) => setAddInputPrice(e.target.value)}
							inputProps={{ step: "0.01", min: "0" }}
							size="small"
							fullWidth
						/>
						<TextField
							label="Output (USD por 1M tokens)"
							type="number"
							value={addOutputPrice}
							onChange={(e) => setAddOutputPrice(e.target.value)}
							inputProps={{ step: "0.01", min: "0" }}
							size="small"
							fullWidth
						/>
						<TextField
							label="Notas"
							value={addNotes}
							onChange={(e) => setAddNotes(e.target.value)}
							size="small"
							fullWidth
							multiline
							rows={2}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleAddSave} disabled={addSaving || !addName || !addInputPrice || !addOutputPrice}>
						Crear
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Delete confirmation dialog ───────────────────────────────── */}
			<Dialog open={!!deleteModel} onClose={() => setDeleteModel(null)} maxWidth="xs">
				<DialogTitle>Eliminar Modelo</DialogTitle>
				<DialogContent>
					<Typography>
						¿Eliminar el modelo <strong>{deleteModel?.modelName}</strong> de la tabla de precios?
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteModel(null)}>Cancelar</Button>
					<Button variant="contained" color="error" onClick={handleDeleteConfirm}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default WorkerPricingTab;
