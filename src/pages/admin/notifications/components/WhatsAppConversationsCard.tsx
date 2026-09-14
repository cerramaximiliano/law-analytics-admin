import React, { useCallback, useEffect, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	IconButton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import judicialNotificationConfigService, { WhatsAppConversationMessage, WhatsAppConversationsData } from "api/judicialNotificationConfig";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Conversaciones de WhatsApp: lo que escriben los usuarios (whatsapp-messages,
 * Meta no guarda historial) y lo que les mandamos (outbox), en una sola línea
 * de tiempo. Solo lectura. Sirve para ver qué hace el bot con cada mensaje
 * (handledAs) y si los avisos llegan (delivered/read).
 */

const KIND_LABEL: Record<string, string> = {
	verification: "Verificación",
	opt_out: "Baja",
	auto_reply: "Auto-respuesta",
	ignored_unknown: "Desconocido",
	media: "Adjunto",
	no_access: "Sin acceso",
	bot_novedades: "Bot · novedades",
	bot_menu: "Bot · menú",
	bot_fallback: "Bot · menú",
	bot_fallback_silenced: "Bot · silenciado",
	bot_error: "Bot · error",
	bot_pending: "Bot · procesando",
	judicial_movement_digest: "Aviso de novedades",
	verification_reply: "Resp. verificación",
	opt_out_reply: "Resp. baja",
};

const STATUS_COLOR = (status: string | null, theme: any) => {
	switch (status) {
		case "read":
		case "delivered":
			return theme.palette.success.main;
		case "sent":
			return BRAND_BLUE;
		case "failed":
		case "expired":
			return theme.palette.error.main;
		default:
			return theme.palette.warning.main;
	}
};

const fmtDate = (iso: string) => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? "-"
		: d.toLocaleString("es-AR", {
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				timeZone: "America/Argentina/Buenos_Aires",
		  });
};

const WhatsAppConversationsCard = () => {
	const theme = useTheme();
	const [data, setData] = useState<WhatsAppConversationsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [limit, setLimit] = useState(50);

	const load = useCallback(
		async (opts?: { phone?: string; email?: string; limit?: number }) => {
			setLoading(true);
			setError(null);
			try {
				const result = await judicialNotificationConfigService.getWhatsappConversations({
					limit: opts?.limit ?? limit,
					phone: (opts?.phone ?? phone) || undefined,
					email: (opts?.email ?? email) || undefined,
				});
				setData(result);
			} catch (e: any) {
				setError(e?.response?.data?.message || e?.message || "No se pudieron cargar las conversaciones");
			} finally {
				setLoading(false);
			}
		},
		[limit, phone, email],
	);

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const today = data?.today;
	const inboundToday = today ? Object.values(today.inboundByKind).reduce((a, b) => a + b, 0) : 0;

	return (
		<Box sx={{ mt: 3 }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1 }}>
				<Box>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Conversaciones de WhatsApp
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Entrantes (todo lo que escriben los usuarios) y salientes (outbox), más recientes primero. Solo lectura.
					</Typography>
				</Box>
				<Stack direction="row" spacing={1} alignItems="center">
					{today && (
						<Typography variant="caption" color="text.secondary">
							Hoy: {inboundToday} entrantes ·{" "}
							{Object.entries(today.outboundByStatus)
								.map(([s, n]) => `${n} ${s}`)
								.join(", ") || "0 salientes"}
						</Typography>
					)}
					<Tooltip title="Actualizar">
						<IconButton size="small" onClick={() => load()} disabled={loading}>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
				<TextField
					size="small"
					label="Teléfono"
					placeholder="últimos dígitos"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && load()}
					sx={{ width: 180 }}
				/>
				<TextField
					size="small"
					label="Email del usuario"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && load()}
					sx={{ width: 240 }}
				/>
				<TextField
					size="small"
					label="Cantidad"
					type="number"
					value={limit}
					onChange={(e) => setLimit(Math.min(200, Math.max(1, parseInt(e.target.value) || 50)))}
					inputProps={{ min: 1, max: 200 }}
					sx={{ width: 110 }}
				/>
				<Button size="small" variant="outlined" onClick={() => load()} disabled={loading}>
					Filtrar
				</Button>
				{(phone || email) && (
					<Button
						size="small"
						onClick={() => {
							setPhone("");
							setEmail("");
							load({ phone: "", email: "" });
						}}
					>
						Limpiar
					</Button>
				)}
			</Stack>

			{error && (
				<Alert severity="error" sx={{ mb: 1 }}>
					{error}
				</Alert>
			)}

			{loading && !data ? (
				<Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
					<CircularProgress size={18} />
					<Typography variant="body2">Cargando…</Typography>
				</Stack>
			) : (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Dir.</TableCell>
								<TableCell>Usuario</TableCell>
								<TableCell>Teléfono</TableCell>
								<TableCell>Mensaje</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Línea</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{(data?.messages || []).map((m: WhatsAppConversationMessage) => (
								<TableRow key={`${m.direction}-${m.id}`} hover>
									<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(m.at)}</TableCell>
									<TableCell>
										<Chip
											size="small"
											label={m.direction === "in" ? "↓ entra" : "↑ sale"}
											sx={{
												height: 20,
												fontSize: "0.68rem",
												fontWeight: 600,
												bgcolor: alpha(m.direction === "in" ? theme.palette.info.main : BRAND_BLUE, 0.12),
												color: m.direction === "in" ? theme.palette.info.dark : BRAND_BLUE,
											}}
										/>
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>
										{m.user ? (
											<Tooltip title={m.user.name || ""}>
												<span>{m.user.email}</span>
											</Tooltip>
										) : (
											<Typography variant="caption" color="text.secondary">
												(no es usuario)
											</Typography>
										)}
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.8rem" }}>{m.phone || "-"}</TableCell>
									<TableCell sx={{ maxWidth: 420 }}>
										<Tooltip title={m.text || ""} placement="top-start">
											<Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
												{m.text || <em>(sin texto)</em>}
											</Typography>
										</Tooltip>
										{m.failureReason && (
											<Typography variant="caption" color="error">
												{m.failureReason}
											</Typography>
										)}
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>
										<Typography variant="caption">{m.kind ? KIND_LABEL[m.kind] || m.kind : "-"}</Typography>
									</TableCell>
									<TableCell>
										{m.status ? (
											<Chip
												size="small"
												label={m.status}
												sx={{
													height: 20,
													fontSize: "0.68rem",
													fontWeight: 600,
													bgcolor: alpha(STATUS_COLOR(m.status, theme), 0.12),
													color: STATUS_COLOR(m.status, theme),
												}}
											/>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>
										<Typography variant="caption">
											{m.instance || "-"}
											{m.provider ? ` (${m.provider})` : ""}
										</Typography>
									</TableCell>
								</TableRow>
							))}
							{data && data.messages.length === 0 && (
								<TableRow>
									<TableCell colSpan={8}>
										<Typography variant="body2" color="text.secondary">
											Sin mensajes{phone || email ? " para ese filtro" : " todavía"}.
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</Box>
			)}
		</Box>
	);
};

export default WhatsAppConversationsCard;
