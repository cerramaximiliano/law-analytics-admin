import { ReactNode } from "react";
import { Box, Chip, Divider, Grid, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import {
	ArrowDown2,
	ArrowRight2,
	Box1,
	Cpu,
	DocumentDownload,
	DocumentText,
	Flash,
	Judge,
	SearchNormal1,
	Send2,
	TickCircle,
	Warning2,
} from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

/**
 * FlowTab — diagrama del flujo completo del subsistema SAIJ:
 * workers, procesamiento por documento, pipeline PJN, ramas nacional /
 * provincial y encadenado de backfills. Solo visual, sin datos en vivo.
 */

const PURPLE = "#8B5CF6";
const GREY = "#64748B";

// ── Piezas visuales ────────────────────────────────────────────────────────────

function FlowNode({
	title,
	subtitle,
	icon,
	color = BRAND_BLUE,
	dashed = false,
}: {
	title: string;
	subtitle?: ReactNode;
	icon?: ReactNode;
	color?: string;
	dashed?: boolean;
}) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
				borderRadius: 2,
				borderColor: alpha(color, isDark ? 0.45 : 0.35),
				borderStyle: dashed ? "dashed" : "solid",
				bgcolor: alpha(color, isDark ? 0.1 : 0.05),
				width: "100%",
			}}
		>
			<Stack direction="row" spacing={1.2} alignItems="flex-start">
				{icon && <Box sx={{ color, mt: 0.2, flexShrink: 0 }}>{icon}</Box>}
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle2" sx={{ color, lineHeight: 1.3 }}>
						{title}
					</Typography>
					{subtitle && (
						<Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.45 }}>
							{subtitle}
						</Typography>
					)}
				</Box>
			</Stack>
		</Paper>
	);
}

function FlowArrow({ label }: { label?: string }) {
	return (
		<Stack alignItems="center" spacing={0} sx={{ py: 0.3 }}>
			<ArrowDown2 size={16} color={GREY} />
			{label && (
				<Typography variant="caption" sx={{ color: GREY, fontStyle: "italic", mt: -0.3 }}>
					{label}
				</Typography>
			)}
		</Stack>
	);
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
	return (
		<Box sx={{ mb: 1.5 }}>
			<Typography variant="h6" fontWeight={600}>
				{children}
			</Typography>
			{hint && (
				<Typography variant="caption" color="text.secondary">
					{hint}
				</Typography>
			)}
		</Box>
	);
}

