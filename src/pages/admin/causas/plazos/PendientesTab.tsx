import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	Alert,
	Box,
	Button,
	Chip,
	IconButton,
	Link,
	Paper,
	Skeleton,
	ToggleButton,
	ToggleButtonGroup,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { CloseCircle, Refresh, TickCircle } from "iconsax-react";
import {
	fijarTipoProceso,
	getPlazosPendientes,
	getTipoProcesoCobertura,
	getTipoProcesoPendientes,
	TipoProcesoCobertura,
	PendienteCalendario,
	TipoProceso,
	TipoProcesoPendiente,
	PendienteCarpeta,
	PendienteCredencial,
	PendienteDecision,
	PendienteEntrega,
	PendienteRegla,
	PlazosPendientes,
} from "api/plazos";
import { useSnackbar } from "notistack";
import BetaPanel from "./BetaPanel";

const fmt = (n?: number) => (n ?? 0).toLocaleString("es-AR");
const fecha = (d?: string | null) => (d ? new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

const ESTADO: Record<PendienteDecision["estado"], { label: string; color: "success" | "warning" | "default" | "info" }> = {
	listo_para_decidir: { label: "Listo para decidir", color: "warning" },
	bloqueado: { label: "Bloqueado", color: "default" },
	esperando: { label: "Esperando datos", color: "info" },
	hecho: { label: "Hecho", color: "success" },
};

function Seccion({ titulo, n, nota, children }: { titulo: string; n?: number; nota?: string; children: React.ReactNode }) {
	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
				<Typography variant="subtitle1">{titulo}</Typography>
				{n !== undefined && <Chip size="small" color={n ? "warning" : "success"} label={n ? fmt(n) : "0"} />}
			</Stack>
			{nota && (
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
					{nota}
				</Typography>
			)}
			{children}
		</Paper>
	);
}

const Vacio = () => (
	<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
		Nada pendiente.
	</Typography>
);

function Decisiones({ items }: { items: PendienteDecision[] }) {
	return (
		<Stack spacing={1}>
			{items.map((d) => {
				const e = ESTADO[d.estado];
				const interno = d.accion.link?.startsWith("/") || d.accion.link?.startsWith("?");
				return (
					<Paper key={d.id} variant="outlined" sx={{ p: 1.5 }}>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
							<Chip size="small" variant="outlined" label={d.id} sx={{ fontWeight: 600 }} />
							<Typography variant="subtitle2" sx={{ flex: 1, minWidth: 220 }}>
								{d.titulo}
							</Typography>
							<Chip size="small" color={e.color} label={e.label} />
						</Stack>
						<Stack spacing={0.25} sx={{ mt: 1 }}>
							{d.requisitos.map((r) => (
								<Stack key={r.texto} direction="row" spacing={0.75} alignItems="center">
									{r.ok ? <TickCircle size={14} color="#2e7d32" variant="Bold" /> : <CloseCircle size={14} color="#9e9e9e" />}
									<Typography variant="body2" color={r.ok ? "text.primary" : "text.secondary"}>
										{r.texto}
									</Typography>
								</Stack>
							))}
						</Stack>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
							<Typography variant="caption" color="text.secondary">
								Impacto: {d.impacto.texto}
								{d.impacto.n ? ` (${fmt(d.impacto.n)})` : ""}
							</Typography>
							<Box sx={{ flex: 1 }} />
							{d.accion.link && d.estado !== "hecho" ? (
								<Button
									size="small"
									component={interno ? RouterLink : "a"}
									{...(interno ? { to: d.accion.link } : { href: d.accion.link })}
								>
									{d.accion.texto}
								</Button>
							) : (
								d.estado !== "hecho" && (
									<Typography variant="caption" color="text.secondary">
										{d.accion.texto}
									</Typography>
								)
							)}
						</Stack>
					</Paper>
				);
			})}
		</Stack>
	);
}

