import React, { useState } from "react";
import { Alert, Box, Card, CardContent, Stack, Switch, TextField, Typography, alpha, useTheme } from "@mui/material";
import { CloseCircle, InfoCircle, TickCircle } from "iconsax-react";

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
	onToggle,
	onSaveMessage,
}) => {
	const theme = useTheme();
	const [msgInput, setMsgInput] = useState<string>(maintenanceMessage || "");
	const [editing, setEditing] = useState(false);

	React.useEffect(() => {
		if (!editing) setMsgInput(maintenanceMessage || "");
	}, [maintenanceMessage, editing]);

	const accent = enabled ? theme.palette.info : theme.palette.warning;
	const ts = formatTs(updatedAt);

	return (
		<Card
			variant="outlined"
			sx={{
				bgcolor: alpha(accent.main, 0.05),
				borderColor: alpha(accent.main, 0.3),
			}}
		>
			<CardContent sx={{ py: 2 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
						{enabled ? (
							<TickCircle size={26} color={theme.palette.info.main} variant="Bold" />
						) : (
							<CloseCircle size={26} color={theme.palette.warning.main} variant="Bold" />
						)}
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="subtitle1" fontWeight="bold" noWrap>
								{title}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{description}
							</Typography>
						</Box>
					</Stack>
					<Switch checked={enabled} onChange={(e) => onToggle(e.target.checked)} color="info" disabled={disabled || saving} />
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
