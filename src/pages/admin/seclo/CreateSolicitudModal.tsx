import { useState, useCallback, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Grid,
	TextField,
	Typography,
	Alert,
	Autocomplete,
	Stepper,
	Step,
	StepLabel,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Checkbox,
	FormGroup,
	FormControlLabel,
	FormHelperText,
	Chip,
	Box,
	Divider,
	CircularProgress,
	Switch,
	Tooltip,
	Stack,
	Link,
} from "@mui/material";
import { useDispatch, useSelector } from "store";
import { fetchUsers, createSolicitud, getPresignedUploadUrl, fetchFoldersByUser } from "store/reducers/seclo";
import SecloContactDialog from "./SecloContactDialog";
import {
	OBJETO_RECLAMO_OPTIONS,
	type SecloFolder,
	type SecloUser,
	type SecloContact,
	type SecloDatosLaborales,
	type SecloDocumento,
	type SecloDocTipo,
} from "types/seclo";

interface Props {
	open: boolean;
	onClose: () => void;
}

const STEPS = ["Usuario", "Trabajador", "Empleador", "Reclamo", "Abogado", "Documentos", "Revisar"];

const DOC_TIPO_LABEL: Record<SecloDocTipo, string> = {
	dni: "D.N.I",
	credencial: "Credencial letrado",
	poder: "Poder",
	formulario: "Formulario de autorización",
	otros: "Otros",
};

// ─── Review components ────────────────────────────────────────────────────
// Wrappers minimalistas para el step "Revisar y enviar". Se mantienen
// inline porque el shape de los datos es específico de SECLO.

function ReviewSection({
	title, onEdit, children,
}: { title: string; onEdit?: () => void; children: React.ReactNode }) {
	return (
		<Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
				<Typography variant="subtitle2">{title}</Typography>
				{onEdit && (
					<Link component="button" type="button" onClick={onEdit} sx={{ fontSize: 12 }}>
						Editar
					</Link>
				)}
			</Stack>
			<Stack spacing={0.25}>{children}</Stack>
		</Box>
	);
}

