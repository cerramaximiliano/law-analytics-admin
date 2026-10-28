import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	AlertTitle,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	FormControlLabel,
	Grid,
	Stack,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "notistack";
import { Refresh, Warning2 } from "iconsax-react";

import MainCard from "components/MainCard";
import { SchedulerFrequencyConfig, SchedulerFrequencyState } from "types/campaign";
import { SchedulerFrequencyService } from "store/reducers/campaign";
import { DEFAULT_FREQUENCY_CONFIG } from "utils/campaignCoordination";
import { WARNING_CHIP_SX } from "./labels";

interface GeneralRulesCardProps {
	state: SchedulerFrequencyState | null;
	loading: boolean;
	loadError: string | null;
	onSaved: (config: SchedulerFrequencyConfig) => void;
	onRetry: () => void;
}

type NumericKey = "maxPerDay" | "maxPerWeek" | "maxDeferralDays" | "reserveHours";

const NUMERIC_FIELDS: { key: NumericKey; label: string; help: string; min: number; max: number }[] = [
	{
		key: "maxPerDay",
		label: "Máximo por día",
		help: "Correos de marketing por persona por día calendario (Buenos Aires).",
		min: 1,
		max: 50,
	},
	{
		key: "maxPerWeek",
		label: "Máximo por semana",
		help: "Correos por persona en 7 días móviles, sumando todas las campañas.",
		min: 1,
		max: 100,
	},
	{
		key: "maxDeferralDays",
		label: "Espera máxima (días)",
		help: "Un paso diferido más de estos días se saltea, para no mandar algo viejo.",
		min: 1,
		max: 90,
	},
	{
		key: "reserveHours",
		label: "Reserva (horas)",
		help: "Si una campaña de mayor prioridad tiene un paso que vence dentro de estas horas, le guarda el lugar.",
		min: 0,
		max: 168,
	},
];

export const CoordinatorStatusChip = ({ config }: { config: SchedulerFrequencyConfig | null }) => {
	if (!config) return <Chip size="small" label="Sin datos" variant="outlined" />;
	if (!config.enabled) return <Chip size="small" label="Apagado" color="default" />;
	if (config.dryRun) return <Chip size="small" label="Modo prueba" color="warning" sx={WARNING_CHIP_SX} />;
	return <Chip size="small" label="Activo" color="success" />;
};

