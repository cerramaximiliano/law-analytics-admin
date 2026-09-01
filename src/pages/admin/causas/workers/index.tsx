import React from "react";
import { useState } from "react";
import {
	Box,
	Typography,
	Stack,
	useTheme,
	alpha,
	IconButton,
	Tooltip,
	Popover,
	ButtonBase,
	Divider,
	Select,
	MenuItem,
	ListSubheader,
} from "@mui/material";
import {
	TickSquare,
	SearchNormal1,
	DocumentUpload,
	InfoCircle,
	People,
	Warning2,
	SecurityUser,
	Lock1,
	Gallery,
	Refresh2,
	Book1,
	RefreshSquare,
} from "iconsax-react";
import MainCard from "components/MainCard";
import { BRAND_BLUE, headerBorder, navActiveBg, navHoverBg, railBorder, LIVE_PULSE_KEYFRAMES } from "themes/dashboardTokens";
import { useTabParam } from "hooks/useTabParam";
import VerificationWorker from "./VerificationWorker";
import ScrapingWorker from "./ScrapingWorker";
import AppUpdateWorker from "./AppUpdateWorker";
import IntervinientesWorker from "./IntervinientesWorker";
import StuckDocumentsWorker from "./StuckDocumentsWorker";
import RetryQueuePanel from "./RetryQueuePanel";
import MisCausasScrapingWorker from "./MisCausasScrapingWorker";
import MisCausasUpdatesWorker from "./MisCausasUpdatesWorker";
import PrivacyCheckerWorker from "./PrivacyCheckerWorker";
import CaptchaDatasetTab from "./CaptchaDatasetTab";
import DocumentationTab from "./documentation";
import { VerDatosLink } from "components/admin/CrossViewLink";

interface WorkerTab {
	label: string;
	value: string;
	icon: React.ReactNode;
	description: string;
	status?: "active" | "inactive" | "error";
	/** Host donde corre el proceso PM2. */
	host?: string;
	ip?: string;
	/**
	 * Vista de datos que produce este worker, si tiene una. El link cruzado lo
	 * dibuja la franja de contexto: así el par datos↔worker se declara una vez
	 * acá y no lo reimplementa cada panel.
	 */
	dataView?: { to: string; label?: string; tooltip?: string };
}

// El rail agrupa por etapa del pipeline, no por orden histórico de aparición:
// un worker se busca por lo que hace ("¿dónde configuro la captura?"), no por
// su posición en una fila de tabs.
const WORKER_TABS: WorkerTab[] = [
	{
		label: "Scraping PJN",
		value: "scraping",
		icon: <SearchNormal1 size={20} />,
		description: "Busca y recopila nuevas causas judiciales en el portal público del PJN",
		status: "active",
		host: "worker_01",
		ip: "100.111.73.56",
	},
	{
		label: "Retry",
		value: "retry",
		icon: <Refresh2 size={20} />,
		description: "Reintenta expedientes cuyo captcha falló y descarta los que agotaron los intentos",
		status: "active",
		host: "worker_01",
		ip: "100.111.73.56",
	},
	{
		label: "Captcha dataset",
		value: "captcha-dataset",
		icon: <Gallery size={20} />,
		description: "Imágenes de captcha capturadas para entrenar un OCR propio",
		status: "active",
		host: "worker_01",
		ip: "100.111.73.56",
	},
	{
		label: "Verificación",
		value: "verification",
		icon: <TickSquare size={20} />,
		description: "Verifica que las causas capturadas existan y estén bien identificadas",
		status: "active",
		host: "app",
		ip: "18.228.63.73",
	},
	{
		label: "Actualización",
		value: "app-update",
		icon: <DocumentUpload size={20} />,
		description: "Mantiene actualizados los documentos de causas judiciales vía la API del PJN",
		status: "active",
		host: "app",
		ip: "18.228.63.73",
		dataView: {
			to: "/admin/causas/update-eligible?fuente=atlas",
			tooltip: "Ir a las causas elegibles de Atlas, la cola que consume este worker",
		},
	},
	{
		label: "Intervinientes",
		value: "intervinientes",
		icon: <People size={20} />,
		description: "Extrae partes y letrados de cada causa desde el PJN",
		status: "active",
		host: "app",
		ip: "18.228.63.73",
	},
	{
		label: "Stuck documents",
		value: "stuck-documents",
		icon: <Warning2 size={20} />,
		description: "Procesa documentos verificados que quedaron sin movimientos guardados",
		status: "active",
		host: "app",
		ip: "18.228.63.73",
	},
	{
		label: "Mis Causas · Scraping",
		value: "mis-causas",
		icon: <SecurityUser size={20} />,
		description: "Captura de causas desde el portal autenticado del PJN (login SSO)",
		status: "active",
		host: "worker-cloud-02",
		ip: "100.102.208.69",
	},
	{
		label: "Mis Causas · Updates",
		value: "mis-causas-updates",
		icon: <RefreshSquare size={20} />,
		description: "Actualización de las causas ya capturadas del portal autenticado",
		status: "active",
		host: "worker-cloud-02",
		ip: "100.102.208.69",
	},
	{
		label: "Privacy checker",
		value: "privacy-checker",
		icon: <Lock1 size={20} />,
		description: "Detecta causas que pasaron a estado reservado y mantiene el flag automáticamente",
		status: "active",
		host: "app",
		ip: "18.228.63.73",
	},
	{
		label: "Documentación",
		value: "documentation",
		icon: <Book1 size={20} />,
		description: "Diagramas de arquitectura de los workers PJN y del flujo dual-write de movimientos",
	},
];

