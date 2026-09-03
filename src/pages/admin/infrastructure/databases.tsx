// Las bases de datos del ecosistema: dónde vive cada una, cuánto ocupa, cuánto
// espacio le queda y qué hay adentro, colección por colección.
//
// Antes esta vista mostraba tres números de Qdrant y dos de Mongo sacados de un
// snapshot de worker_01: no decía qué bases existen ni dónde están, y el detalle
// por colección llegaba recortado a las 25 más grandes. Ahora el inventario
// completo lo arma el admin-api consultando cada base.
//
// Está cruzada con /admin/infrastructure: desde el box se llega a la base que
// hospeda y desde la base al box donde corre.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	Divider,
	Grid,
	IconButton,
	LinearProgress,
	Paper,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import MainCard from "components/MainCard";
import CrossLinkChip from "components/admin/CrossLinkChip";
import { useTabParam } from "hooks/useTabParam";
import DatabasesService, { DatabaseEntry } from "api/databases";
import { MonitoringService, HistoryPoint } from "api/monitoring";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder, navHoverBg } from "themes/dashboardTokens";

function fmtBytes(b: number | null | undefined): string {
	if (b == null) return "—";
	const u = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	let n = b;
	while (n >= 1024 && i < u.length - 1) {
		n /= 1024;
		i++;
	}
	return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function fmtNum(n: number | null | undefined): string {
	return n == null ? "—" : n.toLocaleString("es-AR");
}

function fmtDate(v: string | null | undefined): string {
	if (!v) return "N/A";
	return new Date(v).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Argentina/Buenos_Aires",
	});
}

const usageColor = (pct: number | null) => (pct === null ? "#94A3B8" : pct >= 90 ? "#EF4444" : pct >= 80 ? STALE_AMBER : LIVE_GREEN);

/** Ocupación del volumen donde vive la base. Las gestionadas no tienen. */
const VolumeBar = ({ db }: { db: DatabaseEntry }) => {
	if (!db.volume) {
		return (
			<Typography variant="caption" color="text.secondary">
				{db.volumeNote || "Sin volumen propio que administrar."}
			</Typography>
		);
	}
	const { percent, sizeHuman, availHuman, mount } = db.volume;
	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
				<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
					{mount}
				</Typography>
				<Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
					{percent}% de {sizeHuman}
					<Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75, fontWeight: 400 }}>
						· {availHuman} libres
					</Typography>
				</Typography>
			</Stack>
			<LinearProgress
				variant="determinate"
				value={percent}
				sx={{
					height: 6,
					borderRadius: 3,
					bgcolor: alpha(usageColor(percent), 0.15),
					"& .MuiLinearProgress-bar": { bgcolor: usageColor(percent), borderRadius: 3 },
				}}
			/>
		</Box>
	);
};

const DbCard = ({ db, onOpen }: { db: DatabaseEntry; onOpen: () => void }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Paper
			variant="outlined"
			onClick={onOpen}
			sx={{
				p: 2,
				height: "100%",
				borderRadius: 2,
				cursor: "pointer",
				borderColor: db.error ? theme.palette.error.main : headerBorder(isDark),
				transition: "background-color 200ms ease, border-color 200ms ease",
				"&:hover": { bgcolor: navHoverBg(isDark), borderColor: alpha(BRAND_BLUE, 0.45) },
			}}
		>
			<Stack spacing={1.25}>
				<Box>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						{db.name}
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
						{db.role}
					</Typography>
				</Box>

				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					<Chip size="small" variant="outlined" label={db.engine} sx={{ height: 20, fontSize: "0.65rem" }} />
					{db.location.map((l) => (
						<Chip
							key={l.label}
							size="small"
							variant="outlined"
							label={l.label}
							sx={{ height: 20, fontSize: "0.65rem", fontFamily: "monospace" }}
						/>
					))}
				</Stack>

				{db.error ? (
					<Typography variant="caption" color="error.main">
						{db.error}
					</Typography>
				) : db.notInstrumented ? (
					<Typography variant="caption" color="text.secondary">
						{db.notInstrumented}
					</Typography>
				) : (
					<>
						<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
							<Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
								{fmtBytes(db.totals?.storageBytes)}
								<Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
									{" "}
									en disco
								</Typography>
							</Typography>
							<Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
								{fmtNum(db.totals?.documents)}
								<Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
									{" "}
									docs en {db.totals?.collections ?? 0} colecciones
								</Typography>
							</Typography>
						</Stack>
						<VolumeBar db={db} />
					</>
				)}
			</Stack>
		</Paper>
	);
};