function ReviewRow({
	label, value, emptyHint,
}: { label: string; value?: string | null; emptyHint?: React.ReactNode }) {
	const isEmpty = !value || !String(value).trim();
	return (
		<Box>
			<Typography variant="body2">
				<strong>{label}:</strong> {isEmpty ? "—" : value}
			</Typography>
			{isEmpty && emptyHint && (
				<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
					{emptyHint}
				</Typography>
			)}
		</Box>
	);
}

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
	const [credentials, setCredentials] = useState<Array<{
		_id: string;
		enabled: boolean;
		cuil?: string | null;
		credentialsValidated?: boolean;
		credentialsValidatedAt?: string | null;
		credentialInvalid?: boolean;
		credentialInvalidAt?: string | null;
		credentialInvalidReason?: string | null;
	}>>([]);
	const [contactsLoading, setContactsLoading] = useState(false);
	const [folders, setFolders] = useState<SecloFolder[]>([]);
	const [selectedFolder, setSelectedFolder] = useState<SecloFolder | null>(null);

	// Step 1 – Requirente (trabajador)
	const [requirente, setRequirente] = useState<SecloContact | null>(null);
	const [datosLab, setDatosLab] = useState<SecloDatosLaborales>({ estadoTrabajador: "regular", sexo: "M" });

	// Step 1 – Reclamantes adicionales (sólo cuando iniciadoPor === 'trabajador').
	// El primer reclamante es el `requirente` de arriba; los siguientes viven acá.
	// La worker corre paso 5 en loop por cada uno, presionando ctl03_btnSeguir
	// para guardarlo en la grilla del portal antes de avanzar al paso 6.
	const [extraRequirentes, setExtraRequirentes] = useState<Array<{ contact: SecloContact; datosLaborales: SecloDatosLaborales }>>([]);
	const [extraDialog, setExtraDialog] = useState<{ open: boolean; editIndex: number | null; contact: SecloContact | null; datosLab: SecloDatosLaborales }>({
		open: false, editIndex: null, contact: null, datosLab: { estadoTrabajador: "regular", sexo: "M" },
	});

	// Step 2 – Requerido (empleador)
	const [requerido, setRequerido] = useState<SecloContact | null>(null);
	// Empleadores adicionales — el portal SECLO permite varios en la grilla
	// ctl02_grdEmpleadores. El worker hace loop con ctl02_btnSeguir y luego
	// btnSeguirEmpleador para avanzar al paso 7.
	const [extraRequeridos, setExtraRequeridos] = useState<SecloContact[]>([]);
	const [extraRequeridoDialog, setExtraRequeridoDialog] = useState<{ open: boolean; editIndex: number | null; contact: SecloContact | null }>({
		open: false, editIndex: null, contact: null,
	});

	// Step 3 – Reclamo
	const [objetoReclamo, setObjetoReclamo] = useState<string[]>([]);
	const [comentario, setComentario] = useState("");
	const [iniciadoPor, setIniciadoPor] = useState<"trabajador" | "empleador">("trabajador");

	// Step 4 – Abogado
	const [abogado, setAbogado] = useState({ tomo: "", folio: "", caracter: "apoderado", cpa: "" });

	// Step 5 – Documentos
	const [documentos, setDocumentos] = useState<SecloDocumento[]>([]);
	const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

	// Diálogo de creación/edición rápida de contacto desde steps 1-2.
	// `target` indica para qué rol abrimos el modal (auto-selecciona al guardar).
	const [contactDialog, setContactDialog] = useState<{
		open: boolean;
		mode: "add" | "edit";
		target: "requirente" | "requerido";
		contact: SecloContact | null;
	}>({ open: false, mode: "add", target: "requirente", contact: null });

	const closeContactDialog = () => setContactDialog((s) => ({ ...s, open: false }));

	// Tras crear o editar un contacto: actualizar la lista local y
	// auto-asignarlo al rol correspondiente.
	const handleContactSaved = (saved: SecloContact) => {
		setLocalContacts((prev) => {
			const exists = prev.some((c) => c._id === saved._id);
			return exists
				? prev.map((c) => (c._id === saved._id ? { ...c, ...saved } : c))
				: [...prev, saved];
		});
		if (contactDialog.target === "requirente") {
			setRequirente(saved);
			setRequerido(null);
		} else {
			setRequerido(saved);
		}
	};

	// Modo prueba (DEV) — el worker llena el formulario y se detiene antes
	// del btnConfirmarObligatoria. No envía nada al portal.
	const [dryRunMode, setDryRunMode] = useState(false);
	const [dryRunWithHtml, setDryRunWithHtml] = useState(false);

	const resetAll = () => {
		setStep(0);
		setError(null);
		setSelectedUser(null);
		setUserSearch("");
		setSelectedCredentialId("");
		setCredentials([]);
		setContactsLoading(false);
		setLocalContacts([]);
		setFolders([]);
		setSelectedFolder(null);
		setRequirente(null);
		setDatosLab({ estadoTrabajador: "regular", sexo: "M" });
		setExtraRequirentes([]);
		setExtraDialog({ open: false, editIndex: null, contact: null, datosLab: { estadoTrabajador: "regular", sexo: "M" } });
		setRequerido(null);
		setExtraRequeridos([]);
		setExtraRequeridoDialog({ open: false, editIndex: null, contact: null });
		setObjetoReclamo([]);
		setComentario("");
		setIniciadoPor("trabajador");
		setAbogado({ tomo: "", folio: "", caracter: "apoderado", cpa: "" });
		setDocumentos([]);
		setDryRunMode(false);
		setDryRunWithHtml(false);
	};

	const handleClose = () => {
		resetAll();
		onClose();
	};

	// ── Step 0: seleccionar usuario ───────────────────────────────────────────
	const handleUserSearch = (value: string) => {
		setUserSearch(value);
		if (value.length >= 2) dispatch(fetchUsers(value));
	};

	const handleSelectUser = async (user: SecloUser | null) => {
		setSelectedUser(user);
		setRequirente(null);
		setRequerido(null);
		setCredentials([]);
		setSelectedCredentialId("");
		setLocalContacts([]);
		setFolders([]);
		setSelectedFolder(null);
		if (!user) return;
		setContactsLoading(true);
		try {
			const { default: adminAxios } = await import("utils/adminAxios");
			const [contactsRes, credsRes] = await Promise.all([
				adminAxios.get(`/api/seclo/users/${user._id}/contacts`),
				adminAxios.get("/api/seclo/credentials", { params: { userId: user._id, limit: 10 } }),
			]);
			setLocalContacts(contactsRes.data.contacts || []);
			// Filtrado defensivo client-side: aunque el backend ya soporta
			// ?userId=..., guardamos solo las credenciales que efectivamente
			// pertenecen al usuario seleccionado. Robust frente a cualquier
			// versión del API y a casos edge donde la query devuelva otras.
			const allCreds = credsRes.data.credentials || [];
			const creds = allCreds.filter((c: any) => {
				const cuid = typeof c.userId === "string" ? c.userId : c.userId?._id;
				return cuid === user._id;
			});
			setCredentials(creds);
			// Auto-seleccionar la primera (cada usuario tiene una única credencial
			// por unique:true en el modelo). Antes era === 1 y dejaba al usuario
			// sin selección si el response traía 0 o más de una.
			if (creds.length >= 1) setSelectedCredentialId(creds[0]._id);
			else setSelectedCredentialId("");
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
	const contactsForRequirente = selectedFolder ? localContacts.filter((c) => c.folderIds?.includes(selectedFolder._id)) : localContacts;

	// Carpetas a las que pertenece el requirente seleccionado
	const requirenteFolders = requirente?.folderIds?.length ? folders.filter((f) => requirente.folderIds!.includes(f._id)) : [];

	// Contactos disponibles para el requerido:
	// 1. Si se eligió carpeta explícita → solo los de esa carpeta
	// 2. Si no y el requirente tiene carpetas → solo los que comparten al menos una carpeta
	// 3. Si el requirente no tiene carpetas → todos (sin restricción)
	const _baseRequerido = localContacts.filter((c) => c._id !== requirente?._id);

	const contactsForRequeridoStrict = (() => {
		if (selectedFolder) return _baseRequerido.filter((c) => c.folderIds?.includes(selectedFolder._id));
		if (requirente?.folderIds?.length) {
			const reqSet = new Set(requirente.folderIds);
			return _baseRequerido.filter((c) => c.folderIds?.some((id) => reqSet.has(id)));
		}
		return _baseRequerido;
	})();

	// Si el filtro estricto dejó sin opciones, activamos modo permisivo (todos los contactos)
	const requeridoPermissive = !selectedFolder && !!requirente?.folderIds?.length && contactsForRequeridoStrict.length === 0;
	const contactsForRequerido = requeridoPermissive ? _baseRequerido : contactsForRequeridoStrict;

	// ── Step 5: upload documento ──────────────────────────────────────────────
	const handleFileUpload = useCallback(
		async (file: File, tipo: SecloDocTipo) => {
			setUploadingDoc(tipo);
			try {
				const { uploadUrl, s3Key } = await getPresignedUploadUrl(file.name, file.type, selectedUser?._id);
				await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
				setDocumentos((prev) => {
					const filtered = prev.filter((d) => d.tipo !== tipo);
					return [...filtered, { tipo, s3Key, fileName: file.name }];
				});
			} catch (e: any) {
				setError(`Error subiendo ${tipo}: ${e.message}`);
			} finally {
				setUploadingDoc(null);
			}
		},
		[selectedUser],
	);

	// ── Validación por step ───────────────────────────────────────────────────
	// SECLO carga calle y número en campos separados — sin esos datos
	// estructurados el portal rechaza el formulario. Verificamos que el
	// contacto los tenga antes de avanzar; si no, el admin tiene que
	// abrir "Editar contacto" para completarlos.
	const hasStructuredAddress = (c: any) => !!(c?.street?.trim() && c?.streetNumber?.trim());
	// Para personas jurídicas el portal SECLO exige tipoSociedad concreto
	// (cmbTipoSociedad). Para físicas el sistema asume "Persona Física".
	const hasValidTipoSociedad = (c: any) => {
		if (!c) return false;
		if (c.type === "Persona Jurídica") return !!c.tipoSociedad?.trim();
		return true;
	};

	const canAdvance = () => {
		if (step === 0) return !!selectedUser && !!selectedCredentialId && !contactsLoading;
		if (step === 1) return !!requirente && !!requirente.phoneCelular && hasStructuredAddress(requirente);
		if (step === 2) return !!requerido && hasStructuredAddress(requerido) && hasValidTipoSociedad(requerido);
		if (step === 3) {
			if (objetoReclamo.length === 0) return false;
			// Si el reclamo es por accidente o enfermedad, fechaAccidente es requerida
			if (objetoReclamo.some((o) => /accidente|enfermedad/i.test(o)) && !datosLab.fechaAccidente) return false;
			return true;
		}
		if (step === 4) return !!abogado.tomo && !!abogado.folio;
		if (step === 5) return documentos.some((d) => d.tipo === "dni") && documentos.some((d) => d.tipo === "credencial");
		if (step === 6) return true; // resumen final — el submit se hace con su propio botón
		return false;
	};

	const handleNext = () => {
		setError(null);
		setStep((s) => s + 1);
	};
	const handleBack = () => {
		setError(null);
		setStep((s) => s - 1);
	};

	// ── Submit final ──────────────────────────────────────────────────────────
	const handleSubmit = async () => {
		setSubmitting(true);
		setError(null);
		try {
			// Si hay reclamantes y/o empleadores adicionales mandamos el array
			// completo (forma nueva). Si no, mantenemos la forma legacy con
			// requirenteId/requeridoId directos para no cambiar el shape para
			// solicitudes simples.
			const allRequirentes = [
				{ contactId: requirente!._id, datosLaborales: datosLab },
				...extraRequirentes.map((r) => ({ contactId: r.contact._id, datosLaborales: r.datosLaborales })),
			];
			const allRequeridos = [
				{ contactId: requerido!._id },
				...extraRequeridos.map((c) => ({ contactId: c._id })),
			];
			await dispatch(
				createSolicitud({
					userId: selectedUser!._id,
					credentialId: selectedCredentialId,
					...(allRequirentes.length > 1
						? { requirentes: allRequirentes }
						: { requirenteId: requirente!._id, requirenteDatosLaborales: datosLab }),
					...(allRequeridos.length > 1
						? { requeridos: allRequeridos }
						: { requeridoId: requerido!._id }),
					objetoReclamo,
					comentarioReclamo: comentario,
					iniciadoPor,
					datosAbogado: { tomo: abogado.tomo, folio: abogado.folio, caracter: abogado.caracter, domicilio: { cpa: abogado.cpa } },
					documentos,
					folderId: selectedFolder?._id ?? undefined,
					dryRun: dryRunMode,
					dryRunWithHtml: dryRunMode && dryRunWithHtml,
				}),
			);
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
			case 0:
				return (
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
						{/* Credencial del usuario — cada usuario tiene UNA sola por modelo
						    (TrabajoCredentials.userId es unique). Mostramos vista informativa,
						    no selector. El selectedCredentialId se setea automáticamente al
						    cargar contactos+credenciales del usuario. */}
						{credentials.length > 0 && (() => {
							const cred = credentials[0];
							const validationChip = cred.credentialInvalid
								? <Chip label="Inválida" size="small" color="error" />
								: cred.credentialsValidated
									? <Chip label="Validada" size="small" color="success" />
									: <Chip label="Pendiente" size="small" color="warning" variant="outlined" />;
							return (
								<Grid item xs={12}>
									<Box sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.default" }}>
										<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
											<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
												Credencial SECLO del usuario
											</Typography>
											<Stack direction="row" spacing={0.5} alignItems="center">
												{validationChip}
												{!cred.enabled && <Chip label="Deshabilitada" size="small" color="error" />}
											</Stack>
										</Stack>
										<Stack direction="row" spacing={2} flexWrap="wrap">
											<Box>
												<Typography variant="caption" color="text.secondary" component="div">CUIL</Typography>
												<Typography variant="body2" sx={{ fontFamily: "monospace" }}>{cred.cuil || "—"}</Typography>
											</Box>
											<Box>
												<Typography variant="caption" color="text.secondary" component="div">
													{cred.credentialInvalid ? "Detectada como inválida" : cred.credentialsValidated ? "Validada el" : "Estado"}
												</Typography>
												<Typography variant="body2">
													{cred.credentialInvalid && cred.credentialInvalidAt
														? new Date(cred.credentialInvalidAt).toLocaleString("es-AR")
														: cred.credentialsValidated && cred.credentialsValidatedAt
															? new Date(cred.credentialsValidatedAt).toLocaleString("es-AR")
															: "Esperando validación del worker"}
												</Typography>
											</Box>
										</Stack>
										{cred.credentialInvalid && cred.credentialInvalidReason && (
											<Alert severity="error" sx={{ mt: 1.5 }}>
												<Typography variant="caption">
													<strong>Motivo:</strong> {cred.credentialInvalidReason}
												</Typography>
											</Alert>
										)}
										{!cred.enabled && (
											<Alert severity="warning" sx={{ mt: 1.5 }}>
												La credencial está deshabilitada. Reactivala desde Credenciales antes de crear la solicitud.
											</Alert>
										)}
										{!cred.credentialsValidated && !cred.credentialInvalid && cred.enabled && (
											<Alert severity="info" sx={{ mt: 1.5 }}>
												Estamos validando esta credencial. La solicitud quedará en pending hasta que se confirme.
											</Alert>
										)}
									</Box>
								</Grid>
							);
						})()}
						{selectedUser && credentials.length === 0 && !contactsLoading && (
							<Grid item xs={12}>
								<Alert severity="warning">Este usuario no tiene credenciales SECLO. Creá una desde la pestaña Credenciales.</Alert>
							</Grid>
						)}
						{contactsLoading && (
							<Grid item xs={12} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<CircularProgress size={16} />
								<Typography variant="body2" color="text.secondary">
									Cargando contactos y carpetas...
								</Typography>
							</Grid>
						)}
						{selectedUser && !contactsLoading && (
							<Grid item xs={12}>
								<Alert severity="info" icon={false}>
									<Typography variant="body2" fontWeight={600} mb={0.5}>
										Vinculación entre carpetas y contactos
									</Typography>
									<Typography variant="body2">
										• Si elegís una <strong>carpeta</strong>, solo aparecerán contactos vinculados a ella en los pasos siguientes.
									</Typography>
									<Typography variant="body2">
										• Sin carpeta, al seleccionar el <strong>requirente</strong> el sistema filtrará el requerido a contactos que comparten
										al menos una carpeta con él.
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
									getOptionLabel={(f) => (f ? f.folderName : "— Sin filtro de carpeta —")}
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
											helperText={
												selectedFolder
													? `${contactsForRequirente.length} contacto${contactsForRequirente.length !== 1 ? "s" : ""} en esta carpeta`
													: `${localContacts.length} contactos disponibles — sin restricción de carpeta`
											}
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
			case 1:
				return (
					<Grid container spacing={2}>
						{selectedFolder && (
							<Grid item xs={12}>
								<Alert severity="info" icon={false}>
									<Typography variant="body2">
										Mostrando <strong>{contactsForRequirente.length}</strong> contacto{contactsForRequirente.length !== 1 ? "s" : ""} de la
										carpeta <strong>{selectedFolder.folderName}</strong>.
									</Typography>
								</Alert>
							</Grid>
						)}
						<Grid item xs={12}>
							<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
								<Typography variant="subtitle2">Trabajador (requirente)</Typography>
								<Button
									size="small"
									variant="outlined"
									onClick={() => setContactDialog({ open: true, mode: "add", target: "requirente", contact: null })}
									disabled={!selectedUser}
								>
									+ Nuevo contacto
								</Button>
							</Stack>
							<Autocomplete
								options={contactsForRequirente}
								getOptionLabel={(c: SecloContact) => `${c.name} ${c.lastName || ""}${c.cuit ? ` — ${c.cuit}` : ""}`}
								onChange={(_, v) => {
									setRequirente(v);
									setRequerido(null);
								}}
								value={requirente}
								noOptionsText={selectedFolder ? "No hay contactos en esta carpeta" : "Sin contactos para este usuario"}
								renderInput={(params) => <TextField {...params} label="Contacto requirente (trabajador) *" />}
							/>
							{requirente && !requirente.phoneCelular && (
								<Alert
									severity="warning"
									sx={{ mt: 1 }}
									action={
										<Button
											color="inherit"
											size="small"
											onClick={() => setContactDialog({ open: true, mode: "edit", target: "requirente", contact: requirente })}
										>
											Completar ahora
										</Button>
									}
								>
									Falta <strong>phoneCelular</strong>. Es obligatorio para el portal SECLO.
								</Alert>
							)}
							{requirente && !hasStructuredAddress(requirente) && (
								<Alert
									severity="warning"
									sx={{ mt: 1 }}
									action={
										<Button
											color="inherit"
											size="small"
											onClick={() => setContactDialog({ open: true, mode: "edit", target: "requirente", contact: requirente })}
										>
											Completar ahora
										</Button>
									}
								>
									Faltan <strong>calle</strong> y/o <strong>número</strong>. SECLO los exige como campos separados.
								</Alert>
							)}
							{requirente && requirente.phoneCelular && hasStructuredAddress(requirente) && (
								<Button
									size="small"
									sx={{ mt: 1 }}
									onClick={() => setContactDialog({ open: true, mode: "edit", target: "requirente", contact: requirente })}
								>
									Editar datos del contacto
								</Button>
							)}
						</Grid>
						{requirente && !selectedFolder && requirenteFolders.length > 0 && (
							<Grid item xs={12}>
								<Alert severity="info" icon={false}>
									<Typography variant="body2" mb={0.5}>
										El requirente pertenece a {requirenteFolders.length === 1 ? "la carpeta" : "las carpetas"}:
									</Typography>
									<Box display="flex" gap={0.5} flexWrap="wrap">
										{requirenteFolders.map((f) => (
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
							<TextField
								fullWidth
								type="date"
								label="Fecha de nacimiento"
								InputLabelProps={{ shrink: true }}
								value={datosLab.fechaNacimiento?.toString().slice(0, 10) || ""}
								onChange={(e) => setDatosLab((d) => ({ ...d, fechaNacimiento: e.target.value || null }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								fullWidth
								type="date"
								label="Fecha de ingreso"
								InputLabelProps={{ shrink: true }}
								value={datosLab.fechaIngreso?.toString().slice(0, 10) || ""}
								onChange={(e) => setDatosLab((d) => ({ ...d, fechaIngreso: e.target.value || null }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								fullWidth
								type="date"
								label="Fecha de egreso"
								InputLabelProps={{ shrink: true }}
								value={datosLab.fechaEgreso?.toString().slice(0, 10) || ""}
								onChange={(e) => setDatosLab((d) => ({ ...d, fechaEgreso: e.target.value || null }))}
							/>
						</Grid>
						{/* Fecha del accidente — opcional aquí porque el step "Reclamo" viene
						    después; el campo lo requiere el portal solo cuando el reclamo es
						    por accidente o enfermedad. Si lo dejás vacío y luego el reclamo
						    sí lo requiere, el detector de campos requeridos del worker lo
						    reporta en dryRunResult. */}
						<Grid item xs={12}>
							<TextField
								fullWidth
								type="date"
								label="Fecha del accidente (si aplica)"
								InputLabelProps={{ shrink: true }}
								value={datosLab.fechaAccidente?.toString().slice(0, 10) || ""}
								onChange={(e) => setDatosLab((d) => ({ ...d, fechaAccidente: e.target.value || null }))}
								helperText="Requerido por el portal cuando el reclamo incluye accidente o enfermedad laboral"
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								fullWidth
								type="number"
								label="Última remuneración ($)"
								value={datosLab.remuneracion || ""}
								onChange={(e) => setDatosLab((d) => ({ ...d, remuneracion: Number(e.target.value) || null }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								fullWidth
								type="number"
								label="Importe del reclamo ($)"
								value={datosLab.importeReclamo || ""}
								onChange={(e) => setDatosLab((d) => ({ ...d, importeReclamo: Number(e.target.value) || null }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Estado trabajador</InputLabel>
								<Select
									value={datosLab.estadoTrabajador || "regular"}
									label="Estado trabajador"
									onChange={(e) => setDatosLab((d) => ({ ...d, estadoTrabajador: e.target.value as any }))}
								>
									<MenuItem value="regular">Regular</MenuItem>
									<MenuItem value="irregular">Irregular</MenuItem>
									<MenuItem value="no_registrado">No registrado</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Sexo</InputLabel>
								<Select
									value={datosLab.sexo || "M"}
									label="Sexo"
									onChange={(e) => setDatosLab((d) => ({ ...d, sexo: e.target.value as any }))}
								>
									<MenuItem value="M">Masculino</MenuItem>
									<MenuItem value="F">Femenino</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						{/* Reclamantes adicionales — sólo cuando el trámite es iniciado
						    por el trabajador. El portal SECLO permite agregar varios al
						    paso 5 (grilla ctl03_grdTrabajadores). El worker hace loop
						    presionando ctl03_btnSeguir por cada uno y luego btnSeguirTrabajador
						    para avanzar al paso 6. Mientras la feature se valide, la solicitud
						    se fuerza a dryRun cuando hay >1 requirente (guard en el worker). */}
						{iniciadoPor === "trabajador" && requirente && (
							<Grid item xs={12}>
								<Box sx={{ borderTop: 1, borderColor: "divider", pt: 2, mt: 1 }}>
									<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
										<Typography variant="subtitle2">
											Reclamantes adicionales {extraRequirentes.length > 0 && <Chip size="small" label={extraRequirentes.length} sx={{ ml: 1 }} />}
										</Typography>
										<Button
											size="small"
											variant="outlined"
											onClick={() => setExtraDialog({ open: true, editIndex: null, contact: null, datosLab: { estadoTrabajador: "regular", sexo: "M" } })}
										>
											+ Agregar reclamante
										</Button>
									</Stack>
									<Alert severity="warning" sx={{ mb: 1 }}>
										Cuando hay más de un reclamante, la solicitud corre <strong>siempre en modo prueba</strong> hasta validar el flujo end-to-end con el portal.
									</Alert>
									{extraRequirentes.length === 0 ? (
										<Typography variant="caption" color="text.secondary">
											Sólo el trabajador principal de arriba. Agregá más reclamantes si el trámite los requiere.
										</Typography>
									) : (
										<Stack spacing={0.5}>
											{extraRequirentes.map((r, i) => (
												<Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>
													<Box flexGrow={1}>
														<Typography variant="body2" fontWeight={600}>
															#{i + 2} · {r.contact.name} {r.contact.lastName || ""}
														</Typography>
														<Typography variant="caption" color="text.secondary">
															{r.contact.cuit || "—"} · Ingreso: {r.datosLaborales.fechaIngreso?.toString().slice(0, 10) || "—"} · Egreso: {r.datosLaborales.fechaEgreso?.toString().slice(0, 10) || "—"}
														</Typography>
													</Box>
													<Button size="small" onClick={() => setExtraDialog({ open: true, editIndex: i, contact: r.contact, datosLab: r.datosLaborales })}>
														Editar
													</Button>
													<Button size="small" color="error" onClick={() => setExtraRequirentes((prev) => prev.filter((_, j) => j !== i))}>
														Quitar
													</Button>
												</Box>
											))}
										</Stack>
									)}
								</Box>
							</Grid>
						)}
					</Grid>
				);

			// ── Step 2: Requerido ────────────────────────────────────────────
			case 2:
				return (
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
										No se encontraron contactos que compartan carpeta con el requirente. Se muestran todos los contactos del usuario. La
										solicitud <strong>no quedará vinculada a una carpeta específica</strong>.
									</Typography>
								</Alert>
							) : requirenteFolders.length > 0 ? (
								<Alert severity="info" icon={false} sx={{ mb: 1 }}>
									<Typography variant="body2" mb={0.5}>
										Mostrando contactos que comparten carpeta con el requirente:
									</Typography>
									<Box display="flex" gap={0.5} flexWrap="wrap">
										{requirenteFolders.map((f) => (
											<Chip key={f._id} label={f.folderName} size="small" variant="outlined" color="primary" />
										))}
									</Box>
								</Alert>
							) : (
								<Alert severity="info" icon={false} sx={{ mb: 1 }}>
									<Typography variant="body2">Sin restricción de carpeta. Se muestran todos los contactos del usuario.</Typography>
								</Alert>
							)}
							<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
								<Typography variant="subtitle2">Empleador (requerido)</Typography>
								<Button
									size="small"
									variant="outlined"
									onClick={() => setContactDialog({ open: true, mode: "add", target: "requerido", contact: null })}
									disabled={!selectedUser}
								>
									+ Nuevo contacto
								</Button>
							</Stack>
							<Autocomplete
								options={contactsForRequerido}
								getOptionLabel={(c: SecloContact) =>
									`${c.name} ${c.lastName || ""}${c.company ? ` (${c.company})` : ""}${c.cuit ? ` — ${c.cuit}` : ""}`
								}
								onChange={(_, v) => setRequerido(v)}
								value={requerido}
								noOptionsText="Sin contactos disponibles"
								renderInput={(params) => <TextField {...params} label="Contacto requerido (empleador) *" />}
							/>
						</Grid>
						{requerido && !hasStructuredAddress(requerido) && (
							<Grid item xs={12}>
								<Alert
									severity="warning"
									action={
										<Button
											color="inherit"
											size="small"
											onClick={() => setContactDialog({ open: true, mode: "edit", target: "requerido", contact: requerido })}
										>
											Completar ahora
										</Button>
									}
								>
									Faltan <strong>calle</strong> y/o <strong>número</strong> del empleador. SECLO los exige como campos separados.
								</Alert>
							</Grid>
						)}
						{requerido && !hasValidTipoSociedad(requerido) && (
							<Grid item xs={12}>
								<Alert
									severity="warning"
									action={
										<Button
											color="inherit"
											size="small"
											onClick={() => setContactDialog({ open: true, mode: "edit", target: "requerido", contact: requerido })}
										>
											Completar ahora
										</Button>
									}
								>
									El empleador es persona jurídica pero falta el <strong>tipo</strong> (S.A., S.R.L., Cooperativa, etc.). SECLO lo exige.
								</Alert>
							</Grid>
						)}
						{requerido && (
							<Grid item xs={12}>
								<Alert
									severity="info"
									icon={false}
									action={
										<Button
											color="inherit"
											size="small"
											onClick={() => setContactDialog({ open: true, mode: "edit", target: "requerido", contact: requerido })}
										>
											Editar
										</Button>
									}
								>
									<Typography variant="body2">
										<strong>CUIT:</strong> {requerido.cuit || "—"}
									</Typography>
									<Typography variant="body2">
										<strong>Domicilio:</strong>{" "}
										{[requerido.street, requerido.streetNumber].filter(Boolean).join(" ") || requerido.address || "—"}
										{requerido.floor && `, Piso ${requerido.floor}`}
										{requerido.apartment && `, Depto ${requerido.apartment}`}
										{requerido.city && `, ${requerido.city}`}
									</Typography>
									<Typography variant="body2">
										<strong>Email:</strong> {requerido.email || "—"}
									</Typography>
									{hasStructuredAddress(requerido) && !requerido.floor && !requerido.apartment && (
										<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
											No tiene piso ni departamento cargados. Si el domicilio lo requiere, podés{" "}
											<Link
												component="button"
												type="button"
												onClick={() => setContactDialog({ open: true, mode: "edit", target: "requerido", contact: requerido })}
												sx={{ verticalAlign: "baseline" }}
											>
												agregarlos
											</Link>
											{" "}(son opcionales).
										</Typography>
									)}
								</Alert>
							</Grid>
						)}

						{/* Empleadores adicionales — el portal SECLO permite varios
						    en la grilla ctl02_grdEmpleadores. El worker presiona
						    ctl02_btnSeguir por cada uno y luego btnSeguirEmpleador
						    para avanzar. Mientras la feature se valida la solicitud
						    se fuerza a dryRun cuando hay >1 empleador. */}
						{requerido && (
							<Grid item xs={12}>
								<Box sx={{ borderTop: 1, borderColor: "divider", pt: 2, mt: 1 }}>
									<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
										<Typography variant="subtitle2">
											Empleadores adicionales {extraRequeridos.length > 0 && <Chip size="small" label={extraRequeridos.length} sx={{ ml: 1 }} />}
										</Typography>
										<Button
											size="small"
											variant="outlined"
											onClick={() => setExtraRequeridoDialog({ open: true, editIndex: null, contact: null })}
										>
											+ Agregar empleador
										</Button>
									</Stack>
									<Alert severity="warning" sx={{ mb: 1 }}>
										Cuando hay más de un empleador, la solicitud corre <strong>siempre en modo prueba</strong> hasta validar el flujo end-to-end con el portal.
									</Alert>
									{extraRequeridos.length === 0 ? (
										<Typography variant="caption" color="text.secondary">
											Sólo el empleador principal de arriba. Agregá más empleadores si el trámite los requiere.
										</Typography>
									) : (
										<Stack spacing={0.5}>
											{extraRequeridos.map((c, i) => (
												<Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>
													<Box flexGrow={1}>
														<Typography variant="body2" fontWeight={600}>
															#{i + 2} · {c.company || `${c.name} ${c.lastName || ""}`.trim()}
														</Typography>
														<Typography variant="caption" color="text.secondary">
															{c.cuit || "—"} · {[c.street, c.streetNumber].filter(Boolean).join(" ") || c.address || "—"}
														</Typography>
													</Box>
													<Button size="small" onClick={() => setExtraRequeridoDialog({ open: true, editIndex: i, contact: c })}>
														Cambiar
													</Button>
													<Button size="small" color="error" onClick={() => setExtraRequeridos((prev) => prev.filter((_, j) => j !== i))}>
														Quitar
													</Button>
												</Box>
											))}
										</Stack>
									)}
								</Box>
							</Grid>
						)}
					</Grid>
				);

			// ── Step 3: Reclamo ──────────────────────────────────────────────
			case 3:
				return (
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<Typography variant="body2" gutterBottom>
								Objeto/s del reclamo *
							</Typography>
							<FormGroup>
								{OBJETO_RECLAMO_OPTIONS.map((opt) => (
									<FormControlLabel
										key={opt}
										control={
											<Checkbox
												size="small"
												checked={objetoReclamo.includes(opt)}
												onChange={(e) => setObjetoReclamo((prev) => (e.target.checked ? [...prev, opt] : prev.filter((o) => o !== opt)))}
											/>
										}
										label={<Typography variant="body2">{opt}</Typography>}
									/>
								))}
							</FormGroup>
							{objetoReclamo.length === 0 && <FormHelperText error>Seleccioná al menos un objeto</FormHelperText>}
						</Grid>

						{/* Si el objetoReclamo incluye accidente o enfermedad laboral, el portal SECLO
						    requiere "Fecha del Accidente" en el paso del trabajador. Lo ofrecemos inline
						    acá porque es donde aparece naturalmente la dependencia. Si falta, bloquea
						    el avance del wizard. Sincroniza con datosLab del step Trabajador (mismo state). */}
						{objetoReclamo.some((o) => /accidente|enfermedad/i.test(o)) && (
							<Grid item xs={12}>
								<Alert severity={datosLab.fechaAccidente ? "success" : "warning"} sx={{ mb: 1.5 }}>
									{datosLab.fechaAccidente
										? "Fecha del accidente cargada — el portal la va a aceptar."
										: "El reclamo elegido requiere Fecha del Accidente. Completala acá o volvé al step Trabajador."}
								</Alert>
								<TextField
									fullWidth
									type="date"
									label="Fecha del accidente *"
									InputLabelProps={{ shrink: true }}
									value={datosLab.fechaAccidente?.toString().slice(0, 10) || ""}
									onChange={(e) => setDatosLab((d) => ({ ...d, fechaAccidente: e.target.value || null }))}
									error={!datosLab.fechaAccidente}
									helperText="Requerido por el portal cuando el reclamo es por accidente o enfermedad laboral"
								/>
							</Grid>
						)}

						<Grid item xs={12}>
							<Divider />
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Iniciado por</InputLabel>
								<Select value={iniciadoPor} label="Iniciado por" onChange={(e) => setIniciadoPor(e.target.value as any)}>
									<MenuItem value="trabajador">Trabajador</MenuItem>
									<MenuItem value="empleador">Empleador</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								multiline
								rows={3}
								label="Comentario (opcional)"
								value={comentario}
								onChange={(e) => setComentario(e.target.value)}
								placeholder="Detalles adicionales del reclamo..."
							/>
						</Grid>
					</Grid>
				);

			// ── Step 4: Abogado ──────────────────────────────────────────────
			case 4:
				return (
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<Alert severity="info">El portal SECLO pre-llena los datos del abogado desde el perfil CPACF usando el Tomo y Folio.</Alert>
						</Grid>
						<Grid item xs={3}>
							<TextField
								fullWidth
								label="Tomo CPACF *"
								value={abogado.tomo}
								onChange={(e) => setAbogado((a) => ({ ...a, tomo: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={3}>
							<TextField
								fullWidth
								label="Folio CPACF *"
								value={abogado.folio}
								onChange={(e) => setAbogado((a) => ({ ...a, folio: e.target.value }))}
							/>
						</Grid>
						<Grid item xs={3}>
							<FormControl fullWidth>
								<InputLabel>Carácter</InputLabel>
								<Select value={abogado.caracter} label="Carácter" onChange={(e) => setAbogado((a) => ({ ...a, caracter: e.target.value }))}>
									<MenuItem value="apoderado">Apoderado</MenuItem>
									<MenuItem value="patrocinante">Patrocinante</MenuItem>
									<MenuItem value="rep_gremial">Rep. Gremial</MenuItem>
									<MenuItem value="rep_empresarial">Rep. Empresarial</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={3}>
							<TextField
								fullWidth
								label="CPA domicilio"
								placeholder="C1426"
								value={abogado.cpa || ""}
								onChange={(e) => setAbogado((a) => ({ ...a, cpa: e.target.value }))}
								helperText="Código Postal Argentino del estudio"
							/>
						</Grid>
					</Grid>
				);

			// ── Step 5: Documentos ───────────────────────────────────────────
			case 5:
				return (
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<Alert severity="warning">
								El portal SECLO requiere obligatoriamente el <strong>D.N.I</strong> y la <strong>Credencial letrado</strong>.
							</Alert>
						</Grid>
						{(["dni", "credencial", "otros"] as SecloDocTipo[]).map((tipo) => {
							const uploaded = documentos.find((d) => d.tipo === tipo);
							return (
								<Grid item xs={12} key={tipo}>
									<Box display="flex" alignItems="center" gap={2}>
										<Button
											variant="outlined"
											component="label"
											disabled={uploadingDoc === tipo}
											color={uploaded ? "success" : tipo === "otros" ? "inherit" : "primary"}
											sx={{ minWidth: 180 }}
										>
											{uploadingDoc === tipo ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
											{uploaded ? `✓ ${uploaded.fileName}` : `Subir ${DOC_TIPO_LABEL[tipo]}`}
											<input
												type="file"
												hidden
												accept=".pdf"
												onChange={(e) => {
													const f = e.target.files?.[0];
													if (f) handleFileUpload(f, tipo);
												}}
											/>
										</Button>
										{uploaded && (
											<Button size="small" color="error" onClick={() => setDocumentos((prev) => prev.filter((d) => d.tipo !== tipo))}>
												Quitar
											</Button>
										)}
									</Box>
								</Grid>
							);
						})}
					</Grid>
				);

			// ── Step 6: Revisar y enviar ───────────────────────────────────
			case 6:
				return renderReview();

			default:
				return null;
		}
	};

	// ── Helpers + render del step "Revisar y enviar" ──────────────────────────
	const formatDomicilio = (c: SecloContact | null): string => {
		if (!c) return "—";
		const calle = [c.street, c.streetNumber].filter(Boolean).join(" ");
		const piso = c.floor ? `Piso ${c.floor}` : "";
		const depto = c.apartment ? `Depto ${c.apartment}` : "";
		const ciudad = c.city || "";
		return [calle || c.address, piso, depto, ciudad].filter(Boolean).join(", ") || "—";
	};

	const renderReview = () => {
		const reclamoRequiereFecha = objetoReclamo.some((o) => /accidente|enfermedad/i.test(o));
		const credSeleccionada = credentials.find((c: any) => c._id === selectedCredentialId);
		return (
			<Stack spacing={2}>
				<Alert severity="info">
					Revisá todos los datos antes de crear la solicitud. Una vez creada, el worker la procesará automáticamente
					{dryRunMode ? " en modo prueba (DEV — no envía al portal)" : " y la enviará al portal SECLO"}.
				</Alert>

				<ReviewSection title="Usuario y credencial" onEdit={() => setStep(0)}>
					<ReviewRow label="Usuario" value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "—"} />
					<ReviewRow label="Credencial CUIL" value={credSeleccionada?.cuil || "—"} />
					{selectedFolder && <ReviewRow label="Carpeta vinculada" value={selectedFolder.folderName} />}
				</ReviewSection>

				<ReviewSection title="Trabajador (requirente)" onEdit={() => setStep(1)}>
					<ReviewRow label="Nombre" value={requirente ? `${requirente.name} ${requirente.lastName || ""}`.trim() : "—"} />
					<ReviewRow label="CUIL" value={requirente?.cuit || "—"} />
					<ReviewRow label="DNI" value={requirente?.document || "—"} />
					<ReviewRow label="Celular" value={requirente?.phoneCelular || "—"} />
					<ReviewRow label="Email" value={requirente?.email || "—"} />
					<ReviewRow label="Domicilio" value={formatDomicilio(requirente)} />
					{requirente && hasStructuredAddress(requirente) && !requirente.floor && !requirente.apartment && (
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
							Sin piso ni depto.{" "}
							<Link component="button" type="button" onClick={() => setContactDialog({ open: true, mode: "edit", target: "requirente", contact: requirente })} sx={{ verticalAlign: "baseline" }}>
								Agregar
							</Link>{" "}(opcional).
						</Typography>
					)}
				</ReviewSection>

				{extraRequirentes.length > 0 && (
				<ReviewSection title={`Reclamantes adicionales (${extraRequirentes.length})`} onEdit={() => setStep(1)}>
					{extraRequirentes.map((r, i) => (
						<Box key={i} sx={{ mb: 0.5 }}>
							<Typography variant="body2" fontWeight={600}>
								#{i + 2} · {r.contact.name} {r.contact.lastName || ""} {r.contact.cuit && `— ${r.contact.cuit}`}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Domicilio: {formatDomicilio(r.contact)} · Ingreso: {r.datosLaborales.fechaIngreso?.toString().slice(0, 10) || "—"} · Egreso: {r.datosLaborales.fechaEgreso?.toString().slice(0, 10) || "—"}
							</Typography>
						</Box>
					))}
					<Alert severity="warning" sx={{ mt: 1 }}>
						Con múltiples reclamantes la solicitud corre forzada en <strong>modo prueba</strong>.
					</Alert>
				</ReviewSection>
			)}

			<ReviewSection title="Datos laborales" onEdit={() => setStep(1)}>
					<ReviewRow label="Fecha de ingreso" value={datosLab.fechaIngreso || "—"} />
					<ReviewRow label="Fecha de egreso" value={datosLab.fechaEgreso || "—"} />
					{(reclamoRequiereFecha || datosLab.fechaAccidente) && (
						<ReviewRow label="Fecha del accidente" value={datosLab.fechaAccidente || "—"} />
					)}
					<ReviewRow label="Última remuneración" value={datosLab.remuneracion ? `$${datosLab.remuneracion}` : "—"} />
					<ReviewRow label="Importe del reclamo" value={datosLab.importeReclamo ? `$${datosLab.importeReclamo}` : "—"} />
					<ReviewRow label="Estado" value={datosLab.estadoTrabajador || "regular"} />
					<ReviewRow label="Sexo" value={datosLab.sexo === "F" ? "Femenino" : "Masculino"} />
				</ReviewSection>

				<ReviewSection title="Empleador (requerido)" onEdit={() => setStep(2)}>
					<ReviewRow label="Nombre / Razón social" value={requerido ? (requerido.company || `${requerido.name} ${requerido.lastName || ""}`.trim()) : "—"} />
					<ReviewRow label="CUIT" value={requerido?.cuit || "—"} />
					<ReviewRow label="Email" value={requerido?.email || "—"} />
					<ReviewRow label="Domicilio" value={formatDomicilio(requerido)} />
					{requerido && hasStructuredAddress(requerido) && !requerido.floor && !requerido.apartment && (
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
							Sin piso ni depto.{" "}
							<Link component="button" type="button" onClick={() => setContactDialog({ open: true, mode: "edit", target: "requerido", contact: requerido })} sx={{ verticalAlign: "baseline" }}>
								Agregar
							</Link>{" "}(opcional).
						</Typography>
					)}
				</ReviewSection>

				{extraRequeridos.length > 0 && (
				<ReviewSection title={`Empleadores adicionales (${extraRequeridos.length})`} onEdit={() => setStep(2)}>
					{extraRequeridos.map((c, i) => (
						<Box key={i} sx={{ mb: 0.5 }}>
							<Typography variant="body2" fontWeight={600}>
								#{i + 2} · {c.company || `${c.name} ${c.lastName || ""}`.trim()} {c.cuit && `— ${c.cuit}`}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Domicilio: {formatDomicilio(c)}
							</Typography>
						</Box>
					))}
					<Alert severity="warning" sx={{ mt: 1 }}>
						Con múltiples empleadores la solicitud corre forzada en <strong>modo prueba</strong>.
					</Alert>
				</ReviewSection>
			)}

			<ReviewSection title="Reclamo" onEdit={() => setStep(3)}>
					<ReviewRow label="Iniciado por" value={iniciadoPor === "trabajador" ? "Trabajador" : "Empleador"} />
					<ReviewRow label="Objeto/s del reclamo" value={objetoReclamo.length ? objetoReclamo.join(", ") : "—"} />
					<ReviewRow
						label="Comentario"
						value={comentario}
						emptyHint={
							<>
								Sin comentario.{" "}
								<Link component="button" type="button" onClick={() => setStep(3)} sx={{ verticalAlign: "baseline" }}>
									Agregar
								</Link>{" "}(opcional).
							</>
						}
					/>
				</ReviewSection>

				<ReviewSection title="Abogado" onEdit={() => setStep(4)}>
					<ReviewRow label="Tomo" value={abogado.tomo || "—"} />
					<ReviewRow label="Folio" value={abogado.folio || "—"} />
					<ReviewRow label="Carácter" value={abogado.caracter} />
					<ReviewRow label="CPA" value={abogado.cpa || "—"} />
				</ReviewSection>

				<ReviewSection title="Documentos adjuntos" onEdit={() => setStep(5)}>
					{(["dni", "credencial", "otros"] as SecloDocTipo[]).map((tipo) => {
						const doc = documentos.find((d) => d.tipo === tipo);
						if (!doc && tipo === "otros") return null;
						return (
							<ReviewRow key={tipo} label={DOC_TIPO_LABEL[tipo]} value={doc?.fileName || "—"} />
						);
					})}
				</ReviewSection>
			</Stack>
		);
	};

	return (
		<>
		<Dialog open={open && !contactDialog.open && !extraDialog.open && !extraRequeridoDialog.open} onClose={handleClose} maxWidth="md" fullWidth>
			<DialogTitle>Nueva solicitud de audiencia SECLO</DialogTitle>
			<DialogContent>
				<Stepper activeStep={step} alternativeLabel sx={{ mb: 3, mt: 1 }}>
					{STEPS.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{renderStep()}
			</DialogContent>
			<DialogActions sx={{ flexWrap: "wrap", gap: 1, justifyContent: "space-between" }}>
				{step === STEPS.length - 1 ? (
					<Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 1 }}>
						<Tooltip title="Modo prueba: el worker llena el formulario y se detiene ANTES de confirmarlo. NO se envía al portal. Quedan screenshots y un volcado del DOM en S3 para auditar.">
							<FormControlLabel
								control={<Switch checked={dryRunMode} onChange={(e) => setDryRunMode(e.target.checked)} color="warning" />}
								label={
									<Typography variant="body2" sx={{ fontWeight: dryRunMode ? 600 : 400 }}>
										Modo prueba (DEV) — no envía
									</Typography>
								}
							/>
						</Tooltip>
						{dryRunMode && (
							<Tooltip title="Además de los screenshots, sube el HTML del paso 7 a S3 (útil para inspeccionar IDs ASP.NET).">
								<FormControlLabel
									control={<Switch size="small" checked={dryRunWithHtml} onChange={(e) => setDryRunWithHtml(e.target.checked)} />}
									label={<Typography variant="caption">Capturar HTML</Typography>}
								/>
							</Tooltip>
						)}
					</Stack>
				) : (
					<Box />
				)}
				<Box>
					<Button onClick={handleClose} disabled={submitting}>
						Cancelar
					</Button>
					{step > 0 && (
						<Button onClick={handleBack} disabled={submitting}>
							Atrás
						</Button>
					)}
					{step < STEPS.length - 1 ? (
						<Button variant="contained" onClick={handleNext} disabled={!canAdvance()}>
							Siguiente
						</Button>
					) : (
						<Button
							variant="contained"
							color={dryRunMode ? "warning" : "success"}
							onClick={handleSubmit}
							disabled={submitting || !canAdvance()}
						>
							{submitting ? "Creando..." : dryRunMode ? "Crear en modo DEV" : "Crear solicitud"}
						</Button>
					)}
				</Box>
			</DialogActions>
		</Dialog>

		{/* Diálogo de creación/edición rápida de contacto.
		    El Dialog del wizard se cierra visualmente (open={open && !contactDialog.open})
		    para evitar Dialog dentro de Dialog y los issues de z-index con los Selects internos.
		    El componente padre sigue montado, así que el state del wizard se preserva. */}
		<SecloContactDialog
			open={contactDialog.open}
			mode={contactDialog.mode}
			userId={selectedUser?._id || ""}
			contact={contactDialog.contact}
			folderId={selectedFolder?._id}
			roleHint={contactDialog.target === "requirente" ? "trabajador" : "empleador"}
			onClose={closeContactDialog}
			onSaved={handleContactSaved}
		/>

		{/* Diálogo para agregar/editar un reclamante adicional. La feature
		    de múltiples reclamantes sólo aplica cuando iniciadoPor === 'trabajador'
		    y la solicitud corre forzada en dryRun (guard del worker) hasta
		    validar el flujo end-to-end con el portal SECLO. */}
		<Dialog open={extraDialog.open} onClose={() => setExtraDialog((s) => ({ ...s, open: false }))} maxWidth="sm" fullWidth>
			<DialogTitle>{extraDialog.editIndex !== null ? "Editar reclamante" : "Agregar reclamante"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2}>
					<Autocomplete
						options={contactsForRequirente.filter((c) =>
							c._id !== requirente?._id &&
							!extraRequirentes.some((r, i) => r.contact._id === c._id && i !== extraDialog.editIndex)
						)}
						getOptionLabel={(c: SecloContact) => `${c.name} ${c.lastName || ""}${c.cuit ? ` — ${c.cuit}` : ""}`}
						value={extraDialog.contact}
						onChange={(_, v) => setExtraDialog((s) => ({ ...s, contact: v }))}
						isOptionEqualToValue={(a, b) => a._id === b._id}
						renderInput={(params) => <TextField {...params} label="Contacto reclamante *" />}
						noOptionsText="No hay otros contactos disponibles"
					/>
					{extraDialog.contact && !extraDialog.contact.phoneCelular && (
						<Alert severity="warning">Falta <strong>phoneCelular</strong> en este contacto. SECLO lo exige.</Alert>
					)}
					{extraDialog.contact && !hasStructuredAddress(extraDialog.contact) && (
						<Alert severity="warning">Faltan <strong>calle</strong> y/o <strong>número</strong>. SECLO los exige separados.</Alert>
					)}
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<TextField fullWidth type="date" label="Fecha de nacimiento" InputLabelProps={{ shrink: true }}
								value={extraDialog.datosLab.fechaNacimiento?.toString().slice(0, 10) || ""}
								onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, fechaNacimiento: e.target.value || null } }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField fullWidth type="date" label="Fecha de ingreso" InputLabelProps={{ shrink: true }}
								value={extraDialog.datosLab.fechaIngreso?.toString().slice(0, 10) || ""}
								onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, fechaIngreso: e.target.value || null } }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField fullWidth type="date" label="Fecha de egreso" InputLabelProps={{ shrink: true }}
								value={extraDialog.datosLab.fechaEgreso?.toString().slice(0, 10) || ""}
								onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, fechaEgreso: e.target.value || null } }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField fullWidth type="date" label="Fecha del accidente (si aplica)" InputLabelProps={{ shrink: true }}
								value={extraDialog.datosLab.fechaAccidente?.toString().slice(0, 10) || ""}
								onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, fechaAccidente: e.target.value || null } }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField fullWidth type="number" label="Última remuneración ($)"
								value={extraDialog.datosLab.remuneracion || ""}
								onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, remuneracion: Number(e.target.value) || null } }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField fullWidth type="number" label="Importe del reclamo ($)"
								value={extraDialog.datosLab.importeReclamo || ""}
								onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, importeReclamo: Number(e.target.value) || null } }))}
							/>
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Estado trabajador</InputLabel>
								<Select value={extraDialog.datosLab.estadoTrabajador || "regular"} label="Estado trabajador"
									onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, estadoTrabajador: e.target.value as any } }))}
								>
									<MenuItem value="regular">Regular</MenuItem>
									<MenuItem value="irregular">Irregular</MenuItem>
									<MenuItem value="no_registrado">No registrado</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Sexo</InputLabel>
								<Select value={extraDialog.datosLab.sexo || "M"} label="Sexo"
									onChange={(e) => setExtraDialog((s) => ({ ...s, datosLab: { ...s.datosLab, sexo: e.target.value as any } }))}
								>
									<MenuItem value="M">Masculino</MenuItem>
									<MenuItem value="F">Femenino</MenuItem>
								</Select>
							</FormControl>
						</Grid>
					</Grid>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setExtraDialog((s) => ({ ...s, open: false }))}>Cancelar</Button>
				<Button
					variant="contained"
					disabled={!extraDialog.contact || !extraDialog.contact.phoneCelular || !hasStructuredAddress(extraDialog.contact)}
					onClick={() => {
						if (!extraDialog.contact) return;
						const entry = { contact: extraDialog.contact, datosLaborales: extraDialog.datosLab };
						setExtraRequirentes((prev) => {
							if (extraDialog.editIndex !== null) {
								const copy = [...prev];
								copy[extraDialog.editIndex] = entry;
								return copy;
							}
							return [...prev, entry];
						});
						setExtraDialog({ open: false, editIndex: null, contact: null, datosLab: { estadoTrabajador: "regular", sexo: "M" } });
					}}
				>
					{extraDialog.editIndex !== null ? "Guardar cambios" : "Agregar a la lista"}
				</Button>
			</DialogActions>
		</Dialog>

		{/* Diálogo para agregar/editar un empleador adicional. Como los empleadores
		    no tienen datos laborales asociados, el sub-dialog sólo necesita la
		    selección de Contact (con validación de calle+número). */}
		<Dialog open={extraRequeridoDialog.open} onClose={() => setExtraRequeridoDialog((s) => ({ ...s, open: false }))} maxWidth="sm" fullWidth>
			<DialogTitle>{extraRequeridoDialog.editIndex !== null ? "Cambiar empleador" : "Agregar empleador"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2}>
					<Autocomplete
						options={localContacts.filter((c) =>
							c._id !== requirente?._id &&
							c._id !== requerido?._id &&
							!extraRequirentes.some((r) => r.contact._id === c._id) &&
							!extraRequeridos.some((r, i) => r._id === c._id && i !== extraRequeridoDialog.editIndex)
						)}
						getOptionLabel={(c: SecloContact) =>
							`${c.company || `${c.name} ${c.lastName || ""}`.trim()}${c.cuit ? ` — ${c.cuit}` : ""}`
						}
						value={extraRequeridoDialog.contact}
						onChange={(_, v) => setExtraRequeridoDialog((s) => ({ ...s, contact: v }))}
						isOptionEqualToValue={(a, b) => a._id === b._id}
						renderInput={(params) => <TextField {...params} label="Contacto empleador *" />}
						noOptionsText="No hay otros contactos disponibles"
					/>
					{extraRequeridoDialog.contact && !hasStructuredAddress(extraRequeridoDialog.contact) && (
						<Alert severity="warning">Faltan <strong>calle</strong> y/o <strong>número</strong>. SECLO los exige separados.</Alert>
					)}
					{extraRequeridoDialog.contact && !hasValidTipoSociedad(extraRequeridoDialog.contact) && (
						<Alert
							severity="warning"
							action={
								<Button
									color="inherit"
									size="small"
									onClick={() => {
										setExtraRequeridoDialog((s) => ({ ...s, open: false }));
										setContactDialog({ open: true, mode: "edit", target: "requerido", contact: extraRequeridoDialog.contact! });
									}}
								>
									Completar
								</Button>
							}
						>
							Falta el <strong>tipo</strong> de persona jurídica. SECLO lo exige.
						</Alert>
					)}
					{extraRequeridoDialog.contact && (
						<Alert severity="info" icon={false}>
							<Typography variant="body2"><strong>CUIT:</strong> {extraRequeridoDialog.contact.cuit || "—"}</Typography>
							<Typography variant="body2">
								<strong>Domicilio:</strong>{" "}
								{[extraRequeridoDialog.contact.street, extraRequeridoDialog.contact.streetNumber].filter(Boolean).join(" ") || extraRequeridoDialog.contact.address || "—"}
							</Typography>
						</Alert>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setExtraRequeridoDialog((s) => ({ ...s, open: false }))}>Cancelar</Button>
				<Button
					variant="contained"
					disabled={
						!extraRequeridoDialog.contact ||
						!hasStructuredAddress(extraRequeridoDialog.contact) ||
						!hasValidTipoSociedad(extraRequeridoDialog.contact)
					}
					onClick={() => {
						if (!extraRequeridoDialog.contact) return;
						const c = extraRequeridoDialog.contact;
						setExtraRequeridos((prev) => {
							if (extraRequeridoDialog.editIndex !== null) {
								const copy = [...prev];
								copy[extraRequeridoDialog.editIndex] = c;
								return copy;
							}
							return [...prev, c];
						});
						setExtraRequeridoDialog({ open: false, editIndex: null, contact: null });
					}}
				>
					{extraRequeridoDialog.editIndex !== null ? "Guardar cambios" : "Agregar a la lista"}
				</Button>
			</DialogActions>
		</Dialog>
		</>
	);
}
