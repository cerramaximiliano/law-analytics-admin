import { useState, useEffect, useCallback, useMemo } from "react";
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
import MainCard from "components/MainCard";
import TableSkeleton from "components/UI/TableSkeleton";
import logsService, { LogEntry, ServiceInfo } from "api/logs";
import AnalyzeLogsModal from "components/admin/logs/AnalyzeLogsModal";

const LEVEL_COLORS: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
	trace: "default",
	debug: "default",
	info: "info",
	warn: "warning",
	error: "error",
	fatal: "error",
	unknown: "default",
};

const LEVEL_OPTIONS = ["", "info", "warn", "error", "fatal", "debug", "trace", "unknown"];

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
	const [service, setService] = useState("");
	const [host, setHost] = useState("");
	const [level, setLevel] = useState("");
	const [search, setSearch] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	// ── Data ────────────────────────────────────────────────────────────────
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [services, setServices] = useState<ServiceInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(100);
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
			<Box sx={{ mb: 2 }}>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Stack direction="row" alignItems="center" spacing={1}>
							<Typography variant="h3">Logs del Ecosistema</Typography>
							<Chip
								icon={<Data2 size={13} color="#00ED64" />}
								label="db.logs (URLDB_LOGS · 7d TTL)"
								size="small"
								variant="outlined"
								sx={{
									fontFamily: "monospace",
									fontSize: "0.7rem",
									"& .MuiChip-icon": { marginLeft: "6px", color: "#00ED64" },
								}}
							/>
						</Stack>
					</Grid>
					<Grid item>
						<Stack direction="row" spacing={1}>
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
			<Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
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
										{lv || "Todos"}
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
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setPage(0);
									fetchLogs();
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
				<Table size="small" sx={{ "& td, & th": { borderBottom: `1px solid ${theme.palette.divider}` } }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700 }}>Timestamp</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700 }}>Nivel</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700 }}>Servicio</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700 }}>Host</TableCell>
							<TableCell sx={{ fontSize: "0.7rem", fontWeight: 700 }}>Mensaje</TableCell>
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
								<TableCell colSpan={6} sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
									{hasActiveFilters ? "Sin resultados con los filtros aplicados" : "Sin logs"}
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
				rowsPerPageOptions={[50, 100, 200, 500]}
				labelRowsPerPage="Por página:"
				labelDisplayedRows={({ from: f, to: t, count }) => `${f}–${t} de ${count.toLocaleString()}`}
			/>

			<AnalyzeLogsModal open={analyzeOpen} onClose={() => setAnalyzeOpen(false)} filters={currentFilters} />
		</MainCard>
	);
};

export default SystemLogs;
