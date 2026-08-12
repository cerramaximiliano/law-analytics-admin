import { useState } from "react";
import { Box, Button, Chip, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import MainCard from "components/MainCard";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";
import FlowDiagram from "./FlowDiagram";
import { mainSpecs, escenarios } from "./flowData";
import { FlowSpec } from "./flowTypes";

// Leyenda de colores compartida por todos los diagramas
const LEGEND_ITEMS: { label: string; color: string; dashed?: boolean }[] = [
	{ label: "Usuario / server / UI", color: BRAND_BLUE },
	{ label: "Workers públicos (captcha)", color: STALE_AMBER },
	{ label: "Workers con credencial", color: "#8B5CF6" },
	{ label: "Colecciones / externos", color: "#64748B" },
	{ label: "Estado sano", color: LIVE_GREEN },
	{ label: "A vigilar", color: "#F97316", dashed: true },
	{ label: "Problema / bug", color: "#EF4444" },
];

const Legend = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.75 }}>
			{LEGEND_ITEMS.map((item) => (
				<Chip
					key={item.label}
					size="small"
					label={item.label}
					sx={{
						fontSize: 11,
						bgcolor: alpha(item.color, isDark ? 0.16 : 0.08),
						border: `1px ${item.dashed ? "dashed" : "solid"} ${alpha(item.color, 0.5)}`,
						color: theme.palette.text.primary,
					}}
				/>
			))}
		</Stack>
	);
};

