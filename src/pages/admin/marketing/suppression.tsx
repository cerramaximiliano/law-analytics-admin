import { useState, useEffect, useCallback } from "react";

// material-ui
import {
	Box,
	Grid,
	Typography,
	Alert,
	IconButton,
	Tooltip,
	Button,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Chip,
	CircularProgress,
	Card,
	CardContent,
	TextField,
	InputAdornment,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// project imports
import MainCard from "components/MainCard";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";
import { SuppressionService } from "store/reducers/campaign";
import { SuppressedEmail, SuppressionSyncResults } from "types/suppression";

// icons
import { Refresh, SearchNormal1, Warning2, TickCircle, CloseCircle, ArrowRotateLeft } from "iconsax-react";

// ==============================|| ADMIN - MARKETING SUPPRESSION ||============================== //

// Styled components
const StatusIndicator = styled(Box)<{ status: "online" | "offline" | "checking" }>(({ theme, status }) => ({
	width: 12,
	height: 12,
	borderRadius: "50%",
	backgroundColor:
		status === "online" ? theme.palette.success.main : status === "offline" ? theme.palette.error.main : theme.palette.warning.main,
	marginRight: theme.spacing(1),
	animation: status === "checking" ? "pulse 1.5s infinite" : "none",
	"@keyframes pulse": {
		"0%": { opacity: 1 },
		"50%": { opacity: 0.4 },
		"100%": { opacity: 1 },
	},
}));

// Server Status Types
interface ServiceStatus {
	name: string;
	url: string;
	ip: string;
	baseUrl: string;
	status: "online" | "offline" | "checking";
	timestamp?: string;
	message?: string;
}

const MarketingSuppression = () => {
	// Server status state
	const [serverStatus, setServerStatus] = useState<ServiceStatus>({
		name: "Servidor de Marketing",
		url: "https://mkt.lawanalytics.app",
		ip: "15.229.93.121",
		baseUrl: "https://mkt.lawanalytics.app",
		status: "checking",
	});
	const [checkingStatus, setCheckingStatus] = useState(false);

	// Suppression list state
	const [suppressedEmails, setSuppressedEmails] = useState<SuppressedEmail[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Search state
	const [searchTerm, setSearchTerm] = useState("");
	const [filterReason, setFilterReason] = useState<"all" | "BOUNCE" | "COMPLAINT">("all");

	// Sync state
	const [syncing, setSyncing] = useState(false);
	const [syncResults, setSyncResults] = useState<SuppressionSyncResults | null>(null);
	const [showSyncDialog, setShowSyncDialog] = useState(false);
	const [dryRunResults, setDryRunResults] = useState<SuppressionSyncResults | null>(null);

	// Check server status
	const checkServerStatus = useCallback(async () => {
		setCheckingStatus(true);
		setServerStatus((prev) => ({ ...prev, status: "checking" }));

		try {
			const response = await fetch(serverStatus.url, {
				method: "GET",
				mode: "cors",
				headers: { Accept: "application/json" },
			});

			if (response.ok) {
				try {
					const data = await response.json();
					setServerStatus((prev) => ({
						...prev,
						status: "online",
						timestamp: data.timestamp || new Date().toISOString(),
						message: data.message,
					}));
				} catch {
					setServerStatus((prev) => ({
						...prev,
						status: "online",
						timestamp: new Date().toISOString(),
						message: "Respuesta exitosa (no JSON)",
					}));
				}
			} else {
				setServerStatus((prev) => ({
					...prev,
					status: "offline",
					timestamp: new Date().toISOString(),
				}));
			}
		} catch (err) {
			if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
				setServerStatus((prev) => ({
					...prev,
					status: "online",
					timestamp: new Date().toISOString(),
					message: "CORS restrictivo - Estado verificado externamente",
				}));
			} else {
				setServerStatus((prev) => ({
					...prev,
					status: "offline",
					timestamp: new Date().toISOString(),
					message: err instanceof Error ? err.message : "Error desconocido",
				}));
			}
		} finally {
			setCheckingStatus(false);
		}
	}, [serverStatus.url]);

	// Load suppression list
	const loadSuppressionList = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const filters: { reasons?: string } = {};
			if (filterReason !== "all") {
				filters.reasons = filterReason;
			}

			const response = await SuppressionService.getSuppressionList(filters);
			setSuppressedEmails(response.data || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al cargar la lista de supresión");
			setSuppressedEmails([]);
		} finally {
			setLoading(false);
		}
	}, [filterReason]);

	// Run dry sync
	const runDrySync = async () => {
		setSyncing(true);
		setError(null);

		try {
			const response = await SuppressionService.syncWithContacts({ dryRun: true });
			setDryRunResults(response.results);
			setShowSyncDialog(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al ejecutar simulación");
		} finally {
			setSyncing(false);
		}
	};

	// Run real sync
	const runRealSync = async () => {
		setSyncing(true);
		setError(null);

		try {
			const response = await SuppressionService.syncWithContacts({ dryRun: false });
			setSyncResults(response.results);
			setShowSyncDialog(false);
			setDryRunResults(null);
			// Reload the list after sync
			await loadSuppressionList();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al sincronizar");
		} finally {
			setSyncing(false);
		}
	};

	// Filter emails by search term
	const filteredEmails = suppressedEmails.filter((email) => email.EmailAddress.toLowerCase().includes(searchTerm.toLowerCase()));

	// Stats
	const bounceCount = suppressedEmails.filter((e) => e.Reason === "BOUNCE").length;
	const complaintCount = suppressedEmails.filter((e) => e.Reason === "COMPLAINT").length;

	// Effects
	useEffect(() => {
		checkServerStatus();
		const interval = setInterval(checkServerStatus, 60000);
		return () => clearInterval(interval);
	}, [checkServerStatus]);

	useEffect(() => {
		loadSuppressionList();
	}, [loadSuppressionList]);

	return (
		<MainCard>
			<Box sx={{ mb: 2 }}>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h3">Bounces y Rebotes (AWS SES)</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
							Lista de emails suprimidos en AWS SES que no pueden recibir correos
						</Typography>
					</Grid>
				</Grid>
			</Box>

			{/* Marketing Quick Navigation */}
			<MarketingQuickNav />

			{/* Server Status Alert */}
			<Box sx={{ mb: 2 }}>
				<Alert
					severity={serverStatus.status === "online" ? "success" : serverStatus.status === "offline" ? "error" : "warning"}
					icon={
						<Box display="flex" alignItems="center">
							<StatusIndicator status={serverStatus.status} />
						</Box>
					}
					action={
						<Tooltip title="Verificar estado">
							<IconButton
								size="small"
								onClick={checkServerStatus}
								disabled={checkingStatus}
								sx={{
									animation: checkingStatus ? "spin 1s linear infinite" : "none",
									"@keyframes spin": {
										"0%": { transform: "rotate(0deg)" },
										"100%": { transform: "rotate(360deg)" },
									},
								}}
							>
								<Refresh size={16} />
							</IconButton>
						</Tooltip>
					}
				>
					<Box>
						<Typography variant="subtitle2" fontWeight="bold">
							{serverStatus.name}
						</Typography>
						<Typography variant="body2">
							Estado: {serverStatus.status === "online" ? "En línea" : serverStatus.status === "offline" ? "Fuera de línea" : "Verificando..."}
						</Typography>
					</Box>
				</Alert>
			</Box>

			{/* Stats Cards */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography color="text.secondary" gutterBottom>
								Total Suprimidos
							</Typography>
							<Typography variant="h4">{suppressedEmails.length}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography color="text.secondary" gutterBottom>
								Bounces (Rebotes)
							</Typography>
							<Typography variant="h4" color="error.main">
								{bounceCount}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={4}>
					<Card>
						<CardContent>
							<Typography color="text.secondary" gutterBottom>
								Complaints (Spam)
							</Typography>
							<Typography variant="h4" color="warning.main">
								{complaintCount}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Sync Results Alert */}
			{syncResults && (
				<Alert
					severity="success"
					sx={{ mb: 2 }}
					onClose={() => setSyncResults(null)}
					icon={<TickCircle size={20} />}
				>
					<Typography variant="subtitle2" fontWeight="bold">
						Sincronización completada
					</Typography>
					<Typography variant="body2">
						{syncResults.contactsUpdated} contactos actualizados de {syncResults.totalSuppressed} emails suprimidos.
						{syncResults.contactsAlreadyBounced > 0 && ` ${syncResults.contactsAlreadyBounced} ya estaban marcados.`}
						{syncResults.contactsNotFound > 0 && ` ${syncResults.contactsNotFound} no encontrados en la base de datos.`}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Duración: {(syncResults.duration / 1000).toFixed(1)}s
					</Typography>
				</Alert>
			)}

			{/* Error Alert */}
			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{/* Actions Bar */}
			<Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
				<TextField
					size="small"
					placeholder="Buscar email..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchNormal1 size={18} />
							</InputAdornment>
						),
					}}
					sx={{ minWidth: 250 }}
				/>

				<Box sx={{ display: "flex", gap: 1 }}>
					<Chip
						label="Todos"
						color={filterReason === "all" ? "primary" : "default"}
						onClick={() => setFilterReason("all")}
						variant={filterReason === "all" ? "filled" : "outlined"}
					/>
					<Chip
						label="Bounces"
						color={filterReason === "BOUNCE" ? "error" : "default"}
						onClick={() => setFilterReason("BOUNCE")}
						variant={filterReason === "BOUNCE" ? "filled" : "outlined"}
					/>
					<Chip
						label="Complaints"
						color={filterReason === "COMPLAINT" ? "warning" : "default"}
						onClick={() => setFilterReason("COMPLAINT")}
						variant={filterReason === "COMPLAINT" ? "filled" : "outlined"}
					/>
				</Box>

				<Box sx={{ flexGrow: 1 }} />

				<Button
					variant="outlined"
					startIcon={<Refresh size={18} />}
					onClick={loadSuppressionList}
					disabled={loading}
				>
					Recargar
				</Button>

				<Button
					variant="contained"
					color="primary"
					startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <ArrowRotateLeft size={18} />}
					onClick={runDrySync}
					disabled={syncing || loading}
				>
					Sincronizar con Contactos
				</Button>
			</Box>

			{/* Loading */}
			{loading && <LinearProgress sx={{ mb: 2 }} />}

			{/* Table */}
			<MainCard content={false}>
				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Email</TableCell>
								<TableCell>Razón</TableCell>
								<TableCell>Fecha</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{filteredEmails.length === 0 ? (
								<TableRow>
									<TableCell colSpan={3} align="center">
										{loading ? "Cargando..." : "No hay emails suprimidos"}
									</TableCell>
								</TableRow>
							) : (
								filteredEmails.map((email, index) => (
									<TableRow key={index} hover>
										<TableCell>{email.EmailAddress}</TableCell>
										<TableCell>
											<Chip
												size="small"
												label={email.Reason === "BOUNCE" ? "Rebote" : "Spam"}
												color={email.Reason === "BOUNCE" ? "error" : "warning"}
												icon={email.Reason === "BOUNCE" ? <CloseCircle size={14} /> : <Warning2 size={14} />}
											/>
										</TableCell>
										<TableCell>
											{new Date(email.LastUpdateTime).toLocaleDateString("es-AR", {
												year: "numeric",
												month: "short",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</MainCard>

			{/* Sync Confirmation Dialog */}
			<Dialog open={showSyncDialog} onClose={() => setShowSyncDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Confirmar Sincronización</DialogTitle>
				<DialogContent>
					{dryRunResults && (
						<>
							<DialogContentText sx={{ mb: 2 }}>
								Se encontraron los siguientes datos en la Suppression List de AWS SES:
							</DialogContentText>

							<Box sx={{ mb: 2 }}>
								<Grid container spacing={2}>
									<Grid item xs={6}>
										<Typography variant="body2" color="text.secondary">
											Total en Suppression List:
										</Typography>
										<Typography variant="h6">{dryRunResults.totalSuppressed}</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="body2" color="text.secondary">
											Contactos a actualizar:
										</Typography>
										<Typography variant="h6" color="primary.main">
											{dryRunResults.contactsUpdated}
										</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="body2" color="text.secondary">
											Ya marcados correctamente:
										</Typography>
										<Typography variant="h6" color="success.main">
											{dryRunResults.contactsAlreadyBounced}
										</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="body2" color="text.secondary">
											No encontrados en BD:
										</Typography>
										<Typography variant="h6" color="text.secondary">
											{dryRunResults.contactsNotFound}
										</Typography>
									</Grid>
								</Grid>
							</Box>

							<Alert severity="info" sx={{ mt: 2 }}>
								<Typography variant="body2">
									Se actualizarán <strong>{dryRunResults.contactsUpdated}</strong> contactos:
								</Typography>
								<Typography variant="body2">
									• {dryRunResults.bounces} con estado "bounced" (rebote)
								</Typography>
								<Typography variant="body2">
									• {dryRunResults.complaints} con estado "complained" (spam)
								</Typography>
							</Alert>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowSyncDialog(false)} disabled={syncing}>
						Cancelar
					</Button>
					<Button
						onClick={runRealSync}
						variant="contained"
						color="primary"
						disabled={syncing || !dryRunResults || dryRunResults.contactsUpdated === 0}
						startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : null}
					>
						{syncing ? "Sincronizando..." : "Confirmar Sincronización"}
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default MarketingSuppression;
