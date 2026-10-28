import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	AlertTitle,
	Box,
	Button,
	CircularProgress,
	Divider,
	FormControl,
	FormControlLabel,
	FormHelperText,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "notistack";
import { Refresh, Warning2 } from "iconsax-react";

import MainCard from "components/MainCard";
import {
	EnrollmentGateConfig,
	OrdenVencidos,
	QuotaMode,
	QuotaPolicyConfig,
	RampaConfig,
	RampaUmbrales,
	SchedulerFrequencyConfig,
	SchedulerFrequencyPatch,
	SchedulerFrequencyState,
} from "types/campaign";
import { SchedulerFrequencyService } from "store/reducers/campaign";
import { DEFAULT_ENROLLMENT_GATE, DEFAULT_QUOTA_POLICY, DEFAULT_RAMPA } from "utils/campaignCoordination";
import { ORDEN_VENCIDOS_LABEL, QUOTA_MODE_HELP, QUOTA_MODE_LABEL, RAMPA_MODO_LABEL } from "./labels";

// ==============================|| CUPOS Y PASOS ||============================== //
// Política de cupo, freno de ingresos y rampa de cupos (bloques quotaPolicy / enrollmentGate / rampa
// de GET/PUT /api/scheduler/frequency). Plan de cupos 28/10/2026, la-marketing-service.

interface QuotaRampCardProps {
	state: SchedulerFrequencyState | null;
	loading: boolean;
	loadError: string | null;
	onSaved: (config: SchedulerFrequencyConfig) => void;
	onRetry: () => void;
}

interface Draft {
	quotaPolicy: QuotaPolicyConfig;
	enrollmentGate: EnrollmentGateConfig;
	rampa: RampaConfig;
}

const QUOTA_MODES: QuotaMode[] = ["secuencia_primero", "reserva", "proporcional"];
const ORDENES: OrdenVencidos[] = ["mas_atrasado_primero", "paso_mas_alto_primero"];

type RampaNumericKey = "pasoPct" | "diasEntrePasos" | "topePorCampana" | "minCasosParaBajar";

const RAMPA_NUMERIC_FIELDS: { key: RampaNumericKey; label: string; help: string; min: number; max: number }[] = [
	{ key: "pasoPct", label: "Paso (%)", help: "Cuánto sube o baja el tope en cada escalón.", min: 1, max: 100 },
	{
		key: "diasEntrePasos",
		label: "Días hábiles entre pasos",
		help: "Mínimo de días hábiles desde el último cambio para volver a subir.",
		min: 1,
		max: 30,
	},
	{ key: "topePorCampana", label: "Tope por campaña", help: "Techo del tope diario que la rampa puede alcanzar.", min: 1, max: 50000 },
	{
		key: "minCasosParaBajar",
		label: "Mínimo de casos para bajar",
		help: "Rebotes o quejas necesarios en la ventana para que la baja cuente.",
		min: 1,
		max: 1000,
	},
];

const UMBRAL_FIELDS: { key: keyof RampaUmbrales; label: string; help: string }[] = [
	{ key: "subirReboteMax", label: "Sube si rebote <", help: "Rebote definitivo máximo (%) para subir." },
	{ key: "subirQuejasMax", label: "Sube si quejas <", help: "Quejas máximas (%) para subir." },
	{ key: "bajarReboteMin", label: "Baja si rebote ≥", help: "Rebote definitivo (%) desde el cual baja." },
	{ key: "bajarQuejasMin", label: "Baja si quejas ≥", help: "Quejas (%) desde las cuales baja." },
];

const isInt = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const isPct = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const numOrNaN = (raw: string) => (raw === "" ? NaN : Number(raw));
const show = (v: number) => (Number.isNaN(v) ? "" : v);

const toDraft = (config: SchedulerFrequencyConfig | null): Draft => ({
	quotaPolicy: { ...DEFAULT_QUOTA_POLICY, ...(config?.quotaPolicy ?? {}) },
	enrollmentGate: { ...DEFAULT_ENROLLMENT_GATE, ...(config?.enrollmentGate ?? {}) },
	rampa: {
		...DEFAULT_RAMPA,
		...(config?.rampa ?? {}),
		umbrales: { ...DEFAULT_RAMPA.umbrales, ...(config?.rampa?.umbrales ?? {}) },
	},
});

