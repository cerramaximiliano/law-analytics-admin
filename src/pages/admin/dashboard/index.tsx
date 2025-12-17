import React, { useEffect, useState, useCallback } from "react";
import { Grid, Typography, Box, Skeleton, IconButton, Tooltip, useTheme, alpha, Paper, Chip } from "@mui/material";
import {
	Refresh,
	UserSquare,
	ReceiptItem,
	Folder,
	Sms,
	Profile2User,
	MessageProgramming,
	InfoCircle,
	TickCircle,
	Clock,
	Timer1,
	ArrowRight2,
} from "iconsax-react";
import { useNavigate } from "react-router-dom";
import MainCard from "components/MainCard";
import { DashboardService } from "store/reducers/dashboard";
import { DashboardSummary } from "types/dashboard";
import { useRequestQueueRefresh } from "hooks/useRequestQueueRefresh";
import { useSnackbar } from "notistack";

// Metric info descriptions
const metricInfo: Record<string, string> = {
	// Users
	totalUsers: "Cantidad total de usuarios registrados en la plataforma, incluyendo activos e inactivos.",
	activeUsers: "Usuarios que tienen su cuenta activa y pueden acceder a la plataforma.",
	verifiedUsers: "Usuarios que han verificado su correo electrónico.",
	// Subscriptions
	totalSubscriptions: "Total de suscripciones creadas en el sistema.",
	activeSubscriptions: "Suscripciones con estado activo que permiten acceso a las funcionalidades del plan.",
	freePlan: "Usuarios con plan gratuito que tienen acceso limitado a funcionalidades.",
	standardPlan: "Usuarios con plan Standard que tienen acceso a funcionalidades intermedias.",
	premiumPlan: "Usuarios con plan Premium que tienen acceso completo a todas las funcionalidades.",
	// Subscriptions - Live mode
	liveSubscriptions: "Suscripciones en modo PRODUCCIÓN de Stripe. Estas son suscripciones reales con pagos reales.",
	liveActive: "Suscripciones activas en modo producción.",
	// Subscriptions - Test mode
	testSubscriptions: "Suscripciones en modo TEST de Stripe. Usadas para desarrollo y pruebas, sin pagos reales.",
	testActive: "Suscripciones activas en modo test.",
	// Folders
	totalFolders: "Total de carpetas/causas creadas por todos los usuarios en la plataforma.",
	verifiedFolders: "Carpetas vinculadas y verificadas con fuentes externas (PJN + MEV).",
	// PJN Folders
	pjnTotal: "Total de causas PJN (Poder Judicial de la Nación) = Verificadas + No Verificadas.",
	pjnVerified: "Causas PJN verificadas y válidas (verified: true, isValid: true). Corresponde a la ruta 'Carpetas Verificadas (App)'.",
	pjnNonVerified: "Causas PJN verificadas pero no válidas (verified: true, isValid: false). Corresponde a la ruta 'Carpetas No Verificadas'.",
	// MEV Folders
	mevTotal: "Total de causas MEV (Mesa de Entradas Virtual de la Provincia de Buenos Aires) = Verificadas + No Verificadas.",
	mevVerified: "Causas MEV verificadas y válidas (verified: true, isValid: true). Corresponde a la ruta 'MEV Verificadas (App)'.",
	mevNonVerified: "Causas MEV verificadas pero no válidas (verified: true, isValid: false). Corresponde a la ruta 'MEV No Verificadas'.",
	// Marketing - Campaigns
	totalCampaigns: "Total de campañas de email marketing creadas.",
	activeCampaigns: "Campañas que están actualmente en ejecución enviando correos.",
	scheduledCampaigns: "Campañas programadas para ejecutarse en una fecha futura.",
	// Marketing - Contacts
	totalContacts: "Total de contactos en la base de datos de marketing.",
	activeContacts: "Contactos activos que pueden recibir correos (no desuscritos ni rebotados).",
	// Marketing - Segments
	totalSegments: "Total de segmentos creados para organizar contactos.",
	dynamicSegments: "Segmentos que se actualizan automáticamente según criterios definidos.",
	staticSegments: "Segmentos con lista fija de contactos agregados manualmente.",
};

