import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	MenuItem,
	Paper,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { getNotificaciones, getNotificacion, reprocessNotificacion, reprocessParsed, PlazoNotificacion } from "api/plazos";

const STATUS_COLOR: Record<string, "default" | "success" | "warning" | "error" | "info" | "primary"> = {
	computed: "success",
	pending: "info",
	processing: "info",
	parsed: "warning",
	extracted: "warning",
	ocr_needed: "warning",
	no_url: "default",
	failed: "error",
	not_pdf: "error",
};

const FUEROS = ["", "CIV", "CSS", "CNT", "COM"];
const STATUSES = ["", "pending", "computed", "parsed", "extracted", "ocr_needed", "no_url", "failed", "not_pdf"];

const day = (v?: string | null) => (v ? String(v).slice(0, 10) : "—");

function DetalleDialog({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [doc, setDoc] = useState<PlazoNotificacion | null>(null);

	useEffect(() => {
		if (!id) return;
		setDoc(null);
		getNotificacion(id)
			.then(setDoc)
			.catch(() => enqueueSnackbar("Error cargando detalle", { variant: "error" }));
	}, [id, enqueueSnackbar]);

	const reprocess = async () => {
		if (!id) return;
		try {
			await reprocessNotificacion(id);
			enqueueSnackbar("Re-encolada (pending) — el worker la retoma en ≤1 min", { variant: "success" });
			onChanged();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	const p = doc?.plazo;
	return (
		<Dialog open={!!id} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				{doc ? `${doc.number}/${doc.year} [${doc.fuero}] — ${doc.tipoNotificacion}` : "Cargando…"}
			</DialogTitle>
			<DialogContent dividers>
				{!doc ? (
					<Skeleton height={200} />
				) : (
					<Stack spacing={1.5}>
						<Typography variant="body2" color="text.secondary">
							{doc.caratula || "—"}
						</Typography>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							<Chip size="small" label={doc.processingStatus} color={STATUS_COLOR[doc.processingStatus] || "default"} />
							{doc.objeto && <Chip size="small" variant="outlined" label={doc.objeto} />}
							<Chip size="small" variant="outlined" label={`mov: ${day(doc.movimiento?.fecha)}`} />
						</Stack>
						<Typography variant="body2">
							<b>Movimiento:</b> {doc.movimiento?.tipo} — {doc.movimiento?.detalle || "sin detalle"}
						</Typography>

						{p && (
							<>
								<Divider />
								<Typography variant="subtitle1">Vencimiento computado</Typography>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									<Chip size="small" color="success" label={`vence ${p.vencimiento}`} />
									{p.vencimientoConGracia && <Chip size="small" variant="outlined" label={`gracia ${p.vencimientoConGracia} (2 primeras hs)`} />}
									<Chip size="small" variant="outlined" label={`${p.plazoDias} días ${p.tipoPlazo}`} />
									<Chip size="small" variant="outlined" label={`fuente: ${p.fuente}`} color={p.fuente === "texto" ? "primary" : "default"} />
									{p.confianza && <Chip size="small" variant="outlined" label={`confianza ${p.confianza}`} />}
								</Stack>
								<Typography variant="body2">
									Notificada el <b>{p.fechaNotificacion}</b> (fuente: {p.fechaNotificacionFuente}) · perfeccionamiento {p.perfeccionamiento} ·
									inicio {p.inicioPlazo}
								</Typography>
								{p.diasComputados && (
									<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
										días: {p.diasComputados.join(" · ")}
										{p.feriadosAplicados?.length ? ` | feriados salteados: ${p.feriadosAplicados.join(", ")}` : ""}
									</Typography>
								)}
								{p.norma && (
									<Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
										<Typography variant="body2">
											<b>{p.norma.label}</b> — {p.norma.cita}{" "}
											{!p.norma.verificado && <Chip size="small" color="warning" label="regla sin verificar" sx={{ ml: 0.5 }} />}
										</Typography>
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											match [{p.norma.matchedIn}] «{p.norma.snippet}»
										</Typography>
									</Box>
								)}
							</>
						)}

						{doc.extraccion && (
							<>
								<Divider />
								<Typography variant="subtitle1">Extracción</Typography>
								<Typography variant="body2">
									{doc.extraccion.sinDocumento
										? "Sin documento (resuelta por detalle)"
										: `${doc.extraccion.pageCount} pág · ${doc.extraccion.charCount} chars${doc.extraccion.needsOcr ? " · ESCANEADO" : ""}`}
									{doc.extraccion.plazoDias ? ` · plazo expreso: ${doc.extraccion.plazoDias} días ${doc.extraccion.tipoPlazo}` : ""}
									{doc.extraccion.plazoHoras ? ` · plazo horario: ${doc.extraccion.plazoHoras} hs` : ""}
								</Typography>
								{doc.extraccion.apercibimiento && (
									<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
										{doc.extraccion.apercibimiento}
									</Typography>
								)}
								{!!doc.extraccion.menciones?.length && (
									<Typography variant="caption" color="text.secondary">
										{doc.extraccion.menciones.length} mención(es) de plazo en el texto (score máx{" "}
										{Math.max(...doc.extraccion.menciones.map((m) => m.score))})
									</Typography>
								)}
								{doc.extraccion.textExcerpt && (
									<Box sx={{ maxHeight: 220, overflow: "auto", p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
										<Typography variant="caption" sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
											{doc.extraccion.textExcerpt.slice(0, 5000)}
										</Typography>
									</Box>
								)}
							</>
						)}
						{doc.lastError && (
							<Typography variant="body2" color="error">
								Último error: {doc.lastError} (reintentos: {doc.retryCount})
							</Typography>
						)}
					</Stack>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={reprocess} color="warning">
					Reprocesar
				</Button>
				{doc?.movimiento?.url && (
					<Button component="a" href={doc.movimiento.url} target="_blank" rel="noopener">
						Ver PDF
					</Button>
				)}
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
}

export default function NotificacionesTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<PlazoNotificacion[]>([]);
	const [count, setCount] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [loading, setLoading] = useState(true);
	const [status, setStatus] = useState("");
	const [fuero, setFuero] = useState("");
	const [detalleId, setDetalleId] = useState<string | null>(null);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const resp = await getNotificaciones({
				page: page + 1,
				limit: rowsPerPage,
				status: status || undefined,
				fuero: fuero || undefined,
			});
			setRows(resp.data);
			setCount(resp.count);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando notificaciones", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, status, fuero, enqueueSnackbar]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const reprocesarParsed = async () => {
		try {
			const r = await reprocessParsed(fuero || undefined);
			enqueueSnackbar(`${r.reencoladas} notificación(es) 'parsed' re-encoladas`, { variant: "success" });
			fetchList();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
				<TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
					{STATUSES.map((s) => (
						<MenuItem key={s} value={s}>
							{s || "Todos"}
						</MenuItem>
					))}
				</TextField>
				<TextField select size="small" label="Fuero" value={fuero} onChange={(e) => { setFuero(e.target.value); setPage(0); }} sx={{ minWidth: 120 }}>
					{FUEROS.map((f) => (
						<MenuItem key={f} value={f}>
							{f || "Todos"}
						</MenuItem>
					))}
				</TextField>
				<Box sx={{ flex: 1 }} />
				<Button size="small" onClick={reprocesarParsed}>
					Re-encolar «parsed» (tras ajustar reglas)
				</Button>
			</Stack>

			<TableContainer component={Paper} elevation={0} sx={{ maxHeight: "calc(100dvh - 420px)" }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Detectada</TableCell>
							<TableCell>Causa</TableCell>
							<TableCell>Fuero / Objeto</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell>Status</TableCell>
							<TableCell>Plazo</TableCell>
							<TableCell>Vence</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={7}>
											<Skeleton />
										</TableCell>
									</TableRow>
								))
							: rows.map((r) => (
									<TableRow key={r._id} hover sx={{ cursor: "pointer" }} onClick={() => setDetalleId(r._id)}>
										<TableCell>{day(r.detectedAt)}</TableCell>
										<TableCell>
											{r.number}/{r.year}
										</TableCell>
										<TableCell>
											{r.fuero}
											{r.objeto ? ` · ${r.objeto}` : ""}
										</TableCell>
										<TableCell>{r.tipoNotificacion}</TableCell>
										<TableCell>
											<Chip size="small" label={r.processingStatus} color={STATUS_COLOR[r.processingStatus] || "default"} variant="outlined" />
										</TableCell>
										<TableCell>
											{r.plazo ? `${r.plazo.plazoDias}d ${r.plazo.tipoPlazo} (${r.plazo.fuente})` : "—"}
										</TableCell>
										<TableCell>{r.plazo?.vencimiento || "—"}</TableCell>
									</TableRow>
								))}
						{!loading && rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={7}>
									<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
										Sin notificaciones para los filtros elegidos
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={count}
				page={page}
				onPageChange={(_, p) => setPage(p)}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50, 100]}
				labelRowsPerPage="Por página:"
			/>
			<DetalleDialog id={detalleId} onClose={() => setDetalleId(null)} onChanged={fetchList} />
		</Stack>
	);
}
