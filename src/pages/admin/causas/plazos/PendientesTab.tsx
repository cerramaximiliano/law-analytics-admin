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
	getPlazosPendientes,
	PendienteCalendario,
	PendienteCarpeta,
	PendienteCredencial,
	PendienteDecision,
	PendienteEntrega,
	PendienteRegla,
	PlazosPendientes,
} from "api/plazos";
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
						<IconButton size="small" onClick={() => cargar(true)} disabled={cargando}>
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
