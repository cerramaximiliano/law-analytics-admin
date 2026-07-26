import { useEffect, useMemo, useState } from "react";
import {
	Box,
	Stack,
	Typography,
	Card,
	CardContent,
	CardMedia,
	Chip,
	Grid,
	FormControl,
	FormControlLabel,
	InputLabel,
	Select,
	MenuItem,
	Button,
	Switch,
	TextField,
	Pagination,
	Alert,
	Skeleton,
	Dialog,
	DialogContent,
	IconButton,
	CircularProgress,
} from "@mui/material";
import { CloseCircle, TickCircle, Warning2 } from "iconsax-react";
import workersAxios from "utils/workersAxios";
import CaptchaLabelingMode from "./CaptchaLabelingMode";
import CaptchaDatasetService, { CaptchaDatasetEntry, CaptchaDatasetStats } from "api/captchaDataset";

const PAGE_SIZE = 10;

// Carga una imagen con auth y devuelve un object URL (revocar después).
async function loadImageBlob(file: string): Promise<string> {
	const response = await workersAxios.get(`/api/captcha-dataset/image/${file}`, { responseType: "blob" });
	return URL.createObjectURL(response.data as Blob);
}

interface ImageCardProps {
	entry: CaptchaDatasetEntry;
	onClick: () => void;
}

const ImageCard = ({ entry, onClick }: ImageCardProps) => {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let url: string | null = null;
		loadImageBlob(entry.file)
			.then((u) => {
				if (cancelled) {
					URL.revokeObjectURL(u);
					return;
				}
				url = u;
				setBlobUrl(u);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			});
		return () => {
			cancelled = true;
			if (url) URL.revokeObjectURL(url);
		};
	}, [entry.file]);

	return (
		<Card variant="outlined" sx={{ cursor: "pointer", "&:hover": { boxShadow: 3 } }} onClick={onClick}>
			<Box sx={{ position: "relative", bgcolor: "grey.100", minHeight: 100 }}>
				{blobUrl ? (
					<CardMedia component="img" image={blobUrl} alt={entry.label} sx={{ objectFit: "contain", maxHeight: 120 }} />
				) : error ? (
					<Box sx={{ p: 2, textAlign: "center" }}>
						<Warning2 size={24} color="#d32f2f" />
						<Typography variant="caption" color="error" display="block">
							Error
						</Typography>
					</Box>
				) : (
					<Skeleton variant="rectangular" height={120} />
				)}
				<Chip
					size="small"
					icon={entry.verified ? <TickCircle size={14} /> : <CloseCircle size={14} />}
					label={entry.verified ? "verified" : "unverified"}
					color={entry.verified ? "success" : "warning"}
					sx={{ position: "absolute", top: 4, right: 4 }}
				/>
			</Box>
			<CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
				<Typography variant="h6" fontFamily="monospace" textAlign="center">
					{entry.label}
				</Typography>
				<Typography variant="caption" color="text.secondary" display="block" textAlign="center" noWrap>
					{entry.worker_id} · {entry.fuero}
				</Typography>
				<Typography variant="caption" color="text.secondary" display="block" textAlign="center" noWrap>
					{entry.expediente} · intento {entry.attempt}
				</Typography>
				<Typography variant="caption" color="text.secondary" display="block" textAlign="center" noWrap>
					{new Date(entry.ts).toLocaleString("es-AR")}
				</Typography>
			</CardContent>
		</Card>
	);
};

