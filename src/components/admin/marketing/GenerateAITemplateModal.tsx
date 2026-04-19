import { useState, useCallback, useEffect } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
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
	IconButton,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
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
	ArrowLeft2,
	Image,
	Add,
	Trash,
	ArrowUp2,
	ArrowDown2,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import mktAxios from "utils/mktAxios";
import emailTemplateImagesService, { EmailTemplateImage } from "api/emailTemplateImages";

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
	const [additionalImages, setAdditionalImages] = useState<
		{ url: string; description: string; saveToLibrary?: boolean; fromLibraryId?: string }[]
	>([]);
	const [imagesExpanded, setImagesExpanded] = useState(false);

	// ── Library state ────────────────────────────────────────────────────────
	const [library, setLibrary] = useState<EmailTemplateImage[]>([]);
	const [libraryLoading, setLibraryLoading] = useState(false);
	const [libraryLoaded, setLibraryLoaded] = useState(false);

	// ── Generation state ─────────────────────────────────────────────────────
	const [generating, setGenerating] = useState(false);
	const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
	const [usage, setUsage] = useState<Usage | null>(null);
	const [error, setError] = useState<string | null>(null);

	// ── Refinement state ─────────────────────────────────────────────────────
	const [refinementPrompt, setRefinementPrompt] = useState("");
	const [previousTemplate, setPreviousTemplate] = useState<GeneratedTemplate | null>(null);
	const [refining, setRefining] = useState(false);

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
		setAdditionalImages([]);
		setImagesExpanded(false);
		// library se preserva a propósito: si el modal se reabre, evitamos re-fetch.
		setGenerated(null);
		setUsage(null);
		setError(null);
		setPreviewTab(0);
		setTemplateName("");
		setDescription("");
		setRefinementPrompt("");
		setPreviousTemplate(null);
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
			const validImages = additionalImages.filter((img) => img.url.trim());
			const response = await mktAxios.post("/api/ai-templates/generate", {
				type: category,
				tone,
				audience,
				objective: objective || undefined,
				customPrompt: customPrompt || undefined,
				includePreheader,
				includeCTA,
				additionalImages: validImages.length > 0 ? validImages : undefined,
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
				// Persistir y trackear imágenes de forma asíncrona (no crítico)
				await persistNewLibraryImages();
				const usedInHtml = validImages.filter((img) => tpl.htmlBody.includes(img.url));
				trackImageUsage(usedInHtml.map((i) => i.url));
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

	const handleRefine = async () => {
		if (!generated || !refinementPrompt.trim() || refining) return;
		setRefining(true);
		setError(null);
		try {
			const validImages = additionalImages.filter((img) => img.url.trim());
			const response = await mktAxios.post("/api/ai-templates/refine", {
				previousTemplate: generated,
				refinementPrompt: refinementPrompt.trim(),
				type: category,
				tone,
				audience,
				additionalImages: validImages.length > 0 ? validImages : undefined,
			});
			if (response.data.success && response.data.data) {
				const tpl = response.data.data as GeneratedTemplate;
				setPreviousTemplate(generated);
				setGenerated(tpl);
				setUsage(response.data.usage || null);
				setRefinementPrompt("");
				await persistNewLibraryImages();
				const usedInHtml = validImages.filter((img) => tpl.htmlBody.includes(img.url));
				trackImageUsage(usedInHtml.map((i) => i.url));
			} else {
				throw new Error(response.data.error || "Respuesta inválida del servidor");
			}
		} catch (err: any) {
			const msg = err.response?.data?.error || err.message || "Error al refinar el template";
			setError(msg);
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setRefining(false);
		}
	};

	const handleRevert = () => {
		if (!previousTemplate) return;
		setGenerated(previousTemplate);
		setPreviousTemplate(null);
		setRefinementPrompt("");
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

	// ── Library handlers ─────────────────────────────────────────────────────
	const fetchLibrary = useCallback(async () => {
		if (libraryLoading) return;
		setLibraryLoading(true);
		try {
			const res = await emailTemplateImagesService.list();
			setLibrary(res.data || []);
			setLibraryLoaded(true);
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.error || err.message || "Error al cargar biblioteca de imágenes", { variant: "warning" });
		} finally {
			setLibraryLoading(false);
		}
	}, [libraryLoading, enqueueSnackbar]);

	// Cargar biblioteca la primera vez que se expande
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

	const deleteFromLibrary = async (img: EmailTemplateImage) => {
		if (busy) return;
		if (!window.confirm(`¿Eliminar "${img.name || img.url}" de la biblioteca? Esto no afecta a los templates ya guardados.`)) return;
		try {
			await emailTemplateImagesService.remove(img._id);
			setLibrary((prev) => prev.filter((i) => i._id !== img._id));
			setAdditionalImages((prev) => prev.filter((p) => p.fromLibraryId !== img._id));
			enqueueSnackbar("Imagen eliminada de la biblioteca", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.error || err.message || "Error al eliminar imagen", { variant: "error" });
		}
	};

	// Persistir en biblioteca las imágenes manuales con saveToLibrary=true
	const persistNewLibraryImages = async () => {
		const toSave = additionalImages.filter((img) => img.saveToLibrary && img.url.trim() && !img.fromLibraryId);
		if (toSave.length === 0) return;
		try {
			const created = await Promise.all(
				toSave.map((img) =>
					emailTemplateImagesService.create({ url: img.url.trim(), description: img.description.trim() }).catch(() => null),
				),
			);
			// Refrescar la biblioteca con las nuevas
			const newImages = created.filter((c): c is NonNullable<typeof c> => c !== null && !!c.data).map((c) => c.data);
			if (newImages.length > 0) {
				setLibrary((prev) => {
					const existingUrls = new Set(prev.map((p) => p.url));
					const dedup = newImages.filter((n) => !existingUrls.has(n.url));
					return [...dedup, ...prev];
				});
				// Marcar los items del additionalImages como vinculados a biblioteca
				setAdditionalImages((prev) =>
					prev.map((p) => {
						if (!p.saveToLibrary || p.fromLibraryId) return p;
						const match = newImages.find((n) => n.url === p.url.trim());
						return match ? { ...p, fromLibraryId: match._id, saveToLibrary: false } : p;
					}),
				);
			}
		} catch {
			// Error no crítico — la biblioteca es opcional
		}
	};

	const trackImageUsage = async (urls: string[]) => {
		if (urls.length === 0) return;
		try {
			await emailTemplateImagesService.trackUsage(urls);
		} catch {
			// No crítico
		}
	};

	const busy = generating || saving || refining;

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

							{/* ── Imágenes adicionales ── */}
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
									<Stack spacing={2} sx={{ mt: 1.5 }}>
										<Typography variant="caption" color="text.secondary">
											El modelo podrá usar estas imágenes en el HTML cuando aporten valor. Usá URLs públicas de un CDN (Cloudinary, S3,
											etc.) — evitá hosts que bloqueen hotlinking.
										</Typography>

										{/* ── Biblioteca ── */}
										<Box>
											<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
												<Typography variant="caption" fontWeight={700} color="text.secondary">
													Biblioteca {library.length > 0 && `(${library.length})`}
												</Typography>
												{libraryLoading && <CircularProgress size={12} />}
											</Stack>
											{library.length === 0 && !libraryLoading ? (
												<Typography variant="caption" color="text.disabled">
													Todavía no hay imágenes guardadas. Agregá una abajo con el check "Guardar en biblioteca".
												</Typography>
											) : (
												<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
													{library.map((img) => {
														const selected = isImageSelected(img.url);
														return (
															<Tooltip
																key={img._id}
																title={
																	<Box>
																		<Typography variant="caption" fontWeight={700}>
																			{img.name || "(sin nombre)"}
																		</Typography>
																		{img.description && (
																			<Typography variant="caption" component="div">
																				{img.description}
																			</Typography>
																		)}
																		<Typography variant="caption" component="div" sx={{ opacity: 0.7, mt: 0.5 }}>
																			Usada {img.usageCount} {img.usageCount === 1 ? "vez" : "veces"}
																		</Typography>
																	</Box>
																}
																arrow
															>
																<Box sx={{ position: "relative" }}>
																	<Box
																		component="img"
																		src={img.url}
																		alt={img.name || ""}
																		onClick={() => toggleLibraryImage(img)}
																		sx={{
																			width: 64,
																			height: 64,
																			objectFit: "cover",
																			borderRadius: 1,
																			cursor: busy ? "not-allowed" : "pointer",
																			border: 2,
																			borderColor: selected ? "primary.main" : "divider",
																			opacity: busy ? 0.5 : 1,
																			transition: "all 0.15s",
																			"&:hover": { borderColor: busy ? "divider" : "primary.light" },
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
																	<IconButton
																		size="small"
																		onClick={(e) => {
																			e.stopPropagation();
																			deleteFromLibrary(img);
																		}}
																		disabled={busy}
																		sx={{
																			position: "absolute",
																			bottom: -6,
																			right: -6,
																			bgcolor: "background.paper",
																			border: 1,
																			borderColor: "divider",
																			p: 0.25,
																			"&:hover": { bgcolor: "error.light", color: "error.contrastText" },
																		}}
																	>
																		<Trash size={10} />
																	</IconButton>
																</Box>
															</Tooltip>
														);
													})}
												</Stack>
											)}
										</Box>

										<Divider />

										{/* ── URLs manuales ── */}
										<Box>
											<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
												Agregar URL manual
											</Typography>
											<Stack spacing={1.5}>
												{additionalImages
													.filter((img) => !img.fromLibraryId)
													.map((img) => {
														const idx = additionalImages.indexOf(img);
														return (
															<Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
																{img.url.trim() ? (
																	<Box
																		component="img"
																		src={img.url}
																		alt="preview"
																		sx={{
																			width: 56,
																			height: 56,
																			objectFit: "cover",
																			borderRadius: 1,
																			border: 1,
																			borderColor: "divider",
																			flexShrink: 0,
																			bgcolor: "grey.100",
																		}}
																		onError={(e: any) => {
																			e.currentTarget.style.visibility = "hidden";
																		}}
																	/>
																) : (
																	<Box
																		sx={{
																			width: 56,
																			height: 56,
																			borderRadius: 1,
																			border: 1,
																			borderColor: "divider",
																			display: "flex",
																			alignItems: "center",
																			justifyContent: "center",
																			flexShrink: 0,
																			bgcolor: "grey.100",
																			color: "text.disabled",
																		}}
																	>
																		<Image size={18} />
																	</Box>
																)}
																<Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
																	<TextField
																		size="small"
																		fullWidth
																		placeholder="URL de la imagen (https://...)"
																		value={img.url}
																		onChange={(e) =>
																			setAdditionalImages((prev) => prev.map((p, i) => (i === idx ? { ...p, url: e.target.value } : p)))
																		}
																		disabled={busy}
																	/>
																	<TextField
																		size="small"
																		fullWidth
																		placeholder="Descripción (qué muestra, para qué se usa)"
																		value={img.description}
																		onChange={(e) =>
																			setAdditionalImages((prev) =>
																				prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)),
																			)
																		}
																		disabled={busy}
																	/>
																	<FormControlLabel
																		sx={{ m: 0 }}
																		control={
																			<Checkbox
																				size="small"
																				checked={!!img.saveToLibrary}
																				onChange={(e) =>
																					setAdditionalImages((prev) =>
																						prev.map((p, i) => (i === idx ? { ...p, saveToLibrary: e.target.checked } : p)),
																					)
																				}
																				disabled={busy || !img.url.trim()}
																			/>
																		}
																		label={
																			<Typography variant="caption" color="text.secondary">
																				Guardar en biblioteca para reutilizar
																			</Typography>
																		}
																	/>
																</Stack>
																<IconButton
																	size="small"
																	onClick={() => setAdditionalImages((prev) => prev.filter((_, i) => i !== idx))}
																	disabled={busy}
																	sx={{ mt: 0.5 }}
																>
																	<Trash size={14} />
																</IconButton>
															</Stack>
														);
													})}
												<Button
													variant="outlined"
													size="small"
													startIcon={<Add size={14} />}
													onClick={() => setAdditionalImages((prev) => [...prev, { url: "", description: "", saveToLibrary: false }])}
													disabled={busy}
													sx={{ alignSelf: "flex-start" }}
												>
													Agregar URL
												</Button>
											</Stack>
										</Box>
									</Stack>
								)}
							</Paper>

							<Divider />

							{!generated ? (
								<Button
									variant="contained"
									color="primary"
									startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <Magicpen size={18} />}
									onClick={handleGenerate}
									disabled={!canGenerate || busy}
									fullWidth
									size="large"
								>
									{generating ? "Generando..." : "Generar"}
								</Button>
							) : (
								<Stack spacing={1.5}>
									<Typography variant="subtitle2" color="text.secondary">
										Refinar el template
									</Typography>
									<TextField
										label="¿Qué cambiarías?"
										size="small"
										fullWidth
										multiline
										rows={3}
										value={refinementPrompt}
										onChange={(e) => setRefinementPrompt(e.target.value)}
										disabled={busy}
										placeholder="Ej: hacé el subject más corto, cambiá el color del CTA a verde, agregá una línea sobre soporte 24/7..."
										helperText="Se enviará el template actual como contexto. El modelo aplicará solo los cambios pedidos."
									/>
									<Button
										variant="contained"
										color="primary"
										startIcon={refining ? <CircularProgress size={16} color="inherit" /> : <Refresh size={18} />}
										onClick={handleRefine}
										disabled={refinementPrompt.trim().length === 0 || busy}
										fullWidth
									>
										{refining ? "Aplicando cambios..." : "Regenerar con cambios"}
									</Button>
									<Stack direction="row" spacing={1}>
										<Button
											variant="outlined"
											size="small"
											startIcon={<ArrowLeft2 size={14} />}
											onClick={handleRevert}
											disabled={!previousTemplate || busy}
											sx={{ flex: 1 }}
										>
											Revertir anterior
										</Button>
										<Button
											variant="outlined"
											size="small"
											color="secondary"
											startIcon={<Magicpen size={14} />}
											onClick={handleGenerate}
											disabled={busy}
											sx={{ flex: 1 }}
										>
											Generar desde cero
										</Button>
									</Stack>
								</Stack>
							)}

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
