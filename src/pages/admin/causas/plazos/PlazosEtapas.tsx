// Contadores vivos por etapa del flujo de plazos automáticos (base de usuarios, Atlas).
// Responde "dónde está parada cada cédula": detectada → esperando documento → cola de
// cálculo → calculada → para entregar → entregada. Mismo lenguaje que el FlujoPanel de
// sentencias: rojo = frenada por un worker caído o apagado, ámbar = en pausa a propósito
// (dry run) o cuello de botella, azul = fluye. Cada tarjeta lleva a la vista donde esa etapa
// se opera. Se usa en el hub de flujos (pestaña Plazos) y en Plazos procesales → Monitoreo.

import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Chip, IconButton, Paper, Skeleton, Stack, Tooltip, Typography, alpha, useMediaQuery, useTheme } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { ArrowDown2, ArrowRight2, Refresh } from "iconsax-react";
import { getFlujoUsuarios, PlazosFlujo, PlazosFlujoEtapa } from "api/plazos";
import { BRAND_BLUE, STALE_AMBER } from "themes/dashboardTokens";

const fmt = (n?: number) => (n ?? 0).toLocaleString("es-AR");

const FUENTE: Record<string, string> = { "app-update": "app-update", "mis-causas": "Mis Causas", bandeja: "bandeja" };

// Vista donde se opera cada etapa.
const HREF: Record<PlazosFlujoEtapa["id"], string> = {
	detectadas: "/admin/causas/plazos?tab=notificaciones&base=usuarios",
	esperando: "/admin/causas/plazos?tab=notificaciones&base=usuarios",
	calculo: "/admin/workers/plazos?tab=estado&base=usuarios",
	calculadas: "/admin/causas/plazos?tab=vencimientos&base=usuarios",
	entrega: "/admin/causas/plazos?tab=monitoreo&base=usuarios",
	entregadas: "/admin/causas/plazos?tab=revision-legal&base=usuarios",
};

function detalles(e: PlazosFlujoEtapa): string[] {
	switch (e.id) {
		case "detectadas":
			return [`hoy ${fmt(e.hoy)}`, ...Object.entries(e.desglose || {}).map(([k, v]) => `${FUENTE[k] || k} ${fmt(v)}`)];
		case "calculo":
			return [
				`en alcance ${fmt(e.enCola)}`,
				...(e.fueraDeAlcance ? [`fuera de alcance ${fmt(e.fueraDeAlcance)}`] : []),
				...(e.errores ? [`fallidas ${fmt(e.errores)}`] : []),
			];
		case "calculadas":
			return [`confiables ${fmt(e.confiables)}`, `sin plazo ${fmt(e.sinPlazo)}`, `revisión manual ${fmt(e.revisionManual)}`];
		case "entrega":
			return e.errores ? [`rechazadas por el hub ${fmt(e.errores)}`] : [];
		case "entregadas":
			return [`eventos ${fmt(e.eventos)}`, `avisos ${fmt(e.avisos)}`, ...(e.sinCarpeta ? [`sin carpeta ${fmt(e.sinCarpeta)}`] : [])];
		default:
			return [];
	}
}

function acentoDe(e: PlazosFlujoEtapa, cuello: boolean, theme: Theme) {
	if (e.pausada) return e.motivoPausa?.startsWith("dry run") ? STALE_AMBER : theme.palette.error.main;
	return cuello ? STALE_AMBER : BRAND_BLUE;
}

function Etapa({ e, cuello, compacta }: { e: PlazosFlujoEtapa; cuello: boolean; compacta: boolean }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const acento = acentoDe(e, cuello, theme);
	return (
		<Paper
			component={RouterLink}
			to={HREF[e.id]}
			variant="outlined"
			sx={{
				p: compacta ? 1.25 : 1.5,
				flex: compacta ? undefined : 1,
				minWidth: 0,
				display: "block",
				height: compacta ? undefined : "100%",
				boxSizing: "border-box",
				textDecoration: "none",
				color: "inherit",
				borderLeft: compacta ? `3px solid ${acento}` : undefined,
				borderTop: compacta ? undefined : `3px solid ${acento}`,
				bgcolor: alpha(acento, isDark ? 0.07 : 0.03),
				transition: "box-shadow .15s",
				"&:hover": { boxShadow: `0 0 0 1px ${alpha(acento, 0.5)}` },
			}}
		>
			<Stack direction={compacta ? "row" : "column"} spacing={compacta ? 1 : 0.5} justifyContent="space-between">
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle2" sx={{ color: acento, lineHeight: 1.3 }}>
						{e.label}
					</Typography>
					{e.pausada && e.motivoPausa && (
						<Chip
							size="small"
							label={e.motivoPausa}
							sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: alpha(acento, 0.15), color: isDark ? "#fff" : "#1F2937" }}
						/>
					)}
					<Stack spacing={0.1} sx={{ mt: 0.5 }}>
						{detalles(e).map((d) => (
							<Typography key={d} variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.35 }}>
								{d}
							</Typography>
						))}
					</Stack>
				</Box>
				<Typography
					variant={compacta ? "h5" : "h3"}
					sx={{ color: acento, fontVariantNumeric: "tabular-nums", lineHeight: 1.15, flexShrink: 0 }}
				>
					{fmt(e.total)}
				</Typography>
			</Stack>
			{!compacta && (
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, fontSize: 10.5, lineHeight: 1.35 }}>
					{e.nota}
				</Typography>
			)}
		</Paper>
	);
}

