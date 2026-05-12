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
	InputLabel,
	Select,
	MenuItem,
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
import pjnAxios from "utils/pjnAxios";
import CaptchaDatasetService, { CaptchaDatasetEntry, CaptchaDatasetStats } from "api/captchaDataset";

const PAGE_SIZE = 10;

// Carga una imagen con auth y devuelve un object URL (revocar después).
async function loadImageBlob(file: string): Promise<string> {
	const response = await pjnAxios.get(`/api/captcha-dataset/image/${file}`, { responseType: "blob" });
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
	}, [page, verifiedFilter, workerFilter, search]);

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [verifiedFilter, workerFilter, search]);

	const handleOpen = async (entry: CaptchaDatasetEntry) => {
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
				<Typography variant="h4">Dataset de Captcha (OCR propio)</Typography>
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
								<Typography variant="h5">{stats.total.toLocaleString("es-AR")}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Verified (ground truth)
								</Typography>
								<Typography variant="h5" color="success.main">
									{stats.verified.toLocaleString("es-AR")}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Unverified
								</Typography>
								<Typography variant="h5" color="warning.main">
									{stats.unverified.toLocaleString("es-AR")}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Espacio en disco
								</Typography>
								<Typography variant="h5">{stats.diskMB} MB</Typography>
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
			</Stack>

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
							</Box>
						</Stack>
					)}
				</DialogContent>
			</Dialog>
		</Stack>
	);
};

export default CaptchaDatasetTab;
