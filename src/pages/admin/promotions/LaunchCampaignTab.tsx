import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	AlertTitle,
	Autocomplete,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Divider,
	FormControl,
	FormControlLabel,
	FormLabel,
	Grid,
	InputAdornment,
	Paper,
	Stack,
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Send2, People, TickCircle, InfoCircle, Sms, Calendar, DocumentText, Warning2, CloseCircle, Timer1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { DiscountCode } from "api/discounts";
import discountCampaignService, { LaunchCampaignResult, MarketingTemplate } from "api/discountCampaign";

interface Props {
	discount: DiscountCode;
}

// Variables que el marketing service reemplaza automáticamente en los templates
const AUTO_REPLACED_VARS = new Set([
	"firstName",
	"lastName",
	"fullName",
	"email",
	"mail",
	"userEmail",
	"contact.email",
	"contact.firstName",
	"contact.lastName",
	"contact.fullName",
	"campaign.name",
	"campaignId",
	"campaignName",
	"today",
	"currentDate",
	"currentDateTime",
	"date.today",
	"date.now",
	"now",
	"userResourcesSummary",
	"template.id",
	"templateId",
]);

// Variables específicas de descuento que NO serán reemplazadas automáticamente
const DISCOUNT_VARS = new Set([
	"code",
	"discountcode",
	"promocode",
	"discount",
	"discountvalue",
	"validuntil",
	"expiry",
	"coupon",
	"promo",
]);

const DAY_LABELS: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Lun → Dom

function extractTemplateVars(html: string): string[] {
	const matches = [...html.matchAll(/\{\{([^}|]+)(?:\|[^}]*)?\}\}/g)];
	return [...new Set(matches.map((m) => m[1].trim()))];
}

