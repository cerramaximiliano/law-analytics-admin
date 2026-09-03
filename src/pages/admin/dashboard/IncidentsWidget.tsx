import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Paper, Chip, Skeleton, Stack, Tooltip, ButtonBase, Collapse, Button, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { Danger, TickCircle, Clock, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { LIVE_GREEN, STALE_AMBER, headerBorder, headerShadow } from "themes/dashboardTokens";
import IncidentsService, { Incident, IncidentSummary, IncidentSummaryRow, IncidentSeverity } from "api/incidents";

// Este widget existe para invertir la lógica del dashboard: en vez de sumar
// otra grilla de métricas que hay que interpretar, muestra sólo lo que está
// mal. Si no hay nada abierto, dice que no hay nada y ocupa una línea.
//
// La métrica que manda es la EDAD. Un incidente de 90 días es peor noticia que
// tres de ayer, y es justamente la señal que no existía cuando el worker de
// update estuvo tres meses fallando sin que nadie lo viera.
//
// Arranca comprimido: la cabecera sola —abiertos, graves, el más viejo— es el
// 90% de las visitas al dashboard, donde uno sólo quiere confirmar que no hay
// nada nuevo. La lista se despliega a pedido y entonces trae TODOS los
// abiertos, no las cinco filas del resumen: si alguien la abre es porque va a
// leer, y cortar en cinco lo obligaba a saltar a otra pantalla para ver el
// resto.
//
// Desplegada, la lista se agrupa por fuente. El día que se escribió esto había
// 13 abiertos y 10 eran de `log-coverage` diciendo lo mismo ("X nunca envió
// logs"): no eran 13 problemas sino uno con 10 manifestaciones. Una lista
// plana esconde eso; los grupos con su conteo lo ponen adelante.

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

// Nombre largo para los encabezados de grupo: ahí hay lugar y "cobertura"
// suelto no dice de qué.
const SOURCE_GROUP_LABEL: Record<string, string> = {
	"log-coverage": "Cobertura de logs",
	"health-report": "Reportes de salud",
	"worker-contract": "Contrato de workers",
	manual: "Cargados a mano",
};

// El orden de los grupos: primero el que más incidentes tiene. Con una fuente
// dominante, esa es la que hay que atacar.
const GROUP_ORDER_BY_COUNT = true;

const EXPANDED_KEY = "la-incidents-widget-expanded";

/** El navegador puede negar el acceso (ventana privada, cookies bloqueadas). */
const readExpanded = (): boolean => {
	try {
		return localStorage.getItem(EXPANDED_KEY) === "1";
	} catch {
		return false;
	}
};

const writeExpanded = (v: boolean) => {
	try {
		localStorage.setItem(EXPANDED_KEY, v ? "1" : "0");
	} catch {
		/* sin memoria de la preferencia; el widget funciona igual */
	}
};

/** Lo que necesita una fila. El resumen y la lista completa lo cumplen los dos. */
type Row = IncidentSummaryRow | Incident;

const IncidentsWidget = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isDark = theme.palette.mode === "dark";
	const [summary, setSummary] = useState<IncidentSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [failed, setFailed] = useState(false);

	const [expanded, setExpanded] = useState(readExpanded);
	const [all, setAll] = useState<Incident[] | null>(null);
	const [loadingAll, setLoadingAll] = useState(false);
	const [failedAll, setFailedAll] = useState(false);
	// `expanded` es estado de React pero el intervalo lo lee desde un closure
	// viejo; con la ref el refresco sabe si la lista está a la vista.
	const expandedRef = useRef(expanded);
	expandedRef.current = expanded;

	const loadAll = useCallback(async () => {
		setLoadingAll(true);
		try {
			const res = await IncidentsService.list({ status: "open" });
			setAll(res.data);
			setFailedAll(false);
		} catch {
			setFailedAll(true);
		} finally {
			setLoadingAll(false);
		}
	}, []);

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
		// Si la lista está desplegada se refresca con la cabecera: si sólo se
		// actualizaran los números, el detalle de abajo los contradiría.
		if (expandedRef.current) loadAll();
	}, [loadAll]);

	useEffect(() => {
		load();
		const interval = setInterval(load, 120000);
		return () => clearInterval(interval);
	}, [load]);

	// La lista completa se pide cuando se abre por primera vez, no en el montaje:
	// el dashboard no debería pagar un request por un panel que casi siempre
	// está cerrado. Con la preferencia guardada en `true`, se pide igual —el
	// usuario ya dijo que la quiere ver.
	useEffect(() => {
		if (expanded && all === null && !loadingAll && !failedAll) loadAll();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [expanded]);

	const toggle = () => {
		setExpanded((prev) => {
			writeExpanded(!prev);
			return !prev;
		});
	};

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

	// Mientras la lista completa viaja se muestran las filas del resumen que ya
	// están en memoria: abrir el panel no debería dejar un hueco en blanco.
	const rows: Row[] = all ?? summary?.top ?? [];

	const grouped = useMemo(() => {
		const bySource = new Map<string, Row[]>();
		for (const r of rows) {
			const list = bySource.get(r.source) || [];
			list.push(r);
			bySource.set(r.source, list);
		}
		const groups = [...bySource.entries()].map(([source, items]) => ({
			source,
			items: [...items].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || b.ageDays - a.ageDays),
		}));
		if (GROUP_ORDER_BY_COUNT) groups.sort((a, b) => b.items.length - a.items.length);
		return groups;
	}, [rows]);

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
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
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

	const { open, silenced, bySeverity, oldestDays } = summary;
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

	const accent = criticalCount > 0 ? theme.palette.error.main : STALE_AMBER;

	const row = (i: Row, first: boolean) => (
		<Stack
			key={i._id}
			direction="row"
			spacing={1.5}
			alignItems="center"
			sx={{
				px: { xs: 1.5, sm: 2.5 },
				py: 1.25,
				borderTop: first ? "none" : `1px solid ${theme.palette.divider}`,
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

			<Box sx={{ flexGrow: 1, minWidth: 0 }}>
				<Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{i.title}
				</Typography>
				{/* El servicio y el host estaban sólo en el tooltip. Desplegado hay
				    lugar, y son lo que dice dónde ir a mirar. */}
				{(i.service || i.host) && (
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
					>
						{[i.service, i.host].filter(Boolean).join(" · ")}
					</Typography>
				)}
			</Box>

			<Typography variant="caption" sx={{ color: ageColor(i.ageDays), fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
				{i.ageDays === 0 ? "hoy" : `${i.ageDays}d`}
			</Typography>
		</Stack>
	);

	return (
		<Paper
			elevation={0}
			sx={{
				borderRadius: 2,
				overflow: "hidden",
				border: `1px solid ${alpha(accent, criticalCount > 0 ? 0.45 : 0.4)}`,
				boxShadow: headerShadow(isDark),
			}}
		>
			{/* Cabecera: los tres números que resumen todo. Comprimido, esto es
			    todo el widget. Toda la barra abre y cierra —es el gesto que se
			    busca al llegar—, y el salto al panel completo queda en su propio
			    botón para que un clic no signifique dos cosas. */}
			<ButtonBase
				focusRipple
				onClick={toggle}
				aria-expanded={expanded}
				aria-controls="incidents-widget-list"
				sx={{
					width: "100%",
					textAlign: "left",
					px: { xs: 1.5, sm: 2.5 },
					py: { xs: 1.25, sm: 1.75 },
					display: "flex",
					alignItems: "center",
					gap: { xs: 1, sm: 2 },
					bgcolor: alpha(accent, isDark ? 0.1 : 0.06),
					borderBottom: expanded ? `1px solid ${theme.palette.divider}` : "none",
					transition: "background-color 200ms ease",
					"&:hover": { bgcolor: alpha(accent, isDark ? 0.16 : 0.1) },
				}}
			>
				<Stack
					direction="row"
					spacing={{ xs: 2, sm: 4 }}
					alignItems="baseline"
					flexWrap="wrap"
					useFlexGap
					sx={{ flexGrow: 1, minWidth: 0 }}
				>
					<Stack direction="row" spacing={1} alignItems="center">
						<Danger size={18} color={accent} variant="Bold" />
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

				{/* El ícono dice qué va a pasar; el texto, cuánto hay detrás. */}
				<Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
					<Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
						{expanded ? "Ocultar" : `Ver los ${open}`}
					</Typography>
					<Box aria-hidden sx={{ display: "flex", color: "text.secondary" }}>
						{expanded ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
					</Box>
				</Stack>
			</ButtonBase>

			<Collapse in={expanded} unmountOnExit>
				<Box id="incidents-widget-list">
					{grouped.map((g) => (
						<Box key={g.source}>
							{/* El encabezado con el conteo es el que convierte una lista
							    larga en un diagnóstico: "10 de cobertura" se lee de una. */}
							<Stack
								direction="row"
								spacing={1}
								alignItems="center"
								sx={{
									px: { xs: 1.5, sm: 2.5 },
									py: 0.75,
									bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.03),
									borderTop: `1px solid ${theme.palette.divider}`,
								}}
							>
								<Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: "0.03em", color: "text.secondary" }}>
									{SOURCE_GROUP_LABEL[g.source] || g.source}
								</Typography>
								<Typography variant="caption" sx={{ color: "text.disabled", fontVariantNumeric: "tabular-nums" }}>
									{g.items.length}
								</Typography>
							</Stack>
							{g.items.map((i, idx) => row(i, idx === 0))}
						</Box>
					))}

					{loadingAll && (
						<Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25, borderTop: `1px solid ${theme.palette.divider}` }}>
							<Skeleton variant="text" width="70%" height={20} />
							<Skeleton variant="text" width="45%" height={20} />
						</Box>
					)}

					{/* Si la lista completa falla queda el resumen a la vista, y hay que
					    decir que está recortado: cinco filas mudas se leen como todo. */}
					{failedAll && (
						<Stack
							direction="row"
							spacing={1}
							alignItems="center"
							sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.25, borderTop: `1px solid ${theme.palette.divider}` }}
						>
							<Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
								No se pudo traer la lista completa; arriba está el resumen de {rows.length}.
							</Typography>
							<Button size="small" variant="text" onClick={loadAll}>
								Reintentar
							</Button>
						</Stack>
					)}

					<Box
						sx={{
							px: { xs: 1.5, sm: 2.5 },
							py: 1,
							borderTop: `1px solid ${theme.palette.divider}`,
							display: "flex",
							justifyContent: "flex-end",
						}}
					>
						<Button size="small" variant="text" onClick={() => navigate("/admin/incidentes")}>
							Abrir el panel de incidentes
						</Button>
					</Box>
				</Box>
			</Collapse>
		</Paper>
	);
};

export default IncidentsWidget;