const GeneralRulesCard: React.FC<GeneralRulesCardProps> = ({ state, loading, loadError, onSaved, onRetry }) => {
	const { enqueueSnackbar } = useSnackbar();
	const original = state?.config ?? null;
	const [draft, setDraft] = useState<SchedulerFrequencyConfig>(original ?? DEFAULT_FREQUENCY_CONFIG);
	const [newCategory, setNewCategory] = useState("");
	const [saving, setSaving] = useState(false);
	const [confirming, setConfirming] = useState(false);

	useEffect(() => {
		if (original) setDraft(original);
		setConfirming(false);
	}, [original]);

	const dirty = useMemo(() => {
		if (!original) return false;
		return (
			original.enabled !== draft.enabled ||
			original.dryRun !== draft.dryRun ||
			original.maxPerDay !== draft.maxPerDay ||
			original.maxPerWeek !== draft.maxPerWeek ||
			original.maxDeferralDays !== draft.maxDeferralDays ||
			original.reserveHours !== draft.reserveHours ||
			[...original.exemptCategories].sort().join("|") !== [...draft.exemptCategories].sort().join("|")
		);
	}, [original, draft]);

	const invalid = NUMERIC_FIELDS.some(({ key, min, max }) => {
		const v = draft[key];
		return typeof v !== "number" || !Number.isInteger(v) || v < min || v > max;
	});
	const weekBelowDay = draft.maxPerWeek < draft.maxPerDay;

	// Cambios sensibles: pide confirmación en la página antes de guardar.
	const sensitiveChanges: string[] = [];
	if (original) {
		if (original.enabled !== draft.enabled) {
			sensitiveChanges.push(
				draft.enabled
					? "Vas a encender el coordinador: desde la próxima vuelta del scheduler (cada 5 minutos) empieza a decidir sobre los envíos."
					: "Vas a apagar el coordinador: el scheduler vuelve a enviar como antes, sin tope por persona.",
			);
		}
		if (original.dryRun && !draft.dryRun) {
			sensitiveChanges.push(
				draft.enabled
					? "Vas a salir del modo prueba: los correos que pasen el tope se van a diferir o saltear de verdad."
					: "Vas a desactivar el modo prueba. Con el coordinador apagado no cambia nada hasta que lo enciendas.",
			);
		}
	}

	const addCategory = () => {
		const value = newCategory.trim().toLowerCase();
		if (!value) return;
		if (!draft.exemptCategories.some((c) => c.toLowerCase() === value)) {
			setDraft((d) => ({ ...d, exemptCategories: [...d.exemptCategories, value] }));
		}
		setNewCategory("");
	};

	const doSave = async () => {
		setSaving(true);
		try {
			const payload: Partial<SchedulerFrequencyConfig> = {
				enabled: draft.enabled,
				dryRun: draft.dryRun,
				maxPerDay: draft.maxPerDay,
				maxPerWeek: draft.maxPerWeek,
				maxDeferralDays: draft.maxDeferralDays,
				reserveHours: draft.reserveHours,
				exemptCategories: draft.exemptCategories,
			};
			const next = await SchedulerFrequencyService.updateFrequency(payload);
			onSaved(next);
			setConfirming(false);
			enqueueSnackbar("Reglas del coordinador guardadas", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || err?.response?.data?.message || "No se pudieron guardar las reglas", {
				variant: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleSave = () => {
		if (sensitiveChanges.length > 0) {
			setConfirming(true);
			return;
		}
		doSave();
	};

	return (
		<MainCard
			title={
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Typography variant="h5">Reglas generales</Typography>
					<CoordinatorStatusChip config={original} />
				</Stack>
			}
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
				<Stack spacing={2}>
					{loadError && (
						<Alert severity="warning" icon={<Warning2 size={20} />}>
							<AlertTitle>No se pudo leer la configuración del coordinador</AlertTitle>
							{loadError} Se muestran los valores por defecto del diseño; no se puede guardar hasta que el servicio responda
							<Box component="code" sx={{ mx: 0.5 }}>
								GET /api/scheduler/frequency
							</Box>
							.
						</Alert>
					)}

					<Typography variant="body2" color="text.secondary">
						Tope de correos de marketing por persona, sumando todas las campañas no exentas. Lo que no entra no se descarta: se difiere y
						sale el primer día con lugar (o se saltea si la campaña es perecedera). Los avisos transaccionales de la app no cuentan.
					</Typography>

					<Grid container spacing={2}>
						<Grid item xs={12} md={6}>
							<FormControlLabel
								control={
									<Switch
										checked={draft.enabled}
										onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
										disabled={!!loadError}
									/>
								}
								label={
									<Box>
										<Typography variant="subtitle2">Coordinador encendido</Typography>
										<Typography variant="caption" color="text.secondary">
											Apagado, el scheduler envía como antes, sin tope entre campañas.
										</Typography>
									</Box>
								}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<FormControlLabel
								control={
									<Switch
										checked={draft.dryRun}
										onChange={(e) => setDraft((d) => ({ ...d, dryRun: e.target.checked }))}
										disabled={!!loadError}
									/>
								}
								label={
									<Box>
										<Typography variant="subtitle2">Modo prueba</Typography>
										<Typography variant="caption" color="text.secondary">
											Calcula qué correría pero envía como hoy. Sirve para revisar los números antes de activarlo.
										</Typography>
									</Box>
								}
							/>
						</Grid>

						{NUMERIC_FIELDS.map(({ key, label, help, min, max }) => {
							const value = draft[key];
							const outOfRange = typeof value !== "number" || !Number.isInteger(value) || value < min || value > max;
							const showWeekError = key === "maxPerWeek" && weekBelowDay;
							return (
								<Grid item xs={12} sm={6} md={3} key={key}>
									<TextField
										fullWidth
										size="small"
										type="number"
										label={label}
										value={Number.isNaN(value) ? "" : value}
										onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value === "" ? NaN : Number(e.target.value) }))}
										inputProps={{ min, max }}
										error={outOfRange || showWeekError}
										helperText={
											outOfRange ? `Número entero entre ${min} y ${max}` : showWeekError ? "No puede ser menor que el máximo por día" : help
										}
										disabled={!!loadError}
									/>
								</Grid>
							);
						})}

						<Grid item xs={12}>
							<Typography variant="subtitle2" gutterBottom>
								Categorías exentas
							</Typography>
							<Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
								Las campañas de estas categorías no cuentan para el tope ni se difieren (comparación sin mayúsculas). Por ejemplo newsletter
								(boletines SAIJ automáticos) y notification (avisos operativos).
							</Typography>
							<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
								{draft.exemptCategories.length === 0 && (
									<Typography variant="body2" color="text.secondary">
										Ninguna
									</Typography>
								)}
								{draft.exemptCategories.map((cat) => (
									<Chip
										key={cat}
										label={cat}
										size="small"
										color="primary"
										variant="outlined"
										onDelete={
											loadError
												? undefined
												: () => setDraft((d) => ({ ...d, exemptCategories: d.exemptCategories.filter((c) => c !== cat) }))
										}
									/>
								))}
								<TextField
									inputProps={{ "aria-label": "Agregar categoría" }}
									size="small"
									placeholder="Agregar categoría"
									value={newCategory}
									onChange={(e) => setNewCategory(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === ",") {
											e.preventDefault();
											addCategory();
										}
									}}
									sx={{ width: 190 }}
									disabled={!!loadError}
								/>
								<Button size="small" onClick={addCategory} disabled={!newCategory.trim() || !!loadError} sx={{ textTransform: "none" }}>
									Agregar
								</Button>
							</Stack>
						</Grid>
					</Grid>

					{confirming && (
						<Alert
							severity="warning"
							action={
								<Stack direction="row" spacing={1}>
									<Button color="inherit" size="small" onClick={() => setConfirming(false)} disabled={saving}>
										Cancelar
									</Button>
									<LoadingButton color="inherit" size="small" variant="outlined" loading={saving} onClick={doSave}>
										Confirmar
									</LoadingButton>
								</Stack>
							}
						>
							<AlertTitle>Confirmá el cambio</AlertTitle>
							{sensitiveChanges.map((t) => (
								<Typography key={t} variant="body2">
									{t}
								</Typography>
							))}
						</Alert>
					)}

					<Divider />
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
						<Typography variant="caption" color="text.secondary">
							{original?.updatedAt ? `Última edición: ${new Date(original.updatedAt).toLocaleString("es-AR")}` : ""}
							{original?.updatedBy ? ` por ${original.updatedBy}` : ""}
						</Typography>
						<Stack direction="row" spacing={1}>
							<Button
								variant="text"
								size="small"
								disabled={!dirty || saving}
								onClick={() => original && setDraft(original)}
								sx={{ textTransform: "none" }}
							>
								Descartar cambios
							</Button>
							<LoadingButton
								variant="contained"
								size="small"
								loading={saving && !confirming}
								disabled={!dirty || invalid || weekBelowDay || !!loadError || confirming}
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

export default GeneralRulesCard;
