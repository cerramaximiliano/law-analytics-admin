import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Collapse,
	Grid,
	IconButton,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { ArrowDown2, ArrowUp2, Refresh } from "iconsax-react";
import MainCard from "components/MainCard";
import CausasCoverageService, {
	CoverageCategoriaKey,
	CoverageFlag,
	CoverageStatsGrupo,
	CoverageStatsGrupoChico,
	CoverageStatsResponse,
	CoverageStatsSeriePunto,
	PrioridadNivel,
	normalizeCausaType,
} from "api/causasCoverage";
import { COVERAGE_CATEGORIAS, COVERAGE_CATEGORIA_LABELS, COVERAGE_FLAG_META, PRIORIDAD_NIVEL_META } from "./CoverageChips";

/**
 * Tarjeta de resumen agregado de cobertura de textos (causas PJN con carpetas).
 * Fuente: admin-api `GET /api/causas-coverage/resumen` (snapshot horario + serie diaria).
 */

const SERIE_MAX_PUNTOS = 30;
const SPARKLINE_HEIGHT = 56;

const NIVELES: PrioridadNivel[] = ["alta", "media", "baja", "archivo"];

const FUERO_ORDER = ["CausasCivil", "CausasComercial", "CausasSegSocial", "CausasTrabajo"];
const FUERO_LABELS: Record<string, string> = {
	CausasCivil: "Civil",
	CausasComercial: "Comercial",
	CausasSegSocial: "Seg. Social",
	CausasTrabajo: "Trabajo",
};

/** Flags que significan "falta algo" en una categoría */
const FLAGS_FALTANTES: CoverageFlag[] = ["en_curso", "incompleto", "no_habilitado"];

const formatNumber = (n: number | undefined | null): string => (typeof n === "number" ? n.toLocaleString("es-AR") : "—");

const formatPct = (n: number | undefined | null, total: number | undefined | null): string => {
	if (typeof n !== "number" || typeof total !== "number" || total <= 0) return "—";
	const pct = (n / total) * 100;
	return `${pct.toLocaleString("es-AR", { maximumFractionDigits: pct >= 10 ? 0 : 1 })}%`;
};

const formatDateTime = (value: string | null | undefined): string => {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** `YYYY-MM-DD` → `DD/MM` sin pasar por Date (evita corrimientos de zona horaria) */
const formatDia = (dia: string): string => {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia || "");
	return m ? `${m[3]}/${m[2]}` : dia || "—";
};

const fueroLabel = (causaType: string): string => {
	const normalized = normalizeCausaType(causaType) || causaType;
	return FUERO_LABELS[normalized] || normalized;
};

/** Textos completos + solo falta diligenciadas (acumulado: lo que ya sirve con la etapa RAG apagada) */
const salvoDiligenciadas = (g: CoverageStatsGrupoChico): number => (g.textosCompletos || 0) + (g.soloFaltaDiligenciadas || 0);

// ---------------------------------------------------------------------------
// Métricas grandes
// ---------------------------------------------------------------------------

interface MetricProps {
	label: string;
	value: number;
	total?: number;
	emphasis?: boolean;
	tooltip?: string;
}

const Metric = ({ label, value, total, emphasis = false, tooltip }: MetricProps) => {
	const content = (
		<Box sx={{ minWidth: 0 }}>
			<Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontWeight: emphasis ? 700 : 500 }}>
				{label}
			</Typography>
			<Stack direction="row" alignItems="baseline" spacing={0.75}>
				<Typography variant={emphasis ? "h4" : "h5"} sx={{ fontWeight: emphasis ? 700 : 600, lineHeight: 1.2 }}>
					{formatNumber(value)}
				</Typography>
				{typeof total === "number" && (
					<Typography variant="body2" color={emphasis ? "success.main" : "text.secondary"} sx={{ fontWeight: emphasis ? 700 : 500 }}>
						{formatPct(value, total)}
					</Typography>
				)}
			</Stack>
		</Box>
	);
	return tooltip ? (
		<Tooltip title={tooltip} arrow placement="top">
			{content}
		</Tooltip>
	) : (
		content
	);
};

