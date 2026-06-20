import { useState, useEffect, useCallback } from "react";
import {
	Box,
	Grid,
	Typography,
	Button,
	Stack,
	Chip,
	Alert,
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
import MEVWorkersService, { MEVLoginFailure } from "api/workersMEV";

const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("es-AR") : "—");

const MEVLoginFailures = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [failures, setFailures] = useState<MEVLoginFailure[]>([]);
	const [loading, setLoading] = useState(true);
	const [onlyActive, setOnlyActive] = useState(true);
	const [selected, setSelected] = useState<MEVLoginFailure | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const res = await MEVWorkersService.getLoginFailures(onlyActive);
			if (res.success && Array.isArray(res.data)) {
				setFailures(res.data);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar fallos de login", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [onlyActive, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleAcknowledge = async (id: string) => {
		try {
			await MEVWorkersService.acknowledgeLoginFailure(id);
			enqueueSnackbar("Fallo marcado como resuelto", { variant: "success" });
			fetchData();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al reconocer el fallo", { variant: "error" });
		}
	};

	const activeCount = failures.filter((f) => !f.resolved).length;

	return (
		<MainCard
			title="MEV — Fallos de Login del Worker"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<FormControlLabel
						control={<Switch checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} size="small" />}
						label="Solo activos"
					/>
					<Button startIcon={<Refresh size={16} />} onClick={fetchData} variant="outlined" size="small">
						Refrescar
					</Button>
				</Stack>
			}
		>
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<Alert severity={activeCount > 0 ? "error" : "success"}>
						{activeCount > 0
							? `${activeCount} fallo(s) de login activo(s). El worker no puede iniciar sesión en el portal MEV — revisá las credenciales.`
							: "No hay fallos de login activos."}
					</Alert>
				</Grid>

				<Grid item xs={12}>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Worker</TableCell>
									<TableCell>Usuario</TableCell>
									<TableCell>Detectado</TableCell>
									<TableCell align="center">Veces</TableCell>
									<TableCell>Primer fallo</TableCell>
									<TableCell>Último fallo</TableCell>
									<TableCell>Expediente</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									Array.from({ length: 3 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={9}>
												<Skeleton variant="rectangular" height={32} />
											</TableCell>
										</TableRow>
									))
								) : failures.length === 0 ? (
									<TableRow>
										<TableCell colSpan={9} align="center">
											<Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
												Sin fallos de login registrados.
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									failures.map((f) => (
										<TableRow key={f._id} hover>
											<TableCell>{f.worker_id}</TableCell>
											<TableCell>{f.loginUsername || "—"}</TableCell>
											<TableCell>
												{f.detectedText ? (
													<Chip label={f.detectedText} color="error" size="small" variant="outlined" />
												) : (
													<Typography variant="caption" color="textSecondary">
														(página cambiada)
													</Typography>
												)}
											</TableCell>
											<TableCell align="center">{f.count}</TableCell>
											<TableCell>{fmtDate(f.firstSeen)}</TableCell>
											<TableCell>{fmtDate(f.lastSeen)}</TableCell>
											<TableCell>{f.lastExpediente || "—"}</TableCell>
											<TableCell align="center">
												<Chip
													label={f.resolved ? "Resuelto" : "Activo"}
													color={f.resolved ? "success" : "error"}
													size="small"
												/>
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													<Tooltip title="Ver screenshot">
														<span>
															<IconButton
																size="small"
																color="primary"
																disabled={!f.screenshotBase64}
																onClick={() => setSelected(f)}
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

			<Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
				<DialogTitle>
					Screenshot del fallo — {selected?.worker_id} ({selected?.loginUsername || "n/a"})
				</DialogTitle>
				<DialogContent dividers>
					{selected && (
						<Stack spacing={1.5}>
							<Stack direction="row" spacing={2} flexWrap="wrap">
								<Typography variant="body2">
									<strong>Detectado:</strong> {selected.detectedText || "(página cambiada)"}
								</Typography>
								<Typography variant="body2">
									<strong>URL:</strong> {selected.detectedUrl || "—"}
								</Typography>
								<Typography variant="body2">
									<strong>Último fallo:</strong> {fmtDate(selected.lastSeen)}
								</Typography>
							</Stack>
							{selected.errorMessage && (
								<Alert severity="warning" variant="outlined">
									{selected.errorMessage}
								</Alert>
							)}
							{selected.screenshotBase64 ? (
								<Box
									component="img"
									src={`data:${selected.screenshotMime || "image/png"};base64,${selected.screenshotBase64}`}
									alt="Screenshot del fallo de login"
									sx={{ maxWidth: "100%", border: "1px solid", borderColor: "divider", borderRadius: 1 }}
								/>
							) : (
								<Alert severity="info">No hay screenshot disponible para este fallo.</Alert>
							)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setSelected(null)}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default MEVLoginFailures;
