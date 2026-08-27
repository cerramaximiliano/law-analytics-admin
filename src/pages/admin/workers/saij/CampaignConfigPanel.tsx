import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
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
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { InfoCircle, ArrowDown2 } from "iconsax-react";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";

import { getSaijWorkerConfig, updateSaijNotificationConfig, updateSaijPipelineConfig, SaijUserCampaignConfig } from "api/saij";

/**
 * Panel de control de las campañas de novedades jurisprudenciales.
 *
 * Todo esto vivía solo en Mongo: para cambiar el horario, la antigüedad
 * admitida o el tope de fallos había que entrar a la base. Acá queda editable,
 * con los rangos validados también del lado del servidor.
 *
 * La config se relee en cada ciclo del worker, así que los cambios toman efecto
 * sin reiniciar nada.
 */

const WORKER_ID = "worker_SAIJ_0";

const HORAS = Array.from({ length: 24 }, (_, i) => i);

type Campos = Required<
	Pick<
		SaijUserCampaignConfig,
		| "enabled"
		| "siteUrl"
		| "campaignHour"
		| "weekdaysOnly"
		| "maxFallosPorCampania"
		| "maxPublishAgeDays"
		| "maxDocAgeDays"
		| "maxWaitHours"
		| "windowHours"
		| "throttleRate"
		| "dailyLimit"
		| "reportHour"
		| "reportLookbackHours"
		| "csjnMaxItems"
		| "csjnMaxDocAgeDays"
	>
>;

const DEFAULTS: Campos = {
	enabled: false,
	siteUrl: "https://lawanalytics.app/jurisprudencia",
	campaignHour: 12,
	weekdaysOnly: true,
	maxFallosPorCampania: 5,
	maxPublishAgeDays: 180,
	maxDocAgeDays: 180,
	maxWaitHours: 24,
	windowHours: 48,
	throttleRate: 250,
	dailyLimit: 0,
	reportHour: 8,
	reportLookbackHours: 48,
	csjnMaxItems: 2,
	csjnMaxDocAgeDays: 30,
};

