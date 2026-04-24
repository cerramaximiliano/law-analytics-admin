/**
 * Vista admin paralela a `/admin/causas/synced-credentials` (PJN) pero para
 * SCBA. Lista las causas scba agrupadas por credencial, con filtros, summary
 * y modal con el JSON completo. Alimentada por /api/scba-causas/synced-causas.
 */
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
	TextField,
	InputAdornment,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import scbaCausasService, { ScbaSyncedCausa, ScbaSyncedCausasSummary } from "api/scbaCausas";
import scbaCredentialsService, { ScbaCredential } from "api/scbaCredentials";
import { Refresh, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, Repeat, Eye } from "iconsax-react";

dayjs.locale("es");

const SYNC_STATUS_COLORS: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
	completed: "success",
	in_progress: "info",
	pending: "warning",
	error: "error",
	never_synced: "default",
};

const SYNC_STATUS_LABELS: Record<string, string> = {
	completed: "Completado",
	in_progress: "En progreso",
	pending: "Pendiente",
	error: "Error",
	never_synced: "Nunca sync",
};

const LIST_STATUS_COLORS: Record<string, "success" | "error" | "default"> = {
	active: "success",
	removed: "error",
};

const LIST_STATUS_LABELS: Record<string, string> = {
	active: "Activa",
	removed: "Removida",
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

const getTodayUpdateInfo = (causa: ScbaSyncedCausa): { isToday: boolean; count: number; hours: number[] } => {
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

const CausasMEVByCredential = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Estados principales
	const [causas, setCausas] = useState<ScbaSyncedCausa[]>([]);
	const [summary, setSummary] = useState<ScbaSyncedCausasSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros
	const [credentialId, setCredentialId] = useState<string>("");
	const [movementsFilter, setMovementsFilter] = useState<string>("");
	const [sortBy, setSortBy] = useState<string>("lastUpdate");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [soloActive, setSoloActive] = useState<boolean>(false);
	const [search, setSearch] = useState<string>("");

	// Credenciales para el dropdown
	const [credentialsList, setCredentialsList] = useState<ScbaCredential[]>([]);

	// Modal JSON
	const [jsonModalOpen, setJsonModalOpen] = useState(false);
	const [selectedCausa, setSelectedCausa] = useState<ScbaSyncedCausa | null>(null);
	const [fullDoc, setFullDoc] = useState<Record<string, unknown> | null>(null);
	const [loadingDoc, setLoadingDoc] = useState(false);

	// Cargar credenciales para dropdown
	useEffect(() => {
		const loadCredentials = async () => {
			try {
				const response = await scbaCredentialsService.getCredentials({ limit: 100 });
				if (response.success) {
					setCredentialsList(response.data);
				}
			} catch (error) {
				console.error("Error cargando credenciales SCBA:", error);
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
			if (movementsFilter) params.hasMovements = movementsFilter;
			if (soloActive) params.soloActive = "true";
			if (search.trim()) params.search = search.trim();

			const response = await scbaCausasService.getSyncedCausas(params);

			if (response.success) {
				setCausas(response.data);
				setSummary(response.summary);
				setTotalCount(response.pagination.total);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar causas SCBA sincronizadas", {
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, rowsPerPage, sortBy, sortOrder, soloActive]);

	// Handlers
	const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
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
		setMovementsFilter("");
		setSoloActive(false);
		setSearch("");
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

	const handleOpenJson = async (causa: ScbaSyncedCausa) => {
		setSelectedCausa(causa);
		setFullDoc(null);
		setJsonModalOpen(true);
		try {
			setLoadingDoc(true);
			const response = await scbaCausasService.getSyncedCausaById(causa._id);
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

	return (
		<>
			<MainCard title="Causas SCBA por Credencial">
				{/* Summary Cards */}
				{summary && (
					<Box sx={{ mb: 3 }}>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={2}>
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
							<Grid item xs={12} sm={6} md={2}>
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
							<Grid item xs={12} sm={6} md={2}>
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
							<Grid item xs={12} sm={6} md={2}>
								<Card sx={{ backgroundColor: "error.lighter", border: 1, borderColor: "error.main" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Removidas
										</Typography>
										<Typography variant="h4" color="error.main" fontWeight="bold">
											{summary.removed.toLocaleString()}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card sx={{ border: 1, borderColor: "divider" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Actualizadas hoy
										</Typography>
										<Typography variant="h4" fontWeight="bold">
											{summary.updatedToday.toLocaleString()}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card sx={{ border: 1, borderColor: "divider" }}>
									<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Typography variant="body2" color="text.secondary">
											Credenciales
										</Typography>
										<Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
											{summary.syncStatus.completed > 0 && (
												<Chip label={`${summary.syncStatus.completed} ok`} size="small" color="success" sx={{ height: 22 }} />
											)}
											{summary.syncStatus.in_progress > 0 && (
												<Chip label={`${summary.syncStatus.in_progress} prog`} size="small" color="info" sx={{ height: 22 }} />
											)}
											{summary.syncStatus.pending > 0 && (
												<Chip label={`${summary.syncStatus.pending} pend`} size="small" color="warning" sx={{ height: 22 }} />
											)}
											{summary.syncStatus.error > 0 && (
												<Chip label={`${summary.syncStatus.error} err`} size="small" color="error" sx={{ height: 22 }} />
											)}
											{summary.syncStatus.never_synced > 0 && (
												<Chip label={`${summary.syncStatus.never_synced} n/s`} size="small" sx={{ height: 22 }} />
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

						<FormControl size="small" sx={{ minWidth: 160 }}>
							<InputLabel>Movimientos</InputLabel>
							<Select value={movementsFilter} onChange={(e) => setMovementsFilter(e.target.value)} label="Movimientos">
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="true">Con movimientos</MenuItem>
								<MenuItem value="false">Sin movimientos</MenuItem>
							</Select>
						</FormControl>

						<TextField
							size="small"
							placeholder="Buscar número SCBA o carátula"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleSearch();
							}}
							sx={{ minWidth: 240 }}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchNormal1 size={16} />
									</InputAdornment>
								),
							}}
						/>

						<Tooltip title={sortOrder === "asc" ? "Ascendente" : "Descendente"}>
							<IconButton onClick={handleSortOrderToggle} size="small">
								{sortOrder === "asc" ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
							</IconButton>
						</Tooltip>

						<FormControl size="small" sx={{ minWidth: 140 }}>
							<InputLabel>Orden</InputLabel>
							<Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Orden">
								<MenuItem value="lastUpdate">Última Act.</MenuItem>
								<MenuItem value="fechaUltimoMovimiento">Últ. Movimiento</MenuItem>
								<MenuItem value="movimientosCount">Movimientos</MenuItem>
								<MenuItem value="createdAt">Fecha alta</MenuItem>
								<MenuItem value="year">Año</MenuItem>
							</Select>
						</FormControl>

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
									checked={soloActive}
									onChange={(e) => {
										setSoloActive(e.target.checked);
										setPage(0);
									}}
									size="small"
								/>
							}
							label={<Typography variant="body2">Solo activas (listStatus=active)</Typography>}
						/>
					</Stack>
				</Box>

				{/* Tabla */}
				{loading ? (
					<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
						<CircularProgress />
					</Box>
				) : causas.length === 0 ? (
					<Alert severity="info">No se encontraron causas SCBA con los filtros seleccionados</Alert>
				) : (
					<Card>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Expediente</TableCell>
										<TableCell>Departamento</TableCell>
										<TableCell>Carátula</TableCell>
										<TableCell>Juzgado</TableCell>
										<TableCell align="center">Movimientos</TableCell>
										<TableCell>Última Act.</TableCell>
										<TableCell>Últ. Movimiento</TableCell>
										<TableCell>Credencial</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell align="center">Acciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{causas.map((causa) => {
										const syncStatus = causa.credential.syncStatus || "never_synced";
										return (
											<TableRow key={causa._id} hover>
												<TableCell sx={{ minWidth: 160 }}>
													<Stack spacing={0.5}>
														<Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
															{causa.scbaNumber || `${causa.number || "?"}/${causa.year || "?"}`}
														</Typography>
														{causa.folder?.listRemoved && (
															<Tooltip
																title={
																	causa.folder.listRemovedAt
																		? `Detectado ${formatDate(causa.folder.listRemovedAt)} — ya no aparece en "Mis Causas" del portal ${(causa.folder.listRemovedSource || "SCBA").toUpperCase()}`
																		: `No aparece en "Mis Causas" del portal ${(causa.folder.listRemovedSource || "SCBA").toUpperCase()}`
																}
															>
																<Chip label="No en portal" color="warning" size="small" variant="outlined" sx={{ width: "fit-content" }} />
															</Tooltip>
														)}
													</Stack>
												</TableCell>
												<TableCell>
													<Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
														{causa.scbaDepartamento || "—"}
													</Typography>
												</TableCell>
												<TableCell sx={{ maxWidth: 260 }}>
													<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
														{causa.caratula || causa.scbaCaratula || "Sin carátula"}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>
														{causa.scbaJuzgado || "—"}
													</Typography>
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
													<Stack spacing={0.5} alignItems="center">
														<Chip
															label={SYNC_STATUS_LABELS[syncStatus] || syncStatus}
															color={SYNC_STATUS_COLORS[syncStatus] || "default"}
															size="small"
														/>
														{causa.listStatus && (
															<Chip
																label={LIST_STATUS_LABELS[causa.listStatus] || causa.listStatus}
																color={LIST_STATUS_COLORS[causa.listStatus] || "default"}
																size="small"
																variant="outlined"
																sx={{ height: 20, fontSize: "0.65rem" }}
															/>
														)}
													</Stack>
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Ver JSON">
														<IconButton size="small" onClick={() => handleOpenJson(causa)}>
															<Eye size={18} />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										);
									})}
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
						<Typography variant="h6">
							JSON — {selectedCausa?.scbaNumber || `${selectedCausa?.number ?? ""}/${selectedCausa?.year ?? ""}`}
						</Typography>
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
		</>
	);
};

export default CausasMEVByCredential;
