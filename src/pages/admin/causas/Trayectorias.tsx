import { useEffect, useState } from "react";
import {
	Box,
	Stack,
	Grid,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	CircularProgress,
	Alert,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	useTheme,
	alpha,
} from "@mui/material";
import { ArrowDown2, Building, Judge, Buildings2, Buliding, Location } from "iconsax-react";
import MainCard from "components/MainCard";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { enqueueSnackbar } from "notistack";
import TrayectoriasService, { CausaTrayectoria, TramoTrayectoria } from "api/causasTrayectorias";

const FUEROS = [
	{ value: "todos", label: "Todos" },
	{ value: "CIV", label: "Civil" },
	{ value: "COM", label: "Comercial" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
];

const TIPO_META: Record<string, { label: string; color: string }> = {
	juzgado: { label: "Juzgado", color: "#2962ff" },
	camara: { label: "Cámara", color: "#7b1fa2" },
	corte: { label: "Corte", color: "#c62828" },
	otro: { label: "Otro", color: "#757575" },
};

function fmt(d?: string | null): string {
	if (!d) return "—";
	try {
		return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
	} catch {
		return "—";
	}
}

function tipoIcon(tipo: string, size = 16) {
	switch (tipo) {
		case "juzgado":
			return <Judge size={size} variant="Bold" />;
		case "camara":
			return <Buildings2 size={size} variant="Bold" />;
		case "corte":
			return <Building size={size} variant="Bold" />;
		default:
			return <Buliding size={size} variant="Bold" />;
	}
}

// Timeline vertical de la trayectoria de una causa.
function Timeline({ tramos }: { tramos: TramoTrayectoria[] }) {
	const theme = useTheme();
	if (!tramos || tramos.length === 0) return <Typography variant="body2">Sin tramos.</Typography>;
	return (
		<Stack sx={{ pl: 1 }}>
			{tramos.map((t, i) => {
				const meta = TIPO_META[t.tipo] || TIPO_META.otro;
				const last = i === tramos.length - 1;
				const numeros =
					t.tipo === "juzgado"
						? `Juzgado ${t.juzgado || "—"}${t.secretaria ? ` · Sec. ${t.secretaria}` : ""}`
						: t.tipo === "camara"
							? `Sala ${t.sala || "—"}${t.vocalia ? ` · Voc. ${t.vocalia}` : ""}`
							: "";
				return (
					<Stack key={i} direction="row" spacing={1.5} sx={{ position: "relative" }}>
						{/* Línea + punto */}
						<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
							<Box
								sx={{
									width: 20,
									height: 20,
									borderRadius: "50%",
									bgcolor: alpha(meta.color, 0.15),
									color: meta.color,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									border: `2px solid ${t.actual ? meta.color : alpha(meta.color, 0.4)}`,
									flexShrink: 0,
								}}
							>
								{tipoIcon(t.tipo, 11)}
							</Box>
							{!last && <Box sx={{ flexGrow: 1, width: 2, bgcolor: alpha(theme.palette.divider, 0.6), minHeight: 22 }} />}
						</Box>
						{/* Contenido */}
						<Box sx={{ pb: last ? 0 : 1.5, flexGrow: 1 }}>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
								<Chip
									size="small"
									label={meta.label}
									sx={{ bgcolor: alpha(meta.color, 0.12), color: meta.color, fontWeight: 600, height: 20 }}
								/>
								{numeros && (
									<Typography variant="caption" sx={{ fontWeight: 600 }}>
										{numeros}
									</Typography>
								)}
								{t.actual && (
									<Chip
										size="small"
										icon={<Location size={12} />}
										label="Ubicación actual"
										color="success"
										sx={{ height: 20, fontWeight: 600 }}
									/>
								)}
							</Stack>
							<Typography variant="body2" sx={{ color: "text.primary", mt: 0.25 }}>
								{t.textoCompleto || t.organismo || "—"}
							</Typography>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{fmt(t.desde)} → {t.hasta ? fmt(t.hasta) : "actualidad"}
							</Typography>
						</Box>
					</Stack>
				);
			})}
		</Stack>
	);
}

const Trayectorias = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [data, setData] = useState<CausaTrayectoria[]>([]);
	const [loading, setLoading] = useState(false);
	const [total, setTotal] = useState(0);
	const [byFuero, setByFuero] = useState<Record<string, number>>({});
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [fuero, setFuero] = useState("todos");

	useEffect(() => {
		TrayectoriasService.stats()
			.then((r) => setByFuero(r.byFuero || {}))
			.catch(() => {});
	}, []);

	useEffect(() => {
		let active = true;
		setLoading(true);
		TrayectoriasService.list({ fuero, page: page + 1, limit: rowsPerPage })
			.then((r) => {
				if (!active) return;
				setData(r.data || []);
				setTotal(r.count || 0);
			})
			.catch(() => {
				if (!active) return;
				enqueueSnackbar("Error al cargar las trayectorias", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [fuero, page, rowsPerPage]);

	return (
		<MainCard title="Trayectorias judiciales (PJN)" content={false}>
			<Box sx={{ p: 2 }}>
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
					<FormControl size="small" sx={{ minWidth: 200 }}>
						<InputLabel>Fuero</InputLabel>
						<Select
							value={fuero}
							label="Fuero"
							onChange={(e) => {
								setPage(0);
								setFuero(e.target.value);
							}}
						>
							{FUEROS.map((f) => (
								<MenuItem key={f.value} value={f.value}>
									{f.label}
									{byFuero[f.value] != null ? ` (${byFuero[f.value]})` : ""}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{total} causa{total === 1 ? "" : "s"} con trayectoria poblada
					</Typography>
				</Stack>

				<Alert severity="info" sx={{ mb: 2 }}>
					Cada timeline se reconstruye desde los movimientos del expediente (todos los organismos por los que pasó, con fechas) y la
					marca <b>Ubicación actual</b> indica dónde está hoy. Vista de solo lectura para revisión.
				</Alert>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
						<CircularProgress />
					</Box>
				) : data.length === 0 ? (
					<Alert severity="warning">No hay causas con trayectoria poblada para este filtro.</Alert>
				) : (
					<Grid container spacing={1.5}>
						{data.map((c) => {
							const actual = (c.trayectoria || []).find((t) => t.actual) || (c.trayectoria || [])[c.trayectoria.length - 1];
							return (
								<Grid item xs={12} key={c._id}>
									<Accordion
										disableGutters
										sx={{
											border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
											borderRadius: 1.5,
											"&:before": { display: "none" },
											bgcolor: theme.palette.background.paper,
										}}
									>
										<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
											<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ width: "100%" }}>
												<Chip size="small" label={c.fuero} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
												<Typography sx={{ fontWeight: 700 }}>
													{c.number}/{c.year}
												</Typography>
												<Typography variant="body2" sx={{ color: "text.secondary", flexGrow: 1, minWidth: 160 }} noWrap>
													{c.caratula || "—"}
												</Typography>
												<Chip size="small" label={`${c.tramos || (c.trayectoria || []).length} tramos`} variant="outlined" sx={{ height: 22 }} />
												{c.juzgado ? <Chip size="small" label={`Juz. ${c.juzgado}`} sx={{ height: 22, bgcolor: alpha("#2962ff", isDark ? 0.18 : 0.1) }} /> : null}
												{actual && (
													<Chip
														size="small"
														icon={<Location size={12} />}
														label={(actual.textoCompleto || "").slice(0, 40) || (TIPO_META[actual.tipo]?.label ?? "")}
														color="success"
														variant="outlined"
														sx={{ height: 22, maxWidth: 320 }}
													/>
												)}
											</Stack>
										</AccordionSummary>
										<AccordionDetails sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`, pt: 2 }}>
											<Timeline tramos={c.trayectoria || []} />
										</AccordionDetails>
									</Accordion>
								</Grid>
							);
						})}
					</Grid>
				)}

				<Box sx={{ mt: 2 }}>
					<EnhancedTablePagination
						count={total}
						page={page}
						rowsPerPage={rowsPerPage}
						onPageChange={(_e, p) => setPage(p)}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 25, 50]}
					/>
				</Box>
			</Box>
		</MainCard>
	);
};

export default Trayectorias;
