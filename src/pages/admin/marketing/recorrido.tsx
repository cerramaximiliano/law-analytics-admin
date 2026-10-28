import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	FormControlLabel,
	InputAdornment,
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { SearchNormal1 } from "iconsax-react";

import MainCard from "components/MainCard";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";
import { JourneyLookup, JourneyMapData, JourneyPeriod, JourneyService } from "api/journey";
import JourneyCampaignDetail from "sections/admin/marketing/journey/JourneyCampaignDetail";
import JourneyChecks from "sections/admin/marketing/journey/JourneyChecks";
import JourneyHistorial from "sections/admin/marketing/journey/JourneyHistorial";
import JourneyStrategy from "sections/admin/marketing/journey/JourneyStrategy";
import { PERIOD_LABEL } from "sections/admin/marketing/journey/journeyFormat";
import JourneyMap, { JourneyNodeId } from "sections/admin/marketing/journey/JourneyMap";
import JourneyNodePanel from "sections/admin/marketing/journey/JourneyNodePanel";
import JourneyLookupCard from "sections/admin/marketing/journey/JourneyLookupCard";

// ==============================|| ADMIN - MARKETING - RECORRIDO DEL CONTACTO ||============================== //
// Mapa de las campañas de email por etapa (captación → onboarding → conversión → cliente), con fugas, control de
// exclusividad y buscador por correo, contactId o userId. Backend: la-marketing-service /api/journey/*.

const NODE_STAGES = new Set<string>(["captacion", "onboarding", "conversion", "cliente", "inactivo", "activo_free"]);

