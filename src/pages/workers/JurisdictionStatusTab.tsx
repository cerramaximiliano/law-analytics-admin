import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Stack,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	Chip,
	Tooltip,
	IconButton,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import MEVWorkersService, { JurisdictionStatusDoc, JurisdictionStatusSummary } from "api/workersMEV";

dayjs.extend(relativeTime);

export default function JurisdictionStatusTab() {
	const { enqueueSnackbar } = useSnackbar();

	const [loading, setLoading] = useState(true);
	const [statuses, setStatuses] = useState<JurisdictionStatusDoc[]>([]);
	const [summary, setSummary] = useState<JurisdictionStatusSummary | null>(null);

	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const [statusRes, summaryRes] = await Promise.all([
				MEVWorkersService.getJurisdictionStatus(),
				MEVWorkersService.getJurisdictionStatusSummary(),
			]);
			// Ordenar: no disponibles primero, luego por código
			const sorted = [...statusRes.data].sort((a, b) => {
				if (a.disponible !== b.disponible) return a.disponible ? 1 : -1;
				return a.jurisdictionValue.localeCompare(b.jurisdictionValue, undefined, { numeric: true });
			});
			setStatuses(sorted);
			setSummary(summaryRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Auto-refresh cada 60 segundos
	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const [statusRes, summaryRes] = await Promise.all([
					MEVWorkersService.getJurisdictionStatus(),
					MEVWorkersService.getJurisdictionStatusSummary(),
				]);
				const sorted = [...statusRes.data].sort((a, b) => {
					if (a.disponible !== b.disponible) return a.disponible ? 1 : -1;
					return a.jurisdictionValue.localeCompare(b.jurisdictionValue, undefined, { numeric: true });
				});
				setStatuses(sorted);
				setSummary(summaryRes.data);
			} catch {
				// silenciar errores en auto-refresh
			}
		}, 60000);
		return () => clearInterval(interval);
	}, []);

	const formatRelative = (date: string | null) => {
		if (!date) return "-";
		return dayjs(date).fromNow();
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				<Grid container spacing={2}>
					{[1, 2, 3].map((i) => (
						<Grid item xs={12} sm={4} key={i}>
							<Skeleton variant="rounded" height={100} />
						</Grid>
					))}
				</Grid>
				<Skeleton variant="rounded" height={300} />
			</Stack>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Cards de resumen */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={4}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="body2" color="text.secondary">
								Total jurisdicciones
							</Typography>
							<Typography variant="h3">{summary?.total ?? 0}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card variant="outlined" sx={{ borderColor: "success.main" }}>
						<CardContent>
							<Stack direction="row" alignItems="center" spacing={1}>
								<TickCircle size={18} color="var(--mui-palette-success-main, #4caf50)" variant="Bold" />
								<Typography variant="body2" color="text.secondary">
									Disponibles
								</Typography>
							</Stack>
							<Typography variant="h3" color="success.main">
								{summary?.disponibles ?? 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card variant="outlined" sx={{ borderColor: "error.main" }}>
						<CardContent>
							<Stack direction="row" alignItems="center" spacing={1}>
								<CloseCircle size={18} color="var(--mui-palette-error-main, #f44336)" variant="Bold" />
								<Typography variant="body2" color="text.secondary">
									No disponibles
								</Typography>
							</Stack>
							<Typography variant="h3" color="error.main">
								{summary?.noDisponibles ?? 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Header con refresh */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="body2" color="text.secondary">
					{summary?.lastUpdate ? `Ultima actualizacion: ${formatRelative(summary.lastUpdate)}` : "Sin datos"}
				</Typography>
				<Tooltip title="Actualizar">
					<IconButton onClick={loadData} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* Alerta si hay jurisdicciones caídas */}
			{summary && summary.noDisponibles > 0 && (
				<Alert severity="warning">
					{summary.noDisponibles} jurisdicci{summary.noDisponibles === 1 ? "on" : "ones"} no disponible{summary.noDisponibles === 1 ? "" : "s"} actualmente
				</Alert>
			)}

			{statuses.length === 0 ? (
				<Alert severity="info">No hay datos de jurisdicciones registrados todavia. Los workers los generan al detectar el estado.</Alert>
			) : (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Codigo</TableCell>
								<TableCell>Nombre</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell>Ultima verificacion</TableCell>
								<TableCell align="center">Streak</TableCell>
								<TableCell align="center">Total caidas</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{statuses.map((s) => (
								<TableRow key={s._id} sx={!s.disponible ? { bgcolor: "error.lighter" } : undefined}>
									<TableCell>
										<Typography variant="body2" fontWeight={500}>
											{s.jurisdictionValue}
										</Typography>
									</TableCell>
									<TableCell>{s.nombre ?? "-"}</TableCell>
									<TableCell align="center">
										<Chip
											label={s.disponible ? "Disponible" : "No disponible"}
											color={s.disponible ? "success" : "error"}
											size="small"
											variant="outlined"
										/>
									</TableCell>
									<TableCell>
										<Tooltip title={s.lastCheckedAt ? dayjs(s.lastCheckedAt).format("DD/MM/YYYY HH:mm:ss") : ""}>
											<span>{formatRelative(s.lastCheckedAt)}</span>
										</Tooltip>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color={s.currentStreak > 0 ? "error.main" : "text.secondary"}>
											{s.currentStreak}
										</Typography>
									</TableCell>
									<TableCell align="center">{s.unavailableCount}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</Stack>
	);
}
