import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	Grid,
	LinearProgress,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import MainCard from "components/MainCard";
import { useSnackbar } from "notistack";
import { getDatasetConfig, updateDatasetConfig, getDatasetStats, DatasetConfig, DatasetStats } from "api/plazos";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString("es-AR") : "—");

/**
 * Configuración del generador del dataset de plazos (plazos-dataset-worker):
 * el harvester que recorre las colecciones COMPLETAS de causas de todos los
 * fueros descargando cédulas históricas para extraer plazos expresos.
 * Config en caliente — el worker la relee en cada ciclo.
 */
export default function PlazosDatasetWorkerPage() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [cfg, setCfg] = useState<DatasetConfig | null>(null);
	const [stats, setStats] = useState<DatasetStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<any>(null);

	const refetch = useCallback(async () => {
		try {
			setLoading(true);
			const [c, s] = await Promise.all([getDatasetConfig(), getDatasetStats()]);
			setCfg(c);
			setStats(s);
			if (c) {
				setForm({
					enabled: c.enabled !== false,
					cronPattern: c.cronPattern || "*/2 * * * *",
					batchSize: c.batchSize ?? 4,
					maxPerCausa: c.maxPerCausa ?? 3,
					dailyLimit: c.dailyLimit ?? 300,
					requestDelayMs: c.requestDelayMs ?? 2500,
					fuerosStr: (c.fueros || []).join(","),
				});
			}
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando configuración", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		refetch();
		const id = setInterval(refetch, 20000);
		return () => clearInterval(id);
	}, [refetch]);

	const save = async () => {
		if (!form) return;
		try {
			setSaving(true);
			const fueros = form.fuerosStr
				.split(",")
				.map((x: string) => x.trim().toUpperCase())
				.filter(Boolean);
			await updateDatasetConfig({
				enabled: form.enabled,
				cronPattern: form.cronPattern,
				batchSize: Number(form.batchSize),
				maxPerCausa: Number(form.maxPerCausa),
				dailyLimit: Number(form.dailyLimit),
				requestDelayMs: Number(form.requestDelayMs),
				fueros: fueros.length ? fueros : null, // null = todos los fueros
			});
			enqueueSnackbar("Configuración guardada — el worker la aplica en el próximo ciclo", { variant: "success" });
			refetch();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error guardando", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const resetCursor = async (fuero: string) => {
		try {
			await updateDatasetConfig({ resetCursor: fuero });
			enqueueSnackbar(fuero === "*" ? "Todos los cursores reseteados — re-escaneo completo" : `Cursor de ${fuero} reseteado`, {
				variant: "success",
			});
			refetch();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	const isDark = theme.palette.mode === "dark";
	const num = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

	const dailyPct = cfg?.daily && cfg.dailyLimit ? Math.min(100, Math.round(((cfg.daily.count || 0) / cfg.dailyLimit) * 100)) : 0;
	const cursores = Object.entries(cfg?.cursor || {});

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ pb: 1 }}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Generador del Dataset de Plazos
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Harvester histórico: recorre las colecciones completas de causas de todos los fueros (round-robin con cursor),
							descarga cédulas y extrae plazos expresos con su norma citada. Alimenta los candidatos a regla de la vista
							Plazos procesales → Dataset.
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
						<Box
							component="span"
							sx={{
								display: "inline-flex",
								alignItems: "center",
								px: 1,
								py: 0.25,
								borderRadius: 1,
								bgcolor: theme.palette.grey[800],
								color: theme.palette.common.white,
								fontSize: "0.65rem",
								fontWeight: 500,
								fontFamily: "monospace",
							}}
						>
							worker_01
						</Box>
						<Chip label="PM2 · plazos-dataset-worker" size="small" color="secondary" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.72rem" }} />
						<Chip
							label="plazos-dataset · local"
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: BRAND_BLUE, borderColor: alpha(BRAND_BLUE, 0.4) }}
						/>
					</Stack>
				</Stack>

				<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}` }} />

				{loading && !form ? (
					<CircularProgress size={24} />
				) : (
					<Grid container spacing={3}>
						{/* ── Configuración ── */}
						<Grid item xs={12} md={5}>
							<Stack spacing={2}>
								<Typography variant="subtitle1">Configuración (hot-reload)</Typography>
								<Stack direction="row" alignItems="center" spacing={1}>
									<Switch checked={form?.enabled ?? true} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
									<Typography>Harvester habilitado</Typography>
								</Stack>
								<TextField size="small" label="Cron pattern" value={form?.cronPattern || ""} onChange={num("cronPattern")} />
								<Grid container spacing={1.5}>
									<Grid item xs={6}>
										<TextField size="small" fullWidth type="number" label="Límite diario (descargas)" value={form?.dailyLimit ?? ""} onChange={num("dailyLimit")} />
									</Grid>
									<Grid item xs={6}>
										<TextField size="small" fullWidth type="number" label="Delay entre descargas (ms)" value={form?.requestDelayMs ?? ""} onChange={num("requestDelayMs")} />
									</Grid>
									<Grid item xs={6}>
										<TextField size="small" fullWidth type="number" label="Causas por ciclo" value={form?.batchSize ?? ""} onChange={num("batchSize")} />
									</Grid>
									<Grid item xs={6}>
										<TextField size="small" fullWidth type="number" label="Cédulas por causa" value={form?.maxPerCausa ?? ""} onChange={num("maxPerCausa")} />
									</Grid>
								</Grid>
								<TextField
									size="small"
									label="Fueros (coma; vacío = TODOS los de pjn-models)"
									value={form?.fuerosStr ?? ""}
									onChange={num("fuerosStr")}
									helperText="Ej: CIV,CSS,CNT,COM — dejar vacío para recorrer los ~28 fueros"
								/>
								<Box>
									<Button variant="contained" onClick={save} disabled={saving}>
										{saving ? "Guardando…" : "Guardar"}
									</Button>
								</Box>
							</Stack>
						</Grid>

						{/* ── Estado ── */}
						<Grid item xs={12} md={7}>
							<Stack spacing={2}>
								<Typography variant="subtitle1">Estado</Typography>
								<Box>
									<Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
										<Typography variant="body2">
											Descargas hoy: <b>{cfg?.daily?.count ?? 0}</b> / {cfg?.dailyLimit ?? "—"}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											último ciclo: {fmtDate(cfg?.heartbeat?.lastCycleAt)} ({cfg?.heartbeat?.lastFuero || "—"})
										</Typography>
									</Stack>
									<LinearProgress variant="determinate" value={dailyPct} sx={{ height: 8, borderRadius: 1 }} />
								</Box>

								{stats && (
									<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
										<Chip size="small" label={`${stats.total} ejemplos`} />
										<Chip size="small" color="success" variant="outlined" label={`${stats.conPlazo} con plazo`} />
										<Chip size="small" variant="outlined" label={`${stats.sinPlazo} sin plazo`} />
										{typeof stats.descartados === "number" && <Chip size="small" variant="outlined" label={`${stats.descartados} descartados`} />}
										{cfg?.stats && <Chip size="small" variant="outlined" label={`OCR-skip: ${cfg.stats.skippedOcr} · err: ${cfg.stats.errors}`} />}
									</Stack>
								)}

								<Divider />
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="subtitle2">Cursores por fuero</Typography>
									<Button size="small" color="warning" onClick={() => resetCursor("*")}>
										Resetear todos (re-escaneo completo)
									</Button>
								</Stack>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									{cursores.length === 0 && (
										<Typography variant="caption" color="text.secondary">
											Sin cursores todavía — el worker los crea al recorrer cada fuero.
										</Typography>
									)}
									{cursores.map(([fuero, val]) => (
										<Tooltip key={fuero} title={val === "DONE" ? "Fuero agotado — click para re-escanear" : `cursor: ${val || "inicio"} — click para reiniciar`}>
											<Chip
												size="small"
												label={`${fuero}${val === "DONE" ? " ✓" : ""}`}
												color={val === "DONE" ? "success" : "default"}
												variant="outlined"
												onClick={() => resetCursor(fuero)}
											/>
										</Tooltip>
									))}
								</Stack>
								<Typography variant="caption" color="text.secondary">
									Con ~45% de cédulas con plazo expreso: a 1.000 descargas/día ≈ 450 positivos/día → los segmentos principales
									llegan a n≥30 en menos de una semana.
								</Typography>
							</Stack>
						</Grid>
					</Grid>
				)}
			</Stack>
		</MainCard>
	);
}
