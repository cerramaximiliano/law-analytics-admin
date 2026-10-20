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
import HcRelevamientoService, {
	CasoListItem,
	CasosParams,
	COMPONENTES,
	ESTADO_LABEL,
	MOTIVO_LABEL,
	MotivoRevision,
} from "api/hcRelevamiento";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import { ComponenteChip, EstadoChip, MotivoChip, headSx } from "./comun";
import CasoDrawer from "./CasoDrawer";

interface Props {
	/** Filtros fijos de la solapa (p. ej. revisión requerida). */
	base: CasosParams;
	/** Muestra los filtros de motivo y estado de la revisión. */
	modoRevision?: boolean;
}

const ESTADOS = ["abierto", "insumo", "explicado", "cerrado", "error_motor", "sin_comparables", "descartado", "reemplazado", "sentencia", "docente"];

export default function CasosTable({ base, modoRevision }: Props) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();

	const [docs, setDocs] = useState<CasoListItem[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [loading, setLoading] = useState(false);
	const [estado, setEstado] = useState("");
	const [motivo, setMotivo] = useState<MotivoRevision | "">("");
	const [componente, setComponente] = useState("");
	const [fuente, setFuente] = useState<"detalleBeneficio" | "sica">(base.fuente === "sica" ? "sica" : "detalleBeneficio");
	const [seleccion, setSeleccion] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		try {
			setLoading(true);
			const params: CasosParams = { ...base, fuente, page: page + 1, limit: rowsPerPage };
			if (estado) params.estado = estado;
			if (motivo) params.motivo = motivo;
			if (componente) {
				params.componente = componente as CasosParams["componente"];
				params.componenteEstado = "abierto";
			}
			const res = await HcRelevamientoService.listCasos(params);
			setDocs(res.docs);
			setTotal(res.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error listando casos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [base, fuente, page, rowsPerPage, estado, motivo, componente, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const reset = () => setPage(0);

	return (
		<Stack spacing={2}>
			<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), borderRadius: 1.5 }}>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
					{!modoRevision && (
						<FormControl size="small" sx={{ minWidth: 190 }}>
							<InputLabel>Fuente</InputLabel>
							<Select
								value={fuente}
								label="Fuente"
								onChange={(e) => {
									setFuente(e.target.value as "detalleBeneficio" | "sica");
									reset();
								}}
							>
								<MenuItem value="detalleBeneficio">Constancias (primeros pagos)</MenuItem>
								<MenuItem value="sica">Hojas SICA (sentencia)</MenuItem>
							</Select>
						</FormControl>
					)}
					<FormControl size="small" sx={{ minWidth: 160 }}>
						<InputLabel>Estado</InputLabel>
						<Select
							value={estado}
							label="Estado"
							onChange={(e) => {
								setEstado(e.target.value);
								reset();
							}}
						>
							<MenuItem value="">— todos —</MenuItem>
							{ESTADOS.map((s) => (
								<MenuItem key={s} value={s}>
									{ESTADO_LABEL[s as keyof typeof ESTADO_LABEL] || s}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{modoRevision && (
						<FormControl size="small" sx={{ minWidth: 230 }}>
							<InputLabel>Motivo</InputLabel>
							<Select
								value={motivo}
								label="Motivo"
								onChange={(e) => {
									setMotivo(e.target.value as MotivoRevision | "");
									reset();
								}}
							>
								<MenuItem value="">— todos —</MenuItem>
								{(Object.keys(MOTIVO_LABEL) as MotivoRevision[]).map((m) => (
									<MenuItem key={m} value={m}>
										{MOTIVO_LABEL[m]}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
					<FormControl size="small" sx={{ minWidth: 170 }}>
						<InputLabel>Componente abierto</InputLabel>
						<Select
							value={componente}
							label="Componente abierto"
							onChange={(e) => {
								setComponente(e.target.value);
								reset();
							}}
						>
							<MenuItem value="">— cualquiera —</MenuItem>
							{COMPONENTES.map((c) => (
								<MenuItem key={c} value={c}>
									{c}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Box sx={{ flex: 1 }} />
					<Tooltip title="Refrescar">
						<IconButton size="small" onClick={cargar} disabled={loading} sx={{ "&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12) } }}>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
					{loading ? "Cargando…" : `${total.toLocaleString("es-AR")} casos`}
				</Typography>
			</Paper>

			<TableContainer
				component={Paper}
				variant="outlined"
				sx={{ borderColor: headerBorder(isDark), borderRadius: 1.5, maxHeight: "calc(100dvh - 360px)" }}
			>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow sx={headSx(isDark)}>
							<TableCell sx={{ width: 90 }}>FAD</TableCell>
							<TableCell sx={{ width: 120 }}>Estado</TableCell>
							<TableCell>Componentes</TableCell>
							<TableCell>{modoRevision ? "Motivos de revisión" : "Desvíos / recálculos"}</TableCell>
							<TableCell sx={{ width: 120 }}>Revisión</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={5}>
											<Skeleton variant="text" height={28} />
										</TableCell>
									</TableRow>
							  ))
							: docs.map((d) => (
									<TableRow
										key={d._id}
										hover
										onClick={() => setSeleccion(d._id)}
										sx={{ cursor: "pointer", "&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) } }}
									>
										<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{d.fadMes || "—"}</TableCell>
										<TableCell>
											<EstadoChip estado={d.estado} isDark={isDark} />
										</TableCell>
										<TableCell>
											<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
												{COMPONENTES.map((k) => (
													<ComponenteChip key={k} nombre={k} c={d.componentes?.[k]} isDark={isDark} />
												))}
												{!Object.keys(d.componentes || {}).length && (
													<Typography variant="caption" color="text.secondary">
														{(d.causas || []).join(" · ") || "—"}
													</Typography>
												)}
											</Stack>
										</TableCell>
										<TableCell>
											<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
												{modoRevision
													? (d.revision?.motivos || []).map((m) => <MotivoChip key={m} motivo={m} isDark={isDark} />)
													: [...(d.desvios || []).map((x) => `${x.regla}=${String(x.valor)}`), ...(d.recalculos || [])].map((t, i) => (
															<Typography key={i} variant="caption" sx={{ fontFamily: "monospace" }}>
																{t}
															</Typography>
													  ))}
											</Stack>
										</TableCell>
										<TableCell>
											{d.revision?.estado ? <EstadoChip estado={d.revision.estado} isDark={isDark} label={d.revision.estado} /> : "—"}
										</TableCell>
									</TableRow>
							  ))}
						{!loading && !docs.length && (
							<TableRow>
								<TableCell colSpan={5}>
									<Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
										Sin casos con estos filtros
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
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[25, 50, 100]}
				labelRowsPerPage="Filas"
			/>
			<CasoDrawer id={seleccion} onClose={() => setSeleccion(null)} onGuardado={cargar} />
		</Stack>
	);
}
