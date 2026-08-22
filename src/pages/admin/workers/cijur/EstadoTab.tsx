// Estado del worker CIJur: qué capturó cada canal, hasta qué fecha llegó y
// cómo viene el ciclo diario de vigilancia.

import { Box, Chip, LinearProgress, Paper, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { InfoCircle, Warning2 } from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL } from "themes/dashboardTokens";
import { CijurProgressResponse } from "api/cijur";

const COLOR_CANAL: Record<string, string> = {
	PROVINCIAL: PRO_TEAL,
	NACIONAL: BRAND_BLUE,
};

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-AR"));

const fmtFecha = (iso: string | null | undefined) => {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtHora = (iso: string | null | undefined) => {
	if (!iso) return "nunca";
	return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function Ayuda({ texto }: { texto: string }) {
	return (
		<Tooltip title={texto} arrow placement="top">
			<Box component="span" sx={{ display: "inline-flex", ml: 0.5, opacity: 0.55, cursor: "help", verticalAlign: "middle" }}>
				<InfoCircle size={13} variant="Bold" />
			</Box>
		</Tooltip>
	);
}

export default function EstadoTab({ progress }: { progress: CijurProgressResponse["data"] | null }) {
	const theme = useTheme();
	if (!progress) return <LinearProgress />;

	const { canales, workers, totales } = progress;

	return (
		<Stack spacing={2}>
			{/* Totales */}
			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
				<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 130 }}>
					<Typography variant="h4" fontWeight={700} sx={{ color: BRAND_BLUE, fontVariantNumeric: "tabular-nums" }}>
						{fmt(totales.docs)}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						fallos capturados
					</Typography>
				</Paper>
				<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 130 }}>
					<Typography variant="h4" fontWeight={700} sx={{ color: LIVE_GREEN, fontVariantNumeric: "tabular-nums" }}>
						{fmt(totales.conTexto)}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						con texto útil
						<Ayuda texto="Fallos con más de 1.500 caracteres extraídos del PDF: los que sirven para resumir o indexar." />
					</Typography>
				</Paper>
				<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 130 }}>
					<Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
						{(totales.chars / 1e6).toFixed(2)}M
					</Typography>
					<Typography variant="caption" color="text.secondary">
						caracteres de sentencias
					</Typography>
				</Paper>
				<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 130 }}>
					<Typography
						variant="h4"
						fontWeight={700}
						sx={{ color: totales.errores > 0 ? STALE_AMBER : theme.palette.text.primary, fontVariantNumeric: "tabular-nums" }}
					>
						{fmt(totales.errores)}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						con error de PDF
					</Typography>
				</Paper>
			</Stack>

			{/* Por canal */}
			<Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" } }}>
				{canales.map((c) => {
					const color = COLOR_CANAL[c.canal] || BRAND_BLUE;
					const pct = c.docs ? Math.round((c.conTexto / c.docs) * 100) : 0;
					return (
						<Paper
							key={c.canal}
							variant="outlined"
							sx={{
								p: 2,
								borderRadius: 2,
								borderColor: alpha(color, theme.palette.mode === "dark" ? 0.4 : 0.28),
								bgcolor: alpha(color, theme.palette.mode === "dark" ? 0.08 : 0.04),
							}}
						>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
								<Typography variant="subtitle2" sx={{ color }}>
									{c.canal}
								</Typography>
								<Chip size="small" label={`${c.docs} fallos`} sx={{ bgcolor: alpha(color, 0.14), color, fontWeight: 600, height: 22 }} />
							</Stack>

							<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
								{fmtFecha(c.masAntiguo)} → {fmtFecha(c.masReciente)}
								<Ayuda texto="Rango de publicación en el sitio. El más reciente es la primera página del listado: si el worker está al día, coincide con lo que muestra CIJur hoy." />
							</Typography>

							<Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
								<Typography variant="caption" color="text.secondary">
									con texto útil
								</Typography>
								<Typography variant="caption" sx={{ color, fontWeight: 600 }}>
									{c.conTexto}/{c.docs} ({pct}%)
								</Typography>
							</Stack>
							<LinearProgress
								variant="determinate"
								value={pct}
								sx={{ height: 6, borderRadius: 3, bgcolor: alpha(color, 0.14), "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
							/>

							<Stack direction="row" spacing={2} sx={{ mt: 1.2 }} flexWrap="wrap">
								<Typography variant="caption" color="text.secondary">
									{(c.chars / 1e6).toFixed(2)}M caracteres
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{c.conVoces} con voces
									<Ayuda texto="Voces son los descriptores que redacta la Procuración. No siempre las carga, y no se republican." />
								</Typography>
								{c.errores > 0 && (
									<Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: STALE_AMBER }}>
										<Warning2 size={13} variant="Bold" />
										<Typography variant="caption" fontWeight={600}>
											{c.errores} con error
										</Typography>
									</Stack>
								)}
							</Stack>
						</Paper>
					);
				})}
			</Box>

			{/* Workers */}
			{workers.map((w) => (
				<Paper key={w.workerId} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
						<Typography variant="subtitle2">{w.workerId}</Typography>
						<Chip
							size="small"
							label={w.enabled ? "activo" : "detenido"}
							sx={{
								bgcolor: alpha(w.enabled ? LIVE_GREEN : theme.palette.text.disabled, 0.14),
								color: w.enabled ? LIVE_GREEN : theme.palette.text.disabled,
								fontWeight: 600,
								height: 22,
							}}
						/>
					</Stack>
					<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
						<Typography variant="caption" color="text.secondary">
							Cron: <b>{w.cronPattern || "—"}</b> (UTC)
							<Ayuda texto="El sitio publica ~1 fallo por mes y por canal, así que un cron diario alcanza. Revisar más seguido sería tráfico sin ganancia." />
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Revisa <b>{w.paginasPorCiclo}</b> páginas por ciclo
							<Ayuda texto="Más de una por si publican varias entradas juntas: con la primera sola, dos altas el mismo día podrían quedar fuera de alcance." />
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Último ciclo: <b>{fmtHora(w.lastRunAt)}</b>
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Canales: <b>{w.canales.join(", ") || "—"}</b>
						</Typography>
					</Stack>
					{w.lastErrorMessage && (
						<Typography variant="caption" sx={{ color: STALE_AMBER, display: "block", mt: 1 }}>
							Último error ({fmtHora(w.lastErrorAt)}): {w.lastErrorMessage}
						</Typography>
					)}
				</Paper>
			))}
		</Stack>
	);
}
