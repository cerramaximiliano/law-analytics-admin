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
import ScbaWorkersFlow from "./ScbaWorkersFlow";
import SaijWorkersFlow from "./SaijWorkersFlow";
import SaijApareoFlow from "./SaijApareoFlow";
import CijurWorkersFlow from "./CijurWorkersFlow";
import PostalWorkersFlow from "./PostalWorkersFlow";
import MisCausasWorkersFlow from "./MisCausasWorkersFlow";
import MisCausasRepoFlow from "./MisCausasRepoFlow";
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
		label: "Workers SCBA",
		intro:
			"El pipeline completo de SCBA: de la credencial del usuario a la notificación del movimiento. El diagrama lee la configuración en vivo (updatePolicy) y redibuja la partición del update — en 'unified' el worker de archivadas aparece ocioso.",
		href: "/admin/workers/mev",
		hrefLabel: "Operar el SCBA manager (pestaña SCBA)",
	},
	{
		label: "pjn-mis-causas (repo)",
		intro:
			"El mapa completo del repositorio: sus 13 procesos y cómo se encadenan alrededor de la credencial del usuario — verificarla, traer sus causas, mantenerlas al día, leer su bandeja y vigilar que nada se caiga.",
		href: "/admin/causas/workers",
		hrefLabel: "Operar los workers de pjn-mis-causas",
	},
	{
		label: "Causas PJN por credencial",
		intro:
			"Los dos workers que llevan una fila del listado de Mis Causas hasta una carpeta: la sync completa del alta de credencial y la pasada diaria. Incluye las tres bifurcaciones que dejaban huecos silenciosos — las filas sin prefijo de fuero, quién decide que una causa falta, y el techo del plan.",
		href: "/admin/causas/workers",
		hrefLabel: "Operar los workers de pjn-mis-causas",
	},
	{
		label: "Workers SAIJ",
		intro:
			"Los cuatro canales de captura de jurisprudencia de SAIJ — nacional, provincial, Corte Suprema y el backfill histórico — que comparten el mismo código y se diferencian solo por configuración. Solo el nacional alimenta el pipeline PJN y las campañas a usuarios.",
		href: "/admin/workers/saij",
		hrefLabel: "Operar los workers SAIJ",
	},
	{
		label: "Apareo SAIJ",
		intro:
			"Qué pasa con un fallo nacional después de capturado: el linker con sus cinco gates, la herencia de identidad hacia SentenciaCapturada (carátula, expediente, causaId — de la causa; el texto — del fallo), y la conciliación que deshace un apareo equivocado hasta el embedding.",
		href: "/admin/saij/conciliacion",
		hrefLabel: "Abrir la vista de conciliación",
	},
	{
		label: "Worker postal",
		intro:
			"El pipeline del seguimiento postal (Correo Argentino): del alta de la pieza al email de novedades — el manager encola los vencidos, los scraper-workers efímeros consultan el portal ONDNC y la-notification entrega al usuario. Incluye el circuito de alerta operativa al admin cuando el pipeline deja de actualizar.",
		href: "/admin/workers/scraper",
		hrefLabel: "Operar el worker postal",
	},
	{
		label: "Worker CIJur",
		intro:
			"La captura de la selección curada del Ministerio Público de Buenos Aires: dos canales, backfill una sola vez y vigilancia diaria. El sitio no corta la paginación con 404 y duplica cada fallo en el HTML — las dos cosas condicionan el diseño.",
		href: "/admin/workers/cijur",
		hrefLabel: "Operar el worker CIJur",
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
					Los diagramas que documentan cómo se mueve el dato, juntos. Cada uno sigue viviendo en su sección —acá están para poder
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

					{tab === 3 && <ScbaWorkersFlow />}

					{tab === 4 && <MisCausasRepoFlow />}

					{tab === 5 && <MisCausasWorkersFlow />}

					{tab === 6 && <SaijWorkersFlow />}

					{tab === 7 && <SaijApareoFlow />}

					{tab === 8 && <PostalWorkersFlow />}

					{tab === 9 && <CijurWorkersFlow />}

					{tab === 10 && (
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
