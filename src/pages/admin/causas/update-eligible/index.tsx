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
	useMediaQuery,
	alpha,
	ToggleButton,
	ToggleButtonGroup,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Link,
} from "@mui/material";
import { Refresh, SearchNormal1, InfoCircle, Clock, TickCircle, CloseCircle, DocumentText, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";
import CrossViewPair from "components/admin/CrossViewLink";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import CausasElegiblesUpdateService, {
	CausaElegible,
	Fuero,
	FUERO_LABELS,
	FueroStats,
} from "api/causasElegiblesUpdate";
import type { FuenteElegibles } from "api/causasElegiblesUpdate";
import { CausaSaijDetalle, causaSaij as fetchCausaSaij, desvincularDirecto } from "api/saijConciliacion";

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

	// Qué circuito de update:true se está mirando. "cache" = la cola real del
	// update-movimientos-worker (rs0/worker_01); "atlas" = las causas de
	// carpetas de usuarios del hub, que enciende associateFolderToCausa.
	// ?fuente=atlas preselecciona el tablero (lo usan los links "Ver los datos"
	// de las vistas de configuración de cada worker).
	const [searchParams] = useSearchParams();
	const [fuente, setFuente] = useState<FuenteElegibles>(searchParams.get("fuente") === "atlas" ? "atlas" : "cache");
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

	// Detalles técnicos (repos detrás de la vista): visibles en escritorio,
	// colapsados en mobile — mismo patrón que /admin/workers/sentencias.
	const esEscritorio = useMediaQuery(theme.breakpoints.up("md"));
	const [detallesAbiertos, setDetallesAbiertos] = useState(false);
	const mostrarDetalles = esEscritorio || detallesAbiertos;

	// Apagar el seguimiento (update=false) con motivo obligatorio y firmado.
	const [flagCausa, setFlagCausa] = useState<CausaElegible | null>(null);
	const [flagMotivo, setFlagMotivo] = useState("");
	const [flagGuardando, setFlagGuardando] = useState(false);

	const apagarUpdate = async () => {
		if (!flagCausa || !flagMotivo.trim()) return;
		setFlagGuardando(true);
		try {
			await CausasElegiblesUpdateService.setUpdateFlag(activeFuero, flagCausa._id, false, flagMotivo.trim());
			enqueueSnackbar(`update=false en ${flagCausa.number}/${flagCausa.year} — motivo firmado en el historial`, { variant: "success" });
			setFlagCausa(null);
			setFlagMotivo("");
			fetchList();
			fetchStats();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "No se pudo cambiar el flag", { variant: "error" });
		} finally {
			setFlagGuardando(false);
		}
	};

	// Panel SAIJ de una causa: fallos vinculados + sentencias capturadas.
	const [saijDetalle, setSaijDetalle] = useState<CausaSaijDetalle | null>(null);
	const [saijAbierto, setSaijAbierto] = useState(false);
	const [saijCargando, setSaijCargando] = useState(false);
	const [desvinculando, setDesvinculando] = useState<string | null>(null);

	const abrirSaij = async (fuero: string, causaId: string) => {
		setSaijAbierto(true);
		setSaijDetalle(null);
		setSaijCargando(true);
		try {
			setSaijDetalle(await fetchCausaSaij(fuero, causaId));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "No se pudo cargar el contexto SAIJ", { variant: "error" });
			setSaijAbierto(false);
		} finally {
			setSaijCargando(false);
		}
	};

	const desvincularFallo = async (saijDocId: string) => {
		if (!saijDetalle) return;
		setDesvinculando(saijDocId);
		try {
			const r = await desvincularDirecto({
				saijDocId,
				causaId: saijDetalle.causa._id,
				fuero: saijDetalle.causa.fuero || activeFuero,
			});
			enqueueSnackbar(
				`Desvinculado: movimiento ${r.movimientoQuitado ? "quitado" : "no estaba"}, ${r.sentenciasCapturadasTocadas} SC despegada(s), embedding re-encolado`,
				{ variant: "success" },
			);
			// Refrescar el panel y la tabla: la causa pudo quedar sin vínculos SAIJ.
			await abrirSaij(saijDetalle.causa.fuero || activeFuero, saijDetalle.causa._id);
			fetchList();
			fetchStats();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "La desvinculación falló", { variant: "error" });
		} finally {
			setDesvinculando(null);
		}
	};

	const fetchStats = useCallback(async () => {
		try {
			setStatsLoading(true);
			const res = await CausasElegiblesUpdateService.getStats(fuente);
			setStats(res.data);
		} catch (err: any) {
			console.error("Error stats:", err);
			enqueueSnackbar(err?.message || "Error al obtener stats", { variant: "error" });
		} finally {
			setStatsLoading(false);
		}
	}, [fuente, enqueueSnackbar]);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const res = await CausasElegiblesUpdateService.getList({
				fuero: activeFuero,
				page: page + 1,
				limit: rowsPerPage,
				search: search || undefined,
				onlyAvailable: onlyAvailable || undefined,
				fuente,
			});
			setRows(res.data);
			setTotal(res.pagination.total);
		} catch (err: any) {
			console.error("Error list:", err);
			enqueueSnackbar(err?.message || "Error al obtener listado", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [activeFuero, page, rowsPerPage, search, onlyAvailable, fuente, enqueueSnackbar]);

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
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
						{/* El link al worker vive acá y no en la banda de stats: es navegación,
						    no una métrica más. Y cuelga del título porque el worker de destino
						    depende de la fuente elegida, que es el control de al lado. */}
						<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
							<Typography variant="h3">Causas en Update</Typography>
							<CrossViewPair
								side="datos"
								to={fuente === "cache" ? "/admin/workers/movimientos" : "/admin/causas/workers?worker=app-update"}
								tooltip={
									fuente === "cache"
										? "Ir al update-movimientos-worker, que consume esta cola"
										: "Ir al worker de actualización que procesa las causas de carpetas"
								}
							/>
						</Stack>
						<ToggleButtonGroup
							size="small"
							exclusive
							sx={{ width: { xs: "100%", sm: "auto" }, "& .MuiToggleButton-root": { flex: { xs: 1, sm: "initial" } } }}
							value={fuente}
							onChange={(_, v) => {
								if (!v) return;
								setFuente(v);
								setPage(0);
							}}
						>
							<ToggleButton value="cache">
								Caché rs0
								<Box component="span" sx={{ display: { xs: "none", md: "inline" }, ml: 0.5 }}>
									· worker de scraping
								</Box>
							</ToggleButton>
							<ToggleButton value="atlas">
								Atlas
								<Box component="span" sx={{ display: { xs: "none", md: "inline" }, ml: 0.5 }}>
									· carpetas de usuarios
								</Box>
							</ToggleButton>
						</ToggleButtonGroup>
					</Stack>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: { xs: "block", sm: "none" } }}>
						{fuente === "cache" ? "Cola del update-movimientos-worker (rs0/worker_01)." : "Causas de carpetas de usuarios (Atlas/hub)."}
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: { xs: "none", sm: "block" } }}>
						Criterio de elegibilidad: <code>update=true, verified=true, isValid≠false</code>.{" "}
						{fuente === "cache" ? (
							<>
								Fuente: <strong>caché local de worker_01 (rs0)</strong> — la cola real del <code>update-movimientos-worker</code>,
								encendida por el pipeline de novelty. Es donde se trabaja el scraping.
							</>
						) : (
							<>
								Fuente: <strong>Atlas (hub)</strong> — las causas de carpetas de usuarios, que{" "}
								<code>associateFolderToCausa</code> enciende al vincular un folder. Otro circuito, otro worker.
							</>
						)}
					</Typography>
				</Box>

				{!esEscritorio && (
					<Chip
						size="small"
						variant="outlined"
						onClick={() => setDetallesAbiertos((v) => !v)}
						icon={detallesAbiertos ? <ArrowUp2 size={13} /> : <ArrowDown2 size={13} />}
						label="Detalles técnicos"
						sx={{ fontSize: "0.72rem", alignSelf: "flex-start" }}
					/>
				)}
				<Collapse in={mostrarDetalles} unmountOnExit>
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
				</Collapse>

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
					variant="scrollable"
					scrollButtons="auto"
					allowScrollButtonsMobile
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
								<TableCell>Origen</TableCell>
								<TableCell>Juzgado</TableCell>
								<TableCell align="center">Movs.</TableCell>
								<TableCell align="center">Folders</TableCell>
								<TableCell align="center">Usuarios</TableCell>
								<TableCell>Last update</TableCell>
								<TableCell align="center">Estado</TableCell>
								{fuente === "cache" && <TableCell align="center">Acciones</TableCell>}
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 9 }).map((__, j) => (
											<TableCell key={j}>
												<Skeleton variant="text" />
											</TableCell>
										))}
									</TableRow>
								))
							) : rows.length === 0 ? (
								<TableRow>
									<TableCell colSpan={fuente === "cache" ? 10 : 9} align="center" sx={{ py: 6 }}>
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
											<Stack direction="row" spacing={0.5} alignItems="center">
												<Chip size="small" label={c.source || "?"} variant="outlined" />
												{c.saij?.isFromSaij && (
													<Tooltip
														title={
															fuente === "cache"
																? `${c.saij.fallosVinculados} fallo(s) SAIJ vinculados — click para ver y desvincular`
																: `${c.saij.fallosVinculados} fallo(s) SAIJ vinculados`
														}
													>
														<Chip
															size="small"
															color="secondary"
															label={`SAIJ ×${c.saij.fallosVinculados}`}
															onClick={fuente === "cache" ? () => abrirSaij(c.fuero, c._id) : undefined}
															sx={fuente === "cache" ? { cursor: "pointer" } : undefined}
														/>
													</Tooltip>
												)}
											</Stack>
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
										{fuente === "cache" && (
											<TableCell align="center">
												<Tooltip title="Quitar del circuito de actualización (update=false), con motivo firmado en el historial">
													<Button
														size="small"
														color="error"
														onClick={() => {
															setFlagMotivo("");
															setFlagCausa(c);
														}}
													>
														Quitar
													</Button>
												</Tooltip>
											</TableCell>
										)}
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>

				{/* ── Quitar seguimiento (update=false) con motivo ─────────────── */}
				<Dialog open={!!flagCausa} onClose={() => !flagGuardando && setFlagCausa(null)} maxWidth="sm" fullWidth>
					<DialogTitle>
						Quitar del circuito — {flagCausa?.fuero} {flagCausa?.number}/{flagCausa?.year}
					</DialogTitle>
					<DialogContent dividers>
						<Typography variant="body2" sx={{ mb: 1.5 }}>
							{flagCausa?.caratula || "(sin carátula)"}
						</Typography>
						<Alert severity="info" sx={{ mb: 2 }}>
							Se marca <code>update = false</code>: el worker deja de intentarla. La transición queda en el historial de la causa
							con tu email y el motivo. Reversible desde el mismo historial (o re-encendida por el pipeline de novelty si vuelve a
							detectar algo).
						</Alert>
						<TextField
							fullWidth
							autoFocus
							multiline
							minRows={2}
							label="Motivo (obligatorio)"
							placeholder="ej: el portal devuelve solo incidentes; el principal pasó a reservado"
							value={flagMotivo}
							onChange={(e) => setFlagMotivo(e.target.value)}
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setFlagCausa(null)} disabled={flagGuardando}>
							Cancelar
						</Button>
						<Button color="error" variant="contained" onClick={apagarUpdate} disabled={flagGuardando || !flagMotivo.trim()}>
							{flagGuardando ? "Guardando…" : "Quitar seguimiento"}
						</Button>
					</DialogActions>
				</Dialog>

				{/* ── Panel SAIJ de una causa: fallos + sentencias capturadas ───── */}
				<Dialog open={saijAbierto} onClose={() => setSaijAbierto(false)} maxWidth="md" fullWidth>
					<DialogTitle>
						Vínculos SAIJ — {saijDetalle ? `${saijDetalle.causa.fuero} ${saijDetalle.causa.number}/${saijDetalle.causa.year}` : "…"}
					</DialogTitle>
					<DialogContent dividers>
						{saijCargando && <CircularProgress size={22} />}
						{saijDetalle && (
							<Stack spacing={2}>
								<Typography variant="body2">{saijDetalle.causa.caratula || "(sin carátula)"}</Typography>

								<Divider textAlign="left">
									<Typography variant="caption" color="text.secondary">
										Fallos SAIJ vinculados ({saijDetalle.fallos.length})
									</Typography>
								</Divider>
								{saijDetalle.fallos.length === 0 && (
									<Typography variant="caption" color="text.secondary">
										La causa no tiene fallos SAIJ vinculados (pudo haberse desvinculado recién).
									</Typography>
								)}
								{saijDetalle.fallos.map((f) => (
									<Paper key={f._id} variant="outlined" sx={{ p: 1.5 }}>
										<Stack spacing={0.75}>
											<Typography variant="body2" fontWeight={600}>
												{f.titulo || "(sin título)"}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{f.tribunal || ""} {f.fecha ? `· ${new Date(f.fecha).toLocaleDateString("es-AR")}` : ""}
											</Typography>
											<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
												<Chip
													size="small"
													variant="outlined"
													label={`exp: ${f.expediente?.fuero || "?"} ${f.expediente?.numero ?? "?"}/${f.expediente?.año ?? "?"} · ${f.expediente?.confidence || "?"}`}
												/>
												{f.veredicto && (
													<Tooltip title={`jaccard ${f.veredicto.jaccard ?? "—"} · ${(f.veredicto.flags || []).join(", ") || "sin banderas"}`}>
														<Chip
															size="small"
															label={f.veredicto.veredicto}
															color={f.veredicto.veredicto === "coincide" ? "success" : f.veredicto.veredicto === "no_coincide" ? "error" : "warning"}
														/>
													</Tooltip>
												)}
												{f.url && (
													<Link href={f.url} target="_blank" rel="noopener" variant="caption">
														<DocumentText size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
														Ver en SAIJ
													</Link>
												)}
												{f.pdfUrl && (
													<Link href={f.pdfUrl} target="_blank" rel="noopener" variant="caption">
														PDF
													</Link>
												)}
												<Box sx={{ flex: 1 }} />
												<Button
													size="small"
													color="error"
													variant="outlined"
													disabled={desvinculando === f._id}
													onClick={() => desvincularFallo(f._id)}
												>
													{desvinculando === f._id ? "Desvinculando…" : "Desvincular"}
												</Button>
											</Stack>
										</Stack>
									</Paper>
								))}

								<Divider textAlign="left">
									<Typography variant="caption" color="text.secondary">
										Sentencias capturadas de esta causa ({saijDetalle.sentenciasCapturadas.length})
									</Typography>
								</Divider>
								{saijDetalle.sentenciasCapturadas.map((sc) => (
									<Paper key={sc._id} variant="outlined" sx={{ p: 1.5 }}>
										<Typography variant="caption" display="block">{sc.caratula}</Typography>
										<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mt: 0.5 }}>
											<Chip size="small" variant="outlined" label={sc.source?.origin === "saij" ? "origen SAIJ" : "origen PJN"} />
											{sc.movimientoTipo && <Chip size="small" variant="outlined" label={sc.movimientoTipo} />}
											<Chip size="small" variant="outlined" label={`embedding: ${sc.embeddingStatus || "?"}`} />
											{sc.url && (
												<Link href={sc.url} target="_blank" rel="noopener" variant="caption">
													<DocumentText size={12} style={{ verticalAlign: "middle", marginRight: 3 }} />
													Ver documento
												</Link>
											)}
										</Stack>
									</Paper>
								))}

								<Alert severity="info">
									Desvincular deshace el apareo completo: quita el movimiento de la causa, firma el historial, la sentencia
									capturada recupera la carátula del propio fallo (queda publicada sin causa) y su embedding se re-encola. Queda
									respaldo en <code>saij-desvinculacion-backup</code>. Es lo mismo que hace la vista de Conciliación SAIJ.
								</Alert>
							</Stack>
						)}
					</DialogContent>
					<DialogActions>
						<Button component={RouterLink} to="/admin/saij/conciliacion" size="small">
							Abrir Conciliación SAIJ
						</Button>
						<Box sx={{ flex: 1 }} />
						<Button onClick={() => setSaijAbierto(false)}>Cerrar</Button>
					</DialogActions>
				</Dialog>

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
