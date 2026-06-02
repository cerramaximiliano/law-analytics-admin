import { useState, useEffect, useCallback } from "react";
import {
	Box,
	Grid,
	Card,
	CardContent,
	Typography,
	Chip,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Stack,
	CircularProgress,
	Button,
	TextField,
	MenuItem,
	Pagination,
	Tooltip,
	Divider,
} from "@mui/material";
import { Refresh, Warning2, Card as CardIcon, RefreshCircle, CloseCircle, Profile2User } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import PaymentAttemptsService, {
	PaymentAttempt,
	PaymentAttemptSource,
	PaymentAttemptsSummary,
	PaymentAttemptMode,
} from "api/paymentAttempts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

const LIMIT = 50;

// Metadata visual por origen del intento fallido
const SOURCE_META: Record<PaymentAttemptSource, { label: string; color: "warning" | "info" | "error" }> = {
	initial_checkout: { label: "Checkout inicial", color: "warning" },
	renewal: { label: "Renovación", color: "info" },
	backend_session_error: { label: "Error pre-Stripe", color: "error" },
};

const sourceLabel = (source: PaymentAttemptSource) => SOURCE_META[source]?.label || source;
const sourceColor = (source: PaymentAttemptSource) => SOURCE_META[source]?.color || "default";

// Motivos de rechazo del emisor/banco (Stripe decline_code) → etiqueta legible
const DECLINE_LABELS: Record<string, string> = {
	generic_decline: "Rechazo sin causa informada",
	do_not_honor: "Rechazo del banco (do not honor)",
	insufficient_funds: "Fondos insuficientes",
	lost_card: "Tarjeta reportada perdida",
	stolen_card: "Tarjeta reportada robada",
	expired_card: "Tarjeta vencida",
	incorrect_cvc: "CVC incorrecto",
	incorrect_number: "Número de tarjeta incorrecto",
	card_not_supported: "Tarjeta no soportada",
	currency_not_supported: "Moneda no soportada",
	transaction_not_allowed: "Transacción no permitida",
	try_again_later: "Reintentar más tarde",
	issuer_not_available: "Emisor no disponible",
	processing_error: "Error de procesamiento",
	authentication_required: "Requiere autenticación",
};

const declineLabel = (code: string) => DECLINE_LABELS[code] || code;

const formatAmount = (amount: number | null, currency: string | null) => {
	if (amount === null || amount === undefined) return "—";
	// Stripe expresa los montos en la unidad mínima (centavos)
	const value = amount / 100;
	return `${value.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ${(currency || "").toUpperCase()}`.trim();
};

const userEmail = (attempt: PaymentAttempt): string => {
	if (attempt.email) return attempt.email;
	if (attempt.user && typeof attempt.user === "object" && attempt.user.email) return attempt.user.email;
	return "—";
};

