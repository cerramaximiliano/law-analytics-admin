import { useState, useEffect, useRef, useCallback } from "react";
import {
	Box,
	Paper,
	Grid,
	Typography,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Autocomplete,
	Chip,
	Button,
	Stack,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Divider,
} from "@mui/material";
import { useSnackbar } from "notistack";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import emailComposerService, { RecipientOption } from "api/emailComposer";

const SENDERS = [
	{ value: "cuentas", label: "Cuentas (cuentas@lawanalytics.app)" },
	{ value: "soporte", label: "Soporte (soporte@lawanalytics.app)" },
];

const QUILL_MODULES = {
	toolbar: [
		["bold", "italic", "underline"],
		[{ list: "ordered" }, { list: "bullet" }],
		["link"],
		["clean"],
	],
};

const EMAIL_RE = /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/;

const EmailComposer = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [from, setFrom] = useState<"cuentas" | "soporte">("cuentas");
	const [recipients, setRecipients] = useState<string[]>([]);
	const [subject, setSubject] = useState("");
	const [content, setContent] = useState("");
	const [signature, setSignature] = useState("Saludos cordiales,\nMaximiliano — Equipo Law||Analytics");
	const [ctaText, setCtaText] = useState("");
	const [ctaUrl, setCtaUrl] = useState("");

	// Búsqueda de destinatarios
	const [options, setOptions] = useState<RecipientOption[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [searching, setSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Preview
	const [previewHtml, setPreviewHtml] = useState("");
	const [loadingPreview, setLoadingPreview] = useState(false);

	// Envío
	const [sending, setSending] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		const q = inputValue.trim();
		if (q.length < 2) {
			setOptions([]);
			return;
		}
		debounceRef.current = setTimeout(async () => {
			try {
				setSearching(true);
				const res = await emailComposerService.searchRecipients(q);
				setOptions(res);
			} catch {
				setOptions([]);
			} finally {
				setSearching(false);
			}
		}, 350);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [inputValue]);

	const refreshPreview = useCallback(async () => {
		try {
			setLoadingPreview(true);
			const html = await emailComposerService.preview({ subject, contentHtml: content, signature, ctaText, ctaUrl });
			setPreviewHtml(html);
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error generando vista previa", { variant: "error" });
		} finally {
			setLoadingPreview(false);
		}
	}, [subject, content, signature, ctaText, ctaUrl, enqueueSnackbar]);

	const invalidRecipients = recipients.filter((r) => !EMAIL_RE.test(r));
	const canSend = recipients.length > 0 && invalidRecipients.length === 0 && subject.trim() && content.replace(/<(.|\n)*?>/g, "").trim();

	const doSend = async () => {
		setConfirmOpen(false);
		try {
			setSending(true);
			const res = await emailComposerService.send({
				from,
				recipients,
				subject: subject.trim(),
				contentHtml: content,
				signature,
				ctaText: ctaText.trim() || undefined,
				ctaUrl: ctaUrl.trim() || undefined,
			});
			if (res.success) {
				const failed = res.total - res.sent;
				enqueueSnackbar(
					`Enviados ${res.sent}/${res.total}${failed > 0 ? ` (${failed} fallidos)` : ""}`,
					{ variant: failed > 0 ? "warning" : "success" }
				);
			} else {
				enqueueSnackbar("No se pudo enviar", { variant: "error" });
			}
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e?.message || "Error al enviar", { variant: "error" });
		} finally {
			setSending(false);
		}
	};

	return (
		<Box>
			<Typography variant="h4" sx={{ mb: 0.5 }}>
				Compositor de Emails
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Diseño unificado (logo, firma y footer ya incluidos). Solo elegí remitente, destinatarios y escribí el contenido.
			</Typography>

			<Grid container spacing={3}>
				{/* Formulario */}
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
						<Stack spacing={2.5}>
							<FormControl size="small" fullWidth>
								<InputLabel>Remitente</InputLabel>
								<Select value={from} label="Remitente" onChange={(e) => setFrom(e.target.value as "cuentas" | "soporte")}>
									{SENDERS.map((s) => (
										<MenuItem key={s.value} value={s.value}>
											{s.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							<Autocomplete
								multiple
								freeSolo
								size="small"
								options={options}
								filterOptions={(x) => x}
								loading={searching}
								inputValue={inputValue}
								onInputChange={(_, v) => setInputValue(v)}
								getOptionLabel={(o) => (typeof o === "string" ? o : o.email)}
								value={recipients}
								onChange={(_, vals) => {
									const emails = vals.map((v) => (typeof v === "string" ? v.trim().toLowerCase() : v.email.toLowerCase()));
									setRecipients([...new Set(emails)]);
								}}
								renderOption={(props, option) => (
									<li {...props} key={option.email}>
										<Stack>
											<Typography variant="body2">{option.name}</Typography>
											<Typography variant="caption" color="text.secondary">
												{option.email} · {option.source}
											</Typography>
										</Stack>
									</li>
								)}
								renderTags={(value, getTagProps) =>
									value.map((opt, index) => {
										const email = typeof opt === "string" ? opt : opt.email;
										const bad = !EMAIL_RE.test(email);
										return (
											<Chip
												{...getTagProps({ index })}
												key={email}
												label={email}
												size="small"
												color={bad ? "error" : "default"}
											/>
										);
									})
								}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Destinatarios"
										placeholder="Buscar usuario/contacto o escribir un email"
										helperText={
											invalidRecipients.length > 0
												? `Hay ${invalidRecipients.length} email(s) inválido(s)`
												: "Enter para agregar un email manual. Máx. 50 por envío."
										}
										error={invalidRecipients.length > 0}
										InputProps={{
											...params.InputProps,
											endAdornment: (
												<>
													{searching ? <CircularProgress size={16} /> : null}
													{params.InputProps.endAdornment}
												</>
											),
										}}
									/>
								)}
							/>

							<TextField
								size="small"
								fullWidth
								label="Asunto"
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
							/>

							<Box>
								<Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
									Contenido
								</Typography>
								<ReactQuill theme="snow" value={content} onChange={setContent} modules={QUILL_MODULES} />
							</Box>

							<TextField
								size="small"
								fullWidth
								multiline
								minRows={2}
								label="Firma"
								value={signature}
								onChange={(e) => setSignature(e.target.value)}
							/>

							<Divider textAlign="left">
								<Typography variant="caption" color="text.secondary">
									Botón (opcional)
								</Typography>
							</Divider>
							<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
								<TextField
									size="small"
									fullWidth
									label="Texto del botón"
									value={ctaText}
									onChange={(e) => setCtaText(e.target.value)}
								/>
								<TextField
									size="small"
									fullWidth
									label="URL del botón"
									value={ctaUrl}
									onChange={(e) => setCtaUrl(e.target.value)}
									error={!!ctaText && !ctaUrl}
								/>
							</Stack>

							<Stack direction="row" spacing={2}>
								<Button variant="outlined" onClick={refreshPreview} disabled={loadingPreview}>
									{loadingPreview ? "Generando…" : "Vista previa"}
								</Button>
								<Button
									variant="contained"
									disabled={!canSend || sending}
									onClick={() => setConfirmOpen(true)}
								>
									{sending ? "Enviando…" : `Enviar${recipients.length ? ` (${recipients.length})` : ""}`}
								</Button>
							</Stack>
						</Stack>
					</Paper>
				</Grid>

				{/* Preview */}
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 1, borderRadius: 2, height: "100%", minHeight: 480 }}>
						<Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
							Vista previa
						</Typography>
						{previewHtml ? (
							<Box
								component="iframe"
								title="preview"
								srcDoc={previewHtml}
								sx={{ width: "100%", height: 560, border: "none", mt: 0.5 }}
							/>
						) : (
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 480, color: "text.secondary" }}>
								<Typography variant="body2">Tocá "Vista previa" para ver el email renderizado</Typography>
							</Box>
						)}
					</Paper>
				</Grid>
			</Grid>

			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>Confirmar envío</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Vas a enviar este correo desde <strong>{from === "cuentas" ? "cuentas@" : "soporte@"}lawanalytics.app</strong> a{" "}
						<strong>{recipients.length}</strong> destinatario(s). ¿Confirmás?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={doSend}>
						Enviar
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default EmailComposer;
