import React from "react";
import {
	Box,
	Chip,
	CircularProgress,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	useTheme,
	Alert,
	Pagination,
} from "@mui/material";
import { Add, Minus, Clock, TickCircle, CloseCircle, Warning2 } from "iconsax-react";
import { SegmentSyncLog } from "types/segment-sync-log";

interface SyncHistoryListProps {
	logs: SegmentSyncLog[];
	loading: boolean;
	error: string | null;
	pagination?: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
	onPageChange?: (page: number) => void;
	type: "segment" | "campaign";
}

const SyncHistoryList: React.FC<SyncHistoryListProps> = ({
	logs,
	loading,
	error,
	pagination,
	onPageChange,
	type,
}) => {
	const theme = useTheme();

	// Format date
	const formatDate = (dateString?: string | null): string => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Get status icon and color
	const getStatusInfo = (status: string) => {
		switch (status) {
			case "completed":
				return {
					icon: <TickCircle size={16} variant="Bold" />,
					color: "success" as const,
					label: "Completado",
				};
			case "failed":
				return {
					icon: <CloseCircle size={16} variant="Bold" />,
					color: "error" as const,
					label: "Fallido",
				};
			case "started":
				return {
					icon: <Clock size={16} variant="Bold" />,
					color: "info" as const,
					label: "En proceso",
				};
			case "skipped":
				return {
					icon: <Warning2 size={16} variant="Bold" />,
					color: "warning" as const,
					label: "Omitido",
				};
			default:
				return {
					icon: <Clock size={16} />,
					color: "default" as const,
					label: status,
				};
		}
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
				<CircularProgress size={32} />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ my: 2 }}>
				{error}
			</Alert>
		);
	}

	if (!logs || logs.length === 0) {
		return (
			<Box sx={{ py: 4, textAlign: "center" }}>
				<Typography variant="body2" color="textSecondary">
					No hay registros de sincronización
				</Typography>
			</Box>
		);
	}

	return (
		<Box>
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Fecha</TableCell>
							{type === "segment" && <TableCell>Tipo</TableCell>}
							{type === "segment" && <TableCell>Campaña</TableCell>}
							{type === "campaign" && <TableCell>Segmento</TableCell>}
							<TableCell align="center">Agregados</TableCell>
							<TableCell align="center">Removidos</TableCell>
							<TableCell align="center">Estado</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{logs.map((log) => {
							const statusInfo = getStatusInfo(log.status);
							return (
								<TableRow
									key={log._id}
									sx={{
										"&:hover": {
											bgcolor:
												theme.palette.mode === "dark"
													? theme.palette.grey[800]
													: theme.palette.grey[50],
										},
									}}
								>
									<TableCell>
										<Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
											{formatDate(log.completedAt || log.createdAt)}
										</Typography>
									</TableCell>
									{type === "segment" && (
										<TableCell>
											<Chip
												label={log.type === "segment" ? "Segmento" : "Campaña"}
												size="small"
												variant="outlined"
												color={log.type === "segment" ? "info" : "primary"}
											/>
										</TableCell>
									)}
									{type === "segment" && (
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												{log.campaignName || "-"}
											</Typography>
										</TableCell>
									)}
									{type === "campaign" && (
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												{log.segmentName || "-"}
											</Typography>
										</TableCell>
									)}
									<TableCell align="center">
										{log.metrics?.contactsAdded !== undefined ||
										log.metrics?.contactsMatched !== undefined ? (
											<Stack
												direction="row"
												spacing={0.5}
												alignItems="center"
												justifyContent="center"
											>
												<Add
													size={14}
													color={theme.palette.success.main}
												/>
												<Typography
													variant="body2"
													color="success.main"
													fontWeight="medium"
												>
													{log.type === "segment"
														? log.metrics?.contactsMatched || 0
														: log.metrics?.contactsAdded || 0}
												</Typography>
											</Stack>
										) : (
											<Typography variant="body2" color="textSecondary">
												-
											</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										{log.metrics?.contactsRemoved !== undefined ? (
											<Stack
												direction="row"
												spacing={0.5}
												alignItems="center"
												justifyContent="center"
											>
												<Minus
													size={14}
													color={theme.palette.error.main}
												/>
												<Typography
													variant="body2"
													color="error.main"
													fontWeight="medium"
												>
													{log.metrics?.contactsRemoved || 0}
												</Typography>
											</Stack>
										) : (
											<Typography variant="body2" color="textSecondary">
												-
											</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										<Chip
											icon={statusInfo.icon}
											label={statusInfo.label}
											size="small"
											color={statusInfo.color}
											variant="outlined"
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>

			{pagination && pagination.pages > 1 && onPageChange && (
				<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
					<Pagination
						count={pagination.pages}
						page={pagination.page}
						onChange={(_, page) => onPageChange(page)}
						color="primary"
						size="small"
					/>
				</Box>
			)}
		</Box>
	);
};

export default SyncHistoryList;
