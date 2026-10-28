import React, { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Paper,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TablePagination,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { JourneyBucket, JourneyCampaign, JourneyLeakItem, JourneyMapData, JourneyReason, JourneyService } from "api/journey";
import { JourneyNodeId } from "./JourneyMap";
import JourneyAccumulated from "./JourneyAccumulated";
import { clickableProps } from "utils/a11y";
import EnrollmentPausedChip from "./EnrollmentPausedChip";

const fmt = (n: number | undefined | null) => (n === undefined || n === null ? "—" : n.toLocaleString("es-AR"));
const STATUS_LABEL: Record<string, string> = { active: "Activa", paused: "Pausada", draft: "Borrador" };
const STATUS_BG: Record<string, string> = { active: "#86efac", paused: "#fde047", draft: "#e2e8f0" };
const KIND_BG: Record<string, string> = { ok: "#86efac", info: "#e2e8f0", intencional: "#fde047", fuga: "#fca5a5" };
const KIND_LABEL: Record<string, string> = { ok: "OK", info: "Pendiente", intencional: "A propósito", fuga: "Fuga" };
const DARK = "#1f1f1f"; // chips claros/ocres siempre con letra oscura

const CampaignCard: React.FC<{ c: JourneyCampaign; highlighted: boolean; onOpen?: (id: string) => void }> = ({
	c,
	highlighted,
	onOpen,
}) => (
	<Paper
		variant="outlined"
		{...(onOpen ? clickableProps(() => onOpen(c._id)) : {})}
		sx={{
			p: 1.5,
			mb: 1,
			borderColor: highlighted ? "#F59E0B" : undefined,
			borderWidth: highlighted ? 2 : 1,
			cursor: onOpen ? "pointer" : "default",
			"&:hover": onOpen ? { bgcolor: "action.hover" } : undefined,
		}}
	>
		<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
			<Typography variant="subtitle2">{c.name}</Typography>
			<Chip size="small" label={STATUS_LABEL[c.status]} sx={{ bgcolor: STATUS_BG[c.status], color: DARK, fontWeight: 600 }} />
			{c.subtipo && <Chip size="small" variant="outlined" label={c.subtipo} />}
			<Chip size="small" variant="outlined" label={c.syncWithSegment ? "Sincroniza" : "Sin sincronizar"} />
			{c.status === "active" && !c.acceptsNew && (
				<Chip size="small" label="Ya no inscribe nuevos" sx={{ bgcolor: "#fde047", color: DARK, fontWeight: 600 }} />
			)}
			<EnrollmentPausedChip paused={c.enrollmentPaused} />
		</Box>
		<Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
			{c.steps} pasos · {fmt(c.active)} inscriptos activos · segmento{" "}
			{c.segment
				? `${c.segment.name} (${
						c.status === "draft" && c.segment.liveSize != null ? `${fmt(c.segment.liveSize)} hoy` : fmt(c.segment.size)
				  })`
				: "sin segmento"}
			{c.dailyLimit ? ` · tope ${fmt(c.dailyLimit)}/día` : ""}
		</Typography>
		{c.conditions && c.conditions.filters.length > 0 && (
			<Box sx={{ mt: 0.5 }}>
				<Typography variant="caption" fontWeight={700}>
					Entra si ({c.conditions.operator === "or" ? "cumple alguno" : "cumple todo"}):
				</Typography>
				<ul style={{ margin: "2px 0 0 18px", padding: 0 }}>
					{c.conditions.filters.map((f, i) => (
						<li key={i}>
							<Typography variant="caption">{f.text}</Typography>
						</li>
					))}
				</ul>
			</Box>
		)}
		{c.stepFilters.length > 0 && (
			<Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
				Filtro en los pasos: {c.stepFilters.join("; ")}
			</Typography>
		)}
	</Paper>
);

const ReasonList: React.FC<{ reasons?: JourneyReason[]; sampleSize?: number }> = ({ reasons, sampleSize }) =>
	reasons && reasons.length ? (
		<Box sx={{ mt: 1 }}>
			<Typography variant="caption" fontWeight={700}>
				Por qué no están en una campaña{sampleSize ? ` (muestra de ${sampleSize})` : ""}:
			</Typography>
			<ul style={{ margin: "2px 0 0 18px", padding: 0 }}>
				{reasons.map((r, i) => (
					<li key={i}>
						<Typography variant="caption">
							{r.text} — <strong>{fmt(r.count)}</strong>
						</Typography>
					</li>
				))}
			</ul>
		</Box>
	) : null;

const LeakTable: React.FC<{ scope: string; bucket: string; onLookup: (contactId: string) => void }> = ({ scope, bucket, onLookup }) => {
	const [page, setPage] = useState<number>(0);
	const [rows, setRows] = useState<JourneyLeakItem[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const limit = 25;

	useEffect(() => setPage(0), [scope, bucket]);
	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		JourneyService.leaks(scope, bucket, page + 1, limit)
			.then((res) => {
				if (cancelled) return;
				setRows(res.items);
				setTotal(res.total);
			})
			.catch((err) => !cancelled && setError(err?.response?.data?.error || err?.message || "Error al listar"))
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [scope, bucket, page]);

	if (error) return <Alert severity="error">{error}</Alert>;
	return (
		<Box>
			{loading ? (
				<Skeleton variant="rounded" height={160} />
			) : (
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Contacto</TableCell>
							<TableCell>Campaña más cercana</TableCell>
							<TableCell>Qué no cumple</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r) => (
							<TableRow key={r.contactId} hover>
								<TableCell>{r.email}</TableCell>
								<TableCell>{r.closest || "—"}</TableCell>
								<TableCell>
									{r.reason || (r.failing.length ? r.failing.join(" + ") : "Cumple: falta que la sincronización lo inscriba")}
								</TableCell>
								<TableCell>
									<Button size="small" onClick={() => onLookup(r.contactId)}>
										Ver recorrido
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
			<TablePagination
				component="div"
				count={total}
				page={page}
				onPageChange={(_, p) => setPage(p)}
				rowsPerPage={limit}
				rowsPerPageOptions={[limit]}
				labelRowsPerPage="Filas"
			/>
		</Box>
	);
};

interface Props {
	data: JourneyMapData;
	node: JourneyNodeId;
	highlightCampaigns: string[];
	onLookup: (contactId: string) => void;
	onOpenCampaign: (id: string) => void;
}

const NODE_TITLES: Record<string, string> = {
	captacion: "Captación",
	registro: "Registro",
	onboarding: "Onboarding",
	conversion: "Conversión",
	cliente: "Cliente",
	inactivo: "Inactivo · Reconquista",
	activo_free: "Activo free",
	interesados: "Interesados",
	contenido: "Carril paralelo: contenido y servicio",
};

const JourneyNodePanel: React.FC<Props> = ({ data, node, highlightCampaigns, onLookup, onOpenCampaign }) => {
	const [bucket, setBucket] = useState<string | null>(null);
	useEffect(() => setBucket(null), [node]);

	const stages = data.stages;
	let campaigns: JourneyCampaign[] = [];
	let buckets: Array<Pick<JourneyBucket, "key" | "label" | "kind" | "description" | "count">> = [];
	let reasons: { items?: JourneyReason[]; sampleSize?: number } | null = null;
	let note: string | null = null;
	let scope: string | null = null;
	let extraReasons: JourneyReason[] | undefined;

	if (node === "captacion") {
		campaigns = Object.values(data.captacion.campaigns).flat();
		buckets = data.captacion.buckets;
		scope = "captacion";
		extraReasons = data.captacion.fuga?.reasons;
		if (data.captacion.fuga) {
			note = `Fuga real: ${fmt(data.captacion.fuga.nuncaEntraron)} nunca entraron a una captación y ${fmt(
				data.captacion.fuga.conHistorial,
			)} ya pasaron por una (completaron o salieron).`;
		}
	} else if (node === "onboarding" || node === "inactivo") {
		const s = stages[node];
		campaigns = s.campaigns || [];
		scope = node;
		buckets = [
			{ key: "en_campania", label: "En campaña", kind: "ok", description: "", count: s.en_campania ?? 0 },
			{ key: "sin_campania", label: "Sin campaña", kind: "fuga", description: "", count: s.sin_campania ?? 0 },
		];
		reasons = s.reasons || null;
		if (node === "onboarding" && stages.onboarding.rule) note = `Regla del hub: ${stages.onboarding.rule}`;
	} else if (node === "conversion") {
		campaigns = Object.values(stages.conversion.sub).flatMap((s) => s.campaigns || []);
		scope = "conversion";
		buckets = [
			{ key: "en_campania", label: "En campaña", kind: "ok", description: "", count: stages.conversion.en_campania ?? 0 },
			{ key: "sin_campania", label: "Sin campaña", kind: "fuga", description: "", count: stages.conversion.sin_campania ?? 0 },
		];
		reasons = stages.conversion.reasons || null;
	} else if (node.startsWith("conversion:")) {
		const key = node.slice("conversion:".length);
		const s = stages.conversion.sub[key] || {};
		campaigns = s.campaigns || [];
		scope = node;
		buckets = [
			{ key: "en_campania", label: "En campaña", kind: "ok", description: "", count: s.en_campania ?? 0 },
			{ key: "sin_campania", label: "Sin campaña", kind: "fuga", description: "", count: s.sin_campania ?? 0 },
		];
		reasons = s.reasons || null;
		if (s.rule?.text) {
			note = `Regla del hub: ${s.rule.text}${
				s.rule.active ? "" : ". Esta regla está inactiva: el hub no asigna usuarios a esta subetapa."
			}`;
		}
	} else if (node === "contenido") {
		campaigns = [...data.lane.contenido, ...data.lane.servicio];
		note =
			"Estas campañas corren en paralelo al recorrido y no cuentan para la exclusividad. El coordinador de frecuencia limita el total (1 por día, 3 por semana).";
	} else if (node === "registro") {
		note = `Altas atribuidas a la captación en los últimos ${data.flows.windowDays} días: ${fmt(data.flows.altas.total)}. ${Object.entries(
			data.flows.altas.bySubtipo,
		)
			.map(([k, v]) => `${k}: ${fmt(v)}`)
			.join(" · ")}`;
	} else if (node === "cliente") {
		note = `${fmt(stages.cliente.total)} usuarios con plan pago. No reciben campañas de recorrido.`;
	} else if (node === "activo_free") {
		const s = stages.activo_free;
		campaigns = s.campaigns || [];
		if (campaigns.length) {
			scope = "activo_free";
			buckets = [
				{ key: "en_campania", label: "En campaña", kind: "ok", description: "", count: s.en_campania ?? 0 },
				{ key: "sin_campania", label: "Sin campaña", kind: "fuga", description: "", count: s.sin_campania ?? 0 },
			];
			reasons = s.reasons || null;
			note = `${fmt(
				s.total,
			)} usuarios free sin conversión. Los que no cumplen la condición de la campaña cuentan como "sin campaña" y se explica por qué.`;
		} else {
			note = `${fmt(s.total)} usuarios free con más de 30 días de alta y sin conversión: sin campaña por diseño.`;
		}
	} else if (node === "interesados") {
		campaigns = data.captacion.campaigns.interesados || [];
		note =
			"Hicieron clic en una captación activa hace más de 72 h y no se registraron: salen de su variante y entran a esta campaña. Mientras no esté activa, esperan en el bucket «Interesados» de captación.";
	}

	const nodeTitle =
		NODE_TITLES[node] ||
		(node.startsWith("conversion:") ? `Conversión · ${stages.conversion.sub[node.slice(11)]?.label || node.slice(11)}` : node);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				{NODE_TITLES[node] ||
					(node.startsWith("conversion:") ? `Conversión · ${data.stages.conversion.sub[node.slice(11)]?.label || node.slice(11)}` : node)}
			</Typography>
			{note && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{note}
				</Alert>
			)}
			{data.v2 && node !== "registro" && node !== "cliente" && (
				<>
					<JourneyAccumulated
						title={nodeTitle}
						totals={data.v2.categories[node === "contenido" ? "contenido" : node] ?? null}
						convertedLabel={node === "captacion" ? "Convertidos (altas en la app)" : "Convertidos a plan pago"}
						deletedConversions={node === "captacion" ? data.v2.orphans?.conversions : undefined}
					/>
					{node === "contenido" && (
						<JourneyAccumulated title="Avisos de servicio" totals={data.v2.categories.servicio ?? null} convertedLabel="Convertidos" />
					)}
				</>
			)}
			{node === "interesados" && data.captacion.interesados && (
				<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Marcados como interesados
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
						{(["7", "30", "90", "all"] as const).map((p) => (
							<Chip
								key={p}
								size="small"
								variant="outlined"
								label={`${p === "all" ? "Todos" : `${p} días`}: ${fmt(data.captacion.interesados?.byPeriod?.[p])}`}
							/>
						))}
					</Box>
					<Typography variant="caption" fontWeight={700}>
						De qué variante venían (última inscripción removida)
					</Typography>
					<ul style={{ margin: "2px 0 0 18px", padding: 0 }}>
						{data.captacion.interesados.fromVariant.map((v) => (
							<li key={v.campaignId || "sin"}>
								<Typography variant="caption">
									{v.name.replace("Captación PJN · ", "")} — <strong>{fmt(v.n)}</strong>
								</Typography>
							</li>
						))}
					</ul>
				</Paper>
			)}
			{node === "captacion" && data.captacion.control && data.captacion.control.control.n > 0 && (
				<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Grupo de control vs expuestos
					</Typography>
					<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
						Entre contactos elegibles (válidos, no oficiales, no peritos/partes/empresas/organismos). Alta = se registró después de la
						asignación. Con pocas altas la diferencia no es significativa.
					</Typography>
					<Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
						{(
							[
								["Control (sin captación)", data.captacion.control.control, data.captacion.control.rateControl],
								["Expuestos", data.captacion.control.expuestos, data.captacion.control.rateExpuestos],
							] as const
						).map(([label, g, rate]) => (
							<Box key={label} sx={{ minWidth: 200 }}>
								<Typography variant="caption" color="textSecondary">
									{label}
								</Typography>
								<Typography variant="h5">{fmt(g.n)}</Typography>
								<Typography variant="caption">
									{fmt(g.altas)} altas · {rate.toFixed(3)} %
								</Typography>
							</Box>
						))}
					</Box>
				</Paper>
			)}
			{buckets.length > 0 && (
				<Box sx={{ mb: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Dónde están los contactos
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
						{buckets.map((b) => (
							<Tooltip key={b.key} title={b.description ? `${KIND_LABEL[b.kind]}: ${b.description}` : KIND_LABEL[b.kind]}>
								<Chip
									label={`${b.label}: ${fmt(b.count)}`}
									onClick={() => setBucket(bucket === b.key ? null : b.key)}
									sx={{
										bgcolor: KIND_BG[b.kind],
										color: DARK,
										fontWeight: 600,
										outline: bucket === b.key ? "2px solid #1f1f1f" : undefined,
									}}
								/>
							</Tooltip>
						))}
					</Box>
					<ReasonList reasons={extraReasons || reasons?.items} sampleSize={reasons?.sampleSize || data.captacion.fuga?.sampleSize} />
				</Box>
			)}
			{bucket && scope && (
				<Box sx={{ mb: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Contactos: {buckets.find((b) => b.key === bucket)?.label}
					</Typography>
					<LeakTable scope={scope} bucket={bucket} onLookup={onLookup} />
				</Box>
			)}
			{campaigns.length > 0 && (
				<Box>
					<Typography variant="subtitle2" gutterBottom>
						Campañas ({campaigns.length})
					</Typography>
					{campaigns.map((c) => (
						<CampaignCard
							key={c._id}
							c={c}
							highlighted={highlightCampaigns.includes(c._id)}
							onOpen={data.v2 ? onOpenCampaign : undefined}
						/>
					))}
				</Box>
			)}
		</Paper>
	);
};

export default JourneyNodePanel;
