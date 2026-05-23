import { useState } from "react";
import { Alert, Box, Button, Chip, IconButton, Paper, Skeleton, Stack, Typography, alpha, useTheme } from "@mui/material";
import { TickCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import LiquidacionWorkerConfigService, { AlertEntry, FullDoc } from "api/liquidacionWorkerConfig";

interface Props {
	doc: FullDoc | null;
	loading: boolean;
	onChanged: () => void;
}

const ALERT_COLORS: Record<string, "error" | "warning" | "info"> = {
	queue_backlog: "warning",
	high_failure_rate: "error",
	worker_stopped: "error",
	config_invalid: "warning",
};

function relativeFromNow(iso: string): string {
	const ms = Date.now() - new Date(iso).getTime();
	if (ms < 0) return "—";
	const s = Math.floor(ms / 1000);
	if (s < 60) return `hace ${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `hace ${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `hace ${h}h`;
	return `hace ${Math.floor(h / 24)}d`;
}

export default function AlertsTab({ doc, loading, onChanged }: Props) {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [acking, setAcking] = useState<number | null>(null);
	const [showAcked, setShowAcked] = useState(false);

	if (loading && !doc) {
		return (
			<Stack spacing={2}>
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rounded" height={64} />
				))}
			</Stack>
		);
	}

	const alerts = doc?.alerts || [];
	// Conservar el índice original (necesario para el ack endpoint)
	const indexed: { entry: AlertEntry; index: number }[] = alerts.map((entry, index) => ({ entry, index }));
	const visible = showAcked ? indexed : indexed.filter(({ entry }) => !entry.acknowledged);
	const active = indexed.filter(({ entry }) => !entry.acknowledged).length;

	const handleAck = async (idx: number) => {
		setAcking(idx);
		try {
			await LiquidacionWorkerConfigService.acknowledgeAlert(idx);
			enqueueSnackbar("Alerta reconocida", { variant: "success" });
			onChanged();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error reconociendo alerta", { variant: "error" });
		} finally {
			setAcking(null);
		}
	};

	return (
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="body2" color="text.secondary">
					{active} {active === 1 ? "alerta activa" : "alertas activas"} · {alerts.length} total (las últimas 100)
				</Typography>
				<Button size="small" variant="text" onClick={() => setShowAcked(!showAcked)}>
					{showAcked ? "Ocultar reconocidas" : "Mostrar reconocidas"}
				</Button>
			</Stack>

			{visible.length === 0 ? (
				<Alert severity="success" icon={<TickCircle size={20} />}>
					{active === 0 ? "No hay alertas activas." : "No hay alertas para mostrar con el filtro actual."}
				</Alert>
			) : (
				<Stack spacing={1}>
					{visible
						.slice()
						.reverse() // más recientes primero
						.map(({ entry, index }) => {
							const severity = ALERT_COLORS[entry.type] || "info";
							const color =
								severity === "error" ? theme.palette.error.main : severity === "warning" ? theme.palette.warning.main : theme.palette.info.main;
							return (
								<Paper
									key={index}
									variant="outlined"
									sx={{
										p: 2,
										borderLeft: 4,
										borderLeftColor: color,
										bgcolor: entry.acknowledged ? alpha(theme.palette.grey[500], 0.05) : "background.paper",
										opacity: entry.acknowledged ? 0.7 : 1,
									}}
								>
									<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
										<Stack spacing={0.5} flex={1}>
											<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
												<Warning2 size={16} color={color} />
												<Chip
													label={entry.type}
													size="small"
													sx={{ fontFamily: "monospace", fontSize: "0.7rem", bgcolor: alpha(color, 0.1), color }}
												/>
												{entry.target && (
													<Chip label={entry.target} size="small" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
												)}
												<Typography variant="caption" color="text.secondary">
													{relativeFromNow(entry.createdAt)}
												</Typography>
												{entry.acknowledged && (
													<Chip label="reconocida" size="small" color="default" />
												)}
											</Stack>
											<Typography variant="body2">{entry.message}</Typography>
										</Stack>
										{!entry.acknowledged && (
											<Button
												size="small"
												variant="outlined"
												disabled={acking === index}
												onClick={() => handleAck(index)}
												startIcon={<TickCircle size={14} />}
											>
												{acking === index ? "…" : "ack"}
											</Button>
										)}
									</Stack>
								</Paper>
							);
						})}
				</Stack>
			)}
		</Stack>
	);
}
