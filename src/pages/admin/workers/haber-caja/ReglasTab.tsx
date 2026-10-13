import { useCallback, useEffect, useState } from "react";
import {
	Chip,
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
import { useSnackbar } from "notistack";
import HcRelevamientoService, { DesviosResponse, Regla } from "api/hcRelevamiento";
import { LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";
import { headSx } from "./comun";
import CasoDrawer from "./CasoDrawer";

export default function ReglasTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [reglas, setReglas] = useState<Regla[]>([]);
	const [desvios, setDesvios] = useState<DesviosResponse | null>(null);
	const [seleccion, setSeleccion] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		try {
			const [r, d] = await Promise.all([HcRelevamientoService.getResumen(1), HcRelevamientoService.getDesvios()]);
			setReglas(r.reglas);
			setDesvios(d);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando reglas y desvíos", { variant: "error" });
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	if (!desvios) return <Skeleton variant="rounded" height={240} />;

	const porRegla = (id: string) => desvios.desvios.filter((d) => d.regla === id);
	const abiertos = (ocr: boolean) => desvios.abiertos.filter((a) => a.conMotivoOcr === ocr);

	return (
		<Stack spacing={2.5}>
			<Typography variant="body2" color="text.secondary">
				Catálogo de reglas del motor (REGLAS_HC). El cálculo sigue la norma; cada regla se puede desactivar por caso para reproducir una
				liquidación que se apartó, y el relevamiento cuenta como desvío solo lo que la constancia impresa confirma.
			</Typography>
			<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark) }}>
				<Table size="small">
					<TableHead>
						<TableRow sx={headSx(isDark)}>
							<TableCell>Regla</TableCell>
							<TableCell>Norma</TableCell>
							<TableCell>Qué hace ANSES (observado)</TableCell>
							<TableCell>Desvíos verificados</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{reglas.map((r) => (
							<TableRow key={r.id}>
								<TableCell>
									<Typography variant="body2" sx={{ fontWeight: 600 }}>
										{r.nombre}
									</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace" }} color="text.secondary">
										{r.id}
									</Typography>
								</TableCell>
								<TableCell sx={{ fontSize: "0.78rem", maxWidth: 320 }}>
									{r.norma}
									<br />
									<Chip
										size="small"
										label={r.normaConfirmada ? "norma confirmada" : "falta revisión legal"}
										sx={{
											mt: 0.5,
											height: 18,
											fontSize: "0.62rem",
											bgcolor: alpha(r.normaConfirmada ? LIVE_GREEN : STALE_AMBER, 0.15),
											color: r.normaConfirmada ? undefined : isDark ? STALE_AMBER : "#5C3D00",
										}}
									/>
								</TableCell>
								<TableCell sx={{ fontSize: "0.78rem", maxWidth: 280 }}>{r.anses}</TableCell>
								<TableCell>
									<Stack spacing={0.5}>
										{porRegla(r.id).map((d) => (
											<Stack key={String(d.valor)} direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
												<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
													{String(d.valor)} · {d.n}
												</Typography>
												{d.casos.slice(0, 6).map((c) => (
													<Tooltip key={c} title="Ver caso">
														<Chip
															size="small"
															label={c.slice(-6)}
															onClick={() => setSeleccion(c)}
															sx={{ height: 18, fontSize: "0.62rem", fontFamily: "monospace" }}
														/>
													</Tooltip>
												))}
											</Stack>
										))}
										{!porRegla(r.id).length && (
											<Typography variant="caption" color="text.secondary">
												—
											</Typography>
										)}
									</Stack>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark) }}>
				<Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
					Componentes abiertos en constancias
				</Typography>
				<Stack direction={{ xs: "column", md: "row" }} spacing={4}>
					{[false, true].map((ocr) => (
						<Stack key={String(ocr)} spacing={0.25} sx={{ minWidth: 220 }}>
							<Typography variant="caption" color="text.secondary">
								{ocr ? "Con motivo de OCR (a revisión manual)" : "Sin motivo de OCR (problema del cálculo)"}
							</Typography>
							{abiertos(ocr).map((a) => (
								<Stack key={a.componente} direction="row" justifyContent="space-between">
									<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
										{a.componente}
									</Typography>
									<Typography variant="body2">{a.n}</Typography>
								</Stack>
							))}
							{!abiertos(ocr).length && (
								<Typography variant="body2" color="text.secondary">
									—
								</Typography>
							)}
						</Stack>
					))}
				</Stack>
			</Paper>
			<CasoDrawer id={seleccion} onClose={() => setSeleccion(null)} onGuardado={cargar} />
		</Stack>
	);
}
