import { useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	Divider,
	Drawer,
	Grid,
	IconButton,
	Paper,
	Skeleton,
	Stack,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { ArrowRight2, CloseCircle, DocumentText, ExportSquare, Folder2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import LiquidacionWorkerConfigService, { CausaOrigen, LiquidacionDocDetail } from "api/liquidacionWorkerConfig";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

interface Props {
	docId: string | null;
	open: boolean;
	onClose: () => void;
}

function fmtNumber(n: number | undefined | null): string {
	if (n === undefined || n === null) return "—";
	return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | undefined | null): string {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleDateString("es-AR");
	} catch {
		return "—";
	}
}

function Section({ title, children, dense = false }: { title: string; children: React.ReactNode; dense?: boolean }) {
	return (
		<Box>
			<Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.5px" }}>
				{title}
			</Typography>
			<Paper variant="outlined" sx={{ p: dense ? 1.5 : 2, mt: 0.5 }}>
				{children}
			</Paper>
		</Box>
	);
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<Grid container spacing={1}>
			<Grid item xs={5}>
				<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
					{label}
				</Typography>
			</Grid>
			<Grid item xs={7}>
				<Typography variant="body2" sx={{ wordBreak: "break-word" }}>
					{value === undefined || value === null || value === "" ? "—" : value}
				</Typography>
			</Grid>
		</Grid>
	);
}

