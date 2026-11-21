import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { Refresh } from "iconsax-react";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "notistack";

import MainCard from "components/MainCard";
import { PendientesAdsService } from "store/reducers/campaign";
import { PendientesAdsState } from "types/campaign";

// Automatización /pendientes-ads (la-ads): cada corrida del comando deja un latido en scheduler-config `pendientes-ads`.
// email-health-prod (la-marketing-service, cada hora) avisa por Telegram y correo a ADMIN_EMAIL si pasan más de maxHoras sin latido.
const RELANZAR = "bash /home/mcerra/www/la-ads/scripts/arrancar-pendientes.sh";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "nunca");

export default function AutomationCard() {
	const { enqueueSnackbar } = useSnackbar();
	const [state, setState] = useState<PendientesAdsState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [maxHoras, setMaxHoras] = useState<string>("26");

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const s = await PendientesAdsService.get();
			setState(s);
			setMaxHoras(String(s.maxHoras));
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudo leer el estado");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const save = async (patch: { avisar?: boolean; maxHoras?: number }) => {
		setSaving(true);
		try {
			const s = await PendientesAdsService.update(patch);
			setState(s);
			setMaxHoras(String(s.maxHoras));
			enqueueSnackbar("Guardado", { variant: "success" });
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e?.message || "No se pudo guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const estado = !state ? null : !state.existe ? "sin latido" : state.caido ? "caída" : "en marcha";
	const color = estado === "en marcha" ? "success" : estado === "caída" ? "error" : "warning";

	return (
		<MainCard
			title={
				<Stack direction="row" alignItems="center" spacing={1.5}>
					<Typography variant="h5">Automatización /pendientes-ads</Typography>
					{estado && <Chip size="small" color={color} label={estado} />}
				</Stack>
			}
			secondary={
				<LoadingButton size="small" startIcon={<Refresh size={16} />} loading={loading} onClick={load}>
					Actualizar
				</LoadingButton>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
				El comando <code>/pendientes-ads</code> (la-ads) corre dos veces por día en una sesión de Claude Code: lista los pendientes de
				marketing, tracking, email y activación, hace los vencidos y deja lo que necesita OK anotado en la tarea. Cada corrida deja un
				latido; si pasan más de {state?.maxHoras ?? 26} h sin latido, email-health avisa por Telegram y por correo.
			</Typography>
			{error && (
				<Alert severity="error" sx={{ mb: 1.5 }}>
					{error}
				</Alert>
			)}
			{state && (
				<Stack spacing={1}>
					<Typography variant="body2">
						<strong>Último latido:</strong> {fmt(state.ultimaCorrida)}
						{state.horasDesdeUltima != null ? ` (hace ${state.horasDesdeUltima} h)` : ""}
						{state.modo ? ` · modo ${state.modo}` : ""}
						{state.host ? ` · en ${state.host}` : ""}
					</Typography>
					{state.resumen && (
						<Typography variant="body2" color="text.secondary">
							<strong>Última corrida:</strong> {state.resumen}
						</Typography>
					)}
					{state.caido && (
						<Alert severity="error">
							<Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "inherit" }}>
								{state.mensaje}
							</Box>
						</Alert>
					)}
					{!state.caido && (
						<Typography variant="body2" color="text.secondary">
							Para relanzarla en la PC donde corre Claude Code: <code>{RELANZAR}</code>
						</Typography>
					)}
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ pt: 0.5 }}>
						<FormControlLabel
							control={<Switch checked={state.avisar} disabled={saving} onChange={(_, v) => save({ avisar: v })} />}
							label="Avisar si se cae"
						/>
						<TextField
							size="small"
							label="Horas sin latido antes de avisar"
							type="number"
							value={maxHoras}
							onChange={(e) => setMaxHoras(e.target.value)}
							onBlur={() => {
								const h = Number(maxHoras);
								if (Number.isFinite(h) && h >= 1 && h <= 720 && h !== state.maxHoras) save({ maxHoras: h });
							}}
							inputProps={{ min: 1, max: 720 }}
							sx={{ width: 240 }}
						/>
					</Stack>
				</Stack>
			)}
		</MainCard>
	);
}
