import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Grid,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { DocumentText, TickCircle, Warning2 } from "iconsax-react";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";
import InfolegService from "api/infolegService";
import type { InfolegStats } from "types/infoleg";

const TIPO_LABELS: Record<string, string> = {
	ley: "Ley",
	decreto: "Decreto",
	decreto_ley: "Decreto-Ley",
	decreto_reglamentario: "D. Reglamentario",
	decreto_dnu: "DNU",
	resolucion: "Resolución",
	resolucion_general: "Res. General",
	resolucion_administrativa: "Res. Administrativa",
	decision_administrativa: "Dec. Administrativa",
	disposicion: "Disposición",
	disposicion_conjunta: "Disp. Conjunta",
	acuerdo: "Acuerdo",
	convenio: "Convenio",
	otro: "Otro",
};

interface StatCardProps {
	label: string;
	value: number | string;
	sub?: string;
	color?: "primary" | "success" | "warning" | "error" | "info";
	icon?: React.ReactNode;
}

const StatCard = ({ label, value, sub, color = "primary", icon }: StatCardProps) => {
	const theme = useTheme();
	return (
		<Card sx={{ height: "100%", border: `1px solid ${theme.palette.divider}` }} elevation={0}>
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="caption" color="text.secondary" fontWeight={500}>
							{label}
						</Typography>
						<Typography variant="h4" fontWeight={700} color={`${color}.main`} sx={{ mt: 0.5 }}>
							{typeof value === "number" ? value.toLocaleString("es-AR") : value}
						</Typography>
						{sub && (
							<Typography variant="caption" color="text.secondary">
								{sub}
							</Typography>
						)}
					</Box>
					{icon && (
						<Box
							sx={{
								p: 1,
								borderRadius: 1.5,
								bgcolor: alpha(theme.palette[color].main, 0.1),
								color: `${color}.main`,
							}}
						>
							{icon}
						</Box>
					)}
				</Stack>
			</CardContent>
		</Card>
	);
};

const StatsTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<InfolegStats | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			const res = await InfolegService.getStats();
			setStats(res.data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al cargar estadísticas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	if (loading) {
		return (
			<Grid container spacing={2}>
				{Array.from({ length: 6 }).map((_, i) => (
					<Grid item xs={12} sm={6} md={4} key={i}>
						<Skeleton variant="rounded" height={100} />
					</Grid>
				))}
			</Grid>
		);
	}

	if (!stats) return null;

	const pctScraped = stats.totals.total > 0 ? ((stats.totals.scraped / stats.totals.total) * 100).toFixed(1) : "0";

	return (
		<Stack spacing={3}>
			{/* Totales principales */}
			<Box>
				<Typography variant="h6" gutterBottom>
					Progreso general
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard
							label="Total scrapeado"
							value={stats.totals.scraped}
							sub={`${pctScraped}% del total`}
							color="success"
							icon={<TickCircle size={22} />}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="Pendientes" value={stats.totals.pending} color="warning" icon={<DocumentText size={22} />} />
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="No encontrados (404)" value={stats.totals.not_found} color="info" />
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="Con error" value={stats.totals.error} color="error" icon={<Warning2 size={22} />} />
					</Grid>
				</Grid>
			</Box>

			{/* Tasks */}
			<Box>
				<Typography variant="h6" gutterBottom>
					Cobertura de contenido
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="Con texto original" value={stats.tasks.conTextoOriginal} color="success" />
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="Con texto actualizado" value={stats.tasks.conTextoActualizado} color="success" />
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="Con vinculaciones" value={stats.tasks.conVinculaciones} color="primary" />
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard label="Textos desactualizados" value={stats.tasks.stale} color="warning" />
					</Grid>
				</Grid>
			</Box>

			{/* Rango de IDs */}
			{stats.scraping && (
				<Box>
					<Typography variant="h6" gutterBottom>
						Rango de scraping
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={4}>
							<StatCard label="ID inicio" value={stats.scraping.idStart} />
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard label="ID actual (cursor)" value={stats.scraping.idCurrent} color="primary" />
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard label="ID máximo" value={stats.scraping.idMax} />
						</Grid>
					</Grid>
				</Box>
			)}

			{/* Por tipo */}
			{stats.porTipo.length > 0 && (
				<Box>
					<Typography variant="h6" gutterBottom>
						Por tipo de norma
					</Typography>
					<TableContainer sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
									<TableCell sx={{ fontWeight: 600 }} align="right">
										Cantidad
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{stats.porTipo.map((t) => (
									<TableRow key={t.tipo} hover>
										<TableCell>{TIPO_LABELS[t.tipo] || t.tipo}</TableCell>
										<TableCell align="right">
											<Typography variant="body2" fontWeight={600}>
												{t.count.toLocaleString("es-AR")}
											</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}

			{/* Últimas scrapeadas */}
			{stats.recientes.length > 0 && (
				<Box>
					<Typography variant="h6" gutterBottom>
						Últimas normas scrapeadas
					</Typography>
					<TableContainer sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
									<TableCell sx={{ fontWeight: 600 }}>Tipo / N°</TableCell>
									<TableCell sx={{ fontWeight: 600 }}>Título</TableCell>
									<TableCell sx={{ fontWeight: 600 }} align="right">
										Scrapeado
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{stats.recientes.map((n) => (
									<TableRow key={n.infolegId} hover>
										<TableCell>
											<Chip label={n.infolegId} size="small" variant="outlined" />
										</TableCell>
										<TableCell>
											<Typography variant="body2">
												{TIPO_LABELS[n.tipo || ""] || n.tipo || "—"} {n.numero}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
												{n.titulo || "—"}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="caption" color="text.secondary">
												{n.scrapedAt ? dayjs(n.scrapedAt).format("DD/MM/YY HH:mm") : "—"}
											</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}
		</Stack>
	);
};

export default StatsTab;
