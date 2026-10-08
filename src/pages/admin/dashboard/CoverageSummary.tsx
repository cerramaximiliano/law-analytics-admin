import React from "react";
import { Box, ButtonBase, LinearProgress, Paper, Skeleton, Typography, useTheme, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ArrowDown2, ArrowRight2 } from "iconsax-react";
import { BRAND_BLUE, headerBorder, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Resumen de cobertura por jurisdicción pensado para móvil: una fila por
// fuente (nombre, barra, %) en lugar de nueve tarjetas altas. El detalle
// completo queda detrás de un botón. Mismos umbrales de color que las
// tarjetas de detalle (>90 verde, >70 ámbar, resto rojo).
// ----------------------------------------------------------------------

export interface CoverageSummaryRow {
	label: string;
	/** null mientras carga o si la fuente no devolvió datos */
	percent: number | null;
	to: string;
}

interface CoverageSummaryProps {
	rows: CoverageSummaryRow[];
	loading: boolean;
	detailOpen: boolean;
	onToggleDetail: () => void;
}

const CoverageSummary: React.FC<CoverageSummaryProps> = ({ rows, loading, detailOpen, onToggleDetail }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const navigate = useNavigate();

	const colorFor = (percent: number) => (percent > 90 ? LIVE_GREEN : percent > 70 ? STALE_AMBER : theme.palette.error.main);

	return (
		<Paper
			elevation={0}
			sx={{
				display: { xs: "block", sm: "none" },
				mb: 1,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				overflow: "hidden",
			}}
		>
			{rows.map((row, index) => {
				const hasValue = row.percent !== null;
				const color = hasValue ? colorFor(row.percent as number) : theme.palette.text.disabled;
				return (
					<ButtonBase
						key={row.label}
						onClick={() => navigate(row.to)}
						sx={{
							width: "100%",
							minHeight: 48,
							px: 1.5,
							display: "grid",
							gridTemplateColumns: "84px 1fr 48px 16px",
							alignItems: "center",
							columnGap: 1.25,
							textAlign: "left",
							borderTop: index > 0 ? `1px solid ${headerBorder(isDark)}` : "none",
							transition: "background-color 200ms ease",
							"&:active": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.14 : 0.08) },
							"&:focus-visible": { outline: `2px solid ${BRAND_BLUE}`, outlineOffset: -2 },
						}}
					>
						<Typography variant="body2" fontWeight={600} noWrap sx={{ letterSpacing: "-0.005em" }}>
							{row.label}
						</Typography>
						{loading ? (
							<Skeleton variant="rounded" height={6} />
						) : (
							<LinearProgress
								variant="determinate"
								value={hasValue ? Math.min(100, Math.max(0, row.percent as number)) : 0}
								sx={{
									height: 6,
									borderRadius: 3,
									bgcolor: alpha(theme.palette.text.secondary, 0.16),
									"& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: color },
								}}
							/>
						)}
						<Typography variant="body2" fontWeight={700} sx={{ color, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
							{loading ? "…" : hasValue ? `${Math.round(row.percent as number)}%` : "—"}
						</Typography>
						<ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, opacity: 0.6 }} />
					</ButtonBase>
				);
			})}
			<ButtonBase
				onClick={onToggleDetail}
				aria-expanded={detailOpen}
				sx={{
					width: "100%",
					minHeight: 44,
					gap: 0.75,
					borderTop: `1px solid ${headerBorder(isDark)}`,
					color: BRAND_BLUE,
					fontSize: "0.8125rem",
					fontWeight: 600,
					"&:active": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.14 : 0.08) },
					"&:focus-visible": { outline: `2px solid ${BRAND_BLUE}`, outlineOffset: -2 },
				}}
			>
				{detailOpen ? "Ocultar detalle" : "Ver detalle por jurisdicción"}
				<Box sx={{ display: "flex", transition: "transform 240ms ease", transform: detailOpen ? "rotate(180deg)" : "none" }}>
					<ArrowDown2 size={14} />
				</Box>
			</ButtonBase>
		</Paper>
	);
};

export default CoverageSummary;
