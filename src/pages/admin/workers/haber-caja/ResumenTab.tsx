import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Grid,
	IconButton,
	Paper,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import HcRelevamientoService, { ESTADO_LABEL, EstadoCaso, MOTIVO_LABEL, MotivoRevision, ResumenResponse } from "api/hcRelevamiento";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import { COLOR_ESTADO, GRIS, fmtFechaHora, headSx } from "./comun";

const ORDEN_CONSTANCIAS: EstadoCaso[] = [
	"cerrado",
	"explicado",
	"abierto",
	"insumo",
	"docente",
	"investigador",
	"error_motor",
	"sin_comparables",
	"descartado",
	"reemplazado",
	"fuera_de_alcance",
];

function Kpi({
	titulo,
	valor,
	color,
	detalle,
	isDark,
}: {
	titulo: string;
	valor: number | string;
	color: string;
	detalle?: string;
	isDark: boolean;
}) {
	return (
		<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), borderLeft: `3px solid ${color}`, height: "100%" }}>
			<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
				{titulo}
			</Typography>
			<Typography variant="h3" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
				{typeof valor === "number" ? valor.toLocaleString("es-AR") : valor}
			</Typography>
			{detalle && (
				<Typography variant="caption" color="text.secondary">
					{detalle}
				</Typography>
			)}
		</Paper>
	);
}

