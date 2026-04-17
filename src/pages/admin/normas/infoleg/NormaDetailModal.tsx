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
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, ExportSquare } from "iconsax-react";
import dayjs from "dayjs";
import InfolegService from "api/infolegService";
import type { InfolegNorma } from "types/infoleg";

const TIPO_LABELS: Record<string, string> = {
	ley: "Ley",
	decreto: "Decreto",
	decreto_ley: "Decreto-Ley",
	decreto_reglamentario: "D. Reglamentario",
	decreto_dnu: "DNU",
	resolucion: "Resolución",
	resolucion_general: "Res. General",
	resolucion_administrativa: "Res. Administrativa",
	decision_administrativa: "Dec. Administrativa",
	disposicion: "Disposición",
	disposicion_conjunta: "Disp. Conjunta",
	acuerdo: "Acuerdo",
	convenio: "Convenio",
	otro: "Otro",
};

const VIGENCIA_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
	vigente: "success",
	derogada: "error",
	parcialmente_vigente: "warning",
	desconocida: "default",
};

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
	scraped: "success",
	pending: "warning",
	error: "error",
	not_found: "default",
};

interface MetaRowProps {
	label: string;
	value?: string | React.ReactNode;
}
const MetaRow = ({ label, value }: MetaRowProps) => (
	<Grid item xs={12} sm={6}>
		<Typography variant="caption" color="text.secondary" display="block">
			{label}
		</Typography>
		<Typography variant="body2" fontWeight={500}>
			{value || "—"}
		</Typography>
	</Grid>
);

interface NormaDetailModalProps {
	infolegId: number | null;
	open: boolean;
	onClose: () => void;
}