const WORKER_GROUPS: { label: string; values: string[] }[] = [
	{ label: "Captura", values: ["scraping", "retry", "captcha-dataset"] },
	{ label: "Enriquecimiento", values: ["verification", "app-update", "intervinientes", "stuck-documents"] },
	{ label: "Portal autenticado", values: ["mis-causas", "mis-causas-updates"] },
	{ label: "Cumplimiento", values: ["privacy-checker"] },
];

// Documentación no es un worker: va al pie del rail, separada del pipeline.
const PINNED_VALUES = ["documentation"];

const WORKER_VALUES = WORKER_TABS.map((t) => t.value);
// Al cambiar de worker se limpia `tab`: el sub-tab del anterior no aplica al nuevo.
const WORKER_RESETS = ["tab"] as const;

const PANELS: Record<string, React.ReactNode> = {
	scraping: <ScrapingWorker />,
	retry: <RetryQueuePanel />,
	"captcha-dataset": <CaptchaDatasetTab />,
	verification: <VerificationWorker />,
	"app-update": <AppUpdateWorker />,
	intervinientes: <IntervinientesWorker />,
	"stuck-documents": <StuckDocumentsWorker />,
	"mis-causas": <MisCausasScrapingWorker />,
	"mis-causas-updates": <MisCausasUpdatesWorker />,
	"privacy-checker": <PrivacyCheckerWorker />,
	documentation: <DocumentationTab />,
};

const byValue = (value: string) => WORKER_TABS.find((t) => t.value === value)!;