export default function PlazosEtapas() {
	const [f, setF] = useState<PlazosFlujo | null>(null);
	const [error, setError] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		try {
			setF(await getFlujoUsuarios());
			setError(null);
		} catch (err: any) {
			setError(err?.response?.data?.message || "No se pudieron leer los contadores del flujo");
		}
	}, []);

	useEffect(() => {
		cargar();
		const id = setInterval(cargar, 60000);
		return () => clearInterval(id);
	}, [cargar]);

	if (error && !f) return <Alert severity="warning">{error}</Alert>;
	if (!f) return <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />;
	return <PlazosEtapasVista f={f} onRefresh={cargar} />;
}

/** Vista pura (sin fetch): también sirve para renderizarla con datos de ejemplo. */
export function PlazosEtapasVista({ f, onRefresh }: { f: PlazosFlujo; onRefresh?: () => void }) {
	const theme = useTheme();
	const compacta = useMediaQuery(theme.breakpoints.down("lg"));

	// Cuello de botella: la etapa activa con más cédulas esperando.
	const conCola = f.etapas.filter((e) => !e.pausada && (e.enCola ?? 0) > 0);
	const cuelloId = conCola.length ? conCola.reduce((a, b) => ((a.enCola ?? 0) >= (b.enCola ?? 0) ? a : b)).id : null;
	const frenadas = f.etapas.filter((e) => e.pausada && !e.motivoPausa?.startsWith("dry run"));

	return (
		<Stack spacing={1.25}>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Typography variant="subtitle2">Dónde está cada cédula</Typography>
				<Chip
					size="small"
					variant="outlined"
					color={f.alcance.calculo === "todos" ? "success" : "warning"}
					label={
						f.alcance.calculo === "todos"
							? "cálculo: todas las causas"
							: `cálculo: cuentas de prueba (${fmt(f.alcance.causasCalculo ?? 0)} causas)`
					}
				/>
				<Chip
					size="small"
					color={f.alcance.dryRun ? "warning" : "success"}
					label={f.alcance.dryRun ? "entrega: DRY RUN" : "entrega: real"}
				/>
				<Typography variant="caption" color="text.secondary">
					Base de usuarios (Atlas) · {new Date(f.generatedAt).toLocaleTimeString("es-AR")}
				</Typography>
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={onRefresh}>
						<Refresh size={16} />
					</IconButton>
				</Tooltip>
			</Stack>
			{frenadas.length > 0 && (
				<Alert severity="error" variant="outlined">
					{frenadas.map((e) => `${e.label}: ${e.motivoPausa}`).join(" · ")}
				</Alert>
			)}
			{compacta ? (
				<Stack spacing={0.5}>
					{f.etapas.map((e, i) => (
						<Box key={e.id}>
							<Etapa e={e} cuello={e.id === cuelloId} compacta />
							{i < f.etapas.length - 1 && (
								<Box sx={{ display: "flex", justifyContent: "center", color: "text.disabled", py: 0.25 }}>
									<ArrowDown2 size={14} />
								</Box>
							)}
						</Box>
					))}
				</Stack>
			) : (
				<Stack direction="row" spacing={0.5} alignItems="stretch">
					{f.etapas.map((e, i) => (
						<Stack key={e.id} direction="row" alignItems="stretch" spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
							<Etapa e={e} cuello={e.id === cuelloId} compacta={false} />
							{i < f.etapas.length - 1 && (
								<Box sx={{ color: "text.disabled", display: "flex", alignItems: "center", flexShrink: 0 }}>
									<ArrowRight2 size={16} />
								</Box>
							)}
						</Stack>
					))}
				</Stack>
			)}
		</Stack>
	);
}
