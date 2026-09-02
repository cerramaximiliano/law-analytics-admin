/**
 * Link-in-bio (links.lawanalytics.app)
 * ====================================
 * Administra los enlaces de la página de bio de Instagram. La página estática
 * los lee de la API pública de marketing: crear, ordenar, habilitar o editar
 * acá impacta en vivo (cache de 60s), sin deploys.
 *
 * Backend: la-marketing-service, /api/biolinks (vía mktAxios).
 */

import { useCallback, useEffect, useState } from "react";

// material-ui
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
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
	TextField,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { Add, Edit2, ExportSquare, Refresh, Trash } from "iconsax-react";

// project imports
import MainCard from "components/MainCard";
import { BioLink, BioLinkIcono, BioLinkPayload, createBioLink, deleteBioLink, listBioLinks, updateBioLink } from "api/bioLinks";

const ICONO_LABEL: Record<BioLinkIcono, string> = {
	home: "Grilla (app)",
	libro: "Libro (jurisprudencia)",
	lapiz: "Lápiz (educativo)",
	link: "Enlace (genérico)",
};

const VACIO: BioLinkPayload & { titulo: string; url: string } = {
	titulo: "",
	descripcion: "",
	url: "https://",
	icono: "link",
	habilitado: false,
	orden: 10,
};

