import { useState, useCallback } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	FormControlLabel,
	Grid,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";
import { Magicpen, Refresh, TickCircle, CloseCircle, Monitor, Code, TextBlock } from "iconsax-react";
import { useSnackbar } from "notistack";
import mktAxios from "utils/mktAxios";

// Categorías válidas según el enum del schema EmailTemplate en la-marketing-service
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
	{ value: "promotional", label: "Promocional" },
	{ value: "transactional", label: "Transaccional" },
	{ value: "newsletter", label: "Newsletter" },
	{ value: "welcome", label: "Bienvenida" },
	{ value: "reactivation", label: "Reactivación" },
	{ value: "notification", label: "Notificación" },
	{ value: "subscription", label: "Suscripción" },
	{ value: "auth", label: "Autenticación" },
	{ value: "support", label: "Soporte" },
	{ value: "tasks", label: "Tareas" },
	{ value: "documents", label: "Documentos" },
	{ value: "calculadora", label: "Calculadora" },
	{ value: "gestionTareas", label: "Gestión de tareas" },
	{ value: "gestionCausas", label: "Gestión de causas" },
	{ value: "gestionContactos", label: "Gestión de contactos" },
	{ value: "gestionCalendario", label: "Gestión de calendario" },
	{ value: "secuenciaOnboarding", label: "Secuencia onboarding" },
	{ value: "booking", label: "Reservas" },
	{ value: "administration", label: "Administración" },
	{ value: "teams", label: "Equipos" },
];

const TONE_OPTIONS = [
	{ value: "profesional", label: "Profesional" },
	{ value: "formal", label: "Formal" },
	{ value: "amigable", label: "Amigable" },
	{ value: "casual", label: "Casual" },
	{ value: "urgente", label: "Urgente" },
];

interface GeneratedTemplate {
	subject: string;
	preheader: string;
	htmlBody: string;
	textBody: string;
	variables: string[];
}

interface Usage {
	total_tokens?: number;
	prompt_tokens?: number;
	completion_tokens?: number;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onTemplateSaved?: () => void;
}

