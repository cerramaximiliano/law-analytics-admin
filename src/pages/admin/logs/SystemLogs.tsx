import { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryParam } from "hooks/useTabParam";
import {
	Autocomplete,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	Menu,
	MenuItem,
	Paper,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";
import { Refresh, SearchNormal1, CloseCircle, Magicpen, ArrowDown2, ArrowUp2, Data2, Copy, DocumentDownload } from "iconsax-react";
import { useSnackbar } from "notistack";
import { alpha } from "@mui/material/styles";
import MainCard from "components/MainCard";
import TableSkeleton from "components/UI/TableSkeleton";
import logsService, { LogEntry, ServiceInfo } from "api/logs";
import AnalyzeLogsModal from "components/admin/logs/AnalyzeLogsModal";
import { BRAND_BLUE, LIVE_GREEN } from "themes/dashboardTokens";

const LEVEL_COLORS: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
	trace: "default",
	debug: "default",
	info: "info",
	warn: "warning",
	error: "error",
	fatal: "error",
	unknown: "default",
};

// "error,fatal" es un valor real que el backend entiende como lista, no un
// truco de la UI: es el filtro que corresponde a "mostrame todo lo que salió
// mal", y el que usa el drill-down desde la tabla de procesos.
const LEVEL_OPTIONS = ["", "error,fatal", "info", "warn", "error", "fatal", "debug", "trace", "unknown"];

const LEVEL_LABEL: Record<string, string> = { "": "Todos", "error,fatal": "error + fatal" };

