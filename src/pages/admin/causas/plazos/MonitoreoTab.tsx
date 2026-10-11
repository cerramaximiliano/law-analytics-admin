import { useCallback, useEffect, useState } from "react";
import { Alert, Chip, CircularProgress, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { getMonitor, PlazosMonitor } from "api/plazos";
import WorkerHeartbeatChip from "components/admin/WorkerHeartbeatChip";
import PlazosEtapas from "./PlazosEtapas";

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString("es-AR") : "—");

function WorkerCard({
	nombre,
	servidor,
	alive,
	lastCycleAt,
	enabled,
	children,
}: {
	nombre: string;
	servidor?: string;
	alive: boolean;
	lastCycleAt?: string | null;
	enabled: boolean;
	children: React.ReactNode;
}) {
	return (
		<Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
			<Stack spacing={1}>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Typography variant="subtitle1" sx={{ fontFamily: "monospace" }}>
						{nombre}
					</Typography>
					<WorkerHeartbeatChip alive={alive} lastCycleAt={lastCycleAt} />
					{!enabled && <Chip size="small" label="deshabilitado" color="warning" variant="outlined" />}
					{servidor && <Chip size="small" variant="outlined" label={servidor} sx={{ fontFamily: "monospace", fontSize: "0.65rem" }} />}
				</Stack>
				{children}
			</Stack>
		</Paper>
	);
}

const COLA_LABELS: Record<string, string> = {
	pending: "Pendientes",
	no_url: "Sin URL",
	esperando_documento: "Esperando documento (bandeja)",
	processing: "Procesando",
	parsed: "Sin plazo",
	extracted: "Extraídas s/cómputo",
	ocr_needed: "OCR (legacy)",
	revision_manual: "Revisión manual",
	failed: "Fallidas",
	not_pdf: "No PDF",
	computed: "Computadas",
};

const FUENTE_LABELS: Record<string, string> = {
	"app-update": "app-update (causas públicas)",
	"mis-causas": "Mis Causas (privadas)",
	bandeja: "bandeja del PJN",
};

/** Alcance del cálculo: null = default del worker (solo cuentas de prueba); {} = todas. */
const alcanceLabel = (f: Record<string, unknown> | null | undefined) => {
	if (f === null || f === undefined) return "alcance: solo cuentas de prueba";
	if (!Object.keys(f).length) return "alcance: todas las causas de usuarios";
	return `alcance: ${JSON.stringify(f)}`;
};

/**
 * Monitoreo del subsistema de plazos según la base elegida:
 *  - usuarios (Atlas): plazos-worker-usuarios y plazos-folders-worker (worker_02), alcance del
 *    cálculo, modo de entrega y por dónde entraron las cédulas.
 *  - caché (rs0, laboratorio): plazos-worker, plazos-dataset-worker y los updaters de
 *    update-movimientos.
 */
