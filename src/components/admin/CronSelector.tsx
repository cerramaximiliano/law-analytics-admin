import React from "react";
import {
	Box,
	FormControl,
	FormHelperText,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";

interface CronPreset {
	label: string;
	value: string;
}

const PRESETS: CronPreset[] = [
	{ label: "Cada minuto", value: "* * * * *" },
	{ label: "Cada 5 minutos", value: "*/5 * * * *" },
	{ label: "Cada 10 minutos", value: "*/10 * * * *" },
	{ label: "Cada 15 minutos", value: "*/15 * * * *" },
	{ label: "Cada 30 minutos", value: "*/30 * * * *" },
	{ label: "Cada hora", value: "0 * * * *" },
	{ label: "Cada 2 horas", value: "0 */2 * * *" },
	{ label: "Cada 4 horas", value: "0 */4 * * *" },
	{ label: "Cada 6 horas", value: "0 */6 * * *" },
	{ label: "Cada 12 horas", value: "0 */12 * * *" },
	{ label: "1 vez por día (00:00)", value: "0 0 * * *" },
	{ label: "2 veces por día (8 y 20 h)", value: "0 8,20 * * *" },
	{ label: "Días hábiles, cada hora 9–18", value: "0 9-18 * * 1-5" },
];

const CUSTOM = "__custom__";

/**
 * Devuelve el label amigable para un cron, o null si no matchea ningún preset.
 * Útil para vistas read-only que quieren mostrar "Cada 5 minutos" en lugar
 * de la expresión cruda.
 */
export function getCronLabel(value: string | undefined | null): string | null {
	if (!value) return null;
	const preset = PRESETS.find((p) => p.value === value.trim());
	return preset ? preset.label : null;
}

interface CronSelectorProps {
	value: string;
	onChange: (newValue: string) => void;
	label?: string;
	helperText?: string;
	size?: "small" | "medium";
	fullWidth?: boolean;
}

function looksLikeCron(v: string): boolean {
	if (!v) return false;
	const parts = v.trim().split(/\s+/);
	return parts.length === 5 || parts.length === 6;
}

const CronSelector: React.FC<CronSelectorProps> = ({
	value,
	onChange,
	label = "Cron",
	helperText,
	size = "small",
	fullWidth = true,
}) => {
	const theme = useTheme();
	const matched = PRESETS.find((p) => p.value === value);
	const selectValue = matched ? matched.value : CUSTOM;
	const showCustomInput = !matched;
	const valid = looksLikeCron(value);

	const handleSelectChange = (newValue: string) => {
		if (newValue === CUSTOM) {
			// Mantener el valor actual; el TextField permite editar.
			// Si el valor coincide exactamente con un preset, lo "ensuciamos" mínimamente
			// para que el select se quede en Personalizado.
			if (matched) onChange(value + " ");
			return;
		}
		onChange(newValue);
	};

	return (
		<Stack spacing={1} sx={{ width: fullWidth ? "100%" : undefined }}>
			<FormControl size={size} fullWidth={fullWidth}>
				<InputLabel>{label}</InputLabel>
				<Select label={label} value={selectValue} onChange={(e) => handleSelectChange(e.target.value as string)}>
					{PRESETS.map((p) => (
						<MenuItem key={p.value} value={p.value}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
								<span>{p.label}</span>
								<Typography
									component="span"
									variant="caption"
									color="text.secondary"
									sx={{ ml: "auto", fontFamily: "monospace", fontSize: "0.7rem" }}
								>
									{p.value}
								</Typography>
							</Stack>
						</MenuItem>
					))}
					<MenuItem value={CUSTOM}>
						<Typography component="span" sx={{ fontStyle: "italic" }}>
							Personalizado…
						</Typography>
					</MenuItem>
				</Select>
				{helperText && <FormHelperText>{helperText}</FormHelperText>}
			</FormControl>

			{showCustomInput && (
				<TextField
					size={size}
					fullWidth={fullWidth}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="ej: 0 */4 * * *"
					InputProps={{ sx: { fontFamily: "monospace" } }}
					helperText="Formato: min · hora · día-mes · mes · día-semana (5 campos)"
				/>
			)}

			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 1,
					px: 1,
				}}
			>
				<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
					Expresión:
				</Typography>
				<Typography
					component="code"
					variant="caption"
					sx={{
						fontFamily: "monospace",
						bgcolor: theme.palette.action.hover,
						px: 0.75,
						py: 0.2,
						borderRadius: 0.5,
						color: valid ? theme.palette.text.primary : theme.palette.warning.main,
					}}
				>
					{value || "—"}
				</Typography>
				{!valid && value.trim().length > 0 && (
					<Typography variant="caption" color="warning.main">
						formato cron inválido (5 campos esperados)
					</Typography>
				)}
			</Box>
		</Stack>
	);
};

export default CronSelector;
