// Worker CIJur — Centro de Información Jurídica del Ministerio Público de
// Buenos Aires. Vigila la sección "Actualidad en Jurisprudencia" en sus dos
// canales, provincial y nacional.
//
// Es una selección CURADA (~1 fallo por mes y por canal), no un repositorio
// exhaustivo: complementa a SAIJ, que aporta volumen crudo. Al crearse este
// worker teníamos 32.608 fallos bonaerenses vía SAIJ pero ninguno posterior a
// 2018, porque el backfill provincial de SAIJ venía por 1991.

import { useCallback, useEffect, useState } from "react";
import { Box, Card, CardContent, Stack, Tab, Tabs, Typography } from "@mui/material";
import MainCard from "components/MainCard";
import { CijurProgressResponse, CijurWorkerConfig, getCijurConfigs, getCijurProgress } from "api/cijur";
import CijurWorkersFlow from "pages/admin/flujos/CijurWorkersFlow";
import EstadoTab from "./EstadoTab";
import FallosTab from "./FallosTab";
import ConfigTab from "./ConfigTab";

export default function CijurWorkerPage() {
	const [tab, setTab] = useState(0);
	const [progress, setProgress] = useState<CijurProgressResponse["data"] | null>(null);
	const [config, setConfig] = useState<CijurWorkerConfig | null>(null);
	const [error, setError] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		try {
			const [p, c] = await Promise.all([getCijurProgress(), getCijurConfigs()]);
			setProgress(p.data);
			setConfig(c.data[0] || null);
			setError(null);
		} catch (e: any) {
			setError(e?.message || "No se pudo cargar el estado de CIJur");
		}
	}, []);

	useEffect(() => {
		cargar();
		// El worker corre una vez por día: refrescar cada minuto sería ruido.
		const t = setInterval(cargar, 5 * 60 * 1000);
		return () => clearInterval(t);
	}, [cargar]);

	return (
		<MainCard
			title={
				<Stack>
					<Typography variant="h5">Worker CIJur</Typography>
					<Typography variant="caption" color="text.secondary">
						Actualidad en Jurisprudencia del Ministerio Público de Buenos Aires — selección curada, ~1 fallo por mes y por canal
					</Typography>
				</Stack>
			}
		>
			{error && (
				<Card variant="outlined" sx={{ mb: 2 }}>
					<CardContent>
						<Typography variant="body2" color="error">
							{error}
						</Typography>
					</CardContent>
				</Card>
			)}

			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
				<Tab label="Estado" />
				<Tab label="Fallos" />
				<Tab label="Configuración" />
				<Tab label="Flujo" />
			</Tabs>

			<Box>
				{tab === 0 && <EstadoTab progress={progress} />}
				{tab === 1 && <FallosTab />}
				{tab === 2 && <ConfigTab config={config} onChange={cargar} />}
				{tab === 3 && <CijurWorkersFlow />}
			</Box>
		</MainCard>
	);
}
