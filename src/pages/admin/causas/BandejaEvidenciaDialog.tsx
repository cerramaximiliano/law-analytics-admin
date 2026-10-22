import { useEffect, useState } from "react";
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
import { fetchImageBlob } from "utils/imageActions";
import pjnCredentialsService, { BandejaErrorEntry, BandejaHttpResult, BandejaState } from "api/pjnCredentials";

interface Props {
	open: boolean;
	credentialId: string | null;
	title?: string;
	onClose: () => void;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-AR") : "—");

const httpColor = (status?: number | null): "success" | "warning" | "error" | "default" =>
	status == null ? "default" : status < 300 ? "success" : status < 500 ? "warning" : "error";

const HttpChip = ({ name, r }: { name: string; r?: BandejaHttpResult | null }) => (
	<Stack spacing={0.5}>
		<Chip size="small" color={httpColor(r?.status)} label={`${name}: ${r?.status ?? "sin respuesta"}`} sx={{ alignSelf: "flex-start" }} />
		{r?.message && (
			<Typography variant="caption" color="text.secondary">
				{r.message}
			</Typography>
		)}
		{r?.body && (
			<Box
				component="pre"
				sx={{ m: 0, p: 1, fontSize: 11, bgcolor: "action.hover", borderRadius: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
			>
				{r.body}
			</Box>
		)}
	</Stack>
);

const BandejaEvidenciaDialog = ({ open, credentialId, title, onClose }: Props) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [state, setState] = useState<BandejaState | null>(null);
	const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);

	useEffect(() => {
		if (!open || !credentialId) return;
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
	}, [open, credentialId]);

	const renderEntry = (e: BandejaErrorEntry, i: number) => {
		const roles = e.token?.realmRoles || [];
		const clientRoles = Object.entries(e.token?.clientRoles || {});
		return (
			<Box key={`${e.timestamp}-${i}`} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
				<Stack spacing={1}>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<Chip size="small" color="error" label={e.code || "ERROR"} />
						<Typography variant="caption">{fmt(e.capturedAt || e.timestamp)}</Typography>
						{e.consecutiveErrors != null && <Chip size="small" variant="outlined" label={`${e.consecutiveErrors} consecutivos`} />}
					</Stack>
					{e.message && <Typography variant="body2">{e.message}</Typography>}
					{e.http && (
						<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
							<HttpChip name="Notificaciones" r={e.http.notif} />
							<HttpChip name="Escritos" r={e.http.escritos} />
						</Stack>
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
					{e.screenshots.length > 0 && (
						<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
							{e.screenshots.map((sc, k) => (
								<Box key={k} sx={{ width: 220 }}>
									<Typography variant="caption" color="text.secondary">
										{sc.label || "captura"}
									</Typography>
									{sc.screenshotUrl ? (
										<Box
											component="img"
											src={sc.screenshotUrl}
											alt={`captura ${sc.label || ""}`}
											onClick={() => setLightbox({ url: sc.screenshotUrl as string, label: `bandeja-${sc.label || "captura"}` })}
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
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					)}
					{error && <Alert severity="error">{error}</Alert>}
					{!loading && !error && !state && (
						<Alert severity="info">El worker de bandeja todavía no registró estado para esta credencial.</Alert>
					)}
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
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose}>Cerrar</Button>
				</DialogActions>
			</Dialog>
			<Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
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

export default BandejaEvidenciaDialog;
