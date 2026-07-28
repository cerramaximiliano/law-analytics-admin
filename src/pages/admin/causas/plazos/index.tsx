import { useEffect, useState } from "react";
import { Box, Chip, Stack, Tab, Tabs, Typography, alpha, useTheme } from "@mui/material";
import MainCard from "components/MainCard";
import { getStats } from "api/plazos";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import NotificacionesTab from "./NotificacionesTab";
import VencimientosTab from "./VencimientosTab";
import NormativaTab from "./NormativaTab";
import FeriadosTab from "./FeriadosTab";

export default function PlazosPage() {
	const theme = useTheme();
	const [tab, setTab] = useState(0);
	const [stats, setStats] = useState<{ total: number; porStatus: Record<string, number>; vencimientosProximos: number } | null>(null);

	useEffect(() => {
		getStats()
			.then(setStats)
			.catch(() => setStats(null));
	}, [tab]);

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
							Cédulas detectadas en movimientos nuevos con su vencimiento computado (plazo expreso del documento o normativa
							subsidiaria por fuero/objeto), reglas de normativa y calendario de días inhábiles.
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
						{stats && (
							<>
								<Chip label={`${stats.total} notificaciones`} size="small" variant="outlined" />
								<Chip
									label={`${stats.porStatus?.computed || 0} computadas`}
									size="small"
									color="success"
									variant="outlined"
								/>
								<Chip label={`${stats.porStatus?.pending || 0} en cola`} size="small" variant="outlined" />
							</>
						)}
						<Chip
							label="Mongo local worker_01"
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.7rem", color: BRAND_BLUE, borderColor: alpha(BRAND_BLUE, 0.4) }}
						/>
					</Stack>
				</Stack>

				<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}` }}>
					<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } }}>
						<Tab label="Notificaciones" />
						<Tab label="Vencimientos" />
						<Tab label="Normativa" />
						<Tab label="Feriados" />
					</Tabs>
				</Box>

				{tab === 0 && <NotificacionesTab />}
				{tab === 1 && <VencimientosTab />}
				{tab === 2 && <NormativaTab />}
				{tab === 3 && <FeriadosTab />}
			</Stack>
		</MainCard>
	);
}
