import { Paper, Typography } from "@mui/material";
import MainCard from "components/MainCard";
import SentenciasWorkerTab from "./SentenciasWorkerTab";

export default function SentenciasWorkerPage() {
	return (
		<MainCard title="Sentencias Capturadas">
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="body2" color="text.secondary" mb={2}>
					Monitoreo del pipeline de captura y extracción de sentencias judiciales detectadas por el worker de
					actualización de movimientos.
				</Typography>
				<SentenciasWorkerTab />
			</Paper>
		</MainCard>
	);
}
