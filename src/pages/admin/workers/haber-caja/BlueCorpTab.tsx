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
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import HcRelevamientoService, {
	AnexoListItem,
	AnexosParams,
	Componente,
	ESTADO_LABEL,
	ProgramaResumenResponse,
	VistaPrograma,
} from "api/hcRelevamiento";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";
import { COLOR_ESTADO, ComponenteChip, EstadoChip, ROJO, fmtFechaHora, fmtNum, headSx } from "./comun";
import AnexoDrawer from "./AnexoDrawer";

const COMPONENTES_PROGRAMA: Componente[] = ["sumatoria", "W", "PBU", "PC", "PAP"];
const ESTADOS = ["cerrado", "abierto", "explicado", "insumo", "error_motor", "sin_comparables", "fuera_de_alcance"];

const VISTAS: { v: VistaPrograma; label: string; ayuda: string }[] = [
	{
		v: "sinFad",
		label: "Sin FAD",
		ayuda:
			'Anexos del haber de caja sin fecha de adquisición del derecho: el anexo no se emparejó con su sección "Haber Caja" (que trae la FAD, los tiempos y la PBU, PC y PAP impresas), así que no se puede correr el motor. Abrí el PDF y compará el W computado con el "Haber Relación Dep." de la sección.',
	},
	{
		v: "sinTope14",
		label: "Filas sin topear",
		ayuda:
			"Anexos con meses donde el motor topea la remuneración actualizada con el máximo a la cesación (Res. SSS 6/09 art. 14; Res. SSS 3/2021) y la columna que suma de BlueCorp no. En el detalle, cada fila muestra la actualizada, Otros Topes y el computado de BlueCorp frente al tope y la actualizada del motor. Ordenados por cantidad de filas.",
	},
	{ v: "abiertos", label: "Abiertos", ayuda: "Anexos con algún componente que no cierra contra lo impreso por BlueCorp." },
	{ v: "todos", label: "Todos", ayuda: "Todos los anexos del haber de caja evaluados." },
];

function Tarjeta({
	titulo,
	valor,
	detalle,
	color,
	isDark,
}: {
	titulo: string;
	valor: string;
	detalle?: string;
	color: string;
	isDark: boolean;
}) {
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
				minWidth: 150,
				flex: "1 1 150px",
				borderColor: headerBorder(isDark),
				borderLeft: `3px solid ${color}`,
				borderRadius: 1.5,
			}}
		>
			<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
				{titulo}
			</Typography>
			<Typography variant="h4" sx={{ fontFamily: "monospace", mt: 0.25 }}>
				{valor}
			</Typography>
			{detalle && (
				<Typography variant="caption" color="text.secondary">
					{detalle}
				</Typography>
			)}
		</Paper>
	);
}

