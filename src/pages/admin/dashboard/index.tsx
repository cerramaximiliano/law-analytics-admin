import React, { useEffect, useState, useCallback } from "react";
import { Grid, Typography, Box, Skeleton, IconButton, Tooltip, useTheme, alpha, Paper, Divider } from "@mui/material";
import { Refresh, UserSquare, ReceiptItem, Folder, Sms, Profile2User, MessageProgramming } from "iconsax-react";
import MainCard from "components/MainCard";
import { DashboardService } from "store/reducers/dashboard";
import { DashboardSummary } from "types/dashboard";
import { useRequestQueueRefresh } from "hooks/useRequestQueueRefresh";
import { useSnackbar } from "notistack";

// Stat Card Component
interface StatCardProps {
	title: string;
	value: number;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2.5,
				borderRadius: 2,
				bgcolor: alpha(color, 0.1),
				border: `1px solid ${alpha(color, 0.2)}`,
				height: "100%",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
				<Box sx={{ color, mr: 1 }}>{icon}</Box>
				<Typography variant="body2" color="textSecondary">
					{title}
				</Typography>
			</Box>
			{loading ? (
				<Skeleton variant="text" width={60} height={40} />
			) : (
				<Typography variant="h3" sx={{ color, fontWeight: 600 }}>
					{value.toLocaleString()}
				</Typography>
			)}
			{subtitle && (
				<Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: "block" }}>
					{subtitle}
				</Typography>
			)}
		</Paper>
	);
};

// Section Header Component
interface SectionHeaderProps {
	title: string;
	icon: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => {
	const theme = useTheme();

	return (
		<Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
			<Box sx={{ color: theme.palette.primary.main, mr: 1 }}>{icon}</Box>
			<Typography variant="h6" fontWeight="bold">
				{title}
			</Typography>
		</Box>
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

	// Cargar datos al montar el componente
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Refrescar datos cuando el usuario se re-autentica
	useRequestQueueRefresh(fetchData);

	const handleRefresh = () => {
		fetchData();
	};

	return (
		<>
			<MainCard
				title="Dashboard"
				secondary={
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						{lastUpdated && (
							<Typography variant="caption" color="textSecondary">
								Actualizado: {new Date(lastUpdated).toLocaleString("es-ES")}
							</Typography>
						)}
						<Tooltip title="Actualizar datos">
							<IconButton onClick={handleRefresh} disabled={loading} size="small">
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

				{/* Usuarios Section */}
				<Box sx={{ mb: 4 }}>
					<SectionHeader title="Usuarios" icon={<UserSquare size={24} variant="Bold" />} />
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={4}>
							<StatCard
								title="Total de Usuarios"
								value={data?.users.total || 0}
								icon={<UserSquare size={22} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<StatCard
								title="Usuarios Activos"
								value={data?.users.active || 0}
								icon={<UserSquare size={22} variant="Bold" />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<StatCard
								title="Usuarios Verificados"
								value={data?.users.verified || 0}
								icon={<UserSquare size={22} variant="TwoTone" />}
								color={theme.palette.info.main}
								loading={loading}
							/>
						</Grid>
					</Grid>
				</Box>

				<Divider sx={{ mb: 4 }} />

				{/* Suscripciones Section */}
				<Box sx={{ mb: 4 }}>
					<SectionHeader title="Suscripciones" icon={<ReceiptItem size={24} variant="Bold" />} />
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={3}>
							<StatCard
								title="Total Suscripciones"
								value={data?.subscriptions.total || 0}
								icon={<ReceiptItem size={22} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<StatCard
								title="Suscripciones Activas"
								value={data?.subscriptions.active || 0}
								icon={<ReceiptItem size={22} variant="Bold" />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Plan Free"
								value={data?.subscriptions.byPlan?.free || 0}
								icon={<ReceiptItem size={22} />}
								color={theme.palette.grey[600]}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Plan Standard"
								value={data?.subscriptions.byPlan?.standard || 0}
								icon={<ReceiptItem size={22} />}
								color={theme.palette.warning.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Plan Premium"
								value={data?.subscriptions.byPlan?.premium || 0}
								icon={<ReceiptItem size={22} variant="Bold" />}
								color={theme.palette.secondary.main}
								loading={loading}
							/>
						</Grid>
					</Grid>
				</Box>

				<Divider sx={{ mb: 4 }} />

				{/* Carpetas Section */}
				<Box sx={{ mb: 4 }}>
					<SectionHeader title="Carpetas" icon={<Folder size={24} variant="Bold" />} />
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={6}>
							<StatCard
								title="Total de Carpetas"
								value={data?.folders.total || 0}
								icon={<Folder size={22} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={6}>
							<StatCard
								title="Carpetas Verificadas"
								value={data?.folders.verified || 0}
								icon={<Folder size={22} variant="Bold" />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
					</Grid>
				</Box>

				<Divider sx={{ mb: 4 }} />

				{/* Marketing Section */}
				<Box>
					<SectionHeader title="Marketing" icon={<Sms size={24} variant="Bold" />} />

					{/* Campañas */}
					<Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1.5 }}>
						Campañas
					</Typography>
					<Grid container spacing={2} sx={{ mb: 3 }}>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Total Campañas"
								value={data?.marketing.campaigns.total || 0}
								icon={<Sms size={22} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Campañas Activas"
								value={data?.marketing.campaigns.active || 0}
								icon={<Sms size={22} variant="Bold" />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Campañas Programadas"
								value={data?.marketing.campaigns.scheduled || 0}
								icon={<Sms size={22} variant="TwoTone" />}
								color={theme.palette.warning.main}
								loading={loading}
							/>
						</Grid>
					</Grid>

					{/* Contactos */}
					<Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1.5 }}>
						Contactos
					</Typography>
					<Grid container spacing={2} sx={{ mb: 3 }}>
						<Grid item xs={12} sm={6}>
							<StatCard
								title="Total Contactos"
								value={data?.marketing.contacts.total || 0}
								icon={<Profile2User size={22} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<StatCard
								title="Contactos Activos"
								value={data?.marketing.contacts.active || 0}
								icon={<Profile2User size={22} variant="Bold" />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
					</Grid>

					{/* Segmentos */}
					<Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1.5 }}>
						Segmentos
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Total Segmentos"
								value={data?.marketing.segments.total || 0}
								icon={<MessageProgramming size={22} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Segmentos Dinámicos"
								value={data?.marketing.segments.dynamic || 0}
								icon={<MessageProgramming size={22} variant="Bold" />}
								color={theme.palette.secondary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Segmentos Estáticos"
								value={data?.marketing.segments.static || 0}
								icon={<MessageProgramming size={22} variant="TwoTone" />}
								color={theme.palette.info.main}
								loading={loading}
							/>
						</Grid>
					</Grid>
				</Box>
			</MainCard>
		</>
	);
};

export default AdminDashboard;
