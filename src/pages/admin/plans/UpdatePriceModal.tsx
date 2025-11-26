import { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Grid,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Typography,
	Box,
	IconButton,
	Alert,
	CircularProgress,
	Chip,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
} from "@mui/material";
import { CloseCircle, Refresh, DollarCircle } from "iconsax-react";
import { Plan } from "types/plan";
import authAxios from "utils/authAxios";
import { formatCurrency } from "utils/formatCurrency";

interface StripePriceInfo {
	id: string;
	active: boolean;
	currency: string;
	amount: number;
	billingPeriod: string;
	stripeInterval: string;
	created: string;
	isDefault: boolean;
	metadata?: {
		environment?: string;
	};
}

interface StripePricesData {
	planId: string;
	environment: string;
	stripeProductId: string;
	productName: string;
	defaultPriceId: string;
	prices: StripePriceInfo[];
}

interface StripePricesResponse {
	success: boolean;
	data: StripePricesData;
}

interface UpdatePriceResponse {
	success: boolean;
	message: string;
	data: {
		planId: string;
		environment: string;
		oldPrice: {
			id: string;
			amount: number;
			interval: string;
		};
		newPrice: {
			id: string;
			amount: number;
			interval: string;
		};
	};
}

interface UpdatePriceModalProps {
	open: boolean;
	onClose: () => void;
	plan: Plan | null;
	onSuccess: () => void;
}

const BILLING_PERIODS = [
	{ value: "daily", label: "Diario" },
	{ value: "weekly", label: "Semanal" },
	{ value: "monthly", label: "Mensual" },
	{ value: "annual", label: "Anual" },
];

