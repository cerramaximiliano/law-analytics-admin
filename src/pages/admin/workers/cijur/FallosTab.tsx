// Área de datos: listado de los fallos capturados, con filtros y detalle.
//
// El listado NO trae el texto completo (son decenas de miles de caracteres por
// fallo): la API manda `textoChars` para poder mostrar si el fallo tiene
// contenido aprovechable, y el texto se pide solo al abrir el detalle.

import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Chip,
	CircularProgress,
	Drawer,
	IconButton,
	InputAdornment,
	Link,
	MenuItem,
	Pagination,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentText, SearchNormal1 } from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL } from "themes/dashboardTokens";
import { CijurFallo, getCijurFallo, getCijurFallos } from "api/cijur";

const COLOR_CANAL: Record<string, string> = { PROVINCIAL: PRO_TEAL, NACIONAL: BRAND_BLUE };

const fmtFecha = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

export default function FallosTab() {
	const theme = useTheme();
	const [items, setItems] = useState<CijurFallo[]>([]);
	const [total, setTotal] = useState(0);
	const [pages, setPages] = useState(1);
	const [page, setPage] = useState(1);
	const [canal, setCanal] = useState("");
	const [conTexto, setConTexto] = useState("");
	const [q, setQ] = useState("");
	const [busqueda, setBusqueda] = useState("");
	const [cargando, setCargando] = useState(false);
	const [detalle, setDetalle] = useState<CijurFallo | null>(null);
	const [cargandoDetalle, setCargandoDetalle] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const res = await getCijurFallos({
				page,
				limit: 20,
				...(canal && { canal: canal as any }),
				...(conTexto && { conTexto: conTexto as "true" | "false" }),
				...(busqueda && { q: busqueda }),
			});
			setItems(res.data);
			setTotal(res.pagination.total);
			setPages(res.pagination.pages);
		} finally {
			setCargando(false);
		}
	}, [page, canal, conTexto, busqueda]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	// Los filtros reinician la paginación: quedarse en la página 7 de un
	// resultado que ahora tiene 2 páginas muestra una tabla vacía.
	useEffect(() => {
		setPage(1);
	}, [canal, conTexto, busqueda]);

	const abrirDetalle = async (id: string) => {
		setCargandoDetalle(true);
		setDetalle({ _id: id } as CijurFallo);
		try {
			const res = await getCijurFallo(id);
			setDetalle(res.data);
		} finally {
			setCargandoDetalle(false);
		}
	};

	return (
		<Stack spacing={2}>
			<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
				<TextField
					size="small"
					placeholder="Buscar por carátula, tribunal o voces…"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && setBusqueda(q)}
					onBlur={() => setBusqueda(q)}
					sx={{ minWidth: 300, flex: 1 }}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchNormal1 size={16} />
							</InputAdornment>
						),
					}}
				/>
				<TextField size="small" select label="Canal" value={canal} onChange={(e) => setCanal(e.target.value)} sx={{ minWidth: 150 }}>
					<MenuItem value="">Todos</MenuItem>
					<MenuItem value="PROVINCIAL">Provincial</MenuItem>
					<MenuItem value="NACIONAL">Nacional</MenuItem>
				</TextField>
				<TextField size="small" select label="Texto" value={conTexto} onChange={(e) => setConTexto(e.target.value)} sx={{ minWidth: 150 }}>
					<MenuItem value="">Todos</MenuItem>
					<MenuItem value="true">Con texto</MenuItem>
					<MenuItem value="false">Sin texto</MenuItem>
				</TextField>
				<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
					{total} fallo{total === 1 ? "" : "s"}
				</Typography>
			</Stack>

			<Paper variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Carátula</TableCell>
							<TableCell>Tribunal</TableCell>
							<TableCell>Canal</TableCell>
							<TableCell align="right">Fecha</TableCell>
							<TableCell align="right">Texto</TableCell>
							<TableCell align="center">PDF</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{cargando && (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 3 }}>
									<CircularProgress size={22} />
								</TableCell>
							</TableRow>
						)}
						{!cargando && items.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 3 }}>
									<Typography variant="body2" color="text.secondary">
										Sin resultados con estos filtros.
									</Typography>
								</TableCell>
							</TableRow>
						)}
						{!cargando &&
							items.map((f) => {
								const color = COLOR_CANAL[f.canal] || BRAND_BLUE;
								return (
									<TableRow
										key={f._id}
										hover
										sx={{ cursor: "pointer" }}
										onClick={() => abrirDetalle(f._id)}
									>
										<TableCell sx={{ maxWidth: 380 }}>
											<Typography variant="body2" noWrap title={f.caratula || f.titulo}>
												{f.caratula || f.titulo || "(sin carátula)"}
											</Typography>
											{f.voces && (
												<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }} title={f.voces}>
													{f.voces}
												</Typography>
											)}
										</TableCell>
										<TableCell sx={{ maxWidth: 220 }}>
											<Typography variant="caption" noWrap title={f.tribunal}>
												{f.tribunal || "—"}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip
												size="small"
												label={f.canal === "PROVINCIAL" ? "Prov." : "Nac."}
												sx={{ bgcolor: alpha(color, 0.14), color, fontWeight: 600, height: 20 }}
											/>
										</TableCell>
										<TableCell align="right">
											<Typography variant="caption">{f.fechaString || fmtFecha(f.publicadoEn)}</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography
												variant="caption"
												sx={{
													color: (f.textoChars || 0) > 1500 ? LIVE_GREEN : STALE_AMBER,
													fontWeight: 600,
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{(f.textoChars || 0).toLocaleString("es-AR")}
											</Typography>
										</TableCell>
										<TableCell align="center" onClick={(e) => e.stopPropagation()}>
											{f.pdfUrl ? (
												<Tooltip title="Abrir el PDF en CIJur" arrow>
													<IconButton size="small" component="a" href={f.pdfUrl} target="_blank" rel="noopener">
														<DocumentText size={16} />
													</IconButton>
												</Tooltip>
											) : (
												<Typography variant="caption" color="text.disabled">
													—
												</Typography>
											)}
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
			</Paper>

			{pages > 1 && (
				<Stack alignItems="center">
					<Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} size="small" />
				</Stack>
			)}

			<Drawer anchor="right" open={!!detalle} onClose={() => setDetalle(null)} PaperProps={{ sx: { width: { xs: "100%", md: 720 } } }}>
				{detalle && (
					<Box sx={{ p: 2.5 }}>
						<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
							<Typography variant="h6" sx={{ pr: 2 }}>
								{detalle.caratula || detalle.titulo || "Fallo"}
							</Typography>
							<IconButton size="small" onClick={() => setDetalle(null)}>
								<CloseCircle size={20} />
							</IconButton>
						</Stack>

						{cargandoDetalle ? (
							<CircularProgress size={24} />
						) : (
							<Stack spacing={1.5}>
								<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
									{detalle.canal && (
										<Chip
											size="small"
											label={detalle.canal}
											sx={{
												bgcolor: alpha(COLOR_CANAL[detalle.canal] || BRAND_BLUE, 0.14),
												color: COLOR_CANAL[detalle.canal] || BRAND_BLUE,
												fontWeight: 600,
											}}
										/>
									)}
									{detalle.fechaString && <Chip size="small" label={detalle.fechaString} variant="outlined" />}
									{detalle.textoSource && <Chip size="small" label={detalle.textoSource} variant="outlined" />}
								</Stack>

								{detalle.tribunal && (
									<Typography variant="body2">
										<b>Tribunal:</b> {detalle.tribunal}
									</Typography>
								)}

								{detalle.voces && (
									<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.06) }}>
										<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
											Voces (redacción de la Procuración — uso interno, no republicable)
										</Typography>
										<Typography variant="body2">{detalle.voces}</Typography>
									</Paper>
								)}

								<Stack direction="row" spacing={2}>
									{detalle.pdfUrl && (
										<Link href={detalle.pdfUrl} target="_blank" rel="noopener" variant="body2">
											Ver PDF original
										</Link>
									)}
									{detalle.url && (
										<Link href={detalle.url} target="_blank" rel="noopener" variant="body2">
											Ver en CIJur
										</Link>
									)}
								</Stack>

								{detalle.errorMessage && (
									<Typography variant="caption" sx={{ color: STALE_AMBER }}>
										Error al extraer el PDF: {detalle.errorMessage}
									</Typography>
								)}

								{detalle.textoCompleto ? (
									<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, maxHeight: 460, overflowY: "auto" }}>
										<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
											Texto extraído del PDF ({detalle.textoCompleto.length.toLocaleString("es-AR")} caracteres)
										</Typography>
										<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>
											{detalle.textoCompleto}
										</Typography>
									</Paper>
								) : (
									<Typography variant="body2" color="text.secondary">
										Este fallo no tiene texto extraído: o no trae PDF en el sitio, o el PDF es un escaneo sin capa de texto.
									</Typography>
								)}
							</Stack>
						)}
					</Box>
				)}
			</Drawer>
		</Stack>
	);
}