const LaunchCampaignTab = ({ discount }: Props) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// ── Template ────────────────────────────────────────────────────────────────
	const [templateMode, setTemplateMode] = useState<"new" | "existing">("new");
	const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
	const [templatesLoading, setTemplatesLoading] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);

	// ── Email content ────────────────────────────────────────────────────────────
	const [campaignName, setCampaignName] = useState(`Campaña ${discount.code} - ${new Date().toLocaleDateString("es-AR")}`);
	const [fromName, setFromName] = useState("Law Analytics");
	const [subject, setSubject] = useState(`🎉 Tenés un descuento exclusivo: ${discount.code}`);
	const [htmlBody, setHtmlBody] = useState(buildDefaultHtml(discount));

	// ── Scheduling ───────────────────────────────────────────────────────────────
	const [launchImmediately, setLaunchImmediately] = useState(false);
	const [startDate, setStartDate] = useState("");
	const [throttleRate, setThrottleRate] = useState(500);
	const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5]);
	const [timeWindowStart, setTimeWindowStart] = useState("09:00");
	const [timeWindowEnd, setTimeWindowEnd] = useState("18:00");

	// ── Result / loading ─────────────────────────────────────────────────────────
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<LaunchCampaignResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	// ── Recipients ───────────────────────────────────────────────────────────────
	const targetUsers = discount.restrictions?.targetUsers ?? [];
	const targetSegments = discount.restrictions?.targetSegments ?? [];
	const hasTargetSegments = (targetSegments as string[]).length > 0;
	const hasTargetUsers = (targetUsers as string[]).length > 0;
	const hasRecipients = hasTargetUsers || hasTargetSegments;

	// Segment type validation: dynamic segments are incompatible with time-limited
	// or usage-limited discounts because new contacts may be added after expiry.
	const maxRedemptions = discount.restrictions?.maxRedemptions;
	const hasRedemptionLimit = maxRedemptions !== null && maxRedemptions !== undefined && (maxRedemptions as number) > 0;
	const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
	const hasTimeLimit = discount.validUntil ? new Date(discount.validUntil) < oneYearFromNow : false;
	const dynamicSegmentBlocked = hasTargetSegments && !hasTargetUsers && (hasRedemptionLimit || hasTimeLimit);

	// ── Template variable validation ─────────────────────────────────────────────
	const activeHtml = useMemo(
		() => (templateMode === "existing" && selectedTemplate?.htmlBody ? selectedTemplate.htmlBody : htmlBody),
		[templateMode, selectedTemplate, htmlBody],
	);

	const templateVars = useMemo(() => extractTemplateVars(activeHtml), [activeHtml]);

	const discountVarsInHtml = useMemo(() => templateVars.filter((v) => DISCOUNT_VARS.has(v.toLowerCase())), [templateVars]);

	const unknownVarsInHtml = useMemo(
		() => templateVars.filter((v) => !AUTO_REPLACED_VARS.has(v) && !DISCOUNT_VARS.has(v.toLowerCase())),
		[templateVars],
	);

	const hasDiscountCodeMentioned = useMemo(
		() =>
			activeHtml.includes(discount.code) ||
			discountVarsInHtml.some((v) => ["code", "discountcode", "promocode", "coupon"].includes(v.toLowerCase())),
		[activeHtml, discount.code, discountVarsInHtml],
	);

	// ── Load templates ────────────────────────────────────────────────────────────
	const fetchTemplates = useCallback(async () => {
		if (templates.length > 0) return;
		setTemplatesLoading(true);
		try {
			const res = await discountCampaignService.getMarketingTemplates();
			setTemplates(res.data || []);
		} catch {
			enqueueSnackbar("No se pudieron cargar los templates del servidor de marketing", { variant: "warning" });
		} finally {
			setTemplatesLoading(false);
		}
	}, [templates.length, enqueueSnackbar]);

	useEffect(() => {
		if (templateMode === "existing") {
			fetchTemplates();
		}
	}, [templateMode, fetchTemplates]);

	// When a template is selected, pre-fill subject and htmlBody for editing
	const handleTemplateSelect = useCallback(
		(template: MarketingTemplate | null) => {
			setSelectedTemplate(template);
			if (template) {
				setSubject(template.subject || subject);
				if (template.htmlBody) {
					setHtmlBody(template.htmlBody);
				}
			}
		},
		[subject],
	);

	// ── Submit ────────────────────────────────────────────────────────────────────
	const handleSubmit = async () => {
		if (!subject.trim() || !htmlBody.trim()) {
			enqueueSnackbar("El asunto y el cuerpo del email son obligatorios", { variant: "warning" });
			return;
		}
		if (dynamicSegmentBlocked) {
			enqueueSnackbar("No se puede lanzar: segmento dinámico incompatible con las restricciones del descuento", {
				variant: "error",
			});
			return;
		}
		setLoading(true);
		setError(null);
		setResult(null);
		try {
			const response = await discountCampaignService.launchCampaign(discount._id, {
				subject,
				htmlBody,
				campaignName,
				fromName,
				launchImmediately,
				startDate: startDate || undefined,
				throttleRate,
				allowedDays,
				timeWindow: { start: timeWindowStart, end: timeWindowEnd },
			});
			setResult(response.data);
			enqueueSnackbar(response.message, { variant: "success" });
		} catch (err: any) {
			const msg = err.response?.data?.message || err.message || "Error al lanzar la campaña";
			setError(msg);
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	const canSubmit = !loading && subject.trim().length > 0 && htmlBody.trim().length > 0 && !dynamicSegmentBlocked;

	return (
		<Stack spacing={3}>
			{/* ── 1. Destinatarios y validación de segmento ──────────────────────────── */}
			<Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
				<Stack direction="row" spacing={1.5} alignItems="flex-start">
					<People size={20} color={theme.palette.primary.main} style={{ marginTop: 2 }} />
					<Box flex={1}>
						<Typography variant="subtitle2" fontWeight={600} gutterBottom>
							Destinatarios
						</Typography>

						{!hasRecipients ? (
							<Alert severity="warning" sx={{ mt: 0.5 }}>
								Esta promoción no tiene <strong>targetUsers</strong> ni <strong>targetSegments</strong> configurados. Agregá destinatarios
								en el tab &ldquo;Usuarios Objetivo&rdquo; antes de lanzar una campaña.
							</Alert>
						) : (
							<Stack spacing={1.5}>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									{(targetSegments as any[]).map((seg: any) => (
										<Chip key={seg._id || seg} label={`Segmento: ${seg.name || seg}`} size="small" color="secondary" variant="outlined" />
									))}
									{hasTargetUsers && (
										<Chip
											label={`${(targetUsers as string[]).length} usuario${(targetUsers as string[]).length !== 1 ? "s" : ""} específico${
												(targetUsers as string[]).length !== 1 ? "s" : ""
											}`}
											size="small"
											color="primary"
											variant="outlined"
										/>
									)}
								</Stack>

								{/* Tipo de segmento + explicación */}
								{hasTargetUsers && !hasTargetSegments && (
									<Alert severity="success" icon={<TickCircle size={16} />} sx={{ py: 0.5 }}>
										<Typography variant="caption">
											<strong>Segmento estático</strong> — se creará un grupo fijo con los {(targetUsers as string[]).length} usuarios
											configurados. Compatible con cualquier descuento.
										</Typography>
									</Alert>
								)}
								{hasTargetSegments && !hasTargetUsers && !dynamicSegmentBlocked && (
									<Alert severity="info" icon={<InfoCircle size={16} />} sx={{ py: 0.5 }}>
										<Typography variant="caption">
											<strong>Segmento dinámico</strong> — se usará el segmento existente del servidor de marketing. Los nuevos contactos
											que ingresen al segmento después del lanzamiento también recibirán el email.
										</Typography>
									</Alert>
								)}
								{hasTargetSegments && !hasTargetUsers && !dynamicSegmentBlocked && (
									<Alert severity="success" icon={<TickCircle size={16} />} sx={{ py: 0.5 }}>
										<Typography variant="caption">
											El descuento no tiene límite de usos totales y su vigencia supera 1 año →{" "}
											<strong>compatible con segmento dinámico.</strong>
										</Typography>
									</Alert>
								)}

								{/* ── Bloqueo: segmento dinámico + restricciones ── */}
								{dynamicSegmentBlocked && (
									<Alert severity="error" icon={<CloseCircle size={18} />}>
										<AlertTitle sx={{ fontSize: "0.8rem", fontWeight: 700 }}>Segmento dinámico incompatible con este descuento</AlertTitle>
										<Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
											Los segmentos dinámicos incorporan nuevos contactos continuamente. Esto es peligroso cuando el descuento tiene
											restricciones:
										</Typography>
										<Stack component="ul" spacing={0.3} sx={{ m: 0, pl: 2 }}>
											{hasRedemptionLimit && (
												<Typography variant="caption" component="li">
													<strong>Límite de usos:</strong> {maxRedemptions} canjeos totales — nuevos contactos podrían superar el límite.
												</Typography>
											)}
											{hasTimeLimit && (
												<Typography variant="caption" component="li">
													<strong>Vigencia:</strong> vence el {new Date(discount.validUntil).toLocaleDateString("es-AR")} (menos de 1 año) —
													los contactos agregados después no podrán usarlo.
												</Typography>
											)}
										</Stack>
										<Typography variant="caption" component="div" sx={{ mt: 0.5, fontWeight: 600 }}>
											Solución: agregá los usuarios como <em>targetUsers</em> específicos (generan segmento estático), o usá un descuento
											sin límite de uso y con vigencia mayor a 1 año.
										</Typography>
									</Alert>
								)}
							</Stack>
						)}
					</Box>
				</Stack>
			</Paper>

			{hasRecipients && !dynamicSegmentBlocked && (
				<>
					{/* ── 2. Selección de template ─────────────────────────────────────────── */}
					<Box>
						<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<DocumentText size={18} />
							Template del email
						</Typography>

						{/* Modo de template */}
						<Stack direction="row" spacing={1} mb={2}>
							{(["new", "existing"] as const).map((mode) => (
								<Button
									key={mode}
									size="small"
									variant={templateMode === mode ? "contained" : "outlined"}
									onClick={() => setTemplateMode(mode)}
									sx={{ textTransform: "none" }}
								>
									{mode === "new" ? "✏️ Crear template nuevo" : "📂 Cargar desde repositorio"}
								</Button>
							))}
						</Stack>

						{templateMode === "existing" && (
							<Stack spacing={2}>
								{/* Explicación del modo */}
								<Paper
									variant="outlined"
									sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.3) }}
								>
									<Stack direction="row" spacing={1} alignItems="flex-start">
										<InfoCircle size={16} color={theme.palette.info.main} style={{ marginTop: 2, flexShrink: 0 }} />
										<Typography variant="caption" color="text.secondary">
											Seleccioná un template del repositorio de marketing como <strong>punto de partida</strong>. Su contenido se cargará en
											el editor para que puedas personalizarlo. Al lanzar, siempre se crea un
											<strong> template nuevo</strong> específico para esta campaña.
										</Typography>
									</Stack>
								</Paper>

								{/* Selector de template */}
								<Autocomplete
									options={templates}
									loading={templatesLoading}
									getOptionLabel={(t) => `${t.name} (${t.category})`}
									value={selectedTemplate}
									onChange={(_, val) => handleTemplateSelect(val)}
									renderOption={(props, t) => (
										<Box component="li" {...props} key={t._id}>
											<Stack>
												<Typography variant="body2" fontWeight={600}>
													{t.name}
												</Typography>
												<Stack direction="row" spacing={0.5} flexWrap="wrap">
													<Chip label={t.category} size="small" variant="outlined" sx={{ fontSize: "0.6rem" }} />
													{t.variables?.slice(0, 4).map((v) => (
														<Chip key={v} label={`{{${v}}}`} size="small" sx={{ fontSize: "0.6rem", fontFamily: "monospace" }} />
													))}
													{(t.variables?.length || 0) > 4 && (
														<Chip label={`+${(t.variables?.length || 0) - 4} vars`} size="small" sx={{ fontSize: "0.6rem" }} />
													)}
												</Stack>
											</Stack>
										</Box>
									)}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Buscar template"
											size="small"
											placeholder="Escribí para filtrar..."
											InputProps={{
												...params.InputProps,
												endAdornment: (
													<>
														{templatesLoading && <CircularProgress size={14} />}
														{params.InputProps.endAdornment}
													</>
												),
											}}
										/>
									)}
								/>

								{/* Info del template seleccionado */}
								{selectedTemplate && (
									<Paper variant="outlined" sx={{ p: 1.5, bgcolor: alpha(theme.palette.success.main, 0.04) }}>
										<Stack spacing={0.5}>
											<Typography variant="caption" fontWeight={700}>
												Template cargado: {selectedTemplate.name}
											</Typography>
											{selectedTemplate.description && (
												<Typography variant="caption" color="text.secondary">
													{selectedTemplate.description}
												</Typography>
											)}
											{(selectedTemplate.variables?.length || 0) > 0 && (
												<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
													<Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
														Variables declaradas:
													</Typography>
													{selectedTemplate.variables.map((v) => {
														const isAuto = AUTO_REPLACED_VARS.has(v);
														const isDiscount = DISCOUNT_VARS.has(v.toLowerCase());
														return (
															<Tooltip
																key={v}
																title={
																	isAuto
																		? "Reemplazada automáticamente por el servidor de marketing"
																		: isDiscount
																		? "Variable de descuento — NO se reemplaza automáticamente"
																		: "Variable desconocida — quedará vacía si no se provee"
																}
															>
																<Chip
																	label={`{{${v}}}`}
																	size="small"
																	color={isAuto ? "success" : isDiscount ? "warning" : "default"}
																	variant="outlined"
																	sx={{ fontSize: "0.6rem", fontFamily: "monospace", cursor: "help" }}
																/>
															</Tooltip>
														);
													})}
												</Stack>
											)}
										</Stack>
									</Paper>
								)}
							</Stack>
						)}

						{/* ── Validaciones de variables en el HTML ── */}
						<Stack spacing={1} mt={templateMode === "existing" ? 2 : 0}>
							{!hasDiscountCodeMentioned && (htmlBody.trim().length > 0 || selectedTemplate) && (
								<Alert severity="warning" icon={<Warning2 size={16} />} sx={{ py: 0.5 }}>
									<Typography variant="caption">
										<strong>El HTML no menciona el código de descuento.</strong> Asegurate de incluir <code>{discount.code}</code> en el
										cuerpo del email para que el destinatario pueda usarlo.
									</Typography>
								</Alert>
							)}
							{discountVarsInHtml.length > 0 && templateMode === "existing" && (
								<Alert severity="warning" icon={<Warning2 size={16} />} sx={{ py: 0.5 }}>
									<Typography variant="caption">
										<strong>Variables de descuento detectadas:</strong> {discountVarsInHtml.map((v) => `{{${v}}}`).join(", ")} — el servidor
										de marketing <strong>no las reemplaza automáticamente</strong>. Editá el HTML en el editor y reemplazalas con los
										valores reales (código: <code>{discount.code}</code>, vence: {new Date(discount.validUntil).toLocaleDateString("es-AR")}
										).
									</Typography>
								</Alert>
							)}
							{unknownVarsInHtml.length > 0 && (
								<Alert severity="info" icon={<InfoCircle size={16} />} sx={{ py: 0.5 }}>
									<Typography variant="caption">
										Variables no reconocidas (quedarán vacías): {unknownVarsInHtml.map((v) => `{{${v}}}`).join(", ")}. Si son intencionales,
										asegurate de que el contacto tenga esos valores en sus <code>customFields</code>.
									</Typography>
								</Alert>
							)}
						</Stack>
					</Box>

					<Divider />

					{/* ── 3. Configuración del email ───────────────────────────────────────── */}
					<Box>
						<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Sms size={18} />
							Configuración del email
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={12} md={8}>
								<TextField
									label="Nombre de la campaña"
									value={campaignName}
									onChange={(e) => setCampaignName(e.target.value)}
									fullWidth
									size="small"
									helperText="Identificador interno para esta campaña en el servidor de marketing"
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									label="Nombre del remitente"
									value={fromName}
									onChange={(e) => setFromName(e.target.value)}
									fullWidth
									size="small"
									helperText="Nombre visible en el cliente de email del destinatario"
								/>
							</Grid>
							<Grid item xs={12}>
								<TextField
									label="Asunto del email"
									value={subject}
									onChange={(e) => setSubject(e.target.value)}
									fullWidth
									size="small"
									required
									helperText="Las variables {{firstName}}, {{fullName}} serán reemplazadas automáticamente si están disponibles."
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Sms size={16} color={theme.palette.text.secondary} />
											</InputAdornment>
										),
									}}
								/>
							</Grid>
							<Grid item xs={12}>
								<TextField
									label="Cuerpo del email (HTML)"
									value={htmlBody}
									onChange={(e) => setHtmlBody(e.target.value)}
									fullWidth
									multiline
									rows={12}
									required
									inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
									helperText={
										templateMode === "existing" && selectedTemplate
											? "Contenido cargado desde el template seleccionado. Podés editarlo libremente antes de lanzar."
											: "HTML completo del email. Variables auto-reemplazadas: {{firstName}}, {{lastName}}, {{email}}, {{campaignName}}."
									}
								/>
							</Grid>
						</Grid>
					</Box>

					<Divider />

					{/* ── 4. Configuración de envío ────────────────────────────────────────── */}
					<Box>
						<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Calendar size={18} />
							Configuración de envío
						</Typography>

						<Grid container spacing={2} alignItems="flex-start">
							{/* Throttle y fecha */}
							<Grid item xs={12} md={4}>
								<TextField
									label="Throttle (emails por ciclo)"
									type="number"
									value={throttleRate}
									onChange={(e) => setThrottleRate(Number(e.target.value))}
									fullWidth
									size="small"
									inputProps={{ min: 1, max: 5000 }}
									helperText="Máx. emails procesados por ejecución del scheduler (cada ~10 min)"
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									label="Fecha de inicio"
									type="datetime-local"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									fullWidth
									size="small"
									InputLabelProps={{ shrink: true }}
									helperText="Vacío = comienza cuando se active la campaña"
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<Paper variant="outlined" sx={{ p: 1.5 }}>
									<FormControlLabel
										control={
											<Switch checked={launchImmediately} onChange={(e) => setLaunchImmediately(e.target.checked)} color="success" />
										}
										label={
											<Box>
												<Typography variant="body2" fontWeight={600}>
													Lanzar inmediatamente
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{launchImmediately ? "La campaña se activará al crear" : "Se guardará como borrador"}
												</Typography>
											</Box>
										}
									/>
								</Paper>
							</Grid>

							{/* Días permitidos */}
							<Grid item xs={12}>
								<FormControl component="fieldset">
									<FormLabel component="legend" sx={{ fontSize: "0.8rem", mb: 0.5, color: "text.secondary" }}>
										Días de envío permitidos
									</FormLabel>
									<ToggleButtonGroup
										value={allowedDays}
										onChange={(_, val: number[]) => val.length > 0 && setAllowedDays(val)}
										aria-label="días permitidos"
										size="small"
										sx={{ flexWrap: "wrap", gap: 0.5 }}
									>
										{ALL_DAYS.map((day) => (
											<ToggleButton
												key={day}
												value={day}
												aria-label={DAY_LABELS[day]}
												sx={{ minWidth: 46, fontSize: "0.7rem", fontWeight: 600 }}
											>
												{DAY_LABELS[day]}
											</ToggleButton>
										))}
									</ToggleButtonGroup>
									<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
										El scheduler solo procesará esta campaña en los días seleccionados (zona horaria: America/Argentina/Buenos_Aires)
									</Typography>
								</FormControl>
							</Grid>

							{/* Ventana horaria */}
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									label="Hora de inicio"
									type="time"
									value={timeWindowStart}
									onChange={(e) => setTimeWindowStart(e.target.value)}
									fullWidth
									size="small"
									InputLabelProps={{ shrink: true }}
									inputProps={{ step: 300 }}
									helperText="Hora más temprana de envío"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Timer1 size={14} color={theme.palette.text.secondary} />
											</InputAdornment>
										),
									}}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									label="Hora de fin"
									type="time"
									value={timeWindowEnd}
									onChange={(e) => setTimeWindowEnd(e.target.value)}
									fullWidth
									size="small"
									InputLabelProps={{ shrink: true }}
									inputProps={{ step: 300 }}
									helperText="Hora más tardía de envío"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<Timer1 size={14} color={theme.palette.text.secondary} />
											</InputAdornment>
										),
									}}
								/>
							</Grid>
						</Grid>
					</Box>

					<Divider />

					{/* ── 5. Resumen informativo ───────────────────────────────────────────── */}
					<Paper
						variant="outlined"
						sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.3) }}
					>
						<Stack direction="row" spacing={1} alignItems="flex-start">
							<InfoCircle size={18} color={theme.palette.info.main} style={{ marginTop: 2, flexShrink: 0 }} />
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary" fontWeight={600}>
									¿Qué sucede al lanzar?
								</Typography>
								<Typography variant="caption" color="text.secondary" component="div">
									<ol style={{ margin: 0, paddingLeft: 16 }}>
										<li>
											Se crea un <strong>EmailTemplate</strong> en el servidor de marketing con el HTML del editor.
										</li>
										<li>
											Se crea una <strong>Campaign</strong> de tipo <em>onetime</em> vinculada al segmento de destinatarios.
										</li>
										<li>
											Se crea un <strong>CampaignEmail</strong> que asocia template y campaña con la configuración de envío.
										</li>
										<li>
											Si "Lanzar inmediatamente" está activo, la campaña cambia a estado <em>active</em> y el scheduler de{" "}
											<code>la-marketing-service</code> comienza a procesar los envíos según los días/horarios y throttle configurados.
										</li>
									</ol>
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Variables automáticas disponibles en el template: <code>{"{{firstName}}"}</code>, <code>{"{{lastName}}"}</code>,{" "}
									<code>{"{{email}}"}</code>, <code>{"{{campaignName}}"}</code>, <code>{"{{today}}"}</code>.
								</Typography>
							</Stack>
						</Stack>
					</Paper>

					{/* ── Error ── */}
					{error && (
						<Alert severity="error" onClose={() => setError(null)}>
							{error}
						</Alert>
					)}

					{/* ── Resultado exitoso ── */}
					<Collapse in={!!result}>
						{result && (
							<Alert severity="success" icon={<TickCircle size={20} />} sx={{ "& .MuiAlert-message": { width: "100%" } }}>
								<Typography variant="subtitle2" gutterBottom>
									{result.status === "active" ? "¡Campaña lanzada!" : "Campaña creada como borrador"}
								</Typography>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.5}>
									<Chip label={`ID: ${result.campaignId}`} size="small" sx={{ fontFamily: "monospace", fontSize: "0.65rem" }} />
									<Chip label={`${result.recipientCount} destinatarios`} size="small" color="info" />
									<Chip
										label={result.status === "active" ? "Activa" : "Borrador"}
										size="small"
										color={result.status === "active" ? "success" : "default"}
									/>
									{result.segmentCreated && <Chip label="Segmento creado" size="small" color="secondary" variant="outlined" />}
								</Stack>
							</Alert>
						)}
					</Collapse>

					{/* ── Botón de envío ── */}
					<Box display="flex" justifyContent="flex-end">
						<Button
							variant="contained"
							color={launchImmediately ? "success" : "primary"}
							startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Send2 size={18} />}
							onClick={handleSubmit}
							disabled={!canSubmit}
							size="large"
						>
							{loading ? "Procesando..." : launchImmediately ? "Crear y lanzar campaña" : "Crear campaña en borrador"}
						</Button>
					</Box>
				</>
			)}

			{/* Bloqueo total por segmento dinámico incompatible */}
			{hasRecipients && dynamicSegmentBlocked && (
				<Box display="flex" justifyContent="flex-end">
					<Tooltip title="Resolvé el problema de segmento antes de continuar">
						<span>
							<Button variant="contained" disabled size="large" startIcon={<CloseCircle size={18} />}>
								Lanzar campaña (bloqueado)
							</Button>
						</span>
					</Tooltip>
				</Box>
			)}
		</Stack>
	);
};

