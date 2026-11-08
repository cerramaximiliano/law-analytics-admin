import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Paper,
	Stack,
	Switch,
	Tab,
	Tabs,
	Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import mktAxios from "utils/mktAxios";
import { CausasUpdateConfig, CausasUpdateService } from "api/causasUpdate";

// Avisos al usuario sobre su cuenta del Portal PJN (pjn-mis-causas): vencimiento de la
// contraseña y segundo factor. Cada uno se habilita por separado en
// causas-update-config.worker; apagados, el worker solo registra a quién le habría
// avisado. Las plantillas viven en emailtemplates (category transactional) y se
// editan en Marketing → Plantillas; si faltan, el worker usa el mismo correo del código.

type FlagKey = "passwordExpiryEmailEnabled" | "portal2faEmailEnabled";

interface TemplateDoc {
	_id: string;
	name: string;
	category: string;
	subject: string;
	htmlBody?: string;
	htmlContent?: string;
	updatedAt?: string;
}

const NOTICES: Array<{
	flag: FlagKey;
	title: string;
	description: string;
	templates: Array<{ name: string; label: string; sample: Record<string, string> }>;
}> = [
	{
		flag: "passwordExpiryEmailEnabled",
		title: "Vencimiento de la contraseña del portal",
		description:
			"La contraseña del Portal PJN vence a los 200 días del último cambio; al vencer, el portal exige cambiarla y la sincronización de reservadas se corta. Se avisa 15 y 3 días antes. Apagado: solo se registra a quién se le habría avisado y llega la alerta al admin.",
		templates: [
			{
				name: "pjnPasswordExpiring",
				label: "Vencimiento (3 días)",
				sample: {
					subject: "⚠️ Tu contraseña del PJN vence en 3 días",
					greeting: "Hola María,",
					daysLabel: "3 días",
					expiresAtText: "27/11/2026",
					portalUrl: "https://portalpjn.pjn.gov.ar/",
					relinkUrl: "https://www.lawanalytics.app/apps/profiles/account/pjn",
				},
			},
		],
	},
	{
		flag: "portal2faEmailEnabled",
		title: "Segundo factor (2FA) del portal",
		description:
			"Si la cuenta activa 2FA, el login automático no puede completar el código y la sincronización de reservadas se corta. Se avisa una vez al activarlo y, preventivamente, cuando el portal empieza a ofrecerlo. Apagado: solo se registra y llega la alerta al admin.",
		templates: [
			{
				name: "pjnPortal2faActivado",
				label: "2FA activado",
				sample: {
					subject: "⚠️ Activaste el segundo factor en el PJN: tu sincronización no puede continuar",
					greeting: "Hola María,",
					portalUrl: "https://portalpjn.pjn.gov.ar/",
				},
			},
			{
				name: "pjnPortal2faDisponible",
				label: "2FA disponible",
				sample: {
					subject: "El Portal PJN ahora ofrece segundo factor de autenticación",
					greeting: "Hola María,",
					portalUrl: "https://portalpjn.pjn.gov.ar/",
				},
			},
		],
	},
];

const render = (content: string, vars: Record<string, string>) =>
	Object.entries({ year: String(new Date().getFullYear()), ...vars }).reduce(
		(out, [k, v]) => out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v),
		content,
	);

