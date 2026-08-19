// Diagrama del flujo de sentencias: captura → procesamiento → embeddings → consumo.
//
// Comparte el lenguaje visual de `infrastructure/dataflow.tsx`: columnas con
// encabezado, nodos con barra de acento, aristas bezier con marker, y hover /
// click que atenúa lo no relacionado. La ficha de detalle es la "zona 2".
// Los datos viven en `sentenciasFlowData.ts` — acá solo hay render.

import React, { useMemo, useState } from "react";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { InfoCircle } from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, PRO_TEAL, PREMIUM_GOLD } from "themes/dashboardTokens";
import { API_HOP, COLUMNS, LABELS, NODES, SENTENCIAS_DETAILS, buildSentenciasEdges, SFNode, SFEdge, SFLabel } from "./sentenciasFlowData";

const markerFor = (color: string): string => {
	if (color === BRAND_BLUE) return "sarw-blue";
	if (color === LIVE_GREEN) return "sarw-green";
	if (color === PRO_TEAL) return "sarw-teal";
	if (color === STALE_AMBER) return "sarw-amber";
	if (color === PREMIUM_GOLD) return "sarw-gold";
	if (color === API_HOP) return "sarw-hop";
	return "sarw-neutral";
};

const LabelChip = ({ label, bg }: { label: SFLabel; bg: string }) => {
	const w = label.text.length * 5.2 + 16;
	return (
		<g pointerEvents="none">
			<rect x={label.x - w / 2} y={label.y - 9} width={w} height={18} rx={9} fill={bg} stroke={alpha(label.color, 0.45)} opacity={0.95} />
			<text x={label.x} y={label.y + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill={label.color}>
				{label.text}
			</text>
		</g>
	);
};

const NodeChip = ({ node }: { node: SFNode }) => {
	if (!node.chip) return null;
	const w = node.chip.text.length * 4.3 + 12;
	const x = node.x + node.w - w - 8;
	return (
		<g pointerEvents="none">
			<rect x={x} y={node.y + 6} width={w} height={13} rx={6.5} fill={alpha(node.chip.color, 0.16)} stroke={alpha(node.chip.color, 0.5)} />
			<text x={x + w / 2} y={node.y + 15} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={node.chip.color}>
				{node.chip.text}
			</text>
		</g>
	);
};

const SentenciasFlow: React.FC = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);

	const neutralEdge = isDark ? alpha(theme.palette.common.white, 0.32) : alpha(theme.palette.common.black, 0.28);
	const edges = useMemo(() => buildSentenciasEdges(neutralEdge), [neutralEdge]);

	const activeId = hovered ?? selected;

	const { activeEdgeIds, relatedNodeIds } = useMemo(() => {
		if (!activeId) return { activeEdgeIds: null as Set<string> | null, relatedNodeIds: null as Set<string> | null };
		const edgeIds = new Set<string>();
		const nodeIds = new Set<string>([activeId]);
		edges.forEach((e) => {
			if (e.from === activeId || e.to === activeId) {
				edgeIds.add(e.id);
				nodeIds.add(e.from);
				nodeIds.add(e.to);
			}
		});
		return { activeEdgeIds: edgeIds, relatedNodeIds: nodeIds };
	}, [activeId, edges]);

	const paperBg = theme.palette.background.paper;
	const nodeFill = isDark ? alpha(theme.palette.common.white, 0.04) : paperBg;
	const nodeStroke = theme.palette.divider;
	const textPrimary = theme.palette.text.primary;
	const textSecondary = theme.palette.text.secondary;
	const colHeader = alpha(textSecondary as string, 0.85);

	const nodeOpacity = (n: SFNode): number => {
		const base = n.dim ? 0.55 : 1;
		if (!relatedNodeIds) return base;
		return relatedNodeIds.has(n.id) ? 1 : 0.3;
	};
	const edgeOpacity = (e: SFEdge): number => {
		if (!activeEdgeIds) return 0.85;
		return activeEdgeIds.has(e.id) ? 1 : 0.1;
	};

	const renderNode = (n: SFNode) => {
		const isSelected = selected === n.id;
		const isHovered = hovered === n.id;
		const accent = n.accent ?? (n.kind === "worker" ? BRAND_BLUE : n.kind === "source" ? (textSecondary as string) : BRAND_BLUE);
		const hasSub = n.sub && n.sub.length > 0;
		const titleY = hasSub ? n.y + 21 : n.y + n.h / 2 + 4;
		return (
			<g
				key={n.id}
				opacity={nodeOpacity(n)}
				style={{ cursor: "pointer", transition: "opacity 0.2s ease" }}
				onClick={(ev) => {
					ev.stopPropagation();
					setSelected((prev) => (prev === n.id ? null : n.id));
				}}
				onMouseEnter={() => setHovered(n.id)}
				onMouseLeave={() => setHovered((prev) => (prev === n.id ? null : prev))}
			>
				<rect
					x={n.x}
					y={n.y}
					width={n.w}
					height={n.h}
					rx={8}
					fill={
						n.kind === "worker"
							? alpha(BRAND_BLUE, isDark ? 0.1 : 0.05)
							: n.kind === "client"
							? alpha(API_HOP, isDark ? 0.09 : 0.05)
							: n.kind === "store"
							? alpha(LIVE_GREEN, isDark ? 0.08 : 0.04)
							: nodeFill
					}
					stroke={isSelected ? BRAND_BLUE : isHovered ? alpha(BRAND_BLUE, 0.65) : nodeStroke}
					strokeWidth={isSelected ? 2.25 : isHovered ? 1.5 : 1}
				/>
				<rect x={n.x} y={n.y + 9} width={3} height={n.h - 18} rx={1.5} fill={accent} />
				<text x={n.x + 14} y={titleY} fontSize={11.5} fontWeight={600} fill={textPrimary}>
					{n.title}
				</text>
				{(n.sub ?? []).map((line, i) => (
					<text key={i} x={n.x + 14} y={n.y + 34 + i * 11.5} fontSize={8.5} fill={textSecondary}>
						{line}
					</text>
				))}
				<NodeChip node={n} />
			</g>
		);
	};

	const detail = selected && Object.prototype.hasOwnProperty.call(SENTENCIAS_DETAILS, selected) ? SENTENCIAS_DETAILS[selected] : undefined;

	const legend: { color: string; animated?: boolean; dashed?: boolean; label: string }[] = [
		{ color: BRAND_BLUE, animated: true, label: "escrituras al corpus (rs0)" },
		{ color: PRO_TEAL, animated: true, label: "embeddings / búsqueda vectorial" },
		{ color: LIVE_GREEN, label: "lectura directa a Mongo" },
		{ color: API_HOP, label: "lectura vía API (HTTP)" },
		{ color: PREMIUM_GOLD, label: "vía SAIJ" },
		{ color: STALE_AMBER, label: "desvío por OCR" },
	];

	return (
		<Stack spacing={2}>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<Box
					component="svg"
					viewBox="0 0 1400 500"
					onClick={() => setSelected(null)}
					sx={{ width: "100%", minWidth: 980, height: "auto", display: "block" }}
				>
					<defs>
						{[BRAND_BLUE, LIVE_GREEN, PRO_TEAL, STALE_AMBER, PREMIUM_GOLD, API_HOP, neutralEdge].map((color) => (
							<marker
								key={color}
								id={markerFor(color)}
								viewBox="0 0 10 10"
								refX="9"
								refY="5"
								markerWidth="6.5"
								markerHeight="6.5"
								orient="auto-start-reverse"
							>
								<path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
							</marker>
						))}
					</defs>

					{/* Encabezados de columna */}
					{COLUMNS.map((c) => (
						<text key={c.label} x={c.x} y={18} fontSize={9.5} fontWeight={700} letterSpacing={1.2} fill={colHeader}>
							{c.label}
						</text>
					))}

					{/* Aristas primero, para que los nodos queden encima */}
					{edges.map((e) => (
						<path
							key={e.id}
							d={e.d}
							fill="none"
							stroke={e.color}
							strokeWidth={1.5}
							strokeDasharray={e.dashed ? "5 4" : undefined}
							opacity={edgeOpacity(e)}
							markerEnd={`url(#${markerFor(e.color)})`}
							style={{ transition: "opacity 0.2s ease" }}
						>
							{e.animated && <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1.4s" repeatCount="indefinite" />}
							{e.animated && !e.dashed && <animate attributeName="stroke-dasharray" to="6 4" begin="0s" fill="freeze" dur="0.01s" />}
						</path>
					))}

					{LABELS.map((l) => (
						<LabelChip key={l.text} label={l} bg={paperBg} />
					))}

					{NODES.map(renderNode)}
				</Box>
			</Box>

			{/* Leyenda */}
			<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ px: 1 }}>
				{legend.map((l) => (
					<Stack key={l.label} direction="row" spacing={0.75} alignItems="center">
						<Box component="svg" viewBox="0 0 34 8" sx={{ width: 34, height: 8, display: "block" }}>
							<path
								d="M 0 4 L 34 4"
								stroke={l.color}
								strokeWidth={2}
								strokeDasharray={l.dashed ? "4 3" : l.animated ? "6 4" : undefined}
								fill="none"
							/>
						</Box>
						<Typography variant="caption" color="text.secondary">
							{l.label}
						</Typography>
					</Stack>
				))}
			</Stack>

			{/* Zona 2 — ficha del nodo seleccionado */}
			<Box
				sx={{
					p: 2,
					borderRadius: 2,
					border: `1px solid ${theme.palette.divider}`,
					bgcolor: alpha(theme.palette.primary.main, isDark ? 0.06 : 0.03),
					minHeight: 96,
				}}
			>
				{!detail ? (
					<Stack direction="row" spacing={1} alignItems="center">
						<InfoCircle size={18} color={theme.palette.text.secondary} />
						<Typography variant="body2" color="text.secondary">
							Hacé clic en cualquier worker, almacén o API para ver qué hace, en qué server vive y qué escribe.
						</Typography>
					</Stack>
				) : (
					<Grid container spacing={2}>
						<Grid item xs={12} md={5}>
							<Typography variant="subtitle1" fontWeight={600}>
								{detail.title}
							</Typography>
							<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
								<Chip size="small" variant="outlined" label={`server: ${detail.server}`} />
								<Chip size="small" variant="outlined" label={`PM2: ${detail.pm2}`} />
								<Chip size="small" variant="outlined" label={detail.frecuencia} />
							</Stack>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
								<strong>Escribe:</strong> {detail.escribe}
							</Typography>
							{detail.estado && (
								<Typography variant="caption" sx={{ display: "block", mt: 1, color: STALE_AMBER }}>
									{detail.estado}
								</Typography>
							)}
						</Grid>
						<Grid item xs={12} md={7}>
							<Typography variant="caption" color="text.secondary" fontWeight={700}>
								QUÉ HACE
							</Typography>
							<Box component="ol" sx={{ pl: 2.5, m: 0, mt: 0.5 }}>
								{detail.steps.map((s, i) => (
									<Typography key={i} component="li" variant="caption" color="text.secondary" sx={{ mb: 0.4 }}>
										{s}
									</Typography>
								))}
							</Box>
						</Grid>
					</Grid>
				)}
			</Box>
		</Stack>
	);
};

export default SentenciasFlow;
