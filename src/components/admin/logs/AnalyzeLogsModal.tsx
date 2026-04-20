import { useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";
import { Magicpen, CloseCircle, InfoCircle, Warning2, Flash } from "iconsax-react";
import { useSnackbar } from "notistack";
import logsService, { AnalyzeResponse } from "api/logs";

interface Props {
	open: boolean;
	onClose: () => void;
	filters: {
		service?: string;
		host?: string;
		level?: string;
		search?: string;
		from?: string;
		to?: string;
	};
}

const FOCUS_OPTIONS: { value: "rootCause" | "anomaly" | "summary"; label: string; description: string }[] = [
	{ value: "rootCause", label: "Causa raíz", description: "Agrupa logs por causa, explica stacks y sugiere fixes" },
	{ value: "anomaly", label: "Anomalías", description: "Detecta patrones fuera de lo común, spikes, errores nuevos" },
	{ value: "summary", label: "Resumen narrativo", description: "Panorama general en 1-2 párrafos, sin clustering" },
];

const LEVEL_COLORS: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
	info: "info",
	warn: "warning",
	error: "error",
	fatal: "error",
};

const AnalyzeLogsModal = ({ open, onClose, filters }: Props) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [focus, setFocus] = useState<"rootCause" | "anomaly" | "summary">("rootCause");
	const [limit, setLimit] = useState(500);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<AnalyzeResponse["data"] | null>(null);
	const [usage, setUsage] = useState<AnalyzeResponse["usage"] | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleAnalyze = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await logsService.analyze({ ...filters, limit, focus });
			if (res.success && res.data) {
				setResult(res.data);
				setUsage(res.usage || null);
			} else {
				throw new Error("Respuesta inválida del servidor");
			}
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message || "Error al analizar logs";
			setError(msg);
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (loading) return;
		setResult(null);
		setUsage(null);
		setError(null);
		onClose();
	};

	const activeFiltersCount = Object.values(filters).filter(Boolean).length;

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" spacing={1} alignItems="center">
					<Magicpen size={22} color={theme.palette.secondary.main} />
					<Typography variant="h6" fontWeight={700}>
						Análisis con AI
					</Typography>
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
					Los logs ya filtrados se envían a gpt-4o-mini para clustering por causa raíz, explicación de stacks y sugerencias de fix.
				</Typography>
			</DialogTitle>

			<DialogContent dividers>
				{/* ── Config ── */}
				{!result && (
					<Stack spacing={2}>
						<Paper variant="outlined" sx={{ p: 1.5, bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50" }}>
							<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Filtros activos ({activeFiltersCount})
							</Typography>
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
								{Object.entries(filters)
									.filter(([, v]) => v)
									.map(([k, v]) => (
										<Chip key={k} label={`${k}: ${v}`} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
									))}
								{activeFiltersCount === 0 && (
									<Typography variant="caption" color="text.disabled">
										(sin filtros — se analizarán los últimos logs de toda la infraestructura)
									</Typography>
								)}
							</Stack>
						</Paper>

						<Stack direction="row" spacing={1.5}>
							<FormControl size="small" sx={{ flex: 1 }}>
								<InputLabel>Foco del análisis</InputLabel>
								<Select value={focus} label="Foco del análisis" onChange={(e) => setFocus(e.target.value as any)}>
									{FOCUS_OPTIONS.map((opt) => (
										<MenuItem key={opt.value} value={opt.value}>
											<Stack>
												<Typography variant="body2">{opt.label}</Typography>
												<Typography variant="caption" color="text.secondary">
													{opt.description}
												</Typography>
											</Stack>
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<TextField
								label="Logs a analizar"
								type="number"
								size="small"
								value={limit}
								onChange={(e) => setLimit(Math.max(10, Math.min(1000, parseInt(e.target.value) || 500)))}
								inputProps={{ min: 10, max: 1000, step: 50 }}
								sx={{ width: 160 }}
								helperText="máx 1000"
							/>
						</Stack>

						<Alert severity="info" icon={<InfoCircle size={18} />} sx={{ fontSize: "0.85rem" }}>
							Costo estimado: ~$0.001-0.005 por análisis con gpt-4o-mini. Toma 15-45s dependiendo de la cantidad de logs.
						</Alert>

						{error && (
							<Alert severity="error" icon={<CloseCircle size={18} />} onClose={() => setError(null)}>
								{error}
							</Alert>
						)}
					</Stack>
				)}

				{/* ── Resultado ── */}
				{result && (
					<Stack spacing={2}>
						<Paper variant="outlined" sx={{ p: 1.5 }}>
							<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
								<InfoCircle size={16} color={theme.palette.info.main} />
								<Typography variant="subtitle2" fontWeight={700}>
									Resumen
								</Typography>
								<Chip label={`${result.totalAnalyzed} logs`} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
							</Stack>
							<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
								{result.summary || "(sin resumen)"}
							</Typography>
						</Paper>

						{result.clusters.length > 0 && (
							<Box>
								<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
									Clusters detectados ({result.clusters.length})
								</Typography>
								<Stack spacing={1.5}>
									{result.clusters.map((cluster, idx) => (
										<Paper
											key={idx}
											variant="outlined"
											sx={{
												p: 1.5,
												borderLeft: 4,
												borderLeftColor: cluster.level && LEVEL_COLORS[cluster.level] ? `${LEVEL_COLORS[cluster.level]}.main` : "divider",
											}}
										>
											<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
												<Chip label={`${cluster.count}`} size="small" color="default" sx={{ fontWeight: 700 }} />
												{cluster.level && (
													<Chip
														label={cluster.level}
														size="small"
														color={LEVEL_COLORS[cluster.level] || "default"}
														sx={{ fontSize: "0.65rem", height: 20 }}
													/>
												)}
												<Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
													{cluster.title}
												</Typography>
											</Stack>
											<Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block" }}>
												Causa raíz
											</Typography>
											<Typography variant="body2" sx={{ mb: 1 }}>
												{cluster.rootCause}
											</Typography>
											{cluster.fix && (
												<>
													<Typography variant="caption" color="success.main" fontWeight={700} sx={{ display: "block" }}>
														Fix sugerido
													</Typography>
													<Typography variant="body2" sx={{ mb: 1 }}>
														{cluster.fix}
													</Typography>
												</>
											)}
											<Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ display: "block", mt: 1 }}>
												Ejemplo
											</Typography>
											<Box
												component="pre"
												sx={{
													m: 0,
													mt: 0.5,
													p: 1,
													fontFamily: "monospace",
													fontSize: 11,
													whiteSpace: "pre-wrap",
													wordBreak: "break-word",
													bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
													borderRadius: 0.5,
												}}
											>
												{cluster.sampleMessage}
											</Box>
										</Paper>
									))}
								</Stack>
							</Box>
						)}

						{result.anomalies && result.anomalies.length > 0 && (
							<Box>
								<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
									<Warning2 size={16} color={theme.palette.warning.main} />
									<Typography variant="subtitle2" fontWeight={700}>
										Anomalías detectadas
									</Typography>
								</Stack>
								<Stack spacing={0.75}>
									{result.anomalies.map((a, i) => (
										<Alert key={i} severity="warning" icon={<Flash size={16} />} sx={{ fontSize: "0.85rem", py: 0.5 }}>
											{a}
										</Alert>
									))}
								</Stack>
							</Box>
						)}

						<Divider />
						<Stack direction="row" spacing={1}>
							{usage && (
								<Typography variant="caption" color="text.disabled">
									Tokens: {usage.total_tokens?.toLocaleString() || "?"} (prompt {usage.prompt_tokens}, completion {usage.completion_tokens})
								</Typography>
							)}
						</Stack>
					</Stack>
				)}
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={handleClose} disabled={loading}>
					{result ? "Cerrar" : "Cancelar"}
				</Button>
				{result && (
					<Button variant="outlined" onClick={() => setResult(null)}>
						Nuevo análisis
					</Button>
				)}
				{!result && (
					<Button
						variant="contained"
						color="secondary"
						onClick={handleAnalyze}
						disabled={loading}
						startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Magicpen size={18} />}
					>
						{loading ? "Analizando..." : "Analizar"}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
};

export default AnalyzeLogsModal;
