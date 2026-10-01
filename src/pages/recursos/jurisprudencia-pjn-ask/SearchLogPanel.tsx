import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	FormControlLabel,
	MenuItem,
	Stack,
	Switch,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TablePagination,
	TableRow,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import SearchLogService, { PublicLogResponse, SearchLogQueryStat, SemanticLogResponse } from "api/searchLog";

const PAGE_SIZE = 25;
const DAY_OPTIONS = [7, 30, 90, 365];

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

const QueryList = ({ title, rows, showAvg }: { title: string; rows: SearchLogQueryStat[]; showAvg?: boolean }) => (
	<Box sx={{ flex: 1, minWidth: 260 }}>
		<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
			{title}
		</Typography>
		{rows.length === 0 ? (
			<Typography variant="caption" color="text.disabled">
				Sin datos
			</Typography>
		) : (
			<Stack spacing={0.25}>
				{rows.map((q) => (
					<Stack key={q.query} direction="row" justifyContent="space-between" spacing={1}>
						<Typography variant="caption" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
							{q.query}
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
							<strong>{q.count}</strong>
							{showAvg && q.avgResults != null ? ` · ~${Math.round(q.avgResults)} res.` : ""}
						</Typography>
					</Stack>
				))}
			</Stack>
		)}
	</Box>
);

const ResultsChip = ({ total }: { total: number | null }) => (
	<Chip size="small" variant="outlined" color={total === 0 ? "error" : "default"} label={total ?? "—"} />
);

