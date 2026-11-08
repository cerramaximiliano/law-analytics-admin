import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { PjnPortalAccount } from "api/pjnCredentials";

// Celda "Portal PJN" de la tabla de credenciales: perfil de la cuenta (roles r:* del
// SCW) y vencimiento de la contraseña del portal (200 días desde el último cambio).
// Lo escribe pjn-bandeja-sync en cada login (portalAccount de pjn-credentials).

const DAY_MS = 24 * 60 * 60 * 1000;

const PERFIL: Record<string, { label: string; color: "primary" | "warning" | "info" | "default" }> = {
	letrado: { label: "Letrado", color: "primary" },
	perito: { label: "Perito", color: "info" },
	parte: { label: "Parte", color: "warning" },
	autorizado: { label: "Autorizado", color: "info" },
	otro: { label: "Otro", color: "default" },
};

const APP_LABELS: Record<string, string> = {
	"pjn-sne": "Notificaciones",
	"pjn-escritos": "Escritos",
	"pjn-scw": "Consulta (SCW)",
	"pjn-deox": "DEOX",
	"pjn-autorizados": "Autorizados",
	"csjn-iwec": "IWECS",
	"pjn-eventos": "Eventos",
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("es-AR");

export const daysUntil = (iso?: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS) : null);

const expiryColor = (days: number | null): "error" | "warning" | "success" | "default" =>
	days == null ? "default" : days <= 3 ? "error" : days <= 30 ? "warning" : "success";

const PortalAccountCell = ({ account, noticesSent }: { account?: PjnPortalAccount | null; noticesSent?: string[] | null }) => {
	if (!account) {
		return (
			<Typography variant="caption" color="text.disabled">
				sin datos
			</Typography>
		);
	}
	const days = daysUntil(account.passwordExpiresAt);
	const perfil = PERFIL[account.perfil || ""] || null;
	const appsVisibles = account.apps.filter((a) => APP_LABELS[a]).map((a) => APP_LABELS[a]);
	const tooltip = (
		<Box sx={{ fontSize: 12 }}>
			<div>
				<strong>Roles SCW:</strong> {account.scwRoles.length ? account.scwRoles.join(", ") : "—"}
			</div>
			<div>
				<strong>Apps:</strong> {appsVisibles.length ? appsVisibles.join(", ") : "—"}
			</div>
			<div>
				<strong>Bandeja del letrado:</strong>{" "}
				{account.tieneBandeja == null ? "—" : account.tieneBandeja ? "sí" : "no (sin Notificaciones ni Escritos)"}
			</div>
			<div>
				<strong>Firma electrónica:</strong> {account.firmaElectronica == null ? "—" : account.firmaElectronica ? "sí" : "no"}
			</div>
			<div>
				<strong>Segundo factor:</strong>{" "}
				{account.segundoFactor == null ? "—" : account.segundoFactor ? "ACTIVADO (el login automático puede fallar)" : "no"}
			</div>
			<div>
				<strong>Último cambio de contraseña:</strong> {account.fechaPassword ? fmtDay(account.fechaPassword) : "—"}
			</div>
			<div>
				<strong>Vence:</strong> {account.passwordExpiresAt ? `${fmtDay(account.passwordExpiresAt)} (${days} días)` : "—"}
			</div>
			{noticesSent && noticesSent.length > 0 && (
				<div>
					<strong>Avisos de vencimiento enviados:</strong> {noticesSent.join(", ")}
				</div>
			)}
			<div style={{ opacity: 0.7, marginTop: 4 }}>Leído del portal: {new Date(account.checkedAt).toLocaleString("es-AR")}</div>
		</Box>
	);
	return (
		<Tooltip title={tooltip} arrow placement="top">
			<Stack spacing={0.5} alignItems="flex-start" sx={{ cursor: "help" }}>
				<Stack direction="row" spacing={0.5}>
					{perfil ? (
						<Chip size="small" label={perfil.label} color={perfil.color} variant="outlined" />
					) : (
						<Chip size="small" label="Sin rol" variant="outlined" />
					)}
					{account.segundoFactor && <Chip size="small" label="2FA" color="error" />}
				</Stack>
				{days != null ? (
					<Chip
						size="small"
						color={expiryColor(days)}
						variant={days <= 30 ? "filled" : "outlined"}
						label={days < 0 ? `Contraseña vencida` : `Vence ${fmtDay(account.passwordExpiresAt as string)} · ${days} d`}
						sx={{ fontVariantNumeric: "tabular-nums" }}
					/>
				) : (
					<Typography variant="caption" color="text.disabled">
						vencimiento —
					</Typography>
				)}
			</Stack>
		</Tooltip>
	);
};

export default PortalAccountCell;
