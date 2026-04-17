import { useEffect, useState } from "react";
import {
	Box,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	Stack,
	Tab,
	Tabs,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Paper,
	Alert,
	Button,
	Avatar,
	Tooltip,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
} from "@mui/material";
import {
	CloseCircle,
	People,
	Messages2,
	Clock,
	TickCircle,
	CloseSquare,
	Trash,
	Warning2,
	UserRemove,
	Crown1,
	DocumentText,
	Code,
	Copy,
} from "iconsax-react";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import GroupsService, { Group, GroupMember, GroupInvitation, GroupHistoryEntry } from "api/groups";

// ====================================
// HELPERS
// ====================================

const STATUS_CHIP: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
	active: { color: "success", label: "Activo" },
	suspended: { color: "warning", label: "Suspendido" },
	archived: { color: "default", label: "Archivado" },
	deleted: { color: "error", label: "Eliminado" },
};

const MEMBER_STATUS_CHIP: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
	active: { color: "success", label: "Activo" },
	suspended: { color: "warning", label: "Suspendido" },
	removed: { color: "error", label: "Removido" },
};

const INV_STATUS_CHIP: Record<string, { color: "warning" | "success" | "error" | "default"; label: string }> = {
	pending: { color: "warning", label: "Pendiente" },
	accepted: { color: "success", label: "Aceptada" },
	rejected: { color: "error", label: "Rechazada" },
	expired: { color: "default", label: "Expirada" },
	revoked: { color: "error", label: "Revocada" },
};

const ROLE_LABEL: Record<string, string> = {
	owner: "Owner",
	admin: "Admin",
	editor: "Editor",
	viewer: "Viewer",
};

const HISTORY_ACTION_LABEL: Record<string, string> = {
	group_created: "Grupo creado",
	group_updated: "Grupo actualizado",
	group_archived: "Grupo archivado",
	group_deleted: "Grupo eliminado",
	group_restored: "Grupo restaurado",
	member_invited: "Miembro invitado",
	member_joined: "Miembro se unió",
	member_left: "Miembro abandonó",
	member_removed: "Miembro removido",
	member_role_changed: "Rol de miembro cambiado",
	invitation_revoked: "Invitación revocada",
	settings_updated: "Configuración actualizada",
	resources_migrated: "Recursos migrados",
	resources_migrated_archived: "Recursos migrados (archivados)",
};

const formatDate = (date?: string) => (date ? new Date(date).toLocaleString("es-AR") : "—");

const getUserFullName = (user?: { firstName?: string; lastName?: string; email?: string } | null) => {
	if (!user) return "—";
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
	return name || user.email || "—";
};

