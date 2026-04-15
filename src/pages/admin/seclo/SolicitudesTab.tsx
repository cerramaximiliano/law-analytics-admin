import { useEffect, useState } from "react";
import {
	Box, Button, Chip, CircularProgress, Divider, Grid, IconButton, Link, Stack, Tab, Table, TableBody, TableCell,
	TableContainer, TableHead, TablePagination, TableRow, Tabs,
	TextField, Tooltip, Typography, Select, MenuItem, FormControl, InputLabel,
	Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { Add, DocumentDownload, Eye, Trash, RefreshCircle, SearchNormal1 } from "iconsax-react";
import { useDispatch, useSelector } from "store";
import { fetchSolicitudes, deleteSolicitud, reactivarSolicitud, getSecloDownloadUrl, resetAgendaData, fetchFoldersByUser, linkSolicitudFolder } from "store/reducers/seclo";
import type { SecloCaracter, SecloDocTipo, SecloDatosAbogado, SecloDatosLaborales, SecloFolder, SecloSolicitud, SecloStatus } from "types/seclo";
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

// ─── Helpers de label ─────────────────────────────────────────────────────────

const CARACTER_LABELS: Record<SecloCaracter, string> = {
	apoderado:      "Apoderado",
	patrocinante:   "Patrocinante",
	rep_gremial:    "Rep. gremial",
	rep_empresarial: "Rep. empresarial",
};

const ESTADO_TRABAJADOR_LABELS: Record<string, string> = {
	regular:       "Regular",
	irregular:     "Irregular",
	no_registrado: "No registrado",
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
	if (value === undefined || value === null || value === "") return null;
	return (
		<Typography variant="body2">
			<strong>{label}:</strong> {value}
		</Typography>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
			{children}
		</Typography>
	);
}

function AbogadoSection({ datos }: { datos: SecloDatosAbogado }) {
	const nombreCompleto = [datos.nombre, datos.apellido].filter(Boolean).join(" ") || null;
	const celular = datos.celular?.codArea && datos.celular?.numero
		? `(${datos.celular.codArea}) ${datos.celular.numero}`
		: null;
	const dom = datos.domicilio;
	let domStr: string | null = null;
	if (dom) {
		if (dom.descripcionCompleta) {
			domStr = dom.descripcionCompleta;
		} else {
			const parts = [dom.calle, dom.numero, dom.piso && `Piso ${dom.piso}`, dom.depto && `Dpto ${dom.depto}`, dom.localidad, dom.partido, dom.provincia, dom.cpa].filter(Boolean);
			domStr = parts.join(", ") || null;
		}
	}
	return (
		<Box>
			<SectionTitle>Abogado</SectionTitle>
			<Stack spacing={0.5} mt={0.5}>
				<InfoRow label="Nombre" value={nombreCompleto} />
				<InfoRow label="Carácter" value={CARACTER_LABELS[datos.caracter]} />
				<InfoRow label="Tomo / Folio" value={datos.tomo && datos.folio ? `${datos.tomo} / ${datos.folio}` : undefined} />
				<InfoRow label="Email" value={datos.email} />
				<InfoRow label="Teléfono" value={datos.telefono} />
				<InfoRow label="Celular" value={celular} />
				<InfoRow label="Domicilio" value={domStr} />
			</Stack>
		</Box>
	);
}

function ParticipanteSection({
	title,
	snapshot,
	datosLaborales,
}: {
	title: string;
	snapshot?: Partial<{ name: string; lastName: string; cuit: string; document: string; phone: string; phoneCodArea: string; phoneCelular: string; email: string; address: string; city: string; state: string; zipCode: string }>;
	datosLaborales?: SecloDatosLaborales;
}) {
	if (!snapshot) return null;
	const nombre = [snapshot.name, snapshot.lastName].filter(Boolean).join(" ") || null;
	const telefono = snapshot.phoneCodArea && snapshot.phone
		? `(${snapshot.phoneCodArea}) ${snapshot.phone}`
		: snapshot.phone || null;
	const domicilio = [snapshot.address, snapshot.city, snapshot.state, snapshot.zipCode].filter(Boolean).join(", ") || null;

	return (
		<Box>
			<SectionTitle>{title}</SectionTitle>
			<Stack spacing={0.5} mt={0.5}>
				<InfoRow label="Nombre" value={nombre} />
				<InfoRow label="CUIT" value={snapshot.cuit} />
				<InfoRow label="DNI" value={snapshot.document} />
				<InfoRow label="Teléfono" value={telefono} />
				<InfoRow label="Celular" value={snapshot.phoneCelular} />
				<InfoRow label="Email" value={snapshot.email} />
				<InfoRow label="Domicilio" value={domicilio} />
			</Stack>

			{datosLaborales && (
				<Box mt={1} pl={1.5} borderLeft="3px solid" borderColor="divider">
					<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
						Datos laborales
					</Typography>
					<Grid container spacing={0.5} mt={0.25}>
						{[
							["Fecha nacimiento", datosLaborales.fechaNacimiento],
							["Fecha ingreso", datosLaborales.fechaIngreso],
							["Fecha egreso", datosLaborales.fechaEgreso],
							["Remuneración", datosLaborales.remuneracion != null ? `$${datosLaborales.remuneracion.toLocaleString("es-AR")}` : null],
							["Importe reclamo", datosLaborales.importeReclamo != null ? `$${datosLaborales.importeReclamo.toLocaleString("es-AR")}` : null],
							["CCT", datosLaborales.cct],
							["Categoría", datosLaborales.categoria],
							["Estado", datosLaborales.estadoTrabajador ? ESTADO_TRABAJADOR_LABELS[datosLaborales.estadoTrabajador] : null],
							["Sexo", datosLaborales.sexo === "M" ? "Masculino" : datosLaborales.sexo === "F" ? "Femenino" : null],
						].filter(([, v]) => v != null && v !== "").map(([label, val]) => (
							<Grid item xs={12} sm={6} key={String(label)}>
								<Typography variant="body2"><strong>{label}:</strong> {val}</Typography>
							</Grid>
						))}
					</Grid>
				</Box>
			)}
		</Box>
	);
}

function FormularioTab({ sol }: { sol: SecloSolicitud }) {
	const req = sol.requirentes[0];
	const red = sol.requeridos[0];

	return (
		<Stack spacing={2}>
			{/* Reclamo */}
			<Box>
				<SectionTitle>Reclamo</SectionTitle>
				<Stack spacing={0.5} mt={0.5}>
					<InfoRow label="Tipo trámite" value={sol.tipoTramite} />
					<InfoRow label="Iniciado por" value={sol.iniciadoPor} />
					<InfoRow label="Objeto del reclamo" value={sol.objetoReclamo.join(", ")} />
					{sol.comentarioReclamo && (
						<Typography variant="body2"><strong>Comentario:</strong> {sol.comentarioReclamo}</Typography>
					)}
				</Stack>
			</Box>

			{/* Abogado */}
			{sol.datosAbogado && (
				<>
					<Divider />
					<AbogadoSection datos={sol.datosAbogado} />
				</>
			)}

			{/* Requirente / Trabajador */}
			{req?.snapshot && (
				<>
					<Divider />
					<ParticipanteSection
						title="Requirente / Trabajador"
						snapshot={req.snapshot}
						datosLaborales={req.datosLaborales}
					/>
				</>
			)}

			{/* Requerido / Empleador */}
			{red?.snapshot && (
				<>
					<Divider />
					<ParticipanteSection title="Requerido / Empleador" snapshot={red.snapshot} />
				</>
			)}

			{!sol.datosAbogado && !req?.snapshot && !red?.snapshot && (
				<Typography variant="body2" color="text.secondary">Sin datos de formulario disponibles.</Typography>
			)}
		</Stack>
	);
}

// ─── Dialog de selección de carpeta ──────────────────────────────────────────

function FolderPickerDialog({
	userId,
	onSelect,
	onClose,
}: {
	userId: string;
	onSelect: (folder: SecloFolder) => void;
	onClose: () => void;
}) {
	const dispatch = useDispatch();
	const [search, setSearch] = useState("");
	const [folders, setFolders] = useState<SecloFolder[]>([]);
	const [loading, setLoading] = useState(false);

	const doSearch = async (q: string) => {
		setLoading(true);
		try {
			const result = await dispatch(fetchFoldersByUser(userId, q || undefined));
			setFolders(result);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { doSearch(""); }, []);

	return (
		<Dialog open onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Vincular carpeta</DialogTitle>
			<DialogContent dividers>
				<TextField
					fullWidth size="small" placeholder="Buscar carpeta..." value={search}
					onChange={e => setSearch(e.target.value)}
					onKeyDown={e => e.key === "Enter" && doSearch(search)}
					InputProps={{ startAdornment: <SearchNormal1 size={16} style={{ marginRight: 6 }} /> }}
					sx={{ mb: 1.5 }}
				/>
				<Button size="small" variant="outlined" onClick={() => doSearch(search)} disabled={loading} sx={{ mb: 1.5 }}>
					{loading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null} Buscar
				</Button>
				{folders.length === 0 && !loading && (
					<Typography variant="body2" color="text.secondary">Sin carpetas encontradas</Typography>
				)}
				<Stack spacing={0.75} mt={0.5}>
					{folders.map(f => (
						<Box
							key={f._id}
							sx={{
								p: 1, borderRadius: 1, border: "1px solid", borderColor: "divider",
								cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
							}}
							onClick={() => onSelect(f)}
						>
							<Typography variant="body2" fontWeight={600}>{f.folderName}</Typography>
							{f.materia && (
								<Typography variant="caption" color="text.secondary">{f.materia}</Typography>
							)}
						</Box>
					))}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
			</DialogActions>
		</Dialog>
	);
}

// ─── Dialog de detalle ────────────────────────────────────────────────────────

function SolicitudDetailDialog({ sol: initialSol, onClose }: { sol: SecloSolicitud; onClose: () => void }) {
	const dispatch = useDispatch();
	const solicitudes = useSelector((s: any) => s.seclo.solicitudes as SecloSolicitud[]);
	const sol: SecloSolicitud = solicitudes.find((s) => s._id === initialSol._id) ?? initialSol;

	const audiencias = sol.resultado?.audiencias ?? [];
	const hasResultado = !!(sol.resultado?.numeroExpediente || sol.resultado?.numeroTramite || audiencias.length > 0);
	const [tab, setTab] = useState(0);
	const [resetting, setResetting] = useState(false);
	const [folderPicker, setFolderPicker] = useState(false);
	const [linkingFolder, setLinkingFolder] = useState(false);

	const handleResetAgenda = async () => {
		setResetting(true);
		try {
			await dispatch(resetAgendaData(sol._id));
		} finally {
			setResetting(false);
		}
	};

	const handleLinkFolder = async (folder: SecloFolder) => {
		setFolderPicker(false);
		setLinkingFolder(true);
		try {
			await dispatch(linkSolicitudFolder(sol._id, folder._id));
		} finally {
			setLinkingFolder(false);
		}
	};

	const handleUnlinkFolder = async () => {
		setLinkingFolder(true);
		try {
			await dispatch(linkSolicitudFolder(sol._id, null));
		} finally {
			setLinkingFolder(false);
		}
	};

	const userId = typeof sol.userId === "object" ? sol.userId._id : sol.userId;
	const linkedFolder = sol.folderId && typeof sol.folderId === "object" ? sol.folderId as SecloFolder : null;

	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				Solicitud <Typography component="span" variant="body2" color="text.secondary">…{sol._id.slice(-8)}</Typography>
			</DialogTitle>

			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}>
				<Tab label="Detalle" />
				<Tab label="Formulario" />
				<Tab label="JSON" />
			</Tabs>

			<DialogContent dividers>

				{/* ── Tab 0: Detalle ── */}
				{tab === 0 && (
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

									{audiencias.length > 0 && (
										<Box mt={1}>
											<Typography variant="body2" fontWeight={600}>Audiencias asignadas</Typography>
											{audiencias.map((aud: any, i: number) => (
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

						{/* Carpeta vinculada */}
						<Divider />
						<Box>
							<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
								Carpeta vinculada
							</Typography>
							<Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
								{linkedFolder ? (
									<>
										<Chip
											label={linkedFolder.folderName}
											size="small"
											color="primary"
											variant="outlined"
											onDelete={handleUnlinkFolder}
											sx={{ maxWidth: 260 }}
										/>
										{linkedFolder.materia && (
											<Typography variant="caption" color="text.secondary">{linkedFolder.materia}</Typography>
										)}
									</>
								) : (
									<Typography variant="body2" color="text.secondary">Sin carpeta vinculada</Typography>
								)}
								<Button
									size="small"
									variant="text"
									onClick={() => setFolderPicker(true)}
									disabled={linkingFolder}
									sx={{ ml: linkedFolder ? 0 : 0, minWidth: 0, px: 1 }}
								>
									{linkingFolder ? <CircularProgress size={14} /> : linkedFolder ? "Cambiar" : "Vincular carpeta"}
								</Button>
							</Box>
						</Box>

						{/* Documentos adjuntos */}
						<Divider />
						<Box>
							<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
								Documentos adjuntos
							</Typography>
							{sol.documentos.length === 0 ? (
								<Typography variant="body2" color="text.secondary" mt={0.5}>Sin documentos</Typography>
							) : (
								<Stack spacing={0.75} mt={0.5}>
									{sol.documentos.map((doc: any, i: number) => (
										<Box key={i} display="flex" alignItems="center" gap={1}>
											<Typography variant="body2" color="text.secondary" minWidth={110}>
												{DOC_TIPO_LABELS[doc.tipo as SecloDocTipo] ?? doc.tipo}
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

					</Stack>
				)}

				{/* ── Tab 1: Formulario completo ── */}
				{tab === 1 && <FormularioTab sol={sol} />}

				{/* ── Tab 2: JSON debug ── */}
				{tab === 2 && (
					<Box
						component="pre"
						sx={{
							m: 0, p: 1.5, bgcolor: "grey.900", color: "grey.100", borderRadius: 1,
							fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
							minHeight: 200,
						}}
					>
						{JSON.stringify(sol, null, 2)}
					</Box>
				)}

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

			{folderPicker && (
				<FolderPickerDialog
					userId={userId}
					onSelect={handleLinkFolder}
					onClose={() => setFolderPicker(false)}
				/>
			)}
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
