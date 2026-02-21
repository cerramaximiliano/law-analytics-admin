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
} from "@mui/material";
import { Refresh, Edit2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { CostPricing } from "api/ragWorkers";

const WorkerPricingTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [pricing, setPricing] = useState<CostPricing[]>([]);
	const [loading, setLoading] = useState(true);
	const [editModel, setEditModel] = useState<CostPricing | null>(null);
	const [editInput, setEditInput] = useState("");
	const [editOutput, setEditOutput] = useState("");
	const [editNotes, setEditNotes] = useState("");

	const fetchPricing = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getPricing();
			setPricing(data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar precios", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchPricing();
	}, [fetchPricing]);

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
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Stack>
					<Typography variant="h5">Tabla de Precios por Modelo</Typography>
					<Typography variant="body2" color="text.secondary">
						Precios USD por 1M tokens. Usados para calcular costos en las estadisticas.
					</Typography>
				</Stack>
				<Tooltip title="Refrescar">
					<IconButton onClick={fetchPricing} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
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
							<TableCell align="center">Editar</TableCell>
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
									<IconButton size="small" onClick={() => handleEdit(p)}>
										<Edit2 size={16} />
									</IconButton>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Edit dialog */}
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
						<TextField label="Notas" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} size="small" fullWidth multiline rows={2} />
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditModel(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSave}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default WorkerPricingTab;
