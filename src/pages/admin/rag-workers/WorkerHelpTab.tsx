import React, { useState } from "react";
import { Box, Stack, Tab, Tabs, Typography, useTheme, alpha } from "@mui/material";

// ── Flow node components ─────────────────────────────────────────────────────

interface FlowNodeProps {
	title: string;
	subtitle?: string;
	items: string[];
	color: string;
	badge?: string;
}

const FlowNode: React.FC<FlowNodeProps> = ({ title, subtitle, items, color, badge }) => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				position: "relative",
				border: `2px solid ${color}`,
				borderRadius: 2,
				p: 2,
				bgcolor: alpha(color, 0.04),
				minWidth: 220,
				flex: 1,
			}}
		>
			{badge && (
				<Box
					sx={{
						position: "absolute",
						top: -10,
						left: 12,
						bgcolor: color,
						color: "#fff",
						px: 1,
						py: 0.2,
						borderRadius: 1,
						fontSize: "0.65rem",
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

const FlowArrow: React.FC<{ label?: string; vertical?: boolean }> = ({ label, vertical }) => {
	const theme = useTheme();
	if (vertical) {
		return (
			<Stack alignItems="center" sx={{ py: 0.5 }}>
				<Box sx={{ width: 2, height: 20, bgcolor: theme.palette.divider }} />
				{label && (
					<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", fontStyle: "italic", my: 0.3 }}>
						{label}
					</Typography>
				)}
				<Typography sx={{ color: theme.palette.text.secondary, fontSize: "1.2rem", lineHeight: 1 }}>▼</Typography>
			</Stack>
		);
	}
	return (
		<Stack alignItems="center" justifyContent="center" sx={{ px: 0.5, minWidth: 40 }}>
			{label && (
				<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", fontStyle: "italic", mb: 0.3 }}>
					{label}
				</Typography>
			)}
			<Typography sx={{ color: theme.palette.text.secondary, fontSize: "1.2rem", lineHeight: 1 }}>▶</Typography>
		</Stack>
	);
};

// ── Helper components ────────────────────────────────────────────────────────

const ControlCard: React.FC<{ title: string; description: string; theme: any }> = ({ title, description, theme }) => (
	<Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
		<Typography variant="subtitle2" fontWeight={600} gutterBottom>
			{title}
		</Typography>
		<Typography variant="caption" color="text.secondary">
			{description}
		</Typography>
	</Box>
);

const CostCard: React.FC<{ title: string; model: string; worker: string; description: string; theme: any }> = ({
	title,
	model,
	worker,
	description,
	theme,
}) => (
	<Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
		<Typography variant="subtitle2" fontWeight={600}>
			{title}
		</Typography>
		<Typography variant="caption" sx={{ fontFamily: "monospace", color: theme.palette.primary.main }} display="block">
			{model}
		</Typography>
		<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
			Worker: {worker}
		</Typography>
		<Typography variant="caption" color="text.secondary">
			{description}
		</Typography>
	</Box>
);

const SectionBox: React.FC<{ children: React.ReactNode; theme: any }> = ({ children, theme }) => (
	<Box
		sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}
	>
		{children}
	</Box>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
		{children}
	</Typography>
);

// ── Sub-tab: Pipeline ────────────────────────────────────────────────────────

const HelpPipelineSection: React.FC = () => {
	const theme = useTheme();

	const colors = {
		autoIndex: theme.palette.info.main,
		indexCausa: theme.palette.primary.main,
		indexDocument: theme.palette.success.main,
		generateSummary: theme.palette.warning.main,
		ocrDocument: theme.palette.error.main,
		recovery: theme.palette.secondary.main,
	};

	return (
		<Stack spacing={4}>
			<Stack>
				<Typography variant="h5">Flujo de Trabajo del Sistema RAG</Typography>
				<Typography variant="body2" color="text.secondary">
					Diagrama del pipeline de indexacion automatica de causas judiciales
				</Typography>
			</Stack>

			{/* ── PHASE 1: Auto-discovery ────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Fase 1 — Descubrimiento automatico</SectionTitle>

				<Stack direction={{ xs: "column", md: "row" }} alignItems="center" spacing={1}>
					<FlowNode
						title="Auto Index"
						badge="CRON"
						subtitle="Escaneo periodico (cada N minutos)"
						color={colors.autoIndex}
						items={[
							"Busca causas verificadas sin indexar",
							"Detecta causas con movimientos nuevos",
							"Reintenta causas con errores (con cooldown)",
							"Limitado por batchSize y maxConcurrentJobs",
						]}
					/>
					<FlowArrow label="encola" />
					<FlowNode
						title="Index Causa"
						badge="ORQUESTADOR"
						subtitle="Procesa una causa completa"
						color={colors.indexCausa}
						items={[
							"Carga la causa y sus movimientos",
							"Crea RagDocument para metadata (caratula, fuero, etc.)",
							"Crea RagDocument por cada movimiento con PDF o texto",
							"Soporta modo incremental (solo movimientos nuevos)",
						]}
					/>
				</Stack>
			</SectionBox>

			{/* ── PHASE 2: Document processing ───────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Fase 2 — Procesamiento de documentos</SectionTitle>

				<Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
					Por cada movimiento de la causa, Index Causa encola un job de Index Document:
				</Typography>

				<Stack direction={{ xs: "column", md: "row" }} alignItems="stretch" spacing={1}>
					<FlowNode
						title="Index Document"
						badge="PIPELINE"
						subtitle="Pipeline completo por documento"
						color={colors.indexDocument}
						items={[
							"1. Descarga el PDF desde la fuente (PJN, S3, URL)",
							"2. Extrae texto del PDF (o usa texto directo)",
							"3. Divide el texto en chunks optimizados",
							"4. Genera embeddings via OpenAI (text-embedding-3-small)",
							"5. Sube vectores a Pinecone (sharding automatico)",
							"6. Guarda chunks y texto en S3",
						]}
					/>

					<Stack justifyContent="center" spacing={1} sx={{ minWidth: 40 }}>
						<FlowArrow label="si necesita OCR" />
					</Stack>

					<FlowNode
						title="OCR Document"
						badge="AUXILIAR"
						subtitle="Solo para PDFs escaneados"
						color={colors.ocrDocument}
						items={["Detecta PDFs sin texto extraible", "Procesa paginas con OCR (Tesseract)", "Devuelve texto extraido al pipeline"]}
					/>
				</Stack>
			</SectionBox>

			{/* ── PHASE 3: Summary generation ────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Fase 3 — Generacion de resumenes</SectionTitle>

				<Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
					Se dispara al finalizar la indexacion de una causa (solo en triggers manuales del usuario):
				</Typography>

				<FlowNode
					title="Generate Summary"
					badge="LLM"
					subtitle="Resumen inteligente via GPT-4o-mini"
					color={colors.generateSummary}
					items={[
						"Recibe el contexto completo de la causa indexada",
						"Genera un resumen estructurado via LLM",
						"Actualiza CausaSummary en MongoDB",
						"Consumo de tokens: prompt (input) + completion (output)",
					]}
				/>
			</SectionBox>

			{/* ── PHASE 4: Recovery ──────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Fase 4 — Recuperacion automatica</SectionTitle>

				<Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
					El worker Recovery escanea periodicamente en busca de documentos con error o trabados, y los re-encola automaticamente:
				</Typography>

				<Stack direction={{ xs: "column", md: "row" }} alignItems="stretch" spacing={1}>
					<FlowNode
						title="Recovery"
						badge="CRON"
						subtitle="Escaneo periodico de documentos fallidos"
						color={colors.recovery}
						items={[
							"Busca docs con status 'error' (cooldown: 15 min)",
							"Detecta docs stalled en estados intermedios (>10 min)",
							"Maximo 5 reintentos por documento (configurable)",
							"Respeta carga de colas (max 100 jobs activos)",
							"Batch de hasta 30 docs por ciclo de escaneo",
							"Limpia jobs fallidos de BullMQ (>1 hora)",
						]}
					/>
					<FlowArrow label="re-encola" />
					<Stack spacing={1} sx={{ flex: 1 }}>
						<FlowNode
							title="Index Document"
							subtitle="Re-procesamiento del pipeline"
							color={colors.indexDocument}
							items={[
								"Doc reseteado a 'pending', repite el pipeline completo",
								"Si error fue de embedding, limpia chunks y re-fragmenta",
								"Incrementa retryCount en cada reintento",
							]}
						/>
						<FlowNode
							title="OCR Document"
							subtitle="Si el doc requiere OCR pendiente"
							color={colors.ocrDocument}
							items={["Docs que necesitan OCR se re-encolan aqui", "Solo si requiresOcr=true y ocrCompleted=false"]}
						/>
					</Stack>
				</Stack>

				<FlowArrow vertical label="despues de 5 reintentos fallidos" />

				<Box
					sx={{
						p: 1.5,
						borderRadius: 1.5,
						border: `2px dashed ${theme.palette.error.main}`,
						bgcolor: alpha(theme.palette.error.main, 0.04),
						textAlign: "center",
					}}
				>
					<Typography variant="subtitle2" fontWeight={700} color="error.main">
						Error permanente
					</Typography>
					<Typography variant="caption" color="text.secondary">
						El documento queda en status 'error' definitivo y ya no se reintenta automaticamente. Se puede ver en el tab Indexacion
						filtrando por "Con error".
					</Typography>
				</Box>
			</SectionBox>

			{/* ── Recovery settings reference ────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Configuracion de Recovery</SectionTitle>

				<Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
					Parametros ajustables desde el tab Control (icono de configuracion en la caja del worker Recovery):
				</Typography>

				<Stack spacing={2}>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard
							title="docErrorCooldownMs"
							description="Tiempo minimo de espera antes de reintentar un documento con error. Default: 15 minutos (900.000 ms). Evita reintentos inmediatos que podrian fallar por el mismo motivo."
							theme={theme}
						/>
						<ControlCard
							title="docMaxRetries"
							description="Cantidad maxima de reintentos automaticos por documento. Default: 5. Despues de este limite el documento queda en error permanente."
							theme={theme}
						/>
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard
							title="stalledThresholdMs"
							description="Tiempo maximo que un documento puede estar en un estado intermedio (downloading, extracting, chunking, embedding) antes de considerarse trabado. Default: 10 minutos (600.000 ms)."
							theme={theme}
						/>
						<ControlCard
							title="maxQueueLoad"
							description="Si las colas indexDocument + ocrDocument tienen mas de este total de jobs (activos + esperando), Recovery no encola mas hasta que se liberen. Default: 100."
							theme={theme}
						/>
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard
							title="batchSize"
							description="Maximo de documentos que Recovery puede re-encolar por ciclo de escaneo. Prioriza errores primero, luego stalled con el remanente. Default: 30."
							theme={theme}
						/>
						<ControlCard
							title="cleanFailedAfterMs"
							description="Tiempo despues del cual se limpian los jobs fallidos de las colas BullMQ. Default: 1 hora (3.600.000 ms). Mantiene las colas limpias sin perder informacion reciente."
							theme={theme}
						/>
					</Stack>
				</Stack>
			</SectionBox>
		</Stack>
	);
};

// ── Sub-tab: Control ─────────────────────────────────────────────────────────

const HelpControlSection: React.FC = () => {
	const theme = useTheme();

	return (
		<Stack spacing={4}>
			<Stack>
				<Typography variant="h5">Mecanismos de Control</Typography>
				<Typography variant="body2" color="text.secondary">
					Parametros configurables para regular el comportamiento de los workers
				</Typography>
			</Stack>

			<SectionBox theme={theme}>
				<SectionTitle>Controles generales</SectionTitle>
				<Stack spacing={2}>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard
							title="Concurrency"
							description="Cantidad de jobs que un worker procesa en paralelo. Ajustable en caliente desde el tab Control (1-20)."
							theme={theme}
						/>
						<ControlCard
							title="Rate Limiter"
							description="Limita cuantos jobs se procesan por intervalo de tiempo (ej: 20 jobs cada 60s). Cambios requieren reinicio del servicio."
							theme={theme}
						/>
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard
							title="Batch Size (Auto-Index)"
							description="Maximo de causas que Auto-Index encola por ciclo de escaneo. Editable desde el icono de configuracion en la caja de Auto-Index."
							theme={theme}
						/>
						<ControlCard
							title="Max Concurrent Jobs"
							description="Tope total de jobs activos + esperando en la cola de Index Causa. Si se alcanza, Auto-Index no encola mas hasta que se liberen slots."
							theme={theme}
						/>
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard
							title="Pause / Resume"
							description="Pausa o reanuda un worker sin deshabilitarlo. El worker deja de tomar jobs nuevos pero termina los que esta procesando."
							theme={theme}
						/>
						<ControlCard
							title="Enable / Disable"
							description="Habilita o deshabilita un worker completamente. Un worker deshabilitado no procesa jobs aunque haya en la cola."
							theme={theme}
						/>
					</Stack>
				</Stack>
			</SectionBox>

			<SectionBox theme={theme}>
				<SectionTitle>Tracking de costos</SectionTitle>
				<Stack spacing={1}>
					<Typography variant="body2" color="text.secondary">
						El sistema trackea automaticamente el consumo de tokens de OpenAI y calcula costos en USD usando la tabla de precios
						configurable:
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
						<CostCard
							title="Embeddings"
							model="text-embedding-3-small"
							worker="Index Document"
							description="Tokens usados para vectorizar chunks de texto"
							theme={theme}
						/>
						<CostCard
							title="LLM (Prompt)"
							model="gpt-4o-mini"
							worker="Generate Summary"
							description="Tokens de entrada enviados al modelo para generar resumenes"
							theme={theme}
						/>
						<CostCard
							title="LLM (Completion)"
							model="gpt-4o-mini"
							worker="Generate Summary"
							description="Tokens de salida generados por el modelo en los resumenes"
							theme={theme}
						/>
					</Stack>
				</Stack>
			</SectionBox>
		</Stack>
	);
};

// ── Sub-tab: Performance ─────────────────────────────────────────────────────

const HelpPerformanceSection: React.FC = () => {
	const theme = useTheme();

	const colors = {
		indexCausa: theme.palette.primary.main,
		indexDocument: theme.palette.success.main,
		queue: theme.palette.warning.main,
	};

	return (
		<Stack spacing={4}>
			<Stack>
				<Typography variant="h5">Rendimiento y Tiempos de Procesamiento</Typography>
				<Typography variant="body2" color="text.secondary">
					Como se mide el tiempo de indexacion de una causa y que factores lo afectan
				</Typography>
			</Stack>

			{/* ── How timing works ────────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Como se mide el tiempo por causa</SectionTitle>

				<Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
					El timer de una causa mide desde que el worker Index Causa arranca hasta que el ultimo documento termina de procesarse:
				</Typography>

				<Stack spacing={0.5}>
					<Stack direction={{ xs: "column", md: "row" }} alignItems="center" spacing={1}>
						<FlowNode
							title="Index Causa"
							badge="INICIO"
							subtitle="indexStartedAt = ahora"
							color={colors.indexCausa}
							items={[
								"Carga movimientos de la causa",
								"Crea RagDocument por cada uno",
								"Encola TODOS los docs de golpe",
								"El worker termina inmediatamente (no espera)",
							]}
						/>
						<FlowArrow label="N jobs" />
						<FlowNode
							title="Cola indexDocument"
							badge="COMPARTIDA"
							subtitle="Cola unica para todas las causas"
							color={colors.queue}
							items={[
								"Docs de TODAS las causas activas compiten",
								"FIFO: se procesan en orden de llegada",
								"Concurrency determina cuantos en paralelo",
								"El ultimo doc en terminar marca lastIndexedAt",
							]}
						/>
						<FlowArrow label="completa" />
						<FlowNode
							title="Causa indexada"
							badge="FIN"
							subtitle="lastIndexedAt = ahora"
							color={colors.indexDocument}
							items={[
								"documentsProcessed >= documentsTotal",
								"Duracion = lastIndexedAt - indexStartedAt",
								"Incluye TODO el tiempo en cola",
							]}
						/>
					</Stack>
				</Stack>
			</SectionBox>

			{/* ── The bottleneck ──────────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>El cuello de botella: cola compartida</SectionTitle>

				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Todas las causas activas depositan sus documentos en la misma cola de Index Document. Esto significa que el tiempo de
					procesamiento por causa no depende solo de sus propios documentos, sino de cuantas otras causas estan compitiendo por los mismos
					workers.
				</Typography>

				<Box
					sx={{
						p: 2,
						borderRadius: 1.5,
						bgcolor: alpha(theme.palette.background.default, 0.8),
						border: `1px solid ${theme.palette.divider}`,
						fontFamily: "monospace",
						fontSize: "0.75rem",
					}}
				>
					<Typography variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "pre-line", display: "block" }}>
						{`Causa A (800 movimientos) ──┐
Causa B (560 movimientos) ──┼──▸ cola indexDocument ──▸ [ concurrency workers ]
Causa C (441 movimientos) ──┤
... (N causas mas)         ──┘

Cada "doc" = 1 movimiento de la causa (+ 1 doc de metadata).
Solo movimientos con PDF o texto (>50 chars) generan un doc.

Ejemplo con 7 causas activas (~3500 docs) y concurrency=2:
  ▸ Solo 2 docs se procesan a la vez entre todas las causas
  ▸ Cada doc: download → extract → chunk → embed (secuencial)
  ▸ Si el PDF necesita OCR: sale de la cola, pasa por ocrDocument
    (Tesseract, CPU, concurrency=1) y vuelve a indexDocument
  ▸ La causa A espera que sus 800 docs pasen por la cola`}
					</Typography>
				</Box>
			</SectionBox>

			{/* ── Trade-off diagram ───────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Trade-offs de configuracion</SectionTitle>

				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					La velocidad de indexacion por causa depende del balance entre tres parametros. Ajustar uno afecta a los demas:
				</Typography>

				<Stack spacing={2}>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<Box
							sx={{
								flex: 1,
								p: 2,
								borderRadius: 1.5,
								border: `2px solid ${theme.palette.success.main}`,
								bgcolor: alpha(theme.palette.success.main, 0.04),
							}}
						>
							<Typography variant="subtitle2" fontWeight={700} color="success.main" gutterBottom>
								indexDocument.concurrency
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Cantidad de documentos que se procesan en paralelo entre todas las causas.
							</Typography>
							<Stack spacing={0.5}>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
								>
									Subir = mas docs en paralelo = cada causa termina mas rapido
								</Typography>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.error.main, 0.3)}`, color: "text.secondary" }}
								>
									Limite: rate limits de OpenAI (embeddings), rate limits de Pinecone, RAM del servidor
								</Typography>
							</Stack>
						</Box>

						<Box
							sx={{
								flex: 1,
								p: 2,
								borderRadius: 1.5,
								border: `2px solid ${theme.palette.primary.main}`,
								bgcolor: alpha(theme.palette.primary.main, 0.04),
							}}
						>
							<Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
								indexCausa.concurrency
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Cantidad de causas que se procesan simultaneamente.
							</Typography>
							<Stack spacing={0.5}>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`, color: "text.secondary" }}
								>
									Subir = mas causas activas = mas docs compitiendo = mas lento por causa
								</Typography>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
								>
									Bajar = menos contention = cada causa individual mas rapida
								</Typography>
							</Stack>
						</Box>
					</Stack>

					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<Box
							sx={{
								flex: 1,
								p: 2,
								borderRadius: 1.5,
								border: `2px solid ${theme.palette.info.main}`,
								bgcolor: alpha(theme.palette.info.main, 0.04),
							}}
						>
							<Typography variant="subtitle2" fontWeight={700} color="info.main" gutterBottom>
								autoIndex.batchSize
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Cuantas causas encola Auto-Index por ciclo de escaneo.
							</Typography>
							<Stack spacing={0.5}>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`, color: "text.secondary" }}
								>
									Subir = mas causas encoladas por ciclo = cola mas cargada
								</Typography>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
								>
									Bajar = menos presion en la cola = procesamiento mas predecible
								</Typography>
							</Stack>
						</Box>

						<Box
							sx={{
								flex: 1,
								p: 2,
								borderRadius: 1.5,
								border: `2px solid ${theme.palette.warning.main}`,
								bgcolor: alpha(theme.palette.warning.main, 0.04),
							}}
						>
							<Typography variant="subtitle2" fontWeight={700} color="warning.main" gutterBottom>
								Rate Limiter (indexDocument)
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Maximo de jobs por intervalo de tiempo (ej: 20 cada 60s).
							</Typography>
							<Stack spacing={0.5}>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
								>
									Protege servicios externos de sobrecarga (OpenAI, Pinecone)
								</Typography>
								<Typography
									variant="caption"
									sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`, color: "text.secondary" }}
								>
									Puede ser el cuello de botella real si es muy restrictivo
								</Typography>
							</Stack>
						</Box>
					</Stack>
				</Stack>
			</SectionBox>

			{/* ── Recommendations ─────────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Guia de ajuste</SectionTitle>

				<Stack spacing={2}>
					<Box sx={{ p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
						<Typography variant="subtitle2" fontWeight={600} gutterBottom>
							Para causas mas rapidas (menos tiempo por causa)
						</Typography>
						<Stack spacing={0.5}>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
								Subir indexDocument.concurrency (ej: de 2 a 5-10) si OpenAI y Pinecone lo soportan
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
								Bajar indexCausa.concurrency (ej: de 2 a 1) para reducir competencia en la cola
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
								Bajar autoIndex.batchSize para que no se acumulen demasiadas causas
							</Typography>
						</Stack>
					</Box>

					<Box sx={{ p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
						<Typography variant="subtitle2" fontWeight={600} gutterBottom>
							Para mayor throughput global (mas causas por hora)
						</Typography>
						<Stack spacing={0.5}>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.primary.main}` }}>
								Subir indexDocument.concurrency para procesar mas docs en paralelo
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.primary.main}` }}>
								Subir indexCausa.concurrency para tener mas causas alimentando la cola
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
								Trade-off: cada causa individual tardara mas pero el total avanza mas rapido
							</Typography>
						</Stack>
					</Box>

					<Box sx={{ p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
						<Typography variant="subtitle2" fontWeight={600} gutterBottom>
							Limites a considerar
						</Typography>
						<Stack spacing={0.5}>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.error.main}` }}>
								OpenAI API: cada job llama a text-embedding-3-small — demasiada concurrencia genera rate limits (429)
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.error.main}` }}>
								Pinecone: tiene rate limits por namespace — upserts concurrentes pueden generar 429s
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.error.main}` }}>
								OCR local (Tesseract): concurrency=1 y 3 jobs/min — PDFs escaneados hacen doble pasada por la cola
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.error.main}` }}>
								RAM del servidor: cada worker carga PDFs en memoria — mas concurrencia = mas RAM (OCR usa ~1.2 GB)
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.error.main}` }}>
								PJN/MEV: descargar PDFs concurrentemente puede generar bloqueos temporales
							</Typography>
						</Stack>
					</Box>
				</Stack>
			</SectionBox>

			{/* ── External service limits ─────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Rate limits de servicios externos</SectionTitle>

				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					El pipeline depende de servicios externos con limites propios. Estos limites determinan hasta donde se puede escalar la
					concurrencia antes de recibir errores 429 (Too Many Requests).
				</Typography>

				{/* OpenAI */}
				<Box sx={{ mb: 3 }}>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						OpenAI — Embeddings (text-embedding-3-small)
					</Typography>
					<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
						Rate limits por tier de uso. Los limites exactos se ven en{" "}
						<Typography component="span" variant="caption" sx={{ color: theme.palette.primary.main }}>
							platform.openai.com/settings/organization/limits
						</Typography>
						. OpenAI gradua automaticamente al siguiente tier segun el gasto acumulado.
					</Typography>

					<Box sx={{ overflowX: "auto" }}>
						<Box
							component="table"
							sx={{
								width: "100%",
								borderCollapse: "collapse",
								"& th, & td": {
									px: 1.5,
									py: 0.75,
									fontSize: "0.75rem",
									borderBottom: `1px solid ${theme.palette.divider}`,
									textAlign: "left",
								},
								"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.primary.main, 0.04) },
							}}
						>
							<thead>
								<tr>
									<th>Tier</th>
									<th>Requisito</th>
									<th>RPM (req/min)</th>
									<th>TPM (tokens/min)</th>
									<th>Chunks/min estimado</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>Tier 1</td>
									<td>$5 pagados</td>
									<td>~500</td>
									<td>~1,000,000</td>
									<td>~2,000</td>
								</tr>
								<tr>
									<td>Tier 2</td>
									<td>$50 + 7 dias</td>
									<td>~500</td>
									<td>~1,000,000</td>
									<td>~2,000</td>
								</tr>
								<tr>
									<td>Tier 3</td>
									<td>Mayor spend</td>
									<td>~1,000</td>
									<td>~5,000,000</td>
									<td>~10,000</td>
								</tr>
								<tr>
									<td>Tier 4</td>
									<td>Mayor spend</td>
									<td>~5,000</td>
									<td>~5,000,000</td>
									<td>~10,000</td>
								</tr>
								<tr>
									<td>Tier 5</td>
									<td>Mayor spend</td>
									<td>~10,000</td>
									<td>~10,000,000</td>
									<td>~20,000</td>
								</tr>
							</tbody>
						</Box>
					</Box>

					<Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
						* Chunks/min estimado asumiendo ~500 tokens por chunk. Valores aproximados basados en datos historicos de la documentacion de
						OpenAI.
					</Typography>

					<Stack spacing={0.5} sx={{ mt: 1.5 }}>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
							En Tier 1 (~1M TPM) se pueden procesar ~33 chunks/segundo — generoso para la mayoria de los casos
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.info.main}` }}>
							El RPM (requests/min) puede ser el limite real si se envian pocos tokens por request — conviene agrupar chunks en batches
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
							Si se reciben errores 429, verificar el tier actual y considerar aumentar el gasto para subir de tier
						</Typography>
					</Stack>
				</Box>

				{/* Pinecone */}
				<Box sx={{ mb: 3 }}>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						Pinecone — Upserts (Serverless)
					</Typography>
					<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
						Rate limits por namespace (cada shard de usuario es un namespace independiente).
					</Typography>

					<Box sx={{ overflowX: "auto" }}>
						<Box
							component="table"
							sx={{
								width: "100%",
								borderCollapse: "collapse",
								"& th, & td": {
									px: 1.5,
									py: 0.75,
									fontSize: "0.75rem",
									borderBottom: `1px solid ${theme.palette.divider}`,
									textAlign: "left",
								},
								"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.warning.main, 0.04) },
							}}
						>
							<thead>
								<tr>
									<th>Limite</th>
									<th>Valor</th>
									<th>Alcance</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>Upsert requests</td>
									<td>100 req/s</td>
									<td>Por namespace</td>
								</tr>
								<tr>
									<td>Upsert data</td>
									<td>50 MB/s</td>
									<td>Por namespace</td>
								</tr>
								<tr>
									<td>Max batch</td>
									<td>1,000 vectores o 2 MB</td>
									<td>Por request</td>
								</tr>
								<tr>
									<td>Query requests</td>
									<td>100 req/s</td>
									<td>Por namespace</td>
								</tr>
								<tr>
									<td>Metadata por vector</td>
									<td>40 KB max</td>
									<td>Por record</td>
								</tr>
							</tbody>
						</Box>
					</Box>

					<Stack spacing={0.5} sx={{ mt: 1.5 }}>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
							El sharding por userId distribuye la carga — cada usuario tiene su propio namespace con 100 req/s independientes
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
							El riesgo es cuando muchos docs de una misma causa (mismo namespace) se procesan concurrentemente
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.info.main}` }}>
							Con concurrency baja (2-5) se esta lejos del limite. A partir de 10+ monitorear errores 429 en logs
						</Typography>
					</Stack>
				</Box>

				{/* Pinecone plans */}
				<Box>
					<Typography variant="subtitle2" fontWeight={700} gutterBottom>
						Pinecone — Limites por plan
					</Typography>

					<Box sx={{ overflowX: "auto" }}>
						<Box
							component="table"
							sx={{
								width: "100%",
								borderCollapse: "collapse",
								"& th, & td": {
									px: 1.5,
									py: 0.75,
									fontSize: "0.75rem",
									borderBottom: `1px solid ${theme.palette.divider}`,
									textAlign: "left",
								},
								"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.warning.main, 0.04) },
							}}
						>
							<thead>
								<tr>
									<th>Plan</th>
									<th>Precio</th>
									<th>Write units/mes</th>
									<th>Indexes</th>
									<th>Namespaces/index</th>
									<th>Storage</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>Starter</td>
									<td>Gratis</td>
									<td>2M</td>
									<td>5</td>
									<td>100</td>
									<td>2 GB</td>
								</tr>
								<tr>
									<td>Standard</td>
									<td>$50/mes</td>
									<td>Ilimitado</td>
									<td>100</td>
									<td>10,000</td>
									<td>Ilimitado</td>
								</tr>
								<tr>
									<td>Enterprise</td>
									<td>$500/mes</td>
									<td>Ilimitado</td>
									<td>200</td>
									<td>100,000</td>
									<td>Ilimitado</td>
								</tr>
							</tbody>
						</Box>
					</Box>

					<Stack spacing={0.5} sx={{ mt: 1.5 }}>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.error.main}` }}>
							En plan Starter: 2M write units/mes y 100 namespaces/index son los limites criticos para escalar
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
							En plan Standard+: write units ilimitados y 10K namespaces — suficiente para miles de usuarios
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.info.main}` }}>
							Si se alcanza el limite de storage o write units en Starter, los upserts devuelven 403 QUOTA_EXCEEDED
						</Typography>
					</Stack>
				</Box>
			</SectionBox>

			{/* ── Summary: what's the real bottleneck ─────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Donde esta el cuello de botella real</SectionTitle>

				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Con la configuracion actual (indexDocument.concurrency=2), el sistema esta lejos de los limites de OpenAI y Pinecone. El factor
					limitante es la baja concurrencia combinada con la cola compartida entre multiples causas.
				</Typography>

				<Stack spacing={1.5}>
					<Box
						sx={{
							p: 1.5,
							borderRadius: 1.5,
							border: `1px solid ${theme.palette.divider}`,
							bgcolor: alpha(theme.palette.success.main, 0.03),
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main, minWidth: 80 }}>
								Holgado
							</Typography>
							<Typography variant="caption" color="text.secondary">
								OpenAI embeddings — Tier 1 permite ~2,000 chunks/min, con concurrency=10 se usarian ~50-100 chunks/min
							</Typography>
						</Stack>
					</Box>
					<Box
						sx={{
							p: 1.5,
							borderRadius: 1.5,
							border: `1px solid ${theme.palette.divider}`,
							bgcolor: alpha(theme.palette.success.main, 0.03),
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main, minWidth: 80 }}>
								Holgado
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Pinecone upserts — 100 req/s por namespace, con concurrency=10 se usarian ~10 req/s max
							</Typography>
						</Stack>
					</Box>
					<Box
						sx={{
							p: 1.5,
							borderRadius: 1.5,
							border: `1px solid ${theme.palette.divider}`,
							bgcolor: alpha(theme.palette.warning.main, 0.03),
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.main, minWidth: 80 }}>
								Moderado
							</Typography>
							<Typography variant="caption" color="text.secondary">
								RAM del servidor — cada worker carga PDFs en memoria (~10-50 MB por doc grande). Monitorear con concurrency alta
							</Typography>
						</Stack>
					</Box>
					<Box
						sx={{
							p: 1.5,
							borderRadius: 1.5,
							border: `1px solid ${theme.palette.divider}`,
							bgcolor: alpha(theme.palette.warning.main, 0.03),
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.main, minWidth: 80 }}>
								Moderado
							</Typography>
							<Typography variant="caption" color="text.secondary">
								OCR local (Tesseract) — concurrency=1, rate limit 3 jobs/min, CPU-intensivo (~1.2 GB RAM). Los docs con OCR hacen doble
								pasada por indexDocument
							</Typography>
						</Stack>
					</Box>
					<Box
						sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.error.main, 0.03) }}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.error.main, minWidth: 80 }}>
								Limitante
							</Typography>
							<Typography variant="caption" color="text.secondary">
								indexDocument.concurrency=2 + cola compartida entre 7 causas — la cola es el cuello de botella principal
							</Typography>
						</Stack>
					</Box>
				</Stack>
			</SectionBox>
		</Stack>
	);
};

// ── Sub-tab: Infrastructure ──────────────────────────────────────────────────

const HelpInfrastructureSection: React.FC = () => {
	const theme = useTheme();

	return (
		<Stack spacing={4}>
			<Stack>
				<Typography variant="h5">Infraestructura y Capacidad</Typography>
				<Typography variant="body2" color="text.secondary">
					Servidor dedicado para workers y estimaciones de throughput segun configuracion
				</Typography>
			</Stack>

			{/* ── Server specs ────────────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Servidor worker_02</SectionTitle>

				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
					Servidor dedicado 100% al procesamiento de workers RAG. Sin otros servicios corriendo.
				</Typography>

				<Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
					<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, textAlign: "center" }}>
						<Typography variant="caption" color="text.secondary" display="block">
							CPU
						</Typography>
						<Typography variant="h6" fontWeight={700}>
							AMD Ryzen 7 5700X
						</Typography>
						<Typography variant="caption" color="text.secondary">
							8 cores / 16 threads
						</Typography>
					</Box>
					<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, textAlign: "center" }}>
						<Typography variant="caption" color="text.secondary" display="block">
							RAM
						</Typography>
						<Typography variant="h6" fontWeight={700}>
							32 GB
						</Typography>
						<Typography variant="caption" color="text.secondary">
							~30 GB disponibles
						</Typography>
					</Box>
					<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, textAlign: "center" }}>
						<Typography variant="caption" color="text.secondary" display="block">
							Swap
						</Typography>
						<Typography variant="h6" fontWeight={700}>
							8 GB
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Respaldo de emergencia
						</Typography>
					</Box>
				</Stack>

				<Box
					sx={{
						p: 1.5,
						borderRadius: 1.5,
						bgcolor: alpha(theme.palette.info.main, 0.04),
						border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
					}}
				>
					<Typography variant="caption" color="text.secondary">
						IP: <strong>100.98.180.101</strong> · Usuario: <strong>worker_02</strong> · Ryzen 5700X tiene buen rendimiento single-thread que
						beneficia a Tesseract OCR
					</Typography>
				</Box>
			</SectionBox>

			{/* ── Recommended config ─────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Configuracion recomendada de workers</SectionTitle>

				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
					Distribucion optima de recursos del servidor entre los workers, con margen de seguridad:
				</Typography>

				<Box sx={{ overflowX: "auto" }}>
					<Box
						component="table"
						sx={{
							width: "100%",
							borderCollapse: "collapse",
							"& th, & td": { px: 1.5, py: 1, fontSize: "0.75rem", borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "left" },
							"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.primary.main, 0.04) },
						}}
					>
						<thead>
							<tr>
								<th>Worker</th>
								<th>Concurrency</th>
								<th>CPU estimado</th>
								<th>RAM estimada</th>
								<th>Perfil</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>
									<strong>indexDocument</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: theme.palette.success.main }}>
										15
									</Typography>
								</td>
								<td>~1 core (I/O bound)</td>
								<td>~1.8 GB</td>
								<td>Red-bound — espera APIs</td>
							</tr>
							<tr>
								<td>
									<strong>ocrDocument</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700, color: theme.palette.warning.main }}>
										4
									</Typography>
								</td>
								<td>~8 cores</td>
								<td>~4 GB</td>
								<td>CPU-intensivo (Tesseract)</td>
							</tr>
							<tr>
								<td>
									<strong>indexCausa</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										2
									</Typography>
								</td>
								<td>despreciable</td>
								<td>~200 MB</td>
								<td>Liviano — solo encola docs</td>
							</tr>
							<tr>
								<td>
									<strong>autoIndex</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										1
									</Typography>
								</td>
								<td>despreciable</td>
								<td>~120 MB</td>
								<td>Cron — escaneo periodico</td>
							</tr>
							<tr>
								<td>
									<strong>recovery</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										1
									</Typography>
								</td>
								<td>despreciable</td>
								<td>~120 MB</td>
								<td>Cron — escaneo periodico</td>
							</tr>
							<tr>
								<td>
									<strong>generateSummary</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										2
									</Typography>
								</td>
								<td>despreciable</td>
								<td>~200 MB</td>
								<td>API-bound (OpenAI LLM)</td>
							</tr>
							<tr style={{ fontWeight: 700 }}>
								<td>
									<strong>TOTAL</strong>
								</td>
								<td></td>
								<td>
									<strong>~10 cores pico</strong>
								</td>
								<td>
									<strong>~6.5 GB</strong>
								</td>
								<td>Margen: ~6 cores, ~24 GB RAM</td>
							</tr>
						</tbody>
					</Box>
				</Box>

				<Stack spacing={0.5} sx={{ mt: 2 }}>
					<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.info.main}` }}>
						El rate limiter de indexDocument tambien debe ajustarse: subir de 60/min a ~200/min para no frenar la concurrency=15
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
						OCR es el mas demandante: ~2 cores y ~1 GB por instancia concurrente. Con concurrency=4 ocupa la mitad de la CPU
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
						Sobran recursos para aumentar si se necesita. El servidor soportaria indexDocument hasta ~20 y ocrDocument hasta ~6
					</Typography>
				</Stack>
			</SectionBox>

			{/* ── Throughput estimates ────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Estimacion de throughput</SectionTitle>

				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
					Basado en datos reales: 89 causas completadas en 48 horas con config actual (indexDoc=2, ocr=1). Promedio 170 docs/causa.
				</Typography>

				{/* Real throughput */}
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
					Throughput real observado
				</Typography>

				<Box sx={{ overflowX: "auto", mb: 3 }}>
					<Box
						component="table"
						sx={{
							width: "100%",
							borderCollapse: "collapse",
							"& th, & td": {
								px: 1.5,
								py: 0.75,
								fontSize: "0.75rem",
								borderBottom: `1px solid ${theme.palette.divider}`,
								textAlign: "left",
							},
							"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.success.main, 0.04) },
						}}
					>
						<thead>
							<tr>
								<th>Escenario</th>
								<th>Causas/dia</th>
								<th>Docs/hora</th>
								<th>Avg por causa</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Config actual (indexDoc=2, ocr=1)</td>
								<td>~44</td>
								<td>~315</td>
								<td>~17h (wall-clock con contention)</td>
							</tr>
							<tr style={{ fontWeight: 700 }}>
								<td>
									<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
										worker_02 (indexDoc=15, ocr=4)
									</Typography>
								</td>
								<td>
									<strong>~330</strong>
								</td>
								<td>
									<strong>~2,300</strong>
								</td>
								<td>
									<strong>~2.5h</strong>
								</td>
							</tr>
						</tbody>
					</Box>
				</Box>

				<Box
					sx={{
						p: 1.5,
						borderRadius: 1.5,
						bgcolor: alpha(theme.palette.info.main, 0.04),
						border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
						mb: 3,
					}}
				>
					<Typography variant="caption" color="text.secondary">
						<strong>Nota:</strong> el avg de 17h por causa es wall-clock (incluye espera en cola compartida con otras causas). El throughput
						real es alto porque multiples causas avanzan en paralelo — sus docs se intercalan en la cola FIFO.
					</Typography>
				</Box>

				{/* Backlog example */}
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
					Ejemplo: backlog pendiente (101 causas + 7 activas)
				</Typography>

				<Box sx={{ overflowX: "auto", mb: 2 }}>
					<Box
						component="table"
						sx={{
							width: "100%",
							borderCollapse: "collapse",
							"& th, & td": {
								px: 1.5,
								py: 0.75,
								fontSize: "0.75rem",
								borderBottom: `1px solid ${theme.palette.divider}`,
								textAlign: "left",
							},
							"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.error.main, 0.04) },
						}}
					>
						<thead>
							<tr>
								<th>Configuracion</th>
								<th>Causas pendientes</th>
								<th>Tiempo estimado</th>
								<th>Mejora</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Config actual (indexDoc=2, ocr=1)</td>
								<td>~108</td>
								<td>~2.5 dias</td>
								<td>—</td>
							</tr>
							<tr style={{ fontWeight: 700 }}>
								<td>
									<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
										worker_02 (indexDoc=15, ocr=4)
									</Typography>
								</td>
								<td>~108</td>
								<td>
									<strong>~8 horas</strong>
								</td>
								<td>
									<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
										~7x mas rapido
									</Typography>
								</td>
							</tr>
						</tbody>
					</Box>
				</Box>

				<Box
					sx={{
						p: 1.5,
						borderRadius: 1.5,
						bgcolor: alpha(theme.palette.info.main, 0.04),
						border: `1px solid ${alpha(theme.palette.info.main, 0.15)}`,
					}}
				>
					<Typography variant="caption" color="text.secondary">
						Estimaciones basadas en datos reales (89 causas/48h). La mejora ~7x surge de escalar indexDocument de 2 a 15 (7.5x) y OCR de 1 a
						4 (4x). El factor OCR reduce la mejora neta si hay alto porcentaje de PDFs escaneados.
					</Typography>
				</Box>
			</SectionBox>

			{/* ── Resource usage by worker type ───────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Perfil de consumo por tipo de worker</SectionTitle>

				<Stack spacing={2}>
					<Box
						sx={{
							p: 2,
							borderRadius: 1.5,
							border: `2px solid ${theme.palette.success.main}`,
							bgcolor: alpha(theme.palette.success.main, 0.04),
						}}
					>
						<Typography variant="subtitle2" fontWeight={700} color="success.main" gutterBottom>
							indexDocument — I/O bound (red)
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
							El trabajo real lo hacen servicios externos. El worker solo coordina las llamadas.
						</Typography>
						<Stack spacing={0.5}>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
							>
								Descarga PDF: espera red (PJN/S3) — ~10 MB RAM por descarga
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
							>
								Extraccion texto (pdf-parse): CPU minimo, ~50 MB RAM por PDF grande
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
							>
								Chunking: CPU minimo, memoria proporcional al texto
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
							>
								Embeddings (OpenAI API): espera red — sin consumo local
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}
							>
								Upsert (Pinecone): espera red — sin consumo local
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.info.main, 0.5)}`, color: "text.secondary", fontWeight: 600 }}
							>
								~120 MB RAM por slot de concurrency. Con concurrency=15: ~1.8 GB total
							</Typography>
						</Stack>
					</Box>

					<Box
						sx={{
							p: 2,
							borderRadius: 1.5,
							border: `2px solid ${theme.palette.error.main}`,
							bgcolor: alpha(theme.palette.error.main, 0.04),
						}}
					>
						<Typography variant="subtitle2" fontWeight={700} color="error.main" gutterBottom>
							ocrDocument — CPU bound (Tesseract)
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
							El mas demandante. Convierte imagenes de PDF a texto usando OCR local.
						</Typography>
						<Stack spacing={0.5}>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.error.main, 0.3)}`, color: "text.secondary" }}
							>
								Consume ~2 cores por instancia (multiples threads por pagina)
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.error.main, 0.3)}`, color: "text.secondary" }}
							>
								~1 GB RAM por instancia (imagenes descomprimidas en memoria)
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.error.main, 0.3)}`, color: "text.secondary" }}
							>
								Genera doble pasada por indexDocument (falla extraccion → OCR → re-encola)
							</Typography>
							<Typography
								variant="caption"
								sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.info.main, 0.5)}`, color: "text.secondary", fontWeight: 600 }}
							>
								Con concurrency=4: ~8 cores + ~4 GB RAM — mitad de la CPU del servidor
							</Typography>
						</Stack>
					</Box>

					<Box sx={{ p: 2, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
						<Typography variant="subtitle2" fontWeight={600} gutterBottom>
							Otros workers — livianos
						</Typography>
						<Typography variant="caption" color="text.secondary">
							indexCausa, autoIndex, recovery y generateSummary consumen recursos minimos (queries MongoDB y llamadas API). En conjunto: ~1
							core y ~640 MB RAM. No requieren optimizacion.
						</Typography>
					</Box>
				</Stack>
			</SectionBox>

			{/* ── Scaling guidelines ─────────────────────────────────────── */}
			<SectionBox theme={theme}>
				<SectionTitle>Guia de escalado por cada 100 docs</SectionTitle>

				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
					Requerimientos estimados de infraestructura para procesar lotes de 100 documentos, segun el porcentaje de documentos que requieren
					OCR:
				</Typography>

				<Box sx={{ overflowX: "auto" }}>
					<Box
						component="table"
						sx={{
							width: "100%",
							borderCollapse: "collapse",
							"& th, & td": {
								px: 1.5,
								py: 0.75,
								fontSize: "0.75rem",
								borderBottom: `1px solid ${theme.palette.divider}`,
								textAlign: "left",
							},
							"& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.primary.main, 0.04) },
						}}
					>
						<thead>
							<tr>
								<th>Perfil</th>
								<th>CPU</th>
								<th>RAM</th>
								<th>indexDoc conc.</th>
								<th>OCR conc.</th>
								<th>Caso de uso</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Economico</td>
								<td>4 vCPU</td>
								<td>4 GB</td>
								<td>5</td>
								<td>1</td>
								<td>Bajo volumen, poco OCR</td>
							</tr>
							<tr>
								<td>Balanceado</td>
								<td>8 vCPU</td>
								<td>8 GB</td>
								<td>10</td>
								<td>2</td>
								<td>Volumen medio, OCR moderado</td>
							</tr>
							<tr>
								<td>
									<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
										Agresivo
									</Typography>
								</td>
								<td>16 vCPU</td>
								<td>16 GB</td>
								<td>15</td>
								<td>4</td>
								<td>Alto volumen, mucho OCR</td>
							</tr>
						</tbody>
					</Box>
				</Box>

				<Stack spacing={0.5} sx={{ mt: 2 }}>
					<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.info.main}` }}>
						El factor que mas mueve la aguja es el ratio de docs con OCR. Sin OCR, 4 vCPU y 4 GB procesan 100 docs comodamente
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
						Con alto porcentaje de OCR (&gt;30%), priorizar mas cores sobre mas RAM — Tesseract es CPU-bound
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ pl: 1, borderLeft: `2px solid ${theme.palette.success.main}` }}>
						worker_02 (16 threads, 32 GB) se ubica en el perfil "Agresivo" con margen de sobra (~6 cores y ~24 GB libres)
					</Typography>
				</Stack>
			</SectionBox>
		</Stack>
	);
};

// ── Sub-tab: Chat Editor AI ───────────────────────────────────────────────────

const HelpEditorAiSection: React.FC = () => {
	const theme = useTheme();

	const colors = {
		frontend: theme.palette.info.main,
		api: theme.palette.primary.main,
		corpus: theme.palette.success.main,
		openai: theme.palette.warning.main,
		pinecone: theme.palette.secondary.main,
	};

	return (
		<Stack spacing={4} sx={{ p: 3 }}>

			{/* Intro */}
			<Stack>
				<Typography variant="h5">Asistente IA del Editor de Documentos</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
					Sistema de escritura jurídica asistida por IA, con calibración semántica por fuero.
				</Typography>
			</Stack>

			{/* Flujo completo */}
			<SectionBox theme={theme}>
				<SectionTitle>Flujo de una request "Formalizar" con fuero activo</SectionTitle>

				<Stack direction={{ xs: "column", md: "row" }} alignItems="center" spacing={1} flexWrap="wrap">
					<FlowNode
						title="SelectionBubble / AiChatPanel"
						badge="FRONTEND"
						subtitle="document-editor/index.tsx"
						color={colors.frontend}
						items={[
							"Usuario selecciona texto → clic Formalizar",
							"caseContext: { folderFuero, representedParty... }",
							"POST /rag/editor/chat",
							"systemPromptOverride + caseContext + messages",
						]}
					/>
					<FlowArrow label="HTTP" />
					<FlowNode
						title="editor.routes.js"
						badge="API"
						subtitle="POST /rag/editor/chat"
						color={colors.api}
						items={[
							"1. Cargar pipeline-config (cache 30s)",
							"2. Construir contextBlock (documento + PDF)",
							"3. Construir caseContextBlock (fuero + vocabulario)",
							"4. Obtener styleExamplesBlock (corpus semántico)",
							"5. Armar systemMessage final",
						]}
					/>
					<FlowArrow label="embed" />
					<FlowNode
						title="pjn-style-corpus"
						badge="PINECONE"
						subtitle="Índice de corpus de estilo"
						color={colors.pinecone}
						items={[
							"query(embedding, filter: { fuero: 'CIV' })",
							"topK: 3 escritos más similares",
							"metadata: { title, textPreview }",
							"Fallback → MongoDB $sample si falla",
						]}
					/>
					<FlowArrow label="stream" />
					<FlowNode
						title="OpenAI API"
						badge="LLM"
						subtitle="gpt-4o (configurable)"
						color={colors.openai}
						items={[
							"System: prompt + contexto + vocabulario + ejemplos",
							"User: texto a formalizar",
							"Respuesta SSE → chunks en tiempo real",
						]}
					/>
				</Stack>

				<Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.04), border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
					<Typography variant="caption" color="text.secondary">
						<strong>Condición para inyección de corpus:</strong> la request debe incluir <code>systemPromptOverride</code> (la acción tiene un system prompt propio) Y <code>caseContext.folderFuero</code> (el expediente tiene fuero asignado).
						Si alguna condición no se cumple, el sistema responde normalmente sin los ejemplos de estilo.
					</Typography>
				</Box>
			</SectionBox>

			{/* System message anatomy */}
			<SectionBox theme={theme}>
				<SectionTitle>Anatomía del System Message</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					El mensaje de sistema que recibe OpenAI se construye concatenando cuatro bloques en orden:
				</Typography>

				<Stack spacing={1.5}>
					{[
						{
							n: "1",
							label: "systemPrompt",
							origin: "EditorAction.systemPromptOverride → pipeline-config.editor.systemPrompt (fallback)",
							desc: "El prompt base que define el rol del asistente. Si la acción tiene uno propio, tiene prioridad sobre el global.",
							color: colors.api,
						},
						{
							n: "2",
							label: "contextBlock",
							origin: "documentText + pdfUrl/movementText del body",
							desc: "Texto del documento actual numerado por párrafos y/o el contenido del movimiento/PDF adjunto.",
							color: colors.frontend,
						},
						{
							n: "3",
							label: "caseContextBlock",
							origin: "caseContext del body",
							desc: "Fuero, vocabulario específico, parte representada, tipo de representación, nombres, expediente.",
							color: colors.pinecone,
						},
						{
							n: "4",
							label: "styleExamplesBlock",
							origin: "Pinecone pjn-style-corpus → MongoDB fallback",
							desc: "3 escritos judiciales reales del mismo fuero, seleccionados semánticamente por similitud al texto del usuario.",
							color: colors.corpus,
						},
					].map((b) => (
						<Box key={b.n} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
							<Box sx={{ minWidth: 28, height: 28, borderRadius: "50%", bgcolor: b.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, mt: 0.2 }}>
								<Typography variant="caption" fontWeight={700}>{b.n}</Typography>
							</Box>
							<Box sx={{ flex: 1 }}>
								<Typography variant="subtitle2" fontWeight={700} sx={{ color: b.color }}>{b.label}</Typography>
								<Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>{b.origin}</Typography>
								<Typography variant="caption" color="text.secondary">{b.desc}</Typography>
							</Box>
						</Box>
					))}
				</Stack>
			</SectionBox>

			{/* caseContext */}
			<SectionBox theme={theme}>
				<SectionTitle>caseContext — campos y efectos</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Metadatos del expediente que el frontend envía en cada request. Se construye en <code>document-editor/index.tsx</code> a partir del expediente seleccionado.
				</Typography>
				<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
					<Box component="thead">
						<Box component="tr" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
							{["Campo", "Tipo", "Efecto en la API"].map((h) => (
								<Box component="th" key={h} sx={{ p: 1, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}`, fontWeight: 600, fontSize: "0.75rem" }}>
									{h}
								</Box>
							))}
						</Box>
					</Box>
					<Box component="tbody">
						{[
							["representedParty", '"actor" | "demandado"', "Determina si usar actor/actora o demandado/demandada"],
							["representationType", '"patrocinio" | "apoderado"', "patrocinio → primera persona; apoderado → tercera persona"],
							["folderFuero", "string", "Activa vocabulario específico + corpus de estilo semántico"],
							["folderJuris", "string", "Añade 'Jurisdicción: CABA/PBA...' al contexto"],
							["folderName", "string", "Añade 'Expediente: Carátula...' al contexto"],
							["actorName", "string", "Nombre real del actor en el contexto"],
							["demandadoName", "string", "Nombre real del demandado en el contexto"],
						].map(([campo, tipo, efecto]) => (
							<Box component="tr" key={campo} sx={{ "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.75rem", color: theme.palette.primary.main }}>{campo}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.7rem", color: theme.palette.text.secondary }}>{tipo}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontSize: "0.78rem" }}>{efecto}</Box>
							</Box>
						))}
					</Box>
				</Box>
			</SectionBox>

			{/* EditorActions */}
			<SectionBox theme={theme}>
				<SectionTitle>EditorActions — acciones configurables</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Las acciones que aparecen en el bubble y el panel son documentos MongoDB en la colección <code>editor-actions</code>. Se pueden gestionar desde el tab <strong>Chat Editor</strong> sin tocar código.
				</Typography>
				<Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
					{[
						{ title: "label", desc: "Texto del botón (ej: 'Formalizar')" },
						{ title: "prompt", desc: "Prompt enviado al LLM. Puede usar {{selectedText}} como placeholder." },
						{ title: "systemPromptOverride", desc: "System prompt propio. Si presente, activa la inyección del corpus de estilo." },
						{ title: "scope", desc: "'bubble' = solo en selección flotante, 'panel' = solo en chat lateral, 'both' = ambos" },
						{ title: "visibility", desc: "'global' = todos los usuarios, 'user' = usuario específico, 'plan' = por plan" },
						{ title: "context.includeDocument", desc: "Si la acción siempre envía el documento completo como contexto" },
					].map((f) => (
						<Box key={f.title} sx={{ flex: "1 1 280px", p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
							<Typography variant="caption" sx={{ fontFamily: "monospace", color: theme.palette.primary.main, display: "block", fontWeight: 700 }}>{f.title}</Typography>
							<Typography variant="caption" color="text.secondary">{f.desc}</Typography>
						</Box>
					))}
				</Stack>

				<Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.05), border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}` }}>
					<Typography variant="caption" color="text.secondary">
						<strong>Importante:</strong> el caché de acciones en el servidor dura <strong>5 minutos</strong> por usuario. Los cambios desde admin pueden tardar hasta 5 min en reflejarse. Podés invalidarlo reiniciando el proceso o esperando.
					</Typography>
				</Box>
			</SectionBox>

			{/* Config en caliente */}
			<SectionBox theme={theme}>
				<SectionTitle>Configuración en caliente — pipeline-config.editor</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Estos parámetros se leen de la BD con caché de 30s. Se modifican desde el tab <strong>Pipeline</strong>, sin reiniciar el proceso.
				</Typography>
				<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
					<Box component="thead">
						<Box component="tr" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
							{["Parámetro", "Default", "Descripción"].map((h) => (
								<Box component="th" key={h} sx={{ p: 1, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}`, fontWeight: 600, fontSize: "0.75rem" }}>{h}</Box>
							))}
						</Box>
					</Box>
					<Box component="tbody">
						{[
							["model", "gpt-4o", "Modelo OpenAI para el asistente"],
							["maxTokens", "1024", "Tokens máximos de respuesta"],
							["temperature", "0.4", "Temperatura del LLM (0.0–1.0)"],
							["documentMaxChars", "4000", "Máx. caracteres del documento a incluir como contexto"],
							["pdfMaxChars", "4000", "Máx. caracteres del PDF/movimiento adjunto"],
							["systemPrompt", "(ver admin)", "Prompt global cuando la acción no tiene override propio"],
							["rateLimit.max", "20", "Requests máximas por ventana por usuario"],
							["rateLimit.duration", "60000", "Ventana de rate limit en ms"],
						].map(([param, def, desc]) => (
							<Box component="tr" key={param} sx={{ "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.75rem", color: theme.palette.primary.main }}>{param}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.75rem", color: theme.palette.text.secondary }}>{def}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontSize: "0.78rem" }}>{desc}</Box>
							</Box>
						))}
					</Box>
				</Box>
			</SectionBox>

			{/* Troubleshooting */}
			<SectionBox theme={theme}>
				<SectionTitle>Troubleshooting frecuente</SectionTitle>
				<Stack spacing={2}>
					{[
						{
							prob: "El corpus de estilo no se inyecta",
							cause: "La acción no tiene systemPromptOverride, o el expediente no tiene folderFuero asignado.",
							fix: "Verificar en tab Chat Editor que la acción tiene 'System Prompt Override'. Verificar que el expediente tiene fuero completo en la BD.",
						},
						{
							prob: "Las acciones no aparecen en el editor",
							cause: "Colección editor-actions vacía, acciones con active=false, o caché no expirado.",
							fix: "Tab Chat Editor → botón 'Seed Acciones'. Verificar que las acciones tienen active=true. Esperar 5 min o reiniciar el proceso.",
						},
						{
							prob: "Respuesta lenta en Formalizar",
							cause: "Embedding semántico del corpus agrega ~200–500ms. Alta latencia de OpenAI.",
							fix: "Normal durante picos de OpenAI. Si es sistemático, verificar logs del servidor por errores en embedSingle.",
						},
						{
							prob: "Error 429 (rate limit)",
							cause: "El usuario superó el límite configurado.",
							fix: "Ajustar rateLimit.max en tab Pipeline → sección Editor AI.",
						},
						{
							prob: "Respuesta en inglés o sin vocabulario jurídico",
							cause: "El systemPromptOverride de la acción es incorrecto o está vacío.",
							fix: "Editar la acción 'Formalizar' desde Chat Editor y verificar que el system prompt está en español y menciona derecho argentino.",
						},
					].map((item, i) => (
						<Box key={i} sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
							<Typography variant="subtitle2" fontWeight={600} color="error.main" gutterBottom>⚠ {item.prob}</Typography>
							<Typography variant="caption" color="text.secondary" display="block"><strong>Causa:</strong> {item.cause}</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}><strong>Solución:</strong> {item.fix}</Typography>
						</Box>
					))}
				</Stack>
			</SectionBox>

		</Stack>
	);
};

