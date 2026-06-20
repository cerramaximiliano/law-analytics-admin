import { useState, useEffect, useCallback } from "react";
import {
	Box,
	Grid,
	Typography,
	Button,
	Stack,
	Chip,
	Alert,
	Divider,
	TextField,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	IconButton,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	FormControlLabel,
	Switch,
} from "@mui/material";
import { Refresh, TickCircle, Eye } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import MEVWorkersService, {
	MEVLoginFailure,
	MEVCredentialStatus,
	MEVPasswordHistoryEntry,
} from "api/workersMEV";

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("es-AR") : "—");

type ChipColor = "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error";

const recoveryStatusColor: Record<string, ChipColor> = {
	idle: "default",
	requesting: "info",
	requested: "warning",
	completed: "success",
	failed: "error",
};

const eventLabel: Record<string, { label: string; color: ChipColor }> = {
	rotation_success: { label: "Rotación OK", color: "success" },
	rotation_failure: { label: "Rotación falló", color: "error" },
	recovery_requested: { label: "Recuperación solicitada", color: "warning" },
	recovery_url_loaded: { label: "Path cargado", color: "info" },
	recovery_completed: { label: "Recuperación completada", color: "success" },
	manual_update: { label: "Cambio manual", color: "info" },
};

interface ShotDialog {
	title: string;
	base64: string;
	mime: string;
}

