import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	Divider,
	Box,
	Chip,
	IconButton,
	Alert,
	Skeleton,
	LinearProgress,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	useTheme,
	alpha,
	FormControlLabel,
	Checkbox,
	TextField,
	Stack,
	Tabs,
	Tab,
} from "@mui/material";
import { CloseCircle, Chart, Sms, TickCircle, CloseCircle as CloseIcon, Warning2, Mouse, UserRemove, Code1 } from "iconsax-react";
import { CampaignService } from "store/reducers/campaign";
import { Campaign, CampaignSendStatsSummary, EmailBreakdown, DailyBreakdown } from "types/campaign";

interface CampaignSendStatsModalProps {
	open: boolean;
	onClose: () => void;
	campaign: Campaign | null;
}

interface StatsData {
	summary: CampaignSendStatsSummary;
	emailBreakdown: EmailBreakdown[];
	dailyBreakdown: DailyBreakdown[];
}

const CampaignSendStatsModal: React.FC<CampaignSendStatsModalProps> = ({ open, onClose, campaign }) => {
	const theme = useTheme();
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [stats, setStats] = useState<StatsData | null>(null);
	const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
	const [refreshInterval, setRefreshInterval] = useState<number>(1);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
	const [activeTab, setActiveTab] = useState<number>(0);

	useEffect(() => {
		if (open && campaign?._id) {
			fetchStats(campaign._id);
		}
	}, [open, campaign]);

	// Auto-refresh effect
	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;

		if (open && autoRefresh && campaign?._id && refreshInterval > 0) {
			intervalId = setInterval(() => {
				fetchStats(campaign._id!);
			}, refreshInterval * 60 * 1000); // Convertir minutos a milisegundos
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [open, autoRefresh, refreshInterval, campaign]);

	const fetchStats = async (campaignId: string) => {
		try {
			setLoading(true);
			setError(null);

			const response = await CampaignService.getCampaignSendStats(campaignId);

			if (response.success) {
				setStats(response.data);
				setLastRefresh(new Date());
			} else {
				setError("No se pudieron obtener las estadísticas");
			}
		} catch (err: any) {
			if (err.response?.status === 404) {
				// No hay logs aún
				setStats({
					summary: {
						total: 0,
						sent: 0,
						delivered: 0,
						bounced: 0,
						complained: 0,
						failed: 0,
						queued: 0,
						unsubscribed: 0,
						totalOpens: 0,
						totalClicks: 0,
						uniqueOpens: 0,
						uniqueClicks: 0,
						deliveryRate: 0,
						bounceRate: 0,
						openRate: 0,
						clickRate: 0,
						unsubscribeRate: 0,
					},
					emailBreakdown: [],
					dailyBreakdown: [],
				});
				setLastRefresh(new Date());
			} else {
				setError(err?.response?.data?.error || err?.message || "Error al cargar estadísticas");
			}
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "short",
		});
	};

	const getStatusLabel = (status: string) => {
		const labels: Record<string, string> = {
			queued: "En cola",
			sent: "Enviado",
			delivered: "Entregado",
			bounced: "Rebotado",
			complained: "Queja",
			failed: "Fallido",
			unsubscribed: "Desuscrito",
		};
		return labels[status] || status;
	};

	const getStatusColor = (status: string) => {
		const colors: Record<string, "default" | "primary" | "success" | "warning" | "error" | "info"> = {
			queued: "default",
			sent: "primary",
			delivered: "success",
			bounced: "error",
			complained: "warning",
			failed: "error",
			unsubscribed: "warning",
		};
		return colors[status] || "default";
	};

	// Stat Card component
	const StatCard = ({
		title,
		value,
		subtitle,
		icon,
		color,
	}: {
		title: string;
		value: string | number;
		subtitle?: string;
		icon: React.ReactNode;
		color: string;
	}) => (
		<Box
			sx={{
				p: 2,
				borderRadius: 2,
				bgcolor: alpha(color, 0.1),
				border: `1px solid ${alpha(color, 0.2)}`,
				height: "100%",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
				<Box sx={{ color, mr: 1 }}>{icon}</Box>
				<Typography variant="body2" color="textSecondary">
					{title}
				</Typography>
			</Box>
			<Typography variant="h4" sx={{ color }}>
				{value}
			</Typography>
			{subtitle && (
				<Typography variant="caption" color="textSecondary">
					{subtitle}
				</Typography>
			)}
		</Box>
	);

	// Rate Progress component
	const RateProgress = ({ label, value, color }: { label: string; value: number; color: string }) => (
		<Box sx={{ mb: 2 }}>
			<Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
				<Typography variant="body2">{label}</Typography>
				<Typography variant="body2" fontWeight="bold">
					{value.toFixed(1)}%
				</Typography>
			</Box>
			<LinearProgress
				variant="determinate"
				value={Math.min(value, 100)}
				sx={{
					height: 8,
					borderRadius: 4,
					bgcolor: alpha(color, 0.2),
					"& .MuiLinearProgress-bar": {
						bgcolor: color,
						borderRadius: 4,
					},
				}}
			/>
		</Box>
	);

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="lg"
			fullWidth
			sx={{
				"& .MuiDialog-paper": {
					borderRadius: 2,
					height: "85vh",
					maxHeight: "85vh",
				},
			}}
		>
			<DialogTitle>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Chart size={24} variant="Bold" color={theme.palette.primary.main} />
							<Typography variant="h5">Estadísticas de Envío</Typography>
						</Box>
						{campaign && (
							<Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
								{campaign.name}
							</Typography>
						)}
					</Grid>
					<Grid item>
						<IconButton onClick={onClose} size="small">
							<CloseCircle variant="Bold" />
						</IconButton>
					</Grid>
				</Grid>
			</DialogTitle>

			<DialogContent dividers sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
				<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
					<Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
						<Tab icon={<Chart size={18} />} iconPosition="start" label="Estadísticas" />
						<Tab icon={<Code1 size={18} />} iconPosition="start" label="JSON Raw" />
					</Tabs>
				</Box>

				{activeTab === 0 && (
					<>
						{loading ? (
							<Grid container spacing={3}>
								{/* Skeleton for stats cards */}
								<Grid item xs={12}>
									<Grid container spacing={2}>
										{[1, 2, 3, 4].map((item) => (
											<Grid item xs={6} md={3} key={item}>
												<Skeleton variant="rounded" height={100} />
											</Grid>
										))}
									</Grid>
								</Grid>
								{/* Skeleton for rates */}
								<Grid item xs={12} md={6}>
									<Skeleton variant="rounded" height={200} />
								</Grid>
								<Grid item xs={12} md={6}>
									<Skeleton variant="rounded" height={200} />
								</Grid>
							</Grid>
						) : error ? (
							<Alert severity="error" sx={{ my: 2 }}>
								{error}
							</Alert>
						) : stats ? (
					<Grid container spacing={3}>
						{/* Summary Stats */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Resumen de Envíos
							</Typography>
							<Divider sx={{ mb: 2 }} />

							<Grid container spacing={2}>
								<Grid item xs={6} sm={2.4}>
									<StatCard
										title="Total Enviados"
										value={stats.summary.total}
										icon={<Sms size={20} />}
										color={theme.palette.primary.main}
									/>
								</Grid>
								<Grid item xs={6} sm={2.4}>
									<StatCard
										title="Entregados"
										value={stats.summary.delivered}
										subtitle={`${stats.summary.deliveryRate}% tasa de entrega`}
										icon={<TickCircle size={20} />}
										color={theme.palette.success.main}
									/>
								</Grid>
								<Grid item xs={6} sm={2.4}>
									<StatCard
										title="Rebotados"
										value={stats.summary.bounced}
										subtitle={`${stats.summary.bounceRate}% tasa de rebote`}
										icon={<CloseIcon size={20} />}
										color={theme.palette.error.main}
									/>
								</Grid>
								<Grid item xs={6} sm={2.4}>
									<StatCard
										title="Quejas"
										value={stats.summary.complained}
										icon={<Warning2 size={20} />}
										color={theme.palette.warning.main}
									/>
								</Grid>
								<Grid item xs={6} sm={2.4}>
									<StatCard
										title="Desuscripciones"
										value={stats.summary.unsubscribed}
										subtitle={`${stats.summary.unsubscribeRate}% tasa`}
										icon={<UserRemove size={20} />}
										color={theme.palette.warning.dark}
									/>
								</Grid>
							</Grid>
						</Grid>

						{/* Engagement Stats */}
						<Grid item xs={12} md={6}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Engagement
							</Typography>
							<Divider sx={{ mb: 2 }} />

							<Grid container spacing={2} sx={{ mb: 2 }}>
								<Grid item xs={6}>
									<StatCard
										title="Aperturas Únicas"
										value={stats.summary.uniqueOpens}
										subtitle={`${stats.summary.totalOpens} totales`}
										icon={<Sms size={20} variant="Bold" />}
										color={theme.palette.info.main}
									/>
								</Grid>
								<Grid item xs={6}>
									<StatCard
										title="Clics Únicos"
										value={stats.summary.uniqueClicks}
										subtitle={`${stats.summary.totalClicks} totales`}
										icon={<Mouse size={20} />}
										color={theme.palette.secondary.main}
									/>
								</Grid>
							</Grid>
						</Grid>

						{/* Rates */}
						<Grid item xs={12} md={6}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Tasas de Rendimiento
							</Typography>
							<Divider sx={{ mb: 2 }} />

							<Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 2 }}>
								<RateProgress label="Tasa de Entrega" value={stats.summary.deliveryRate} color={theme.palette.success.main} />
								<RateProgress label="Tasa de Apertura" value={stats.summary.openRate} color={theme.palette.info.main} />
								<RateProgress label="Tasa de Clics" value={stats.summary.clickRate} color={theme.palette.secondary.main} />
								<RateProgress label="Tasa de Rebote" value={stats.summary.bounceRate} color={theme.palette.error.main} />
								<RateProgress label="Tasa de Desuscripción" value={stats.summary.unsubscribeRate} color={theme.palette.warning.dark} />
							</Box>
						</Grid>

						{/* Email Breakdown */}
						{stats.emailBreakdown.length > 0 && (
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Desglose por Email
								</Typography>
								<Divider sx={{ mb: 2 }} />

								<TableContainer component={Paper} variant="outlined">
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>#</TableCell>
												<TableCell>Email</TableCell>
												<TableCell align="right">Enviados</TableCell>
												<TableCell align="right">Entregados</TableCell>
												<TableCell align="right">Rebotados</TableCell>
												<TableCell align="right">Desuscrip.</TableCell>
												<TableCell align="right">Aperturas</TableCell>
												<TableCell align="right">Clics</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{stats.emailBreakdown.map((email, index) => (
												<TableRow key={email._id} hover>
													<TableCell>{email.sequenceIndex !== undefined ? email.sequenceIndex + 1 : index + 1}</TableCell>
													<TableCell>
														<Typography variant="body2" fontWeight="medium">
															{email.name || "Sin nombre"}
														</Typography>
														{email.subject && (
															<Typography variant="caption" color="textSecondary">
																{email.subject.length > 40 ? `${email.subject.substring(0, 40)}...` : email.subject}
															</Typography>
														)}
													</TableCell>
													<TableCell align="right">{email.count}</TableCell>
													<TableCell align="right">
														<Chip label={email.delivered} size="small" color="success" variant="outlined" />
													</TableCell>
													<TableCell align="right">
														{email.bounced > 0 ? (
															<Chip label={email.bounced} size="small" color="error" variant="outlined" />
														) : (
															0
														)}
													</TableCell>
													<TableCell align="right">
														{email.unsubscribed > 0 ? (
															<Chip label={email.unsubscribed} size="small" color="warning" variant="outlined" />
														) : (
															0
														)}
													</TableCell>
													<TableCell align="right">{email.opens}</TableCell>
													<TableCell align="right">{email.clicks}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</Grid>
						)}

						{/* Daily Breakdown */}
						{stats.dailyBreakdown.length > 0 && (
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Actividad Diaria (Últimos 30 días)
								</Typography>
								<Divider sx={{ mb: 2 }} />

								<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow>
												<TableCell>Fecha</TableCell>
												<TableCell align="right">Enviados</TableCell>
												<TableCell align="right">Entregados</TableCell>
												<TableCell align="right">Rebotados</TableCell>
												<TableCell align="right">Desuscrip.</TableCell>
												<TableCell align="right">Aperturas</TableCell>
												<TableCell align="right">Clics</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{stats.dailyBreakdown.map((day) => (
												<TableRow key={day._id} hover>
													<TableCell>{formatDate(day._id)}</TableCell>
													<TableCell align="right">{day.sent}</TableCell>
													<TableCell align="right">{day.delivered}</TableCell>
													<TableCell align="right">{day.bounced}</TableCell>
													<TableCell align="right">{day.unsubscribed}</TableCell>
													<TableCell align="right">{day.opens}</TableCell>
													<TableCell align="right">{day.clicks}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</Grid>
						)}

							{/* No data message */}
							{stats.summary.total === 0 && (
								<Grid item xs={12}>
									<Alert severity="info">
										No hay datos de envío disponibles para esta campaña. Los datos aparecerán una vez que se envíen emails.
									</Alert>
								</Grid>
							)}
						</Grid>
						) : (
							<Typography variant="body1" color="textSecondary" align="center" sx={{ py: 3 }}>
								No se ha seleccionado ninguna campaña
							</Typography>
						)}
					</>
				)}

				{activeTab === 1 && (
					<Box sx={{ flex: 1, overflow: "auto" }}>
						{loading ? (
							<Skeleton variant="rounded" height={400} />
						) : error ? (
							<Alert severity="error" sx={{ my: 2 }}>
								{error}
							</Alert>
						) : stats ? (
							<Box
								component="pre"
								sx={{
									p: 2,
									borderRadius: 1,
									bgcolor: alpha(theme.palette.grey[900], 0.05),
									border: `1px solid ${theme.palette.divider}`,
									overflow: "auto",
									fontSize: "0.85rem",
									fontFamily: "monospace",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									m: 0,
								}}
							>
								{JSON.stringify(stats, null, 2)}
							</Box>
						) : (
							<Typography variant="body1" color="textSecondary" align="center" sx={{ py: 3 }}>
								No se ha seleccionado ninguna campaña
							</Typography>
						)}
					</Box>
				)}
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
				<Stack direction="row" spacing={2} alignItems="center">
					<Button
						variant="outlined"
						size="small"
						onClick={() => campaign?._id && fetchStats(campaign._id)}
						disabled={loading}
						startIcon={<Chart size={16} />}
					>
						Actualizar
					</Button>
					<Divider orientation="vertical" flexItem />
					<FormControlLabel
						control={
							<Checkbox
								checked={autoRefresh}
								onChange={(e) => setAutoRefresh(e.target.checked)}
								size="small"
							/>
						}
						label="Auto-actualizar"
					/>
					{autoRefresh && (
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="body2">cada</Typography>
							<TextField
								type="number"
								size="small"
								value={refreshInterval}
								onChange={(e) => setRefreshInterval(Math.max(1, parseInt(e.target.value) || 1))}
								inputProps={{ min: 1, max: 60, style: { width: 50, textAlign: "center" } }}
								sx={{ width: 70 }}
							/>
							<Typography variant="body2">minuto(s)</Typography>
						</Stack>
					)}
					{lastRefresh && (
						<Typography variant="caption" color="textSecondary">
							Última actualización: {lastRefresh.toLocaleTimeString("es-AR")}
						</Typography>
					)}
				</Stack>
				<Button onClick={onClose} color="primary" variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CampaignSendStatsModal;
