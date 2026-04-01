import { alpha, Box, Button, CircularProgress, Divider, Paper, Stack, Switch, Tooltip, Typography, useTheme } from "@mui/material";
import { Pause, Play } from "iconsax-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkerProcess {
	/** Nombre visible del sub-proceso */
	label: string;
	/** Descripción corta (nombre del proceso PM2 o tipo) */
	description?: string;
	/** null = cargando, true/false = estado real */
	enabled: boolean | null;
	/** true mientras se está guardando este toggle */
	toggling?: boolean;
	onToggle: (val: boolean) => void;
}

interface WorkerControlPanelProps {
	processes: WorkerProcess[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorkerControlPanel({ processes }: WorkerControlPanelProps) {
	const theme = useTheme();

	const loaded = processes.filter(p => p.enabled !== null);
	const anyEnabled = loaded.some(p => p.enabled === true);
	const noneEnabled = loaded.length > 0 && loaded.every(p => p.enabled === false);
	const multiProcess = processes.length > 1;

	function stopAll() {
		processes.forEach(p => { if (p.enabled) p.onToggle(false); });
	}
	function startAll() {
		processes.forEach(p => { if (!p.enabled) p.onToggle(true); });
	}

	return (
		<Paper
			variant="outlined"
			sx={{
				borderRadius: 2,
				overflow: "hidden",
				bgcolor: alpha(theme.palette.primary.main, 0.015),
			}}
		>
			<Stack
				direction={{ xs: "column", sm: "row" }}
				alignItems="stretch"
				divider={<Divider orientation="vertical" flexItem />}
			>
				{/* ── Processes ── */}
				{processes.map((proc, idx) => {
					const isLoading = proc.enabled === null;
					const isOn = proc.enabled === true;

					return (
						<Stack
							key={idx}
							direction="row"
							alignItems="center"
							spacing={1.5}
							sx={{ flex: "1 1 0", px: 2.5, py: 1.5, minWidth: 0 }}
						>
							{/* Status dot */}
							<Box
								sx={{
									width: 9,
									height: 9,
									borderRadius: "50%",
									flexShrink: 0,
									transition: "all 0.3s ease",
									bgcolor: isLoading
										? theme.palette.action.disabled
										: isOn
											? theme.palette.success.main
											: alpha(theme.palette.text.primary, 0.2),
									boxShadow: isOn
										? `0 0 7px ${alpha(theme.palette.success.main, 0.55)}`
										: "none",
								}}
							/>

							{/* Label + description */}
							<Box flex={1} minWidth={0}>
								<Typography variant="body2" fontWeight={600} noWrap>
									{proc.label}
								</Typography>
								{proc.description && (
									<Typography variant="caption" color="text.secondary" noWrap display="block">
										{proc.description}
									</Typography>
								)}
							</Box>

							{/* Switch */}
							{isLoading || proc.toggling ? (
								<CircularProgress size={16} sx={{ flexShrink: 0 }} />
							) : (
								<Tooltip title={isOn ? "Deshabilitar" : "Habilitar"} placement="top">
									<Switch
										size="small"
										checked={isOn}
										onChange={e => proc.onToggle(e.target.checked)}
										color="success"
										sx={{ flexShrink: 0 }}
									/>
								</Tooltip>
							)}
						</Stack>
					);
				})}

				{/* ── Stop/Start all (sólo con múltiples procesos) ── */}
				{multiProcess && (
					<Stack justifyContent="center" sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
						{noneEnabled ? (
							<Button
								size="small"
								variant="outlined"
								color="success"
								startIcon={<Play size={15} />}
								onClick={startAll}
								sx={{ whiteSpace: "nowrap", textTransform: "none" }}
							>
								Iniciar todo
							</Button>
						) : (
							<Button
								size="small"
								variant="outlined"
								color="error"
								startIcon={<Pause size={15} />}
								onClick={stopAll}
								disabled={!anyEnabled}
								sx={{ whiteSpace: "nowrap", textTransform: "none" }}
							>
								Parar todo
							</Button>
						)}
					</Stack>
				)}
			</Stack>
		</Paper>
	);
}
