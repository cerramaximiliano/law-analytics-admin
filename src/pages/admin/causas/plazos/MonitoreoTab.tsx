import { useCallback, useEffect, useState } from "react";
import { Alert, Chip, CircularProgress, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { getMonitor, PlazosMonitor } from "api/plazos";

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString("es-AR") : "—");

function WorkerCard({
	nombre,
	alive,
	enabled,
	children,
}: {
	nombre: string;
	alive: boolean;
	enabled: boolean;
	children: React.ReactNode;
}) {
	return (
		<Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
			<Stack spacing={1}>
				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="subtitle1" sx={{ fontFamily: "monospace" }}>
						{nombre}
					</Typography>
					<Chip size="small" label={alive ? "VIVO" : "SIN HEARTBEAT"} color={alive ? "success" : "error"} />
					{!enabled && <Chip size="small" label="deshabilitado" color="warning" variant="outlined" />}
				</Stack>
				{children}
			</Stack>
		</Paper>
	);
}

const COLA_LABELS: Record<string, string> = {
	pending: "Pendientes",
	no_url: "Sin URL",
	processing: "Procesando",
	parsed: "Sin plazo",
	extracted: "Extraídas s/cómputo",
	ocr_needed: "OCR (legacy)",
	revision_manual: "Revisión manual",
	failed: "Fallidas",
	not_pdf: "No PDF",
	computed: "Computadas",
};

/**
 * Monitoreo consolidado del subsistema de plazos: salud de los 3 workers,
 * colas, throughput del día, updaters por fuero y alertas.
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

			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
				<Chip size="small" label={`hoy: ${m.hoy.detectadas} detectadas`} />
				<Chip size="small" color="success" variant="outlined" label={`hoy: ${m.hoy.computadas} computadas`} />
				<Chip size="small" color="warning" variant="outlined" label={`revisión manual: ${m.revisionManual}`} />
				<Chip size="small" variant="outlined" label={`dispersos sin revisar: ${m.dispersosSinRevisar}`} />
			</Stack>

			<Grid container spacing={2}>
				<Grid item xs={12} md={4}>
					<WorkerCard nombre="plazos-worker" alive={w.plazosWorker.alive} enabled={w.plazosWorker.enabled}>
						<Typography variant="body2">Último ciclo: {fmt(w.plazosWorker.lastCycleAt)}</Typography>
						<Typography variant="body2">Último resultado: {w.plazosWorker.lastResult || "—"}</Typography>
						{w.plazosWorker.stats && (
							<Typography variant="caption" color="text.secondary">
								procesadas {w.plazosWorker.stats.processed} · computadas {w.plazosWorker.stats.computed} · fallidas{" "}
								{w.plazosWorker.stats.failed}
							</Typography>
						)}
					</WorkerCard>
				</Grid>
				<Grid item xs={12} md={4}>
					<WorkerCard nombre="plazos-dataset-worker" alive={w.datasetWorker.alive} enabled={w.datasetWorker.enabled}>
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
				<Grid item xs={12} md={4}>
					<WorkerCard nombre="plazos-folders-worker" alive={w.foldersWorker.alive} enabled={w.foldersWorker.enabled}>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							<Chip size="small" variant="outlined" label={`source: ${w.foldersWorker.source}`} />
							{w.foldersWorker.dryRun && <Chip size="small" color="warning" label="DRY RUN" />}
							<Chip size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.65rem" }} label={JSON.stringify(w.foldersWorker.userFilter)} />
						</Stack>
						<Typography variant="body2">Último ciclo: {fmt(w.foldersWorker.lastCycleAt)}</Typography>
						{w.foldersWorker.lastRun && (
							<Typography variant="caption" color="text.secondary">
								última corrida: {w.foldersWorker.lastRun.plazosLeidos} leídos · {w.foldersWorker.lastRun.validadas} validados ·{" "}
								{w.foldersWorker.lastRun.creadas} notificaciones creadas
							</Typography>
						)}
						{w.foldersWorker.stats && (
							<Typography variant="caption" color="text.secondary">
								acumulado: {w.foldersWorker.stats.validadas} validadas · {w.foldersWorker.stats.notificacionesCreadas} pobladas
							</Typography>
						)}
					</WorkerCard>
				</Grid>
			</Grid>

			<Divider />
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Cola (plazos-notificaciones)
					</Typography>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{Object.entries(m.cola).map(([k, v]) => (
							<Chip key={k} size="small" variant="outlined" label={`${COLA_LABELS[k] || k}: ${v}`} />
						))}
					</Stack>
				</Grid>
				<Grid item xs={12} md={6}>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						Updaters (detección en tiempo real por fuero)
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
				</Grid>
			</Grid>
			<Typography variant="caption" color="text.secondary">
				Actualizado: {fmt(m.generatedAt)} — auto-refresh cada 15s.
			</Typography>
		</Stack>
	);
}
