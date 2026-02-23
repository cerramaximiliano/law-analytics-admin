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

const CostCard: React.FC<{ title: string; model: string; worker: string; description: string; theme: any }> = ({ title, model, worker, description, theme }) => (
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
	<Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
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
							items={[
								"Docs que necesitan OCR se re-encolan aqui",
								"Solo si requiresOcr=true y ocrCompleted=false",
							]}
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
						El documento queda en status 'error' definitivo y ya no se reintenta automaticamente. Se puede ver en el tab Indexacion filtrando por "Con error".
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
						<ControlCard title="docErrorCooldownMs" description="Tiempo minimo de espera antes de reintentar un documento con error. Default: 15 minutos (900.000 ms). Evita reintentos inmediatos que podrian fallar por el mismo motivo." theme={theme} />
						<ControlCard title="docMaxRetries" description="Cantidad maxima de reintentos automaticos por documento. Default: 5. Despues de este limite el documento queda en error permanente." theme={theme} />
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard title="stalledThresholdMs" description="Tiempo maximo que un documento puede estar en un estado intermedio (downloading, extracting, chunking, embedding) antes de considerarse trabado. Default: 10 minutos (600.000 ms)." theme={theme} />
						<ControlCard title="maxQueueLoad" description="Si las colas indexDocument + ocrDocument tienen mas de este total de jobs (activos + esperando), Recovery no encola mas hasta que se liberen. Default: 100." theme={theme} />
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard title="batchSize" description="Maximo de documentos que Recovery puede re-encolar por ciclo de escaneo. Prioriza errores primero, luego stalled con el remanente. Default: 30." theme={theme} />
						<ControlCard title="cleanFailedAfterMs" description="Tiempo despues del cual se limpian los jobs fallidos de las colas BullMQ. Default: 1 hora (3.600.000 ms). Mantiene las colas limpias sin perder informacion reciente." theme={theme} />
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
						<ControlCard title="Concurrency" description="Cantidad de jobs que un worker procesa en paralelo. Ajustable en caliente desde el tab Control (1-20)." theme={theme} />
						<ControlCard title="Rate Limiter" description="Limita cuantos jobs se procesan por intervalo de tiempo (ej: 20 jobs cada 60s). Cambios requieren reinicio del servicio." theme={theme} />
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard title="Batch Size (Auto-Index)" description="Maximo de causas que Auto-Index encola por ciclo de escaneo. Editable desde el icono de configuracion en la caja de Auto-Index." theme={theme} />
						<ControlCard title="Max Concurrent Jobs" description="Tope total de jobs activos + esperando en la cola de Index Causa. Si se alcanza, Auto-Index no encola mas hasta que se liberen slots." theme={theme} />
					</Stack>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<ControlCard title="Pause / Resume" description="Pausa o reanuda un worker sin deshabilitarlo. El worker deja de tomar jobs nuevos pero termina los que esta procesando." theme={theme} />
						<ControlCard title="Enable / Disable" description="Habilita o deshabilita un worker completamente. Un worker deshabilitado no procesa jobs aunque haya en la cola." theme={theme} />
					</Stack>
				</Stack>
			</SectionBox>

			<SectionBox theme={theme}>
				<SectionTitle>Tracking de costos</SectionTitle>
				<Stack spacing={1}>
					<Typography variant="body2" color="text.secondary">
						El sistema trackea automaticamente el consumo de tokens de OpenAI y calcula costos en USD usando la tabla de precios configurable:
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
						<CostCard title="Embeddings" model="text-embedding-3-small" worker="Index Document" description="Tokens usados para vectorizar chunks de texto" theme={theme} />
						<CostCard title="LLM (Prompt)" model="gpt-4o-mini" worker="Generate Summary" description="Tokens de entrada enviados al modelo para generar resumenes" theme={theme} />
						<CostCard title="LLM (Completion)" model="gpt-4o-mini" worker="Generate Summary" description="Tokens de salida generados por el modelo en los resumenes" theme={theme} />
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
					Todas las causas activas depositan sus documentos en la misma cola de Index Document. Esto significa que el tiempo de procesamiento por causa no depende solo de sus propios documentos, sino de cuantas otras causas estan compitiendo por los mismos workers.
				</Typography>

				<Box sx={{ p: 2, borderRadius: 1.5, bgcolor: alpha(theme.palette.background.default, 0.8), border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.75rem" }}>
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
						<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `2px solid ${theme.palette.success.main}`, bgcolor: alpha(theme.palette.success.main, 0.04) }}>
							<Typography variant="subtitle2" fontWeight={700} color="success.main" gutterBottom>
								indexDocument.concurrency
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Cantidad de documentos que se procesan en paralelo entre todas las causas.
							</Typography>
							<Stack spacing={0.5}>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}>
									Subir = mas docs en paralelo = cada causa termina mas rapido
								</Typography>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.error.main, 0.3)}`, color: "text.secondary" }}>
									Limite: rate limits de OpenAI (embeddings), rate limits de Pinecone, RAM del servidor
								</Typography>
							</Stack>
						</Box>

						<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `2px solid ${theme.palette.primary.main}`, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
								indexCausa.concurrency
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Cantidad de causas que se procesan simultaneamente.
							</Typography>
							<Stack spacing={0.5}>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`, color: "text.secondary" }}>
									Subir = mas causas activas = mas docs compitiendo = mas lento por causa
								</Typography>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}>
									Bajar = menos contention = cada causa individual mas rapida
								</Typography>
							</Stack>
						</Box>
					</Stack>

					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `2px solid ${theme.palette.info.main}`, bgcolor: alpha(theme.palette.info.main, 0.04) }}>
							<Typography variant="subtitle2" fontWeight={700} color="info.main" gutterBottom>
								autoIndex.batchSize
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Cuantas causas encola Auto-Index por ciclo de escaneo.
							</Typography>
							<Stack spacing={0.5}>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`, color: "text.secondary" }}>
									Subir = mas causas encoladas por ciclo = cola mas cargada
								</Typography>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}>
									Bajar = menos presion en la cola = procesamiento mas predecible
								</Typography>
							</Stack>
						</Box>

						<Box sx={{ flex: 1, p: 2, borderRadius: 1.5, border: `2px solid ${theme.palette.warning.main}`, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
							<Typography variant="subtitle2" fontWeight={700} color="warning.main" gutterBottom>
								Rate Limiter (indexDocument)
							</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
								Maximo de jobs por intervalo de tiempo (ej: 20 cada 60s).
							</Typography>
							<Stack spacing={0.5}>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.3)}`, color: "text.secondary" }}>
									Protege servicios externos de sobrecarga (OpenAI, Pinecone)
								</Typography>
								<Typography variant="caption" sx={{ pl: 1, borderLeft: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`, color: "text.secondary" }}>
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
					El pipeline depende de servicios externos con limites propios. Estos limites determinan hasta donde se puede escalar la concurrencia antes de recibir errores 429 (Too Many Requests).
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
						<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& th, & td": { px: 1.5, py: 0.75, fontSize: "0.75rem", borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "left" }, "& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
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
								<tr><td>Tier 1</td><td>$5 pagados</td><td>~500</td><td>~1,000,000</td><td>~2,000</td></tr>
								<tr><td>Tier 2</td><td>$50 + 7 dias</td><td>~500</td><td>~1,000,000</td><td>~2,000</td></tr>
								<tr><td>Tier 3</td><td>Mayor spend</td><td>~1,000</td><td>~5,000,000</td><td>~10,000</td></tr>
								<tr><td>Tier 4</td><td>Mayor spend</td><td>~5,000</td><td>~5,000,000</td><td>~10,000</td></tr>
								<tr><td>Tier 5</td><td>Mayor spend</td><td>~10,000</td><td>~10,000,000</td><td>~20,000</td></tr>
							</tbody>
						</Box>
					</Box>

					<Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
						* Chunks/min estimado asumiendo ~500 tokens por chunk. Valores aproximados basados en datos historicos de la documentacion de OpenAI.
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
						<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& th, & td": { px: 1.5, py: 0.75, fontSize: "0.75rem", borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "left" }, "& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.warning.main, 0.04) } }}>
							<thead>
								<tr>
									<th>Limite</th>
									<th>Valor</th>
									<th>Alcance</th>
								</tr>
							</thead>
							<tbody>
								<tr><td>Upsert requests</td><td>100 req/s</td><td>Por namespace</td></tr>
								<tr><td>Upsert data</td><td>50 MB/s</td><td>Por namespace</td></tr>
								<tr><td>Max batch</td><td>1,000 vectores o 2 MB</td><td>Por request</td></tr>
								<tr><td>Query requests</td><td>100 req/s</td><td>Por namespace</td></tr>
								<tr><td>Metadata por vector</td><td>40 KB max</td><td>Por record</td></tr>
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
						<Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& th, & td": { px: 1.5, py: 0.75, fontSize: "0.75rem", borderBottom: `1px solid ${theme.palette.divider}`, textAlign: "left" }, "& th": { fontWeight: 700, color: "text.secondary", bgcolor: alpha(theme.palette.warning.main, 0.04) } }}>
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
								<tr><td>Starter</td><td>Gratis</td><td>2M</td><td>5</td><td>100</td><td>2 GB</td></tr>
								<tr><td>Standard</td><td>$50/mes</td><td>Ilimitado</td><td>100</td><td>10,000</td><td>Ilimitado</td></tr>
								<tr><td>Enterprise</td><td>$500/mes</td><td>Ilimitado</td><td>200</td><td>100,000</td><td>Ilimitado</td></tr>
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
					Con la configuracion actual (indexDocument.concurrency=2), el sistema esta lejos de los limites de OpenAI y Pinecone.
					El factor limitante es la baja concurrencia combinada con la cola compartida entre multiples causas.
				</Typography>

				<Stack spacing={1.5}>
					<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.success.main, 0.03) }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main, minWidth: 80 }}>Holgado</Typography>
							<Typography variant="caption" color="text.secondary">
								OpenAI embeddings — Tier 1 permite ~2,000 chunks/min, con concurrency=10 se usarian ~50-100 chunks/min
							</Typography>
						</Stack>
					</Box>
					<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.success.main, 0.03) }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.success.main, minWidth: 80 }}>Holgado</Typography>
							<Typography variant="caption" color="text.secondary">
								Pinecone upserts — 100 req/s por namespace, con concurrency=10 se usarian ~10 req/s max
							</Typography>
						</Stack>
					</Box>
					<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.warning.main, 0.03) }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.main, minWidth: 80 }}>Moderado</Typography>
							<Typography variant="caption" color="text.secondary">
								RAM del servidor — cada worker carga PDFs en memoria (~10-50 MB por doc grande). Monitorear con concurrency alta
							</Typography>
						</Stack>
					</Box>
					<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.warning.main, 0.03) }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.warning.main, minWidth: 80 }}>Moderado</Typography>
							<Typography variant="caption" color="text.secondary">
								OCR local (Tesseract) — concurrency=1, rate limit 3 jobs/min, CPU-intensivo (~1.2 GB RAM). Los docs con OCR hacen doble pasada por indexDocument
							</Typography>
						</Stack>
					</Box>
					<Box sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.error.main, 0.03) }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.error.main, minWidth: 80 }}>Limitante</Typography>
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

// ── Main component with internal tabs ────────────────────────────────────────

const HELP_TABS = [
	{ label: "Pipeline", value: "pipeline" },
	{ label: "Controles y costos", value: "control" },
	{ label: "Rendimiento", value: "performance" },
] as const;

const WorkerHelpTab = () => {
	const theme = useTheme();
	const [subTab, setSubTab] = useState("pipeline");

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

			{subTab === "pipeline" && <HelpPipelineSection />}
			{subTab === "control" && <HelpControlSection />}
			{subTab === "performance" && <HelpPerformanceSection />}
		</Stack>
	);
};

export default WorkerHelpTab;
