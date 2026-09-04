// Mapa de la infraestructura del ecosistema.
//
// La pestaña general lista los diez boxes con sus características y su estado;
// cada uno tiene su propia pestaña con los procesos que corren adentro. Hacer
// click en un box de la general abre su pestaña.
//
// Antes esta vista era solo el panel de failover del scraping, y todavía decía
// que el box respaldado era worker_02 — el servicio se había mudado a
// worker-cloud-02 en agosto de 2026. Ese panel ahora vive dentro de la pestaña
// del box que efectivamente lo corre, que es donde se lo busca.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	LinearProgress,
	Paper,
	Stack,
	Tab,
	Tabs,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Cloud, Cpu, Data, Refresh, Warning2 } from "iconsax-react";
import MainCard from "components/MainCard";
import { useSearchParams } from "react-router-dom";
import { useTabParam } from "hooks/useTabParam";
import RepoSearch, { RepoHit } from "./RepoSearch";
import InfrastructureService, { InfraBox } from "api/infrastructure";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder, navHoverBg } from "themes/dashboardTokens";
import BoxPanel from "./BoxPanel";
import FailoverPanel from "./FailoverPanel";

// Orden de los grupos en la vista general: primero lo que sostiene al resto.
// Al cambiar de pestaña a mano se limpia el repo resaltado: llegaste al box
// por tu cuenta, no desde un resultado de búsqueda.
const BOX_RESETS = ["repo"] as const;

const GROUP_ORDER = ["Núcleo", "Datos", "Cloud", "Workers"];

const GROUP_ICON: Record<string, React.ReactNode> = {
	Núcleo: <Cpu size={16} />,
	Datos: <Data size={16} />,
	Cloud: <Cloud size={16} />,
	Workers: <Cpu size={16} />,
};

/** Color de la barra de uso: verde, ámbar arriba de 80, rojo arriba de 90. */
const usageColor = (pct: number | null) => (pct === null ? "#94A3B8" : pct >= 90 ? "#EF4444" : pct >= 80 ? STALE_AMBER : LIVE_GREEN);

const MiniBar = ({ label, pct, hint }: { label: string; pct: number | null; hint?: string }) => (
	<Box sx={{ flex: 1, minWidth: 84 }}>
		<Stack direction="row" justifyContent="space-between" alignItems="baseline">
			<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
				{label}
			</Typography>
			<Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.68rem", fontVariantNumeric: "tabular-nums" }}>
				{pct === null ? "—" : `${Math.round(pct)}%`}
			</Typography>
		</Stack>
		<Tooltip title={hint || ""}>
			<LinearProgress
				variant="determinate"
				value={pct ?? 0}
				sx={{
					mt: 0.4,
					height: 4,
					borderRadius: 2,
					bgcolor: alpha(usageColor(pct), 0.15),
					"& .MuiLinearProgress-bar": { bgcolor: usageColor(pct), borderRadius: 2 },
				}}
			/>
		</Tooltip>
	</Box>
);