const PaymentFailures = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
	const [summary, setSummary] = useState<PaymentAttemptsSummary | null>(null);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	// Filtros
	const [sourceFilter, setSourceFilter] = useState<PaymentAttemptSource | "">("");
	const [modeFilter, setModeFilter] = useState<PaymentAttemptMode>("live");
	const [failureCodeFilter, setFailureCodeFilter] = useState("");

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const listParams: any = { page, limit: LIMIT, mode: modeFilter };
			if (sourceFilter) listParams.source = sourceFilter;
			if (failureCodeFilter.trim()) listParams.failureCode = failureCodeFilter.trim();

			const summaryParams: any = { mode: modeFilter };
			if (sourceFilter) summaryParams.source = sourceFilter;

			const [listRes, summaryRes] = await Promise.all([
				PaymentAttemptsService.getPaymentAttempts(listParams),
				PaymentAttemptsService.getSummary(summaryParams),
			]);

			setAttempts(listRes.data);
			setTotalPages(listRes.pagination.totalPages || 1);
			setTotal(listRes.pagination.total || 0);
			setSummary(summaryRes.summary);
		} catch (err: any) {
			const message = err.message || "Error al cargar los intentos de pago fallidos";
			setError(message);
			enqueueSnackbar(message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, modeFilter, sourceFilter, failureCodeFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const countBySource = (source: PaymentAttemptSource): number => summary?.bySource.find((s) => s.source === source)?.count ?? 0;

	const handlePageChange = (_e: React.ChangeEvent<unknown>, value: number) => {
		setPage(value);
	};

	return (
		<MainCard
			title="Intentos de Pago Fallidos"
			secondary={
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={() => fetchData()} disabled={loading}>
					Actualizar
				</Button>
			}
		>
			<Stack spacing={3}>
				{/* Estadísticas generales */}
				<Grid container spacing={3}>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "error.lighter", border: 1, borderColor: "error.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Warning2 size={18} variant="Bold" />
										<Typography variant="caption" color="text.secondary">
											Total Fallos
										</Typography>
									</Stack>
									<Typography variant="h3" color="error.main">
										{summary?.total ?? 0}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{summary?.uniqueUsers ?? 0} usuarios únicos
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "warning.lighter", border: 1, borderColor: "warning.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<CardIcon size={18} variant="Bold" />
										<Typography variant="caption" color="text.secondary">
											Checkout Inicial
										</Typography>
									</Stack>
									<Typography variant="h3" color="warning.main">
										{countBySource("initial_checkout")}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Primer pago de una sub nueva
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "info.lighter", border: 1, borderColor: "info.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<RefreshCircle size={18} variant="Bold" />
										<Typography variant="caption" color="text.secondary">
											Renovaciones
										</Typography>
									</Stack>
									<Typography variant="h3" color="info.main">
										{countBySource("renewal")}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Cobros recurrentes
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "secondary.lighter", border: 1, borderColor: "secondary.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<CloseCircle size={18} variant="Bold" />
										<Typography variant="caption" color="text.secondary">
											Error pre-Stripe
										</Typography>
									</Stack>
									<Typography variant="h3" color="secondary.main">
										{countBySource("backend_session_error")}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Sesión no creada (front)
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Filtros */}
				<Card variant="outlined">
					<CardContent>
						<Grid container spacing={2} alignItems="center">
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									select
									fullWidth
									label="Origen"
									value={sourceFilter}
									onChange={(e) => {
										setSourceFilter(e.target.value as PaymentAttemptSource | "");
										setPage(1);
									}}
									size="small"
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="initial_checkout">Checkout inicial</MenuItem>
									<MenuItem value="renewal">Renovación</MenuItem>
									<MenuItem value="backend_session_error">Error pre-Stripe</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									select
									fullWidth
									label="Modo"
									value={modeFilter}
									onChange={(e) => {
										setModeFilter(e.target.value as PaymentAttemptMode);
										setPage(1);
									}}
									size="small"
								>
									<MenuItem value="live">🟢 LIVE (Producción)</MenuItem>
									<MenuItem value="test">🟡 TEST (Pruebas)</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Código de error / decline"
									placeholder="ej. card_declined, do_not_honor"
									value={failureCodeFilter}
									onChange={(e) => setFailureCodeFilter(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											setPage(1);
											fetchData();
										}
									}}
									size="small"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Typography variant="body2" color="text.secondary">
									Mostrando {attempts.length} de {total} intentos
								</Typography>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{error && <Alert severity="error">{error}</Alert>}

				{/* Tabla de intentos fallidos */}
				{loading ? (
					<Box display="flex" justifyContent="center" py={6}>
						<CircularProgress />
					</Box>
				) : attempts.length === 0 ? (
					<Alert severity="info">No se registraron intentos de pago fallidos con los filtros seleccionados.</Alert>
				) : (
					<>
						<TableContainer component={Paper}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Usuario</TableCell>
										<TableCell>Plan</TableCell>
										<TableCell>Origen</TableCell>
										<TableCell>Código</TableCell>
										<TableCell>Decline (banco)</TableCell>
										<TableCell>Motivo</TableCell>
										<TableCell align="right">Monto</TableCell>
										<TableCell align="center">Email</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{attempts.map((a) => (
										<TableRow key={a._id} hover>
											<TableCell>
												<Tooltip title={dayjs(a.createdAt).format("DD/MM/YYYY HH:mm")}>
													<span>{dayjs(a.createdAt).fromNow()}</span>
												</Tooltip>
											</TableCell>
											<TableCell>{userEmail(a)}</TableCell>
											<TableCell>{a.planId || "—"}</TableCell>
											<TableCell>
												<Chip size="small" label={sourceLabel(a.source)} color={sourceColor(a.source)} variant="outlined" />
											</TableCell>
											<TableCell>{a.failureCode ? <Chip size="small" label={a.failureCode} variant="outlined" /> : "—"}</TableCell>
											<TableCell>
												{a.declineCode ? (
													<Tooltip title={`${declineLabel(a.declineCode)}${a.sellerMessage ? ` — ${a.sellerMessage}` : ""}`}>
														<Chip size="small" label={a.declineCode} color="error" variant="outlined" />
													</Tooltip>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell sx={{ maxWidth: 240 }}>
												<Tooltip title={a.failureReason || ""}>
													<Typography variant="body2" noWrap>
														{a.failureReason || "—"}
													</Typography>
												</Tooltip>
											</TableCell>
											<TableCell align="right">{formatAmount(a.amount, a.currency)}</TableCell>
											<TableCell align="center">
												{a.emailNotification?.sent ? (
													<Tooltip
														title={`Enviado ${
															a.emailNotification.sentAt ? dayjs(a.emailNotification.sentAt).format("DD/MM/YYYY HH:mm") : ""
														}`}
													>
														<Chip size="small" label="Sí" color="success" variant="outlined" />
													</Tooltip>
												) : (
													<Chip size="small" label="No" variant="outlined" />
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>

						{totalPages > 1 && (
							<Box display="flex" justifyContent="center" mt={2}>
								<Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
							</Box>
						)}
					</>
				)}

				{/* Rechazos del banco/emisora por motivo */}
				{summary && summary.byDeclineCode.length > 0 && (
					<Card variant="outlined">
						<CardContent>
							<Stack direction="row" spacing={1} alignItems="center" mb={2}>
								<CloseCircle size={18} variant="Bold" />
								<Typography variant="h5">Rechazos del banco por motivo</Typography>
							</Stack>
							<Divider sx={{ mb: 2 }} />
							<Grid container spacing={1}>
								{summary.byDeclineCode.map((d) => (
									<Grid item xs={12} sm={6} md={4} key={d.declineCode}>
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Tooltip title={d.declineCode}>
												<Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
													{declineLabel(d.declineCode)}
												</Typography>
											</Tooltip>
											<Chip size="small" label={d.count} color="error" variant="outlined" />
										</Stack>
									</Grid>
								))}
							</Grid>
						</CardContent>
					</Card>
				)}

				{/* Top usuarios con más fallos */}
				{summary && summary.topUsers.length > 0 && (
					<Card variant="outlined">
						<CardContent>
							<Stack direction="row" spacing={1} alignItems="center" mb={2}>
								<Profile2User size={18} variant="Bold" />
								<Typography variant="h5">Usuarios con más fallos</Typography>
							</Stack>
							<Divider sx={{ mb: 2 }} />
							<Stack spacing={1}>
								{summary.topUsers.map((u) => (
									<Stack key={u.userId} direction="row" justifyContent="space-between" alignItems="center">
										<Box>
											<Typography variant="body2">{u.email || u.userId}</Typography>
											<Typography variant="caption" color="text.secondary">
												Último: {dayjs(u.lastFailedAt).format("DD/MM/YYYY HH:mm")}
												{u.lastFailureReason ? ` — ${u.lastFailureReason}` : ""}
											</Typography>
										</Box>
										<Chip size="small" label={`${u.count} fallos`} color="error" variant="outlined" />
									</Stack>
								))}
							</Stack>
						</CardContent>
					</Card>
				)}
			</Stack>
		</MainCard>
	);
};

export default PaymentFailures;