const NormaDetailModal = ({ infolegId, open, onClose }: NormaDetailModalProps) => {
	const theme = useTheme();
	const [norma, setNorma] = useState<InfolegNorma | null>(null);
	const [loading, setLoading] = useState(false);
	const [tab, setTab] = useState("meta");

	useEffect(() => {
		if (!open || infolegId == null) return;
		setNorma(null);
		setTab("meta");
		const fetchNorma = async () => {
			setLoading(true);
			try {
				const res = await InfolegService.getNorma(infolegId, { includeText: true, includeVinculaciones: true });
				setNorma(res.data);
			} finally {
				setLoading(false);
			}
		};
		fetchNorma();
	}, [open, infolegId]);

	const hasTextoOriginal = !!(norma?.textoPlano || norma?.textoHtml);
	const hasTextoActualizado = !!(norma?.textoActualizadoPlano || norma?.textoActualizadoHtml);
	const hasVinculaciones = !!norma?.vinculacionesRaw?.length;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { height: "85vh" } }}>
			<DialogTitle sx={{ pb: 1 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={1.5} alignItems="center">
						{norma && <Chip label={TIPO_LABELS[norma.tipo || ""] || norma.tipo || "?"} size="small" color="primary" variant="outlined" />}
						<Typography variant="h5">
							{norma ? `${norma.numero ? `N° ${norma.numero}` : ""} ${norma.anio ? `(${norma.anio})` : ""}`.trim() : `ID ${infolegId}`}
						</Typography>
					</Stack>
					<Stack direction="row" spacing={0.5}>
						{norma?.urlSlug && (
							<Tooltip title="Ver en InfoLeg">
								<IconButton
									size="small"
									component="a"
									href={`https://www.argentina.gob.ar/normativa/nacional/${norma.urlSlug}`}
									target="_blank"
								>
									<ExportSquare size={18} />
								</IconButton>
							</Tooltip>
						)}
						<IconButton size="small" onClick={onClose}>
							<CloseCircle size={20} />
						</IconButton>
					</Stack>
				</Stack>
			</DialogTitle>

			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
				<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ "& .MuiTab-root": { textTransform: "none", minHeight: 40 } }}>
					<Tab value="meta" label="Metadatos" />
					<Tab value="texto" label={`Texto original${!hasTextoOriginal ? " (N/D)" : ""}`} disabled={!hasTextoOriginal} />
					<Tab value="texact" label={`Texto actualizado${!hasTextoActualizado ? " (N/D)" : ""}`} disabled={!hasTextoActualizado} />
					<Tab
						value="vinc"
						label={`Vinculaciones${hasVinculaciones ? ` (${norma?.vinculacionesRaw?.length})` : ""}`}
						disabled={!hasVinculaciones}
					/>
				</Tabs>
			</Box>

			<DialogContent sx={{ p: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
				{loading ? (
					<Box display="flex" justifyContent="center" alignItems="center" flex={1}>
						<CircularProgress />
					</Box>
				) : norma ? (
					<Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
						{/* METADATOS */}
						{tab === "meta" && (
							<Stack spacing={2.5}>
								<Box>
									<Typography variant="subtitle2" color="primary" gutterBottom>
										{norma.titulo || "Sin título"}
									</Typography>
									<Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
										<Chip label={`ID ${norma.infolegId}`} size="small" />
										<Chip label={norma.status} color={STATUS_COLOR[norma.status] || "default"} size="small" />
										<Chip label={norma.vigencia} color={VIGENCIA_COLOR[norma.vigencia] || "default"} size="small" />
										{norma.tasks?.textoActualizadoStale && <Chip label="Texto desactualizado" color="warning" size="small" />}
									</Stack>
								</Box>

								<Divider />

								<Grid container spacing={1.5}>
									<MetaRow label="Organismo" value={norma.organismo} />
									<MetaRow
										label="Fecha publicación"
										value={norma.fechaPublicacion ? dayjs(norma.fechaPublicacion).format("DD/MM/YYYY") : undefined}
									/>
									<MetaRow
										label="Boletín Oficial"
										value={
											norma.boletin?.numero
												? `N° ${norma.boletin.numero}${norma.boletin.fecha ? ` — ${dayjs(norma.boletin.fecha).format("DD/MM/YYYY")}` : ""}`
												: undefined
										}
									/>
									<MetaRow label="Scrapeado" value={norma.scrapedAt ? dayjs(norma.scrapedAt).format("DD/MM/YYYY HH:mm") : undefined} />
									<MetaRow label="Fuente texto orig." value={norma.textoFuente?.original || undefined} />
									<MetaRow label="Fuente texto act." value={norma.textoFuente?.actualizado || undefined} />
									<MetaRow label="URL Portal nuevo" value={norma.urlSlug || undefined} />
								</Grid>

								<Divider />

								<Box>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
										Tareas completadas
									</Typography>
									<Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
										{[
											["textoOriginal", "Texto original"],
											["textoActualizado", "Texto actualizado"],
											["vinculacionesParsed", "Vinc. parseadas"],
											["vinculacionesResolved", "Vinc. resueltas"],
										].map(([key, label]) => (
											<Chip
												key={key}
												label={label}
												size="small"
												color={(norma.tasks as any)?.[key] ? "success" : "default"}
												variant={(norma.tasks as any)?.[key] ? "filled" : "outlined"}
											/>
										))}
									</Stack>
								</Box>

								{/* Vinculaciones entrantes resumen */}
								{norma.vinculacionesEntrantes?.total > 0 && (
									<>
										<Divider />
										<Box>
											<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
												Vinculaciones entrantes (otras normas apuntan a esta)
											</Typography>
											<Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
												{[
													["total", "Total"],
													["modificaciones", "Modificaciones"],
													["derogaciones", "Derogaciones"],
													["complementos", "Complementos"],
													["reglamentaciones", "Reglamentaciones"],
													["referencias", "Referencias"],
												]
													.filter(([k]) => (norma.vinculacionesEntrantes as any)[k] > 0)
													.map(([k, label]) => (
														<Chip
															key={k}
															label={`${label}: ${(norma.vinculacionesEntrantes as any)[k].toLocaleString("es-AR")}`}
															size="small"
															color={k === "total" ? "primary" : "default"}
															variant={k === "total" ? "filled" : "outlined"}
														/>
													))}
											</Stack>
										</Box>
									</>
								)}
							</Stack>
						)}

						{/* TEXTO ORIGINAL */}
						{tab === "texto" && (
							<Box
								component="pre"
								sx={{
									fontFamily: "monospace",
									fontSize: "0.78rem",
									lineHeight: 1.6,
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									bgcolor: alpha(theme.palette.grey[500], 0.05),
									p: 2,
									borderRadius: 1,
									m: 0,
								}}
							>
								{norma.textoPlano || norma.textoHtml || "(sin contenido)"}
							</Box>
						)}

						{/* TEXTO ACTUALIZADO */}
						{tab === "texact" && (
							<Box
								component="pre"
								sx={{
									fontFamily: "monospace",
									fontSize: "0.78rem",
									lineHeight: 1.6,
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									bgcolor: alpha(theme.palette.grey[500], 0.05),
									p: 2,
									borderRadius: 1,
									m: 0,
								}}
							>
								{norma.textoActualizadoPlano || norma.textoActualizadoHtml || "(sin contenido)"}
							</Box>
						)}

						{/* VINCULACIONES */}
						{tab === "vinc" && norma.vinculacionesRaw && (
							<Stack spacing={1}>
								{norma.vinculacionesRaw.map((v, i) => (
									<Box
										key={i}
										sx={{
											p: 1.5,
											borderRadius: 1,
											border: "1px solid",
											borderColor: "divider",
										}}
									>
										<Stack direction="row" spacing={1.5} alignItems="flex-start">
											<Chip
												label={v.tipo}
												size="small"
												variant="outlined"
												color="primary"
												sx={{ minWidth: 120, justifyContent: "flex-start" }}
											/>
											<Box flex={1}>
												<Typography variant="body2" fontWeight={500}>
													ID {v.infolegIdDestino}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{v.textoOriginal?.slice(0, 150)}
												</Typography>
											</Box>
										</Stack>
									</Box>
								))}
							</Stack>
						)}
					</Box>
				) : null}
			</DialogContent>
		</Dialog>
	);
};

export default NormaDetailModal;
