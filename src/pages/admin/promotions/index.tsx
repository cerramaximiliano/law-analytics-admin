import { useEffect, useState } from "react";
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
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add, Edit, Trash, Eye, Refresh2, TickCircle, CloseCircle, Chart } from "iconsax-react";
import MainCard from "components/MainCard";
import { useSnackbar } from "notistack";
import discountsService, { DiscountCode, GetDiscountsParams } from "api/discounts";
import PromotionFormModal from "./PromotionFormModal";
import PromotionDetailModal from "./PromotionDetailModal";
import DeletePromotionDialog from "./DeletePromotionDialog";

const PromotionsManagement = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
	const [loading, setLoading] = useState(true);
	const [formOpen, setFormOpen] = useState(false);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDiscount, setSelectedDiscount] = useState<DiscountCode | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [toggleLoading, setToggleLoading] = useState<string | null>(null);

	const fetchDiscounts = async (params: GetDiscountsParams = {}) => {
		try {
			setLoading(true);
			const response = await discountsService.getDiscounts(params);
			setDiscounts(response.data || []);
		} catch (error: any) {
			console.error("Error al cargar promociones:", error);
			enqueueSnackbar(error?.message || "Error al cargar las promociones", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDiscounts();
	}, []);

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
		fetchDiscounts();
		handleFormClose();
	};

	const handleConfirmDelete = async () => {
		if (!selectedDiscount) return;

		try {
			setDeleteLoading(true);
			await discountsService.deleteDiscount(selectedDiscount._id);
			enqueueSnackbar("Promoción eliminada correctamente", { variant: "success" });
			fetchDiscounts();
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
			fetchDiscounts();
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
				title="Gestión de Promociones"
				secondary={
					<Stack direction="row" spacing={2}>
						<Button variant="outlined" color="secondary" startIcon={<Refresh2 />} onClick={() => fetchDiscounts()}>
							Actualizar
						</Button>
						<Button variant="contained" color="primary" startIcon={<Add />} onClick={handleAddNew}>
							Nueva Promoción
						</Button>
					</Stack>
				}
			>
				<Alert severity="info" sx={{ mb: 3 }}>
					<Typography variant="body2">
						Las promociones se sincronizan automáticamente con Stripe al crearlas. Los códigos públicos aparecerán automáticamente en
						la página de planes y se aplicarán en el checkout.
					</Typography>
				</Alert>

				{/* Summary Cards */}
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: 3 }}>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="h3" color="primary">
										{discounts.length}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Total de Promociones
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="h3" color="success.main">
										{activeCount}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Activas Ahora
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="h3" color="warning.main">
										{scheduledCount}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Programadas
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="h3" color="info.main">
										{totalRedemptions}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Usos Totales
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Promotions Table */}
				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Código</TableCell>
								<TableCell>Nombre</TableCell>
								<TableCell align="center">Descuento</TableCell>
								<TableCell align="center">Vigencia</TableCell>
								<TableCell align="center">Público</TableCell>
								<TableCell align="center">Usos</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{discounts.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} align="center">
										<Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
											No hay promociones configuradas. Crea una nueva promoción para comenzar.
										</Typography>
									</TableCell>
								</TableRow>
							) : (
								discounts.map((discount) => (
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
											<Typography variant="subtitle2" color="primary" fontWeight={600}>
												{getDiscountText(discount)}
											</Typography>
											<Typography variant="caption" color="textSecondary">
												{discount.duration === "once"
													? "Una vez"
													: discount.duration === "forever"
														? "Siempre"
														: `${discount.durationInMonths} meses`}
											</Typography>
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
											{discount.activationRules.isPublic ? (
												<Chip label="Público" size="small" color="info" />
											) : (
												<Chip label="Privado" size="small" variant="outlined" />
											)}
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
