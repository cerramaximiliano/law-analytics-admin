import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	TableSortLabel,
	Chip,
	IconButton,
	Tooltip,
	Alert,
	Skeleton,
	ToggleButton,
	ToggleButtonGroup,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh2, ShieldCross, InfoCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { formatInTimezone } from "utils/dayjs-config";
import CausasPjnService, { Causa } from "api/causasPjn";

const FUEROS: Array<"CIV" | "COM" | "CSS" | "CNT"> = ["CIV", "COM", "CSS", "CNT"];
const FUERO_NAMES: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seg. Social",
	CNT: "Trabajo",
};

type SortBy = "count" | "lastAt" | "lastBdCount";

const ZeroMovementsProtectionPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [fueroFilter, setFueroFilter] = useState<"CIV" | "COM" | "CSS" | "CNT" | "ALL">("ALL");
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(50);
	const [sortBy, setSortBy] = useState<SortBy>("count");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	const [causas, setCausas] = useState<Causa[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const params = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy,
				sortOrder,
				...(fueroFilter !== "ALL" ? { fuero: fueroFilter } : {}),
			};
			const resp = await CausasPjnService.getZeroMovementsProtection(params);
			if (resp.success) {
				setCausas(resp.data.causas);
				setTotal(resp.data.pagination.total);
			} else {
				enqueueSnackbar("No se pudieron obtener las causas", { variant: "error" });
			}
		} catch (err: any) {
			enqueueSnackbar(`Error: ${err?.message || "fallo al obtener causas"}`, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [fueroFilter, page, rowsPerPage, sortBy, sortOrder, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleSort = (column: SortBy) => {
		if (sortBy === column) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortOrder("desc");
		}
		setPage(0);
	};

	const renderDate = (v: { $date: string } | string | undefined): string => {
		if (!v) return "—";
		const raw = typeof v === "string" ? v : v.$date;
		try {
			return formatInTimezone(raw, "DD/MM/YYYY HH:mm");
		} catch {
			return raw;
		}
	};

	const getCausaId = (c: Causa): string => (typeof c._id === "string" ? c._id : c._id?.$oid || "");

	return (
		<Stack spacing={2}>
			<Alert severity="info" icon={<InfoCircle size={20} />}>
				<Typography variant="body2">
					Causas en las que se activó la <strong>protección anti-eliminación</strong>: el sitio del PJN devolvió 0 movimientos cuando la BD tenía
					al menos 1. El conteo es histórico y no se resetea — sirve para detectar causas crónicas con problemas de scraping.
				</Typography>
			</Alert>

			<Paper sx={{ p: 2 }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
					<Stack direction="row" alignItems="center" spacing={1}>
						<ShieldCross size={20} color={theme.palette.warning.main} />
						<Typography variant="h5" sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}>
							Protección anti-eliminación activada
						</Typography>
						<Chip label={`${total} causas`} size="small" color="warning" />
					</Stack>
					<Stack direction="row" alignItems="center" spacing={1}>
						<ToggleButtonGroup
							size="small"
							exclusive
							value={fueroFilter}
							onChange={(_, v) => {
								if (v) {
									setFueroFilter(v);
									setPage(0);
								}
							}}
						>
							<ToggleButton value="ALL">Todos</ToggleButton>
							{FUEROS.map((f) => (
								<ToggleButton key={f} value={f}>
									{f}
								</ToggleButton>
							))}
						</ToggleButtonGroup>
						<Tooltip title="Refrescar">
							<IconButton onClick={fetchData} disabled={loading} size="small">
								<Refresh2 size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow sx={{ bgcolor: alpha(theme.palette.warning.main, 0.05) }}>
								<TableCell>Fuero</TableCell>
								<TableCell>Causa</TableCell>
								<TableCell sx={{ maxWidth: 300 }}>Carátula</TableCell>
								<TableCell align="right">Movs BD</TableCell>
								<TableCell align="right" sortDirection={sortBy === "count" ? sortOrder : false}>
									<TableSortLabel active={sortBy === "count"} direction={sortBy === "count" ? sortOrder : "desc"} onClick={() => handleSort("count")}>
										Veces
									</TableSortLabel>
								</TableCell>
								<TableCell align="right" sortDirection={sortBy === "lastBdCount" ? sortOrder : false}>
									<TableSortLabel
										active={sortBy === "lastBdCount"}
										direction={sortBy === "lastBdCount" ? sortOrder : "desc"}
										onClick={() => handleSort("lastBdCount")}
									>
										Last BD count
									</TableSortLabel>
								</TableCell>
								<TableCell sortDirection={sortBy === "lastAt" ? sortOrder : false}>
									<TableSortLabel active={sortBy === "lastAt"} direction={sortBy === "lastAt" ? sortOrder : "desc"} onClick={() => handleSort("lastAt")}>
										Última activación
									</TableSortLabel>
								</TableCell>
								<TableCell>Última act. doc</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading
								? Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											{Array.from({ length: 8 }).map((__, j) => (
												<TableCell key={j}>
													<Skeleton variant="text" />
												</TableCell>
											))}
										</TableRow>
								  ))
								: causas.length === 0
								? (
										<TableRow>
											<TableCell colSpan={8} align="center">
												<Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
													No hay causas con la protección activada.
												</Typography>
											</TableCell>
										</TableRow>
								  )
								: causas.map((c) => {
										const zmp = c.scrapingProgress?.zeroMovementsProtection;
										return (
											<TableRow key={getCausaId(c)} hover>
												<TableCell>
													<Chip label={c.fuero || "?"} size="small" />
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight="medium">
														{c.number}/{c.year}
													</Typography>
												</TableCell>
												<TableCell sx={{ maxWidth: 300 }}>
													<Tooltip title={c.caratula || ""}>
														<Typography
															variant="body2"
															sx={{
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
															}}
														>
															{c.caratula || "—"}
														</Typography>
													</Tooltip>
												</TableCell>
												<TableCell align="right">{c.movimientosCount ?? "—"}</TableCell>
												<TableCell align="right">
													<Chip label={zmp?.count ?? 0} size="small" color={(zmp?.count ?? 0) >= 5 ? "error" : "warning"} />
												</TableCell>
												<TableCell align="right">{zmp?.lastBdCount ?? "—"}</TableCell>
												<TableCell>{renderDate(zmp?.lastAt)}</TableCell>
												<TableCell>{renderDate(c.lastUpdate)}</TableCell>
											</TableRow>
										);
								  })}
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
					rowsPerPageOptions={[25, 50, 100, 200]}
					labelRowsPerPage="Filas por página:"
				/>
			</Paper>
		</Stack>
	);
};

export default ZeroMovementsProtectionPanel;
