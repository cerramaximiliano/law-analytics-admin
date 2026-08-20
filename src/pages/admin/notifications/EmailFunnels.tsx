// Embudos de correo por fuente — la vista grande.
//
// Responde "cómo rinde cada sistema de correo comparado con los otros", que es
// la pregunta de arriba; el embudo fino de una fuente concreta vive en su
// propia vista (movimientos → /admin/integrations/movement-link-analytics).
//
// Criterio de lectura, igual que en el panel por usuario: una etapa que no está
// instrumentada se muestra como "s/d", nunca como 0. Y las bases de cada
// porcentaje se declaran, porque las unidades NO son todas la misma: `correos`
// son envíos reales y `entregados` son entidades notificadas.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { ExportSquare, Refresh, Sms } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import EmailFunnelsService, { EmailFunnelSource, FunnelTopUser } from "api/emailFunnels";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL } from "themes/dashboardTokens";
import dayjs from "utils/dayjs-config";

const SOURCE_COLOR: Record<string, string> = {
	movimientos: BRAND_BLUE,
	jurisprudencia: LIVE_GREEN,
	calendario: PRO_TEAL,
	postal: STALE_AMBER,
};

const pct = (n: number, base: number): string | null => (base > 0 ? `${Math.round((n / base) * 100)}%` : null);

