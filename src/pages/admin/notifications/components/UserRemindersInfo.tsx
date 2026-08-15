import React from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { Box, Grid, Paper, Stack, Typography, Chip, Alert, Divider } from "@mui/material";
import { Calendar1, Task, Clock, Judge } from "iconsax-react";
import { LiveJudicialConfig } from "./useLiveJudicialConfig";
import { BRAND_BLUE } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Recordatorios del usuario: calendario, tareas, vencimientos e inactividad.
//
// Estos cuatro NO tienen configuración global de umbrales — cada usuario los
// ajusta desde su perfil (días de anticipación, notificar una sola vez, plazos
// de caducidad/prescripción). Acá se muestra qué los dispara, con qué defaults
// del sistema, y qué puede apagar el usuario.
// ----------------------------------------------------------------------

interface Reminder {
	key: string;
	titulo: string;
	icon: React.ReactElement;
	disparador: string;
	defaults: string;
	preferencia: string;
}

const REMINDERS: Reminder[] = [
	{
		key: "calendar",
		titulo: "Eventos del calendario",
		icon: <Calendar1 size={18} variant="Bulk" />,
		disparador: "Rutina matinal (9:00 ART)",
		defaults: "5 días de anticipación · notificar una sola vez",
		preferencia: "user.calendar + calendarSettings",
	},
	{
		key: "tasks",
		titulo: "Tareas próximas a vencer",
		icon: <Task size={18} variant="Bulk" />,
		disparador: "Rutina matinal (9:00 ART)",
		defaults: "5 días de anticipación · excluye completadas y canceladas",
		preferencia: "user.taskExpiration + taskExpirationSettings",
	},
	{
		key: "movements",
		titulo: "Vencimientos de movimientos",
		icon: <Clock size={18} variant="Bulk" />,
		disparador: "Rutina matinal (9:00 ART)",
		defaults: "5 días de anticipación",
		preferencia: "user.expiration + expirationSettings",
	},
	{
		key: "inactivity",
		titulo: "Caducidad y prescripción",
		icon: <Judge size={18} variant="Bulk" />,
		disparador: "Rutina matinal (9:00 ART)",
		defaults: "Caducidad 180 días · prescripción 730 días · aviso 5 días antes",
		preferencia: "user.inactivity + inactivitySettings",
	},
];

const UserRemindersInfo: React.FC<{ live: LiveJudicialConfig }> = ({ live }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { config } = live;

	const globalOn = config ? config.status?.enabled !== false && config.status?.mode !== "maintenance" : true;

	return (
		<Box>
			<Typography variant="h5" sx={{ mb: 0.5 }}>
				Recordatorios del usuario
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Los cuatro salen de la misma rutina matinal y comparten el informe unificado. A diferencia de los movimientos judiciales, sus
				umbrales <b>no se configuran acá</b>: cada usuario los ajusta desde su perfil, en Configuración de notificaciones.
			</Typography>

			<Alert severity="info" sx={{ mb: 2 }}>
				Lo que sí se controla desde este panel: el interruptor global y los días activos (pestaña General), los banners que acompañan estos
				correos (pestaña Banners) y la hora de la rutina (variable <code>NOTIFICATION_MORNING_DIGEST_CRON</code>, hoy 9:00 ART).
			</Alert>

			<Grid container spacing={2}>
				{REMINDERS.map((r) => (
					<Grid item xs={12} md={6} key={r.key}>
						<Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								<Box
									sx={{
										width: 28,
										height: 28,
										borderRadius: 1,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.08),
										color: BRAND_BLUE,
									}}
								>
									{r.icon}
								</Box>
								<Typography variant="subtitle1" fontWeight={600}>
									{r.titulo}
								</Typography>
								<Box sx={{ flexGrow: 1 }} />
								<Chip
									size="small"
									label={globalOn ? "activo" : "sistema apagado"}
									color={globalOn ? "success" : "default"}
									variant="outlined"
									sx={{ height: 20, fontSize: "0.65rem" }}
								/>
							</Stack>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Disparador: <b>{r.disparador}</b>
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Defaults del sistema: {r.defaults}
								</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.68rem" }}>
									{r.preferencia}
								</Typography>
							</Stack>
						</Paper>
					</Grid>
				))}
			</Grid>

			<Divider sx={{ my: 3 }} />

			<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
				Cómo verificar la configuración de un usuario
			</Typography>
			<Typography variant="body2" color="text.secondary">
				Las preferencias viven en el documento del usuario, bajo <code>preferences.notifications.user</code>. El usuario las edita en su
				perfil → Configuración de notificaciones, donde también decide si recibe movimientos judiciales (resumen diario o inmediatos) y
				seguimiento postal.
			</Typography>
		</Box>
	);
};

export default UserRemindersInfo;
