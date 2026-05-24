import { useEffect, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Chip,
	Divider,
	FormControlLabel,
	Grid,
	Skeleton,
	Stack,
	Switch,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ArrowDown2, Refresh2, Setting2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import LiquidacionWorkerConfigService, { FullDoc, LiquidacionConfig, UpdateSettingsPayload } from "api/liquidacionWorkerConfig";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

interface Props {
	doc: FullDoc | null;
	loading: boolean;
	onSaved: () => void;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const DEFAULT_CATEGORIES = [
	"ACOMPANA",
	"PRACTICA",
	"ADJUNTA",
	"ACREDITA",
	"ACREDITA_PRACTICA",
	"AMPLIATORIA",
	"IMPUGNA",
	"CONTESTA_TRASLADO",
	"LIQUIDACION_PURA",
	"MODIFICA",
	"HABER_DIRECTO",
	"PERITO_O_HISTORICO",
];

export default function ConfigTab({ doc, loading, onSaved }: Props) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [saving, setSaving] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [form, setForm] = useState<LiquidacionConfig | null>(null);

	useEffect(() => {
		if (doc?.config) setForm(JSON.parse(JSON.stringify(doc.config))); // clone for local edit
	}, [doc]);

	if (loading && !form) {
		return (
			<Stack spacing={2}>
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rounded" height={80} />
				))}
			</Stack>
		);
	}

	if (!form) return <Alert severity="warning">No se pudo cargar la configuración.</Alert>;

	const update = (path: string, value: unknown) => {
		setForm((prev) => {
			if (!prev) return prev;
			const clone: any = JSON.parse(JSON.stringify(prev));
			const parts = path.split(".");
			let cur = clone;
			for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
			cur[parts[parts.length - 1]] = value;
			return clone;
		});
	};

	const toggleCategory = (cat: string) => {
		const list = form.urlExtractor.categoriesAllowed || [];
		const next = list.includes(cat) ? list.filter((c) => c !== cat) : [...list, cat];
		update("urlExtractor.categoriesAllowed", next);
	};

	const toggleWorkDay = (day: number) => {
		const list = form.manager.workDays || [];
		const next = list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort((a, b) => a - b);
		update("manager.workDays", next);
	};

	const handleSave = async () => {
		if (!form) return;
		setSaving(true);
		try {
			const payload: UpdateSettingsPayload = {
				enabled: form.enabled,
				manager: form.manager,
				urlExtractor: form.urlExtractor,
				pdfProcessor: form.pdfProcessor,
				alerts: form.alerts,
			};
			await LiquidacionWorkerConfigService.updateSettings(payload);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
			onSaved();
		} catch (err: any) {
			const errors = err?.response?.data?.errors;
			if (Array.isArray(errors) && errors.length > 0) {
				enqueueSnackbar(`Validación: ${errors.join(" · ")}`, { variant: "error" });
			} else {
				enqueueSnackbar(err?.response?.data?.message || "Error guardando configuración", { variant: "error" });
			}
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		if (!window.confirm("Resetear toda la configuración a defaults? Se conservan el estado actual y las alertas.")) return;
		setResetting(true);
		try {
			await LiquidacionWorkerConfigService.resetToDefaults();
			enqueueSnackbar("Configuración reseteada a defaults", { variant: "success" });
			onSaved();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error en reset", { variant: "error" });
		} finally {
			setResetting(false);
		}
	};

	const numField = (label: string, value: number, onChange: (n: number) => void, helper?: string, min?: number, max?: number) => (
		<TextField
			label={label}
			type="number"
			value={value}
			onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
			helperText={helper}
			InputProps={{ inputProps: { min, max } }}
			fullWidth
			size="small"
		/>
	);

	return (
		<Stack spacing={2}>
			{/* Toggle global */}
			<Alert severity={form.enabled ? "success" : "warning"} icon={<Setting2 size={20} />}>
				<Stack direction="row" alignItems="center" spacing={2}>
					<Typography variant="body2">
						<strong>Sistema {form.enabled ? "habilitado" : "deshabilitado"}.</strong> Toggle global afecta a los 3 procesos.
					</Typography>
					<Switch checked={form.enabled} onChange={(e) => update("enabled", e.target.checked)} />
				</Stack>
			</Alert>

			{/* === Manager === */}
			<Accordion
				defaultExpanded
				elevation={0}
				sx={{
					border: `1px solid ${headerBorder(isDark)}`,
					borderRadius: 1.5,
					"&:before": { display: "none" },
					"&.Mui-expanded": { margin: 0 },
				}}
			>
				<AccordionSummary expandIcon={<ArrowDown2 size={16} />} sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6">Manager</Typography>
						<Chip label="pjn-liq-manager" size="small" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
					</Stack>
				</AccordionSummary>
				<AccordionDetails>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={3}>
							{numField(
								"Config poll interval (ms)",
								form.manager.configPollIntervalMs,
								(n) => update("manager.configPollIntervalMs", n),
								"Cada cuánto los 3 procesos refrescan esta config",
								1000,
							)}
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							{numField(
								"Heartbeat interval (ms)",
								form.manager.heartbeatIntervalMs,
								(n) => update("manager.heartbeatIntervalMs", n),
								"Cada cuánto reportan lastHeartbeatAt",
								1000,
							)}
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<TextField
								label="Hora inicio (0-23)"
								type="number"
								value={form.manager.workStartHour ?? ""}
								onChange={(e) => update("manager.workStartHour", e.target.value === "" ? null : parseInt(e.target.value, 10))}
								helperText="Vacío = sin restricción horaria"
								InputProps={{ inputProps: { min: 0, max: 23 } }}
								fullWidth
								size="small"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<TextField
								label="Hora fin (0-23)"
								type="number"
								value={form.manager.workEndHour ?? ""}
								onChange={(e) => update("manager.workEndHour", e.target.value === "" ? null : parseInt(e.target.value, 10))}
								helperText="Vacío = sin restricción horaria"
								InputProps={{ inputProps: { min: 0, max: 23 } }}
								fullWidth
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<Typography variant="caption" color="text.secondary">
								Días activos (vacío = todos los días)
							</Typography>
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
								{DAY_LABELS.map((label, idx) => {
									const active = (form.manager.workDays || []).includes(idx);
									return (
										<Chip
											key={idx}
											label={label}
											size="small"
											color={active ? "primary" : "default"}
											variant={active ? "filled" : "outlined"}
											onClick={() => toggleWorkDay(idx)}
											sx={{ cursor: "pointer", minWidth: 48 }}
										/>
									);
								})}
							</Stack>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
								Si hay días seleccionados, el manager NO despacha jobs fuera de esos días.
							</Typography>
						</Grid>
					</Grid>
				</AccordionDetails>
			</Accordion>

			{/* === URL Extractor === */}
			<Accordion
				defaultExpanded
				elevation={0}
				sx={{
					border: `1px solid ${headerBorder(isDark)}`,
					borderRadius: 1.5,
					"&:before": { display: "none" },
					"&.Mui-expanded": { margin: 0 },
				}}
			>
				<AccordionSummary expandIcon={<ArrowDown2 size={16} />} sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6">URL Extractor</Typography>
						<Chip label="pjn-liq-url-extractor" size="small" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
						<Chip
							label={form.urlExtractor.enabled ? "ON" : "OFF"}
							color={form.urlExtractor.enabled ? "success" : "default"}
							size="small"
						/>
					</Stack>
				</AccordionSummary>
				<AccordionDetails>
					<Stack spacing={2}>
						<FormControlLabel
							control={
								<Switch
									checked={form.urlExtractor.enabled}
									onChange={(e) => update("urlExtractor.enabled", e.target.checked)}
								/>
							}
							label="Habilitar extractor"
						/>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<TextField
									label="Cron expression"
									value={form.urlExtractor.cronExpression}
									onChange={(e) => update("urlExtractor.cronExpression", e.target.value)}
									helperText="Ej: '0 */6 * * *' = cada 6h. TZ Argentina"
									fullWidth
									size="small"
									InputProps={{ sx: { fontFamily: "monospace" } }}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<FormControlLabel
									control={
										<Switch
											checked={form.urlExtractor.reenqueuePending}
											onChange={(e) => update("urlExtractor.reenqueuePending", e.target.checked)}
										/>
									}
									label="Re-encolar TODOS los pdfStatus:pending en cada corrida (backfill)"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Batch size (enqueue)",
									form.urlExtractor.enqueueBatchSize,
									(n) => update("urlExtractor.enqueueBatchSize", n),
									"Lote de N jobs por pausa (anti-spike Redis)",
									1,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Batch delay (ms)",
									form.urlExtractor.enqueueBatchDelayMs,
									(n) => update("urlExtractor.enqueueBatchDelayMs", n),
									"Pausa entre lotes durante el backfill",
									0,
								)}
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									label="Carátula pattern (regex)"
									value={form.urlExtractor.caratulaPattern}
									onChange={(e) => update("urlExtractor.caratulaPattern", e.target.value)}
									helperText="Regex contra causa.caratula (case-insensitive)"
									fullWidth
									size="small"
									InputProps={{ sx: { fontFamily: "monospace" } }}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									label="Mov.detalle pattern (regex)"
									value={form.urlExtractor.movDetallePattern}
									onChange={(e) => update("urlExtractor.movDetallePattern", e.target.value)}
									helperText="Regex contra movimiento.detalle"
									fullWidth
									size="small"
									InputProps={{ sx: { fontFamily: "monospace" } }}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									label="Fueros"
									value={(form.urlExtractor.fueros || []).join(",")}
									onChange={(e) =>
										update(
											"urlExtractor.fueros",
											e.target.value
												.split(",")
												.map((s) => s.trim())
												.filter(Boolean),
										)
									}
									helperText="Códigos separados por coma (CSS, CIV, CNT...)"
									fullWidth
									size="small"
									InputProps={{ sx: { fontFamily: "monospace" } }}
								/>
							</Grid>
						</Grid>

						<Divider />
						<Typography variant="subtitle2">Categorías de detalle que se guardan</Typography>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
							{DEFAULT_CATEGORIES.map((cat) => {
								const active = (form.urlExtractor.categoriesAllowed || []).includes(cat);
								return (
									<Chip
										key={cat}
										label={cat}
										size="small"
										color={active ? "primary" : "default"}
										variant={active ? "filled" : "outlined"}
										onClick={() => toggleCategory(cat)}
										sx={{ fontFamily: "monospace", fontSize: "0.7rem", cursor: "pointer" }}
									/>
								);
							})}
						</Stack>
					</Stack>
				</AccordionDetails>
			</Accordion>

			{/* === PDF Processor === */}
			<Accordion
				defaultExpanded
				elevation={0}
				sx={{
					border: `1px solid ${headerBorder(isDark)}`,
					borderRadius: 1.5,
					"&:before": { display: "none" },
					"&.Mui-expanded": { margin: 0 },
				}}
			>
				<AccordionSummary expandIcon={<ArrowDown2 size={16} />} sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6">PDF Processor</Typography>
						<Chip label="pjn-liq-pdf-processor" size="small" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
						<Chip
							label={form.pdfProcessor.enabled ? "ON" : "OFF"}
							color={form.pdfProcessor.enabled ? "success" : "default"}
							size="small"
						/>
					</Stack>
				</AccordionSummary>
				<AccordionDetails>
					<Stack spacing={2}>
						<FormControlLabel
							control={
								<Switch
									checked={form.pdfProcessor.enabled}
									onChange={(e) => update("pdfProcessor.enabled", e.target.checked)}
								/>
							}
							label="Habilitar processor"
						/>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Concurrency",
									form.pdfProcessor.concurrency,
									(n) => update("pdfProcessor.concurrency", n),
									"Jobs PDF en paralelo (1-20)",
									1,
									20,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Download timeout (ms)",
									form.pdfProcessor.downloadTimeoutMs,
									(n) => update("pdfProcessor.downloadTimeoutMs", n),
									"Timeout axios para descargar PDF",
									5000,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Max bytes",
									form.pdfProcessor.maxBytes,
									(n) => update("pdfProcessor.maxBytes", n),
									"Cap de tamaño PDF (bytes)",
									1024,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"OCR threshold (chars/page)",
									form.pdfProcessor.ocrCharsPerPageThreshold,
									(n) => update("pdfProcessor.ocrCharsPerPageThreshold", n),
									"<N chars/page → pdfStatus: ocr_needed",
									0,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Retry attempts",
									form.pdfProcessor.retryAttempts,
									(n) => update("pdfProcessor.retryAttempts", n),
									"Intentos por job antes de marcar failed",
									1,
									10,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Backoff delay (ms)",
									form.pdfProcessor.backoffDelayMs,
									(n) => update("pdfProcessor.backoffDelayMs", n),
									"Delay exponencial base entre reintentos",
									1000,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Request delay (ms)",
									form.pdfProcessor.requestDelayMs,
									(n) => update("pdfProcessor.requestDelayMs", n),
									"Pausa post-job (por worker). 500ms × 4 concurrency ≈ 4 req/s",
									0,
									60000,
								)}
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								{numField(
									"Daily limit",
									form.pdfProcessor.dailyLimit,
									(n) => update("pdfProcessor.dailyLimit", n),
									"Tope de PDFs/día (0 = sin límite). Rollover automático a medianoche.",
									0,
								)}
							</Grid>
						</Grid>
						<Alert severity="info" variant="outlined" sx={{ fontSize: "0.8rem" }}>
							<strong>Tasa efectiva contra PJN:</strong>{" "}
							<code>concurrency × (1000 / (downloadAvg + requestDelayMs))</code>. Con concurrency={form.pdfProcessor.concurrency} y requestDelayMs=
							{form.pdfProcessor.requestDelayMs}ms (asumiendo ~500ms download), tasa ≈{" "}
							<strong>
								{((form.pdfProcessor.concurrency * 1000) / (500 + form.pdfProcessor.requestDelayMs)).toFixed(1)} req/s
							</strong>
							.
						</Alert>
					</Stack>
				</AccordionDetails>
			</Accordion>

			{/* === Alertas === */}
			<Accordion
				elevation={0}
				sx={{
					border: `1px solid ${headerBorder(isDark)}`,
					borderRadius: 1.5,
					"&:before": { display: "none" },
					"&.Mui-expanded": { margin: 0 },
				}}
			>
				<AccordionSummary expandIcon={<ArrowDown2 size={16} />} sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) }}>
					<Typography variant="h6">Umbrales de alertas</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							{numField(
								"Queue backlog threshold",
								form.alerts.queueBacklogThreshold,
								(n) => update("alerts.queueBacklogThreshold", n),
								"Si liq-process.waiting supera este número → alerta",
								0,
							)}
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								label="Failed ratio threshold (0-1)"
								type="number"
								value={form.alerts.failedRatioThreshold}
								onChange={(e) => update("alerts.failedRatioThreshold", parseFloat(e.target.value) || 0)}
								helperText="0.20 = 20% de docs en failed → alerta"
								InputProps={{ inputProps: { min: 0, max: 1, step: 0.01 } }}
								fullWidth
								size="small"
							/>
						</Grid>
					</Grid>
				</AccordionDetails>
			</Accordion>

			<Stack direction="row" spacing={2} justifyContent="flex-end">
				<Button
					variant="outlined"
					color="warning"
					onClick={handleReset}
					disabled={resetting || saving}
					startIcon={<Refresh2 size={16} />}
				>
					{resetting ? "Reseteando…" : "Reset a defaults"}
				</Button>
				<Button
					variant="contained"
					onClick={handleSave}
					disabled={saving || resetting}
					sx={{
						transition: "transform 200ms ease, box-shadow 200ms ease",
						"&:hover:not(:disabled)": { transform: "translateY(-1px)", boxShadow: `0 4px 12px ${alpha(BRAND_BLUE, 0.32)}` },
						"&:active:not(:disabled)": { transform: "scale(0.98)" },
					}}
				>
					{saving ? "Guardando…" : "Guardar configuración"}
				</Button>
			</Stack>
		</Stack>
	);
}