const BoxCard = ({ box, onOpen }: { box: InfraBox; onOpen: () => void }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const live = box.live;
	const memPct = live.memory ? parseFloat(live.memory.percent) : null;
	const diskPct = live.disk ? live.disk.percent : null;
	const loadPct = live.cpu ? (parseFloat(live.cpu.load1) / live.cpu.cores) * 100 : null;
	const unreachable = box.agent === "malla" && !live.reachable;

	return (
		<Paper
			variant="outlined"
			onClick={onOpen}
			sx={{
				p: 2,
				height: "100%",
				borderRadius: 2,
				cursor: "pointer",
				borderColor: unreachable ? theme.palette.error.main : headerBorder(isDark),
				transition: "background-color 200ms ease, border-color 200ms ease",
				"&:hover": { bgcolor: navHoverBg(isDark), borderColor: alpha(BRAND_BLUE, 0.45) },
			}}
		>
			<Stack spacing={1.25}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
					<Box sx={{ minWidth: 0 }}>
						<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
							<Typography variant="subtitle1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
								{box.name}
							</Typography>
							{box.critical && (
								<Chip size="small" label="crítico" color="error" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
							)}
							{box.retired && <Chip size="small" label="sin producción" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />}
							{box.hasFailover && (
								<Chip size="small" label="respaldo" color="warning" variant="outlined" sx={{ height: 18, fontSize: "0.62rem" }} />
							)}
						</Stack>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
							{box.role}
						</Typography>
					</Box>
					<Box
						sx={{
							width: 9,
							height: 9,
							mt: 0.75,
							borderRadius: "50%",
							flexShrink: 0,
							bgcolor: unreachable ? theme.palette.error.main : live.reachable ? LIVE_GREEN : "#94A3B8",
						}}
					/>
				</Stack>

				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					<Chip size="small" variant="outlined" label={box.provider} sx={{ height: 20, fontSize: "0.65rem" }} />
					<Chip
						size="small"
						variant="outlined"
						label={box.instanceType}
						sx={{ height: 20, fontSize: "0.65rem", fontFamily: "monospace" }}
					/>
					<Chip size="small" variant="outlined" label={box.zone} sx={{ height: 20, fontSize: "0.65rem" }} />
					{box.monthlyCostUsd && (
						<Chip size="small" variant="outlined" label={`US$ ${box.monthlyCostUsd}/mes`} sx={{ height: 20, fontSize: "0.65rem" }} />
					)}
				</Stack>

				{live.reachable ? (
					<Stack direction="row" spacing={1.5}>
						<MiniBar label="RAM" pct={memPct} hint={live.memory ? `${live.memory.usedGB} / ${live.memory.totalGB} GB` : ""} />
						<MiniBar label="Disco" pct={diskPct} hint={live.disk ? `${live.disk.availHuman} libres` : ""} />
						<MiniBar label="Carga" pct={loadPct} hint={live.cpu ? `load ${live.cpu.load1} sobre ${live.cpu.cores} vCPU` : ""} />
					</Stack>
				) : (
					<Typography variant="caption" color={unreachable ? "error.main" : "text.secondary"}>
						{unreachable ? `Agente sin respuesta${live.error ? ` — ${live.error}` : ""}` : "Sin agente de métricas en este box"}
					</Typography>
				)}

				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					{live.reachable ? (
						<Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
							{box.processSummary.online}
							<Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
								{" "}
								de {box.processSummary.total} procesos online
							</Typography>
						</Typography>
					) : (
						<Typography variant="caption" color="text.secondary">
							{box.processSummary.total} procesos declarados · estado no observable
						</Typography>
					)}
					{box.processSummary.errored > 0 && (
						<Chip size="small" color="error" label={`${box.processSummary.errored} en error`} sx={{ height: 18, fontSize: "0.62rem" }} />
					)}
					{live.alerts && live.alerts.length > 0 && (
						<Chip
							size="small"
							color="warning"
							variant="outlined"
							icon={<Warning2 size={11} />}
							label={live.alerts.length}
							sx={{ height: 18, fontSize: "0.62rem" }}
						/>
					)}
				</Stack>
			</Stack>
		</Paper>
	);
};

