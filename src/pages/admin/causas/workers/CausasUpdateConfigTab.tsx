import React, { useState } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Switch,
	TextField,
	Button,
	Stack,
	Chip,
	Divider,
	useTheme,
	alpha,
} from "@mui/material";
import { TickCircle, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { CausasUpdateConfig, CausasUpdateService } from "api/causasUpdate";

interface Props {
	config: CausasUpdateConfig;
	onConfigUpdate: () => void;
}

const CausasUpdateConfigTab: React.FC<Props> = ({ config, onConfigUpdate }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [saving, setSaving] = useState(false);

	// Worker
	const [enabled, setEnabled] = useState(config.worker?.enabled ?? true);
	const [maxCredentialsPerRun, setMaxCredentialsPerRun] = useState(config.worker?.maxCredentialsPerRun ?? 10);
	const [maxCausasPerCredential, setMaxCausasPerCredential] = useState(config.worker?.maxCausasPerCredential ?? 0);
	const [delayBetweenCausas, setDelayBetweenCausas] = useState(config.worker?.delayBetweenCausas ?? 2000);
	const [delayBetweenCredentials, setDelayBetweenCredentials] = useState(config.worker?.delayBetweenCredentials ?? 5000);

	// Thresholds
	const [updateThresholdHours, setUpdateThresholdHours] = useState(config.thresholds?.updateThresholdHours ?? 3);
	const [minTimeBetweenRunsMinutes, setMinTimeBetweenRunsMinutes] = useState(config.thresholds?.minTimeBetweenRunsMinutes ?? 120);
	const [maxRunsPerDay, setMaxRunsPerDay] = useState(config.thresholds?.maxRunsPerDay ?? 8);

	// Concurrency
	const [waitForCausaCreation, setWaitForCausaCreation] = useState(config.concurrency?.waitForCausaCreation ?? true);
	const [maxWaitMinutes, setMaxWaitMinutes] = useState(config.concurrency?.maxWaitMinutes ?? 60);

	// Resume
	const [resumeEnabled, setResumeEnabled] = useState(config.resume?.enabled ?? true);
	const [maxResumeAttempts, setMaxResumeAttempts] = useState(config.resume?.maxResumeAttempts ?? 3);

	const hasChanges =
		enabled !== (config.worker?.enabled ?? true) ||
		maxCredentialsPerRun !== (config.worker?.maxCredentialsPerRun ?? 10) ||
		maxCausasPerCredential !== (config.worker?.maxCausasPerCredential ?? 0) ||
		delayBetweenCausas !== (config.worker?.delayBetweenCausas ?? 2000) ||
		delayBetweenCredentials !== (config.worker?.delayBetweenCredentials ?? 5000) ||
		updateThresholdHours !== (config.thresholds?.updateThresholdHours ?? 3) ||
		minTimeBetweenRunsMinutes !== (config.thresholds?.minTimeBetweenRunsMinutes ?? 120) ||
		maxRunsPerDay !== (config.thresholds?.maxRunsPerDay ?? 8) ||
		waitForCausaCreation !== (config.concurrency?.waitForCausaCreation ?? true) ||
		maxWaitMinutes !== (config.concurrency?.maxWaitMinutes ?? 60) ||
		resumeEnabled !== (config.resume?.enabled ?? true) ||
		maxResumeAttempts !== (config.resume?.maxResumeAttempts ?? 3);

	const handleSave = async () => {
		try {
			setSaving(true);
			await CausasUpdateService.updateConfig({
				worker: { enabled, maxCredentialsPerRun, maxCausasPerCredential, delayBetweenCausas, delayBetweenCredentials },
				thresholds: { updateThresholdHours, minTimeBetweenRunsMinutes, maxRunsPerDay },
				concurrency: { waitForCausaCreation, checkIntervalMs: config.concurrency?.checkIntervalMs ?? 30000, maxWaitMinutes },
				resume: { enabled: resumeEnabled, maxResumeAttempts, resumeDelayMinutes: config.resume?.resumeDelayMinutes ?? 5 },
			});
			enqueueSnackbar("Configuración guardada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			onConfigUpdate();
		} catch (error: any) {
			enqueueSnackbar(error?.response?.data?.message || "Error al guardar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Stack spacing={3}>
			{/* Worker General */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="h6">Worker General</Typography>
						<Stack direction="row" spacing={1} alignItems="center">
							{enabled ? (
								<Chip
									icon={<TickCircle size={14} />}
									label="Habilitado"
									size="small"
									sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }}
								/>
							) : (
								<Chip
									icon={<CloseCircle size={14} />}
									label="Deshabilitado"
									size="small"
									sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}
								/>
							)}
							<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
						</Stack>
					</Stack>

					<Grid container spacing={3}>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Max credenciales por run"
								type="number"
								value={maxCredentialsPerRun}
								onChange={(e) => setMaxCredentialsPerRun(Number(e.target.value))}
								helperText="Máximo de credenciales a procesar por ejecución"
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Max causas por credencial"
								type="number"
								value={maxCausasPerCredential}
								onChange={(e) => setMaxCausasPerCredential(Number(e.target.value))}
								helperText="0 = sin límite"
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Delay entre causas (ms)"
								type="number"
								value={delayBetweenCausas}
								onChange={(e) => setDelayBetweenCausas(Number(e.target.value))}
								helperText="Pausa entre procesamiento de cada causa"
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Delay entre credenciales (ms)"
								type="number"
								value={delayBetweenCredentials}
								onChange={(e) => setDelayBetweenCredentials(Number(e.target.value))}
								helperText="Pausa entre procesamiento de cada credencial"
							/>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Thresholds */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Thresholds
					</Typography>
					<Grid container spacing={3}>
						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								size="small"
								label="Threshold actualización (horas)"
								type="number"
								value={updateThresholdHours}
								onChange={(e) => setUpdateThresholdHours(Number(e.target.value))}
								helperText="Horas mínimas entre actualizaciones por causa"
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								size="small"
								label="Tiempo mínimo entre runs (min)"
								type="number"
								value={minTimeBetweenRunsMinutes}
								onChange={(e) => setMinTimeBetweenRunsMinutes(Number(e.target.value))}
								helperText="Mínuto mínimo entre runs de la misma credencial"
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								size="small"
								label="Max runs por día"
								type="number"
								value={maxRunsPerDay}
								onChange={(e) => setMaxRunsPerDay(Number(e.target.value))}
								helperText="Máximo de runs diarios por credencial"
							/>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Concurrencia */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Concurrencia
					</Typography>
					<Grid container spacing={3}>
						<Grid item xs={12} sm={6}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Esperar creación de causas
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Esperar a que termine el worker de creación antes de actualizar
									</Typography>
								</Box>
								<Switch checked={waitForCausaCreation} onChange={(e) => setWaitForCausaCreation(e.target.checked)} />
							</Stack>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Timeout de espera (min)"
								type="number"
								value={maxWaitMinutes}
								onChange={(e) => setMaxWaitMinutes(Number(e.target.value))}
								disabled={!waitForCausaCreation}
								helperText="Máximo de minutos a esperar por creación"
							/>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Resume */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Resume Automático
					</Typography>
					<Grid container spacing={3}>
						<Grid item xs={12} sm={6}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Resume habilitado
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Retomar runs interrumpidos automáticamente
									</Typography>
								</Box>
								<Switch checked={resumeEnabled} onChange={(e) => setResumeEnabled(e.target.checked)} />
							</Stack>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Máx intentos de resume"
								type="number"
								value={maxResumeAttempts}
								onChange={(e) => setMaxResumeAttempts(Number(e.target.value))}
								disabled={!resumeEnabled}
								helperText="Veces máximas que se intenta resumir un run"
							/>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Guardar */}
			{hasChanges && (
				<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={handleSave} disabled={saving}>
						{saving ? "Guardando..." : "Guardar cambios"}
					</Button>
				</Box>
			)}

			{config.updatedAt && (
				<Typography variant="caption" color="text.secondary" textAlign="right">
					Última actualización: {new Date(config.updatedAt).toLocaleString("es-AR")}
					{config.updatedBy && ` por ${config.updatedBy}`}
				</Typography>
			)}
		</Stack>
	);
};

export default CausasUpdateConfigTab;
