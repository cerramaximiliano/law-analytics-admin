import React, { useCallback, useEffect, useMemo, useState } from "react";

// material-ui
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";

// project imports
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import TableSkeleton from "components/UI/TableSkeleton";
import {
	deleteUserGrant,
	getUserGrants,
	isGrantActive,
	listUsersWithGrants,
	setUserGrant,
	type FeatureGrantValue,
	type KnownFeature,
	type UserWithGrants,
} from "api/featureGrants";

// icons
import { Add, Edit, Trash, SearchNormal1, CloseCircle, Refresh } from "iconsax-react";

const DEFAULT_FEATURE: KnownFeature = "mcp_access";

const FeatureGrantsPage: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<UserWithGrants[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [filterFeature, setFilterFeature] = useState<KnownFeature | "">(DEFAULT_FEATURE);
	const [knownFeatures, setKnownFeatures] = useState<KnownFeature[]>([DEFAULT_FEATURE]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Modal de edición (set o revoke)
	const [editing, setEditing] = useState<{
		userId: string;
		email?: string;
		name?: string;
		feature: KnownFeature;
		granted: boolean;
		reason: string;
	} | null>(null);
	const [submitting, setSubmitting] = useState(false);

	// Modal de "agregar grant a un user nuevo"
	const [addOpen, setAddOpen] = useState(false);
	const [lookupUserId, setLookupUserId] = useState("");
	const [lookingUp, setLookingUp] = useState(false);

	const fetchList = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await listUsersWithGrants({
				feature: filterFeature || undefined,
				page: page + 1,
				limit: rowsPerPage,
			});
			setItems(res.items);
			setTotal(res.total);
			if (res.knownFeatures?.length) setKnownFeatures(res.knownFeatures);
		} catch (err: any) {
			setError(err.response?.data?.message || err.message || "Error cargando grants");
		} finally {
			setLoading(false);
		}
	}, [filterFeature, page, rowsPerPage]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const handleEdit = (user: UserWithGrants, feature: KnownFeature) => {
		const value = user.featureGrants?.[feature];
		const granted = isGrantActive(value);
		const reason = typeof value === "object" && value ? value.reason || "" : "";
		setEditing({ userId: user._id, email: user.email, name: user.name, feature, granted, reason });
	};

	const handleAddNew = () => {
		setAddOpen(true);
		setLookupUserId("");
	};

	const handleLookupAndOpen = async () => {
		if (!lookupUserId.trim()) return;
		setLookingUp(true);
		try {
			const data = await getUserGrants(lookupUserId.trim());
			setAddOpen(false);
			setEditing({
				userId: data.userId,
				email: data.email,
				name: data.name,
				feature: DEFAULT_FEATURE,
				granted: isGrantActive(data.featureGrants?.[DEFAULT_FEATURE]),
				reason: "",
			});
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.message || "User no encontrado", { variant: "error" });
		} finally {
			setLookingUp(false);
		}
	};

	const handleSave = async () => {
		if (!editing) return;
		setSubmitting(true);
		try {
			await setUserGrant(editing.userId, editing.feature, {
				granted: editing.granted,
				reason: editing.reason.trim() || null,
			});
			enqueueSnackbar(`Grant ${editing.granted ? "activado" : "revocado"} OK`, { variant: "success" });
			setEditing(null);
			await fetchList();
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.message || "Error al guardar", { variant: "error" });
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (userId: string, feature: KnownFeature) => {
		if (!window.confirm(`¿Eliminar el grant ${feature} del user ${userId}?`)) return;
		try {
			await deleteUserGrant(userId, feature);
			enqueueSnackbar("Grant eliminado", { variant: "success" });
			await fetchList();
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.message || "Error al eliminar", { variant: "error" });
		}
	};

	const renderGrantChip = (value: FeatureGrantValue | undefined) => {
		const active = isGrantActive(value);
		const meta = typeof value === "object" && value ? value : null;
		const tooltip = meta
			? `${meta.reason ? `Reason: ${meta.reason}` : ""}${
					meta.grantedAt ? ` · Granted: ${new Date(meta.grantedAt).toLocaleDateString()}` : ""
				}${meta.grantedBy ? ` · By: ${meta.grantedBy}` : ""}`
			: active
				? "Granteado (formato simple)"
				: "Revocado";
		return (
			<Tooltip title={tooltip || (active ? "Activo" : "Revocado")} arrow>
				<Chip
					size="small"
					label={active ? "Activo" : "Revocado"}
					color={active ? "success" : "default"}
					variant={active ? "filled" : "outlined"}
				/>
			</Tooltip>
		);
	};

	const columns = useMemo(() => {
		// Una columna fija por cada feature conocido + columnas de info del user
		return knownFeatures;
	}, [knownFeatures]);

	return (
		<MainCard
			title="Feature Grants (manual bypass de plan/addon)"
			secondary={
				<Stack direction="row" spacing={1}>
					<IconButton onClick={fetchList} title="Refrescar">
						<Refresh size={18} />
					</IconButton>
					<Button variant="contained" startIcon={<Add size={16} />} onClick={handleAddNew}>
						Agregar a user
					</Button>
				</Stack>
			}
		>
			<Stack spacing={2}>
				<Alert severity="info">
					Los grants permiten habilitar features (ej. <code>mcp_access</code>) a users sin que cumplan el
					plan + addon comercial. Útil para beta testers, admins, QA. Editable directamente en{" "}
					<code>users.featureGrants</code> en Mongo.
				</Alert>

				<Stack direction="row" spacing={2} alignItems="center">
					<FormControl size="small" sx={{ minWidth: 200 }}>
						<InputLabel>Filtrar por feature</InputLabel>
						<Select
							label="Filtrar por feature"
							value={filterFeature}
							onChange={(e) => {
								setFilterFeature(e.target.value as KnownFeature | "");
								setPage(0);
							}}
						>
							<MenuItem value="">Todos</MenuItem>
							{knownFeatures.map((f) => (
								<MenuItem key={f} value={f}>
									{f}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Typography variant="body2" color="text.secondary">
						{total} user{total === 1 ? "" : "s"} con grants
					</Typography>
				</Stack>

				{error && <Alert severity="error">{error}</Alert>}

				<ScrollX>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Email</TableCell>
									<TableCell>Nombre</TableCell>
									<TableCell>User ID</TableCell>
									{columns.map((f) => (
										<TableCell key={f} align="center">
											{f}
										</TableCell>
									))}
									<TableCell align="right">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={4 + columns.length}>
											<TableSkeleton rows={3} columns={4 + columns.length} />
										</TableCell>
									</TableRow>
								) : items.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4 + columns.length} align="center">
											<Box sx={{ py: 4 }}>
												<Typography color="text.secondary">
													No hay users con grants {filterFeature ? `para ${filterFeature}` : ""}.
												</Typography>
											</Box>
										</TableCell>
									</TableRow>
								) : (
									items.map((u) => (
										<TableRow key={u._id} hover>
											<TableCell>{u.email || "—"}</TableCell>
											<TableCell>{u.name || "—"}</TableCell>
											<TableCell>
												<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
													{u._id}
												</Typography>
											</TableCell>
											{columns.map((f) => (
												<TableCell key={f} align="center">
													{u.featureGrants?.[f] !== undefined ? (
														renderGrantChip(u.featureGrants[f])
													) : (
														<Typography variant="caption" color="text.secondary">
															—
														</Typography>
													)}
												</TableCell>
											))}
											<TableCell align="right">
												<Stack direction="row" spacing={0.5} justifyContent="flex-end">
													{columns.map((f) =>
														u.featureGrants?.[f] !== undefined ? (
															<React.Fragment key={f}>
																<Tooltip title={`Editar ${f}`}>
																	<IconButton size="small" onClick={() => handleEdit(u, f)}>
																		<Edit size={16} />
																	</IconButton>
																</Tooltip>
																<Tooltip title={`Eliminar ${f}`}>
																	<IconButton
																		size="small"
																		color="error"
																		onClick={() => handleDelete(u._id, f)}
																	>
																		<Trash size={16} />
																	</IconButton>
																</Tooltip>
															</React.Fragment>
														) : null
													)}
												</Stack>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</ScrollX>

				<TablePagination
					component="div"
					count={total}
					page={page}
					onPageChange={(_, p) => setPage(p)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => {
						setRowsPerPage(parseInt(e.target.value, 10));
						setPage(0);
					}}
					rowsPerPageOptions={[10, 25, 50, 100]}
				/>
			</Stack>

			{/* Dialog: agregar grant a user nuevo (lookup por ID) */}
			<Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Agregar grant a un user</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Pegá el User ID (ObjectId) y abrimos el editor con sus grants actuales.
						</Typography>
						<TextField
							label="User ID"
							value={lookupUserId}
							onChange={(e) => setLookupUserId(e.target.value)}
							placeholder="647b7a2b7b6aad33b30b8de7"
							fullWidth
							autoFocus
							InputProps={{
								endAdornment: lookupUserId && (
									<IconButton size="small" onClick={() => setLookupUserId("")}>
										<CloseCircle size={16} />
									</IconButton>
								),
							}}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						startIcon={lookingUp ? <CircularProgress size={16} /> : <SearchNormal1 size={16} />}
						onClick={handleLookupAndOpen}
						disabled={!lookupUserId.trim() || lookingUp}
					>
						Buscar y editar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog: editar grant */}
			<Dialog open={!!editing} onClose={() => !submitting && setEditing(null)} maxWidth="sm" fullWidth>
				<DialogTitle>
					{editing?.granted ? "Editar grant" : "Activar grant"}
					{editing?.email && (
						<Typography variant="body2" color="text.secondary">
							{editing.email}
							{editing.name ? ` · ${editing.name}` : ""}
						</Typography>
					)}
				</DialogTitle>
				<DialogContent>
					{editing && (
						<Stack spacing={2} sx={{ mt: 1 }}>
							<FormControl fullWidth size="small">
								<InputLabel>Feature</InputLabel>
								<Select
									label="Feature"
									value={editing.feature}
									onChange={(e) =>
										setEditing({ ...editing, feature: e.target.value as KnownFeature })
									}
								>
									{knownFeatures.map((f) => (
										<MenuItem key={f} value={f}>
											{f}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControlLabel
								control={
									<Switch
										checked={editing.granted}
										onChange={(e) => setEditing({ ...editing, granted: e.target.checked })}
										color="success"
									/>
								}
								label={editing.granted ? "Granteado (bypass de plan/addon activo)" : "Revocado"}
							/>
							<TextField
								label="Motivo (opcional)"
								value={editing.reason}
								onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
								placeholder="Ej: beta tester MCP"
								fullWidth
								multiline
								minRows={2}
							/>
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditing(null)} disabled={submitting}>
						Cancelar
					</Button>
					<Button
						variant="contained"
						onClick={handleSave}
						disabled={submitting}
						startIcon={submitting && <CircularProgress size={16} />}
					>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default FeatureGrantsPage;
