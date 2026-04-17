import { useCallback, useEffect, useState } from "react";
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
	Grid,
	IconButton,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Play, Refresh, Setting4 } from "iconsax-react";
import { useSnackbar } from "notistack";
import InfolegService from "api/infolegService";
import type { InfolegWorkerStatus } from "types/infoleg";

const STATUS_CONFIG: Record<string, { color: "success" | "error" | "warning" | "default"; label: string }> = {
	online: { color: "success", label: "Online" },
	stopped: { color: "default", label: "Detenido" },
	errored: { color: "error", label: "Error" },
	unavailable: { color: "warning", label: "N/D" },
};

const WORKER_DESCRIPTIONS: Record<string, string> = {
	"infoleg-manager": "Orquesta scrapers y siembra IDs pendientes automáticamente.",
	"infoleg-scraper": "Descarga metadatos, textos y vinculaciones de cada norma.",
	"infoleg-vinculaciones": "Procesa relaciones entre normas y actualiza los grafos.",
};

const formatMemory = (bytes: number) => {
	if (!bytes) return "—";
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatUptime = (ms?: number) => {
	if (!ms) return "—";
	const s = Math.floor(ms / 1000);
	if (s < 60) return `${s}s`;
	if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return `${h}h ${m}m`;
};

// ── Seed Dialog ───────────────────────────────────────────────

interface SeedDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: (from: number, to: number) => Promise<void>;
}

const SeedDialog = ({ open, onClose, onConfirm }: SeedDialogProps) => {
	const [fromId, setFromId] = useState("1");
	const [toId, setToId] = useState("1000");
	const [loading, setLoading] = useState(false);

	const handleConfirm = async () => {
		setLoading(true);
		try {
			await onConfirm(parseInt(fromId), parseInt(toId));
			onClose();
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Sembrar rango de IDs</DialogTitle>
			<DialogContent sx={{ pt: 2 }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Crea documentos <code>pending</code> en la colección para el rango indicado. Los IDs ya existentes no se modifican.
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={6}>
						<TextField fullWidth label="Desde (ID)" type="number" value={fromId} onChange={(e) => setFromId(e.target.value)} size="small" />
					</Grid>
					<Grid item xs={6}>
						<TextField fullWidth label="Hasta (ID)" type="number" value={toId} onChange={(e) => setToId(e.target.value)} size="small" />
					</Grid>
				</Grid>
				{parseInt(toId) - parseInt(fromId) > 50000 && (
					<Alert severity="warning" sx={{ mt: 1.5 }}>
						El rango supera los 50.000 IDs permitidos por operación.
					</Alert>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" onClick={handleConfirm} disabled={loading}>
					{loading ? <CircularProgress size={18} /> : "Sembrar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ── Main Tab ──────────────────────────────────────────────────

const WorkerStatusTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [workers, setWorkers] = useState<InfolegWorkerStatus[]>([]);
	const [loading, setLoading] = useState(true);
	const [restarting, setRestarting] = useState<string | null>(null);
	const [seedOpen, setSeedOpen] = useState(false);

	const fetchWorkers = useCallback(async () => {
		try {
			setLoading(true);
			const res = await InfolegService.getWorkers();
			setWorkers(res.data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al cargar workers", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchWorkers();
		const interval = setInterval(fetchWorkers, 15000);
		return () => clearInterval(interval);
	}, [fetchWorkers]);

	const handleRestart = async (name: string) => {
		setRestarting(name);
		try {
			const res = await InfolegService.restartWorker(name);
			enqueueSnackbar(res.message, { variant: "success" });
			setTimeout(fetchWorkers, 2000);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || `Error reiniciando ${name}`, { variant: "error" });
		} finally {
			setRestarting(null);
		}
	};

	const handleSeed = async (fromId: number, toId: number) => {
		try {
			const res = await InfolegService.seedRange(fromId, toId);
			enqueueSnackbar(res.message, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al sembrar rango", { variant: "error" });
			throw err;
		}
	};

	const statusCfg = (status: string) => STATUS_CONFIG[status] || { color: "default" as const, label: status };

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Procesos PM2</Typography>
				<Stack direction="row" spacing={1}>
					<Button variant="outlined" size="small" startIcon={<Setting4 size={16} />} onClick={() => setSeedOpen(true)}>
						Sembrar IDs
					</Button>
					<IconButton size="small" onClick={fetchWorkers} disabled={loading}>
						<Refresh size={18} />
					</IconButton>
				</Stack>
			</Stack>

			{loading && workers.length === 0 ? (
				<Stack spacing={1}>
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} variant="rounded" height={60} />
					))}
				</Stack>
			) : (
				<TableContainer sx={{ borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
					<Table size="small">
						<TableHead>
							<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
								<TableCell sx={{ fontWeight: 600 }}>Worker</TableCell>
								<TableCell sx={{ fontWeight: 600 }} align="center">
									Estado
								</TableCell>
								<TableCell sx={{ fontWeight: 600 }} align="right">
									CPU
								</TableCell>
								<TableCell sx={{ fontWeight: 600 }} align="right">
									Memoria
								</TableCell>
								<TableCell sx={{ fontWeight: 600 }} align="right">
									Uptime
								</TableCell>
								<TableCell sx={{ fontWeight: 600 }} align="right">
									Reinicios
								</TableCell>
								<TableCell sx={{ fontWeight: 600 }} align="center">
									Acción
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{workers.map((w) => {
								const cfg = statusCfg(w.status);
								return (
									<TableRow key={w.name} hover>
										<TableCell>
											<Box>
												<Typography variant="body2" fontWeight={600}>
													{w.name}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{WORKER_DESCRIPTIONS[w.name] || ""}
												</Typography>
											</Box>
										</TableCell>
										<TableCell align="center">
											<Chip label={cfg.label} color={cfg.color} size="small" />
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{w.cpu != null ? `${w.cpu}%` : "—"}</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{formatMemory(w.memory || 0)}</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{formatUptime(w.uptime)}</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{w.restarts ?? "—"}</Typography>
										</TableCell>
										<TableCell align="center">
											<Tooltip title={`Reiniciar ${w.name}`}>
												<span>
													<IconButton
														size="small"
														onClick={() => handleRestart(w.name)}
														disabled={restarting === w.name || w.status === "unavailable"}
													>
														{restarting === w.name ? <CircularProgress size={16} /> : <Play size={16} />}
													</IconButton>
												</span>
											</Tooltip>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			<Divider />
			<Typography variant="caption" color="text.secondary">
				Estado actualizado automáticamente cada 15 segundos. Los workers son gestionados por PM2 — el manager puede escalarlos
				automáticamente según el volumen de normas pendientes.
			</Typography>

			<SeedDialog open={seedOpen} onClose={() => setSeedOpen(false)} onConfirm={handleSeed} />
		</Stack>
	);
};

export default WorkerStatusTab;