const UpdatePriceModal = ({ open, onClose, plan, onSuccess }: UpdatePriceModalProps) => {
	const [environment, setEnvironment] = useState<"production" | "development">("production");
	const [price, setPrice] = useState<number>(0);
	const [billingPeriod, setBillingPeriod] = useState<string>("monthly");
	const [loading, setLoading] = useState(false);
	const [loadingPrices, setLoadingPrices] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [stripePrices, setStripePrices] = useState<StripePriceInfo[]>([]);

	// Cargar precios de Stripe al abrir el modal o cambiar entorno
	const fetchStripePrices = async () => {
		if (!plan) return;

		try {
			setLoadingPrices(true);
			setError(null);
			const response = await authAxios.get<StripePricesResponse>(
				`/api/plan-configs/${plan.planId}/stripe-prices?environment=${environment}`
			);

			if (response.data.success && response.data.data) {
				setStripePrices(response.data.data.prices || []);

				// Establecer precio actual como valor inicial
				const activePrice = response.data.data.prices?.find((p) => p.active);
				if (activePrice) {
					setPrice(activePrice.amount);
					setBillingPeriod(activePrice.billingPeriod || "monthly");
				}
			}
		} catch (err: any) {
			console.error("Error al cargar precios de Stripe:", err);
			setError(err?.response?.data?.error || "Error al cargar los precios de Stripe");
			setStripePrices([]);
		} finally {
			setLoadingPrices(false);
		}
	};

	useEffect(() => {
		if (open && plan) {
			fetchStripePrices();
			setSuccess(null);
			setError(null);
		}
	}, [open, plan, environment]);

	// Inicializar valores cuando se abre el modal
	useEffect(() => {
		if (plan && open) {
			// Detectar entorno actual
			const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
			setEnvironment(isLocalhost ? "development" : "production");

			// Establecer precio actual del plan
			setPrice(plan.pricingInfo?.basePrice || 0);
			setBillingPeriod(plan.pricingInfo?.billingPeriod || "monthly");
		}
	}, [plan, open]);

	const handleUpdatePrice = async () => {
		if (!plan) return;

		try {
			setLoading(true);
			setError(null);
			setSuccess(null);

			const response = await authAxios.post<UpdatePriceResponse>(`/api/plan-configs/${plan.planId}/update-price`, {
				environment,
				price,
				billingPeriod,
			});

			if (response.data.success) {
				setSuccess(response.data.message || "Precio actualizado correctamente");
				// Recargar precios de Stripe
				await fetchStripePrices();
				// Notificar al componente padre
				onSuccess();
			}
		} catch (err: any) {
			console.error("Error al actualizar precio:", err);
			setError(err?.response?.data?.error || "Error al actualizar el precio");
		} finally {
			setLoading(false);
		}
	};

	const formatInterval = (interval: string) => {
		const intervals: Record<string, string> = {
			day: "Diario",
			daily: "Diario",
			week: "Semanal",
			weekly: "Semanal",
			month: "Mensual",
			monthly: "Mensual",
			year: "Anual",
			annual: "Anual",
		};
		return intervals[interval] || interval;
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!plan) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1}>
						<DollarCircle size={24} />
						<Typography variant="h5">Actualizar Precio - {plan.displayName}</Typography>
					</Box>
					<IconButton onClick={onClose} size="small">
						<CloseCircle />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}
				{success && (
					<Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
						{success}
					</Alert>
				)}

				<Grid container spacing={3} sx={{ mt: 1 }}>
					{/* Selector de entorno */}
					<Grid item xs={12}>
						<FormControl fullWidth>
							<InputLabel>Entorno</InputLabel>
							<Select
								value={environment}
								onChange={(e) => setEnvironment(e.target.value as "production" | "development")}
								label="Entorno"
							>
								<MenuItem value="production">
									<Box display="flex" alignItems="center" gap={1}>
										Producción
										<Chip label="LIVE" size="small" color="success" />
									</Box>
								</MenuItem>
								<MenuItem value="development">
									<Box display="flex" alignItems="center" gap={1}>
										Desarrollo
										<Chip label="TEST" size="small" color="warning" />
									</Box>
								</MenuItem>
							</Select>
						</FormControl>
					</Grid>

					{/* Precios actuales en Stripe */}
					<Grid item xs={12}>
						<Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
							<Typography variant="h6">Precios en Stripe ({environment})</Typography>
							<IconButton size="small" onClick={fetchStripePrices} disabled={loadingPrices}>
								<Refresh size={18} />
							</IconButton>
						</Box>
						{loadingPrices ? (
							<Box display="flex" justifyContent="center" py={2}>
								<CircularProgress size={24} />
							</Box>
						) : stripePrices.length > 0 ? (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>ID</TableCell>
											<TableCell>Precio</TableCell>
											<TableCell>Período</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell>Creado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{stripePrices.map((stripePrice) => (
											<TableRow key={stripePrice.id} sx={{ bgcolor: stripePrice.active ? "success.lighter" : "inherit" }}>
												<TableCell>
													<Typography variant="caption" fontFamily="monospace">
														{stripePrice.id.substring(0, 20)}...
													</Typography>
												</TableCell>
												<TableCell>
													<Typography fontWeight={stripePrice.active ? 600 : 400}>
														{formatCurrency(stripePrice.amount, stripePrice.currency.toUpperCase())}
													</Typography>
												</TableCell>
												<TableCell>{formatInterval(stripePrice.billingPeriod)}</TableCell>
												<TableCell>
													<Chip
														label={stripePrice.active ? "Activo" : "Inactivo"}
														size="small"
														color={stripePrice.active ? "success" : "default"}
													/>
												</TableCell>
												<TableCell>
													<Typography variant="caption">{formatDate(stripePrice.created)}</Typography>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						) : (
							<Alert severity="info">No hay precios configurados en Stripe para este entorno.</Alert>
						)}
					</Grid>

					<Grid item xs={12}>
						<Divider />
					</Grid>

					{/* Formulario de nuevo precio */}
					<Grid item xs={12}>
						<Typography variant="h6" gutterBottom>
							Nuevo Precio
						</Typography>
						<Alert severity="warning" sx={{ mb: 2 }}>
							<Typography variant="body2">
								<strong>Nota:</strong> Al actualizar el precio, se creará un nuevo precio en Stripe y se desactivará el anterior. Las
								suscripciones existentes mantendrán su precio actual hasta que se renueven.
							</Typography>
						</Alert>
					</Grid>

					<Grid item xs={12} sm={6}>
						<TextField
							fullWidth
							type="number"
							label="Precio"
							value={price}
							onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
							InputProps={{
								startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
							}}
							helperText="Precio en la moneda configurada del plan"
						/>
					</Grid>

					<Grid item xs={12} sm={6}>
						<FormControl fullWidth>
							<InputLabel>Período de Facturación</InputLabel>
							<Select value={billingPeriod} onChange={(e) => setBillingPeriod(e.target.value)} label="Período de Facturación">
								{BILLING_PERIODS.map((period) => (
									<MenuItem key={period.value} value={period.value}>
										{period.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Grid>

					{/* Resumen */}
					<Grid item xs={12}>
						<Paper sx={{ p: 2, bgcolor: "primary.lighter" }}>
							<Typography variant="subtitle2" gutterBottom>
								Resumen del cambio:
							</Typography>
							<Typography variant="body2">
								<strong>Plan:</strong> {plan.displayName} ({plan.planId})
							</Typography>
							<Typography variant="body2">
								<strong>Entorno:</strong> {environment === "production" ? "Producción" : "Desarrollo"}
							</Typography>
							<Typography variant="body2">
								<strong>Nuevo precio:</strong> ${price} / {BILLING_PERIODS.find((p) => p.value === billingPeriod)?.label}
							</Typography>
						</Paper>
					</Grid>
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button onClick={handleUpdatePrice} variant="contained" color="primary" disabled={loading || price <= 0}>
					{loading ? <CircularProgress size={20} /> : "Actualizar Precio en Stripe"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default UpdatePriceModal;
