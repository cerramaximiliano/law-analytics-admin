// Detalle de un box: qué es, cómo está y qué corre adentro.
//
// El estado de host y la tabla de procesos salen en vivo del dashboard de
// worker-monitoring del propio box; el repo dueño y la función de cada proceso
// salen del catálogo del admin-api. Un proceso que corre pero nadie catalogó se
// muestra igual, marcado — esconderlo sería el punto ciego que esta vista tiene
// que cerrar.
import {
	Box,
	Chip,
	Divider,
	LinearProgress,
	Paper,
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
import { Data, Cpu, Danger, InfoCircle, Timer1 } from "iconsax-react";
import MainCard from "components/MainCard";
import { InfraBox, InfraProcess } from "api/infrastructure";
import CrossLinkChip from "components/admin/CrossLinkChip";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";

interface Props {
	box: InfraBox;
	children?: React.ReactNode;
}

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

const ProcessRow = ({ p }: { p: InfraProcess }) => {
	const theme = useTheme();
	const color = STATUS_COLORS[p.status] || "#94A3B8";
	return (
		<TableRow hover sx={{ opacity: p.foreign ? 0.55 : 1 }}>
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
					<Tooltip title={`${p.logs.count} líneas en 24 h · último ${formatSince(p.logs.lastSeen)}`}>
						<Typography variant="caption" color={p.logs.errors > 0 ? "error.main" : "text.secondary"}>
							{p.logs.errors > 0 ? `${p.logs.errors} err` : formatSince(p.logs.lastSeen)}
						</Typography>
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

const BoxPanel = ({ box, children }: Props) => {
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
										{typeof a === "string" ? a : JSON.stringify(a)}
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
					</Stack>
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
										<TableCell>Función</TableCell>
										<TableCell align="right">↺</TableCell>
										<TableCell align="right">RAM</TableCell>
										<TableCell align="right">Uptime</TableCell>
										<TableCell align="right">Logs 24 h</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{box.processes.map((p) => (
										<ProcessRow key={p.name} p={p} />
									))}
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
