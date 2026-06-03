import React, { useState, useEffect } from "react";
import {
	Box,
	Card,
	Typography,
	Stack,
	Chip,
	Alert,
	Skeleton,
	Button,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	MenuItem,
	Tooltip,
	useTheme,
} from "@mui/material";
import { Refresh, Gallery, ExportSquare, TickCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { CausasUpdateService, ScrapeIncident, ScrapeIncidentType, IncidentStats } from "api/causasUpdate";

const typeLabels: Record<ScrapeIncidentType, string> = {
	search_error: "Error de búsqueda",
	scraping_error: "Error de scraping",
	degraded_scrape: "Scrape degradado",
	processing_exception: "Excepción",
	login_error: "Error de login",
	other: "Otro",
};

const typeColors: Record<ScrapeIncidentType, "error" | "warning" | "info" | "default"> = {
	search_error: "warning",
	scraping_error: "error",
	degraded_scrape: "warning",
	processing_exception: "error",
	login_error: "error",
	other: "default",
};

const CausasUpdateIncidentsTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [incidents, setIncidents] = useState<ScrapeIncident[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [resolvedFilter, setResolvedFilter] = useState<string>("false");
	const [stats, setStats] = useState<IncidentStats | null>(null);
	const [selected, setSelected] = useState<ScrapeIncident | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);

	const fetchIncidents = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: rowsPerPage };
			if (typeFilter) params.type = typeFilter;
			if (resolvedFilter) params.resolved = resolvedFilter === "true";
			const [res, statsRes] = await Promise.all([
				CausasUpdateService.getIncidents(params),
				CausasUpdateService.getIncidentStats(),
			]);
			if (res.success) {
				setIncidents(res.data);
				setTotal(res.count || 0);
			}
			if (statsRes.success) setStats(statsRes.data);
		} catch (error: any) {
			enqueueSnackbar("Error cargando incidentes", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchIncidents();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, rowsPerPage, typeFilter, resolvedFilter]);

	const handleViewDetail = async (id: string) => {
		try {
			setDetailLoading(true);
			const response = await CausasUpdateService.getIncidentDetail(id);
			if (response.success) setSelected(response.data);
		} catch (error: any) {
			enqueueSnackbar("Error cargando detalle del incidente", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setDetailLoading(false);
		}
	};

	const handleResolve = async (id: string, resolved: boolean) => {
		try {
			const response = await CausasUpdateService.resolveIncident(id, resolved);
			if (response.success) {
				enqueueSnackbar(resolved ? "Incidente marcado como resuelto" : "Incidente reabierto", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				setSelected(null);
				fetchIncidents();
			}
		} catch (error: any) {
			enqueueSnackbar("Error actualizando incidente", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const fmtDate = (d?: string | null) =>
		d
			? new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
			: "-";

	if (loading && incidents.length === 0) {
		return (
			<Stack spacing={2}>
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
				))}
			</Stack>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Resumen */}
			{stats && (
				<Stack direction="row" spacing={1.5} flexWrap="wrap">
					<Chip label={`Abiertos: ${stats.open}`} color="warning" variant="outlined" size="small" />
					<Chip label={`Total: ${stats.total}`} variant="outlined" size="small" />
					{Object.entries(stats.byType).map(([t, c]) => (
						<Chip key={t} label={`${typeLabels[t as ScrapeIncidentType] || t}: ${c}`} size="small" variant="outlined" />
					))}
				</Stack>
			)}

			{/* Filtros */}
			<Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
				<Stack direction="row" spacing={2} alignItems="center">
					<TextField
						select
						size="small"
						label="Tipo"
						value={typeFilter}
						onChange={(e) => {
							setTypeFilter(e.target.value);
							setPage(0);
						}}
						sx={{ minWidth: 170 }}
					>
						<MenuItem value="">Todos</MenuItem>
						<MenuItem value="search_error">Error de búsqueda</MenuItem>
						<MenuItem value="scraping_error">Error de scraping</MenuItem>
						<MenuItem value="degraded_scrape">Scrape degradado</MenuItem>
						<MenuItem value="processing_exception">Excepción</MenuItem>
						<MenuItem value="login_error">Error de login</MenuItem>
					</TextField>
					<TextField
						select
						size="small"
						label="Estado"
						value={resolvedFilter}
						onChange={(e) => {
							setResolvedFilter(e.target.value);
							setPage(0);
						}}
						sx={{ minWidth: 140 }}
					>
						<MenuItem value="false">Abiertos</MenuItem>
						<MenuItem value="true">Resueltos</MenuItem>
						<MenuItem value="">Todos</MenuItem>
					</TextField>
				</Stack>
				<Button startIcon={<Refresh size={18} />} onClick={fetchIncidents} size="small" variant="outlined">
					Actualizar
				</Button>
			</Stack>

			{/* Tabla */}
			<Card variant="outlined">
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Expediente</TableCell>
								<TableCell>Error</TableCell>
								<TableCell align="center">Veces</TableCell>
								<TableCell align="center">Captura</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{incidents.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} align="center">
										<Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
											No hay incidentes registrados
										</Typography>
									</TableCell>
								</TableRow>
							) : (
								incidents.map((inc) => (
									<TableRow key={inc._id} hover sx={{ cursor: "pointer" }} onClick={() => handleViewDetail(inc._id)}>
										<TableCell>
											<Typography variant="caption">{fmtDate(inc.lastSeenAt)}</Typography>
										</TableCell>
										<TableCell>
											<Chip
												label={typeLabels[inc.type] || inc.type}
												size="small"
												color={typeColors[inc.type] as any}
												variant="outlined"
												sx={{ height: 22, fontSize: "0.72rem" }}
											/>
										</TableCell>
										<TableCell>
											<Typography variant="caption">
												{inc.fuero} {inc.number}/{inc.year}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{ maxWidth: 240, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
											>
												{inc.errorMessage || "-"}
											</Typography>
										</TableCell>
										<TableCell align="center">{inc.detectionCount}</TableCell>
										<TableCell align="center">
											{inc.screenshotUrl ? (
												<Tooltip title="Tiene screenshot">
													<Gallery size={16} color={theme.palette.info.main} />
												</Tooltip>
											) : (
												<Typography variant="caption" color="text.disabled">
													-
												</Typography>
											)}
										</TableCell>
										<TableCell align="center">
											<Chip
												label={inc.resolved ? "Resuelto" : "Abierto"}
												size="small"
												color={inc.resolved ? "success" : "warning"}
												variant={inc.resolved ? "filled" : "outlined"}
												sx={{ height: 20, fontSize: "0.7rem" }}
											/>
										</TableCell>
										<TableCell>
											<Button
												size="small"
												variant="text"
												onClick={(e) => {
													e.stopPropagation();
													handleViewDetail(inc._id);
												}}
											>
												Ver
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>
				<TablePagination
					component="div"
					count={total}
					page={page}
					onPageChange={(_, p) => setPage(p)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => {
						setRowsPerPage(parseInt(e.target.value, 10));
						setPage(0);
					}}
					rowsPerPageOptions={[10, 25, 50]}
					labelRowsPerPage="Filas"
				/>
			</Card>

			{/* Dialog de detalle */}
			<Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
				{selected && (
					<>
						<DialogTitle sx={{ pb: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography
									variant="h5"
									sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
								>
									Incidente de scraping
								</Typography>
								<Chip label={typeLabels[selected.type] || selected.type} size="small" color={typeColors[selected.type] as any} />
								<Chip
									label={selected.resolved ? "Resuelto" : "Abierto"}
									size="small"
									color={selected.resolved ? "success" : "warning"}
									variant={selected.resolved ? "filled" : "outlined"}
								/>
							</Stack>
						</DialogTitle>
						<DialogContent dividers>
							<Stack spacing={2}>
								{/* Resumen */}
								<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
									<Box>
										<Typography variant="caption" color="text.secondary">
											Expediente
										</Typography>
										<Typography variant="body2">
											{selected.fuero} {selected.number}/{selected.year}
										</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary">
											Carátula
										</Typography>
										<Typography variant="body2" sx={{ maxWidth: 360 }}>
											{selected.caratula || "-"}
										</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary">
											Detecciones
										</Typography>
										<Typography variant="body2">{selected.detectionCount}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary">
											Primera / última
										</Typography>
										<Typography variant="body2">
											{fmtDate(selected.firstSeenAt)} → {fmtDate(selected.lastSeenAt)}
										</Typography>
									</Box>
								</Stack>

								{/* Mensaje de error */}
								{selected.errorMessage && (
									<Alert severity="error" variant="outlined">
										<Typography variant="body2">{selected.errorMessage}</Typography>
										{selected.pageUrl && (
											<Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
												URL: {selected.pageUrl}
											</Typography>
										)}
									</Alert>
								)}

								{/* Screenshot */}
								<Box>
									<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
										<Typography variant="subtitle1" fontWeight={600}>
											Captura de pantalla
										</Typography>
										{selected.screenshotUrl && (
											<Button
												size="small"
												variant="outlined"
												startIcon={<ExportSquare size={16} />}
												onClick={() => window.open(selected.screenshotUrl as string, "_blank")}
											>
												Ver en S3
											</Button>
										)}
									</Stack>
									{selected.screenshotUrl ? (
										<Box
											component="img"
											src={selected.screenshotUrl}
											alt="screenshot del error"
											sx={{
												width: "100%",
												borderRadius: 1,
												border: `1px solid ${theme.palette.divider}`,
												objectFit: "contain",
												maxHeight: 480,
												bgcolor: theme.palette.background.default,
											}}
										/>
									) : (
										<Alert severity="info" variant="outlined">
											<Typography variant="body2">Este incidente no tiene screenshot (la captura o la subida a S3 falló).</Typography>
										</Alert>
									)}
								</Box>

								{/* HTML snippet */}
								{selected.htmlSnippet && (
									<Box>
										<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
											HTML capturado (primeros 5 KB)
										</Typography>
										<Box
											component="pre"
											sx={{
												m: 0,
												p: 1.5,
												borderRadius: 1,
												bgcolor: theme.palette.background.default,
												border: `1px solid ${theme.palette.divider}`,
												fontSize: "0.7rem",
												maxHeight: 220,
												overflow: "auto",
												whiteSpace: "pre-wrap",
												wordBreak: "break-all",
											}}
										>
											{selected.htmlSnippet}
										</Box>
									</Box>
								)}

								{/* Metadata técnica */}
								<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
									<Typography variant="caption" color="text.secondary">
										causaId: {selected.causaId || "-"}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										credencial: {selected.credentialsId?.toString().slice(-6) || "-"}
									</Typography>
									{selected.s3Key && (
										<Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
											s3Key: {selected.s3Key}
										</Typography>
									)}
									{selected.resolvedBy && (
										<Typography variant="caption" color="text.secondary">
											resuelto por: {selected.resolvedBy}
										</Typography>
									)}
								</Stack>
							</Stack>
						</DialogContent>
						<DialogActions>
							{!selected.resolved ? (
								<Button color="success" startIcon={<TickCircle size={16} />} onClick={() => handleResolve(selected._id, true)}>
									Marcar resuelto
								</Button>
							) : (
								<Button color="warning" onClick={() => handleResolve(selected._id, false)}>
									Reabrir
								</Button>
							)}
							<Button onClick={() => setSelected(null)}>Cerrar</Button>
						</DialogActions>
					</>
				)}
			</Dialog>
		</Stack>
	);
};

export default CausasUpdateIncidentsTab;
