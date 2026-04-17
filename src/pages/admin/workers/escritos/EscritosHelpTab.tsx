import React, { useState } from "react";
import { Box, Stack, Tab, Tabs, Typography, useTheme, alpha } from "@mui/material";

// ── Diagram primitives ────────────────────────────────────────────────────────

const useColors = () => {
	const theme = useTheme();
	return {
		local: theme.palette.warning.dark,
		redis: "#D82C20",
		worker: theme.palette.primary.main,
		openai: "#10A37F",
		pinecone: "#1A73E8",
		atlas: theme.palette.success.main,
		scan: theme.palette.secondary.main,
	};
};

interface NodeProps {
	title: string;
	subtitle?: string;
	items: string[];
	color: string;
	badge?: string;
	badgeColor?: string;
}

const Node: React.FC<NodeProps> = ({ title, subtitle, items, color, badge, badgeColor }) => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				position: "relative",
				border: `2px solid ${color}`,
				borderRadius: 2,
				p: 2,
				bgcolor: alpha(color, 0.04),
				minWidth: 190,
				flex: 1,
			}}
		>
			{badge && (
				<Box
					sx={{
						position: "absolute",
						top: -10,
						left: 12,
						bgcolor: badgeColor || color,
						color: "#fff",
						px: 1,
						py: 0.2,
						borderRadius: 1,
						fontSize: "0.62rem",
						fontWeight: 700,
						letterSpacing: 0.5,
					}}
				>
					{badge}
				</Box>
			)}
			<Typography variant="subtitle2" fontWeight={700} sx={{ color }}>
				{title}
			</Typography>
			{subtitle && (
				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
					{subtitle}
				</Typography>
			)}
			<Stack spacing={0.3} sx={{ mt: 0.5 }}>
				{items.map((item, i) => (
					<Typography key={i} variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${alpha(color, 0.3)}` }}>
						{item}
					</Typography>
				))}
			</Stack>
		</Box>
	);
};

const Arrow: React.FC<{ label?: string }> = ({ label }) => {
	const theme = useTheme();
	return (
		<Stack alignItems="center" justifyContent="center" sx={{ px: 0.5, minWidth: 44 }}>
			<Box sx={{ display: "flex", alignItems: "center" }}>
				<Box sx={{ width: 26, height: 2, bgcolor: theme.palette.divider }} />
				<Box
					sx={{
						width: 0,
						height: 0,
						borderTop: "5px solid transparent",
						borderBottom: "5px solid transparent",
						borderLeft: `7px solid ${theme.palette.divider}`,
					}}
				/>
			</Box>
			{label && (
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ fontSize: "0.6rem", mt: 0.4, whiteSpace: "nowrap", textAlign: "center" }}
				>
					{label}
				</Typography>
			)}
		</Stack>
	);
};

const ArrowDown: React.FC<{ label?: string }> = ({ label }) => {
	const theme = useTheme();
	return (
		<Stack alignItems="center" sx={{ py: 0.5 }}>
			<Box sx={{ width: 2, height: 18, bgcolor: theme.palette.divider }} />
			<Box
				sx={{
					width: 0,
					height: 0,
					borderLeft: "5px solid transparent",
					borderRight: "5px solid transparent",
					borderTop: `7px solid ${theme.palette.divider}`,
				}}
			/>
			{label && (
				<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem", fontStyle: "italic", mt: 0.3 }}>
					{label}
				</Typography>
			)}
		</Stack>
	);
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, mt: 1 }}>
		{children}
	</Typography>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
	<Box sx={{ display: "flex", gap: 2, py: 0.6, borderBottom: "1px solid", borderColor: "divider" }}>
		<Typography variant="caption" color="text.secondary" sx={{ minWidth: 175, fontWeight: 600 }}>
			{label}
		</Typography>
		<Typography variant="caption">{value}</Typography>
	</Box>
);

// ── Sub-tab: Overview ─────────────────────────────────────────────────────────

const OverviewSection: React.FC = () => {
	const colors = useColors();

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="body2" color="text.secondary">
					El <strong>Worker de Escritos</strong> es un pipeline de producción continuo que cada hora escanea las causas judiciales del PJN
					buscando escritos nuevos, descarga sus PDFs, extrae el texto, lo divide en fragmentos semánticos (chunks), genera embeddings y los
					almacena en Pinecone. En una segunda fase calcula un <strong>puntaje de novedad</strong> comparando cada escrito contra el corpus
					existente para identificar planteos jurídicos inusuales.
				</Typography>
			</Box>

			<Box>
				<SectionTitle>Ficha de infraestructura</SectionTitle>
				<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					<InfoRow
						label="Servidor"
						value={
							<>
								<strong>worker_01</strong> · IP 100.111.73.56
							</>
						}
					/>
					<InfoRow label="Proceso PM2" value="pjn-escritos-worker (Node.js)" />
					<InfoRow
						label="Base de datos ORIGEN"
						value={
							<>
								MongoDB <strong>local</strong> en worker_01 · CausasCivil / CausasTrabajo / CausasSegSoc / CausasComercial
							</>
						}
					/>
					<InfoRow
						label="Base de datos DESTINO"
						value={
							<>
								MongoDB <strong>Atlas</strong> (cloud) · colección global_documents
							</>
						}
					/>
					<InfoRow
						label="Índice Pinecone"
						value={
							<>
								<code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3 }}>pjn-style-corpus-v2</code> · namespace{" "}
								<code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3 }}>global-chunks</code> ·{" "}
								<strong>1024 dims</strong> · coseno
							</>
						}
					/>
					<InfoRow
						label="Cola de mensajes"
						value="Redis (BullMQ) en worker_01 · colas: escritos-extract · escritos-ocr · escritos-select"
					/>
					<InfoRow label="Activación" value="Cron periódico + scan inicial al arrancar el proceso" />
					<InfoRow
						label="Cron default"
						value={
							<>
								<code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3 }}>0 * * * *</code> — cada hora (configurable
								desde Panel → Config)
							</>
						}
					/>
					<InfoRow label="Concurrencia extractor" value="3 workers paralelos (EXTRACTOR_CONCURRENCY)" />
					<InfoRow label="Concurrencia selector" value="2 workers paralelos (SELECTOR_CONCURRENCY)" />
					<InfoRow label="OpenAI model" value="text-embedding-3-small (1024 dims)" />
					<InfoRow label="PDFs" value="Descargados directamente desde URLs públicas del PJN · no se guardan en S3" />
					<InfoRow
						label="Chunks (texto completo)"
						value={
							<>
								AWS S3 · bucket <code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3 }}>pjn-rag-documents</code> · ruta{" "}
								<code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3 }}>
									escritos/&#123;causaId&#125;/chunks/&#123;docId&#125;.json
								</code>{" "}
								· región sa-east-1
							</>
						}
					/>
					<InfoRow label="Config dinámica" value="PipelineConfig en MongoDB Atlas · caché 5 min · sin reiniciar el proceso" />
				</Box>
			</Box>

			<Box>
				<SectionTitle>Diagrama de infraestructura</SectionTitle>
				<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper" }}>
					{/* Row 1: source */}
					<Stack direction="row" alignItems="stretch" spacing={1} sx={{ mb: 1 }}>
						<Node
							badge="SERVIDOR LOCAL"
							badgeColor={colors.local}
							title="MongoDB Local"
							subtitle="worker_01 · 100.111.73.56"
							items={[
								"CausasCivil (fuero CIV)",
								"CausasTrabajo (fuero CNT)",
								"CausasSegSoc (fuero CSS)",
								"CausasComercial (fuero COM)",
								"movimiento.url · movimiento.detalle",
							]}
							color={colors.local}
						/>
						<Arrow label="scan.job.js (cron)" />
						<Node
							badge="SERVIDOR LOCAL"
							badgeColor={colors.redis}
							title="Redis (BullMQ)"
							subtitle="worker_01 · puerto 6379"
							items={["Cola: escritos-extract", "Cola: escritos-select", "jobId determinístico (dedup)", "Reintentos: 3x / 2x"]}
							color={colors.redis}
						/>
					</Stack>

					<ArrowDown label="extractor.worker.js (concurrency: 3)" />

					{/* Row 2: processing */}
					<Stack direction="row" alignItems="stretch" spacing={1} sx={{ mb: 1 }}>
						<Node
							badge="FASE 1"
							badgeColor={colors.worker}
							title="Extractor Worker"
							subtitle="worker_01 · Node.js"
							items={[
								"1. Descarga PDF (max 25 MB)",
								"2. Extrae texto (pdf-parse)",
								"3. Chunking semántico",
								"4. Embeddings (OpenAI)",
								"5. Upsert a Pinecone",
								"6. Sube chunks a S3",
								"7. Guarda GlobalDocument",
							]}
							color={colors.worker}
						/>
						<Arrow label="llamadas API" />
						<Stack spacing={1} sx={{ flex: 1 }}>
							<Node
								badge="EXTERNO"
								badgeColor={colors.openai}
								title="OpenAI API"
								subtitle="text-embedding-3-small"
								items={["Batches de 20 chunks", "1536 dims por vector"]}
								color={colors.openai}
							/>
							<Node
								badge="VECTOR DB"
								badgeColor={colors.pinecone}
								title="Pinecone"
								subtitle="pjn-style-corpus-v2 · global-chunks"
								items={["Upsert en batches de 100", "metadata: causeId, docType, sectionType, chunkText"]}
								color={colors.pinecone}
							/>
						</Stack>
					</Stack>

					<ArrowDown label="si docType sustantivo → escritos-select" />

					{/* Row 3: novelty */}
					<Stack direction="row" alignItems="stretch" spacing={1} sx={{ mb: 1 }}>
						<Node
							badge="FASE 2"
							badgeColor={colors.worker}
							title="Selector Worker"
							subtitle="worker_01 · Novelty Detection"
							items={[
								"Selecciona chunks (estrategia A/B)",
								"Fetch vectores de Pinecone",
								"Query vecinos (same-doctype)",
								"noveltyScore = 1 − mean(maxSim)",
								"Label: routine / review / alert",
							]}
							color={colors.worker}
						/>
						<Arrow label="persiste" />
						<Node
							badge="CLOUD"
							badgeColor={colors.atlas}
							title="MongoDB Atlas"
							subtitle="global_documents (cloud)"
							items={[
								"noveltyScore, noveltyLabel",
								"noveltyTopNeighbors (top 5)",
								"noveltyStatus: done/skipped/error",
								"noveltyAnalyzedAt",
							]}
							color={colors.atlas}
						/>
					</Stack>

					{/* Row 4: mark processed */}
					<Stack direction="row" alignItems="center" spacing={1}>
						<Box sx={{ flex: 1 }} />
						<Arrow label="marca globalProcessed=true" />
						<Node
							badge="SERVIDOR LOCAL"
							badgeColor={colors.local}
							title="MongoDB Local"
							subtitle="worker_01 · movimiento actualizado"
							items={["movimiento.globalProcessed = true", "Evita re-procesar en próximo scan"]}
							color={colors.local}
						/>
					</Stack>
				</Box>
			</Box>

			<Box>
				<SectionTitle>Relación entre bases de datos</SectionTitle>
				<Typography variant="body2" color="text.secondary">
					El worker opera con <strong>dos bases de datos separadas</strong>: la BD local de causas que alimentan los workers de scraping del
					PJN (fuente de datos), y MongoDB Atlas en la nube (destino de resultados enriquecidos con texto, embeddings y novedad). Pinecone
					es independiente de ambas y almacena únicamente los vectores para búsqueda semántica.
				</Typography>
				<Box sx={{ mt: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					<InfoRow label="BD LOCAL (worker_01)" value="Lee movimientos con URL no procesada. Al terminar marca globalProcessed=true." />
					<InfoRow
						label="MongoDB Atlas (cloud)"
						value="Escribe GlobalDocument: texto completo (fullText), chunks sin texto (solo metadata: chunkIndex, vectorId, hash), novedad."
					/>
					<InfoRow
						label="AWS S3 (cloud)"
						value="Almacena el texto completo de los chunks: escritos/{causaId}/chunks/{docId}.json · región sa-east-1 · bucket pjn-rag-documents."
					/>
					<InfoRow label="Pinecone (cloud)" value="Almacena vectores para novelty detection y búsqueda semántica sobre escritos." />
					<InfoRow
						label="Redis (worker_01)"
						value="BullMQ: cola interna entre scan → extractor → ocr → selector. No persiste datos judiciales."
					/>
				</Box>
			</Box>
		</Stack>
	);
};

// ── Sub-tab: Pipeline detail ──────────────────────────────────────────────────

const PipelineSection: React.FC = () => {
	const theme = useTheme();
	const colors = useColors();

	const phases = [
		{
			num: "1",
			title: "Scan (cron horario)",
			color: colors.scan,
			desc: "Itera las colecciones de causas en MongoDB local buscando movimientos con URL no procesada. Pre-filtra por regex sobre tipo+detalle, luego clasifica el docType con DETALLE_MAP.",
			steps: [
				"Lee PipelineConfig: si enabled=false o pauseUntil activo → skip total",
				"Filtra por activeFueros (default: CIV, CNT, CSS, COM)",
				"Pre-filtro regex: /demanda|contesta|reconven|agravio|memorial|sentencia.../",
				"normalizeDocType(tipo, detalle) → docType o null",
				"Encola en escritos-extract con jobId determinístico (deduplication automática)",
				"Máximo 5000 movimientos encolados por ejecución",
			],
		},
		{
			num: "2",
			title: "Extractor worker",
			color: colors.worker,
			desc: "Descarga el PDF, extrae texto, chunka semánticamente, genera embeddings y persiste en Pinecone + Atlas.",
			steps: [
				"Upsert idempotente de GlobalDocument (si ya status=embedded → skip)",
				"Descarga PDF (max 25 MB, directo desde URL pública del PJN)",
				"pdf-parse: extrae texto plano. Si needsOcr=true → status=deferred_ocr (skip)",
				"escritoChunker: detecta secciones (apertura, hechos, fundamentos, petitorio, body)",
				"OpenAI text-embedding-3-small en batches de 20 chunks",
				"Upsert a Pinecone pjn-style-corpus-v2/global-chunks en batches de 100",
				"Sube texto completo de chunks a S3: escritos/{causaId}/chunks/{docId}.json",
				"Guarda GlobalDocument en Atlas (chunks sin .text, solo metadata: index, vectorId, hash)",
				"Marca movimiento.globalProcessed=true en BD local",
				"Si docType ∈ NOVELTY_DOCTYPES → encola en escritos-select",
			],
		},
		{
			num: "3",
			title: "Selector worker (Novelty Detection)",
			color: colors.pinecone,
			desc: "Calcula qué tan novedoso es el escrito comparándolo contra el corpus existente en Pinecone.",
			steps: [
				"Verifica noveltyEnabled=true y docType ∈ noveltyDocTypes",
				"Selecciona chunks según estrategia A (fundamentos>hechos>body) o B (arg-zone)",
				"Excluye secciones apertura y petitorio (boilerplate)",
				"Fetch de vectores desde Pinecone (máx noveltyMaxChunks=4 chunks)",
				"Query top-K vecinos de OTRAS causas (filtro same-doctype opcional)",
				"noveltyScore = 1 − mean(maxSimilarity por chunk)",
				"Label: routine (<0.194) / review (≥0.194) / alert (≥0.234)",
				"Persiste noveltyScore, noveltyLabel, noveltyTopNeighbors en GlobalDocument",
			],
		},
	];

	return (
		<Stack spacing={3}>
			{phases.map((p) => (
				<Box key={p.num} sx={{ border: `1px solid ${p.color}`, borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ bgcolor: alpha(p.color, 0.08), px: 2, py: 1.2, borderBottom: `1px solid ${alpha(p.color, 0.3)}` }}>
						<Stack direction="row" alignItems="center" spacing={1.5}>
							<Box
								sx={{
									width: 28,
									height: 28,
									borderRadius: "50%",
									bgcolor: p.color,
									color: "#fff",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontWeight: 700,
									fontSize: "0.85rem",
									flexShrink: 0,
								}}
							>
								{p.num}
							</Box>
							<Typography variant="subtitle1" fontWeight={700}>
								{p.title}
							</Typography>
						</Stack>
					</Box>
					<Box sx={{ px: 2, py: 1.5 }}>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
							{p.desc}
						</Typography>
						<Stack spacing={0.4}>
							{p.steps.map((s, i) => (
								<Stack key={i} direction="row" spacing={1} alignItems="flex-start">
									<Box
										sx={{
											width: 18,
											height: 18,
											borderRadius: "50%",
											bgcolor: alpha(p.color, 0.15),
											color: p.color,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "0.6rem",
											fontWeight: 700,
											flexShrink: 0,
											mt: 0.1,
										}}
									>
										{i + 1}
									</Box>
									<Typography variant="caption" color="text.secondary">
										{s}
									</Typography>
								</Stack>
							))}
						</Stack>
					</Box>
				</Box>
			))}

			<Box>
				<SectionTitle>DocTypes y clasificación</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					El PJN usa <code>movimiento.tipo</code> genérico ("ESCRITO AGREGADO") para todos los escritos de parte. El tipo real del documento
					está en <code>movimiento.detalle</code> (texto libre: "CONTESTA DEMANDA", "INICIA DEMANDA POR DAÑOS Y PERJUICIOS", etc.).
				</Typography>
				<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					{[
						["demanda", "INICIA DEMANDA · PROMUEVE DEMANDA · ESCRITO DE INICIO"],
						["contestacion_demanda", "CONTESTA DEMANDA · CONTESTACION DE DEMANDA · CONTESTA LA DEMANDA"],
						["reconvencion", "RECONVENCION · RECONVENCIÓN"],
						["expresion_agravios", "EXPRESA AGRAVIOS · EXPRESION DE AGRAVIOS · PRESENTA MEMORIAL"],
						["contestacion_agravios", "CONTESTA AGRAVIOS · CONTESTA MEMORIAL · CONTESTA TRASLADO AGRAVIOS"],
						["recurso_extraordinario", "RECURSO EXTRAORDINARIO · RECURSO FEDERAL"],
						["sentencia", "PUBLICACION SENTENCIA · SENTENCIA DEFINITIVA (tipo directo)"],
					].map(([dtype, patterns], i) => (
						<Box
							key={i}
							sx={{ display: "flex", gap: 2, py: 0.6, px: 1.5, borderBottom: i < 6 ? "1px solid" : "none", borderColor: "divider" }}
						>
							<Typography variant="caption" sx={{ minWidth: 200, fontFamily: "monospace", fontWeight: 600, color: colors.worker }}>
								{dtype}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{patterns}
							</Typography>
						</Box>
					))}
				</Box>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
					⚡ Solo los docTypes: demanda, contestacion_demanda, reconvencion, expresion_agravios, contestacion_agravios,
					recurso_extraordinario pasan a la Fase 2 (novelty detection).
				</Typography>
			</Box>
		</Stack>
	);
};

// ── Sub-tab: Novelty ──────────────────────────────────────────────────────────

const NoveltySection: React.FC = () => {
	const theme = useTheme();
	const colors = useColors();

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="body2" color="text.secondary">
					El <strong>noveltyScore</strong> mide qué tan diferente es un escrito respecto al corpus ya indexado. Un valor cercano a 0 indica
					que el escrito es muy similar a otros ya vistos (rutinario); cercano a 1 indica que es único en el corpus.
				</Typography>
			</Box>

			<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
				<Box sx={{ bgcolor: alpha(colors.pinecone, 0.06), px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
					<Typography variant="subtitle2" fontWeight={700}>
						Fórmula
					</Typography>
				</Box>
				<Box sx={{ px: 2, py: 1.5 }}>
					<Box sx={{ bgcolor: "#f5f5f5", borderRadius: 1, px: 2, py: 1.5, fontFamily: "monospace", fontSize: "0.85rem", mb: 1 }}>
						noveltyScore = 1 − mean( maxSimilarity por chunk )
					</Box>
					<Typography variant="caption" color="text.secondary">
						Para cada chunk analizado se buscan los K vecinos más cercanos en Pinecone (de <em>otras</em> causas, mismo docType). Se toma el
						más cercano (maxSimilarity). El noveltyScore promedia esas distancias inversas.
					</Typography>
				</Box>
			</Box>

			<Box>
				<SectionTitle>Umbrales (calibrados en marzo 2026, n=60 documentos)</SectionTitle>
				<Stack spacing={1}>
					{[
						{
							label: "routine",
							range: "score < 0.194",
							desc: "Escrito estándar, muy similar al corpus. Planteos frecuentes, lenguaje formulaico.",
							color: theme.palette.success.main,
						},
						{
							label: "review",
							range: "0.194 ≤ score < 0.234",
							desc: "Moderadamente novedoso (~25% del corpus). Merece revisión manual.",
							color: theme.palette.warning.main,
						},
						{
							label: "alert",
							range: "score ≥ 0.234",
							desc: "Muy novedoso (~10% del corpus). Sin precedentes claros en el corpus actual.",
							color: theme.palette.error.main,
						},
					].map((item) => (
						<Box
							key={item.label}
							sx={{ border: `1px solid ${alpha(item.color, 0.4)}`, borderRadius: 2, p: 1.5, bgcolor: alpha(item.color, 0.04) }}
						>
							<Stack direction="row" spacing={1.5} alignItems="flex-start">
								<Box
									sx={{
										px: 1,
										py: 0.3,
										bgcolor: item.color,
										color: "#fff",
										borderRadius: 1,
										fontSize: "0.7rem",
										fontWeight: 700,
										flexShrink: 0,
										mt: 0.3,
									}}
								>
									{item.label.toUpperCase()}
								</Box>
								<Box>
									<Typography variant="caption" fontWeight={700}>
										{item.range}
									</Typography>
									<Typography variant="caption" color="text.secondary" display="block">
										{item.desc}
									</Typography>
								</Box>
							</Stack>
						</Box>
					))}
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
					Los umbrales se ajustan desde Panel → Config (noveltyThresholdTrack / noveltyThresholdAlert) sin reiniciar el worker. Recalibrar
					cuando el corpus supere los 500 documentos por docType.
				</Typography>
			</Box>

			<Box>
				<SectionTitle>Estrategias de selección de chunks</SectionTitle>
				<Stack spacing={1}>
					{[
						{
							name: "Estrategia A (default)",
							desc: "Prioriza la sección más informativa: fundamentos → hechos → body → cualquier sección no-boilerplate. Devuelve solo los chunks de la primera sección encontrada.",
							best: "Cuando la detección de secciones funciona correctamente.",
						},
						{
							name: "Estrategia B (arg-zone)",
							desc: "Devuelve todos los chunks excepto apertura y petitorio. Más robusta cuando el texto no tiene secciones detectadas y queda como 'body'.",
							best: "Documentos con poca estructuración o fueros con formatos atípicos.",
						},
					].map((s) => (
						<Box key={s.name} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
							<Typography variant="caption" fontWeight={700}>
								{s.name}
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
								{s.desc}
							</Typography>
							<Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.3 }}>
								✓ Mejor para: {s.best}
							</Typography>
						</Box>
					))}
				</Stack>
			</Box>

			<Box>
				<SectionTitle>Estados del análisis de novedad</SectionTitle>
				<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					{[
						["done", "Análisis completado. noveltyScore, noveltyLabel y noveltyTopNeighbors disponibles.", colors.pinecone],
						[
							"skipped",
							"Saltado: noveltyEnabled=false, docType no elegible, sin chunks sustantivos, ya analizado.",
							theme.palette.text.secondary,
						],
						["error", "Todas las queries a Pinecone fallaron. El job BullMQ reintenta hasta 2 veces.", theme.palette.error.main],
					].map(([status, desc, color], i) => (
						<Box
							key={i as number}
							sx={{
								display: "flex",
								gap: 2,
								py: 0.8,
								px: 1.5,
								borderBottom: i < 2 ? "1px solid" : "none",
								borderColor: "divider",
								alignItems: "flex-start",
							}}
						>
							<Box
								sx={{
									px: 1,
									py: 0.2,
									bgcolor: alpha(color as string, 0.12),
									color: color as string,
									borderRadius: 1,
									fontSize: "0.68rem",
									fontWeight: 700,
									flexShrink: 0,
									mt: 0.2,
									fontFamily: "monospace",
								}}
							>
								{status}
							</Box>
							<Typography variant="caption" color="text.secondary">
								{desc as string}
							</Typography>
						</Box>
					))}
				</Box>
			</Box>
		</Stack>
	);
};

// ── Sub-tab: Troubleshooting ──────────────────────────────────────────────────

const TroubleSection: React.FC = () => {
	const theme = useTheme();

	const issues = [
		{
			prob: "El scan encola 0 movimientos",
			cause: "enabled=false en PipelineConfig, pauseUntil activo, o todos los movimientos ya tienen globalProcessed=true.",
			fix: "Verificar Config en este panel (enabled=true). Consultar en MongoDB Atlas: db.pipeline_configs.findOne().",
		},
		{
			prob: "Todos los documentos tienen docType='otro' o null",
			cause:
				"movimiento.tipo es siempre genérico en el PJN. El tipo real está en movimiento.detalle. Si detalle no matchea ningún patrón del DETALLE_MAP → null.",
			fix: "Revisar patrones en config/docTypes.js. Agregar nuevas variantes de detalle según los datos reales de la BD local.",
		},
		{
			prob: "PDF necesita OCR → status: deferred_ocr",
			cause: "El PDF es una imagen escaneada sin capa de texto. pdf-parse extrae menos de 100 caracteres.",
			fix: "Estos documentos quedan pendientes para un worker OCR (Tesseract). No es un error: el escrito se procesa pero sin embeddings hasta tener el texto.",
		},
		{
			prob: "noveltyStatus='skipped' con reason='no_chunks'",
			cause: "El escrito solo tiene secciones apertura y petitorio (boilerplate). No hay contenido sustantivo para comparar.",
			fix: "No es un error. Documentos muy cortos o con poca argumentación siempre resultarán así. Cambiar a estrategia B puede ayudar marginalmente.",
		},
		{
			prob: "noveltyScore siempre alto (≥ 0.3) para todos los documentos",
			cause: "Corpus muy pequeño. Con pocos documentos en Pinecone, todos parecen novedosos porque no hay con qué comparar.",
			fix: "Esperar a que el corpus crezca (mínimo 50-100 docs por docType). Recalibrar umbrales con explore-novelty.js.",
		},
		{
			prob: "Worker se detiene o no hay jobs procesándose",
			cause: "PM2 reinició el proceso, Redis no disponible, o MongoDB Atlas inaccesible.",
			fix: "Verificar en worker_01: pm2 status y pm2 logs pjn-escritos-worker. Verificar conectividad Redis y MongoDB Atlas.",
		},
	];

	return (
		<Stack spacing={2}>
			{issues.map((item, i) => (
				<Box key={i} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.error.main, 0.06), borderBottom: "1px solid", borderColor: "divider" }}>
						<Typography variant="caption" fontWeight={700} color="error.main">
							Problema
						</Typography>
						<Typography variant="body2" fontWeight={600}>
							{item.prob}
						</Typography>
					</Box>
					<Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
						<Typography variant="caption" fontWeight={700} color="text.secondary">
							Causa
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{item.cause}
						</Typography>
					</Box>
					<Box sx={{ px: 2, py: 1 }}>
						<Typography variant="caption" fontWeight={700} color="success.main">
							Solución
						</Typography>
						<Typography variant="body2">{item.fix}</Typography>
					</Box>
				</Box>
			))}

			<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
				<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
					Comandos útiles en worker_01
				</Typography>
				{[
					["Ver estado PM2", "pm2 status"],
					["Ver logs en tiempo real", "pm2 logs pjn-escritos-worker"],
					["Reiniciar worker", "pm2 restart pjn-escritos-worker"],
					["Ejecutar scan manual", "npm run scan (en /pjn-escritos-worker)"],
					["Explorar distribución de novedad", "node scripts/explore-novelty.js --doctype contestacion_demanda --same-doctype -n 30"],
				].map(([label, cmd], i) => (
					<Box key={i} sx={{ mb: 0.8 }}>
						<Typography variant="caption" color="text.secondary">
							{label}:
						</Typography>
						<Box sx={{ bgcolor: "#f5f5f5", borderRadius: 1, px: 1.5, py: 0.5, fontFamily: "monospace", fontSize: "0.75rem", mt: 0.3 }}>
							{cmd}
						</Box>
					</Box>
				))}
			</Box>
		</Stack>
	);
};

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
	{ label: "Resumen e Infraestructura", value: "overview" },
	{ label: "Pipeline detallado", value: "pipeline" },
	{ label: "Novelty Detection", value: "novelty" },
	{ label: "Troubleshooting", value: "trouble" },
];

const EscritosHelpTab: React.FC = () => {
	const [sub, setSub] = useState("overview");

	return (
		<Stack spacing={0}>
			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
				<Tabs
					value={sub}
					onChange={(_, v) => setSub(v)}
					variant="scrollable"
					scrollButtons="auto"
					sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontSize: "0.8rem", fontWeight: 500, py: 0 } }}
				>
					{TABS.map((t) => (
						<Tab key={t.value} label={t.label} value={t.value} />
					))}
				</Tabs>
			</Box>
			{sub === "overview" && <OverviewSection />}
			{sub === "pipeline" && <PipelineSection />}
			{sub === "novelty" && <NoveltySection />}
			{sub === "trouble" && <TroubleSection />}
		</Stack>
	);
};

export default EscritosHelpTab;
