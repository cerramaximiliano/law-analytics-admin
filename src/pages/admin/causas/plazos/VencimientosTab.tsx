import { useCallback, useEffect, useState } from "react";
import {
	Chip,
	MenuItem,
	Paper,
	Skeleton,
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
} from "@mui/material";
import { useSnackbar } from "notistack";
import { getVencimientos, PlazoNotificacion } from "api/plazos";

const FUEROS = ["", "CIV", "CSS", "CNT", "COM"];
const hoy = () => new Date().toISOString().slice(0, 10);

export default function VencimientosTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<PlazoNotificacion[]>([]);
	const [count, setCount] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [loading, setLoading] = useState(true);
	const [fuero, setFuero] = useState("");
	const [desde, setDesde] = useState(hoy());

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const resp = await getVencimientos({ page: page + 1, limit: rowsPerPage, fuero: fuero || undefined, desde: desde || undefined });
			setRows(resp.data);
			setCount(resp.count);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando vencimientos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, fuero, desde, enqueueSnackbar]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const diasRestantes = (v: string) => Math.ceil((new Date(`${v}T00:00:00Z`).getTime() - Date.now()) / 86400000);

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
				<TextField
					size="small"
					label="Desde"
					type="date"
					value={desde}
					onChange={(e) => { setDesde(e.target.value); setPage(0); }}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField select size="small" label="Fuero" value={fuero} onChange={(e) => { setFuero(e.target.value); setPage(0); }} sx={{ minWidth: 120 }}>
					{FUEROS.map((f) => (
						<MenuItem key={f} value={f}>
							{f || "Todos"}
						</MenuItem>
					))}
				</TextField>
			</Stack>

			<TableContainer component={Paper} elevation={0} sx={{ maxHeight: "calc(100dvh - 420px)" }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Vence</TableCell>
							<TableCell>Días rest.</TableCell>
							<TableCell>Gracia</TableCell>
							<TableCell>Causa</TableCell>
							<TableCell>Carátula</TableCell>
							<TableCell>Plazo</TableCell>
							<TableCell>Fundamento</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={7}>
											<Skeleton />
										</TableCell>
									</TableRow>
								))
							: rows.map((r) => {
									const rest = r.plazo ? diasRestantes(r.plazo.vencimiento) : null;
									return (
										<TableRow key={r._id} hover>
											<TableCell sx={{ fontWeight: 600 }}>{r.plazo?.vencimiento}</TableCell>
											<TableCell>
												{rest !== null && (
													<Chip size="small" label={`${rest}d`} color={rest <= 1 ? "error" : rest <= 3 ? "warning" : "default"} variant="outlined" />
												)}
											</TableCell>
											<TableCell>{r.plazo?.vencimientoConGracia || "—"}</TableCell>
											<TableCell>
												{r.number}/{r.year} [{r.fuero}]
											</TableCell>
											<TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
												{r.caratula || "—"}
											</TableCell>
											<TableCell>
												{r.plazo ? `${r.plazo.plazoDias}d ${r.plazo.tipoPlazo}` : "—"}
											</TableCell>
											<TableCell>
												{r.plazo?.fuente === "texto" ? (
													<Chip size="small" color="primary" variant="outlined" label="texto expreso" />
												) : (
													<Chip size="small" variant="outlined" label={r.plazo?.norma?.cita || "norma"} />
												)}
											</TableCell>
										</TableRow>
									);
								})}
						{!loading && rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={7}>
									<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
										Sin vencimientos futuros computados
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={count}
				page={page}
				onPageChange={(_, p) => setPage(p)}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50, 100]}
				labelRowsPerPage="Por página:"
			/>
		</Stack>
	);
}