/** Una etapa del embudo. `valor === null` = no instrumentada, no cero. */
const Etapa = ({
	label,
	valor,
	base,
	baseLabel,
	color,
}: {
	label: string;
	valor: number | null;
	base: number;
	baseLabel: string;
	color: string;
}) => {
	const theme = useTheme();
	if (valor === null) {
		return (
			<Box sx={{ flex: 1, minWidth: 110 }}>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
					{label}
				</Typography>
				<Tooltip title="Esta fuente no mide esta etapa — no es un cero">
					<Typography variant="h5" sx={{ color: theme.palette.text.disabled, fontStyle: "italic", fontWeight: 400 }}>
						s/d
					</Typography>
				</Tooltip>
			</Box>
		);
	}
	const p = pct(valor, base);
	return (
		<Box sx={{ flex: 1, minWidth: 110 }}>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
				{label}
			</Typography>
			<Stack direction="row" spacing={0.75} alignItems="baseline">
				<Typography variant="h5" sx={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
					{valor.toLocaleString()}
				</Typography>
				{p && (
					<Tooltip title={`sobre ${base.toLocaleString()} ${baseLabel}`}>
						<Typography variant="caption" color="text.secondary">
							{p}
						</Typography>
					</Tooltip>
				)}
			</Stack>
		</Box>
	);
};

const SourceCard = ({ f, activa, onClick }: { f: EmailFunnelSource; activa: boolean; onClick: () => void }) => {
	const theme = useTheme();
	const color = SOURCE_COLOR[f.key] || BRAND_BLUE;
	return (
		<Box
			onClick={onClick}
			sx={{
				p: 2,
				height: "100%",
				borderRadius: 2,
				cursor: "pointer",
				border: `1px solid ${activa ? color : theme.palette.divider}`,
				borderLeft: `3px solid ${color}`,
				bgcolor: activa ? alpha(color, theme.palette.mode === "dark" ? 0.12 : 0.06) : "transparent",
				transition: "background-color .2s ease, border-color .2s ease",
			}}
		>
			<Typography variant="body2" sx={{ fontWeight: 600 }}>
				{f.label}
			</Typography>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
				{f.servicio}
			</Typography>
			<Stack direction="row" spacing={2}>
				<Box>
					<Typography variant="h4" sx={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
						{f.correos.toLocaleString()}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						correos · {f.usuarios} usuarios
					</Typography>
				</Box>
			</Stack>
		</Box>
	);
};

const EmailFunnels: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [fuentes, setFuentes] = useState<EmailFunnelSource[]>([]);
	const [loading, setLoading] = useState(true);
	const [sel, setSel] = useState<string>("movimientos");
	const [top, setTop] = useState<FunnelTopUser[]>([]);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	const params = useMemo(() => ({ ...(from && { from }), ...(to && { to }) }), [from, to]);

	const cargar = useCallback(async () => {
		setLoading(true);
		try {
			const r = await EmailFunnelsService.list(params);
			if (r.success) setFuentes(r.fuentes);
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al cargar los embudos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [params, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	useEffect(() => {
		let alive = true;
		EmailFunnelsService.topUsers(sel, { ...params, limit: 12 })
			.then((r) => {
				if (alive && r.success) setTop(r.items);
			})
			.catch(() => {
				if (alive) setTop([]);
			});
		return () => {
			alive = false;
		};
	}, [sel, params]);

	const f = fuentes.find((x) => x.key === sel);
	const color = SOURCE_COLOR[sel] || BRAND_BLUE;

	// Serie diaria unificada: la unión de los días de las cuatro etapas, para que
	// un día con clicks pero sin envíos (el correo salió ayer) igual aparezca.
	const serie = useMemo(() => {
		if (!f) return [];
		const dias = new Set<string>([
			...Object.keys(f.series.correos),
			...Object.keys(f.series.aperturas),
			...Object.keys(f.series.clicks),
			...Object.keys(f.series.conversiones),
		]);
		return [...dias].sort().map((d) => ({
			dia: dayjs(d).format("DD/MM"),
			correos: f.series.correos[d] || 0,
			aperturas: f.series.aperturas[d] || 0,
			clicks: f.series.clicks[d] || 0,
			conversiones: f.series.conversiones[d] || 0,
		}));
	}, [f]);

	return (
		<MainCard
			title={
				<Stack direction="row" spacing={1} alignItems="center">
					<Sms size={20} color={BRAND_BLUE} />
					<span>Embudos de correo por fuente</span>
				</Stack>
			}
			secondary={
				<Tooltip title="Actualizar">
					<IconButton onClick={cargar} disabled={loading}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			}
			content={false}
		>
			<Box sx={{ p: 3 }}>
				<Stack spacing={3}>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
						<TextField
							type="date"
							size="small"
							label="Desde"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 160 }}
						/>
						<TextField
							type="date"
							size="small"
							label="Hasta"
							value={to}
							onChange={(e) => setTo(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 160 }}
						/>
						{(from || to) && (
							<Button
								size="small"
								variant="outlined"
								onClick={() => {
									setFrom("");
									setTo("");
								}}
							>
								Limpiar
							</Button>
						)}
						<Typography variant="caption" color="text.secondary">
							Sin fechas: últimos 30 días
						</Typography>
					</Stack>

					{loading && fuentes.length === 0 ? (
						<Stack direction="row" spacing={1} alignItems="center">
							<CircularProgress size={18} />
							<Typography variant="caption" color="text.secondary">
								Cargando…
							</Typography>
						</Stack>
					) : (
						<>
							{/* Comparación de un vistazo */}
							<Grid container spacing={2}>
								{fuentes.map((x) => (
									<Grid item xs={12} sm={6} md={3} key={x.key}>
										<SourceCard f={x} activa={x.key === sel} onClick={() => setSel(x.key)} />
									</Grid>
								))}
							</Grid>

							{f && (
								<Box
									sx={{
										p: 2.5,
										borderRadius: 2,
										border: `1px solid ${theme.palette.divider}`,
										bgcolor: alpha(color, theme.palette.mode === "dark" ? 0.05 : 0.02),
									}}
								>
									<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
										<Typography variant="h5">{f.label}</Typography>
										<Stack direction="row" spacing={1} alignItems="center">
											{f.ultimo && (
												<Typography variant="caption" color="text.secondary">
													último envío {dayjs(f.ultimo).format("DD/MM/YY HH:mm")}
												</Typography>
											)}
											{f.detalle && (
												<Button size="small" variant="outlined" component={RouterLink} to={f.detalle} endIcon={<ExportSquare size={14} />}>
													Embudo detallado
												</Button>
											)}
										</Stack>
									</Stack>

									{/* Etapas */}
									<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2.5, mb: 2 }}>
										<Etapa label="Correos enviados" valor={f.correos} base={f.correos} baseLabel="correos" color={color} />
										<Etapa label="Entregados" valor={f.entregados} base={f.conTracking} baseLabel="con tracking" color={color} />
										<Etapa label="Aperturas" valor={f.aperturas} base={f.correos} baseLabel="correos" color={color} />
										<Etapa label="Clicks" valor={f.clicks} base={f.correos} baseLabel="correos" color={color} />
										<Etapa label="Ingresó a la app" valor={f.conversiones} base={f.correos} baseLabel="correos" color={color} />
									</Stack>

									<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
										<Chip size="small" variant="outlined" label={`${f.usuarios} usuarios alcanzados`} />
										{f.entidades !== null && (
											<Tooltip title="Un correo agrupa varias entidades: por eso este número es mayor que el de correos">
												<Chip size="small" variant="outlined" label={`${f.entidades} entidades notificadas`} />
											</Tooltip>
										)}
										{f.usuariosQueAbrieron !== null && <Chip size="small" variant="outlined" label={`${f.usuariosQueAbrieron} abrieron`} />}
										{f.rebotes > 0 && <Chip size="small" color="error" variant="outlined" label={`${f.rebotes} rebotes`} />}
										{f.fallidos > 0 && <Chip size="small" color="error" variant="outlined" label={`${f.fallidos} fallidos`} />}
									</Stack>

									{(!f.tracking.apertura || !f.tracking.conversion || f.desdeClicks) && (
										<Alert severity="info" variant="outlined" sx={{ mb: 2, py: 0.5 }}>
											<Typography variant="caption">
												{!f.tracking.apertura && "Esta fuente no tiene píxel de apertura. "}
												{!f.tracking.conversion && "No mide si el usuario terminó entrando a la app. "}
												{f.desdeClicks &&
													`Los clicks se registran desde el ${dayjs(f.desdeClicks).format(
														"DD/MM/YY",
													)}: antes hay envíos sin datos de click. `}
												Las etapas sin instrumentar se muestran como “s/d” para no confundirlas con un cero real.
											</Typography>
										</Alert>
									)}

									<Grid container spacing={3}>
										<Grid item xs={12} md={7}>
											<Typography variant="caption" color="text.secondary" fontWeight={700}>
												EVOLUCIÓN DIARIA
											</Typography>
											{serie.length === 0 ? (
												<Typography variant="caption" color="text.secondary" sx={{ display: "block", py: 4 }}>
													Sin datos en el rango elegido.
												</Typography>
											) : (
												<Box sx={{ height: 260, mt: 1 }}>
													<ResponsiveContainer width="100%" height="100%">
														<LineChart data={serie} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
															<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.7)} vertical={false} />
															<XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} />
															<YAxis tick={{ fontSize: 11 }} stroke={theme.palette.text.secondary} allowDecimals={false} />
															<RTooltip
																contentStyle={{
																	backgroundColor: theme.palette.background.paper,
																	border: `1px solid ${theme.palette.divider}`,
																	borderRadius: 8,
																	fontSize: 12,
																}}
															/>
															<Legend wrapperStyle={{ fontSize: 11 }} />
															<Line type="monotone" dataKey="correos" name="correos" stroke={color} strokeWidth={2} dot={false} />
															{f.tracking.apertura && (
																<Line
																	type="monotone"
																	dataKey="aperturas"
																	name="aperturas"
																	stroke={LIVE_GREEN}
																	strokeWidth={2}
																	dot={false}
																/>
															)}
															<Line type="monotone" dataKey="clicks" name="clicks" stroke={STALE_AMBER} strokeWidth={2} dot={false} />
															{f.tracking.conversion && (
																<Line type="monotone" dataKey="conversiones" name="ingresó" stroke={PRO_TEAL} strokeWidth={2} dot={false} />
															)}
														</LineChart>
													</ResponsiveContainer>
												</Box>
											)}
										</Grid>
										<Grid item xs={12} md={5}>
											<Typography variant="caption" color="text.secondary" fontWeight={700}>
												QUIÉNES MÁS INTERACTÚAN
											</Typography>
											{top.length === 0 ? (
												<Typography variant="caption" color="text.secondary" sx={{ display: "block", py: 4 }}>
													Sin interacciones registradas en el rango.
												</Typography>
											) : (
												<Table size="small" sx={{ mt: 1 }}>
													<TableHead>
														<TableRow>
															<TableCell sx={{ py: 0.5 }}>Usuario</TableCell>
															<TableCell align="right" sx={{ py: 0.5 }}>
																Aperturas
															</TableCell>
															<TableCell align="right" sx={{ py: 0.5 }}>
																Clicks
															</TableCell>
														</TableRow>
													</TableHead>
													<TableBody>
														{top.map((u, i) => (
															<TableRow key={u.userId || u.email || i}>
																<TableCell sx={{ py: 0.5 }}>
																	<Typography variant="caption" noWrap sx={{ maxWidth: 200, display: "block" }}>
																		{u.email || u.userId || "—"}
																	</Typography>
																</TableCell>
																<TableCell align="right" sx={{ py: 0.5, fontVariantNumeric: "tabular-nums" }}>
																	<Typography variant="caption">{u.aperturas === null ? "s/d" : u.aperturas}</Typography>
																</TableCell>
																<TableCell align="right" sx={{ py: 0.5, fontVariantNumeric: "tabular-nums" }}>
																	<Typography variant="caption">{u.clicks}</Typography>
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											)}
										</Grid>
									</Grid>
								</Box>
							)}
						</>
					)}
				</Stack>
			</Box>
		</MainCard>
	);
};

export default EmailFunnels;
