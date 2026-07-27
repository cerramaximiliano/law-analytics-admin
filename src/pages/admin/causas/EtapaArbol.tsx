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
	Tooltip,
	useTheme,
	alpha,
} from "@mui/material";
import { ArrowDown2, Flag, PauseCircle, Warning2, Flash, Document, ArrowRight } from "iconsax-react";
import MainCard from "components/MainCard";
import { enqueueSnackbar } from "notistack";
import EtapaStatsService, { TaxonomiaEtapa, TaxonomiaInterruptor, TaxonomiaMeta } from "api/etapaStats";

// Página 100% DATA-DRIVEN: el árbol se dibuja leyendo la colección
// etapa-taxonomia (sembrada por pjn-workers-scraping/scripts/maintenance/
// seed-etapa-taxonomia.js). Para modificar el árbol se edita el catálogo (o su
// seed) — no esta página.

function faseColor(rank: number): string {
	if (rank < 60) return "#2962ff";
	if (rank < 70) return "#2e7d32";
	if (rank < 90) return "#7b1fa2";
	if (rank < 95) return "#ef6c00";
	return "#757575";
}

const INTERRUPTOR_ICON: Record<string, JSX.Element> = {
	"terminacion-anticipada": <Flag size={16} />,
	suspension: <PauseCircle size={16} />,
	reapertura: <Warning2 size={16} />,
	incidental: <Document size={16} />,
	senales: <Flash size={16} />,
	administrativo: <Document size={16} />,
};

