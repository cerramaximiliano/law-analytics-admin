// Detalle de un box: qué es, cómo está y qué corre adentro.
//
// El estado de host y la tabla de procesos salen en vivo del dashboard de
// worker-monitoring del propio box; el repo dueño y la función de cada proceso
// salen del catálogo del admin-api. Un proceso que corre pero nadie catalogó se
// muestra igual, marcado — esconderlo sería el punto ciego que esta vista tiene
// que cerrar.
import { useMemo, useRef, useState } from "react";
import {
	Box,
	Chip,
	Button,
	ButtonBase,
	Divider,
	IconButton,
	InputAdornment,
	Link,
	LinearProgress,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Data, Cpu, Danger, InfoCircle, Timer1, SearchNormal1, CloseCircle, ExportSquare, ArrowDown, Setting4 } from "iconsax-react";
import { Link as RouterLink } from "react-router-dom";
import MainCard from "components/MainCard";
import { InfraBox, InfraProcess } from "api/infrastructure";
import { panelDeWorker } from "./panelesDeWorker";
import CrossLinkChip from "components/admin/CrossLinkChip";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";

interface Props {
	box: InfraBox;
	children?: React.ReactNode;
	/** Repo que trajo al usuario acá desde el buscador: sus procesos se marcan. */
	highlightRepo?: string | null;
	/** Quita el resaltado. Sin esto la selección quedaba pegada hasta cambiar de box. */
	onClearHighlight?: () => void;
}

// Debajo de esto la tabla entra de un vistazo y el buscador estorba más de lo
// que ayuda. Los boxes de datos declaran 5 procesos; worker_01, 32.
const UMBRAL_FILTRO = 8;

const STATUS_COLORS: Record<string, string> = {
	online: LIVE_GREEN,
	errored: "#EF4444",
	stopped: "#94A3B8",
	desconocido: "#94A3B8",
};

function formatUptime(ms: number | null): string {
	if (!ms || ms < 0) return "—";
	const h = ms / 3600000;
	if (h < 1) return `${Math.round(ms / 60000)} min`;
	if (h < 48) return `${h.toFixed(1)} h`;
	return `${Math.round(h / 24)} d`;
}

function formatSince(iso: string | null | undefined): string {
	if (!iso) return "—";
	const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (min < 1) return "recién";
	if (min < 60) return `hace ${min} min`;
	const h = Math.floor(min / 60);
	if (h < 48) return `hace ${h} h`;
	return `hace ${Math.floor(h / 24)} d`;
}

/** Barra de uso con color por umbral: verde, ámbar arriba de 80, rojo arriba de 90. */
const UsageBar = ({ label, percent, detail }: { label: string; percent: number | null; detail?: string }) => {
	const pct = percent === null || Number.isNaN(percent) ? null : Math.max(0, Math.min(100, percent));
	const color = pct === null ? "#94A3B8" : pct >= 90 ? "#EF4444" : pct >= 80 ? STALE_AMBER : LIVE_GREEN;
	return (
		<Box sx={{ minWidth: 150, flex: 1 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
				<Typography variant="caption" color="text.secondary">
					{label}
				</Typography>
				<Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
					{pct === null ? "—" : `${Math.round(pct)}%`}
					{detail && (
						<Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75, fontWeight: 400 }}>
							{detail}
						</Typography>
					)}
				</Typography>
			</Stack>
			<LinearProgress
				variant="determinate"
				value={pct ?? 0}
				sx={{
					height: 6,
					borderRadius: 3,
					bgcolor: alpha(color, 0.15),
					"& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
				}}
			/>
		</Box>
	);
};

/**
 * Las alertas del monitor llegan a veces como texto plano y a veces como un
 * string que ES JSON: `{"level":"WARNING","type":"HIGH_CPU","message":"Load
 * average 2.49 supera umbral de 1.8 (2 cores)"}`. El render hacía
 * `typeof a === "string" ? a : JSON.stringify(a)`, así que el segundo caso
 * salía crudo con llaves y comillas. Se intenta parsear y se muestra el
 * mensaje; si no es JSON, se muestra tal cual, que es lo correcto para el
 * primer caso.
 */
