import { Alert, Box, Chip, Divider, Grid, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import { ArrowDown, ArrowRight2, Calendar, Code, Data, Diagram, DocumentText, Element4, InfoCircle, Setting3, Timer } from "iconsax-react";

// ── Primitivos del diagrama ────────────────────────────────────

interface NodeProps {
	label: string;
	sublabel?: string;
	color?: "primary" | "success" | "warning" | "error" | "info" | "default";
	icon?: React.ReactNode;
	chip?: string;
	chipColor?: "primary" | "success" | "warning" | "error" | "info" | "default";
	mono?: boolean;
}

const Node = ({ label, sublabel, color = "primary", icon, chip, chipColor = "default", mono = false }: NodeProps) => {
	const theme = useTheme();
	const palette = color === "default" ? theme.palette.grey : theme.palette[color];
	const main = color === "default" ? theme.palette.grey[600] : (palette as any).main;
	const light = color === "default" ? alpha(theme.palette.grey[500], 0.1) : alpha(main, 0.08);

	return (
		<Paper
			elevation={0}
			sx={{
				px: 1.5,
				py: 1,
				border: `1.5px solid ${alpha(main, 0.35)}`,
				bgcolor: light,
				borderRadius: 1.5,
				minWidth: 130,
				textAlign: "center",
			}}
		>
			{icon && <Box sx={{ color: main, mb: 0.3, display: "flex", justifyContent: "center" }}>{icon}</Box>}
			<Typography
				variant="caption"
				fontWeight={700}
				color={main}
				fontFamily={mono ? "monospace" : undefined}
				display="block"
				lineHeight={1.3}
			>
				{label}
			</Typography>
			{sublabel && (
				<Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.65rem" }}>
					{sublabel}
				</Typography>
			)}
			{chip && <Chip label={chip} color={chipColor} size="small" sx={{ mt: 0.5, fontSize: "0.6rem", height: 18 }} />}
		</Paper>
	);
};

const Arrow = ({ horizontal = false }: { horizontal?: boolean }) => (
	<Box
		display="flex"
		justifyContent="center"
		alignItems="center"
		color="text.disabled"
		sx={{ my: horizontal ? 0 : 0.3, mx: horizontal ? 0.3 : 0 }}
	>
		{horizontal ? <ArrowRight2 size={16} /> : <ArrowDown size={16} />}
	</Box>
);

interface SectionProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}

const Section = ({ title, icon, children }: SectionProps) => {
	const theme = useTheme();
	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
				<Box sx={{ color: theme.palette.primary.main }}>{icon}</Box>
				<Typography variant="h5">{title}</Typography>
			</Stack>
			{children}
		</Box>
	);
};

// ── HelpTab ────────────────────────────────────────────────────

