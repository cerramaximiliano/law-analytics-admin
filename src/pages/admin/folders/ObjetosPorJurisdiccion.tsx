import { useEffect, useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Chip,
	InputAdornment,
	LinearProgress,
	MenuItem,
	Select,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { ArrowDown2, SearchNormal1 } from "iconsax-react";
import { BRAND_BLUE } from "themes/dashboardTokens";
import FoldersService, { EstadoCarpetas, ObjetosPorJurisdiccionResponse } from "api/folders";

const nf = (n: number) => n.toLocaleString("es-AR");

/**
 * Objetos de juicio (materia que trae el portal) por jurisdicción, con conteos.
 * Endpoint: admin-api GET /api/folders/objetos-por-jurisdiccion.
 */
const ObjetosPorJurisdiccion = () => {
	const theme = useTheme();
	const [abierto, setAbierto] = useState(false);
	const [estado, setEstado] = useState<EstadoCarpetas>("todas");
	const [top, setTop] = useState(25);
	const [data, setData] = useState<ObjetosPorJurisdiccionResponse | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [jurisdiccion, setJurisdiccion] = useState<string>("");
	const [buscar, setBuscar] = useState("");

	useEffect(() => {
		if (!abierto) return;
		let vivo = true;
		setCargando(true);
		setError(null);
		FoldersService.getObjetosPorJurisdiccion(estado, top)
			.then((r) => {
				if (!vivo) return;
				setData(r);
				setJurisdiccion((actual) => (actual && r.jurisdicciones.some((j) => j.id === actual) ? actual : r.jurisdicciones[0]?.id || ""));
			})
			.catch((e) => vivo && setError(e?.response?.data?.error || "No se pudo cargar"))
			.finally(() => vivo && setCargando(false));
		return () => {
			vivo = false;
		};
	}, [abierto, estado, top]);

	const actual = data?.jurisdicciones.find((j) => j.id === jurisdiccion) || null;
	const filas = useMemo(() => {
		if (!actual) return [];
		const q = buscar.trim().toLocaleUpperCase("es-AR");
		return q ? actual.objetos.filter((o) => o.objeto.toLocaleUpperCase("es-AR").includes(q)) : actual.objetos;
	}, [actual, buscar]);
	const max = actual?.objetos[0]?.count || 1;

	return (
		<Accordion
			expanded={abierto}
			onChange={(_, v) => setAbierto(v)}
			disableGutters
			variant="outlined"
			sx={{ mb: 3, borderRadius: 1, "&:before": { display: "none" } }}
		>
			<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
				<Box>
					<Typography variant="subtitle1" fontWeight={600}>
						Objetos de juicio por jurisdicción
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Cuántas carpetas hay de cada objeto (el que informa el portal) en cada jurisdicción
					</Typography>
				</Box>
			</AccordionSummary>
			<AccordionDetails>
				<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
					<ToggleButtonGroup size="small" exclusive value={estado} onChange={(_, v) => v && setEstado(v)}>
						<ToggleButton value="todas">Todas</ToggleButton>
						<ToggleButton value="activas">Activas</ToggleButton>
						<ToggleButton value="archivadas">Archivadas</ToggleButton>
					</ToggleButtonGroup>
					<TextField
						size="small"
						placeholder="Filtrar objeto"
						value={buscar}
						onChange={(e) => setBuscar(e.target.value)}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchNormal1 size={14} />
								</InputAdornment>
							),
						}}
						sx={{ minWidth: 220 }}
					/>
					<Select size="small" value={top} onChange={(e) => setTop(Number(e.target.value))}>
						{[25, 50, 100, 200].map((n) => (
							<MenuItem key={n} value={n}>
								Primeros {n}
							</MenuItem>
						))}
					</Select>
					{data && (
						<Typography variant="caption" color="text.secondary" sx={{ ml: { md: "auto" } }}>
							{nf(data.total)} carpetas
						</Typography>
					)}
				</Stack>

				{error && (
					<Typography color="error" variant="body2">
						{error}
					</Typography>
				)}

				{cargando && !data ? (
					<Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
				) : data ? (
					<>
						<Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
							{data.jurisdicciones.map((j) => {
								const sel = j.id === jurisdiccion;
								return (
									<Chip
										key={j.id}
										label={`${j.label} · ${nf(j.total)}`}
										onClick={() => setJurisdiccion(j.id)}
										variant={sel ? "filled" : "outlined"}
										sx={{
											fontWeight: sel ? 600 : 400,
											fontVariantNumeric: "tabular-nums",
											...(sel ? { bgcolor: BRAND_BLUE, color: "#fff", "&:hover": { bgcolor: BRAND_BLUE } } : {}),
										}}
									/>
								);
							})}
						</Stack>

						{actual && (
							<>
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
									{nf(actual.distintos)} objetos distintos
									{actual.sinObjeto > 0 ? ` · ${nf(actual.sinObjeto)} carpetas sin objeto` : ""}
									{cargando ? " · actualizando…" : ""}
								</Typography>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Objeto</TableCell>
											<TableCell align="right" sx={{ width: 110 }}>
												Carpetas
											</TableCell>
											<TableCell sx={{ width: { xs: 120, md: 260 } }}>% de la jurisdicción</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{filas.map((o) => (
											<TableRow key={o.objeto} hover>
												<TableCell sx={{ wordBreak: "break-word" }}>{o.objeto}</TableCell>
												<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
													{nf(o.count)}
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={1} alignItems="center">
														<LinearProgress
															variant="determinate"
															value={(o.count / max) * 100}
															sx={{
																flex: 1,
																height: 6,
																borderRadius: 3,
																bgcolor: alpha(theme.palette.text.secondary, 0.12),
																"& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: BRAND_BLUE },
															}}
														/>
														<Typography variant="caption" sx={{ width: 44, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
															{o.pct.toLocaleString("es-AR")}%
														</Typography>
													</Stack>
												</TableCell>
											</TableRow>
										))}
										{filas.length === 0 && (
											<TableRow>
												<TableCell colSpan={3}>
													<Typography variant="body2" color="text.secondary">
														{buscar ? `Ningún objeto de los primeros ${top} contiene «${buscar}».` : "Sin objetos cargados."}
													</Typography>
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
								{actual.otros.objetos > 0 && (
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
										Otros {nf(actual.otros.objetos)} objetos suman {nf(actual.otros.count)} carpetas
										{top < 200 ? " — subí «Primeros» para verlos." : "."}
									</Typography>
								)}
							</>
						)}
					</>
				) : null}
			</AccordionDetails>
		</Accordion>
	);
};

export default ObjetosPorJurisdiccion;
