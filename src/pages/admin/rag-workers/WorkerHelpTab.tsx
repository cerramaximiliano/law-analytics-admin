import React from "react";
import { Box, Stack, Typography, Divider, useTheme, alpha } from "@mui/material";

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

// ── Main component ───────────────────────────────────────────────────────────

const WorkerHelpTab = () => {
	const theme = useTheme();

	const colors = {
		autoIndex: theme.palette.info.main,
		indexCausa: theme.palette.primary.main,
		indexDocument: theme.palette.success.main,
		generateSummary: theme.palette.warning.main,
		ocrDocument: theme.palette.error.main,
		section: theme.palette.text.secondary,
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
			<Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
				<Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
					Fase 1 — Descubrimiento automatico
				</Typography>

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
			</Box>

			{/* ── PHASE 2: Document processing ───────────────────────────── */}
			<Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
				<Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
					Fase 2 — Procesamiento de documentos
				</Typography>

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
			</Box>

			{/* ── PHASE 3: Summary generation ────────────────────────────── */}
			<Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
				<Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
					Fase 3 — Generacion de resumenes
				</Typography>

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
			</Box>

			<Divider />

			{/* ── Control mechanisms ──────────────────────────────────────── */}
			<Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
				<Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
					Mecanismos de control
				</Typography>

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
			</Box>

			{/* ── Cost tracking ───────────────────────────────────────────── */}
			<Box sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
				<Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 2, display: "block" }}>
					Tracking de costos
				</Typography>

				<Stack spacing={1}>
					<Typography variant="body2" color="text.secondary">
						El sistema trackea automaticamente el consumo de tokens de OpenAI y calcula costos en USD usando la tabla de precios configurable:
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
						<CostCard title="Embeddings" model="text-embedding-3-small" worker="Index Document" description="Tokens usados para vectorizar chunks de texto" theme={theme} />
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
			</Box>
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

export default WorkerHelpTab;
