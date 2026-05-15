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
import { CloseCircle, Chart, Sms, TickCircle, CloseCircle as CloseIcon, Warning2, Mouse, UserRemove, Code1, Copy, People, LogoutCurve } from "iconsax-react";
import { CampaignService } from "store/reducers/campaign";
import {
	Campaign,
	CampaignSendStatsSummary,
	EmailBreakdown,
	DailyBreakdown,
	StepBreakdownItem,
	CampaignAudienceStats,
} from "types/campaign";
import { ArrowDown2, ArrowUp2 } from "iconsax-react";

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
	const [copied, setCopied] = useState<boolean>(false);
	const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
	const [audience, setAudience] = useState<CampaignAudienceStats | null>(null);
	const [audienceLoading, setAudienceLoading] = useState<boolean>(false);
	const [audienceError, setAudienceError] = useState<string | null>(null);

	const toggleDayExpansion = (dayId: string) => {
		setExpandedDays((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(dayId)) {
				newSet.delete(dayId);
			} else {
				newSet.add(dayId);
			}
			return newSet;
		});
	};

	const handleCopyJson = () => {
		if (stats) {
			navigator.clipboard.writeText(JSON.stringify(stats, null, 2));
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	useEffect(() => {
		if (open && campaign?._id) {
			fetchStats(campaign._id);
		}
	}, [open, campaign]);

	// Fetch audiencia on demand cuando se abre la tab "Audiencia"
	useEffect(() => {
		if (open && activeTab === 1 && campaign?._id && !audience && !audienceLoading) {
			fetchAudience(campaign._id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, activeTab, campaign]);

	const fetchAudience = async (campaignId: string) => {
		try {
			setAudienceLoading(true);
			setAudienceError(null);
			const response = await CampaignService.getCampaignAudienceStats(campaignId);
			if (response.success) {
				setAudience(response.data);
			} else {
				setAudienceError("No se pudieron obtener las estadísticas de audiencia");
			}
		} catch (err: any) {
			setAudienceError(err?.response?.data?.error || err?.message || "Error al cargar estadísticas de audiencia");
		} finally {
			setAudienceLoading(false);
		}
	};

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
			timeZone: "UTC",
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
						<Tab icon={<People size={18} />} iconPosition="start" label="Audiencia" />
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
																{email.bounced > 0 ? <Chip label={email.bounced} size="small" color="error" variant="outlined" /> : 0}
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

										<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
											<Table size="small" stickyHeader>
												<TableHead>
													<TableRow>
														<TableCell width={40}></TableCell>
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
														<React.Fragment key={day._id}>
															<TableRow
																hover
																onClick={() => day.stepBreakdown && day.stepBreakdown.length > 0 && toggleDayExpansion(day._id)}
																sx={{
																	cursor: day.stepBreakdown && day.stepBreakdown.length > 0 ? "pointer" : "default",
																	"&:hover":
																		day.stepBreakdown && day.stepBreakdown.length > 0
																			? { bgcolor: alpha(theme.palette.primary.main, 0.08) }
																			: {},
																}}
															>
																<TableCell>
																	{day.stepBreakdown && day.stepBreakdown.length > 0 && (
																		<IconButton size="small" sx={{ p: 0.5 }}>
																			{expandedDays.has(day._id) ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
																		</IconButton>
																	)}
																</TableCell>
																<TableCell>{formatDate(day._id)}</TableCell>
																<TableCell align="right">{day.sent}</TableCell>
																<TableCell align="right">{day.delivered}</TableCell>
																<TableCell align="right">{day.bounced}</TableCell>
																<TableCell align="right">{day.unsubscribed}</TableCell>
																<TableCell align="right">{day.opens}</TableCell>
																<TableCell align="right">{day.clicks}</TableCell>
															</TableRow>
															{/* Step Breakdown expandible */}
															{expandedDays.has(day._id) && day.stepBreakdown && day.stepBreakdown.length > 0 && (
																<TableRow>
																	<TableCell colSpan={8} sx={{ py: 0, bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
																		<Box sx={{ py: 1.5, px: 2, pl: 6 }}>
																			<Table size="small" sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
																				<TableHead>
																					<TableRow>
																						<TableCell sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Step</TableCell>
																						<TableCell sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>Nombre</TableCell>
																						<TableCell align="right" sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>
																							Enviados
																						</TableCell>
																						<TableCell align="right" sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>
																							Entregados
																						</TableCell>
																						<TableCell align="right" sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>
																							Rebotados
																						</TableCell>
																						<TableCell align="right" sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>
																							% del día
																						</TableCell>
																					</TableRow>
																				</TableHead>
																				<TableBody>
																					{day.stepBreakdown.map((stepItem) => (
																						<TableRow key={stepItem.step} sx={{ "&:last-child td": { borderBottom: 0 } }}>
																							<TableCell sx={{ py: 0.5 }}>
																								<Chip
																									label={stepItem.step}
																									size="small"
																									color="primary"
																									variant="outlined"
																									sx={{ minWidth: 32, "& .MuiChip-label": { px: 1 } }}
																								/>
																							</TableCell>
																							<TableCell sx={{ py: 0.5, fontSize: "0.8rem" }}>{stepItem.name}</TableCell>
																							<TableCell align="right" sx={{ py: 0.5, fontSize: "0.8rem" }}>
																								{stepItem.sent}
																							</TableCell>
																							<TableCell align="right" sx={{ py: 0.5 }}>
																								<Typography variant="caption" color="success.main" fontWeight="medium">
																									{stepItem.delivered}
																								</Typography>
																							</TableCell>
																							<TableCell align="right" sx={{ py: 0.5 }}>
																								{stepItem.bounced > 0 ? (
																									<Typography variant="caption" color="error.main" fontWeight="medium">
																										{stepItem.bounced}
																									</Typography>
																								) : (
																									<Typography variant="caption" color="textSecondary">
																										0
																									</Typography>
																								)}
																							</TableCell>
																							<TableCell align="right" sx={{ py: 0.5 }}>
																								<Typography variant="caption" color="textSecondary">
																									{((stepItem.sent / day.sent) * 100).toFixed(1)}%
																								</Typography>
																							</TableCell>
																						</TableRow>
																					))}
																				</TableBody>
																			</Table>
																		</Box>
																	</TableCell>
																</TableRow>
															)}
														</React.Fragment>
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
					<AudienceTab
						loading={audienceLoading}
						error={audienceError}
						data={audience}
						onRefresh={() => campaign?._id && fetchAudience(campaign._id)}
					/>
				)}

				{activeTab === 2 && (
					<Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
						{loading ? (
							<Skeleton variant="rounded" height={400} />
						) : error ? (
							<Alert severity="error" sx={{ my: 2 }}>
								{error}
							</Alert>
						) : stats ? (
							<>
								<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
									<Button
										variant="outlined"
										size="small"
										startIcon={<Copy size={16} />}
										onClick={handleCopyJson}
										color={copied ? "success" : "primary"}
									>
										{copied ? "Copiado" : "Copiar JSON"}
									</Button>
								</Box>
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
										flex: 1,
									}}
								>
									{JSON.stringify(stats, null, 2)}
								</Box>
							</>
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
						control={<Checkbox checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} size="small" />}
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

// =========================================================================
// AudienceTab — estado de la audiencia (no de los envíos)
// =========================================================================
interface AudienceTabProps {
	loading: boolean;
	error: string | null;
	data: CampaignAudienceStats | null;
	onRefresh: () => void;
}

const REASON_LABELS: Record<string, string> = {
	finished: "Completó la secuencia",
	unsubscribed: "Se desuscribió",
	bounced: "Rebotó",
	complained: "Se quejó",
	manual: "Removido manualmente",
	segment_sync: "Expulsado por segmento",
	bounce: "Rebote",
	complaint: "Queja",
	unsubscribe: "Desuscripción",
	campaign_endDate_reached: "Campaña expiró",
};

const reasonLabel = (r: string | null): string => (r ? REASON_LABELS[r] || r : "(sin razón registrada)");

const AudienceTab: React.FC<AudienceTabProps> = ({ loading, error, data, onRefresh }) => {
	const theme = useTheme();
	const fmt = (n: number) => n.toLocaleString("es-AR");

	if (loading) {
		return (
			<Grid container spacing={2} sx={{ mt: 0 }}>
				{[1, 2, 3, 4].map((i) => (
					<Grid item xs={6} md={3} key={i}>
						<Skeleton variant="rounded" height={100} />
					</Grid>
				))}
				<Grid item xs={12}>
					<Skeleton variant="rounded" height={300} />
				</Grid>
			</Grid>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ my: 2 }} action={<Button color="inherit" size="small" onClick={onRefresh}>Reintentar</Button>}>
				{error}
			</Alert>
		);
	}

	if (!data) {
		return (
			<Typography variant="body1" color="textSecondary" align="center" sx={{ py: 3 }}>
				No hay datos de audiencia
			</Typography>
		);
	}

	// Tarjeta para los 4 contadores principales
	const HeadlineCard = ({ title, value, subtitle, icon, color }: { title: string; value: number; subtitle?: string; icon: React.ReactNode; color: string }) => (
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
				<Typography variant="body2" color="textSecondary">{title}</Typography>
			</Box>
			<Typography variant="h4" sx={{ color }}>{fmt(value)}</Typography>
			{subtitle && (
				<Typography variant="caption" color="textSecondary">{subtitle}</Typography>
			)}
		</Box>
	);

	// Embudo: el step con mayor "delivered" como referencia para barra %
	const maxDelivered = Math.max(1, ...data.byStep.map((s) => s.deliveredUnique));

	return (
		<Grid container spacing={3} sx={{ mt: 0 }}>
			{/* Tarjetas principales */}
			<Grid item xs={12}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>Audiencia</Typography>
				<Divider sx={{ mb: 2 }} />
				<Grid container spacing={2}>
					<Grid item xs={6} md={3}>
						<HeadlineCard
							title="Elegibles ahora"
							value={data.eligible}
							subtitle="Activos en cola y contactables"
							icon={<TickCircle size={20} variant="Bold" />}
							color={theme.palette.success.main}
						/>
					</Grid>
					<Grid item xs={6} md={3}>
						<HeadlineCard
							title="Ya comenzaron"
							value={data.total}
							subtitle="Total que alguna vez entró"
							icon={<People size={20} variant="Bold" />}
							color={theme.palette.primary.main}
						/>
					</Grid>
					<Grid item xs={6} md={3}>
						<HeadlineCard
							title="Dentro (no excluidos)"
							value={data.inside}
							subtitle="Active + completed + paused"
							icon={<Chart size={20} variant="Bold" />}
							color={theme.palette.info.main}
						/>
					</Grid>
					<Grid item xs={6} md={3}>
						<HeadlineCard
							title="Excluidos"
							value={data.excluded}
							subtitle="Removed + skipped"
							icon={<LogoutCurve size={20} variant="Bold" />}
							color={theme.palette.warning.main}
						/>
					</Grid>
				</Grid>
				{data.inside + data.excluded !== data.total && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						Inconsistencia: dentro ({fmt(data.inside)}) + excluidos ({fmt(data.excluded)}) ≠ total ({fmt(data.total)}).
					</Alert>
				)}
			</Grid>

			{/* Embudo por etapa */}
			<Grid item xs={12}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>Embudo por etapa</Typography>
				<Divider sx={{ mb: 2 }} />
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>#</TableCell>
								<TableCell>Email</TableCell>
								<TableCell align="right">En cola (activos)</TableCell>
								<TableCell align="right">Cumplieron (delivered únicos)</TableCell>
								<TableCell sx={{ minWidth: 200 }}>Progresión</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{data.byStep.map((s) => (
								<TableRow key={s.step} hover>
									<TableCell>
										<Chip label={s.step + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32 }} />
									</TableCell>
									<TableCell>
										<Typography variant="body2" fontWeight="medium">{s.name}</Typography>
										{s.subject && (
											<Typography variant="caption" color="textSecondary">
												{s.subject.length > 50 ? `${s.subject.substring(0, 50)}…` : s.subject}
											</Typography>
										)}
									</TableCell>
									<TableCell align="right">
										<Chip label={fmt(s.activeQueued)} size="small" color="info" variant="outlined" />
									</TableCell>
									<TableCell align="right">
										<Chip label={fmt(s.deliveredUnique)} size="small" color="success" variant="outlined" />
									</TableCell>
									<TableCell>
										<LinearProgress
											variant="determinate"
											value={(s.deliveredUnique / maxDelivered) * 100}
											sx={{
												height: 8,
												borderRadius: 4,
												bgcolor: alpha(theme.palette.success.main, 0.15),
												"& .MuiLinearProgress-bar": { bgcolor: theme.palette.success.main, borderRadius: 4 },
											}}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			</Grid>

			{/* Exclusiones por etapa con razón */}
			<Grid item xs={12} md={7}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>Exclusiones por etapa</Typography>
				<Divider sx={{ mb: 2 }} />
				{data.exclusionsByStep.length === 0 ? (
					<Alert severity="info">No hay contactos excluidos.</Alert>
				) : (
					<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 360 }}>
						<Table size="small" stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell>Step</TableCell>
									<TableCell>Estado subdoc</TableCell>
									<TableCell>Razón</TableCell>
									<TableCell>Estado contacto</TableCell>
									<TableCell align="right">Cantidad</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{data.exclusionsByStep.map((row, idx) => (
									<TableRow key={idx} hover>
										<TableCell>
											<Chip label={row.step + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32 }} />
										</TableCell>
										<TableCell>
											<Chip
												label={row.status === "removed" ? "Removido" : "Skipped"}
												size="small"
												color={row.status === "removed" ? "warning" : "default"}
												variant="outlined"
											/>
										</TableCell>
										<TableCell>{reasonLabel(row.reason)}</TableCell>
										<TableCell>
											<Typography variant="caption">{row.contactStatus}</Typography>
										</TableCell>
										<TableCell align="right">{fmt(row.count)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Grid>

			{/* Completados con razón */}
			<Grid item xs={12} md={5}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>Completados</Typography>
				<Divider sx={{ mb: 2 }} />
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Razón</TableCell>
								<TableCell align="right">Cantidad</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{data.completionsByReason.map((row, idx) => (
								<TableRow key={idx} hover>
									<TableCell>{reasonLabel(row.reason)}</TableCell>
									<TableCell align="right">{fmt(row.count)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				<Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
					Generado: {new Date(data.meta.generatedAt).toLocaleString("es-AR")}
				</Typography>
			</Grid>
		</Grid>
	);
};

export default CampaignSendStatsModal;