// ── Sub-tab: Corpus de Estilo ─────────────────────────────────────────────────

const HelpStyleCorpusSection: React.FC = () => {
	const theme = useTheme();

	const colors = {
		pipeline: theme.palette.info.main,
		mongo: theme.palette.success.main,
		pinecone: theme.palette.secondary.main,
		worker: theme.palette.primary.main,
		quality: theme.palette.warning.main,
	};

	return (
		<Stack spacing={4} sx={{ p: 3 }}>

			<Stack>
				<Typography variant="h5">Corpus de Estilo Jurídico</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
					Base de conocimiento de escritos judiciales reales usada para calibrar el tono y vocabulario del asistente de documentos.
				</Typography>
			</Stack>

			{/* Concepto */}
			<SectionBox theme={theme}>
				<SectionTitle>¿Qué es y para qué sirve?</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					El corpus es una colección de los primeros ~800 caracteres de escritos judiciales reales (tipo "ESCRITO AGREGADO") ya procesados por el pipeline RAG.
					A diferencia del RAG de causas (que responde preguntas <em>sobre</em> documentos), este corpus no busca información — usa los escritos únicamente como <strong>calibrador de tono y vocabulario</strong> para la generación de nuevos textos.
				</Typography>
				<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(colors.mongo, 0.06), border: `1px solid ${alpha(colors.mongo, 0.2)}` }}>
						<Typography variant="subtitle2" fontWeight={700} color="success.main" gutterBottom>RAG de causas</Typography>
						<Typography variant="caption" color="text.secondary">
							Responde preguntas sobre el contenido de expedientes. Busca información específica en documentos ya indexados.
							Usa el índice Pinecone shardado por causa.
						</Typography>
					</Box>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(colors.pinecone, 0.06), border: `1px solid ${alpha(colors.pinecone, 0.2)}` }}>
						<Typography variant="subtitle2" fontWeight={700} sx={{ color: colors.pinecone }} gutterBottom>Corpus de estilo</Typography>
						<Typography variant="caption" color="text.secondary">
							Calibra el registro y vocabulario del asistente al fuero. No busca información — inyecta ejemplos de <em>cómo escribe un letrado real</em> de ese fuero.
							Usa el índice Pinecone global <code>pjn-style-corpus</code>.
						</Typography>
					</Box>
				</Stack>
			</SectionBox>

			{/* Pipeline */}
			<SectionBox theme={theme}>
				<SectionTitle>Pipeline de construcción del corpus</SectionTitle>

				<Stack direction={{ xs: "column", md: "row" }} alignItems="center" spacing={1} flexWrap="wrap">
					<FlowNode
						title="rag-documents"
						badge="MONGODB"
						subtitle="Documentos ya procesados"
						color={colors.pipeline}
						items={[
							"movimientoTipo = 'ESCRITO AGREGADO'",
							"status = 'embedded'",
							"textLength > 400",
							"textS3Key presente",
						]}
					/>
					<FlowArrow label="descarga S3" />
					<FlowNode
						title="build-style-corpus.js"
						badge="SCRIPT"
						subtitle="Construcción batch inicial"
						color={colors.mongo}
						items={[
							"Descarga .txt extraído de S3",
							"Limpia texto (normaliza saltos, spaces)",
							"Extrae primeros ~800 chars",
							"Clasifica calidad (BRIEF_SALUTATION)",
							"Upsert en legal-style-corpus",
						]}
					/>
					<FlowArrow label="clasifica" />
					<FlowNode
						title="legal-style-corpus"
						badge="MONGODB"
						subtitle="Colección de snippets"
						color={colors.quality}
						items={[
							"fuero, title, textPreview",
							"quality: 'high' | 'normal'",
							"vectorId: null → pendiente embed",
							"~71% high quality",
						]}
					/>
					<FlowArrow label="embebe" />
					<FlowNode
						title="pjn-style-corpus"
						badge="PINECONE"
						subtitle="Índice global de estilo"
						color={colors.pinecone}
						items={[
							"1024 dims, cosine, serverless",
							"metadata: { fuero, title, textPreview }",
							"6.703 vectores (al 23/03/2026)",
							"filter: { fuero: { $eq: 'CIV' } }",
						]}
					/>
				</Stack>

				<Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: alpha(colors.worker, 0.04), border: `1px solid ${alpha(colors.worker, 0.15)}` }}>
					<Typography variant="subtitle2" fontWeight={600} gutterBottom>Ingesta en tiempo real (automática)</Typography>
					<Typography variant="caption" color="text.secondary">
						<code>indexDocument.worker.js</code> llama a <code>ingestStyleCorpusDoc(ragDoc, text)</code> después de procesar cada documento.
						Si es un ESCRITO AGREGADO con calidad 'high', lo agrega a MongoDB y lo embebe a Pinecone de forma asíncrona (no bloquea el pipeline principal).
					</Typography>
				</Box>
			</SectionBox>

			{/* Calidad */}
			<SectionBox theme={theme}>
				<SectionTitle>Clasificación de calidad</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					Un documento se clasifica como <strong>high</strong> si contiene un saludo reconocible al juez en los primeros 400 caracteres:
				</Typography>
				<Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.grey[500], 0.08), fontFamily: "monospace", fontSize: "0.8rem", mb: 1.5 }}>
					/señor\s+juez|sr\.\s*juez|sr\/a\.\s*juez|excm[ao]\.|a\s+v\.s\.|a\s+s\.s\.|señora\s+jueza/i
				</Box>
				<Stack direction="row" spacing={2}>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(colors.mongo, 0.06), border: `1px solid ${alpha(colors.mongo, 0.2)}` }}>
						<Typography variant="subtitle2" fontWeight={700} color="success.main">high (~71.7%)</Typography>
						<Typography variant="caption" color="text.secondary">Escritos judiciales confirmados. Tienen el saludo al juez en los primeros 400 chars. Solo estos se embedan en Pinecone y se inyectan como ejemplos.</Typography>
					</Box>
					<Box sx={{ flex: 1, p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
						<Typography variant="subtitle2" fontWeight={700} color="text.secondary">normal (~28.3%)</Typography>
						<Typography variant="caption" color="text.secondary">Sin saludo al juez en los primeros 400 chars. Pueden ser tablas OCR, formularios, carátulas o escritos que comienzan directamente con el cuerpo.</Typography>
					</Box>
				</Stack>
			</SectionBox>

			{/* Estado del corpus */}
			<SectionBox theme={theme}>
				<SectionTitle>Estado del corpus (al 23/03/2026)</SectionTitle>
				<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
					<Box component="thead">
						<Box component="tr" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
							{["Fuero", "Código", "Total corpus", "High quality", "Embebidos en Pinecone"].map((h) => (
								<Box component="th" key={h} sx={{ p: 1, textAlign: "left", borderBottom: `1px solid ${theme.palette.divider}`, fontWeight: 600, fontSize: "0.75rem" }}>{h}</Box>
							))}
						</Box>
					</Box>
					<Box component="tbody">
						{[
							["Civil", "CIV", "4.826", "3.648", "3.648"],
							["Laboral", "CNT", "1.760", "1.168", "1.168"],
							["Seg. Social", "CSS", "1.220", "724", "724"],
							["Familia", "FSM", "958", "779", "779"],
							["Comercial", "COM", "582", "384", "384"],
							["Total", "—", "9.346", "6.703", "6.703"],
						].map(([fuero, cod, total, high, emb]) => (
							<Box component="tr" key={fuero} sx={{ "&:last-child td": { fontWeight: 700 }, "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontSize: "0.78rem" }}>{fuero}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.75rem", color: theme.palette.primary.main }}>{cod}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontSize: "0.78rem" }}>{total}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontSize: "0.78rem", color: "success.main" }}>{high}</Box>
								<Box component="td" sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, fontSize: "0.78rem" }}>{emb}</Box>
							</Box>
						))}
					</Box>
				</Box>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
					Ver estadísticas actualizadas en tiempo real en el tab <strong>Corpus de Estilo</strong>.
				</Typography>
			</SectionBox>

			{/* Scripts de mantenimiento */}
			<SectionBox theme={theme}>
				<SectionTitle>Scripts de mantenimiento</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
					Todos los scripts son <strong>idempotentes</strong> — saltean entradas ya procesadas.
					Correr desde <code>/home/mcerra/www/pjn-rag-api/</code>.
				</Typography>
				<Stack spacing={2}>
					{[
						{
							script: "node scripts/build-style-corpus.js",
							flags: "--fuero CIV  --limit 500  --stats  --concurrency 10",
							desc: "Extrae snippets de S3 para documentos ESCRITO AGREGADO aún no procesados. Usa después de un procesamiento masivo de nuevas causas.",
						},
						{
							script: "node scripts/classify-style-corpus.js",
							flags: "--all  --stats",
							desc: "Re-clasifica la calidad de entradas existentes. Usar si se ajusta el heurístico BRIEF_SALUTATION. Sin --all solo clasifica las entradas sin calidad.",
						},
						{
							script: "node scripts/embed-style-corpus.js",
							flags: "--fuero CIV  --limit 200  --stats  --create-index",
							desc: "Embebe entradas high-quality pendientes en Pinecone. --create-index recrea el índice (destructivo). Usar --stats para revisar estado antes de correr.",
						},
						{
							script: "node scripts/test-formalizar.js --test-style",
							flags: "--variant N  --update N  --show-current",
							desc: "Valida end-to-end el corpus de estilo. Compara respuestas con/sin folderFuero para Civil y Laboral. Útil para confirmar que el corpus está activo.",
						},
					].map((s, i) => (
						<Box key={i} sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
							<Typography variant="caption" sx={{ fontFamily: "monospace", color: theme.palette.primary.main, display: "block", fontWeight: 700, mb: 0.5 }}>{s.script}</Typography>
							<Typography variant="caption" sx={{ fontFamily: "monospace", color: theme.palette.text.secondary, display: "block", fontSize: "0.7rem", mb: 0.5 }}>flags: {s.flags}</Typography>
							<Typography variant="caption" color="text.secondary">{s.desc}</Typography>
						</Box>
					))}
				</Stack>
			</SectionBox>

			{/* Troubleshooting */}
			<SectionBox theme={theme}>
				<SectionTitle>Troubleshooting frecuente</SectionTitle>
				<Stack spacing={2}>
					{[
						{
							prob: "build-style-corpus procesa 0 documentos",
							cause: "Credenciales AWS S3 ausentes o incorrectas en el .env de pjn-rag-api.",
							fix: "Verificar AWS_S3_ACCESS_KEY_ID, AWS_S3_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME en /home/mcerra/www/pjn-rag-api/.env.",
						},
						{
							prob: "embed-style-corpus falla con 'PINECONE_API_KEY not configured'",
							cause: "Variable de entorno ausente.",
							fix: "Agregar PINECONE_API_KEY al .env de pjn-rag-api. El sistema cae en fallback $sample automáticamente hasta que se configure.",
						},
						{
							prob: "Los ejemplos de estilo son irrelevantes al contenido",
							cause: "Pinecone no disponible → el sistema usó $sample aleatorio.",
							fix: "Verificar logs del servidor por '[EditorAI] Semantic style search failed'. Confirmar que PINECONE_STYLE_INDEX=pjn-style-corpus está en .env.",
						},
						{
							prob: "Un fuero no tiene corpus (CAF, CPF)",
							cause: "Esos fueros tienen pocos escritos procesados o ninguno.",
							fix: "Ejecutar build-style-corpus.js --fuero CAF cuando haya escritos de ese fuero indexados. La inyección de corpus se omite silenciosamente para fueros sin vectores.",
						},
						{
							prob: "Documento nuevo no aparece en el corpus",
							cause: "El worker estaba offline o el documento no es ESCRITO AGREGADO.",
							fix: "Ejecutar node scripts/build-style-corpus.js para capturar documentos perdidos. Verificar que movimientoTipo = 'ESCRITO AGREGADO' en el RagDocument.",
						},
					].map((item, i) => (
						<Box key={i} sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
							<Typography variant="subtitle2" fontWeight={600} color="error.main" gutterBottom>⚠ {item.prob}</Typography>
							<Typography variant="caption" color="text.secondary" display="block"><strong>Causa:</strong> {item.cause}</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}><strong>Solución:</strong> {item.fix}</Typography>
						</Box>
					))}
				</Stack>
			</SectionBox>

		</Stack>
	);
};