const EtapaArbol = () => {
	const theme = useTheme();
	const [meta, setMeta] = useState<TaxonomiaMeta | null>(null);
	const [etapas, setEtapas] = useState<TaxonomiaEtapa[]>([]);
	const [interruptores, setInterruptores] = useState<TaxonomiaInterruptor[]>([]);
	const [familia, setFamilia] = useState("ordinario");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		EtapaStatsService.taxonomia()
			.then((r) => {
				setMeta(r.data.meta);
				setEtapas(r.data.etapas || []);
				setInterruptores(r.data.interruptores || []);
			})
			.catch(() => enqueueSnackbar("Error al cargar la taxonomía de etapas", { variant: "error" }))
			.finally(() => setLoading(false));
	}, []);

	const flujo = etapas.filter((e) => e.familia === familia);
	const labelDe = (key: string) => etapas.find((e) => e.etapa === key && e.familia === familia)?.label || etapas.find((e) => e.etapa === key)?.label || key;

	return (
		<MainCard title="Árbol de etapas procesales (taxonomía)" content={false}>
			<Box sx={{ p: 2 }}>
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
					<FormControl size="small" sx={{ minWidth: 220 }}>
						<InputLabel>Familia procesal</InputLabel>
						<Select value={familia} label="Familia procesal" onChange={(e) => setFamilia(e.target.value)}>
							{(meta?.familias || ["ordinario", "sucesorio", "concursal", "ejecutivo"]).map((f) => (
								<MenuItem key={f} value={f}>
									{f.charAt(0).toUpperCase() + f.slice(1)}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{meta && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							Catálogo v{meta.version} · generado {new Date(meta.generatedAt).toLocaleString("es-AR")} · fuente: colección{" "}
							<code>etapa-taxonomia</code>
						</Typography>
					)}
				</Stack>

				{meta?.descripcionFamilias?.[familia] && (
					<Alert severity="info" sx={{ mb: 2 }}>
						{meta.descripcionFamilias[familia]}
					</Alert>
				)}

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
						<CircularProgress />
					</Box>
				) : (
					<Grid container spacing={2}>
						{/* Columna del flujo */}
						<Grid item xs={12} md={7}>
							<Stack sx={{ pl: 1 }}>
								{flujo.map((e, i) => {
									const color = faseColor(e.rank);
									const last = i === flujo.length - 1;
									return (
										<Stack key={e._id} direction="row" spacing={1.5}>
											<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30 }}>
												<Box
													sx={{
														width: 26,
														height: 26,
														borderRadius: "50%",
														bgcolor: alpha(color, 0.14),
														color,
														border: `2px solid ${color}`,
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														fontSize: 10,
														fontWeight: 800,
														flexShrink: 0,
													}}
												>
													{e.rank}
												</Box>
												{!last && (
													<Box sx={{ flexGrow: 1, width: 2, bgcolor: alpha(theme.palette.divider, 0.7), minHeight: 26, my: 0.25 }}>
														<ArrowDown2 size={10} style={{ marginLeft: -4, marginTop: 4, color: theme.palette.text.disabled }} />
													</Box>
												)}
											</Box>
											<Box sx={{ pb: last ? 0 : 2.5, flexGrow: 1 }}>
												<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
													<Chip size="small" label={e.label} sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, height: 24 }} />
													<Chip size="small" variant="outlined" label={e.fase.replace("_", " ")} sx={{ height: 20, fontSize: 10 }} />
													{e.prerrequisitos?.length > 0 && (
														<Tooltip title={`Presupone: ${e.prerrequisitos.map(labelDe).join(" o ")}`}>
															<Chip size="small" label="prerrequisitos" color="warning" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
														</Tooltip>
													)}
												</Stack>
												<Typography variant="body2" sx={{ mt: 0.5, color: "text.primary" }}>
													{e.descripcion}
												</Typography>
												{e.disparadores?.length > 0 && (
													<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
														<Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mr: 0.5 }}>
															Disparadores:
														</Typography>
														{e.disparadores.map((d, j) => (
															<Tooltip key={j} title={d.restriccion || (d.tipo === "senal" ? "señal secundaria" : "cambio de estado")}>
																<Chip
																	size="small"
																	variant="outlined"
																	color={d.tipo === "senal" ? "info" : "default"}
																	label={(d.patron || "").slice(0, 60)}
																	sx={{ height: 20, fontSize: 10, fontFamily: "monospace", maxWidth: 420 }}
																/>
															</Tooltip>
														))}
													</Stack>
												)}
												{e.salidas?.length > 0 && (
													<Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
														<ArrowRight size={12} style={{ color: theme.palette.text.secondary }} />
														<Typography variant="caption" sx={{ color: "text.secondary" }}>
															{e.salidas.map(labelDe).join(" · ")}
														</Typography>
													</Stack>
												)}
												{e.notas && (
													<Alert severity="warning" sx={{ mt: 0.75, py: 0 }}>
														<Typography variant="caption">{e.notas}</Typography>
													</Alert>
												)}
											</Box>
										</Stack>
									);
								})}
							</Stack>
						</Grid>

						{/* Columna de interruptores/ramificaciones */}
						<Grid item xs={12} md={5}>
							<Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
								Interruptores y ramificaciones (todas las familias)
							</Typography>
							<Stack spacing={1.5}>
								{interruptores.map((it) => (
									<Box
										key={it._id}
										sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.7)}`, borderRadius: 1.5, p: 1.5, bgcolor: theme.palette.background.paper }}
									>
										<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
											{INTERRUPTOR_ICON[it.clave] || <Document size={16} />}
											<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
												{it.titulo}
											</Typography>
										</Stack>
										<Typography variant="body2" sx={{ color: "text.secondary" }}>
											{it.descripcion}
										</Typography>
										<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
											{(it.disparadores || []).map((d, j) => (
												<Chip key={j} size="small" variant="outlined" label={d} sx={{ height: 20, fontSize: 10, fontFamily: "monospace" }} />
											))}
										</Stack>
										{it.notas && (
											<Alert severity="warning" sx={{ mt: 0.75, py: 0 }}>
												<Typography variant="caption">{it.notas}</Typography>
											</Alert>
										)}
									</Box>
								))}
							</Stack>
						</Grid>
					</Grid>
				)}
			</Box>
		</MainCard>
	);
};

export default EtapaArbol;
