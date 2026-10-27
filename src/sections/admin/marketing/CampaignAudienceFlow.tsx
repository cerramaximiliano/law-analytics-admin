import React from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Grid,
	Paper,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip as MuiTooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CampaignAudienceFlow } from "types/campaign";

interface Props {
	loading: boolean;
	error: string | null;
	data: CampaignAudienceFlow | null;
	days: number;
	onDaysChange: (days: number) => void;
	onRefresh: () => void;
	onComputeAltas: () => void;
	altasLoading: boolean;
}

export const EXIT_LABELS: Record<string, string> = {
	segment_sync: "Dejó el segmento o se hizo usuario",
	manual: "Removido a mano",
	bounce: "Rebote",
	complaint: "Queja",
	unsubscribe: "Baja",
	otro: "Otro motivo",
};

const EXIT_KEYS = ["segment_sync", "unsubscribe", "bounce", "complaint", "manual", "otro"];
const fmt = (n: number) => n.toLocaleString("es-AR");

const shortDay = (iso: string) => {
	const [, m, d] = iso.split("-");
	return `${d}/${m}`;
};

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

const CampaignAudienceFlowPanel: React.FC<Props> = ({
	loading,
	error,
	data,
	days,
	onDaysChange,
	onRefresh,
	onComputeAltas,
	altasLoading,
}) => {
	const theme = useTheme();

	const exitColors: Record<string, string> = {
		segment_sync: theme.palette.warning.main,
		unsubscribe: theme.palette.grey[600],
		bounce: theme.palette.error.main,
		complaint: theme.palette.error.dark,
		manual: theme.palette.info.dark,
		otro: theme.palette.grey[400],
	};

	if (loading && !data) {
		return (
			<Grid container spacing={2}>
				<Grid item xs={12}>
					<Skeleton variant="rounded" height={320} />
				</Grid>
			</Grid>
		);
	}
	if (error) {
		return (
			<Alert
				severity="error"
				action={
					<Button color="inherit" size="small" onClick={onRefresh}>
						Reintentar
					</Button>
				}
			>
				{error}
			</Alert>
		);
	}
	if (!data) return null;

	// Salidas en negativo para que el gráfico las muestre hacia abajo.
	const chart = data.daily.map((d) => {
		const row: Record<string, number | string | null> = {
			label: shortDay(d.date),
			Ingresos: d.joined,
			Completados: sum(d.completedByReason),
			Activos: d.activeAtClose,
		};
		EXIT_KEYS.forEach((k) => {
			row[EXIT_LABELS[k]] = -(d.removedByReason[k] || 0);
		});
		return row;
	});
	const totalIn = data.daily.reduce((a, d) => a + d.joined, 0);
	const totalOut = data.daily.reduce((a, d) => a + sum(d.removedByReason), 0);
	const totalDone = data.daily.reduce((a, d) => a + sum(d.completedByReason), 0);
	const seg = data.segment;

	return (
		<Box>
			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
				<Typography variant="subtitle1" fontWeight="bold">
					Ingreso y salida de contactos
				</Typography>
				<ToggleButtonGroup size="small" exclusive value={days} onChange={(_, v) => v && onDaysChange(v)}>
					{[7, 30, 90].map((d) => (
						<ToggleButton key={d} value={d}>
							{d} días
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			</Box>

			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
						<Typography variant="caption" color="textSecondary">
							Segmento vs inscriptos
						</Typography>
						{seg ? (
							<>
								<Typography variant="body2" sx={{ mb: 1 }}>
									{seg.name || "Segmento"} ·{" "}
									<Chip
										size="small"
										label={seg.syncWithSegment ? "Sincroniza" : "Sin sincronizar"}
										color={seg.syncWithSegment ? "success" : "default"}
									/>
								</Typography>
								<Box sx={{ display: "flex", gap: 3 }}>
									<Box>
										<Typography variant="h4">{fmt(seg.size)}</Typography>
										<Typography variant="caption" color="textSecondary">
											cumplen el segmento
										</Typography>
									</Box>
									<Box>
										<Typography variant="h4">{fmt(Math.max(seg.size - seg.pending, 0))}</Typography>
										<Typography variant="caption" color="textSecondary">
											ya inscriptos
										</Typography>
									</Box>
									<Box>
										<Typography variant="h4" sx={{ color: seg.pending > 0 ? theme.palette.warning.dark : "text.primary" }}>
											{fmt(seg.pending)}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											pendientes de entrar
										</Typography>
									</Box>
								</Box>
							</>
						) : (
							<Typography variant="body2" color="textSecondary">
								La campaña no tiene segmento vinculado.
							</Typography>
						)}
					</Paper>
				</Grid>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
						<Typography variant="caption" color="textSecondary">
							Última sincronización
						</Typography>
						{data.lastSync ? (
							<>
								<Typography variant="body2" sx={{ mb: 1 }}>
									{new Date(data.lastSync.at).toLocaleString("es-AR")}
								</Typography>
								<Box sx={{ display: "flex", gap: 3 }}>
									<Box>
										<Typography variant="h4" sx={{ color: theme.palette.success.main }}>
											+{fmt(data.lastSync.added)}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											agregados
										</Typography>
									</Box>
									<Box>
										<Typography variant="h4" sx={{ color: theme.palette.error.main }}>
											−{fmt(data.lastSync.removed)}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											removidos
										</Typography>
									</Box>
									<Box>
										<Typography variant="h4">{data.lastSync.activeAfter != null ? fmt(data.lastSync.activeAfter) : "—"}</Typography>
										<Typography variant="caption" color="textSecondary">
											activos después
										</Typography>
									</Box>
								</Box>
							</>
						) : (
							<Typography variant="body2" color="textSecondary">
								Sin sincronizaciones en el período.
							</Typography>
						)}
					</Paper>
				</Grid>
			</Grid>

			<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
				<Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
					<Chip size="small" label={`Ingresos ${fmt(totalIn)}`} sx={{ bgcolor: theme.palette.success.light, color: "#1f1f1f" }} />
					<Chip size="small" label={`Salidas ${fmt(totalOut)}`} sx={{ bgcolor: theme.palette.warning.light, color: "#1f1f1f" }} />
					<Chip size="small" label={`Completados ${fmt(totalDone)}`} sx={{ bgcolor: theme.palette.info.light, color: "#1f1f1f" }} />
				</Box>
				{chart.length === 0 ? (
					<Typography variant="body2" color="textSecondary" sx={{ py: 4, textAlign: "center" }}>
						Sin movimientos de contactos en los últimos {days} días.
					</Typography>
				) : (
					<Box sx={{ height: 320 }}>
						<ResponsiveContainer width="100%" height="100%">
							<ComposedChart data={chart} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
								<XAxis dataKey="label" tick={{ fontSize: 12 }} />
								<YAxis yAxisId="flow" tick={{ fontSize: 12 }} tickFormatter={(v) => String(Math.abs(Number(v)))} />
								<YAxis yAxisId="active" orientation="right" tick={{ fontSize: 12 }} />
								<Tooltip formatter={(v: number, name: string) => [fmt(Math.abs(Number(v))), name]} />
								<Legend />
								<Bar yAxisId="flow" dataKey="Ingresos" stackId="f" fill={theme.palette.success.main} />
								<Bar yAxisId="flow" dataKey="Completados" stackId="f" fill={theme.palette.info.main} />
								{EXIT_KEYS.map((k) => (
									<Bar key={k} yAxisId="flow" dataKey={EXIT_LABELS[k]} stackId="f" fill={exitColors[k]} />
								))}
								<Line
									yAxisId="active"
									type="monotone"
									dataKey="Activos"
									stroke={theme.palette.primary.main}
									strokeWidth={2}
									dot={false}
									connectNulls
								/>
							</ComposedChart>
						</ResponsiveContainer>
					</Box>
				)}
			</Paper>

			<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
				<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
					<Box>
						<Typography variant="subtitle2">Altas en la app (cruce por correo)</Typography>
						<Typography variant="caption" color="textSecondary">
							Usuarios cuyo correo recibió esta campaña y se registraron después del primer envío. Solo conteo.
						</Typography>
					</Box>
					{data.altas ? (
						<Box sx={{ textAlign: "right" }}>
							<Typography variant="h4" sx={{ color: theme.palette.success.main }}>
								{fmt(data.altas.total)}
							</Typography>
							<Typography variant="caption" color="textSecondary">
								de {fmt(data.altas.recipients)} destinatarios
							</Typography>
						</Box>
					) : (
						<Button
							variant="outlined"
							size="small"
							onClick={onComputeAltas}
							disabled={altasLoading}
							startIcon={altasLoading ? <CircularProgress size={14} /> : undefined}
						>
							Calcular altas
						</Button>
					)}
				</Box>
			</Paper>

			<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
				Últimas sincronizaciones
			</Typography>
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Hora</TableCell>
							<TableCell align="right">Agregados</TableCell>
							<TableCell align="right">Removidos</TableCell>
							<TableCell align="right">Activos después</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{data.recentSyncs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} align="center">
									<Typography variant="body2" color="textSecondary">
										Sin sincronizaciones en el período
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							data.recentSyncs.map((s) => (
								<TableRow key={s.at} hover>
									<TableCell>{new Date(s.at).toLocaleString("es-AR")}</TableCell>
									<TableCell align="right" sx={{ color: s.added ? theme.palette.success.main : undefined }}>
										{s.added ? `+${fmt(s.added)}` : "0"}
									</TableCell>
									<TableCell align="right" sx={{ color: s.removed ? theme.palette.error.main : undefined }}>
										{s.removed ? `−${fmt(s.removed)}` : "0"}
									</TableCell>
									<TableCell align="right">{s.activeAfter != null ? fmt(s.activeAfter) : "—"}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<MuiTooltip title="Se muestran las últimas 20 sincronizaciones del período">
				<Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: "inline-block" }}>
					Las salidas por &quot;dejó de cumplir el segmento&quot; suelen ser personas que se registraron en la app. La sincronización corre
					cada 15 minutos, pero cada segmento solo se recalcula cuando le toca (los de captación, cada hora). Los activos de hoy se cuentan
					en vivo.
				</Typography>
			</MuiTooltip>
		</Box>
	);
};

export default CampaignAudienceFlowPanel;
