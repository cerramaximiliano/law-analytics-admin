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
import ConfirmDialog from "components/admin/ConfirmDialog";
import {
	deleteUserGrant,
	EXTRA_FOLDERS_BLOCK,
	EXTRA_FOLDERS_FEATURE,
	EXTRA_FOLDERS_MAX_BLOCKS,
	getUserGrants,
	isGrantActive,
	isGrantExpired,
	listUsersWithGrants,
	setUserGrant,
	type FeatureGrantValue,
	type KnownFeature,
	type UserWithGrants,
} from "api/featureGrants";

// icons
import { Add, Edit, Trash, SearchNormal1, CloseCircle, Refresh } from "iconsax-react";

const DEFAULT_FEATURE: KnownFeature = "mcp_access";

/** Campos propios del grant extra_folders a partir del valor guardado. */
function extraFoldersFields(value: FeatureGrantValue | undefined): { blocks: string; expiresAt: string } {
	const meta = typeof value === "object" && value ? value : null;
	return {
		blocks: meta?.blocks ? String(meta.blocks) : "1",
		expiresAt: meta?.expiresAt ? new Date(meta.expiresAt).toISOString().slice(0, 10) : "",
	};
}

/** Error de validación de los bloques, o null si son válidos. */
function blocksError(raw: string): string | null {
	const n = Number(raw);
	return Number.isInteger(n) && n >= 1 && n <= EXTRA_FOLDERS_MAX_BLOCKS ? null : `Entero entre 1 y ${EXTRA_FOLDERS_MAX_BLOCKS}`;
}

