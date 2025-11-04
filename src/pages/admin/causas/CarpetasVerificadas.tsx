import { useState, useEffect } from "react";
import {
	Box,
	Card,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
} from "@mui/material";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import CausasService, { Causa } from "api/causas";
import { Refresh, Eye } from "iconsax-react";

// Mapeo de fueros a nombres legibles
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
};

// Mapeo de colores por fuero
const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
};

const CarpetasVerificadas = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [causas, setCausas] = useState<Causa[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [totalCount, setTotalCount] = useState(0);
	const [fueroFilter, setFueroFilter] = useState<string>("todos");
	const [breakdown, setBreakdown] = useState<{ civil: number; seguridad_social: number; trabajo: number } | null>(null);

	// Cargar causas verificadas
	const fetchCausas = async (currentPage: number, limit: number, fuero: string) => {
		try {
			setLoading(true);

			const params: any = {
				page: currentPage + 1, // Backend usa base 1
				limit,
			};

			if (fuero !== "todos") {
				params.fuero = fuero;
			}

			const response = await CausasService.getVerifiedCausas(params);

			if (response.success) {
				setCausas(response.data);
				setTotalCount(response.count || 0);

				// Guardar breakdown si está disponible
				if (response.breakdown) {
					setBreakdown(response.breakdown);
				}
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las carpetas verificadas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Efecto para cargar causas cuando cambian los filtros o paginación
	useEffect(() => {
		fetchCausas(page, rowsPerPage, fueroFilter);
	}, [page, rowsPerPage, fueroFilter]);

	// Handlers de paginación
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Handler de cambio de fuero
	const handleFueroChange = (event: any) => {
		setFueroFilter(event.target.value);
		setPage(0);
	};

	// Handler de refresh
	const handleRefresh = () => {
		fetchCausas(page, rowsPerPage, fueroFilter);
	};

	// Formatear fecha
	const formatDate = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleDateString("es-AR");
	};

	// Obtener ID como string
	const getId = (id: string | { $oid: string }): string => {
		return typeof id === "string" ? id : id.$oid;
	};

	return (
		<MainCard title="Carpetas Verificadas">
			<Grid container spacing={3}>
				{/* Filtros y estadísticas */}
				<Grid item xs={12}>
					<Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
						<Stack direction="row" spacing={2} alignItems="center">
							<FormControl sx={{ minWidth: 200 }}>
								<InputLabel>Fuero</InputLabel>
								<Select value={fueroFilter} onChange={handleFueroChange} label="Fuero" size="small">
									<MenuItem value="todos">Todos los Fueros</MenuItem>
									<MenuItem value="CIV">Civil</MenuItem>
									<MenuItem value="COM">Comercial</MenuItem>
									<MenuItem value="CSS">Seguridad Social</MenuItem>
									<MenuItem value="CNT">Trabajo</MenuItem>
								</Select>
							</FormControl>

							<Tooltip title="Actualizar">
								<IconButton onClick={handleRefresh} disabled={loading}>
									<Refresh />
								</IconButton>
							</Tooltip>
						</Stack>

						{breakdown && (
							<Stack direction="row" spacing={1}>
								<Chip label={`Civil: ${breakdown.civil}`} color="primary" size="small" />
								<Chip label={`Seg. Social: ${breakdown.seguridad_social}`} color="warning" size="small" />
								<Chip label={`Trabajo: ${breakdown.trabajo}`} color="error" size="small" />
							</Stack>
						)}
					</Stack>
				</Grid>

				{/* Tabla */}
				<Grid item xs={12}>
					{loading ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
							<CircularProgress />
						</Box>
					) : causas.length === 0 ? (
						<Alert severity="info">No se encontraron carpetas verificadas con los filtros seleccionados</Alert>
					) : (
						<Card>
							<TableContainer>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>Fuero</TableCell>
											<TableCell>Número</TableCell>
											<TableCell>Año</TableCell>
											<TableCell>Carátula</TableCell>
											<TableCell>Juzgado</TableCell>
											<TableCell>Objeto</TableCell>
											<TableCell align="center">Movimientos</TableCell>
											<TableCell>Última Act.</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{causas.map((causa) => (
											<TableRow key={getId(causa._id)} hover>
												<TableCell>
													<Chip label={FUERO_LABELS[causa.fuero || "CIV"]} color={FUERO_COLORS[causa.fuero || "CIV"]} size="small" />
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight="bold">
														{causa.number}
													</Typography>
												</TableCell>
												<TableCell>{causa.year}</TableCell>
												<TableCell>
													<Tooltip title={causa.caratula || "Sin carátula"}>
														<Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
															{causa.caratula || "Sin carátula"}
														</Typography>
													</Tooltip>
												</TableCell>
												<TableCell>
													<Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
														{causa.juzgado || "N/A"}
													</Typography>
												</TableCell>
												<TableCell>
													<Tooltip title={causa.objeto || "Sin objeto"}>
														<Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
															{causa.objeto || "Sin objeto"}
														</Typography>
													</Tooltip>
												</TableCell>
												<TableCell align="center">
													<Chip label={causa.movimientosCount || 0} size="small" variant="outlined" />
												</TableCell>
												<TableCell>
													<Typography variant="caption">{formatDate(causa.lastUpdate)}</Typography>
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Ver detalles">
														<IconButton size="small" color="primary">
															<Eye size={18} />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<TablePagination
								rowsPerPageOptions={[10, 25, 50, 100]}
								component="div"
								count={totalCount}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								labelRowsPerPage="Filas por página:"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						</Card>
					)}
				</Grid>
			</Grid>
		</MainCard>
	);
};

export default CarpetasVerificadas;