const TemplatePreviewDialog = ({ notice, onClose }: { notice: (typeof NOTICES)[number] | null; onClose: () => void }) => {
	const [tab, setTab] = useState(0);
	const [templates, setTemplates] = useState<TemplateDoc[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!notice) return;
		setTab(0);
		setError(null);
		mktAxios
			.get("/api/templates")
			.then((r) => {
				const list: TemplateDoc[] = Array.isArray(r.data) ? r.data : r.data?.data || r.data?.templates || [];
				setTemplates(list.filter((t) => t.category === "transactional"));
			})
			.catch((e) => {
				console.error("Error cargando plantillas:", e);
				setError("No se pudieron cargar las plantillas del servicio de marketing.");
			});
	}, [notice]);

	if (!notice) return null;
	const current = notice.templates[tab];
	const doc = templates?.find((t) => t.name === current.name) || null;
	const html = doc ? render(doc.htmlBody || doc.htmlContent || "", current.sample) : "";

	return (
		<Dialog open onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Typography variant="h5">Plantilla — {notice.title}</Typography>
				<Typography variant="caption" color="text.secondary">
					Vista con datos de ejemplo. Se edita en Marketing → Plantillas (categoría Transaccional).
				</Typography>
			</DialogTitle>
			<DialogContent dividers>
				{notice.templates.length > 1 && (
					<Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
						{notice.templates.map((t) => (
							<Tab key={t.name} label={t.label} />
						))}
					</Tabs>
				)}
				{error && <Alert severity="error">{error}</Alert>}
				{!error && !templates && (
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress />
					</Box>
				)}
				{templates && !doc && (
					<Alert severity="warning">
						La plantilla <code>{current.name}</code> no está en la base: el worker usa la versión del código. Se crea con{" "}
						<code>node scripts/seed-portal-account-templates.js --confirm</code> (pjn-mis-causas).
					</Alert>
				)}
				{doc && (
					<Stack spacing={1}>
						<Typography variant="body2">
							<strong>Asunto:</strong> {render(doc.subject, current.sample)}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							<code>{doc.name}</code>
							{doc.updatedAt ? ` · actualizada ${new Date(doc.updatedAt).toLocaleString("es-AR")}` : ""}
						</Typography>
						<Box
							component="iframe"
							title={`Vista previa ${doc.name}`}
							srcDoc={html}
							sandbox=""
							sx={{ width: "100%", height: 560, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "#fff" }}
						/>
					</Stack>
				)}
			</DialogContent>
			<DialogActions>
				<Button component={RouterLink} to="/admin/marketing/templates">
					Editar en Plantillas
				</Button>
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
};

const PortalAccountNoticesPanel = () => {
	const [config, setConfig] = useState<CausasUpdateConfig | null>(null);
	const [saving, setSaving] = useState<FlagKey | null>(null);
	const [confirm, setConfirm] = useState<(typeof NOTICES)[number] | null>(null);
	const [preview, setPreview] = useState<(typeof NOTICES)[number] | null>(null);

	useEffect(() => {
		CausasUpdateService.getConfig()
			.then((r) => setConfig(r.data))
			.catch((e) => console.error("Error cargando config causas-update:", e));
	}, []);

	const setFlag = async (flag: FlagKey, value: boolean) => {
		setSaving(flag);
		try {
			const r = await CausasUpdateService.updateConfig({ worker: { [flag]: value } } as unknown as Partial<CausasUpdateConfig>);
			setConfig(r.data);
			enqueueSnackbar(value ? "Correo al usuario activado" : "Correo al usuario desactivado", { variant: value ? "success" : "info" });
		} catch (e) {
			console.error("Error actualizando config:", e);
			enqueueSnackbar("No se pudo guardar el cambio", { variant: "error" });
		} finally {
			setSaving(null);
		}
	};

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="subtitle1" fontWeight={600}>
				Avisos al usuario sobre su cuenta del portal
			</Typography>
			<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
				Los lee pjn-mis-causas en cada corrida (causas-update-config). Los envíos aparecen abajo en el historial de notificaciones.
			</Typography>
			<Stack spacing={1.5}>
				{NOTICES.map((n) => {
					const enabled = config?.worker?.[n.flag] === true;
					return (
						<Stack key={n.flag} direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 150 }}>
								<Switch
									checked={enabled}
									disabled={!config || saving === n.flag}
									onChange={(e) => (e.target.checked ? setConfirm(n) : setFlag(n.flag, false))}
									inputProps={{ "aria-label": `Correo al usuario: ${n.title}` }}
								/>
								<Chip size="small" label={enabled ? "Activo" : "Apagado"} color={enabled ? "success" : "default"} />
							</Stack>
							<Box sx={{ flex: 1 }}>
								<Typography variant="body2" fontWeight={600}>
									{n.title}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{n.description}
								</Typography>
							</Box>
							<Button size="small" variant="outlined" onClick={() => setPreview(n)} sx={{ whiteSpace: "nowrap" }}>
								Ver plantilla
							</Button>
						</Stack>
					);
				})}
			</Stack>

			<Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Activar correo a usuarios</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Desde la próxima corrida los usuarios van a recibir el aviso «{confirm?.title}». Revisá antes la plantilla.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirm(null)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={() => {
							if (confirm) setFlag(confirm.flag, true);
							setConfirm(null);
						}}
					>
						Activar
					</Button>
				</DialogActions>
			</Dialog>
			<TemplatePreviewDialog notice={preview} onClose={() => setPreview(null)} />
		</Paper>
	);
};

export default PortalAccountNoticesPanel;
