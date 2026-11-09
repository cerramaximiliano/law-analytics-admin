import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import ImageActions from "components/ImageActions";
import { fetchImageBlob } from "utils/imageActions";
import { clickableProps } from "utils/a11y";
import pjnCredentialsService, { ListingHistoryEntry, ListingHistoryResponse } from "api/pjnCredentials";

interface Props {
	open: boolean;
	credentialId: string | null;
	title?: string;
	onClose: () => void;
}

const fmtDay = (iso?: string | null) =>
	iso ? new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—");
const fmtMs = (ms: number) => (ms < 1000 ? `${ms} ms` : ms < 120000 ? `${Math.round(ms / 1000)} s` : `${(ms / 60000).toFixed(1)} min`);
const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const isJsonEvidence = (s3Key?: string | null) => !!s3Key && /\.json$/i.test(s3Key);

const statusColor = (s?: string | null): "success" | "warning" | "error" | "default" =>
	s === "completed"
		? "success"
		: s === "partial" || s === "incomplete"
		? "warning"
		: s === "error" || s === "interrupted"
		? "error"
		: "default";

// Clave "FUERO/numero/anio/incidente" → "FUERO numero/anio[/incidente]"
const keyLabel = (key: string) => {
	const [fuero, numero, anio, inc] = key.split("/");
	if (!numero) return key;
	return `${fuero} ${numero}/${anio}${inc && inc !== "null" && inc !== "" ? `/${inc}` : ""}`;
};

const KeyChips = ({ keys, color, prefix }: { keys: string[]; color: "success" | "error"; prefix: string }) => (
	<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
		{keys.map((k) => (
			<Chip key={`${prefix}-${k}`} size="small" variant="outlined" color={color} label={`${prefix} ${keyLabel(k)}`} />
		))}
	</Stack>
);

