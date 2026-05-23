import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	FormControl,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Skeleton,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { ExportSquare, Eye, Refresh, SearchNormal1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import LiquidacionWorkerConfigService, { DocumentsListParams, LiquidacionDocListItem } from "api/liquidacionWorkerConfig";
import DocumentDetailDrawer from "./DocumentDetailDrawer";

const PDF_STATUSES = ["pending", "downloading", "parsed", "extracted", "ocr_needed", "failed", "not_pdf"];
const SECTION_MIXES = ["HC+HR+RET", "HR+RET", "HC+HR", "HC+RET", "HC", "HR", "RET", "COVER", "NONE"];
const CATEGORIES = [
	"ACOMPANA",
	"PRACTICA",
	"ADJUNTA",
	"ACREDITA",
	"ACREDITA_PRACTICA",
	"AMPLIATORIA",
	"IMPUGNA",
	"CONTESTA_TRASLADO",
	"LIQUIDACION_PURA",
	"MODIFICA",
	"HABER_DIRECTO",
	"PERITO_O_HISTORICO",
];

const USEFUL_MIXES = new Set(["HC", "HR", "RET", "HC+HR", "HC+RET", "HR+RET", "HC+HR+RET"]);

function fmtNumber(n: number | undefined | null): string {
	if (n === undefined || n === null) return "—";
	return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | undefined | null): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleDateString("es-AR");
	} catch {
		return "—";
	}
}

function truncate(s: string | undefined, n: number): string {
	if (!s) return "";
	return s.length > n ? `${s.slice(0, n)}…` : s;
}

