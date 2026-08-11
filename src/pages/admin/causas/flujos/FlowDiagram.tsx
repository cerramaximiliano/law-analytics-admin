import { useMemo } from "react";
import { Box, useMediaQuery } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";
import { FlowSpec, FlowNode, NodeKind, EdgeKind, Side } from "./flowTypes";

// Paleta por tipo de nodo. `solid` es el color de borde/acentos, el fondo se
// deriva con alpha según el modo del tema.
const KIND_COLOR: Record<NodeKind, string> = {
	actor: BRAND_BLUE,
	hub: BRAND_BLUE,
	public: STALE_AMBER,
	private: "#8B5CF6",
	db: "#64748B",
	ext: "#64748B",
	ui: BRAND_BLUE,
	ok: LIVE_GREEN,
	warn: "#F97316",
	bad: "#EF4444",
};

const EDGE_COLOR: Record<EdgeKind, string> = {
	normal: "#64748B",
	ok: LIVE_GREEN,
	handoff: "#8B5CF6",
	problem: "#EF4444",
};

const DASHED_NODE_KINDS: NodeKind[] = ["ext", "ui", "warn"];
const DASHED_EDGE_KINDS: EdgeKind[] = ["handoff", "problem"];

interface Anchor {
	x: number;
	y: number;
	nx: number;
	ny: number;
}

const anchorOf = (n: FlowNode, side: Side): Anchor => {
	switch (side) {
		case "left":
			return { x: n.x, y: n.y + n.h / 2, nx: -1, ny: 0 };
		case "right":
			return { x: n.x + n.w, y: n.y + n.h / 2, nx: 1, ny: 0 };
		case "top":
			return { x: n.x + n.w / 2, y: n.y, nx: 0, ny: -1 };
		case "bottom":
			return { x: n.x + n.w / 2, y: n.y + n.h, nx: 0, ny: 1 };
	}
};

const autoSides = (a: FlowNode, b: FlowNode): [Side, Side] => {
	const dx = b.x + b.w / 2 - (a.x + a.w / 2);
	const dy = b.y + b.h / 2 - (a.y + a.h / 2);
	if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? ["right", "left"] : ["left", "right"];
	return dy > 0 ? ["bottom", "top"] : ["top", "bottom"];
};

interface FlowDiagramProps {
	spec: FlowSpec;
	activeNodes?: string[];
	activeEdges?: string[];
}

const FlowDiagram = ({ spec, activeNodes, activeEdges }: FlowDiagramProps) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

	const nodeById = useMemo(() => {
		const map = new Map<string, FlowNode>();
		spec.nodes.forEach((n) => map.set(n.id, n));
		return map;
	}, [spec]);

	const isNodeActive = (id: string) => !activeNodes || activeNodes.includes(id);
	const isEdgeActive = (id: string) => !activeEdges || activeEdges.includes(id);

	const textPrimary = theme.palette.text.primary;
	const textSecondary = theme.palette.text.secondary;
	const halo = theme.palette.background.paper;

	return (
		<Box sx={{ overflowX: "auto", width: "100%" }}>
			<Box
				component="svg"
				viewBox={`0 0 ${spec.width} ${spec.height}`}
				sx={{ width: "100%", minWidth: 760, height: "auto", display: "block", fontFamily: theme.typography.fontFamily }}
			>
				<defs>
					{(Object.keys(EDGE_COLOR) as EdgeKind[]).map((kind) => (
						<marker
							key={kind}
							id={`arrow-${spec.id}-${kind}`}
							markerWidth="9"
							markerHeight="9"
							refX="7.5"
							refY="4.5"
							orient="auto"
							markerUnits="userSpaceOnUse"
						>
							<path d="M0,0 L9,4.5 L0,9 z" fill={EDGE_COLOR[kind]} />
						</marker>
					))}
				</defs>

				{/* Aristas */}
				{spec.edges.map((edge, idx) => {
					const from = nodeById.get(edge.from);
					const to = nodeById.get(edge.to);
					if (!from || !to) return null;
					const kind = edge.kind ?? "normal";
					const [autoFrom, autoTo] = autoSides(from, to);
					const p1 = anchorOf(from, edge.fromSide ?? autoFrom);
					const p2 = anchorOf(to, edge.toSide ?? autoTo);
					const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
					const k = Math.min(110, Math.max(36, dist * 0.35));
					const c1 = { x: p1.x + p1.nx * k, y: p1.y + p1.ny * k };
					const c2 = { x: p2.x + p2.nx * k, y: p2.y + p2.ny * k };
					const d = `M ${p1.x},${p1.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
					// Punto medio de la Bézier cúbica en t=0.5 para la etiqueta
					const mx = (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8 + (edge.labelDx ?? 0);
					const my = (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8 + (edge.labelDy ?? 0);
					const active = isEdgeActive(edge.id);
					const color = EDGE_COLOR[kind];
					const pathId = `fp-${spec.id}-${edge.id}`;
					return (
						<g key={edge.id} opacity={active ? 1 : 0.15} style={{ transition: "opacity 0.35s ease" }}>
							<path
								id={pathId}
								d={d}
								fill="none"
								stroke={alpha(color, isDark ? 0.85 : 0.7)}
								strokeWidth={1.7}
								strokeDasharray={DASHED_EDGE_KINDS.includes(kind) ? "6 4" : undefined}
								markerEnd={`url(#arrow-${spec.id}-${kind})`}
							/>
							{edge.label && (
								<text
									x={mx}
									y={my}
									textAnchor="middle"
									fontSize={10.5}
									fontWeight={600}
									fill={kind === "normal" ? textSecondary : color}
									stroke={halo}
									strokeWidth={3.5}
									paintOrder="stroke"
								>
									{edge.label}
								</text>
							)}
							{active && !reducedMotion && (
								<circle r={3.5} fill={color} opacity={0.9}>
									<animateMotion dur="3.2s" repeatCount="indefinite" begin={`${(idx % 5) * 0.55}s`}>
										<mpath href={`#${pathId}`} />
									</animateMotion>
								</circle>
							)}
						</g>
					);
				})}

				{/* Nodos */}
				{spec.nodes.map((node) => {
					const color = KIND_COLOR[node.kind];
					const active = isNodeActive(node.id);
					const subs = node.sub ?? [];
					const blockHeight = 16 + subs.length * 13;
					const startY = node.y + (node.h - blockHeight) / 2 + 12;
					const filled = node.kind === "hub";
					return (
						<g key={node.id} opacity={active ? 1 : 0.18} style={{ transition: "opacity 0.35s ease" }}>
							<rect
								x={node.x}
								y={node.y}
								width={node.w}
								height={node.h}
								rx={10}
								fill={filled ? alpha(color, isDark ? 0.4 : 0.14) : alpha(color, isDark ? 0.14 : 0.06)}
								stroke={alpha(color, isDark ? 0.75 : 0.55)}
								strokeWidth={1.5}
								strokeDasharray={DASHED_NODE_KINDS.includes(node.kind) ? "5 4" : undefined}
							/>
							<text x={node.x + node.w / 2} y={startY} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={textPrimary}>
								{node.label}
							</text>
							{subs.map((line, i) => (
								<text key={i} x={node.x + node.w / 2} y={startY + 16 + i * 13} textAnchor="middle" fontSize={10.5} fill={textSecondary}>
									{line}
								</text>
							))}
						</g>
					);
				})}
			</Box>
		</Box>
	);
};

export default FlowDiagram;
