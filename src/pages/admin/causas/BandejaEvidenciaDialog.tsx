import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
	Divider,
	Stack,
	Typography,
} from "@mui/material";
import ImageActions from "components/ImageActions";
import CopyButton from "components/CopyButton";
import { fetchImageBlob } from "utils/imageActions";
import { clickableProps } from "utils/a11y";
import pjnCredentialsService, { BandejaErrorEntry, BandejaHttpResult, BandejaState } from "api/pjnCredentials";

interface Props {
	open: boolean;
	credentialId: string | null;
	title?: string;
	userEmail?: string | null;
	onClose: () => void;
}

interface ContentProps {
	credentialId: string;
	/** ISO del error a resaltar (el `?at=` del link del correo de alertas). */
	highlightAt?: string | null;
	/** Email del usuario de la credencial: se muestra en cada captura y en el nombre del archivo. */
	userEmail?: string | null;
}

export const bandejaPagePath = (credentialId: string, at?: string | null) =>
	`/admin/causas/credentials/${credentialId}/bandeja${at ? `?at=${encodeURIComponent(at)}` : ""}`;

// El link del correo lleva el timestamp de la entrada de errorHistory; capturedAt
// es unos segundos anterior (la evidencia se toma antes de grabar el estado).
const HIGHLIGHT_TOLERANCE_MS = 60 * 1000;
const matchesAt = (e: BandejaErrorEntry, at?: string | null) => {
	if (!at) return false;
	const target = new Date(at).getTime();
	if (Number.isNaN(target)) return false;
	return [e.timestamp, e.capturedAt].some((t) => t && Math.abs(new Date(t).getTime() - target) <= HIGHLIGHT_TOLERANCE_MS);
};

// Qué muestra cada captura que guarda el worker (bandeja-evidence.js). Sin esto
// se leen como dos errores distintos: "Listado sin resultados" (portal) no es un
// fallo y "Error en el servidor" (notif) es cómo la app muestra el 403.
const SCREENSHOT_INFO: Record<string, { title: string; help: string }> = {
	portal: {
		title: "Portal tras el login",
		help: 'portalpjn.pjn.gov.ar/inicio con la sesión del worker. El menú lista las apps que tiene la cuenta; "Listado sin resultados" es la tabla de Entradas (Mis Eventos) vacía, no un error.',
	},
	notif: {
		title: "App de Notificaciones",
		help: 'notif.pjn.gov.ar abierta con la misma sesión, como la vería el usuario. Si la API rechaza la cuenta (403), la app lo muestra como "Error en el servidor": no indica una caída del portal.',
	},
};

// Diagnóstico a partir de los permisos del token: la bandeja (notificaciones y
// escritos) es del letrado. Una cuenta con rol r:parte en el SCW es de una parte
// y el portal nunca le va a dar bandeja: el 403 es permanente.
const tokenDiagnosis = (token: BandejaErrorEntry["token"]) => {
	if (!token) return null;
	const all = Object.entries(token.clientRoles || {}).flatMap(([c, rs]) => rs.map((r) => `${c}:${r}`));
	const aud = ([] as string[]).concat(token.aud || []);
	const hasBandejaClient =
		aud.some((a) => /notif|escrito/i.test(a)) || Object.keys(token.clientRoles || {}).some((c) => /notif|escrito/i.test(c));
	if (all.some((r) => /:r:parte$/.test(r)) && !hasBandejaClient) {
		return {
			severity: "warning" as const,
			text: "Cuenta de parte (rol r:parte), no de letrado: el token no incluye las apps de notificaciones ni escritos. El 403 es permanente: no es una falla del portal ni de la credencial, y no se resuelve reintentando.",
		};
	}
	if (!hasBandejaClient) {
		return {
			severity: "info" as const,
			text: "El token no incluye las apps de notificaciones ni escritos: la cuenta no tiene bandeja del letrado. Probablemente permanente.",
		};
	}
	return null;
};

// El body se guarda como string (truncado a 500): si es JSON válido se muestra parseado.
const parseBody = (body?: string | null): unknown => {
	if (body == null) return null;
	try {
		return JSON.parse(body);
	} catch (_) {
		return body;
	}
};

