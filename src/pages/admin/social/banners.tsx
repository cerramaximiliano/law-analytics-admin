/**
 * Banners de las páginas públicas
 * ===============================
 * Edita el copy y el CTA de los banners de conversión de /jurisprudencia y
 * /educativo (mini-sitio público + vista jurisprudencia de la SPA) sin deploy,
 * y muestra sus métricas: views, clicks y CTR por banner, con desglose de
 * clicks por origen de la sesión (IG vía links.lawanalytics.app, email de
 * jurisprudencia, app, directo).
 *
 * Tokens disponibles en título y cuerpo:
 *   {fallos}   → cifra dinámica del corpus buscable (grifo RAG)
 *   ==texto==  → segmento con resaltador amarillo
 *
 * Backend: admin-api /api/public-banners (colección public-banners; eventos en
 * banner-events, registrados por los sitios públicos vía sendBeacon).
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
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { Chart, Edit2, ExportSquare, Refresh } from "iconsax-react";

// project imports
import MainCard from "components/MainCard";
import {
	BannerKey,
	BannerStats,
	PublicBanner,
	PublicBannerPayload,
	getBannerStats,
	listPublicBanners,
	updatePublicBanner,
} from "api/publicBanners";

/** URL pública donde se ve cada slot. */
const SLOT_URL: Record<BannerKey, string> = {
	"jurisprudencia-index": "https://lawanalytics.app/jurisprudencia",
	"jurisprudencia-detail": "https://lawanalytics.app/jurisprudencia",
	"educativo-index": "https://lawanalytics.app/educativo",
	"educativo-detail": "https://lawanalytics.app/educativo",
};

const RANGOS = [7, 30, 90] as const;