export default function BlueCorpTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();

	const [resumen, setResumen] = useState<ProgramaResumenResponse | null>(null);
	const [vista, setVista] = useState<VistaPrograma>("sinTope14");
	const [estado, setEstado] = useState("");
	const [componente, setComponente] = useState("");
	const [docs, setDocs] = useState<AnexoListItem[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [loading, setLoading] = useState(false);
	const [seleccion, setSeleccion] = useState<string | null>(null);

	const cargarResumen = useCallback(async () => {
		try {
			setResumen(await HcRelevamientoService.getProgramaResumen());
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error obteniendo el resumen de BlueCorp", { variant: "error" });
		}
	}, [enqueueSnackbar]);

	const cargar = useCallback(async () => {
		try {
			setLoading(true);
			const params: AnexosParams = { vista, page: page + 1, limit: rowsPerPage };
			if (estado) params.estado = estado;
			if (componente) params.componente = componente as Componente;
			const res = await HcRelevamientoService.listProgramaAnexos(params);
			setDocs(res.docs);
			setTotal(res.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error listando anexos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [vista, estado, componente, page, rowsPerPage, enqueueSnackbar]);

	useEffect(() => {
		cargarResumen();
	}, [cargarResumen]);
	useEffect(() => {
		cargar();
	}, [cargar]);

	const u = resumen?.ultima;
	const pe = u?.porEstado || {};
	const conFad = (u?.evaluados || 0) - (u?.porCausa?.["sin FAD leída"] || 0) - (u?.porCausa?.["sin tiempos de servicio"] || 0);
	const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(0)} %` : "—");
	const ayuda = VISTAS.find((x) => x.v === vista)?.ayuda;

	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900 }}>
				Anexos del haber de caja de las liquidaciones BlueCorp (sección &quot;Haber Caja&quot;; el anexo del haber reajustado no se extrae)
				contra el motor con el perfil del programa. BlueCorp no es la norma: sirve de testigo y para validar el motor con todas las filas a
				la vista. El W de BlueCorp es el promedio computado, con el tope de la Res. SSS 6/09 en la columna Otros Topes.
			</Typography>

			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
				<Tarjeta
					titulo="Anexos evaluados"
					valor={fmtNum(u?.evaluados, 0)}
					detalle={u ? `pasada ${fmtFechaHora(u._id)}` : undefined}
					color={BRAND_BLUE}
					isDark={isDark}
				/>
				<Tarjeta
					titulo="Cerrados"
					valor={fmtNum(pe.cerrado, 0)}
					detalle={`${pct(pe.cerrado || 0, conFad)} de los que tienen FAD`}
					color={LIVE_GREEN}
					isDark={isDark}
				/>
				<Tarjeta
					titulo="Abiertos"
					valor={fmtNum(pe.abierto, 0)}
					detalle={`explicados ${fmtNum(pe.explicado, 0)}`}
					color={ROJO}
					isDark={isDark}
				/>
				<Tarjeta
					titulo="Sin FAD"
					valor={fmtNum(resumen?.vistas?.sinFad, 0)}
					detalle={pct(resumen?.vistas?.sinFad || 0, u?.evaluados || 0)}
					color={STALE_AMBER}
					isDark={isDark}
				/>
				<Tarjeta
					titulo="Filas sin topear"
					valor={fmtNum(resumen?.filasSinTope14, 0)}
					detalle={`en ${fmtNum(resumen?.vistas?.sinTope14, 0)} anexos · topean igual ${fmtNum(u?.filas?.tope14, 0)}`}
					color={COLOR_ESTADO.abierto}
					isDark={isDark}
				/>
			</Stack>

			<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), borderRadius: 1.5 }}>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
					<ToggleButtonGroup
						size="small"
						exclusive
						value={vista}
						onChange={(_, v) => {
							if (v) {
								setVista(v);
								setPage(0);
							}
						}}
					>
						{VISTAS.map((x) => (
							<ToggleButton key={x.v} value={x.v} sx={{ textTransform: "none", px: 1.5 }}>
								{x.label}
								{resumen?.vistas?.[x.v] !== undefined && (
									<Typography component="span" variant="caption" sx={{ ml: 0.75, fontFamily: "monospace", color: "text.secondary" }}>
										{resumen.vistas[x.v].toLocaleString("es-AR")}
									</Typography>
								)}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<FormControl size="small" sx={{ minWidth: 150 }}>
						<InputLabel>Estado</InputLabel>
						<Select
							value={estado}
							label="Estado"
							onChange={(e) => {
								setEstado(e.target.value);
								setPage(0);
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
					<FormControl size="small" sx={{ minWidth: 170 }}>
						<InputLabel>Componente abierto</InputLabel>
						<Select
							value={componente}
							label="Componente abierto"
							onChange={(e) => {
								setComponente(e.target.value);
								setPage(0);
							}}
						>
							<MenuItem value="">— cualquiera —</MenuItem>
							{COMPONENTES_PROGRAMA.map((c) => (
								<MenuItem key={c} value={c}>
									{c}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Box sx={{ flex: 1 }} />
					<Tooltip title="Refrescar">
						<IconButton
							size="small"
							onClick={() => {
								cargarResumen();
								cargar();
							}}
							disabled={loading}
							sx={{ "&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12) } }}
						>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
				</Stack>
				{ayuda && (
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", maxWidth: 1000 }}>
						{ayuda}
					</Typography>
				)}
				<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
					{loading ? "Cargando…" : `${total.toLocaleString("es-AR")} anexos`}
				</Typography>
			</Paper>

			<TableContainer
				component={Paper}
				variant="outlined"
				sx={{ borderColor: headerBorder(isDark), borderRadius: 1.5, maxHeight: "calc(100dvh - 420px)" }}
			>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow sx={headSx(isDark)}>
							<TableCell sx={{ width: 90 }}>FAD</TableCell>
							<TableCell sx={{ width: 120 }}>Estado</TableCell>
							<TableCell>Componentes</TableCell>
							<TableCell align="right" sx={{ width: 130 }}>
								W computado
							</TableCell>
							<TableCell align="right" sx={{ width: 130 }}>
								W actualizado
							</TableCell>
							<TableCell sx={{ width: 190 }}>Filas (motor vs. BlueCorp)</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={6}>
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
												{COMPONENTES_PROGRAMA.map((k) => (
													<ComponenteChip key={k} nombre={k} c={d.componentes?.[k]} isDark={isDark} />
												))}
												{!Object.keys(d.componentes || {}).length && (
													<Typography variant="caption" color="text.secondary">
														{(d.causas || []).join(" · ") || "—"}
													</Typography>
												)}
											</Stack>
										</TableCell>
										<TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{fmtNum(d.impresos?.W)}
										</TableCell>
										<TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
											{d.impresos?.Wactualizado ? fmtNum(d.impresos.Wactualizado) : "="}
										</TableCell>
										<TableCell sx={{ fontSize: "0.72rem" }}>
											{d.filas ? (
												<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
													<span>{d.filas.filas} filas</span>
													{d.filas.sinTope14 > 0 && <span style={{ color: ROJO, fontWeight: 600 }}>{d.filas.sinTope14} sin topear</span>}
													{d.filas.tope14 > 0 && <span style={{ color: LIVE_GREEN }}>{d.filas.tope14} topean igual</span>}
													{d.filas.tope14SinNorma > 0 && <span>{d.filas.tope14SinNorma} topea solo BlueCorp</span>}
												</Stack>
											) : (
												"—"
											)}
										</TableCell>
									</TableRow>
							  ))}
						{!loading && !docs.length && (
							<TableRow>
								<TableCell colSpan={6}>
									<Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
										Sin anexos con estos filtros
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
			<AnexoDrawer id={seleccion} onClose={() => setSeleccion(null)} />
		</Stack>
	);
}