const WorkersConfig = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [activeTab, setActiveTab] = useTabParam("worker", WORKER_VALUES, { resets: WORKER_RESETS });
	const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLButtonElement | null>(null);

	const statusColor = (status?: string) => {
		switch (status) {
			case "active":
				return theme.palette.success.main;
			case "inactive":
				return theme.palette.warning.main;
			case "error":
				return theme.palette.error.main;
			default:
				return theme.palette.grey[500];
		}
	};

	const current = byValue(activeTab);

	const monoChip = (text: string, tone: "neutral" | "info") => (
		<Box
			component="span"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				px: 0.75,
				py: 0.25,
				borderRadius: 0.75,
				bgcolor: tone === "info" ? alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.text.primary, isDark ? 0.16 : 0.07),
				color: tone === "info" ? theme.palette.info.main : theme.palette.text.secondary,
				fontSize: "0.68rem",
				fontWeight: 500,
				fontFamily: "monospace",
				fontVariantNumeric: "tabular-nums",
				letterSpacing: "0.02em",
			}}
		>
			{text}
		</Box>
	);

	const renderRailItem = (tab: WorkerTab) => {
		const selected = tab.value === activeTab;
		const dot = statusColor(tab.status);
		return (
			<ButtonBase
				key={tab.value}
				role="tab"
				aria-selected={selected}
				onClick={() => setActiveTab(tab.value)}
				sx={{
					position: "relative",
					width: "100%",
					justifyContent: "flex-start",
					textAlign: "left",
					gap: 1.25,
					px: 1.75,
					py: 1.1,
					borderRadius: 1.5,
					color: selected ? BRAND_BLUE : theme.palette.text.primary,
					bgcolor: selected ? navActiveBg(isDark) : "transparent",
					transition: "background-color 200ms ease, color 200ms ease",
					"&:hover": { bgcolor: selected ? navActiveBg(isDark) : navHoverBg(isDark) },
					"&:active": { transform: "translateY(1px)" },
					"&:focus-visible": { outline: `2px solid ${alpha(BRAND_BLUE, 0.6)}`, outlineOffset: 2 },
					// Barra de acento a la izquierda del item activo.
					"&::before": selected
						? {
								content: '""',
								position: "absolute",
								left: 0,
								top: 8,
								bottom: 8,
								width: 3,
								borderRadius: 3,
								bgcolor: BRAND_BLUE,
						  }
						: undefined,
				}}
			>
				<Box sx={{ display: "flex", color: selected ? BRAND_BLUE : theme.palette.text.secondary }}>{tab.icon}</Box>
				<Box sx={{ minWidth: 0, flexGrow: 1 }}>
					<Typography variant="body2" fontWeight={selected ? 600 : 500} noWrap>
						{tab.label}
					</Typography>
					{tab.host && (
						<Typography
							variant="caption"
							noWrap
							sx={{ display: "block", fontFamily: "monospace", fontSize: "0.66rem", color: theme.palette.text.secondary }}
						>
							{tab.host}
						</Typography>
					)}
				</Box>
				{tab.status && (
					<Tooltip title={tab.status === "active" ? "Activo" : tab.status === "inactive" ? "Inactivo" : "Error"}>
						<Box sx={{ position: "relative", display: "flex", flexShrink: 0 }}>
							<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dot }} />
							{tab.status === "active" && (
								<Box
									sx={{
										...LIVE_PULSE_KEYFRAMES,
										position: "absolute",
										inset: 0,
										borderRadius: "50%",
										bgcolor: dot,
										animation: "la-live-pulse 2.4s ease-out infinite",
									}}
								/>
							)}
						</Box>
					</Tooltip>
				)}
			</ButtonBase>
		);
	};

	return (
		<MainCard contentSX={{ p: 0 }}>
			{/* Encabezado de la vista */}
			<Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2.5 }}>
				<Stack direction="row" alignItems="center" spacing={1}>
					<Typography
						variant="h3"
						sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
					>
						Workers PJN
					</Typography>
					<Tooltip title="Ver información">
						<IconButton size="small" color="info" onClick={(e) => setInfoAnchorEl(e.currentTarget)}>
							<InfoCircle size={22} />
						</IconButton>
					</Tooltip>
					<Popover
						open={Boolean(infoAnchorEl)}
						anchorEl={infoAnchorEl}
						onClose={() => setInfoAnchorEl(null)}
						anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
						transformOrigin={{ vertical: "top", horizontal: "left" }}
					>
						<Box sx={{ p: 2, maxWidth: 420 }}>
							<Typography variant="subtitle2" fontWeight={600} gutterBottom>
								Cómo se organiza esta vista
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Los workers son procesos automatizados que corren en segundo plano. El panel de la izquierda los agrupa por etapa del
								pipeline: <b>captura</b> trae causas nuevas del portal, <b>enriquecimiento</b> completa los datos de las ya capturadas,{" "}
								<b>portal autenticado</b> cubre Mis Causas y <b>cumplimiento</b> vigila las causas reservadas. El worker y la sección
								abierta quedan en la URL, así que el enlace se puede compartir y sobrevive al refresh.
							</Typography>
						</Box>
					</Popover>
				</Stack>
				<Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: "68ch" }}>
					Configuración y estado de los procesos que alimentan la base de causas del Poder Judicial de la Nación.
				</Typography>
			</Box>

			<Divider sx={{ borderColor: headerBorder(isDark) }} />

			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: "stretch" }}>
				{/* Rail de workers — md+ */}
				<Box
					role="tablist"
					aria-label="Workers"
					sx={{
						display: { xs: "none", md: "block" },
						flexShrink: 0,
						width: { md: 236, lg: 252 },
						borderRight: `1px solid ${railBorder(isDark)}`,
						bgcolor: alpha(BRAND_BLUE, isDark ? 0.03 : 0.015),
						py: 1,
					}}
				>
					{WORKER_GROUPS.map((group) => (
						<Box key={group.label} sx={{ px: 1, pb: 0.5 }}>
							<Typography
								variant="caption"
								sx={{
									display: "block",
									px: 0.75,
									pt: 1.75,
									pb: 0.75,
									fontWeight: 600,
									fontSize: "0.66rem",
									letterSpacing: "0.09em",
									textTransform: "uppercase",
									color: theme.palette.text.secondary,
								}}
							>
								{group.label}
							</Typography>
							<Stack spacing={0.25}>{group.values.map((v) => renderRailItem(byValue(v)))}</Stack>
						</Box>
					))}

					<Divider sx={{ my: 1.25, mx: 1.75, borderColor: headerBorder(isDark) }} />
					<Box sx={{ px: 1, pb: 1 }}>
						<Stack spacing={0.25}>{PINNED_VALUES.map((v) => renderRailItem(byValue(v)))}</Stack>
					</Box>
				</Box>

				{/* Selector de worker — xs/sm */}
				<Box sx={{ display: { xs: "block", md: "none" }, px: 2, pt: 2 }}>
					<Select
						fullWidth
						size="small"
						value={activeTab}
						onChange={(e) => setActiveTab(e.target.value as string)}
						aria-label="Worker"
						sx={{ "& .MuiSelect-select": { display: "flex", alignItems: "center", gap: 1 } }}
					>
						{WORKER_GROUPS.flatMap((group) => [
							<ListSubheader key={group.label} sx={{ fontSize: "0.66rem", letterSpacing: "0.09em", textTransform: "uppercase" }}>
								{group.label}
							</ListSubheader>,
							...group.values.map((v) => (
								<MenuItem key={v} value={v}>
									{byValue(v).label}
								</MenuItem>
							)),
						])}
						<ListSubheader sx={{ fontSize: "0.66rem", letterSpacing: "0.09em", textTransform: "uppercase" }}>Referencia</ListSubheader>
						{PINNED_VALUES.map((v) => (
							<MenuItem key={v} value={v}>
								{byValue(v).label}
							</MenuItem>
						))}
					</Select>
				</Box>

				{/* Contenido */}
				<Box sx={{ flexGrow: 1, minWidth: 0 }}>
					{/* Franja de contexto: saca host, IP y estado del control de navegación */}
					<Box
						sx={{
							px: { xs: 2, md: 3 },
							py: 2,
							borderBottom: `1px solid ${headerBorder(isDark)}`,
							bgcolor: alpha(BRAND_BLUE, isDark ? 0.02 : 0.01),
						}}
					>
						<Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1.5}>
							<Box sx={{ minWidth: 0 }}>
								<Typography
									variant="h5"
									sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
								>
									{current.label}
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, maxWidth: "72ch" }}>
									{current.description}
								</Typography>
							</Box>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
								{current.dataView && (
									<VerDatosLink to={current.dataView.to} label={current.dataView.label} tooltip={current.dataView.tooltip} />
								)}
								{current.status && (
									<Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
										<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: statusColor(current.status) }} />
										<Typography variant="caption" sx={{ color: statusColor(current.status), fontWeight: 600, mr: 0.5 }}>
											{current.status === "active" ? "Activo" : current.status === "inactive" ? "Inactivo" : "Error"}
										</Typography>
										{current.host && monoChip(current.host, "neutral")}
										{current.ip && monoChip(current.ip, "info")}
									</Stack>
								)}
							</Stack>
						</Stack>
					</Box>

					<Box>{PANELS[activeTab]}</Box>
				</Box>
			</Box>
		</MainCard>
	);
};

export default WorkersConfig;
