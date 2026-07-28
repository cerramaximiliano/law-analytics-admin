import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	Grid,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import MainCard from "components/MainCard";
import { useSnackbar } from "notistack";
import PlazosWorkerConfigService, { PlazosWorkerFullDoc, PlazosWorkerSettings, PlazosWorkerStatus } from "api/plazosWorkerConfig";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

const fmtDate = (v: string | null | undefined) => (v ? new Date(v).toLocaleString("es-AR") : "—");

// ── Tab Configuración ──────────────────────────────────────────────────────────

function ConfigTab({ doc, loading, onSaved }: { doc: PlazosWorkerFullDoc | null; loading: boolean; onSaved: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [form, setForm] = useState<PlazosWorkerSettings | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (doc) {
			setForm({
				enabled: doc.enabled,
				cronPattern: doc.cronPattern,
				lockTimeoutMinutes: doc.lockTimeoutMinutes,
				maxRetries: doc.maxRetries,
				downloadTimeoutMs: doc.downloadTimeoutMs,
				scanCharsPerPageThreshold: doc.scanCharsPerPageThreshold,
			});
		}
	}, [doc]);

	if (loading || !form) return <CircularProgress size={24} />;

	const save = async () => {
		try {
			setSaving(true);
			await PlazosWorkerConfigService.updateSettings(form);
			enqueueSnackbar("Configuración guardada — el worker la aplica en el próximo ciclo", { variant: "success" });
			onSaved();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error guardando", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const num = (k: keyof PlazosWorkerSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setForm({ ...form, [k]: Number(e.target.value) });

	return (
		<Stack spacing={2.5} sx={{ maxWidth: 640 }}>
			<Stack direction="row" alignItems="center" spacing={1}>
				<Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
				<Typography>Worker habilitado</Typography>
			</Stack>
			<TextField
				label="Cron pattern"
				size="small"
				value={form.cronPattern}
				onChange={(e) => setForm({ ...form, cronPattern: e.target.value })}
				helperText="Se re-agenda en caliente (sin restart PM2)"
			/>
			<Grid container spacing={2}>
				<Grid item xs={6} md={3}>
					<TextField label="Lock (min)" size="small" type="number" value={form.lockTimeoutMinutes} onChange={num("lockTimeoutMinutes")} fullWidth />
				</Grid>
				<Grid item xs={6} md={3}>
					<TextField label="Reintentos" size="small" type="number" value={form.maxRetries} onChange={num("maxRetries")} fullWidth />
				</Grid>
				<Grid item xs={6} md={3}>
					<TextField label="Timeout descarga (ms)" size="small" type="number" value={form.downloadTimeoutMs} onChange={num("downloadTimeoutMs")} fullWidth />
				</Grid>
				<Grid item xs={6} md={3}>
					<TextField
						label="Umbral OCR (chars/pág)"
						size="small"
						type="number"
						value={form.scanCharsPerPageThreshold}
						onChange={num("scanCharsPerPageThreshold")}
						fullWidth
					/>
				</Grid>
			</Grid>
			<Box>
				<Button variant="contained" onClick={save} disabled={saving}>
					{saving ? "Guardando…" : "Guardar"}
				</Button>
			</Box>
		</Stack>
	);
}

// ── Tab Estado ─────────────────────────────────────────────────────────────────

const COLA_LABELS: Record<string, string> = {
	pending: "Pendientes",
	no_url: "Sin URL",
	processing: "Procesando",
	parsed: "Sin plazo (parsed)",
	extracted: "Extraídas s/cómputo",
	ocr_needed: "Necesitan OCR",
	failed: "Fallidas",
	not_pdf: "No PDF",
	computed: "Computadas",
};

function StatusTab({ status, loading, onRefresh }: { status: PlazosWorkerStatus | null; loading: boolean; onRefresh: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	if (loading || !status) return <CircularProgress size={24} />;

	const resetStats = async () => {
		try {
			await PlazosWorkerConfigService.resetStats();
			enqueueSnackbar("Contadores reseteados", { variant: "success" });
			onRefresh();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	const hb = status.heartbeat;
	return (
		<Stack spacing={2.5}>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Chip label={status.alive ? "VIVO" : "SIN HEARTBEAT"} color={status.alive ? "success" : "error"} size="small" />
				<Chip label={status.enabled ? "habilitado" : "deshabilitado"} color={status.enabled ? "primary" : "warning"} size="small" variant="outlined" />
				<Chip label={`cron ${status.cronPattern}`} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
			</Stack>

			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Typography variant="subtitle1" sx={{ mb: 1 }}>
						Heartbeat
					</Typography>
					<Stack spacing={0.5}>
						<Typography variant="body2">Worker: <b>{hb.workerId || "—"}</b></Typography>
						<Typography variant="body2">Arranque: {fmtDate(hb.startedAt)}</Typography>
						<Typography variant="body2">Último ciclo: {fmtDate(hb.lastCycleAt)}</Typography>
						<Typography variant="body2">Último procesado: {fmtDate(hb.lastProcessedAt)}</Typography>
						<Typography variant="body2">
							Último resultado: <Chip label={hb.lastResult || "—"} size="small" variant="outlined" />
						</Typography>
					</Stack>
				</Grid>
				<Grid item xs={12} md={6}>
					<Typography variant="subtitle1" sx={{ mb: 1 }}>
						Cola (plazos-notificaciones)
					</Typography>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{Object.entries(status.cola).map(([k, v]) => (
							<Chip key={k} label={`${COLA_LABELS[k] || k}: ${v}`} size="small" variant="outlined" />
						))}
					</Stack>
				</Grid>
			</Grid>

			<Divider />
			<Box>
				<Typography variant="subtitle1" sx={{ mb: 1 }}>
					Acumulado del worker
				</Typography>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
					<Chip label={`procesadas: ${status.stats.processed}`} size="small" />
					<Chip label={`computadas: ${status.stats.computed}`} size="small" color="success" variant="outlined" />
					<Chip label={`sin plazo: ${status.stats.parsed}`} size="small" variant="outlined" />
					<Chip label={`extraídas s/cómputo: ${status.stats.extracted}`} size="small" variant="outlined" />
					<Chip label={`OCR: ${status.stats.ocrNeeded}`} size="small" variant="outlined" />
					<Chip label={`no PDF: ${status.stats.notPdf}`} size="small" variant="outlined" />
					<Chip label={`fallidas: ${status.stats.failed}`} size="small" color="error" variant="outlined" />
					<Button size="small" onClick={resetStats}>
						Resetear contadores
					</Button>
				</Stack>
			</Box>
		</Stack>
	);
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function PlazosWorkerPage() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [tab, setTab] = useState(0);
	const [doc, setDoc] = useState<PlazosWorkerFullDoc | null>(null);
	const [status, setStatus] = useState<PlazosWorkerStatus | null>(null);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(async () => {
		try {
			setLoading(true);
			const [full, st] = await Promise.all([PlazosWorkerConfigService.getFull(), PlazosWorkerConfigService.getStatus()]);
			setDoc(full);
			setStatus(st);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando configuración", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	useEffect(() => {
		if (tab !== 1) return;
		const id = setInterval(refetch, 15000);
		return () => clearInterval(id);
	}, [tab, refetch]);

	const isDark = theme.palette.mode === "dark";

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ pb: 1 }}>
					<Box sx={{ maxWidth: 720 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Worker Plazos Procesales
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Lee las cédulas detectadas en movimientos nuevos, extrae el plazo expreso del documento (o aplica normativa subsidiaria por
							fuero/objeto) y computa el vencimiento sobre el calendario de días hábiles.
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
						<Chip label="PM2 · plazos-worker" size="small" color="secondary" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.72rem" }} />
						<Chip
							label="plazos-notificaciones · local"
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: BRAND_BLUE, borderColor: alpha(BRAND_BLUE, 0.4) }}
						/>
					</Stack>
				</Stack>

				<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}` }}>
					<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } }}>
						<Tab label="Configuración" />
						<Tab label="Estado" />
					</Tabs>
				</Box>

				{tab === 0 && <ConfigTab doc={doc} loading={loading} onSaved={refetch} />}
				{tab === 1 && <StatusTab status={status} loading={loading} onRefresh={refetch} />}
			</Stack>
		</MainCard>
	);
}
