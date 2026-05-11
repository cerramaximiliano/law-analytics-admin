import React from "react";
import {
	Box,
	Stack,
	Typography,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	useTheme,
	alpha,
} from "@mui/material";

// ── Colores de servicios (consistentes con EscritosHelpTab) ─────────────────
const OPENAI_COLOR = "#10A37F";
const PINECONE_COLOR = "#1A73E8";

type Scope = "enabled" | "novelty";
type Variant = "compact" | "detailed";

interface WorkerScopeAlertProps {
	variant: Variant;
	/** Requerido cuando variant="compact". Ignorado en variant="detailed". */
	scope?: Scope;
}

interface SubWorkerRow {
	name: string;
	stops: string;
	cost: React.ReactNode;
}

const ROWS_ENABLED: SubWorkerRow[] = [
	{
		name: "scan.job (cron)",
		stops: "No encola nuevos movimientos a procesar",
		cost: "—",
	},
	{
		name: "extractor.worker",
		stops: "Sin descarga de PDFs ni extracción de texto",
		cost: (
			<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
				<CostChip label="OpenAI embeddings" color={OPENAI_COLOR} stopped />
				<CostChip label="Pinecone upserts" color={PINECONE_COLOR} stopped />
			</Stack>
		),
	},
	{
		name: "ocr.worker",
		stops: "Sin OCR de PDFs escaneados (Tesseract)",
		cost: (
			<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
				<CostChip label="OpenAI embeddings" color={OPENAI_COLOR} stopped />
				<CostChip label="Pinecone upserts" color={PINECONE_COLOR} stopped />
			</Stack>
		),
	},
];

const ROWS_NOVELTY: SubWorkerRow[] = [
	{
		name: "selector.worker",
		stops: "Sin novelty scoring contra el corpus",
		cost: (
			<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
				<CostChip label="Pinecone reads (queries)" color={PINECONE_COLOR} stopped />
			</Stack>
		),
	},
];

function CostChip({ label, color, stopped }: { label: string; color: string; stopped?: boolean }) {
	return (
		<Chip
			label={stopped ? `⛔ ${label}` : label}
			size="small"
			sx={{
				bgcolor: alpha(color, stopped ? 0.12 : 0.08),
				color: color,
				fontWeight: 600,
				fontSize: "0.7rem",
				height: 22,
				"& .MuiChip-label": { px: 1 },
			}}
		/>
	);
}

function QueueChip({ name }: { name: string }) {
	const theme = useTheme();
	return (
		<Chip
			label={name}
			size="small"
			sx={{
				bgcolor: alpha(theme.palette.error.main, 0.1),
				color: theme.palette.error.dark,
				fontFamily: "monospace",
				fontWeight: 600,
				fontSize: "0.7rem",
				height: 22,
				"& .MuiChip-label": { px: 1 },
			}}
		/>
	);
}

// ── Variant: compact (debajo de un toggle individual) ──────────────────────
function CompactScope({ scope }: { scope: Scope }) {
	const theme = useTheme();
	const isEnabled = scope === "enabled";
	const rows = isEnabled ? ROWS_ENABLED : ROWS_NOVELTY;
	const queues = isEnabled ? ["escritos-extract", "escritos-ocr"] : ["escritos-select"];
	const footerNote = isEnabled
		? "Selector / Novelty detection NO se detiene con este switch — si está prendido sigue procesando lo que haya en cola."
		: "Extractor + OCR siguen funcionando normalmente — siguen generando embeddings y upserts. Los docs nuevos se marcan noveltyStatus=skipped en Atlas.";

	return (
		<Box
			sx={{
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: 2,
				bgcolor: alpha(theme.palette.info.main, 0.03),
				p: 2,
			}}
		>
			<Stack spacing={1.5}>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Typography variant="caption" fontWeight={600} color="text.secondary">
						Al apagar este switch se pausan las colas BullMQ:
					</Typography>
					{queues.map((q) => (
						<QueueChip key={q} name={q} />
					))}
				</Stack>

				<Table size="small" sx={{ "& td, & th": { borderColor: alpha(theme.palette.divider, 0.5) } }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", py: 0.5 }}>Sub-worker</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", py: 0.5 }}>Qué deja de hacer</TableCell>
							<TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", py: 0.5 }}>Costo externo afectado</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r) => (
							<TableRow key={r.name}>
								<TableCell sx={{ fontFamily: "monospace", fontSize: "0.72rem", py: 0.7 }}>{r.name}</TableCell>
								<TableCell sx={{ fontSize: "0.72rem", py: 0.7 }}>{r.stops}</TableCell>
								<TableCell sx={{ py: 0.7 }}>{r.cost}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>

				<Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
					✓ {footerNote}
				</Typography>
			</Stack>
		</Box>
	);
}