// ====================================
// TAB PANEL
// ====================================

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
	return (
		<div role="tabpanel" hidden={value !== index}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

// ====================================
// MEMBERS TAB
// ====================================

interface MembersTabProps {
	groupId: string;
	onMemberRemoved: () => void;
}

function MembersTab({ groupId, onMemberRemoved }: MembersTabProps) {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const [data, setData] = useState<{ owner: GroupMember | null; members: GroupMember[] } | null>(null);
	const [loading, setLoading] = useState(true);
	const [removing, setRemoving] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		try {
			const res = await GroupsService.getGroupMembers(groupId);
			setData(res.data);
		} catch {
			enqueueSnackbar("Error al cargar miembros", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, [groupId]);

	const handleRemove = async (userId: string, userName: string) => {
		if (!confirm(`¿Remover a "${userName}" del grupo?`)) return;
		setRemoving(userId);
		try {
			await GroupsService.removeGroupMember(groupId, userId);
			enqueueSnackbar("Miembro removido correctamente", { variant: "success" });
			onMemberRemoved();
			load();
		} catch {
			enqueueSnackbar("Error al remover miembro", { variant: "error" });
		} finally {
			setRemoving(null);
		}
	};

	if (loading)
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	if (!data) return <Alert severity="error">Error al cargar miembros</Alert>;

	const allMembers = data.owner ? [data.owner, ...data.members] : data.members;

	return (
		<TableContainer component={Paper} variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
						<TableCell>Usuario</TableCell>
						<TableCell>Rol</TableCell>
						<TableCell>Estado</TableCell>
						<TableCell>Ingresó</TableCell>
						<TableCell>Última actividad</TableCell>
						<TableCell align="center">Acciones</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{allMembers.map((member) => {
						const user = member.userId as GroupMember["userId"];
						const userId = typeof user === "object" ? user._id : String(user);
						const userName = typeof user === "object" ? getUserFullName(user) : "—";
						const userEmail = typeof user === "object" ? user?.email : "—";

						return (
							<TableRow key={member._id} hover>
								<TableCell>
									<Stack direction="row" spacing={1} alignItems="center">
										<Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>{userName.charAt(0).toUpperCase()}</Avatar>
										<Box>
											<Typography variant="body2" fontWeight={500}>
												{userName}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{userEmail}
											</Typography>
										</Box>
									</Stack>
								</TableCell>
								<TableCell>
									<Stack direction="row" spacing={0.5} alignItems="center">
										{member.isOwner && <Crown1 size={14} color={theme.palette.warning.main} />}
										<Typography variant="body2">{ROLE_LABEL[member.role] ?? member.role}</Typography>
									</Stack>
								</TableCell>
								<TableCell>
									<Chip
										size="small"
										label={MEMBER_STATUS_CHIP[member.status]?.label ?? member.status}
										color={MEMBER_STATUS_CHIP[member.status]?.color ?? "default"}
									/>
								</TableCell>
								<TableCell>
									<Typography variant="caption">{formatDate(member.joinedAt)}</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="caption">{member.lastActivityAt ? formatDate(member.lastActivityAt) : "—"}</Typography>
								</TableCell>
								<TableCell align="center">
									{!member.isOwner && member.status === "active" && (
										<Tooltip title="Remover miembro">
											<span>
												<IconButton
													size="small"
													color="error"
													disabled={removing === userId}
													onClick={() => handleRemove(userId, userName)}
												>
													{removing === userId ? <CircularProgress size={14} /> : <UserRemove size={16} />}
												</IconButton>
											</span>
										</Tooltip>
									)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

// ====================================
// INVITATIONS TAB
// ====================================

interface InvitationsTabProps {
	groupId: string;
}

function InvitationsTab({ groupId }: InvitationsTabProps) {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState("");
	const [cancelling, setCancelling] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		try {
			const res = await GroupsService.getGroupInvitations(groupId, statusFilter || undefined);
			setInvitations(res.data.invitations);
		} catch {
			enqueueSnackbar("Error al cargar invitaciones", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, [groupId, statusFilter]);

	const handleCancel = async (invitationId: string, email: string) => {
		if (!confirm(`¿Revocar la invitación para "${email}"?`)) return;
		setCancelling(invitationId);
		try {
			await GroupsService.cancelGroupInvitation(groupId, invitationId);
			enqueueSnackbar("Invitación revocada correctamente", { variant: "success" });
			load();
		} catch {
			enqueueSnackbar("Error al revocar invitación", { variant: "error" });
		} finally {
			setCancelling(null);
		}
	};

	return (
		<Stack spacing={2}>
			<FormControl size="small" sx={{ maxWidth: 200 }}>
				<InputLabel>Filtrar por estado</InputLabel>
				<Select value={statusFilter} label="Filtrar por estado" onChange={(e) => setStatusFilter(e.target.value)}>
					<MenuItem value="">Todos</MenuItem>
					<MenuItem value="pending">Pendientes</MenuItem>
					<MenuItem value="accepted">Aceptadas</MenuItem>
					<MenuItem value="rejected">Rechazadas</MenuItem>
					<MenuItem value="expired">Expiradas</MenuItem>
					<MenuItem value="revoked">Revocadas</MenuItem>
				</Select>
			</FormControl>

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
					<CircularProgress />
				</Box>
			) : invitations.length === 0 ? (
				<Alert severity="info">No hay invitaciones con el filtro seleccionado</Alert>
			) : (
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
								<TableCell>Email</TableCell>
								<TableCell>Rol</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Invitado por</TableCell>
								<TableCell>Enviada</TableCell>
								<TableCell>Expira</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{invitations.map((inv) => (
								<TableRow key={inv._id} hover>
									<TableCell>
										<Typography variant="body2">{inv.email}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2">{ROLE_LABEL[inv.role] ?? inv.role}</Typography>
									</TableCell>
									<TableCell>
										<Chip
											size="small"
											label={INV_STATUS_CHIP[inv.status]?.label ?? inv.status}
											color={INV_STATUS_CHIP[inv.status]?.color ?? "default"}
										/>
									</TableCell>
									<TableCell>
										<Typography variant="caption">{getUserFullName(inv.invitedBy)}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption">{formatDate(inv.sentAt)}</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption" color={new Date(inv.expiresAt) < new Date() ? "error" : "text.secondary"}>
											{formatDate(inv.expiresAt)}
										</Typography>
									</TableCell>
									<TableCell align="center">
										{inv.status === "pending" && (
											<Tooltip title="Revocar invitación">
												<span>
													<IconButton
														size="small"
														color="error"
														disabled={cancelling === inv._id}
														onClick={() => handleCancel(inv._id, inv.email)}
													>
														{cancelling === inv._id ? <CircularProgress size={14} /> : <CloseSquare size={16} />}
													</IconButton>
												</span>
											</Tooltip>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</Stack>
	);
}

// ====================================
// HISTORY TAB
// ====================================

interface HistoryTabProps {
	groupId: string;
}

function HistoryTab({ groupId }: HistoryTabProps) {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const [history, setHistory] = useState<GroupHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const res = await GroupsService.getGroupHistory(groupId);
				setHistory(res.data.history);
			} catch {
				enqueueSnackbar("Error al cargar historial", { variant: "error" });
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [groupId]);

	if (loading)
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	if (history.length === 0) return <Alert severity="info">Sin historial registrado</Alert>;

	return (
		<TableContainer component={Paper} variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
						<TableCell>Acción</TableCell>
						<TableCell>Realizada por</TableCell>
						<TableCell>Usuario objetivo</TableCell>
						<TableCell>Detalles</TableCell>
						<TableCell>Fecha</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{history.map((entry, idx) => (
						<TableRow key={idx} hover>
							<TableCell>
								<Typography variant="body2" component="span">
									{HISTORY_ACTION_LABEL[entry.action] ?? entry.action}
									{entry.details?.adminAction ? (
										<Chip size="small" label="Admin" color="warning" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
									) : null}
								</Typography>
							</TableCell>
							<TableCell>
								<Typography variant="caption">{getUserFullName(entry.performedBy)}</Typography>
							</TableCell>
							<TableCell>
								<Typography variant="caption">{getUserFullName(entry.targetUser)}</Typography>
							</TableCell>
							<TableCell>
								<Typography variant="caption" color="text.secondary">
									{entry.details
										? Object.entries(entry.details)
												.filter(([k]) => k !== "adminAction")
												.map(([k, v]) => `${k}: ${v}`)
												.join(", ")
										: "—"}
								</Typography>
							</TableCell>
							<TableCell>
								<Typography variant="caption">{formatDate(entry.timestamp)}</Typography>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

// ====================================
// RESOURCES TAB
// ====================================

function ResourcesTab({ group }: { group: Group }) {
	const counts = group.metadata?.resourceCounts;

	const resources = [
		{ label: "Carpetas", value: counts?.folders ?? 0 },
		{ label: "Calculadoras", value: counts?.calculators ?? 0 },
		{ label: "Contactos", value: counts?.contacts ?? 0 },
		{ label: "Notas", value: counts?.notes ?? 0 },
		{ label: "Eventos", value: counts?.events ?? 0 },
	];

	return (
		<Grid container spacing={2}>
			{resources.map((r) => (
				<Grid item xs={6} sm={4} key={r.label}>
					<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
						<Typography variant="h4" fontWeight={700}>
							{r.value}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{r.label}
						</Typography>
					</Paper>
				</Grid>
			))}
			{group.metadata?.lastResourceSync && (
				<Grid item xs={12}>
					<Typography variant="caption" color="text.secondary">
						Último sync: {formatDate(group.metadata.lastResourceSync)}
					</Typography>
				</Grid>
			)}
		</Grid>
	);
}

// ====================================
// JSON TAB
// ====================================

function JsonTab({ group }: { group: Group }) {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const json = JSON.stringify(group, null, 2);

	const handleCopy = () => {
		navigator.clipboard.writeText(json).then(() => {
			enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
		});
	};

	return (
		<Box sx={{ position: "relative" }}>
			<Tooltip title="Copiar JSON">
				<IconButton
					size="small"
					onClick={handleCopy}
					sx={{ position: "absolute", top: 8, right: 8, zIndex: 1, bgcolor: theme.palette.background.paper }}
				>
					<Copy size={16} />
				</IconButton>
			</Tooltip>
			<Box
				component="pre"
				sx={{
					m: 0,
					p: 2,
					borderRadius: 1,
					bgcolor: theme.palette.mode === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
					border: `1px solid ${theme.palette.divider}`,
					fontSize: "0.75rem",
					fontFamily: "monospace",
					overflowX: "auto",
					whiteSpace: "pre-wrap",
					wordBreak: "break-all",
					maxHeight: 400,
					overflowY: "auto",
				}}
			>
				{json}
			</Box>
		</Box>
	);
}

// ====================================
// MAIN MODAL
// ====================================

interface GroupDetailModalProps {
	open: boolean;
	onClose: () => void;
	groupId: string | null;
	onStatusChanged: () => void;
}

const PLAN_LABEL: Record<string, string> = { free: "Free", standard: "Standard", premium: "Premium" };
const PLAN_COLOR: Record<string, "default" | "primary" | "warning"> = { free: "default", standard: "primary", premium: "warning" };

export default function GroupDetailModal({ open, onClose, groupId, onStatusChanged }: GroupDetailModalProps) {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();

	const handleCopyId = (id: string) => {
		navigator.clipboard.writeText(id).then(() => {
			enqueueSnackbar("ID copiado al portapapeles", { variant: "success" });
		});
	};
	const [tab, setTab] = useState(0);
	const [group, setGroup] = useState<Group | null>(null);
	const [loading, setLoading] = useState(false);
	const [updatingStatus, setUpdatingStatus] = useState(false);

	const load = async () => {
		if (!groupId) return;
		setLoading(true);
		try {
			const res = await GroupsService.getGroupById(groupId);
			setGroup(res.data);
		} catch {
			enqueueSnackbar("Error al cargar el grupo", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (open && groupId) {
			setTab(0);
			load();
		}
	}, [open, groupId]);

	const handleStatusChange = async (newStatus: "active" | "suspended" | "archived") => {
		if (!group) return;
		const labels: Record<string, string> = { active: "activar", suspended: "suspender", archived: "archivar" };
		if (!confirm(`¿Deseas ${labels[newStatus]} el grupo "${group.name}"?`)) return;

		setUpdatingStatus(true);
		try {
			await GroupsService.updateGroupStatus(group._id, newStatus);
			enqueueSnackbar(`Grupo ${labels[newStatus]}do correctamente`, { variant: "success" });
			onStatusChanged();
			load();
		} catch {
			enqueueSnackbar("Error al actualizar el estado", { variant: "error" });
		} finally {
			setUpdatingStatus(false);
		}
	};

	const statusChip = group ? STATUS_CHIP[group.status] : null;
	const ownerPlan = group?.owner?.subscriptionPlan ?? "free";

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { height: "85vh" } }}>
			<DialogTitle sx={{ pb: 1 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Stack spacing={0.5}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="h5">{group?.name ?? "Detalle del Grupo"}</Typography>
							{statusChip && <Chip size="small" label={statusChip.label} color={statusChip.color} />}
							<Chip size="small" label={PLAN_LABEL[ownerPlan]} color={PLAN_COLOR[ownerPlan]} variant="outlined" />
						</Stack>
						{group?.description && (
							<Typography variant="body2" color="text.secondary">
								{group.description}
							</Typography>
						)}
						{group?._id && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
									{group._id}
								</Typography>
								<Tooltip title="Copiar ID">
									<IconButton size="small" onClick={() => handleCopyId(group._id)} sx={{ p: 0.25 }}>
										<Copy size={12} />
									</IconButton>
								</Tooltip>
							</Stack>
						)}
					</Stack>
					<IconButton onClick={onClose} size="small">
						<CloseCircle size={20} />
					</IconButton>
				</Stack>
			</DialogTitle>

			<Divider />

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
					<CircularProgress />
				</Box>
			) : !group ? (
				<Box sx={{ p: 3 }}>
					<Alert severity="error">No se pudo cargar el grupo</Alert>
				</Box>
			) : (
				<DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2, overflow: "auto" }}>
					{/* Header info */}
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<Paper variant="outlined" sx={{ p: 1.5 }}>
								<Typography variant="caption" color="text.secondary" display="block">
									Owner
								</Typography>
								<Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
									<Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{getUserFullName(group.owner).charAt(0).toUpperCase()}</Avatar>
									<Box>
										<Typography variant="body2" fontWeight={500}>
											{getUserFullName(group.owner)}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{group.owner?.email}
										</Typography>
									</Box>
								</Stack>
							</Paper>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
								<Typography variant="h4" fontWeight={700}>
									{group.totalMemberCount}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Miembros / {group.memberLimit ?? 0} máx
								</Typography>
							</Paper>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
								<Typography variant="h4" fontWeight={700}>
									{group.pendingInvitationsCount}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Invitaciones pendientes
								</Typography>
							</Paper>
						</Grid>
						<Grid item xs={12}>
							<Stack direction="row" spacing={1} flexWrap="wrap">
								<Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
									Creado: {formatDate(group.createdAt)} · Actualizado: {formatDate(group.updatedAt)}
								</Typography>
								<Box sx={{ flex: 1 }} />
								{/* Acciones de admin */}
								{group.status !== "active" && (
									<Button
										size="small"
										variant="outlined"
										color="success"
										disabled={updatingStatus}
										onClick={() => handleStatusChange("active")}
									>
										Activar
									</Button>
								)}
								{group.status === "active" && (
									<Button
										size="small"
										variant="outlined"
										color="warning"
										disabled={updatingStatus}
										onClick={() => handleStatusChange("suspended")}
									>
										Suspender
									</Button>
								)}
								{group.status !== "archived" && group.status !== "deleted" && (
									<Button
										size="small"
										variant="outlined"
										color="inherit"
										disabled={updatingStatus}
										onClick={() => handleStatusChange("archived")}
									>
										Archivar
									</Button>
								)}
							</Stack>
						</Grid>
					</Grid>

					{/* Tabs */}
					<Box>
						<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
							<Tab
								label={
									<Stack direction="row" spacing={0.5} alignItems="center">
										<People size={16} />
										<span>Miembros ({group.totalMemberCount})</span>
									</Stack>
								}
							/>
							<Tab
								label={
									<Stack direction="row" spacing={0.5} alignItems="center">
										<Messages2 size={16} />
										<span>Invitaciones</span>
									</Stack>
								}
							/>
							<Tab
								label={
									<Stack direction="row" spacing={0.5} alignItems="center">
										<DocumentText size={16} />
										<span>Recursos</span>
									</Stack>
								}
							/>
							<Tab
								label={
									<Stack direction="row" spacing={0.5} alignItems="center">
										<Clock size={16} />
										<span>Historial</span>
									</Stack>
								}
							/>
							<Tab
								label={
									<Stack direction="row" spacing={0.5} alignItems="center">
										<Code size={16} />
										<span>JSON</span>
									</Stack>
								}
							/>
						</Tabs>

						<TabPanel value={tab} index={0}>
							<MembersTab
								groupId={group._id}
								onMemberRemoved={() => {
									onStatusChanged();
									load();
								}}
							/>
						</TabPanel>
						<TabPanel value={tab} index={1}>
							<InvitationsTab groupId={group._id} />
						</TabPanel>
						<TabPanel value={tab} index={2}>
							<ResourcesTab group={group} />
						</TabPanel>
						<TabPanel value={tab} index={3}>
							<HistoryTab groupId={group._id} />
						</TabPanel>
						<TabPanel value={tab} index={4}>
							<JsonTab group={group} />
						</TabPanel>
					</Box>
				</DialogContent>
			)}
		</Dialog>
	);
}