const LinksBio = () => {
	const theme = useTheme();
	const esMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();

	const [links, setLinks] = useState<BioLink[]>([]);
	const [cargando, setCargando] = useState(true);
	const [guardando, setGuardando] = useState(false);
	// null = cerrado; "nuevo" = alta; BioLink = edición.
	const [editando, setEditando] = useState<BioLink | "nuevo" | null>(null);
	const [form, setForm] = useState(VACIO);
	const [aEliminar, setAEliminar] = useState<BioLink | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			setLinks(await listBioLinks());
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudieron cargar los links", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const abrirEditor = (link: BioLink | "nuevo") => {
		setEditando(link);
		setForm(
			link === "nuevo"
				? VACIO
				: {
						titulo: link.titulo,
						descripcion: link.descripcion,
						url: link.url,
						icono: link.icono,
						habilitado: link.habilitado,
						orden: link.orden,
				  },
		);
	};

	const guardar = async () => {
		setGuardando(true);
		try {
			if (editando === "nuevo") {
				await createBioLink(form);
				enqueueSnackbar("Link creado", { variant: "success" });
			} else if (editando) {
				await updateBioLink(editando._id, form);
				enqueueSnackbar("Link guardado", { variant: "success" });
			}
			setEditando(null);
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo guardar el link", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	// El switch de la tabla es la acción del día a día: impacta al toque.
	const toggleHabilitado = async (link: BioLink) => {
		try {
			await updateBioLink(link._id, { habilitado: !link.habilitado });
			setLinks((prev) => prev.map((l) => (l._id === link._id ? { ...l, habilitado: !l.habilitado } : l)));
			enqueueSnackbar(link.habilitado ? "Link deshabilitado" : "Link habilitado — visible en la bio en <60s", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo actualizar", { variant: "error" });
		}
	};

	const eliminar = async () => {
		if (!aEliminar) return;
		setGuardando(true);
		try {
			await deleteBioLink(aEliminar._id);
			enqueueSnackbar("Link eliminado", { variant: "success" });
			setAEliminar(null);
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo eliminar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	return (
		<MainCard
			title={
				<Stack
					direction={{ xs: "column", sm: "row" }}
					alignItems={{ xs: "stretch", sm: "center" }}
					justifyContent="space-between"
					gap={1.5}
				>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="h4">Link-in-bio</Typography>
						<Typography variant="caption" color="text.secondary">
							Los enlaces de links.lawanalytics.app — los cambios impactan en vivo (cache de 60 segundos)
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
						<Button
							size="small"
							startIcon={<ExportSquare size={16} />}
							component="a"
							href="https://links.lawanalytics.app"
							target="_blank"
							rel="noopener noreferrer"
						>
							Ver la página
						</Button>
						<Button size="small" startIcon={<Refresh size={16} />} onClick={cargar} disabled={cargando}>
							Actualizar
						</Button>
						<Button size="small" variant="contained" startIcon={<Add size={16} />} onClick={() => abrirEditor("nuevo")}>
							Nuevo link
						</Button>
					</Stack>
				</Stack>
			}
		>
			{esMobile ? (
				/* Seis columnas no entran en un teléfono. Tarjeta por link, con la URL
				   completa (que es lo que se verifica) en vez de recortada. */
				<Stack spacing={1.25}>
					{cargando && (
						<Stack alignItems="center" sx={{ py: 4 }}>
							<CircularProgress size={24} />
						</Stack>
					)}
					{!cargando &&
						links.map((link) => (
							<Box
								key={link._id}
								sx={{
									p: 1.5,
									borderRadius: 1.5,
									border: `1px solid ${theme.palette.divider}`,
									bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.04 : 0.02),
									opacity: link.habilitado ? 1 : 0.6,
								}}
							>
								<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
									<Box sx={{ minWidth: 0 }}>
										<Typography variant="subtitle2">
											{link.orden}. {link.titulo}
										</Typography>
										{link.descripcion && (
											<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
												{link.descripcion}
											</Typography>
										)}
									</Box>
									<Switch size="small" checked={link.habilitado} onChange={() => toggleHabilitado(link)} sx={{ flexShrink: 0 }} />
								</Stack>
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, wordBreak: "break-all" }}>
									{link.url}
								</Typography>
								<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }} gap={1}>
									<Chip size="small" variant="outlined" label={ICONO_LABEL[link.icono] || link.icono} />
									<Stack direction="row" sx={{ flexShrink: 0 }}>
										<IconButton size="small" onClick={() => abrirEditor(link)}>
											<Edit2 size={17} />
										</IconButton>
										<IconButton size="small" color="error" onClick={() => setAEliminar(link)}>
											<Trash size={17} />
										</IconButton>
									</Stack>
								</Stack>
							</Box>
						))}
				</Stack>
			) : (
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell width={70}>Orden</TableCell>
								<TableCell>Título</TableCell>
								<TableCell>URL</TableCell>
								<TableCell>Icono</TableCell>
								<TableCell align="center">Visible</TableCell>
								<TableCell align="right">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{cargando && (
								<TableRow>
									<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
										<CircularProgress size={24} />
									</TableCell>
								</TableRow>
							)}
							{!cargando &&
								links.map((link) => (
									<TableRow key={link._id} hover>
										<TableCell>{link.orden}</TableCell>
										<TableCell>
											<Typography variant="subtitle2">{link.titulo}</Typography>
											{link.descripcion && (
												<Typography variant="caption" color="text.secondary">
													{link.descripcion}
												</Typography>
											)}
										</TableCell>
										<TableCell sx={{ maxWidth: 280 }}>
											<Typography variant="caption" color="text.secondary" noWrap title={link.url} sx={{ display: "block" }}>
												{link.url}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip size="small" variant="outlined" label={ICONO_LABEL[link.icono] || link.icono} />
										</TableCell>
										<TableCell align="center">
											<Switch size="small" checked={link.habilitado} onChange={() => toggleHabilitado(link)} />
										</TableCell>
										<TableCell align="right">
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => abrirEditor(link)}>
													<Edit2 size={18} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => setAEliminar(link)}>
													<Trash size={18} />
												</IconButton>
											</Tooltip>
										</TableCell>
									</TableRow>
								))}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			{/* Alta / edición */}
			<Dialog open={editando !== null} onClose={() => !guardando && setEditando(null)} maxWidth="sm" fullWidth>
				<DialogTitle>{editando === "nuevo" ? "Nuevo link" : "Editar link"}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Título"
							value={form.titulo}
							onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
							fullWidth
							inputProps={{ maxLength: 60 }}
						/>
						<TextField
							label="Descripción"
							value={form.descripcion}
							onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
							fullWidth
							inputProps={{ maxLength: 120 }}
						/>
						<TextField
							label="URL (con UTM si corresponde)"
							value={form.url}
							onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
							fullWidth
							inputProps={{ maxLength: 500 }}
						/>
						<Stack direction="row" spacing={2}>
							<FormControl size="small" sx={{ minWidth: 220 }}>
								<InputLabel>Icono</InputLabel>
								<Select
									value={form.icono}
									label="Icono"
									onChange={(e) => setForm((f) => ({ ...f, icono: e.target.value as BioLinkIcono }))}
								>
									{(Object.keys(ICONO_LABEL) as BioLinkIcono[]).map((k) => (
										<MenuItem key={k} value={k}>
											{ICONO_LABEL[k]}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<TextField
								label="Orden"
								type="number"
								size="small"
								value={form.orden}
								onChange={(e) => setForm((f) => ({ ...f, orden: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
								sx={{ width: 110 }}
							/>
							<Stack direction="row" alignItems="center" spacing={0.5}>
								<Switch
									size="small"
									checked={!!form.habilitado}
									onChange={(e) => setForm((f) => ({ ...f, habilitado: e.target.checked }))}
								/>
								<Typography variant="body2">Visible</Typography>
							</Stack>
						</Stack>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditando(null)} disabled={guardando}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={guardar} disabled={guardando || !form.titulo || !form.url}>
						{guardando ? "Guardando…" : "Guardar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Confirmación de borrado */}
			<Dialog open={!!aEliminar} onClose={() => !guardando && setAEliminar(null)}>
				<DialogTitle>¿Eliminar "{aEliminar?.titulo}"?</DialogTitle>
				<DialogActions>
					<Button onClick={() => setAEliminar(null)} disabled={guardando}>
						Cancelar
					</Button>
					<Button color="error" variant="contained" onClick={eliminar} disabled={guardando}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default LinksBio;
