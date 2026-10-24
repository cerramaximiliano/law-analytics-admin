import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Data2 } from "iconsax-react";

import MainCard from "components/MainCard";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";
import GeneralRulesCard, { CoordinatorStatusChip } from "sections/admin/marketing/coordination/GeneralRulesCard";
import PrioritiesTable from "sections/admin/marketing/coordination/PrioritiesTable";
import FlowsChart from "sections/admin/marketing/coordination/FlowsChart";
import DailyDeferredCard from "sections/admin/marketing/coordination/DailyDeferredCard";
import { CampaignService, SchedulerFrequencyService } from "store/reducers/campaign";
import { Campaign, SchedulerFrequencyState } from "types/campaign";
import { LIVE_GREEN } from "themes/dashboardTokens";

// ==============================|| ADMIN - MARKETING - COORDINACIÓN DE CAMPAÑAS ||============================== //
// Tope por persona, prioridad y desplazamiento entre campañas de email.
// Diseño: la-ads/analysis/2026-10-24-coordinador-campanas.md. Backend: la-marketing-service (frequencyGate).

// Todas las campañas de una vez: son pocas (cientos), y la tabla y el gráfico filtran en el cliente.
const CAMPAIGN_FETCH_LIMIT = 500;

const CampaignCoordination = () => {
	const [campaigns, setCampaigns] = useState<Campaign[]>([]);
	const [campaignsLoading, setCampaignsLoading] = useState(true);
	const [campaignsError, setCampaignsError] = useState<string | null>(null);

	const [frequency, setFrequency] = useState<SchedulerFrequencyState | null>(null);
	const [frequencyLoading, setFrequencyLoading] = useState(true);
	const [frequencyError, setFrequencyError] = useState<string | null>(null);

	const loadCampaigns = useCallback(async () => {
		setCampaignsLoading(true);
		setCampaignsError(null);
		try {
			const res = await CampaignService.getCampaigns(1, CAMPAIGN_FETCH_LIMIT, {}, "createdAt", "desc");
			setCampaigns(res.data || []);
		} catch (err: any) {
			setCampaignsError(err?.response?.data?.error || err?.message || "No se pudieron cargar las campañas");
		} finally {
			setCampaignsLoading(false);
		}
	}, []);

	const loadFrequency = useCallback(async () => {
		setFrequencyLoading(true);
		setFrequencyError(null);
		try {
			setFrequency(await SchedulerFrequencyService.getFrequency());
		} catch (err: any) {
			const status = err?.response?.status;
			setFrequencyError(
				status === 404
					? "El servicio de marketing todavía no tiene el endpoint del coordinador (404)."
					: err?.response?.data?.error || err?.message || "Error al leer la configuración.",
			);
			setFrequency(null);
		} finally {
			setFrequencyLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCampaigns();
		loadFrequency();
	}, [loadCampaigns, loadFrequency]);

	const handleCampaignUpdated = useCallback((updated: Campaign) => {
		setCampaigns((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
	}, []);

	return (
		<MainCard>
			<Box sx={{ mb: 2.5 }}>
				<Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
					<Typography variant="h3" sx={{ mb: 0 }}>
						Coordinación de campañas
					</Typography>
					<Chip
						icon={<Data2 size={13} color={LIVE_GREEN} />}
						label="db.scheduler-config"
						size="small"
						variant="outlined"
						sx={{
							fontFamily: "monospace",
							fontSize: "0.7rem",
							borderColor: alpha(LIVE_GREEN, 0.35),
							color: "text.secondary",
							"& .MuiChip-icon": { marginLeft: "6px", color: LIVE_GREEN },
						}}
					/>
					<CoordinatorStatusChip config={frequency?.config ?? null} />
				</Stack>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 820 }}>
					Cuántos correos de marketing recibe cada persona, qué campaña gana cuando dos coinciden y cómo se ven los flujos en el tiempo. Los
					cambios rigen desde la próxima vuelta del scheduler (cada 5 minutos).
				</Typography>
			</Box>

			<MarketingQuickNav />

			{campaignsError && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{campaignsError}
				</Alert>
			)}

			<Grid container spacing={2.5}>
				<Grid item xs={12} lg={7}>
					<GeneralRulesCard
						state={frequency}
						loading={frequencyLoading}
						loadError={frequencyError}
						onSaved={(config) => setFrequency((prev) => (prev ? { ...prev, config } : prev))}
						onRetry={loadFrequency}
					/>
				</Grid>
				<Grid item xs={12} lg={5}>
					<DailyDeferredCard frequency={frequency} campaigns={campaigns} />
				</Grid>
				<Grid item xs={12}>
					{campaignsLoading ? (
						<MainCard title={<Typography variant="h5">Prioridades</Typography>}>
							<Typography variant="body2" color="text.secondary">
								Cargando campañas…
							</Typography>
						</MainCard>
					) : (
						<PrioritiesTable campaigns={campaigns} frequency={frequency} onCampaignUpdated={handleCampaignUpdated} />
					)}
				</Grid>
				<Grid item xs={12}>
					{!campaignsLoading && <FlowsChart campaigns={campaigns} config={frequency?.config ?? null} />}
				</Grid>
			</Grid>
		</MainCard>
	);
};

export default CampaignCoordination;