function Calendario({ c }: { c: PendienteCalendario }) {
	const cob = c.cobertura;
	const dd = (f: string) => f.split("-").reverse().join("/");
	return (
		<Stack spacing={1.5}>
			{c.error && <Alert severity="warning">{c.error}</Alert>}
			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
				{cob && (
					<Chip
						size="small"
						color={c.alerta ? "error" : "success"}
						label={cob.hasta ? `Cubre hasta el ${dd(cob.hasta)} (${cob.diasRestantes} días)` : "Sin cobertura del año en curso"}
					/>
				)}
				{c.alerta && (
					<Link component={RouterLink} to="/admin/causas/plazos?tab=feriados&base=usuarios" variant="body2">
						Generar el año siguiente
					</Link>
				)}
				<Chip
					size="small"
					variant="outlined"
					color={c.plazosFueraDeCobertura ? "error" : "default"}
					label={`${fmt(c.plazosFueraDeCobertura)} plazo(s) de cuentas activas retenidos por quedar fuera del calendario`}
				/>
			</Stack>
			<Typography variant="subtitle2">Días inhábiles sin verificar en los próximos 90 días</Typography>
			{c.sinVerificar.length === 0 ? (
				<Vacio />
			) : (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Día</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Motivo</TableCell>
								<TableCell />
							</TableRow>
						</TableHead>
						<TableBody>
							{c.sinVerificar.map((d) => (
								<TableRow key={d.fecha} hover>
									<TableCell sx={{ fontFamily: "monospace" }}>{d.fecha}</TableCell>
									<TableCell>
										<Chip size="small" variant="outlined" label={d.tipo} />
									</TableCell>
									<TableCell>{d.descripcion || "—"}</TableCell>
									<TableCell align="right">
										<Link component={RouterLink} to={`/admin/causas/plazos?tab=feriados&base=usuarios&fecha=${d.fecha}`} variant="body2">
											Ver en el calendario
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			)}
		</Stack>
	);
}

const FUENTE_EVIDENCIA: Record<string, string> = {
	expreso: "lo declara la resolución",
	plazo_demanda: "por el plazo del traslado de demanda",
	plazo_agravios: "por el plazo del traslado de agravios",
	operador: "lo fijó el operador",
	objeto: "por el objeto del juicio",
	objeto_especial: "el objeto corresponde a un proceso especial",
	norma: "por la norma del fuero (CNT: ley 18.345; CSS: ordinario del CPCCN)",
	usuario: "lo indicó un usuario en su carpeta",
};

const TIPO_LABEL: Record<TipoProceso, string> = { ordinario: "Ordinario", sumario: "Sumario / sumarísimo", especial: "Proceso especial" };

/** Causas con cédulas sin vencimiento porque su plazo depende del tipo de proceso y no se conoce: el operador lo fija. */
function TiposProceso({ onCambio }: { onCambio: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [items, setItems] = useState<TipoProcesoPendiente[] | null>(null);
	const [total, setTotal] = useState(0);
	const [guardando, setGuardando] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		try {
			const r = await getTipoProcesoPendientes();
			setItems(r.data);
			setTotal(r.total);
		} catch {
			setItems([]);
		}
	}, []);
	useEffect(() => {
		cargar();
	}, [cargar]);

	const fijar = async (causaId: string, tipo: TipoProceso | null) => {
		setGuardando(causaId);
		try {
			const r = await fijarTipoProceso(causaId, tipo);
			enqueueSnackbar(tipo ? `Tipo fijado: ${tipo}. ${r.reencoladas} cédula(s) vuelven a calcularse.` : "Se quitó el dato del operador", {
				variant: "success",
			});
			await cargar();
			onCambio();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "No se pudo fijar el tipo de proceso", { variant: "error" });
		} finally {
			setGuardando(null);
		}
	};

	if (items === null) return <Skeleton variant="rounded" height={60} />;
	if (!items.length) return <Vacio />;
	return (
		<Box sx={{ overflowX: "auto" }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Causa</TableCell>
						<TableCell>Usuario</TableCell>
						<TableCell>Cédulas</TableCell>
						<TableCell>Evidencia</TableCell>
						<TableCell>Tipo de proceso</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{items.map((t) => (
						<TableRow key={t.causaId} hover>
							<TableCell sx={{ maxWidth: 320 }}>
								<Typography variant="body2" noWrap>
									{t.fuero} {t.expediente} · {t.caratula || "—"}
								</Typography>
							</TableCell>
							<TableCell>
								{t.usuarios[0]?.email || "—"}
								{t.usuarios.length > 1 ? ` +${t.usuarios.length - 1}` : ""}
							</TableCell>
							<TableCell>
								<Stack spacing={0.25}>
									{t.cedulas.slice(0, 3).map((c) => (
										<Link
											key={c.plazoNotificacionId}
											component={RouterLink}
											to={`/admin/causas/plazos?base=usuarios&cedula=${encodeURIComponent(c.cedula)}`}
											variant="body2"
											title={c.snippet || ""}
										>
											{c.label || c.acto || "cédula"}
										</Link>
									))}
									{t.cantidadCedulas > 3 && (
										<Typography variant="caption" color="text.secondary">
											+{t.cantidadCedulas - 3} más
										</Typography>
									)}
								</Stack>
							</TableCell>
							<TableCell sx={{ maxWidth: 280 }}>
								{t.conflicto && <Chip size="small" color="error" label="evidencias en conflicto" sx={{ mb: 0.5 }} />}
								{t.sugerencia && (
									<Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
										<Chip
											size="small"
											color="info"
											variant="outlined"
											label={`sugerencia: ${t.sugerencia.tipo}`}
											title={t.sugerencia.motivo || ""}
										/>
										<Link
											component="button"
											variant="caption"
											disabled={guardando === t.causaId}
											onClick={() => fijar(t.causaId, t.sugerencia!.tipo)}
										>
											confirmar
										</Link>
									</Stack>
								)}
								{t.evidencias.length === 0 ? (
									<Typography variant="caption" color="text.secondary">
										Sin evidencia en las resoluciones
									</Typography>
								) : (
									t.evidencias.slice(-2).map((e, i) => (
										<Typography key={i} variant="caption" color="text.secondary" sx={{ display: "block" }} title={e.frase || ""}>
											{e.tipo} · {FUENTE_EVIDENCIA[e.fuente] || e.fuente}
											{e.frase ? ` «${e.frase.slice(0, 80)}»` : ""}
										</Typography>
									))
								)}
							</TableCell>
							<TableCell>
								<ToggleButtonGroup
									size="small"
									exclusive
									disabled={guardando === t.causaId}
									value={t.fuente === "operador" ? t.tipo : null}
									onChange={(_, v: TipoProceso | null) => fijar(t.causaId, v)}
								>
									<ToggleButton value="ordinario" sx={{ textTransform: "none", py: 0.25 }}>
										Ordinario
									</ToggleButton>
									<ToggleButton value="sumario" sx={{ textTransform: "none", py: 0.25 }}>
										Sumario / sumarísimo
									</ToggleButton>
									<ToggleButton value="especial" sx={{ textTransform: "none", py: 0.25 }}>
										Especial
									</ToggleButton>
								</ToggleButtonGroup>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{total > items.length && (
				<Typography variant="caption" color="text.secondary">
					Se muestran {items.length} de {fmt(total)} causas.
				</Typography>
			)}
		</Box>
	);
}

/** Cobertura del tipo de proceso: causas con tipo por fuero, y las sin tipo con la sugerencia del detector (se confirma con un clic). */
function CoberturaTipoProceso({ onCambio }: { onCambio: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [c, setC] = useState<TipoProcesoCobertura | null>(null);
	const [guardando, setGuardando] = useState<string | null>(null);
	const cargar = useCallback(async () => {
		try {
			setC(await getTipoProcesoCobertura());
		} catch {
			setC({ porTipo: [], sinTipo: 0, sugeridas: [] });
		}
	}, []);
	useEffect(() => {
		cargar();
	}, [cargar]);
	if (!c) return <Skeleton variant="rounded" height={60} />;

	const fueros = [...new Set(c.porTipo.map((x) => x.fuero))].sort();
	const n = (fuero: string, tipo: TipoProceso) =>
		c.porTipo.filter((x) => x.fuero === fuero && x.tipo === tipo).reduce((a, x) => a + x.causas, 0);
	const sin = (fuero: string) => c.porTipo.filter((x) => x.fuero === fuero && !x.tipo).reduce((a, x) => a + x.causas, 0);
	const confirmar = async (causaId: string, tipo: TipoProceso) => {
		setGuardando(causaId);
		try {
			const r = await fijarTipoProceso(causaId, tipo);
			enqueueSnackbar(`Tipo fijado: ${tipo}. ${r.reencoladas} cédula(s) vuelven a calcularse.`, { variant: "success" });
			await cargar();
			onCambio();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "No se pudo fijar el tipo", { variant: "error" });
		} finally {
			setGuardando(null);
		}
	};
	return (
		<Stack spacing={1.5}>
			<Box sx={{ overflowX: "auto" }}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Fuero</TableCell>
							<TableCell align="right">Ordinario</TableCell>
							<TableCell align="right">Sumario</TableCell>
							<TableCell align="right">Especial</TableCell>
							<TableCell align="right">Sin tipo</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{fueros.map((f) => (
							<TableRow key={f}>
								<TableCell>{f}</TableCell>
								<TableCell align="right">{fmt(n(f, "ordinario"))}</TableCell>
								<TableCell align="right">{fmt(n(f, "sumario"))}</TableCell>
								<TableCell align="right">{fmt(n(f, "especial"))}</TableCell>
								<TableCell align="right">{fmt(sin(f))}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Box>
			<Typography variant="subtitle2">Sin tipo, con sugerencia del detector ({fmt(c.sugeridas.length)})</Typography>
			{c.sugeridas.length === 0 ? (
				<Vacio />
			) : (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Causa</TableCell>
								<TableCell>Objeto</TableCell>
								<TableCell>Sugerencia</TableCell>
								<TableCell />
							</TableRow>
						</TableHead>
						<TableBody>
							{c.sugeridas.map((x) => (
								<TableRow key={x.causaId} hover>
									<TableCell sx={{ maxWidth: 300 }}>
										<Typography variant="body2" noWrap>
											{x.fuero} {x.expediente} · {x.caratula || "—"}
										</Typography>
									</TableCell>
									<TableCell sx={{ maxWidth: 220 }}>
										<Typography variant="caption" noWrap>
											{x.objeto || "—"}
										</Typography>
									</TableCell>
									<TableCell>
										<Chip
											size="small"
											color="info"
											variant="outlined"
											label={TIPO_LABEL[x.sugerencia.tipo]}
											title={x.sugerencia.motivo || ""}
										/>
										{x.sugerencia.motivo && (
											<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
												{x.sugerencia.motivo}
											</Typography>
										)}
									</TableCell>
									<TableCell align="right">
										<Link
											component="button"
											variant="body2"
											disabled={guardando === x.causaId}
											onClick={() => confirmar(x.causaId, x.sugerencia.tipo)}
										>
											Confirmar
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			)}
		</Stack>
	);
}

function Reglas({ items }: { items: PendienteRegla[] }) {
	if (!items.length) return <Vacio />;
	return (
		<Box sx={{ overflowX: "auto" }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Regla</TableCell>
						<TableCell>Fueros</TableCell>
						<TableCell align="right">Retiene</TableCell>
						<TableCell align="right">Últimos 7 días</TableCell>
						<TableCell />
					</TableRow>
				</TableHead>
				<TableBody>
					{items.map((r) => (
						<TableRow key={r.normaId} hover>
							<TableCell>
								<Typography variant="body2">{r.label}</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
									{r.normaId}
								</Typography>
							</TableCell>
							<TableCell>{r.fueros.join(", ")}</TableCell>
							<TableCell align="right">{fmt(r.retenidos)}</TableCell>
							<TableCell align="right">{fmt(r.ultimos7d)}</TableCell>
							<TableCell align="right">
								<Stack direction="row" spacing={1.5} justifyContent="flex-end">
									<Link
										component={RouterLink}
										to={`/admin/causas/plazos?tab=notificaciones&base=usuarios&status=computed&norma=${encodeURIComponent(r.normaId)}`}
										variant="body2"
									>
										Ver plazos
									</Link>
									<Link
										component={RouterLink}
										to={`/admin/causas/plazos?tab=revision-legal&base=usuarios&regla=${encodeURIComponent(r.normaId)}`}
										variant="body2"
									>
										Muestra
									</Link>
									<Link
										component={RouterLink}
										to={`/admin/causas/plazos?tab=normativa&regla=${encodeURIComponent(r.normaId)}`}
										variant="body2"
									>
										Revisar
									</Link>
								</Stack>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Box>
	);
}

function Carpetas({ items, total }: { items: PendienteCarpeta[]; total: number }) {
	if (!items.length) return <Vacio />;
	return (
		<Box sx={{ overflowX: "auto" }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Usuario</TableCell>
						<TableCell>Causa</TableCell>
						<TableCell align="right">Intervinientes</TableCell>
						<TableCell align="right">Cédulas</TableCell>
						<TableCell />
					</TableRow>
				</TableHead>
				<TableBody>
					{items.map((c) => (
						<TableRow key={c.folderId} hover>
							<TableCell>{c.email || c.userId}</TableCell>
							<TableCell sx={{ maxWidth: 360 }}>
								<Typography variant="body2" noWrap>
									{c.fuero} {c.expediente} · {c.caratula || "—"}
								</Typography>
							</TableCell>
							<TableCell align="right">
								{c.intervinientes ? (
									c.intervinientes
								) : (
									<Tooltip title="Todavía no se descargaron los intervinientes: el usuario no puede elegir su parte">
										<span>0</span>
									</Tooltip>
								)}
							</TableCell>
							<TableCell align="right">{c.cedulasRecientes}</TableCell>
							<TableCell align="right">
								<Link href={c.linkFront} target="_blank" rel="noopener" variant="body2">
									Abrir carpeta
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{total > items.length && (
				<Typography variant="caption" color="text.secondary">
					Se muestran {items.length} de {fmt(total)}, ordenadas por cédulas.
				</Typography>
			)}
		</Box>
	);
}

function Entregas({ items }: { items: PendienteEntrega[] }) {
	if (!items.length) return <Vacio />;
	return (
		<Box sx={{ overflowX: "auto" }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Usuario</TableCell>
						<TableCell>Entrega</TableCell>
						<TableCell>Vence</TableCell>
						<TableCell>Entregada</TableCell>
						<TableCell />
					</TableRow>
				</TableHead>
				<TableBody>
					{items.map((e) => (
						<TableRow key={`${e.plazoNotificacionId}-${e.folderId}`} hover>
							<TableCell>{e.email || e.userId}</TableCell>
							<TableCell>
								<Chip size="small" variant="outlined" label={e.accion + (e.confirmadoPor ? ` · ${e.confirmadoPor}` : "")} />
							</TableCell>
							<TableCell>{e.vencimiento || "—"}</TableCell>
							<TableCell>{fecha(e.entregadoAt)}</TableCell>
							<TableCell align="right">
								<Link
									component={RouterLink}
									to={`/admin/causas/plazos?base=usuarios&cedula=${encodeURIComponent(e.cedula)}`}
									variant="body2"
								>
									Ver cédula
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Box>
	);
}

function Credenciales({ items }: { items: PendienteCredencial[] }) {
	if (!items.length) return <Vacio />;
	return (
		<Box sx={{ overflowX: "auto" }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Usuario</TableCell>
						<TableCell align="right">Errores seguidos</TableCell>
						<TableCell>Código</TableCell>
						<TableCell>Último éxito</TableCell>
						<TableCell>Última corrida</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{items.map((c) => (
						<TableRow key={c.credentialsId} hover>
							<TableCell>{c.email || c.userId || c.credentialsId}</TableCell>
							<TableCell align="right">{c.consecutiveErrors}</TableCell>
							<TableCell>{c.code || "—"}</TableCell>
							<TableCell>{fecha(c.lastSuccessAt)}</TableCell>
							<TableCell>{fecha(c.lastRunAt)}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Box>
	);
}

export default function PendientesTab({ onTotal }: { onTotal?: (n: number) => void }) {
	const [d, setD] = useState<PlazosPendientes | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);

	const cargar = useCallback(
		async (fresh = false) => {
			setCargando(true);
			try {
				const r = await getPlazosPendientes(fresh);
				setD(r);
				setError(null);
				onTotal?.(r.resumen.total);
			} catch (err: any) {
				setError(err?.response?.data?.message || "No se pudieron leer los pendientes");
			} finally {
				setCargando(false);
			}
		},
		[onTotal],
	);

	useEffect(() => {
		cargar();
	}, [cargar]);

	if (error && !d) return <Alert severity="warning">{error}</Alert>;
	if (!d) return <Skeleton variant="rounded" height={240} />;
	const r = d.resumen;
	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 260 }}>
					Todo lo que depende de vos para seguir. Base de usuarios (Atlas), solo lectura · {fecha(d.generadoAt)}.
				</Typography>
				<Chip size="small" variant="outlined" label={`${r.cuentasActivas} cuenta(s) con la función activa`} />
				<Chip size="small" variant="outlined" label={`${r.eventos} eventos · ${r.avisos} avisos · ${r.respuestas} respuestas`} />
				<Tooltip title="Actualizar (la respuesta se guarda 60 s)">
					<span>
						<IconButton aria-label="Actualizar" size="small" onClick={() => cargar(true)} disabled={cargando}>
							<Refresh size={16} />
						</IconButton>
					</span>
				</Tooltip>
			</Stack>
			<Seccion
				titulo="Decisiones"
				n={r.decisionesListas}
				nota="Cada una muestra qué falta para poder decidir, medido sobre los datos reales."
			>
				<Decisiones items={d.decisiones} />
			</Seccion>
			<Seccion
				titulo="Calendario judicial"
				n={(r.calendarioAlerta ?? 0) + (r.diasSinVerificar ?? 0)}
				nota="Los vencimientos se calculan contra este calendario: si no cubre la fecha, el plazo no se propone; si hay días sin confirmar, queda marcado."
			>
				<Calendario c={d.calendario} />
			</Seccion>
			<BetaPanel />
			<Seccion
				titulo="Cédulas sin vencimiento: falta el tipo de proceso"
				n={r.sinTipoProceso ?? 0}
				nota="El plazo de algunos actos (traslado de demanda, de agravios) depende de si el juicio es ordinario o sumario. Si ninguna resolución lo declara, elegilo vos: las cédulas de esa causa se recalculan."
			>
				<TiposProceso onCambio={() => cargar(true)} />
			</Seccion>
			<Seccion
				titulo="Cobertura del tipo de proceso"
				nota="Causas con tipo detectado por fuero. El detector sugiere por el objeto del juicio; una sugerencia no vale hasta que la confirmás."
			>
				<CoberturaTipoProceso onCambio={() => cargar(true)} />
			</Seccion>
			<Seccion
				titulo="Reglas sin verificar que retienen plazos"
				n={r.reglasSinVerificar}
				nota={`${fmt(
					r.plazosRetenidos,
				)} plazo(s) de cuentas activas no llegan al usuario: solo pasan los del texto o los de reglas verificadas.`}
			>
				<Reglas items={d.reglasSinVerificar} />
			</Seccion>
			<Seccion
				titulo="Carpetas sin parte elegida"
				n={r.carpetasSinParte}
				nota="Sin parte elegida, la cédula solo es tuya si llegó a tu bandeja o a tu CUIT. Se elige en la carpeta → Información general → «¿A quién representás?»."
			>
				<Carpetas items={d.carpetasSinParte} total={r.carpetasSinParte} />
			</Seccion>
			<Seccion
				titulo="Entregas sin respuesta a «¿es correcto?»"
				n={r.entregasSinFeedback}
				nota="Eventos y avisos ya entregados que nadie calificó."
			>
				<Entregas items={d.entregasSinFeedback} />
			</Seccion>
			<Seccion titulo="Credenciales de la bandeja con errores" n={r.credencialesBandeja}>
				<Credenciales items={d.credencialesBandeja} />
			</Seccion>
		</Stack>
	);
}
