import React, { useMemo, useState } from "react";
import { Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Tooltip, Typography } from "@mui/material";
import { JourneyPeriod, JourneyV2 } from "api/journey";
import { fmt, pct, per1000, periodAltas, periodConv, periodTotal, PERIOD_LABEL } from "./journeyFormat";

const DARK = "#1f1f1f";

interface Props {
	v2: JourneyV2;
	period: JourneyPeriod;
	onOpen: (id: string) => void;
}

type SortKey = "sent" | "opens" | "clicks" | "altas" | "per1000" | "bounce";

// Señales para decidir estrategia: comparación de variantes de captación, tiempo hasta convertir, cohortes y envejecimiento de usuarios.
const JourneyStrategy: React.FC<Props> = ({ v2, period, onOpen }) => {
	const [sortKey, setSortKey] = useState<SortKey>("per1000");
	const [dir, setDir] = useState<"asc" | "desc">("desc");

	const rows = useMemo(() => {
		const list = Object.entries(v2.campaigns)
			.filter(([, c]) => c.tipo === "captacion" && c.status !== "draft")
			.map(([id, c]) => {
				const t = periodTotal(c, period);
				const altas = periodAltas(c, period);
				return {
					id,
					c,
					t,
					altas,
					conv: periodConv(c, period),
					per1000: t.sent > 0 ? (altas / t.sent) * 1000 : 0,
					opens: t.delivered > 0 ? t.opens / t.delivered : 0,
					clicks: t.delivered > 0 ? t.clicks / t.delivered : 0,
					bounce: t.sent > 0 ? t.hardBounce / t.sent : 0,
					coord: c.coordinator?.[period],
				};
			})
			.filter((r) => r.t.sent > 0 || r.c.status === "active");
		const get = (r: (typeof list)[number]) => (sortKey === "sent" ? r.t.sent : sortKey === "altas" ? r.altas : r[sortKey]);
		return list.sort((a, b) => (dir === "asc" ? get(a) - get(b) : get(b) - get(a)));
	}, [v2, period, sortKey, dir]);

	const sortBy = (k: SortKey) => {
		if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setSortKey(k);
			setDir("desc");
		}
	};
	const head = (k: SortKey, label: string) => (
		<TableCell align="right">
			<TableSortLabel active={sortKey === k} direction={sortKey === k ? dir : "desc"} onClick={() => sortBy(k)}>
				{label}
			</TableSortLabel>
		</TableCell>
	);

	const aging = Object.entries(v2.usersAging);

	return (
		<Box sx={{ display: "grid", gap: 2 }}>
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" fontWeight="bold">
					Variantes de captación · {PERIOD_LABEL[period]}
				</Typography>
				<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
					Para decidir dónde poner el volumen (tope diario): altas cada 1.000 envíos, apertura y clic sobre entregados. Con pocas altas la
					comparación es ruidosa.
				</Typography>
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Campaña</TableCell>
								{head("sent", "Enviados")}
								{head("opens", "Apertura")}
								{head("clicks", "Clic")}
								{head("altas", "Altas")}
								{head("per1000", "Altas c/1.000")}
								<TableCell align="right">Mediana a convertir</TableCell>
								{head("bounce", "Rebote def.")}
								<TableCell align="right">Quejas</TableCell>
								<TableCell>Señales</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{rows.map((r) => (
								<TableRow key={r.id} hover onClick={() => onOpen(r.id)} sx={{ cursor: "pointer" }}>
									<TableCell>{r.c.name.replace("Captación PJN · ", "")}</TableCell>
									<TableCell align="right">{fmt(r.t.sent)}</TableCell>
									<TableCell align="right">{pct(r.t.opens, r.t.delivered)}</TableCell>
									<TableCell align="right">{pct(r.t.clicks, r.t.delivered)}</TableCell>
									<TableCell align="right">{fmt(r.altas)}</TableCell>
									<TableCell align="right">{per1000(r.altas, r.t.sent)}</TableCell>
									<TableCell align="right">{r.conv.medianDays !== null ? `${r.conv.medianDays} d` : "—"}</TableCell>
									<TableCell align="right">{pct(r.t.hardBounce, r.t.sent)}</TableCell>
									<TableCell align="right">{fmt(r.t.complained)}</TableCell>
									<TableCell>
										{r.c.health.length > 0 && (
											<Tooltip title={r.c.health.map((h) => h.texto).join(" · ")}>
												<Chip size="small" label="Alerta de salud" color="error" sx={{ mr: 0.5 }} />
											</Tooltip>
										)}
										{r.coord && r.coord.deferred + r.coord.wouldDefer > 0 && (
											<Tooltip
												title={`${fmt(r.coord.deferred)} diferidos y ${fmt(r.coord.wouldDefer)} en prueba por el tope del coordinador`}
											>
												<Chip
													size="small"
													label={`Coordinador: ${fmt(r.coord.deferred + r.coord.wouldDefer)}`}
													sx={{ bgcolor: "#fde047", color: DARK, fontWeight: 600 }}
												/>
											</Tooltip>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			</Paper>

			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
					Cohortes por semana de ingreso (últimas 12)
				</Typography>
				<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
					{Object.entries(v2.cohorts).map(([key, list]) => (
						<Box key={key}>
							<Typography variant="subtitle2">{key === "captacion" ? "Captación → alta en la app" : `${key} → plan pago`}</Typography>
							{list.length === 0 ? (
								<Typography variant="caption" color="textSecondary">
									Sin ingresos en las últimas 12 semanas.
								</Typography>
							) : (
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Semana (lunes)</TableCell>
											<TableCell align="right">Entraron</TableCell>
											<TableCell align="right">Convirtieron</TableCell>
											<TableCell align="right">%</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{list.map((w) => (
											<TableRow key={w.week}>
												<TableCell>{w.week}</TableCell>
												<TableCell align="right">{fmt(w.entered)}</TableCell>
												<TableCell align="right">{fmt(w.converted)}</TableCell>
												<TableCell align="right">{pct(w.converted, w.entered)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</Box>
					))}
				</Box>
			</Paper>

			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
					Usuarios: días en cada etapa
				</Typography>
				<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
					Desde etapaCicloDesde. Los activos free de más de 30/60/90 días no tienen campaña: es la próxima que conviene crear.
				</Typography>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Etapa</TableCell>
							<TableCell align="right">Usuarios</TableCell>
							<TableCell align="right">Promedio (días)</TableCell>
							<TableCell align="right">&lt; 7 d</TableCell>
							<TableCell align="right">7–30 d</TableCell>
							<TableCell align="right">30–60 d</TableCell>
							<TableCell align="right">&gt; 60 d</TableCell>
							<TableCell align="right">&gt; 30 d</TableCell>
							<TableCell align="right">&gt; 90 d</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{aging.map(([etapa, a]) => (
							<TableRow key={etapa} hover>
								<TableCell>{etapa}</TableCell>
								<TableCell align="right">{fmt(a.n)}</TableCell>
								<TableCell align="right">{a.avgDays}</TableCell>
								<TableCell align="right">{fmt(a.lt7)}</TableCell>
								<TableCell align="right">{fmt(a.d7_30)}</TableCell>
								<TableCell align="right">{fmt(a.d30_60)}</TableCell>
								<TableCell align="right">{fmt(a.gt60)}</TableCell>
								<TableCell align="right" sx={etapa === "activo_free" ? { fontWeight: 700 } : undefined}>
									{fmt(a.gt30)}
								</TableCell>
								<TableCell align="right" sx={etapa === "activo_free" ? { fontWeight: 700 } : undefined}>
									{fmt(a.gt90)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Paper>
		</Box>
	);
};

export default JourneyStrategy;