// Info Tooltip Component
interface InfoTooltipProps {
	metricKey: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ metricKey }) => {
	const theme = useTheme();
	const info = metricInfo[metricKey];

	if (!info) return null;

	return (
		<Tooltip
			title={
				<Typography variant="body2" sx={{ p: 0.5 }}>
					{info}
				</Typography>
			}
			arrow
			placement="top"
		>
			<Box
				component="span"
				sx={{
					display: "inline-flex",
					cursor: "help",
					color: theme.palette.text.secondary,
					opacity: 0.6,
					"&:hover": { opacity: 1 },
					ml: 0.5,
				}}
			>
				<InfoCircle size={14} />
			</Box>
		</Tooltip>
	);
};

// Primary KPI Card Component - For main metrics (larger)
interface PrimaryKPICardProps {
	title: string;
	value: number;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
	infoKey: string;
	trend?: { value: number; label: string };
	linkTo?: string;
	onClick?: () => void;
}

const PrimaryKPICard: React.FC<PrimaryKPICardProps> = ({ title, value, icon, color, loading, infoKey, trend, linkTo, onClick }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isClickable = linkTo || onClick;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (linkTo) {
			navigate(linkTo);
		}
	};

	return (
		<Paper
			elevation={0}
			onClick={isClickable ? handleClick : undefined}
			sx={{
				p: 3,
				borderRadius: 3,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				position: "relative",
				overflow: "hidden",
				cursor: isClickable ? "pointer" : "default",
				transition: "all 0.2s ease",
				"&::before": {
					content: '""',
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 4,
					bgcolor: color,
				},
				...(isClickable && {
					"&:hover": {
						boxShadow: theme.shadows[4],
						borderColor: alpha(color, 0.5),
						transform: "translateY(-2px)",
					},
				}),
			}}
		>
			<Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
				<Box
					sx={{
						p: 1.5,
						borderRadius: 2,
						bgcolor: alpha(color, 0.1),
						color: color,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{icon}
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<InfoTooltip metricKey={infoKey} />
					{isClickable && <ArrowRight2 size={16} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
				</Box>
			</Box>
			<Box>
				{loading ? (
					<Skeleton variant="text" width={80} height={50} />
				) : (
					<Typography variant="h2" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
						{value.toLocaleString()}
					</Typography>
				)}
				<Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
					{title}
				</Typography>
				{trend && (
					<Chip
						size="small"
						label={trend.label}
						sx={{
							mt: 1,
							bgcolor: trend.value >= 0 ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
							color: trend.value >= 0 ? theme.palette.success.main : theme.palette.error.main,
							fontWeight: 500,
						}}
					/>
				)}
			</Box>
		</Paper>
	);
};

// Secondary Stat Card Component - For breakdown metrics (smaller)
interface SecondaryStatCardProps {
	title: string;
	value: number;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
	infoKey: string;
	linkTo?: string;
	onClick?: () => void;
}

const SecondaryStatCard: React.FC<SecondaryStatCardProps> = ({ title, value, icon, color, loading, infoKey, linkTo, onClick }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isClickable = linkTo || onClick;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (linkTo) {
			navigate(linkTo);
		}
	};

	return (
		<Paper
			elevation={0}
			onClick={isClickable ? handleClick : undefined}
			sx={{
				p: 2,
				borderRadius: 2,
				bgcolor: alpha(color, 0.05),
				border: `1px solid ${alpha(color, 0.15)}`,
				height: "100%",
				transition: "all 0.2s ease",
				cursor: isClickable ? "pointer" : "default",
				"&:hover": {
					bgcolor: alpha(color, 0.08),
					borderColor: alpha(color, 0.25),
					...(isClickable && {
						boxShadow: theme.shadows[2],
						transform: "translateY(-1px)",
					}),
				},
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Box sx={{ color: color, display: "flex" }}>{icon}</Box>
					<Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
						{title}
					</Typography>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
					<InfoTooltip metricKey={infoKey} />
					{isClickable && <ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
				</Box>
			</Box>
			{loading ? (
				<Skeleton variant="text" width={50} height={32} />
			) : (
				<Typography variant="h4" sx={{ color: color, fontWeight: 600 }}>
					{value.toLocaleString()}
				</Typography>
			)}
		</Paper>
	);
};

// Mini Stat Component - For inline stats in grouped cards
interface MiniStatProps {
	label: string;
	value: number;
	color?: string;
	loading?: boolean;
	infoKey: string;
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value, color, loading, infoKey }) => {
	const theme = useTheme();

	return (
		<Box sx={{ textAlign: "center", flex: 1 }}>
			{loading ? (
				<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
			) : (
				<Typography variant="h4" sx={{ fontWeight: 600, color: color || theme.palette.text.primary }}>
					{value.toLocaleString()}
				</Typography>
			)}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
				<Typography variant="caption" color="textSecondary">
					{label}
				</Typography>
				<InfoTooltip metricKey={infoKey} />
			</Box>
		</Box>
	);
};

// Section Header Component
interface SectionHeaderProps {
	title: string;
	subtitle?: string;
	icon: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon }) => {
	const theme = useTheme();

	return (
		<Box sx={{ mb: 2.5 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
				<Typography variant="h5" fontWeight="bold">
					{title}
				</Typography>
			</Box>
			{subtitle && (
				<Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, ml: 4 }}>
					{subtitle}
				</Typography>
			)}
		</Box>
	);
};

// Grouped Card Component - For grouping related metrics
interface GroupedCardProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	linkTo?: string;
	onClick?: () => void;
}

const GroupedCard: React.FC<GroupedCardProps> = ({ title, icon, children, linkTo, onClick }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isClickable = linkTo || onClick;

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (linkTo) {
			navigate(linkTo);
		}
	};

	return (
		<Paper
			elevation={0}
			onClick={isClickable ? handleClick : undefined}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				cursor: isClickable ? "pointer" : "default",
				transition: "all 0.2s ease",
				...(isClickable && {
					"&:hover": {
						boxShadow: theme.shadows[2],
						borderColor: alpha(theme.palette.primary.main, 0.3),
					},
				}),
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
					<Typography variant="subtitle1" fontWeight="bold">
						{title}
					</Typography>
				</Box>
				{isClickable && <ArrowRight2 size={16} style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />}
			</Box>
			{children}
		</Paper>
	);
};

