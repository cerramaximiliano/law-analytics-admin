import React, { useCallback, useEffect, useRef, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	FormControlLabel,
	Radio,
	RadioGroup,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";
import judicialNotificationConfigService, { WhatsAppConnectionState, WhatsAppProvider, WhatsAppQr } from "api/judicialNotificationConfig";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Vincular una línea nueva sin consola: crea la instancia en Evolution (vía
 * la-notification, que tiene las credenciales), muestra el QR y el pairing
 * code, renueva el QR antes de que venza y avisa cuando la conexión queda
 * abierta (la línea pasa a `connected` sola del lado del backend).
 */

interface Props {
	onConnected?: (name: string) => void;
}

const QR_REFRESH_MS = 40_000;
const STATE_POLL_MS = 5_000;
const STATE_TIMEOUT_MS = 5 * 60_000;

const NAME_RE = /^[a-z0-9][a-z0-9_-]{1,39}$/i;

const WhatsAppLinkPanel = ({ onConnected }: Props) => {
	const theme = useTheme();
	const [provider, setProvider] = useState<WhatsAppProvider>("meta");
	const [name, setName] = useState("");
	const [label, setLabel] = useState("");
	const [phone, setPhone] = useState("");
	const [phoneNumberId, setPhoneNumberId] = useState("");
	const [wabaId, setWabaId] = useState("");
	const [metaResult, setMetaResult] = useState<{
		displayPhoneNumber: string | null;
		verifiedName: string | null;
		qualityRating: string | null;
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [created, setCreated] = useState<string | null>(null);
	const [qr, setQr] = useState<WhatsAppQr | null>(null);
	const [state, setState] = useState<WhatsAppConnectionState | null>(null);
	const [refreshingQr, setRefreshingQr] = useState(false);
	const timers = useRef<{ qr?: ReturnType<typeof setInterval>; state?: ReturnType<typeof setInterval>; deadline?: number }>({});

	const stopTimers = useCallback(() => {
		if (timers.current.qr) clearInterval(timers.current.qr);
		if (timers.current.state) clearInterval(timers.current.state);
		timers.current = {};
	}, []);

	useEffect(() => stopTimers, [stopTimers]);

	const fetchQr = useCallback(
		async (instanceName: string) => {
			setRefreshingQr(true);
			try {
				const next = await judicialNotificationConfigService.getWhatsappInstanceQr(instanceName, phone.trim() || undefined);
				if (next) setQr(next);
			} catch (err: any) {
				setError(err?.response?.data?.message || "No se pudo obtener el QR");
			} finally {
				setRefreshingQr(false);
			}
		},
		[phone],
	);

	const startWatching = useCallback(
		(instanceName: string) => {
			stopTimers();
			timers.current.deadline = Date.now() + STATE_TIMEOUT_MS;
			timers.current.qr = setInterval(() => fetchQr(instanceName), QR_REFRESH_MS);
			timers.current.state = setInterval(async () => {
				try {
					const { state: next } = await judicialNotificationConfigService.getWhatsappInstanceState(instanceName);
					setState(next);
					if (next === "open") {
						stopTimers();
						dispatch(
							openSnackbar({
								open: true,
								message: `Línea ${instanceName} conectada. Recordá el warm-up antes de prender el canal.`,
								variant: "alert",
								alert: { color: "success" },
								close: false,
							}),
						);
						onConnected?.(instanceName);
					} else if (timers.current.deadline && Date.now() > timers.current.deadline) {
						stopTimers();
						setError(
							"Pasaron 5 minutos sin conexión. Podés pedir un QR nuevo o marcar la línea como Conectada desde la tabla cuando termines de vincular.",
						);
					}
				} catch {
					// un poll fallido no corta el flujo; el siguiente vuelve a intentar
				}
			}, STATE_POLL_MS);
		},
		[fetchQr, onConnected, stopTimers],
	);

	const handleCreate = async () => {
		const trimmed = name.trim();
		if (!NAME_RE.test(trimmed)) {
			setError("El nombre de la instancia admite letras, números, guiones y guión bajo (2 a 40 caracteres), por ejemplo linea-1.");
			return;
		}
		if (provider === "meta" && !phoneNumberId.trim()) {
			setError("Para un número de Meta hace falta el Phone number ID (WhatsApp Manager → Números de teléfono).");
			return;
		}
		setBusy(true);
		setError(null);
		setQr(null);
		setState(null);
		setMetaResult(null);
		try {
			const result = await judicialNotificationConfigService.createWhatsappInstance({
				name: trimmed,
				label: label.trim() || undefined,
				phone: phone.trim() || undefined,
				provider,
				phoneNumberId: provider === "meta" ? phoneNumberId.trim() : undefined,
				wabaId: provider === "meta" && wabaId.trim() ? wabaId.trim() : undefined,
			});
			setCreated(result.name);
			if (result.provider === "meta") {
				// Sin QR: queda conectada al validar contra Graph API.
				setMetaResult(result.meta || null);
				setState("open");
				dispatch(
					openSnackbar({
						open: true,
						message: `Número de Meta ${result.meta?.displayPhoneNumber || result.name} registrado y en rotación`,
						variant: "alert",
						alert: { color: "success" },
						close: false,
					}),
				);
				onConnected?.(result.name);
			} else if (result.qr?.alreadyOpen) {
				setState("open");
				onConnected?.(result.name);
			} else {
				if (result.qr) setQr(result.qr);
				else await fetchQr(result.name);
				startWatching(result.name);
			}
		} catch (err: any) {
			setError(err?.response?.data?.message || "No se pudo crear la instancia");
		} finally {
			setBusy(false);
		}
	};

	const stateChip = (() => {
		if (!created) return null;
		const label =
			state === "open" ? "Conectada" : state === "connecting" ? "Conectando…" : state === "close" ? "Esperando escaneo" : "Esperando…";
		const color = state === "open" ? theme.palette.success.main : theme.palette.warning.main;
		return <Chip size="small" label={label} sx={{ bgcolor: alpha(color, 0.15), color, fontWeight: 600 }} />;
	})();

	return (
		<Box
			sx={{
				mt: 1.5,
				mb: 1.5,
				p: 2,
				borderRadius: 1,
				border: `1px dashed ${alpha(BRAND_BLUE, 0.4)}`,
				bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.06 : 0.03),
			}}
		>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Vincular una línea nueva
			</Typography>

			{!created && (
				<Stack spacing={1.5}>
					<RadioGroup row value={provider} onChange={(e) => setProvider(e.target.value as WhatsAppProvider)}>
						<FormControlLabel
							value="meta"
							control={<Radio size="small" />}
							label={<Typography variant="body2">WhatsApp Cloud API (Meta) — principal</Typography>}
						/>
						<FormControlLabel
							value="baileys"
							control={<Radio size="small" />}
							label={<Typography variant="body2">Evolution API (QR) — respaldo</Typography>}
						/>
					</RadioGroup>
					<Typography variant="caption" color="text.secondary">
						{provider === "meta"
							? "Número dado de alta en la WABA (WhatsApp Manager). Se valida contra Meta y queda en rotación al instante, sin QR. Necesita WHATSAPP_META_ACCESS_TOKEN en la-notification."
							: "El chip tiene que estar activo en un teléfono con WhatsApp instalado. Con el número, además del QR vas a tener un pairing code para vincular sin cámara."}
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
						<TextField
							id="wa-link-name"
							size="small"
							label="Nombre de instancia"
							placeholder={provider === "meta" ? "meta-principal" : "linea-1"}
							value={name}
							onChange={(e) => setName(e.target.value)}
							helperText={provider === "meta" ? "Identificador interno" : "Igual en Evolution y en la tabla"}
							sx={{ flex: 1 }}
						/>
						<TextField
							id="wa-link-label"
							size="small"
							label="Etiqueta"
							placeholder="Línea 1 — Buenos Aires"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							sx={{ flex: 1 }}
						/>
						{provider === "meta" ? (
							<TextField
								id="wa-link-phone-number-id"
								size="small"
								label="Phone number ID"
								placeholder="1065403522…"
								value={phoneNumberId}
								onChange={(e) => setPhoneNumberId(e.target.value)}
								helperText="WhatsApp Manager → Números"
								sx={{ flex: 1 }}
							/>
						) : (
							<TextField
								id="wa-link-phone"
								size="small"
								label="Número (opcional)"
								placeholder="+54 9 11 5555 5555"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								sx={{ flex: 1 }}
							/>
						)}
					</Stack>
					{provider === "meta" && (
						<TextField
							id="wa-link-waba-id"
							size="small"
							label="WABA ID (opcional)"
							value={wabaId}
							onChange={(e) => setWabaId(e.target.value)}
							sx={{ maxWidth: 320 }}
						/>
					)}
					<Box>
						<Button
							variant="contained"
							size="small"
							onClick={handleCreate}
							disabled={busy || !name.trim() || (provider === "meta" && !phoneNumberId.trim())}
							sx={{ bgcolor: BRAND_BLUE }}
						>
							{busy ? "Registrando…" : provider === "meta" ? "Registrar número de Meta" : "Crear y mostrar QR"}
						</Button>
					</Box>
				</Stack>
			)}

			{created && metaResult && (
				<Stack spacing={0.5} sx={{ mb: 1 }}>
					<Typography variant="body2">
						<strong>{metaResult.displayPhoneNumber || created}</strong>
						{metaResult.verifiedName ? ` · ${metaResult.verifiedName}` : ""}
						{metaResult.qualityRating ? ` · calidad ${metaResult.qualityRating}` : ""}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Registrado como WhatsApp Cloud API. Recordá dar de alta el webhook en Meta apuntando a /api/whatsapp/meta-webhook.
					</Typography>
				</Stack>
			)}

			{created && (
				<Stack spacing={1.5}>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							{created}
						</Typography>
						{stateChip}
						{refreshingQr && <CircularProgress size={14} />}
					</Stack>

					{state !== "open" && (
						<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "flex-start" }}>
							{qr?.base64 ? (
								<Box
									component="img"
									src={qr.base64}
									alt={`QR de ${created}`}
									sx={{ width: 240, height: 240, borderRadius: 1, border: `1px solid ${theme.palette.divider}`, bgcolor: "#fff" }}
								/>
							) : (
								<Box
									sx={{
										width: 240,
										height: 240,
										borderRadius: 1,
										border: `1px dashed ${theme.palette.divider}`,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										p: 2,
										textAlign: "center",
									}}
								>
									<Typography variant="caption" color="text.secondary">
										Evolution todavía no generó el QR. Probá "Nuevo QR" en unos segundos.
									</Typography>
								</Box>
							)}
							<Stack spacing={1} sx={{ flex: 1 }}>
								<Typography variant="body2">
									En el teléfono: <strong>WhatsApp → Dispositivos vinculados → Vincular un dispositivo</strong> y escaneá el QR. Se renueva
									solo cada 40 s.
								</Typography>
								{qr?.pairingCode && (
									<Typography variant="body2">
										Sin cámara: elegí <strong>"Vincular con el número de teléfono"</strong> y escribí el código{" "}
										<Box component="span" sx={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.08em" }}>
											{qr.pairingCode}
										</Box>
									</Typography>
								)}
								<Stack direction="row" spacing={1}>
									<Button size="small" variant="outlined" onClick={() => fetchQr(created)} disabled={refreshingQr}>
										Nuevo QR
									</Button>
									<Button
										size="small"
										onClick={() => {
											stopTimers();
											setCreated(null);
											setQr(null);
											setState(null);
											setError(null);
										}}
									>
										Cancelar
									</Button>
								</Stack>
							</Stack>
						</Stack>
					)}
				</Stack>
			)}

			{error && (
				<Alert severity="warning" sx={{ mt: 1.5 }}>
					{error}
				</Alert>
			)}
		</Box>
	);
};

export default WhatsAppLinkPanel;
