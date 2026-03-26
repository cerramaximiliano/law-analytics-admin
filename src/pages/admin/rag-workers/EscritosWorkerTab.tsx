import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	TextField,
	Switch,
	FormControlLabel,
	FormGroup,
	Checkbox,
	Button,
	Chip,
	Alert,
	Skeleton,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TableContainer,
	Paper,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { EscritosWorkerConfig, EscritosWorkerStats, GlobalDocumentEntry } from "api/ragWorkers";

// ── Constantes ───────────────────────────────────────────────────────────────

const ALL_FUEROS = ["CIV", "CNT", "CSS", "COM"];
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	CNT: "Trabajo (CNT)",
	CSS: "Seguridad Social",
	COM: "Comercial",
};

const ALL_DOC_TYPES = [
	"demanda",
	"contestacion_demanda",
	"reconvencion",
	"expresion_agravios",
	"contestacion_agravios",
	"recurso_extraordinario",
	"sentencia",
];

const STATUS_COLORS: Record<string, "default" | "info" | "success" | "warning" | "error"> = {
	pending: "info",
	downloading: "info",
	extracting: "info",
	extracted: "warning",
	chunking: "info",
	chunked: "info",
	embedding: "info",
	embedded: "success",
	error: "error",
};

const DOC_STATUS_OPTIONS = ["", "pending", "extracting", "extracted", "embedding", "embedded", "error"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
	const theme = useTheme();
	return (
		<Box
			sx={{
				p: 2,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				bgcolor: alpha(theme.palette.primary.main, 0.03),
				minWidth: 120,
			}}
		>
			<Typography variant="h4" fontWeight={700} color={color || "text.primary"}>
				{typeof value === "number" ? value.toLocaleString("es-AR") : value}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
		</Box>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

const EscritosWorkerTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Config state
	const [config, setConfig] = useState<EscritosWorkerConfig | null>(null);
	const [configLoading, setConfigLoading] = useState(true);
	const [configSaving, setConfigSaving] = useState(false);
	const [localConfig, setLocalConfig] = useState<Partial<EscritosWorkerConfig>>({});
	const [isDirty, setIsDirty] = useState(false);

	// Stats state
	const [stats, setStats] = useState<EscritosWorkerStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	// Documents state
	const [docs, setDocs] = useState<GlobalDocumentEntry[]>([]);
	const [docsTotal, setDocsTotal] = useState(0);
	const [docsLoading, setDocsLoading] = useState(true);
	const [docsStatus, setDocsStatus] = useState("");
	const [docsFuero, setDocsFuero] = useState("");
	const [docsPage, setDocsPage] = useState(1);
	const docsLimit = 20;

	// ── Loaders ──────────────────────────────────────────────────────────────

	const loadConfig = useCallback(async () => {
		setConfigLoading(true);
		try {
			const data = await RagWorkersService.getEscritosWorkerConfig();
			setConfig(data);
			setLocalConfig(data);
			setIsDirty(false);
		} catch {
			enqueueSnackbar("Error al cargar la configuración", { variant: "error" });
		} finally {
			setConfigLoading(false);
		}
	}, [enqueueSnackbar]);

	const loadStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const data = await RagWorkersService.getEscritosWorkerStats();
			setStats(data);
		} catch {
			enqueueSnackbar("Error al cargar estadísticas", { variant: "error" });
		} finally {
			setStatsLoading(false);
		}
	}, [enqueueSnackbar]);

	const loadDocs = useCallback(async () => {
		setDocsLoading(true);
		try {
			const data = await RagWorkersService.getEscritosWorkerDocuments({
				status: docsStatus || undefined,
				fuero: docsFuero || undefined,
				page: docsPage,
				limit: docsLimit,
			});
			setDocs(data.docs);
			setDocsTotal(data.pagination.total);
		} catch {
			enqueueSnackbar("Error al cargar documentos", { variant: "error" });
		} finally {
			setDocsLoading(false);
		}
	}, [docsStatus, docsFuero, docsPage, enqueueSnackbar]);

	useEffect(() => { loadConfig(); loadStats(); }, [loadConfig, loadStats]);
	useEffect(() => { loadDocs(); }, [loadDocs]);

	// ── Config handlers ──────────────────────────────────────────────────────

	function patch(key: keyof EscritosWorkerConfig, value: unknown) {
		setLocalConfig((prev) => ({ ...prev, [key]: value }));
		setIsDirty(true);
	}

	function toggleFuero(fuero: string) {
		const current = localConfig.activeFueros || config?.activeFueros || [];
		const next = current.includes(fuero) ? current.filter((f) => f !== fuero) : [...current, fuero];
		patch("activeFueros", next);
	}

	function toggleDocType(dt: string) {
		const current = localConfig.relevantDocTypes || config?.relevantDocTypes || [];
		const next = current.includes(dt) ? current.filter((d) => d !== dt) : [...current, dt];
		patch("relevantDocTypes", next);
	}

	async function saveConfig() {
		setConfigSaving(true);
		try {
			const saved = await RagWorkersService.updateEscritosWorkerConfig(localConfig);
			setConfig(saved);
			setLocalConfig(saved);
			setIsDirty(false);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
		} catch {
			enqueueSnackbar("Error al guardar la configuración", { variant: "error" });
		} finally {
			setConfigSaving(false);
		}
	}

	// ── Render ───────────────────────────────────────────────────────────────

	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Stack spacing={4}>
				{/* ── Header ── */}
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Box>
						<Typography variant="h5" fontWeight={600}>
							Escritos Worker
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Pipeline de extracción global de PDFs judiciales (escritos)
						</Typography>
					</Box>
					<Button
						startIcon={<Refresh size={18} />}
						onClick={() => { loadConfig(); loadStats(); loadDocs(); }}
						variant="outlined"
						size="small"
					>
						Actualizar
					</Button>
				</Stack>

				{/* ── Stats ── */}
				<Box>
					<Typography variant="subtitle1" fontWeight={600} mb={2}>
						Estadísticas
					</Typography>
					{statsLoading ? (
						<Stack direction="row" spacing={2} flexWrap="wrap">
							{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" width={130} height={70} />)}
						</Stack>
					) : stats ? (
						<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
							<StatCard label="Total procesados" value={stats.total} />
							<StatCard label="Embeddings OK" value={stats.embedded} color={theme.palette.success.main} />
							<StatCard label="Pendientes" value={stats.pending} color={theme.palette.info.main} />
							<StatCard label="Con error" value={stats.error} color={theme.palette.error.main} />
							<StatCard label="Errores 24h" value={stats.recentErrors24h} color={stats.recentErrors24h > 0 ? theme.palette.error.main : undefined} />
							<StatCard label="Requieren OCR" value={stats.deferred} color={theme.palette.warning.main} />
						</Stack>
					) : null}
				</Box>

				<Divider />

				{/* ── Config ── */}
				<Box>
					<Typography variant="subtitle1" fontWeight={600} mb={2}>
						Configuración
					</Typography>

					{configLoading ? (
						<Stack spacing={2}>
							{[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
						</Stack>
					) : (
						<Stack spacing={3}>
							{/* Enabled toggle */}
							<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: (localConfig.enabled ?? config?.enabled) ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05) }}>
								<FormControlLabel
									control={
										<Switch
											checked={localConfig.enabled ?? config?.enabled ?? false}
											onChange={(e) => patch("enabled", e.target.checked)}
										/>
									}
									label={
										<Box>
											<Typography variant="body1" fontWeight={600}>
												{(localConfig.enabled ?? config?.enabled) ? "Worker habilitado" : "Worker deshabilitado"}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Cuando está deshabilitado, el cron no procesa ningún escrito
											</Typography>
										</Box>
									}
								/>
							</Box>

							{/* Cron + Concurrency + Max PDF */}
							<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
								<TextField
									label="Cron de escaneo"
									value={localConfig.scanCron ?? config?.scanCron ?? ""}
									onChange={(e) => patch("scanCron", e.target.value)}
									helperText="Expresión cron (requiere reinicio del worker)"
									size="small"
									sx={{ flex: 1 }}
								/>
								<TextField
									label="Concurrencia"
									type="number"
									value={localConfig.concurrency ?? config?.concurrency ?? 3}
									onChange={(e) => patch("concurrency", parseInt(e.target.value, 10))}
									helperText="Workers simultáneos (1-20)"
									size="small"
									inputProps={{ min: 1, max: 20 }}
									sx={{ flex: 1 }}
								/>
								<TextField
									label="Tamaño máx. PDF (MB)"
									type="number"
									value={localConfig.maxPdfSizeMb ?? config?.maxPdfSizeMb ?? 25}
									onChange={(e) => patch("maxPdfSizeMb", parseInt(e.target.value, 10))}
									helperText="PDFs más grandes son ignorados"
									size="small"
									inputProps={{ min: 1, max: 100 }}
									sx={{ flex: 1 }}
								/>
							</Stack>

							{/* Pause Until */}
							<TextField
								label="Pausar hasta"
								type="datetime-local"
								value={localConfig.pauseUntil ? new Date(localConfig.pauseUntil).toISOString().slice(0, 16) : ""}
								onChange={(e) => patch("pauseUntil", e.target.value ? new Date(e.target.value).toISOString() : null)}
								helperText="Dejar vacío para no pausar"
								size="small"
								InputLabelProps={{ shrink: true }}
								sx={{ maxWidth: 300 }}
							/>

							{/* Fueros */}
							<Box>
								<Typography variant="body2" fontWeight={600} mb={1}>
									Fueros activos
								</Typography>
								<FormGroup row>
									{ALL_FUEROS.map((f) => (
										<FormControlLabel
											key={f}
											control={
												<Checkbox
													checked={(localConfig.activeFueros ?? config?.activeFueros ?? []).includes(f)}
													onChange={() => toggleFuero(f)}
													size="small"
												/>
											}
											label={FUERO_LABELS[f] || f}
										/>
									))}
								</FormGroup>
							</Box>

							{/* Doc types */}
							<Box>
								<Typography variant="body2" fontWeight={600} mb={1}>
									Tipos de documento
								</Typography>
								<Stack direction="row" flexWrap="wrap" gap={1}>
									{ALL_DOC_TYPES.map((dt) => {
										const active = (localConfig.relevantDocTypes ?? config?.relevantDocTypes ?? []).includes(dt);
										return (
											<Chip
												key={dt}
												label={dt}
												size="small"
												variant={active ? "filled" : "outlined"}
												color={active ? "primary" : "default"}
												onClick={() => toggleDocType(dt)}
												sx={{ cursor: "pointer" }}
											/>
										);
									})}
								</Stack>
							</Box>

							{/* Save */}
							<Stack direction="row" spacing={2} alignItems="center">
								<Button
									variant="contained"
									onClick={saveConfig}
									disabled={!isDirty || configSaving}
									startIcon={<TickCircle size={18} />}
								>
									{configSaving ? "Guardando..." : "Guardar cambios"}
								</Button>
								{isDirty && (
									<Button
										variant="outlined"
										color="inherit"
										onClick={() => { setLocalConfig(config || {}); setIsDirty(false); }}
										startIcon={<CloseCircle size={18} />}
									>
										Descartar
									</Button>
								)}
								{isDirty && (
									<Alert severity="warning" sx={{ py: 0.5, px: 1 }}>
										Hay cambios sin guardar
									</Alert>
								)}
							</Stack>
						</Stack>
					)}
				</Box>

				<Divider />

				{/* ── Documents ── */}
				<Box>
					<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
						<Typography variant="subtitle1" fontWeight={600}>
							Documentos procesados
						</Typography>
						<Stack direction="row" spacing={1}>
							<FormControl size="small" sx={{ minWidth: 130 }}>
								<InputLabel>Estado</InputLabel>
								<Select
									value={docsStatus}
									label="Estado"
									onChange={(e) => { setDocsStatus(e.target.value); setDocsPage(1); }}
								>
									{DOC_STATUS_OPTIONS.map((s) => (
										<MenuItem key={s} value={s}>{s || "Todos"}</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 120 }}>
								<InputLabel>Fuero</InputLabel>
								<Select
									value={docsFuero}
									label="Fuero"
									onChange={(e) => { setDocsFuero(e.target.value); setDocsPage(1); }}
								>
									<MenuItem value="">Todos</MenuItem>
									{ALL_FUEROS.map((f) => (
										<MenuItem key={f} value={f}>{FUERO_LABELS[f] || f}</MenuItem>
									))}
								</Select>
							</FormControl>
						</Stack>
					</Stack>

					{docsLoading ? (
						<Skeleton variant="rounded" height={200} />
					) : (
						<>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Tipo doc.</TableCell>
											<TableCell>Fuero</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell align="right">Chars</TableCell>
											<TableCell align="right">Chunks</TableCell>
											<TableCell>Última actu.</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{docs.length === 0 ? (
											<TableRow>
												<TableCell colSpan={6} align="center">
													<Typography variant="body2" color="text.secondary" py={2}>
														No hay documentos
													</Typography>
												</TableCell>
											</TableRow>
										) : (
											docs.map((doc) => (
												<TableRow key={doc._id} hover>
													<TableCell>
														<Typography variant="caption">{doc.docType || doc.movimientoTipo || "-"}</Typography>
													</TableCell>
													<TableCell>
														<Chip label={doc.fuero || "-"} size="small" variant="outlined" />
													</TableCell>
													<TableCell>
														<Chip
															label={doc.status}
															size="small"
															color={STATUS_COLORS[doc.status] || "default"}
														/>
													</TableCell>
													<TableCell align="right">
														<Typography variant="caption">{doc.charCount?.toLocaleString("es-AR") || "-"}</Typography>
													</TableCell>
													<TableCell align="right">
														<Typography variant="caption">{doc.chunksCount || "-"}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="caption">
															{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "-"}
														</Typography>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</TableContainer>

							{/* Pagination */}
							<Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
								<Typography variant="caption" color="text.secondary">
									{docsTotal.toLocaleString("es-AR")} documentos
								</Typography>
								<Stack direction="row" spacing={1}>
									<Button size="small" disabled={docsPage <= 1} onClick={() => setDocsPage((p) => p - 1)}>
										Anterior
									</Button>
									<Typography variant="caption" alignSelf="center">
										Pág. {docsPage}
									</Typography>
									<Button size="small" disabled={docsPage * docsLimit >= docsTotal} onClick={() => setDocsPage((p) => p + 1)}>
										Siguiente
									</Button>
								</Stack>
							</Stack>
						</>
					)}
				</Box>
			</Stack>
		</Box>
	);
};

export default EscritosWorkerTab;
