import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Chip, Link, Skeleton, Stack, Typography } from "@mui/material";
import integrationsConfigService, { IntegrationsConfigDoc } from "api/integrationsConfig";
import { INTEGRATIONS_PATH } from "utils/managedPlanFeatures";

// Panel de solo lectura de la vista de planes: servicios que afectan lo que
// ofrece un plan pero se administran desde Integraciones (equipos, conectores
// MCP y chat con IA sobre el expediente). Acá solo se ve su estado.

type EnabledByEnv = { development: boolean; production: boolean };

function toEnabledByEnv(e: unknown): EnabledByEnv {
	if (typeof e === "boolean") return { development: e, production: e };
	if (e && typeof e === "object") {
		const obj = e as { development?: unknown; production?: unknown };
		return { development: obj.development === true, production: obj.production === true };
	}
	return { development: false, production: false };
}

const envChip = (label: string, on: boolean) => (
	<Chip
		key={label}
		size="small"
		label={`${label}: ${on ? "habilitado" : "apagado"}`}
		color={on ? "success" : "default"}
		variant={on ? "filled" : "outlined"}
	/>
);

const ManagedServicesPanel = () => {
	const [doc, setDoc] = useState<IntegrationsConfigDoc | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		integrationsConfigService
			.getConfig()
			.then((res) => {
				if (!cancelled) setDoc(res.data);
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const services = doc?.services;
	const groups = toEnabledByEnv(services?.groups?.enabled);
	const claude = toEnabledByEnv(services?.claudeAi?.enabled);
	const chatGpt = toEnabledByEnv(services?.chatGpt?.enabled);
	const chat = toEnabledByEnv(services?.expedienteChat?.enabled);

	const rows: { title: string; detail: string; chips: JSX.Element[] }[] = [
		{
			title: "Equipos",
			detail: "Característica de plan: teams",
			chips: [envChip("Servicio", groups.production)],
		},
		{
			title: "Conectores MCP (Claude.ai / ChatGPT)",
			detail: "Add-on: mcp_access",
			chips: [
				envChip("Claude dev", claude.development),
				envChip("Claude prod", claude.production),
				envChip("ChatGPT dev", chatGpt.development),
				envChip("ChatGPT prod", chatGpt.production),
			],
		},
		{
			title: "Chat con IA sobre el expediente",
			detail: "Característica de plan: expediente_chat",
			chips: [
				envChip("Dev", chat.development),
				envChip("Prod", chat.production),
				<Chip
					key="stage"
					size="small"
					variant="outlined"
					label={`Etapa: ${services?.expedienteChat?.releaseStage === "stable" ? "stable" : "beta"}`}
				/>,
			],
		},
	];

	return (
		<Box sx={{ p: 2, borderRadius: 1.5, border: 1, borderColor: "divider" }}>
			<Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.5} sx={{ mb: 1.5 }}>
				<Typography variant="h5">Servicios gestionados desde Integraciones</Typography>
				<Link component={RouterLink} to={INTEGRATIONS_PATH} variant="body2">
					Ir a Integraciones
				</Link>
			</Stack>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
				Estos servicios se muestran acá solo como referencia. Se habilitan y deshabilitan desde Integraciones; en los planes sus
				características no se pueden editar.
			</Typography>
			{loading ? (
				<Skeleton variant="rounded" height={96} />
			) : failed ? (
				<Typography variant="body2" color="error">
					No se pudo cargar el estado de los servicios.
				</Typography>
			) : (
				<Stack spacing={1.25}>
					{rows.map((row) => (
						<Stack
							key={row.title}
							direction={{ xs: "column", md: "row" }}
							spacing={1}
							alignItems={{ md: "center" }}
							justifyContent="space-between"
						>
							<Box>
								<Typography variant="subtitle2">{row.title}</Typography>
								<Typography variant="caption" color="text.secondary">
									{row.detail}
								</Typography>
							</Box>
							<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
								{row.chips}
							</Stack>
						</Stack>
					))}
				</Stack>
			)}
		</Box>
	);
};

export default ManagedServicesPanel;
