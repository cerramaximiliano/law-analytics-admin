import { useEffect, useState } from "react";
import { Box, Chip, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography, alpha, useTheme } from "@mui/material";
import MainCard from "components/MainCard";
import { getPlazosPendientes, getStats, getPlazosBase, setPlazosBase, PlazosBase, referenciasEnAtlas } from "api/plazos";
import { useQueryParam, useTabParam } from "hooks/useTabParam";
import CrossViewLinks from "components/admin/CrossViewLink";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import NotificacionesTab from "./NotificacionesTab";
import VencimientosTab from "./VencimientosTab";
import NormativaTab from "./NormativaTab";
import FeriadosTab from "./FeriadosTab";
import DatasetTab from "./DatasetTab";
import MonitoreoTab from "./MonitoreoTab";
import RevisionLegalTab from "./RevisionLegalTab";
import PendientesTab from "./PendientesTab";
import CedulaDetalle from "./CedulaDetalle";

// Pestañas en la URL (?tab=) para poder enlazar desde el flujo y otras vistas.
// Cada base muestra solo las pestañas que le corresponden: Pendientes es de usuarios (y va primera), el dataset de la caché.
const SLUGS_USUARIOS = ["pendientes", "notificaciones", "vencimientos", "normativa", "feriados", "monitoreo", "revision-legal"] as const;
const SLUGS_CACHE = ["notificaciones", "vencimientos", "normativa", "feriados", "dataset", "monitoreo", "revision-legal"] as const;

export default function PlazosPage() {
	const theme = useTheme();
	// ?base=usuarios|cache manda sobre la elección guardada (links desde otras vistas).
	const [baseParam, setBaseParam] = useQueryParam("base");
	// Detalle unificado de una cédula de usuario: ?cedula=<causaId:sourceId> o ?plazo=<id>.
	const [cedulaParam, setCedulaParam] = useQueryParam("cedula");
	const [plazoParam, setPlazoParam] = useQueryParam("plazo");
	const [base, setBase] = useState<PlazosBase>(() => {
		if (baseParam === "usuarios" || baseParam === "cache") {
			setPlazosBase(baseParam);
			return baseParam;
		}
		return getPlazosBase();
	});
	const slugs = base === "usuarios" ? SLUGS_USUARIOS : SLUGS_CACHE;
	const [tab, setTab] = useTabParam("tab", slugs);
	const [pendientes, setPendientes] = useState<number | null>(null);
	const [stats, setStats] = useState<{ total: number; porStatus: Record<string, number>; vencimientosProximos: number } | null>(null);

	// Los contadores del encabezado se piden una vez por base (no en cada pestaña) y nunca
	// bloquean las pestañas: si fallan, simplemente no se muestran.
	useEffect(() => {
		setStats(null);
		getStats()
			.then(setStats)
			.catch(() => setStats(null));
		setPendientes(null);
		if (base === "usuarios") {
			getPlazosPendientes()
				.then((p) => setPendientes(p.resumen.total))
				.catch(() => setPendientes(null));
		}
	}, [base]);

	const cambiarBase = (b: PlazosBase | null) => {
		if (!b || b === base) return;
		setPlazosBase(b);
		setBase(b);
		setBaseParam(b);
	};

	const isDark = theme.palette.mode === "dark";

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ pb: 1 }}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Plazos Procesales
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Cédulas detectadas en movimientos nuevos con su vencimiento computado (plazo expreso del documento o normativa subsidiaria por
							fuero/objeto), reglas de normativa y calendario de días inhábiles. La base “Usuarios” es la que llega a los usuarios; “Caché”
							es el laboratorio.
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
						{stats && (
							<>
								<Chip label={`${stats.total} notificaciones`} size="small" variant="outlined" />
								<Chip label={`${stats.porStatus?.computed || 0} computadas`} size="small" color="success" variant="outlined" />
								<Chip label={`${stats.porStatus?.pending || 0} en cola`} size="small" variant="outlined" />
							</>
						)}
						<ToggleButtonGroup
							size="small"
							exclusive
							value={base}
							onChange={(_, b) => cambiarBase(b)}
							sx={{ "& .MuiToggleButton-root": { textTransform: "none", py: 0.25 } }}
						>
							<ToggleButton value="cache">Caché (desarrollo)</ToggleButton>
							<ToggleButton value="usuarios">Usuarios (Atlas)</ToggleButton>
						</ToggleButtonGroup>
						<Chip
							label={base === "usuarios" ? "Atlas · pjn/api" : "rs0 · pjn/cache-api"}
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.7rem", color: BRAND_BLUE, borderColor: alpha(BRAND_BLUE, 0.4) }}
						/>
						<CrossViewLinks
							current="datos"
							to={{ worker: "/admin/workers/plazos", flujo: "/admin/flujos?tab=plazos" }}
							tooltips={{
								worker: "Configuración y estado del plazos-worker",
								flujo: "Diagrama del flujo de plazos automáticos, con el estado en vivo",
							}}
						/>
					</Stack>
				</Stack>

				<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}` }}>
					<Tabs
						variant="scrollable"
						scrollButtons="auto"
						allowScrollButtonsMobile
						value={tab}
						onChange={(_, v: string) => setTab(v)}
						sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } }}
					>
						{base === "usuarios" && (
							<Tab
								value="pendientes"
								label={
									<Stack direction="row" spacing={0.75} alignItems="center">
										<span>Pendientes</span>
										{pendientes !== null && (
											<Chip size="small" color={pendientes ? "warning" : "success"} label={pendientes} sx={{ height: 18 }} />
										)}
									</Stack>
								}
							/>
						)}
						<Tab value="notificaciones" label="Notificaciones" />
						<Tab value="vencimientos" label="Vencimientos" />
						<Tab value="normativa" label="Normativa" />
						<Tab value="feriados" label="Feriados" />
						{base === "cache" && <Tab value="dataset" label="Dataset" />}
						<Tab value="monitoreo" label="Monitoreo" />
						<Tab value="revision-legal" label="Revisión legal" />
					</Tabs>
				</Box>

				{(tab === "normativa" || tab === "feriados") && (
					<Typography variant="caption" color="text.secondary">
						Reglas y feriados son los mismos para las dos bases (se editan en{" "}
						{referenciasEnAtlas ? "Atlas" : "el rs0, que es lo que leen los workers hoy"}).
					</Typography>
				)}
				{/* key={base}: al cambiar de base, cada pestaña se vuelve a montar y relee de la API elegida */}
				{tab === "notificaciones" && <NotificacionesTab key={base} />}
				{tab === "vencimientos" && <VencimientosTab key={base} />}
				{tab === "normativa" && <NormativaTab />}
				{tab === "feriados" && <FeriadosTab />}
				{tab === "dataset" && base === "cache" && <DatasetTab />}
				{tab === "monitoreo" && <MonitoreoTab key={base} />}
				{tab === "revision-legal" && <RevisionLegalTab key={base} />}
				{tab === "pendientes" && base === "usuarios" && <PendientesTab key={base} onTotal={setPendientes} />}
				<CedulaDetalle
					open={!!(cedulaParam || plazoParam)}
					movementId={cedulaParam || null}
					plazoId={cedulaParam ? null : plazoParam || null}
					onClose={() => {
						setCedulaParam("");
						setPlazoParam("");
					}}
				/>
			</Stack>
		</MainCard>
	);
}
