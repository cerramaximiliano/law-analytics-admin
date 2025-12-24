import React, { useState, useEffect } from "react";

// material-ui
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	Stack,
	Tab,
	Tabs,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";

// project imports
import { Segment, SegmentFilter, FilterOperator } from "types/segment";
import { SegmentSyncLog } from "types/segment-sync-log";
import { CloseCircle, Copy, Eye, DocumentCode, Clock } from "iconsax-react";
import { useSnackbar } from "notistack";
import { SegmentSyncLogService } from "store/reducers/segmentSyncLog";
import SyncHistoryList from "./SyncHistoryList";

// ==============================|| SEGMENT DETAIL MODAL ||============================== //

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div role="tabpanel" hidden={value !== index} id={`segment-detail-tabpanel-${index}`} aria-labelledby={`segment-detail-tab-${index}`} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

interface SegmentDetailModalProps {
	open: boolean;
	onClose: () => void;
	segment: Segment | null;
}

const SegmentDetailModal = ({ open, onClose, segment }: SegmentDetailModalProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [tabValue, setTabValue] = useState(0);

	// Sync history state
	const [syncLogs, setSyncLogs] = useState<SegmentSyncLog[]>([]);
	const [syncLogsLoading, setSyncLogsLoading] = useState(false);
	const [syncLogsError, setSyncLogsError] = useState<string | null>(null);
	const [syncLogsPagination, setSyncLogsPagination] = useState({
		total: 0,
		page: 1,
		limit: 10,
		pages: 0,
	});

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	// Load sync history when tab 2 is selected
	useEffect(() => {
		if (tabValue === 2 && segment?._id && syncLogs.length === 0) {
			loadSyncHistory(1);
		}
	}, [tabValue, segment?._id]);

	// Reset state when modal closes
	useEffect(() => {
		if (!open) {
			setTabValue(0);
			setSyncLogs([]);
			setSyncLogsError(null);
		}
	}, [open]);

	const loadSyncHistory = async (page: number) => {
		if (!segment?._id) return;

		setSyncLogsLoading(true);
		setSyncLogsError(null);

		try {
			const response = await SegmentSyncLogService.getSegmentHistory(segment._id, page, 10);
			if (response.success) {
				setSyncLogs(response.data);
				setSyncLogsPagination(response.pagination);
			}
		} catch (error: any) {
			setSyncLogsError(error?.message || "Error al cargar el historial de sincronización");
		} finally {
			setSyncLogsLoading(false);
		}
	};

	const handleSyncLogsPageChange = (page: number) => {
		loadSyncHistory(page);
	};

	const handleCopyJson = () => {
		if (segment) {
			navigator.clipboard.writeText(JSON.stringify(segment, null, 2));
			enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
		}
	};

	// Get type label and color
	const getTypeInfo = (type: string) => {
		switch (type) {
			case "static":
				return { label: "Estático", color: "primary" };
			case "dynamic":
				return { label: "Dinámico", color: "secondary" };
			case "compound":
				return { label: "Compuesto", color: "info" };
			default:
				return { label: type, color: "default" };
		}
	};

	// Get operator label in Spanish
	const getOperatorLabel = (operator: FilterOperator): string => {
		const labels: Record<FilterOperator, string> = {
			equals: "igual a",
			not_equals: "diferente de",
			contains: "contiene",
			not_contains: "no contiene",
			greater_than: "mayor que",
			less_than: "menor que",
			starts_with: "comienza con",
			ends_with: "termina con",
			exists: "existe",
			not_exists: "no existe",
			between: "entre",
			not_between: "no está entre",
			in: "está en",
			not_in: "no está en",
		};
		return labels[operator] || operator;
	};

	// Format filter value for display
	const formatFilterValue = (filter: SegmentFilter): string => {
		if (filter.operator === "exists" || filter.operator === "not_exists") {
			return "";
		}
		if (filter.values && filter.values.length > 0) {
			return `[${filter.values.join(", ")}]`;
		}
		if (filter.value !== undefined && filter.value !== null) {
			if (typeof filter.value === "object") {
				return JSON.stringify(filter.value);
			}
			return String(filter.value);
		}
		return "-";
	};

	// Format date
	const formatDate = (date: Date | string | undefined): string => {
		if (!date) return "-";
		return new Date(date).toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Format frequency
	const formatFrequency = (frequency: { value: number; unit: string } | undefined): string => {
		if (!frequency) return "-";
		const unitLabels: Record<string, string> = {
			minutes: "minutos",
			hours: "horas",
			days: "días",
		};
		return `${frequency.value} ${unitLabels[frequency.unit] || frequency.unit}`;
	};

	if (!segment) return null;

	const typeInfo = getTypeInfo(segment.type || "static");

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={2} alignItems="center">
						<Eye size={24} />
						<Typography variant="h5">Detalle del Segmento</Typography>
					</Stack>
					<IconButton onClick={onClose} size="small">
						<CloseCircle size={20} />
					</IconButton>
				</Stack>
			</DialogTitle>

			<Divider />

			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
				<Tabs value={tabValue} onChange={handleTabChange} aria-label="segment detail tabs">
					<Tab icon={<Eye size={18} />} iconPosition="start" label="Detalles" />
					<Tab icon={<Clock size={18} />} iconPosition="start" label="Historial Sync" />
					<Tab icon={<DocumentCode size={18} />} iconPosition="start" label="JSON (Raw)" />
				</Tabs>
			</Box>

			<DialogContent sx={{ minHeight: 400 }}>
				<TabPanel value={tabValue} index={0}>
					{/* Formatted Details View */}
					<Grid container spacing={3}>
						{/* Basic Information */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Información General
							</Typography>
							<Box
								sx={{
									p: 2,
									borderRadius: 1,
									bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[50],
								}}
							>
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="textSecondary">
											Nombre
										</Typography>
										<Typography variant="body1" fontWeight="medium">
											{segment.name}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="textSecondary">
											ID
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{segment._id || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="textSecondary">
											Descripción
										</Typography>
										<Typography variant="body1">{segment.description || "Sin descripción"}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Tipo
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip label={typeInfo.label} color={typeInfo.color as any} size="small" />
										</Box>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Estado
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip label={segment.isActive ? "Activo" : "Inactivo"} color={segment.isActive ? "success" : "default"} size="small" />
										</Box>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Contactos estimados
										</Typography>
										<Typography variant="h6">{segment.estimatedCount || 0}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Último cálculo
										</Typography>
										<Typography variant="body2">{formatDate(segment.lastCalculated)}</Typography>
									</Grid>
								</Grid>
							</Box>
						</Grid>

						{/* Conditions */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Condiciones
							</Typography>
							<Box
								sx={{
									p: 2,
									borderRadius: 1,
									bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[50],
								}}
							>
								{segment.conditions && segment.conditions.filters && segment.conditions.filters.length > 0 ? (
									<>
										<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
											<Typography variant="body2" color="textSecondary">
												Operador lógico:
											</Typography>
											<Chip
												label={segment.conditions.operator === "and" ? "Y (AND)" : "O (OR)"}
												size="small"
												variant="outlined"
												color="primary"
											/>
										</Stack>
										<Stack spacing={1.5}>
											{segment.conditions.filters.map((filter, index) => (
												<Box
													key={index}
													sx={{
														p: 1.5,
														borderRadius: 1,
														bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[700] : theme.palette.background.paper,
														border: 1,
														borderColor: "divider",
													}}
												>
													<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
														<Chip label={filter.field} size="small" color="info" variant="outlined" />
														<Typography variant="body2" color="primary" fontWeight="medium">
															{getOperatorLabel(filter.operator)}
														</Typography>
														{formatFilterValue(filter) && (
															<Typography
																variant="body2"
																sx={{
																	fontFamily: "monospace",
																	bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[100],
																	px: 1,
																	py: 0.25,
																	borderRadius: 0.5,
																}}
															>
																{formatFilterValue(filter)}
															</Typography>
														)}
													</Stack>
												</Box>
											))}
										</Stack>
									</>
								) : (
									<Typography variant="body2" color="textSecondary">
										No hay condiciones definidas (segmento estático)
									</Typography>
								)}
							</Box>
						</Grid>

						{/* Auto Update Settings */}
						<Grid item xs={12} sm={6}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Actualización Automática
							</Typography>
							<Box
								sx={{
									p: 2,
									borderRadius: 1,
									bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[50],
								}}
							>
								<Stack spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Typography variant="body2" color="textSecondary">
											Estado:
										</Typography>
										<Chip
											label={segment.autoUpdate?.enabled ? "Habilitada" : "Deshabilitada"}
											size="small"
											color={segment.autoUpdate?.enabled ? "success" : "default"}
										/>
									</Stack>
									{segment.autoUpdate?.enabled && (
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="body2" color="textSecondary">
												Frecuencia:
											</Typography>
											<Typography variant="body2">{formatFrequency(segment.autoUpdate?.frequency)}</Typography>
										</Stack>
									)}
								</Stack>
							</Box>
						</Grid>

						{/* Timestamps */}
						<Grid item xs={12} sm={6}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Fechas
							</Typography>
							<Box
								sx={{
									p: 2,
									borderRadius: 1,
									bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.grey[50],
								}}
							>
								<Stack spacing={1}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Typography variant="body2" color="textSecondary">
											Creado:
										</Typography>
										<Typography variant="body2">{formatDate(segment.createdAt)}</Typography>
									</Stack>
									<Stack direction="row" spacing={1} alignItems="center">
										<Typography variant="body2" color="textSecondary">
											Actualizado:
										</Typography>
										<Typography variant="body2">{formatDate(segment.updatedAt)}</Typography>
									</Stack>
									{segment.createdBy && (
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="body2" color="textSecondary">
												Creado por:
											</Typography>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
												{segment.createdBy}
											</Typography>
										</Stack>
									)}
								</Stack>
							</Box>
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={tabValue} index={1}>
					{/* Sync History View */}
					<Box>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Historial de Sincronización
						</Typography>
						<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
							Registro de las últimas sincronizaciones automáticas de este segmento con sus campañas asociadas.
						</Typography>
						<SyncHistoryList
							logs={syncLogs}
							loading={syncLogsLoading}
							error={syncLogsError}
							pagination={syncLogsPagination}
							onPageChange={handleSyncLogsPageChange}
							type="segment"
						/>
					</Box>
				</TabPanel>

				<TabPanel value={tabValue} index={2}>
					{/* Raw JSON View */}
					<Box sx={{ position: "relative" }}>
						<Tooltip title="Copiar JSON">
							<IconButton
								onClick={handleCopyJson}
								size="small"
								sx={{
									position: "absolute",
									top: 8,
									right: 8,
									bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[700] : theme.palette.grey[200],
									"&:hover": {
										bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[300],
									},
								}}
							>
								<Copy size={18} />
							</IconButton>
						</Tooltip>
						<Box
							component="pre"
							sx={{
								p: 2,
								borderRadius: 1,
								bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
								border: 1,
								borderColor: "divider",
								overflow: "auto",
								maxHeight: 500,
								fontFamily: "monospace",
								fontSize: "0.875rem",
								lineHeight: 1.5,
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
							}}
						>
							{JSON.stringify(segment, null, 2)}
						</Box>
					</Box>
				</TabPanel>
			</DialogContent>

			<Divider />

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={onClose} variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default SegmentDetailModal;
