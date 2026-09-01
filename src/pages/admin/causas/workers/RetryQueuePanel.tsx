import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	LinearProgress,
	Stack,
	Tooltip,
	Typography,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import CausasPjnService from "api/causasPjn";

/**
 * Estado de la cola del retry worker.
 *
 * "Descartados" son los documentos que agotaron los reintentos configurados
 * (retryProgress.exhausted). Antes no existía ese corte y un documento con una
 * causa persistente se reintentaba indefinidamente, ocupando a los workers y
 * tapando a los que sí se podían recuperar.
 */

type Estado = {
	pendientes: number;
	agotados: number;
	porFuero: Record<string, { pendientes: number; agotados: number }>;
	updatedAt: string;
};

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
	CCF: "Civil y Com. Federal",
	CAF: "Contencioso Adm. Federal",
};

const RetryQueuePanel: React.FC = () => {
	const [data, setData] = useState<Estado | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await CausasPjnService.getRetryQueueStatus();
			setData(res.data);
		} catch (e: any) {
			setError(e?.message || "No se pudo obtener el estado de la cola");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);

	if (loading && !data) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return <Alert severity="error">{error}</Alert>;
	}

	if (!data) return null;

	const total = data.pendientes + data.agotados;
	const filas = Object.entries(data.porFuero)
		.filter(([, v]) => v.pendientes > 0 || v.agotados > 0)
		.sort((a, b) => b[1].pendientes + b[1].agotados - (a[1].pendientes + a[1].agotados));

	return (
		<Stack spacing={2}>
			<Stack direction="row" alignItems="center" justifyContent="space-between">
				<Box>
					<Typography variant="h5">Cola del retry worker</Typography>
					<Typography variant="caption" color="text.secondary">
						Expedientes con captcha fallido pendientes de reintento
					</Typography>
				</Box>
				<Tooltip title="Actualizar">
					<IconButton onClick={cargar} disabled={loading}>
						<Refresh size={20} />
					</IconButton>
				</Tooltip>
			</Stack>

			<Grid container spacing={2}>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography variant="caption" color="text.secondary">
								PENDIENTES
							</Typography>
							<Typography variant="h3">{data.pendientes.toLocaleString("es-AR")}</Typography>
							<Typography variant="caption" color="text.secondary">
								siguen siendo elegibles
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography variant="caption" color="text.secondary">
								DESCARTADOS
							</Typography>
							<Typography variant="h3" color={data.agotados > 0 ? "warning.main" : "text.primary"}>
								{data.agotados.toLocaleString("es-AR")}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								agotaron los reintentos
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography variant="caption" color="text.secondary">
								TOTAL CON ERROR
							</Typography>
							<Typography variant="h3">{total.toLocaleString("es-AR")}</Typography>
							<Typography variant="caption" color="text.secondary">
								{total > 0 ? `${((data.agotados / total) * 100).toFixed(1)}% descartado` : "sin documentos"}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			<Card>
				<CardContent>
					<Typography variant="subtitle1" gutterBottom>
						Por fuero
					</Typography>
					{filas.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Sin documentos en cola.
						</Typography>
					) : (
						<Stack spacing={2} sx={{ mt: 1 }}>
							{filas.map(([fuero, v]) => {
								const suma = v.pendientes + v.agotados;
								return (
									<Box key={fuero}>
										<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
											<Typography variant="body2">
												<b>{fuero}</b> — {FUERO_LABELS[fuero] || fuero}
											</Typography>
											<Stack direction="row" spacing={1}>
												<Chip
													size="small"
													label={`${v.pendientes.toLocaleString("es-AR")} pendientes`}
													color="primary"
													variant="outlined"
												/>
												{v.agotados > 0 && (
													<Chip
														size="small"
														label={`${v.agotados.toLocaleString("es-AR")} descartados`}
														color="warning"
														variant="outlined"
													/>
												)}
											</Stack>
										</Stack>
										<LinearProgress
											variant="determinate"
											value={suma > 0 ? (v.pendientes / suma) * 100 : 0}
											sx={{ height: 8, borderRadius: 1 }}
										/>
									</Box>
								);
							})}
						</Stack>
					)}
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
						Los descartados agotaron los reintentos configurados (<code>retry.maxRetries</code>) y ya no se vuelven a intentar. Sin ese
						corte, un documento con una causa persistente se reintentaba indefinidamente y tapaba a los recuperables.
					</Typography>
				</CardContent>
			</Card>
		</Stack>
	);
};

export default RetryQueuePanel;
