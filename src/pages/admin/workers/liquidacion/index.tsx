import { useCallback, useEffect, useState } from "react";
import { Box, Chip, Stack, Tab, Tabs, Typography, alpha, useTheme } from "@mui/material";
import MainCard from "components/MainCard";
import { useSnackbar } from "notistack";
import LiquidacionWorkerConfigService, { FullDoc } from "api/liquidacionWorkerConfig";
import ConfigTab from "./ConfigTab";
import StatusTab from "./StatusTab";
import AlertsTab from "./AlertsTab";
import DocumentsTab from "./DocumentsTab";

export default function LiquidacionWorkerPage() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [tab, setTab] = useState(0);
	const [doc, setDoc] = useState<FullDoc | null>(null);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(async () => {
		try {
			setLoading(true);
			const data = await LiquidacionWorkerConfigService.getFull();
			setDoc(data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando configuración", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	// Auto-refresh sólo en la tab de Estado (cada 15s)
	useEffect(() => {
		if (tab !== 1) return;
		const id = setInterval(refetch, 15000);
		return () => clearInterval(id);
	}, [tab, refetch]);

	const activeAlerts = (doc?.alerts || []).filter((a) => !a.acknowledged).length;

	return (
		<MainCard>
			<Stack spacing={2}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
					<Box>
						<Typography variant="h3">Worker Liquidación Previsional</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
							Pipeline de extracción de liquidaciones previsionales (haber caja / reajustado / retroactivo) adjuntas en causas CSS (s/REAJUSTES VARIOS)
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
						<Box
							component="span"
							sx={{
								display: "inline-flex",
								alignItems: "center",
								px: 1,
								py: 0.25,
								borderRadius: 1,
								bgcolor: theme.palette.grey[800],
								color: theme.palette.common.white,
								fontSize: "0.65rem",
								fontWeight: 500,
								fontFamily: "monospace",
								letterSpacing: "0.5px",
							}}
						>
							worker_01
						</Box>
						<Box
							component="span"
							sx={{
								display: "inline-flex",
								alignItems: "center",
								px: 0.75,
								py: 0.25,
								borderRadius: 1,
								bgcolor: alpha(theme.palette.info.main, 0.1),
								color: theme.palette.info.main,
								fontSize: "0.6rem",
								fontWeight: 500,
								fontFamily: "monospace",
							}}
						>
							100.111.73.56
						</Box>
						<Chip
							label="3 PM2 · pjn-liq-{manager,url-extractor,pdf-processor}"
							size="small"
							color="secondary"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
						/>
						<Chip
							label="previsional-liquidacion-urls · local"
							size="small"
							color="info"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
						/>
					</Stack>
				</Stack>

				<Tabs value={tab} onChange={(_, v) => setTab(v)}>
					<Tab label="Configuración" />
					<Tab label="Estado" />
					<Tab label="Documentos" />
					<Tab label={`Alertas${activeAlerts > 0 ? ` (${activeAlerts})` : ""}`} />
				</Tabs>

				{tab === 0 && <ConfigTab doc={doc} loading={loading} onSaved={refetch} />}
				{tab === 1 && <StatusTab doc={doc} loading={loading} onRefresh={refetch} />}
				{tab === 2 && <DocumentsTab />}
				{tab === 3 && <AlertsTab doc={doc} loading={loading} onChanged={refetch} />}
			</Stack>
		</MainCard>
	);
}