function buildDefaultHtml(discount: DiscountCode): string {
	const discountText =
		discount.discountType === "percentage" ? `${discount.discountValue}% de descuento` : `$${discount.discountValue} de descuento`;

	return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1976d2;padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;">Law Analytics</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="color:#1a1a1a;margin:0 0 16px;">¡Hola {{firstName}}, tenés un descuento exclusivo!</h2>
          <p style="color:#555;font-size:16px;line-height:1.6;">Queremos darte acceso a una promoción especial: <strong>${discountText}</strong> en tu próxima suscripción.</p>
          <div style="text-align:center;margin:32px 0;">
            <div style="display:inline-block;background:#f0f7ff;border:2px dashed #1976d2;border-radius:8px;padding:16px 32px;">
              <p style="margin:0 0 8px;color:#555;font-size:14px;">Tu código de descuento:</p>
              <p style="margin:0;font-size:28px;font-weight:bold;color:#1976d2;letter-spacing:4px;font-family:monospace;">${
								discount.code
							}</p>
            </div>
          </div>
          <p style="color:#555;font-size:14px;line-height:1.6;">Válido hasta el <strong>${new Date(discount.validUntil).toLocaleDateString(
						"es-AR",
					)}</strong>. Usá este código al momento de suscribirte.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="https://lawanalytics.app/planes" style="background:#1976d2;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;">Ver planes</a>
          </div>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:12px;">© ${new Date().getFullYear()} Law Analytics · <a href="{{unsubscribeUrl}}" style="color:#999;">Desuscribirse</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default LaunchCampaignTab;
