import React, { useState } from "react";
import {
	Alert,
	Box,
	Card,
	CardContent,
	Stack,
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, InfoCircle, TickCircle } from "iconsax-react";
import { BRAND_BLUE, LIVE_GREEN, LIVE_PULSE_KEYFRAMES } from "themes/dashboardTokens";

export type ReleaseStage = "beta" | "stable";

export interface ServiceAvailabilityCardProps {
	title: string;
	description: string;
	enabled: boolean;
	maintenanceMessage?: string | null;
	loading?: boolean;
	saving?: boolean;
	disabled?: boolean;
	editableMessage?: boolean;
	updatedAt?: string | null;
	updatedBy?: string | null;
	helperOff?: string;
	/** Si se provee, renderiza un toggle Beta/Estable. Solo para integraciones AI. */
	releaseStage?: ReleaseStage;
	onChangeReleaseStage?: (stage: ReleaseStage) => void;
	onToggle: (enabled: boolean) => void;
	onSaveMessage?: (message: string | null) => void;
}

const formatTs = (iso?: string | null) => {
	if (!iso) return null;
	try {
		return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
	} catch {
		return null;
	}
};

const ServiceAvailabilityCard: React.FC<ServiceAvailabilityCardProps> = ({
	title,
	description,
	enabled,
	maintenanceMessage,
	saving,
	disabled,
	editableMessage,
	updatedAt,
	updatedBy,
	helperOff,
	releaseStage,
	onChangeReleaseStage,
	onToggle,
	onSaveMessage,
}) => {
	const theme = useTheme();
	const [msgInput, setMsgInput] = useState<string>(maintenanceMessage || "");
	const [editing, setEditing] = useState(false);

	React.useEffect(() => {
		if (!editing) setMsgInput(maintenanceMessage || "");
	}, [maintenanceMessage, editing]);

	const accentColor = enabled ? BRAND_BLUE : theme.palette.warning.main;
	const ts = formatTs(updatedAt);

	return (
		<Card
			variant="outlined"
			sx={{
				bgcolor: alpha(accentColor, theme.palette.mode === "dark" ? 0.08 : 0.04),
				borderColor: alpha(accentColor, theme.palette.mode === "dark" ? 0.36 : 0.24),
				transition: "border-color 200ms ease, background-color 200ms ease",
				...LIVE_PULSE_KEYFRAMES,
			}}
		>
			<CardContent sx={{ py: 2 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
						{enabled ? (
							<Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
								<Box
									sx={{
										width: 10,
										height: 10,
										borderRadius: "50%",
										bgcolor: LIVE_GREEN,
										position: "relative",
										"&::after": {
											content: '""',
											position: "absolute",
											inset: 0,
											borderRadius: "50%",
											border: `1px solid ${LIVE_GREEN}`,
											animation: "la-live-pulse 2.4s ease-out infinite",
										},
									}}
								/>
							</Box>
						) : (
							<CloseCircle size={22} color={theme.palette.warning.main} variant="Bold" />
						)}
						<Box sx={{ minWidth: 0 }}>
							<Stack direction="row" alignItems="center" spacing={0.75}>
								<Typography variant="subtitle1" fontWeight={600} noWrap>
									{title}
								</Typography>
								<Typography
									variant="caption"
									sx={{
										px: 0.75,
										py: 0.125,
										borderRadius: 0.75,
										fontSize: "0.65rem",
										fontWeight: 600,
										letterSpacing: 0.4,
										textTransform: "uppercase",
										bgcolor: alpha(enabled ? LIVE_GREEN : theme.palette.warning.main, 0.12),
										color: enabled ? LIVE_GREEN : theme.palette.warning.main,
									}}
								>
									{enabled ? "Online" : "Off"}
								</Typography>
							</Stack>
							<Typography variant="caption" color="text.secondary">
								{description}
							</Typography>
						</Box>
					</Stack>
					<Switch
						checked={enabled}
						onChange={(e) => onToggle(e.target.checked)}
						color="info"
						disabled={disabled || saving}
						sx={{
							"& .MuiSwitch-switchBase.Mui-checked": { color: BRAND_BLUE },
							"& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: BRAND_BLUE },
						}}
					/>
				</Stack>

				{!enabled && helperOff && (
					<Alert severity="warning" variant="outlined" icon={<InfoCircle size={18} />} sx={{ mt: 2 }}>
						<Typography variant="body2">{helperOff}</Typography>
					</Alert>
				)}

				{editableMessage && (
					<Box sx={{ mt: 2 }}>
						<TextField
							fullWidth
							size="small"
							label="Mensaje de mantenimiento (opcional)"
							value={msgInput}
							onChange={(e) => {
								setEditing(true);
								setMsgInput(e.target.value);
							}}
							onBlur={() => {
								if (msgInput !== (maintenanceMessage || "")) {
									onSaveMessage?.(msgInput || null);
								}
								setEditing(false);
							}}
							placeholder="Volveremos en breve…"
							disabled={disabled || saving}
						/>
					</Box>
				)}

				{releaseStage && onChangeReleaseStage && (
					<Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
						<Tooltip
							title="Beta = chip 'Beta cerrada' + CTA 'Solicitar acceso'. Estable = chip 'Disponible' + CTA directo de conexión."
							placement="top"
							arrow
						>
							<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
								Estado de lanzamiento
							</Typography>
						</Tooltip>
						<ToggleButtonGroup
							value={releaseStage}
							exclusive
							size="small"
							onChange={(_, val) => {
								if (val && val !== releaseStage) onChangeReleaseStage(val as ReleaseStage);
							}}
							disabled={disabled || saving}
						>
							<ToggleButton value="beta" sx={{ py: 0.25, px: 1.5, fontSize: "0.7rem", fontWeight: 600 }}>
								Beta
							</ToggleButton>
							<ToggleButton value="stable" sx={{ py: 0.25, px: 1.5, fontSize: "0.7rem", fontWeight: 600 }}>
								Estable
							</ToggleButton>
						</ToggleButtonGroup>
					</Stack>
				)}

				{(ts || updatedBy) && (
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
						Última actualización: {ts || "—"}
						{updatedBy ? ` · ${updatedBy}` : ""}
					</Typography>
				)}
			</CardContent>
		</Card>
	);
};

export default ServiceAvailabilityCard;