const AdminDashboard = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<DashboardSummary | null>(null);
	const [lastUpdated, setLastUpdated] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await DashboardService.getSummary();
			if (response.success) {
				setData(response.data);
				setLastUpdated(response.timestamp);
			}
		} catch (error: any) {
			console.error("Error fetching dashboard data:", error);
			enqueueSnackbar(error?.message || "Error al cargar datos del dashboard", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useRequestQueueRefresh(fetchData);

	const handleRefresh = () => {
		fetchData();
	};

	return (
		<>
			<MainCard
				title="Dashboard"
				secondary={
					<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
						{lastUpdated && (
							<Chip
								size="small"
								icon={<Clock size={14} />}
								label={`Actualizado: ${new Date(lastUpdated).toLocaleString("es-ES")}`}
								variant="outlined"
								sx={{ borderRadius: 1.5 }}
							/>
						)}
						<Tooltip title="Actualizar datos">
							<IconButton onClick={handleRefresh} disabled={loading} size="small" color="primary">
								<Refresh
									size={20}
									style={{
										animation: loading ? "spin 1s linear infinite" : "none",
									}}
								/>
							</IconButton>
						</Tooltip>
					</Box>
				}
			>
				<style>{`
					@keyframes spin {
						from { transform: rotate(0deg); }
						to { transform: rotate(360deg); }
					}
				`}</style>

				{/* Primary KPIs Row - Most Important Metrics */}
				<Box sx={{ mb: 4 }}>
					<Typography variant="overline" color="textSecondary" sx={{ mb: 2, display: "block", letterSpacing: 1.5 }}>
						Resumen General
					</Typography>
					<Grid container spacing={3}>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Total Usuarios"
								value={data?.users.total || 0}
								icon={<UserSquare size={28} variant="Bold" />}
								color={theme.palette.primary.main}
								loading={loading}
								infoKey="totalUsers"
								linkTo="/admin/users"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Suscripciones Activas"
								value={data?.subscriptions.active || 0}
								icon={<ReceiptItem size={28} variant="Bold" />}
								color={theme.palette.success.main}
								loading={loading}
								infoKey="activeSubscriptions"
								linkTo="/admin/usuarios/suscripciones"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Carpetas Verificadas"
								value={data?.folders.verified || 0}
								icon={<Folder size={28} variant="Bold" />}
								color={theme.palette.info.main}
								loading={loading}
								infoKey="verifiedFolders"
								linkTo="/admin/causas/verified"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<PrimaryKPICard
								title="Contactos Marketing"
								value={data?.marketing.contacts.total || 0}
								icon={<Profile2User size={28} variant="Bold" />}
								color={theme.palette.secondary.main}
								loading={loading}
								infoKey="totalContacts"
								linkTo="/admin/marketing/contacts"
							/>
						</Grid>
					</Grid>
				</Box>

				{/* Detailed Sections */}
				<Grid container spacing={3}>
					{/* Users Section */}
					<Grid item xs={12} md={6}>
						<SectionHeader title="Usuarios" subtitle="Estadísticas de usuarios registrados" icon={<UserSquare size={22} variant="Bold" />} />
						<Grid container spacing={2}>
							<Grid item xs={12}>
								<GroupedCard title="Estado de Usuarios" icon={<TickCircle size={18} />} linkTo="/admin/users">
									<Box sx={{ display: "flex", gap: 2 }}>
										<MiniStat
											label="Total"
											value={data?.users.total || 0}
											color={theme.palette.primary.main}
											loading={loading}
											infoKey="totalUsers"
										/>
										<MiniStat
											label="Activos"
											value={data?.users.active || 0}
											color={theme.palette.success.main}
											loading={loading}
											infoKey="activeUsers"
										/>
										<MiniStat
											label="Verificados"
											value={data?.users.verified || 0}
											color={theme.palette.info.main}
											loading={loading}
											infoKey="verifiedUsers"
										/>
									</Box>
								</GroupedCard>
							</Grid>
						</Grid>
					</Grid>

					{/* Subscriptions Section */}
					<Grid item xs={12} md={6}>
						<SectionHeader
							title="Suscripciones"
							subtitle="Distribución por planes y modo"
							icon={<ReceiptItem size={22} variant="Bold" />}
						/>
						<Grid container spacing={2}>
							{/* LIVE Mode Subscriptions */}
							<Grid item xs={12}>
								<GroupedCard title="Producción (Live)" icon={<TickCircle size={18} />} linkTo="/admin/usuarios/suscripciones">
									<Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
										<Chip
											size="small"
											label="LIVE"
											sx={{
												bgcolor: alpha(theme.palette.success.main, 0.15),
												color: theme.palette.success.main,
												fontWeight: 600,
												fontSize: "0.65rem",
											}}
										/>
										<InfoTooltip metricKey="liveSubscriptions" />
									</Box>
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.grey[600] }}>
														{(data?.subscriptions.live?.byPlan?.free || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip size="small" label="Free" sx={{ bgcolor: alpha(theme.palette.grey[600], 0.1), fontSize: "0.7rem" }} />
													<InfoTooltip metricKey="freePlan" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
														{(data?.subscriptions.live?.byPlan?.standard || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="Standard"
														sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, fontSize: "0.7rem" }}
													/>
													<InfoTooltip metricKey="standardPlan" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.secondary.main }}>
														{(data?.subscriptions.live?.byPlan?.premium || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="Premium"
														sx={{
															bgcolor: alpha(theme.palette.secondary.main, 0.1),
															color: theme.palette.secondary.main,
															fontSize: "0.7rem",
														}}
													/>
													<InfoTooltip metricKey="premiumPlan" />
												</Box>
											</Box>
										</Grid>
									</Grid>
									<Box
										sx={{
											mt: 2,
											pt: 2,
											borderTop: `1px dashed ${theme.palette.divider}`,
											display: "flex",
											justifyContent: "space-between",
										}}
									>
										<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
											<Typography variant="body2" color="textSecondary">
												Total:
											</Typography>
											<Typography variant="subtitle2" fontWeight="bold">
												{(data?.subscriptions.live?.total || 0).toLocaleString()}
											</Typography>
										</Box>
										<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
											<Typography variant="body2" color="textSecondary">
												Activas:
											</Typography>
											<Typography variant="subtitle2" fontWeight="bold" color="success.main">
												{(data?.subscriptions.live?.active || 0).toLocaleString()}
											</Typography>
											<InfoTooltip metricKey="liveActive" />
										</Box>
									</Box>
								</GroupedCard>
							</Grid>

							{/* TEST Mode Subscriptions */}
							<Grid item xs={12}>
								<Paper
									elevation={0}
									sx={{
										p: 2,
										borderRadius: 2,
										bgcolor: alpha(theme.palette.warning.main, 0.03),
										border: `1px dashed ${alpha(theme.palette.warning.main, 0.3)}`,
									}}
								>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
										<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
											<Chip
												size="small"
												label="TEST"
												sx={{
													bgcolor: alpha(theme.palette.warning.main, 0.15),
													color: theme.palette.warning.dark,
													fontWeight: 600,
													fontSize: "0.65rem",
												}}
											/>
											<Typography variant="body2" color="textSecondary" sx={{ fontStyle: "italic" }}>
												Modo pruebas
											</Typography>
											<InfoTooltip metricKey="testSubscriptions" />
										</Box>
									</Box>
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.grey[500] }}>
														{(data?.subscriptions.test?.byPlan?.free || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">
													Free
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: alpha(theme.palette.warning.main, 0.7) }}>
														{(data?.subscriptions.test?.byPlan?.standard || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">
													Standard
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: alpha(theme.palette.secondary.main, 0.7) }}>
														{(data?.subscriptions.test?.byPlan?.premium || 0).toLocaleString()}
													</Typography>
												)}
												<Typography variant="caption" color="textSecondary">
													Premium
												</Typography>
											</Box>
										</Grid>
									</Grid>
									<Box sx={{ mt: 1.5, display: "flex", justifyContent: "space-between" }}>
										<Typography variant="caption" color="textSecondary">
											Total: <strong>{(data?.subscriptions.test?.total || 0).toLocaleString()}</strong>
										</Typography>
										<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
											<Typography variant="caption" color="textSecondary">
												Activas: <strong>{(data?.subscriptions.test?.active || 0).toLocaleString()}</strong>
											</Typography>
											<InfoTooltip metricKey="testActive" />
										</Box>
									</Box>
								</Paper>
							</Grid>
						</Grid>
					</Grid>

					{/* Folders Section */}
					<Grid item xs={12} md={4}>
						<SectionHeader title="Carpetas" subtitle="Causas vinculadas por fuente" icon={<Folder size={22} variant="Bold" />} />
						<Grid container spacing={2}>
							{/* Summary Row */}
							<Grid item xs={6}>
								<SecondaryStatCard
									title="Total Carpetas"
									value={data?.folders.total || 0}
									icon={<Folder size={18} />}
									color={theme.palette.primary.main}
									loading={loading}
									infoKey="totalFolders"
									linkTo="/admin/causas/non-verified"
								/>
							</Grid>
							<Grid item xs={6}>
								<SecondaryStatCard
									title="Verificadas"
									value={data?.folders.verified || 0}
									icon={<TickCircle size={18} />}
									color={theme.palette.success.main}
									loading={loading}
									infoKey="verifiedFolders"
									linkTo="/admin/causas/verified"
								/>
							</Grid>
							{/* PJN Card */}
							<Grid item xs={12}>
								<GroupedCard title="PJN (Poder Judicial de la Nación)" icon={<Folder size={18} />}>
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
														{(data?.folders.pjn?.total || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Total
													</Typography>
													<InfoTooltip metricKey="pjnTotal" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box
												sx={{ textAlign: "center", cursor: "pointer" }}
												onClick={() => window.location.href = "/admin/causas/verified-app"}
											>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
														{(data?.folders.pjn?.verified || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="Verificadas"
														sx={{
															bgcolor: alpha(theme.palette.success.main, 0.1),
															color: theme.palette.success.main,
															fontSize: "0.65rem",
														}}
													/>
													<InfoTooltip metricKey="pjnVerified" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box
												sx={{ textAlign: "center", cursor: "pointer" }}
												onClick={() => window.location.href = "/admin/causas/non-verified"}
											>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
														{(data?.folders.pjn?.nonVerified || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="No Verif."
														sx={{
															bgcolor: alpha(theme.palette.warning.main, 0.1),
															color: theme.palette.warning.main,
															fontSize: "0.65rem",
														}}
													/>
													<InfoTooltip metricKey="pjnNonVerified" />
												</Box>
											</Box>
										</Grid>
									</Grid>
								</GroupedCard>
							</Grid>
							{/* MEV Card */}
							<Grid item xs={12}>
								<GroupedCard title="MEV (Mesa de Entradas Virtual)" icon={<Folder size={18} />}>
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
														{(data?.folders.mev?.total || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Total
													</Typography>
													<InfoTooltip metricKey="mevTotal" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box
												sx={{ textAlign: "center", cursor: "pointer" }}
												onClick={() => window.location.href = "/admin/mev/verified-app"}
											>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
														{(data?.folders.mev?.verified || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="Verificadas"
														sx={{
															bgcolor: alpha(theme.palette.success.main, 0.1),
															color: theme.palette.success.main,
															fontSize: "0.65rem",
														}}
													/>
													<InfoTooltip metricKey="mevVerified" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box
												sx={{ textAlign: "center", cursor: "pointer" }}
												onClick={() => window.location.href = "/admin/mev/non-verified"}
											>
												{loading ? (
													<Skeleton variant="text" width={40} height={36} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
														{(data?.folders.mev?.nonVerified || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="No Verif."
														sx={{
															bgcolor: alpha(theme.palette.warning.main, 0.1),
															color: theme.palette.warning.main,
															fontSize: "0.65rem",
														}}
													/>
													<InfoTooltip metricKey="mevNonVerified" />
												</Box>
											</Box>
										</Grid>
									</Grid>
								</GroupedCard>
							</Grid>
						</Grid>
					</Grid>

					{/* Marketing Section */}
					<Grid item xs={12} md={8}>
						<SectionHeader title="Marketing" subtitle="Email marketing y segmentación" icon={<Sms size={22} variant="Bold" />} />
						<Grid container spacing={2}>
							{/* Campaigns */}
							<Grid item xs={12} sm={6}>
								<GroupedCard title="Campañas" icon={<Sms size={18} />} linkTo="/admin/marketing/mailing">
									<Grid container spacing={1.5}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
														{(data?.marketing.campaigns.total || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Total
													</Typography>
													<InfoTooltip metricKey="totalCampaigns" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
														{(data?.marketing.campaigns.active || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Activas
													</Typography>
													<InfoTooltip metricKey="activeCampaigns" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>
														{(data?.marketing.campaigns.scheduled || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Programadas
													</Typography>
													<InfoTooltip metricKey="scheduledCampaigns" />
												</Box>
											</Box>
										</Grid>
									</Grid>
								</GroupedCard>
							</Grid>

							{/* Contacts */}
							<Grid item xs={12} sm={6}>
								<GroupedCard title="Contactos" icon={<Profile2User size={18} />} linkTo="/admin/marketing/contacts">
									<Box sx={{ display: "flex", gap: 2 }}>
										<MiniStat
											label="Total"
											value={data?.marketing.contacts.total || 0}
											color={theme.palette.primary.main}
											loading={loading}
											infoKey="totalContacts"
										/>
										<MiniStat
											label="Activos"
											value={data?.marketing.contacts.active || 0}
											color={theme.palette.success.main}
											loading={loading}
											infoKey="activeContacts"
										/>
									</Box>
								</GroupedCard>
							</Grid>

							{/* Segments */}
							<Grid item xs={12}>
								<GroupedCard title="Segmentos" icon={<MessageProgramming size={18} />} linkTo="/admin/marketing/contacts">
									<Grid container spacing={2}>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
														{(data?.marketing.segments.total || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Typography variant="caption" color="textSecondary">
														Total
													</Typography>
													<InfoTooltip metricKey="totalSegments" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.secondary.main }}>
														{(data?.marketing.segments.dynamic || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														icon={<Timer1 size={12} />}
														label="Dinámicos"
														sx={{
															bgcolor: alpha(theme.palette.secondary.main, 0.1),
															color: theme.palette.secondary.main,
															fontSize: "0.65rem",
															"& .MuiChip-icon": { color: "inherit" },
														}}
													/>
													<InfoTooltip metricKey="dynamicSegments" />
												</Box>
											</Box>
										</Grid>
										<Grid item xs={4}>
											<Box sx={{ textAlign: "center" }}>
												{loading ? (
													<Skeleton variant="text" width={30} height={28} sx={{ mx: "auto" }} />
												) : (
													<Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
														{(data?.marketing.segments.static || 0).toLocaleString()}
													</Typography>
												)}
												<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.25 }}>
													<Chip
														size="small"
														label="Estáticos"
														sx={{
															bgcolor: alpha(theme.palette.info.main, 0.1),
															color: theme.palette.info.main,
															fontSize: "0.65rem",
														}}
													/>
													<InfoTooltip metricKey="staticSegments" />
												</Box>
											</Box>
										</Grid>
									</Grid>
								</GroupedCard>
							</Grid>
						</Grid>
					</Grid>
				</Grid>
			</MainCard>
		</>
	);
};

export default AdminDashboard;