const Recorrido = () => {
	const [data, setData] = useState<JourneyMapData | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [refreshing, setRefreshing] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<JourneyNodeId | null>(null);
	const [query, setQuery] = useState<string>("");
	const [lookup, setLookup] = useState<JourneyLookup | null>(null);
	const [lookupLoading, setLookupLoading] = useState<boolean>(false);
	const [lookupMsg, setLookupMsg] = useState<string | null>(null);
	const [period, setPeriod] = useState<JourneyPeriod>("30");
	const [showHistorial, setShowHistorial] = useState<boolean>(false);
	const [showStrategy, setShowStrategy] = useState<boolean>(false);
	const [openCampaign, setOpenCampaign] = useState<string | null>(null);

	const load = useCallback(async (refresh = false) => {
		try {
			refresh ? setRefreshing(true) : setLoading(true);
			setError(null);
			setData(await JourneyService.getMap(refresh));
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || "No se pudo cargar el mapa");
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const runLookup = useCallback(async (q: string) => {
		const term = q.trim();
		if (term.length < 3) return;
		try {
			setLookupLoading(true);
			setLookupMsg(null);
			const res = await JourneyService.lookup(term);
			setLookup(res);
			if (!res) setLookupMsg("No se encontró un contacto con ese dato.");
			else {
				const stage = res.highlight.stage;
				if (NODE_STAGES.has(stage) || stage.startsWith("conversion:")) setSelected(stage as JourneyNodeId);
			}
		} catch (err: any) {
			setLookupMsg(err?.response?.data?.error || err?.message || "Error al buscar");
		} finally {
			setLookupLoading(false);
		}
	}, []);

	const highlight: JourneyNodeId[] =
		lookup && lookup.highlight.stage && (NODE_STAGES.has(lookup.highlight.stage) || lookup.highlight.stage.startsWith("conversion:"))
			? [lookup.highlight.stage as JourneyNodeId]
			: [];

	const exclusivityTotal = data ? Object.values(data.exclusivity).reduce((a, e) => a + e.count, 0) : 0;

	return (
		<MainCard title="Recorrido del contacto">
			<MarketingQuickNav />

			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
				<TextField
					size="small"
					label="Buscar contacto o usuario"
					placeholder="correo, contactId o userId"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && runLookup(query)}
					sx={{ minWidth: 340 }}
					InputProps={{
						endAdornment: (
							<InputAdornment position="end">
								{lookupLoading ? (
									<CircularProgress size={16} />
								) : (
									<SearchNormal1 size={18} style={{ cursor: "pointer" }} onClick={() => runLookup(query)} />
								)}
							</InputAdornment>
						),
					}}
				/>
				<Button size="small" variant="outlined" onClick={() => load(true)} disabled={refreshing}>
					{refreshing ? "Recalculando…" : "Recalcular mapa"}
				</Button>
				<ToggleButtonGroup size="small" exclusive value={period} onChange={(_, v) => v && setPeriod(v)}>
					{(["7", "30", "90", "all"] as JourneyPeriod[]).map((p) => (
						<ToggleButton key={p} value={p}>
							{PERIOD_LABEL[p]}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
				<FormControlLabel
					control={<Switch size="small" checked={showHistorial} onChange={(e) => setShowHistorial(e.target.checked)} />}
					label="Historial"
				/>
				<FormControlLabel
					control={<Switch size="small" checked={showStrategy} onChange={(e) => setShowStrategy(e.target.checked)} />}
					label="Estrategia"
				/>
				{data && (
					<Typography variant="caption" color="textSecondary">
						Calculado {new Date(data.generatedAt).toLocaleString("es-AR")} · se actualiza cada hora. Solo conteos en el mapa.
					</Typography>
				)}
			</Box>

			{lookupMsg && (
				<Alert severity="warning" sx={{ mb: 2 }} onClose={() => setLookupMsg(null)}>
					{lookupMsg}
				</Alert>
			)}
			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{loading && !data ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			) : (
				data && (
					<>
						{exclusivityTotal === 0 ? (
							<Alert severity="success" sx={{ mb: 2 }}>
								Exclusividad: ningún contacto está en más de una campaña activa del mismo tipo.
							</Alert>
						) : (
							<Alert severity="error" sx={{ mb: 2 }}>
								Exclusividad rota:{" "}
								{Object.entries(data.exclusivity)
									.filter(([, e]) => e.count > 0)
									.map(([tipo, e]) => `${e.count} en ${tipo}`)
									.join(" · ")}
								. Ejemplo:{" "}
								{Object.values(data.exclusivity)
									.flatMap((e) => e.sample)
									.slice(0, 3)
									.map((id) => (
										<Button key={id} size="small" onClick={() => runLookup(id)}>
											{id.slice(-6)}
										</Button>
									))}
							</Alert>
						)}

						{data.checks && data.checks.length > 0 && (
							<JourneyChecks
								checks={data.checks}
								onLookup={(id) => {
									setQuery(id);
									runLookup(id);
								}}
								onOpenCampaign={setOpenCampaign}
							/>
						)}

						<JourneyMap data={data} selected={selected} highlight={highlight} period={period} onSelect={setSelected} />

						{lookup && (
							<Box sx={{ mt: 2 }}>
								<JourneyLookupCard data={lookup} />
							</Box>
						)}

						<Box sx={{ mt: 2 }}>
							{selected ? (
								<JourneyNodePanel
									data={data}
									node={selected}
									highlightCampaigns={lookup?.highlight.campaignIds || []}
									onOpenCampaign={setOpenCampaign}
									onLookup={(id) => {
										setQuery(id);
										runLookup(id);
										window.scrollTo({ top: 0, behavior: "smooth" });
									}}
								/>
							) : (
								<Typography variant="body2" color="textSecondary">
									Hacé clic en una etapa del mapa para ver sus campañas, las condiciones de entrada y las fugas.
								</Typography>
							)}
						</Box>

						{data.v2Error && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								No se pudieron calcular las estadísticas por paso: {data.v2Error}
							</Alert>
						)}
						{data.v2 && showStrategy && (
							<Box sx={{ mt: 2 }}>
								<JourneyStrategy v2={data.v2} period={period} onOpen={setOpenCampaign} />
							</Box>
						)}
						{data.v2 && showHistorial && (
							<Box sx={{ mt: 2 }}>
								<JourneyHistorial v2={data.v2} onOpen={setOpenCampaign} />
							</Box>
						)}
						{data.v2 && openCampaign && (
							<JourneyCampaignDetail
								campaign={data.v2.campaigns[openCampaign] ?? null}
								period={period}
								onClose={() => setOpenCampaign(null)}
							/>
						)}
					</>
				)
			)}
		</MainCard>
	);
};

export default Recorrido;