export default function DocumentDetailDrawer({ docId, open, onClose }: Props) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [doc, setDoc] = useState<LiquidacionDocDetail | null>(null);
	const [causa, setCausa] = useState<CausaOrigen | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingCausa, setLoadingCausa] = useState(false);
	const [showCausa, setShowCausa] = useState(false);

	useEffect(() => {
		if (!open || !docId) {
			setDoc(null);
			setCausa(null);
			setShowCausa(false);
			return;
		}
		(async () => {
			try {
				setLoading(true);
				const d = await LiquidacionWorkerConfigService.getDocument(docId);
				setDoc(d);
			} catch (err: any) {
				enqueueSnackbar(err?.response?.data?.message || "Error cargando documento", { variant: "error" });
			} finally {
				setLoading(false);
			}
		})();
	}, [open, docId, enqueueSnackbar]);

	const loadCausa = async () => {
		if (!docId) return;
		try {
			setLoadingCausa(true);
			setShowCausa(true);
			const c = await LiquidacionWorkerConfigService.getDocumentCausa(docId);
			setCausa(c);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando causa origen", { variant: "error" });
			setShowCausa(false);
		} finally {
			setLoadingCausa(false);
		}
	};

	const e = doc?.extracted;

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={onClose}
			PaperProps={{
				sx: {
					width: { xs: "100%", sm: 600, md: 720 },
					p: 0,
					borderLeft: `1px solid ${headerBorder(isDark)}`,
				},
			}}
		>
			<Box
				sx={{
					position: "sticky",
					top: 0,
					zIndex: 2,
					bgcolor: "background.paper",
					borderBottom: `1px solid ${headerBorder(isDark)}`,
					p: 2,
				}}
			>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={1} alignItems="center">
						<Box sx={{ color: BRAND_BLUE }}>
							<DocumentText size={20} />
						</Box>
						<Typography variant="h6" sx={{ fontWeight: 600 }}>
							Detalle de liquidación
						</Typography>
					</Stack>
					<IconButton
						onClick={onClose}
						size="small"
						sx={{
							transition: "background-color 200ms ease, transform 200ms ease",
							"&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12), transform: "translateY(-1px)" },
						}}
					>
						<CloseCircle size={20} />
					</IconButton>
				</Stack>
			</Box>

			<Box sx={{ p: 2 }}>
				{loading || !doc ? (
					<Stack spacing={2}>
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} variant="rounded" height={120} />
						))}
					</Stack>
				) : (
					<Stack spacing={2}>
						{/* Header con carátula + chips */}
						<Box>
							<Typography variant="h6" sx={{ fontSize: "1rem" }}>
								{doc.caratula}
							</Typography>
							<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
								<Chip
									label={`${doc.causaNumber}/${doc.causaYear}`}
									size="small"
									sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
								/>
								{doc.fuero && <Chip label={doc.fuero} size="small" variant="outlined" />}
								{doc.juzgado != null && (
									<Chip label={`Juzg ${doc.juzgado}/Sec ${doc.secretaria ?? "-"}`} size="small" variant="outlined" />
								)}
								{doc.sectionMix && (
									<Chip
										label={doc.sectionMix}
										size="small"
										color="primary"
										sx={{ fontFamily: "monospace", fontWeight: 600 }}
									/>
								)}
								{doc.category && (
									<Chip
										label={doc.category}
										size="small"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
									/>
								)}
								{doc.pdfStatus && (
									<Chip
										label={`pdf: ${doc.pdfStatus}`}
										size="small"
										sx={{
											bgcolor:
												doc.pdfStatus === "extracted"
													? alpha(theme.palette.success.main, 0.15)
													: alpha(theme.palette.grey[500], 0.15),
										}}
									/>
								)}
							</Stack>
						</Box>

						<Stack direction="row" spacing={1}>
							<Button
								variant="contained"
								size="small"
								startIcon={<ExportSquare size={14} />}
								onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
							>
								Abrir PDF en PJN
							</Button>
							<Button variant="outlined" size="small" startIcon={<Folder2 size={14} />} onClick={loadCausa} disabled={loadingCausa}>
								{loadingCausa ? "Cargando…" : "Ver causa origen"}
							</Button>
						</Stack>

						{/* Movimiento */}
						<Section title="Movimiento PJN">
							<Stack spacing={0.5}>
								<FieldRow label="fecha" value={fmtDate(doc.movFecha)} />
								<FieldRow label="tipo" value={doc.tipo} />
								<FieldRow label="detalle" value={doc.detalle || doc.detalleNorm} />
								<FieldRow label="tipoDoc" value={doc.tipoDoc} />
								<FieldRow
									label="url"
									value={
										<Typography
											variant="caption"
											sx={{ fontFamily: "monospace", wordBreak: "break-all", color: theme.palette.info.main }}
										>
											{doc.url}
										</Typography>
									}
								/>
							</Stack>
						</Section>

						{/* PDF metadata */}
						<Section title="PDF metadata">
							<Stack spacing={0.5}>
								<FieldRow label="pdfStatus" value={doc.pdfStatus} />
								<FieldRow label="pdfPages" value={doc.pdfPages} />
								<FieldRow label="pdfCharsPerPage" value={doc.pdfCharsPerPage} />
								<FieldRow label="pdfProducer" value={doc.pdfProducer} />
								<FieldRow label="pdfTitle" value={doc.pdfTitle} />
								<FieldRow label="pdfNeedsOcr" value={doc.pdfNeedsOcr ? "sí" : "no"} />
								{doc.pdfFailureReason && (
									<FieldRow
										label="failure"
										value={
											<Typography variant="caption" color="error" sx={{ fontFamily: "monospace" }}>
												{doc.pdfFailureReason} (count: {doc.pdfFailureCount || 0})
											</Typography>
										}
									/>
								)}
								<FieldRow label="processedAt" value={fmtDate(doc.processedAt)} />
								<FieldRow label="processorVersion" value={doc.processorVersion} />
							</Stack>
						</Section>

						{/* Sections classifier */}
						{doc.sections && doc.sections.length > 0 && (
							<Section title="Secciones detectadas">
								<Stack spacing={1}>
									{doc.sections.map((s, i) => (
										<Box key={i}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Chip
													label={s.type}
													size="small"
													color={s.type === "ESCRITO_COVER" || s.type === "OTRO" ? "default" : "success"}
													sx={{ fontFamily: "monospace" }}
												/>
												<Typography variant="caption" color="text.secondary">
													conf: {s.confidence?.toFixed(2)}
												</Typography>
											</Stack>
											{s.markers && s.markers.length > 0 && (
												<Box sx={{ mt: 0.5, pl: 1 }}>
													{s.markers.slice(0, 6).map((m, j) => (
														<Typography
															key={j}
															variant="caption"
															sx={{
																fontFamily: "monospace",
																fontSize: "0.65rem",
																display: "block",
																color: "text.secondary",
															}}
														>
															• {m}
														</Typography>
													))}
												</Box>
											)}
										</Box>
									))}
								</Stack>
							</Section>
						)}

						{/* Datos comunes extraídos */}
						{e && (e.persona || e.beneficio || e.expediente) && (
							<Section title="Datos extraídos · comunes">
								<Stack spacing={0.5}>
									<FieldRow label="persona" value={e.persona} />
									<FieldRow label="beneficio" value={e.beneficio} />
									<FieldRow label="expediente" value={e.expediente} />
									<FieldRow label="prestación" value={e.prestacion} />
									<FieldRow label="fecha cese" value={fmtDate(e.fechaCese)} />
									<FieldRow label="fecha adquisición" value={fmtDate(e.fechaAdquisicion)} />
									<FieldRow label="fecha inicial pago" value={fmtDate(e.fechaInicialPago)} />
								</Stack>
							</Section>
						)}

						{/* Haber Caja */}
						{e?.haberCaja && Object.keys(e.haberCaja).length > 0 && (
							<Section title="Haber Caja">
								<Stack spacing={0.5}>
									<FieldRow label="haber inicial percibido" value={fmtNumber(e.haberCaja.haberInicialPercibido)} />
									<FieldRow label="haber inicial al alta" value={fmtNumber(e.haberCaja.haberInicialAlAlta)} />
									<FieldRow label="haber actual" value={fmtNumber(e.haberCaja.haberActual)} />
									<FieldRow label="PBU al alta" value={fmtNumber(e.haberCaja.pbuAlAlta)} />
									<FieldRow label="PC al alta" value={fmtNumber(e.haberCaja.pcAlAlta)} />
									<FieldRow label="PAP al alta" value={fmtNumber(e.haberCaja.papAlAlta)} />
									<FieldRow label="TOTAL al alta" value={fmtNumber(e.haberCaja.totalAlAlta)} />
									<Divider sx={{ my: 0.5 }} />
									<FieldRow label="PBU (coef)" value={fmtNumber(e.haberCaja.pbu)} />
									<FieldRow label="PC (coef)" value={fmtNumber(e.haberCaja.pc)} />
									<FieldRow label="PAP (coef)" value={fmtNumber(e.haberCaja.pap)} />
									<FieldRow label="fecha cálculo" value={fmtDate(e.haberCaja.fechaCalculo)} />
								</Stack>
							</Section>
						)}

						{/* Haber Reajustado */}
						{e?.haberReajustado && Object.keys(e.haberReajustado).length > 0 && (
							<Section title="Haber Reajustado">
								<Stack spacing={0.5}>
									<FieldRow label="haber inicial reajustado" value={fmtNumber(e.haberReajustado.haberInicialReajustado)} />
									<FieldRow label="haber actual reajustado" value={fmtNumber(e.haberReajustado.haberActualReajustado)} />
									<FieldRow label="PBU reajustada" value={fmtNumber(e.haberReajustado.pbuReajustada)} />
									<FieldRow label="PC reajustada" value={fmtNumber(e.haberReajustado.pcReajustada)} />
									<FieldRow label="PAP reajustada" value={fmtNumber(e.haberReajustado.papReajustada)} />
									<FieldRow
										label="dif. PBU %"
										value={e.haberReajustado.diferenciaPbuPct != null ? `${e.haberReajustado.diferenciaPbuPct}%` : undefined}
									/>
									<FieldRow label="índice usado" value={e.haberReajustado.indiceUsado} />
								</Stack>
							</Section>
						)}

						{/* Retroactivo */}
						{e?.retroactivo && Object.keys(e.retroactivo).length > 0 && (
							<Section title="Retroactivo · diferencias + intereses">
								<Stack spacing={0.5}>
									<FieldRow
										label="capital"
										value={<strong style={{ color: theme.palette.success.main }}>{fmtNumber(e.retroactivo.capital)}</strong>}
									/>
									<FieldRow label="intereses" value={fmtNumber(e.retroactivo.intereses)} />
									<FieldRow
										label="total"
										value={<strong>{fmtNumber(e.retroactivo.total)}</strong>}
									/>
									<FieldRow label="pagado en período" value={fmtNumber(e.retroactivo.pagado)} />
									<FieldRow label="saldo" value={fmtNumber(e.retroactivo.saldo)} />
									<Divider sx={{ my: 0.5 }} />
									<FieldRow label="haber percibido base" value={fmtNumber(e.retroactivo.haberPercibidoBase)} />
									<FieldRow label="primer haber reclamado" value={fmtNumber(e.retroactivo.primerHaberReclamado)} />
									<FieldRow label="fecha consolidación" value={fmtDate(e.retroactivo.fechaConsolidacion)} />
									<FieldRow label="tasa interés" value={e.retroactivo.tasaInteres} />
								</Stack>
							</Section>
						)}

						{/* Causa origen (lazy load) */}
						{showCausa && (
							<Section title="Causa origen (causas-segsocial)">
								{loadingCausa ? (
									<Stack spacing={1}>
										<Skeleton variant="text" />
										<Skeleton variant="text" />
										<Skeleton variant="text" />
									</Stack>
								) : causa ? (
									<Stack spacing={0.5}>
										<FieldRow label="caratula" value={causa.caratula} />
										<FieldRow label="objeto" value={causa.objeto} />
										<FieldRow label="situación" value={causa.situacion} />
										<FieldRow label="actor" value={causa.partes?.actor} />
										<FieldRow label="demandado" value={causa.partes?.demandado} />
										<FieldRow label="movimientos" value={causa.movimientosCount} />
										<FieldRow label="último movimiento" value={fmtDate(causa.fechaUltimoMovimiento)} />
										<FieldRow label="last update" value={fmtDate(causa.lastUpdate)} />
										<FieldRow
											label="flags"
											value={
												<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
													{causa.verified && <Chip label="verified" size="small" color="success" />}
													{causa.isPrivate && <Chip label="private" size="small" color="warning" />}
													{causa.isArchived && <Chip label="archived" size="small" color="info" />}
													{causa.isValid === false && <Chip label="invalid" size="small" color="error" />}
												</Stack>
											}
										/>
										{causa.intervinientes && causa.intervinientes.length > 0 && (
											<>
												<Divider sx={{ my: 0.5 }} />
												<Typography variant="caption" color="text.secondary">
													Intervinientes
												</Typography>
												{causa.intervinientes.slice(0, 6).map((it, i) => (
													<Stack key={i} direction="row" spacing={1}>
														<ArrowRight2 size={12} />
														<Typography variant="caption">
															<strong>{it.tipo}</strong>: {it.nombre}
														</Typography>
													</Stack>
												))}
											</>
										)}
									</Stack>
								) : null}
							</Section>
						)}
					</Stack>
				)}
			</Box>
		</Drawer>
	);
}