function textoDeAlerta(a: unknown): string {
	if (typeof a !== "string") {
		const o = a as { message?: string } | null;
		return o?.message || JSON.stringify(a);
	}
	const t = a.trim();
	if (!t.startsWith("{")) return a;
	try {
		const o = JSON.parse(t);
		return o?.message || a;
	} catch {
		return a;
	}
}

/**
 * El link de una fila a sus logs.
 *
 * El contador de la columna "Logs 24 h" no es una estimación: sale de agrupar
 * la colección `Log` por (host, service) sobre las últimas 24 h, que es la
 * misma que sirve /admin/logs. Así que el número tiene filas concretas detrás
 * y hacer click debería mostrarlas — mismo origen, misma ventana, sin agregar.
 *
 * Tres cosas que hay que traducir para que el link no caiga en el vacío:
 *
 * - El servicio en los logs NO es el nombre del proceso. El shipper lo deriva
 *   del archivo de log, que convierte `/` y `_` en `-`: el proceso
 *   `worker_SAIJ_0` es `worker-SAIJ-0` ahí. Misma regla que logServiceName()
 *   en el admin-api.
 * - El host tampoco es el del box, es `logHost`: worker_01 loguea como
 *   `local-worker-01`.
 * - La ventana tiene que ser de 24 h. Sin acotarla, apretás "260 err" y ves el
 *   histórico entero; que lo que aparece no coincida con lo que clickeaste es
 *   chico pero corroe la confianza en el resto de los links.
 *
 * El nivel va como "error,fatal" —lista que el backend entiende— porque el
 * contador suma los dos: con un solo nivel el link mostraría de menos.
 */
function linkALogs(processName: string, logHost: string | null, soloErrores: boolean): string {
	const service = processName.replace(/[/_]/g, "-");
	// datetime-local espera hora LOCAL sin zona: toISOString() daría UTC y
	// correría la ventana tres horas.
	const desde = new Date(Date.now() - 24 * 3600 * 1000);
	const pad = (n: number) => String(n).padStart(2, "0");
	const from = `${desde.getFullYear()}-${pad(desde.getMonth() + 1)}-${pad(desde.getDate())}T${pad(desde.getHours())}:${pad(
		desde.getMinutes(),
	)}`;

	const sp = new URLSearchParams({ service, from });
	if (logHost) sp.set("host", logHost);
	if (soloErrores) sp.set("level", "error,fatal");
	return `/admin/logs?${sp.toString()}`;
}

