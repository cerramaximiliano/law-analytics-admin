import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Box,
	Stack,
	Typography,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Chip,
	LinearProgress,
	Button,
	Collapse,
	Alert,
} from "@mui/material";
import { Refresh, TickCircle, Warning2, CloseCircle, Minus } from "iconsax-react";
import { WorkersService, CoverageMatrixData, MatrixYear, PeriodoEstado } from "api/workers";
import { FUEROS_CON_SCRAPING } from "utils/fueros";

// ─── Alcance ──────────────────────────────────────────────────────────────────
// Del catálogo compartido. Se muestran solo los fueros con workers: el resto
// serían 7 filas vacías que no dicen nada. El orden del catálogo ya agrupa por
// cámaras nacionales, federales y justicia federal del interior.
const FUEROS = FUEROS_CON_SCRAPING.map((f) => ({ code: f.value, label: f.label, grupo: f.grupo as string }));

const DESDE = 2018;
const HASTA = new Date().getFullYear();
const ANIOS = Array.from({ length: HASTA - DESDE + 1 }, (_, i) => DESDE + i);

// ─── Semántica de estados ─────────────────────────────────────────────────────
// El color codifica QUÉ HAY QUE HACER, no cuánto se avanzó: rojo es "nadie lo
// está mirando", ámbar es "quedó a medias", verde es "andando o terminado".
const ESTADO: Record<PeriodoEstado, { label: string; bg: string; fg: string; hint: string }> = {
	cerrado: { label: "Cerrado", bg: "#e8f5e9", fg: "#1b5e20", hint: "Se llegó al objetivo del año" },
	en_curso: { label: "En curso", bg: "#e3f2fd", fg: "#0d47a1", hint: "Hay workers encendidos avanzando" },
	detenido: { label: "Detenido", bg: "#fff8e1", fg: "#e65100", hint: "Worker asignado pero apagado a mitad de rango" },
	sin_worker: { label: "Sin worker", bg: "#ffebee", fg: "#b71c1c", hint: "Falta barrer y nadie lo tiene asignado" },
	sin_tocar: { label: "Sin tocar", bg: "#fafafa", fg: "#9e9e9e", hint: "Nunca se barrió y no hay worker" },
	asignado_sin_datos: { label: "Arrancando", bg: "#f3e5f5", fg: "#4a148c", hint: "Worker asignado, todavía sin resultados" },
};

const iconoDe = (e: PeriodoEstado) => {
	if (e === "cerrado") return <TickCircle size={11} variant="Bold" />;
	if (e === "detenido") return <Warning2 size={11} variant="Bold" />;
	if (e === "sin_worker") return <CloseCircle size={11} variant="Bold" />;
	if (e === "sin_tocar") return <Minus size={11} />;
	return null;
};

const miles = (n: number) => n.toLocaleString("es-AR");

// ─── Celda ────────────────────────────────────────────────────────────────────
const Celda: React.FC<{ a: MatrixYear; fuero: string; onClick: () => void; activa: boolean }> = ({ a, fuero, onClick, activa }) => {
	const e = ESTADO[a.estado];
	const detalle = (
		<Box sx={{ maxWidth: 300 }}>
			<Typography variant="caption" fontWeight={700} display="block">
				{fuero} {a.year} — {e.label}
			</Typography>
			<Typography variant="caption" color="inherit" display="block" sx={{ opacity: 0.8, mb: 0.5 }}>
				{e.hint}
			</Typography>
			<Typography variant="caption" display="block">
				Barridos: {miles(a.barridos)} · Expedientes: {miles(a.validas)} ({a.densidad}%)
			</Typography>
			<Typography variant="caption" display="block">
				Frontera: {a.frontera ? miles(a.frontera) : "sin determinar"} · Objetivo: {miles(a.objetivo)}
			</Typography>
			{a.faltanAprox > 0 && (
				<Typography variant="caption" display="block">
					Faltan ~{miles(a.faltanAprox)} números
				</Typography>
			)}
			{a.workers.length > 0 && (
				<Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
					{a.workers.map((w) => `${w.worker_id} (${w.range_start}-${w.range_end}, n=${w.current})`).join(" · ")}
				</Typography>
			)}
		</Box>
	);

	return (
		<Tooltip title={detalle} arrow placement="top">
			<Box
				onClick={onClick}
				sx={{
					bgcolor: e.bg,
					color: e.fg,
					border: "1px solid",
					borderColor: activa ? e.fg : "transparent",
					borderRadius: 0.75,
					px: 0.5,
					py: 0.4,
					cursor: "pointer",
					minWidth: 62,
					transition: "transform .08s",
					"&:hover": { transform: "scale(1.05)" },
				}}
			>
				<Stack direction="row" alignItems="center" justifyContent="center" spacing={0.3}>
					{iconoDe(a.estado)}
					<Typography variant="caption" fontWeight={700} lineHeight={1.1}>
						{a.estado === "sin_tocar" ? "—" : `${a.avancePct}%`}
					</Typography>
				</Stack>
				{a.estado !== "sin_tocar" && (
					<Box sx={{ height: 3, bgcolor: "rgba(0,0,0,.10)", borderRadius: 2, mt: 0.3, overflow: "hidden" }}>
						<Box sx={{ width: `${a.avancePct}%`, height: "100%", bgcolor: "currentColor", opacity: 0.55 }} />
					</Box>
				)}
			</Box>
		</Tooltip>
	);
};

