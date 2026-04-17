import { useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	IconButton,
	InputAdornment,
	OutlinedInput,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Stack,
	Switch,
} from "@mui/material";
import { Add, Edit, Eye, EyeSlash, Trash, SearchNormal1, Warning2 } from "iconsax-react";
import { useDispatch, useSelector } from "store";
import { fetchCredentials, deleteCredential, updateCredential, revealCredential } from "store/reducers/seclo";
import type { TrabajoCredential } from "types/seclo";
import CreateCredencialModal from "./CreateCredencialModal";

export default function CredencialesTab() {
	const dispatch = useDispatch();
	const { credentials, credentialsTotal, loading } = useSelector((s) => s.seclo);

	const [page, setPage] = useState(0);
	const [rowsPerPage] = useState(15);
	const [search, setSearch] = useState("");
	const [openCreate, setOpenCreate] = useState(false);
	const [editTarget, setEditTarget] = useState<TrabajoCredential | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TrabajoCredential | null>(null);
	const [viewTarget, setViewTarget] = useState<TrabajoCredential | null>(null);
	const [editPassword, setEditPassword] = useState("");
	const [credTab, setCredTab] = useState(0);
	const [revealed, setRevealed] = useState<{ cuil: string; password: string } | null>(null);
	const [revealing, setRevealing] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const load = () => {
		dispatch(fetchCredentials({ page: page + 1, limit: rowsPerPage, search: search || undefined }));
	};

	useEffect(() => {
		load();
	}, [page]);

	const handleSearch = () => {
		setPage(0);
		load();
	};

	const handleToggleEnabled = async (cred: TrabajoCredential) => {
		await dispatch(updateCredential(cred._id, { enabled: !cred.enabled }));
	};

	const handleUpdatePassword = async () => {
		if (!editTarget || !editPassword) return;
		await dispatch(updateCredential(editTarget._id, { password: editPassword }));
		setEditTarget(null);
		setEditPassword("");
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		await dispatch(deleteCredential(deleteTarget._id));
		setDeleteTarget(null);
	};

	const getUserName = (cred: TrabajoCredential) => {
		if (cred.userId && typeof cred.userId === "object") return `${cred.userId.name} — ${cred.userId.email}`;
		return String(cred.userId);
	};

	return (
		<Box>
			{/* Toolbar */}
			<Box display="flex" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
				<TextField
					size="small"
					placeholder="Buscar usuario..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					InputProps={{ startAdornment: <SearchNormal1 size={16} style={{ marginRight: 6 }} /> }}
					sx={{ width: 220 }}
				/>
				<Box flexGrow={1} />
				<Button variant="contained" startIcon={<Add size={18} />} onClick={() => setOpenCreate(true)}>
					Nueva credencial
				</Button>
			</Box>

			{/* Tabla */}
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Usuario</TableCell>
							<TableCell>CUIL</TableCell>
							<TableCell>Estado sync</TableCell>
							<TableCell>Habilitada</TableCell>
							<TableCell>Último sync</TableCell>
							<TableCell>Errores</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={7} align="center">
									Cargando...
								</TableCell>
							</TableRow>
						) : credentials.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} align="center">
									Sin credenciales
								</TableCell>
							</TableRow>
						) : (
							credentials.map((cred) => (
								<TableRow key={cred._id} hover>
									<TableCell>
										<Box display="flex" alignItems="center" gap={0.5}>
											{cred.credentialInvalid && (
												<Tooltip title={cred.credentialInvalidReason || "Credencial inválida"}>
													<Warning2 size={16} color="red" />
												</Tooltip>
											)}
											<Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
												{getUserName(cred)}
											</Typography>
										</Box>
									</TableCell>
									<TableCell>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{cred.cuil}
										</Typography>
									</TableCell>
									<TableCell>
										<Chip
											label={cred.syncStatus}
											size="small"
											color={cred.syncStatus === "completed" ? "success" : cred.syncStatus === "error" ? "error" : "default"}
										/>
									</TableCell>
									<TableCell>
										<Switch size="small" checked={cred.enabled} onChange={() => handleToggleEnabled(cred)} />
									</TableCell>
									<TableCell>
										<Typography variant="caption">{cred.lastSync ? new Date(cred.lastSync).toLocaleDateString("es-AR") : "—"}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" color={cred.consecutiveErrors > 0 ? "error" : "text.primary"}>
											{cred.consecutiveErrors}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Box display="flex" gap={0.5} justifyContent="center">
											<Tooltip title="Ver detalle">
												<IconButton
													size="small"
													onClick={() => {
														setViewTarget(cred);
														setCredTab(0);
														setRevealed(null);
														setShowPassword(false);
													}}
												>
													<Eye size={16} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Cambiar contraseña">
												<IconButton
													size="small"
													onClick={() => {
														setEditTarget(cred);
														setEditPassword("");
													}}
												>
													<Edit size={16} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => setDeleteTarget(cred)}>
													<Trash size={16} />
												</IconButton>
											</Tooltip>
										</Box>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={credentialsTotal}
				page={page}
				onPageChange={(_, p) => setPage(p)}
				rowsPerPage={rowsPerPage}
				rowsPerPageOptions={[15]}
			/>

			{/* Modales */}
			<CreateCredencialModal
				open={openCreate}
				onClose={() => {
					setOpenCreate(false);
					load();
				}}
			/>

			{/* Vista de detalle con JSON debug */}
			{viewTarget && (
				<Dialog open onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth>
					<DialogTitle>
						Credencial{" "}
						<Typography component="span" variant="body2" color="text.secondary">
							{viewTarget.cuil} — {getUserName(viewTarget)}
						</Typography>
					</DialogTitle>

					<Tabs value={credTab} onChange={(_, v) => setCredTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}>
						<Tab label="Detalle" />
						<Tab label="JSON" />
					</Tabs>

					<DialogContent dividers>
						{/* ── Tab 0: Detalle ── */}
						{credTab === 0 && (
							<Stack spacing={0.5}>
								<Typography variant="body2">
									<strong>Usuario:</strong> {getUserName(viewTarget)}
								</Typography>
								<Typography variant="body2">
									<strong>CUIL:</strong> <code>{viewTarget.cuil}</code>
								</Typography>
								<Typography variant="body2">
									<strong>Habilitada:</strong> {viewTarget.enabled ? "Sí" : "No"}
								</Typography>
								<Typography variant="body2">
									<strong>Sync status:</strong>{" "}
									<Chip
										label={viewTarget.syncStatus}
										size="small"
										color={viewTarget.syncStatus === "completed" ? "success" : viewTarget.syncStatus === "error" ? "error" : "default"}
										sx={{ ml: 0.5 }}
									/>
								</Typography>
								<Typography variant="body2">
									<strong>Errores consecutivos:</strong>{" "}
									<Typography component="span" variant="body2" color={viewTarget.consecutiveErrors > 0 ? "error" : "text.primary"}>
										{viewTarget.consecutiveErrors}
									</Typography>
								</Typography>
								{viewTarget.lastSync && (
									<Typography variant="body2">
										<strong>Último sync:</strong> {new Date(viewTarget.lastSync).toLocaleString("es-AR")}
									</Typography>
								)}
								{viewTarget.credentialInvalid && (
									<Typography variant="body2" color="error">
										<strong>Credencial inválida:</strong> {viewTarget.credentialInvalidReason || "Sin detalle"}
									</Typography>
								)}

								{/* Reveal */}
								<Box pt={1} borderTop="1px solid" borderColor="divider">
									{!revealed ? (
										<Button
											size="small"
											variant="outlined"
											color="warning"
											startIcon={revealing ? <CircularProgress size={14} /> : <Eye size={14} />}
											disabled={revealing}
											onClick={async () => {
												setRevealing(true);
												try {
													const result = await dispatch(revealCredential(viewTarget._id));
													setRevealed(result);
												} finally {
													setRevealing(false);
												}
											}}
										>
											Revelar credenciales
										</Button>
									) : (
										<Stack spacing={1}>
											<Typography variant="body2" fontWeight={600}>
												Credenciales descifradas
											</Typography>
											<Box>
												<Typography variant="caption" color="text.secondary">
													CUIL
												</Typography>
												<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
													{revealed.cuil}
												</Typography>
											</Box>
											<Box>
												<Typography variant="caption" color="text.secondary">
													Contraseña
												</Typography>
												<OutlinedInput
													size="small"
													type={showPassword ? "text" : "password"}
													value={revealed.password}
													readOnly
													sx={{ fontFamily: "monospace", fontSize: 13, mt: 0.25 }}
													endAdornment={
														<InputAdornment position="end">
															<IconButton size="small" onClick={() => setShowPassword((p) => !p)} edge="end">
																{showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
															</IconButton>
														</InputAdornment>
													}
												/>
											</Box>
											<Button
												size="small"
												color="inherit"
												onClick={() => {
													setRevealed(null);
													setShowPassword(false);
												}}
											>
												Ocultar
											</Button>
										</Stack>
									)}
								</Box>
							</Stack>
						)}

						{/* ── Tab 1: JSON debug ── */}
						{credTab === 1 && (
							<Box
								component="pre"
								sx={{
									m: 0,
									p: 1.5,
									bgcolor: "grey.900",
									color: "grey.100",
									borderRadius: 1,
									fontSize: 11,
									overflowX: "auto",
									whiteSpace: "pre-wrap",
									wordBreak: "break-all",
									minHeight: 200,
								}}
							>
								{JSON.stringify(viewTarget, null, 2)}
							</Box>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setViewTarget(null)}>Cerrar</Button>
					</DialogActions>
				</Dialog>
			)}

			{/* Editar contraseña */}
			{editTarget && (
				<Dialog open onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
					<DialogTitle>Cambiar contraseña</DialogTitle>
					<DialogContent>
						<Typography variant="body2" mb={2}>
							Usuario: <strong>{getUserName(editTarget)}</strong>
						</Typography>
						<TextField
							fullWidth
							type="password"
							label="Nueva contraseña *"
							value={editPassword}
							onChange={(e) => setEditPassword(e.target.value)}
							autoFocus
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setEditTarget(null)}>Cancelar</Button>
						<Button variant="contained" onClick={handleUpdatePassword} disabled={!editPassword}>
							Guardar
						</Button>
					</DialogActions>
				</Dialog>
			)}

			{/* Confirmar eliminación */}
			{deleteTarget && (
				<Dialog open onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
					<DialogTitle>Eliminar credencial</DialogTitle>
					<DialogContent>
						<Typography>
							¿Eliminar la credencial de <strong>{getUserName(deleteTarget)}</strong>?
						</Typography>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
						<Button variant="contained" color="error" onClick={handleDelete}>
							Eliminar
						</Button>
					</DialogActions>
				</Dialog>
			)}
		</Box>
	);
}