const InfrastructurePage = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [data, setData] = useState<InfraBox[]>([]);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Los slugs de las pestañas se derivan de los boxes que devuelve el backend,
	// pero useTabParam necesita una lista estable: se calcula una sola vez con
	// las claves conocidas y se recalcula sólo si el inventario cambia.
	const tabValues = useMemo(() => ["general", ...data.map((b) => b.key)], [data]);

	const [activeTab, setActiveTab] = useTabParam("box", tabValues.length > 1 ? tabValues : ["general"], { resets: BOX_RESETS });

	// El repo resaltado viaja en la URL para que el resultado sea compartible:
	// "/admin/infrastructure?box=worker_01&repo=pjn-escritos-worker" abre el box
	// con sus procesos marcados.
	const [searchParams, setSearchParams] = useSearchParams();
	const repoResaltado = searchParams.get("repo");

	// Box y repo se escriben juntos, no con setActiveTab: ese limpia `repo` por
	// diseño, y encadenar las dos actualizaciones lo borraría al instante.
	const irAlRepo = useCallback(
		({ repo, boxKey }: RepoHit) => {
			setSearchParams(
				(prev) => {
					const sp = new URLSearchParams(prev);
					sp.set("box", boxKey);
					sp.set("repo", repo);
					return sp;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	const fetchData = useCallback(async (force = false) => {
		setLoading(true);
		try {
			const res = await InfrastructureService.getInventory(force);
			setData(res.boxes || []);
			setGeneratedAt(res.generatedAt);
			setError(null);
		} catch (err: any) {
			setError(err?.response?.data?.message || err.message || "No se pudo cargar el inventario");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
		// La malla corre su monitor cada 60s: refrescar con esa cadencia alcanza.
		const interval = setInterval(() => fetchData(), 60000);
		return () => clearInterval(interval);
	}, [fetchData]);

	const grouped = useMemo(() => {
		const byGroup = new Map<string, InfraBox[]>();
		for (const box of data) {
			if (!byGroup.has(box.group)) byGroup.set(box.group, []);
			byGroup.get(box.group)!.push(box);
		}
		return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, boxes: byGroup.get(g)! }));
	}, [data]);

	// Los procesos de los boxes sin agente no se suman a "online": nadie los está
	// mirando, y contarlos como caídos mentiría igual que contarlos como vivos.
	const totals = useMemo(() => {
		const online = data.reduce((n, b) => n + b.processSummary.online, 0);
		const observed = data.reduce((n, b) => n + b.processSummary.total - b.processSummary.unknown, 0);
		const unobserved = data.reduce((n, b) => n + b.processSummary.unknown, 0);
		const errored = data.reduce((n, b) => n + b.processSummary.errored, 0);
		const down = data.filter((b) => b.agent === "malla" && !b.live.reachable).length;
		const cost = data.reduce((n, b) => n + (b.monthlyCostUsd || 0), 0);
		return { online, observed, unobserved, errored, down, cost };
	}, [data]);

	const current = data.find((b) => b.key === activeTab);

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Infraestructura
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Los servidores del ecosistema y los procesos que corren en cada uno. El estado sale en vivo del monitor que cada box publica
							por Tailscale.
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} alignItems="center">
						{generatedAt && (
							<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{new Date(generatedAt).toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
							</Typography>
						)}
						<Tooltip title="Volver a consultar a cada box">
							<span>
								<IconButton size="small" onClick={() => fetchData(true)} disabled={loading}>
									{loading ? <CircularProgress size={16} /> : <Refresh size={18} />}
								</IconButton>
							</span>
						</Tooltip>
					</Stack>
				</Stack>

				{error && <Alert severity="error">{error}</Alert>}

				<Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", borderColor: headerBorder(isDark), boxShadow: "none" }}>
					<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.04 : 0.025) }}>
						<Tabs
							value={tabValues.includes(activeTab) ? activeTab : "general"}
							onChange={(_, v) => setActiveTab(v)}
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": {
									minHeight: 48,
									textTransform: "none",
									fontSize: "0.85rem",
									fontWeight: 500,
									transition: "color 200ms ease",
								},
							}}
						>
							<Tab value="general" label="Vista general" />
							{data.map((box) => (
								<Tab
									key={box.key}
									value={box.key}
									label={
										<Stack direction="row" spacing={0.75} alignItems="center">
											<Box
												sx={{
													width: 7,
													height: 7,
													borderRadius: "50%",
													bgcolor:
														box.agent === "malla" && !box.live.reachable
															? theme.palette.error.main
															: box.live.reachable
															? LIVE_GREEN
															: "#94A3B8",
												}}
											/>
											<span style={{ fontFamily: "monospace" }}>{box.name}</span>
										</Stack>
									}
								/>
							))}
						</Tabs>
					</Box>

					<Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
						{activeTab === "general" || !current ? (
							<Stack spacing={3}>
								{data.length > 0 && <RepoSearch boxes={data} onPick={irAlRepo} />}

								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									<Chip size="small" variant="outlined" label={`${data.length} servidores`} />
									<Chip size="small" variant="outlined" label={`${totals.online} de ${totals.observed} procesos online`} />
									{totals.unobserved > 0 && (
										<Tooltip title="Boxes sin el stack de monitoreo: no publican estado de procesos">
											<Chip size="small" variant="outlined" label={`${totals.unobserved} sin lectura en vivo`} />
										</Tooltip>
									)}
									{totals.errored > 0 && <Chip size="small" color="error" label={`${totals.errored} procesos en error`} />}
									{totals.down > 0 && <Chip size="small" color="error" label={`${totals.down} box(es) sin responder`} />}
									{totals.cost > 0 && <Chip size="small" variant="outlined" label={`US$ ${totals.cost}/mes en Lightsail`} />}
								</Stack>

								{loading && data.length === 0 ? (
									<Stack alignItems="center" sx={{ py: 6 }}>
										<CircularProgress size={28} />
									</Stack>
								) : (
									grouped.map(({ group, boxes }) => (
										<Stack key={group} spacing={1.5}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Box sx={{ color: BRAND_BLUE, display: "flex" }}>{GROUP_ICON[group]}</Box>
												<Typography variant="overline" sx={{ letterSpacing: "0.08em", fontWeight: 700, color: "text.secondary" }}>
													{group}
												</Typography>
											</Stack>
											<Grid container spacing={2}>
												{boxes.map((box) => (
													<Grid item xs={12} sm={6} lg={4} key={box.key}>
														<BoxCard box={box} onOpen={() => setActiveTab(box.key)} />
													</Grid>
												))}
											</Grid>
										</Stack>
									))
								)}
							</Stack>
						) : (
							<BoxPanel key={current.key} box={current} highlightRepo={repoResaltado}>
								{current.hasFailover ? <FailoverPanel /> : null}
							</BoxPanel>
						)}
					</Box>
				</Paper>
			</Stack>
		</MainCard>
	);
};

export default InfrastructurePage;
