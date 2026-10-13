import { useCallback, useEffect, useState } from "react";
import {
	Box,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import HcRelevamientoService, { Carga, ESTADO_CARGA_LABEL, EstadoCarga } from "api/hcRelevamiento";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import { EstadoChip, fmtFechaHora, headSx } from "./comun";
import { ListaCargas, SubirPrpa } from "./CargaPrpa";
import CasoDrawer from "./CasoDrawer";

export default function CargasTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [docs, setDocs] = useState<Carga[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [estado, setEstado] = useState<EstadoCarga | "">("");
	const [loading, setLoading] = useState(false);
	const [seleccion, setSeleccion] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		try {
			setLoading(true);
			const r = await HcRelevamientoService.listCargas({ page: page + 1, limit: 25, ...(estado ? { estado } : {}) });
			setDocs(r.docs);
			setTotal(r.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error listando las cargas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, estado, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	// mientras haya cargas en curso, refresca cada 30 s
	useEffect(() => {
		if (!docs.some((d) => d.estado === "pendiente" || d.estado === "procesando")) return;
		const t = setInterval(cargar, 30000);
		return () => clearInterval(t);
	}, [docs, cargar]);

	return (
		<Stack spacing={2}>
			<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), borderRadius: 1.5 }}>
				<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
					Cargar el PRPA original de una causa
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					Para una causa del fuero de Seguridad Social que todavía no tiene caso (o para sumar otra constancia). Para reemplazar la lectura
					de un caso existente, cargalo desde su detalle. El original se guarda en un bucket privado y cifrado; en la base quedan solo los
					datos del cálculo.
				</Typography>
				<SubirPrpa onSubida={() => cargar()} />
			</Paper>

			<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), borderRadius: 1.5 }}>
				<Stack direction="row" spacing={1} alignItems="center">
					<FormControl size="small" sx={{ minWidth: 170 }}>
						<InputLabel>Estado</InputLabel>
						<Select
							value={estado}
							label="Estado"
							onChange={(e) => {
								setEstado(e.target.value as EstadoCarga | "");
								setPage(0);
							}}
						>
							<MenuItem value="">— todos —</MenuItem>
							{(Object.keys(ESTADO_CARGA_LABEL) as EstadoCarga[]).map((k) => (
								<MenuItem key={k} value={k}>
									{ESTADO_CARGA_LABEL[k]}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Box sx={{ flex: 1 }} />
					<Typography variant="caption" color="text.secondary">
						{total} cargas · se procesan cada 5 minutos en worker_02
					</Typography>
					<Tooltip title="Refrescar">
						<IconButton size="small" onClick={cargar} disabled={loading} sx={{ "&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12) } }}>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Paper>

			<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark), borderRadius: 1.5 }}>
				<Table size="small">
					<TableHead>
						<TableRow sx={headSx(isDark)}>
							<TableCell sx={{ width: 140 }}>Subido</TableCell>
							<TableCell sx={{ width: 120 }}>Causa</TableCell>
							<TableCell sx={{ width: 130 }}>Destino</TableCell>
							<TableCell sx={{ width: 120 }}>Estado</TableCell>
							<TableCell>Resultado</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading && !docs.length
							? Array.from({ length: 4 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={5}>
											<Skeleton variant="text" height={28} />
										</TableCell>
									</TableRow>
							  ))
							: docs.map((c) => (
									<TableRow key={c._id}>
										<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{fmtFechaHora(c.subidoEn)}</TableCell>
										<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{c.causaNumber ? `${c.causaNumber}/${c.causaYear}` : "—"}
										</TableCell>
										<TableCell sx={{ fontSize: "0.75rem" }}>{c.prpaId ? "Reemplaza un caso" : "Caso nuevo"}</TableCell>
										<TableCell>
											<EstadoChip estado={c.estado} isDark={isDark} label={ESTADO_CARGA_LABEL[c.estado] || c.estado} />
										</TableCell>
										<TableCell>
											<ListaCargas cargas={[{ ...c, nota: c.nota }]} isDark={isDark} onAbrir={setSeleccion} />
										</TableCell>
									</TableRow>
							  ))}
						{!loading && !docs.length && (
							<TableRow>
								<TableCell colSpan={5}>
									<Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
										Todavía no se cargó ningún PRPA original
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={total}
				page={page}
				onPageChange={(_, p) => setPage(p)}
				rowsPerPage={25}
				rowsPerPageOptions={[25]}
				labelRowsPerPage="Filas"
			/>
			<CasoDrawer id={seleccion} onClose={() => setSeleccion(null)} onGuardado={cargar} />
		</Stack>
	);
}
