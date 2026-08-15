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
import { InfoCircle } from "iconsax-react";

import { getSaijWorkerConfig, updateSaijNotificationConfig, SaijUserCampaignConfig } from "api/saij";

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
	const hayCambios = JSON.stringify(campos) !== JSON.stringify(original);

	const guardar = async () => {
		setGuardando(true);
		setError(null);
		setOk(null);
		try {
			await updateSaijNotificationConfig(WORKER_ID, { userCampaign: campos });
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
