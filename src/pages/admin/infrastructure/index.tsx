import React, { useEffect, useState, useCallback } from "react";
import {
	Grid,
	Typography,
	Box,
	Chip,
	Stack,
	IconButton,
	Tooltip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Alert,
} from "@mui/material";
import { Refresh, Cloud, Cpu, Activity, Timer1, Warning2 } from "iconsax-react";
import MainCard from "components/MainCard";
import { FailoverService, FailoverStatus, FailoverHistoryEntry } from "api/workers";

// ====== Helpers ======

function formatDate(val: string | null | undefined): string {
	if (!val) return "N/A";
	return new Date(val).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		timeZone: "America/Argentina/Buenos_Aires",
	});
}

function formatElapsed(ms: number | null): string {
	if (ms === null) return "N/A";
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s}s`;
	const m = Math.round(s / 60);
	if (m < 60) return `${m}m`;
	return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDuration(activatedAt: string | null): string {
	if (!activatedAt) return "";
	const ms = Date.now() - new Date(activatedAt).getTime();
	const totalMin = Math.floor(ms / 60000);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function truncateArn(arn: string): string {
	// Mostrar solo la parte final: cluster/task-name/taskId
	const parts = arn.split("/");
	if (parts.length >= 2) return parts.slice(-2).join("/");
	return arn;
}

function estimateCost(activatedAt: string | null, taskCount: number): string {
	if (!activatedAt) return "$0.00";
	const hours = (Date.now() - new Date(activatedAt).getTime()) / 3600000;
	// cloud-manager: $0.016/h, cada worker task: $0.064/h
	const cost = 0.016 * hours + 0.064 * taskCount * hours;
	return `$${cost.toFixed(2)}`;
}

// ====== Componente principal ======

const InfrastructurePage = () => {
	const [status, setStatus] = useState<FailoverStatus | null>(null);
	const [history, setHistory] = useState<FailoverHistoryEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const [statusRes, historyRes] = await Promise.all([
				FailoverService.getStatus(),
				FailoverService.getHistory(),
			]);
			if (statusRes.data.success) setStatus(statusRes.data.data);
			if (historyRes.data.success) setHistory(historyRes.data.data);
			setLastRefresh(new Date());
		} catch (err) {
			console.error("Error cargando estado de failover:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 30000);
		return () => clearInterval(interval);
	}, [fetchData]);

	const cloudActive = status?.cloudActive ?? false;

	return (
		<Grid container spacing={3}>
			{/* Banner de estado */}
			<Grid item xs={12}>
				<Alert
					severity={cloudActive ? "error" : "success"}
					icon={cloudActive ? <Warning2 /> : <Activity />}
					sx={{ fontSize: "1rem", fontWeight: 600, alignItems: "center" }}
					action={
						<Tooltip title="Actualizar">
							<IconButton size="small" onClick={fetchData} disabled={loading}>
								<Refresh size={18} />
							</IconButton>
						</Tooltip>
					}
				>
					{cloudActive ? (
						<>
							<strong>CLOUD FAILOVER ACTIVO</strong>
							{status?.activatedAt && ` — Activado hace ${formatDuration(status.activatedAt)}`}
							{status?.reason && ` (${status.reason})`}
						</>
					) : (
						<strong>ON-PREM ACTIVO — Funcionamiento normal</strong>
					)}
					{lastRefresh && (
						<Typography variant="caption" sx={{ ml: 2, opacity: 0.7 }}>
							Actualizado: {formatDate(lastRefresh.toISOString())}
						</Typography>
					)}
				</Alert>
			</Grid>

			{/* Cards de estado */}
			<Grid item xs={12} sm={4}>
				<MainCard>
					<Stack spacing={1} alignItems="flex-start">
						<Stack direction="row" spacing={1} alignItems="center">
							<Cpu size={20} />
							<Typography variant="subtitle2" color="text.secondary">
								Servidor activo
							</Typography>
						</Stack>
						<Chip
							label={cloudActive ? "Cloud (ECS Fargate)" : "On-prem (worker_02)"}
							color={cloudActive ? "error" : "success"}
							size="small"
						/>
						{status?.updatedAt && (
							<Typography variant="caption" color="text.secondary">
								Actualizado: {formatDate(status.updatedAt)}
							</Typography>
						)}
					</Stack>
				</MainCard>
			</Grid>

			<Grid item xs={12} sm={4}>
				<MainCard>
					<Stack spacing={1} alignItems="flex-start">
						<Stack direction="row" spacing={1} alignItems="center">
							<Timer1 size={20} />
							<Typography variant="subtitle2" color="text.secondary">
								Heartbeat on-prem
							</Typography>
						</Stack>
						{status?.heartbeat.msSinceLastPoll !== null ? (
							<>
								<Chip
									label={status?.heartbeat.alive ? "Vivo" : "Sin respuesta"}
									color={status?.heartbeat.alive ? "success" : "error"}
									size="small"
								/>
								<Typography variant="caption" color="text.secondary">
									Último poll: hace {formatElapsed(status?.heartbeat.msSinceLastPoll ?? null)}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{formatDate(status?.heartbeat.lastPoll ?? null)}
								</Typography>
							</>
						) : (
							<Typography variant="body2" color="text.secondary">
								N/A
							</Typography>
						)}
					</Stack>
				</MainCard>
			</Grid>

			<Grid item xs={12} sm={4}>
				<MainCard>
					<Stack spacing={1} alignItems="flex-start">
						<Stack direction="row" spacing={1} alignItems="center">
							<Cloud size={20} />
							<Typography variant="subtitle2" color="text.secondary">
								Leader Lock
							</Typography>
						</Stack>
						{status?.leaderLock ? (
							<>
								<Chip
									label={`${status.leaderLock.lockedBy} (prioridad ${status.leaderLock.priority})`}
									color={status.leaderLock.lockedBy === "cloud" ? "warning" : "success"}
									size="small"
								/>
								<Typography variant="caption" color="text.secondary">
									Expira: {formatDate(status.leaderLock.expiresAt)}
								</Typography>
							</>
						) : (
							<Typography variant="body2" color="text.secondary">
								N/A — sin lock activo
							</Typography>
						)}
					</Stack>
				</MainCard>
			</Grid>

			{/* Tasks ECS (solo visible si cloud activo) */}
			{cloudActive && (
				<Grid item xs={12}>
					<MainCard
						title={
							<Stack direction="row" spacing={1} alignItems="center">
								<Cloud size={18} />
								<span>Workers ECS activos ({status?.cloudTasksTotal ?? 0})</span>
								{status?.activatedAt && (
									<Chip
										label={`Costo estimado: ${estimateCost(status.activatedAt, status?.cloudTasksTotal ?? 0)}`}
										color="warning"
										size="small"
										sx={{ ml: 2 }}
									/>
								)}
							</Stack>
						}
					>
						{status?.cloudTasks && status.cloudTasks.length > 0 ? (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Worker</TableCell>
											<TableCell>Task ARN</TableCell>
											<TableCell>Iniciado</TableCell>
											<TableCell>Tiempo activo</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{status.cloudTasks.map((task, idx) => (
											<TableRow key={idx}>
												<TableCell>
													<Chip label={task.worker} size="small" />
												</TableCell>
												<TableCell>
													<Typography variant="caption" fontFamily="monospace">
														{truncateArn(task.taskArn)}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="caption">{formatDate(task.startedAt)}</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="caption">
														{task.startedAt
															? formatElapsed(Date.now() - new Date(task.startedAt).getTime())
															: "N/A"}
													</Typography>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						) : (
							<Typography variant="body2" color="text.secondary">
								No hay tasks ECS activas registradas.
							</Typography>
						)}
						{status?.cloudStatusUpdatedAt && (
							<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
								Estado de tasks actualizado: {formatDate(status.cloudStatusUpdatedAt)}
							</Typography>
						)}
					</MainCard>
				</Grid>
			)}

			{/* Historial de failovers */}
			<Grid item xs={12}>
				<MainCard title="Historial de failovers (últimos 20 eventos)">
					{history.length > 0 ? (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Evento</TableCell>
										<TableCell>Razón</TableCell>
										<TableCell>Duración</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{history.map((entry, idx) => (
										<TableRow key={idx}>
											<TableCell>
												<Typography variant="caption">{formatDate(entry.at)}</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={entry.event === "activated" ? "Activado" : "Desactivado"}
													color={entry.event === "activated" ? "error" : "success"}
													size="small"
												/>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{entry.reason}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{entry.durationMin !== undefined ? `${entry.durationMin} min` : "—"}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					) : (
						<Box sx={{ p: 2 }}>
							<Typography variant="body2" color="text.secondary">
								Sin eventos registrados todavía.
							</Typography>
						</Box>
					)}
				</MainCard>
			</Grid>
		</Grid>
	);
};

export default InfrastructurePage;
