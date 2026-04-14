import { useEffect, useState } from "react";
import {
	Box, Button, Chip, CircularProgress, Collapse, Divider, IconButton, Link, Stack, Table, TableBody, TableCell,
	TableContainer, TableHead, TablePagination, TableRow,
	TextField, Tooltip, Typography, Select, MenuItem, FormControl, InputLabel,
	Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { Add, ArrowDown2, ArrowRight2, DocumentDownload, Eye, Trash, RefreshCircle, SearchNormal1 } from "iconsax-react";
import { useDispatch, useSelector } from "store";
import { fetchSolicitudes, deleteSolicitud, reactivarSolicitud, getSecloDownloadUrl, resetAgendaData } from "store/reducers/seclo";
import type { SecloDocTipo, SecloSolicitud, SecloStatus } from "types/seclo";
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

const DOC_TIPO_LABELS: Record<SecloDocTipo, string> = {
	dni:        "D.N.I.",
	credencial: "Credencial letrado",
	poder:      "Poder",
	formulario: "Formulario",
	otros:      "Otros",
};

// ─── Botón de descarga de documento S3 ───────────────────────────────────────

function DownloadDocButton({ s3Key, label }: { s3Key: string; label: string }) {
	const dispatch = useDispatch();
	const [loading, setLoading] = useState(false);

	const handleDownload = async () => {
		setLoading(true);
		try {
			const url = await dispatch(getSecloDownloadUrl(s3Key));
			if (url) {
				const a = document.createElement("a");
				a.href = url;
				a.download = label;
				a.target = "_blank";
				a.click();
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Link
			component="button"
			variant="body2"
			onClick={handleDownload}
			sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, textDecoration: "none" }}
		>
			{loading ? <CircularProgress size={14} /> : <DocumentDownload size={14} />}
			{label}
		</Link>
	);
}

// ─── Dialog de detalle ────────────────────────────────────────────────────────

function SolicitudDetailDialog({ sol: initialSol, onClose }: { sol: SecloSolicitud; onClose: () => void }) {
	const dispatch = useDispatch();
	// Usar el documento fresco del store (se actualiza después de resetAgendaData)
	const solicitudes = useSelector((s: any) => s.seclo.solicitudes as SecloSolicitud[]);
	const sol: SecloSolicitud = solicitudes.find((s) => s._id === initialSol._id) ?? initialSol;

	const audiencias = sol.resultado?.audiencias ?? [];
	const hasResultado = !!(sol.resultado?.numeroExpediente || sol.resultado?.numeroTramite || audiencias.length > 0);
	const [showJson, setShowJson] = useState(false);
	const [resetting, setResetting] = useState(false);

	const handleResetAgenda = async () => {
		setResetting(true);
		try {
			await dispatch(resetAgendaData(sol._id));
		} finally {
			setResetting(false);
		}
	};

	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				Solicitud <Typography component="span" variant="body2" color="text.secondary">…{sol._id.slice(-8)}</Typography>
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={1.5}>

					{/* Info general */}
					<Box>
						<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>General</Typography>
						<Stack spacing={0.5} mt={0.5}>
							<Typography variant="body2"><strong>Usuario:</strong> {getUserName(sol)}</Typography>
							<Typography variant="body2"><strong>Estado:</strong>{" "}
								<Chip label={STATUS_LABELS[sol.status]} color={STATUS_COLORS[sol.status]} size="small" sx={{ ml: 0.5 }} />
							</Typography>
							<Typography variant="body2"><strong>Tipo trámite:</strong> {sol.tipoTramite}</Typography>
							<Typography variant="body2"><strong>Iniciado por:</strong> {sol.iniciadoPor}</Typography>
							<Typography variant="body2"><strong>Objeto del reclamo:</strong> {sol.objetoReclamo.join(", ")}</Typography>
							{sol.submittedAt && (
								<Typography variant="body2"><strong>Enviado:</strong> {new Date(sol.submittedAt).toLocaleString("es-AR")}</Typography>
							)}
							{sol.completedAt && (
								<Typography variant="body2"><strong>Completado:</strong> {new Date(sol.completedAt).toLocaleString("es-AR")}</Typography>
							)}
						</Stack>
					</Box>

					{/* Resultado */}
					{hasResultado && (
						<>
							<Divider />
							<Box>
								<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>Resultado del portal</Typography>
								<Stack spacing={0.5} mt={0.5}>
									{sol.resultado?.numeroExpediente && (
										<Typography variant="body2"><strong>Expediente:</strong> {sol.resultado.numeroExpediente}</Typography>
									)}
									{sol.resultado?.numeroTramite && (
										<Typography variant="body2"><strong>N° trámite:</strong> {sol.resultado.numeroTramite}</Typography>
									)}
								</Stack>

								{/* Audiencias */}
								{audiencias.length > 0 && (
									<Box mt={1}>
										<Typography variant="body2" fontWeight={600}>Audiencias asignadas</Typography>
										{audiencias.map((aud, i) => (
											<Box key={i} mt={0.75} pl={1} borderLeft="3px solid" borderColor="primary.main">
												<Stack spacing={0.25}>
													{aud.fecha && (
														<Typography variant="body2">
															<strong>Fecha:</strong> {aud.fecha}{aud.hora ? ` — ${aud.hora} hs` : ""}
														</Typography>
													)}
													{aud.lugar && (
														<Typography variant="body2"><strong>Lugar:</strong> {aud.lugar}</Typography>
													)}
													{aud.constanciaKey && (
														<DownloadDocButton
															s3Key={aud.constanciaKey}
															label={`Constancia audiencia${aud.fecha ? ` ${aud.fecha}` : ""}`}
														/>
													)}
													{/* Conciliador */}
													{aud.conciliador && (aud.conciliador.nombre || aud.conciliador.email || aud.conciliador.telefono) && (
														<Box mt={0.5} pt={0.5} borderTop="1px dashed" borderColor="divider">
															<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
																Conciliador
															</Typography>
															<Stack spacing={0.25} mt={0.25}>
																{aud.conciliador.nombre && (
																	<Typography variant="body2"><strong>Nombre:</strong> {aud.conciliador.nombre}</Typography>
																)}
																{aud.conciliador.telefono && (
																	<Typography variant="body2"><strong>Teléfono:</strong> {aud.conciliador.telefono}</Typography>
																)}
																{aud.conciliador.email && (
																	<Typography variant="body2">
																		<strong>Email:</strong>{" "}
																		<Link href={`mailto:${aud.conciliador.email}`} variant="body2">{aud.conciliador.email}</Link>
																	</Typography>
																)}
																{aud.conciliador.sala && (
																	<Typography variant="body2"><strong>Sala:</strong> {aud.conciliador.sala}</Typography>
																)}
															</Stack>
														</Box>
													)}
													{!aud.agendaScrapeAt && aud.fecha && (
														<Typography variant="caption" color="text.secondary" fontStyle="italic">
															Datos de conciliador pendientes
														</Typography>
													)}
												</Stack>
											</Box>
										))}
									</Box>
								)}
							</Box>
						</>
					)}

					{/* Error */}
					{sol.errorInfo?.message && (
						<>
							<Divider />
							<Box>
								<Typography variant="caption" color="error" textTransform="uppercase" letterSpacing={0.5}>Error</Typography>
								<Typography variant="body2" color="error" mt={0.5}>{sol.errorInfo.message}</Typography>
								{sol.errorInfo.code && (
									<Typography variant="caption" color="text.secondary">Código: {sol.errorInfo.code}</Typography>
								)}
								<Typography variant="caption" color="text.secondary" display="block">
									Reintentos: {sol.retryCount}
								</Typography>
							</Box>
						</>
					)}

					{/* Documentos adjuntos (input) */}
					<Divider />
					<Box>
						<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
							Documentos adjuntos
						</Typography>
						{sol.documentos.length === 0 ? (
							<Typography variant="body2" color="text.secondary" mt={0.5}>Sin documentos</Typography>
						) : (
							<Stack spacing={0.75} mt={0.5}>
								{sol.documentos.map((doc, i) => (
									<Box key={i} display="flex" alignItems="center" gap={1}>
										<Typography variant="body2" color="text.secondary" minWidth={110}>
											{DOC_TIPO_LABELS[doc.tipo] ?? doc.tipo}
										</Typography>
										{doc.s3Key ? (
											<DownloadDocButton
												s3Key={doc.s3Key}
												label={doc.fileName || doc.s3Key.split("/").pop() || "Descargar"}
											/>
										) : (
											<Typography variant="body2" color="text.secondary">—</Typography>
										)}
									</Box>
								))}
							</Stack>
						)}
					</Box>

					{/* Raw JSON debug */}
					<Divider />
					<Box>
						<Box
							display="flex" alignItems="center" gap={0.5} sx={{ cursor: "pointer" }}
							onClick={() => setShowJson(v => !v)}
						>
							{showJson ? <ArrowDown2 size={14} /> : <ArrowRight2 size={14} />}
							<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
								JSON debug
							</Typography>
						</Box>
						<Collapse in={showJson}>
							<Box
								component="pre"
								sx={{
									mt: 1, p: 1.5, bgcolor: "grey.900", color: "grey.100", borderRadius: 1,
									fontSize: 11, overflowX: "auto", maxHeight: 400, whiteSpace: "pre-wrap", wordBreak: "break-all",
								}}
							>
								{JSON.stringify(sol, null, 2)}
							</Box>
						</Collapse>
					</Box>

				</Stack>
			</DialogContent>
			<DialogActions>
				{["completed", "submitted"].includes(sol.status) && (
					<Tooltip title="Resetea agendaScrapeAt y conciliador para reprocesar con el worker de agenda">
						<Button
							color="warning" size="small" onClick={handleResetAgenda}
							disabled={resetting}
							startIcon={resetting ? <CircularProgress size={14} /> : <RefreshCircle size={14} />}
						>
							Reset Agenda
						</Button>
					</Tooltip>
				)}
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
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
									<Typography variant="body2">
										{sol.resultado?.numeroExpediente || sol.resultado?.numeroTramite
											? `${sol.resultado?.numeroExpediente || ""}${sol.resultado?.numeroTramite ? ` #${sol.resultado.numeroTramite}` : ""}`.trim()
											: "—"}
									</Typography>
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
				<SolicitudDetailDialog sol={viewTarget} onClose={() => setViewTarget(null)} />
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
