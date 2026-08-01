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
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import MainCard from "components/MainCard";
import { Edit2, Refresh } from "iconsax-react";
import EtapaAnotacionesService, { EstadoAnotacion, ItemCola } from "api/etapaAnotaciones";
import { BRAND_BLUE } from "themes/dashboardTokens";
import { DIM_LABELS, DimKey } from "./etiquetadoTaxonomia";

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
				<IconButton size="small" onClick={cargar}>
					<Refresh size={18} />
				</IconButton>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
				Cola de causas para anotación experta del dataset del clasificador (Fase 2). Cada causa se abre en el editor con todos
				sus movimientos, las etiquetas débiles del motor y el cuerpo segmentado de las resoluciones capturadas. También podés
				sumar causas a la cola desde <b>Carpetas verificadas</b> con el botón de etiquetado.
			</Typography>

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
