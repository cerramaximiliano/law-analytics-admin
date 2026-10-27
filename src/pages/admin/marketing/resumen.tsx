import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	MenuItem,
	Paper,
	Select,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TableSortLabel,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";

import MainCard from "components/MainCard";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";
import CampaignSendStatsModal from "sections/admin/marketing/CampaignSendStatsModal";
import { CampaignService } from "store/reducers/campaign";
import { Campaign, CampaignStatus, CampaignSummaryRow, CampaignSummaryTotals } from "types/campaign";

// ==============================|| ADMIN - MARKETING - RESUMEN DE CAMPAÑAS ||============================== //
// Una fila por campaña con acumulado, envíos y altas (solo conteos). Backend: GET /api/campaigns/summary.

const fmt = (n: number) => n.toLocaleString("es-AR");
const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
const STATUS_LABEL: Record<string, string> = {
	draft: "Borrador",
	active: "Activa",
	paused: "Pausada",
	completed: "Completada",
	archived: "Archivada",
};
const PRICING_SHORT: Record<string, string> = {
	adjunto: "Descuento asociado",
	auto_descuento: "Auto con descuento",
	auto_lista: "Auto: precios de lista",
};
const DARK = "#1f1f1f"; // chips ocre/amarillos con letra oscura
const STATUS_BG: Record<string, string> = {
	active: "#86efac",
	paused: "#fde047",
	draft: "#e2e8f0",
	completed: "#93c5fd",
	archived: "#e2e8f0",
};

type Metrics = CampaignSummaryTotals & { entrega: number; apertura: number; clic: number; rebote: number; alta: number };
type Row = CampaignSummaryRow & Metrics;

const withRates = <T extends CampaignSummaryTotals>(r: T): T & Pick<Metrics, "entrega" | "apertura" | "clic" | "rebote" | "alta"> => ({
	...r,
	entrega: pct(r.delivered, r.sent),
	apertura: pct(r.uniqueOpens, r.delivered),
	clic: pct(r.uniqueClicks, r.delivered),
	rebote: pct(r.bounced, r.sent),
	alta: pct(r.altas, r.everEnrolled),
});

interface Column {
	key: keyof Row;
	label: string;
	hint?: string;
	rate?: boolean;
}

const COLUMNS: Column[] = [
	{ key: "dailyLimit", label: "Tope diario" },
	{ key: "everEnrolled", label: "Acumulado", hint: "Todos los que pasaron por la campaña (histórico)" },
	{ key: "active", label: "Activos" },
	{ key: "completed", label: "Completaron" },
	{ key: "removed", label: "Salieron" },
	{ key: "sent", label: "Enviados" },
	{ key: "delivered", label: "Entregados" },
	{ key: "entrega", label: "Entrega", rate: true, hint: "Entregados sobre enviados" },
	{ key: "uniqueOpens", label: "Aperturas" },
	{ key: "apertura", label: "Apertura", rate: true, hint: "Aperturas únicas sobre entregados" },
	{ key: "uniqueClicks", label: "Clics" },
	{ key: "clic", label: "Clic", rate: true, hint: "Clics únicos sobre entregados" },
	{ key: "bounced", label: "Rebotes" },
	{ key: "rebote", label: "Rebote", rate: true, hint: "Rebotes sobre enviados" },
	{ key: "complained", label: "Quejas" },
	{ key: "unsubscribed", label: "Bajas" },
	{ key: "altas", label: "Altas", hint: "Registros en la app atribuidos a la campaña (last-touch)" },
	{ key: "alta", label: "Alta", rate: true, hint: "Altas sobre el acumulado" },
];

