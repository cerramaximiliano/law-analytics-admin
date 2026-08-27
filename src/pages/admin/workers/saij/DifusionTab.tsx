import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	FormControl,
	IconButton,
	InputLabel,
	Link,
	MenuItem,
	Pagination,
	Paper,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Instagram, ExportSquare, MagicStar } from "iconsax-react";

import { getSaijSentencias, getSaijSentenciaStats, setSaijSentenciaSocialPost, SaijSentencia, SentenciaListParams } from "api/saij";
import { getSaijCampaigns, SaijCampaign } from "api/saijCampaigns";
import { crearFalloExplicado } from "api/socialPosts";
import CampaignConfigPanel from "./CampaignConfigPanel";
import { Accordion, AccordionSummary, AccordionDetails, Divider } from "@mui/material";
import { ArrowDown2 } from "iconsax-react";

/**
 * Pestaña "Difusión" de /admin/workers/saij.
 *
 * Vista de los FALLOS (no sumarios) desde la óptica de su difusión:
 *   - si tienen resumen IA y por lo tanto página en la vista pública
 *   - si ya fueron notificados a usuarios como novedad, y en qué campaña
 *   - si quedaron excluidos de las campañas y por qué
 *   - si se generó una pieza para redes sociales (marcable desde acá)
 *
 * El criterio de "publicable" replica el PUBLIC_MATCH del hub: resumen IA con
 * contenido + publicationStatus != 'skipped'.
 */

const PUBLIC_BASE = "https://lawanalytics.app/jurisprudencia";

type FiltroDifusion = "todos" | "notificados" | "en-cola" | "excluidos" | "con-post" | "sin-post";

const FILTROS: { value: FiltroDifusion; label: string; params: Partial<SentenciaListParams> }[] = [
	{ value: "todos", label: "Todos los fallos", params: {} },
	{ value: "notificados", label: "Notificados a usuarios", params: { userNotified: "true" } },
	{ value: "en-cola", label: "En cola (sin notificar)", params: { userNotified: "false", userCampaignExcluded: "false" } },
	{ value: "excluidos", label: "Excluidos de campañas", params: { userCampaignExcluded: "true" } },
	{ value: "con-post", label: "Con post en redes", params: { hasSocialPost: "true" } },
	{ value: "sin-post", label: "Sin post en redes", params: { hasSocialPost: "false" } },
];

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("es-AR") : "—");