export default function DocumentsTab() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [docs, setDocs] = useState<LiquidacionDocListItem[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0); // MUI usa 0-indexed; backend usa 1-indexed
	const [rowsPerPage, setRowsPerPage] = useState(50);
	const [loading, setLoading] = useState(false);

	// Filtros
	const [pdfStatus, setPdfStatus] = useState<string>("extracted");
	const [sectionMix, setSectionMix] = useState<string>("");
	const [category, setCategory] = useState<string>("");
	const [caratulaQuery, setCaratulaQuery] = useState("");
	const [hasData, setHasData] = useState(true);

	const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const fetchDocs = useCallback(async () => {
		try {
			setLoading(true);
			const params: DocumentsListParams = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy: "movFecha",
				sortOrder: "desc",
			};
			if (pdfStatus) params.pdfStatus = pdfStatus;
			if (sectionMix) params.sectionMix = sectionMix;
			if (category) params.category = category;
			if (caratulaQuery.trim()) params.caratula = caratulaQuery.trim();
			if (hasData) params.hasData = true;

			const res = await LiquidacionWorkerConfigService.listDocuments(params);
			setDocs(res.docs);
			setTotal(res.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error listando documentos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, pdfStatus, sectionMix, category, caratulaQuery, hasData, enqueueSnackbar]);

	useEffect(() => {
		fetchDocs();
	}, [fetchDocs]);

	const handleOpenDetail = (id: string) => {
		setSelectedDocId(id);
		setDrawerOpen(true);
	};

	return (
		<Stack spacing={2}>
			{/* Filtros */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
					<TextField
						size="small"
						placeholder="Buscar carátula…"
						value={caratulaQuery}
						onChange={(e) => {
							setCaratulaQuery(e.target.value);
							setPage(0);
						}}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchNormal1 size={16} />
								</InputAdornment>
							),
						}}
						sx={{ minWidth: 240 }}
					/>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>pdfStatus</InputLabel>
						<Select value={pdfStatus} label="pdfStatus" onChange={(e) => { setPdfStatus(e.target.value); setPage(0); }}>
							<MenuItem value="">— todos —</MenuItem>
							{PDF_STATUSES.map((s) => (
								<MenuItem key={s} value={s}>
									{s}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>sectionMix</InputLabel>
						<Select value={sectionMix} label="sectionMix" onChange={(e) => { setSectionMix(e.target.value); setPage(0); }}>
							<MenuItem value="">— todos —</MenuItem>
							{SECTION_MIXES.map((s) => (
								<MenuItem key={s} value={s}>
									{s}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 180 }}>
						<InputLabel>categoría</InputLabel>
						<Select value={category} label="categoría" onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
							<MenuItem value="">— todas —</MenuItem>
							{CATEGORIES.map((c) => (
								<MenuItem key={c} value={c}>
									{c}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Stack direction="row" alignItems="center" spacing={0.5}>
						<Switch size="small" checked={hasData} onChange={(e) => { setHasData(e.target.checked); setPage(0); }} />
						<Typography variant="caption">Solo con datos útiles</Typography>
					</Stack>
					<Box sx={{ flex: 1 }} />
					<Tooltip title="Refrescar">
						<IconButton size="small" onClick={fetchDocs} disabled={loading}>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
					{loading ? "Cargando…" : `${total.toLocaleString("es-AR")} documentos encontrados`}
				</Typography>
			</Paper>

			{/* Tabla */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<TableCell sx={{ fontWeight: 700, width: 90 }}>Fecha</TableCell>
							<TableCell sx={{ fontWeight: 700 }}>Carátula</TableCell>
							<TableCell sx={{ fontWeight: 700, width: 130 }}>Mix</TableCell>
							<TableCell sx={{ fontWeight: 700, width: 140 }}>Persona</TableCell>
							<TableCell sx={{ fontWeight: 700, width: 110 }} align="right">
								Capital
							</TableCell>
							<TableCell sx={{ fontWeight: 700, width: 110 }} align="right">
								Intereses
							</TableCell>
							<TableCell sx={{ width: 80 }} align="center">
								Acciones
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={7}>
											<Skeleton variant="text" height={28} />
										</TableCell>
									</TableRow>
								))
							: docs.map((d) => {
									const useful = d.sectionMix ? USEFUL_MIXES.has(d.sectionMix) : false;
									return (
										<TableRow
											key={d._id}
											hover
											sx={{ cursor: "pointer" }}
											onClick={() => handleOpenDetail(d._id)}
										>
											<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{fmtDate(d.movFecha)}</TableCell>
											<TableCell>
												<Stack spacing={0.25}>
													<Typography variant="body2" sx={{ fontWeight: 500 }}>
														{truncate(d.caratula, 70)}
													</Typography>
													<Stack direction="row" spacing={0.5} alignItems="center">
														<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
															{d.causaNumber}/{d.causaYear}
															{d.juzgado != null && ` · J${d.juzgado}/S${d.secretaria ?? "-"}`}
														</Typography>
														{d.category && (
															<Chip
																label={d.category}
																size="small"
																variant="outlined"
																sx={{ height: 16, fontSize: "0.6rem", fontFamily: "monospace" }}
															/>
														)}
													</Stack>
													{d.detalleNorm && (
														<Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
															{truncate(d.detalleNorm, 80)}
														</Typography>
													)}
												</Stack>
											</TableCell>
											<TableCell>
												{d.sectionMix && (
													<Chip
														label={d.sectionMix}
														size="small"
														sx={{
															fontFamily: "monospace",
															fontWeight: 600,
															bgcolor: useful
																? alpha(theme.palette.success.main, 0.15)
																: alpha(theme.palette.grey[500], 0.1),
															color: useful ? theme.palette.success.main : theme.palette.text.secondary,
														}}
													/>
												)}
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ fontSize: "0.78rem" }}>
													{truncate(d.extracted?.persona, 24) || "—"}
												</Typography>
												{d.extracted?.expediente && (
													<Typography
														variant="caption"
														color="text.secondary"
														sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}
													>
														{d.extracted.expediente}
													</Typography>
												)}
											</TableCell>
											<TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
												{fmtNumber(d.extracted?.retroactivo?.capital)}
											</TableCell>
											<TableCell align="right" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
												{fmtNumber(d.extracted?.retroactivo?.intereses)}
											</TableCell>
											<TableCell align="center" onClick={(e) => e.stopPropagation()}>
												<Stack direction="row" spacing={0} justifyContent="center">
													<Tooltip title="Ver detalle">
														<IconButton size="small" onClick={() => handleOpenDetail(d._id)}>
															<Eye size={16} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Abrir PDF en PJN">
														<IconButton
															size="small"
															onClick={() => window.open(d.url, "_blank", "noopener,noreferrer")}
														>
															<ExportSquare size={16} />
														</IconButton>
													</Tooltip>
												</Stack>
											</TableCell>
										</TableRow>
									);
								})}
						{!loading && docs.length === 0 && (
							<TableRow>
								<TableCell colSpan={7} align="center">
									<Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
										No hay documentos que coincidan con los filtros.
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<TablePagination
					component="div"
					count={total}
					page={page}
					onPageChange={(_, p) => setPage(p)}
					rowsPerPage={rowsPerPage}
					rowsPerPageOptions={[25, 50, 100, 200]}
					onRowsPerPageChange={(e) => {
						setRowsPerPage(parseInt(e.target.value, 10));
						setPage(0);
					}}
					labelRowsPerPage="Filas:"
					labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count.toLocaleString("es-AR")}`}
				/>
			</TableContainer>

			<DocumentDetailDrawer docId={selectedDocId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
		</Stack>
	);
}
