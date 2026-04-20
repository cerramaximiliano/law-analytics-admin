import { useState, useCallback, useEffect } from "react";
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
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import {
	Magicpen,
	Refresh,
	TickCircle,
	CloseCircle,
	Monitor,
	Code,
	TextBlock,
	Image,
	Add,
	Trash,
	ArrowUp2,
	ArrowDown2,
	Send2,
	Calendar,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import mktAxios from "utils/mktAxios";
import emailTemplateImagesService, { EmailTemplateImage } from "api/emailTemplateImages";

const CAMPAIGN_TIMEOUT_MS = 120000;

// Mismas categorías válidas que el schema de EmailTemplate / Campaign
const CATEGORY_OPTIONS = [
	{ value: "promotional", label: "Promocional" },
	{ value: "transactional", label: "Transaccional" },
	{ value: "newsletter", label: "Newsletter" },
	{ value: "welcome", label: "Bienvenida" },
	{ value: "reactivation", label: "Reactivación" },
	{ value: "notification", label: "Notificación" },
	{ value: "subscription", label: "Suscripción" },
	{ value: "secuenciaOnboarding", label: "Secuencia onboarding" },
	{ value: "teams", label: "Equipos" },
];

const TONE_OPTIONS = [
	{ value: "profesional", label: "Profesional" },
	{ value: "formal", label: "Formal" },
	{ value: "amigable", label: "Amigable" },
	{ value: "casual", label: "Casual" },
	{ value: "urgente", label: "Urgente" },
];

interface EmailTemplate {
	subject: string;
	preheader: string;
	htmlBody: string;
	textBody: string;
	variables: string[];
}

interface GeneratedEmail {
	sequenceIndex: number;
	name: string;
	subject: string;
	timeDelay: { value: number; unit: string };
	template: EmailTemplate;
}

interface GeneratedCampaign {
	name: string;
	description: string;
	type: "onetime" | "sequence";
	category: string;
	tags: string[];
	variables: Record<string, string>;
}

interface Usage {
	total_tokens?: number;
	prompt_tokens?: number;
	completion_tokens?: number;
}

interface Props {
	open: boolean;
	onClose: () => void;
	onCampaignSaved?: (campaignId: string) => void;
}

const GenerateAICampaignModal = ({ open, onClose, onCampaignSaved }: Props) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// ── Form state ───────────────────────────────────────────────────────────
	const [description, setDescription] = useState("");
	const [campaignType, setCampaignType] = useState<"onetime" | "sequence">("sequence");
	const [numberOfEmails, setNumberOfEmails] = useState(3);
	const [delays, setDelays] = useState<number[]>([0, 3, 2]);
	const [tone, setTone] = useState("profesional");
	const [category, setCategory] = useState("promotional");
	const [audience, setAudience] = useState("abogados y profesionales del derecho");
	const [campaignVariables, setCampaignVariables] = useState<{ key: string; value: string }[]>([]);
	const [additionalImages, setAdditionalImages] = useState<
		{ url: string; description: string; saveToLibrary?: boolean; fromLibraryId?: string }[]
	>([]);
	const [imagesExpanded, setImagesExpanded] = useState(false);

	// ── Library ──────────────────────────────────────────────────────────────
	const [library, setLibrary] = useState<EmailTemplateImage[]>([]);
	const [libraryLoading, setLibraryLoading] = useState(false);
	const [libraryLoaded, setLibraryLoaded] = useState(false);

	// ── Generation state ─────────────────────────────────────────────────────
	const [generating, setGenerating] = useState(false);
	const [campaign, setCampaign] = useState<GeneratedCampaign | null>(null);
	const [emails, setEmails] = useState<GeneratedEmail[]>([]);
	const [usage, setUsage] = useState<Usage | null>(null);
	const [error, setError] = useState<string | null>(null);

	// ── Preview state ────────────────────────────────────────────────────────
	const [emailTab, setEmailTab] = useState(0);
	const [previewMode, setPreviewMode] = useState<"html" | "text" | "json">("html");

	// ── Save state ───────────────────────────────────────────────────────────
	const [saving, setSaving] = useState(false);

	const busy = generating || saving;

	// ── Sync numberOfEmails with delays array ────────────────────────────────
	useEffect(() => {
		if (campaignType === "onetime") {
			setNumberOfEmails(1);
			setDelays([0]);
			return;
		}
		// Extender o truncar el array de delays para que tenga length = numberOfEmails
		setDelays((prev) => {
			if (prev.length === numberOfEmails) return prev;
			if (prev.length < numberOfEmails) {
				const defaults = [0, 3, 2, 3, 2, 3, 2];
				return [...prev, ...defaults.slice(prev.length, numberOfEmails)];
			}
			return prev.slice(0, numberOfEmails);
		});
	}, [campaignType, numberOfEmails]);

	// ── Handlers ─────────────────────────────────────────────────────────────
	const resetAll = useCallback(() => {
		setDescription("");
		setCampaignType("sequence");
		setNumberOfEmails(3);
		setDelays([0, 3, 2]);
		setTone("profesional");
		setCategory("promotional");
		setAudience("abogados y profesionales del derecho");
		setCampaignVariables([]);
		setAdditionalImages([]);
		setImagesExpanded(false);
		setCampaign(null);
		setEmails([]);
		setUsage(null);
		setError(null);
		setEmailTab(0);
		setPreviewMode("html");
	}, []);

	const handleClose = () => {
		if (busy) return;
		resetAll();
		onClose();
	};

	const canGenerate = description.trim().length >= 10;
	const canSave = campaign !== null && emails.length > 0 && (campaign.name || "").trim().length > 0;

	const fetchLibrary = useCallback(async () => {
		if (libraryLoading) return;
		setLibraryLoading(true);
		try {
			const res = await emailTemplateImagesService.list();
			setLibrary(res.data || []);
			setLibraryLoaded(true);
		} catch {
			// No crítico
		} finally {
			setLibraryLoading(false);
		}
	}, [libraryLoading]);

	useEffect(() => {
		if (imagesExpanded && !libraryLoaded && !libraryLoading) {
			fetchLibrary();
		}
	}, [imagesExpanded, libraryLoaded, libraryLoading, fetchLibrary]);

	const isImageSelected = useCallback((url: string) => additionalImages.some((img) => img.url.trim() === url.trim()), [additionalImages]);

	const toggleLibraryImage = (img: EmailTemplateImage) => {
		if (busy) return;
		if (isImageSelected(img.url)) {
			setAdditionalImages((prev) => prev.filter((p) => p.url.trim() !== img.url.trim()));
		} else {
			setAdditionalImages((prev) => [...prev, { url: img.url, description: img.description || img.name || "", fromLibraryId: img._id }]);
		}
	};

	const handleGenerate = async () => {
		if (!canGenerate) return;
		setGenerating(true);
		setError(null);
		try {
			const validImages = additionalImages.filter((img) => img.url.trim());
			const varsObj = campaignVariables
				.filter((v) => v.key.trim())
				.reduce((acc, v) => ({ ...acc, [v.key.trim()]: v.value }), {} as Record<string, string>);

			const response = await mktAxios.post(
				"/api/ai-templates/generate-campaign",
				{
					description: description.trim(),
					campaignType,
					numberOfEmails,
					delayBetweenEmails: delays,
					tone,
					category,
					audience,
					campaignVariables: varsObj,
					additionalImages: validImages.length > 0 ? validImages : undefined,
				},
				{ timeout: CAMPAIGN_TIMEOUT_MS },
			);

			if (response.data.success && response.data.data) {
				setCampaign(response.data.data.campaign);
				setEmails(response.data.data.emails);
				setUsage(response.data.usage || null);
				setEmailTab(0);
			} else {
				throw new Error(response.data.error || "Respuesta inválida del servidor");
			}
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message || "Error al generar la campaña";
			setError(msg);
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setGenerating(false);
		}
	};

	const handleSave = async () => {
		if (!canSave || !campaign) return;
		setSaving(true);
		setError(null);
		try {
			const response = await mktAxios.post("/api/ai-templates/save-campaign", { campaign, emails }, { timeout: CAMPAIGN_TIMEOUT_MS });

			if (response.data.success && response.data.data) {
				enqueueSnackbar("Campaña guardada correctamente", { variant: "success" });
				onCampaignSaved?.(response.data.data.campaignId);
				resetAll();
				onClose();
			} else {
				throw new Error(response.data.error || "No se pudo guardar la campaña");
			}
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message || "Error al guardar la campaña";
			setError(msg);
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const currentEmail = emails[emailTab];

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
			<DialogTitle>
				<Stack direction="row" spacing={1} alignItems="center">
					<Magicpen size={22} color={theme.palette.primary.main} />
					<Typography variant="h6" fontWeight={700}>
						Generar campaña completa con AI
					</Typography>
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
					Una sola generación crea la campaña, los templates HTML y los vínculos. Podés previsualizar y editar antes de guardar.
				</Typography>
			</DialogTitle>

			<DialogContent dividers>
				<Grid container spacing={2}>
					{/* ── Columna izquierda: formulario ── */}
					<Grid item xs={12} md={5}>
						<Stack spacing={2}>
							<Typography variant="subtitle2" color="text.secondary">
								Parámetros de la campaña
							</Typography>

							<TextField
								label="Descripción de la campaña"
								fullWidth
								multiline
								rows={5}
								size="small"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={busy}
								required
								placeholder="Ej: Campaña Black Friday con 25% off en planes anuales. 3 emails: anuncio inicial, recordatorio a mitad de oferta, último día. Cada uno con urgencia creciente."
								helperText="Mínimo 10 caracteres. Sé específico sobre el objetivo, narrativa y tono esperado."
							/>

							<Stack direction="row" spacing={1}>
								<FormControl fullWidth size="small">
									<InputLabel>Tipo</InputLabel>
									<Select value={campaignType} label="Tipo" onChange={(e) => setCampaignType(e.target.value as any)} disabled={busy}>
										<MenuItem value="onetime">Email único (onetime)</MenuItem>
										<MenuItem value="sequence">Secuencia (sequence)</MenuItem>
									</Select>
								</FormControl>
								{campaignType === "sequence" && (
									<TextField
										label="Cantidad de emails"
										type="number"
										size="small"
										value={numberOfEmails}
										onChange={(e) => setNumberOfEmails(Math.max(2, Math.min(7, parseInt(e.target.value) || 2)))}
										disabled={busy}
										inputProps={{ min: 2, max: 7 }}
										sx={{ width: 150 }}
									/>
								)}
							</Stack>

							{campaignType === "sequence" && (
								<Paper variant="outlined" sx={{ p: 1.5 }}>
									<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
										Delays entre emails (días)
									</Typography>
									<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
										{delays.map((d, i) => (
											<TextField
												key={i}
												type="number"
												size="small"
												label={i === 0 ? "Email 1 (inicial)" : `Email ${i + 1}`}
												value={d}
												onChange={(e) =>
													setDelays((prev) => prev.map((p, idx) => (idx === i ? Math.max(0, parseInt(e.target.value) || 0) : p)))
												}
												disabled={busy || i === 0}
												inputProps={{ min: 0, max: 90 }}
												sx={{ width: 120 }}
												helperText={i === 0 ? "Inmediato" : `Días tras ${i}`}
											/>
										))}
									</Stack>
								</Paper>
							)}

							<Stack direction="row" spacing={1}>
								<FormControl fullWidth size="small">
									<InputLabel>Categoría</InputLabel>
									<Select value={category} label="Categoría" onChange={(e) => setCategory(e.target.value)} disabled={busy}>
										{CATEGORY_OPTIONS.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.label}
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
							</Stack>

							<TextField
								label="Audiencia"
								size="small"
								fullWidth
								value={audience}
								onChange={(e) => setAudience(e.target.value)}
								disabled={busy}
							/>

							{/* ── Variables de campaña ── */}
							<Paper variant="outlined" sx={{ p: 1.5 }}>
								<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
									<Typography variant="caption" fontWeight={700} color="text.secondary">
										Variables de la campaña
									</Typography>
									<Button
										size="small"
										startIcon={<Add size={14} />}
										onClick={() => setCampaignVariables((prev) => [...prev, { key: "", value: "" }])}
										disabled={busy}
									>
										Agregar
									</Button>
								</Stack>
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
									Se inyectan como {"{{"}key{"}}"} en los templates (ej: discountCode, discountValue).
								</Typography>
								{campaignVariables.length === 0 && (
									<Typography variant="caption" color="text.disabled">
										Sin variables. Las podés omitir si el HTML no las necesita.
									</Typography>
								)}
								<Stack spacing={1}>
									{campaignVariables.map((v, idx) => (
										<Stack key={idx} direction="row" spacing={1}>
											<TextField
												size="small"
												placeholder="key (ej: discountCode)"
												value={v.key}
												onChange={(e) =>
													setCampaignVariables((prev) => prev.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p)))
												}
												disabled={busy}
												sx={{ flex: 1 }}
											/>
											<TextField
												size="small"
												placeholder="value (ej: BF25)"
												value={v.value}
												onChange={(e) =>
													setCampaignVariables((prev) => prev.map((p, i) => (i === idx ? { ...p, value: e.target.value } : p)))
												}
												disabled={busy}
												sx={{ flex: 1 }}
											/>
											<IconButton
												size="small"
												onClick={() => setCampaignVariables((prev) => prev.filter((_, i) => i !== idx))}
												disabled={busy}
											>
												<Trash size={14} />
											</IconButton>
										</Stack>
									))}
								</Stack>
							</Paper>

							{/* ── Biblioteca de imágenes ── */}
							<Paper variant="outlined" sx={{ p: 1.5 }}>
								<Stack
									direction="row"
									alignItems="center"
									justifyContent="space-between"
									sx={{ cursor: "pointer" }}
									onClick={() => setImagesExpanded((v) => !v)}
								>
									<Stack direction="row" spacing={1} alignItems="center">
										<Image size={16} color={theme.palette.text.secondary} />
										<Typography variant="subtitle2">Imágenes adicionales</Typography>
										{additionalImages.filter((i) => i.url.trim()).length > 0 && (
											<Chip
												label={additionalImages.filter((i) => i.url.trim()).length}
												size="small"
												color="primary"
												sx={{ height: 18, fontSize: "0.65rem" }}
											/>
										)}
									</Stack>
									{imagesExpanded ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
								</Stack>
								{imagesExpanded && (
									<Stack spacing={1} sx={{ mt: 1.5 }}>
										{libraryLoading && <CircularProgress size={16} />}
										{library.length > 0 ? (
											<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
												{library.map((img) => {
													const selected = isImageSelected(img.url);
													return (
														<Tooltip key={img._id} title={img.description || img.name || img.url} arrow>
															<Box sx={{ position: "relative" }}>
																<Box
																	component="img"
																	src={img.url}
																	alt={img.name || ""}
																	onClick={() => toggleLibraryImage(img)}
																	sx={{
																		width: 56,
																		height: 56,
																		objectFit: "cover",
																		borderRadius: 1,
																		cursor: busy ? "not-allowed" : "pointer",
																		border: 2,
																		borderColor: selected ? "primary.main" : "divider",
																	}}
																	onError={(e: any) => {
																		e.currentTarget.style.visibility = "hidden";
																	}}
																/>
																{selected && (
																	<Box
																		sx={{
																			position: "absolute",
																			top: 2,
																			right: 2,
																			bgcolor: "primary.main",
																			color: "primary.contrastText",
																			borderRadius: "50%",
																			width: 16,
																			height: 16,
																			display: "flex",
																			alignItems: "center",
																			justifyContent: "center",
																			fontSize: 10,
																			fontWeight: 700,
																		}}
																	>
																		✓
																	</Box>
																)}
															</Box>
														</Tooltip>
													);
												})}
											</Stack>
										) : (
											!libraryLoading && (
												<Typography variant="caption" color="text.disabled">
													La biblioteca está vacía. Agregalas desde el generador de templates.
												</Typography>
											)
										)}
									</Stack>
								)}
							</Paper>

							<Divider />

							<Button
								variant="contained"
								color="primary"
								size="large"
								fullWidth
								startIcon={
									generating ? <CircularProgress size={16} color="inherit" /> : campaign ? <Refresh size={18} /> : <Magicpen size={18} />
								}
								onClick={handleGenerate}
								disabled={!canGenerate || busy}
							>
								{generating ? "Generando campaña (puede tardar 30-60s)..." : campaign ? "Regenerar campaña" : "Generar campaña"}
							</Button>

							{usage && (
								<Typography variant="caption" color="text.secondary">
									Tokens: {usage.total_tokens?.toLocaleString()} (prompt {usage.prompt_tokens}, completion {usage.completion_tokens})
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
						{!campaign ? (
							<Paper
								variant="outlined"
								sx={{
									p: 4,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									minHeight: 500,
									borderStyle: "dashed",
								}}
							>
								<Stack alignItems="center" spacing={1} sx={{ color: "text.secondary", textAlign: "center" }}>
									<Magicpen size={40} />
									<Typography variant="body2">Describí la campaña y presioná "Generar campaña"</Typography>
									<Typography variant="caption">Recibirás la campaña + todos los emails listos para previsualizar.</Typography>
								</Stack>
							</Paper>
						) : (
							<Stack spacing={2}>
								{/* Metadata de la campaña */}
								<Paper variant="outlined" sx={{ p: 1.5 }}>
									<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
										<Send2 size={16} color={theme.palette.primary.main} />
										<Typography variant="subtitle2" fontWeight={700}>
											Campaña
										</Typography>
									</Stack>
									<TextField
										size="small"
										fullWidth
										label="Nombre"
										value={campaign.name}
										onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
										disabled={busy}
										sx={{ mb: 1 }}
									/>
									<TextField
										size="small"
										fullWidth
										label="Descripción interna"
										value={campaign.description}
										onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
										disabled={busy}
										multiline
										rows={2}
										sx={{ mb: 1 }}
									/>
									<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
										<Chip label={campaign.type} size="small" color="primary" variant="outlined" />
										<Chip label={campaign.category} size="small" color="secondary" variant="outlined" />
										{campaign.tags.map((tag) => (
											<Chip key={tag} label={tag} size="small" />
										))}
									</Stack>
								</Paper>

								{/* Tabs de emails */}
								<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
									<Tabs
										value={emailTab}
										onChange={(_, v) => setEmailTab(v)}
										variant="scrollable"
										scrollButtons="auto"
										sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none" } }}
									>
										{emails.map((em, i) => (
											<Tab
												key={i}
												label={
													<Stack direction="row" alignItems="center" spacing={0.5}>
														<Chip label={`#${i + 1}`} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
														<Typography variant="caption">{em.name}</Typography>
														{i > 0 && (
															<Chip
																icon={<Calendar size={10} />}
																label={`+${em.timeDelay.value}d`}
																size="small"
																variant="outlined"
																sx={{ height: 18, fontSize: "0.6rem" }}
															/>
														)}
													</Stack>
												}
											/>
										))}
									</Tabs>
								</Box>

								{currentEmail && (
									<>
										<Paper variant="outlined" sx={{ p: 1.5 }}>
											<Stack spacing={0.5}>
												<Typography variant="caption" fontWeight={700} color="text.secondary">
													Subject
												</Typography>
												<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
													{currentEmail.subject}
												</Typography>
												{currentEmail.template.preheader && (
													<>
														<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>
															Preheader
														</Typography>
														<Typography variant="body2" sx={{ fontFamily: "monospace", opacity: 0.8 }}>
															{currentEmail.template.preheader}
														</Typography>
													</>
												)}
												{currentEmail.template.variables.length > 0 && (
													<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
														{currentEmail.template.variables.map((v) => (
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
											value={previewMode}
											onChange={(_, v) => setPreviewMode(v)}
											sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}
										>
											<Tab value="html" icon={<Monitor size={14} />} iconPosition="start" label="HTML" />
											<Tab value="text" icon={<TextBlock size={14} />} iconPosition="start" label="Texto" />
											<Tab value="json" icon={<Code size={14} />} iconPosition="start" label="JSON" />
										</Tabs>

										<Paper variant="outlined" sx={{ overflow: "hidden", minHeight: 360 }}>
											{previewMode === "html" && (
												<Box
													component="iframe"
													srcDoc={currentEmail.template.htmlBody}
													title={`Preview email ${emailTab + 1}`}
													sx={{
														width: "100%",
														height: 400,
														border: 0,
														bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
													}}
												/>
											)}
											{previewMode === "text" && (
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
														maxHeight: 400,
														overflow: "auto",
													}}
												>
													{currentEmail.template.textBody || "(sin versión de texto plano)"}
												</Box>
											)}
											{previewMode === "json" && (
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
														maxHeight: 400,
														overflow: "auto",
														bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
													}}
												>
													{JSON.stringify(currentEmail, null, 2)}
												</Box>
											)}
										</Paper>
									</>
								)}
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
					{saving ? "Guardando..." : "Guardar campaña completa"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default GenerateAICampaignModal;
