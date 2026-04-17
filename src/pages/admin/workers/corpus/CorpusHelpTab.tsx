import React, { useState } from "react";
import { Box, Stack, Tab, Tabs, Typography, useTheme, alpha, Chip } from "@mui/material";

// ── Shared diagram primitives ─────────────────────────────────────────────────

const useColors = () => {
	const theme = useTheme();
	return {
		mongo: theme.palette.success.main,
		pinecone: "#1A73E8",
		openai: "#10A37F",
		script: theme.palette.warning.main,
		api: theme.palette.primary.main,
		user: theme.palette.secondary.main,
		divider: theme.palette.divider,
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
				minWidth: 200,
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
		<Stack alignItems="center" justifyContent="center" sx={{ px: 1, minWidth: 40 }}>
			<Box sx={{ width: 30, height: 2, bgcolor: theme.palette.divider }} />
			<Box
				sx={{
					width: 0,
					height: 0,
					borderTop: "5px solid transparent",
					borderBottom: "5px solid transparent",
					borderLeft: `7px solid ${theme.palette.divider}`,
					ml: "23px",
					mt: "-5px",
				}}
			/>
			{label && (
				<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", mt: 0.5, whiteSpace: "nowrap" }}>
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
		<Typography variant="caption" color="text.secondary" sx={{ minWidth: 160, fontWeight: 600 }}>
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
					El <strong>corpus de estilo jurídico</strong> es una colección curada de escritos judiciales reales usados como ejemplos de
					calidad por el asistente IA al generar o reformular documentos. No es un worker continuo: se construye con scripts manuales y se
					auto-alimenta cuando el pipeline RAG indexa nuevos expedientes.
				</Typography>
			</Box>

			<Box>
				<SectionTitle>Ficha de infraestructura</SectionTitle>
				<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
					<InfoRow
						label="Servidor"
						value={
							<>
								<strong>worker_02</strong> · IP 100.98.180.101 · Ryzen 5700X · 32 GB RAM
							</>
						}
					/>
					<InfoRow label="Proceso PM2" value="pjn-rag-api (Express + BullMQ)" />
					<InfoRow label="Base de datos origen" value="MongoDB Atlas · colección legal_style_corpus" />
					<InfoRow label="Base de datos local" value="No aplica (el corpus no lee de la BD local del worker)" />
					<InfoRow
						label="Índice Pinecone"
						value={
							<>
								<code style={{ background: "#f5f5f5", padding: "1px 5px", borderRadius: 3 }}>pjn-style-corpus</code> · 1024 dims · coseno ·
								serverless
							</>
						}
					/>
					<InfoRow label="Activación" value="Scripts manuales + inyección automática durante indexación RAG" />
					<InfoRow label="Cron / periodicidad" value="Sin cron. No hay ejecución periódica automática independiente." />
					<InfoRow label="OpenAI model" value="text-embedding-3-small (1024 dims)" />
				</Box>
			</Box>

			<Box>
				<SectionTitle>Diagrama de recursos</SectionTitle>
				<Box sx={{ overflowX: "auto", pb: 1 }}>
					<Stack direction="row" alignItems="center" flexWrap="nowrap" spacing={0} sx={{ minWidth: 700 }}>
						<Node
							badge="ORIGEN"
							badgeColor={colors.mongo}
							title="RagDocument"
							subtitle="MongoDB Atlas"
							items={["Texto completo del escrito", "movimientoTipo = ESCRITO AGREGADO", "textLength > 400 chars"]}
							color={colors.mongo}
						/>
						<Arrow label="build-style-corpus.js" />
						<Node
							badge="CORPUS"
							badgeColor={colors.mongo}
							title="LegalStyleCorpus"
							subtitle="MongoDB Atlas"
							items={["textPreview (800 chars)", "quality: high / normal", "fuero, title, vectorId"]}
							color={colors.mongo}
						/>
						<Arrow label="embed-style-corpus.js" />
						<Node
							badge="VECTOR DB"
							badgeColor={colors.pinecone}
							title="pjn-style-corpus"
							subtitle="Pinecone · serverless"
							items={["ID = _id del corpus doc", "1024 dims · coseno", "metadata: fuero, title, textPreview"]}
							color={colors.pinecone}
						/>
					</Stack>
				</Box>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
					Los scripts se ejecutan manualmente desde worker_02 en el directorio de pjn-rag-api.
				</Typography>
			</Box>

			<Box>
				<SectionTitle>Flujo de inyección automática (tiempo real)</SectionTitle>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Cuando el pipeline RAG indexa un expediente, el <code>ingester.js</code> inyecta automáticamente los escritos elegibles al corpus
					sin necesidad de correr scripts manuales.
				</Typography>
				<Box sx={{ overflowX: "auto", pb: 1 }}>
					<Stack direction="row" alignItems="center" flexWrap="nowrap" spacing={0} sx={{ minWidth: 600 }}>
						<Node
							badge="TRIGGER"
							badgeColor={colors.api}
							title="indexDocument.worker"
							subtitle="worker_02 · pjn-rag-api"
							items={["Status → 'embedded'", "movimientoTipo = ESCRITO AGREGADO", "textLength > 400"]}
							color={colors.api}
						/>
						<Arrow label="llama a ingester.js" />
						<Node
							badge="FILTRO"
							badgeColor={colors.script}
							title="styleCorpus/ingester.js"
							subtitle="pjn-rag-shared"
							items={["Verifica idempotencia (sourceDocId)", "Clasifica quality: high / normal", "high = saludo a juez detectado"]}
							color={colors.script}
						/>
						<Arrow label="upsert async" />
						<Node
							badge="DESTINO"
							badgeColor={colors.pinecone}
							title="pjn-style-corpus"
							subtitle="Pinecone · serverless"
							items={["Solo docs quality=high", "No-blocking (fire-and-forget)", "Error → reintenta con script"]}
							color={colors.pinecone}
						/>
					</Stack>
				</Box>
			</Box>

			<Box>
				<SectionTitle>Cómo se usa el corpus en el editor IA</SectionTitle>
				<Box sx={{ overflowX: "auto", pb: 1 }}>
					<Stack direction="row" alignItems="center" flexWrap="nowrap" spacing={0} sx={{ minWidth: 700 }}>
						<Node
							badge="USUARIO"
							badgeColor={colors.user}
							title="Acción en Editor"
							subtitle="law-analytics-front"
							items={['"Formalizar escrito"', '"Mejorar redacción"', "Selecciona texto + acción"]}
							color={colors.user}
						/>
						<Arrow label="Socket.io" />
						<Node
							badge="API"
							badgeColor={colors.api}
							title="pjn-rag-api"
							subtitle="worker_02"
							items={["Recibe fuero + texto", "Query semántica al corpus", "Filtra por fuero"]}
							color={colors.api}
						/>
						<Arrow label="query" />
						<Node
							badge="VECTOR DB"
							badgeColor={colors.pinecone}
							title="pjn-style-corpus"
							subtitle="Pinecone"
							items={["Top-K vecinos más cercanos", "Filtro por fuero", "Devuelve textPreview"]}
							color={colors.pinecone}
						/>
						<Arrow label="few-shot" />
						<Node
							badge="LLM"
							badgeColor={colors.openai}
							title="OpenAI GPT-4o"
							subtitle="API externa"
							items={["System prompt + ejemplos", "Genera documento formal", "Streaming al usuario"]}
							color={colors.openai}
						/>
					</Stack>
				</Box>
			</Box>
		</Stack>
	);
};

// ── Sub-tab: Scripts ──────────────────────────────────────────────────────────

const ScriptsSection: React.FC = () => {
	const theme = useTheme();
	const colors = useColors();

	const scripts = [
		{
			name: "build-style-corpus.js",
			desc: "Extrae escritos elegibles de RagDocument y los guarda en LegalStyleCorpus (MongoDB). No genera embeddings.",
			usage: "node scripts/build-style-corpus.js [--fuero CIV] [--limit 500]",
			when: "Primera vez, o cuando se quiera re-procesar escritos históricos.",
			server: "worker_02 · /home/.../pjn-rag-api",
		},
		{
			name: "embed-style-corpus.js",
			desc: "Toma entradas de LegalStyleCorpus con quality='high' y vectorId=null, genera embeddings y los sube a Pinecone.",
			usage: "node scripts/embed-style-corpus.js [--fuero CIV] [--limit 200] [--stats]",
			when: "Después de build-style-corpus.js, o cuando hay entradas high sin vectorizar.",
			server: "worker_02 · /home/.../pjn-rag-api",
		},
		{
			name: "classify-style-corpus.js",
			desc: "Re-clasifica la quality de entradas existentes (high/normal) según los criterios actuales.",
			usage: "node scripts/classify-style-corpus.js",
			when: "Si se cambian los criterios de calidad.",
			server: "worker_02 · /home/.../pjn-rag-api",
		},
	];

	return (
		<Stack spacing={3}>
			<Typography variant="body2" color="text.secondary">
				El corpus se gestiona con scripts que se ejecutan manualmente desde <strong>worker_02</strong>. No hay un daemon ni cron que los
				corra automáticamente.
			</Typography>

			<Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
				<Box sx={{ bgcolor: alpha(colors.script, 0.08), px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
					<Typography variant="subtitle2" fontWeight={700}>
						Directorio: pjn-rag-api/scripts/
					</Typography>
					<Typography variant="caption" color="text.secondary">
						worker_02 · /home/[usuario]/pjn-rag-api
					</Typography>
				</Box>
				{scripts.map((s, i) => (
					<Box key={i} sx={{ px: 2, py: 1.5, borderBottom: i < scripts.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
						<Typography variant="subtitle2" fontWeight={700} sx={{ color: colors.script, fontFamily: "monospace" }}>
							{s.name}
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block" sx={{ my: 0.5 }}>
							{s.desc}
						</Typography>
						<Box sx={{ bgcolor: "#f5f5f5", borderRadius: 1, px: 1.5, py: 0.8, fontFamily: "monospace", fontSize: "0.75rem", mb: 0.5 }}>
							{s.usage}
						</Box>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<Typography variant="caption" color="text.secondary">
								<strong>Cuándo:</strong> {s.when}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								<strong>Servidor:</strong> {s.server}
							</Typography>
						</Stack>
					</Box>
				))}
			</Box>

			<Box>
				<SectionTitle>Flujo completo de construcción del corpus</SectionTitle>
				<Stack alignItems="center" spacing={0}>
					<Node
						badge="PASO 1"
						color={colors.mongo}
						title="RagDocument (Atlas)"
						subtitle="Escritos ya indexados por el pipeline RAG"
						items={["movimientoTipo = ESCRITO AGREGADO", "textLength > 400 chars", "fullText disponible"]}
					/>
					<ArrowDown label="build-style-corpus.js" />
					<Node
						badge="PASO 2"
						color={colors.script}
						title="LegalStyleCorpus (Atlas)"
						subtitle="Colección de ejemplos jurídicos"
						items={[
							"textPreview = primeros 800 chars",
							"quality = high (si tiene saludo a juez) / normal",
							"vectorId = null (pendiente de embed)",
						]}
					/>
					<ArrowDown label="embed-style-corpus.js (solo quality=high)" />
					<Node
						badge="PASO 3"
						color={colors.pinecone}
						title="pjn-style-corpus (Pinecone)"
						subtitle="Índice vectorial compartido"
						items={[
							"ID = _id MongoDB del corpus doc",
							"Vector 1024 dims (text-embedding-3-small)",
							"Metadata: fuero, title, textPreview (600 chars)",
						]}
					/>
					<ArrowDown label="a partir de aquí disponible" />
					<Node
						badge="PRODUCCIÓN"
						color={colors.openai}
						title="Editor IA (pjn-rag-api)"
						subtitle="few-shot retrieval en tiempo real"
						items={["Query semántica por fuero", "Top-K vecinos como ejemplos", "Inyectados al prompt de GPT-4o"]}
					/>
				</Stack>
			</Box>
		</Stack>
	);
};

// ── Sub-tab: Troubleshooting ──────────────────────────────────────────────────

const TroubleSection: React.FC = () => {
	const theme = useTheme();
	const issues = [
		{
			prob: "La búsqueda semántica devuelve 0 resultados para un fuero",
			cause: "No hay vectores en pjn-style-corpus para ese fuero, o el filtro de fuero no coincide.",
			fix: "Verificar con --stats en embed-style-corpus.js. Correr build + embed para ese fuero específico.",
		},
		{
			prob: "embed-style-corpus.js falla con 'PINECONE_API_KEY not configured'",
			cause: "Variables de entorno no cargadas.",
			fix: "Verificar .env en la raíz de pjn-rag-api. Ejecutar con dotenv: node -r dotenv/config scripts/embed-style-corpus.js",
		},
		{
			prob: "El editor IA no usa ejemplos del corpus (respuesta genérica)",
			cause: "PipelineConfig.editor.styleCorpusEnabled = false, o el fuero del expediente no tiene vectores.",
			fix: "Verificar en el tab Pipeline → sección Editor. Confirmar PINECONE_STYLE_INDEX=pjn-style-corpus en .env del servidor.",
		},
		{
			prob: "build-style-corpus.js procesa 0 documentos",
			cause:
				"No hay RagDocuments con movimientoTipo='ESCRITO AGREGADO' y textLength>400 en Atlas, o ya todos tienen entrada en LegalStyleCorpus.",
			fix: "Verificar con --fuero y sin --limit. Confirmar que la BD Atlas tiene datos. El script es idempotente: omite los ya procesados.",
		},
		{
			prob: "Nuevos escritos indexados no aparecen en el corpus",
			cause:
				"El ingester.js solo inyecta calidad high. Si el escrito no tiene saludo a juez, queda como normal y no se embeds automáticamente.",
			fix: "Correr build-style-corpus.js para capturar calidad normal. O ajustar los criterios de calidad en ingester.js.",
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
		</Stack>
	);
};

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
	{ label: "Resumen e Infraestructura", value: "overview" },
	{ label: "Scripts de gestión", value: "scripts" },
	{ label: "Troubleshooting", value: "trouble" },
];

const CorpusHelpTab: React.FC = () => {
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
			{sub === "scripts" && <ScriptsSection />}
			{sub === "trouble" && <TroubleSection />}
		</Stack>
	);
};

export default CorpusHelpTab;
