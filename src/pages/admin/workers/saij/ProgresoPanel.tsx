// Avance de cada worker SAIJ: cuánto lleva capturado y en qué año va el
// barrido hasta alcanzar el presente.
//
// Las cantidades salen de contar la colección (endpoint /saij/config/progress),
// no de stats.totalSuccess: ese contador acumula intentos y se desfasa con los
// reinicios, los duplicados salteados y los cursores que rebobinan.

import { useEffect, useState } from "react";
import { Box, Chip, LinearProgress, Paper, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { InfoCircle, Warning2 } from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL } from "themes/dashboardTokens";
import { getSaijProgress, SaijWorkerProgress } from "api/saij";

const COLOR_JURISDICCION: Record<string, string> = {
	NACIONAL: BRAND_BLUE,
	PROVINCIAL: PRO_TEAL,
	CSJN: "#8B5CF6",
};

const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-AR"));

const fmtFecha = (iso: string | null) => {
	if (!iso) return "—";
	const d = new Date(iso);
	return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

function Ayuda({ texto }: { texto: string }) {
	return (
		<Tooltip title={texto} arrow placement="top">
			<Box component="span" sx={{ display: "inline-flex", ml: 0.5, opacity: 0.55, cursor: "help", verticalAlign: "middle" }}>
				<InfoCircle size={13} variant="Bold" />
			</Box>
		</Tooltip>
	);
}

function WorkerCard({ w }: { w: SaijWorkerProgress }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const color = COLOR_JURISDICCION[w.jurisdiccion] || BRAND_BLUE;
	const incremental = w.mode === "incremental";

	// El cursor solo tiene sentido en backfill: en incremental el worker ya no
	// recorre el calendario, vigila novedades por fecha-umod.
	const posicion = incremental
		? "Solo novedades"
		: w.cursor.year
			? `${w.cursor.year}/${String(w.cursor.month ?? 1).padStart(2, "0")}`
			: "—";

	const estado = !w.enabled ? "detenido" : w.paused ? "pausado" : incremental ? "al día" : "backfill";
	const estadoColor = !w.enabled ? theme.palette.text.disabled : w.paused ? STALE_AMBER : incremental ? LIVE_GREEN : color;

	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2,
				borderRadius: 2,
				borderColor: alpha(color, isDark ? 0.4 : 0.28),
				bgcolor: alpha(color, isDark ? 0.08 : 0.04),
				opacity: w.enabled ? 1 : 0.6,
			}}
		>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.2 }}>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle2" sx={{ color, lineHeight: 1.25 }} noWrap title={w.workerId}>
						{w.workerId}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{w.jurisdiccion}
						{w.cronPattern ? ` · ${w.cronPattern}` : ""}
					</Typography>
				</Box>
				<Chip
					size="small"
					label={estado}
					sx={{ bgcolor: alpha(estadoColor, 0.14), color: estadoColor, fontWeight: 600, height: 22 }}
				/>
			</Stack>

			<Stack direction="row" spacing={2} sx={{ mb: 1.2 }}>
				<Box>
					<Typography variant="h5" fontWeight={700} sx={{ color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
						{fmt(w.docs)}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						capturados
						<Ayuda texto="Documentos de este worker contados sobre la colección, no el acumulado de intentos." />
					</Typography>
				</Box>
				<Box>
					<Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
						{posicion}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{incremental ? "modo" : "procesando"}
						<Ayuda
							texto={
								incremental
									? "El backfill terminó. Ahora solo busca lo recién dado de alta en SAIJ, ordenado por fecha-umod."
									: `Año/mes que está barriendo. Avanza desde ${w.cursor.yearFrom} hasta ${w.cursor.yearTarget}.`
							}
						/>
					</Typography>
				</Box>
			</Stack>

			{!incremental && (
				<Box sx={{ mb: 1 }}>
					<Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
						<Typography variant="caption" color="text.secondary">
							{w.cursor.yearFrom} → {w.cursor.yearTarget}
						</Typography>
						<Typography variant="caption" sx={{ color, fontWeight: 600 }}>
							{w.avance}%
						</Typography>
					</Stack>
					<LinearProgress
						variant="determinate"
						value={w.avance}
						sx={{
							height: 6,
							borderRadius: 3,
							bgcolor: alpha(color, 0.14),
							"& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
						}}
					/>
				</Box>
			)}

			<Stack direction="row" spacing={2} flexWrap="wrap">
				<Typography variant="caption" color="text.secondary">
					Último ciclo: {fmtFecha(w.lastRunAt)}
				</Typography>
				{w.rateLimit != null && (
					<Typography variant="caption" color="text.secondary">
						{w.rateLimit} req/min
					</Typography>
				)}
				{w.rechazos.ultimaHora > 0 && (
					<Tooltip title="SAIJ devolvió 403 por exceso de pedidos en la última hora" arrow>
						<Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: STALE_AMBER }}>
							<Warning2 size={13} variant="Bold" />
							<Typography variant="caption" fontWeight={600}>
								{w.rechazos.ultimaHora} rechazos
							</Typography>
						</Stack>
					</Tooltip>
				)}
			</Stack>
		</Paper>
	);
}

export default function ProgresoPanel() {
	const theme = useTheme();
	const [workers, setWorkers] = useState<SaijWorkerProgress[]>([]);
	const [totales, setTotales] = useState<{ porJurisdiccion: Record<string, number>; docs: number; rateAgregado: number; rechazosUltimaHora: number } | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let vivo = true;
		const cargar = async () => {
			try {
				const res = await getSaijProgress();
				if (!vivo) return;
				setWorkers(res.data.workers);
				setTotales(res.data.totales);
				setError(null);
			} catch (e: any) {
				if (vivo) setError(e?.message || "No se pudo cargar el progreso");
			}
		};
		cargar();
		const t = setInterval(cargar, 60000);
		return () => {
			vivo = false;
			clearInterval(t);
		};
	}, []);

	if (error) {
		return (
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="body2" color="error">
					{error}
				</Typography>
			</Paper>
		);
	}

	return (
		<Stack spacing={2}>
			{totales && (
				<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
					<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 130 }}>
						<Typography variant="h4" fontWeight={700} sx={{ color: BRAND_BLUE, fontVariantNumeric: "tabular-nums" }}>
							{fmt(totales.docs)}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							documentos totales
						</Typography>
					</Paper>
					{Object.entries(totales.porJurisdiccion).map(([j, n]) => (
						<Paper key={j} variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 120 }}>
							<Typography
								variant="h4"
								fontWeight={700}
								sx={{ color: COLOR_JURISDICCION[j] || BRAND_BLUE, fontVariantNumeric: "tabular-nums" }}
							>
								{fmt(n)}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{j.toLowerCase()}
							</Typography>
						</Paper>
					))}
					<Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 130 }}>
						<Typography
							variant="h4"
							fontWeight={700}
							sx={{
								color: totales.rechazosUltimaHora > 0 ? STALE_AMBER : theme.palette.text.primary,
								fontVariantNumeric: "tabular-nums",
							}}
						>
							{totales.rateAgregado}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							req/min agregados
							<Ayuda texto="Suma del ritmo de los workers activos. SAIJ limita por IP, y el limitador de cada worker es por proceso: ninguno ve este total por su cuenta." />
						</Typography>
					</Paper>
				</Stack>
			)}

			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
				}}
			>
				{workers.map((w) => (
					<WorkerCard key={w.workerId} w={w} />
				))}
			</Box>
		</Stack>
	);
}
