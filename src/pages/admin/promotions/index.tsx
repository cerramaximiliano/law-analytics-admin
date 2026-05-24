import { useEffect, useMemo, useState } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	Paper,
	Skeleton,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add, Edit, Trash, Eye, Refresh2, TickCircle, CloseCircle, UserTick, Category2, People, Profile, Warning2 } from "iconsax-react";
import MainCard from "components/MainCard";
import { BRAND_BLUE, PREMIUM_GOLD } from "themes/dashboardTokens";
import { useSnackbar } from "notistack";
import discountsService, { DiscountCode, GetDiscountsParams } from "api/discounts";
import PromotionFormModal from "./PromotionFormModal";
import PromotionDetailModal from "./PromotionDetailModal";
import DeletePromotionDialog from "./DeletePromotionDialog";

type StatusFilter = "active" | "expired" | "inactive" | "all";

const PromotionsManagement = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
	const [eligibleCounts, setEligibleCounts] = useState<Record<string, { eligibleCount: number; isPublic: boolean }>>({});
	const [loadingCounts, setLoadingCounts] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDiscount, setSelectedDiscount] = useState<DiscountCode | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [toggleLoading, setToggleLoading] = useState<string | null>(null);

	const buildParams = (filter: StatusFilter): GetDiscountsParams => {
		// "active" y "expired" comparten el mismo backend filter (isActive=true)
		// y se diferencian client-side por validUntil. Esto evita agregar un
		// parámetro nuevo al endpoint listDiscounts y mantiene la lógica de
		// vigencia en un solo lugar (acá).
		if (filter === "active" || filter === "expired") return { isActive: true };
		if (filter === "inactive") return { isActive: false };
		return {};
	};

	const fetchDiscounts = async (filter: StatusFilter = statusFilter) => {
		try {
			setLoading(true);
			const response = await discountsService.getDiscounts(buildParams(filter));
			setDiscounts(response.data || []);
			setEligibleCounts({});
		} catch (error: any) {
			console.error("Error al cargar promociones:", error);
			enqueueSnackbar(error?.message || "Error al cargar las promociones", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDiscounts(statusFilter);
	}, [statusFilter]);

	// Aplica el corte por vigencia client-side: "active" excluye las expiradas
	// (validUntil < now), "expired" muestra solo las expiradas. Backend ya filtró
	// por isActive=true cuando aplica.
	const filteredDiscounts = useMemo(() => {
		if (statusFilter === "active") {
			const now = Date.now();
			return discounts.filter((d) => new Date(d.validUntil).getTime() >= now);
		}
		if (statusFilter === "expired") {
			const now = Date.now();
			return discounts.filter((d) => new Date(d.validUntil).getTime() < now);
		}
		return discounts;
	}, [discounts, statusFilter]);

	useEffect(() => {
		// Refresca el conteo de audiencia en batch para los items visibles
		const ids = filteredDiscounts.map((d) => d._id);
		if (ids.length === 0) {
			setEligibleCounts({});
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				setLoadingCounts(true);
				const res = await discountsService.getEligibleUsersCountsBatch(ids);
				if (!cancelled) {
					const mapped: Record<string, { eligibleCount: number; isPublic: boolean }> = {};
					for (const [id, c] of Object.entries(res.data.counts)) {
						mapped[id] = { eligibleCount: c.eligibleCount, isPublic: c.isPublic };
					}
					setEligibleCounts(mapped);
				}
			} catch (err: any) {
				if (!cancelled) console.error("Error al cargar audiencias:", err);
			} finally {
				if (!cancelled) setLoadingCounts(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [filteredDiscounts]);

	const handleAddNew = () => {
		setSelectedDiscount(null);
		setFormOpen(true);
	};

	const handleEdit = (discount: DiscountCode) => {
		setSelectedDiscount(discount);
		setFormOpen(true);
	};

	const handleView = (discount: DiscountCode) => {
		setSelectedDiscount(discount);
		setDetailModalOpen(true);
	};

	const handleDelete = (discount: DiscountCode) => {
		setSelectedDiscount(discount);
		setDeleteDialogOpen(true);
	};

	const handleFormClose = () => {
		setFormOpen(false);
		setSelectedDiscount(null);
	};

	const handleDetailClose = () => {
		setDetailModalOpen(false);
		setSelectedDiscount(null);
	};

	const handleDeleteClose = () => {
		setDeleteDialogOpen(false);
		setSelectedDiscount(null);
	};

	const handleFormSuccess = () => {
		fetchDiscounts(statusFilter);
		handleFormClose();
	};

	const handleConfirmDelete = async () => {
		if (!selectedDiscount) return;

		try {
			setDeleteLoading(true);
			await discountsService.deleteDiscount(selectedDiscount._id);
			enqueueSnackbar("Promoción eliminada correctamente", { variant: "success" });
			fetchDiscounts(statusFilter);
			handleDeleteClose();
		} catch (error: any) {
			console.error("Error al eliminar promoción:", error);
			enqueueSnackbar(error?.message || "Error al eliminar la promoción", { variant: "error" });
		} finally {
			setDeleteLoading(false);
		}
	};

	const handleToggle = async (discount: DiscountCode) => {
		try {
			setToggleLoading(discount._id);
			await discountsService.toggleDiscount(discount._id);
			enqueueSnackbar(`Promoción ${discount.isActive ? "desactivada" : "activada"} correctamente`, { variant: "success" });
			fetchDiscounts(statusFilter);
		} catch (error: any) {
			console.error("Error al cambiar estado:", error);
			enqueueSnackbar(error?.message || "Error al cambiar el estado", { variant: "error" });
		} finally {
			setToggleLoading(null);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const isValidNow = (discount: DiscountCode) => {
		const now = new Date();
		const validFrom = new Date(discount.validFrom);
		const validUntil = new Date(discount.validUntil);
		return discount.isActive && validFrom <= now && validUntil >= now;
	};

	const getStatusChip = (discount: DiscountCode) => {
		if (!discount.isActive) {
			return <Chip label="Inactivo" color="error" size="small" />;
		}
		const now = new Date();
		const validFrom = new Date(discount.validFrom);
		const validUntil = new Date(discount.validUntil);

		if (validFrom > now) {
			return <Chip label="Programado" color="warning" size="small" />;
		}
		if (validUntil < now) {
			return <Chip label="Expirado" color="default" size="small" />;
		}
		return <Chip label="Activo" color="success" size="small" />;
	};

	const getDiscountText = (discount: DiscountCode) => {
		if (discount.discountType === "percentage") {
			return `${discount.discountValue}%`;
		}
		return `$${discount.discountValue} ${discount.currency}`;
	};

	// Statistics
	const activeCount = discounts.filter((d) => isValidNow(d)).length;
	const scheduledCount = discounts.filter((d) => d.isActive && new Date(d.validFrom) > new Date()).length;
	const expiredCount = discounts.filter((d) => new Date(d.validUntil) < new Date()).length;
	const totalRedemptions = discounts.reduce((acc, d) => acc + d.stats.timesRedeemed, 0);

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<>
			<MainCard
				title="Gestión de promociones"
				secondary={
					<Stack direction="row" spacing={1.5}>
						<Button
							variant="outlined"
							color="secondary"
							startIcon={<Refresh2 />}
							onClick={() => fetchDiscounts(statusFilter)}
							sx={{
								transition: "transform 200ms ease",
								"&:hover": { transform: "translateY(-1px)" },
								"&:active": { transform: "translate(0, 1px)" },
							}}
						>
							Actualizar
						</Button>
						<Button
							variant="contained"
							color="primary"
							startIcon={<Add />}
							onClick={handleAddNew}
							sx={{
								transition: "transform 200ms ease, box-shadow 200ms ease",
								"&:hover": { transform: "translateY(-1px)", boxShadow: `0 8px 18px ${alpha(BRAND_BLUE, 0.28)}` },
								"&:active": { transform: "translate(0, 1px)" },
							}}
						>
							Nueva promoción
						</Button>
					</Stack>
				}
			>
				<Alert severity="info" sx={{ mb: 3 }}>
					<Typography variant="body2">
						Las promociones se sincronizan automáticamente con Stripe al crearlas. Los códigos públicos aparecerán automáticamente en la
						página de planes y se aplicarán en el checkout.
					</Typography>
				</Alert>

				{/* Summary Cards */}
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 3 }}>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined" sx={{ borderColor: alpha(theme.palette.divider, 0.6) }}>
							<CardContent>
								<Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
									Total de promociones
								</Typography>
								<Typography variant="h3" sx={{ color: BRAND_BLUE, fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
									{discounts.length}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined" sx={{ borderColor: alpha(theme.palette.divider, 0.6) }}>
							<CardContent>
								<Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
									Activas ahora
								</Typography>
								<Typography variant="h3" color="success.main" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
									{activeCount}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined" sx={{ borderColor: alpha(theme.palette.divider, 0.6) }}>
							<CardContent>
								<Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
									Programadas
								</Typography>
								<Typography variant="h3" sx={{ color: PREMIUM_GOLD, fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
									{scheduledCount}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined" sx={{ borderColor: alpha(theme.palette.divider, 0.6) }}>
							<CardContent>
								<Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.3 }}>
									Usos totales
								</Typography>
								<Typography variant="h3" color="info.main" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
									{totalRedemptions}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Status filter */}
				<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
					<Tabs value={statusFilter} onChange={(_, value: StatusFilter) => setStatusFilter(value)} aria-label="Filtro de estado">
						<Tab label="Activas" value="active" />
						<Tab label="Expiradas" value="expired" />
						<Tab label="Inactivas" value="inactive" />
						<Tab label="Todas" value="all" />
					</Tabs>
				</Box>

				{/* Promotions Table */}
				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Código</TableCell>
								<TableCell>Nombre</TableCell>
								<TableCell align="center">Descuento</TableCell>
								<TableCell align="center">Entorno</TableCell>
								<TableCell align="center">Vigencia</TableCell>
								<TableCell align="center">Visibilidad</TableCell>
								<TableCell align="center">Audiencia</TableCell>
								<TableCell align="center">Usos</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{filteredDiscounts.length === 0 ? (
								<TableRow>
									<TableCell colSpan={10} align="center">
										<Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
											{statusFilter === "expired"
												? "No hay promociones expiradas en este filtro."
												: statusFilter === "active"
												? "No hay promociones activas vigentes."
												: statusFilter === "inactive"
												? "No hay promociones inactivas."
												: "No hay promociones configuradas. Crea una nueva promoción para comenzar."}
										</Typography>
									</TableCell>
								</TableRow>
							) : (
								filteredDiscounts.map((discount) => (
									<TableRow key={discount._id} hover>
										<TableCell>
											<Typography variant="subtitle2" fontWeight={600} sx={{ fontFamily: "monospace" }}>
												{discount.code}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{discount.name}</Typography>
											{discount.activationRules.badge && (
												<Chip label={discount.activationRules.badge} size="small" color="primary" sx={{ mt: 0.5 }} />
											)}
										</TableCell>
										<TableCell align="center">
											<Stack direction="column" spacing={0.5} alignItems="center">
												<Box
													sx={{
														// Savings badge tipo flag, no pill genérico
														display: "inline-flex",
														alignItems: "center",
														gap: 0.5,
														px: 1.25,
														py: 0.4,
														bgcolor: alpha(theme.palette.success.main, 0.12),
														border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
														borderRadius: 0.75,
														color: theme.palette.success.dark,
														fontWeight: 700,
														fontSize: "0.8rem",
														fontVariantNumeric: "tabular-nums",
														letterSpacing: 0.2,
													}}
												>
													-{getDiscountText(discount)}
												</Box>
												<Typography variant="caption" color="textSecondary">
													{discount.duration === "once"
														? "Una vez"
														: discount.duration === "forever"
														? "Siempre"
														: `${discount.durationInMonths} meses`}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell align="center">
											{discount.targetEnvironment === "both" ? (
												<Chip label="Ambos" size="small" color="default" />
											) : discount.targetEnvironment === "production" ? (
												<Chip label="Producción" size="small" color="success" />
											) : (
												<Chip label="Desarrollo" size="small" color="warning" />
											)}
										</TableCell>
										<TableCell align="center">
											<Typography variant="caption" display="block">
												{formatDate(discount.validFrom)}
											</Typography>
											<Typography variant="caption" display="block" color="textSecondary">
												hasta {formatDate(discount.validUntil)}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Stack direction="column" spacing={0.5} alignItems="center">
												{discount.activationRules.isPublic ? (
													<Chip label="Público" size="small" color="info" />
												) : (
													<Chip label="Privado" size="small" variant="outlined" />
												)}
												{discount.activationRules.showOnLanding && (
													<Tooltip title="Visible en la landing pública (visitantes no autenticados)">
														<Chip label="En landing" size="small" color="success" />
													</Tooltip>
												)}
												{discount.restrictions.targetUsers && discount.restrictions.targetUsers.length > 0 && (
													<Tooltip title={`Restringido a ${discount.restrictions.targetUsers.length} usuario(s)`}>
														<Chip
															icon={<UserTick size={14} />}
															label={discount.restrictions.targetUsers.length}
															size="small"
															color="warning"
															sx={{
																"& .MuiChip-icon": { color: theme.palette.text.primary },
																color: theme.palette.text.primary,
															}}
														/>
													</Tooltip>
												)}
												{discount.restrictions.targetSegments && discount.restrictions.targetSegments.length > 0 && (
													<Tooltip title={`Restringido a ${discount.restrictions.targetSegments.length} segmento(s)`}>
														<Chip
															icon={<Category2 size={14} />}
															label={discount.restrictions.targetSegments.length}
															size="small"
															color="secondary"
															sx={{ "& .MuiChip-icon": { color: "inherit" } }}
														/>
													</Tooltip>
												)}
												{discount.restrictions.targetContacts && discount.restrictions.targetContacts.length > 0 && (
													<Tooltip title={`Restringido a ${discount.restrictions.targetContacts.length} contacto(s)`}>
														<Chip
															icon={<Profile size={14} />}
															label={discount.restrictions.targetContacts.length}
															size="small"
															color="info"
															sx={{ "& .MuiChip-icon": { color: "inherit" } }}
														/>
													</Tooltip>
												)}
												{(() => {
													// Warning: público + sin ningún target + sin filtros de tipo de cliente
													// = visible para todos los users activos (caso típico de error).
													const r = discount.restrictions || ({} as any);
													const hasTargets =
														(r.targetUsers?.length ?? 0) > 0 ||
														(r.targetSegments?.length ?? 0) > 0 ||
														(r.targetContacts?.length ?? 0) > 0;
													const hasRestriction = r.excludeActiveSubscribers || r.newCustomersOnly;
													const isOpen = discount.activationRules.isPublic && !hasTargets && !hasRestriction;
													if (!isOpen) return null;
													return (
														<Tooltip title="Sin audiencia restringida ni filtros — visible para todos los usuarios activos">
															<Chip
																icon={<Warning2 size={14} />}
																label="ABIERTA"
																size="small"
																color="error"
																variant="outlined"
																sx={{ "& .MuiChip-icon": { color: "inherit" } }}
															/>
														</Tooltip>
													);
												})()}
											</Stack>
										</TableCell>
										<TableCell align="center">
											{(() => {
												const audience = eligibleCounts[discount._id];
												if (audience) {
													return (
														<Tooltip
															title={
																audience.isPublic
																	? "Promoción pública: visible para todos los usuarios activos (descontando restricciones)"
																	: "Promoción targeted: solo para usuarios y segmentos asignados"
															}
														>
															<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
																<People size={14} color={theme.palette.primary.main} />
																<Typography variant="body2" fontWeight={600}>
																	{audience.eligibleCount.toLocaleString()}
																</Typography>
															</Stack>
														</Tooltip>
													);
												}
												if (loadingCounts) {
													return <Skeleton variant="text" width={50} sx={{ mx: "auto" }} />;
												}
												return (
													<Typography variant="caption" color="textSecondary">
														—
													</Typography>
												);
											})()}
										</TableCell>
										<TableCell align="center">
											<Typography variant="body2">
												{discount.stats.timesRedeemed}
												{discount.restrictions.maxRedemptions && (
													<Typography variant="caption" color="textSecondary">
														{" "}
														/ {discount.restrictions.maxRedemptions}
													</Typography>
												)}
											</Typography>
										</TableCell>
										<TableCell align="center">{getStatusChip(discount)}</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Ver detalles">
													<IconButton size="small" color="primary" onClick={() => handleView(discount)}>
														<Eye size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Editar">
													<IconButton size="small" color="secondary" onClick={() => handleEdit(discount)}>
														<Edit size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title={discount.isActive ? "Desactivar" : "Activar"}>
													<IconButton
														size="small"
														color={discount.isActive ? "warning" : "success"}
														onClick={() => handleToggle(discount)}
														disabled={toggleLoading === discount._id}
													>
														{toggleLoading === discount._id ? (
															<CircularProgress size={18} />
														) : discount.isActive ? (
															<CloseCircle size={18} />
														) : (
															<TickCircle size={18} />
														)}
													</IconButton>
												</Tooltip>
												<Tooltip title="Eliminar">
													<IconButton size="small" color="error" onClick={() => handleDelete(discount)}>
														<Trash size={18} />
													</IconButton>
												</Tooltip>
											</Stack>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</MainCard>

			{/* Form Modal */}
			<PromotionFormModal open={formOpen} onClose={handleFormClose} onSuccess={handleFormSuccess} discount={selectedDiscount} />

			{/* Detail Modal */}
			<PromotionDetailModal open={detailModalOpen} onClose={handleDetailClose} discount={selectedDiscount} />

			{/* Delete Dialog */}
			<DeletePromotionDialog
				open={deleteDialogOpen}
				onClose={handleDeleteClose}
				onConfirm={handleConfirmDelete}
				discount={selectedDiscount}
				loading={deleteLoading}
			/>
		</>
	);
};

export default PromotionsManagement;