const fmt = (d?: string) => (d ? new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

function Ayuda({ texto }: { texto: string }) {
	return (
		<Tooltip title={texto} arrow>
			<Box component="span" sx={{ display: "inline-flex", ml: 0.5, color: "text.disabled", cursor: "help", verticalAlign: "middle" }}>
				<InfoCircle size={13} />
			</Box>
		</Tooltip>
	);
}

export default function CampaignConfigPanel() {
	const [campos, setCampos] = useState<Campos>(DEFAULTS);
	const [original, setOriginal] = useState<Campos>(DEFAULTS);
	const [meta, setMeta] = useState<{ lastCampaignAt?: string; lastReportAt?: string; segmentId?: string; templateId?: string }>({});
	// Vive en `pipeline`, no en `userCampaign`: se carga y guarda aparte.
	const [publicarSinCausa, setPublicarSinCausa] = useState(false);
	const [publicarSinCausaOrig, setPublicarSinCausaOrig] = useState(false);
	const [loading, setLoading] = useState(true);
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	const cargar = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await getSaijWorkerConfig(WORKER_ID);
			const uc = res.data?.notification?.userCampaign ?? {};
			const valores: Campos = { ...DEFAULTS };
			(Object.keys(DEFAULTS) as (keyof Campos)[]).forEach((k) => {
				if (uc[k] !== undefined && uc[k] !== null) (valores as any)[k] = uc[k];
			});
			setCampos(valores);
			setOriginal(valores);
			setMeta({ lastCampaignAt: uc.lastCampaignAt, lastReportAt: uc.lastReportAt, segmentId: uc.segmentId, templateId: uc.templateId });
			const sinCausa = !!res.data?.pipeline?.createScSinCausa;
			setPublicarSinCausa(sinCausa);
			setPublicarSinCausaOrig(sinCausa);
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message || "No se pudo cargar la configuración");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		cargar();
	}, []);

	const cambio = (k: keyof Campos) => (valor: any) => setCampos((prev) => ({ ...prev, [k]: valor }));
	const hayCambios = JSON.stringify(campos) !== JSON.stringify(original) || publicarSinCausa !== publicarSinCausaOrig;

	const guardar = async () => {
		setGuardando(true);
		setError(null);
		setOk(null);
		try {
			await updateSaijNotificationConfig(WORKER_ID, { userCampaign: campos });
			if (publicarSinCausa !== publicarSinCausaOrig) {
				await updateSaijPipelineConfig(WORKER_ID, { createScSinCausa: publicarSinCausa });
				setPublicarSinCausaOrig(publicarSinCausa);
			}
			setOriginal(campos);
			setOk("Configuración guardada — el worker la toma en su próximo ciclo");
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message || "No se pudo guardar");
		} finally {
			setGuardando(false);
		}
	};

	if (loading) {
		return (
			<Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
				<CircularProgress size={22} />
			</Paper>
		);
	}

	const numero = (k: keyof Campos, label: string, ayuda: string, min = 0) => (
		<Grid item xs={6} sm={4} md={3}>
			<TextField
				fullWidth
				size="small"
				type="number"
				label={
					<>
						{label}
						<Ayuda texto={ayuda} />
					</>
				}
				value={campos[k] as number}
				onChange={(e) => cambio(k)(Math.max(min, parseInt(e.target.value || "0", 10)))}
				inputProps={{ min }}
			/>
		</Grid>
	);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
				<Typography variant="subtitle2">Configuración de campañas</Typography>
				<FormControlLabel
					control={<Switch size="small" checked={campos.enabled} onChange={(e) => cambio("enabled")(e.target.checked)} />}
					label={<Typography variant="caption">{campos.enabled ? "Activas" : "Detenidas"}</Typography>}
					sx={{ ml: 0 }}
				/>
				<Box flexGrow={1} />
				<Typography variant="caption" color="text.secondary">
					Última campaña: {fmt(meta.lastCampaignAt)} · Último informe: {fmt(meta.lastReportAt)}
				</Typography>
			</Stack>

			{!campos.enabled && (
				<Alert severity="warning" variant="outlined" sx={{ mb: 1.5, py: 0.25 }}>
					Con el interruptor apagado no se envía ninguna campaña, aunque haya fallos en cola.
				</Alert>
			)}

			<Grid container spacing={1.5}>
				{/* Cuándo sale */}
				<Grid item xs={12}>
					<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Cuándo sale
					</Typography>
				</Grid>
				<Grid item xs={6} sm={4} md={3}>
					<FormControl fullWidth size="small">
						<InputLabel>Hora de salida</InputLabel>
						<Select value={campos.campaignHour} label="Hora de salida" onChange={(e) => cambio("campaignHour")(Number(e.target.value))}>
							{HORAS.map((h) => (
								<MenuItem key={h} value={h}>
									{String(h).padStart(2, "0")}:00
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				<Grid item xs={6} sm={4} md={3}>
					<FormControlLabel
						control={<Switch size="small" checked={campos.weekdaysOnly} onChange={(e) => cambio("weekdaysOnly")(e.target.checked)} />}
						label={
							<Typography variant="caption">
								Solo días hábiles
								<Ayuda texto="Si se apaga, también sale sábados y domingos." />
							</Typography>
						}
					/>
				</Grid>
				{numero("windowHours", "Ventana de envío (h)", "Cuánto tiempo queda abierta cada campaña para terminar de enviar. Pasado ese plazo, lo pendiente se descarta.", 1)}

				{/* Qué entra */}
				<Grid item xs={12}>
					<Divider sx={{ my: 0.5 }} />
					<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Qué fallos entran
					</Typography>
				</Grid>
				{numero("maxFallosPorCampania", "Fallos por correo", "Tope de fallos que incluye cada campaña. El resto espera su turno, del más antiguo al más nuevo.", 1)}
				{numero(
					"maxPublishAgeDays",
					"Antigüedad del alta (días)",
					"Cuántos días atrás puede haber sido dado de alta en SAIJ. Es lo que define la NOVEDAD: SAIJ carga fallos en meses ya cerrados.",
					1,
				)}
				{numero(
					"maxDocAgeDays",
					"Antigüedad del fallo (días)",
					"Antigüedad máxima de la SENTENCIA en sí, para no anunciar como novedad un fallo viejo que SAIJ cargó tarde.",
					1,
				)}
				{numero("maxWaitHours", "Espera máxima (h)", "Cuánto se espera a un fallo que todavía no tiene resumen o página antes de dejarlo fuera para que no bloquee al resto.", 1)}

				{/* Envío */}
				<Grid item xs={12}>
					<Divider sx={{ my: 0.5 }} />
					<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Envío e informe
					</Typography>
				</Grid>
				{numero("throttleRate", "Emails por tick", "Cuántos correos manda el scheduler en cada pasada (corre cada 5 minutos).", 1)}
				{numero("dailyLimit", "Tope diario", "Máximo de correos por día. 0 = sin límite.", 0)}
				<Grid item xs={6} sm={4} md={3}>
					<FormControl fullWidth size="small">
						<InputLabel>Hora del informe</InputLabel>
						<Select value={campos.reportHour} label="Hora del informe" onChange={(e) => cambio("reportHour")(Number(e.target.value))}>
							{HORAS.map((h) => (
								<MenuItem key={h} value={h}>
									{String(h).padStart(2, "0")}:00
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Grid>
				{numero("reportLookbackHours", "Ventana del informe (h)", "Período que cubre el informe. 48h hace que cada campaña se reporte dos veces: al crearse y al día siguiente ya con sus métricas de envío.", 1)}

				{/* Destino */}
				<Grid item xs={12}>
					<Divider sx={{ my: 0.5 }} />
					<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Destino
					</Typography>
				</Grid>
				{/* Sección Corte Suprema */}
				<Grid item xs={12}>
					<Divider sx={{ my: 0.5 }} />
					<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Sección Corte Suprema
					</Typography>
				</Grid>
				{numero(
					"csjnMaxItems",
					"Fallos de la Corte por correo",
					"Van en una card propia dentro del mismo correo. Es un tope por CANTIDAD y no un recorte de ventana: la Corte publica en tandas (días sin nada y días con doce), así que una ventana corta dejaría la sección vacía casi siempre. 0 apaga la sección.",
					0,
				)}
				{numero(
					"csjnMaxDocAgeDays",
					"Antigüedad de la sentencia (días)",
					"Antigüedad máxima de la sentencia de la Corte para entrar en la sección.",
					1,
				)}

				{/* Publicación */}
				<Grid item xs={12}>
					<Divider sx={{ my: 0.5 }} />
					<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Publicación
					</Typography>
				</Grid>
				<Grid item xs={12}>
					<FormControlLabel
						control={<Switch size="small" checked={publicarSinCausa} onChange={(e) => setPublicarSinCausa(e.target.checked)} />}
						label={
							<Typography variant="caption">
								Publicar fallos sin causa PJN vinculada
								<Ayuda texto="Un fallo cuyo expediente no matcheó con ninguna causa igual se publica: se le crea la sentencia capturada sin causa, recibe resumen IA, página pública y puede entrar al boletín. Apagado, esos fallos quedan invisibles aunque tengan el texto completo guardado." />
							</Typography>
						}
						sx={{ ml: 0 }}
					/>
					{!publicarSinCausa && (
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
							Con esto apagado se pierde el 11-17% de los fallos de cada año, que quedan sin página aunque tengan texto.
						</Typography>
					)}
				</Grid>

				<Grid item xs={12} md={6}>
					<TextField
						fullWidth
						size="small"
						label={<>URL base de la vista pública<Ayuda texto="Cada fallo linkea a esta URL más el id de su sentencia capturada." /></>}
						value={campos.siteUrl}
						onChange={(e) => cambio("siteUrl")(e.target.value)}
					/>
				</Grid>
				<Grid item xs={12} md={6}>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
						<Chip size="small" variant="outlined" label={`Segmento ${meta.segmentId ? meta.segmentId.slice(-6) : "—"}`} />
						<Chip size="small" variant="outlined" label={`Template ${meta.templateId ? meta.templateId.slice(-6) : "—"}`} />
						<Typography variant="caption" color="text.secondary">
							(se cambian por script)
						</Typography>
					</Stack>
				</Grid>
			</Grid>

			{/* Ayuda: cómo funciona el flujo de punta a punta */}
			<Accordion variant="outlined" disableGutters sx={{ mt: 2, "&:before": { display: "none" } }}>
				<AccordionSummary expandIcon={<ArrowDown2 size={14} />}>
					<Stack direction="row" spacing={0.75} alignItems="center">
						<InfoCircle size={14} />
						<Typography variant="caption">Cómo se arma y se envía este correo</Typography>
					</Stack>
				</AccordionSummary>
				<AccordionDetails>
					<Stack spacing={1.5}>
						{[
							{
								t: "Quién lo arma y cuándo",
								d: "Lo arma el worker worker_SAIJ_0 en su ciclo (cada 4 horas). Sale una sola campaña por día, a partir de la hora configurada y solo en días hábiles si el interruptor está activo. Si a esa hora no hay ningún fallo publicable, no sale nada y se reintenta en el ciclo siguiente.",
							},
							{
								t: "Quién lo envía",
								d: "El worker no envía correos: crea la campaña en la-marketing-service y el envío real lo hace el scheduler (email-scheduler-prod), que corre cada 5 minutos y aplica las bajas, las supresiones y el límite de envío de SES.",
							},
							{
								t: "Cómo se eligen los fallos",
								d: "En orden de llegada según la fecha de alta en SAIJ, no según la fecha de la sentencia: la cola se drena en el orden en que SAIJ fue publicando. Para entrar, un fallo debe estar dentro de las dos ventanas de antigüedad, tener página pública, tener resumen IA y no estar vetado editorialmente. El que todavía no está listo espera hasta el tope de espera; pasado ese plazo queda excluido y se registra el motivo. Los sumarios de SAIJ nunca entran: solo fallos.",
							},
							{
								t: "La sección Corte Suprema",
								d: "Los fallos de la Corte los captura otro worker (worker_SAIJ_CSJN_0) y se consultan aparte. Van en el mismo correo, en una card propia, con su tope y su ventana independientes.",
							},
							{
								t: "A quién le llega",
								d: "Al segmento principal (usuarios registrados y verificados) más los segmentos adicionales configurados. La audiencia se congela al crear la campaña, así que quien se registre después entra recién en la del día siguiente.",
							},
							{
								t: "Qué pasa con los fallos sin causa",
								d: "Históricamente, un fallo cuyo expediente no matcheaba con ninguna causa no llegaba a tener página pública y quedaba invisible. Con la opción de Publicación activada se publica igual, sin causa vinculada. Los que quedan afuera se listan con su motivo en la pestaña Difusión.",
							},
						].map((x) => (
							<Box key={x.t}>
								<Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
									{x.t}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{x.d}
								</Typography>
							</Box>
						))}
					</Stack>
				</AccordionDetails>
			</Accordion>

			{error && (
				<Alert severity="error" sx={{ mt: 1.5 }}>
					{error}
				</Alert>
			)}
			{ok && (
				<Alert severity="success" sx={{ mt: 1.5 }}>
					{ok}
				</Alert>
			)}

			<Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
				<Button size="small" onClick={() => setCampos(original)} disabled={!hayCambios || guardando}>
					Descartar
				</Button>
				<Button size="small" variant="contained" onClick={guardar} disabled={!hayCambios || guardando}>
					{guardando ? <CircularProgress size={16} /> : "Guardar"}
				</Button>
			</Stack>
		</Paper>
	);
}
