import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Paper, Chip, Skeleton, Stack, Tooltip, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { Danger, TickCircle, Clock } from "iconsax-react";
import { LIVE_GREEN, STALE_AMBER, headerBorder, headerShadow } from "themes/dashboardTokens";
import IncidentsService, { IncidentSummary, IncidentSeverity } from "api/incidents";

// Este widget existe para invertir la lógica del dashboard: en vez de sumar
// otra grilla de métricas que hay que interpretar, muestra sólo lo que está
// mal. Si no hay nada abierto, dice que no hay nada y ocupa una línea.
//
// La métrica que manda es la EDAD. Un incidente de 90 días es peor noticia que
// tres de ayer, y es justamente la señal que no existía cuando el worker de
// update estuvo tres meses fallando sin que nadie lo viera.

const SEVERITY_ORDER: IncidentSeverity[] = ["critical", "high", "medium", "low"];

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
	critical: "Crítico",
	high: "Grave",
	medium: "Medio",
	low: "Menor",
};

const SOURCE_LABEL: Record<string, string> = {
	"log-coverage": "cobertura",
	"health-report": "salud",
	"worker-contract": "contrato",
	manual: "manual",
};

const IncidentsWidget = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isDark = theme.palette.mode === "dark";
	const [summary, setSummary] = useState<IncidentSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await IncidentsService.getSummary();
			setSummary(res.data);
			setFailed(false);
		} catch {
			setFailed(true);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
		const interval = setInterval(load, 120000);
		return () => clearInterval(interval);
	}, [load]);

	const severityColor = (s: IncidentSeverity) => {
		if (s === "critical" || s === "high") return theme.palette.error.main;
		if (s === "medium") return STALE_AMBER;
		return theme.palette.text.disabled;
	};

	// La edad se destaca sola a partir de una semana: antes de eso es ruido.
	const ageColor = (days: number) => {
		if (days >= 30) return theme.palette.error.main;
		if (days >= 7) return STALE_AMBER;
		return theme.palette.text.secondary;
	};

	if (loading) {
		return (
			<Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, border: `1px solid ${headerBorder(isDark)}` }}>
				<Skeleton variant="text" width={220} height={28} />
				<Skeleton variant="text" width="100%" height={20} />
			</Paper>
		);
	}

	// Si el endpoint no responde, decirlo: un widget en blanco se lee como
	// "todo bien", que es exactamente el error que este sistema viene a evitar.
	if (failed || !summary) {
		return (
			<Paper
				elevation={0}
				sx={{
					p: { xs: 1.5, sm: 2 },
					borderRadius: 2,
					border: `1px solid ${alpha(STALE_AMBER, 0.4)}`,
					bgcolor: alpha(STALE_AMBER, isDark ? 0.08 : 0.05),
				}}
			>
				<Stack direction="row" spacing={1} alignItems="center">
					<Danger size={18} color={STALE_AMBER} variant="Bold" />
					<Typography variant="body2" fontWeight={600}>
						No se pudo leer el estado de incidentes
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Esto no significa que no haya ninguno.
					</Typography>
				</Stack>
			</Paper>
		);
	}

	const { open, silenced, bySeverity, oldestDays, top } = summary;
	const criticalCount = (bySeverity.critical || 0) + (bySeverity.high || 0);

	if (open === 0) {
		return (
			<Paper
				elevation={0}
				onClick={() => navigate("/admin/incidentes")}
				sx={{
					p: { xs: 1.5, sm: 2 },
					borderRadius: 2,
					cursor: "pointer",
					border: `1px solid ${alpha(LIVE_GREEN, 0.35)}`,
					bgcolor: alpha(LIVE_GREEN, isDark ? 0.08 : 0.05),
					transition: "border-color 240ms ease",
					"&:hover": { borderColor: alpha(LIVE_GREEN, 0.6) },
				}}
			>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<TickCircle size={18} color={LIVE_GREEN} variant="Bold" />
					<Typography variant="body2" fontWeight={600}>
						Sin incidentes abiertos
					</Typography>
					{silenced > 0 && (
						<Typography variant="caption" color="text.secondary">
							· {silenced} silenciado{silenced !== 1 ? "s" : ""}
						</Typography>
					)}
				</Stack>
			</Paper>
		);
	}

	return (
		<Paper
			elevation={0}
			sx={{
				borderRadius: 2,
				overflow: "hidden",
				border: `1px solid ${criticalCount > 0 ? alpha(theme.palette.error.main, 0.45) : alpha(STALE_AMBER, 0.4)}`,
				boxShadow: headerShadow(isDark),
			}}
		>
			{/* Cabecera: los tres números que resumen todo */}
			<Box
				onClick={() => navigate("/admin/incidentes")}
				sx={{
					px: { xs: 1.5, sm: 2.5 },
					py: { xs: 1.25, sm: 1.75 },
					cursor: "pointer",
					bgcolor: alpha(criticalCount > 0 ? theme.palette.error.main : STALE_AMBER, isDark ? 0.1 : 0.06),
					borderBottom: `1px solid ${theme.palette.divider}`,
				}}
			>
				<Stack direction="row" spacing={{ xs: 2, sm: 4 }} alignItems="baseline" flexWrap="wrap" useFlexGap>
					<Stack direction="row" spacing={1} alignItems="center">
						<Danger size={18} color={criticalCount > 0 ? theme.palette.error.main : STALE_AMBER} variant="Bold" />
						<Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
							{open}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							abierto{open !== 1 ? "s" : ""}
						</Typography>
					</Stack>

					{criticalCount > 0 && (
						<Stack direction="row" spacing={0.75} alignItems="baseline">
							<Typography variant="h4" fontWeight={700} color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{criticalCount}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								grave{criticalCount !== 1 ? "s" : ""}
							</Typography>
						</Stack>
					)}

					<Stack direction="row" spacing={0.75} alignItems="baseline">
						<Clock size={14} color={ageColor(oldestDays)} />
						<Typography variant="h4" fontWeight={700} sx={{ color: ageColor(oldestDays), fontVariantNumeric: "tabular-nums" }}>
							{oldestDays}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{oldestDays === 1 ? "día el más viejo" : "días el más viejo"}
						</Typography>
					</Stack>

					{silenced > 0 && (
						<Typography variant="caption" color="text.secondary">
							{silenced} silenciado{silenced !== 1 ? "s" : ""}
						</Typography>
					)}
				</Stack>
			</Box>

			{/* Hasta cinco filas: lo que hay que mirar hoy, no todo lo que existe */}
			<Box>
				{top.map((i, idx) => (
					<Stack
						key={i._id}
						direction="row"
						spacing={1.5}
						alignItems="center"
						sx={{
							px: { xs: 1.5, sm: 2.5 },
							py: 1.25,
							borderTop: idx === 0 ? "none" : `1px solid ${theme.palette.divider}`,
						}}
					>
						<Box sx={{ width: 4, alignSelf: "stretch", borderRadius: 1, bgcolor: severityColor(i.severity), flexShrink: 0 }} />

						<Tooltip title={`${SEVERITY_LABEL[i.severity]} · fuente: ${SOURCE_LABEL[i.source] || i.source}`}>
							<Chip
								label={SEVERITY_LABEL[i.severity]}
								size="small"
								sx={{
									height: 20,
									fontSize: 11,
									fontWeight: 600,
									flexShrink: 0,
									color: severityColor(i.severity),
									bgcolor: alpha(severityColor(i.severity), 0.12),
								}}
							/>
						</Tooltip>

						<Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							{i.title}
						</Typography>

						<Typography
							variant="caption"
							sx={{ color: ageColor(i.ageDays), fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
						>
							{i.ageDays === 0 ? "hoy" : `${i.ageDays}d`}
						</Typography>
					</Stack>
				))}

				{open > top.length && (
					<Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
						<Typography variant="caption" color="text.secondary">
							+ {open - top.length} más
						</Typography>
					</Box>
				)}
			</Box>
		</Paper>
	);
};

export default IncidentsWidget;