const SearchLogPanel = () => {
	const [tab, setTab] = useState<"semantic" | "public">("semantic");
	const [days, setDays] = useState(30);
	const [page, setPage] = useState(0);
	const [zeroOnly, setZeroOnly] = useState(false);
	const [userId, setUserId] = useState<string>("");
	const [bots, setBots] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [semantic, setSemantic] = useState<SemanticLogResponse | null>(null);
	const [pub, setPub] = useState<PublicLogResponse | null>(null);

	const load = useCallback(() => {
		setLoading(true);
		setError(null);
		const common = { days, page: page + 1, limit: PAGE_SIZE, zeroOnly };
		const req =
			tab === "semantic"
				? SearchLogService.semantic({ ...common, userId: userId || undefined }).then(setSemantic)
				: SearchLogService.publica({ ...common, bots }).then(setPub);
		req.catch(() => setError("No se pudo cargar el registro de búsquedas.")).finally(() => setLoading(false));
	}, [tab, days, page, zeroOnly, userId, bots]);

	useEffect(() => {
		load();
	}, [load]);

	const resetPage = () => setPage(0);

	return (
		<Card variant="outlined">
			<CardContent sx={{ py: "12px !important" }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1}>
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography variant="body2" fontWeight={600}>
							Registro de búsquedas de jurisprudencia
						</Typography>
						{loading && <CircularProgress size={12} />}
					</Stack>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<TextField
							select
							size="small"
							label="Ventana"
							value={days}
							onChange={(e) => {
								setDays(Number(e.target.value));
								resetPage();
							}}
							sx={{ minWidth: 110 }}
						>
							{DAY_OPTIONS.map((d) => (
								<MenuItem key={d} value={d}>
									{d} días
								</MenuItem>
							))}
						</TextField>
						<FormControlLabel
							control={
								<Switch
									size="small"
									checked={zeroOnly}
									onChange={(e) => {
										setZeroOnly(e.target.checked);
										resetPage();
									}}
								/>
							}
							label={<Typography variant="caption">Solo sin resultados</Typography>}
						/>
						{tab === "public" && (
							<FormControlLabel
								control={
									<Switch
										size="small"
										checked={bots}
										onChange={(e) => {
											setBots(e.target.checked);
											resetPage();
										}}
									/>
								}
								label={<Typography variant="caption">Incluir bots</Typography>}
							/>
						)}
						<Tooltip title="Refrescar">
							<Button size="small" onClick={load} disabled={loading} sx={{ minWidth: 0 }}>
								<Refresh size={16} />
							</Button>
						</Tooltip>
					</Stack>
				</Stack>

				<Tabs
					value={tab}
					onChange={(_, v) => {
						setTab(v);
						resetPage();
					}}
					sx={{ minHeight: 36, mb: 1 }}
				>
					<Tab value="semantic" label="Semántica (usuarios registrados)" sx={{ minHeight: 36, py: 0 }} />
					<Tab value="public" label="Pública (visitantes, texto)" sx={{ minHeight: 36, py: 0 }} />
				</Tabs>

				{error && <Alert severity="error">{error}</Alert>}

				{tab === "semantic" && semantic && (
					<>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
							<Chip size="small" label={`${semantic.totals.searches} búsquedas`} />
							<Chip size="small" label={`${semantic.totals.users} usuarios`} />
							<Chip size="small" color="error" variant="outlined" label={`${semantic.totals.zeroResults} sin resultados`} />
						</Stack>

						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
							Búsquedas por usuario (click para filtrar el detalle)
						</Typography>
						<Table size="small" sx={{ mb: 2 }}>
							<TableHead>
								<TableRow>
									<TableCell>Usuario</TableCell>
									<TableCell>Plan</TableCell>
									<TableCell>Origen</TableCell>
									<TableCell align="right">Búsquedas</TableCell>
									<TableCell align="right">Sin result.</TableCell>
									<TableCell>Última</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{semantic.byUser.map((u) => (
									<TableRow
										key={u.userId}
										hover
										selected={userId === u.userId}
										sx={{ cursor: "pointer" }}
										onClick={() => {
											setUserId(userId === u.userId ? "" : u.userId);
											resetPage();
										}}
									>
										<TableCell>{u.email || u.userId}</TableCell>
										<TableCell>{u.plan || "—"}</TableCell>
										<TableCell>{u.consumer}</TableCell>
										<TableCell align="right">
											<strong>{u.searches}</strong>
										</TableCell>
										<TableCell align="right">{u.zeroResults}</TableCell>
										<TableCell>{fmtDate(u.last)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
							<QueryList title="Consultas más frecuentes" rows={semantic.topQueries} showAvg />
							<QueryList title="Consultas sin resultados" rows={semantic.zeroQueries} />
						</Stack>

						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
							<Typography variant="caption" color="text.secondary">
								Detalle {userId ? "del usuario seleccionado" : "reciente"}
							</Typography>
							{userId && <Chip size="small" label="quitar filtro" onDelete={() => setUserId("")} />}
						</Stack>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fecha</TableCell>
									<TableCell>Usuario</TableCell>
									<TableCell>Tipo</TableCell>
									<TableCell>Consulta</TableCell>
									<TableCell align="right">Result.</TableCell>
									<TableCell align="right">ms</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{semantic.items.map((i) => (
									<TableRow key={i.id}>
										<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(i.createdAt)}</TableCell>
										<TableCell>{i.email || i.userId}</TableCell>
										<TableCell>
											{i.tipo}
											{i.consumer === "mcp" ? " · mcp" : ""}
										</TableCell>
										<TableCell sx={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }}>{i.query}</TableCell>
										<TableCell align="right">
											<ResultsChip total={i.total} />
										</TableCell>
										<TableCell align="right">{i.latencyMs ?? "—"}</TableCell>
									</TableRow>
								))}
								{semantic.items.length === 0 && (
									<TableRow>
										<TableCell colSpan={6}>
											<Typography variant="caption" color="text.secondary">
												Sin búsquedas registradas en la ventana (el registro por búsqueda empieza desde el deploy de esta función).
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
						<TablePagination
							component="div"
							count={semantic.listTotal}
							page={page}
							rowsPerPage={PAGE_SIZE}
							rowsPerPageOptions={[PAGE_SIZE]}
							onPageChange={(_, p) => setPage(p)}
						/>
					</>
				)}

				{tab === "public" && pub && (
					<>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
							<Chip size="small" label={`${pub.totals.searches} búsquedas`} />
							<Chip size="small" color="error" variant="outlined" label={`${pub.totals.zeroResults} sin resultados`} />
							<Chip size="small" variant="outlined" label="visitantes anónimos (sin usuario ni IP)" />
						</Stack>
						<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
							<QueryList title="Consultas más frecuentes" rows={pub.topQueries} showAvg />
							<QueryList title="Consultas sin resultados" rows={pub.zeroQueries} />
						</Stack>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fecha</TableCell>
									<TableCell>Consulta</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell>Jurisdicción</TableCell>
									<TableCell align="right">Result.</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{pub.items.map((i) => (
									<TableRow key={i.id}>
										<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(i.createdAt)}</TableCell>
										<TableCell sx={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis" }}>
											{i.query}
											{i.esBot && <Chip size="small" label="bot" sx={{ ml: 1 }} />}
										</TableCell>
										<TableCell>{i.fuero || "—"}</TableCell>
										<TableCell>{i.jurisdiccion || "—"}</TableCell>
										<TableCell align="right">
											<ResultsChip total={i.total} />
										</TableCell>
									</TableRow>
								))}
								{pub.items.length === 0 && (
									<TableRow>
										<TableCell colSpan={5}>
											<Typography variant="caption" color="text.secondary">
												Sin búsquedas registradas en la ventana (el registro empieza desde el deploy de esta función).
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
						<TablePagination
							component="div"
							count={pub.listTotal}
							page={page}
							rowsPerPage={PAGE_SIZE}
							rowsPerPageOptions={[PAGE_SIZE]}
							onPageChange={(_, p) => setPage(p)}
						/>
					</>
				)}
			</CardContent>
		</Card>
	);
};

export default SearchLogPanel;
