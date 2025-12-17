import { useState, useEffect } from "react";
import {
	Box,
	Grid,
	Card,
	CardContent,
	Typography,
	Alert,
	Stack,
	CircularProgress,
	Button,
	TextField,
	Chip,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Tooltip,
	InputAdornment,
} from "@mui/material";
import { Refresh, Edit, Save2, Clock, TickCircle, InfoCircle, Timer1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import TokenConfigService, { TokenConfigResponse, UpdateTokenConfigParams, HistoryEntry, HistoryChange } from "api/tokenConfig";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

// Helper para formatear duracion en formato legible
const formatDuration = (duration: string): string => {
	const match = duration.match(/^(\d+)([smhd])$/);
	if (!match) return duration;

	const value = parseInt(match[1]);
	const unit = match[2];

	const unitNames: Record<string, string> = {
		s: value === 1 ? "segundo" : "segundos",
		m: value === 1 ? "minuto" : "minutos",
		h: value === 1 ? "hora" : "horas",
		d: value === 1 ? "dia" : "dias",
	};

	return `${value} ${unitNames[unit]}`;
};

// Helper para formatear milisegundos
const formatMs = (ms: number): string => {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
	if (ms < 3600000) return `${(ms / 60000).toFixed(0)}min`;
	if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
	return `${(ms / 86400000).toFixed(1)}d`;
};

const TokenConfigPage = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [configData, setConfigData] = useState<TokenConfigResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [editMode, setEditMode] = useState(false);
	const [noConfig, setNoConfig] = useState(false);

	// Estados editables
	const [accessTokenDev, setAccessTokenDev] = useState("");
	const [accessTokenProd, setAccessTokenProd] = useState("");
	const [refreshTokenDev, setRefreshTokenDev] = useState("");
	const [refreshTokenProd, setRefreshTokenProd] = useState("");
	const [reason, setReason] = useState("");

	const fetchConfig = async () => {
		try {
			setLoading(true);
			setError(null);
			setNoConfig(false);

			const response = await TokenConfigService.getTokenConfig();

			if (response.success) {
				setConfigData(response);
				// Cargar valores en los estados editables
				setAccessTokenDev(response.data.authTokens.accessToken.development);
				setAccessTokenProd(response.data.authTokens.accessToken.production);
				setRefreshTokenDev(response.data.authTokens.refreshToken.development);
				setRefreshTokenProd(response.data.authTokens.refreshToken.production);
			} else if (response.defaults) {
				// No hay config en BD, mostrar defaults
				setNoConfig(true);
				setConfigData(null);
				setAccessTokenDev(response.defaults.accessToken.development);
				setAccessTokenProd(response.defaults.accessToken.production);
				setRefreshTokenDev(response.defaults.refreshToken.development);
				setRefreshTokenProd(response.defaults.refreshToken.production);
			}
		} catch (err: any) {
			const errorMessage = err.message || "Error al cargar la configuracion";
			setError(errorMessage);
			enqueueSnackbar(errorMessage, { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConfig();
	}, []);

	const handleSave = async () => {
		try {
			setSaving(true);

			const params: UpdateTokenConfigParams = {
				accessToken: {
					development: accessTokenDev,
					production: accessTokenProd,
				},
				refreshToken: {
					development: refreshTokenDev,
					production: refreshTokenProd,
				},
				reason: reason.trim() || undefined,
			};

			const response = await TokenConfigService.updateTokenConfig(params);

			if (response.success) {
				enqueueSnackbar(response.message, { variant: "success" });
				setEditMode(false);
				setReason("");
				setNoConfig(false);
				await fetchConfig();
			}
		} catch (err: any) {
			if (err.validationErrors) {
				const errors = err.validationErrors.map((e: any) => `${e.field}: ${e.error}`).join(", ");
				enqueueSnackbar(`Errores de validacion: ${errors}`, { variant: "error" });
			} else {
				enqueueSnackbar(err.message || "Error al guardar configuracion", { variant: "error" });
			}
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (configData) {
			setAccessTokenDev(configData.data.authTokens.accessToken.development);
			setAccessTokenProd(configData.data.authTokens.accessToken.production);
			setRefreshTokenDev(configData.data.authTokens.refreshToken.development);
			setRefreshTokenProd(configData.data.authTokens.refreshToken.production);
		}
		setEditMode(false);
		setReason("");
	};

	const handleInvalidateCache = async () => {
		try {
			const response = await TokenConfigService.invalidateCache();
			enqueueSnackbar(response.message, { variant: "info" });
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al invalidar cache", { variant: "error" });
		}
	};

	// Helper para renderizar cambios del historial
	const renderHistoryChanges = (entry: HistoryEntry) => {
		if ("initial" in entry.changes && entry.changes.initial) {
			return <Chip label="Configuracion inicial" size="small" color="primary" />;
		}

		const changes = entry.changes as HistoryChange;
		const chips: JSX.Element[] = [];

		if (changes.after?.accessToken?.development) {
			chips.push(
				<Chip
					key="access-dev"
					label={`Access Dev: ${changes.before?.accessToken?.development || "?"} → ${changes.after.accessToken.development}`}
					size="small"
					sx={{ mb: 0.5, mr: 0.5 }}
				/>
			);
		}
		if (changes.after?.accessToken?.production) {
			chips.push(
				<Chip
					key="access-prod"
					label={`Access Prod: ${changes.before?.accessToken?.production || "?"} → ${changes.after.accessToken.production}`}
					size="small"
					sx={{ mb: 0.5, mr: 0.5 }}
				/>
			);
		}
		if (changes.after?.refreshToken?.development) {
			chips.push(
				<Chip
					key="refresh-dev"
					label={`Refresh Dev: ${changes.before?.refreshToken?.development || "?"} → ${changes.after.refreshToken.development}`}
					size="small"
					sx={{ mb: 0.5, mr: 0.5 }}
				/>
			);
		}
		if (changes.after?.refreshToken?.production) {
			chips.push(
				<Chip
					key="refresh-prod"
					label={`Refresh Prod: ${changes.before?.refreshToken?.production || "?"} → ${changes.after.refreshToken.production}`}
					size="small"
					sx={{ mb: 0.5, mr: 0.5 }}
				/>
			);
		}

		return <Stack direction="row" flexWrap="wrap">{chips}</Stack>;
	};

	if (loading) {
		return (
			<MainCard>
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			</MainCard>
		);
	}

	if (error && !configData && !noConfig) {
		return (
			<MainCard
				title="Configuracion de Tokens de Autenticacion"
				secondary={
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
						Reintentar
					</Button>
				}
			>
				<Alert severity="error" sx={{ mb: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error al cargar configuracion
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						{error}
					</Typography>
				</Alert>
			</MainCard>
		);
	}

	return (
		<MainCard
			title="Configuracion de Tokens de Autenticacion"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig} disabled={saving}>
						Actualizar
					</Button>
					{!editMode && (
						<Button variant="contained" size="small" startIcon={<Edit size={16} />} onClick={() => setEditMode(true)}>
							Editar
						</Button>
					)}
				</Stack>
			}
		>
			<Stack spacing={3}>
				{/* Alerta si no hay config en BD */}
				{noConfig && (
					<Alert severity="info" icon={<InfoCircle size={20} />}>
						<Typography variant="subtitle2" fontWeight="bold">
							No hay configuracion personalizada
						</Typography>
						<Typography variant="body2">
							El sistema esta usando los valores por defecto. Puedes crear una configuracion personalizada editando los valores.
						</Typography>
					</Alert>
				)}

				{/* Configuracion Actual */}
				<Card variant="outlined">
					<CardContent>
						<Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Timer1 size={20} />
							Configuracion Actual
							{configData?.current?.environment && (
								<Chip
									label={configData.current.environment.toUpperCase()}
									size="small"
									color={configData.current.environment === "production" ? "error" : "warning"}
								/>
							)}
						</Typography>
						<Divider sx={{ mb: 2 }} />
						<Grid container spacing={3}>
							{/* Access Token */}
							<Grid item xs={12} md={6}>
								<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
									<CardContent>
										<Typography variant="subtitle2" color="text.secondary" gutterBottom>
											Access Token
										</Typography>
										<Stack spacing={2}>
											<Box>
												<Typography variant="caption" color="text.secondary">
													Development
												</Typography>
												<Typography variant="h5" color="primary.main">
													{formatDuration(accessTokenDev)}
												</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
													{accessTokenDev}
												</Typography>
											</Box>
											<Divider />
											<Box>
												<Typography variant="caption" color="text.secondary">
													Production
												</Typography>
												<Typography variant="h5" color="primary.main">
													{formatDuration(accessTokenProd)}
												</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
													{accessTokenProd}
												</Typography>
											</Box>
										</Stack>
									</CardContent>
								</Card>
							</Grid>

							{/* Refresh Token */}
							<Grid item xs={12} md={6}>
								<Card sx={{ backgroundColor: "success.lighter", border: 1, borderColor: "success.main" }}>
									<CardContent>
										<Typography variant="subtitle2" color="text.secondary" gutterBottom>
											Refresh Token
										</Typography>
										<Stack spacing={2}>
											<Box>
												<Typography variant="caption" color="text.secondary">
													Development
												</Typography>
												<Typography variant="h5" color="success.main">
													{formatDuration(refreshTokenDev)}
												</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
													{refreshTokenDev}
												</Typography>
											</Box>
											<Divider />
											<Box>
												<Typography variant="caption" color="text.secondary">
													Production
												</Typography>
												<Typography variant="h5" color="success.main">
													{formatDuration(refreshTokenProd)}
												</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
													{refreshTokenProd}
												</Typography>
											</Box>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* Info del Cache */}
				{configData?.cacheInfo && (
					<Card variant="outlined">
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Stack direction="row" spacing={2} alignItems="center">
									<Clock size={20} />
									<Box>
										<Typography variant="subtitle2">Cache de Configuracion</Typography>
										<Typography variant="caption" color="text.secondary">
											Duracion: {configData.cacheInfo.cacheDuration} | {configData.cacheInfo.note}
										</Typography>
									</Box>
								</Stack>
								<Tooltip title="Solicitar invalidacion del cache">
									<Button variant="outlined" size="small" onClick={handleInvalidateCache}>
										Invalidar Cache
									</Button>
								</Tooltip>
							</Stack>
						</CardContent>
					</Card>
				)}

				{/* Formulario de Edicion */}
				{editMode && (
					<Card variant="outlined" sx={{ backgroundColor: "warning.lighter" }}>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Editar Configuracion
							</Typography>
							<Alert severity="warning" sx={{ mb: 3 }}>
								<Typography variant="body2">
									<strong>Formatos validos:</strong> 30m (minutos), 1h (horas), 7d (dias), 60s (segundos)
								</Typography>
							</Alert>
							<Divider sx={{ mb: 3 }} />
							<Grid container spacing={3}>
								<Grid item xs={12}>
									<Typography variant="subtitle2" gutterBottom>
										Access Token
									</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Development"
										value={accessTokenDev}
										onChange={(e) => setAccessTokenDev(e.target.value)}
										placeholder="30m"
										size="small"
										InputProps={{
											endAdornment: <InputAdornment position="end">{formatDuration(accessTokenDev)}</InputAdornment>,
										}}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Production"
										value={accessTokenProd}
										onChange={(e) => setAccessTokenProd(e.target.value)}
										placeholder="30m"
										size="small"
										InputProps={{
											endAdornment: <InputAdornment position="end">{formatDuration(accessTokenProd)}</InputAdornment>,
										}}
									/>
								</Grid>

								<Grid item xs={12}>
									<Typography variant="subtitle2" gutterBottom>
										Refresh Token
									</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Development"
										value={refreshTokenDev}
										onChange={(e) => setRefreshTokenDev(e.target.value)}
										placeholder="7d"
										size="small"
										InputProps={{
											endAdornment: <InputAdornment position="end">{formatDuration(refreshTokenDev)}</InputAdornment>,
										}}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Production"
										value={refreshTokenProd}
										onChange={(e) => setRefreshTokenProd(e.target.value)}
										placeholder="7d"
										size="small"
										InputProps={{
											endAdornment: <InputAdornment position="end">{formatDuration(refreshTokenProd)}</InputAdornment>,
										}}
									/>
								</Grid>

								<Grid item xs={12}>
									<TextField
										fullWidth
										label="Motivo del cambio (opcional)"
										value={reason}
										onChange={(e) => setReason(e.target.value)}
										placeholder="Ej: Aumentar duracion para mejorar UX"
										size="small"
										multiline
										rows={2}
									/>
								</Grid>

								<Grid item xs={12}>
									<Stack direction="row" spacing={2} justifyContent="flex-end">
										<Button variant="outlined" onClick={handleCancel} disabled={saving}>
											Cancelar
										</Button>
										<Button
											variant="contained"
											color="primary"
											onClick={handleSave}
											disabled={saving}
											startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save2 size={16} />}
										>
											{saving ? "Guardando..." : "Guardar Cambios"}
										</Button>
									</Stack>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				)}

				{/* Historial */}
				{configData?.data?.history && configData.data.history.length > 0 && (
					<Card variant="outlined">
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Historial de Cambios
							</Typography>
							<Divider sx={{ mb: 2 }} />
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fecha</TableCell>
											<TableCell>Cambios</TableCell>
											<TableCell>Motivo</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{configData.data.history
											.slice()
											.reverse()
											.slice(0, 10)
											.map((entry, index) => (
												<TableRow key={index}>
													<TableCell>
														<Typography variant="caption">
															{dayjs(entry.changedAt).format("DD/MM/YYYY HH:mm")}
														</Typography>
														<br />
														<Typography variant="caption" color="text.secondary">
															{dayjs(entry.changedAt).fromNow()}
														</Typography>
													</TableCell>
													<TableCell>{renderHistoryChanges(entry)}</TableCell>
													<TableCell>
														<Typography variant="caption">{entry.reason || "-"}</Typography>
													</TableCell>
												</TableRow>
											))}
									</TableBody>
								</Table>
							</TableContainer>
						</CardContent>
					</Card>
				)}

				{/* Info adicional */}
				<Alert severity="info" icon={<InfoCircle size={20} />}>
					<Typography variant="body2">
						<strong>Nota:</strong> Los cambios en la configuracion de tokens se aplicaran automaticamente en un maximo de 5 minutos
						debido al sistema de cache del servidor. Los usuarios que ya tienen tokens activos no se veran afectados hasta que sus
						tokens expiren y se generen nuevos.
					</Typography>
				</Alert>
			</Stack>
		</MainCard>
	);
};

export default TokenConfigPage;
