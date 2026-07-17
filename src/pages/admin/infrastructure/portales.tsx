/**
 * Estado de Portales — vista unificada de la salud de los portales judiciales
 * que scrapean los workers del ecosistema:
 *
 *   - PJN  → portal-incidents (pjn-mis-causas)
 *   - SCBA → scba-system-state + scba-site-incidents (scba-workers)
 *   - MEV  → mev-system-state + mev-site-incidents (mev-workers)
 *
 * Consume el dominio /api/portales del admin-api, que normaliza los tres
 * formatos a un shape único. Cards de estado actual + historial paginado.
 */
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { Refresh, Health, Warning2, CloudCross } from "iconsax-react";
import MainCard from "components/MainCard";
import { getPortalesStatus, getPortalIncidents, NormalizedIncident, PortalKey, PortalState } from "api/portales";

// ── Helpers ──

const PORTAL_LABELS: Record<PortalKey, { title: string; host: string }> = {
	pjn: { title: "PJN", host: "portal del Poder Judicial de la Nación" },
	scba: { title: "SCBA", host: "notificaciones.scba.gov.ar" },
	mev: { title: "MEV", host: "mev.scba.gov.ar" },
};

function fmtDate(v: string | null | undefined): string {
	if (!v) return "—";
	return new Date(v).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Argentina/Buenos_Aires",
	});
}