const ListadoHistorialDialog = ({ open, credentialId, title, onClose }: Props) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<ListingHistoryResponse | null>(null);
	const [loadedAt, setLoadedAt] = useState<number | null>(null);
	const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
	const [showHelp, setShowHelp] = useState(false);

	const load = useCallback(() => {
		if (!credentialId) return () => {};
		let alive = true;
		setLoading(true);
		setError(null);
		pjnCredentialsService
			.getListingHistory(credentialId)
			.then((r) => {
				if (!alive) return;
				setData(r.data);
				setLoadedAt(Date.now());
			})
			.catch((e) => {
				console.error("Error cargando historial del listado:", e);
				if (alive) setError("No se pudo cargar el historial del listado.");
			})
			.finally(() => alive && setLoading(false));
		return () => {
			alive = false;
		};
	}, [credentialId]);

	useEffect(() => {
		if (!open || !credentialId) return;
		setData(null);
		return load();
	}, [open, credentialId, load]);

	// Las URLs firmadas duran 5 min: pasado ese tiempo las miniaturas dejan de cargar.
	const stale = loadedAt != null && Date.now() - loadedAt > 4.5 * 60 * 1000;

	const renderEntry = (e: ListingHistoryEntry) => {
		const delta = e.hasDiff ? e.added.length - e.removed.length : e.delta;
		const deltaLabel = delta == null ? null : delta > 0 ? `+${delta}` : `${delta}`;
		return (
			<Box key={e.syncId} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
				<Stack spacing={1}>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<Typography variant="subtitle2">{fmtDay(e.startedAt)}</Typography>
						<Typography variant="caption" color="text.secondary">
							{fmtTime(e.startedAt)}
							{e.completedAt ? ` → ${fmtTime(e.completedAt)}` : ""}
						</Typography>
						<Chip size="small" color={statusColor(e.status)} label={e.status || "?"} />
						{e.total != null && <Chip size="small" variant="outlined" label={`${e.total} causas`} />}
						{e.listingSource && (
							<Tooltip
								title={
									e.listingSource === "api"
										? `Listado leído por la API del SCW nuevo${e.listingMs != null ? ` en ${fmtMs(e.listingMs)}` : ""}${
												e.portalExpedientes != null ? ` (${e.portalExpedientes} filas en trámite)` : ""
										  }. La evidencia es el JSON del listado.`
										: `Listado paginado por el browser (SCW clásico)${
												e.listingMs != null ? ` en ${fmtMs(e.listingMs)}` : ""
										  }. Si la credencial está en la lista de la API, esta corrida entró por el fallback.`
								}
							>
								<Chip
									size="small"
									color={e.listingSource === "api" ? "info" : "default"}
									variant="outlined"
									label={`Fuente: ${e.listingSource === "api" ? `API${e.listingMs != null ? ` (${fmtMs(e.listingMs)})` : ""}` : "browser"}`}
								/>
							</Tooltip>
						)}
						{deltaLabel && (
							<Chip
								size="small"
								color={delta && delta > 0 ? "success" : delta && delta < 0 ? "error" : "default"}
								variant={delta ? "filled" : "outlined"}
								label={deltaLabel}
							/>
						)}
						{e.scanComplete === false && (
							<Tooltip title="El worker no pudo leer todas las páginas: las bajas no se marcan sobre un escaneo incompleto.">
								<Chip
									size="small"
									color="warning"
									label={`escaneo incompleto${e.pagesScanned != null ? ` (${e.pagesScanned} pág.)` : ""}`}
								/>
							</Tooltip>
						)}
						{e.listRemovedMarked > 0 && (
							<Chip size="small" color="error" variant="outlined" label={`${e.listRemovedMarked} marcadas ausentes`} />
						)}
						{e.listRemovedCleared > 0 && (
							<Chip size="small" color="success" variant="outlined" label={`${e.listRemovedCleared} reaparecieron`} />
						)}
						{e.causasNuevas > 0 && <Chip size="small" color="info" variant="outlined" label={`${e.causasNuevas} altas`} />}
					</Stack>
					{e.error && (
						<Typography variant="caption" color="error">
							{e.error}
						</Typography>
					)}
					{e.hasDiff && (e.added.length > 0 || e.removed.length > 0) && (
						<Stack spacing={0.5}>
							{e.added.length > 0 && <KeyChips keys={e.added} color="success" prefix="+" />}
							{e.removed.length > 0 && <KeyChips keys={e.removed} color="error" prefix="−" />}
						</Stack>
					)}
					{e.hasDiff && !e.added.length && !e.removed.length && (
						<Typography variant="caption" color="text.disabled">
							Sin cambios respecto del escaneo completo anterior.
						</Typography>
					)}
					{e.screenshots.length > 0 ? (
						<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
							{e.screenshots.map((sc, k) =>
								isJsonEvidence(sc.s3Key) ? (
									<Box key={sc.s3Key || k}>
										<Typography variant="caption" color="text.secondary" display="block">
											listado completo (API)
										</Typography>
										{sc.screenshotUrl ? (
											<Button
												size="small"
												variant="outlined"
												component="a"
												href={sc.screenshotUrl}
												target="_blank"
												rel="noopener noreferrer"
												download={`listado-${(e.startedAt || "").slice(0, 10)}.json`}
											>
												Descargar listado (JSON){sc.bytes != null ? ` · ${fmtBytes(sc.bytes)}` : ""}
											</Button>
										) : (
											<Typography variant="caption" display="block" color="text.disabled">
												{e.expired ? "JSON expirado (60 días)" : "JSON no disponible"}
											</Typography>
										)}
									</Box>
								) : (
									<Box key={sc.s3Key || k} sx={{ width: 180 }}>
										<Typography variant="caption" color="text.secondary">
											página {sc.page ?? k + 1}
										</Typography>
										{sc.screenshotUrl ? (
											<Box
												component="img"
												src={sc.screenshotUrl}
												loading="lazy"
												alt={`listado página ${sc.page ?? k + 1}`}
												{...clickableProps(
													() =>
														setLightbox({
															url: sc.screenshotUrl as string,
															label: `listado-${(e.startedAt || "").slice(0, 10)}-p${sc.page ?? k + 1}`,
														}),
													{ label: `Ampliar captura página ${sc.page ?? k + 1}` },
												)}
												sx={{
													display: "block",
													width: "100%",
													height: 110,
													objectFit: "cover",
													objectPosition: "top",
													border: 1,
													borderColor: "divider",
													borderRadius: 1,
													cursor: "zoom-in",
													bgcolor: "action.hover",
												}}
											/>
										) : (
											<Typography variant="caption" display="block" color="text.disabled">
												{e.expired ? "captura expirada (60 días)" : "captura no disponible"}
											</Typography>
										)}
									</Box>
								),
							)}
						</Stack>
					) : (
						<Typography variant="caption" color="text.disabled">
							Esta corrida no dejó capturas del listado.
						</Typography>
					)}
				</Stack>
			</Box>
		);
	};

	return (
		<>
			<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
				<DialogTitle>
					<Typography variant="h5">Listado "Mis Causas" — historial y evidencia</Typography>
					{title && (
						<Typography variant="caption" color="text.secondary">
							{title}
						</Typography>
					)}
				</DialogTitle>
				<DialogContent dividers>
					{loading && !data && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					)}
					{error && <Alert severity="error">{error}</Alert>}
					{data && (
						<Stack spacing={2}>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
								{data.currentTotal != null && (
									<Chip size="small" color="primary" label={`Hoy: ${data.currentTotal} causas en el listado`} />
								)}
								<Chip size="small" variant="outlined" label={`${data.entries.length} corridas en ${data.days} días`} />
								{stale && <Chip size="small" color="warning" label="Las capturas vencieron (5 min): recargar" onClick={load} />}
							</Stack>
							<Alert
								severity="info"
								variant="outlined"
								sx={{ "& .MuiAlert-message": { width: "100%" } }}
								action={
									<Button size="small" onClick={() => setShowHelp((v) => !v)}>
										{showHelp ? "Menos" : "Qué hace el worker"}
									</Button>
								}
							>
								<Typography variant="body2">
									update-sync lee el listado Relacionados de la credencial una vez por día y lo compara con el anterior: altas (+) y bajas
									(−) por clave de expediente.
								</Typography>
								<Collapse in={showHelp}>
									<Stack spacing={0.75} sx={{ mt: 1 }}>
										<Typography variant="body2">
											<strong>Fuente browser:</strong> pagina el listado del SCW clásico (1–21 min según el tamaño) y deja una captura por
											página como evidencia.
										</Typography>
										<Typography variant="body2">
											<strong>Fuente API:</strong> pide el mismo listado a la API del SCW nuevo (~1 min) y deja un JSON con todas las filas;
											si la API falla o llega incompleto, la corrida vuelve al browser. Con la API también pide «Ver todos» (archivados y no
											en trámite) <strong>solo para no generar discordancias</strong>: una causa que pasó a archivo no cuenta como baja.
										</Typography>
										<Typography variant="body2">
											La sincronización inicial y las carpetas siguen cubriendo únicamente expedientes <strong>en trámite</strong>: el
											usuario no ve causas de más por el «Ver todos» de la API.
										</Typography>
									</Stack>
								</Collapse>
							</Alert>
							<Typography variant="caption" color="text.secondary">
								Una entrada por corrida del sync diario, con la evidencia tal como la vio el worker: capturas de cada página (browser) o el
								JSON del listado (API); se conservan 60 días. Las altas/bajas por clave se registran desde el 2/11/2026; para corridas
								anteriores solo hay total y capturas.
							</Typography>
							<Divider />
							{data.entries.length ? (
								data.entries.map(renderEntry)
							) : (
								<Alert severity="info" variant="outlined">
									No hay corridas del sync diario para este usuario en los últimos {data.days} días.
								</Alert>
							)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={load} disabled={loading || !credentialId}>
						Recargar
					</Button>
					<Button onClick={onClose}>Cerrar</Button>
				</DialogActions>
			</Dialog>
			<Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="lg">
				{lightbox && (
					<Box
						component="img"
						src={lightbox.url}
						alt="captura del listado"
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

export default ListadoHistorialDialog;
