import React, { useState, useEffect } from "react";
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
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	Chip,
	Checkbox,
	FormControlLabel,
	FormGroup,
	Collapse,
	Tooltip,
	IconButton,
	Divider,
} from "@mui/material";
import { Refresh, InfoCircle, TickCircle, CloseCircle, Warning2, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MEVWorkersService, { SyncCheckConfig } from "api/workersMEV";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

const SyncCheckTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<SyncCheckConfig | null>(null);
	const [navStats, setNavStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [docsOpen, setDocsOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(true);

	// Editable fields
	const [editEnabled, setEditEnabled] = useState(true);
	const [editCron, setEditCron] = useState("0 6 * * *");
	const [editDays, setEditDays] = useState<number[]>([1, 2, 3, 4, 5]);
	const [editSendOnAlert, setEditSendOnAlert] = useState(true);
	const [editSendOnOk, setEditSendOnOk] = useState(true);

	const fetchData = async () => {
		try {
			setLoading(true);
			const [configRes, statsRes] = await Promise.all([
				MEVWorkersService.getSyncCheckConfig(),
				MEVWorkersService.getNavigationCodesStats().catch(() => null),
			]);

			if (configRes.success && configRes.data) {
				setConfig(configRes.data);
				setEditEnabled(configRes.data.enabled);
				setEditCron(configRes.data.schedule?.cron_pattern || "0 6 * * *");
				setEditDays(configRes.data.schedule?.active_days || [1, 2, 3, 4, 5]);
				setEditSendOnAlert(configRes.data.notification?.send_on_alert !== false);
				setEditSendOnOk(configRes.data.notification?.send_on_ok !== false);
			}

			if (statsRes?.success) {
				setNavStats(statsRes.data);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error cargando datos", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleSave = async () => {
		try {
			setSaving(true);
			await MEVWorkersService.updateSyncCheckConfig({
				enabled: editEnabled,
				schedule: {
					cron_pattern: editCron,
					timezone: "America/Argentina/Buenos_Aires",
					active_days: editDays,
				},
				notification: {
					send_on_alert: editSendOnAlert,
					send_on_ok: editSendOnOk,
				},
			});
			enqueueSnackbar("Configuracion guardada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			await fetchData();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error guardando", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	const toggleDay = (day: number) => {
		setEditDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
	};

	const getStatusChip = () => {
		const status = config?.last_report?.status;
		if (!status) return <Chip label="Sin ejecutar" size="small" />;
		if (status === "OK") return <Chip label="OK" color="success" size="small" icon={<TickCircle size={16} />} />;
		if (status === "ALERTA") return <Chip label="ALERTA" color="warning" size="small" icon={<Warning2 size={16} />} />;
		return <Chip label="ERROR" color="error" size="small" icon={<CloseCircle size={16} />} />;
	};

	const formatDate = (dateStr?: string | null) => {
		if (!dateStr) return "Nunca";
		return new Date(dateStr).toLocaleString("es-AR", {
			timeZone: "America/Argentina/Buenos_Aires",
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDuration = (ms?: number | null) => {
		if (!ms) return "-";
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={80} />
				<Skeleton variant="rectangular" height={200} />
				<Skeleton variant="rectangular" height={300} />
			</Stack>
		);
	}

	const report = config?.last_report;
	const stats = config?.statistics;

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Sync Check Worker</Typography>
				<Button startIcon={<Refresh size={18} />} onClick={fetchData} variant="outlined" size="small">
					Actualizar
				</Button>
			</Stack>

			{/* Documentacion */}
			<Card>
				<CardContent>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ cursor: "pointer" }}
						onClick={() => setDocsOpen(!docsOpen)}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<InfoCircle size={20} />
							<Typography variant="h6">Como funciona este worker</Typography>
						</Stack>
						{docsOpen ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
					</Stack>
					<Collapse in={docsOpen}>
						<Box sx={{ mt: 2 }}>
							<Typography variant="body2" paragraph>
								El <strong>Sync Check Worker</strong> es un proceso automatizado que verifica diariamente que los datos de jurisdicciones y
								organismos del sistema esten sincronizados con el MEV (Mesa de Entradas Virtual) de la SCBA.
							</Typography>
							<Typography variant="subtitle2" gutterBottom>
								Flujo de ejecucion:
							</Typography>
							<Typography variant="body2" component="div">
								<ol style={{ margin: 0, paddingLeft: 20 }}>
									<li>Hace login en el MEV con puppeteer (headless)</li>
									<li>Recorre las jurisdicciones del select principal</li>
									<li>Para cada jurisdiccion, extrae los organismos disponibles</li>
									<li>Procesa Justicia de Paz via el radio button PZ</li>
									<li>
										Compara los datos reales del MEV con el archivo JSON local (<code>mev-jurisdicciones-unificado.json</code>)
									</li>
									<li>Genera un reporte: OK (sin diferencias) o ALERTA (con diferencias)</li>
									<li>Envia email y guarda el resultado en la base de datos</li>
								</ol>
							</Typography>
							<Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
								Diferencias detectadas:
							</Typography>
							<Typography variant="body2" component="div">
								<ul style={{ margin: 0, paddingLeft: 20 }}>
									<li>
										<strong>Jurisdicciones faltantes:</strong> Existen en MEV pero no en el JSON local
									</li>
									<li>
										<strong>Organismos faltantes:</strong> Existen en MEV pero no en el JSON local (por jurisdiccion)
									</li>
									<li>
										<strong>Organismos sobrantes:</strong> Existen en el JSON local pero ya no aparecen en MEV
									</li>
								</ul>
							</Typography>
							<Alert severity="info" sx={{ mt: 2 }}>
								Si el reporte indica <strong>ALERTA</strong>, es necesario revisar y actualizar manualmente el archivo JSON y/o la base de
								datos de navigation codes.
							</Alert>
						</Box>
					</Collapse>
				</CardContent>
			</Card>

			{/* Estado y Resumen */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Estado
							</Typography>
							<Stack direction="row" spacing={1} alignItems="center">
								{getStatusChip()}
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Ultima ejecucion
							</Typography>
							<Typography variant="h6">{formatDate(report?.date)}</Typography>
							<Typography variant="caption" color="text.secondary">
								Duracion: {formatDuration(report?.duration_ms)}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Ejecuciones totales
							</Typography>
							<Typography variant="h6">{stats?.total_runs || 0}</Typography>
							<Typography variant="caption" color="text.secondary">
								Exitosas: {stats?.successful_runs || 0} | Fallidas: {stats?.failed_runs || 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Summary stats (solo si hay reporte) */}
			{report?.summary && (
				<Grid container spacing={2}>
					<Grid item xs={6} sm={2.4}>
						<Card>
							<CardContent sx={{ textAlign: "center", py: 1.5 }}>
								<Typography variant="h5">{report.summary.totalJurisdiccionesMEV}</Typography>
								<Typography variant="caption" color="text.secondary">
									Jurisd. MEV
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={2.4}>
						<Card>
							<CardContent sx={{ textAlign: "center", py: 1.5 }}>
								<Typography variant="h5">{report.summary.totalJurisdiccionesJSON}</Typography>
								<Typography variant="caption" color="text.secondary">
									Jurisd. JSON
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={2.4}>
						<Card>
							<CardContent sx={{ textAlign: "center", py: 1.5 }}>
								<Typography variant="h5" color={report.summary.jurisdiccionesFaltantes > 0 ? "error" : "success.main"}>
									{report.summary.jurisdiccionesFaltantes}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Jurisd. faltantes
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={2.4}>
						<Card>
							<CardContent sx={{ textAlign: "center", py: 1.5 }}>
								<Typography variant="h5" color={report.summary.organismosFaltantes > 0 ? "error" : "success.main"}>
									{report.summary.organismosFaltantes}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Org. faltantes
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={2.4}>
						<Card>
							<CardContent sx={{ textAlign: "center", py: 1.5 }}>
								<Typography variant="h5" color={report.summary.organismosSobrantes > 0 ? "warning.main" : "success.main"}>
									{report.summary.organismosSobrantes}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Org. sobrantes
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			)}

			{/* Configuracion */}
			<Card>
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Configuracion
					</Typography>
					<Grid container spacing={3} alignItems="center">
						<Grid item xs={12} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="body2">Habilitado:</Typography>
								<Switch checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />
							</Stack>
						</Grid>
						<Grid item xs={12} sm={4}>
							<TextField
								label="Cron pattern"
								value={editCron}
								onChange={(e) => setEditCron(e.target.value)}
								size="small"
								fullWidth
								helperText='Ej: "0 6 * * *" = todos los dias a las 6 AM'
							/>
						</Grid>
						<Grid item xs={12} sm={5}>
							<Typography variant="body2" gutterBottom>
								Dias activos:
							</Typography>
							<FormGroup row>
								{DAY_LABELS.map((label, idx) => (
									<FormControlLabel
										key={idx}
										control={<Checkbox size="small" checked={editDays.includes(idx)} onChange={() => toggleDay(idx)} />}
										label={label}
										sx={{ mr: 0.5 }}
									/>
								))}
							</FormGroup>
						</Grid>
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
						</Grid>
						<Grid item xs={12} sm={4}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="body2">Email en ALERTA:</Typography>
								<Switch checked={editSendOnAlert} onChange={(e) => setEditSendOnAlert(e.target.checked)} />
							</Stack>
						</Grid>
						<Grid item xs={12} sm={4}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="body2">Email en OK:</Typography>
								<Switch checked={editSendOnOk} onChange={(e) => setEditSendOnOk(e.target.checked)} />
							</Stack>
						</Grid>
						<Grid item xs={12} sm={4}>
							<Button variant="contained" onClick={handleSave} disabled={saving} fullWidth>
								{saving ? "Guardando..." : "Guardar configuracion"}
							</Button>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Detalle del reporte */}
			{report?.status && (
				<Card>
					<CardContent>
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							sx={{ cursor: "pointer" }}
							onClick={() => setReportOpen(!reportOpen)}
						>
							<Typography variant="h6">Detalle del ultimo reporte</Typography>
							{reportOpen ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
						</Stack>
						<Collapse in={reportOpen}>
							<Box sx={{ mt: 2 }}>
								{report.status === "OK" && (
									<Alert severity="success">No se detectaron diferencias entre el MEV y el JSON local. Todo sincronizado.</Alert>
								)}

								{report.status === "ERROR" && (
									<Alert severity="error">
										Error durante la ejecucion: {report.error_message || "Error desconocido"}
									</Alert>
								)}

								{report.status === "ALERTA" && (
									<Stack spacing={2}>
										<Alert severity="warning">
											Se detectaron diferencias. Se requiere verificacion humana y posible actualizacion del JSON/BD.
										</Alert>

										{report.missing_jurisdictions && report.missing_jurisdictions.length > 0 && (
											<>
												<Typography variant="subtitle2" color="error">
													Jurisdicciones faltantes en JSON ({report.missing_jurisdictions.length})
												</Typography>
												<TableContainer component={Paper} variant="outlined">
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell>Codigo</TableCell>
																<TableCell>Nombre</TableCell>
																<TableCell align="right">Organismos</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{report.missing_jurisdictions.map((j, i) => (
																<TableRow key={i}>
																	<TableCell>{j.codigo}</TableCell>
																	<TableCell>{j.nombre}</TableCell>
																	<TableCell align="right">{j.organismosCount}</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
											</>
										)}

										{report.missing_organisms && report.missing_organisms.length > 0 && (
											<>
												<Typography variant="subtitle2" color="error">
													Organismos faltantes en JSON ({report.missing_organisms.length})
												</Typography>
												<TableContainer component={Paper} variant="outlined">
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell>Jurisdiccion</TableCell>
																<TableCell>Codigo Org.</TableCell>
																<TableCell>Nombre Organismo</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{report.missing_organisms.map((o, i) => (
																<TableRow key={i}>
																	<TableCell>
																		{o.jurisdiccion} ({o.jurisdiccionCodigo})
																	</TableCell>
																	<TableCell>{o.organismoCodigo}</TableCell>
																	<TableCell>{o.organismoNombre}</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
											</>
										)}

										{report.extra_organisms && report.extra_organisms.length > 0 && (
											<>
												<Typography variant="subtitle2" color="warning.main">
													Organismos sobrantes en JSON ({report.extra_organisms.length})
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Estos organismos estan en el JSON local pero ya no aparecen en el MEV
												</Typography>
												<TableContainer component={Paper} variant="outlined">
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell>Jurisdiccion</TableCell>
																<TableCell>Codigo Org.</TableCell>
																<TableCell>Nombre Organismo</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{report.extra_organisms.map((o, i) => (
																<TableRow key={i}>
																	<TableCell>
																		{o.jurisdiccion} ({o.jurisdiccionCodigo})
																	</TableCell>
																	<TableCell>{o.organismoCodigo}</TableCell>
																	<TableCell>{o.organismoNombre}</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
											</>
										)}
									</Stack>
								)}
							</Box>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Navigation Codes Stats */}
			{navStats && (
				<Card>
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Navigation Codes en BD
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<Typography variant="body2" color="text.secondary">
									Total codigos
								</Typography>
								<Typography variant="h5">{navStats.total || 0}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="body2" color="text.secondary">
									Activos
								</Typography>
								<Typography variant="h5" color="success.main">
									{navStats.activos || 0}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="body2" color="text.secondary">
									Inactivos
								</Typography>
								<Typography variant="h5" color="text.disabled">
									{navStats.inactivos || 0}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="body2" color="text.secondary">
									Jurisdicciones
								</Typography>
								<Typography variant="h5">{navStats.jurisdicciones || 0}</Typography>
							</Grid>
						</Grid>
						{navStats.porTipo && (
							<Box sx={{ mt: 2 }}>
								<Typography variant="body2" color="text.secondary" gutterBottom>
									Por tipo:
								</Typography>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									{Object.entries(navStats.porTipo).map(([tipo, count]: [string, any]) => (
										<Chip key={tipo} label={`${tipo}: ${count}`} size="small" variant="outlined" />
									))}
								</Stack>
							</Box>
						)}
					</CardContent>
				</Card>
			)}

			{/* Stats historicas */}
			{stats && stats.total_runs > 0 && (
				<Card>
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Estadisticas historicas
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={2}>
								<Typography variant="body2" color="text.secondary">
									Total ejecuciones
								</Typography>
								<Typography variant="h6">{stats.total_runs}</Typography>
							</Grid>
							<Grid item xs={6} sm={2}>
								<Typography variant="body2" color="text.secondary">
									Exitosas
								</Typography>
								<Typography variant="h6" color="success.main">
									{stats.successful_runs}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={2}>
								<Typography variant="body2" color="text.secondary">
									Fallidas
								</Typography>
								<Typography variant="h6" color="error">
									{stats.failed_runs}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={2}>
								<Typography variant="body2" color="text.secondary">
									OK consecutivos
								</Typography>
								<Typography variant="h6">{stats.consecutive_ok}</Typography>
							</Grid>
							<Grid item xs={6} sm={2}>
								<Typography variant="body2" color="text.secondary">
									Alertas consec.
								</Typography>
								<Typography variant="h6" color={stats.consecutive_alerts > 0 ? "warning.main" : "inherit"}>
									{stats.consecutive_alerts}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={2}>
								<Typography variant="body2" color="text.secondary">
									Ultimo exito
								</Typography>
								<Typography variant="body2">{formatDate(stats.last_success_date)}</Typography>
							</Grid>
						</Grid>
						{stats.last_error && (
							<Alert severity="error" sx={{ mt: 2 }}>
								Ultimo error ({formatDate(stats.last_error_date)}): {stats.last_error}
							</Alert>
						)}
					</CardContent>
				</Card>
			)}
		</Stack>
	);
};

export default SyncCheckTab;
