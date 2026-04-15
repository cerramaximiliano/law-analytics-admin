import { useState, useCallback, useEffect } from "react";
import {
	Dialog, DialogTitle, DialogContent, DialogActions,
	Button, Grid, TextField, Typography, Alert,
	Autocomplete, Stepper, Step, StepLabel,
	FormControl, InputLabel, Select, MenuItem,
	Checkbox, FormGroup, FormControlLabel, FormHelperText,
	Chip, Box, Divider, CircularProgress,
} from "@mui/material";
import { useDispatch, useSelector } from "store";
import {
	fetchUsers, createSolicitud, getPresignedUploadUrl, fetchFoldersByUser,
} from "store/reducers/seclo";
import {
	OBJETO_RECLAMO_OPTIONS,
	type SecloFolder, type SecloUser, type SecloContact, type SecloDatosLaborales, type SecloDocumento, type SecloDocTipo,
} from "types/seclo";

interface Props {
	open: boolean;
	onClose: () => void;
}

const STEPS = ["Usuario", "Trabajador", "Empleador", "Reclamo", "Abogado", "Documentos"];

const DOC_TIPO_LABEL: Record<SecloDocTipo, string> = {
	dni: "D.N.I",
	credencial: "Credencial letrado",
	poder: "Poder",
	formulario: "Formulario de autorización",
	otros: "Otros",
};

