import React, { useCallback, useEffect, useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";
import judicialNotificationConfigService, { WhatsAppTemplate, WhatsAppTemplatesData } from "api/judicialNotificationConfig";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Plantillas de WhatsApp (Meta) del aviso de novedades.
 *
 * Fuera de la ventana de 24 h, Meta solo deja mandar plantillas aprobadas. Acá
 * se elige cuál usa el canal, sin tocar secretos ni reiniciar: la-notification
 * lee la configuración con cache de 60 s.
 *
 *  - "Plantilla del aviso": la única (2 variables, todo en una línea).
 *  - "Familia por líneas": <familia>_1/_2/_3, una carpeta por renglón + botón
 *    "Ver lista completa". Si está elegida tiene prioridad; si todavía no está
 *    aprobada, el envío cae solo a la plantilla del aviso.
 *
 * El texto de cada plantilla se crea y edita en Meta (WhatsApp Manager), no acá.
 */

const STATUS_LABEL: Record<string, string> = {
	APPROVED: "Aprobada",
	PENDING: "En revisión",
	REJECTED: "Rechazada",
	PAUSED: "Pausada",
	DISABLED: "Deshabilitada",
};

const STATUS_NOTE: Record<string, string> = {
	PENDING: "Meta todavía la está revisando: no se puede usar hasta que la apruebe.",
	REJECTED: "Meta la rechazó: hay que corregir el texto y volver a crearla.",
	PAUSED: "Meta la pausó por baja calidad: no se entrega hasta que se reactive.",
	DISABLED: "Meta la deshabilitó: no se puede usar.",
};

const statusColor = (status: string, theme: any) => {
	switch (status) {
		case "APPROVED":
			return theme.palette.success.main;
		case "PENDING":
			return theme.palette.warning.main;
		default:
			return theme.palette.error.main;
	}
};

/** Familias <prefijo>_1/_2/_3 detectadas entre las plantillas de la WABA. */
function detectFamilies(templates: WhatsAppTemplate[]) {
	const byPrefix: Record<string, WhatsAppTemplate[]> = {};
	for (const t of templates) {
		const m = /^(.+)_([123])$/.exec(t.name);
		if (!m) continue;
		(byPrefix[m[1]] ||= []).push(t);
	}
	return Object.entries(byPrefix)
		.filter(([, list]) => list.length === 3)
		.map(([prefix, list]) => ({
			prefix,
			templates: list,
			approved: list.every((t) => t.status === "APPROVED"),
			pending: list.some((t) => t.status === "PENDING"),
			marketing: list.some((t) => t.category === "MARKETING"),
		}));
}

const WhatsAppTemplatesCard = () => {
	const theme = useTheme();
	const [data, setData] = useState<WhatsAppTemplatesData | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [digest, setDigest] = useState("");
	const [family, setFamily] = useState("");
	const [lang, setLang] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await judicialNotificationConfigService.getWhatsappTemplates();
			setData(result);
			setDigest(result.current.digest || "");
			setFamily(result.current.family || "");
			setLang(result.current.lang || "");
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudieron cargar las plantillas");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const templates = data?.templates || [];
	const families = useMemo(() => detectFamilies(templates), [templates]);
	const familyPrefixes = useMemo(() => new Set(families.map((f) => f.prefix)), [families]);
	// Para "plantilla del aviso" solo las sueltas (las de familia se eligen como familia).
	const singles = useMemo(
		() => templates.filter((t) => !(/^(.+)_([123])$/.exec(t.name) && familyPrefixes.has(/^(.+)_([123])$/.exec(t.name)![1]))),
		[templates, familyPrefixes],
	);
	const languages = useMemo(() => [...new Set(templates.map((t) => t.language))].sort(), [templates]);

	const dirty =
		!!data && (digest !== (data.current.digest || "") || family !== (data.current.family || "") || lang !== (data.current.lang || ""));

	const save = async () => {
		setSaving(true);
		try {
			await judicialNotificationConfigService.updateConfig({
				whatsappTemplates: { digest: digest || null, digestFamily: family, lang: lang || null },
			});
			dispatch(
				openSnackbar({
					open: true,
					message: "Plantillas actualizadas. Toma efecto en menos de un minuto.",
					variant: "alert",
					alert: { color: "success" },
					close: true,
				}),
			);
			await load();
		} catch (e: any) {
			dispatch(
				openSnackbar({
					open: true,
					message: e?.response?.data?.message || "No se pudieron guardar las plantillas",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setSaving(false);
		}
	};

	const selectedFamily = families.find((f) => f.prefix === family);
	const selectedDigest = templates.find((t) => t.name === digest);

	return (
		<Box sx={{ mt: 3 }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1 }}>
				<Box>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Plantillas de WhatsApp
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Fuera de la ventana de 24 h el aviso sale como plantilla aprobada por Meta. El texto se crea en WhatsApp Manager; acá se elige
						cuál se usa.
					</Typography>
				</Box>
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={load} disabled={loading}>
						<Refresh size={16} />
					</IconButton>
				</Tooltip>
			</Stack>

			{error && (
				<Alert severity="error" sx={{ mb: 1 }}>
					{error}
				</Alert>
			)}
			{data?.error && (
				<Alert severity="warning" sx={{ mb: 1 }}>
					No se pudo consultar Meta: {data.error}
				</Alert>
			)}

			{loading && !data ? (
				<Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
					<CircularProgress size={18} />
					<Typography variant="body2">Cargando…</Typography>
				</Stack>
			) : (
				<>
					<Stack direction="row" spacing={1.5} alignItems="flex-start" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
						<FormControl size="small" sx={{ minWidth: 260 }}>
							<InputLabel>Plantilla del aviso</InputLabel>
							<Select value={digest} label="Plantilla del aviso" onChange={(e) => setDigest(e.target.value)}>
								{singles.map((t) => (
									<MenuItem key={`${t.name}-${t.language}`} value={t.name} disabled={t.status !== "APPROVED"}>
										{t.name} {t.status !== "APPROVED" ? `— ${STATUS_LABEL[t.status] || t.status}` : ""}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl size="small" sx={{ minWidth: 260 }}>
							<InputLabel>Familia por líneas</InputLabel>
							<Select value={family} label="Familia por líneas" onChange={(e) => setFamily(e.target.value)}>
								<MenuItem value="">Ninguna (solo la plantilla del aviso)</MenuItem>
								{families.map((f) => (
									<MenuItem key={f.prefix} value={f.prefix}>
										{f.prefix}_1/2/3 {f.approved ? "" : f.pending ? "— en revisión" : "— no disponible"}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl size="small" sx={{ minWidth: 140 }}>
							<InputLabel>Idioma</InputLabel>
							<Select value={lang} label="Idioma" onChange={(e) => setLang(e.target.value)}>
								{languages.map((l) => (
									<MenuItem key={l} value={l}>
										{l}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<Button size="small" variant="contained" onClick={save} disabled={!dirty || saving} sx={{ mt: 0.5 }}>
							{saving ? "Guardando…" : "Guardar"}
						</Button>
					</Stack>

					{selectedFamily && !selectedFamily.approved && (
						<Alert severity="info" sx={{ mb: 1.5 }}>
							La familia <strong>{selectedFamily.prefix}</strong> {selectedFamily.pending ? "está en revisión" : "no está disponible"}:
							hasta que Meta la apruebe, los avisos salen con <strong>{digest || "la plantilla del aviso"}</strong>. No hay que hacer nada,
							el cambio es automático.
						</Alert>
					)}
					{(selectedDigest?.category === "MARKETING" || selectedFamily?.marketing) && (
						<Alert severity="warning" sx={{ mb: 1.5 }}>
							Hay una plantilla categorizada como <strong>Marketing</strong>: cuesta bastante más por aviso y Meta puede no entregarla (tope
							de mensajes de marketing por usuario). Conviene usar una de categoría Utility o apelar la categoría desde Ayuda para empresas.
						</Alert>
					)}

					<Box sx={{ overflowX: "auto" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Plantilla</TableCell>
									<TableCell>Idioma</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell>Categoría</TableCell>
									<TableCell>Notas</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{templates.map((t) => {
									const inUse = t.name === digest || (!!family && t.name.startsWith(`${family}_`));
									return (
										<TableRow key={`${t.name}-${t.language}`} hover>
											<TableCell sx={{ whiteSpace: "nowrap" }}>
												<Stack direction="row" spacing={0.75} alignItems="center">
													<Typography variant="body2" sx={{ fontWeight: inUse ? 700 : 400 }}>
														{t.name}
													</Typography>
													{inUse && (
														<Chip
															size="small"
															label="En uso"
															sx={{
																height: 18,
																fontSize: "0.65rem",
																fontWeight: 700,
																bgcolor: alpha(BRAND_BLUE, 0.12),
																color: BRAND_BLUE,
															}}
														/>
													)}
												</Stack>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{t.language}</Typography>
											</TableCell>
											<TableCell>
												<Chip
													size="small"
													label={STATUS_LABEL[t.status] || t.status}
													sx={{
														height: 20,
														fontSize: "0.68rem",
														fontWeight: 600,
														bgcolor: alpha(statusColor(t.status, theme), 0.12),
														color: statusColor(t.status, theme),
													}}
												/>
											</TableCell>
											<TableCell>
												<Chip
													size="small"
													label={t.category}
													sx={{
														height: 20,
														fontSize: "0.68rem",
														fontWeight: 600,
														bgcolor: alpha(t.category === "MARKETING" ? theme.palette.warning.main : theme.palette.info.main, 0.12),
														color: t.category === "MARKETING" ? theme.palette.warning.dark : theme.palette.info.dark,
													}}
												/>
											</TableCell>
											<TableCell sx={{ maxWidth: 420 }}>
												<Typography variant="caption" color="text.secondary">
													{STATUS_NOTE[t.status] || ""}
													{t.rejectedReason ? ` Motivo: ${t.rejectedReason}.` : ""}
													{t.previousCategory ? ` Meta le cambió la categoría (antes ${t.previousCategory}).` : ""}
												</Typography>
											</TableCell>
										</TableRow>
									);
								})}
								{templates.length === 0 && (
									<TableRow>
										<TableCell colSpan={5}>
											<Typography variant="body2" color="text.secondary">
												No hay plantillas en la cuenta de WhatsApp{data?.wabaId ? ` ${data.wabaId}` : ""}.
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</Box>
				</>
			)}
		</Box>
	);
};

export default WhatsAppTemplatesCard;
