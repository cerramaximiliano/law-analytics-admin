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
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import pjnCredentialsService, {
	SyncedCausa,
	SyncedCausasSummary,
	PjnCredential,
} from "api/pjnCredentials";
import { Refresh, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, Repeat } from "iconsax-react";

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
		count: isToday ? (stats.count || 0) : 0,
		hours: isToday ? (stats.hours || []) : [],
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

	// Credenciales para el dropdown
	const [credentialsList, setCredentialsList] = useState<PjnCredential[]>([]);

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
	}, [page, rowsPerPage, sortBy, sortOrder]);

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

	return (
		<MainCard title="Causas Sincronizadas por Credenciales">
			{/* Summary Cards */}
			{summary && (
				<Box sx={{ mb: 3 }}>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="body2" color="text.secondary">Total Causas</Typography>
									<Typography variant="h4" color="primary.main" fontWeight="bold">
										{summary.totalCausas.toLocaleString()}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card sx={{ backgroundColor: "success.lighter", border: 1, borderColor: "success.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="body2" color="text.secondary">Con Movimientos</Typography>
									<Typography variant="h4" color="success.main" fontWeight="bold">
										{summary.withMovements.toLocaleString()}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card sx={{ backgroundColor: "warning.lighter", border: 1, borderColor: "warning.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="body2" color="text.secondary">Sin Movimientos</Typography>
									<Typography variant="h4" color="warning.main" fontWeight="bold">
										{summary.withoutMovements.toLocaleString()}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card sx={{ border: 1, borderColor: "divider" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="body2" color="text.secondary">Credenciales</Typography>
									<Typography variant="h4" fontWeight="bold">
										{summary.credentialsCount}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card sx={{ border: 1, borderColor: "divider" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="body2" color="text.secondary">Initial Sync</Typography>
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
						<Select
							value={credentialId}
							onChange={(e) => setCredentialId(e.target.value)}
							label="Credencial"
						>
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
						<Select
							value={fueroFilter}
							onChange={(e) => setFueroFilter(e.target.value)}
							label="Fuero"
						>
							<MenuItem value="">Todos</MenuItem>
							<MenuItem value="CIV">Civil</MenuItem>
							<MenuItem value="COM">Comercial</MenuItem>
							<MenuItem value="CNT">Trabajo</MenuItem>
							<MenuItem value="CSS">Seg. Social</MenuItem>
						</Select>
					</FormControl>

					<FormControl size="small" sx={{ minWidth: 160 }}>
						<InputLabel>Movimientos</InputLabel>
						<Select
							value={movementsFilter}
							onChange={(e) => setMovementsFilter(e.target.value)}
							label="Movimientos"
						>
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

					<Button
						variant="contained"
						startIcon={<SearchNormal1 size={18} />}
						onClick={handleSearch}
						disabled={loading}
						size="small"
					>
						Buscar
					</Button>
					<Button
						variant="outlined"
						startIcon={<CloseCircle size={18} />}
						onClick={handleClear}
						disabled={loading}
						size="small"
					>
						Limpiar
					</Button>
					<Tooltip title="Actualizar">
						<IconButton onClick={fetchCausas} disabled={loading} size="small">
							<Refresh size={20} />
						</IconButton>
					</Tooltip>
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
				<Card>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Expediente</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell>Carátula</TableCell>
									<TableCell>Source</TableCell>
									<TableCell align="center">Movimientos</TableCell>
									<TableCell>Última Act.</TableCell>
									<TableCell>Últ. Movimiento</TableCell>
									<TableCell>Credencial</TableCell>
									<TableCell align="center">Initial Sync</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{causas.map((causa) => (
									<TableRow key={causa._id} hover>
										<TableCell>
											<Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace" }}>
												{causa.number}/{causa.year}
											</Typography>
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
											<Chip
												label={causa.source || "N/A"}
												size="small"
												variant="outlined"
											/>
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
														<Typography variant="caption">
															{formatDate(causa.lastUpdate)}
														</Typography>
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
											<Typography variant="caption">
												{formatDate(causa.fechaUltimoMovimiento)}
											</Typography>
										</TableCell>
										<TableCell>
											<Stack>
												<Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
													{causa.credential.userName}
												</Typography>
												<Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>
													{causa.credential.userEmail}
												</Typography>
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
	);
};

export default CausasSyncCredentials;