const CampaignsSummary = () => {
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [rows, setRows] = useState<CampaignSummaryRow[]>([]);
	const [totals, setTotals] = useState<CampaignSummaryTotals | null>(null);
	const [nameFilter, setNameFilter] = useState<string>("^Captación PJN|^Reenganche");
	const [appliedFilter, setAppliedFilter] = useState<string>("^Captación PJN|^Reenganche");
	const [status, setStatus] = useState<string>("");
	const [sortKey, setSortKey] = useState<keyof Row>("everEnrolled");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [selected, setSelected] = useState<Campaign | null>(null);
	const [opening, setOpening] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await CampaignService.getCampaignsSummary({ name: appliedFilter || undefined, status: status || undefined });
			setRows(res.data.campaigns);
			setTotals(res.data.totals);
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || "Error al cargar el resumen");
		} finally {
			setLoading(false);
		}
	}, [appliedFilter, status]);

	useEffect(() => {
		load();
	}, [load]);

	const data: Row[] = useMemo(() => {
		const list = rows.map((r) => withRates(r) as Row);
		return list.sort((a, b) => {
			const av = a[sortKey] as number | string;
			const bv = b[sortKey] as number | string;
			const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av) - Number(bv);
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [rows, sortKey, sortDir]);

	const totalRow = totals ? withRates(totals) : null;

	const handleSort = (key: keyof Row) => {
		if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setSortKey(key);
			setSortDir("desc");
		}
	};

	const openCampaign = async (id: string) => {
		try {
			setOpening(id);
			setSelected(await CampaignService.getCampaignById(id));
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || "No se pudo abrir la campaña");
		} finally {
			setOpening(null);
		}
	};

	const cell = (r: Row | (CampaignSummaryTotals & ReturnType<typeof withRates>), c: Column) => {
		const v = (r as any)[c.key] as number;
		return c.rate ? `${v.toFixed(1)}%` : c.key === "dailyLimit" ? (v ? fmt(v) : "—") : fmt(v);
	};

	return (
		<MainCard title="Resumen de campañas">
			<MarketingQuickNav />
			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2, alignItems: "center" }}>
				<TextField
					size="small"
					label="Nombre (regex)"
					value={nameFilter}
					onChange={(e) => setNameFilter(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && setAppliedFilter(nameFilter)}
					onBlur={() => setAppliedFilter(nameFilter)}
					sx={{ minWidth: 280 }}
				/>
				<Select size="small" displayEmpty value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160 }}>
					<MenuItem value="">Todos los estados</MenuItem>
					{(["active", "paused", "draft", "completed", "archived"] as CampaignStatus[]).map((s) => (
						<MenuItem key={s} value={s}>
							{STATUS_LABEL[s]}
						</MenuItem>
					))}
				</Select>
				{loading && <CircularProgress size={18} />}
				<Typography variant="caption" color="textSecondary">
					Solo conteos. Clic en una fila abre el detalle de la campaña.
				</Typography>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{loading && rows.length === 0 ? (
				<Skeleton variant="rounded" height={320} />
			) : (
				<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "70vh" }}>
					<Table size="small" stickyHeader>
						<TableHead>
							<TableRow>
								<TableCell sx={{ minWidth: 240 }}>
									<TableSortLabel
										active={sortKey === "name"}
										direction={sortKey === "name" ? sortDir : "asc"}
										onClick={() => handleSort("name")}
									>
										Campaña
									</TableSortLabel>
								</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Sync</TableCell>
								<TableCell>Precios</TableCell>
								{COLUMNS.map((c) => (
									<TableCell key={c.key} align="right" sx={{ whiteSpace: "nowrap" }}>
										<Tooltip title={c.hint || ""} disableHoverListener={!c.hint}>
											<span>
												<TableSortLabel
													active={sortKey === c.key}
													direction={sortKey === c.key ? sortDir : "desc"}
													onClick={() => handleSort(c.key)}
												>
													{c.label}
												</TableSortLabel>
											</span>
										</Tooltip>
									</TableCell>
								))}
							</TableRow>
						</TableHead>
						<TableBody>
							{data.map((r) => (
								<TableRow
									key={r._id}
									hover
									onClick={() => openCampaign(r._id)}
									sx={{ cursor: "pointer", opacity: opening === r._id ? 0.5 : 1 }}
								>
									<TableCell>{r.name}</TableCell>
									<TableCell>
										<Chip
											size="small"
											label={STATUS_LABEL[r.status] || r.status}
											sx={{ bgcolor: STATUS_BG[r.status], color: DARK, fontWeight: 600 }}
										/>
									</TableCell>
									<TableCell>{r.syncWithSegment ? "Sí" : "No"}</TableCell>
									<TableCell>
										{r.pricing && r.pricing.mode !== "none" ? (
											<Tooltip title={r.pricing.label}>
												<Chip size="small" variant="outlined" label={PRICING_SHORT[r.pricing.mode]} />
											</Tooltip>
										) : (
											"—"
										)}
									</TableCell>
									{COLUMNS.map((c) => (
										<TableCell key={c.key} align="right">
											{cell(r, c)}
										</TableCell>
									))}
								</TableRow>
							))}
							{totalRow && data.length > 0 && (
								<TableRow
									sx={{
										"& td": {
											fontWeight: 700,
											position: "sticky",
											bottom: 0,
											bgcolor: "background.paper",
											borderTop: 2,
											borderColor: "divider",
										},
									}}
								>
									<TableCell>TOTAL ({data.length})</TableCell>
									<TableCell />
									<TableCell />
									<TableCell />
									{COLUMNS.map((c) => (
										<TableCell key={c.key} align="right">
											{c.key === "dailyLimit" ? "" : cell(totalRow, c)}
										</TableCell>
									))}
								</TableRow>
							)}
							{!loading && data.length === 0 && (
								<TableRow>
									<TableCell colSpan={COLUMNS.length + 4} align="center">
										<Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
											No hay campañas con ese filtro.
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			<CampaignSendStatsModal open={!!selected} onClose={() => setSelected(null)} campaign={selected} />
		</MainCard>
	);
};

export default CampaignsSummary;