const CaptchaDatasetTab = () => {
	const [stats, setStats] = useState<CaptchaDatasetStats | null>(null);
	const [entries, setEntries] = useState<CaptchaDatasetEntry[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [verifiedFilter, setVerifiedFilter] = useState<"all" | "true" | "false">("all");
	// Pendientes de etiquetado manual: ni el modelo ni el proveedor los
	// resolvieron, así que no hay etiqueta automática posible para ellos.
	const [soloSinEtiqueta, setSoloSinEtiqueta] = useState(false);
	const [labelInput, setLabelInput] = useState("");
	const [saving, setSaving] = useState(false);
	const [labelMsg, setLabelMsg] = useState<string | null>(null);
	const [modoEtiquetado, setModoEtiquetado] = useState(false);
	const [workerFilter, setWorkerFilter] = useState<string>("");
	const [search, setSearch] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<CaptchaDatasetEntry | null>(null);
	const [selectedBlob, setSelectedBlob] = useState<string | null>(null);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const fetchStats = async () => {
		try {
			const r = await CaptchaDatasetService.stats();
			setStats(r.data);
		} catch (err: any) {
			console.error("Error stats:", err);
		}
	};

	const fetchEntries = async () => {
		setLoading(true);
		setError(null);
		try {
			const params: any = {
				skip: (page - 1) * PAGE_SIZE,
				limit: PAGE_SIZE,
			};
			if (verifiedFilter !== "all") params.verified = verifiedFilter;
			// verified=false cubre las dos cosas que hay que etiquetar a mano: los
			// difíciles sin etiqueta y los que tienen etiqueta pero el PJN rechazó.
			if (soloSinEtiqueta) params.verified = "false";
			if (workerFilter) params.worker_id = workerFilter;
			if (search) params.search = search;
			const r = await CaptchaDatasetService.list(params);
			setEntries(r.data);
			setTotal(r.total);
		} catch (err: any) {
			setError(err.response?.data?.message || err.message || "Error cargando dataset");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, []);

	useEffect(() => {
		fetchEntries();
	}, [page, verifiedFilter, workerFilter, search, soloSinEtiqueta]);

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [verifiedFilter, workerFilter, search, soloSinEtiqueta]);

	const handleOpen = async (entry: CaptchaDatasetEntry) => {
		setLabelInput("");
		setLabelMsg(null);
		setSelected(entry);
		setSelectedBlob(null);
		try {
			const url = await loadImageBlob(entry.file);
			setSelectedBlob(url);
		} catch (_) {
			setSelectedBlob(null);
		}
	};

	const handleClose = () => {
		if (selectedBlob) URL.revokeObjectURL(selectedBlob);
		setSelected(null);
		setSelectedBlob(null);
	};

	const workerOptions = useMemo(() => {
		if (!stats?.byWorker) return [];
		return Object.keys(stats.byWorker).sort();
	}, [stats]);

	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Box>
				<Typography
					variant="h4"
					sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
				>
					Dataset de captcha (OCR propio)
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
					Imágenes capturadas por los scraping workers cuando tienen <code>captureDataset.enabled=true</code>. Sirven como dataset
					etiquetado para entrenar un OCR propio del captcha numérico del PJN. Las imágenes <strong>verified</strong> tienen el label
					confirmado por PJN (ground truth); las <strong>unverified</strong> tienen el label que devolvió el solver pero PJN rechazó —
					útiles para review manual o como negativos.
				</Typography>
			</Box>

			{/* Stats panel */}
			{stats && (
				<Card variant="outlined">
					<CardContent>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Total imágenes
								</Typography>
								<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}>
									{stats.total.toLocaleString("es-AR")}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Verified (ground truth)
								</Typography>
								<Typography
									variant="h4"
									color="success.main"
									sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}
								>
									{stats.verified.toLocaleString("es-AR")}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Unverified
								</Typography>
								<Typography
									variant="h4"
									color="warning.main"
									sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}
								>
									{stats.unverified.toLocaleString("es-AR")}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Espacio en disco
								</Typography>
								<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}>
									{stats.diskMB} MB
								</Typography>
							</Grid>
						</Grid>
					</CardContent>
				</Card>
			)}

			{/* Filtros */}
			<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
				<FormControl size="small" sx={{ minWidth: 160 }}>
					<InputLabel>Estado</InputLabel>
					<Select label="Estado" value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value as any)}>
						<MenuItem value="all">Todas</MenuItem>
						<MenuItem value="true">Solo verified</MenuItem>
						<MenuItem value="false">Solo unverified</MenuItem>
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 200 }}>
					<InputLabel>Worker</InputLabel>
					<Select label="Worker" value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}>
						<MenuItem value="">Todos</MenuItem>
						{workerOptions.map((w) => (
							<MenuItem key={w} value={w}>
								{w}
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<TextField
					size="small"
					label="Buscar label o expediente"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					sx={{ flex: 1 }}
				/>
				{/* Los pendientes de etiquetado son los casos difíciles sin etiqueta
				    automática: el trabajo manual que realmente aporta al dataset. */}
				<FormControlLabel
					control={<Switch checked={soloSinEtiqueta} onChange={(e) => setSoloSinEtiqueta(e.target.checked)} />}
					label="Solo sin etiqueta confiable"
					sx={{ whiteSpace: "nowrap" }}
				/>
				{/* Etiquetar de a uno abriendo y cerrando el detalle es inviable con
				    miles de pendientes; este modo va pasando solo. */}
				<Button variant="contained" onClick={() => setModoEtiquetado(true)} sx={{ whiteSpace: "nowrap" }}>
					Etiquetar
				</Button>
			</Stack>

			<CaptchaLabelingMode
				open={modoEtiquetado}
				onClose={(n) => {
					setModoEtiquetado(false);
					if (n > 0) {
						fetchEntries();
						fetchStats();
					}
				}}
			/>

			{error && (
				<Alert severity="error">
					{error}
				</Alert>
			)}

			{/* Grid de imágenes */}
			{loading ? (
				<Grid container spacing={2}>
					{Array.from({ length: PAGE_SIZE }).map((_, i) => (
						<Grid item key={i} xs={12} sm={6} md={4} lg={2.4}>
							<Skeleton variant="rectangular" height={200} />
						</Grid>
					))}
				</Grid>
			) : entries.length === 0 ? (
				<Alert severity="info">
					No hay imágenes capturadas con esos filtros. Habilitá <code>captureDataset</code> en algún worker para empezar a generar dataset.
				</Alert>
			) : (
				<Grid container spacing={2}>
					{entries.map((entry) => (
						<Grid item key={entry.file} xs={12} sm={6} md={4} lg={2.4}>
							<ImageCard entry={entry} onClick={() => handleOpen(entry)} />
						</Grid>
					))}
				</Grid>
			)}

			{/* Paginación */}
			{total > PAGE_SIZE && (
				<Stack direction="row" justifyContent="center" sx={{ pt: 1 }}>
					<Pagination
						count={totalPages}
						page={page}
						onChange={(_, p) => setPage(p)}
						color="primary"
						showFirstButton
						showLastButton
					/>
				</Stack>
			)}

			{/* Modal con imagen ampliada */}
			<Dialog open={!!selected} onClose={handleClose} maxWidth="md" fullWidth>
				<DialogContent sx={{ position: "relative", p: 3 }}>
					<IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }}>
						<CloseCircle size={24} />
					</IconButton>
					{selected && (
						<Stack spacing={2}>
							<Box sx={{ textAlign: "center", bgcolor: "grey.100", py: 3, borderRadius: 1 }}>
								{selectedBlob ? (
									<img
										src={selectedBlob}
										alt={selected.label}
										style={{ maxWidth: "100%", maxHeight: "60vh", imageRendering: "pixelated" }}
									/>
								) : (
									<CircularProgress />
								)}
							</Box>
							<Box>
								<Typography variant="h3" fontFamily="monospace" textAlign="center" gutterBottom>
									{selected.label}
								</Typography>
								<Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
									<Chip
										icon={selected.verified ? <TickCircle size={16} /> : <CloseCircle size={16} />}
										label={selected.verified ? "verified (ground truth)" : "unverified"}
										color={selected.verified ? "success" : "warning"}
									/>
								</Stack>
								<Grid container spacing={1}>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Worker
										</Typography>
										<Typography variant="body2">{selected.worker_id || "—"}</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Fuero
										</Typography>
										<Typography variant="body2">{selected.fuero || "—"}</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Expediente
										</Typography>
										<Typography variant="body2">{selected.expediente || "—"}</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Intento
										</Typography>
										<Typography variant="body2">{selected.attempt ?? "—"}</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Timestamp
										</Typography>
										<Typography variant="body2">{new Date(selected.ts).toLocaleString("es-AR")}</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Archivo
										</Typography>
										<Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: "break-all" }}>
											{selected.file}
										</Typography>
									</Grid>
								</Grid>

								{/* Etiquetado manual para todo lo que no tiene etiqueta confiable:
								    los difíciles sin etiqueta y los "unverified", cuya etiqueta
								    existe pero el PJN la rechazó (o sea, está mal). */}
								{!selected.verified && (
									<Box sx={{ mt: 3, p: 2, bgcolor: "warning.lighter", borderRadius: 1 }}>
										<Typography variant="subtitle2" gutterBottom>
											{selected.needsLabel ? "Etiquetado manual" : "Corregir etiqueta"}
										</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
											{selected.needsLabel
												? "Ni el modelo ni el proveedor resolvieron este captcha. Escribí los 4 dígitos que ves en la imagen."
												: `El PJN rechazó la etiqueta "${selected.label}", así que es incorrecta. Escribí los 4 dígitos correctos.`}
										</Typography>
										<Stack direction="row" spacing={1} alignItems="flex-start">
											<TextField
												size="small"
												value={labelInput}
												onChange={(e) => setLabelInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
												placeholder="0000"
												inputProps={{ maxLength: 4, style: { fontFamily: "monospace", fontSize: 18, letterSpacing: 4 } }}
												sx={{ width: 130 }}
												autoFocus
											/>
											<Button
												variant="contained"
												disabled={labelInput.length !== 4 || saving}
												onClick={async () => {
													setSaving(true);
													setLabelMsg(null);
													try {
														await CaptchaDatasetService.label(selected.file, labelInput);
														setLabelMsg("Etiqueta guardada");
														setLabelInput("");
														fetchEntries();
														fetchStats();
													} catch (err: any) {
														setLabelMsg(err.response?.data?.message || err.message || "No se pudo guardar");
													} finally {
														setSaving(false);
													}
												}}
											>
												{saving ? "Guardando..." : "Guardar"}
											</Button>
										</Stack>
										{labelMsg && (
											<Typography variant="caption" sx={{ display: "block", mt: 1 }} color={labelMsg === "Etiqueta guardada" ? "success.main" : "error.main"}>
												{labelMsg}
											</Typography>
										)}
									</Box>
								)}
							</Box>
						</Stack>
					)}
				</DialogContent>
			</Dialog>
		</Stack>
	);
};

export default CaptchaDatasetTab;