const GenerateAITemplateModal = ({ open, onClose, onTemplateSaved }: Props) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// ── Form state ───────────────────────────────────────────────────────────
	const [category, setCategory] = useState("promotional");
	const [tone, setTone] = useState("profesional");
	const [audience, setAudience] = useState("abogados y profesionales del derecho");
	const [customPrompt, setCustomPrompt] = useState("");
	const [objective, setObjective] = useState("");
	const [includePreheader, setIncludePreheader] = useState(true);
	const [includeCTA, setIncludeCTA] = useState(true);

	// ── Generation state ─────────────────────────────────────────────────────
	const [generating, setGenerating] = useState(false);
	const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
	const [usage, setUsage] = useState<Usage | null>(null);
	const [error, setError] = useState<string | null>(null);

	// ── Preview state ────────────────────────────────────────────────────────
	const [previewTab, setPreviewTab] = useState(0); // 0=HTML, 1=Texto, 2=JSON

	// ── Save state ───────────────────────────────────────────────────────────
	const [templateName, setTemplateName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);

	// ── Reset helpers ────────────────────────────────────────────────────────
	const resetAll = useCallback(() => {
		setCategory("promotional");
		setTone("profesional");
		setAudience("abogados y profesionales del derecho");
		setCustomPrompt("");
		setObjective("");
		setIncludePreheader(true);
		setIncludeCTA(true);
		setGenerated(null);
		setUsage(null);
		setError(null);
		setPreviewTab(0);
		setTemplateName("");
		setDescription("");
	}, []);

	const handleClose = () => {
		if (generating || saving) return;
		resetAll();
		onClose();
	};

	// ── Validation ───────────────────────────────────────────────────────────
	const canGenerate = category.trim().length > 0 && (objective.trim().length > 0 || customPrompt.trim().length > 0);

	const canSave =
		generated !== null && generated.subject.trim().length > 0 && generated.htmlBody.trim().length > 0 && templateName.trim().length > 0;

	// ── Handlers ─────────────────────────────────────────────────────────────
	const handleGenerate = async () => {
		if (!canGenerate) return;
		setGenerating(true);
		setError(null);
		try {
			const response = await mktAxios.post("/api/ai-templates/generate", {
				type: category,
				tone,
				audience,
				objective: objective || undefined,
				customPrompt: customPrompt || undefined,
				includePreheader,
				includeCTA,
				saveTemplate: false,
			});

			if (response.data.success && response.data.data) {
				const tpl = response.data.data as GeneratedTemplate;
				setGenerated(tpl);
				setUsage(response.data.usage || null);
				// Sugerir un nombre si no tiene uno
				if (!templateName.trim()) {
					const slug = tpl.subject
						.toLowerCase()
						.replace(/\{\{[^}]+\}\}/g, "")
						.replace(/[^\w\sáéíóúñ]/gi, "")
						.trim()
						.replace(/\s+/g, "_")
						.slice(0, 40);
					setTemplateName(`ai_${category}_${slug || Date.now()}`);
				}
			} else {
				throw new Error(response.data.error || "Respuesta inválida del servidor");
			}
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message || "Error al generar el template";
			setError(msg);
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setGenerating(false);
		}
	};

	const handleSave = async () => {
		if (!canSave || !generated) return;
		setSaving(true);
		try {
			const payload = {
				category,
				name: templateName.trim(),
				subject: generated.subject,
				preheader: generated.preheader,
				htmlBody: generated.htmlBody,
				textBody: generated.textBody,
				description: description.trim(),
				variables: generated.variables || [],
			};

			const response = await mktAxios.post("/api/templates", payload);

			if (response.data.success) {
				enqueueSnackbar("Plantilla guardada correctamente", { variant: "success" });
				onTemplateSaved?.();
				resetAll();
				onClose();
			} else {
				throw new Error(response.data.message || "No se pudo guardar la plantilla");
			}
		} catch (err: any) {
			const msg = err.response?.data?.message || err.message || "Error al guardar el template";
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const busy = generating || saving;

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				<Stack direction="row" spacing={1} alignItems="center">
					<Magicpen size={22} color={theme.palette.primary.main} />
					<Typography variant="h6" fontWeight={700}>
						Generar plantilla con AI
					</Typography>
				</Stack>
			</DialogTitle>

			<DialogContent dividers>
				<Grid container spacing={2}>
					{/* ── Columna izquierda: formulario ── */}
					<Grid item xs={12} md={5}>
						<Stack spacing={2}>
							<Typography variant="subtitle2" color="text.secondary">
								Parámetros
							</Typography>

							<FormControl fullWidth size="small">
								<InputLabel>Categoría</InputLabel>
								<Select value={category} label="Categoría" onChange={(e) => setCategory(e.target.value)} disabled={busy}>
									{CATEGORY_OPTIONS.map((opt) => (
										<MenuItem key={opt.value} value={opt.value}>
											{opt.label}{" "}
											<Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
												({opt.value})
											</Typography>
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<FormControl fullWidth size="small">
								<InputLabel>Tono</InputLabel>
								<Select value={tone} label="Tono" onChange={(e) => setTone(e.target.value)} disabled={busy}>
									{TONE_OPTIONS.map((opt) => (
										<MenuItem key={opt.value} value={opt.value}>
											{opt.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<TextField
								label="Audiencia"
								size="small"
								fullWidth
								value={audience}
								onChange={(e) => setAudience(e.target.value)}
								disabled={busy}
								helperText="A quién va dirigido este email"
							/>

							<TextField
								label="Objetivo (resumen en una línea)"
								size="small"
								fullWidth
								value={objective}
								onChange={(e) => setObjective(e.target.value)}
								disabled={busy}
								placeholder="Ej: Anunciar una oferta del 25% por 48hs"
							/>

							<TextField
								label="Descripción detallada (prompt libre)"
								size="small"
								fullWidth
								multiline
								rows={5}
								value={customPrompt}
								onChange={(e) => setCustomPrompt(e.target.value)}
								disabled={busy}
								placeholder={
									"Describí en detalle qué debe decir el email, el contexto, " +
									"qué acción querés que tome el usuario y cualquier variable específica. " +
									"Si completás este campo, tiene prioridad sobre el objetivo."
								}
								helperText="Opcional pero recomendado. Con texto libre obtendrás mejores resultados."
							/>

							<Stack direction="row" spacing={2}>
								<FormControlLabel
									control={<Switch checked={includePreheader} onChange={(e) => setIncludePreheader(e.target.checked)} disabled={busy} />}
									label="Preheader"
								/>
								<FormControlLabel
									control={<Switch checked={includeCTA} onChange={(e) => setIncludeCTA(e.target.checked)} disabled={busy} />}
									label="Botón CTA"
								/>
							</Stack>

							<Divider />

							<Button
								variant="contained"
								color="primary"
								startIcon={
									generating ? <CircularProgress size={16} color="inherit" /> : generated ? <Refresh size={18} /> : <Magicpen size={18} />
								}
								onClick={handleGenerate}
								disabled={!canGenerate || busy}
								fullWidth
								size="large"
							>
								{generating ? "Generando..." : generated ? "Regenerar" : "Generar"}
							</Button>

							{usage && (
								<Typography variant="caption" color="text.secondary">
									Tokens usados: {usage.total_tokens?.toLocaleString() || "?"} (prompt: {usage.prompt_tokens}, completion:{" "}
									{usage.completion_tokens})
								</Typography>
							)}

							{error && (
								<Alert severity="error" icon={<CloseCircle size={18} />} onClose={() => setError(null)}>
									{error}
								</Alert>
							)}
						</Stack>
					</Grid>

					{/* ── Columna derecha: preview ── */}
					<Grid item xs={12} md={7}>
						{!generated ? (
							<Paper
								variant="outlined"
								sx={{
									p: 4,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									minHeight: 400,
									borderStyle: "dashed",
								}}
							>
								<Stack alignItems="center" spacing={1} sx={{ color: "text.secondary", textAlign: "center" }}>
									<Magicpen size={40} />
									<Typography variant="body2">Completá los parámetros y presioná "Generar"</Typography>
									<Typography variant="caption">La plantilla aparecerá acá antes de guardarse.</Typography>
								</Stack>
							</Paper>
						) : (
							<Stack spacing={2}>
								<Paper variant="outlined" sx={{ p: 1.5 }}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary" fontWeight={700}>
											Subject
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{generated.subject}
										</Typography>
										{generated.preheader && (
											<>
												<Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mt: 0.5 }}>
													Preheader
												</Typography>
												<Typography variant="body2" sx={{ fontFamily: "monospace", opacity: 0.8 }}>
													{generated.preheader}
												</Typography>
											</>
										)}
										{generated.variables && generated.variables.length > 0 && (
											<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
												{generated.variables.map((v) => (
													<Chip
														key={v}
														label={`{{${v}}}`}
														size="small"
														variant="outlined"
														sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}
													/>
												))}
											</Stack>
										)}
									</Stack>
								</Paper>

								<Tabs
									value={previewTab}
									onChange={(_, v) => setPreviewTab(v)}
									sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}
								>
									<Tab icon={<Monitor size={14} />} iconPosition="start" label="HTML" />
									<Tab icon={<TextBlock size={14} />} iconPosition="start" label="Texto" />
									<Tab icon={<Code size={14} />} iconPosition="start" label="JSON" />
								</Tabs>

								<Paper variant="outlined" sx={{ overflow: "hidden", minHeight: 360 }}>
									{previewTab === 0 && (
										<Box
											component="iframe"
											srcDoc={generated.htmlBody}
											title="Preview HTML"
											sx={{
												width: "100%",
												height: 420,
												border: 0,
												backgroundColor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
											}}
										/>
									)}
									{previewTab === 1 && (
										<Box
											component="pre"
											sx={{
												m: 0,
												p: 2,
												fontFamily: "monospace",
												fontSize: 12,
												lineHeight: 1.5,
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												maxHeight: 420,
												overflow: "auto",
											}}
										>
											{generated.textBody || "(sin versión de texto plano)"}
										</Box>
									)}
									{previewTab === 2 && (
										<Box
											component="pre"
											sx={{
												m: 0,
												p: 2,
												fontFamily: "monospace",
												fontSize: 11,
												lineHeight: 1.5,
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
												maxHeight: 420,
												overflow: "auto",
												bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
											}}
										>
											{JSON.stringify(generated, null, 2)}
										</Box>
									)}
								</Paper>

								<Divider />

								<Stack spacing={1.5}>
									<Typography variant="subtitle2" color="text.secondary">
										Datos para guardar
									</Typography>
									<TextField
										label="Nombre de la plantilla"
										size="small"
										fullWidth
										value={templateName}
										onChange={(e) => setTemplateName(e.target.value)}
										disabled={saving}
										required
										helperText={`Categoría + nombre = único. Categoría seleccionada: "${category}".`}
									/>
									<TextField
										label="Descripción interna (opcional)"
										size="small"
										fullWidth
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										disabled={saving}
									/>
								</Stack>
							</Stack>
						)}
					</Grid>
				</Grid>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={handleClose} disabled={busy}>
					Cancelar
				</Button>
				<Button
					variant="contained"
					color="success"
					startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <TickCircle size={18} />}
					onClick={handleSave}
					disabled={!canSave || busy}
				>
					{saving ? "Guardando..." : "Guardar plantilla"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default GenerateAITemplateModal;
