import React, { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	Paper,
	Stack,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import {
	extendManualTrial,
	getManualTrial,
	grantManualTrial,
	MANUAL_TRIAL_MAX_DAYS,
	MANUAL_TRIAL_PLANS,
	ManualTrialPlan,
	ManualTrialSummary,
	revokeManualTrial,
} from "api/manualTrials";
import { openSnackbar } from "store/reducers/snackbar";
import { dispatch as storeDispatch } from "store/index";

/**
 * Prueba manual sin tarjeta (pestaña Suscripción de la ficha del usuario).
 * Otorga un plan pago por N días sin Stripe; al vencer pasa a Gratuito con el período
 * de gracia de una baja paga. Siempre escribe la suscripción de PRODUCCIÓN (live).
 */
interface Props {
	userId: string;
	/** Hay una suscripción paga en Stripe: no se puede otorgar. */
	hasPaidSubscription: boolean;
	onChanged: () => void;
}

const planLabel = (p?: string | null) => MANUAL_TRIAL_PLANS.find((x) => x.value === p)?.label || p || "—";
const fmt = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—");

const notify = (message: string, color: "success" | "error" | "info" = "success") =>
	storeDispatch(openSnackbar({ open: true, message, variant: "alert", alert: { color }, close: true }));

const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

const ManualTrialPanel: React.FC<Props> = ({ userId, hasPaidSubscription, onChanged }) => {
	const theme = useTheme();
	const [trial, setTrial] = useState<ManualTrialSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [dialog, setDialog] = useState<null | "grant" | "extend" | "revoke">(null);
	const [plan, setPlan] = useState<ManualTrialPlan>("standard");
	const [days, setDays] = useState<string>("14");
	const [reason, setReason] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setTrial(await getManualTrial(userId));
		} catch (e) {
			setTrial(null);
		} finally {
			setLoading(false);
		}
	}, [userId]);

	useEffect(() => {
		load();
	}, [load]);

	const daysNum = Number(days);
	const daysValid = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= MANUAL_TRIAL_MAX_DAYS;

	const run = async (fn: () => Promise<ManualTrialSummary>, ok: string, fallback: string) => {
		setBusy(true);
		try {
			setTrial(await fn());
			notify(ok);
			setDialog(null);
			onChanged();
		} catch (e) {
			notify(errMsg(e, fallback), "error");
		} finally {
			setBusy(false);
		}
	};

	const active = !!trial?.active;
	const endsIn = active && trial?.endsAt ? Math.max(0, dayjs(trial.endsAt).diff(dayjs(), "day")) : null;

	return (
		<Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: active ? theme.palette.primary.main : undefined }}>
			<Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
				<Box>
					<Typography variant="subtitle1">Prueba sin tarjeta</Typography>
					<Typography variant="caption" color="text.secondary">
						Plan pago por un plazo, sin Stripe. Al vencer pasa a Gratuito con período de gracia y archivado.
					</Typography>
				</Box>
				{loading ? (
					<CircularProgress size={18} />
				) : active ? (
					<Stack direction="row" spacing={1}>
						<Button size="small" variant="outlined" disabled={busy} onClick={() => { setDays("7"); setDialog("extend"); }}>
							Extender
						</Button>
						<Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => setDialog("revoke")}>
							Revocar
						</Button>
					</Stack>
				) : (
					<Button size="small" variant="contained" disabled={busy || hasPaidSubscription} onClick={() => { setDays("14"); setReason(""); setDialog("grant"); }}>
						Otorgar prueba
					</Button>
				)}
			</Stack>

			{!loading && active && trial && (
				<Stack spacing={0.5} sx={{ mt: 1.5 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Chip size="small" color="primary" label={planLabel(trial.plan)} sx={{ borderRadius: "4px" }} />
						<Typography variant="body2">
							hasta el <strong>{fmt(trial.endsAt)}</strong>
							{endsIn !== null && ` (${endsIn === 0 ? "termina hoy" : `faltan ${endsIn} días`})`}
						</Typography>
					</Stack>
					<Typography variant="caption" color="text.secondary">
						Otorgada el {fmt(trial.startedAt)} por {trial.grantedBy || "—"}
						{trial.reason ? ` · ${trial.reason}` : ""}
						{trial.extendedAt ? ` · extendida el ${fmt(trial.extendedAt)}` : ""}
						{trial.reminderSentAt ? ` · aviso de fin enviado el ${fmt(trial.reminderSentAt)}` : ""}
					</Typography>
				</Stack>
			)}

			{!loading && !active && trial?.startedAt && (
				<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
					Última prueba: {planLabel(trial.plan)} del {fmt(trial.startedAt)} al {fmt(trial.endsAt)}
					{trial.convertedAt ? ` · pagó el ${fmt(trial.convertedAt)}` : ""}
					{trial.revokedAt ? ` · revocada el ${fmt(trial.revokedAt)} por ${trial.revokedBy || "—"}` : ""}
					{trial.processedAt && !trial.revokedAt ? ` · venció el ${fmt(trial.processedAt)}` : ""}
				</Typography>
			)}

			{!loading && !active && hasPaidSubscription && (
				<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
					No disponible: el usuario tiene una suscripción paga en Stripe.
				</Typography>
			)}

			<Dialog open={dialog === "grant"} onClose={() => !busy && setDialog(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Otorgar prueba sin tarjeta</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField select label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as ManualTrialPlan)} fullWidth size="small">
							{MANUAL_TRIAL_PLANS.map((p) => (
								<MenuItem key={p.value} value={p.value}>
									{p.label}
								</MenuItem>
							))}
						</TextField>
						<TextField
							label="Días"
							type="number"
							value={days}
							onChange={(e) => setDays(e.target.value)}
							inputProps={{ min: 1, max: MANUAL_TRIAL_MAX_DAYS }}
							error={!daysValid}
							helperText={daysValid ? `Termina el ${dayjs().add(daysNum, "day").format("DD/MM/YYYY")}` : `Entre 1 y ${MANUAL_TRIAL_MAX_DAYS}`}
							fullWidth
							size="small"
						/>
						<TextField label="Motivo (interno)" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth size="small" multiline minRows={2} />
						<Alert severity="info">
							El usuario recibe un correo de inicio, un aviso 3 días antes del fin y, al vencer, pasa a Gratuito con período de
							gracia. No se le cobra nada ni se le pide tarjeta.
						</Alert>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialog(null)} disabled={busy}>
						Cancelar
					</Button>
					<Button
						variant="contained"
						disabled={busy || !daysValid}
						onClick={() =>
							run(
								() => grantManualTrial(userId, { plan, days: daysNum, reason: reason.trim() || undefined }),
								`Prueba del ${planLabel(plan)} otorgada por ${daysNum} días`,
								"No se pudo otorgar la prueba",
							)
						}
					>
						{busy ? <CircularProgress size={18} /> : "Otorgar"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={dialog === "extend"} onClose={() => !busy && setDialog(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Extender la prueba</DialogTitle>
				<DialogContent>
					<TextField
						label="Días a sumar"
						type="number"
						value={days}
						onChange={(e) => setDays(e.target.value)}
						inputProps={{ min: 1, max: MANUAL_TRIAL_MAX_DAYS }}
						error={!daysValid}
						helperText={
							daysValid && trial?.endsAt
								? `Nueva fecha de fin: ${dayjs(dayjs(trial.endsAt).isAfter(dayjs()) ? trial.endsAt : undefined).add(daysNum, "day").format("DD/MM/YYYY")}`
								: `Entre 1 y ${MANUAL_TRIAL_MAX_DAYS}`
						}
						fullWidth
						size="small"
						sx={{ mt: 1 }}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialog(null)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" disabled={busy || !daysValid} onClick={() => run(() => extendManualTrial(userId, daysNum), "Prueba extendida", "No se pudo extender la prueba")}>
						{busy ? <CircularProgress size={18} /> : "Extender"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={dialog === "revoke"} onClose={() => !busy && setDialog(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Revocar la prueba</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						La prueba termina ahora: el usuario pasa al Plan Gratuito, recibe el correo de fin de prueba y arranca el período de gracia
						para ajustar lo que exceda los límites.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialog(null)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" disabled={busy} onClick={() => run(() => revokeManualTrial(userId), "Prueba revocada", "No se pudo revocar la prueba")}>
						{busy ? <CircularProgress size={18} /> : "Revocar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Paper>
	);
};

export default ManualTrialPanel;