interface GrupoRowProps {
	titulo: string;
	descripcion: string;
	grupo: CoverageStatsGrupo | undefined;
	sx?: SxProps<Theme>;
}

const GrupoRow = ({ titulo, descripcion, grupo, sx }: GrupoRowProps) => {
	if (!grupo) return null;
	const total = grupo.causas || 0;
	return (
		<Box sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1, ...sx }}>
			<Grid container spacing={2} alignItems="center">
				<Grid item xs={12} md={2}>
					<Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
						{titulo}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{descripcion}
					</Typography>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<Metric label="Causas" value={total} tooltip="Causas PJN con al menos una carpeta en este grupo" />
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<Metric
						label="Todo al día"
						value={grupo.todoAlDia || 0}
						total={total}
						emphasis
						tooltip="Las 5 categorías de texto completas (o sin documentos) y actualización al día"
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<Metric
						label="Textos completos"
						value={grupo.textosCompletos || 0}
						total={total}
						tooltip="Todos los documentos con texto, sin mirar la actualización"
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<Metric
						label="Salvo diligenciadas"
						value={salvoDiligenciadas(grupo)}
						total={total}
						tooltip="Textos completos + causas donde lo único que falta son cédulas/mandamientos diligenciados (etapa RAG apagada)"
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<Metric
						label="Actualizadas"
						value={grupo.actualizadas || 0}
						total={total}
						tooltip="Causas con actualización en estado 'al día'"
					/>
				</Grid>
			</Grid>
			<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
				{formatNumber(grupo.docsPendientes)} docs pendientes · {formatNumber(grupo.docsSinPdf)} sin PDF
				{(grupo.docsNeedsOcr || 0) + (grupo.docsFailed || 0) > 0 && (
					<>
						{" "}
						· {formatNumber(grupo.docsNeedsOcr)} necesitan OCR · {formatNumber(grupo.docsFailed)} fallidos
					</>
				)}
			</Typography>
		</Box>
	);
};

// ---------------------------------------------------------------------------
// Detalle: tablas por nivel / fuero + chips de qué falta
// ---------------------------------------------------------------------------

interface DetalleTablaProps {
	titulo: string;
	filas: Array<{ key: string; label: string; grupo: CoverageStatsGrupo | undefined }>;
}