function LogRow({ log }: { log: LogEntry }) {
	const [expanded, setExpanded] = useState(false);
	const theme = useTheme();

	const ts = new Date(log.timestamp);
	const tsStr = `${ts.toLocaleDateString("es-AR")} ${ts.toLocaleTimeString("es-AR")}`;

	const hasContext = log.context && Object.keys(log.context).length > 0;
	const canExpand = hasContext || log.traceId;

	return (
		<>
			<TableRow hover sx={{ cursor: canExpand ? "pointer" : "default" }} onClick={() => canExpand && setExpanded((v) => !v)}>
				<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{tsStr}</TableCell>
				<TableCell>
					<Chip
						label={log.level || "unknown"}
						size="small"
						color={LEVEL_COLORS[log.level] || "default"}
						sx={{ fontSize: "0.65rem", height: 20 }}
					/>
				</TableCell>
				<TableCell sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{log.service}</TableCell>
				<TableCell sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{log.host}</TableCell>
				<TableCell sx={{ fontFamily: "monospace", fontSize: "0.72rem", maxWidth: 500 }}>
					<Box
						sx={{
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							color: log.level === "error" || log.level === "fatal" ? theme.palette.error.main : "inherit",
						}}
					>
						{log.message}
					</Box>
				</TableCell>
				<TableCell sx={{ width: 30 }}>
					{canExpand && (
						<IconButton size="small" sx={{ p: 0.25 }}>
							{expanded ? <ArrowUp2 size={12} /> : <ArrowDown2 size={12} />}
						</IconButton>
					)}
				</TableCell>
			</TableRow>
			{canExpand && (
				<TableRow>
					<TableCell colSpan={6} sx={{ py: 0, borderBottom: expanded ? undefined : "none" }}>
						<Collapse in={expanded} timeout="auto" unmountOnExit>
							<Box sx={{ py: 2, pl: 4, pr: 2, bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50" }}>
								<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
									Mensaje completo
								</Typography>
								<Box
									component="pre"
									sx={{
										m: 0,
										mb: 1.5,
										fontFamily: "monospace",
										fontSize: 11,
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
										maxHeight: 300,
										overflow: "auto",
									}}
								>
									{log.message}
								</Box>
								{log.traceId && (
									<Typography variant="caption" color="text.secondary">
										<strong>traceId:</strong> <code style={{ fontSize: "0.7rem" }}>{log.traceId}</code>
									</Typography>
								)}
								{hasContext && (
									<>
										<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
											Context (JSON)
										</Typography>
										<Box
											component="pre"
											sx={{
												m: 0,
												fontFamily: "monospace",
												fontSize: 11,
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												maxHeight: 200,
												overflow: "auto",
											}}
										>
											{JSON.stringify(log.context, null, 2)}
										</Box>
									</>
								)}
								{log.ingest?.redacted && (
									<Chip label="🔒 Sanitized" size="small" variant="outlined" sx={{ mt: 1, fontSize: "0.65rem", height: 18 }} />
								)}
							</Box>
						</Collapse>
					</TableCell>
				</TableRow>
			)}
		</>
	);
}

const SystemLogs = () => {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();

	// ── Filters ─────────────────────────────────────────────────────────────
	// Los filtros viven en la URL: la vista pasa a ser enlazable, que es lo que
	// habilita que la tabla de procesos de /admin/infrastructure pueda mandarte
	// acá ya filtrado por el servicio y el host de la fila que clickeaste.
	// `page` se queda en estado local a propósito: un link compartido tiene que
	// abrir en la primera página, no en la que estaba quien lo mandó.
	const [service, setService] = useQueryParam("service");
	const [host, setHost] = useQueryParam("host");
	const [level, setLevel] = useQueryParam("level");
	const [search, setSearch] = useQueryParam("q");
	// El campo de búsqueda escribe en un estado local y recién después de una
	// pausa vuelca a la URL. Sin esto cada tecla disparaba un request Y una
	// escritura de historial: escribir "sentencias" eran diez de cada uno.
	const [searchDraft, setSearchDraft] = useState(search);
	const [from, setFrom] = useQueryParam("from");
	const [to, setTo] = useQueryParam("to");

	// ── Data ────────────────────────────────────────────────────────────────
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [services, setServices] = useState<ServiceInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	// 10 por página: los logs se leen de a poco y en orden, no se escanean en
	// bloque. Una página de 100 obligaba a scrollear la vista entera para llegar
	// al control de paginado, y el export —que trae 2000/5000 con los filtros
	// puestos— ya cubre el caso de querer mucho de una.
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [total, setTotal] = useState(0);

	// ── Modal AI ────────────────────────────────────────────────────────────
	const [analyzeOpen, setAnalyzeOpen] = useState(false);

	// ── Export logs (clipboard / download) ──────────────────────────────────
	const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
	const [exporting, setExporting] = useState(false);

	const hostOptions = useMemo(() => {
		const set = new Set<string>();
		services.forEach((s) => set.add(s.host));
		return ["", ...Array.from(set)];
	}, [services]);

	const serviceOptions = useMemo(() => {
		const filtered = host ? services.filter((s) => s.host === host) : services;
		const set = new Set<string>();
		filtered.forEach((s) => set.add(s.service));
		return ["", ...Array.from(set).sort()];
	}, [services, host]);

	const currentFilters = useMemo(
		() => ({
			service: service || undefined,
			host: host || undefined,
			level: level || undefined,
			search: search || undefined,
			from: from || undefined,
			to: to || undefined,
		}),
		[service, host, level, search, from, to],
	);

	// ── Fetch services (para los Autocomplete) ───────────────────────────────
	const fetchServices = useCallback(async () => {
		try {
			const res = await logsService.services();
			setServices(res.data || []);
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al cargar servicios", { variant: "warning" });
		}
	}, [enqueueSnackbar]);

	// ── Fetch logs ──────────────────────────────────────────────────────────
	const fetchLogs = useCallback(async () => {
		setLoading(true);
		try {
			const res = await logsService.list({
				...currentFilters,
				page: page + 1,
				limit: rowsPerPage,
			});
			setLogs(res.data);
			setTotal(res.pagination.total);
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.message || err.message || "Error al cargar logs", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [currentFilters, page, rowsPerPage, enqueueSnackbar]);

	useEffect(() => {
		fetchServices();
	}, [fetchServices]);

	// Al cambiar un filtro hay que volver a la primera página: si no, una
	// búsqueda que devuelve menos resultados que la página en la que estabas
	// muestra una tabla vacía sin explicar por qué. Con 100 por página casi no
	// se notaba —rara vez pasabas de la primera—; con 10 pasa seguido.
	//
	// Va como ajuste durante el render y no en un useEffect: un efecto correría
	// DESPUÉS del de fetch, que ya habría pedido la página vieja con el filtro
	// nuevo. Así React re-renderiza antes de commitear y sale un solo request.
	const [filtrosPrevios, setFiltrosPrevios] = useState(currentFilters);
	if (filtrosPrevios !== currentFilters) {
		setFiltrosPrevios(currentFilters);
		setPage(0);
	}

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	// Trae hasta N logs con los filtros actuales (sin paginar) y los devuelve formateados
	const fetchForExport = useCallback(
		async (limit: number): Promise<LogEntry[]> => {
			const res = await logsService.list({ ...currentFilters, page: 1, limit });
			return res.data;
		},
		[currentFilters],
	);

	const formatAsText = (entries: LogEntry[]): string => {
		const header = [
			`# Logs del ecosistema Law Analytics — exportados ${new Date().toISOString()}`,
			`# Filtros: ${JSON.stringify(currentFilters)}`,
			`# Total exportados: ${entries.length}`,
			``,
		].join("\n");
		const body = entries
			.map((l) => {
				const ts = new Date(l.timestamp).toISOString().replace("T", " ").slice(0, 19);
				return `[${ts}] [${l.level || "unknown"}] ${l.service}@${l.host}: ${l.message}`;
			})
			.join("\n");
		return header + body + "\n";
	};

	const formatAsJson = (entries: LogEntry[]): string => {
		return JSON.stringify(
			{
				exportedAt: new Date().toISOString(),
				filters: currentFilters,
				total: entries.length,
				logs: entries.map((l) => ({
					timestamp: l.timestamp,
					level: l.level,
					service: l.service,
					host: l.host,
					message: l.message,
					traceId: l.traceId || undefined,
					context: l.context && Object.keys(l.context).length > 0 ? l.context : undefined,
				})),
			},
			null,
			2,
		);
	};

	const handleCopy = async (format: "text" | "json") => {
		setExportMenuAnchor(null);
		setExporting(true);
		try {
			const entries = await fetchForExport(2000);
			if (entries.length === 0) {
				enqueueSnackbar("No hay logs para copiar con estos filtros", { variant: "warning" });
				return;
			}
			const content = format === "json" ? formatAsJson(entries) : formatAsText(entries);
			await navigator.clipboard.writeText(content);
			enqueueSnackbar(`${entries.length} logs copiados al portapapeles (${format.toUpperCase()})`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al copiar logs", { variant: "error" });
		} finally {
			setExporting(false);
		}
	};

	const handleDownload = async (format: "text" | "json") => {
		setExportMenuAnchor(null);
		setExporting(true);
		try {
			const entries = await fetchForExport(5000);
			if (entries.length === 0) {
				enqueueSnackbar("No hay logs para descargar con estos filtros", { variant: "warning" });
				return;
			}
			const content = format === "json" ? formatAsJson(entries) : formatAsText(entries);
			const mime = format === "json" ? "application/json" : "text/plain";
			const ext = format === "json" ? "json" : "log";
			const blob = new Blob([content], { type: mime + ";charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
			a.href = url;
			a.download = `logs-${ts}.${ext}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			enqueueSnackbar(`${entries.length} logs descargados`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al descargar logs", { variant: "error" });
		} finally {
			setExporting(false);
		}
	};

	// Mantiene el input en sincronía cuando el valor llega de afuera: un link
	// con ?q=..., el botón de limpiar, o el back del navegador.
	useEffect(() => {
		setSearchDraft(search);
	}, [search]);

	// 400 ms: alcanza para no pegarle a la API por tecla y no se siente lento.
	useEffect(() => {
		if (searchDraft === search) return;
		const t = setTimeout(() => setSearch(searchDraft), 400);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchDraft]);

	const handleClearFilters = () => {
		setService("");
		setHost("");
		setLevel("");
		setSearch("");
		setFrom("");
		setTo("");
		setPage(0);
	};

	const hasActiveFilters = service || host || level || search || from || to;

	return (
		<MainCard>
			<Box sx={{ mb: 2.5 }}>
				<Grid container alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
					<Grid item sx={{ maxWidth: 720 }}>
						<Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap">
							<Typography variant="h3" sx={{ mb: 0 }}>
								Logs del ecosistema
							</Typography>
							<Chip
								icon={<Data2 size={13} color={LIVE_GREEN} />}
								label="db.logs · 7d TTL"
								size="small"
								variant="outlined"
								sx={{
									fontFamily: "monospace",
									fontSize: "0.7rem",
									fontVariantNumeric: "tabular-nums",
									borderColor: alpha(LIVE_GREEN, 0.35),
									color: "text.secondary",
									"& .MuiChip-icon": { marginLeft: "6px", color: LIVE_GREEN },
								}}
							/>
						</Stack>
						<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
							Consultá, filtrá y exportá logs en tiempo real de los servicios y workers del ecosistema.
						</Typography>
					</Grid>
					<Grid item>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							<Button
								variant="outlined"
								color="secondary"
								startIcon={<Magicpen size={16} />}
								onClick={() => setAnalyzeOpen(true)}
								disabled={total === 0}
								sx={{ textTransform: "none" }}
							>
								Analizar con AI
							</Button>
							<Button
								variant="outlined"
								startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <Copy size={16} />}
								onClick={(e) => setExportMenuAnchor(e.currentTarget)}
								disabled={total === 0 || exporting}
								sx={{ textTransform: "none" }}
							>
								Exportar
							</Button>
							<Menu anchorEl={exportMenuAnchor} open={Boolean(exportMenuAnchor)} onClose={() => setExportMenuAnchor(null)}>
								<MenuItem onClick={() => handleCopy("text")}>
									<Copy size={14} style={{ marginRight: 8 }} />
									Copiar como texto (máx 2000)
								</MenuItem>
								<MenuItem onClick={() => handleCopy("json")}>
									<Copy size={14} style={{ marginRight: 8 }} />
									Copiar como JSON (máx 2000)
								</MenuItem>
								<MenuItem onClick={() => handleDownload("text")}>
									<DocumentDownload size={14} style={{ marginRight: 8 }} />
									Descargar .log (máx 5000)
								</MenuItem>
								<MenuItem onClick={() => handleDownload("json")}>
									<DocumentDownload size={14} style={{ marginRight: 8 }} />
									Descargar .json (máx 5000)
								</MenuItem>
							</Menu>
							<Button
								variant="outlined"
								startIcon={<Refresh size={16} />}
								onClick={fetchLogs}
								disabled={loading}
								sx={{ textTransform: "none" }}
							>
								Refrescar
							</Button>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			{/* ── Filtros ── */}
			<Paper
				variant="outlined"
				sx={{
					p: 1.5,
					mb: 2,
					position: "sticky",
					top: 0,
					zIndex: 3,
					bgcolor: "background.paper",
					borderColor: hasActiveFilters ? alpha(BRAND_BLUE, 0.36) : "divider",
					transition: "border-color 200ms ease",
				}}
			>
				<Grid container spacing={1.5} alignItems="center">
					<Grid item xs={12} sm={6} md={2}>
						<Autocomplete
							options={hostOptions}
							value={host}
							onChange={(_, v) => {
								setHost(v || "");
								setService("");
								setPage(0);
							}}
							renderInput={(params) => <TextField {...params} label="Host" size="small" />}
							size="small"
							getOptionLabel={(o) => o || "Todos"}
							disableClearable
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={2}>
						<Autocomplete
							options={serviceOptions}
							value={service}
							onChange={(_, v) => {
								setService(v || "");
								setPage(0);
							}}
							renderInput={(params) => <TextField {...params} label="Servicio" size="small" />}
							size="small"
							getOptionLabel={(o) => o || "Todos"}
							disableClearable
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={1.5}>
						<FormControl size="small" fullWidth>
							<InputLabel>Nivel</InputLabel>
							<Select
								value={level}
								label="Nivel"
								onChange={(e) => {
									setLevel(e.target.value);
									setPage(0);
								}}
							>
								{LEVEL_OPTIONS.map((lv) => (
									<MenuItem key={lv} value={lv}>
										{LEVEL_LABEL[lv] || lv}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={6} sm={4} md={1.5}>
						<TextField
							label="Desde"
							type="datetime-local"
							size="small"
							fullWidth
							value={from}
							onChange={(e) => {
								setFrom(e.target.value);
								setPage(0);
							}}
							InputLabelProps={{ shrink: true }}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={1.5}>
						<TextField
							label="Hasta"
							type="datetime-local"
							size="small"
							fullWidth
							value={to}
							onChange={(e) => {
								setTo(e.target.value);
								setPage(0);
							}}
							InputLabelProps={{ shrink: true }}
						/>
					</Grid>
					<Grid item xs={12} sm={8} md={2.5}>
						<TextField
							label="Buscar en mensaje"
							size="small"
							fullWidth
							value={searchDraft}
							onChange={(e) => setSearchDraft(e.target.value)}
							onKeyDown={(e) => {
								// Enter no espera el debounce: si alguien lo aprieta ya
								// terminó de escribir y quiere el resultado ahora.
								if (e.key === "Enter") {
									setSearch(searchDraft);
									setPage(0);
								}
							}}
							InputProps={{
								startAdornment: <SearchNormal1 size={14} style={{ marginRight: 4 }} />,
							}}
						/>
					</Grid>
					<Grid item xs={12} sm={4} md={1}>
						{hasActiveFilters && (
							<Button size="small" startIcon={<CloseCircle size={14} />} onClick={handleClearFilters} sx={{ textTransform: "none" }}>
								Limpiar
							</Button>
						)}
					</Grid>
				</Grid>
			</Paper>

			{/* ── Tabla ── */}
			<TableContainer>
				<Table
					size="small"
					sx={{
						"& td, & th": { borderBottom: `1px solid ${theme.palette.divider}` },
						"& tbody tr:hover": { bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.08 : 0.04) },
					}}
				>
					<TableHead>
						<TableRow>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Timestamp</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Nivel</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Servicio</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Host</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Mensaje</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={6}>
									<TableSkeleton rows={10} columns={5} />
								</TableCell>
							</TableRow>
						) : logs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
									<Stack spacing={0.75} alignItems="center">
										<Typography variant="subtitle1" color="text.primary">
											{hasActiveFilters ? "Sin resultados con los filtros aplicados" : "Sin logs"}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{hasActiveFilters ? "Probá ajustar o limpiar los filtros." : "Cuando lleguen logs van a aparecer acá."}
										</Typography>
									</Stack>
								</TableCell>
							</TableRow>
						) : (
							logs.map((log) => <LogRow key={log._id} log={log} />)
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
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50, 100, 200, 500]}
				labelRowsPerPage="Por página:"
				labelDisplayedRows={({ from: f, to: t, count }) => `${f}–${t} de ${count.toLocaleString()}`}
			/>

			<AnalyzeLogsModal open={analyzeOpen} onClose={() => setAnalyzeOpen(false)} filters={currentFilters} />
		</MainCard>
	);
};

export default SystemLogs;