export default function CreateSolicitudModal({ open, onClose }: Props) {
	const dispatch = useDispatch();
	const { users } = useSelector((s) => s.seclo);
	const [localContacts, setLocalContacts] = useState<SecloContact[]>([]);

	const [step, setStep] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Cargar todos los usuarios al abrir el modal
	useEffect(() => {
		if (open) dispatch(fetchUsers(""));
	}, [open]);

	// Step 0 – Usuario
	const [selectedUser, setSelectedUser] = useState<SecloUser | null>(null);
	const [userSearch, setUserSearch] = useState("");
	const [selectedCredentialId, setSelectedCredentialId] = useState("");
	const [credentials, setCredentials] = useState<Array<{ _id: string; enabled: boolean }>>([]);
	const [contactsLoading, setContactsLoading] = useState(false);
	const [folders, setFolders] = useState<SecloFolder[]>([]);
	const [selectedFolder, setSelectedFolder] = useState<SecloFolder | null>(null);

	// Step 1 – Requirente (trabajador)
	const [requirente, setRequirente] = useState<SecloContact | null>(null);
	const [datosLab, setDatosLab] = useState<SecloDatosLaborales>({ estadoTrabajador: "regular", sexo: "M" });

	// Step 2 – Requerido (empleador)
	const [requerido, setRequerido] = useState<SecloContact | null>(null);

	// Step 3 – Reclamo
	const [objetoReclamo, setObjetoReclamo] = useState<string[]>([]);
	const [comentario, setComentario] = useState("");
	const [iniciadoPor, setIniciadoPor] = useState<"trabajador" | "empleador">("trabajador");

	// Step 4 – Abogado
	const [abogado, setAbogado] = useState({ tomo: "", folio: "", caracter: "apoderado", cpa: "" });

	// Step 5 – Documentos
	const [documentos, setDocumentos] = useState<SecloDocumento[]>([]);
	const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

	const resetAll = () => {
		setStep(0); setError(null);
		setSelectedUser(null); setUserSearch(""); setSelectedCredentialId(""); setCredentials([]); setContactsLoading(false); setLocalContacts([]);
		setFolders([]); setSelectedFolder(null);
		setRequirente(null); setDatosLab({ estadoTrabajador: "regular", sexo: "M" });
		setRequerido(null);
		setObjetoReclamo([]); setComentario(""); setIniciadoPor("trabajador");
		setAbogado({ tomo: "", folio: "", caracter: "apoderado", cpa: "" });
		setDocumentos([]);
	};

	const handleClose = () => { resetAll(); onClose(); };

	// ── Step 0: seleccionar usuario ───────────────────────────────────────────
	const handleUserSearch = (value: string) => {
		setUserSearch(value);
		if (value.length >= 2) dispatch(fetchUsers(value));
	};

	const handleSelectUser = async (user: SecloUser | null) => {
		setSelectedUser(user);
		setRequirente(null); setRequerido(null);
		setCredentials([]); setSelectedCredentialId(""); setLocalContacts([]);
		setFolders([]); setSelectedFolder(null);
		if (!user) return;
		setContactsLoading(true);
		try {
			const { default: adminAxios } = await import("utils/adminAxios");
			const [contactsRes, credsRes] = await Promise.all([
				adminAxios.get(`/api/seclo/users/${user._id}/contacts`),
				adminAxios.get("/api/seclo/credentials", { params: { userId: user._id, limit: 10 } }),
			]);
			setLocalContacts(contactsRes.data.contacts || []);
			const creds = credsRes.data.credentials || [];
			setCredentials(creds);
			if (creds.length === 1) setSelectedCredentialId(creds[0]._id);
			// Cargar carpetas del usuario para filtrado opcional
			const foldersResult = await dispatch(fetchFoldersByUser(user._id));
			setFolders(foldersResult);
		} catch (err: any) {
			console.error("[seclo] handleSelectUser → error:", err?.response?.data || err?.message);
		} finally {
			setContactsLoading(false);
		}
	};

	// ── Lógica de filtrado de contactos ──────────────────────────────────────

	// Contactos disponibles para el requirente
	// Si hay carpeta seleccionada → solo los de esa carpeta; si no → todos
	const contactsForRequirente = selectedFolder
		? localContacts.filter(c => c.folderIds?.includes(selectedFolder._id))
		: localContacts;

	// Carpetas a las que pertenece el requirente seleccionado
	const requirenteFolders = requirente?.folderIds?.length
		? folders.filter(f => requirente.folderIds!.includes(f._id))
		: [];

	// Contactos disponibles para el requerido:
	// 1. Si se eligió carpeta explícita → solo los de esa carpeta
	// 2. Si no y el requirente tiene carpetas → solo los que comparten al menos una carpeta
	// 3. Si el requirente no tiene carpetas → todos (sin restricción)
	const _baseRequerido = localContacts.filter(c => c._id !== requirente?._id);

	const contactsForRequeridoStrict = (() => {
		if (selectedFolder) return _baseRequerido.filter(c => c.folderIds?.includes(selectedFolder._id));
		if (requirente?.folderIds?.length) {
			const reqSet = new Set(requirente.folderIds);
			return _baseRequerido.filter(c => c.folderIds?.some(id => reqSet.has(id)));
		}
		return _baseRequerido;
	})();

	// Si el filtro estricto dejó sin opciones, activamos modo permisivo (todos los contactos)
	const requeridoPermissive = !selectedFolder && !!requirente?.folderIds?.length && contactsForRequeridoStrict.length === 0;
	const contactsForRequerido = requeridoPermissive ? _baseRequerido : contactsForRequeridoStrict;

	// ── Step 5: upload documento ──────────────────────────────────────────────
	const handleFileUpload = useCallback(async (file: File, tipo: SecloDocTipo) => {
		setUploadingDoc(tipo);
		try {
			const { uploadUrl, s3Key } = await getPresignedUploadUrl(file.name, file.type, selectedUser?._id);
			await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
			setDocumentos(prev => {
				const filtered = prev.filter(d => d.tipo !== tipo);
				return [...filtered, { tipo, s3Key, fileName: file.name }];
			});
		} catch (e: any) {
			setError(`Error subiendo ${tipo}: ${e.message}`);
		} finally {
			setUploadingDoc(null);
		}
	}, [selectedUser]);

	// ── Validación por step ───────────────────────────────────────────────────
	const canAdvance = () => {
		if (step === 0) return !!selectedUser && !!selectedCredentialId && !contactsLoading;
		if (step === 1) return !!requirente && !!requirente.phoneCelular;
		if (step === 2) return !!requerido;
		if (step === 3) return objetoReclamo.length > 0;
		if (step === 4) return !!abogado.tomo && !!abogado.folio;
		if (step === 5) return documentos.some(d => d.tipo === "dni") && documentos.some(d => d.tipo === "credencial");
		return false;
	};

	const handleNext = () => { setError(null); setStep(s => s + 1); };
	const handleBack = () => { setError(null); setStep(s => s - 1); };

	// ── Submit final ──────────────────────────────────────────────────────────
	const handleSubmit = async () => {
		setSubmitting(true); setError(null);
		try {
			await dispatch(createSolicitud({
				userId:        selectedUser!._id,
				credentialId:  selectedCredentialId,
				requirenteId:  requirente!._id,
				requirenteDatosLaborales: datosLab,
				requeridoId:   requerido!._id,
				objetoReclamo,
				comentarioReclamo: comentario,
				iniciadoPor,
				datosAbogado: { tomo: abogado.tomo, folio: abogado.folio, caracter: abogado.caracter, domicilio: { cpa: abogado.cpa } },
				documentos,
				folderId: selectedFolder?._id ?? undefined,
			}));
			handleClose();
		} catch (e: any) {
			setError(e.response?.data?.message || e.message);
		} finally {
			setSubmitting(false);
		}
	};

	// ── Render steps ──────────────────────────────────────────────────────────

	const renderStep = () => {
		switch (step) {
			// ── Step 0: Usuario ─────────────────────────────────────────────
			case 0: return (
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Autocomplete
							options={users}
							getOptionLabel={(u: SecloUser) => `${u.name} — ${u.email}`}
							onInputChange={(_, v) => handleUserSearch(v)}
							onChange={(_, v) => handleSelectUser(v)}
							value={selectedUser}
							noOptionsText={userSearch.length < 2 ? "Escribí para buscar..." : "Sin resultados"}
							renderInput={(params) => <TextField {...params} label="Usuario *" placeholder="Buscá por nombre o email" />}
						/>
					</Grid>
					{credentials.length > 0 && (
						<Grid item xs={12}>
							<FormControl fullWidth>
								<InputLabel>Credencial SECLO *</InputLabel>
								<Select value={selectedCredentialId} label="Credencial SECLO *" onChange={e => setSelectedCredentialId(e.target.value)}>
									{credentials.map(c => (
										<MenuItem key={c._id} value={c._id}>
											{c._id.slice(-8)}
											{!c.enabled && <Chip label="Deshabilitada" size="small" color="error" sx={{ ml: 1 }} />}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>
					)}
					{selectedUser && credentials.length === 0 && !contactsLoading && (
						<Grid item xs={12}>
							<Alert severity="warning">Este usuario no tiene credenciales SECLO. Creá una desde la pestaña Credenciales.</Alert>
						</Grid>
					)}
					{contactsLoading && (
						<Grid item xs={12} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<CircularProgress size={16} />
							<Typography variant="body2" color="text.secondary">Cargando contactos y carpetas...</Typography>
						</Grid>
					)}
					{selectedUser && !contactsLoading && (
						<Grid item xs={12}>
							<Alert severity="info" icon={false}>
								<Typography variant="body2" fontWeight={600} mb={0.5}>Vinculación entre carpetas y contactos</Typography>
								<Typography variant="body2">
									• Si elegís una <strong>carpeta</strong>, solo aparecerán contactos vinculados a ella en los pasos siguientes.
								</Typography>
								<Typography variant="body2">
									• Sin carpeta, al seleccionar el <strong>requirente</strong> el sistema filtrará el requerido a contactos que comparten al menos una carpeta con él.
								</Typography>
								<Typography variant="body2">
									• Si el requirente no tiene carpetas, o no hay contactos en común, se permiten todos los contactos del usuario.
								</Typography>
							</Alert>
						</Grid>
					)}
					{folders.length > 0 && !contactsLoading && (
						<Grid item xs={12}>
							<Autocomplete
								options={[null, ...folders] as (SecloFolder | null)[]}
								getOptionLabel={(f) => f ? f.folderName : "— Sin filtro de carpeta —"}
								onChange={(_, v) => {
									setSelectedFolder(v);
									setRequirente(null);
									setRequerido(null);
								}}
								value={selectedFolder}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Filtrar por carpeta (opcional)"
										helperText={selectedFolder
											? `${contactsForRequirente.length} contacto${contactsForRequirente.length !== 1 ? "s" : ""} en esta carpeta`
											: `${localContacts.length} contactos disponibles — sin restricción de carpeta`}
									/>
								)}
							/>
						</Grid>
					)}
					{selectedUser && !contactsLoading && folders.length === 0 && localContacts.length > 0 && (
						<Grid item xs={12}>
							<Alert severity="warning" icon={false}>
								<Typography variant="body2">
									Este usuario no tiene <strong>carpetas</strong>. Se mostrarán todos sus contactos sin restricción.
								</Typography>
							</Alert>
						</Grid>
					)}
				</Grid>
			);

			// ── Step 1: Requirente ───────────────────────────────────────────
			case 1: return (
				<Grid container spacing={2}>
					{selectedFolder && (
						<Grid item xs={12}>
							<Alert severity="info" icon={false}>
								<Typography variant="body2">
									Mostrando <strong>{contactsForRequirente.length}</strong> contacto{contactsForRequirente.length !== 1 ? "s" : ""} de la carpeta <strong>{selectedFolder.folderName}</strong>.
								</Typography>
							</Alert>
						</Grid>
					)}
					<Grid item xs={12}>
						<Autocomplete
							options={contactsForRequirente}
							getOptionLabel={(c: SecloContact) => `${c.name} ${c.lastName || ""}${c.cuit ? ` — ${c.cuit}` : ""}`}
							onChange={(_, v) => { setRequirente(v); setRequerido(null); }}
							value={requirente}
							noOptionsText={selectedFolder ? "No hay contactos en esta carpeta" : "Sin contactos para este usuario"}
							renderInput={(params) => <TextField {...params} label="Contacto requirente (trabajador) *" />}
						/>
						{requirente && !requirente.phoneCelular && (
							<Alert severity="warning" sx={{ mt: 1 }}>
								Este contacto no tiene <strong>phoneCelular</strong>. Es obligatorio para el portal SECLO. Actualizalo antes de continuar.
							</Alert>
						)}
					</Grid>
					{requirente && !selectedFolder && requirenteFolders.length > 0 && (
						<Grid item xs={12}>
							<Alert severity="info" icon={false}>
								<Typography variant="body2" mb={0.5}>
									El requirente pertenece a {requirenteFolders.length === 1 ? "la carpeta" : "las carpetas"}:
								</Typography>
								<Box display="flex" gap={0.5} flexWrap="wrap">
									{requirenteFolders.map(f => (
										<Chip key={f._id} label={f.folderName} size="small" variant="outlined" color="primary" />
									))}
								</Box>
								<Typography variant="body2" mt={0.5} color="text.secondary">
									El requerido se filtrará a contactos que comparten al menos una de estas carpetas.
								</Typography>
							</Alert>
						</Grid>
					)}
					{requirente && !selectedFolder && requirenteFolders.length === 0 && (
						<Grid item xs={12}>
							<Alert severity="warning" icon={false}>
								<Typography variant="body2">
									El requirente no está vinculado a ninguna carpeta. El requerido no tendrá restricción de carpeta.
								</Typography>
							</Alert>
						</Grid>
					)}
					<Grid item xs={6}>
						<TextField fullWidth type="date" label="Fecha de nacimiento" InputLabelProps={{ shrink: true }}
							value={datosLab.fechaNacimiento?.toString().slice(0, 10) || ""}
							onChange={e => setDatosLab(d => ({ ...d, fechaNacimiento: e.target.value || null }))} />
					</Grid>
					<Grid item xs={6}>
						<TextField fullWidth type="date" label="Fecha de ingreso" InputLabelProps={{ shrink: true }}
							value={datosLab.fechaIngreso?.toString().slice(0, 10) || ""}
							onChange={e => setDatosLab(d => ({ ...d, fechaIngreso: e.target.value || null }))} />
					</Grid>
					<Grid item xs={6}>
						<TextField fullWidth type="date" label="Fecha de egreso" InputLabelProps={{ shrink: true }}
							value={datosLab.fechaEgreso?.toString().slice(0, 10) || ""}
							onChange={e => setDatosLab(d => ({ ...d, fechaEgreso: e.target.value || null }))} />
					</Grid>
					<Grid item xs={6}>
						<TextField fullWidth type="number" label="Última remuneración ($)"
							value={datosLab.remuneracion || ""}
							onChange={e => setDatosLab(d => ({ ...d, remuneracion: Number(e.target.value) || null }))} />
					</Grid>
					<Grid item xs={6}>
						<TextField fullWidth type="number" label="Importe del reclamo ($)"
							value={datosLab.importeReclamo || ""}
							onChange={e => setDatosLab(d => ({ ...d, importeReclamo: Number(e.target.value) || null }))} />
					</Grid>
					<Grid item xs={6}>
						<FormControl fullWidth>
							<InputLabel>Estado trabajador</InputLabel>
							<Select value={datosLab.estadoTrabajador || "regular"} label="Estado trabajador"
								onChange={e => setDatosLab(d => ({ ...d, estadoTrabajador: e.target.value as any }))}>
								<MenuItem value="regular">Regular</MenuItem>
								<MenuItem value="irregular">Irregular</MenuItem>
								<MenuItem value="no_registrado">No registrado</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={6}>
						<FormControl fullWidth>
							<InputLabel>Sexo</InputLabel>
							<Select value={datosLab.sexo || "M"} label="Sexo"
								onChange={e => setDatosLab(d => ({ ...d, sexo: e.target.value as any }))}>
								<MenuItem value="M">Masculino</MenuItem>
								<MenuItem value="F">Femenino</MenuItem>
							</Select>
						</FormControl>
					</Grid>
				</Grid>
			);

			// ── Step 2: Requerido ────────────────────────────────────────────
			case 2: return (
				<Grid container spacing={2}>
					<Grid item xs={12}>
						{selectedFolder ? (
							<Alert severity="info" icon={false} sx={{ mb: 1 }}>
								<Typography variant="body2">
									Mostrando contactos de la carpeta <strong>{selectedFolder.folderName}</strong>.
								</Typography>
							</Alert>
						) : requeridoPermissive ? (
							<Alert severity="warning" icon={false} sx={{ mb: 1 }}>
								<Typography variant="body2">
									No se encontraron contactos que compartan carpeta con el requirente. Se muestran todos los contactos del usuario.
									La solicitud <strong>no quedará vinculada a una carpeta específica</strong>.
								</Typography>
							</Alert>
						) : requirenteFolders.length > 0 ? (
							<Alert severity="info" icon={false} sx={{ mb: 1 }}>
								<Typography variant="body2" mb={0.5}>
									Mostrando contactos que comparten carpeta con el requirente:
								</Typography>
								<Box display="flex" gap={0.5} flexWrap="wrap">
									{requirenteFolders.map(f => (
										<Chip key={f._id} label={f.folderName} size="small" variant="outlined" color="primary" />
									))}
								</Box>
							</Alert>
						) : (
							<Alert severity="info" icon={false} sx={{ mb: 1 }}>
								<Typography variant="body2">
									Sin restricción de carpeta. Se muestran todos los contactos del usuario.
								</Typography>
							</Alert>
						)}
						<Autocomplete
							options={contactsForRequerido}
							getOptionLabel={(c: SecloContact) => `${c.name} ${c.lastName || ""}${c.company ? ` (${c.company})` : ""}${c.cuit ? ` — ${c.cuit}` : ""}`}
							onChange={(_, v) => setRequerido(v)}
							value={requerido}
							noOptionsText="Sin contactos disponibles"
							renderInput={(params) => <TextField {...params} label="Contacto requerido (empleador) *" />}
						/>
					</Grid>
					{requerido && (
						<Grid item xs={12}>
							<Alert severity="info" icon={false}>
								<Typography variant="body2"><strong>CUIT:</strong> {requerido.cuit || "—"}</Typography>
								<Typography variant="body2"><strong>Domicilio:</strong> {requerido.address || "—"}, {requerido.city || "—"}</Typography>
								<Typography variant="body2"><strong>Email:</strong> {requerido.email || "—"}</Typography>
							</Alert>
						</Grid>
					)}
				</Grid>
			);

			// ── Step 3: Reclamo ──────────────────────────────────────────────
			case 3: return (
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Typography variant="body2" gutterBottom>Objeto/s del reclamo *</Typography>
						<FormGroup>
							{OBJETO_RECLAMO_OPTIONS.map(opt => (
								<FormControlLabel key={opt} control={
									<Checkbox size="small"
										checked={objetoReclamo.includes(opt)}
										onChange={e => setObjetoReclamo(prev => e.target.checked ? [...prev, opt] : prev.filter(o => o !== opt))} />
								} label={<Typography variant="body2">{opt}</Typography>} />
							))}
						</FormGroup>
						{objetoReclamo.length === 0 && <FormHelperText error>Seleccioná al menos un objeto</FormHelperText>}
					</Grid>
					<Grid item xs={12}><Divider /></Grid>
					<Grid item xs={6}>
						<FormControl fullWidth>
							<InputLabel>Iniciado por</InputLabel>
							<Select value={iniciadoPor} label="Iniciado por" onChange={e => setIniciadoPor(e.target.value as any)}>
								<MenuItem value="trabajador">Trabajador</MenuItem>
								<MenuItem value="empleador">Empleador</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12}>
						<TextField fullWidth multiline rows={3} label="Comentario (opcional)"
							value={comentario} onChange={e => setComentario(e.target.value)}
							placeholder="Detalles adicionales del reclamo..." />
					</Grid>
				</Grid>
			);

			// ── Step 4: Abogado ──────────────────────────────────────────────
			case 4: return (
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Alert severity="info">
							El portal SECLO pre-llena los datos del abogado desde el perfil CPACF usando el Tomo y Folio.
						</Alert>
					</Grid>
					<Grid item xs={3}>
						<TextField fullWidth label="Tomo CPACF *" value={abogado.tomo}
							onChange={e => setAbogado(a => ({ ...a, tomo: e.target.value }))} />
					</Grid>
					<Grid item xs={3}>
						<TextField fullWidth label="Folio CPACF *" value={abogado.folio}
							onChange={e => setAbogado(a => ({ ...a, folio: e.target.value }))} />
					</Grid>
					<Grid item xs={3}>
						<FormControl fullWidth>
							<InputLabel>Carácter</InputLabel>
							<Select value={abogado.caracter} label="Carácter"
								onChange={e => setAbogado(a => ({ ...a, caracter: e.target.value }))}>
								<MenuItem value="apoderado">Apoderado</MenuItem>
								<MenuItem value="patrocinante">Patrocinante</MenuItem>
								<MenuItem value="rep_gremial">Rep. Gremial</MenuItem>
								<MenuItem value="rep_empresarial">Rep. Empresarial</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={3}>
						<TextField fullWidth label="CPA domicilio" placeholder="C1426" value={abogado.cpa || ""}
							onChange={e => setAbogado(a => ({ ...a, cpa: e.target.value }))}
							helperText="Código Postal Argentino del estudio" />
					</Grid>
				</Grid>
			);

			// ── Step 5: Documentos ───────────────────────────────────────────
			case 5: return (
				<Grid container spacing={2}>
					<Grid item xs={12}>
						<Alert severity="warning">
							El portal SECLO requiere obligatoriamente el <strong>D.N.I</strong> y la <strong>Credencial letrado</strong>.
						</Alert>
					</Grid>
					{(["dni", "credencial", "otros"] as SecloDocTipo[]).map(tipo => {
						const uploaded = documentos.find(d => d.tipo === tipo);
						return (
							<Grid item xs={12} key={tipo}>
								<Box display="flex" alignItems="center" gap={2}>
									<Button variant="outlined" component="label" disabled={uploadingDoc === tipo}
										color={uploaded ? "success" : tipo === "otros" ? "inherit" : "primary"}
										sx={{ minWidth: 180 }}>
										{uploadingDoc === tipo
											? <CircularProgress size={16} sx={{ mr: 1 }} />
											: null}
										{uploaded ? `✓ ${uploaded.fileName}` : `Subir ${DOC_TIPO_LABEL[tipo]}`}
										<input type="file" hidden accept=".pdf"
											onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, tipo); }} />
									</Button>
									{uploaded && (
										<Button size="small" color="error"
											onClick={() => setDocumentos(prev => prev.filter(d => d.tipo !== tipo))}>
											Quitar
										</Button>
									)}
								</Box>
							</Grid>
						);
					})}
				</Grid>
			);

			default: return null;
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
			<DialogTitle>Nueva solicitud de audiencia SECLO</DialogTitle>
			<DialogContent>
				<Stepper activeStep={step} alternativeLabel sx={{ mb: 3, mt: 1 }}>
					{STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
				</Stepper>

				{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

				{renderStep()}
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={submitting}>Cancelar</Button>
				{step > 0 && <Button onClick={handleBack} disabled={submitting}>Atrás</Button>}
				{step < STEPS.length - 1 ? (
					<Button variant="contained" onClick={handleNext} disabled={!canAdvance()}>Siguiente</Button>
				) : (
					<Button variant="contained" color="success" onClick={handleSubmit}
						disabled={submitting || !canAdvance()}>
						{submitting ? "Creando..." : "Crear solicitud"}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}