// ── Sub-tab: Resumen de infraestructura ──────────────────────────────────────

const HelpSummarySection: React.FC = () => {
	const theme = useTheme();
	const pinecone = "#1A73E8";
	const mongo = theme.palette.success.main;
	const redis = "#D82C20";
	const s3 = "#FF9900";
	const openai = "#10A37F";

	const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
		<Box sx={{ display: "flex", gap: 2, py: 0.6, borderBottom: "1px solid", borderColor: "divider" }}>
			<Typography variant="caption" color="text.secondary" sx={{ minWidth: 180, fontWeight: 600 }}>{label}</Typography>
			<Typography variant="caption">{value}</Typography>
		</Box>
	);

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="body2" color="text.secondary">
					El <strong>Workers RAG</strong> indexa los expedientes judiciales de los usuarios: descarga sus PDFs, extrae texto,
					genera embeddings y los almacena en Pinecone para búsqueda semántica en el chat. Corre en <strong>worker_02</strong> y
					opera sobre dos bases de datos: el MongoDB local con las causas scrapeadas (fuente) y MongoDB Atlas (destino de embeddings y metadatos).
				</Typography>
			</Box>

			<Box>
				<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Ficha de infraestructura</Typography>
				<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					<InfoRow label="Servidor" value={<><strong>worker_02</strong> · IP 100.98.180.101 · Ryzen 5700X · 16 cores · 32 GB RAM</>} />
					<InfoRow label="Proceso PM2" value="pjn-rag-api (Express + BullMQ + Socket.io)" />
					<InfoRow label="BD origen" value={<>MongoDB <strong>local</strong> en worker_02 · colecciones de causas PJN (fuente)</>} />
					<InfoRow label="BD destino" value={<>MongoDB <strong>Atlas</strong> (cloud) · RagDocument, CausaSummary, PipelineConfig</>} />
					<InfoRow label="AWS S3" value="Almacena PDFs originales y texto extraído de chunks · región us-east-1" />
					<InfoRow label="Redis" value="BullMQ en worker_02 · colas: indexCausa · indexDocument · ocrDocument · recoveryCausa" />
					<InfoRow label="OpenAI" value="text-embedding-3-small (1024 dims) · GPT-4o (chat + generación)" />
					<InfoRow label="Activación del scan" value="Auto-Index: intervalo configurable desde Panel → Control · También manual por usuario" />
				</Box>
			</Box>

			<Box>
				<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Índices Pinecone utilizados</Typography>
				<Stack spacing={1.5}>
					<Box sx={{ border: `2px solid ${pinecone}`, borderRadius: 2, p: 2, bgcolor: alpha(pinecone, 0.04) }}>
						<Stack direction="row" spacing={1.5} alignItems="flex-start">
							<Box sx={{ px: 1, py: 0.3, bgcolor: pinecone, color: "#fff", borderRadius: 1, fontSize: "0.68rem", fontWeight: 700, flexShrink: 0, mt: 0.2 }}>CAUSAS / USUARIOS</Box>
							<Box sx={{ flex: 1 }}>
								<Typography variant="subtitle2" fontWeight={700} sx={{ color: pinecone, fontFamily: "monospace" }}>pjn-rag-shard-0 · pjn-rag-shard-1 · pjn-rag-shard-2 · pjn-rag-shard-3</Typography>
								<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
									4 índices con sharding por userId/causaId (hash % 4). Almacenan los chunks de cada expediente para búsqueda en el chat RAG del usuario.
									Cada usuario tiene su propio namespace dentro del shard.
								</Typography>
								<Stack direction="row" spacing={2} sx={{ mt: 0.8 }} flexWrap="wrap">
									{["1024 dims", "coseno", "serverless"].map((t) => (
										<Box key={t} sx={{ px: 0.8, py: 0.1, bgcolor: alpha(pinecone, 0.1), borderRadius: 0.5, fontSize: "0.65rem", color: pinecone, fontWeight: 600 }}>{t}</Box>
									))}
									<Typography variant="caption" color="text.secondary">Escribe: indexDocument.worker · Lee: chat.routes (query semántica)</Typography>
								</Stack>
							</Box>
						</Stack>
					</Box>

					<Box sx={{ border: `2px solid ${openai}`, borderRadius: 2, p: 2, bgcolor: alpha(openai, 0.04) }}>
						<Stack direction="row" spacing={1.5} alignItems="flex-start">
							<Box sx={{ px: 1, py: 0.3, bgcolor: openai, color: "#fff", borderRadius: 1, fontSize: "0.68rem", fontWeight: 700, flexShrink: 0, mt: 0.2 }}>CORPUS ESTILO</Box>
							<Box sx={{ flex: 1 }}>
								<Typography variant="subtitle2" fontWeight={700} sx={{ color: openai, fontFamily: "monospace" }}>pjn-style-corpus</Typography>
								<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.3 }}>
									Índice único (no shardado) con ejemplos de escritos jurídicos de calidad alta. Usado por el Editor IA para few-shot retrieval al generar documentos.
									Gestionado desde <strong>Workers Corpus (IA)</strong>.
								</Typography>
								<Stack direction="row" spacing={2} sx={{ mt: 0.8 }} flexWrap="wrap">
									{["1024 dims", "coseno", "serverless"].map((t) => (
										<Box key={t} sx={{ px: 0.8, py: 0.1, bgcolor: alpha(openai, 0.1), borderRadius: 0.5, fontSize: "0.65rem", color: openai, fontWeight: 600 }}>{t}</Box>
									))}
									<Typography variant="caption" color="text.secondary">Escribe: embed-style-corpus.js (manual) · Lee: editor.routes (few-shot)</Typography>
								</Stack>
							</Box>
						</Stack>
					</Box>
				</Stack>
			</Box>

			<Box>
				<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Diagrama de recursos</Typography>
				<Box sx={{ overflowX: "auto", pb: 1 }}>
					<Stack spacing={1.5}>
						{/* Row 1: source → scan → queues */}
						<Stack direction="row" alignItems="stretch" spacing={1} sx={{ minWidth: 760 }}>
							<FlowNode badge="ORIGEN" title="MongoDB Local" subtitle="worker_02" items={["Causas PJN scrapeadas", "movimientos con PDF URL", "status sin indexar"]} color={mongo} />
							<FlowArrow label="Auto-Index scan" />
							<FlowNode badge="COLA" title="Redis BullMQ" subtitle="worker_02" items={["indexCausa", "indexDocument", "ocrDocument", "recoveryCausa"]} color={redis} />
							<FlowArrow label="workers paralelos" />
							<FlowNode badge="PROCESSING" title="indexDocument.worker" subtitle="worker_02 (concurrency: 2-15)" items={["Descarga PDF", "Extrae texto", "Chunking + embeddings", "Upsert Pinecone shards"]} color={theme.palette.primary.main} />
						</Stack>

						{/* Row 2: destinations */}
						<Stack direction="row" spacing={1} sx={{ minWidth: 760 }}>
							<Box sx={{ flex: 1 }} />
							<FlowArrow label="persiste" />
							<FlowNode badge="VECTOR DB" title="pjn-rag-shard-0..3" subtitle="Pinecone · 4 shards" items={["chunks por usuario/causa", "1024 dims · coseno", "metadata: tipo, fecha, text"]} color={pinecone} />
							<FlowArrow label="y también" />
							<FlowNode badge="CLOUD" title="MongoDB Atlas + S3" subtitle="RagDocument · chunks" items={["Texto completo (S3)", "Metadata de chunks (Atlas)", "CausaSummary (Atlas)"]} color={s3} />
						</Stack>
					</Stack>
				</Box>
			</Box>
		</Stack>
	);
};