export default function DifusionTab() {
	const [rows, setRows] = useState<SaijSentencia[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pages, setPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [filtro, setFiltro] = useState<FiltroDifusion>("todos");
	const [resumenFiltro, setResumenFiltro] = useState<"" | "true" | "false">("");
	const [q, setQ] = useState("");
	const [stats, setStats] = useState<{ userNotified: number; userCampaignExcluded: number; socialPost: number } | null>(null);
	const [generando, setGenerando] = useState<string | null>(null);
	const [aviso, setAviso] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
	const [conResumen, setConResumen] = useState<number | null>(null);
	const [marcando, setMarcando] = useState<string | null>(null);
	const [campanias, setCampanias] = useState<SaijCampaign[]>([]);
	const [campLoading, setCampLoading] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const base = FILTROS.find((f) => f.value === filtro)?.params ?? {};
			const res = await getSaijSentencias({
				page,
				limit: 20,
				saijType: "jurisprudencia",
				...base,
				...(resumenFiltro ? { hasAiSummary: resumenFiltro } : {}),
				...(q.trim() ? { q: q.trim() } : {}),
			});
			setRows(res.data || []);
			setPages(res.pagination?.pages || 1);
			setTotal(res.pagination?.total || 0);
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message || "Error cargando fallos");
		} finally {
			setLoading(false);
		}
	}, [filtro, resumenFiltro, q, page]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		setCampLoading(true);
		getSaijCampaigns(1, 20)
			.then((r) => setCampanias(r.data || []))
			.catch(() => {})
			.finally(() => setCampLoading(false));
	}, []);

	useEffect(() => {
		getSaijSentenciaStats()
			.then((r) => {
				if (r.data?.difusion) setStats(r.data.difusion);
				if (typeof r.data?.sentenciasCapturadas?.withAiSummary === "number") setConResumen(r.data.sentenciasCapturadas.withAiSummary);
			})
			.catch(() => {});
	}, []);

	// Genera el carrusel "fallo explicado" del fallo elegido. El post queda en
	// BORRADOR: la revisión editorial es parte del flujo, no un extra.
	const generarCarrusel = async (scId: string, caratula: string) => {
		setGenerando(scId);
		setAviso(null);
		try {
			const r = await crearFalloExplicado(scId);
			setAviso({
				tipo: "success",
				texto: `Carrusel en borrador (${r.content?.bloques?.length ?? 0} slides) — ${caratula.slice(0, 40)}. Revisalo en Social.`,
			});
			await load();
		} catch (e: any) {
			setAviso({ tipo: "error", texto: e?.response?.data?.error || e.message || "No se pudo generar el carrusel" });
		} finally {
			setGenerando(null);
		}
	};

	const toggleSocialPost = async (row: SaijSentencia) => {
		const generado = !row.socialPost?.generado;
		setMarcando(row._id);
		try {
			await setSaijSentenciaSocialPost(row._id, { generado });
			setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, socialPost: { ...r.socialPost, generado } } : r)));
			setStats((s) => (s ? { ...s, socialPost: s.socialPost + (generado ? 1 : -1) } : s));
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message || "No se pudo marcar el post");
		} finally {
			setMarcando(null);
		}
	};

	const publicable = (r: SaijSentencia) => {
		const sc = r.sentenciaCapturada;
		return !!sc && (sc.aiSummaryChars ?? 0) > 0 && sc.publicationStatus !== "skipped";
	};

	return (
		<Stack spacing={2}>
			<CampaignConfigPanel />

			<Alert severity="info" variant="outlined">
				Un fallo se puede notificar como novedad solo si está publicable: tiene <strong>SentenciaCapturada</strong>, <strong>resumen IA</strong> y no está
				dado de baja editorialmente. El worker envía hasta 5 por día, del más antiguo al más nuevo.
			</Alert>

			{/* Contadores */}
			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
				<StatChip label="Notificados a usuarios" value={stats?.userNotified} color="success" />
				<StatChip label="Excluidos de campañas" value={stats?.userCampaignExcluded} color="warning" />
				<StatChip label="Con post en redes" value={stats?.socialPost} color="secondary" />
				<StatChip label="Con resumen IA" value={conResumen ?? undefined} color="info" />
			</Stack>

			{/* Historial de campañas enviadas */}
			<Accordion variant="outlined" defaultExpanded>
				<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="subtitle2">Campañas enviadas</Typography>
						<Chip size="small" label={campanias.length} variant="outlined" />
						{campLoading && <CircularProgress size={13} />}
					</Stack>
				</AccordionSummary>
				<AccordionDetails sx={{ pt: 0 }}>
					{campanias.length === 0 && !campLoading ? (
						<Typography variant="body2" color="text.secondary">
							Todavía no se envió ninguna campaña.
						</Typography>
					) : (
						<Stack spacing={1.5} divider={<Divider flexItem />}>
							{campanias.map((c) => (
								<Box key={c._id}>
									<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
										<Typography variant="body2" fontWeight={600}>
											{new Date(c.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
										</Typography>
										<Chip size="small" label={c.status} variant="outlined" color={c.status === "completed" ? "default" : "success"} />
										<Chip size="small" label={`${c.fallos.length} fallo(s)`} variant="outlined" />
										<Chip size="small" color="info" variant="outlined" label={`${c.totalEnviados} enviados`} />
										<Chip size="small" variant="outlined" label={`${c.opens} aperturas`} />
										<Tooltip title={c.lectores.length ? `Leyeron: ${c.lectores.join(", ")}` : "Sin clicks reales todavía"}>
											<Chip size="small" color="success" variant="outlined" label={`${c.clicksJurisprudencia} ingresaron`} />
										</Tooltip>
										{c.clicksBot > 0 && (
											<Tooltip title="Clicks descartados: escáneres de seguridad de servidores de correo que abren todos los links del mail">
												<Chip size="small" variant="outlined" label={`${c.clicksBot} escáner`} sx={{ opacity: 0.6 }} />
											</Tooltip>
										)}
										{Object.entries(c.envios)
											.filter(([k]) => k === "bounced" || k === "complained" || k === "failed")
											.map(([k, v]) => (
												<Chip key={k} size="small" color="error" variant="outlined" label={`${v} ${k}`} />
											))}
									</Stack>
									<Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
										{c.fallos.map((f) => (
											<Typography key={f._id} component="li" variant="caption" color="text.secondary">
												<Link href={`${PUBLIC_BASE}/${f._id}`} target="_blank" rel="noopener" underline="hover" color="inherit">
													{f.titulo || "(sin carátula)"}
												</Link>
												{f.tribunal ? ` — ${f.tribunal}` : ""}
											</Typography>
										))}
									</Stack>
								</Box>
							))}
						</Stack>
					)}
				</AccordionDetails>
			</Accordion>

			{/* Filtros */}
			<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
				<FormControl size="small" sx={{ minWidth: 220 }}>
					<InputLabel>Difusión</InputLabel>
					<Select
						value={filtro}
						label="Difusión"
						onChange={(e) => {
							setFiltro(e.target.value as FiltroDifusion);
							setPage(1);
						}}
					>
						{FILTROS.map((f) => (
							<MenuItem key={f.value} value={f.value}>
								{f.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<FormControl size="small" sx={{ minWidth: 170 }}>
					<InputLabel>Resumen IA</InputLabel>
					<Select
						value={resumenFiltro}
						label="Resumen IA"
						onChange={(e) => {
							setResumenFiltro(e.target.value as "" | "true" | "false");
							setPage(1);
						}}
					>
						<MenuItem value="">Indistinto</MenuItem>
						<MenuItem value="true">Con resumen</MenuItem>
						<MenuItem value="false">Sin resumen</MenuItem>
					</Select>
				</FormControl>

				<TextField
					size="small"
					label="Buscar carátula"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							setPage(1);
							load();
						}
					}}
					sx={{ minWidth: 240 }}
				/>

				<Tooltip title="Actualizar">
					<IconButton onClick={load} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>

				<Box flexGrow={1} />
				<Typography variant="caption" color="text.secondary">
					{total} fallo(s)
				</Typography>
			</Stack>

			{error && <Alert severity="error">{error}</Alert>}

			{aviso && (
				<Alert severity={aviso.tipo} onClose={() => setAviso(null)} sx={{ mb: 1.5 }}>
					{aviso.texto}
				</Alert>
			)}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Carátula</TableCell>
							<TableCell>Sentencia</TableCell>
							<TableCell align="center">Resumen IA</TableCell>
							<TableCell align="center">Publicable</TableCell>
							<TableCell align="center">Notificado</TableCell>
							<TableCell align="center">Redes</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
									<CircularProgress size={24} />
								</TableCell>
							</TableRow>
						)}
						{!loading && rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
									<Typography variant="body2" color="text.secondary">
										Sin resultados para este filtro
									</Typography>
								</TableCell>
							</TableRow>
						)}
						{!loading &&
							rows.map((r) => {
								const sc = r.sentenciaCapturada;
								const pub = publicable(r);
								return (
									<TableRow key={r._id} hover>
										<TableCell sx={{ maxWidth: 340 }}>
											<Typography variant="body2" fontWeight={500} noWrap title={r.titulo}>
												{r.titulo || "(sin carátula)"}
											</Typography>
											<Typography variant="caption" color="text.secondary" noWrap>
												{r.tribunal}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="caption">{fmtDate(r.fecha)}</Typography>
											<br />
											<Typography variant="caption" color="text.secondary">
												alta SAIJ: {r.fechaUmod ? r.fechaUmod.slice(0, 8) : "—"}
											</Typography>
										</TableCell>
										<TableCell align="center">
											{sc && (sc.aiSummaryChars ?? 0) > 0 ? (
												<Tooltip title={`${sc.aiSummaryChars} caracteres · ${sc.aiSummary?.status || "draft"}`}>
													<Chip size="small" color="success" variant="outlined" label={sc.aiSummary?.status || "draft"} />
												</Tooltip>
											) : (
												<Tooltip title={sc?.aiSummary?.skipReason || (sc ? "Todavía sin generar" : "Sin SentenciaCapturada")}>
													<Chip size="small" color="default" variant="outlined" label={sc?.aiSummary?.skipReason ? "no aplica" : "pendiente"} />
												</Tooltip>
											)}
										</TableCell>
										<TableCell align="center">
											{pub ? (
												<Link href={`${PUBLIC_BASE}/${sc?._id}`} target="_blank" rel="noopener" underline="none">
													<Chip size="small" color="info" variant="outlined" label="ver" icon={<ExportSquare size={13} />} />
												</Link>
											) : (
												<Tooltip title={sc?.publicationStatus === "skipped" ? "Dado de baja editorialmente" : "No disponible en la vista pública"}>
													<CloseCircle size={16} color="#9e9e9e" />
												</Tooltip>
											)}
										</TableCell>
										<TableCell align="center">
											{r.userNotified ? (
												<Tooltip title={`Campaña ${r.userCampaignId || "?"} · ${fmtDate(r.userNotifiedAt)}`}>
													<Chip size="small" color="success" label={fmtDate(r.userNotifiedAt)} />
												</Tooltip>
											) : r.userCampaignExcluded ? (
												<Tooltip title={`Excluido el ${fmtDate(r.userCampaignExcludedAt)}`}>
													<Chip size="small" color="warning" variant="outlined" label="excluido" />
												</Tooltip>
											) : (
												<Chip size="small" variant="outlined" label={pub ? "en cola" : "no elegible"} />
											)}
										</TableCell>
										<TableCell align="center">
											<Tooltip
												title={
													!pub
														? "Necesita página pública y resumen IA para poder explicarse"
														: r.socialPost?.generado
															? "Ya tiene un post generado"
															: "Generar carrusel explicando este fallo (queda en borrador)"
												}
											>
												<span>
													<IconButton
														size="small"
														onClick={() => sc?._id && generarCarrusel(sc._id, r.titulo || "")}
														disabled={!pub || !!r.socialPost?.generado || generando === sc?._id}
														color="primary"
													>
														{generando === sc?._id ? <CircularProgress size={14} /> : <MagicStar size={16} />}
													</IconButton>
												</span>
											</Tooltip>
											<Tooltip title={r.socialPost?.generado ? "Post generado — click para desmarcar" : "Marcar que se generó un post"}>
												<span>
													<IconButton
														size="small"
														onClick={() => toggleSocialPost(r)}
														disabled={marcando === r._id}
														color={r.socialPost?.generado ? "secondary" : "default"}
													>
														{marcando === r._id ? (
															<CircularProgress size={14} />
														) : r.socialPost?.generado ? (
															<TickCircle size={17} variant="Bold" />
														) : (
															<Instagram size={17} />
														)}
													</IconButton>
												</span>
											</Tooltip>
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
			</TableContainer>

			{pages > 1 && (
				<Stack alignItems="center">
					<Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} size="small" />
				</Stack>
			)}
		</Stack>
	);
}

function StatChip({ label, value, color }: { label: string; value?: number; color: "success" | "warning" | "secondary" | "info" }) {
	return (
		<Paper variant="outlined" sx={{ px: 1.5, py: 1, minWidth: 150 }}>
			<Typography variant="caption" color="text.secondary" display="block">
				{label}
			</Typography>
			<Typography variant="h5" color={`${color}.main`}>
				{value ?? "—"}
			</Typography>
		</Paper>
	);
}