export default function MonitoreoTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [m, setM] = useState<PlazosMonitor | null>(null);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(async () => {
		try {
			setM(await getMonitor());
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando monitor", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		refetch();
		const id = setInterval(refetch, 15000);
		return () => clearInterval(id);
	}, [refetch]);

	if (loading || !m) return <CircularProgress size={24} />;

	const w = m.workers;
	const esUsuarios = m.base === "usuarios";
	return (
		<Stack spacing={2}>
			{m.alertas.length > 0 ? (
				<Alert severity="warning">
					{m.alertas.map((a, i) => (
						<div key={i}>⚠ {a}</div>
					))}
				</Alert>
			) : (
				<Alert severity="success">Subsistema saludable — sin alertas.</Alert>
			)}

			{esUsuarios && <PlazosEtapas />}

			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
				<Chip size="small" label={`hoy: ${m.hoy.detectadas} detectadas`} />
				<Chip size="small" color="success" variant="outlined" label={`hoy: ${m.hoy.computadas} computadas`} />
				<Chip size="small" color="warning" variant="outlined" label={`revisión manual: ${m.revisionManual}`} />
				{!esUsuarios && <Chip size="small" variant="outlined" label={`dispersos sin revisar: ${m.dispersosSinRevisar}`} />}
			</Stack>

			<Grid container spacing={2}>
				<Grid item xs={12} md={esUsuarios ? 6 : 6}>
					<WorkerCard
						nombre={w.plazosWorker.nombre}
						servidor={w.plazosWorker.servidor}
						alive={w.plazosWorker.alive}
						enabled={w.plazosWorker.enabled}
					>
						{esUsuarios && (
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
								<Chip
									size="small"
									variant="outlined"
									color={w.plazosWorker.filtroUsuarios && !Object.keys(w.plazosWorker.filtroUsuarios).length ? "success" : "warning"}
									label={alcanceLabel(w.plazosWorker.filtroUsuarios)}
								/>
							</Stack>
						)}
						<Typography variant="body2">Último ciclo: {fmt(w.plazosWorker.lastCycleAt)}</Typography>
						<Typography variant="body2">Último resultado: {w.plazosWorker.lastResult || "—"}</Typography>
						{w.plazosWorker.stats && (
							<Typography variant="caption" color="text.secondary">
								procesadas {w.plazosWorker.stats.processed ?? 0} · computadas {w.plazosWorker.stats.computed ?? 0} · fallidas{" "}
								{w.plazosWorker.stats.failed ?? 0}
							</Typography>
						)}
					</WorkerCard>
				</Grid>

				{w.foldersWorker && (
					<Grid item xs={12} md={6}>
						<WorkerCard
							nombre="plazos-folders-worker"
							servidor={w.foldersWorker.servidor}
							alive={w.foldersWorker.alive}
							enabled={w.foldersWorker.enabled}
						>
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
								{w.foldersWorker.dryRun ? (
									<Chip size="small" color="warning" label="DRY RUN · el hub simula, no se entrega nada" />
								) : (
									<Chip size="small" color="success" label="entrega real" />
								)}
								<Chip
									size="small"
									variant="outlined"
									sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}
									label={`usuarios: ${JSON.stringify(w.foldersWorker.userFilter || {})} + plazosAutomaticos.activo`}
								/>
							</Stack>
							<Typography variant="body2">Último ciclo: {fmt(w.foldersWorker.lastCycleAt)}</Typography>
							{w.foldersWorker.stats && (
								<Typography variant="caption" color="text.secondary">
									acumulado: {w.foldersWorker.stats.validadas ?? 0} entregadas · {w.foldersWorker.stats.sinCarpeta ?? 0} sin carpeta ·{" "}
									{w.foldersWorker.stats.rechazadas ?? 0} rechazadas por el hub
								</Typography>
							)}
						</WorkerCard>
					</Grid>
				)}

				{w.datasetWorker && (
					<Grid item xs={12} md={6}>
						<WorkerCard nombre="plazos-dataset-worker" servidor="worker_01" alive={w.datasetWorker.alive} lastCycleAt={w.datasetWorker.lastCycleAt} enabled={w.datasetWorker.enabled}>
							<Typography variant="body2">
								Hoy: {w.datasetWorker.hoy?.count ?? 0} / {w.datasetWorker.dailyLimit ?? "—"} descargas
							</Typography>
							<Typography variant="body2">
								Último ciclo: {fmt(w.datasetWorker.lastCycleAt)} ({w.datasetWorker.lastFuero || "—"})
							</Typography>
							<Typography variant="caption" color="text.secondary">
								cosechados {w.datasetWorker.stats?.harvested ?? 0} · fueros agotados: {w.datasetWorker.fuerosAgotados.length}
							</Typography>
						</WorkerCard>
					</Grid>
				)}
			</Grid>

			<Divider />
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Cola (plazos-notificaciones{esUsuarios ? ", origen usuario" : ""})
					</Typography>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{Object.keys(m.cola).length === 0 && (
							<Typography variant="caption" color="text.secondary">
								Sin cédulas todavía.
							</Typography>
						)}
						{Object.entries(m.cola).map(([k, v]) => (
							<Chip key={k} size="small" variant="outlined" label={`${COLA_LABELS[k] || k}: ${v}`} />
						))}
					</Stack>
				</Grid>
				<Grid item xs={12} md={6}>
					{esUsuarios ? (
						<>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Por dónde entraron las cédulas
							</Typography>
							<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
								{Object.keys(m.porFuente || {}).length === 0 && (
									<Typography variant="caption" color="text.secondary">
										Sin cédulas todavía.
									</Typography>
								)}
								{Object.entries(m.porFuente || {}).map(([k, v]) => (
									<Chip key={k} size="small" variant="outlined" label={`${FUENTE_LABELS[k] || k}: ${v}`} />
								))}
							</Stack>
						</>
					) : (
						<>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Updaters de la caché (update-movimientos, por fuero)
							</Typography>
							<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
								{m.updaters.map((u) => (
									<Chip
										key={u.fuero}
										size="small"
										color={u.enabled ? "success" : "default"}
										variant="outlined"
										label={`${u.fuero}${u.enabled ? "" : " (off)"}${u.processedToday != null ? ` · hoy: ${u.processedToday}` : ""}`}
									/>
								))}
							</Stack>
						</>
					)}
				</Grid>
			</Grid>
			<Typography variant="caption" color="text.secondary">
				Actualizado: {fmt(m.generatedAt)} — auto-refresh cada 15s.
			</Typography>
		</Stack>
	);
}
