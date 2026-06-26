import React, { useEffect, useState } from "react";
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
	Alert,
	Autocomplete,
	Skeleton,
	useTheme,
	alpha,
} from "@mui/material";
import { TickCircle, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { BandejaSyncConfig, BandejaSyncConfigService } from "api/bandejaSyncConfig";

const MisCausasBandejaTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [config, setConfig] = useState<BandejaSyncConfig | null>(null);

	const [enabled, setEnabled] = useState(false);
	const [notifyEnabled, setNotifyEnabled] = useState(true);
	const [testEmails, setTestEmails] = useState<string[]>([]);
	const [lookbackDays, setLookbackDays] = useState(7);

	const fetchConfig = async () => {
		try {
			setLoading(true);
			const res = await BandejaSyncConfigService.getConfig();
			if (res.success) {
				const c = res.data;
				setConfig(c);
				setEnabled(c.enabled ?? false);
				setNotifyEnabled(c.notifyEnabled ?? true);
				setTestEmails(Array.isArray(c.testEmails) ? c.testEmails : []);
				setLookbackDays(c.lookbackDays ?? 7);
			}
		} catch (error: any) {
			enqueueSnackbar(error?.response?.data?.message || "Error al obtener configuración", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConfig();
	}, []);

	const hasChanges =
		!!config &&
		(enabled !== (config.enabled ?? false) ||
			notifyEnabled !== (config.notifyEnabled ?? true) ||
			lookbackDays !== (config.lookbackDays ?? 7) ||
			JSON.stringify([...testEmails].sort()) !== JSON.stringify([...(config.testEmails ?? [])].sort()));

	const handleSave = async () => {
		try {
			setSaving(true);
			const res = await BandejaSyncConfigService.updateConfig({ enabled, notifyEnabled, testEmails, lookbackDays });
			if (res.success) setConfig(res.data);
			enqueueSnackbar("Configuración guardada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} catch (error: any) {
			enqueueSnackbar(error?.response?.data?.message || "Error al guardar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	// Estado efectivo según la lógica del worker.
	const effectiveMode = enabled
		? "Procesa TODAS las credenciales habilitadas + verificadas + válidas."
		: testEmails.length > 0
			? `Deshabilitado, pero procesa SOLO los ${testEmails.length} email(s) de prueba.`
			: "Deshabilitado: el worker no procesa ninguna credencial.";

	return (
		<Stack spacing={3}>
			<Alert severity={enabled ? "success" : testEmails.length > 0 ? "warning" : "info"} variant="outlined">
				<Typography variant="body2">
					<strong>Modo actual:</strong> {effectiveMode}
				</Typography>
			</Alert>

			{/* Estado general */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Box>
							<Typography
								variant="h5"
								sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
							>
								Worker de bandeja
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Levanta notificaciones (cédulas) y escritos del portal del letrado PJN
							</Typography>
						</Box>
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
							<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} color="success" />
						</Stack>
					</Stack>

					<Grid container spacing={3}>
						<Grid item xs={12}>
							<Autocomplete
								multiple
								freeSolo
								options={[]}
								value={testEmails}
								onChange={(_e, v) => setTestEmails((v as string[]).map((s) => s.trim()).filter(Boolean))}
								renderTags={(value, getTagProps) =>
									value.map((option, index) => <Chip variant="outlined" label={option} size="small" {...getTagProps({ index })} />)
								}
								renderInput={(params) => (
									<TextField
										{...params}
										size="small"
										label="Emails de prueba"
										placeholder="Agregar email + Enter"
										helperText="Con el worker deshabilitado, procesa SOLO estos emails (pruebas controladas)."
									/>
								)}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Notificaciones habilitadas
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Si se apaga, scrapea pero NO envía emails a los usuarios
									</Typography>
								</Box>
								<Switch checked={notifyEnabled} onChange={(e) => setNotifyEnabled(e.target.checked)} />
							</Stack>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								size="small"
								label="Días de lookback"
								type="number"
								value={lookbackDays}
								onChange={(e) => setLookbackDays(Number(e.target.value))}
								inputProps={{ min: 1, max: 365 }}
								helperText="Ventana de consulta a la API del portal por corrida"
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

			{config?.updatedAt && (
				<Typography variant="caption" color="text.secondary" textAlign="right">
					Última actualización: {new Date(config.updatedAt).toLocaleString("es-AR")}
					{config.updatedBy && ` por ${config.updatedBy}`}
				</Typography>
			)}
		</Stack>
	);
};

export default MisCausasBandejaTab;