const MEVCredentials = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [failures, setFailures] = useState<MEVLoginFailure[]>([]);
	const [cred, setCred] = useState<MEVCredentialStatus | null>(null);
	const [history, setHistory] = useState<MEVPasswordHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [onlyActive, setOnlyActive] = useState(true);
	const [shot, setShot] = useState<ShotDialog | null>(null);
	const [urlInput, setUrlInput] = useState("");
	const [savingUrl, setSavingUrl] = useState(false);

	const fetchAll = useCallback(async () => {
		try {
			setLoading(true);
			const [f, c, h] = await Promise.allSettled([
				MEVWorkersService.getLoginFailures(onlyActive),
				MEVWorkersService.getCredentialStatus(),
				MEVWorkersService.getPasswordHistory(100),
			]);
			if (f.status === "fulfilled" && f.value.success) setFailures(f.value.data);
			if (c.status === "fulfilled" && c.value.success) setCred(c.value.data);
			if (h.status === "fulfilled" && h.value.success) setHistory(h.value.data);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar credenciales MEV", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [onlyActive, enqueueSnackbar]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	const handleAcknowledge = async (id: string) => {
		try {
			await MEVWorkersService.acknowledgeLoginFailure(id);
			enqueueSnackbar("Fallo marcado como resuelto", { variant: "success" });
			fetchAll();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al reconocer el fallo", { variant: "error" });
		}
	};

	const handleSaveUrl = async () => {
		if (!urlInput.trim()) return;
		try {
			setSavingUrl(true);
			await MEVWorkersService.setRecoveryUrl(urlInput.trim());
			enqueueSnackbar("Path de recuperación guardado", { variant: "success" });
			setUrlInput("");
			fetchAll();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar el path", { variant: "error" });
		} finally {
			setSavingUrl(false);
		}
	};

	const pr = cred?.passwordRecovery;
	const activeCount = failures.filter((x) => !x.resolved).length;

	return (
		<MainCard
			title="MEV — Credenciales y Recuperación"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<FormControlLabel
						control={<Switch checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} size="small" />}
						label="Solo fallos activos"
					/>
					<Button startIcon={<Refresh size={16} />} onClick={fetchAll} variant="outlined" size="small">
						Refrescar
					</Button>
				</Stack>
			}
		>
			<Grid container spacing={3}>
				{/* === Estado de recuperación === */}
				<Grid item xs={12}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
							<Typography variant="h5">Recuperación de clave</Typography>
							{pr && (
								<Chip
									size="small"
									label={pr.status}
									color={recoveryStatusColor[pr.status] || "default"}
								/>
							)}
						</Stack>

						{loading && !cred ? (
							<Skeleton variant="rectangular" height={80} />
						) : (
							<Grid container spacing={2}>
								<Grid item xs={12} md={6}>
									<Typography variant="body2"><strong>Usuario:</strong> {cred?.username || "—"}</Typography>
									<Typography variant="body2"><strong>Último cambio de clave:</strong> {fmt(cred?.lastPasswordChange)}</Typography>
									<Typography variant="body2"><strong>Solicitado:</strong> {fmt(pr?.requestedAt)} {pr?.requestedBy ? `(${pr.requestedBy})` : ""}</Typography>
									<Typography variant="body2"><strong>Gatillo:</strong> {pr?.triggerText || "—"} {pr?.triggerExpediente ? `· exp ${pr.triggerExpediente}` : ""}</Typography>
									<Typography variant="body2"><strong>Intentos:</strong> {pr?.attempts ?? 0}</Typography>
									{pr?.lastError && (
										<Typography variant="body2" color="error"><strong>Último error:</strong> {pr.lastError}</Typography>
									)}
									{pr?.screenshotBase64 && (
										<Button
											size="small"
											startIcon={<Eye size={16} />}
											sx={{ mt: 1 }}
											onClick={() => setShot({ title: "Confirmación del portal (recuperación)", base64: pr.screenshotBase64 as string, mime: "image/png" })}
										>
											Ver screenshot
										</Button>
									)}
								</Grid>

								<Grid item xs={12} md={6}>
									{pr?.recoveryUrl ? (
										<Alert severity="success" variant="outlined">
											<Typography variant="body2"><strong>Path cargado:</strong></Typography>
											<Typography variant="caption" sx={{ wordBreak: "break-all" }}>{pr.recoveryUrl}</Typography>
											<Typography variant="caption" display="block" color="textSecondary">
												{fmt(pr.recoveryUrlLoadedAt)} {pr.recoveryUrlLoadedBy ? `· ${pr.recoveryUrlLoadedBy}` : ""}
											</Typography>
										</Alert>
									) : pr?.status === "requested" ? (
										<Stack spacing={1}>
											<Typography variant="body2" color="textSecondary">
												Pegá el path/URL de recuperación que llegó al email de MEV:
											</Typography>
											<TextField
												size="small"
												fullWidth
												placeholder="https://mev.scba.gov.ar/..."
												value={urlInput}
												onChange={(e) => setUrlInput(e.target.value)}
											/>
											<Button
												variant="contained"
												size="small"
												disabled={savingUrl || !urlInput.trim()}
												onClick={handleSaveUrl}
												sx={{ alignSelf: "flex-start" }}
											>
												Guardar path
											</Button>
										</Stack>
									) : (
										<Alert severity="info" variant="outlined">
											El input para cargar el path se habilita cuando la recuperación está en estado <strong>requested</strong>.
										</Alert>
									)}
								</Grid>
							</Grid>
						)}
					</Paper>
				</Grid>

				{/* === Historial de contraseñas === */}
				<Grid item xs={12}>
					<Typography variant="h5" sx={{ mb: 1 }}>Historial de contraseñas (tracking)</Typography>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fecha</TableCell>
									<TableCell>Evento</TableCell>
									<TableCell align="center">OK</TableCell>
									<TableCell>Origen</TableCell>
									<TableCell>Detalle</TableCell>
									<TableCell>Clave (hint)</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading && history.length === 0 ? (
									<TableRow><TableCell colSpan={6}><Skeleton variant="rectangular" height={28} /></TableCell></TableRow>
								) : history.length === 0 ? (
									<TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>Sin eventos registrados.</Typography></TableCell></TableRow>
								) : (
									history.map((h) => {
										const meta = eventLabel[h.event] || { label: h.event, color: "default" as ChipColor };
										return (
											<TableRow key={h._id} hover>
												<TableCell>{fmt(h.createdAt)}</TableCell>
												<TableCell><Chip size="small" label={meta.label} color={meta.color} variant="outlined" /></TableCell>
												<TableCell align="center">{h.success ? "✓" : "✗"}</TableCell>
												<TableCell>{h.source || "—"}</TableCell>
												<TableCell><Typography variant="caption">{h.detail || "—"}</Typography></TableCell>
												<TableCell>{h.newPasswordHint ? `${h.newPasswordHint} (${h.newPasswordLen})` : "—"}</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Grid>

				{/* === Fallos de login === */}
				<Grid item xs={12}>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
						<Typography variant="h5">Fallos de login</Typography>
						<Chip size="small" label={`${activeCount} activo(s)`} color={activeCount > 0 ? "error" : "success"} />
					</Stack>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Worker</TableCell>
									<TableCell>Usuario</TableCell>
									<TableCell>Detectado</TableCell>
									<TableCell align="center">Veces</TableCell>
									<TableCell>Último fallo</TableCell>
									<TableCell>Expediente</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading && failures.length === 0 ? (
									<TableRow><TableCell colSpan={8}><Skeleton variant="rectangular" height={28} /></TableCell></TableRow>
								) : failures.length === 0 ? (
									<TableRow><TableCell colSpan={8} align="center"><Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>Sin fallos de login.</Typography></TableCell></TableRow>
								) : (
									failures.map((f) => (
										<TableRow key={f._id} hover>
											<TableCell>{f.worker_id}</TableCell>
											<TableCell>{f.loginUsername || "—"}</TableCell>
											<TableCell>
												{f.detectedText ? (
													<Chip label={f.detectedText} color="error" size="small" variant="outlined" />
												) : (
													<Typography variant="caption" color="textSecondary">(página cambiada)</Typography>
												)}
											</TableCell>
											<TableCell align="center">{f.count}</TableCell>
											<TableCell>{fmt(f.lastSeen)}</TableCell>
											<TableCell>{f.lastExpediente || "—"}</TableCell>
											<TableCell align="center">
												<Chip label={f.resolved ? "Resuelto" : "Activo"} color={f.resolved ? "success" : "error"} size="small" />
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													<Tooltip title="Ver screenshot">
														<span>
															<IconButton
																size="small"
																color="primary"
																disabled={!f.screenshotBase64}
																onClick={() => setShot({ title: `Fallo de login — ${f.worker_id}`, base64: f.screenshotBase64 as string, mime: f.screenshotMime || "image/png" })}
															>
																<Eye size={18} />
															</IconButton>
														</span>
													</Tooltip>
													{!f.resolved && (
														<Tooltip title="Marcar como resuelto">
															<IconButton size="small" color="success" onClick={() => handleAcknowledge(f._id)}>
																<TickCircle size={18} />
															</IconButton>
														</Tooltip>
													)}
												</Stack>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Grid>
			</Grid>

			{/* === Dialog screenshot === */}
			<Dialog open={!!shot} onClose={() => setShot(null)} maxWidth="md" fullWidth>
				<DialogTitle>{shot?.title}</DialogTitle>
				<Divider />
				<DialogContent>
					{shot && (
						<Box
							component="img"
							src={`data:${shot.mime};base64,${shot.base64}`}
							alt="screenshot"
							sx={{ maxWidth: "100%", border: "1px solid", borderColor: "divider", borderRadius: 1 }}
						/>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShot(null)}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default MEVCredentials;