const apiResponseJson = (http: BandejaErrorEntry["http"]) =>
	JSON.stringify(
		Object.fromEntries(
			(
				[
					["notificaciones", http?.notif],
					["escritos", http?.escritos],
				] as const
			).map(([k, r]) => [
				k,
				r
					? {
							...(r.method || r.url ? { request: `${(r.method || "GET").toUpperCase()} ${r.url || "(url no registrada)"}` } : {}),
							status: r.status,
							error: r.message,
							body: parseBody(r.body),
					  }
					: null,
			]),
		),
		null,
		2,
	);

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-AR") : "—");

const httpColor = (status?: number | null): "success" | "warning" | "error" | "default" =>
	status == null ? "default" : status < 300 ? "success" : status < 500 ? "warning" : "error";

const HttpChip = ({ name, r }: { name: string; r?: BandejaHttpResult | null }) => (
	<Chip size="small" color={httpColor(r?.status)} label={`${name}: ${r?.status ?? "sin respuesta"}`} />
);

export const BandejaEvidenciaContent = ({ credentialId, highlightAt, userEmail }: ContentProps) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<BandejaState | null>(null);
	const [lightbox, setLightbox] = useState<{ url: string; label: string; caption: string } | null>(null);

	const highlightRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!credentialId) return;
		let alive = true;
		setLoading(true);
		setError(null);
		setState(null);
		pjnCredentialsService
			.getBandejaState(credentialId)
			.then((r) => alive && setState(r.data))
			.catch((e) => {
				console.error("Error cargando estado de bandeja:", e);
				if (alive) setError("No se pudo cargar el estado de la bandeja.");
			})
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [credentialId]);

	useEffect(() => {
		if (state && highlightRef.current) highlightRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [state]);

	const highlightIdx = state ? state.errorHistory.findIndex((e) => matchesAt(e, highlightAt)) : -1;

	const renderEntry = (e: BandejaErrorEntry, i: number) => {
		const roles = e.token?.realmRoles || [];
		const clientRoles = Object.entries(e.token?.clientRoles || {});
		// Chequeo por API: el veredicto sale de la respuesta HTTP de notif/escritos,
		// no de una pantalla. Las capturas (si hay) son contexto del portal.
		const isApiCheck = !!(e.http?.notif || e.http?.escritos);
		const diagnosis = e.code === "NO_BANDEJA_ACCESS" ? tokenDiagnosis(e.token) : null;
		const highlighted = i === highlightIdx;
		const permalink = `${window.location.origin}${bandejaPagePath(credentialId, e.timestamp || e.capturedAt)}`;
		return (
			<Box
				key={`${e.timestamp}-${i}`}
				ref={highlighted ? highlightRef : undefined}
				sx={{
					border: highlighted ? 2 : 1,
					borderColor: highlighted ? "primary.main" : "divider",
					borderRadius: 1,
					p: 1.5,
					scrollMarginTop: 80,
				}}
			>
				<Stack spacing={1}>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<Chip size="small" color="error" label={e.code || "ERROR"} />
						<Typography variant="caption">{fmt(e.capturedAt || e.timestamp)}</Typography>
						{e.consecutiveErrors != null && <Chip size="small" variant="outlined" label={`${e.consecutiveErrors} consecutivos`} />}
						<Chip
							size="small"
							variant="outlined"
							color={isApiCheck ? "info" : "default"}
							label={isApiCheck ? "Revisión por API" : "Revisión en el portal"}
						/>
						{highlighted && <Chip size="small" color="primary" label="Error de la alerta" />}
						<Box sx={{ flexGrow: 1 }} />
						<CopyButton value={permalink} label="link a este error" size={15} />
					</Stack>
					{e.message && <Typography variant="body2">{e.message}</Typography>}
					{diagnosis && (
						<Alert severity={diagnosis.severity} variant="outlined" sx={{ py: 0 }}>
							{diagnosis.text}
						</Alert>
					)}
					{isApiCheck && (
						<Box>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
								<Typography variant="subtitle2">Respuesta de la API</Typography>
								<HttpChip name="Notificaciones" r={e.http?.notif} />
								<HttpChip name="Escritos" r={e.http?.escritos} />
								<CopyButton value={apiResponseJson(e.http)} label="JSON" size={15} />
							</Stack>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
								El worker revisa la bandeja por API (notificaciones y escritos, con el token del login). Esta verificación no tiene
								screenshot: lo que sigue es la respuesta que devolvió el portal (body truncado a 500 caracteres).
							</Typography>
							<Box
								component="pre"
								sx={{
									m: 0,
									p: 1,
									fontSize: 11,
									bgcolor: "action.hover",
									borderRadius: 1,
									whiteSpace: "pre-wrap",
									wordBreak: "break-all",
									maxHeight: 320,
									overflow: "auto",
								}}
							>
								{apiResponseJson(e.http)}
							</Box>
						</Box>
					)}
					{e.token && (
						<Box>
							<Typography variant="caption" color="text.secondary">
								Token (solo permisos): azp {e.token.azp || "—"} · scope {e.token.scope || "—"} · vence{" "}
								{e.token.exp ? fmt(typeof e.token.exp === "number" ? new Date(e.token.exp * 1000).toISOString() : e.token.exp) : "—"}
							</Typography>
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
								{roles.map((r) => (
									<Chip key={`r-${r}`} size="small" variant="outlined" label={r} />
								))}
								{clientRoles.flatMap(([c, rs]) =>
									rs.map((r) => <Chip key={`${c}-${r}`} size="small" variant="outlined" color="info" label={`${c}: ${r}`} />),
								)}
								{!roles.length && !clientRoles.length && (
									<Typography variant="caption" color="text.disabled">
										sin roles
									</Typography>
								)}
							</Stack>
						</Box>
					)}
					{e.screenshots.length === 0 && (
						<Typography variant="caption" color="text.disabled">
							{isApiCheck
								? "Sin screenshot: la revisión fue por API (ver respuesta arriba)."
								: "Sin screenshot registrado para este fallo."}
						</Typography>
					)}
					{e.screenshots.length > 0 && isApiCheck && (
						<Typography variant="caption" color="text.secondary">
							Capturas del portal con la sesión del worker: contexto de qué ve la cuenta, no son la verificación.
						</Typography>
					)}
					{e.screenshots.length > 0 && (
						<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
							{e.screenshots.map((sc, k) => (
								<Box key={k} sx={{ width: 260 }}>
									<Typography variant="caption" fontWeight={600} display="block">
										{(sc.label && SCREENSHOT_INFO[sc.label]?.title) || sc.label || "captura"}
									</Typography>
									{userEmail && (
										<Typography variant="caption" display="block" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
											{userEmail}
										</Typography>
									)}
									{sc.label && SCREENSHOT_INFO[sc.label] && (
										<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, lineHeight: 1.35 }}>
											{SCREENSHOT_INFO[sc.label].help}
										</Typography>
									)}
									{sc.screenshotUrl ? (
										<Box
											component="img"
											src={sc.screenshotUrl}
											alt={`captura ${sc.label || ""}`}
											{...clickableProps(
												() =>
													setLightbox({
														url: sc.screenshotUrl as string,
														label: [
															"bandeja",
															userEmail?.replace(/[^a-z0-9@._-]/gi, "_"),
															sc.label || "captura",
															(e.capturedAt || e.timestamp || "").slice(0, 16).replace(/[:T]/g, "-"),
														]
															.filter(Boolean)
															.join("-"),
														caption: [
															(sc.label && SCREENSHOT_INFO[sc.label]?.title) || sc.label || "captura",
															userEmail,
															fmt(e.capturedAt || e.timestamp),
														]
															.filter(Boolean)
															.join(" · "),
													}),
												{
													label: `Ampliar captura ${sc.label || ""}`.trim(),
												},
											)}
											sx={{
												display: "block",
												width: "100%",
												maxHeight: 140,
												objectFit: "cover",
												objectPosition: "top",
												border: 1,
												borderColor: "divider",
												borderRadius: 1,
												cursor: "zoom-in",
											}}
										/>
									) : (
										<Typography variant="caption" display="block" color="text.disabled">
											{e.expired ? "captura expirada" : "captura no disponible"}
										</Typography>
									)}
									{sc.textSnippet && (
										<Box component="details" sx={{ mt: 0.5 }}>
											<Typography component="summary" variant="caption" color="text.secondary" sx={{ cursor: "pointer" }}>
												Texto del portal (puede incluir datos del usuario)
											</Typography>
											<Box
												component="pre"
												sx={{
													m: 0,
													mt: 0.5,
													p: 1,
													fontSize: 11,
													bgcolor: "action.hover",
													borderRadius: 1,
													whiteSpace: "pre-wrap",
													wordBreak: "break-word",
													maxHeight: 200,
													overflow: "auto",
												}}
											>
												{sc.textSnippet}
											</Box>
										</Box>
									)}
								</Box>
							))}
						</Stack>
					)}
				</Stack>
			</Box>
		);
	};

	return (
		<>
			{state && highlightAt && highlightIdx === -1 && (
				<Alert severity="warning" variant="outlined">
					El error del link ({fmt(highlightAt)}) ya no está en el historial (se guardan los últimos 10).
				</Alert>
			)}
			{loading && (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress />
				</Box>
			)}
			{error && <Alert severity="error">{error}</Alert>}
			{!loading && !error && !state && <Alert severity="info">El worker de bandeja todavía no registró estado para esta credencial.</Alert>}
			{state && (
				<Stack spacing={2}>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						<Chip
							size="small"
							color={state.consecutiveErrors ? "error" : "default"}
							label={`Errores consecutivos: ${state.consecutiveErrors}`}
						/>
						<Chip
							size="small"
							color={state.consecutiveNoAccess ? "warning" : "default"}
							label={`Sin acceso consecutivos: ${state.consecutiveNoAccess}`}
						/>
						{state.excludedUntil && new Date(state.excludedUntil) > new Date() && (
							<Chip
								size="small"
								color="warning"
								label={`Excluida hasta ${fmt(state.excludedUntil)}${state.excludedReason ? ` (${state.excludedReason})` : ""}`}
							/>
						)}
					</Stack>
					<Typography variant="caption" color="text.secondary">
						Última corrida: {fmt(state.lastRunAt)} · Último éxito: {fmt(state.lastSuccessAt)}
						{state.lastPlazos &&
							` · Plazos: ${Object.entries(state.lastPlazos)
								.map(([k, v]) => `${k} ${v}`)
								.join(", ")}`}
					</Typography>
					{state.lastError && (
						<Alert severity="error" variant="outlined">
							{state.lastError.code}: {state.lastError.message} ({fmt(state.lastError.timestamp)})
						</Alert>
					)}
					<Divider />
					{state.errorHistory.length ? (
						state.errorHistory.map(renderEntry)
					) : (
						<Alert severity="info" variant="outlined">
							Sin fallos registrados con evidencia. Se guardan a partir de ahora (últimos 10).
						</Alert>
					)}
				</Stack>
			)}
			<Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
				{lightbox && (
					<Typography variant="subtitle2" sx={{ px: 2, pt: 1.5, pb: 1 }}>
						{lightbox.caption}
					</Typography>
				)}
				{lightbox && (
					<Box
						component="img"
						src={lightbox.url}
						alt="captura de bandeja"
						sx={{ display: "block", maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain" }}
					/>
				)}
				<DialogActions>
					{lightbox && <ImageActions getBlob={() => fetchImageBlob(lightbox.url)} label={lightbox.label} />}
					<Button onClick={() => setLightbox(null)}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

const BandejaEvidenciaDialog = ({ open, credentialId, title, userEmail, onClose }: Props) => (
	<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
		<DialogTitle>
			<Typography variant="h5">Bandeja — evidencia de fallos</Typography>
			{title && (
				<Typography variant="caption" color="text.secondary">
					{title}
				</Typography>
			)}
		</DialogTitle>
		<DialogContent dividers>
			{open && credentialId && <BandejaEvidenciaContent credentialId={credentialId} userEmail={userEmail} />}
		</DialogContent>
		<DialogActions>
			{credentialId && (
				<Button component={RouterLink} to={bandejaPagePath(credentialId)} onClick={onClose}>
					Abrir en página
				</Button>
			)}
			<Button onClick={onClose}>Cerrar</Button>
		</DialogActions>
	</Dialog>
);

export default BandejaEvidenciaDialog;