// Card de un diagrama con navegación por pasos
const DiagramCard = ({ spec }: { spec: FlowSpec }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [stepIndex, setStepIndex] = useState(0);
	const step = spec.steps[stepIndex];

	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary">
				{spec.intro}
			</Typography>

			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
				<Button
					size="small"
					variant="outlined"
					startIcon={<ArrowLeft2 size={14} />}
					disabled={stepIndex === 0}
					onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
				>
					Anterior
				</Button>
				<Button
					size="small"
					variant="outlined"
					endIcon={<ArrowRight2 size={14} />}
					disabled={stepIndex === spec.steps.length - 1}
					onClick={() => setStepIndex((i) => Math.min(spec.steps.length - 1, i + 1))}
				>
					Siguiente
				</Button>
				{spec.steps.map((s, i) => (
					<Chip
						key={i}
						size="small"
						label={`${i === 0 ? "" : `${i} · `}${s.title}`}
						onClick={() => setStepIndex(i)}
						color={i === stepIndex ? "primary" : "default"}
						variant={i === stepIndex ? "filled" : "outlined"}
						sx={{ fontSize: 11 }}
					/>
				))}
			</Stack>

			<FlowDiagram spec={spec} activeNodes={step.nodes} activeEdges={step.edges} />

			<Box
				sx={{
					px: 2,
					py: 1.5,
					borderRadius: 1.5,
					bgcolor: alpha(BRAND_BLUE, isDark ? 0.12 : 0.05),
					border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.3 : 0.16)}`,
				}}
			>
				<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
					{step.title}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					{step.text}
				</Typography>
			</Box>
		</Stack>
	);
};

const EscenariosTab = () => {
	const [scenarioIndex, setScenarioIndex] = useState(0);
	const spec = escenarios[scenarioIndex];
	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary">
				Las causas tienen id único (fuero + número/año) para permitir reutilización entre usuarios y credenciales, pero eso implica que un
				mismo documento puede ser tocado por el mundo público y el privado, en cualquier orden. Estos cuatro escenarios cubren las
				combinaciones y sus problemas conocidos.
			</Typography>
			<ToggleButtonGroup
				exclusive
				size="small"
				value={scenarioIndex}
				onChange={(_e, v) => {
					if (v !== null) setScenarioIndex(v);
				}}
				sx={{ flexWrap: "wrap" }}
			>
				{escenarios.map((s, i) => (
					<ToggleButton key={s.id} value={i} sx={{ fontSize: 12, textTransform: "none" }}>
						{s.title}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
			<DiagramCard key={spec.id} spec={spec} />
		</Stack>
	);
};

// Trabajo pendiente del flujo de causas — se actualiza a medida que se
// implementan las etapas. Rediseño de causas privadas (Fases A-D) COMPLETADO
// el 2026-08-11/12: promoción de isValid, access por credencial, ruteo dual,
// enforcement backend (403 CAUSA_RESERVED) y gates 'reserved' en el front.
const PENDING_ITEMS: { title: string; detail: string }[] = [
	{
		title: "Write-back del caché al re-verificar",
		detail:
			"Cuando una copia inválida del caché se re-verifica como pública (import la ignora y verify la valida), actualizar la copia del caché (Mongo local de worker_01, vía verify-worker) con los datos frescos + entrada en updateHistory documentando la transición. Definido, sin implementar — etapa diferida.",
	},
	{
		title: "Notificación de credencial caída",
		detail:
			"Cuando una credencial pasa a disabled y deja causas privadas sin acceso (folders → 'reserved'), avisar al usuario por email que necesita reconectarla. Hoy el estado es visible pero el aviso es pasivo.",
	},
	{
		title: "Formalizar campos nuevos en pjn-models",
		detail:
			"access/accessChangedAt (linkedCredentials), privateSuspectCount/privateSuspectAt/privateRecheckAt y causaCredentialCovered (Folder) se escriben hoy con strict:false. Agregarlos al schema en el próximo bump del paquete.",
	},
	{
		title: "Mapeo del 403 CAUSA_RESERVED en el viewer (cosmético)",
		detail:
			"El gate 'reserved' bloquea el detalle antes de llegar al viewer de movimientos, así que el 403 del backend rara vez se ve; mapearlo explícitamente en el front es defensa secundaria pendiente.",
	},
	{
		title: "Verificación de resultados (~1 semana desde el 2026-08-11)",
		detail:
			"Chequear que: la vista 'No Verificadas' quede casi vacía (promoción), el stock de ~431 isPrivate:true baje a las reservadas genuinas (re-test cada 3 días), y los folders descubiertos (~167) rendericen bien el gate 'reserved'.",
	},
];

const PendingWork = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Box
			sx={{
				mt: 3,
				px: 2,
				py: 1.5,
				borderRadius: 1.5,
				bgcolor: alpha(STALE_AMBER, isDark ? 0.1 : 0.05),
				border: `1px dashed ${alpha(STALE_AMBER, isDark ? 0.45 : 0.35)}`,
			}}
		>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				⏳ Pendientes del flujo (próximas etapas)
			</Typography>
			<Stack spacing={1}>
				{PENDING_ITEMS.map((item) => (
					<Box key={item.title}>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							{item.title}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{item.detail}
						</Typography>
					</Box>
				))}
			</Stack>
		</Box>
	);
};

const FlujosCausas = () => {
	const [tab, setTab] = useState(0);
	const isEscenarios = tab === mainSpecs.length;

	return (
		<MainCard
			title="Flujos de vida de causas y folders (PJN)"
			secondary={<Legend />}
			content={false}
			sx={{ "& .MuiCardHeader-root": { flexWrap: "wrap", rowGap: 1 } }}
		>
			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
				<Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
					{mainSpecs.map((spec) => (
						<Tab key={spec.id} label={spec.title} sx={{ textTransform: "none" }} />
					))}
					<Tab label="Escenarios duales" sx={{ textTransform: "none" }} />
				</Tabs>
			</Box>
			<Box sx={{ p: { xs: 2, md: 3 } }}>
				{isEscenarios ? <EscenariosTab /> : <DiagramCard key={mainSpecs[tab].id} spec={mainSpecs[tab]} />}
				<PendingWork />
			</Box>
		</MainCard>
	);
};

export default FlujosCausas;