// ─── Panel ────────────────────────────────────────────────────────────────────
type Fila = { estado: "idle" | "loading" | "ok" | "error"; data: CoverageMatrixData | null };

const CoverageMatrix: React.FC = () => {
	const [filas, setFilas] = useState<Record<string, Fila>>({});
	const [cargando, setCargando] = useState(false);
	const [sel, setSel] = useState<{ fuero: string; year: number } | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		setFilas(Object.fromEntries(FUEROS.map((f) => [f.code, { estado: "loading" as const, data: null }])));
		// En paralelo y pintando cada fila al llegar: los 15 distritos responden
		// en milisegundos y los grandes tardan hasta 20 s, así que esperar a
		// todos dejaría la vista en blanco por nada.
		await Promise.all(
			FUEROS.map(async (f) => {
				try {
					const r = await WorkersService.getCoverageMatrix(f.code, { desde: DESDE, hasta: HASTA });
					setFilas((p) => ({ ...p, [f.code]: { estado: "ok", data: r.data } }));
				} catch {
					setFilas((p) => ({ ...p, [f.code]: { estado: "error", data: null } }));
				}
			}),
		);
		setCargando(false);
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const listas = Object.values(filas).filter((f) => f.estado === "ok").length;

	const totales = useMemo(() => {
		const t = { barridos: 0, validas: 0, faltan: 0, activos: 0, cerrados: 0, sinWorker: 0, detenidos: 0, sinTocar: 0 };
		for (const f of Object.values(filas)) {
			if (f.estado !== "ok" || !f.data) continue;
			t.barridos += f.data.totales.barridos;
			t.validas += f.data.totales.validas;
			t.faltan += f.data.totales.faltanAprox;
			t.activos += f.data.totales.workersActivos;
			for (const a of f.data.anios) {
				if (a.estado === "cerrado") t.cerrados++;
				else if (a.estado === "sin_worker") t.sinWorker++;
				else if (a.estado === "detenido") t.detenidos++;
				else if (a.estado === "sin_tocar") t.sinTocar++;
			}
		}
		return t;
	}, [filas]);

	const detalle = sel ? filas[sel.fuero]?.data?.anios.find((a) => a.year === sel.year) : null;

	return (
		<Box>
			<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1.5}>
				<Box>
					<Typography variant="h5">Cobertura por período</Typography>
					<Typography variant="caption" color="text.secondary">
						Medida sobre las causas barridas, no sobre el historial de rangos. Cada celda es un fuero-año.
					</Typography>
				</Box>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={cargar} disabled={cargando}>
					{cargando ? `Cargando ${listas}/${FUEROS.length}…` : "Actualizar"}
				</Button>
			</Stack>

			{cargando && (
				<LinearProgress variant="determinate" value={(listas / FUEROS.length) * 100} sx={{ mb: 1.5, height: 4, borderRadius: 2 }} />
			)}

			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
				<Chip size="small" label={`${miles(totales.barridos)} números barridos`} />
				<Chip size="small" color="success" label={`${miles(totales.validas)} expedientes`} />
				<Chip size="small" color="info" label={`${totales.activos} workers activos`} />
				<Chip size="small" color="success" variant="outlined" label={`${totales.cerrados} períodos cerrados`} />
				{totales.detenidos > 0 && <Chip size="small" color="warning" label={`${totales.detenidos} detenidos`} />}
				{totales.sinWorker > 0 && <Chip size="small" color="error" label={`${totales.sinWorker} sin worker`} />}
				{totales.sinTocar > 0 && <Chip size="small" variant="outlined" label={`${totales.sinTocar} sin tocar`} />}
			</Stack>

			<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell sx={{ minWidth: 190 }}>Fuero</TableCell>
							{ANIOS.map((y) => (
								<TableCell key={y} align="center" sx={{ px: 0.5 }}>
									{y}
								</TableCell>
							))}
							<TableCell align="right" sx={{ minWidth: 90 }}>
								Faltan
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{FUEROS.map((f, i) => {
							const fila = filas[f.code];
							const nuevoGrupo = i === 0 || FUEROS[i - 1].grupo !== f.grupo;
							return (
								<React.Fragment key={f.code}>
									{nuevoGrupo && (
										<TableRow>
											<TableCell colSpan={ANIOS.length + 2} sx={{ bgcolor: "action.hover", py: 0.3 }}>
												<Typography variant="caption" fontWeight={700} color="text.secondary">
													{f.grupo}
												</Typography>
											</TableCell>
										</TableRow>
									)}
									<TableRow hover>
										<TableCell>
											<Typography variant="body2" fontWeight={600}>
												{f.code}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{f.label}
											</Typography>
										</TableCell>
										{fila?.estado === "loading" && (
											<TableCell colSpan={ANIOS.length + 1}>
												<LinearProgress sx={{ height: 5, borderRadius: 2 }} />
											</TableCell>
										)}
										{fila?.estado === "error" && (
											<TableCell colSpan={ANIOS.length + 1}>
												<Typography variant="caption" color="error">
													Error al calcular
												</Typography>
											</TableCell>
										)}
										{fila?.estado === "ok" &&
											ANIOS.map((y) => {
												const a = fila.data!.anios.find((x) => x.year === y);
												return (
													<TableCell key={y} align="center" sx={{ px: 0.4, py: 0.4 }}>
														{a ? (
															<Celda
																a={a}
																fuero={f.code}
																activa={sel?.fuero === f.code && sel?.year === y}
																onClick={() => setSel(sel?.fuero === f.code && sel?.year === y ? null : { fuero: f.code, year: y })}
															/>
														) : null}
													</TableCell>
												);
											})}
										{fila?.estado === "ok" && (
											<TableCell align="right">
												<Typography
													variant="body2"
													fontWeight={fila.data!.totales.faltanAprox > 0 ? 700 : 400}
													color={fila.data!.totales.faltanAprox > 0 ? "error.main" : "success.main"}
												>
													{fila.data!.totales.faltanAprox > 0 ? miles(fila.data!.totales.faltanAprox) : "—"}
												</Typography>
											</TableCell>
										)}
									</TableRow>
								</React.Fragment>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>

			<Collapse in={!!detalle} unmountOnExit>
				{detalle && sel && (
					<Paper variant="outlined" sx={{ mt: 1.5, p: 2 }}>
						<Typography variant="subtitle2" gutterBottom>
							{sel.fuero} {sel.year} — {ESTADO[detalle.estado].label}
						</Typography>
						<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap mb={1.5}>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Barridos
								</Typography>
								<Typography variant="body2">{miles(detalle.barridos)}</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Expedientes
								</Typography>
								<Typography variant="body2">
									{miles(detalle.validas)} ({detalle.densidad}%)
								</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Frontera
								</Typography>
								<Typography variant="body2">{detalle.frontera ? miles(detalle.frontera) : "sin determinar"}</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Objetivo
								</Typography>
								<Typography variant="body2">{miles(detalle.objetivo)}</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Faltan
								</Typography>
								<Typography variant="body2" color={detalle.faltanAprox > 0 ? "error.main" : "success.main"}>
									{detalle.faltanAprox > 0 ? `~${miles(detalle.faltanAprox)}` : "nada"}
								</Typography>
							</Box>
						</Stack>

						{detalle.workers.length > 0 ? (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Worker</TableCell>
											<TableCell>Rango</TableCell>
											<TableCell align="right">Posición</TableCell>
											<TableCell align="right">Restante</TableCell>
											<TableCell align="center">Estado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{detalle.workers.map((w) => (
											<TableRow key={w.worker_id}>
												<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{w.worker_id}</TableCell>
												<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{miles(w.range_start)} — {miles(w.range_end)}
												</TableCell>
												<TableCell align="right">{miles(w.current)}</TableCell>
												<TableCell align="right">{miles(w.restante)}</TableCell>
												<TableCell align="center">
													<Chip
														size="small"
														label={w.estado}
														color={w.enabled ? "success" : w.estado === "detenido" ? "warning" : "default"}
														variant={w.enabled ? "filled" : "outlined"}
													/>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						) : (
							<Alert severity={detalle.faltanAprox > 0 ? "warning" : "success"} variant="outlined">
								{detalle.faltanAprox > 0
									? "Sin worker asignado: este período no lo está barriendo nadie."
									: "Período cerrado, sin worker asignado. No hace falta ninguno."}
							</Alert>
						)}
					</Paper>
				)}
			</Collapse>

			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mt={1.5}>
				{(Object.keys(ESTADO) as PeriodoEstado[]).map((k) => (
					<Tooltip key={k} title={ESTADO[k].hint} arrow>
						<Stack direction="row" alignItems="center" spacing={0.5}>
							<Box
								sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: ESTADO[k].bg, border: "1px solid", borderColor: ESTADO[k].fg }}
							/>
							<Typography variant="caption" color="text.secondary">
								{ESTADO[k].label}
							</Typography>
						</Stack>
					</Tooltip>
				))}
			</Stack>
		</Box>
	);
};

export default CoverageMatrix;