const FeatureGrantsPage: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<UserWithGrants[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
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
		/** Solo extra_folders. */
		blocks: string;
		expiresAt: string;
	} | null>(null);
	/** Grants actuales del user en edición, para recargar los campos al cambiar de feature. */
	const [editingGrants, setEditingGrants] = useState<UserWithGrants["featureGrants"]>({});
	const [submitting, setSubmitting] = useState(false);

	// Modal de "agregar grant a un user nuevo"
	const [addOpen, setAddOpen] = useState(false);
	const [grantToDelete, setGrantToDelete] = useState<{ userId: string; userLabel: string; feature: KnownFeature } | null>(null);
	const [deletingGrant, setDeletingGrant] = useState(false);
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
		setEditingGrants(user.featureGrants || {});
		setEditing({ userId: user._id, email: user.email, name: user.name, feature, granted, reason, ...extraFoldersFields(value) });
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
			setEditingGrants(data.featureGrants || {});
			setEditing({
				userId: data.userId,
				email: data.email,
				name: data.name,
				feature: DEFAULT_FEATURE,
				granted: isGrantActive(data.featureGrants?.[DEFAULT_FEATURE]),
				reason: "",
				...extraFoldersFields(data.featureGrants?.[DEFAULT_FEATURE]),
			});
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.message || "User no encontrado", { variant: "error" });
		} finally {
			setLookingUp(false);
		}
	};

	const handleSave = async () => {
		if (!editing) return;
		const withBlocks = editing.feature === EXTRA_FOLDERS_FEATURE && editing.granted;
		if (withBlocks && blocksError(editing.blocks)) return;
		setSubmitting(true);
		try {
			await setUserGrant(editing.userId, editing.feature, {
				granted: editing.granted,
				reason: editing.reason.trim() || null,
				...(withBlocks && {
					blocks: Number(editing.blocks),
					// Vence al final del día elegido (hora de Argentina).
					expiresAt: editing.expiresAt ? `${editing.expiresAt}T23:59:59-03:00` : null,
				}),
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
		try {
			setDeletingGrant(true);
			await deleteUserGrant(userId, feature);
			enqueueSnackbar("Grant eliminado", { variant: "success" });
			setGrantToDelete(null);
			await fetchList();
		} catch (err: any) {
			enqueueSnackbar(err.response?.data?.message || "Error al eliminar", { variant: "error" });
		} finally {
			setDeletingGrant(false);
		}
	};

	const renderGrantChip = (value: FeatureGrantValue | undefined) => {
		const expired = isGrantExpired(value);
		const active = isGrantActive(value) && !expired;
		const meta = typeof value === "object" && value ? value : null;
		const label = expired ? "Vencido" : active ? (meta?.blocks ? `Activo · ${meta.blocks} bl.` : "Activo") : "Revocado";
		const tooltip = meta
			? `${meta.reason ? `Reason: ${meta.reason}` : ""}${
					meta.grantedAt ? ` · Granted: ${new Date(meta.grantedAt).toLocaleDateString("es-AR")}` : ""
			  }${meta.grantedBy ? ` · By: ${meta.grantedBy}` : ""}`
			: active
			? "Granteado (formato simple)"
			: "Revocado";
		return (
			<Tooltip title={tooltip || (active ? "Activo" : "Revocado")} arrow>
				<Chip size="small" label={label} color={active ? "success" : "default"} variant={active ? "filled" : "outlined"} />
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
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
					<IconButton aria-label="Refrescar" onClick={fetchList} title="Refrescar">
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
					Los grants permiten habilitar features (ej. <code>mcp_access</code>) a users sin que cumplan el plan + addon comercial. Útil para
					beta testers, admins, QA. Editable directamente en <code>users.featureGrants</code> en Mongo.
				</Alert>

				<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
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
																		onClick={() => setGrantToDelete({ userId: u._id, userLabel: u.email || u._id, feature: f })}
																	>
																		<Trash size={16} />
																	</IconButton>
																</Tooltip>
															</React.Fragment>
														) : null,
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
									<IconButton aria-label="Limpiar ID de usuario" size="small" onClick={() => setLookupUserId("")}>
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
									onChange={(e) => {
										const feature = e.target.value as KnownFeature;
										const value = editingGrants?.[feature];
										setEditing({ ...editing, feature, granted: isGrantActive(value), ...extraFoldersFields(value) });
									}}
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
							{editing.feature === EXTRA_FOLDERS_FEATURE && editing.granted && (
								<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
									<TextField
										label="Bloques"
										type="number"
										size="small"
										value={editing.blocks}
										onChange={(e) => setEditing({ ...editing, blocks: e.target.value })}
										inputProps={{ min: 1, max: EXTRA_FOLDERS_MAX_BLOCKS, step: 1 }}
										error={!!blocksError(editing.blocks)}
										helperText={
											blocksError(editing.blocks) ||
											`+${(Number(editing.blocks) * EXTRA_FOLDERS_BLOCK.folders).toLocaleString("es-AR")} causas y +${
												Number(editing.blocks) * EXTRA_FOLDERS_BLOCK.storage
											} MB, sumados a lo comprado`
										}
										sx={{ flex: 1 }}
									/>
									<TextField
										label="Vence (opcional)"
										type="date"
										size="small"
										value={editing.expiresAt}
										onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })}
										InputLabelProps={{ shrink: true }}
										helperText="Vacío = sin vencimiento"
										sx={{ flex: 1 }}
									/>
								</Stack>
							)}
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
						disabled={submitting || (editing?.feature === EXTRA_FOLDERS_FEATURE && editing.granted && !!blocksError(editing.blocks))}
						startIcon={submitting && <CircularProgress size={16} />}
					>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			<ConfirmDialog
				open={Boolean(grantToDelete)}
				title={grantToDelete ? `¿Eliminar el grant ${grantToDelete.feature} de ${grantToDelete.userLabel}?` : ""}
				description="El usuario vuelve a depender de su plan y addons para acceder a la feature."
				confirmLabel="Eliminar grant"
				loading={deletingGrant}
				onConfirm={() => grantToDelete && handleDelete(grantToDelete.userId, grantToDelete.feature)}
				onClose={() => setGrantToDelete(null)}
			/>
		</MainCard>
	);
};

export default FeatureGrantsPage;