// ── Variant: detailed (tab Ayuda — comparativa lado a lado) ────────────────
function DetailedScope() {
	const theme = useTheme();

	const Stop = () => (
		<Typography component="span" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
			⛔ CESA
		</Typography>
	);
	const Ok = () => (
		<Typography component="span" sx={{ color: theme.palette.success.main, fontWeight: 600 }}>
			✓ no afectado
		</Typography>
	);

	const rows: { label: React.ReactNode; enabled: React.ReactNode; novelty: React.ReactNode }[] = [
		{
			label: "Cola BullMQ pausada",
			enabled: (
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					<QueueChip name="escritos-extract" />
					<QueueChip name="escritos-ocr" />
				</Stack>
			),
			novelty: <QueueChip name="escritos-select" />,
		},
		{
			label: "Sub-workers detenidos",
			enabled: (
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					<Chip label="extractor.worker" size="small" sx={{ fontFamily: "monospace", fontSize: "0.7rem", height: 22 }} />
					<Chip label="ocr.worker" size="small" sx={{ fontFamily: "monospace", fontSize: "0.7rem", height: 22 }} />
				</Stack>
			),
			novelty: <Chip label="selector.worker" size="small" sx={{ fontFamily: "monospace", fontSize: "0.7rem", height: 22 }} />,
		},
		{ label: "Cron de scan", enabled: <Stop />, novelty: <Ok /> },
		{
			label: (
				<>
					<strong>OpenAI embeddings</strong>{" "}
					<Typography component="span" variant="caption" color="text.secondary">
						(text-embedding-3-small)
					</Typography>
				</>
			),
			enabled: <Stop />,
			novelty: <Ok />,
		},
		{ label: "Pinecone upserts (writes)", enabled: <Stop />, novelty: <Ok /> },
		{
			label: "Pinecone queries (reads)",
			enabled: (
				<Stack direction="row" spacing={0.5} alignItems="center">
					<Ok />
					<Typography variant="caption" color="text.disabled">
						*
					</Typography>
				</Stack>
			),
			novelty: <Stop />,
		},
		{ label: "Tesseract OCR (CPU)", enabled: <Stop />, novelty: <Ok /> },
		{
			label: "Estado de docs nuevos",
			enabled: "Quedan en cola sin procesar",
			novelty: "Se marcan noveltyStatus=skipped en Atlas",
		},
		{
			label: "Proceso Node",
			enabled: "Sigue corriendo (~500 MB RAM)",
			novelty: "Sigue corriendo",
		},
	];

	return (
		<Box>
			<Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
				¿Qué detiene cada switch del Worker?
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
				Los dos switches de la tab <strong>Escritos Worker</strong> controlan distintos sub-workers y, por lo tanto, distintos costos
				externos (OpenAI y Pinecone). Esta tabla muestra exactamente qué cesa al apagar cada uno.
			</Typography>
			<Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: "hidden" }}>
				<Table size="small">
					<TableHead>
						<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<TableCell sx={{ fontWeight: 700, fontSize: "0.78rem" }}>Dimensión</TableCell>
							<TableCell sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
								Switch <code>enabled</code> <br />
								<Typography variant="caption" color="text.secondary">
									"Worker habilitado"
								</Typography>
							</TableCell>
							<TableCell sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
								Switch <code>noveltyEnabled</code> <br />
								<Typography variant="caption" color="text.secondary">
									"Novelty detection"
								</Typography>
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => (
							<TableRow key={i} hover>
								<TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, width: "30%" }}>{r.label}</TableCell>
								<TableCell sx={{ fontSize: "0.78rem" }}>{r.enabled}</TableCell>
								<TableCell sx={{ fontSize: "0.78rem" }}>{r.novelty}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Box>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, fontStyle: "italic" }}>
				* En la práctica, sin extractor/OCR la cola <code>escritos-select</code> se drena y el selector queda sin trabajo, pero
				técnicamente no se desactiva — para eso usar el otro switch.
			</Typography>
		</Box>
	);
}

const WorkerScopeAlert: React.FC<WorkerScopeAlertProps> = ({ variant, scope }) => {
	if (variant === "detailed") return <DetailedScope />;
	if (!scope) return null;
	return <CompactScope scope={scope} />;
};

export default WorkerScopeAlert;