function fmtDuration(ms: number | null | undefined, startedAt?: string | null, active?: boolean): string {
	let value = ms;
	if (value == null && active && startedAt) value = Date.now() - new Date(startedAt).getTime();
	if (value == null) return "—";
	const min = Math.round(value / 60000);
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	if (h < 48) return `${h}h ${min % 60}m`;
	return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function statusChip(status: PortalState["status"]) {
	if (status === "healthy") return <Chip label="Operativo" color="success" size="small" />;
	if (status === "down") return <Chip label="Caído" color="error" size="small" />;
	return <Chip label="Desconocido" color="default" size="small" variant="outlined" />;
}

// ── Card de estado por portal ──

function PortalCard({ state }: { state: PortalState }) {
	const meta = PORTAL_LABELS[state.portal];
	const down = state.status === "down";
	const icon = down ? (
		<CloudCross size={28} color="#dc2626" />
	) : state.status === "healthy" ? (
		<Health size={28} color="#059669" />
	) : (
		<Warning2 size={28} color="#9e9e9e" />
	);

	return (
		<MainCard contentSX={{ p: 2.5 }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
				<Stack direction="row" spacing={1.5} alignItems="center">
					{icon}
					<Box>
						<Typography variant="h5">{meta.title}</Typography>
						<Typography variant="caption" color="text.secondary">
							{meta.host}
						</Typography>
					</Box>
				</Stack>
				{statusChip(state.status)}
			</Stack>

			<Stack spacing={0.5}>
				<Row label="Última transición" value={fmtDate(state.lastTransitionAt)} />
				<Row label="Último éxito" value={fmtDate(state.lastSuccessAt)} />
				{down && (
					<>
						<Row label="Caído desde" value={fmtDate(state.activeIncident?.startedAt || state.firstFailureAt)} strong />
						<Row
							label="Duración"
							value={fmtDuration(null, state.activeIncident?.startedAt || state.firstFailureAt, true)}
							strong
						/>
						<Row label="Detectado por" value={state.activeIncident?.detectedBy || "—"} />
						{state.consecutiveFailures > 0 && <Row label="Checks fallidos" value={String(state.consecutiveFailures)} />}
						{state.message && <Row label="Error" value={state.message} />}
					</>
				)}
				{!down && state.lastResolvedIncident && (
					<Row
						label="Última caída"
						value={`${fmtDate(state.lastResolvedIncident.startedAt)} (${fmtDuration(state.lastResolvedIncident.durationMs)})`}
					/>
				)}
			</Stack>
		</MainCard>
	);
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
	return (
		<Stack direction="row" justifyContent="space-between" spacing={2}>
			<Typography variant="body2" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2" fontWeight={strong ? 700 : 400} sx={{ textAlign: "right", wordBreak: "break-word" }}>
				{value}
			</Typography>
		</Stack>
	);
}

// ── Página ──

export default function PortalesStatusPage() {
	const [status, setStatus] = useState<Record<PortalKey, PortalState> | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [tab, setTab] = useState<PortalKey>("scba");
	const [incidents, setIncidents] = useState<NormalizedIncident[]>([]);
	const [incidentsLoading, setIncidentsLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(20);
	const [total, setTotal] = useState(0);

	const loadStatus = useCallback(async () => {
		try {
			setError(null);
			const data = await getPortalesStatus();
			setStatus(data);
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "Error cargando estado de portales");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadIncidents = useCallback(async () => {
		setIncidentsLoading(true);
		try {
			const data = await getPortalIncidents(tab, { page: page + 1, limit });
			setIncidents(data.items);
			setTotal(data.pagination.total);
		} catch {
			setIncidents([]);
			setTotal(0);
		} finally {
			setIncidentsLoading(false);
		}
	}, [tab, page, limit]);

	useEffect(() => {
		loadStatus();
		const interval = setInterval(loadStatus, 60000);
		return () => clearInterval(interval);
	}, [loadStatus]);

	useEffect(() => {
		loadIncidents();
	}, [loadIncidents]);

	const refresh = () => {
		setLoading(true);
		loadStatus();
		loadIncidents();
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<Box>
						<Typography variant="h4">Estado de Portales</Typography>
						<Typography variant="caption" color="text.secondary">
							Salud de los portales judiciales que scrapean los workers (auto-refresh cada 60s)
						</Typography>
					</Box>
					<Tooltip title="Refrescar">
						<IconButton onClick={refresh} disabled={loading}>
							<Refresh />
						</IconButton>
					</Tooltip>
				</Stack>
			</Grid>

			{error && (
				<Grid item xs={12}>
					<Alert severity="error">{error}</Alert>
				</Grid>
			)}

			{loading && !status ? (
				<Grid item xs={12} textAlign="center" py={6}>
					<CircularProgress />
				</Grid>
			) : (
				status &&
				(["pjn", "scba", "mev"] as PortalKey[]).map((p) => (
					<Grid item xs={12} md={4} key={p}>
						<PortalCard state={status[p]} />
					</Grid>
				))
			)}

			<Grid item xs={12}>
				<MainCard
					title="Historial de incidentes"
					secondary={
						<Tabs value={tab} onChange={(_e, v: PortalKey) => { setTab(v); setPage(0); }} sx={{ minHeight: 36 }}>
							<Tab label="PJN" value="pjn" sx={{ minHeight: 36 }} />
							<Tab label="SCBA" value="scba" sx={{ minHeight: 36 }} />
							<Tab label="MEV" value="mev" sx={{ minHeight: 36 }} />
						</Tabs>
					}
				>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Estado</TableCell>
									<TableCell>Inicio</TableCell>
									<TableCell>Fin</TableCell>
									<TableCell>Duración</TableCell>
									<TableCell>Detectado por</TableCell>
									<TableCell>Resuelto por</TableCell>
									<TableCell>Detalle</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{incidentsLoading ? (
									<TableRow>
										<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
											<CircularProgress size={24} />
										</TableCell>
									</TableRow>
								) : incidents.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
											<Typography variant="body2" color="text.secondary">
												Sin incidentes registrados para {PORTAL_LABELS[tab].title}
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									incidents.map((inc) => (
										<TableRow key={inc.id} hover>
											<TableCell>
												{inc.active ? (
													<Chip label="Activo" color="error" size="small" />
												) : (
													<Chip label="Resuelto" color="success" size="small" variant="outlined" />
												)}
											</TableCell>
											<TableCell>{fmtDate(inc.startedAt)}</TableCell>
											<TableCell>{fmtDate(inc.endedAt)}</TableCell>
											<TableCell>{fmtDuration(inc.durationMs, inc.startedAt, inc.active)}</TableCell>
											<TableCell>{inc.detectedBy || "—"}</TableCell>
											<TableCell>{inc.resolvedBy || "—"}</TableCell>
											<TableCell sx={{ maxWidth: 320 }}>
												<Tooltip title={inc.message || ""}>
													<Typography variant="body2" noWrap>
														{inc.extra?.type ? `[${inc.extra.type}] ` : ""}
														{inc.message || "—"}
													</Typography>
												</Tooltip>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
					<TablePagination
						component="div"
						count={total}
						page={page}
						rowsPerPage={limit}
						onPageChange={(_e, p) => setPage(p)}
						onRowsPerPageChange={(e) => {
							setLimit(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Filas:"
					/>
				</MainCard>
			</Grid>
		</Grid>
	);
}