function WorkerCard({
	name,
	role,
	cadence,
	color,
	notes,
}: {
	name: string;
	role: string;
	cadence: string;
	color: string;
	notes: string[];
}) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Paper
			variant="outlined"
			sx={{ p: 2, borderRadius: 2, height: "100%", borderColor: alpha(color, isDark ? 0.4 : 0.3), bgcolor: alpha(color, isDark ? 0.08 : 0.04) }}
		>
			<Stack spacing={1}>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
					<Cpu size={18} color={color} />
					<Typography variant="subtitle2" sx={{ color, fontFamily: "monospace" }}>
						{name}
					</Typography>
					<Chip size="small" label={cadence} sx={{ height: 18, fontSize: 10 }} variant="outlined" />
				</Stack>
				<Typography variant="body2">{role}</Typography>
				<Divider sx={{ my: 0.5 }} />
				{notes.map((n) => (
					<Typography key={n} variant="caption" color="text.secondary" sx={{ display: "flex", gap: 0.6 }}>
						<span>·</span>
						<span>{n}</span>
					</Typography>
				))}
			</Stack>
		</Paper>
	);
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function FlowTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const green = theme.palette.success.main;

	return (
		<Stack spacing={4}>
			{/* ═══ 1. Procesos ═══ */}
			<Box>
				<SectionTitle hint="4 procesos PM2 en worker_01 sobre el mismo código; el comportamiento lo define la config de cada worker en Mongo (configuraciones_scraping_saij)">
					Procesos del subsistema
				</SectionTitle>
				<Grid container spacing={2}>
					<Grid item xs={12} md={6} lg={3}>
						<WorkerCard
							name="worker_SAIJ_0"
							role="Live nacional — novedades en modo incremental"
							cadence="cada 4 h"
							color={LIVE_GREEN}
							notes={[
								"Barre por fecha-umod DESC con watermark: captura TODO lo que SAIJ da de alta, aunque la sentencia sea de meses atrás (~96% de las novedades llega así, con demora de carga de 3-4 meses)",
								"Pipeline PJN completo + digest admin + campaña usuarios",
							]}
						/>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<WorkerCard
							name="worker_SAIJ_BACKFILL_0"
							role="Backfill histórico nacional 1912 → presente"
							cadence="cada 1 min"
							color={BRAND_BLUE}
							notes={[
								"Cursor año/mes ascendente con paginación por total real del facet",
								"Al llegar al mes en curso: se auto-deshabilita, activa el worker provincial y avisa por email (onCompleteEnableWorker)",
							]}
						/>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<WorkerCard
							name="worker_SAIJ_PROV_0"
							role="Jurisprudencia provincial (Jurisdicción/Local, 520k docs)"
							cadence="cada 3 min"
							color={PURPLE}
							notes={[
								"Hoy idle — arranca solo cuando termine el backfill nacional",
								"Backfill 1904 → presente y luego modo incremental",
								"SIN pipeline PJN ni embeddings (bloqueado en 3 capas)",
							]}
						/>
					</Grid>
					<Grid item xs={12} md={6} lg={3}>
						<WorkerCard
							name="worker_SAIJ_enrich"
							role="Enriquecimiento continuo"
							cadence="loop + idle 30 min"
							color={STALE_AMBER}
							notes={[
								"Completa textoCompleto de sumarios pendientes y re-sincroniza la SC del fallo padre (re-embed)",
								"Saneador de carátulas N/A + resúmenes IA para la sección pública",
							]}
						/>
					</Grid>
				</Grid>
			</Box>

			{/* ═══ 2. Flujo por documento (nacional) ═══ */}
			<Box>
				<SectionTitle hint="Camino de cada documento capturado por el live o el backfill nacional. Flujo 100% HTTP — Puppeteer quedó solo como fallback.">
					Flujo de un documento nacional
				</SectionTitle>
				<Grid container spacing={2} justifyContent="center">
					<Grid item xs={12} md={8} lg={6}>
						<Stack alignItems="center">
							<FlowNode
								icon={<SearchNormal1 size={18} />}
								title="API /busqueda — facet Jurisdicción/Nacional"
								subtitle="Incremental: fecha-umod DESC + watermark · Backfill: cursor año/mes ASC. Dedup por saijId (índice único)."
							/>
							<FlowArrow label="doc nuevo" />
							<FlowNode
								icon={<DocumentText size={18} />}
								title="view-document (fast-path HTTP)"
								subtitle="Adjunto declarado en texto-doc + texto íntegro de sumarios (la búsqueda lo trunca a ~250 chars)."
							/>
							<FlowArrow />
							<FlowNode
								icon={<DocumentDownload size={18} />}
								title="descarga-archivo directa → pdf-parse"
								subtitle="Texto plano del PDF + heurística needsOcr. Se guarda el doc en saij-sentencias."
							/>
							<FlowArrow label="¿expediente PJN en el PDF?" />
							<FlowNode
								icon={<Judge size={18} />}
								title='parseExpediente — "Expte Nº CNT 46218/2011"'
								subtitle="La metadata SAIJ casi nunca lo trae (~0,7%): la fuente real es el texto del PDF. Solo formato PJN moderno."
								color={STALE_AMBER}
							/>
						</Stack>
					</Grid>
				</Grid>

				{/* Ramas con/sin causa */}
				<Grid container spacing={2} sx={{ mt: 0.5 }}>
					<Grid item xs={12} md={6}>
						<Stack alignItems="center" spacing={0}>
							<Chip
								icon={<TickCircle size={14} />}
								label="CON causa (encontrada o creada) — ~90% en docs 2015+"
								size="small"
								sx={{ mb: 1, color: green, borderColor: alpha(green, 0.5) }}
								variant="outlined"
							/>
							<FlowNode
								icon={<Judge size={18} />}
								title="Causa PJN vinculada"
								subtitle="linkToCausa contra pjn-api (URLDB_LOCAL); si no existe y hay fuero soportado, createMissingCausas la crea (source: cache)."
								color={green}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Flash size={18} />}
								title="Marcar causa + movimiento «SENTENCIA SAIJ»"
								subtitle="El expediente del usuario muestra la sentencia como movimiento."
								color={green}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Box1 size={18} />}
								title="SentenciaCapturada (clave: causaId + url)"
								subtitle="Texto = PDF + sumarios concatenados. Los sumarios que llegan después re-upsertean el texto y resetean el embedding."
								color={green}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Cpu size={18} />}
								title="sentencias-embeddings → Pinecone"
								subtitle="embeddingStatus pending → completed. Habilita búsqueda semántica."
								color={green}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Send2 size={18} />}
								title="Página pública + digest + campaña"
								subtitle="/jurisprudencia/<id> · digest al admin (todo) · campaña a usuarios SOLO si la fecha de sentencia tiene ≤ 30 días (maxDocAgeDays — las altas tardías de SAIJ no son novedad)."
								color={green}
							/>
						</Stack>
					</Grid>
					<Grid item xs={12} md={6}>
						<Stack alignItems="center" spacing={0}>
							<Chip
								icon={<Warning2 size={14} />}
								label="SIN causa — histórico 1912-2000s (sin expediente parseable)"
								size="small"
								sx={{ mb: 1, color: STALE_AMBER, borderColor: alpha(STALE_AMBER, 0.5) }}
								variant="outlined"
							/>
							<FlowNode
								icon={<DocumentText size={18} />}
								title="textoCompleto persistido en saij-sentencias"
								subtitle="El texto del PDF NO se descarta: queda en el propio doc (textoSource: pdf + pdfMeta) junto a sus sumarios."
								color={STALE_AMBER}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Box1 size={18} />}
								title="pipelineStatus: skipped"
								dashed
								subtitle="Sin SC no hay movimiento, embeddings ni página pública — la SC exige una causa (su clave es causaId+url). Material listo para un futuro índice de jurisprudencia histórica sin re-scrapear."
								color={GREY}
							/>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			{/* ═══ 3. Flujo provincial ═══ */}
			<Box>
				<SectionTitle hint="Mismo esqueleto de captura, pero aislado por diseño del canal PJN: estas causas no existen en las colecciones PJN.">
					Flujo provincial (Jurisdicción/Local)
				</SectionTitle>
				<Grid container spacing={2} justifyContent="center">
					<Grid item xs={12} md={8} lg={6}>
						<Stack alignItems="center">
							<FlowNode
								icon={<SearchNormal1 size={18} />}
								title="API /busqueda — facet Jurisdicción/Local"
								subtitle="La búsqueda devuelve jurisdiccion 'LOCAL' para todas: la provincia real solo está en view-document."
								color={PURPLE}
							/>
							<FlowArrow />
							<FlowNode
								icon={<DocumentText size={18} />}
								title="view-document → provincia, magistrados, adjunto"
								subtitle="Texto por 3 vías según la época: PDF (recientes) · HTM (viejos, ej. Santa Fe 2005) · texto-completo inline (ej. Buenos Aires 2010)."
								color={PURPLE}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Box1 size={18} />}
								title="saij-sentencias con scrapeJurisdiccion: PROVINCIAL"
								subtitle="Campos propios: provincia (indexada), localidad, magistrados, instancia, textoSource, pdfMeta."
								color={PURPLE}
							/>
							<FlowArrow />
							<FlowNode
								icon={<Warning2 size={18} />}
								title="Pipeline PJN bloqueado — 3 capas"
								dashed
								subtitle="1) Guard duro por scrapeJurisdiccion en runDownstreamPipeline · 2) config pipeline.* toda en false · 3) sin SC no hay página → la campaña no puede armarse. Sin link a causas, sin movimientos, sin embeddings."
								color={GREY}
							/>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			{/* ═══ 4. Encadenado ═══ */}
			<Box>
				<SectionTitle hint="Ciclo de vida automático — sin intervención manual">Encadenado de backfills</SectionTitle>
				<Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(BRAND_BLUE, isDark ? 0.05 : 0.02) }}>
					<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
						<Chip label="Backfill nacional 1912 → hoy (~10-12 días)" sx={{ bgcolor: alpha(BRAND_BLUE, 0.12), color: BRAND_BLUE }} />
						<ArrowRight2 size={16} color={GREY} />
						<Chip label="se auto-deshabilita + email de aviso" variant="outlined" />
						<ArrowRight2 size={16} color={GREY} />
						<Chip label="activa worker provincial" sx={{ bgcolor: alpha(PURPLE, 0.12), color: PURPLE }} />
						<ArrowRight2 size={16} color={GREY} />
						<Chip label="backfill provincial 1904 → hoy (semanas)" sx={{ bgcolor: alpha(PURPLE, 0.12), color: PURPLE }} />
						<ArrowRight2 size={16} color={GREY} />
						<Chip label="modo incremental permanente (ambos)" sx={{ bgcolor: alpha(LIVE_GREEN, 0.12), color: LIVE_GREEN }} />
					</Stack>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
						El modo incremental es el estado final de los dos workers permanentes: barren lo recién agregado/modificado por fecha-umod con
						watermark persistido — solo actualizaciones, para siempre. El worker de backfill es descartable una vez completado.
					</Typography>
				</Paper>
			</Box>
		</Stack>
	);
}
