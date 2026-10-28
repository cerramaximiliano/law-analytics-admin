import { Chip, Tooltip, alpha } from "@mui/material";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";
import { ESTADO_LABEL, EstadoCaso, MOTIVO_LABEL, MotivoRevision, ComponenteEval } from "api/hcRelevamiento";
import { formatPercent } from "utils/format";

export const ROJO = "#E5484D";
export const GRIS = "#8B8D98";

export const COLOR_ESTADO: Record<string, string> = {
	cerrado: LIVE_GREEN,
	ok: LIVE_GREEN,
	explicado: BRAND_BLUE,
	insumo: STALE_AMBER,
	abierto: ROJO,
	sentencia: GRIS,
	docente: GRIS,
	investigador: GRIS,
	descartado: GRIS,
	fuera_de_alcance: GRIS,
	error_motor: ROJO,
	sin_comparables: GRIS,
	reemplazado: GRIS,
	procesando: BRAND_BLUE,
	procesada: LIVE_GREEN,
	sin_hallazgos: GRIS,
	error: ROJO,
	sin_dato: GRIS,
	pendiente: STALE_AMBER,
	corregida: BRAND_BLUE,
	validada: LIVE_GREEN,
	descartada: GRIS,
};

// Chips ocre/amarillos siempre con letra oscura (convención de la admin)
const textoSobre = (color: string, isDark: boolean) => (color === STALE_AMBER ? (isDark ? STALE_AMBER : "#5C3D00") : color);

export function EstadoChip({ estado, isDark, label }: { estado: string; isDark: boolean; label?: string }) {
	const color = COLOR_ESTADO[estado] || GRIS;
	return (
		<Chip
			size="small"
			label={label || ESTADO_LABEL[estado as EstadoCaso] || estado}
			sx={{
				height: 22,
				fontSize: "0.7rem",
				fontWeight: 600,
				bgcolor: alpha(color, isDark ? 0.18 : 0.12),
				color: textoSobre(color, isDark),
				border: `1px solid ${alpha(color, 0.35)}`,
			}}
		/>
	);
}

export function MotivoChip({ motivo, isDark }: { motivo: MotivoRevision; isDark: boolean }) {
	return (
		<Chip
			size="small"
			variant="outlined"
			label={MOTIVO_LABEL[motivo] || motivo}
			sx={{ height: 22, fontSize: "0.68rem", borderColor: alpha(STALE_AMBER, 0.5), color: textoSobre(STALE_AMBER, isDark) }}
		/>
	);
}

/** Componente con su estado y la diferencia relativa contra lo impreso. */
export function ComponenteChip({ nombre, c, isDark }: { nombre: string; c?: ComponenteEval; isDark: boolean }) {
	if (!c) return null;
	const color = COLOR_ESTADO[c.estado] || GRIS;
	const dif = c.e === null || c.e === undefined ? "" : ` ${formatPercent(c.e * 100, c.estado === "ok" ? 3 : 2)}`;
	return (
		<Tooltip title={[c.estado, c.regla ? `${c.regla}=${String(c.valor)}` : "", c.nota || ""].filter(Boolean).join(" · ")}>
			<Chip
				size="small"
				label={`${nombre}${c.estado === "ok" ? "" : dif}`}
				sx={{
					height: 20,
					fontSize: "0.66rem",
					fontFamily: "monospace",
					bgcolor: alpha(color, isDark ? 0.16 : 0.1),
					color: textoSobre(color, isDark),
				}}
			/>
		</Tooltip>
	);
}

export function fmtNum(n: number | null | undefined, dec = 2): string {
	if (n === null || n === undefined || Number.isNaN(n)) return "—";
	return Number(n).toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtFechaHora(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

/** Normaliza una fecha del PRPA (Date ISO, AAAA-MM-DD o DD/MM/AAAA) a AAAA-MM-DD. */
export function isoDia(v: string | null | undefined): string {
	if (!v) return "";
	const t = String(v);
	let m = /^(\d{4}-\d{2}-\d{2})/.exec(t);
	if (m) return m[1];
	m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
	return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

export const headSx = (isDark: boolean) => ({
	"& .MuiTableCell-head": {
		bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04),
		borderBottom: `1px solid ${headerBorder(isDark)}`,
		fontSize: "0.72rem",
		fontWeight: 600,
		textTransform: "uppercase" as const,
		letterSpacing: "0.04em",
		color: "text.secondary",
	},
});