const ProcessRow = ({
	p,
	resaltada,
	refFila,
	logHost,
}: {
	p: InfraProcess;
	resaltada?: boolean;
	refFila?: React.Ref<HTMLTableRowElement>;
	logHost: string | null;
}) => {
	const theme = useTheme();
	const color = STATUS_COLORS[p.status] || "#94A3B8";
	const gh = p.github;
	const panel = panelDeWorker(p.name, p.repo);
	return (
		<TableRow
			ref={refFila}
			hover
			sx={{
				opacity: p.foreign ? 0.55 : 1,
				// Un filete a la izquierda en vez de teñir la fila entera: la tabla
				// ya usa color para el estado del proceso, y pintarle el fondo
				// competiría con esa señal justo en las filas que interesan.
				...(resaltada && {
					bgcolor: alpha(BRAND_BLUE, 0.07),
					"& td:first-of-type": { boxShadow: `inset 3px 0 0 ${BRAND_BLUE}` },
				}),
			}}
		>
			<TableCell sx={{ whiteSpace: "nowrap" }}>
				<Stack direction="row" spacing={1} alignItems="center">
					<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
					<Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 500 }}>
						{p.name}
					</Typography>
					{p.highlight === "failover" && (
						<Chip size="small" label="failover" color="warning" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
					)}
					{p.cron && (
						<Tooltip title="Corre por cron: estar detenido entre corridas es lo normal">
							<Chip size="small" icon={<Timer1 size={11} />} label="cron" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
						</Tooltip>
					)}
					{/* De "dónde corre" a "cómo se configura": el cuarto lado del
					    triángulo Datos ↔ Worker ↔ Flujo. Sólo aparece donde hay un
					    panel real — un link al panel equivocado es peor que ninguno. */}
					{panel && (
						<Tooltip title={panel.hint}>
							<IconButton
								component={RouterLink}
								to={panel.to}
								size="small"
								aria-label={panel.hint}
								sx={{ width: 20, height: 20, color: "text.disabled", "&:hover": { color: BRAND_BLUE } }}
							>
								<Setting4 size={13} />
							</IconButton>
						</Tooltip>
					)}
					{p.foreign && <Chip size="small" label="ajeno" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />}
					{!p.catalogued && !p.foreign && (
						<Tooltip title="Corre en el box pero no está en el catálogo del inventario">
							<Chip size="small" label="sin catalogar" color="warning" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
						</Tooltip>
					)}
				</Stack>
			</TableCell>
			<TableCell sx={{ whiteSpace: "nowrap" }}>
				<Typography variant="caption" sx={{ color, fontWeight: 600 }}>
					{p.status}
				</Typography>
			</TableCell>
			<TableCell>
				<Typography variant="caption" color="text.secondary">
					{p.repo || "—"}
				</Typography>
			</TableCell>
			<TableCell sx={{ whiteSpace: "nowrap" }}>
				{/* No todo lo que corre tiene repo publicado: infoleg y la-mcp-server
				    se deployan sin git, y el módulo de PM2 y Hydra son de terceros.
				    Decir "—" es más honesto que inventar un link roto. */}
				{gh ? (
					<Link
						href={gh.url}
						target="_blank"
						rel="noopener noreferrer"
						variant="caption"
						underline="hover"
						sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, fontFamily: "monospace" }}
					>
						{gh.name}
						<ExportSquare size={11} />
					</Link>
				) : (
					<Typography variant="caption" color="text.disabled">
						—
					</Typography>
				)}
			</TableCell>
			<TableCell sx={{ minWidth: 260 }}>
				<Typography variant="caption" color={p.role ? "text.primary" : "text.secondary"}>
					{p.role || "Sin descripción en el catálogo"}
				</Typography>
			</TableCell>
			<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
				<Typography variant="caption" color={p.restarts && p.restarts > 50 ? theme.palette.warning.main : "text.secondary"}>
					{p.restarts ?? "—"}
				</Typography>
			</TableCell>
			<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
				<Typography variant="caption" color="text.secondary">
					{p.memoryMb ? `${p.memoryMb} MB` : "—"}
				</Typography>
			</TableCell>
			<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
				<Typography variant="caption" color="text.secondary">
					{formatUptime(p.uptimeMs)}
				</Typography>
			</TableCell>
			<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
				{p.logs ? (
					<Tooltip
						title={
							p.logs.errors > 0
								? `Ver los ${p.logs.errors} errores de las últimas 24 h · ${p.logs.count} líneas en total`
								: `Ver las ${p.logs.count} líneas de las últimas 24 h · último ${formatSince(p.logs.lastSeen)}`
						}
					>
						<Link
							component={RouterLink}
							to={linkALogs(p.name, logHost, p.logs.errors > 0)}
							variant="caption"
							underline="hover"
							color={p.logs.errors > 0 ? "error.main" : "text.secondary"}
						>
							{p.logs.errors > 0 ? `${p.logs.errors} err` : formatSince(p.logs.lastSeen)}
						</Link>
					</Tooltip>
				) : (
					<Typography variant="caption" color="text.secondary">
						—
					</Typography>
				)}
			</TableCell>
		</TableRow>
	);
};