// ── Main component with internal tabs ────────────────────────────────────────

const HELP_TABS = [
	{ label: "Resumen", value: "summary" },
	{ label: "Pipeline RAG", value: "pipeline" },
	{ label: "Controles y costos", value: "control" },
	{ label: "Rendimiento", value: "performance" },
	{ label: "Infraestructura", value: "infrastructure" },
	{ label: "Chat Editor IA", value: "editor-ai" },
	{ label: "Corpus de Estilo", value: "style-corpus" },
] as const;

const WorkerHelpTab = () => {
	const theme = useTheme();
	const [subTab, setSubTab] = useState("summary");

	return (
		<Stack spacing={0}>
			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
				<Tabs
					value={subTab}
					onChange={(_, v) => setSubTab(v)}
					variant="scrollable"
					scrollButtons="auto"
					sx={{
						minHeight: 40,
						"& .MuiTab-root": {
							minHeight: 40,
							textTransform: "none",
							fontSize: "0.8rem",
							fontWeight: 500,
							py: 0,
						},
					}}
				>
					{HELP_TABS.map((t) => (
						<Tab key={t.value} label={t.label} value={t.value} />
					))}
				</Tabs>
			</Box>

			{subTab === "summary" && <HelpSummarySection />}
		{subTab === "pipeline" && <HelpPipelineSection />}
			{subTab === "control" && <HelpControlSection />}
			{subTab === "performance" && <HelpPerformanceSection />}
			{subTab === "infrastructure" && <HelpInfrastructureSection />}
			{subTab === "editor-ai" && <HelpEditorAiSection />}
			{subTab === "style-corpus" && <HelpStyleCorpusSection />}
		</Stack>
	);
};

export default WorkerHelpTab;