const DetalleTabla = ({ titulo, filas }: DetalleTablaProps) => (
	<Box>
		<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
			{titulo}
		</Typography>
		<Table size="small" sx={{ "& td, & th": { py: 0.5, px: 1 } }}>
			<TableHead>
				<TableRow>
					<TableCell />
					<TableCell align="right">Causas</TableCell>
					<TableCell align="right">Todo al día</TableCell>
					<TableCell align="right">%</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{filas.map(({ key, label, grupo }) => (
					<TableRow key={key}>
						<TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
							{label}
						</TableCell>
						<TableCell align="right">{grupo ? formatNumber(grupo.causas) : "—"}</TableCell>
						<TableCell align="right">{grupo ? formatNumber(grupo.todoAlDia) : "—"}</TableCell>
						<TableCell align="right">{grupo ? formatPct(grupo.todoAlDia, grupo.causas) : "—"}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	</Box>
);

const FaltantesChips = ({ grupo }: { grupo: CoverageStatsGrupo | undefined }) => {
	const chips = useMemo(() => {
		const porCategoria = grupo?.porCategoria || {};
		const out: Array<{ key: string; cat: CoverageCategoriaKey; flag: CoverageFlag; n: number }> = [];
		for (const meta of COVERAGE_CATEGORIAS) {
			const flags = porCategoria[meta.key] || {};
			for (const flag of FLAGS_FALTANTES) {
				const n = flags[flag] || 0;
				if (n > 0) out.push({ key: `${meta.key}-${flag}`, cat: meta.key, flag, n });
			}
		}
		return out;
	}, [grupo]);

	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
				Qué falta en causas vivas
			</Typography>
			{chips.length === 0 ? (
				<Typography variant="caption" color="text.secondary">
					Ninguna categoría con documentos pendientes
				</Typography>
			) : (
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					{chips.map(({ key, cat, flag, n }) => {
						const flagMeta = COVERAGE_FLAG_META[flag];
						return (
							<Tooltip key={key} title={`${COVERAGE_CATEGORIA_LABELS[cat]}: ${flagMeta.descripcion}`} arrow>
								<Chip
									size="small"
									color={flagMeta.color}
									variant="filled"
									label={`${COVERAGE_CATEGORIA_LABELS[cat].toLowerCase()} · ${flagMeta.label.toLowerCase()} ${formatNumber(n)}`}
									sx={{
										height: 20,
										fontSize: "0.7rem",
										fontWeight: 600,
										"& .MuiChip-label": { px: 0.8 },
										...(flag === "no_habilitado" && { bgcolor: "action.selected", color: "text.secondary" }),
									}}
								/>
							</Tooltip>
						);
					})}
				</Stack>
			)}
		</Box>
	);
};

// ---------------------------------------------------------------------------
// Evolución: barras con Box (sin librerías)
// ---------------------------------------------------------------------------

const Sparkline = ({ serie }: { serie: CoverageStatsSeriePunto[] }) => {
	const puntos = useMemo(() => {
		const ordenados = [...serie].sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
		return ordenados.slice(-SERIE_MAX_PUNTOS);
	}, [serie]);

	if (puntos.length < 2) {
		return (
			<Typography variant="caption" color="text.secondary">
				La serie empieza a acumularse con cada corrida diaria
			</Typography>
		);
	}

	const valores = puntos.map((p) => p.vivas?.todoAlDia || 0);
	const max = Math.max(...valores, 1);
	const primero = puntos[0];
	const ultimo = puntos[puntos.length - 1];

	return (
		<Box>
			<Stack direction="row" alignItems="flex-end" spacing={0.25} sx={{ height: SPARKLINE_HEIGHT }}>
				{puntos.map((p, i) => {
					const v = valores[i];
					const h = v > 0 ? Math.max(2, Math.round((v / max) * SPARKLINE_HEIGHT)) : 1;
					const esUltimo = i === puntos.length - 1;
					return (
						<Tooltip
							key={p.dia}
							arrow
							placement="top"
							title={
								<Box sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
									<Typography variant="caption" fontWeight={700} display="block">
										{formatDia(p.dia)}
									</Typography>
									<div>Todo al día (vivas): {formatNumber(v)}</div>
									<div>
										{formatPct(v, p.vivas?.causas)} de {formatNumber(p.vivas?.causas)} causas
									</div>
								</Box>
							}
						>
							<Box
								sx={{
									flex: 1,
									minWidth: 4,
									height: h,
									borderRadius: 0.5,
									bgcolor: esUltimo ? "primary.main" : "primary.light",
									opacity: esUltimo ? 1 : 0.75,
									cursor: "default",
									transition: "opacity 120ms",
									"&:hover": { opacity: 1 },
								}}
							/>
						</Tooltip>
					);
				})}
			</Stack>
			<Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
				<Typography variant="caption" color="text.secondary">
					{formatDia(primero.dia)} · {formatNumber(primero.vivas?.todoAlDia)}
				</Typography>
				<Typography variant="caption" color="text.secondary">
					{formatDia(ultimo.dia)} · {formatNumber(ultimo.vivas?.todoAlDia)}
				</Typography>
			</Stack>
		</Box>
	);
};

// ---------------------------------------------------------------------------
// Tarjeta
// ---------------------------------------------------------------------------

export interface CoverageStatsCardProps {
	sx?: SxProps<Theme>;
	/** Días de serie a pedir (default 30) */
	dias?: number;
}

const CoverageStatsCard = ({ sx, dias = 30 }: CoverageStatsCardProps) => {
	const [data, setData] = useState<CoverageStatsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [detalleOpen, setDetalleOpen] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await CausasCoverageService.getResumen(dias);
			setData(res);
		} catch (err) {
			console.error("Error cargando resumen de cobertura:", err);
			setError("No se pudo cargar el resumen de cobertura");
		} finally {
			setLoading(false);
		}
	}, [dias]);

	useEffect(() => {
		load();
	}, [load]);

	const latest = data?.latest ?? null;

	const header = (
		<Stack direction="row" alignItems="center" spacing={1}>
			{latest && (
				<Typography variant="caption" color="text.secondary">
					Actualizado {formatDateTime(latest.at)}
				</Typography>
			)}
			<Tooltip title="Refrescar">
				<span>
					<IconButton size="small" onClick={load} disabled={loading} aria-label="Refrescar resumen de cobertura">
						<Refresh size={18} />
					</IconButton>
				</span>
			</Tooltip>
		</Stack>
	);

	const renderBody = () => {
		if (loading && !data) {
			return (
				<Stack spacing={1.5}>
					<Skeleton variant="rounded" height={88} />
					<Skeleton variant="rounded" height={88} />
					<Skeleton variant="rounded" height={SPARKLINE_HEIGHT + 24} />
				</Stack>
			);
		}
		if (error) {
			return (
				<Alert
					severity="error"
					action={
						<Button color="inherit" size="small" onClick={load}>
							Reintentar
						</Button>
					}
				>
					{error}
				</Alert>
			);
		}
		if (!latest) {
			return <Alert severity="info">El cron horario todavía no generó el resumen (corre a los :05)</Alert>;
		}

		const { grupos, porNivel, porFuero } = latest;
		const fueroKeys = Array.from(new Set([...FUERO_ORDER, ...Object.keys(porFuero || {})]));

		return (
			<Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1, transition: "opacity 120ms" }}>
				<GrupoRow titulo="Vivas" descripcion="Alguna carpeta no archivada" grupo={grupos?.vivas} />
				<GrupoRow titulo="Solo archivadas" descripcion="Todas las carpetas archivadas" grupo={grupos?.archivadas} />

				<Box>
					<Button
						size="small"
						variant="text"
						onClick={() => setDetalleOpen((v) => !v)}
						endIcon={detalleOpen ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
						sx={{ px: 1 }}
					>
						Detalle
					</Button>
					<Collapse in={detalleOpen} unmountOnExit>
						<Grid container spacing={2} sx={{ mt: 0.5 }}>
							<Grid item xs={12} md={6}>
								<DetalleTabla
									titulo="Por nivel de prioridad"
									filas={NIVELES.map((nivel) => ({
										key: nivel,
										label: PRIORIDAD_NIVEL_META[nivel].label,
										grupo: porNivel?.[nivel],
									}))}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<DetalleTabla
									titulo="Por fuero"
									filas={fueroKeys.map((key) => ({ key, label: fueroLabel(key), grupo: porFuero?.[key] }))}
								/>
							</Grid>
							<Grid item xs={12}>
								<FaltantesChips grupo={grupos?.vivas} />
							</Grid>
						</Grid>
					</Collapse>
				</Box>

				<Box>
					<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
						Evolución · todo al día (vivas), últimos {SERIE_MAX_PUNTOS} días
					</Typography>
					<Sparkline serie={data?.serie || []} />
				</Box>
			</Stack>
		);
	};

	return (
		<MainCard title="Cobertura de textos — causas con carpetas" secondary={header} sx={sx} contentSX={{ pt: 1.5 }}>
			{renderBody()}
		</MainCard>
	);
};

export default CoverageStatsCard;
