import { Badge, Box, Chip, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { UserEdit } from "iconsax-react";
import {
	CausaCoverage,
	CoverageCategoria,
	CoverageCategoriaKey,
	CoverageFlag,
	ActualizacionEstado,
	CoveragePendienteEstado,
	Prioridad,
	PrioridadComponentes,
	PrioridadNivel,
} from "api/causasCoverage";

/**
 * Chips de cobertura de texto por causa PJN (una por categoría documental)
 * + chip de estado de actualización. Fuente: admin-api `/api/causas-coverage`.
 */

type ChipColor = "default" | "success" | "warning" | "error" | "info";

export interface CoverageCategoriaMeta {
	key: CoverageCategoriaKey;
	/** Letra del chip */
	letra: string;
	label: string;
	descripcion: string;
}

export const COVERAGE_CATEGORIAS: CoverageCategoriaMeta[] = [
	{
		key: "resolucion",
		letra: "R",
		label: "Resoluciones",
		descripcion: "Documento del organismo (proveídos, sentencias, oficios del juzgado); el texto se extrae al bajar el PDF",
	},
	{ key: "cedula", letra: "C", label: "Cédulas", descripcion: "Cédula electrónica" },
	{ key: "escrito", letra: "E", label: "Escritos", descripcion: "Escrito de parte" },
	{ key: "deo", letra: "D", label: "DEO", descripcion: "Oficio electrónico (DEO)" },
	{
		key: "diligenciada",
		letra: "Dg",
		label: "Diligenciadas",
		descripcion: "Cédula / mandamiento diligenciado en papel (resultado de la notificación)",
	},
];

export const COVERAGE_CATEGORIA_LABELS: Record<CoverageCategoriaKey, string> = {
	resolucion: "Resolución",
	cedula: "Cédula",
	escrito: "Escrito",
	diligenciada: "Diligenciada",
	deo: "DEO",
};

export const COVERAGE_FLAG_META: Record<CoverageFlag, { label: string; color: ChipColor; descripcion: string }> = {
	completo: { label: "Completo", color: "success", descripcion: "Todos los documentos de la categoría tienen texto" },
	en_curso: {
		label: "En curso",
		color: "warning",
		descripcion: "Hay documentos pendientes o sin PDF: el extractor / la descarga los van a procesar",
	},
	incompleto: {
		label: "Incompleto",
		color: "error",
		descripcion: "Solo quedan documentos que necesitan OCR o fallaron; no hay nada en vuelo",
	},
	no_habilitado: {
		label: "No habilitado",
		color: "default",
		descripcion: "Hay pendientes pero la etapa RAG de esta categoría está apagada",
	},
	sin_documentos: { label: "Sin documentos", color: "default", descripcion: "La causa no tiene documentos de esta categoría" },
};

export const ACTUALIZACION_META: Record<ActualizacionEstado, { label: string; color: ChipColor }> = {
	al_dia: { label: "Al día", color: "success" },
	atrasada: { label: "Atrasada", color: "warning" },
	cooldown: { label: "Cooldown", color: "error" },
	no_actualizable: { label: "No actualizable", color: "default" },
	// Expediente privado: el portal público no lo entrega; solo se actualiza con credencial (Mis Causas).
	privada: { label: "Privada", color: "default" },
	sin_dato: { label: "—", color: "default" },
};

export const PENDIENTE_ESTADO_META: Record<CoveragePendienteEstado, { label: string; color: ChipColor }> = {
	pendiente: { label: "Pendiente", color: "warning" },
	sin_pdf: { label: "Sin PDF", color: "warning" },
	needs_ocr: { label: "Necesita OCR", color: "error" },
	failed: { label: "Fallido", color: "error" },
	failed_definitivo: { label: "Definitivo", color: "default" },
};

export const PRIORIDAD_NIVEL_META: Record<PrioridadNivel, { label: string; color: ChipColor; descripcion: string }> = {
	alta: { label: "Alta", color: "error", descripcion: "Score ≥ 70: se extrae primero" },
	media: { label: "Media", color: "warning", descripcion: "Score 40–69" },
	baja: { label: "Baja", color: "info", descripcion: "Score 10–39" },
	archivo: { label: "Archivo", color: "default", descripcion: "Score < 10: solo carpetas archivadas o sin carpetas" },
};

export const PRIORIDAD_COMPONENTES_META: Array<{ key: keyof PrioridadComponentes; label: string; descripcion: string }> = [
	{ key: "carpetas", label: "Carpetas", descripcion: "Carpetas vivas vs. solo archivadas / sin carpetas" },
	{ key: "plan", label: "Plan", descripcion: "Mejor plan entre los usuarios que siguen la causa" },
	{ key: "addon", label: "Add-on", descripcion: "Algún usuario con add-on Conectores de IA" },
	{ key: "prueba", label: "Prueba", descripcion: "Penalización por cuenta de prueba" },
	{ key: "usuarios", label: "Usuarios", descripcion: "Cantidad de usuarios que siguen la causa" },
	{ key: "actividad", label: "Actividad", descripcion: "Movimientos recientes (7 / 30 / 180 días)" },
	{ key: "cola", label: "Cola", descripcion: "Días con documentos esperando texto" },
];

const PLAN_LABELS: Record<string, string> = {
	premium: "Premium",
	pro: "Pro",
	standard: "Standard",
	free: "Free",
};

/** Traduce una clave de `prioridad.motivos` a texto legible. */
export const describePrioridadMotivo = (motivo: string, prioridad?: Prioridad | null): string => {
	if (motivo === "manual") {
		const por = prioridad?.manualPor ? ` por ${prioridad.manualPor}` : "";
		const en = prioridad?.manualEn ? ` el ${formatDateTime(prioridad.manualEn)}` : "";
		const nota = prioridad?.manualNota ? `: ${prioridad.manualNota}` : "";
		return `Fijada a mano${por}${en}${nota}`;
	}
	if (motivo === "carpeta_viva") return "Carpeta viva";
	if (motivo === "solo_archivadas") return "Solo carpetas archivadas";
	if (motivo === "sin_carpetas") return "Sin carpetas";
	if (motivo === "addon_mcp") return "Add-on Conectores de IA";
	if (motivo === "cuenta_prueba") return "Cuenta de prueba";

	const plan = /^plan_(\w+)$/.exec(motivo);
	if (plan) return `Plan ${PLAN_LABELS[plan[1]] || plan[1]}`;

	const usuarios = /^usuarios_(\d+)$/.exec(motivo);
	if (usuarios) return `${usuarios[1]} usuario${usuarios[1] === "1" ? "" : "s"}`;

	const mov = /^mov_(\d+)d$/.exec(motivo);
	if (mov) return `Movimiento en los últimos ${mov[1]} días`;

	const cola = /^cola_(\d+)d$/.exec(motivo);
	if (cola) return `${cola[1]} día${cola[1] === "1" ? "" : "s"} con documentos en cola`;

	return motivo;
};

export const sumDefinitivos = (cat: CoverageCategoria | undefined): number => {
	if (!cat?.definitivos) return 0;
	return (cat.definitivos.reservada || 0) + (cat.definitivos.muy_grande || 0) + (cat.definitivos.otros || 0);
};

const formatDateTime = (value: string | null | undefined): string => {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const chipSx = (compact: boolean) => ({
	height: compact ? 18 : 20,
	minWidth: compact ? 24 : 28,
	fontSize: compact ? "0.65rem" : "0.7rem",
	fontWeight: 700,
	"& .MuiChip-label": { px: 0.6 },
});

interface CategoriaTooltipProps {
	meta: CoverageCategoriaMeta;
	flag: CoverageFlag;
	cat: CoverageCategoria | undefined;
}

const CategoriaTooltip = ({ meta, flag, cat }: CategoriaTooltipProps) => {
	const definitivos = sumDefinitivos(cat);
	return (
		<Box sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
			<Typography variant="caption" fontWeight={700} display="block">
				{meta.label} — {COVERAGE_FLAG_META[flag].label}
			</Typography>
			<Typography variant="caption" display="block" sx={{ opacity: 0.85, mb: 0.5 }}>
				{meta.descripcion}
			</Typography>
			{cat ? (
				<>
					<div>
						Con texto: {cat.conTexto}/{cat.total}
					</div>
					<div>Pendientes: {cat.pendiente}</div>
					<div>Sin PDF: {cat.sinPdf}</div>
					<div>OCR: {cat.needsOcr}</div>
					<div>Fallidos: {cat.failed}</div>
					<div>
						Definitivos: {definitivos}
						{definitivos > 0 && cat.definitivos && (
							<>
								{" "}
								(reservada {cat.definitivos.reservada}, muy grande {cat.definitivos.muy_grande}, otros {cat.definitivos.otros})
							</>
						)}
					</div>
				</>
			) : (
				<div>Sin datos</div>
			)}
			<Typography variant="caption" display="block" sx={{ opacity: 0.75, mt: 0.5 }}>
				{COVERAGE_FLAG_META[flag].descripcion}
			</Typography>
		</Box>
	);
};

export interface CoverageChipsProps {
	coverage?: CausaCoverage | null;
	loading?: boolean;
	compact?: boolean;
}

const CoverageChips = ({ coverage, loading = false, compact = false }: CoverageChipsProps) => {
	if (loading) {
		return (
			<Stack direction="row" spacing={0.5}>
				{COVERAGE_CATEGORIAS.map((c) => (
					<Skeleton key={c.key} variant="rounded" width={compact ? 24 : 28} height={compact ? 18 : 20} />
				))}
			</Stack>
		);
	}

	if (!coverage || !coverage.causaEncontrada || !coverage.flags) {
		return (
			<Typography variant="caption" color="text.secondary">
				—
			</Typography>
		);
	}

	return (
		<Stack direction="row" spacing={0.5} alignItems="center" flexWrap="nowrap">
			{COVERAGE_CATEGORIAS.map((meta) => {
				const flag: CoverageFlag = coverage.flags[meta.key] || "sin_documentos";
				const cat = coverage.categorias?.[meta.key];
				const flagMeta = COVERAGE_FLAG_META[flag];
				const isSinDocs = flag === "sin_documentos";
				return (
					<Tooltip key={meta.key} title={<CategoriaTooltip meta={meta} flag={flag} cat={cat} />} arrow>
						<Chip
							label={isSinDocs ? "—" : meta.letra}
							size="small"
							color={isSinDocs ? "default" : flagMeta.color}
							variant={isSinDocs ? "outlined" : "filled"}
							sx={{
								...chipSx(compact),
								...(isSinDocs && { color: "text.disabled", borderColor: "divider" }),
								...(flag === "no_habilitado" && { bgcolor: "action.selected", color: "text.secondary" }),
							}}
						/>
					</Tooltip>
				);
			})}
		</Stack>
	);
};

export interface ActualizacionChipProps {
	coverage?: CausaCoverage | null;
	loading?: boolean;
	compact?: boolean;
}

export const ActualizacionChip = ({ coverage, loading = false, compact = false }: ActualizacionChipProps) => {
	if (loading) {
		return <Skeleton variant="rounded" width={compact ? 48 : 64} height={compact ? 18 : 20} />;
	}

	if (!coverage || !coverage.causaEncontrada || !coverage.actualizacion) {
		return (
			<Typography variant="caption" color="text.secondary">
				—
			</Typography>
		);
	}

	const { actualizacion, nuevos } = coverage;
	const estado: ActualizacionEstado = actualizacion.estado || "sin_dato";
	const meta = ACTUALIZACION_META[estado];
	const nuevosTotal = nuevos?.total || 0;
	const nuevosSinPdf = nuevos?.sinPdf || 0;
	const nuevosPendiente = nuevos?.pendiente || 0;
	const showDot = nuevosSinPdf + nuevosPendiente > 0;

	const tooltip = (
		<Box sx={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
			<Typography variant="caption" fontWeight={700} display="block">
				Actualización: {meta.label}
			</Typography>
			<div>Última actualización: {formatDateTime(actualizacion.lastUpdate)}</div>
			<div>Umbral: {actualizacion.thresholdHours} h</div>
			{actualizacion.fechaUltimoMovimiento && <div>Último movimiento: {formatDateTime(actualizacion.fechaUltimoMovimiento)}</div>}
			{actualizacion.skipUntil && <div>En cooldown hasta: {formatDateTime(actualizacion.skipUntil)}</div>}
			{nuevosTotal > 0 && (
				<div>
					{nuevosTotal} movimiento{nuevosTotal === 1 ? "" : "s"} nuevo{nuevosTotal === 1 ? "" : "s"} (72 h): {nuevosSinPdf} sin PDF,{" "}
					{nuevosPendiente} sin texto
				</div>
			)}
		</Box>
	);

	const chip = (
		<Chip
			label={meta.label}
			size="small"
			color={meta.color}
			variant={estado === "sin_dato" ? "outlined" : "filled"}
			sx={{
				height: compact ? 18 : 20,
				fontSize: compact ? "0.65rem" : "0.7rem",
				fontWeight: 600,
				"& .MuiChip-label": { px: 0.8 },
				...(estado === "sin_dato" && { color: "text.disabled", borderColor: "divider" }),
				...((estado === "no_actualizable" || estado === "privada") && { bgcolor: "action.selected", color: "text.secondary" }),
			}}
		/>
	);

	return (
		<Tooltip title={tooltip} arrow>
			{showDot ? (
				<Badge
					variant="dot"
					color="warning"
					overlap="rectangular"
					anchorOrigin={{ vertical: "top", horizontal: "right" }}
					sx={{ "& .MuiBadge-badge": { minWidth: 8, height: 8, top: 2, right: 2 } }}
				>
					{chip}
				</Badge>
			) : (
				<span style={{ display: "inline-flex" }}>{chip}</span>
			)}
		</Tooltip>
	);
};

export interface PrioridadChipProps {
	/** `null` → todavía no calculada por el cron; `undefined` → sin cobertura cargada */
	prioridad?: Prioridad | null;
	loading?: boolean;
	compact?: boolean;
	/** Versión grande para el detalle de la causa */
	large?: boolean;
}

const PrioridadTooltip = ({ prioridad }: { prioridad: Prioridad }) => {
	const meta = PRIORIDAD_NIVEL_META[prioridad.nivel] || PRIORIDAD_NIVEL_META.archivo;
	const hasManual = prioridad.manual !== null && prioridad.manual !== undefined;
	const componentes = prioridad.componentes || ({} as Partial<PrioridadComponentes>);
	return (
		<Box sx={{ fontSize: "0.75rem", lineHeight: 1.5, maxWidth: 320 }}>
			<Typography variant="caption" fontWeight={700} display="block">
				Prioridad {meta.label} · {prioridad.score}
				{hasManual && " (manual)"}
			</Typography>
			<Typography variant="caption" display="block" sx={{ opacity: 0.85, mb: 0.5 }}>
				{meta.descripcion}
			</Typography>
			<div>Automática: {prioridad.automatico}</div>
			{hasManual && <div>Manual: {prioridad.manual}</div>}
			{prioridad.motivos?.length > 0 && (
				<Box sx={{ mt: 0.5 }}>
					<Typography variant="caption" fontWeight={700} display="block">
						Motivos
					</Typography>
					{prioridad.motivos.map((m) => (
						<div key={m}>· {describePrioridadMotivo(m, prioridad)}</div>
					))}
				</Box>
			)}
			<Box sx={{ mt: 0.5 }}>
				<Typography variant="caption" fontWeight={700} display="block">
					Componentes
				</Typography>
				<div>
					{PRIORIDAD_COMPONENTES_META.map((c, i) => (
						<span key={c.key}>
							{i > 0 && " · "}
							{c.label} {componentes[c.key] ?? 0}
						</span>
					))}
				</div>
			</Box>
			<Typography variant="caption" display="block" sx={{ opacity: 0.75, mt: 0.5 }}>
				Calculada: {formatDateTime(prioridad.computedAt)}
				{prioridad.version ? ` · v${prioridad.version}` : ""}
			</Typography>
		</Box>
	);
};

/** Chip de prioridad de extracción de textos (nivel + score; pin si hay override manual). */
export const PrioridadChip = ({ prioridad, loading = false, compact = false, large = false }: PrioridadChipProps) => {
	if (loading) {
		return <Skeleton variant="rounded" width={compact ? 56 : 72} height={large ? 28 : compact ? 18 : 20} />;
	}

	if (prioridad === undefined) {
		return (
			<Typography variant="caption" color="text.secondary">
				—
			</Typography>
		);
	}

	const baseSx = {
		height: large ? 28 : compact ? 18 : 20,
		fontSize: large ? "0.85rem" : compact ? "0.65rem" : "0.7rem",
		fontWeight: 700,
		"& .MuiChip-label": { px: large ? 1.2 : 0.8 },
		"& .MuiChip-icon": { ml: large ? 0.8 : 0.5, mr: -0.3 },
	};

	if (prioridad === null) {
		return (
			<Tooltip title="La prioridad todavía no fue calculada por el cron horario" arrow>
				<Chip
					label="Sin calcular"
					size="small"
					variant="outlined"
					sx={{ ...baseSx, fontWeight: 600, color: "text.disabled", borderColor: "divider" }}
				/>
			</Tooltip>
		);
	}

	const meta = PRIORIDAD_NIVEL_META[prioridad.nivel] || PRIORIDAD_NIVEL_META.archivo;
	const hasManual = prioridad.manual !== null && prioridad.manual !== undefined;
	const label = `${meta.label} · ${prioridad.score}${hasManual && !compact ? " (manual)" : ""}`;

	return (
		<Tooltip title={<PrioridadTooltip prioridad={prioridad} />} arrow>
			<Chip
				label={label}
				size="small"
				color={meta.color}
				variant="filled"
				icon={hasManual ? <UserEdit size={large ? 16 : compact ? 11 : 13} variant="Bold" color="currentColor" /> : undefined}
				sx={{
					...baseSx,
					...(prioridad.nivel === "archivo" && { bgcolor: "action.selected", color: "text.secondary" }),
				}}
			/>
		</Tooltip>
	);
};

/** Leyenda compacta para cabeceras de tabla */
export const CoverageLegend = () => (
	<Stack spacing={0.5}>
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
			<Typography variant="caption" color="text.secondary">
				<b>Textos</b>: R resoluciones · C cédulas · E escritos · D DEO · Dg diligenciadas.
			</Typography>
			<Chip label="completo" size="small" color="success" sx={chipSx(true)} />
			<Chip label="en curso" size="small" color="warning" sx={chipSx(true)} />
			<Chip label="incompleto" size="small" color="error" sx={chipSx(true)} />
			<Chip label="no habilitado" size="small" sx={{ ...chipSx(true), bgcolor: "action.selected", color: "text.secondary" }} />
			<Chip label="—" size="small" variant="outlined" sx={{ ...chipSx(true), color: "text.disabled", borderColor: "divider" }} />
			<Typography variant="caption" color="text.secondary">
				sin documentos
			</Typography>
		</Stack>
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
			<Typography variant="caption" color="text.secondary">
				<b>Prioridad</b> de extracción (0–100, según carpetas vivas, plan, add-on, usuarios, actividad y cola):
			</Typography>
			<Chip label="alta ≥70" size="small" color="error" sx={chipSx(true)} />
			<Chip label="media 40–69" size="small" color="warning" sx={chipSx(true)} />
			<Chip label="baja 10–39" size="small" color="info" sx={chipSx(true)} />
			<Chip label="archivo <10" size="small" sx={{ ...chipSx(true), bgcolor: "action.selected", color: "text.secondary" }} />
			<Typography variant="caption" color="text.secondary">
				· el ícono <UserEdit size={11} variant="Bold" style={{ verticalAlign: "middle" }} /> marca un override manual
			</Typography>
		</Stack>
	</Stack>
);

export default CoverageChips;
