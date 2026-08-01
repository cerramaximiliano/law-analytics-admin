import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
	Box,
	Card,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
	useTheme,
	alpha,
	Button,
	Collapse,
	Divider,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import MainCard from "components/MainCard";
import { Edit2, Refresh } from "iconsax-react";
import EtapaAnotacionesService, { EstadoAnotacion, ItemCola } from "api/etapaAnotaciones";
import { BRAND_BLUE } from "themes/dashboardTokens";
import { ACCIONES_REQUERIDAS, ACTOS_PROCESALES, DIM_LABELS, DimKey, OBJETOS_DECIDIDOS } from "./etiquetadoTaxonomia";

const ESTADO_COLOR: Record<EstadoAnotacion, "default" | "warning" | "info" | "success" | "error"> = {
	pendiente: "default",
	en_progreso: "warning",
	anotada: "info",
	verificada: "success",
	descartada: "error",
};

const FUEROS = ["CNT", "CSS", "CIV", "COM", "CAF", "CCF"];

const EtiquetadoDataset = () => {
	const navigate = useNavigate();
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	const [items, setItems] = useState<ItemCola[]>([]);
	const [total, setTotal] = useState(0);
	const [porEstado, setPorEstado] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [estadoFilter, setEstadoFilter] = useState<string>("todos");
	const [fueroFilter, setFueroFilter] = useState<string>("todos");
	// Tablero de cobertura de clases (carga on-demand al abrir)
	const [coberturaAbierta, setCoberturaAbierta] = useState(false);
	const [cobertura, setCobertura] = useState<Awaited<ReturnType<typeof EtapaAnotacionesService.getCobertura>> | null>(null);
	const [coberturaLoading, setCoberturaLoading] = useState(false);

	const abrirCobertura = async () => {
		const abrir = !coberturaAbierta;
		setCoberturaAbierta(abrir);
		if (abrir && !cobertura) {
			setCoberturaLoading(true);
			try {
				setCobertura(await EtapaAnotacionesService.getCobertura());
			} catch (e: any) {
				setError(e?.response?.data?.message || e.message);
				setCoberturaAbierta(false);
			} finally {
				setCoberturaLoading(false);
			}
		}
	};

	const labelDeValor = (dim: string, v: string) =>
		dim === "actoProcesal"
			? ACTOS_PROCESALES.find(([x]) => x === v)?.[1] || v
			: DIM_LABELS[dim as DimKey]?.opciones.find(([x]) => x === v)?.[1] || v;

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const d = await EtapaAnotacionesService.getCola({
				estado: estadoFilter !== "todos" ? estadoFilter : undefined,
				fuero: fueroFilter !== "todos" ? fueroFilter : undefined,
				page,
				limit: rowsPerPage,
			});
			setItems(d.items);
			setTotal(d.total);
			setPorEstado(d.porEstado || {});
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message);
		} finally {
			setLoading(false);
		}
	}, [estadoFilter, fueroFilter, page, rowsPerPage]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	return (
		<MainCard
			title="Etiquetado de dataset — etapas procesales"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<Button size="small" variant={coberturaAbierta ? "contained" : "outlined"} onClick={abrirCobertura}>
						Cobertura de clases
					</Button>
					<IconButton size="small" onClick={cargar}>
						<Refresh size={18} />
					</IconButton>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
				Cola de causas para anotación experta del dataset del clasificador (Fase 2). Cada causa se abre en el editor con todos
				sus movimientos, las etiquetas débiles del motor y el cuerpo segmentado de las resoluciones capturadas. También podés
				sumar causas a la cola desde <b>Carpetas verificadas</b> con el botón de etiquetado.
			</Typography>

			{/* ── Tablero de cobertura: qué clases ya tienen ejemplos y cuáles faltan;
			    causas pendientes sugeridas por señales de clases subrepresentadas ── */}
			<Collapse in={coberturaAbierta}>
				<Card variant="outlined" sx={{ p: 2, mb: 2 }}>
					{coberturaLoading || !cobertura ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
							<CircularProgress size={28} />
						</Box>
					) : (
						<>
							<Typography variant="subtitle1" fontWeight={700}>
								Cobertura del gold set — {cobertura.causas.total} causas · {cobertura.causas.movimientosAnotados} movimientos
								anotados
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Los valores en gris punteado todavía no tienen NINGÚN ejemplo — son los que conviene cazar en las próximas
								causas.
							</Typography>
							{["actoProcesal", "funcion", "resultado", "modoTerminacion", "materia"].map((dim) => (
								<Box key={dim} sx={{ mt: 1.25 }}>
									<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
										{dim === "actoProcesal" ? "Acto procesal" : DIM_LABELS[dim as DimKey]?.titulo || dim}
									</Typography>
									<Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.5, mt: 0.4 }}>
										{(cobertura.distribucion[dim] || []).map(({ valor, n }) => (
											<Chip
												key={valor}
												size="small"
												label={`${labelDeValor(dim, valor)} ${n}`}
												variant={n > 0 ? "filled" : "outlined"}
												sx={{
													fontSize: "0.66rem",
													height: 20,
													...(n === 0 && { opacity: 0.55, borderStyle: "dashed", color: "text.disabled" }),
												}}
											/>
										))}
									</Stack>
								</Box>
							))}
							{cobertura.objetosDecididos.length > 0 && (
								<Box sx={{ mt: 1.25 }}>
									<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
										Objetos decididos (Decisiones)
									</Typography>
									<Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.5, mt: 0.4 }}>
										{cobertura.objetosDecididos.map(({ valor, n }) => (
											<Chip
												key={valor}
												size="small"
												label={`${OBJETOS_DECIDIDOS.find(([x]) => x === valor)?.[1] || valor} ${n}`}
												sx={{ fontSize: "0.66rem", height: 20 }}
											/>
										))}
									</Stack>
								</Box>
							)}
							{cobertura.acciones.length > 0 && (
								<Box sx={{ mt: 1.25 }}>
									<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
										Acciones requeridas (Cargas)
									</Typography>
									<Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.5, mt: 0.4 }}>
										{cobertura.acciones.map(({ valor, n }) => (
											<Chip
												key={valor}
												size="small"
												label={`${ACCIONES_REQUERIDAS.find(([x]) => x === valor)?.[1] || valor} ${n}`}
												sx={{ fontSize: "0.66rem", height: 20 }}
											/>
										))}
									</Stack>
								</Box>
							)}
							<Divider sx={{ my: 1.5 }} />
							<Typography variant="subtitle2" fontWeight={700}>
								Próximas causas sugeridas (por señales de clases faltantes)
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
								Cada señal pesa 1/(1+ejemplos ya anotados): anotar estas causas suma las clases que hoy faltan.
							</Typography>
							{cobertura.sugeridas.length === 0 ? (
								<Typography variant="body2" color="text.secondary">
									Sin candidatas con señales — la cola pendiente no aporta clases nuevas.
								</Typography>
							) : (
								<Stack spacing={0.5}>
									{cobertura.sugeridas.map((sug) => (
										<Stack
											key={`${sug.fuero}-${sug.causaId}`}
											direction="row"
											alignItems="center"
											flexWrap="wrap"
											useFlexGap
											sx={{ gap: 0.75, py: 0.4, px: 1, borderRadius: 1, "&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04) } }}
										>
											<Chip size="small" variant="outlined" label={sug.fuero} sx={{ height: 20, fontSize: "0.66rem" }} />
											<Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
												{sug.number}/{sug.year}
											</Typography>
											<Typography variant="caption" sx={{ flex: 1, minWidth: 160 }} noWrap>
												{sug.caratula || "—"}
											</Typography>
											{sug.senales.map((se) => (
												<Chip
													key={se.clave}
													size="small"
													color="info"
													variant="outlined"
													label={`${se.clave}×${se.hits}`}
													sx={{ height: 18, fontSize: "0.62rem" }}
												/>
											))}
											<Button
												size="small"
												variant="text"
												sx={{ py: 0, minWidth: 0 }}
												onClick={() => navigate(`/admin/causas/etiquetado/${sug.fuero}/${sug.causaId}`)}
											>
												Abrir
											</Button>
										</Stack>
									))}
								</Stack>
							)}
						</>
					)}
				</Card>
			</Collapse>

			<Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
				{Object.entries(porEstado).map(([e, n]) => (
					<Chip
						key={e}
						size="small"
						label={`${e}: ${n}`}
						color={ESTADO_COLOR[e as EstadoAnotacion] || "default"}
						variant={estadoFilter === e ? "filled" : "outlined"}
						onClick={() => {
							setEstadoFilter(estadoFilter === e ? "todos" : e);
							setPage(0);
						}}
					/>
				))}
			</Stack>

			<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
				<FormControl size="small" sx={{ minWidth: 140 }}>
					<InputLabel>Fuero</InputLabel>
					<Select
						value={fueroFilter}
						label="Fuero"
						onChange={(e) => {
							setFueroFilter(e.target.value);
							setPage(0);
						}}
					>
						<MenuItem value="todos">Todos</MenuItem>
						{FUEROS.map((f) => (
							<MenuItem key={f} value={f}>
								{f}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Stack>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : (
				<Card variant="outlined">
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fuero</TableCell>
									<TableCell>Expediente</TableCell>
									<TableCell>Carátula</TableCell>
									<TableCell>Objeto</TableCell>
									<TableCell>Motivo</TableCell>
									<TableCell align="center">Anotados</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{items.map((item) => (
									<TableRow
										key={item._id}
										hover
										sx={{ cursor: "pointer", "&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) } }}
										onClick={() => navigate(`/admin/causas/etiquetado/${item.fuero}/${item.causaId}`)}
									>
										<TableCell>
											<Chip size="small" variant="outlined" label={item.fuero} />
										</TableCell>
										<TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
											<Typography variant="body2" fontWeight={600}>
												{item.number}/{item.year}
											</Typography>
										</TableCell>
										<TableCell sx={{ maxWidth: 280 }}>
											<Typography variant="body2" sx={{ whiteSpace: "normal", wordWrap: "break-word" }}>
												{item.caratula || "—"}
											</Typography>
										</TableCell>
										<TableCell sx={{ maxWidth: 180 }}>
											<Typography variant="caption">{item.objeto || "—"}</Typography>
										</TableCell>
										<TableCell>
											<Chip size="small" variant="outlined" label={item.motivo} sx={{ fontSize: "0.68rem" }} />
										</TableCell>
										<TableCell align="center" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{item.movimientosAnotados}
											{(item.divergencias || 0) > 0 && (
												<Tooltip
													title={
														<>
															{`${item.divergencias} valor(es) difieren de la combinación típica del acto — informativo, no error:`}
															{(item.divergenciasDetalle || []).map((dv, i) => (
																<div key={i}>
																	{`mov #${dv.idx} · ${DIM_LABELS[dv.dim as DimKey]?.corto || dv.dim}: «${
																		DIM_LABELS[dv.dim as DimKey]?.opciones.find(([v]) => v === dv.elegido)?.[1] || dv.elegido
																	}» (típico de ${dv.acto}: «${
																		DIM_LABELS[dv.dim as DimKey]?.opciones.find(([v]) => v === dv.sugerido)?.[1] || dv.sugerido
																	}»)`}
																</div>
															))}
															{(item.divergencias || 0) > (item.divergenciasDetalle || []).length && (
																<div>{`… y ${(item.divergencias || 0) - (item.divergenciasDetalle || []).length} más`}</div>
															)}
														</>
													}
												>
													<Chip
														size="small"
														color="warning"
														variant="outlined"
														label={`⚠ ${item.divergencias}`}
														sx={{ ml: 0.6, fontSize: "0.66rem", height: 20 }}
														onClick={(e) => e.stopPropagation()}
													/>
												</Tooltip>
											)}
										</TableCell>
										<TableCell align="center">
											<Chip size="small" label={item.estado} color={ESTADO_COLOR[item.estado]} />
										</TableCell>
										<TableCell align="center">
											<Tooltip title="Abrir editor">
												<IconButton
													size="small"
													color="primary"
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/admin/causas/etiquetado/${item.fuero}/${item.causaId}`);
													}}
												>
													<Edit2 size={17} />
												</IconButton>
											</Tooltip>
										</TableCell>
									</TableRow>
								))}
								{!items.length && (
									<TableRow>
										<TableCell colSpan={8}>
											<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
												No hay causas en la cola con estos filtros.
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
					<EnhancedTablePagination
						rowsPerPageOptions={[10, 25, 50, 100]}
						count={total}
						rowsPerPage={rowsPerPage}
						page={page}
						onPageChange={(_e, p) => setPage(p)}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
					/>
				</Card>
			)}
		</MainCard>
	);
};

export default EtiquetadoDataset;
