import React, { useCallback, useEffect, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	FormControl,
	IconButton,
	MenuItem,
	Select,
	Stack,
	Switch,
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
import judicialNotificationConfigService, {
	WhatsAppInstance,
	WhatsAppInstanceStatus,
	WhatsAppInstancesData,
} from "api/judicialNotificationConfig";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Líneas de WhatsApp registradas (colección whatsapp-instances de
 * la-notification) y el outbox de hoy por línea. Sirve para decidir si es
 * seguro prender el canal: sin ninguna línea "en rotación" (habilitada +
 * conectada), lo que se encole queda esperando.
 *
 * El alta de una línea sigue siendo por script en la-notification
 * (scripts/whatsappInstances.js add) — acá se administra lo que ya existe.
 */

const STATUS_LABEL: Record<WhatsAppInstanceStatus, string> = {
	pending_link: "Sin vincular",
	connected: "Conectada",
	disconnected: "Desconectada",
	banned: "Baneada",
	disabled: "Deshabilitada",
};

const STATUS_COLOR = (status: WhatsAppInstanceStatus, theme: any) => {
	switch (status) {
		case "connected":
			return theme.palette.success.main;
		case "banned":
			return theme.palette.error.main;
		case "pending_link":
			return theme.palette.warning.main;
		default:
			return theme.palette.text.secondary;
	}
};

const fmtCounts = (c: WhatsAppInstance["outboxToday"]) => {
	const parts = (["sent", "delivered", "read", "pending", "failed", "expired"] as const).filter((k) => c[k]).map((k) => `${c[k]} ${k}`);
	return parts.length ? parts.join(" · ") : "—";
};

const WhatsAppInstancesCard = () => {
	const theme = useTheme();
	const [data, setData] = useState<WhatsAppInstancesData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busyName, setBusyName] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setError(null);
			const result = await judicialNotificationConfigService.getWhatsappInstances();
			setData(result);
		} catch (err: any) {
			setError(err?.response?.data?.message || err?.message || "Error cargando líneas");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const patch = async (name: string, changes: Parameters<typeof judicialNotificationConfigService.updateWhatsappInstance>[1]) => {
		setBusyName(name);
		try {
			await judicialNotificationConfigService.updateWhatsappInstance(name, changes);
			await load();
			dispatch(
				openSnackbar({
					open: true,
					message: `Línea ${name} actualizada (toma efecto en ≤60 s)`,
					variant: "alert",
					alert: { color: "success" },
					close: false,
				}),
			);
		} catch (err: any) {
			dispatch(
				openSnackbar({
					open: true,
					message: err?.response?.data?.message || "No se pudo actualizar la línea",
					variant: "alert",
					alert: { color: "error" },
					close: false,
				}),
			);
		} finally {
			setBusyName(null);
		}
	};

	const instances = data?.instances || [];
	const inRotation = instances.filter((i) => i.inRotation).length;

	return (
		<Box
			sx={{
				mt: 2,
				p: 2,
				borderRadius: 1,
				border: `1px solid ${alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.25 : 0.15)}`,
				bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.05 : 0.02),
			}}
		>
			<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
				<Typography variant="subtitle2">Líneas de WhatsApp</Typography>
				{data && (
					<Chip
						size="small"
						label={inRotation > 0 ? `${inRotation} en rotación` : "Ninguna en rotación"}
						sx={{
							bgcolor: alpha(inRotation > 0 ? theme.palette.success.main : theme.palette.warning.main, 0.15),
							color: inRotation > 0 ? theme.palette.success.dark : theme.palette.warning.dark,
							fontWeight: 600,
						}}
					/>
				)}
				{data && data.outboxPendingTotal > 0 && (
					<Chip size="small" variant="outlined" label={`${data.outboxPendingTotal} mensaje(s) esperando en el outbox`} />
				)}
				<Box sx={{ flexGrow: 1 }} />
				<Tooltip title="Refrescar">
					<span>
						<IconButton size="small" onClick={load} disabled={loading}>
							<Refresh size={16} />
						</IconButton>
					</span>
				</Tooltip>
			</Stack>

			{loading && (
				<Stack direction="row" alignItems="center" spacing={1}>
					<CircularProgress size={16} />
					<Typography variant="caption" color="text.secondary">
						Cargando…
					</Typography>
				</Stack>
			)}

			{error && (
				<Alert severity="warning" sx={{ mb: 1 }}>
					{error}
				</Alert>
			)}

			{!loading && !error && instances.length === 0 && (
				<Typography variant="body2" color="text.secondary">
					No hay ninguna línea registrada todavía. Se cargan desde la-notification con{" "}
					<code>node scripts/whatsappInstances.js add &lt;nombre&gt; "&lt;etiqueta&gt;" +549…</code>; con el canal prendido y sin líneas,
					los mensajes quedan esperando (y vencen a las 48 h).
				</Typography>
			)}

			{instances.length > 0 && (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Línea</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell align="center">Habilitada</TableCell>
								<TableCell align="right">Tope/día</TableCell>
								<TableCell>Outbox hoy</TableCell>
								<TableCell>Última conexión</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{instances.map((i) => (
								<TableRow key={i.name} sx={{ opacity: i.inRotation ? 1 : 0.75 }}>
									<TableCell>
										<Typography variant="body2" sx={{ fontWeight: 600 }}>
											{i.label || i.name}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{i.name}
											{i.phoneNumber ? ` · ${i.phoneNumber}` : ""}
										</Typography>
									</TableCell>
									<TableCell>
										<FormControl size="small" variant="standard">
											<Select
												value={i.status}
												disabled={busyName === i.name}
												onChange={(e) => patch(i.name, { status: e.target.value as WhatsAppInstanceStatus })}
												sx={{ fontSize: "0.8rem", color: STATUS_COLOR(i.status, theme), fontWeight: 600 }}
												disableUnderline
											>
												{(Object.keys(STATUS_LABEL) as WhatsAppInstanceStatus[]).map((s) => (
													<MenuItem key={s} value={s} sx={{ fontSize: "0.8rem" }}>
														{STATUS_LABEL[s]}
													</MenuItem>
												))}
											</Select>
										</FormControl>
									</TableCell>
									<TableCell align="center">
										<Switch
											size="small"
											checked={i.enabled}
											disabled={busyName === i.name}
											onChange={(e) => patch(i.name, { enabled: e.target.checked })}
										/>
									</TableCell>
									<TableCell align="right">
										<Typography variant="body2">{i.dailyLimit ?? "—"}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption">{fmtCounts(i.outboxToday)}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption" color="text.secondary">
											{i.lastConnectionChange ? new Date(i.lastConnectionChange).toLocaleString("es-AR") : "—"}
											{i.lastConnectionReason ? ` (${i.lastConnectionReason})` : ""}
										</Typography>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			)}
		</Box>
	);
};

export default WhatsAppInstancesCard;
