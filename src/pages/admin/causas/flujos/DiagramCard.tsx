// Card de un diagrama con navegación por pasos (Anterior/Siguiente + chips por paso
// + recuadro con el texto del paso). Reusable por cualquier FlowSpec con steps.
import { useState } from "react";
import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
import { BRAND_BLUE } from "themes/dashboardTokens";
import FlowDiagram from "./FlowDiagram";
import { FlowSpec } from "./flowTypes";

// Card de un diagrama con navegación por pasos
const DiagramCard = ({ spec }: { spec: FlowSpec }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [stepIndex, setStepIndex] = useState(0);
	const step = spec.steps[stepIndex];

	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary">
				{spec.intro}
			</Typography>

			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
				<Button
					size="small"
					variant="outlined"
					startIcon={<ArrowLeft2 size={14} />}
					disabled={stepIndex === 0}
					onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
				>
					Anterior
				</Button>
				<Button
					size="small"
					variant="outlined"
					endIcon={<ArrowRight2 size={14} />}
					disabled={stepIndex === spec.steps.length - 1}
					onClick={() => setStepIndex((i) => Math.min(spec.steps.length - 1, i + 1))}
				>
					Siguiente
				</Button>
				{spec.steps.map((s, i) => (
					<Chip
						key={i}
						size="small"
						label={`${i === 0 ? "" : `${i} · `}${s.title}`}
						onClick={() => setStepIndex(i)}
						color={i === stepIndex ? "primary" : "default"}
						variant={i === stepIndex ? "filled" : "outlined"}
						sx={{ fontSize: 11 }}
					/>
				))}
			</Stack>

			<FlowDiagram spec={spec} activeNodes={step.nodes} activeEdges={step.edges} />

			<Box
				sx={{
					px: 2,
					py: 1.5,
					borderRadius: 1.5,
					bgcolor: alpha(BRAND_BLUE, isDark ? 0.12 : 0.05),
					border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.3 : 0.16)}`,
				}}
			>
				<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
					{step.title}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					{step.text}
				</Typography>
			</Box>
		</Stack>
	);
};

export default DiagramCard;