const BoxPanel = ({ box, children, highlightRepo, onClearHighlight }: Props) => {
	const resaltados = highlightRepo ? box.processes.filter((p) => p.repo === highlightRepo).length : 0;
	const [filtro, setFiltro] = useState("");
	// Con 100 procesos, "marcados los 5 de saij-workers" no dice DÓNDE están: el
	// banner es visible pero las filas pueden caer ochenta más abajo. Este ref
	// apunta a la primera para poder saltar hasta ella.
	const primeraMarcada = useRef<HTMLTableRowElement | null>(null);

	// El filtro aparece solo donde hace falta. worker_01 declara 32 procesos y
	// worker-cloud-02 29 —ahí buscar a ojo cuesta—, pero los boxes de datos
	// tienen 5: un campo de búsqueda sobre cinco filas es ruido, no ayuda.
	const conFiltro = box.processes.length >= UMBRAL_FILTRO;

	// Se busca por nombre, repo, rol y estado. El rol entra porque muchas veces
	// uno recuerda qué HACE el proceso ("captcha", "notificaciones") y no cómo
	// se llama.
	const procesosVisibles = useMemo(() => {
		// `conFiltro` también manda acá: si el campo no está a la vista no puede
		// haber un filtro activo que el usuario no pueda ver ni limpiar.
		const terminos = conFiltro ? filtro.toLowerCase().split(/\s+/).filter(Boolean) : [];
		if (!terminos.length) return box.processes;
		return box.processes.filter((p) => {
			const heno = `${p.name} ${p.repo ?? ""} ${p.role ?? ""} ${p.status}`.toLowerCase();
			return terminos.every((t) => heno.includes(t));
		});
	}, [box.processes, filtro, conFiltro]);
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const live = box.live;
	const memPct = live.memory ? parseFloat(live.memory.percent) : null;
	const diskPct = live.disk ? live.disk.percent : null;
	const loadPct = live.cpu ? (parseFloat(live.cpu.load1) / live.cpu.cores) * 100 : null;

	const meta: { label: string; value: string }[] = [
		{ label: "Proveedor", value: box.provider },
		{ label: "Instancia", value: box.instanceType },
		{ label: "Zona", value: box.zone },
		...(box.monthlyCostUsd ? [{ label: "Costo", value: `US$ ${box.monthlyCostUsd}/mes` }] : []),
		...(box.publicIp ? [{ label: "IP pública", value: box.publicIp }] : []),
		...(box.tailscaleIp ? [{ label: "Tailscale", value: box.tailscaleIp }] : []),
		...(box.privateIp ? [{ label: "IP privada", value: box.privateIp }] : []),
		...(live.hostname || box.hostname ? [{ label: "Hostname", value: (live.hostname || box.hostname) as string }] : []),
	];

	return (
		<Stack spacing={2.5}>
			<MainCard>
				<Stack spacing={2}>
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
						<Box sx={{ maxWidth: 760 }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
								<Typography variant="h4" sx={{ fontFamily: "monospace" }}>
									{box.name}
								</Typography>
								{box.critical && <Chip size="small" label="crítico" color="error" variant="outlined" />}
								{box.retired && <Chip size="small" label="sin producción" variant="outlined" />}
								{box.hasFailover && <Chip size="small" label="con respaldo en la nube" color="warning" variant="outlined" />}
							</Stack>
							<Typography variant="body1" color="text.secondary">
								{box.role}
							</Typography>
							{box.detail && (
								<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
									{box.detail}
								</Typography>
							)}
						</Box>
						<Stack spacing={0.75} alignItems="flex-end">
							{box.databaseKey && (
								<CrossLinkChip
									to={`/admin/infrastructure/databases?db=${box.databaseKey}`}
									label="Ver la base de datos"
									title="Ir al detalle de la base que corre en este box: volumen, espacio libre y colecciones"
								/>
							)}
							<Chip
								size="small"
								label={
									live.reachable
										? `Agente al día · ${formatSince(live.at)}`
										: box.agent === "logs"
										? "Sin agente de métricas"
										: "Agente sin respuesta"
								}
								color={live.reachable ? "success" : box.agent === "logs" ? "default" : "error"}
								variant="outlined"
							/>
							{!live.reachable && live.error && (
								<Typography variant="caption" color="error.main">
									{live.error}
								</Typography>
							)}
							{!live.reachable && box.lastLogAt && (
								<Typography variant="caption" color="text.secondary">
									Últimos logs {formatSince(box.lastLogAt)}
								</Typography>
							)}
						</Stack>
					</Stack>

					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{meta.map((m) => (
							<Chip
								key={m.label}
								size="small"
								variant="outlined"
								label={
									<>
										<Typography component="span" variant="caption" color="text.secondary">
											{m.label}:{" "}
										</Typography>
										<Typography component="span" variant="caption" sx={{ fontFamily: "monospace", fontWeight: 500 }}>
											{m.value}
										</Typography>
									</>
								}
								sx={{ borderColor: headerBorder(isDark) }}
							/>
						))}
					</Stack>

					{live.reachable && (
						<>
							<Divider />
							<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
								<UsageBar
									label="Memoria"
									percent={memPct}
									detail={live.memory ? `${live.memory.usedGB} / ${live.memory.totalGB} GB` : undefined}
								/>
								<UsageBar label="Disco" percent={diskPct} detail={live.disk ? `${live.disk.availHuman} libres` : undefined} />
								<UsageBar
									label={`Carga (${live.cpu?.cores ?? "?"} vCPU)`}
									percent={loadPct}
									detail={live.cpu ? `load ${live.cpu.load1} / ${live.cpu.load5} / ${live.cpu.load15}` : undefined}
								/>
							</Stack>
						</>
					)}

					{(box.systemdUnits?.length || live.mongo?.running || live.rs) && (
						<Stack spacing={1}>
							<Divider />
							{box.systemdUnits?.map((u) => (
								<Stack key={u.name} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
									<Data size={14} color={BRAND_BLUE} />
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
										{u.name}
									</Typography>
									<Chip size="small" label="systemd" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
									{u.name === "mongod" && live.mongo && (
										<Chip
											size="small"
											label={live.mongo.responsive ? "respondiendo" : live.mongo.running ? "corriendo, sin responder" : "detenido"}
											color={live.mongo.responsive ? "success" : "error"}
											variant="outlined"
											sx={{ height: 18, fontSize: "0.62rem" }}
										/>
									)}
									<Typography variant="caption" color="text.secondary">
										{u.role}
									</Typography>
								</Stack>
							))}
						</Stack>
					)}

					{(box.notes?.length || box.sshHint) && (
						<Stack spacing={0.75}>
							<Divider />
							{box.notes?.map((n) => (
								<Stack key={n} direction="row" spacing={1} alignItems="flex-start">
									<InfoCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} color={theme.palette.text.disabled} />
									<Typography variant="caption" color="text.secondary">
										{n}
									</Typography>
								</Stack>
							))}
							{box.sshHint && (
								<Stack direction="row" spacing={1} alignItems="flex-start">
									<Cpu size={14} style={{ marginTop: 2, flexShrink: 0 }} color={theme.palette.text.disabled} />
									<Typography variant="caption" sx={{ fontFamily: "monospace" }} color="text.secondary">
										{box.sshHint}
									</Typography>
								</Stack>
							)}
						</Stack>
					)}

					{live.alerts && live.alerts.length > 0 && (
						<Stack spacing={0.5}>
							<Divider />
							{live.alerts.map((a, i) => (
								<Stack key={i} direction="row" spacing={1} alignItems="center">
									<Danger size={14} color={theme.palette.warning.main} />
									<Typography variant="caption" color="warning.main">
										{textoDeAlerta(a)}
									</Typography>
								</Stack>
							))}
						</Stack>
					)}
				</Stack>
			</MainCard>

			{children}

			<MainCard
				title={
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<span>Procesos</span>
						{live.reachable ? (
							<Chip size="small" label={`${box.processSummary.online} online`} color="success" variant="outlined" />
						) : (
							<Chip size="small" label={`${box.processSummary.total} declarados`} variant="outlined" />
						)}
						{box.processSummary.errored > 0 && <Chip size="small" label={`${box.processSummary.errored} en error`} color="error" />}
						{box.processSummary.stopped > 0 && <Chip size="small" label={`${box.processSummary.stopped} detenidos`} variant="outlined" />}
						{box.processSummary.unknown > 0 && (
							<Chip size="small" label={`${box.processSummary.unknown} sin estado observable`} variant="outlined" />
						)}
						{box.processSummary.foreign > 0 && (
							<Tooltip title="Proyectos que comparten la máquina pero no son del ecosistema">
								<Chip size="small" label={`${box.processSummary.foreign} ajenos`} variant="outlined" />
							</Tooltip>
						)}
						{/* Con el filtro puesto los chips de arriba siguen contando el
						    total del box, que es lo correcto; este dice cuánto se ve. */}
						{conFiltro && filtro && (
							<Chip
								size="small"
								label={`${procesosVisibles.length} de ${box.processes.length}`}
								sx={{ height: 20, fontSize: "0.65rem", bgcolor: alpha(BRAND_BLUE, 0.12), color: BRAND_BLUE, fontWeight: 600 }}
							/>
						)}
					</Stack>
				}
				secondary={
					conFiltro ? (
						<TextField
							size="small"
							value={filtro}
							onChange={(e) => setFiltro(e.target.value)}
							placeholder="Filtrar procesos…"
							sx={{ width: { xs: "100%", sm: 240 } }}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchNormal1 size={15} color={theme.palette.text.secondary} />
									</InputAdornment>
								),
								endAdornment: filtro ? (
									<InputAdornment position="end">
										<IconButton size="small" onClick={() => setFiltro("")} aria-label="Limpiar el filtro" sx={{ mr: -0.5 }}>
											<CloseCircle size={15} />
										</IconButton>
									</InputAdornment>
								) : null,
							}}
						/>
					) : undefined
				}
			>
				{box.processes.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						{box.agent === "malla"
							? "El box no reporta procesos PM2."
							: "Sin lista en vivo: este box no tiene el stack de monitoreo instalado."}
					</Typography>
				) : (
					<>
						{/* Sin este aviso, las filas marcadas aparecen resaltadas sin
						    motivo visible para quien llegó por un link compartido. */}
						{resaltados > 0 && (
							<Stack
								direction="row"
								spacing={1}
								alignItems="center"
								sx={{
									mb: 1.5,
									borderRadius: 1,
									bgcolor: alpha(BRAND_BLUE, 0.07),
									borderLeft: `3px solid ${BRAND_BLUE}`,
								}}
							>
								<ButtonBase
									onClick={() => primeraMarcada.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
									sx={{
										flexGrow: 1,
										justifyContent: "flex-start",
										gap: 1,
										px: 1.25,
										py: 0.75,
										borderRadius: 1,
										"&:hover": { bgcolor: alpha(BRAND_BLUE, 0.07) },
									}}
								>
									<Typography variant="caption" color="text.secondary">
										{resaltados === 1 ? "Marcado el proceso de" : `Marcados los ${resaltados} procesos de`}
									</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: BRAND_BLUE }}>
										{highlightRepo}
									</Typography>
									<ArrowDown size={13} color={BRAND_BLUE} />
									<Typography variant="caption" sx={{ color: BRAND_BLUE }}>
										Ir
									</Typography>
								</ButtonBase>
								{/* Sin esta X la selección quedaba pegada: filtrabas otra cosa
								    y las filas seguían marcadas por una búsqueda vieja. */}
								{onClearHighlight && (
									<Tooltip title="Quitar la selección">
										<IconButton size="small" onClick={onClearHighlight} aria-label="Quitar la selección" sx={{ mr: 0.5 }}>
											<CloseCircle size={15} />
										</IconButton>
									</Tooltip>
								)}
							</Stack>
						)}

						{!live.reachable && box.agent === "logs" && (
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
								Lista del catálogo, no en vivo: este box no corre el agente de monitoreo. El estado real de cada proceso se infiere de la
								actividad de logs de la última columna.
							</Typography>
						)}
						<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Proceso</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Repo</TableCell>
										<TableCell>GitHub</TableCell>
										<TableCell>Función</TableCell>
										<TableCell align="right">↺</TableCell>
										<TableCell align="right">RAM</TableCell>
										<TableCell align="right">Uptime</TableCell>
										<TableCell align="right">Logs 24 h</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{procesosVisibles.map((p, idx) => {
										const resaltada = !!highlightRepo && p.repo === highlightRepo;
										// El ref va en la PRIMERA marcada de lo que se ve, no de
										// la lista completa: con un filtro puesto, saltar a una
										// fila que el filtro ocultó no llevaría a ningún lado.
										const esLaPrimera = resaltada && procesosVisibles.findIndex((q) => q.repo === highlightRepo) === idx;
										return (
											<ProcessRow
												key={p.name}
												p={p}
												resaltada={resaltada}
												refFila={esLaPrimera ? primeraMarcada : undefined}
												logHost={box.logHost}
											/>
										);
									})}
									{procesosVisibles.length === 0 && (
										<TableRow>
											<TableCell colSpan={9} sx={{ borderBottom: "none" }}>
												<Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
													<Typography variant="body2" color="text.secondary">
														Ningún proceso de este box coincide con «{filtro}»
													</Typography>
													{/* textTransform: el tema capitaliza cada palabra y
													    dejaba "Limpiar El Filtro". */}
													<Button size="small" variant="text" sx={{ textTransform: "none" }} onClick={() => setFiltro("")}>
														Limpiar el filtro
													</Button>
												</Stack>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</>
				)}
			</MainCard>
		</Stack>
	);
};

export default BoxPanel;
