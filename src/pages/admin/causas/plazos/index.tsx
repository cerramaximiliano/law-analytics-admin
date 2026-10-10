import { useEffect, useState } from "react";
import { Box, Chip, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme } from "@mui/material";
import MainCard from "components/MainCard";
import { getStats, getPlazosBase, setPlazosBase, PlazosBase, referenciasEnAtlas } from "api/plazos";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import NotificacionesTab from "./NotificacionesTab";
import VencimientosTab from "./VencimientosTab";
import NormativaTab from "./NormativaTab";
import FeriadosTab from "./FeriadosTab";
import DatasetTab from "./DatasetTab";
import MonitoreoTab from "./MonitoreoTab";
import RevisionLegalTab from "./RevisionLegalTab";

export default function PlazosPage() {
	const theme = useTheme();
	const [tab, setTab] = useState(0);
	const [base, setBase] = useState<PlazosBase>(getPlazosBase());
	const [stats, setStats] = useState<{ total: number; porStatus: Record<string, number>; vencimientosProximos: number } | null>(null);

	// Los contadores del encabezado se piden una vez por base (no en cada pestaña) y nunca
	// bloquean las pestañas: si fallan, simplemente no se muestran.
	useEffect(() => {
		setStats(null);
		getStats()
			.then(setStats)
			.catch(() => setStats(null));
	}, [base]);

	const cambiarBase = (b: PlazosBase | null) => {
		if (!b || b === base) return;
		setPlazosBase(b);
		setBase(b);
		if (b === "usuarios" && tab === 4) setTab(0); // el dataset vive solo en la caché
	};

	const isDark = theme.palette.mode === "dark";

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ pb: 1 }}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Plazos Procesales
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Cédulas detectadas en movimientos nuevos con su vencimiento computado (plazo expreso del documento o normativa subsidiaria por
							fuero/objeto), reglas de normativa y calendario de días inhábiles.
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
						{stats && (
							<>
								<Chip label={`${stats.total} notificaciones`} size="small" variant="outlined" />
								<Chip label={`${stats.porStatus?.computed || 0} computadas`} size="small" color="success" variant="outlined" />
								<Chip label={`${stats.porStatus?.pending || 0} en cola`} size="small" variant="outlined" />
							</>
						)}
						<ToggleButtonGroup
							size="small"
							exclusive
							value={base}
							onChange={(_, b) => cambiarBase(b)}
							sx={{ "& .MuiToggleButton-root": { textTransform: "none", py: 0.25 } }}
						>
							<ToggleButton value="cache">Caché (desarrollo)</ToggleButton>
							<ToggleButton value="usuarios">Usuarios (Atlas)</ToggleButton>
						</ToggleButtonGroup>
						<Chip
							label={base === "usuarios" ? "Atlas · pjn/api" : "rs0 · pjn/cache-api"}
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.7rem", color: BRAND_BLUE, borderColor: alpha(BRAND_BLUE, 0.4) }}
						/>
					</Stack>
				</Stack>

				<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}` }}>
					<Tabs
						variant="scrollable"
						scrollButtons="auto"
						allowScrollButtonsMobile
						value={tab}
						onChange={(_, v) => setTab(v)}
						sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } }}
					>
						<Tab label="Notificaciones" />
						<Tab label="Vencimientos" />
						<Tab label="Normativa" />
						<Tab label="Feriados" />
						<Tab label="Dataset" disabled={base === "usuarios"} />
						<Tab label="Monitoreo" />
						<Tab label="Revisión legal" />
					</Tabs>
				</Box>

				{(tab === 2 || tab === 3) && (
					<Typography variant="caption" color="text.secondary">
						Reglas y feriados son los mismos para las dos bases (se editan en{" "}
						{referenciasEnAtlas ? "Atlas" : "el rs0, que es lo que leen los workers hoy"}).
					</Typography>
				)}
				{/* key={base}: al cambiar de base, cada pestaña se vuelve a montar y relee de la API elegida */}
				{tab === 0 && <NotificacionesTab key={base} />}
				{tab === 1 && <VencimientosTab key={base} />}
				{tab === 2 && <NormativaTab />}
				{tab === 3 && <FeriadosTab />}
				{tab === 4 && base === "cache" && <DatasetTab />}
				{tab === 5 && <MonitoreoTab key={base} />}
				{tab === 6 && <RevisionLegalTab key={base} />}
			</Stack>
		</MainCard>
	);
}
