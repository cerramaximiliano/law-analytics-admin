import React from "react";
import { useTheme } from "@mui/material";
import { JourneyMapData } from "api/journey";

// Mapa del recorrido en SVG: captación → registro → onboarding → conversión → cliente, con inactivo, activo_free y el
// carril de contenido/servicio al costado. Cada nodo es clickeable; los nodos del contacto buscado se resaltan.

export type JourneyNodeId =
	| "captacion"
	| "registro"
	| "onboarding"
	| "conversion"
	| "conversion:previsional"
	| "conversion:archivadas"
	| "conversion:tope"
	| "cliente"
	| "inactivo"
	| "activo_free"
	| "contenido";

interface Props {
	data: JourneyMapData;
	selected: JourneyNodeId | null;
	highlight: JourneyNodeId[];
	onSelect: (id: JourneyNodeId) => void;
}

const fmt = (n: number | undefined | null) => (n === undefined || n === null ? "—" : n.toLocaleString("es-AR"));
const sum = (list: Array<{ active: number }> = []) => list.reduce((a, c) => a + c.active, 0);

const JourneyMap: React.FC<Props> = ({ data, selected, highlight, onSelect }) => {
	const theme = useTheme();
	const dark = theme.palette.mode === "dark";
	const text = theme.palette.text.primary;
	const muted = theme.palette.text.secondary;
	const fill = dark ? theme.palette.grey[900] : "#ffffff";
	const t = data.types;

	const capCampaigns = Object.values(data.captacion.campaigns).flat();
	const capActive = capCampaigns.filter((c) => c.status === "active").length;
	const bucket = (key: string) => data.captacion.buckets.find((b) => b.key === key)?.count;
	const fuga = bucket("fuga") ?? 0;
	const stages = data.stages;
	const sub = stages.conversion.sub;
	const entradas = data.flows.entradas;

	interface NodeBox {
		id: JourneyNodeId;
		x: number;
		y: number;
		w: number;
		h: number;
		color: string;
		title: string;
		lines: string[];
		alert?: boolean;
	}

	const nodes: NodeBox[] = [
		{
			id: "captacion",
			x: 10,
			y: 40,
			w: 250,
			h: 230,
			color: t.captacion?.color || "#2563EB",
			title: "Captación",
			lines: [
				`${capActive} campañas activas`,
				...Object.entries(data.captacion.campaigns).map(([k, list]) => `${k}: ${list.length} · ${fmt(sum(list))} activos`),
				`No usuarios activos: ${fmt(data.captacion.nonUsersActive)}`,
				`En captación: ${fmt(bucket("en_captacion"))}`,
				`Fuga real: ${fmt(fuga)}`,
			],
			alert: fuga > 0,
		},
		{
			id: "registro",
			x: 305,
			y: 120,
			w: 120,
			h: 70,
			color: "#64748B",
			title: "Registro",
			lines: [`${fmt(data.flows.altas.total)} altas`, `últimos ${data.flows.windowDays} días`],
		},
		{
			id: "onboarding",
			x: 470,
			y: 40,
			w: 210,
			h: 150,
			color: t.onboarding?.color || "#16A34A",
			title: "Onboarding",
			lines: [
				`${fmt(stages.counts.onboarding?.total)} usuarios en la etapa`,
				`${fmt(stages.onboarding.en_campania)} en campaña`,
				`${fmt(stages.onboarding.sin_campania)} sin campaña`,
				`${(stages.onboarding.campaigns || []).filter((c) => c.status === "active").length} campañas activas`,
			],
			alert: (stages.onboarding.sin_campania ?? 0) > 0,
		},
		{
			id: "conversion",
			x: 725,
			y: 10,
			w: 255,
			h: 290,
			color: t.conversion?.color || "#7C3AED",
			title: "Conversión",
			lines: [`${fmt(stages.counts.conversion?.total)} usuarios · ${fmt(stages.conversion.en_campania)} en campaña`],
			alert: (stages.conversion.sin_campania ?? 0) > 0,
		},
		{
			id: "cliente",
			x: 1030,
			y: 120,
			w: 140,
			h: 70,
			color: "#0F766E",
			title: "Cliente",
			lines: [`${fmt(stages.cliente.total)} con plan pago`],
		},
		{
			id: "inactivo",
			x: 470,
			y: 330,
			w: 210,
			h: 90,
			color: t.reactivacion?.color || "#EA580C",
			title: "Inactivo · Reconquista",
			lines: [`${fmt(stages.counts.inactivo?.total)} usuarios`, `${fmt(stages.inactivo.en_campania)} en campaña`],
			alert: (stages.inactivo.sin_campania ?? 0) > 0,
		},
		{
			id: "activo_free",
			x: 725,
			y: 330,
			w: 255,
			h: 90,
			color: "#94A3B8",
			title: "Activo free",
			lines: [`${fmt(stages.activo_free.total)} usuarios`, "Sin campaña por diseño"],
		},
		{
			id: "contenido",
			x: 10,
			y: 330,
			w: 420,
			h: 90,
			color: t.contenido?.color || "#CA8A04",
			title: "Carril paralelo: contenido y servicio",
			lines: [
				`${data.lane.contenido.length} de contenido · ${data.lane.servicio.length} de servicio`,
				"No cuentan para la exclusividad; el coordinador limita el total",
			],
		},
	];

	const subBoxes: Array<{ id: JourneyNodeId; label: string; value: string; sinCampania: number | undefined; color: string }> = [
		{
			id: "conversion:previsional",
			label: "Previsional",
			value: `${fmt(stages.counts.conversion?.sub?.previsional)} · ${fmt(sub.previsional.en_campania)} en campaña`,
			sinCampania: sub.previsional.sin_campania,
			color: "#6D28D9",
		},
		{
			id: "conversion:archivadas",
			label: "Causas archivadas",
			value: `${fmt(stages.counts.conversion?.sub?.archivadas)} · ${fmt(sub.archivadas.en_campania)} en campaña`,
			sinCampania: sub.archivadas.sin_campania,
			color: "#7C3AED",
		},
		{
			id: "conversion:tope",
			label: "Tope de causas",
			value: `${fmt(stages.counts.conversion?.sub?.tope)} · ${fmt(sub.tope.en_campania)} en campaña`,
			sinCampania: sub.tope.sin_campania,
			color: "#8B5CF6",
		},
	];

	const isHighlighted = (id: JourneyNodeId) =>
		highlight.includes(id) || (id === "conversion" && highlight.some((h) => h.startsWith("conversion:")));

	const arrow = (x1: number, y1: number, x2: number, y2: number, label?: string) => (
		<g key={`${x1}-${y1}-${x2}-${y2}`}>
			<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={muted} strokeWidth={1.6} markerEnd="url(#arrow)" />
			{label && (
				<text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={11} fill={text} fontWeight={600}>
					{label}
				</text>
			)}
		</g>
	);

	return (
		<svg viewBox="0 0 1190 440" width="100%" role="img" aria-label="Mapa del recorrido del contacto" style={{ display: "block" }}>
			<defs>
				<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill={muted} />
				</marker>
			</defs>

			{arrow(260, 155, 305, 155, data.flows.altas.total ? fmt(data.flows.altas.total) : undefined)}
			{arrow(425, 155, 470, 115, entradas.onboarding !== undefined ? fmt(entradas.onboarding) : undefined)}
			{arrow(680, 115, 725, 115, entradas.conversion !== undefined ? fmt(entradas.conversion) : undefined)}
			{arrow(980, 155, 1030, 155, entradas.cliente !== undefined ? fmt(entradas.cliente) : undefined)}
			{arrow(580, 190, 580, 330, entradas.inactivo !== undefined ? fmt(entradas.inactivo) : undefined)}
			{arrow(680, 190, 725, 350, entradas.activo_free !== undefined ? fmt(entradas.activo_free) : undefined)}

			{nodes.map((n) => {
				const active = selected === n.id || (n.id === "conversion" && selected?.startsWith("conversion:"));
				const hl = isHighlighted(n.id);
				return (
					<g key={n.id} onClick={() => onSelect(n.id)} style={{ cursor: "pointer" }}>
						<rect
							x={n.x}
							y={n.y}
							width={n.w}
							height={n.h}
							rx={10}
							fill={fill}
							stroke={hl ? "#F59E0B" : n.color}
							strokeWidth={hl ? 4 : active ? 3 : 1.5}
						/>
						<rect x={n.x} y={n.y} width={n.w} height={26} rx={10} fill={n.color} opacity={0.18} />
						<text x={n.x + 10} y={n.y + 18} fontSize={13} fontWeight={700} fill={text}>
							{n.title}
						</text>
						{n.alert && (
							<g>
								<circle cx={n.x + n.w - 14} cy={n.y + 13} r={7} fill="#EF4444" />
								<text x={n.x + n.w - 14} y={n.y + 17} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
									!
								</text>
							</g>
						)}
						{n.lines.map((line, i) => (
							<text key={i} x={n.x + 10} y={n.y + 44 + i * 17} fontSize={11.5} fill={i === 0 ? text : muted}>
								{line.length > 44 ? `${line.slice(0, 43)}…` : line}
							</text>
						))}
						{n.id === "conversion" &&
							subBoxes.map((s, i) => {
								const y = n.y + 62 + i * 74;
								const subSel = selected === s.id;
								const subHl = highlight.includes(s.id);
								return (
									<g
										key={s.id}
										onClick={(e) => {
											e.stopPropagation();
											onSelect(s.id);
										}}
									>
										<rect
											x={n.x + 10}
											y={y}
											width={n.w - 20}
											height={64}
											rx={8}
											fill={fill}
											stroke={subHl ? "#F59E0B" : s.color}
											strokeWidth={subHl ? 4 : subSel ? 3 : 1.2}
										/>
										<text x={n.x + 20} y={y + 20} fontSize={12} fontWeight={700} fill={text}>
											{s.label}
										</text>
										<text x={n.x + 20} y={y + 38} fontSize={11} fill={muted}>
											{s.value}
										</text>
										<text x={n.x + 20} y={y + 54} fontSize={11} fill={(s.sinCampania ?? 0) > 0 ? "#EF4444" : muted}>
											{`${fmt(s.sinCampania)} sin campaña`}
										</text>
									</g>
								);
							})}
					</g>
				);
			})}
		</svg>
	);
};

export default JourneyMap;