const HelpTab = () => {
	const theme = useTheme();

	return (
		<Stack spacing={4}>
			<Alert severity="info" icon={<InfoCircle size={18} />}>
				Esta página describe la arquitectura del sistema de scraping de InfoLeg y cómo interactúan sus componentes. Es útil para entender el
				comportamiento de los workers y diagnosticar problemas de cobertura de datos.
			</Alert>

			{/* ── 1. Visión general ── */}
			<Section title="Visión general" icon={<Diagram size={20} />}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
					El sistema está compuesto por <strong>5 procesos PM2</strong> que trabajan en conjunto para descargar, procesar y mantener
					actualizadas las normas jurídicas argentinas publicadas en InfoLeg.
				</Typography>

				<Grid container spacing={1.5}>
					{[
						{
							name: "infoleg-manager",
							desc: "Orquestador central. Siembra IDs secuenciales, escala workers y envía reportes diarios.",
							color: "primary" as const,
							icon: <Setting3 size={18} />,
							badge: "Singleton",
						},
						{
							name: "infoleg-scraper",
							desc: "Descarga normas en orden secuencial (ID 1 → 500.000). Cola: source='queue'.",
							color: "success" as const,
							icon: <Code size={18} />,
							badge: "Escalable 1–3",
						},
						{
							name: "infoleg-scraper-novedades",
							desc: "Descarga normas publicadas recientemente con prioridad. Cola: source='novedades'. Hace overflow al secuencial cuando está vacío.",
							color: "success" as const,
							icon: <Code size={18} />,
							badge: "Escalable 1–2",
						},
						{
							name: "infoleg-vinculaciones",
							desc: "Resuelve y persiste relaciones entre normas ya scrapeadas (modifica_a, deroga_a, etc.).",
							color: "warning" as const,
							icon: <Element4 size={18} />,
							badge: "Escalable 1–2",
						},
						{
							name: "infoleg-novedades",
							desc: "Busca en InfoLeg las normas publicadas ayer iterando por cada tipo. Corre una vez al día a las 6:00 AR.",
							color: "info" as const,
							icon: <Calendar size={18} />,
							badge: "Singleton · Cron",
						},
					].map((w) => (
						<Grid item xs={12} sm={6} md={4} key={w.name}>
							<Paper
								elevation={0}
								sx={{
									p: 1.5,
									height: "100%",
									border: `1px solid ${theme.palette.divider}`,
									borderLeft: `4px solid ${(theme.palette[w.color] as any).main}`,
									borderRadius: 1.5,
								}}
							>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
									<Box sx={{ color: (theme.palette[w.color] as any).main }}>{w.icon}</Box>
									<Typography variant="caption" fontFamily="monospace" fontWeight={700} color={`${w.color}.main`}>
										{w.name}
									</Typography>
								</Stack>
								<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.8 }}>
									{w.desc}
								</Typography>
								<Chip label={w.badge} size="small" color={w.color} variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
							</Paper>
						</Grid>
					))}
				</Grid>
			</Section>

			<Divider />

			{/* ── 2. Flujo de datos ── */}
			<Section title="Flujo de datos completo" icon={<ArrowDown size={20} />}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
					Desde el descubrimiento de un ID hasta tener la norma completamente procesada con texto y vinculaciones.
				</Typography>

				<Grid container spacing={3}>
					{/* Rama secuencial */}
					<Grid item xs={12} md={6}>
						<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mb: 1.5 }}>
							Rama A — Scraping secuencial (histórico)
						</Typography>
						<Stack alignItems="center" spacing={0}>
							<Node label="infoleg-manager" sublabel="Cada 60 seg" color="primary" icon={<Setting3 size={16} />} />
							<Arrow />
							<Node label="seedIdRange()" sublabel="Siembra IDs 1 → 500.000" color="default" mono chip="source: 'queue'" />
							<Arrow />
							<Node label="infoleg-normas" sublabel="status: pending" color="default" icon={<Data size={16} />} />
							<Arrow />
							<Node
								label="infoleg-scraper"
								sublabel="getPendingBatch(source='queue')"
								color="success"
								icon={<Code size={16} />}
								chip="1–3 instancias"
								chipColor="success"
							/>
							<Arrow />
							<Node label="infoleg-normas" sublabel="status: scraped + texto + metadatos" color="success" icon={<Data size={16} />} />
							<Arrow />
							<Node label="infoleg-vinculaciones" sublabel="Resuelve modifica_a, deroga_a…" color="warning" icon={<Element4 size={16} />} />
							<Arrow />
							<Node label="infoleg-vinculaciones (col.)" sublabel="Relaciones entre normas" color="warning" icon={<Data size={16} />} />
						</Stack>
					</Grid>

					{/* Rama novedades */}
					<Grid item xs={12} md={6}>
						<Typography variant="subtitle2" color="info.main" gutterBottom sx={{ mb: 1.5 }}>
							Rama B — Scraping de novedades (diario)
						</Typography>
						<Stack alignItems="center" spacing={0}>
							<Node label="infoleg-novedades" sublabel="Cron 6:00 AR" color="info" icon={<Calendar size={16} />} />
							<Arrow />
							<Box
								sx={{
									border: `1px dashed ${alpha(theme.palette.info.main, 0.4)}`,
									borderRadius: 1.5,
									p: 1.5,
									width: "100%",
									bgcolor: alpha(theme.palette.info.main, 0.03),
								}}
							>
								<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.8, textAlign: "center" }}>
									Itera 27 tipos de norma
								</Typography>
								<Stack direction="row" flexWrap="wrap" gap={0.5} justifyContent="center">
									{["Ley", "Decreto", "DNU", "Resolución", "Disposición", "D.Admin.", "+ 22 más"].map((t) => (
										<Chip key={t} label={t} size="small" variant="outlined" sx={{ fontSize: "0.6rem", height: 18 }} />
									))}
								</Stack>
							</Box>
							<Arrow />
							<Node label="Upsert $setOnInsert" sublabel="No pisa normas existentes" color="default" mono chip="source: 'novedades'" />
							<Arrow />
							<Node label="infoleg-normas" sublabel="status: pending" color="default" icon={<Data size={16} />} />
							<Arrow />
							<Node
								label="infoleg-novedades (col.)"
								sublabel="Registro diario: IDs, totales, desglose"
								color="info"
								icon={<Data size={16} />}
							/>
							<Arrow />
							<Node
								label="infoleg-scraper-novedades"
								sublabel="getPendingBatch(source='novedades')"
								color="success"
								icon={<Code size={16} />}
								chip="Alta prioridad"
								chipColor="success"
							/>
							<Arrow />
							<Node label="infoleg-normas" sublabel="status: scraped" color="success" icon={<Data size={16} />} />
						</Stack>
					</Grid>
				</Grid>
			</Section>

			<Divider />

			{/* ── 3. Sistema de colas ── */}
			<Section title="Sistema de colas (source)" icon={<Element4 size={20} />}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
					Cada documento en <code>infoleg-normas</code> tiene un campo <code>source</code> que indica qué scraper debe procesarlo. Esto
					permite priorizar normas recientes sin afectar el scraping histórico.
				</Typography>

				<Grid container spacing={2} sx={{ mb: 2.5 }}>
					<Grid item xs={12} md={6}>
						<Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, height: "100%" }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main" }} />
								<Typography variant="subtitle2">
									source: <code>'queue'</code>
								</Typography>
							</Stack>
							<Typography variant="body2" color="text.secondary">
								IDs sembrados por el manager en orden secuencial (1 → 500.000). Representan el histórico completo de InfoLeg. Procesados por{" "}
								<strong>infoleg-scraper</strong>.
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={12} md={6}>
						<Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, height: "100%" }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "info.main" }} />
								<Typography variant="subtitle2">
									source: <code>'novedades'</code>
								</Typography>
							</Stack>
							<Typography variant="body2" color="text.secondary">
								IDs descubiertos por el worker de novedades (normas publicadas ayer). Alta prioridad: procesados por{" "}
								<strong>infoleg-scraper-novedades</strong> antes que el histórico.
							</Typography>
						</Paper>
					</Grid>
				</Grid>

				{/* Diagrama de overflow */}
				<Paper
					elevation={0}
					sx={{
						p: 2,
						bgcolor: alpha(theme.palette.success.main, 0.04),
						border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
						borderRadius: 1.5,
					}}
				>
					<Typography variant="subtitle2" color="success.main" gutterBottom>
						Overflow automático del scraper de novedades
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center" flexWrap="wrap">
						<Node label="Cola novedades" sublabel="pendientes=0" color="info" />
						<Arrow horizontal />
						<Node label="scraper-novedades" sublabel="sin trabajo propio" color="success" />
						<Arrow horizontal />
						<Node label="Cola queue" sublabel="ayuda al secuencial" color="success" chip="overflow" />
					</Stack>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
						Cuando la cola de novedades está vacía (la mayoría del día), el scraper-novedades automáticamente procesa IDs de la cola
						secuencial. Así las instancias nunca quedan ociosas.
					</Typography>
				</Paper>
			</Section>

			<Divider />

			{/* ── 4. Worker de novedades: por qué no anioSancion ── */}
			<Section title="Por qué el worker de novedades itera por tipo" icon={<InfoCircle size={20} />}>
				<Grid container spacing={2}>
					<Grid item xs={12} md={6}>
						<Paper
							elevation={0}
							sx={{ p: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`, borderRadius: 1.5, height: "100%" }}
						>
							<Typography variant="subtitle2" color="error.main" gutterBottom>
								Método descartado: <code>anioSancion=2025</code>
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
								El formulario de búsqueda de InfoLeg requiere al menos 2 criterios. Usar el año de sanción parece lógico, pero falla en la
								práctica:
							</Typography>
							<Box
								sx={{
									p: 1.5,
									bgcolor: alpha(theme.palette.error.main, 0.05),
									borderRadius: 1,
									fontFamily: "monospace",
									fontSize: "0.75rem",
								}}
							>
								<Typography variant="caption" display="block" color="error.main" fontWeight={700}>
									Ejemplo real — 2 de enero 2025:
								</Typography>
								<Typography variant="caption" display="block">
									anioSancion=2025 → 9 normas
								</Typography>
								<Typography variant="caption" display="block">
									anioSancion=2024 → 110 normas
								</Typography>
								<Typography variant="caption" display="block" color="error.main" fontWeight={700}>
									93% de las normas publicadas ese día
								</Typography>
								<Typography variant="caption" display="block" color="error.main">
									tenían sanción de diciembre 2024.
								</Typography>
							</Box>
						</Paper>
					</Grid>
					<Grid item xs={12} md={6}>
						<Paper
							elevation={0}
							sx={{ p: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`, borderRadius: 1.5, height: "100%" }}
						>
							<Typography variant="subtitle2" color="success.main" gutterBottom>
								Método usado: iterar cada <code>tipoNorma</code>
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
								Buscar por tipo + rango de fechas devuelve <strong>todas</strong> las normas publicadas ese día sin importar el año de
								sanción.
							</Typography>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									27 tipos de norma × 1 request por tipo = ~27 requests/día
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Paginación automática si un tipo supera 50 resultados
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Cobertura verificada: 0 normas perdidas
								</Typography>
							</Stack>
							<Box sx={{ mt: 1.5, p: 1, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 1 }}>
								<Typography variant="caption" color="success.main" fontWeight={700} display="block">
									Resultado verificado:
								</Typography>
								<Typography variant="caption" display="block">
									Por tipo: 119 IDs · Por anioSancion: 119 IDs
								</Typography>
								<Typography variant="caption" display="block">
									Gap = 0 normas perdidas ✓
								</Typography>
							</Box>
						</Paper>
					</Grid>
				</Grid>
			</Section>

			<Divider />

			{/* ── 5. Colecciones MongoDB ── */}
			<Section title="Colecciones MongoDB" icon={<Data size={20} />}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Todas las colecciones usan el prefijo <code>infoleg-</code> para evitar colisiones con otros proyectos en la base de datos
					compartida.
				</Typography>
				<Grid container spacing={1.5}>
					{[
						{
							name: "infoleg-normas",
							desc: "Documento principal de cada norma. Contiene metadatos, texto original, texto actualizado con reformas, vinculaciones raw y estado del pipeline.",
							fields: [
								"infolegId",
								"tipo",
								"numero",
								"titulo",
								"fechaPublicacion",
								"status",
								"source",
								"textoPlano",
								"textoActualizadoPlano",
								"vinculacionesRaw",
								"tasks.*",
							],
							color: "primary" as const,
						},
						{
							name: "infoleg-vinculaciones",
							desc: "Relaciones resueltas entre normas (modifica_a, deroga_a, complementa_a, etc.). Una entrada por par de normas vinculadas.",
							fields: ["infolegIdOrigen", "infolegIdDestino", "tipo", "textoOriginal"],
							color: "warning" as const,
						},
						{
							name: "infoleg-novedades",
							desc: "Registro diario de normas publicadas. Una entrada por fecha. Útil para reportes y para saber qué se publicó cada día sin necesidad de consultar infoleg-normas.",
							fields: ["fecha", "total", "nuevos", "porTipo", "ids[]", "errores[]"],
							color: "info" as const,
						},
						{
							name: "infoleg-config",
							desc: "Configuración y estado del manager. Parámetros de cada worker, rango de IDs, historial de ciclos y alertas.",
							fields: ["config.scraping.*", "config.workers.*", "config.email.*", "state.*", "stats.*", "history[]", "alerts[]"],
							color: "default" as const,
						},
					].map((col) => (
						<Grid item xs={12} md={6} key={col.name}>
							<Paper elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, height: "100%" }}>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
									<Data size={16} color={col.color === "default" ? theme.palette.text.secondary : (theme.palette[col.color] as any).main} />
									<Typography
										variant="subtitle2"
										fontFamily="monospace"
										color={col.color === "default" ? "text.primary" : `${col.color}.main`}
									>
										{col.name}
									</Typography>
								</Stack>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
									{col.desc}
								</Typography>
								<Stack direction="row" flexWrap="wrap" gap={0.5}>
									{col.fields.map((f) => (
										<Chip
											key={f}
											label={f}
											size="small"
											variant="outlined"
											sx={{ fontSize: "0.6rem", height: 18, fontFamily: "monospace" }}
										/>
									))}
								</Stack>
							</Paper>
						</Grid>
					))}
				</Grid>
			</Section>

			<Divider />

			{/* ── 6. Ciclo del manager ── */}
			<Section title="Ciclo del manager (cada 60 seg)" icon={<Timer size={20} />}>
				<Box sx={{ overflowX: "auto" }}>
					<Stack direction="row" spacing={0} alignItems="center" flexWrap="wrap" sx={{ minWidth: 600, gap: 0.5 }}>
						{[
							{ label: "getOrCreate()", sub: "Lee config", color: "primary" as const },
							{ label: "countPending()", sub: "Por cola", color: "default" as const },
							{ label: "ensureIdRange()", sub: "Siembra IDs", color: "default" as const },
							{ label: "Workers scraper", sub: "Escala 1–3", color: "success" as const },
							{ label: "Worker novedades", sub: "Escala 1–2", color: "success" as const },
							{ label: "Worker vinculaciones", sub: "Escala 1–2", color: "warning" as const },
							{ label: "Novedades worker", sub: "Singleton ON", color: "info" as const },
							{ label: "addSnapshot()", sub: "Historial", color: "default" as const },
							{ label: "Reporte email", sub: "Si runHour", color: "default" as const },
						].map((step, i, arr) => (
							<Stack key={step.label} direction="row" alignItems="center" spacing={0.5}>
								<Node label={step.label} sublabel={step.sub} color={step.color} />
								{i < arr.length - 1 && <Arrow horizontal />}
							</Stack>
						))}
					</Stack>
				</Box>
				<Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
					El manager no ejecuta scraping directamente. Solo orquesta: lee config, cuenta pendientes, siembra IDs y ajusta instancias PM2. Si
					una cola tiene más pendientes que <code>scaleUpThreshold</code>, agrega instancias. Si tiene menos que{" "}
					<code>scaleDownThreshold</code>, las reduce.
				</Typography>
			</Section>

			<Divider />

			{/* ── 7. Estados de una norma ── */}
			<Section title="Estados de una norma (pipeline)" icon={<DocumentText size={20} />}>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={0} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
					<Node label="pending" sublabel="En cola" color="warning" chip="source: queue | novedades" />
					<Arrow horizontal />
					<Node label="scraping" sublabel="En proceso" color="primary" />
					<Arrow horizontal />
					<Node label="scraped" sublabel="Texto + metadatos OK" color="success" />
					<Arrow horizontal />
					<Node
						label="vinculaciones"
						sublabel="Relaciones resueltas"
						color="success"
						chip="tasks.vinculacionesResolved"
						chipColor="success"
					/>
				</Stack>
				<Box sx={{ mt: 1.5 }}>
					<Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
						<Chip label="not_found → 404 en InfoLeg (ID sin norma)" size="small" color="default" variant="outlined" />
						<Chip label="error → 3+ errores consecutivos, skip temporario" size="small" color="error" variant="outlined" />
						<Chip
							label="textoActualizadoStale → una norma posterior la modificó, texto desactualizado"
							size="small"
							color="warning"
							variant="outlined"
						/>
					</Stack>
				</Box>
			</Section>
		</Stack>
	);
};

export default HelpTab;
