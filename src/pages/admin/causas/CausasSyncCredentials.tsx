import { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
	Button,
	Checkbox,
	FormControlLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	useTheme,
	alpha,
} from "@mui/material";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import pjnCredentialsService, { SyncedCausa, SyncedCausasSummary, PjnCredential, CausaScreenshotEntry } from "api/pjnCredentials";
import { Refresh, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, Repeat, Eye, Gallery } from "iconsax-react";

dayjs.locale("es");

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seg. Social",
	CNT: "Trabajo",
};

const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
};

const INITIAL_SYNC_COLORS: Record<string, "success" | "info" | "warning" | "default"> = {
	completed: "success",
	in_progress: "info",
	pending: "warning",
};

const INITIAL_SYNC_LABELS: Record<string, string> = {
	completed: "Completado",
	in_progress: "En progreso",
	pending: "Pendiente",
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
	empty_movements: "Sin movimientos",
	search_error: "Error de búsqueda",
	scraping_error: "Error de scraping",
	degraded_scrape: "Scrape degradado",
	processing_exception: "Excepción procesando",
	login_error: "Error de login",
	other: "Otro",
};

const INCIDENT_TYPE_COLORS: Record<string, "default" | "warning" | "error" | "info"> = {
	empty_movements: "warning",
	search_error: "error",
	scraping_error: "error",
	degraded_scrape: "warning",
	processing_exception: "error",
	login_error: "error",
	other: "default",
};

