import React, { useEffect, useState, useCallback } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Stack,
	Typography,
	Switch,
	TextField,
	Button,
	Chip,
	Alert,
	IconButton,
	Tooltip,
	FormControlLabel,
	Skeleton,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Tabs,
	Tab,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Refresh, TickCircle, Warning2, Lock1, Setting2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { PrivacyCheckerService, PrivacyCheckerConfig, PrivacyCheckerLive, PrivacyCheckerFolder } from "api/privacyChecker";

const FUEROS: Array<{ key: "CIV" | "CSS" | "CNT" | "COM"; label: string }> = [
	{ key: "CIV", label: "Civil" },
	{ key: "CSS", label: "Seguridad Social" },
	{ key: "CNT", label: "Trabajo" },
	{ key: "COM", label: "Comercial" },
];

const PrivacyCheckerWorker = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [config, setConfig] = useState<PrivacyCheckerConfig | null>(null);
	const [live, setLive] = useState<PrivacyCheckerLive | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Edit state
	const [editEnabled, setEditEnabled] = useState(true);
	const [editCron, setEditCron] = useState("0 3,15 * * *");
	const [editThreshold, setEditThreshold] = useState(3);
	const [editFueros, setEditFueros] = useState<Record<string, boolean>>({
		CIV: true,
		CSS: true,
		CNT: true,
		COM: true,
	});

	const [foldersTab, setFoldersTab] = useState<"tracked" | "private" | "pending">("private");
	const [folders, setFolders] = useState<PrivacyCheckerFolder[]>([]);
	const [foldersLoading, setFoldersLoading] = useState(false);

	const fetchConfig = useCallback(async () => {
		try {
			setLoading(true);
			const res = await PrivacyCheckerService.getConfig();
			if (res.success) {
				setConfig(res.data.config);
				setLive(res.data.live);
				setEditEnabled(res.data.config.enabled);
				setEditCron(res.data.config.cron_expression);
				setEditThreshold(res.data.config.consecutive_strikes_threshold);
				setEditFueros({
					CIV: res.data.config.per_fuero?.CIV?.enabled ?? true,
					CSS: res.data.config.per_fuero?.CSS?.enabled ?? true,
					CNT: res.data.config.per_fuero?.CNT?.enabled ?? true,
					COM: res.data.config.per_fuero?.COM?.enabled ?? true,
				});
			}
		} catch (err: any) {
			enqueueSnackbar(`Error cargando configuración: ${err?.response?.data?.error || err.message}`, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	const fetchFolders = useCallback(async () => {
		try {
			setFoldersLoading(true);
			const res = await PrivacyCheckerService.listFolders(foldersTab, 100);
			if (res.success) setFolders(res.data);
		} catch (err: any) {
			enqueueSnackbar(`Error listando folders: ${err?.response?.data?.error || err.message}`, { variant: "error" });
		} finally {
			setFoldersLoading(false);
		}
	}, [foldersTab, enqueueSnackbar]);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	useEffect(() => {
		fetchFolders();
	}, [fetchFolders]);

	const handleSave = async () => {
		try {
			setSaving(true);
			const res = await PrivacyCheckerService.updateConfig({
				enabled: editEnabled,
				cron_expression: editCron,
				consecutive_strikes_threshold: editThreshold,
				per_fuero: {
					CIV: { enabled: editFueros.CIV },
					CSS: { enabled: editFueros.CSS },
					CNT: { enabled: editFueros.CNT },
					COM: { enabled: editFueros.COM },
				},
			});
			if (res.success) {
				enqueueSnackbar("Configuración guardada", { variant: "success" });
				await fetchConfig();
			}
		} catch (err: any) {
			enqueueSnackbar(`Error guardando: ${err?.response?.data?.error || err.message}`, { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		if (!window.confirm("¿Resetear la configuración a defaults?")) return;
		try {
			setSaving(true);
			await PrivacyCheckerService.resetConfig();
			enqueueSnackbar("Configuración reseteada a defaults", { variant: "success" });
			await fetchConfig();
		} catch (err: any) {
			enqueueSnackbar(`Error reseteando: ${err?.response?.data?.error || err.message}`, { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	if (loading || !config) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={120} />
				<Skeleton variant="rectangular" height={300} />
			</Stack>
		);
	}

	return (
		<Stack spacing={3}>
			{/* Header con métricas vivas */}
			<Card>
				<CardContent>
					<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
						<Stack direction="row" spacing={1.5} alignItems="center">
							<Lock1 size={24} color={theme.palette.primary.main} variant="Bold" />
							<Box>
								<Typography variant="h5">Privacy Checker</Typography>
								<Typography variant="body2" color="text.secondary">
									Monitorea causas PJN individuales que pasaron a estado reservado
								</Typography>
							</Box>
						</Stack>
						<Tooltip title="Recargar">
							<IconButton
								onClick={() => {
									fetchConfig();
									fetchFolders();
								}}
								size="small"
							>
								<Refresh size={18} />
							</IconButton>
						</Tooltip>
					</Stack>

					<Grid container spacing={2}>
						<Grid item xs={6} md={3}>
							<Card variant="outlined" sx={{ p: 2, bgcolor: theme.palette.error.lighter || "#fee2e2" }}>
								<Stack direction="row" alignItems="center" spacing={1}>
									<Lock1 size={20} color={theme.palette.error.main} variant="Bold" />
									<Box>
										<Typography variant="h4">{live?.currentlyPrivate ?? 0}</Typography>
										<Typography variant="caption" color="text.secondary">
											Reservadas
										</Typography>
									</Box>
								</Stack>
							</Card>
						</Grid>
						<Grid item xs={6} md={3}>
							<Card variant="outlined" sx={{ p: 2, bgcolor: theme.palette.warning.lighter || "#fef3c7" }}>
								<Stack direction="row" alignItems="center" spacing={1}>
									<Warning2 size={20} color={theme.palette.warning.main} variant="Bold" />
									<Box>
										<Typography variant="h4">{live?.pendingPromotion ?? 0}</Typography>
										<Typography variant="caption" color="text.secondary">
											Pendientes próximo ciclo
										</Typography>
									</Box>
								</Stack>
							</Card>
						</Grid>
						<Grid item xs={6} md={3}>
							<Card variant="outlined" sx={{ p: 2 }}>
								<Stack>
									<Typography variant="h4">{live?.currentlyTracked ?? 0}</Typography>
									<Typography variant="caption" color="text.secondary">
										En tracking (counter &gt; 0)
									</Typography>
								</Stack>
							</Card>
						</Grid>
						<Grid item xs={6} md={3}>
							<Card variant="outlined" sx={{ p: 2 }}>
								<Stack>
									<Typography variant="body2" color="text.secondary">
										Última corrida
									</Typography>
									<Typography variant="body1">{config.last_run ? new Date(config.last_run).toLocaleString("es-AR") : "Nunca"}</Typography>
									<Typography variant="caption" color="text.secondary">
										Total: {config.stats?.total_runs ?? 0} ciclos
									</Typography>
								</Stack>
							</Card>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Configuración */}
			<Card>
				<CardContent>
					<Stack direction="row" alignItems="center" spacing={1} mb={2}>
						<Setting2 size={20} />
						<Typography variant="h6">Configuración del worker</Typography>
					</Stack>

					<Alert severity="info" sx={{ mb: 2 }}>
						Cambios en este formulario impactan al iniciar el siguiente ciclo del worker (sin requerir restart). Solo se procesan folders{" "}
						<strong>PJN individuales</strong> (source distinto de <code>pjn-login</code>).
					</Alert>

					<Grid container spacing={2}>
						<Grid item xs={12} md={6}>
							<FormControlLabel
								control={<Switch checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />}
								label={editEnabled ? "Worker habilitado" : "Worker deshabilitado"}
							/>
						</Grid>

						<Grid item xs={12} md={6}>
							<TextField
								label="Cron expression"
								fullWidth
								size="small"
								value={editCron}
								onChange={(e) => setEditCron(e.target.value)}
								helperText="Default: 0 3,15 * * * (3 AM y 3 PM, hora del server)"
							/>
						</Grid>

						<Grid item xs={12} md={6}>
							<TextField
								label="Strikes consecutivos para marcar privada"
								fullWidth
								size="small"
								type="number"
								inputProps={{ min: 1, max: 10 }}
								value={editThreshold}
								onChange={(e) => setEditThreshold(Number(e.target.value))}
								helperText="Número de fallos consecutivos del scrape público antes de promoter a privada"
							/>
						</Grid>

						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" gutterBottom>
								Habilitación por fuero
							</Typography>
							<Stack direction="row" spacing={1} flexWrap="wrap">
								{FUEROS.map((f) => (
									<FormControlLabel
										key={f.key}
										control={
											<Switch
												checked={editFueros[f.key]}
												onChange={(e) => setEditFueros((prev) => ({ ...prev, [f.key]: e.target.checked }))}
												size="small"
											/>
										}
										label={f.label}
									/>
								))}
							</Stack>
						</Grid>

						<Grid item xs={12}>
							<Stack direction="row" spacing={1.5}>
								<Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<TickCircle size={16} />}>
									Guardar
								</Button>
								<Button variant="outlined" color="warning" onClick={handleReset} disabled={saving}>
									Defaults
								</Button>
							</Stack>
						</Grid>
					</Grid>

					{/* Stats acumulados */}
					<Divider sx={{ my: 3 }} />
					<Typography variant="subtitle2" gutterBottom>
						Estadísticas acumuladas
					</Typography>
					<Stack direction="row" spacing={1} flexWrap="wrap">
						<Chip label={`${config.stats?.causas_marked_private ?? 0} marcadas privadas`} color="error" variant="outlined" size="small" />
						<Chip
							label={`${config.stats?.causas_reset_public ?? 0} reseteadas a públicas`}
							color="success"
							variant="outlined"
							size="small"
						/>
						<Chip label={`${config.stats?.folders_synced ?? 0} folders sincronizados`} variant="outlined" size="small" />
					</Stack>
				</CardContent>
			</Card>

			{/* Folders bajo tracking */}
			<Card>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Folders bajo tracking
					</Typography>
					<Tabs value={foldersTab} onChange={(_, v) => setFoldersTab(v)} sx={{ mb: 2 }}>
						<Tab label={`Reservadas (${live?.currentlyPrivate ?? 0})`} value="private" />
						<Tab label={`Pendientes (${live?.pendingPromotion ?? 0})`} value="pending" />
						<Tab label={`Counter > 0 (${live?.currentlyTracked ?? 0})`} value="tracked" />
					</Tabs>

					{foldersLoading ? (
						<Skeleton variant="rectangular" height={200} />
					) : folders.length === 0 ? (
						<Alert severity="success" icon={<TickCircle size={18} />}>
							Sin folders en este estado.
						</Alert>
					) : (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Carátula</TableCell>
										<TableCell>Expediente</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell>Source</TableCell>
										<TableCell align="right">Counter</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Detectada</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{folders.map((f) => (
										<TableRow key={f._id}>
											<TableCell sx={{ maxWidth: 280 }}>
												<Tooltip title={f.folderName}>
													<Typography variant="body2" noWrap>
														{f.folderName}
													</Typography>
												</Tooltip>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{f.judFolder?.numberJudFolder || "—"}</Typography>
											</TableCell>
											<TableCell>
												<Chip label={f.causaType?.replace("Causas", "")} size="small" variant="outlined" />
											</TableCell>
											<TableCell>
												<Typography variant="caption" color="text.secondary">
													{f.source || "manual"}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Chip
													label={f.accessFailureCount}
													size="small"
													color={f.accessFailureCount >= (config.consecutive_strikes_threshold ?? 3) ? "error" : "warning"}
												/>
											</TableCell>
											<TableCell>
												{f.causaIsPrivate ? (
													<Chip icon={<Lock1 size={12} />} label="Reservada" size="small" color="error" variant="outlined" />
												) : (
													<Chip label="Pública" size="small" color="success" variant="outlined" />
												)}
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{f.causaPrivateDetectedAt ? new Date(f.causaPrivateDetectedAt).toLocaleDateString("es-AR") : "—"}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</CardContent>
			</Card>
		</Stack>
	);
};

export default PrivacyCheckerWorker;
