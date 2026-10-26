import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	Grid,
	InputAdornment,
	LinearProgress,
	Link,
	Paper,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";
import { SearchNormal1 } from "iconsax-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CampaignService } from "store/reducers/campaign";
import { CampaignConversionsService } from "api/campaignConversions";
import { CampaignConversionItem, CampaignConversions, ConversionUserJourney } from "types/campaign";

const fmt = (n: number) => n.toLocaleString("es-AR");
const pctOf = (n: number, total: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%");
const dateFmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "—");
const CHUNK = 500;

interface Row extends CampaignConversionItem {
	journey?: ConversionUserJourney;
}

const hasPortal = (j?: ConversionUserJourney) => !!j && (j.portals.pjn || j.portals.mev || j.portals.scba);
const paid = (j?: ConversionUserJourney) => !!j && (!!j.firstPaidAt || (j.subscriptionPlan && j.subscriptionPlan !== "free"));

const CampaignConversionsPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
	const theme = useTheme();
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<CampaignConversions | null>(null);
	const [journeys, setJourneys] = useState<Map<string, ConversionUserJourney>>(new Map());
	const [journeyError, setJourneyError] = useState<string | null>(null);
	const [search, setSearch] = useState<string>("");
	const [page, setPage] = useState<number>(0);
	const [rowsPerPage, setRowsPerPage] = useState<number>(25);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError(null);
			setJourneyError(null);
			try {
				const res = await CampaignService.getCampaignConversions(campaignId);
				if (cancelled) return;
				setData(res.data);
				const ids = res.data.items.map((i) => i.userId);
				const map = new Map<string, ConversionUserJourney>();
				try {
					for (let i = 0; i < ids.length; i += CHUNK) {
						const list = await CampaignConversionsService.getUsers(ids.slice(i, i + CHUNK));
						list.forEach((j) => map.set(j.userId, j));
					}
				} catch (err: any) {
					setJourneyError(err?.response?.data?.message || err?.message || "No se pudo cargar el recorrido de los usuarios");
				}
				if (!cancelled) setJourneys(map);
			} catch (err: any) {
				if (!cancelled) setError(err?.response?.data?.error || err?.message || "Error al cargar las conversiones");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [campaignId]);

	const rows: Row[] = useMemo(() => (data?.items ?? []).map((i) => ({ ...i, journey: journeys.get(i.userId) })), [data, journeys]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((r) => `${r.journey?.name ?? ""} ${r.journey?.email ?? ""}`.toLowerCase().includes(q));
	}, [rows, search]);

	if (loading) return <Skeleton variant="rounded" height={320} />;
	if (error) return <Alert severity="error">{error}</Alert>;
	if (!data) return null;

	const total = data.summary.total;
	if (total === 0) {
		return (
			<Alert severity="info">
				Todavía no hay conversiones registradas para esta campaña. Se registran cuando un contacto que recibió correos se registra en la
				app.
			</Alert>
		);
	}

	const js = rows.map((r) => r.journey).filter(Boolean) as ConversionUserJourney[];
	const funnel = [
		{ label: "Altas", n: total, color: theme.palette.primary.main },
		{ label: "Verificaron", n: js.filter((j) => j.isVerified).length, color: theme.palette.info.main },
		{ label: "Crearon su primera causa", n: js.filter((j) => j.onboarding.createdFirstFolder).length, color: theme.palette.success.light },
		{ label: "Conectaron un portal", n: js.filter((j) => hasPortal(j)).length, color: theme.palette.success.main },
		{ label: "Pagaron", n: js.filter((j) => paid(j)).length, color: theme.palette.success.dark },
	];

	const byDay = Object.entries(data.summary.byDay)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([d, n]) => ({ label: `${d.slice(8)}/${d.slice(5, 7)}`, Altas: n }));
	const byStep = Object.entries(data.summary.byStep)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([s, n]) => ({ label: `Paso ${Number(s) + 1}`, Altas: n }));

	return (
		<Box>
			{journeyError && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{journeyError}. Se muestran las conversiones sin el recorrido de cada usuario.
				</Alert>
			)}

			<Grid container spacing={1.5} sx={{ mb: 2 }}>
				{funnel.map((f) => (
					<Grid item xs={6} sm={2.4} key={f.label}>
						<Paper variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${f.color}`, height: "100%" }}>
							<Typography variant="caption" color="textSecondary">
								{f.label}
							</Typography>
							<Typography variant="h4" sx={{ color: f.color, lineHeight: 1.2 }}>
								{fmt(f.n)}
							</Typography>
							<Typography variant="caption" color="textSecondary">
								{pctOf(f.n, total)} de las altas
							</Typography>
						</Paper>
					</Grid>
				))}
			</Grid>

			<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
					Embudo de activación
				</Typography>
				{funnel.map((f) => (
					<Box key={f.label} sx={{ mb: 1 }}>
						<Box sx={{ display: "flex", justifyContent: "space-between" }}>
							<Typography variant="body2">{f.label}</Typography>
							<Typography variant="body2" fontWeight="bold">
								{fmt(f.n)} · {pctOf(f.n, total)}
							</Typography>
						</Box>
						<LinearProgress
							variant="determinate"
							value={total > 0 ? (f.n / total) * 100 : 0}
							sx={{
								height: 8,
								borderRadius: 4,
								bgcolor: theme.palette.action.hover,
								"& .MuiLinearProgress-bar": { bgcolor: f.color, borderRadius: 4 },
							}}
						/>
					</Box>
				))}
			</Paper>

			<Grid container spacing={2} sx={{ mb: 2 }}>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" gutterBottom>
							Altas por día
						</Typography>
						<Box sx={{ height: 220 }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={byDay}>
									<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
									<XAxis dataKey="label" tick={{ fontSize: 12 }} />
									<YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
									<Tooltip />
									<Bar dataKey="Altas" fill={theme.palette.success.main} />
								</BarChart>
							</ResponsiveContainer>
						</Box>
					</Paper>
				</Grid>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" gutterBottom>
							Altas por último paso recibido (qué correo convierte)
						</Typography>
						<Box sx={{ height: 220 }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={byStep}>
									<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
									<XAxis dataKey="label" tick={{ fontSize: 12 }} />
									<YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
									<Tooltip />
									<Bar dataKey="Altas" fill={theme.palette.info.main} />
								</BarChart>
							</ResponsiveContainer>
						</Box>
					</Paper>
				</Grid>
			</Grid>

			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
				<Chip size="small" label={`Con clic previo ${fmt(data.summary.withClick)} · sin clic ${fmt(data.summary.withoutClick)}`} />
				<Chip size="small" label={`Con UTM ${fmt(data.summary.withUtm)} · sin UTM ${fmt(data.summary.withoutUtm)}`} />
				<Chip
					size="small"
					label={`Mediana hasta convertir: ${data.summary.medianDaysToConvert != null ? `${data.summary.medianDaysToConvert} días` : "—"}`}
				/>
			</Box>

			<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle1" fontWeight="bold">
					Convertidos ({fmt(filtered.length)})
				</Typography>
				<TextField
					size="small"
					placeholder="Buscar por nombre o correo"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(0);
					}}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchNormal1 size={16} />
							</InputAdornment>
						),
					}}
				/>
			</Box>
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Usuario</TableCell>
							<TableCell>Alta</TableCell>
							<TableCell align="right">Días desde 1.er correo</TableCell>
							<TableCell align="right">Último paso</TableCell>
							<TableCell align="center">Clic</TableCell>
							<TableCell align="center">UTM</TableCell>
							<TableCell align="center">Verificó</TableCell>
							<TableCell align="right">Causas</TableCell>
							<TableCell>Portal</TableCell>
							<TableCell>Plan</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r) => {
							const j = r.journey;
							const portals = j
								? ([j.portals.pjn && "PJN", j.portals.mev && "MEV", j.portals.scba && "SCBA"].filter(Boolean) as string[])
								: [];
							return (
								<TableRow key={r.userId} hover>
									<TableCell>
										<Link href={`/admin/users?verUsuario=${r.userId}`} target="_blank" rel="noopener" underline="hover">
											{j ? j.name || j.email : r.userId.slice(-6)}
										</Link>
										{j?.name && (
											<Typography variant="caption" color="textSecondary" display="block">
												{j.email}
											</Typography>
										)}
									</TableCell>
									<TableCell>{dateFmt(r.registeredAt)}</TableCell>
									<TableCell align="right">{r.daysToConvert ?? "—"}</TableCell>
									<TableCell align="right">{r.lastStepBeforeSignup != null ? r.lastStepBeforeSignup + 1 : "—"}</TableCell>
									<TableCell align="center">{r.clickedBefore ? "Sí" : "No"}</TableCell>
									<TableCell align="center">{r.attributedByUtm ? "Sí" : "No"}</TableCell>
									<TableCell align="center">{j ? (j.isVerified ? "Sí" : "No") : "—"}</TableCell>
									<TableCell align="right">{j ? j.folders.active + j.folders.archived : "—"}</TableCell>
									<TableCell>{j ? (portals.length ? portals.join(", ") : "—") : "—"}</TableCell>
									<TableCell>
										{j ? paid(j) ? <Chip size="small" color="success" label={j.subscriptionPlan} /> : j.subscriptionPlan : "—"}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<TablePagination
					component="div"
					count={filtered.length}
					page={page}
					onPageChange={(_, p) => setPage(p)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => {
						setRowsPerPage(parseInt(e.target.value, 10));
						setPage(0);
					}}
					rowsPerPageOptions={[10, 25, 50, 100]}
					labelRowsPerPage="Filas"
				/>
			</TableContainer>
		</Box>
	);
};

export default CampaignConversionsPanel;