const SectionTitle: React.FC<{ title: string; help: string }> = ({ title, help }) => (
	<Box>
		<Typography variant="subtitle1" fontWeight={600}>
			{title}
		</Typography>
		<Typography variant="caption" color="text.secondary" component="p">
			{help}
		</Typography>
	</Box>
);

const QuotaRampCard: React.FC<QuotaRampCardProps> = ({ state, loading, loadError, onSaved, onRetry }) => {
	const { enqueueSnackbar } = useSnackbar();
	const original = state?.config ?? null;
	const [draft, setDraft] = useState<Draft>(() => toDraft(original));
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		setDraft(toDraft(original));
		setSaveError(null);
	}, [original]);

	const base = useMemo(() => toDraft(original), [original]);
	const changed = {
		quotaPolicy: !same(base.quotaPolicy, draft.quotaPolicy),
		enrollmentGate: !same(base.enrollmentGate, draft.enrollmentGate),
		rampa: !same(base.rampa, draft.rampa),
	};
	const dirty = !!original && (changed.quotaPolicy || changed.enrollmentGate || changed.rampa);

	const { quotaPolicy, enrollmentGate, rampa } = draft;
	const reservaInvalid = !isInt(quotaPolicy.reservaNuevosPct, 0, 100);
	const atrasoInvalid = !isInt(enrollmentGate.maxAtrasoDias, 0, 90);
	const nuevosInvalid = !isInt(enrollmentGate.maxNuevosPorDia, 0, 1000000);
	const rampaInvalid = RAMPA_NUMERIC_FIELDS.some(({ key, min, max }) => !isInt(rampa[key], min, max));
	const umbralesInvalid = UMBRAL_FIELDS.some(({ key }) => !isPct(rampa.umbrales[key]));
	const invalid = reservaInvalid || atrasoInvalid || nuevosInvalid || rampaInvalid || umbralesInvalid;
	const disabled = !!loadError;

	const setQuota = (patch: Partial<QuotaPolicyConfig>) => setDraft((d) => ({ ...d, quotaPolicy: { ...d.quotaPolicy, ...patch } }));
	const setGate = (patch: Partial<EnrollmentGateConfig>) => setDraft((d) => ({ ...d, enrollmentGate: { ...d.enrollmentGate, ...patch } }));
	const setRampa = (patch: Partial<RampaConfig>) => setDraft((d) => ({ ...d, rampa: { ...d.rampa, ...patch } }));
	const setUmbral = (key: keyof RampaUmbrales, value: number) =>
		setDraft((d) => ({ ...d, rampa: { ...d.rampa, umbrales: { ...d.rampa.umbrales, [key]: value } } }));

	const handleSave = async () => {
		// Solo los bloques que cambiaron; el backend mezcla campo a campo.
		const payload: SchedulerFrequencyPatch = {};
		if (changed.quotaPolicy) payload.quotaPolicy = quotaPolicy;
		if (changed.enrollmentGate) payload.enrollmentGate = enrollmentGate;
		if (changed.rampa) payload.rampa = rampa;
		setSaving(true);
		setSaveError(null);
		try {
			const next = await SchedulerFrequencyService.updateFrequency(payload);
			onSaved(next);
			enqueueSnackbar("Cupos y pasos guardados", { variant: "success" });
		} catch (err: any) {
			const message =
				err?.response?.data?.error || err?.response?.data?.message || err?.message || "No se pudieron guardar los cupos y pasos";
			setSaveError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<MainCard
			title={<Typography variant="h5">Cupos y pasos</Typography>}
			secondary={
				<Button
					size="small"
					variant="text"
					startIcon={<Refresh size={16} />}
					onClick={onRetry}
					disabled={loading}
					sx={{ textTransform: "none" }}
				>
					Recargar
				</Button>
			}
		>
			{loading && !state ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress size={28} />
				</Box>
			) : (
				<Stack spacing={2.5}>
					{loadError && (
						<Alert severity="warning" icon={<Warning2 size={20} />}>
							<AlertTitle>No se pudo leer la configuración</AlertTitle>
							{loadError} Se muestran los valores por defecto; no se puede guardar hasta que el servicio responda.
						</Alert>
					)}

					<Typography variant="body2" color="text.secondary">
						Cómo reparte cada campaña su tope diario entre los pasos vencidos y los nuevos, cuándo deja de inscribir contactos y cómo sube o
						baja el tope según la reputación del dominio.
					</Typography>

					{/* Política de cupo */}
					<Stack spacing={1.5}>
						<SectionTitle
							title="Política de cupo"
							help="Qué se envía primero cuando el tope diario de una campaña no alcanza para todos los pasos."
						/>
						<Grid container spacing={2}>
							<Grid item xs={12} md={5}>
								<FormControl fullWidth size="small" disabled={disabled}>
									<InputLabel id="quota-mode-label">Modo</InputLabel>
									<Select
										labelId="quota-mode-label"
										label="Modo"
										value={quotaPolicy.mode}
										onChange={(e) => setQuota({ mode: e.target.value as QuotaMode })}
									>
										{QUOTA_MODES.map((m) => (
											<MenuItem key={m} value={m}>
												{QUOTA_MODE_LABEL[m]}
											</MenuItem>
										))}
									</Select>
									<FormHelperText>{QUOTA_MODE_HELP[quotaPolicy.mode]}</FormHelperText>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									size="small"
									type="number"
									label="Reserva para nuevos (%)"
									value={show(quotaPolicy.reservaNuevosPct)}
									onChange={(e) => setQuota({ reservaNuevosPct: numOrNaN(e.target.value) })}
									inputProps={{ min: 0, max: 100 }}
									error={reservaInvalid}
									helperText={
										reservaInvalid
											? "Número entero entre 0 y 100"
											: quotaPolicy.mode === "reserva"
											? "Parte del cupo que se guarda para nuevos."
											: "Solo cuenta en el modo reserva."
									}
									disabled={disabled}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<FormControl fullWidth size="small" disabled={disabled}>
									<InputLabel id="orden-vencidos-label">Orden de vencidos</InputLabel>
									<Select
										labelId="orden-vencidos-label"
										label="Orden de vencidos"
										value={quotaPolicy.ordenVencidos}
										onChange={(e) => setQuota({ ordenVencidos: e.target.value as OrdenVencidos })}
									>
										{ORDENES.map((o) => (
											<MenuItem key={o} value={o}>
												{ORDEN_VENCIDOS_LABEL[o]}
											</MenuItem>
										))}
									</Select>
									<FormHelperText>
										{quotaPolicy.ordenVencidos === "mas_atrasado_primero"
											? "Sale antes el contacto que lleva más tiempo esperando."
											: "Salen antes los pasos finales de la secuencia."}
									</FormHelperText>
								</FormControl>
							</Grid>
						</Grid>
					</Stack>

					<Divider />

					{/* Freno de ingresos */}
					<Stack spacing={1.5}>
						<SectionTitle
							title="Freno de ingresos"
							help="La sincronización de segmentos deja de inscribir nuevos mientras algún paso tenga vencidos esperando de más."
						/>
						<Grid container spacing={2} alignItems="flex-start">
							<Grid item xs={12} md={5}>
								<FormControlLabel
									control={
										<Switch checked={enrollmentGate.enabled} onChange={(e) => setGate({ enabled: e.target.checked })} disabled={disabled} />
									}
									label={
										<Box>
											<Typography variant="subtitle2">Freno activo</Typography>
											<Typography variant="caption" color="text.secondary">
												Apagado, las campañas inscriben nuevos aunque la secuencia esté atrasada.
											</Typography>
										</Box>
									}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									size="small"
									type="number"
									label="Días de atraso"
									value={show(enrollmentGate.maxAtrasoDias)}
									onChange={(e) => setGate({ maxAtrasoDias: numOrNaN(e.target.value) })}
									inputProps={{ min: 0, max: 90 }}
									error={atrasoInvalid}
									helperText={atrasoInvalid ? "Número entero entre 0 y 90" : "Frena si un paso tiene vencidos esperando más de estos días."}
									disabled={disabled}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									size="small"
									type="number"
									label="Nuevos por día"
									value={show(enrollmentGate.maxNuevosPorDia)}
									onChange={(e) => setGate({ maxNuevosPorDia: numOrNaN(e.target.value) })}
									inputProps={{ min: 0 }}
									error={nuevosInvalid}
									helperText={nuevosInvalid ? "Número entero, 0 o mayor" : "Tope de inscriptos nuevos por día y campaña. 0 = sin tope."}
									disabled={disabled}
								/>
							</Grid>
						</Grid>
					</Stack>

					<Divider />

					{/* Rampa de cupos */}
					<Stack spacing={1.5}>
						<SectionTitle
							title="Rampa de cupos"
							help="Cada hora, el chequeo de salud sube el tope diario de las campañas con buena reputación y lo baja si aparecen rebotes o quejas. La baja corre siempre; la suba depende del modo."
						/>
						<Grid container spacing={2} alignItems="flex-start">
							<Grid item xs={12} md={5}>
								<FormControlLabel
									control={<Switch checked={rampa.enabled} onChange={(e) => setRampa({ enabled: e.target.checked })} disabled={disabled} />}
									label={
										<Box>
											<Typography variant="subtitle2">Rampa activa</Typography>
											<Typography variant="caption" color="text.secondary">
												Apagada, el tope diario de cada campaña queda como esté.
											</Typography>
										</Box>
									}
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<FormControl fullWidth size="small" disabled={disabled}>
									<InputLabel id="rampa-modo-label">Modo</InputLabel>
									<Select
										labelId="rampa-modo-label"
										label="Modo"
										value={rampa.modo}
										onChange={(e) => setRampa({ modo: e.target.value as RampaConfig["modo"] })}
									>
										<MenuItem value="automatico">{RAMPA_MODO_LABEL.automatico}</MenuItem>
										<MenuItem value="sugerir">{RAMPA_MODO_LABEL.sugerir}</MenuItem>
									</Select>
									<FormHelperText>
										{rampa.modo === "automatico" ? "Aplica las subas sin preguntar." : "Avisa qué subiría, pero no toca el tope."}
									</FormHelperText>
								</FormControl>
							</Grid>

							{RAMPA_NUMERIC_FIELDS.map(({ key, label, help, min, max }) => {
								const value = rampa[key];
								const outOfRange = !isInt(value, min, max);
								return (
									<Grid item xs={12} sm={6} md={3} key={key}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label={label}
											value={show(value)}
											onChange={(e) => setRampa({ [key]: numOrNaN(e.target.value) } as Partial<RampaConfig>)}
											inputProps={{ min, max }}
											error={outOfRange}
											helperText={outOfRange ? `Número entero entre ${min} y ${max}` : help}
											disabled={disabled}
										/>
									</Grid>
								);
							})}

							<Grid item xs={12}>
								<Typography variant="subtitle2">Umbrales (en porcentaje de los envíos de la ventana)</Typography>
							</Grid>
							{UMBRAL_FIELDS.map(({ key, label, help }) => {
								const value = rampa.umbrales[key];
								const bad = !isPct(value);
								return (
									<Grid item xs={12} sm={6} md={3} key={key}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label={label}
											value={show(value)}
											onChange={(e) => setUmbral(key, numOrNaN(e.target.value))}
											inputProps={{ min: 0, max: 100, step: 0.01 }}
											error={bad}
											helperText={bad ? "Porcentaje entre 0 y 100" : help}
											disabled={disabled}
										/>
									</Grid>
								);
							})}
						</Grid>
					</Stack>

					{saveError && (
						<Alert severity="error" onClose={() => setSaveError(null)}>
							<AlertTitle>El servicio rechazó el cambio</AlertTitle>
							{saveError}
						</Alert>
					)}

					<Divider />
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
						<Typography variant="caption" color="text.secondary">
							Los cambios rigen desde la próxima vuelta del scheduler; la rampa se evalúa en el chequeo horario de salud.
						</Typography>
						<Stack direction="row" spacing={1}>
							<Button
								variant="text"
								size="small"
								disabled={!dirty || saving}
								onClick={() => setDraft(toDraft(original))}
								sx={{ textTransform: "none" }}
							>
								Descartar cambios
							</Button>
							<LoadingButton
								variant="contained"
								size="small"
								loading={saving}
								disabled={!dirty || invalid || disabled}
								onClick={handleSave}
								sx={{ textTransform: "none" }}
							>
								Guardar
							</LoadingButton>
						</Stack>
					</Stack>
				</Stack>
			)}
		</MainCard>
	);
};

export default QuotaRampCard;
