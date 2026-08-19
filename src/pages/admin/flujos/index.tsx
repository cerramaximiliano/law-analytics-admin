// Índice de flujos del ecosistema.
//
// Reúne en una sola vista los diagramas que hasta ahora vivían sueltos en
// secciones distintas del admin (causas, notificaciones, data plane) y suma el
// de sentencias, que no tenía casa. La idea es que funcione como documentación:
// entrás acá para entender cómo se mueve el dato, y desde cada pestaña saltás a
// la vista completa donde ese flujo se opera.
//
// NO duplica los diagramas: reusa los mismos componentes que renderizan las
// vistas originales, así un cambio en el flujo se refleja en los dos lugares.
// El data plane es la excepción y está explicado abajo.

import React, { useState } from "react";
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { ExportSquare, Hierarchy } from "iconsax-react";
import MainCard from "components/MainCard";
import { BRAND_BLUE } from "themes/dashboardTokens";

import SentenciasFlow from "./SentenciasFlow";
import CausasFlowDiagram from "../causas/flujos/FlowDiagram";
import { mainSpecs } from "../causas/flujos/flowData";
import NotificationsFlowDiagram from "../notifications/components/FlowDiagram";
import useLiveJudicialConfig from "../notifications/components/useLiveJudicialConfig";

interface FlowTab {
	label: string;
	/** Qué responde este flujo, en una línea. */
	intro: string;
	/** Vista donde ese flujo se opera (no solo se documenta). */
	href: string;
	hrefLabel: string;
}

const TABS: FlowTab[] = [
	{
		label: "Sentencias",
		intro:
			"De la captura en el portal al consumo: cómo entra una sentencia (por movimiento nuevo, por barrido histórico o desde SAIJ), qué worker la procesa en cada estado, cómo se vectoriza y quién la consulta.",
		href: "/admin/workers/sentencias",
		hrefLabel: "Operar los workers de sentencias",
	},
	{
		label: "Causas y folders",
		intro:
			"El ciclo de vida de una causa: cómo se da de alta desde la app o con credencial, cuándo pasa a ser pública o privada, y qué la mantiene actualizada.",
		href: "/admin/causas/flujos",
		hrefLabel: "Abrir la vista completa (con escenarios paso a paso)",
	},
	{
		label: "Notificaciones",
		intro:
			"Qué dispara un aviso, qué emisor lo manda y qué kill-switches lo pueden frenar. El diagrama refleja la configuración en vivo, así que cambia si alguien toca la config.",
		href: "/admin/notifications/flow",
		hrefLabel: "Abrir la vista completa (config en vivo por emisor)",
	},
	{
		label: "Data plane",
		intro:
			"La infraestructura por debajo de todo lo anterior: el replica set rs0, Qdrant, las APIs y quién lee de dónde. Es el plano físico; los otros tres son el plano lógico.",
		href: "/admin/infrastructure/dataflow",
		hrefLabel: "Abrir el diagrama del data plane",
	},
];

const FlujosEcosistema: React.FC = () => {
	const theme = useTheme();
	const [tab, setTab] = useState(0);
	const live = useLiveJudicialConfig();
	const current = TABS[tab];

	return (
		<MainCard
			title={
				<Stack direction="row" spacing={1} alignItems="center">
					<Hierarchy size={20} color={BRAND_BLUE} />
					<span>Flujos del ecosistema</span>
				</Stack>
			}
			content={false}
		>
			<Box sx={{ p: 3, pb: 0 }}>
				<Typography variant="body2" color="text.secondary">
					Los cuatro diagramas que documentan cómo se mueve el dato, juntos. Cada uno sigue viviendo en su sección —acá están para poder
					leerlos de corrido— y desde cada pestaña se salta a la vista donde ese flujo se opera.
				</Typography>
			</Box>

			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 2 }}>
				<Tabs
					value={tab}
					onChange={(_, v) => setTab(v)}
					variant="scrollable"
					scrollButtons="auto"
					allowScrollButtonsMobile
					TabIndicatorProps={{ sx: { height: 2.5, backgroundColor: BRAND_BLUE } }}
					sx={{
						"& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.875rem" },
						"& .Mui-selected": { fontWeight: 600, color: BRAND_BLUE + " !important" },
					}}
				>
					{TABS.map((t) => (
						<Tab key={t.label} label={t.label} />
					))}
				</Tabs>
			</Box>

			<Box sx={{ p: 3 }}>
				<Stack spacing={2}>
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={1.5}
						alignItems={{ xs: "flex-start", sm: "center" }}
						justifyContent="space-between"
					>
						<Typography variant="body2" color="text.secondary" sx={{ maxWidth: 780 }}>
							{current.intro}
						</Typography>
						<Button
							size="small"
							variant="outlined"
							component={RouterLink}
							to={current.href}
							endIcon={<ExportSquare size={15} />}
							sx={{ flexShrink: 0 }}
						>
							{current.hrefLabel}
						</Button>
					</Stack>

					{tab === 0 && <SentenciasFlow />}

					{tab === 1 && (
						<Stack spacing={3}>
							{mainSpecs.map((spec) => (
								<Box key={spec.id}>
									<Typography variant="subtitle2" fontWeight={600} gutterBottom>
										{spec.title}
									</Typography>
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
										{spec.intro}
									</Typography>
									<CausasFlowDiagram spec={spec} />
								</Box>
							))}
						</Stack>
					)}

					{tab === 2 && <NotificationsFlowDiagram live={live} />}

					{tab === 3 && (
						// El data plane no se embebe: es una página con panel de detalle propio
						// y su valor está en poder clickear cada nodo. Duplicar acá una versión
						// recortada daría dos fuentes de verdad para el mismo diagrama.
						<Alert
							severity="info"
							variant="outlined"
							action={
								<Button size="small" component={RouterLink} to="/admin/infrastructure/dataflow" endIcon={<ExportSquare size={15} />}>
									Abrir
								</Button>
							}
						>
							El diagrama del data plane es interactivo (cada nodo abre su ficha) y vive en su propia página. Se abre desde acá en lugar de
							duplicarlo, para no tener dos versiones del mismo esquema.
						</Alert>
					)}

					<Box
						sx={{
							p: 1.5,
							borderRadius: 2,
							bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.06 : 0.03),
							border: `1px solid ${theme.palette.divider}`,
						}}
					>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
							<Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
								Los otros flujos:
							</Typography>
							{TABS.map((t, i) =>
								i === tab ? null : (
									<Chip
										key={t.label}
										size="small"
										variant="outlined"
										label={t.label}
										onClick={() => setTab(i)}
										sx={{ cursor: "pointer" }}
									/>
								),
							)}
						</Stack>
					</Box>
				</Stack>
			</Box>
		</MainCard>
	);
};

export default FlujosEcosistema;
