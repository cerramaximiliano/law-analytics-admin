import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControlLabel,
	IconButton,
	InputAdornment,
	Paper,
	Skeleton,
	Stack,
	Switch,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, SearchNormal1, InfoCircle, Clock, TickCircle, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import CausasElegiblesUpdateService, {
	CausaElegible,
	Fuero,
	FUERO_LABELS,
	FueroStats,
} from "api/causasElegiblesUpdate";

const FUEROS: Fuero[] = ["CIV", "COM", "CSS", "CNT"];

const fmtDateTime = (s: string | null | undefined) => {
	if (!s) return "—";
	try {
		return new Date(s).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
	} catch {
		return s;
	}
};

const StatChip = ({ label, value, color }: { label: string; value: number; color?: string }) => (
	<Paper variant="outlined" sx={{ px: 1.5, py: 0.75, minWidth: 110 }}>
		<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
			{label}
		</Typography>
		<Typography variant="h6" fontWeight={700} sx={{ color, lineHeight: 1.3 }}>
			{value.toLocaleString("es-AR")}
		</Typography>
	</Paper>
);

const CausasUpdateEligiblePage = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();

	const [activeFuero, setActiveFuero] = useState<Fuero>("CIV");
	const [stats, setStats] = useState<Record<Fuero, FueroStats> | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	const [rows, setRows] = useState<CausaElegible[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [onlyAvailable, setOnlyAvailable] = useState(false);

	const fetchStats = useCallback(async () => {
		try {
			setStatsLoading(true);
			const res = await CausasElegiblesUpdateService.getStats();
			setStats(res.data);
		} catch (err: any) {
			console.error("Error stats:", err);
			enqueueSnackbar(err?.message || "Error al obtener stats", { variant: "error" });
		} finally {
			setStatsLoading(false);
		}
	}, [enqueueSnackbar]);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const res = await CausasElegiblesUpdateService.getList({
				fuero: activeFuero,
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				onlyAvailable: onlyAvailable || undefined,
			});
			setRows(res.data);
			setTotal(res.pagination.total);
		} catch (err: any) {
			console.error("Error list:", err);
			enqueueSnackbar(err?.message || "Error al obtener listado", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [activeFuero, page, rowsPerPage, search, onlyAvailable, enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const handleFueroChange = (_: any, v: Fuero) => {
		setActiveFuero(v);
		setPage(0);
	};

	const handleSearch = () => {
		setSearch(searchInput.trim());
		setPage(0);
	};

	const currentStats = useMemo(() => stats?.[activeFuero], [stats, activeFuero]);

	return (
		<MainCard>
			<Stack spacing={2}>
				<Box>
					<Typography variant="h3">Causas en Update (worker_01)</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
						Causas elegibles para scraping de movimientos según el criterio del{" "}
						<code>update-movimientos-worker</code>: <code>update=true, verified=true, isValid≠false</code>. Lectura del caché local del
						server donde corre el worker.
					</Typography>
				</Box>

				<RepoBadgeGroup
					repos={[
						{
							localName: "pjn-workers-scraping",
							role: "Worker (consumer)",
							description:
								"src/tasks/update-movimientos-worker.js — el query de elegibilidad replicado en esta vista vive en countEligible() y findAndLock().",
						},
						{
							localName: "pjn-api",
							role: "API (lectura)",
							description:
								"Endpoint /api/causas-elegibles-update sirve la lista paginada y stats. Esta vista lo consume vía VITE_WORKERS_URL apuntando a la pjn-api del worker_01 (DB local).",
						},
					]}
				/>

				{/* Stats globales por fuero */}
				<Paper variant="outlined" sx={{ p: 1.5 }}>
					<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
						<Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>
							Stats {FUERO_LABELS[activeFuero]}:
						</Typography>
						{statsLoading || !currentStats ? (
							<>
								<Skeleton variant="rounded" width={110} height={48} />
								<Skeleton variant="rounded" width={110} height={48} />
								<Skeleton variant="rounded" width={110} height={48} />
								<Skeleton variant="rounded" width={110} height={48} />
							</>
						) : (
							<>
								<StatChip label="Total docs" value={currentStats.total} />
								<StatChip label="Elegibles" value={currentStats.eligibles} color={theme.palette.success.main} />
								<StatChip label="En proceso" value={currentStats.processing} color={theme.palette.info.main} />
								<StatChip label="En cooldown" value={currentStats.cooldown} color={theme.palette.warning.main} />
							</>
						)}
						<Box sx={{ flex: 1 }} />
						<Tooltip title="Refrescar stats">
							<IconButton size="small" onClick={fetchStats} disabled={statsLoading}>
								<Refresh size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Paper>

				{/* Tabs por fuero */}
				<Tabs
					value={activeFuero}
					onChange={handleFueroChange}
					TabIndicatorProps={{ sx: { backgroundColor: BRAND_BLUE, height: 2.5 } }}
					sx={{
						borderBottom: `1px solid ${headerBorder(isDark)}`,
						"& .MuiTab-root": { textTransform: "none", fontWeight: 500, transition: "color 200ms ease" },
						"& .MuiTab-root.Mui-selected": { color: BRAND_BLUE },
					}}
				>
					{FUEROS.map((f) => (
						<Tab
							key={f}
							value={f}
							label={
								<Stack direction="row" spacing={1} alignItems="center">
									<span>{FUERO_LABELS[f]}</span>
									{stats?.[f] && (
										<Chip
											size="small"
											label={stats[f].eligibles.toLocaleString("es-AR")}
											sx={{ fontVariantNumeric: "tabular-nums" }}
										/>
									)}
								</Stack>
							}
						/>
					))}
				</Tabs>

				{/* Filtros */}
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
					<TextField
						size="small"
						placeholder="Buscar por número o carátula"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchNormal1 size={16} />
								</InputAdornment>
							),
							endAdornment: search && (
								<IconButton size="small" onClick={() => { setSearch(""); setSearchInput(""); }}>
									<CloseCircle size={14} />
								</IconButton>
							),
						}}
						sx={{ minWidth: 280 }}
					/>
					<Button size="small" variant="outlined" onClick={handleSearch}>
						Buscar
					</Button>
					<FormControlLabel
						control={<Switch checked={onlyAvailable} onChange={(e) => { setOnlyAvailable(e.target.checked); setPage(0); }} size="small" />}
						label={<Typography variant="caption">Solo disponibles (excluir en proceso y cooldown)</Typography>}
					/>
					<Box sx={{ flex: 1 }} />
					<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchList}>
						Actualizar
					</Button>
				</Stack>

				{/* Tabla */}
				<TableContainer
					component={Paper}
					elevation={0}
					sx={{
						border: `1px solid ${headerBorder(isDark)}`,
						borderRadius: 2,
						maxHeight: "calc(100dvh - 380px)",
					}}
				>
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
								<TableCell>Carátula</TableCell>
								<TableCell>Juzgado</TableCell>
								<TableCell align="center">Movs.</TableCell>
								<TableCell align="center">Folders</TableCell>
								<TableCell align="center">Usuarios</TableCell>
								<TableCell>Last update</TableCell>
								<TableCell align="center">Estado</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 8 }).map((__, j) => (
											<TableCell key={j}>
												<Skeleton variant="text" />
											</TableCell>
										))}
									</TableRow>
								))
							) : rows.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} align="center" sx={{ py: 6 }}>
										<Stack alignItems="center" spacing={1}>
											<InfoCircle size={36} color={theme.palette.text.disabled} />
											<Typography variant="body2" color="text.secondary">
												No hay causas elegibles que coincidan con el filtro
											</Typography>
										</Stack>
									</TableCell>
								</TableRow>
							) : (
								rows.map((c) => (
									<TableRow
										key={c._id}
										hover
										sx={{
											transition: "background-color 150ms ease",
											"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) },
										}}
									>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
												{c.number}/{c.year}
											</Typography>
										</TableCell>
										<TableCell>
											<Tooltip title={c.caratula || ""} placement="top">
												<Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
													{c.caratula || "—"}
												</Typography>
											</Tooltip>
										</TableCell>
										<TableCell>
											<Typography variant="caption" color="text.secondary">
												{c.juzgado || "—"}
											</Typography>
										</TableCell>
										<TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{c.movimientosCount}
										</TableCell>
										<TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{c.foldersLinked}
										</TableCell>
										<TableCell align="center">
											<Tooltip title={`${c.usersWithUpdatesEnabled} con updates enabled`}>
												<span>
													{c.usersLinked}
													{c.usersWithUpdatesEnabled > 0 && (
														<Typography variant="caption" color="success.main" component="span" sx={{ ml: 0.5 }}>
															({c.usersWithUpdatesEnabled})
														</Typography>
													)}
												</span>
											</Tooltip>
										</TableCell>
										<TableCell>
											<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
												{fmtDateTime(c.lastUpdate)}
											</Typography>
										</TableCell>
										<TableCell align="center">
											{c.isProcessing ? (
												<Tooltip title={`Worker ${c.processingLock?.workerId} — vence ${fmtDateTime(c.processingLock?.expiresAt)}`}>
													<Chip
														size="small"
														icon={<CircularProgress size={10} sx={{ color: "inherit !important" }} />}
														label="En proceso"
														color="info"
														sx={{ bgcolor: alpha(theme.palette.info.main, 0.15) }}
													/>
												</Tooltip>
											) : c.isInCooldown ? (
												<Tooltip title={`Cooldown hasta ${fmtDateTime(c.cooldownUntil)}`}>
													<Chip size="small" icon={<Clock size={12} />} label="Cooldown" color="warning" variant="outlined" />
												</Tooltip>
											) : (
												<Chip size="small" icon={<TickCircle size={12} />} label="Disponible" color="success" variant="outlined" />
											)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>

				<TablePagination
					component="div"
					count={total}
					page={page}
					onPageChange={(_, p) => setPage(p)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
					rowsPerPageOptions={[10, 20, 50, 100]}
					labelRowsPerPage="Por página:"
				/>

				{!loading && rows.length > 0 && (
					<Alert severity="info" icon={<InfoCircle size={18} />} sx={{ "& .MuiAlert-message": { fontSize: "0.85rem" } }}>
						El worker procesa una causa por vez por fuero (con lock atómico) ordenadas por <code>lastUpdate</code> ascendente. Las que están
						en <strong>cooldown</strong> son las que tuvieron error reciente y el worker espera antes de reintentar.
					</Alert>
				)}
			</Stack>
		</MainCard>
	);
};

export default CausasUpdateEligiblePage;
