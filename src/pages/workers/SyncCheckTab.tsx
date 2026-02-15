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
	MenuItem,
	Select,
	InputLabel,
	FormControl,
	CircularProgress,
} from "@mui/material";
import { Refresh, InfoCircle, TickCircle, CloseCircle, Warning2, ArrowDown2, ArrowUp2, Add, Trash, Camera, SearchNormal1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MEVWorkersService, { SyncCheckConfig, NavigationCodeDoc, ScreenshotInfo } from "api/workersMEV";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

const SyncCheckTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<SyncCheckConfig | null>(null);
	const [navStats, setNavStats] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [docsOpen, setDocsOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(true);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<number | null>(null);

	// Editable fields
	const [editEnabled, setEditEnabled] = useState(true);
	const [editCron, setEditCron] = useState("0 6 * * *");
	const [editDays, setEditDays] = useState<number[]>([1, 2, 3, 4, 5]);
	const [editSendOnAlert, setEditSendOnAlert] = useState(true);
	const [editSendOnOk, setEditSendOnOk] = useState(true);
	const [editScreenshotsEnabled, setEditScreenshotsEnabled] = useState(true);
	const [editScreenshotsDetailed, setEditScreenshotsDetailed] = useState(false);
	const [fixLoading, setFixLoading] = useState<Record<string, boolean>>({});
	const [fixApplied, setFixApplied] = useState<Record<string, boolean>>({});
	const [expandedJurIdx, setExpandedJurIdx] = useState<number | null>(null);

	// Explorer state
	const [explorerOpen, setExplorerOpen] = useState(false);
	const [navCodes, setNavCodes] = useState<NavigationCodeDoc[]>([]);
	const [navCodesLoading, setNavCodesLoading] = useState(false);
	const [screenshots, setScreenshots] = useState<ScreenshotInfo[]>([]);
	const [selectedJurisdiccion, setSelectedJurisdiccion] = useState("");
	const [selectedOrganismo, setSelectedOrganismo] = useState("");
	const [selectedNavCode, setSelectedNavCode] = useState<NavigationCodeDoc | null>(null);
	const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

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
				setEditScreenshotsEnabled(configRes.data.settings?.screenshots_enabled !== false);
				setEditScreenshotsDetailed(configRes.data.settings?.screenshots_detailed === true);
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
				settings: {
					screenshots_enabled: editScreenshotsEnabled,
					screenshots_detailed: editScreenshotsDetailed,
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

	const handleAddOrganism = async (jurisdiccionCodigo: string, jurisdiccionNombre: string, organismoCodigo: string, organismoNombre: string) => {
		const key = `add_${organismoCodigo}`;
		setFixLoading((prev) => ({ ...prev, [key]: true }));
		try {
			const result = await MEVWorkersService.addOrganism({
				jurisdiccionCodigo,
				jurisdiccionNombre,
				organismoCodigo,
				organismoNombre,
			});
			setFixApplied((prev) => ({ ...prev, [key]: true }));
			enqueueSnackbar(result.message || "Organismo agregado en BD", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al agregar organismo", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setFixLoading((prev) => ({ ...prev, [key]: false }));
		}
	};

	const handleRemoveOrganism = async (jurisdiccionCodigo: string, organismoCodigo: string, jurisdiccionNombre?: string, organismoNombre?: string) => {
		const key = `rm_${organismoCodigo}`;
		setFixLoading((prev) => ({ ...prev, [key]: true }));
		try {
			const result = await MEVWorkersService.removeOrganism({
				jurisdiccionCodigo,
				organismoCodigo,
				jurisdiccionNombre,
				organismoNombre,
			});
			setFixApplied((prev) => ({ ...prev, [key]: true }));
			enqueueSnackbar(result.message || "Organismo desactivado en BD", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al desactivar organismo", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setFixLoading((prev) => ({ ...prev, [key]: false }));
		}
	};

	const handleAddJurisdiction = async (jurisdiccionCodigo: string, jurisdiccionNombre: string, organismos: Array<{ codigo: string; nombre: string }>) => {
		const key = `jur_${jurisdiccionCodigo}`;
		setFixLoading((prev) => ({ ...prev, [key]: true }));
		try {
			const result = await MEVWorkersService.addJurisdiction({
				jurisdiccionCodigo,
				jurisdiccionNombre,
				organismos,
			});
			setFixApplied((prev) => ({ ...prev, [key]: true }));
			enqueueSnackbar(result.message || "Jurisdiccion agregada en BD", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al agregar jurisdiccion", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setFixLoading((prev) => ({ ...prev, [key]: false }));
		}
	};

	// Explorer: cargar navigation codes y screenshots
	const loadExplorerData = async () => {
		if (navCodes.length > 0) return; // ya cargados
		setNavCodesLoading(true);
		try {
			const [codesRes, screenshotsRes] = await Promise.all([
				MEVWorkersService.getNavigationCodes({ activo: true, limit: 1000 }),
				config?.last_report?.screenshots_dir
					? MEVWorkersService.listScreenshots(config.last_report.screenshots_dir).catch(() => ({ success: false, data: [] }))
					: Promise.resolve({ success: true, data: [] as ScreenshotInfo[] }),
			]);
			if (codesRes.success) setNavCodes(codesRes.data);
			if (screenshotsRes.success) setScreenshots(screenshotsRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error cargando datos del explorador", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setNavCodesLoading(false);
		}
	};

	// Jurisdicciones unicas de los navigation codes
	const jurisdicciones = React.useMemo(() => {
		const map = new Map<string, string>();
		navCodes.forEach((nc) => {
			if (!map.has(nc.jurisdiccion.codigo)) {
				map.set(nc.jurisdiccion.codigo, nc.jurisdiccion.nombre);
			}
		});
		return Array.from(map.entries())
			.map(([codigo, nombre]) => ({ codigo, nombre }))
			.sort((a, b) => a.nombre.localeCompare(b.nombre));
	}, [navCodes]);

	// Organismos filtrados por jurisdiccion seleccionada
	const organismosFiltrados = React.useMemo(() => {
		if (!selectedJurisdiccion) return [];
		return navCodes
			.filter((nc) => nc.jurisdiccion.codigo === selectedJurisdiccion)
			.sort((a, b) => a.organismo.nombre.localeCompare(b.organismo.nombre));
	}, [navCodes, selectedJurisdiccion]);

	const handleJurisdiccionChange = (jCode: string) => {
		setSelectedJurisdiccion(jCode);
		setSelectedOrganismo("");
		setSelectedNavCode(null);
		setScreenshotUrl(null);
	};

	const handleOrganismoChange = (orgCode: string) => {
		setSelectedOrganismo(orgCode);
		const nc = navCodes.find((n) => n.jurisdiccion.codigo === selectedJurisdiccion && n.organismo.codigo === orgCode);
		setSelectedNavCode(nc || null);

		// Buscar screenshot
		if (nc && config?.last_report?.screenshots_dir && screenshots.length > 0) {
			// Buscar screenshot del organismo (modo detallado) o jurisdiccion
			const orgScreenshot = screenshots.find((s) => s.filename.includes(`-${orgCode}.png`));
			const jurScreenshot = screenshots.find((s) => s.jurisdiccionCodigo === selectedJurisdiccion && !s.filename.endsWith(`${orgCode}.png`) && s.filename.includes(`-${selectedJurisdiccion}-`));
			const match = orgScreenshot || jurScreenshot;
			if (match) {
				setScreenshotUrl(MEVWorkersService.getScreenshotUrl(config.last_report.screenshots_dir, match.filename));
			} else {
				setScreenshotUrl(null);
			}
		} else {
			setScreenshotUrl(null);
		}
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

							<Typography variant="subtitle2" sx={{ mt: 3 }} gutterBottom>
								Secciones de esta pantalla:
							</Typography>
							<Typography variant="body2" component="div">
								<ul style={{ margin: 0, paddingLeft: 20 }}>
									<li>
										<strong>Estado y Resumen:</strong> Muestra el resultado de la ultima ejecucion (OK/ALERTA/ERROR), fecha,
										duracion y contadores de jurisdicciones/organismos comparados.
									</li>
									<li>
										<strong>Configuracion:</strong> Permite habilitar/deshabilitar el worker, cambiar el horario cron, seleccionar
										dias activos y configurar notificaciones por email. Los cambios se aplican sin reiniciar PM2.
									</li>
									<li>
										<strong>Detalle del ultimo reporte:</strong> Si el estado es ALERTA, muestra las tablas de jurisdicciones
										faltantes, organismos faltantes y organismos sobrantes con sus codigos y nombres.
									</li>
									<li>
										<strong>Historial de reportes:</strong> Lista las ultimas 30 ejecuciones del worker con fecha, estado, duracion
										y resumen. Permite expandir cada entrada para ver el detalle completo.
									</li>
									<li>
										<strong>Navigation Codes en BD:</strong> Estadisticas de los codigos de navegacion almacenados en la base de
										datos (total, activos, inactivos, por tipo).
									</li>
									<li>
										<strong>Estadisticas historicas:</strong> Contadores acumulados de ejecuciones totales, exitosas, fallidas, OK
										consecutivos y alertas consecutivas.
									</li>
								</ul>
							</Typography>

							<Typography variant="subtitle2" sx={{ mt: 3 }} gutterBottom>
								Actualizacion de configuracion:
							</Typography>
							<Typography variant="body2" component="div">
								<p style={{ margin: "4px 0" }}>
									Los cambios realizados desde esta UI se guardan en la base de datos. El worker consulta la BD periodicamente para
									detectar cambios sin necesidad de reiniciar PM2.
								</p>
							</Typography>
							<TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>
												<strong>Configuracion</strong>
											</TableCell>
											<TableCell>
												<strong>Como se aplica</strong>
											</TableCell>
											<TableCell>
												<strong>Latencia</strong>
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										<TableRow>
											<TableCell>Habilitado (enabled)</TableCell>
											<TableCell>Se consulta antes de cada ejecucion</TableCell>
											<TableCell>Inmediato</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>Dias activos</TableCell>
											<TableCell>Se consulta antes de cada ejecucion</TableCell>
											<TableCell>Inmediato</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>Patron cron</TableCell>
											<TableCell>El worker recarga cada 5 min y recrea el cron si cambio</TableCell>
											<TableCell>Hasta 5 minutos</TableCell>
										</TableRow>
										<TableRow>
											<TableCell>Notificaciones email</TableCell>
											<TableCell>Se consulta al momento de enviar el reporte</TableCell>
											<TableCell>Inmediato</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</TableContainer>

							<Typography variant="subtitle2" sx={{ mt: 3 }} gutterBottom>
								Comandos PM2:
							</Typography>
							<Box component="pre" sx={{ bgcolor: "background.default", p: 1.5, borderRadius: 1, overflow: "auto", fontSize: "0.8rem" }}>
								{`# Iniciar el worker
pm2 start ecosystem-sync-check.config.js

# Ver logs en tiempo real
pm2 logs sync-check-mev --lines 50

# Ejecutar manualmente (una sola vez)
RUN_IMMEDIATELY=true node src/tasks/sync-check-worker.js

# Guardar configuracion PM2
pm2 save`}
							</Box>

							<Typography variant="subtitle2" sx={{ mt: 3 }} gutterBottom>
								Archivos clave:
							</Typography>
							<Typography variant="body2" component="div">
								<ul style={{ margin: 0, paddingLeft: 20 }}>
									<li>
										<code>src/tasks/sync-check-worker.js</code> — Worker principal
									</li>
									<li>
										<code>ecosystem-sync-check.config.js</code> — Config PM2
									</li>
									<li>
										<code>data/jurisdicciones/mev-jurisdicciones-unificado.json</code> — JSON de referencia
									</li>
									<li>
										Coleccion BD: <code>configuracion-sync-check</code>
									</li>
									<li>
										API: <code>GET/PUT /api/config/sync-check</code>
									</li>
								</ul>
							</Typography>
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
						<Grid item xs={12} sm={4} />
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
						</Grid>
						<Grid item xs={12} sm={4}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Camera size={18} />
								<Typography variant="body2">Screenshots habilitados:</Typography>
								<Switch checked={editScreenshotsEnabled} onChange={(e) => setEditScreenshotsEnabled(e.target.checked)} />
							</Stack>
						</Grid>
						<Grid item xs={12} sm={4}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="body2">Modo detallado (1 por organismo):</Typography>
								<Switch
									checked={editScreenshotsDetailed}
									onChange={(e) => setEditScreenshotsDetailed(e.target.checked)}
									disabled={!editScreenshotsEnabled}
								/>
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
																<TableCell width={40} />
																<TableCell>Codigo</TableCell>
																<TableCell>Nombre</TableCell>
																<TableCell align="right">Organismos</TableCell>
																<TableCell align="right">Accion</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{report.missing_jurisdictions.map((j, i) => (
																<React.Fragment key={i}>
																	<TableRow
																		hover
																		sx={{ cursor: j.organismos ? "pointer" : "default" }}
																		onClick={() => j.organismos && setExpandedJurIdx(expandedJurIdx === i ? null : i)}
																	>
																		<TableCell>
																			{j.organismos && (expandedJurIdx === i ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />)}
																		</TableCell>
																		<TableCell>{j.codigo}</TableCell>
																		<TableCell>{j.nombre}</TableCell>
																		<TableCell align="right">{j.organismosCount}</TableCell>
																		<TableCell align="right">
																			<Button
																				size="small"
																				variant="outlined"
																				color="success"
																				startIcon={fixApplied[`jur_${j.codigo}`] ? <TickCircle size={14} /> : <Add size={14} />}
																				disabled={fixLoading[`jur_${j.codigo}`] || fixApplied[`jur_${j.codigo}`] || !j.organismos}
																				onClick={(e) => {
																					e.stopPropagation();
																					if (j.organismos) {
																						handleAddJurisdiction(j.codigo, j.nombre, j.organismos);
																					}
																				}}
																			>
																				{fixLoading[`jur_${j.codigo}`] ? "..." : fixApplied[`jur_${j.codigo}`] ? "Agregada" : "Agregar todo"}
																			</Button>
																		</TableCell>
																	</TableRow>
																	{expandedJurIdx === i && j.organismos && (
																		<TableRow>
																			<TableCell colSpan={5} sx={{ py: 1, pl: 6, bgcolor: "grey.50" }}>
																				<Typography variant="caption" fontWeight="bold" gutterBottom display="block">
																					Organismos de {j.nombre}:
																				</Typography>
																				<Stack spacing={0.5}>
																					{j.organismos.map((org, oi) => (
																						<Stack key={oi} direction="row" justifyContent="space-between" alignItems="center">
																							<Typography variant="caption">
																								{org.codigo} - {org.nombre}
																							</Typography>
																							<Button
																								size="small"
																								variant="text"
																								color="success"
																								startIcon={fixApplied[`add_${org.codigo}`] ? <TickCircle size={12} /> : <Add size={12} />}
																								disabled={fixLoading[`add_${org.codigo}`] || fixApplied[`add_${org.codigo}`]}
																								onClick={() => handleAddOrganism(j.codigo, j.nombre, org.codigo, org.nombre)}
																								sx={{ minWidth: "auto", fontSize: "0.7rem" }}
																							>
																								{fixApplied[`add_${org.codigo}`] ? "OK" : "Agregar"}
																							</Button>
																						</Stack>
																					))}
																				</Stack>
																			</TableCell>
																		</TableRow>
																	)}
																</React.Fragment>
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
																<TableCell align="right">Accion</TableCell>
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
																	<TableCell align="right">
																		<Button
																			size="small"
																			variant="outlined"
																			color="success"
																			startIcon={fixApplied[`add_${o.organismoCodigo}`] ? <TickCircle size={14} /> : <Add size={14} />}
																			disabled={fixLoading[`add_${o.organismoCodigo}`] || fixApplied[`add_${o.organismoCodigo}`]}
																			onClick={() => handleAddOrganism(o.jurisdiccionCodigo, o.jurisdiccion, o.organismoCodigo, o.organismoNombre)}
																		>
																			{fixLoading[`add_${o.organismoCodigo}`] ? "..." : fixApplied[`add_${o.organismoCodigo}`] ? "Agregado" : "Agregar"}
																		</Button>
																	</TableCell>
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
																<TableCell align="right">Accion</TableCell>
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
																	<TableCell align="right">
																		<Button
																			size="small"
																			variant="outlined"
																			color="warning"
																			startIcon={fixApplied[`rm_${o.organismoCodigo}`] ? <TickCircle size={14} /> : <Trash size={14} />}
																			disabled={fixLoading[`rm_${o.organismoCodigo}`] || fixApplied[`rm_${o.organismoCodigo}`]}
																			onClick={() => handleRemoveOrganism(o.jurisdiccionCodigo, o.organismoCodigo, o.jurisdiccion, o.organismoNombre)}
																		>
																			{fixLoading[`rm_${o.organismoCodigo}`] ? "..." : fixApplied[`rm_${o.organismoCodigo}`] ? "Desactivado" : "Desactivar"}
																		</Button>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
											</>
										)}
									{Object.keys(fixApplied).length > 0 && (
										<Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
											Las correcciones se aplicaron en la base de datos. El archivo JSON se actualizara automaticamente en la proxima
											ejecucion del worker.
										</Alert>
									)}
									</Stack>
								)}
							</Box>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Explorador de Navigation Codes */}
			<Card>
				<CardContent>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ cursor: "pointer" }}
						onClick={() => {
							const newOpen = !explorerOpen;
							setExplorerOpen(newOpen);
							if (newOpen) loadExplorerData();
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<SearchNormal1 size={20} />
							<Typography variant="h6">Explorador de Navigation Codes</Typography>
						</Stack>
						{explorerOpen ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
					</Stack>
					<Collapse in={explorerOpen}>
						<Box sx={{ mt: 2 }}>
							{navCodesLoading ? (
								<Stack alignItems="center" py={3}>
									<CircularProgress size={32} />
									<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
										Cargando navigation codes...
									</Typography>
								</Stack>
							) : (
								<Stack spacing={3}>
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6}>
											<FormControl fullWidth size="small">
												<InputLabel>Jurisdiccion</InputLabel>
												<Select
													value={selectedJurisdiccion}
													onChange={(e) => handleJurisdiccionChange(e.target.value)}
													label="Jurisdiccion"
												>
													<MenuItem value="">
														<em>Seleccionar jurisdiccion...</em>
													</MenuItem>
													{jurisdicciones.map((j) => (
														<MenuItem key={j.codigo} value={j.codigo}>
															{j.nombre} ({j.codigo})
														</MenuItem>
													))}
												</Select>
											</FormControl>
										</Grid>
										<Grid item xs={12} sm={6}>
											<FormControl fullWidth size="small" disabled={!selectedJurisdiccion}>
												<InputLabel>Organismo</InputLabel>
												<Select
													value={selectedOrganismo}
													onChange={(e) => handleOrganismoChange(e.target.value)}
													label="Organismo"
												>
													<MenuItem value="">
														<em>Seleccionar organismo...</em>
													</MenuItem>
													{organismosFiltrados.map((nc) => (
														<MenuItem key={nc.organismo.codigo} value={nc.organismo.codigo}>
															{nc.organismo.nombre} ({nc.organismo.codigo})
														</MenuItem>
													))}
												</Select>
											</FormControl>
										</Grid>
									</Grid>

									{selectedJurisdiccion && !selectedOrganismo && (
										<Typography variant="body2" color="text.secondary">
											{organismosFiltrados.length} organismos en esta jurisdiccion
										</Typography>
									)}

									{selectedNavCode && (
										<Stack spacing={2}>
											<Divider />
											{/* Navigation Code info */}
											<Box>
												<Typography variant="subtitle2" gutterBottom>
													Navigation Code
												</Typography>
												<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
													<Chip label={selectedNavCode.code} color="primary" size="small" />
													<Chip label={`Tipo: ${selectedNavCode.tipo}`} size="small" variant="outlined" />
													{selectedNavCode.navegacion?.requiresRadio && (
														<Chip label={`Radio: ${selectedNavCode.navegacion.radioValue}`} size="small" variant="outlined" color="info" />
													)}
													<Chip
														label={selectedNavCode.activo ? "Activo" : "Inactivo"}
														size="small"
														color={selectedNavCode.activo ? "success" : "default"}
													/>
												</Stack>
												<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
													{selectedNavCode.descripcion}
												</Typography>
											</Box>

											{/* Documento BD */}
											<Box>
												<Typography variant="subtitle2" gutterBottom>
													Documento BD completo
												</Typography>
												<Box
													component="pre"
													sx={{
														bgcolor: "background.default",
														p: 1.5,
														borderRadius: 1,
														overflow: "auto",
														fontSize: "0.75rem",
														maxHeight: 300,
													}}
												>
													{JSON.stringify(selectedNavCode, null, 2)}
												</Box>
											</Box>

											{/* Screenshot */}
											<Box>
												<Typography variant="subtitle2" gutterBottom>
													Screenshot
												</Typography>
												{screenshotUrl ? (
													<Box
														component="img"
														src={screenshotUrl}
														alt={`Screenshot ${selectedNavCode.code}`}
														sx={{
															maxWidth: "100%",
															border: "1px solid",
															borderColor: "divider",
															borderRadius: 1,
														}}
													/>
												) : (
													<Alert severity="info" variant="outlined">
														{config?.last_report?.screenshots_dir
															? "No hay screenshot disponible para esta seleccion"
															: "No hay screenshots del ultimo run. Habilita screenshots en la configuracion."}
													</Alert>
												)}
											</Box>
										</Stack>
									)}
								</Stack>
							)}
						</Box>
					</Collapse>
				</CardContent>
			</Card>

			{/* Historial de Reportes */}
			{config?.report_history && config.report_history.length > 0 && (
				<Card>
					<CardContent>
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							sx={{ cursor: "pointer" }}
							onClick={() => setHistoryOpen(!historyOpen)}
						>
							<Typography variant="h6">
								Historial de reportes ({config.report_history.length})
							</Typography>
							{historyOpen ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
						</Stack>
						<Collapse in={historyOpen}>
							<Box sx={{ mt: 2 }}>
								<TableContainer component={Paper} variant="outlined">
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell width={40} />
												<TableCell>Fecha</TableCell>
												<TableCell>Estado</TableCell>
												<TableCell>Duracion</TableCell>
												<TableCell>Jurisd. MEV</TableCell>
												<TableCell>Jurisd. JSON</TableCell>
												<TableCell>Faltantes</TableCell>
												<TableCell>Sobrantes</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{[...config.report_history].reverse().map((entry, idx) => (
												<React.Fragment key={idx}>
													<TableRow
														hover
														sx={{ cursor: "pointer", "& > *": { borderBottom: expandedHistoryIdx === idx ? "unset" : undefined } }}
														onClick={() => setExpandedHistoryIdx(expandedHistoryIdx === idx ? null : idx)}
													>
														<TableCell>
															{expandedHistoryIdx === idx ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
														</TableCell>
														<TableCell>{formatDate(entry.date)}</TableCell>
														<TableCell>
															{entry.status === "OK" && <Chip label="OK" color="success" size="small" />}
															{entry.status === "ALERTA" && <Chip label="ALERTA" color="warning" size="small" />}
															{entry.status === "ERROR" && <Chip label="ERROR" color="error" size="small" />}
														</TableCell>
														<TableCell>{formatDuration(entry.duration_ms)}</TableCell>
														<TableCell>{entry.summary?.totalJurisdiccionesMEV ?? "-"}</TableCell>
														<TableCell>{entry.summary?.totalJurisdiccionesJSON ?? "-"}</TableCell>
														<TableCell>
															{(entry.summary?.jurisdiccionesFaltantes || 0) + (entry.summary?.organismosFaltantes || 0) || "-"}
														</TableCell>
														<TableCell>{entry.summary?.organismosSobrantes ?? "-"}</TableCell>
													</TableRow>
													{expandedHistoryIdx === idx && (
														<TableRow>
															<TableCell colSpan={8} sx={{ py: 2, bgcolor: "grey.50" }}>
																{entry.status === "OK" && (
																	<Alert severity="success" variant="outlined">
																		Sin diferencias. Todo sincronizado.
																	</Alert>
																)}
																{entry.status === "ERROR" && (
																	<Alert severity="error" variant="outlined">
																		{entry.error_message || "Error desconocido"}
																	</Alert>
																)}
																{entry.status === "ALERTA" && (
																	<Stack spacing={1.5}>
																		{entry.missing_jurisdictions && entry.missing_jurisdictions.length > 0 && (
																			<Box>
																				<Typography variant="caption" color="error" fontWeight="bold">
																					Jurisdicciones faltantes ({entry.missing_jurisdictions.length}):
																				</Typography>
																				<Typography variant="caption" display="block">
																					{entry.missing_jurisdictions.map((j: any) => `${j.nombre} (${j.codigo})`).join(", ")}
																				</Typography>
																			</Box>
																		)}
																		{entry.missing_organisms && entry.missing_organisms.length > 0 && (
																			<Box>
																				<Typography variant="caption" color="error" fontWeight="bold">
																					Organismos faltantes ({entry.missing_organisms.length}):
																				</Typography>
																				<Typography variant="caption" display="block">
																					{entry.missing_organisms.map((o: any) => `${o.organismoNombre} - ${o.jurisdiccion}`).join(", ")}
																				</Typography>
																			</Box>
																		)}
																		{entry.extra_organisms && entry.extra_organisms.length > 0 && (
																			<Box>
																				<Typography variant="caption" color="warning.main" fontWeight="bold">
																					Organismos sobrantes ({entry.extra_organisms.length}):
																				</Typography>
																				<Typography variant="caption" display="block">
																					{entry.extra_organisms.map((o: any) => `${o.organismoNombre} - ${o.jurisdiccion}`).join(", ")}
																				</Typography>
																			</Box>
																		)}
																	</Stack>
																)}
															</TableCell>
														</TableRow>
													)}
												</React.Fragment>
											))}
										</TableBody>
									</Table>
								</TableContainer>
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
