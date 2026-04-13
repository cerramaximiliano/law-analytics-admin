import { useEffect, useState } from "react";
import {
	Box, Button, Chip, IconButton, Table, TableBody, TableCell,
	TableContainer, TableHead, TablePagination, TableRow,
	TextField, Tooltip, Typography, Select, MenuItem, FormControl, InputLabel,
	Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { Add, Eye, Trash, RefreshCircle, SearchNormal1 } from "iconsax-react";
import { useDispatch, useSelector } from "store";
import { fetchSolicitudes, deleteSolicitud, reactivarSolicitud } from "store/reducers/seclo";
import type { SecloSolicitud, SecloStatus } from "types/seclo";
import CreateSolicitudModal from "./CreateSolicitudModal";

const STATUS_COLORS: Record<SecloStatus, "default" | "warning" | "info" | "success" | "error"> = {
	pending:    "warning",
	processing: "info",
	submitted:  "info",
	completed:  "success",
	error:      "error",
};

const STATUS_LABELS: Record<SecloStatus, string> = {
	pending:    "Pendiente",
	processing: "Procesando",
	submitted:  "Enviado",
	completed:  "Completado",
	error:      "Error",
};

function getUserName(sol: SecloSolicitud): string {
	if (sol.userId && typeof sol.userId === "object") return `${sol.userId.name} (${sol.userId.email})`;
	return String(sol.userId);
}

function getParticipantName(p: SecloSolicitud["requirentes"][0]): string {
	if (p.contactId && typeof p.contactId === "object") return `${p.contactId.name} ${p.contactId.lastName || ""}`.trim();
	return p.snapshot?.name || "—";
}

export default function SolicitudesTab() {
	const dispatch = useDispatch();
	const { solicitudes, solicitudesTotal, loading } = useSelector((s) => s.seclo);

	const [page, setPage]         = useState(0);
	const [rowsPerPage]           = useState(15);
	const [search, setSearch]     = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [openCreate, setOpenCreate]     = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<SecloSolicitud | null>(null);
	const [viewTarget, setViewTarget]     = useState<SecloSolicitud | null>(null);

	const load = () => {
		dispatch(fetchSolicitudes({
			page: page + 1,
			limit: rowsPerPage,
			status: statusFilter || undefined,
			search: search || undefined,
		}));
	};

	useEffect(() => { load(); }, [page, statusFilter]);

	const handleSearch = () => { setPage(0); load(); };

	const handleDelete = async () => {
		if (!deleteTarget) return;
		await dispatch(deleteSolicitud(deleteTarget._id));
		setDeleteTarget(null);
	};

	const handleReactivar = async (sol: SecloSolicitud) => {
		await dispatch(reactivarSolicitud(sol._id));
	};

	return (
		<Box>
			{/* Toolbar */}
			<Box display="flex" gap={1.5} mb={2} flexWrap="wrap" alignItems="center">
				<TextField
					size="small" placeholder="Buscar usuario..." value={search}
					onChange={e => setSearch(e.target.value)}
					onKeyDown={e => e.key === "Enter" && handleSearch()}
					InputProps={{ startAdornment: <SearchNormal1 size={16} style={{ marginRight: 6 }} /> }}
					sx={{ width: 220 }}
				/>
				<FormControl size="small" sx={{ minWidth: 150 }}>
					<InputLabel>Estado</InputLabel>
					<Select value={statusFilter} label="Estado" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(STATUS_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
					</Select>
				</FormControl>
				<Box flexGrow={1} />
				<Button variant="contained" startIcon={<Add size={18} />} onClick={() => setOpenCreate(true)}>
					Nueva solicitud
				</Button>
			</Box>

			{/* Tabla */}
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Usuario</TableCell>
							<TableCell>Requirente</TableCell>
							<TableCell>Requerido</TableCell>
							<TableCell>Objeto del reclamo</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell>Expediente</TableCell>
							<TableCell>Creado</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow><TableCell colSpan={8} align="center">Cargando...</TableCell></TableRow>
						) : solicitudes.length === 0 ? (
							<TableRow><TableCell colSpan={8} align="center">Sin solicitudes</TableCell></TableRow>
						) : solicitudes.map(sol => (
							<TableRow key={sol._id} hover>
								<TableCell>
									<Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{getUserName(sol)}</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="body2" noWrap>{getParticipantName(sol.requirentes[0])}</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="body2" noWrap>{getParticipantName(sol.requeridos[0])}</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
										{sol.objetoReclamo.join(", ")}
									</Typography>
								</TableCell>
								<TableCell>
									<Chip label={STATUS_LABELS[sol.status]} color={STATUS_COLORS[sol.status]} size="small" />
								</TableCell>
								<TableCell>
									<Typography variant="body2">{sol.resultado?.numeroExpediente || "—"}</Typography>
								</TableCell>
								<TableCell>
									<Typography variant="caption">
										{new Date(sol.createdAt).toLocaleDateString("es-AR")}
									</Typography>
								</TableCell>
								<TableCell align="center">
									<Box display="flex" gap={0.5} justifyContent="center">
										<Tooltip title="Ver detalle">
											<IconButton size="small" onClick={() => setViewTarget(sol)}>
												<Eye size={16} />
											</IconButton>
										</Tooltip>
										{sol.status === "error" && (
											<Tooltip title="Reactivar">
												<IconButton size="small" color="warning" onClick={() => handleReactivar(sol)}>
													<RefreshCircle size={16} />
												</IconButton>
											</Tooltip>
										)}
										{["pending", "error"].includes(sol.status) && (
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => setDeleteTarget(sol)}>
													<Trash size={16} />
												</IconButton>
											</Tooltip>
										)}
									</Box>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div" count={solicitudesTotal}
				page={page} onPageChange={(_, p) => setPage(p)}
				rowsPerPage={rowsPerPage} rowsPerPageOptions={[15]}
			/>

			{/* Modales */}
			<CreateSolicitudModal open={openCreate} onClose={() => { setOpenCreate(false); load(); }} />

			{/* Vista de detalle */}
			{viewTarget && (
				<Dialog open onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth>
					<DialogTitle>Solicitud {viewTarget._id.slice(-8)}</DialogTitle>
					<DialogContent>
						<Typography variant="body2"><strong>Usuario:</strong> {getUserName(viewTarget)}</Typography>
						<Typography variant="body2"><strong>Estado:</strong> {STATUS_LABELS[viewTarget.status]}</Typography>
						<Typography variant="body2"><strong>Tipo trámite:</strong> {viewTarget.tipoTramite}</Typography>
						<Typography variant="body2"><strong>Objeto:</strong> {viewTarget.objetoReclamo.join(", ")}</Typography>
						{viewTarget.resultado?.numeroExpediente && (
							<Typography variant="body2"><strong>Expediente:</strong> {viewTarget.resultado.numeroExpediente}</Typography>
						)}
						{viewTarget.errorInfo?.message && (
							<Box mt={1}>
								<Typography variant="body2" color="error">
									<strong>Error:</strong> {viewTarget.errorInfo.message}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Reintentos: {viewTarget.retryCount}
								</Typography>
							</Box>
						)}
						<Box mt={1}>
							<Typography variant="body2"><strong>Documentos:</strong></Typography>
							{viewTarget.documentos.length === 0 ? (
								<Typography variant="body2" color="text.secondary">Sin documentos adjuntos</Typography>
							) : viewTarget.documentos.map((d, i) => (
								<Typography key={i} variant="body2">• {d.tipo}: {d.fileName || d.s3Key}</Typography>
							))}
						</Box>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setViewTarget(null)}>Cerrar</Button>
					</DialogActions>
				</Dialog>
			)}

			{/* Confirmar eliminación */}
			{deleteTarget && (
				<Dialog open onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
					<DialogTitle>Eliminar solicitud</DialogTitle>
					<DialogContent>
						<Typography>¿Eliminar la solicitud de <strong>{getParticipantName(deleteTarget.requirentes[0])}</strong>?</Typography>
						<Typography variant="body2" color="text.secondary" mt={1}>Esta acción también eliminará los archivos adjuntos de S3.</Typography>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
						<Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
					</DialogActions>
				</Dialog>
			)}
		</Box>
	);
}
