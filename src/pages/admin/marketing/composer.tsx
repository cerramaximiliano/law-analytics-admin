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
	Tabs,
	Tab,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	TableContainer,
	IconButton,
	Tooltip,
} from "@mui/material";
import { useSnackbar } from "notistack";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Trash, DocumentText, Send2 } from "iconsax-react";
import emailComposerService, { RecipientOption, EmailDraft } from "api/emailComposer";
import EmailLogsService from "api/emailLogs";
import { EmailLog } from "types/email-log";

const SENDERS = [
	{ value: "cuentas", label: "Cuentas (cuentas@lawanalytics.app)" },
	{ value: "soporte", label: "Soporte (soporte@lawanalytics.app)" },
];

const QUILL_MODULES = {
	toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
};

const EMAIL_RE = /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/;
const DEFAULT_SIGNATURE = "Saludos cordiales,\nMaximiliano — Equipo Law||Analytics";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("es-AR") : "—");

const EmailComposer = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [tab, setTab] = useState(0);

	// Estado de composición
	const [from, setFrom] = useState<"cuentas" | "soporte">("cuentas");
	const [recipients, setRecipients] = useState<string[]>([]);
	const [subject, setSubject] = useState("");
	const [content, setContent] = useState("");
	const [signature, setSignature] = useState(DEFAULT_SIGNATURE);
	const [ctaText, setCtaText] = useState("");
	const [ctaUrl, setCtaUrl] = useState("");
	const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

	// Búsqueda destinatarios
	const [options, setOptions] = useState<RecipientOption[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [searching, setSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Preview / envío
	const [previewHtml, setPreviewHtml] = useState("");
	const [loadingPreview, setLoadingPreview] = useState(false);
	const [sending, setSending] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	// Borradores
	const [drafts, setDrafts] = useState<EmailDraft[]>([]);
	const [loadingDrafts, setLoadingDrafts] = useState(false);
	const [savingDraft, setSavingDraft] = useState(false);

	// Enviados
	const [sentLogs, setSentLogs] = useState<EmailLog[]>([]);
	const [loadingSent, setLoadingSent] = useState(false);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		const q = inputValue.trim();
		if (q.length < 2) { setOptions([]); return; }
		debounceRef.current = setTimeout(async () => {
			try { setSearching(true); setOptions(await emailComposerService.searchRecipients(q)); }
			catch { setOptions([]); }
			finally { setSearching(false); }
		}, 350);
		return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
	}, [inputValue]);

	const fetchDrafts = useCallback(async () => {
		try { setLoadingDrafts(true); setDrafts(await emailComposerService.listDrafts()); }
		catch (e: any) { enqueueSnackbar(e?.message || "Error cargando borradores", { variant: "error" }); }
		finally { setLoadingDrafts(false); }
	}, [enqueueSnackbar]);

	const fetchSent = useCallback(async () => {
		try {
			setLoadingSent(true);
			const res = await EmailLogsService.getEmailLogs({ templateName: "composer", page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
			if (res.success) setSentLogs(res.data);
		} catch (e: any) { enqueueSnackbar(e?.message || "Error cargando enviados", { variant: "error" }); }
		finally { setLoadingSent(false); }
	}, [enqueueSnackbar]);

	useEffect(() => { fetchDrafts(); }, [fetchDrafts]);
	useEffect(() => { if (tab === 2) fetchSent(); }, [tab, fetchSent]);

	const resetForm = () => {
		setFrom("cuentas"); setRecipients([]); setSubject(""); setContent("");
		setSignature(DEFAULT_SIGNATURE); setCtaText(""); setCtaUrl(""); setCurrentDraftId(null); setPreviewHtml("");
	};

	const loadDraft = (d: EmailDraft) => {
		setFrom(d.from || "cuentas");
		setRecipients(d.recipients || []);
		setSubject(d.subject || "");
		setContent(d.contentHtml || "");
		setSignature(d.signature || "");
		setCtaText(d.ctaText || "");
		setCtaUrl(d.ctaUrl || "");
		setCurrentDraftId(d._id);
		setPreviewHtml("");
		setTab(0);
		enqueueSnackbar(`Borrador "${d.title}" cargado`, { variant: "info" });
	};

	const saveDraft = async () => {
		const payload = {
			title: subject.trim() || "Borrador sin título",
			from, recipients, subject, contentHtml: content, signature, ctaText, ctaUrl,
		};
		try {
			setSavingDraft(true);
			if (currentDraftId) {
				await emailComposerService.updateDraft(currentDraftId, payload);
				enqueueSnackbar("Borrador actualizado", { variant: "success" });
			} else {
				const d = await emailComposerService.createDraft(payload);
				setCurrentDraftId(d._id);
				enqueueSnackbar("Borrador guardado", { variant: "success" });
			}
			fetchDrafts();
		} catch (e: any) { enqueueSnackbar(e?.message || "Error guardando borrador", { variant: "error" }); }
		finally { setSavingDraft(false); }
	};

	const deleteDraft = async (id: string) => {
		try {
			await emailComposerService.deleteDraft(id);
			setDrafts((prev) => prev.filter((d) => d._id !== id));
			if (currentDraftId === id) setCurrentDraftId(null);
			enqueueSnackbar("Borrador eliminado", { variant: "success" });
		} catch (e: any) { enqueueSnackbar(e?.message || "Error eliminando", { variant: "error" }); }
	};

	const refreshPreview = useCallback(async () => {
		try {
			setLoadingPreview(true);
			setPreviewHtml(await emailComposerService.preview({ subject, contentHtml: content, signature, ctaText, ctaUrl }));
		} catch (e: any) { enqueueSnackbar(e?.message || "Error en vista previa", { variant: "error" }); }
		finally { setLoadingPreview(false); }
	}, [subject, content, signature, ctaText, ctaUrl, enqueueSnackbar]);

	const invalidRecipients = recipients.filter((r) => !EMAIL_RE.test(r));
	const canSend = recipients.length > 0 && invalidRecipients.length === 0 && !!subject.trim() && !!content.replace(/<(.|\n)*?>/g, "").trim();

	const doSend = async () => {
		setConfirmOpen(false);
		try {
			setSending(true);
			const res = await emailComposerService.send({
				from, recipients, subject: subject.trim(), contentHtml: content, signature,
				ctaText: ctaText.trim() || undefined, ctaUrl: ctaUrl.trim() || undefined,
			});
			if (res.success) {
				const failed = res.total - res.sent;
				enqueueSnackbar(`Enviados ${res.sent}/${res.total}${failed > 0 ? ` (${failed} fallidos)` : ""}`, { variant: failed > 0 ? "warning" : "success" });
			}
		} catch (e: any) { enqueueSnackbar(e?.response?.data?.message || e?.message || "Error al enviar", { variant: "error" }); }
		finally { setSending(false); }
	};

	const statusColor: Record<string, "info" | "success" | "error" | "warning" | "default"> = {
		sent: "info", delivered: "success", failed: "error", bounced: "warning", complained: "warning",
	};

	return (
		<Box>
			<Typography variant="h4" sx={{ mb: 0.5 }}>Compositor de Emails</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Diseño unificado (logo, firma y footer ya incluidos). Elegí remitente, destinatarios y escribí el contenido.
			</Typography>

			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
				<Tab label="Componer" />
				<Tab label={`Borradores${drafts.length ? ` (${drafts.length})` : ""}`} />
				<Tab label="Enviados" />
			</Tabs>

			{/* TAB 0 — Componer */}
			{tab === 0 && (
				<Grid container spacing={3}>
					<Grid item xs={12} md={6}>
						<Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
							<Stack spacing={2.5}>
								{currentDraftId && (
									<Chip label="Editando un borrador" size="small" color="info" onDelete={resetForm} sx={{ alignSelf: "flex-start" }} />
								)}
								<FormControl size="small" fullWidth>
									<InputLabel>Remitente</InputLabel>
									<Select value={from} label="Remitente" onChange={(e) => setFrom(e.target.value as "cuentas" | "soporte")}>
										{SENDERS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
									</Select>
								</FormControl>

								<Autocomplete
									multiple freeSolo size="small" options={options} filterOptions={(x) => x}
									loading={searching} inputValue={inputValue} onInputChange={(_, v) => setInputValue(v)}
									getOptionLabel={(o) => (typeof o === "string" ? o : o.email)}
									value={recipients}
									onChange={(_, vals) => setRecipients([...new Set(vals.map((v) => (typeof v === "string" ? v.trim().toLowerCase() : v.email.toLowerCase())))])}
									renderOption={(props, option) => (
										<li {...props} key={option.email}>
											<Stack><Typography variant="body2">{option.name}</Typography>
												<Typography variant="caption" color="text.secondary">{option.email} · {option.source}</Typography></Stack>
										</li>
									)}
									renderTags={(value, getTagProps) => value.map((opt, index) => {
										const email = typeof opt === "string" ? opt : opt.email;
										return <Chip {...getTagProps({ index })} key={email} label={email} size="small" color={!EMAIL_RE.test(email) ? "error" : "default"} />;
									})}
									renderInput={(params) => (
										<TextField {...params} label="Destinatarios" placeholder="Buscar usuario/contacto o escribir un email"
											helperText={invalidRecipients.length > 0 ? `Hay ${invalidRecipients.length} email(s) inválido(s)` : "Enter para agregar un email manual. Máx. 50 por envío."}
											error={invalidRecipients.length > 0}
											InputProps={{ ...params.InputProps, endAdornment: (<>{searching ? <CircularProgress size={16} /> : null}{params.InputProps.endAdornment}</>) }} />
									)}
								/>

								<TextField size="small" fullWidth label="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} />

								<Box>
									<Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Contenido</Typography>
									<ReactQuill theme="snow" value={content} onChange={setContent} modules={QUILL_MODULES} />
								</Box>

								<TextField size="small" fullWidth multiline minRows={2} label="Firma" value={signature} onChange={(e) => setSignature(e.target.value)} />

								<Divider textAlign="left"><Typography variant="caption" color="text.secondary">Botón (opcional)</Typography></Divider>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
									<TextField size="small" fullWidth label="Texto del botón" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
									<TextField size="small" fullWidth label="URL del botón" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} error={!!ctaText && !ctaUrl} />
								</Stack>

								<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
									<Button variant="outlined" onClick={refreshPreview} disabled={loadingPreview}>{loadingPreview ? "Generando…" : "Vista previa"}</Button>
									<Button variant="outlined" color="secondary" startIcon={<DocumentText size={16} />} onClick={saveDraft} disabled={savingDraft}>
										{savingDraft ? "Guardando…" : currentDraftId ? "Actualizar borrador" : "Guardar borrador"}
									</Button>
									{currentDraftId && <Button variant="text" onClick={resetForm}>Nuevo</Button>}
									<Button variant="contained" startIcon={<Send2 size={16} />} disabled={!canSend || sending} onClick={() => setConfirmOpen(true)}>
										{sending ? "Enviando…" : `Enviar${recipients.length ? ` (${recipients.length})` : ""}`}
									</Button>
								</Stack>
							</Stack>
						</Paper>
					</Grid>

					<Grid item xs={12} md={6}>
						<Paper variant="outlined" sx={{ p: 1, borderRadius: 2, height: "100%", minHeight: 480 }}>
							<Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>Vista previa</Typography>
							{previewHtml ? (
								<Box component="iframe" title="preview" srcDoc={previewHtml} sx={{ width: "100%", height: 560, border: "none", mt: 0.5 }} />
							) : (
								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 480, color: "text.secondary" }}>
									<Typography variant="body2">Tocá "Vista previa" para ver el email renderizado</Typography>
								</Box>
							)}
						</Paper>
					</Grid>
				</Grid>
			)}

			{/* TAB 1 — Borradores */}
			{tab === 1 && (
				<Paper variant="outlined" sx={{ borderRadius: 2 }}>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Título</TableCell>
									<TableCell>Asunto</TableCell>
									<TableCell>Destinatarios</TableCell>
									<TableCell>Actualizado</TableCell>
									<TableCell align="right">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loadingDrafts ? (
									<TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={26} /></TableCell></TableRow>
								) : drafts.length === 0 ? (
									<TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><Typography color="text.secondary">No hay borradores</Typography></TableCell></TableRow>
								) : (
									drafts.map((d) => (
										<TableRow key={d._id} hover>
											<TableCell>{d.title}</TableCell>
											<TableCell><Typography variant="body2" sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subject || "—"}</Typography></TableCell>
											<TableCell>{d.recipients?.length || 0}</TableCell>
											<TableCell><Typography variant="caption">{fmtDate(d.updatedAt)}</Typography></TableCell>
											<TableCell align="right">
												<Button size="small" variant="outlined" onClick={() => loadDraft(d)} sx={{ mr: 1 }}>Cargar</Button>
												<Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => deleteDraft(d._id)}><Trash size={18} /></IconButton></Tooltip>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			)}

			{/* TAB 2 — Enviados */}
			{tab === 2 && (
				<Paper variant="outlined" sx={{ borderRadius: 2 }}>
					<Stack direction="row" justifyContent="flex-end" sx={{ p: 1 }}>
						<Button size="small" onClick={fetchSent} disabled={loadingSent}>Refrescar</Button>
					</Stack>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Destinatario</TableCell>
									<TableCell>Asunto</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell>Fecha</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loadingSent ? (
									<TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress size={26} /></TableCell></TableRow>
								) : sentLogs.length === 0 ? (
									<TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><Typography color="text.secondary">Sin envíos todavía</Typography></TableCell></TableRow>
								) : (
									sentLogs.map((log) => (
										<TableRow key={log._id} hover>
											<TableCell>{log.to}</TableCell>
											<TableCell><Typography variant="body2" sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.subject}</Typography></TableCell>
											<TableCell align="center"><Chip size="small" label={log.status} color={statusColor[log.status] || "default"} /></TableCell>
											<TableCell><Typography variant="caption">{fmtDate(log.createdAt)}</Typography></TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			)}

			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>Confirmar envío</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Vas a enviar este correo desde <strong>{from === "cuentas" ? "cuentas@" : "soporte@"}lawanalytics.app</strong> a <strong>{recipients.length}</strong> destinatario(s). ¿Confirmás?
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={doSend}>Enviar</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default EmailComposer;
