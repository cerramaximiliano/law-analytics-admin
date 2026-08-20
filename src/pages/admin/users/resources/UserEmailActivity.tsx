// Panel de actividad de envíos de UN usuario, unificando las tres colecciones
// donde viven los correos del ecosistema. Se despliega desde la fila del tab
// "Emails" para no obligar a saltar a otra vista.
//
// Regla de lectura que este panel intenta hacer explícita: un 0 no es lo mismo
// que "no se mide". Cada fuente declara qué tiene instrumentado (`tracking`) y
// las etapas sin instrumentar se muestran como "s/d", nunca como cero.

import React, { useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import EmailsEngagementService, { EmailSourceFunnel, UserEmailActivity as Activity } from "api/emailsEngagement";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL } from "themes/dashboardTokens";
import dayjs from "utils/dayjs-config";

const SOURCE_COLOR: Record<string, string> = {
	movimientos: BRAND_BLUE,
	calendario: PRO_TEAL,
	postal: STALE_AMBER,
	jurisprudencia: LIVE_GREEN,
};

// Una etapa del embudo. `valor === null` significa que esa etapa no está
// instrumentada en esta fuente — se dibuja distinto que un cero real.
const Etapa = ({ label, valor, base, color }: { label: string; valor: number | null; base: number; color: string }) => {
	const theme = useTheme();
	const sinDato = valor === null;
	const pct = !sinDato && base > 0 ? Math.round((valor / base) * 100) : null;
	return (
		<Box sx={{ minWidth: 96 }}>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem" }}>
				{label}
			</Typography>
			{sinDato ? (
				<Tooltip title="Esta fuente no tiene esta etapa instrumentada — no es un cero, es que no se mide">
					<Typography variant="body2" sx={{ color: theme.palette.text.disabled, fontStyle: "italic" }}>
						s/d
					</Typography>
				</Tooltip>
			) : (
				<Stack direction="row" spacing={0.5} alignItems="baseline">
					<Typography variant="body2" sx={{ fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>
						{valor.toLocaleString()}
					</Typography>
					{pct !== null && base > 0 && (
						<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
							{pct}%
						</Typography>
					)}
				</Stack>
			)}
		</Box>
	);
};

const FuenteRow = ({ f }: { f: EmailSourceFunnel }) => {
	const theme = useTheme();
	const color = SOURCE_COLOR[f.key] || BRAND_BLUE;
	const vacia = f.correos === 0;
	return (
		<Box
			sx={{
				p: 1.5,
				borderRadius: 1.5,
				border: `1px solid ${theme.palette.divider}`,
				borderLeft: `3px solid ${color}`,
				bgcolor: alpha(color, theme.palette.mode === "dark" ? 0.06 : 0.03),
				opacity: vacia ? 0.6 : 1,
			}}
		>
			<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
				<Box sx={{ minWidth: 150 }}>
					<Typography variant="body2" sx={{ fontWeight: 600 }}>
						{f.label}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{f.ultimo ? `último ${dayjs(f.ultimo).format("DD/MM/YY HH:mm")}` : "sin envíos"}
					</Typography>
				</Box>
				<Etapa label="Correos" valor={f.correos} base={f.correos} color={color} />
				<Etapa label="Entregados" valor={f.entregados} base={f.conTracking} color={color} />
				<Etapa label="Aperturas" valor={f.aperturas} base={f.correos} color={color} />
				<Etapa label="Clicks" valor={f.clicks} base={f.correos} color={color} />
				<Etapa label="Ingresó" valor={f.conversiones} base={f.correos} color={color} />
				{f.entidades !== null && f.entidades !== f.correos && (
					<Tooltip title="Los avisos agrupan varias entidades en un mismo correo: acá va el total de entidades notificadas">
						<Chip size="small" variant="outlined" label={`${f.entidades} entidades`} sx={{ height: 20, fontSize: "0.65rem" }} />
					</Tooltip>
				)}
				{f.fallidos > 0 && (
					<Chip size="small" color="error" variant="outlined" label={`${f.fallidos} fallidos`} sx={{ height: 20, fontSize: "0.65rem" }} />
				)}
			</Stack>
		</Box>
	);
};

const UserEmailActivityPanel: React.FC<{ userId: string }> = ({ userId }) => {
	const [data, setData] = useState<Activity | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		setLoading(true);
		EmailsEngagementService.activity(userId)
			.then((d) => {
				if (alive) setData(d);
			})
			.catch((e) => {
				if (alive) setError(e?.message || "No se pudo cargar la actividad");
			})
			.finally(() => {
				if (alive) setLoading(false);
			});
		return () => {
			alive = false;
		};
	}, [userId]);

	if (loading) {
		return (
			<Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
				<CircularProgress size={16} />
				<Typography variant="caption" color="text.secondary">
					Cargando actividad…
				</Typography>
			</Stack>
		);
	}
	if (error || !data) {
		return (
			<Typography variant="caption" color="error" sx={{ py: 2, display: "block" }}>
				{error || "Sin datos"}
			</Typography>
		);
	}

	return (
		<Box sx={{ py: 2 }}>
			<Grid container spacing={2}>
				<Grid item xs={12} md={8}>
					<Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>
						EMBUDO POR FUENTE
					</Typography>
					<Stack spacing={1}>
						{data.fuentes.map((f) => (
							<FuenteRow key={f.key} f={f} />
						))}
					</Stack>
				</Grid>
				<Grid item xs={12} md={4}>
					{data.campanias.length > 0 && (
						<>
							<Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>
								CAMPAÑAS ({data.campanias.length})
							</Typography>
							<Stack spacing={0.5} sx={{ maxHeight: 150, overflowY: "auto", mb: 2 }}>
								{data.campanias.slice(0, 12).map((c) => (
									<Stack key={c._id} direction="row" spacing={1} justifyContent="space-between">
										<Typography variant="caption" noWrap sx={{ maxWidth: 190 }} title={c.nombre}>
											{c.nombre}
										</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
											{c.aperturas}a / {c.clicks}c
										</Typography>
									</Stack>
								))}
							</Stack>
						</>
					)}
					{data.transaccionales.length > 0 && (
						<>
							<Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>
								TRANSACCIONALES
							</Typography>
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
								{data.transaccionales.map((t) => (
									<Chip
										key={t.categoria}
										size="small"
										variant="outlined"
										label={`${t.categoria}: ${t.n}`}
										sx={{ height: 20, fontSize: "0.65rem" }}
									/>
								))}
							</Stack>
						</>
					)}
				</Grid>
			</Grid>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, fontSize: "0.68rem" }}>
				“s/d” = esa etapa no está instrumentada en esa fuente, no que valga cero. Los clicks de calendario y postal se registran desde el
				20/08; antes de esa fecha no hay datos aunque los correos se hayan enviado.
			</Typography>
		</Box>
	);
};

export default UserEmailActivityPanel;