const BannersAdmin = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [banners, setBanners] = useState<PublicBanner[]>([]);
	const [stats, setStats] = useState<BannerStats | null>(null);
	const [days, setDays] = useState<number>(30);
	const [loading, setLoading] = useState(true);
	const [editando, setEditando] = useState<PublicBanner | null>(null);
	const [form, setForm] = useState<PublicBannerPayload>({});
	const [guardando, setGuardando] = useState(false);

	const cargar = useCallback(
		async (rango: number) => {
			setLoading(true);
			try {
				const [listaBanners, estadisticas] = await Promise.all([listPublicBanners(), getBannerStats(rango)]);
				setBanners(listaBanners);
				setStats(estadisticas);
			} catch {
				enqueueSnackbar("No se pudieron cargar los banners", { variant: "error" });
			} finally {
				setLoading(false);
			}
		},
		[enqueueSnackbar],
	);

	useEffect(() => {
		cargar(days);
	}, [cargar, days]);

	const abrirEditor = (banner: PublicBanner) => {
		setEditando(banner);
		setForm({
			nombre: banner.nombre,
			titulo: banner.titulo,
			cuerpo: banner.cuerpo,
			ctaLabel: banner.ctaLabel,
			ctaHref: banner.ctaHref,
			habilitado: banner.habilitado,
		});
	};

	const guardar = async () => {
		if (!editando) return;
		setGuardando(true);
		try {
			const actualizado = await updatePublicBanner(editando.key, form);
			setBanners((prev) => prev.map((b) => (b.key === actualizado.key ? actualizado : b)));
			setEditando(null);
			enqueueSnackbar("Banner actualizado — visible en el sitio en menos de 5 minutos", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al guardar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const toggleHabilitado = async (banner: PublicBanner) => {
		try {
			const actualizado = await updatePublicBanner(banner.key, { habilitado: !banner.habilitado });
			setBanners((prev) => prev.map((b) => (b.key === actualizado.key ? actualizado : b)));
			enqueueSnackbar(actualizado.habilitado ? "Banner habilitado" : "Deshabilitado — el sitio muestra su copy de respaldo", {
				variant: "info",
			});
		} catch {
			enqueueSnackbar("Error al cambiar la visibilidad", { variant: "error" });
		}
	};

	const statsDe = (key: BannerKey) => stats?.banners?.[key];

	return (
		<MainCard
			title="Banners de las páginas públicas"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<FormControl size="small" sx={{ minWidth: 120 }}>
						<InputLabel>Rango</InputLabel>
						<Select label="Rango" value={days} onChange={(e) => setDays(Number(e.target.value))}>
							{RANGOS.map((r) => (
								<MenuItem key={r} value={r}>
									Últimos {r} días
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<Tooltip title="Recargar">
						<Button size="small" onClick={() => cargar(days)} startIcon={<Refresh size={16} />}>
							Recargar
						</Button>
					</Tooltip>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				El copy se sirve en vivo (cache de 60s en la API + 5 min en el navegador del visitante). Tokens: <code>{"{fallos}"}</code>{" "}
				inserta la cifra dinámica del corpus buscable; <code>==texto==</code> lo pinta con resaltador. Los clicks se atribuyen al
				origen de la sesión: <em>instagram</em> (links.lawanalytics.app), <em>email</em> (correos de jurisprudencia), <em>app</em>{" "}
				(vista dentro de la SPA) o <em>directo</em>.
			</Typography>

			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress size={28} />
				</Box>
			) : (
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Banner</TableCell>
								<TableCell>Título</TableCell>
								<TableCell align="right">Views</TableCell>
								<TableCell align="right">Clicks</TableCell>
								<TableCell align="right">CTR</TableCell>
								<TableCell>Orígenes de los clicks</TableCell>
								<TableCell align="center">Visible</TableCell>
								<TableCell align="right">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{banners.map((banner) => {
								const s = statsDe(banner.key);
								return (
									<TableRow key={banner.key} hover>
										<TableCell>
											<Typography variant="subtitle2">{banner.nombre}</Typography>
											<Typography variant="caption" color="text.secondary">
												{banner.key}
											</Typography>
										</TableCell>
										<TableCell sx={{ maxWidth: 320 }}>
											<Typography variant="body2" noWrap title={banner.titulo}>
												{banner.titulo}
											</Typography>
										</TableCell>
										<TableCell align="right">{s ? s.views.toLocaleString("es-AR") : "—"}</TableCell>
										<TableCell align="right">{s ? s.clicks.toLocaleString("es-AR") : "—"}</TableCell>
										<TableCell align="right">
											{s && s.views > 0 ? (
												<Chip size="small" color={s.ctr >= 2 ? "success" : "default"} label={`${s.ctr}%`} />
											) : (
												"—"
											)}
										</TableCell>
										<TableCell>
											<Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
												{s && Object.keys(s.origenes).length > 0 ? (
													Object.entries(s.origenes).map(([origen, n]) => (
														<Chip key={origen} size="small" variant="outlined" label={`${origen}: ${n}`} />
													))
												) : (
													<Typography variant="caption" color="text.secondary">
														Sin clicks en el rango
													</Typography>
												)}
											</Stack>
										</TableCell>
										<TableCell align="center">
											<Switch size="small" checked={banner.habilitado} onChange={() => toggleHabilitado(banner)} />
										</TableCell>
										<TableCell align="right">
											<Tooltip title="Editar copy y CTA">
												<Button size="small" startIcon={<Edit2 size={16} />} onClick={() => abrirEditor(banner)}>
													Editar
												</Button>
											</Tooltip>
											<Tooltip title="Ver la página">
												<Button
													size="small"
													component="a"
													href={SLOT_URL[banner.key]}
													target="_blank"
													rel="noopener"
													startIcon={<ExportSquare size={16} />}
												>
													Ver
												</Button>
											</Tooltip>
										</TableCell>
									</TableRow>
								);
							})}
							{banners.length === 0 && (
								<TableRow>
									<TableCell colSpan={8}>
										<Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
											Sin banners — correr el seed en el server (scripts/seedPublicBanners.js).
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			{stats && stats.serie.length > 0 && (
				<Box sx={{ mt: 3 }}>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
						<Chart size={18} />
						<Typography variant="subtitle2">Clicks por día ({stats.days} días)</Typography>
					</Stack>
					<TableContainer sx={{ maxHeight: 260 }}>
						<Table size="small" stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell>Día</TableCell>
									<TableCell>Banner</TableCell>
									<TableCell align="right">Clicks</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{[...stats.serie].reverse().map((r, i) => (
									<TableRow key={`${r.dia}-${r.key}-${i}`}>
										<TableCell>{r.dia}</TableCell>
										<TableCell>{r.key}</TableCell>
										<TableCell align="right">{r.clicks}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}

			<Dialog open={Boolean(editando)} onClose={() => !guardando && setEditando(null)} maxWidth="md" fullWidth>
				<DialogTitle>Editar banner — {editando?.nombre}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Nombre (interno)"
							value={form.nombre ?? ""}
							onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
							fullWidth
						/>
						<TextField
							label="Título"
							helperText="Tokens: {fallos} → cifra dinámica · ==texto== → resaltador"
							value={form.titulo ?? ""}
							onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
							fullWidth
							multiline
						/>
						<TextField
							label="Cuerpo"
							value={form.cuerpo ?? ""}
							onChange={(e) => setForm((f) => ({ ...f, cuerpo: e.target.value }))}
							fullWidth
							multiline
							minRows={3}
						/>
						<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
							<TextField
								label="Texto del botón"
								value={form.ctaLabel ?? ""}
								onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
								fullWidth
							/>
							<TextField
								label="Destino del botón"
								helperText="Root-relative, ej: /register?source=jurisprudencia"
								value={form.ctaHref ?? ""}
								onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
								fullWidth
							/>
						</Stack>
						<Stack direction="row" spacing={1} alignItems="center">
							<Switch
								checked={form.habilitado ?? true}
								onChange={(e) => setForm((f) => ({ ...f, habilitado: e.target.checked }))}
							/>
							<Typography variant="body2">Visible (apagado → el sitio muestra su copy de respaldo)</Typography>
						</Stack>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditando(null)} disabled={guardando}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={guardar} disabled={guardando}>
						{guardando ? "Guardando…" : "Guardar"}
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default BannersAdmin;
