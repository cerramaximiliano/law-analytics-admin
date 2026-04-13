import { useEffect, useState } from "react";
import {
	Box, Tab, Tabs, Typography, Grid, Card, CardContent, Skeleton,
} from "@mui/material";
import { People, DocumentText, TickCircle, CloseCircle, Clock, Warning2 } from "iconsax-react";
import { useDispatch, useSelector } from "store";
import { fetchSecloStats } from "store/reducers/seclo";
import SolicitudesTab from "./SolicitudesTab";
import CredencialesTab from "./CredencialesTab";

// ── Tarjeta de estadística ────────────────────────────────────────────────────

interface StatCardProps {
	label: string;
	value: number | undefined;
	icon: React.ReactNode;
	color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
	return (
		<Card variant="outlined" sx={{ height: "100%" }}>
			<CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
				<Box
					sx={{
						width: 44, height: 44, borderRadius: 2,
						bgcolor: `${color}20`, color,
						display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
					}}
				>
					{icon}
				</Box>
				<Box>
					{value === undefined ? (
						<Skeleton width={40} height={28} />
					) : (
						<Typography variant="h5" fontWeight={600}>{value}</Typography>
					)}
					<Typography variant="caption" color="text.secondary">{label}</Typography>
				</Box>
			</CardContent>
		</Card>
	);
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SecloPage() {
	const dispatch = useDispatch();
	const { stats } = useSelector((s) => s.seclo);
	const [activeTab, setActiveTab] = useState(0);

	useEffect(() => {
		dispatch(fetchSecloStats());
	}, [dispatch]);

	return (
		<Box>
			{/* Header */}
			<Box mb={3}>
				<Typography variant="h4" fontWeight={600} gutterBottom>SECLO — Audiencias laborales</Typography>
				<Typography variant="body2" color="text.secondary">
					Gestión de solicitudes de audiencia SECLO y credenciales del portal Ministerio de Trabajo.
				</Typography>
			</Box>

			{/* Stats */}
			<Grid container spacing={2} mb={3}>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard label="Pendientes" value={stats?.solicitudes.pending} icon={<Clock size={20} />} color="#f59e0b" />
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard label="Procesando" value={stats?.solicitudes.processing} icon={<Clock size={20} />} color="#3b82f6" />
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard label="Enviadas" value={stats?.solicitudes.submitted} icon={<DocumentText size={20} />} color="#8b5cf6" />
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard label="Completadas" value={stats?.solicitudes.completed} icon={<TickCircle size={20} />} color="#10b981" />
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard label="Con error" value={stats?.solicitudes.error} icon={<CloseCircle size={20} />} color="#ef4444" />
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard label="Credenciales activas" value={stats?.credentials.active} icon={<People size={20} />} color="#06b6d4" />
				</Grid>
			</Grid>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
					<Tab label="Solicitudes" />
					<Tab label="Credenciales" />
				</Tabs>
			</Box>

			{activeTab === 0 && <SolicitudesTab />}
			{activeTab === 1 && <CredencialesTab />}
		</Box>
	);
}