/** Tabla de colecciones. Qdrant y Mongo reportan cosas distintas. */
const CollectionsTable = ({ db }: { db: DatabaseEntry }) => {
	const esQdrant = db.key === "qdrant";
	const cols = db.collections || [];
	if (cols.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary">
				{db.error || db.notInstrumented || "Sin colecciones."}
			</Typography>
		);
	}
	return (
		<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
			<Table size="small" stickyHeader>
				<TableHead>
					<TableRow>
						<TableCell>Colección</TableCell>
						<TableCell align="right">{esQdrant ? "Puntos" : "Documentos"}</TableCell>
						{esQdrant ? <TableCell align="right">Indexados</TableCell> : <TableCell align="right">Datos</TableCell>}
						<TableCell align="right">En disco</TableCell>
						{esQdrant ? <TableCell align="right">Segmentos</TableCell> : <TableCell align="right">Índices</TableCell>}
						{esQdrant ? <TableCell align="center">Dim</TableCell> : <TableCell align="right">Nº índices</TableCell>}
						{esQdrant && <TableCell align="center">Estado</TableCell>}
					</TableRow>
				</TableHead>
				<TableBody>
					{cols.map((c) => (
						<TableRow key={c.name} hover>
							<TableCell sx={{ fontFamily: "monospace", fontWeight: 500 }}>{c.name}</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{fmtNum(c.documents)}
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{esQdrant ? fmtNum(c.indexed) : fmtBytes(c.sizeBytes)}
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
								{fmtBytes(c.storageBytes)}
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{esQdrant ? fmtNum(c.segments) : fmtBytes(c.indexBytes)}
							</TableCell>
							{esQdrant ? (
								<TableCell align="center">{c.dim ?? "—"}</TableCell>
							) : (
								<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
									{c.indexes ?? "—"}
								</TableCell>
							)}
							{esQdrant && (
								<TableCell align="center">
									<Chip
										size="small"
										variant="outlined"
										label={c.status}
										color={c.status === "green" ? "success" : c.status === "yellow" ? "warning" : "error"}
										sx={{ height: 18, fontSize: "0.62rem" }}
									/>
								</TableCell>
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

const DbPanel = ({ db }: { db: DatabaseEntry }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Stack spacing={2.5}>
			<MainCard>
				<Stack spacing={2}>
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
						<Box sx={{ maxWidth: 720 }}>
							<Typography variant="h4" sx={{ mb: 0.5 }}>
								{db.name}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{db.role}
							</Typography>
						</Box>
						{db.infraBoxKey && (
							<CrossLinkChip
								to={`/admin/infrastructure?box=${db.infraBoxKey}`}
								label="Ver el servidor"
								title="Ir al box que hospeda esta base en el mapa de infraestructura"
							/>
						)}
					</Stack>

					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						<Chip size="small" variant="outlined" label={db.engine} sx={{ borderColor: headerBorder(isDark) }} />
						<Chip
							size="small"
							variant="outlined"
							label={db.hosting === "gestionado" ? "Servicio gestionado" : "Infraestructura propia"}
							sx={{ borderColor: headerBorder(isDark) }}
						/>
						{db.dbName && (
							<Chip
								size="small"
								variant="outlined"
								label={`db: ${db.dbName}`}
								sx={{ fontFamily: "monospace", borderColor: headerBorder(isDark) }}
							/>
						)}
						{db.uri && (
							<Tooltip title={db.uri}>
								<Chip
									size="small"
									variant="outlined"
									label="cadena de conexión"
									sx={{ fontFamily: "monospace", borderColor: headerBorder(isDark) }}
								/>
							</Tooltip>
						)}
					</Stack>

					<Divider />

					<Grid container spacing={2.5}>
						<Grid item xs={12} md={6}>
							<Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.08em", fontWeight: 700 }}>
								Dónde vive
							</Typography>
							<Stack spacing={0.75} sx={{ mt: 1 }}>
								{db.location.map((l) => (
									<Stack key={l.label} direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
											{l.label}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{l.detail}
										</Typography>
										{l.boxKey && (
											<CrossLinkChip to={`/admin/infrastructure?box=${l.boxKey}`} label="box" title={`Ver ${l.label} en infraestructura`} />
										)}
									</Stack>
								))}
							</Stack>
							{db.replicaSet?.members && (
								<Stack spacing={0.5} sx={{ mt: 1.5 }}>
									<Typography variant="caption" color="text.secondary">
										Topología del replica set <strong>{db.replicaSet.name}</strong> ahora mismo:
									</Typography>
									<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
										{db.replicaSet.members.map((m) => (
											<Chip
												key={m.host}
												size="small"
												variant="outlined"
												label={`${m.host} · ${m.state}`}
												color={m.state === "PRIMARY" ? "success" : "default"}
												sx={{ height: 20, fontSize: "0.65rem", fontFamily: "monospace" }}
											/>
										))}
									</Stack>
								</Stack>
							)}
						</Grid>
						<Grid item xs={12} md={6}>
							<Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.08em", fontWeight: 700 }}>
								Volumen y espacio libre
							</Typography>
							<Box sx={{ mt: 1 }}>
								<VolumeBar db={db} />
							</Box>
							{db.volume && db.volumeNote && (
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
									{db.volumeNote}
								</Typography>
							)}
						</Grid>
					</Grid>

					{db.totals && (
						<>
							<Divider />
							<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
								{[
									{ label: "Colecciones", value: fmtNum(db.totals.collections) },
									{ label: "Documentos", value: fmtNum(db.totals.documents) },
									...(db.totals.dataBytes != null ? [{ label: "Datos", value: fmtBytes(db.totals.dataBytes) }] : []),
									{ label: "En disco", value: fmtBytes(db.totals.storageBytes) },
									...(db.totals.indexBytes != null ? [{ label: "Índices", value: fmtBytes(db.totals.indexBytes) }] : []),
								].map((m) => (
									<Box key={m.label}>
										<Typography variant="caption" color="text.secondary">
											{m.label}
										</Typography>
										<Typography variant="h5" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{m.value}
										</Typography>
									</Box>
								))}
							</Stack>
						</>
					)}

					{db.error && <Alert severity="error">{db.error}</Alert>}
					{db.notInstrumented && <Alert severity="info">{db.notInstrumented}</Alert>}
				</Stack>
			</MainCard>

			{!db.notInstrumented && (
				<MainCard
					title={
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
							<span>Colecciones</span>
							<Chip size="small" variant="outlined" label={`${db.collections?.length ?? 0} en total`} />
							{db.key === "qdrant" && (
								<Typography variant="caption" color="text.secondary">
									El tamaño en disco lo mide el monitor del box: la API de Qdrant no lo expone.
								</Typography>
							)}
						</Stack>
					}
				>
					<CollectionsTable db={db} />
				</MainCard>
			)}
		</Stack>
	);
};

export default function DatabasesMonitoring() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
	const [history, setHistory] = useState<HistoryPoint[]>([]);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const tabValues = useMemo(() => ["resumen", ...databases.map((d) => d.key)], [databases]);
	const [activeTab, setActiveTab] = useTabParam("db", tabValues.length > 1 ? tabValues : ["resumen"]);

	const load = useCallback(async (force = false) => {
		setLoading(true);
		try {
			const res = await DatabasesService.getInventory(force);
			setDatabases(res.databases || []);
			setGeneratedAt(res.generatedAt);
			setError(null);
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudo cargar el inventario de bases");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	// La serie histórica sigue viniendo de los snapshots de worker_01: es la
	// única fuente con memoria (el inventario es siempre una foto de ahora).
	useEffect(() => {
		MonitoringService.getHistory(168)
			.then(setHistory)
			.catch(() => setHistory([]));
	}, []);

	const chartData = history.map((h) => ({
		t: fmtDate(h.createdAt),
		vectores: h.qdrant?.totalVectors ?? null,
		discoGB: h.host?.disk?.usedBytes != null ? Math.round((h.host.disk.usedBytes / 1e9) * 10) / 10 : null,
	}));

	const current = databases.find((d) => d.key === activeTab);

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Bases de datos
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Dónde vive cada base, cuánto ocupa, cuánto espacio le queda y qué hay adentro colección por colección.
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} alignItems="center">
						{generatedAt && (
							<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{fmtDate(generatedAt)}
							</Typography>
						)}
						<Tooltip title="Volver a consultar a cada base">
							<span>
								<IconButton size="small" onClick={() => load(true)} disabled={loading}>
									{loading ? <CircularProgress size={16} /> : <Refresh size={18} />}
								</IconButton>
							</span>
						</Tooltip>
					</Stack>
				</Stack>

				{error && <Alert severity="error">{error}</Alert>}

				<Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", borderColor: headerBorder(isDark), boxShadow: "none" }}>
					<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.04 : 0.025) }}>
						<Tabs
							value={tabValues.includes(activeTab) ? activeTab : "resumen"}
							onChange={(_, v) => setActiveTab(v)}
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": {
									minHeight: 48,
									textTransform: "none",
									fontSize: "0.85rem",
									fontWeight: 500,
									transition: "color 200ms ease",
								},
							}}
						>
							<Tab value="resumen" label="Resumen" />
							{databases.map((db) => (
								<Tab key={db.key} value={db.key} label={db.shortName || db.name} />
							))}
						</Tabs>
					</Box>

					<Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
						{activeTab === "resumen" || !current ? (
							<Stack spacing={3}>
								{loading && databases.length === 0 ? (
									<Stack alignItems="center" sx={{ py: 6 }}>
										<CircularProgress size={28} />
									</Stack>
								) : (
									<Grid container spacing={2}>
										{databases.map((db) => (
											<Grid item xs={12} md={6} key={db.key}>
												<DbCard db={db} onOpen={() => setActiveTab(db.key)} />
											</Grid>
										))}
									</Grid>
								)}

								<MainCard title="Tendencia (últimos 7 días)">
									{chartData.length > 1 ? (
										<ResponsiveContainer width="100%" height={280}>
											<LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
												<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
												<XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={40} />
												<YAxis yAxisId="v" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
												<YAxis yAxisId="d" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}GB`} />
												<RTooltip />
												<Line
													yAxisId="v"
													type="monotone"
													dataKey="vectores"
													name="Vectores"
													stroke={BRAND_BLUE}
													dot={false}
													strokeWidth={2}
												/>
												<Line
													yAxisId="d"
													type="monotone"
													dataKey="discoGB"
													name="Disco worker_01 (GB)"
													stroke={theme.palette.warning.main}
													dot={false}
													strokeWidth={2}
												/>
											</LineChart>
										</ResponsiveContainer>
									) : (
										<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
											Acumulando datos para la tendencia (un snapshot cada ~10 min en worker_01).
										</Typography>
									)}
								</MainCard>
							</Stack>
						) : (
							<DbPanel db={current} />
						)}
					</Box>
				</Paper>
			</Stack>
		</MainCard>
	);
}