const getArgentinaDate = (): string => {
	const now = new Date();
	const argentinaOffset = -3 * 60;
	const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
	let argentinaHour = Math.floor((utcMinutes + argentinaOffset) / 60);
	let dayOffset = 0;
	if (argentinaHour < 0) dayOffset = -1;
	else if (argentinaHour >= 24) dayOffset = 1;
	const argentinaDate = new Date(now);
	argentinaDate.setUTCDate(argentinaDate.getUTCDate() + dayOffset);
	const year = argentinaDate.getUTCFullYear();
	const month = String(argentinaDate.getUTCMonth() + 1).padStart(2, "0");
	const day = String(argentinaDate.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getTodayUpdateInfo = (causa: SyncedCausa): { isToday: boolean; count: number; hours: number[] } => {
	const stats = causa.updateStats?.today;
	if (!stats || !stats.date) {
		return { isToday: false, count: 0, hours: [] };
	}
	const today = getArgentinaDate();
	const isToday = stats.date === today;
	return {
		isToday,
		count: isToday ? stats.count || 0 : 0,
		hours: isToday ? stats.hours || [] : [],
	};
};

const formatHoursTooltip = (hours: number[]): string => {
	if (hours.length === 0) return "";
	const sortedHours = [...hours].sort((a, b) => a - b);
	const formatted = sortedHours.map((h) => `${h.toString().padStart(2, "0")}:00`);
	return `Actualizado a las ${formatted.join(", ")}`;
};

const CausasSyncCredentials = () => {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	// Estados principales
	const [causas, setCausas] = useState<SyncedCausa[]>([]);
	const [summary, setSummary] = useState<SyncedCausasSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros
	const [credentialId, setCredentialId] = useState<string>("");
	const [fueroFilter, setFueroFilter] = useState<string>("");
	const [movementsFilter, setMovementsFilter] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("year");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [soloElegibles, setSoloElegibles] = useState<boolean>(false);

	// Credenciales para el dropdown
	const [credentialsList, setCredentialsList] = useState<PjnCredential[]>([]);

	// Modal JSON
	const [jsonModalOpen, setJsonModalOpen] = useState(false);
	const [selectedCausa, setSelectedCausa] = useState<SyncedCausa | null>(null);
	const [fullDoc, setFullDoc] = useState<Record<string, unknown> | null>(null);
	const [loadingDoc, setLoadingDoc] = useState(false);

	// Modal de capturas de incidencias (screenshots S3, incl. causas sin movimientos)
	const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
	const [screenshotCausa, setScreenshotCausa] = useState<SyncedCausa | null>(null);
	const [screenshots, setScreenshots] = useState<CausaScreenshotEntry[]>([]);
	const [loadingScreenshots, setLoadingScreenshots] = useState(false);

	// Cargar credenciales para dropdown (al montar)
	useEffect(() => {
		const loadCredentials = async () => {
			try {
				const response = await pjnCredentialsService.getCredentials({ limit: 100 });
				if (response.success) {
					setCredentialsList(response.data);
				}
			} catch (error) {
				console.error("Error cargando credenciales:", error);
			}
		};
		loadCredentials();
	}, []);

	// Fetch principal
	const fetchCausas = async () => {
		try {
			setLoading(true);
			const params: any = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy,
				sortOrder,
			};
			if (credentialId) params.credentialId = credentialId;
			if (fueroFilter) params.fuero = fueroFilter;
			if (movementsFilter) params.hasMovements = movementsFilter;
			if (soloElegibles) params.soloElegibles = true;

			const response = await pjnCredentialsService.getSyncedCausas(params);

			if (response.success) {
				setCausas(response.data);
				setSummary(response.summary);
				setTotalCount(response.pagination.total);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar causas sincronizadas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchCausas();
	}, [page, rowsPerPage, sortBy, sortOrder, soloElegibles]);

	// Handlers
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleSearch = () => {
		setPage(0);
		fetchCausas();
	};

	const handleClear = () => {
		setCredentialId("");
		setFueroFilter("");
		setMovementsFilter("");
		setSoloElegibles(false);
		setPage(0);
	};

	const handleSortOrderToggle = () => {
		setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		setPage(0);
	};

	const formatDate = (date: string | null | undefined): string => {
		if (!date) return "—";
		return dayjs(date).format("DD/MM/YYYY");
	};

	const handleOpenJson = async (causa: SyncedCausa) => {
		setSelectedCausa(causa);
		setFullDoc(null);
		setJsonModalOpen(true);
		try {
			setLoadingDoc(true);
			const response = await pjnCredentialsService.getSyncedCausaById(causa._id, causa.fuero);
			if (response.success) {
				setFullDoc(response.data);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar el documento completo", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoadingDoc(false);
		}
	};

	const handleCloseJson = () => {
		setJsonModalOpen(false);
		setSelectedCausa(null);
		setFullDoc(null);
	};

	const handleOpenScreenshots = async (causa: SyncedCausa) => {
		setScreenshotCausa(causa);
		setScreenshots([]);
		setScreenshotModalOpen(true);
		try {
			setLoadingScreenshots(true);
			const response = await pjnCredentialsService.getCausaScreenshots(causa._id);
			if (response.success) {
				setScreenshots(response.data);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las capturas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoadingScreenshots(false);
		}
	};

	const handleCloseScreenshots = () => {
		setScreenshotModalOpen(false);
		setScreenshotCausa(null);
		setScreenshots([]);
	};

	return (
		<>
			<MainCard title="Causas Sincronizadas por Credenciales">
				{/* Summary Cards */}
				{summary && (
					<Box sx={{ mb: 3 }}>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={2.4}>
								<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Total Causas
										</Typography>
										<Typography variant="h4" color="primary.main" fontWeight="bold">
											{summary.totalCausas.toLocaleString()}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2.4}>
								<Card sx={{ backgroundColor: "success.lighter", border: 1, borderColor: "success.main" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Con Movimientos
										</Typography>
										<Typography variant="h4" color="success.main" fontWeight="bold">
											{summary.withMovements.toLocaleString()}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2.4}>
								<Card sx={{ backgroundColor: "warning.lighter", border: 1, borderColor: "warning.main" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Sin Movimientos
										</Typography>
										<Typography variant="h4" color="warning.main" fontWeight="bold">
											{summary.withoutMovements.toLocaleString()}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2.4}>
								<Card sx={{ border: 1, borderColor: "divider" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Credenciales
										</Typography>
										<Typography variant="h4" fontWeight="bold">
											{summary.credentialsCount}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2.4}>
								<Card sx={{ border: 1, borderColor: "divider" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Initial Sync
										</Typography>
										<Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
											{summary.initialSyncStatus.completed > 0 && (
												<Chip label={`${summary.initialSyncStatus.completed} ok`} size="small" color="success" sx={{ height: 22 }} />
											)}
											{summary.initialSyncStatus.in_progress > 0 && (
												<Chip label={`${summary.initialSyncStatus.in_progress} prog`} size="small" color="info" sx={{ height: 22 }} />
											)}
											{summary.initialSyncStatus.pending > 0 && (
												<Chip label={`${summary.initialSyncStatus.pending} pend`} size="small" color="warning" sx={{ height: 22 }} />
											)}
											{summary.initialSyncStatus.none > 0 && (
												<Chip label={`${summary.initialSyncStatus.none} n/a`} size="small" sx={{ height: 22 }} />
											)}
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					</Box>
				)}

				{/* Filtros */}
				<Box sx={{ mb: 2 }}>
					<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ "& > *": { my: 0.5 } }}>
						<FormControl size="small" sx={{ minWidth: 220 }}>
							<InputLabel>Credencial</InputLabel>
							<Select value={credentialId} onChange={(e) => setCredentialId(e.target.value)} label="Credencial">
								<MenuItem value="">Todas</MenuItem>
								{credentialsList.map((cred) => (
									<MenuItem key={cred._id} value={cred._id}>
										{cred.userName} ({cred.userEmail})
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl size="small" sx={{ minWidth: 140 }}>
							<InputLabel>Fuero</InputLabel>
							<Select value={fueroFilter} onChange={(e) => setFueroFilter(e.target.value)} label="Fuero">
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="CIV">Civil</MenuItem>
								<MenuItem value="COM">Comercial</MenuItem>
								<MenuItem value="CNT">Trabajo</MenuItem>
								<MenuItem value="CSS">Seg. Social</MenuItem>
							</Select>
						</FormControl>

						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Movimientos</InputLabel>
							<Select value={movementsFilter} onChange={(e) => setMovementsFilter(e.target.value)} label="Movimientos">
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="true">Con movimientos</MenuItem>
								<MenuItem value="false">Sin movimientos</MenuItem>
							</Select>
						</FormControl>

						<Tooltip title={sortOrder === "asc" ? "Ascendente" : "Descendente"}>
							<IconButton onClick={handleSortOrderToggle} size="small">
								{sortOrder === "asc" ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
							</IconButton>
						</Tooltip>

						<Button variant="contained" startIcon={<SearchNormal1 size={18} />} onClick={handleSearch} disabled={loading} size="small">
							Buscar
						</Button>
						<Button variant="outlined" startIcon={<CloseCircle size={18} />} onClick={handleClear} disabled={loading} size="small">
							Limpiar
						</Button>
						<Tooltip title="Actualizar">
							<IconButton onClick={fetchCausas} disabled={loading} size="small">
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
						<FormControlLabel
							control={
								<Checkbox
									checked={soloElegibles}
									onChange={(e) => {
										setSoloElegibles(e.target.checked);
										setPage(0);
									}}
									size="small"
								/>
							}
							label={<Typography variant="body2">Solo elegibles para actualización</Typography>}
						/>
					</Stack>
				</Box>

				{/* Tabla */}
				{loading ? (
					<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
						<CircularProgress />
					</Box>
				) : causas.length === 0 ? (
					<Alert severity="info">No se encontraron causas sincronizadas con los filtros seleccionados</Alert>
				) : (
					<Card
						elevation={0}
						sx={{
							border: `1px solid ${headerBorder(isDark)}`,
							borderRadius: 2,
						}}
					>
						<TableContainer sx={{ maxHeight: "calc(100dvh - 400px)" }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow
										sx={{
											"& .MuiTableCell-head": {
												bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04),
												borderBottom: `1px solid ${headerBorder(isDark)}`,
												fontSize: "0.72rem",
												fontWeight: 600,
												textTransform: "uppercase",
												letterSpacing: "0.04em",
												color: "text.secondary",
											},
										}}
									>
										<TableCell>Expediente</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell>Carátula</TableCell>
										<TableCell>Source</TableCell>
										<TableCell align="center">Movimientos</TableCell>
										<TableCell>Última act.</TableCell>
										<TableCell>Últ. movimiento</TableCell>
										<TableCell>Credencial</TableCell>
										<TableCell align="center">Initial sync</TableCell>
										<TableCell align="center">Acciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{causas.map((causa) => (
										<TableRow
											key={causa._id}
											hover
											sx={{
												transition: "background-color 150ms ease",
												"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) },
											}}
										>
											<TableCell>
												<Stack spacing={0.5}>
													<Typography
														variant="body2"
														fontWeight={600}
														sx={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}
													>
														{causa.number}/{causa.year}
													</Typography>
													{causa.folder?.listRemoved && (
														<Tooltip
															title={
																causa.folder.listRemovedAt
																	? `Detectado ${formatDate(causa.folder.listRemovedAt)} — ya no aparece en "Mis Causas" del portal ${(
																			causa.folder.listRemovedSource || "PJN"
																	  ).toUpperCase()}`
																	: `No aparece en "Mis Causas" del portal ${(causa.folder.listRemovedSource || "PJN").toUpperCase()}`
															}
														>
															<Chip label="No en portal" color="warning" size="small" variant="outlined" sx={{ width: "fit-content" }} />
														</Tooltip>
													)}
												</Stack>
											</TableCell>
											<TableCell>
												<Chip
													label={FUERO_LABELS[causa.fuero] || causa.fuero}
													color={FUERO_COLORS[causa.fuero] || "default"}
													size="small"
													sx={{
														...(causa.fuero === "CSS" && { color: "text.primary" }),
													}}
												/>
											</TableCell>
											<TableCell sx={{ maxWidth: 250 }}>
												<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
													{causa.caratula || "Sin carátula"}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={causa.source || "N/A"} size="small" variant="outlined" />
											</TableCell>
											<TableCell align="center">
												<Chip
													label={causa.movimientosCount || 0}
													size="small"
													color={(causa.movimientosCount || 0) > 0 ? "success" : "default"}
													variant={(causa.movimientosCount || 0) > 0 ? "filled" : "outlined"}
												/>
											</TableCell>
											<TableCell>
												{(() => {
													const todayInfo = getTodayUpdateInfo(causa);
													return (
														<Stack direction="row" alignItems="center" spacing={0.5}>
															<Typography variant="caption">{formatDate(causa.lastUpdate)}</Typography>
															{todayInfo.isToday && todayInfo.count > 0 && (
																<Tooltip title={formatHoursTooltip(todayInfo.hours)}>
																	<Chip
																		icon={<Repeat size={14} />}
																		label={todayInfo.count}
																		size="small"
																		sx={{
																			height: 22,
																			minWidth: 40,
																			fontSize: "0.75rem",
																			fontWeight: 700,
																			backgroundColor: "success.main",
																			color: "common.white",
																			"& .MuiChip-icon": {
																				color: "common.white",
																				marginLeft: "6px",
																			},
																			"& .MuiChip-label": {
																				paddingLeft: "4px",
																				paddingRight: "8px",
																			},
																		}}
																	/>
																</Tooltip>
															)}
														</Stack>
													);
												})()}
											</TableCell>
											<TableCell>
												<Typography variant="caption">{formatDate(causa.fechaUltimoMovimiento)}</Typography>
											</TableCell>
											<TableCell>
												<Stack>
													<Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
														{causa.credential.userName}
													</Typography>
													<Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
														{causa.credential.userEmail}
													</Typography>
													{causa.credential.removedFromSync && (
														<Tooltip
															title={
																causa.credential.removedAt
																	? `Retirada el ${formatDate(causa.credential.removedAt)}`
																	: "Retirada del listado"
															}
														>
															<Chip label="Retirada" color="error" size="small" variant="outlined" sx={{ mt: 0.5, width: "fit-content" }} />
														</Tooltip>
													)}
												</Stack>
											</TableCell>
											<TableCell align="center">
												{causa.credential.initialMovementsSync ? (
													<Chip
														label={INITIAL_SYNC_LABELS[causa.credential.initialMovementsSync] || causa.credential.initialMovementsSync}
														color={INITIAL_SYNC_COLORS[causa.credential.initialMovementsSync] || "default"}
														size="small"
													/>
												) : (
													<Chip label="N/A" size="small" variant="outlined" />
												)}
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													<Tooltip
														title={
															(causa.movimientosCount || 0) === 0
																? "Ver captura (causa sin movimientos / incidencias)"
																: "Ver capturas de incidencias"
														}
													>
														<IconButton
															size="small"
															color={(causa.movimientosCount || 0) === 0 ? "warning" : "default"}
															onClick={() => handleOpenScreenshots(causa)}
														>
															<Gallery size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Ver JSON">
														<IconButton size="small" onClick={() => handleOpenJson(causa)}>
															<Eye size={18} />
														</IconButton>
													</Tooltip>
												</Stack>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						<EnhancedTablePagination
							rowsPerPageOptions={[10, 25, 50, 100]}
							count={totalCount}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={handleChangePage}
							onRowsPerPageChange={handleChangeRowsPerPage}
						/>
					</Card>
				)}
			</MainCard>

			{/* Modal JSON */}

			<Dialog open={jsonModalOpen} onClose={handleCloseJson} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="h6">JSON — {`${selectedCausa?.number ?? ""}/${selectedCausa?.year ?? ""}`}</Typography>
						<IconButton onClick={handleCloseJson} size="small">
							<CloseCircle size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent dividers>
					{loadingDoc ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
							<CircularProgress />
						</Box>
					) : (
						<Box
							component="pre"
							sx={{
								m: 0,
								p: 2,
								backgroundColor: "grey.900",
								color: "common.white",
								borderRadius: 1,
								fontSize: "0.75rem",
								overflowX: "auto",
								whiteSpace: "pre-wrap",
								wordBreak: "break-all",
								fontFamily: "monospace",
							}}
						>
							{fullDoc ? JSON.stringify(fullDoc, null, 2) : ""}
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseJson} variant="outlined" size="small">
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal capturas de incidencias (S3, incl. causas sin movimientos) */}
			<Dialog open={screenshotModalOpen} onClose={handleCloseScreenshots} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography variant="h6">
							Capturas — {`${screenshotCausa?.number ?? ""}/${screenshotCausa?.year ?? ""}`}
						</Typography>
						<IconButton onClick={handleCloseScreenshots} size="small">
							<CloseCircle size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent dividers>
					{loadingScreenshots ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
							<CircularProgress />
						</Box>
					) : screenshots.length === 0 ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight={160}>
							<Typography variant="body2" color="text.secondary">
								No hay capturas registradas para esta causa.
							</Typography>
						</Box>
					) : (
						<Stack spacing={2}>
							{screenshots.map((shot) => (
								<Card key={shot._id} variant="outlined" sx={{ p: 1.5 }}>
									<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
										<Chip
											label={INCIDENT_TYPE_LABELS[shot.type] || shot.type}
											color={INCIDENT_TYPE_COLORS[shot.type] || "default"}
											size="small"
										/>
										{shot.detectionCount > 1 && (
											<Chip label={`×${shot.detectionCount}`} size="small" variant="outlined" />
										)}
										<Typography variant="caption" color="text.secondary">
											{formatDate(shot.lastSeenAt)}
										</Typography>
										{shot.resolved && <Chip label="Resuelta" color="success" size="small" variant="outlined" />}
									</Stack>
									{shot.errorMessage && (
										<Typography variant="body2" sx={{ mb: 1 }}>
											{shot.errorMessage}
										</Typography>
									)}
									{shot.screenshotUrl ? (
										<Box
											component="a"
											href={shot.screenshotUrl}
											target="_blank"
											rel="noopener noreferrer"
											sx={{ display: "block" }}
										>
											<Box
												component="img"
												src={shot.screenshotUrl}
												alt={INCIDENT_TYPE_LABELS[shot.type] || shot.type}
												sx={{
													width: "100%",
													maxHeight: 460,
													objectFit: "contain",
													borderRadius: 1,
													border: "1px solid",
													borderColor: "divider",
													cursor: "zoom-in",
													bgcolor: "grey.100",
												}}
											/>
										</Box>
									) : (
										<Typography variant="caption" color="text.secondary">
											Sin captura disponible (incidente registrado sin screenshot).
										</Typography>
									)}
								</Card>
							))}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseScreenshots} variant="outlined" size="small">
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default CausasSyncCredentials;