export default function ResumenTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [data, setData] = useState<ResumenResponse | null>(null);
	const [loading, setLoading] = useState(false);

	const cargar = useCallback(async () => {
		try {
			setLoading(true);
			setData(await HcRelevamientoService.getResumen(48));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando el resumen", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	if (!data)
		return (
			<Stack spacing={2}>
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} variant="rounded" height={80} />
				))}
			</Stack>
		);

	const est = (e: string) => data.estados[`detalleBeneficio:${e}`] || 0;
	const totalConstancias = Object.entries(data.estados)
		.filter(([k]) => k.startsWith("detalleBeneficio:"))
		.reduce((s, [, n]) => s + n, 0);
	const sica = data.estados["sica:sentencia"] || 0;
	const ultima = data.ultima;
	const desvios = Object.entries(ultima?.desviosAcumulados || {}).sort((a, b) => b[1] - a[1]);
	const desviosFila = Object.entries(ultima?.desviosFilaAcumulados || {}).sort((a, b) => b[1].filas - a[1].filas);
	const filasAcum = ultima?.filasAcumuladas;
	const haceMin = ultima ? Math.round((Date.now() - new Date(ultima._id).getTime()) / 60000) : null;

	return (
		<Stack spacing={2.5}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Typography variant="body2" color="text.secondary">
					Última pasada: {fmtFechaHora(ultima?._id)} {haceMin !== null ? `(hace ${haceMin} min)` : ""} ·{" "}
					{ultima?.evaluados?.toLocaleString("es-AR") ?? 0} evaluados · {ultima?.segundos ?? "—"} s · motor {ultima?.versionHub || "—"}
				</Typography>
				<Box sx={{ flex: 1 }} />
				<Tooltip title="Refrescar">
					<IconButton size="small" onClick={cargar} disabled={loading} sx={{ "&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12) } }}>
						<Refresh size={16} />
					</IconButton>
				</Tooltip>
			</Stack>
			{haceMin !== null && haceMin > 90 && (
				<Alert severity="warning">
					La última pasada tiene más de una hora y media: revisar el cron en worker_02 (logs/hc-relevamiento.log).
				</Alert>
			)}

			<Grid container spacing={2}>
				<Grid item xs={6} md={3}>
					<Kpi
						titulo="Constancias"
						valor={totalConstancias}
						color={BRAND_BLUE}
						detalle="primeros pagos: miden el haber de caja"
						isDark={isDark}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Kpi
						titulo="Cerradas o explicadas"
						valor={est("cerrado") + est("explicado")}
						color={COLOR_ESTADO.cerrado}
						detalle={`${est("cerrado")} cerradas · ${est("explicado")} explicadas`}
						isDark={isDark}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Kpi
						titulo="Revisión manual"
						valor={data.revision.requerida}
						color={COLOR_ESTADO.pendiente}
						detalle={`${data.revision.revisadas} revisadas`}
						isDark={isDark}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Kpi titulo="Hojas SICA (sentencia)" valor={sica} color={GRIS} detalle="referencia, fuera del cierre" isDark={isDark} />
				</Grid>
			</Grid>

			<Grid container spacing={2}>
				<Grid item xs={12} md={4}>
					<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), height: "100%" }}>
						<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
							Constancias por estado
						</Typography>
						{ORDEN_CONSTANCIAS.filter((e) => est(e)).map((e) => (
							<Stack key={e} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
								<Typography variant="body2" sx={{ color: COLOR_ESTADO[e] === GRIS ? "text.secondary" : undefined }}>
									{ESTADO_LABEL[e]}
								</Typography>
								<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
									{est(e)}
								</Typography>
							</Stack>
						))}
					</Paper>
				</Grid>
				<Grid item xs={12} md={4}>
					<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), height: "100%" }}>
						<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
							Revisión manual por motivo
						</Typography>
						{Object.entries(data.revision.porMotivo)
							.sort((a, b) => b[1] - a[1])
							.map(([m, n]) => (
								<Stack key={m} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
									<Typography variant="body2">{MOTIVO_LABEL[m as MotivoRevision] || m}</Typography>
									<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{n}
									</Typography>
								</Stack>
							))}
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
							Un caso puede tener varios motivos.
						</Typography>
					</Paper>
				</Grid>
				<Grid item xs={12} md={4}>
					<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), height: "100%" }}>
						<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
							Desvíos de ANSES frente a la norma
						</Typography>
						{desvios.length ? (
							desvios.map(([k, n]) => (
								<Stack key={k} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
									<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
										{k}
									</Typography>
									<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{n}
									</Typography>
								</Stack>
							))
						) : (
							<Typography variant="body2" color="text.secondary">
								Sin desvíos verificados
							</Typography>
						)}
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
							Solo cuentan los que lo impreso confirma.
						</Typography>
						{!!desviosFila.length && (
							<>
								<Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
									Verificados fila por fila
								</Typography>
								{desviosFila.map(([k, v]) => (
									<Stack key={k} direction="row" justifyContent="space-between" sx={{ py: 0.25 }}>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
											{k}
										</Typography>
										<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{v.casos} casos · {v.filas.toLocaleString("es-AR")} filas
										</Typography>
									</Stack>
								))}
							</>
						)}
						{filasAcum && (
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
								Filas contra el actualizado impreso: {filasAcum.ok.toLocaleString("es-AR")} exactas ·{" "}
								{filasAcum.corregida.toLocaleString("es-AR")} con importe corregido · {filasAcum.desalineada.toLocaleString("es-AR")} con
								columnas corridas · {filasAcum.sinExplicar.toLocaleString("es-AR")} sin explicar.
							</Typography>
						)}
					</Paper>
				</Grid>
			</Grid>

			<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
				Pasadas (cada hora, minuto 17)
			</Typography>
			<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark), maxHeight: 360 }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow sx={headSx(isDark)}>
							<TableCell>Fecha</TableCell>
							<TableCell align="right">PRPA</TableCell>
							<TableCell align="right">Nuevos</TableCell>
							<TableCell align="right">Evaluados</TableCell>
							<TableCell align="right">Revisión</TableCell>
							<TableCell align="right">Segundos</TableCell>
							<TableCell>Motor</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{data.historial.map((p) => (
							<TableRow key={p._id}>
								<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{fmtFechaHora(p._id)}</TableCell>
								<TableCell align="right">{p.totalPrpa?.toLocaleString("es-AR")}</TableCell>
								<TableCell align="right">{p.nuevos}</TableCell>
								<TableCell align="right">{p.evaluados?.toLocaleString("es-AR")}</TableCell>
								<TableCell align="right">{p.revision?.requerida ?? "—"}</TableCell>
								<TableCell align="right">{p.segundos}</TableCell>
								<TableCell sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}>
									{(p.versionHub || "").replace("law-analytics-server@", "")}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Stack>
	);
}
