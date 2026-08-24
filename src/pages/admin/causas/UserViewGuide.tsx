import { Fragment, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	Collapse,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { ArrowDown2, ArrowUp2, Refresh, UserSquare, Warning2 } from "iconsax-react";
import MainCard from "components/MainCard";
import { BRAND_BLUE, STALE_AMBER } from "themes/dashboardTokens";
import pjnCredentialsService, { CausaUserViewEntry, UserViewStatsCombo, UserViewStatsData } from "api/pjnCredentials";
import CausaUserViewDialog, { ListRowReplica, GATE_META, baseFolder } from "./CausaUserViewDialog";
import { GUIDE_GROUPS, GUIDE_FINDINGS } from "./userViewGuideData";

/**
 * Guía visual de la lista de carpetas del usuario: (1) todas las filas
 * posibles con la condición y el productor; (2) distribución real sobre los
 * folders PJN de la base, por tipo de fila y por combinación de campos, con
 * banderas de anomalía cuando el listado no representa el estado real.
 */

const ROW_LABEL: Record<string, string> = {
	ok: "OK — carátula + tilde azul",
	ok_cred_error: "OK con credencial rechazada — warning ámbar",
	pending: "Pendiente de verificación (chip ámbar)",
	pending_selection: "Seleccionar expediente (chip ámbar)",
	failed: "Asociación fallida (chip rojo)",
	invalid: "Causa inválida (chip rojo)",
	reserved: "Causa reservada (warning rojo)",
	list_removed: "Ya no en la lista (warning ámbar)",
	plain: "Sin indicador (no PJN)",
	hidden_archived: "No aparece — archivada",
};

const GATE_LABEL: Record<string, string> = {
	none: "Detalle completo",
	archived: "Gate: archivada",
	pending: "Gate: pendiente",
	pending_selection: "Gate: varias coincidencias",
	failed: "Gate: asociación fallida",
	invalid: "Gate: inválida",
	reserved: "Gate: reservada (sin credencial)",
	reserved_revoked: "Gate: acceso restringido",
};

const fmtField = (v: unknown) => (v === null || v === undefined ? "—" : String(v));

function ComboTuple({ k }: { k: UserViewStatsCombo["key"] }) {
	const items: Array<[string, unknown]> = [
		["source", k.source],
		["archived", k.archived],
		["causaVerified", k.causaVerified],
		["causaIsValid", k.causaIsValid],
		["assocStatus", k.causaAssociationStatus],
		["causaIsPrivate", k.causaIsPrivate],
		["credCovered", k.causaCredentialCovered],
		["listRemoved", k.listRemoved || k.pjnNotFound],
		["causaId", k.hasCausa],
		["credError", k.credError],
	];
	return (
		<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
			{items.map(([name, v]) => (
				<Chip
					key={name}
					size="small"
					variant="outlined"
					label={`${name}=${fmtField(v)}`}
					sx={{
						fontFamily: "monospace",
						fontSize: "0.66rem",
						height: 20,
						opacity: v === null || v === undefined || v === false ? 0.55 : 1,
					}}
				/>
			))}
		</Stack>
	);
}

function comboToEntry(c: UserViewStatsCombo): CausaUserViewEntry {
	return {
		user: { id: null, email: null, name: null },
		folder: baseFolder({
			source: c.key.source || undefined,
			archived: c.key.archived,
			causaVerified: c.key.causaVerified ?? undefined,
			causaIsValid: c.key.causaIsValid ?? undefined,
			causaAssociationStatus: c.key.causaAssociationStatus ?? undefined,
			causaIsPrivate: c.key.causaIsPrivate ?? undefined,
			causaCredentialCovered: c.key.causaCredentialCovered ?? undefined,
			listRemoved: c.key.listRemoved,
			pjnNotFound: c.key.pjnNotFound,
		}),
		links: [],
		view: c.view,
	};
}

function DistributionBars({ rows, total }: { rows: UserViewStatsData["byRow"]; total: number }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const max = Math.max(...rows.map((r) => r.n), 1);
	return (
		<Stack spacing={1}>
			{rows.map((r) => (
				<Tooltip
					key={r.row}
					title={`${r.n} de ${total} carpetas · ${r.combos} combinación(es) de campos · ${r.flagged} con anomalía de visualización`}
					placement="top-start"
				>
					<Box sx={{ display: "grid", gridTemplateColumns: "260px 1fr 110px", alignItems: "center", gap: 1.5 }}>
						<Typography variant="body2" sx={{ fontSize: "0.8rem" }} noWrap>
							{ROW_LABEL[r.row] || r.row}
						</Typography>
						<Box
							sx={{
								position: "relative",
								height: 14,
								bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.05),
								borderRadius: 0.5,
								overflow: "hidden",
							}}
						>
							<Box
								sx={{
									position: "absolute",
									left: 0,
									top: 0,
									bottom: 0,
									width: `${(r.n / max) * 100}%`,
									bgcolor: r.row === "hidden_archived" ? alpha(theme.palette.text.secondary, 0.5) : BRAND_BLUE,
									borderRadius: "0 4px 4px 0",
								}}
							/>
							{r.flagged > 0 && (
								<Box
									sx={{
										position: "absolute",
										left: 0,
										top: 0,
										bottom: 0,
										width: `${(r.flagged / max) * 100}%`,
										backgroundImage: `repeating-linear-gradient(135deg, ${alpha(STALE_AMBER, 0.9)} 0 3px, transparent 3px 6px)`,
									}}
								/>
							)}
						</Box>
						<Typography variant="body2" sx={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
							<b>{r.pct}%</b> <span style={{ color: theme.palette.text.secondary }}>({r.n})</span>
						</Typography>
					</Box>
				</Tooltip>
			))}
			<Typography variant="caption" color="text.secondary">
				Barra sólida = carpetas de ese tipo de fila · tramado ámbar = parte de esas carpetas cuya visualización no coincide con su estado
				real (ver anomalías abajo).
			</Typography>
		</Stack>
	);
}

export default function UserViewGuide() {
	const theme = useTheme();
	const [archived, setArchived] = useState<"all" | "true" | "false">("false");
	const [userId, setUserId] = useState<string>("");
	const [data, setData] = useState<UserViewStatsData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expanded, setExpanded] = useState<Record<number, boolean>>({});
	const [onlyFlagged, setOnlyFlagged] = useState(false);
	const [viewFolderId, setViewFolderId] = useState<string | null>(null);

	const load = () => {
		setLoading(true);
		setError(null);
		pjnCredentialsService
			.getUserViewStats({ archived, userId: userId || undefined })
			.then((r: { data: UserViewStatsData }) => setData(r.data))
			.catch((e: { response?: { data?: { message?: string } }; message?: string }) =>
				setError(e?.response?.data?.message || e?.message || "Error"),
			)
			.finally(() => setLoading(false));
	};
	useEffect(load, [archived, userId]); // eslint-disable-line react-hooks/exhaustive-deps

	const combos = useMemo(() => (data ? data.combos.filter((c) => !onlyFlagged || c.flags.length > 0) : []), [data, onlyFlagged]);
	const flaggedTotal = useMemo(() => (data ? data.combos.filter((c) => c.flags.length).reduce((a, c) => a + c.n, 0) : 0), [data]);

	return (
		<Stack spacing={3}>
			<MainCard
				title={
					<Stack spacing={0.25}>
						<Typography variant="h5">Guía: la lista de carpetas del usuario</Typography>
						<Typography variant="caption" color="text.secondary">
							Todas las filas posibles del listado PJN (según los estados que escriben pjn-workers, el hub y pjn-mis-causas) y cómo se
							distribuyen hoy en la base.
						</Typography>
					</Stack>
				}
			>
				<Stack spacing={3.5}>
					{GUIDE_GROUPS.map((g) => (
						<Box key={g.row}>
							<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
								<Chip size="small" label={g.row} sx={{ fontFamily: "monospace" }} />
								<Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{g.title}</Typography>
								<Typography variant="caption" color="text.secondary">
									{g.cases.length} forma{g.cases.length > 1 ? "s" : ""} de llegar
								</Typography>
							</Stack>
							<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", mb: 1.25 }}>
								{g.whatUserSees}
							</Typography>
							<Stack spacing={1.5} sx={{ pl: { md: 2 }, borderLeft: `2px solid ${alpha(theme.palette.text.primary, 0.08)}` }}>
								{g.cases.map((c) => {
									const gate = c.entry.view.detail.gate;
									return (
										<Box key={c.key}>
											<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }} flexWrap="wrap" useFlexGap>
												<Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.title}</Typography>
												<Chip
													size="small"
													variant="outlined"
													label={
														c.entry.view.hiddenFromList
															? "no aparece en la lista"
															: c.entry.view.inAttentionTable
															? "tabla “requieren tu atención”"
															: "tabla principal"
													}
													sx={{ height: 20, fontSize: "0.66rem" }}
												/>
												<Chip
													size="small"
													variant="outlined"
													color={gate ? "warning" : "default"}
													label={gate ? GATE_LABEL[gate] : "Detalle completo"}
													sx={{ height: 20, fontSize: "0.66rem" }}
												/>
												{c.entry.view.contentBlocked && (
													<Chip size="small" color="error" label="403 en movimientos/PDFs" sx={{ height: 20, fontSize: "0.66rem" }} />
												)}
											</Stack>
											<Box sx={{ opacity: c.entry.view.hiddenFromList ? 0.45 : 1 }}>
												<ListRowReplica entry={c.entry} />
											</Box>
											<Typography variant="caption" sx={{ display: "block", mt: 0.5, fontFamily: "monospace", color: "text.secondary" }}>
												{c.fields}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
												<b>Lo produce:</b> {c.producer}
												{gate && GATE_META[gate] ? ` · En el detalle: “${GATE_META[gate].title}”` : ""}
											</Typography>
											{c.warn && (
												<Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 0.5 }}>
													<Warning2 size={13} variant="Bold" color={STALE_AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
													<Typography variant="caption" sx={{ lineHeight: 1.35 }}>
														{c.warn}
													</Typography>
												</Stack>
											)}
										</Box>
									);
								})}
							</Stack>
						</Box>
					))}
				</Stack>
			</MainCard>

			<MainCard
				title={
					<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1}>
						<Stack spacing={0.25}>
							<Typography variant="h5">Distribución real</Typography>
							<Typography variant="caption" color="text.secondary">
								{data
									? `${data.total} carpetas PJN · ${data.combos.length} combinaciones de campos · ${flaggedTotal} con anomalía de visualización`
									: "—"}
							</Typography>
						</Stack>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
							<ToggleButtonGroup size="small" exclusive value={archived} onChange={(_, v) => v && setArchived(v)}>
								<ToggleButton value="false">No archivadas</ToggleButton>
								<ToggleButton value="true">Archivadas</ToggleButton>
								<ToggleButton value="all">Todas</ToggleButton>
							</ToggleButtonGroup>
							<FormControl size="small" sx={{ minWidth: 260 }}>
								<InputLabel>Usuario</InputLabel>
								<Select label="Usuario" value={userId} onChange={(e) => setUserId(e.target.value)}>
									<MenuItem value="">Todos los usuarios</MenuItem>
									{(data?.users || []).map((u) => (
										<MenuItem key={u.id} value={u.id}>
											{u.email || u.id} · {u.n} ({u.archived} arch.){u.credError ? " · cred. rechazada" : ""}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<ToggleButton size="small" value="flagged" selected={onlyFlagged} onChange={() => setOnlyFlagged((v) => !v)}>
								<Warning2 size={14} style={{ marginRight: 6 }} /> Solo anomalías
							</ToggleButton>
							<Tooltip title="Actualizar">
								<IconButton size="small" onClick={load} disabled={loading}>
									<Refresh size={18} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Stack>
				}
			>
				{error && <Alert severity="error">{error}</Alert>}
				{loading && !data ? (
					<Stack alignItems="center" sx={{ py: 4 }}>
						<CircularProgress size={28} />
					</Stack>
				) : data ? (
					<Stack spacing={3}>
						<Grid container spacing={3}>
							<Grid item xs={12} md={8}>
								<Typography
									sx={{
										fontSize: "0.72rem",
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.06em",
										color: "text.secondary",
										mb: 1,
									}}
								>
									Por tipo de fila que ve el usuario
								</Typography>
								<DistributionBars rows={data.byRow} total={data.total} />
							</Grid>
							<Grid item xs={12} md={4}>
								<Typography
									sx={{
										fontSize: "0.72rem",
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.06em",
										color: "text.secondary",
										mb: 1,
									}}
								>
									Por gate del detalle
								</Typography>
								<Stack spacing={0.5}>
									{Object.entries(data.byGate)
										.sort((a, b) => b[1] - a[1])
										.map(([g, n]) => (
											<Stack key={g} direction="row" justifyContent="space-between">
												<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
													{GATE_LABEL[g] || g}
												</Typography>
												<Typography variant="body2" sx={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" }}>
													<b>{data.total ? Math.round((n / data.total) * 1000) / 10 : 0}%</b>{" "}
													<span style={{ color: theme.palette.text.secondary }}>({n})</span>
												</Typography>
											</Stack>
										))}
								</Stack>
							</Grid>
						</Grid>

						<Box>
							<Typography
								sx={{
									fontSize: "0.72rem",
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									color: "text.secondary",
									mb: 1,
								}}
							>
								Combinaciones reales de campos → fila que ve el usuario
							</Typography>
							<Box sx={{ overflowX: "auto" }}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell sx={{ width: 36 }} />
											<TableCell>Fila que ve el usuario</TableCell>
											<TableCell>Detalle</TableCell>
											<TableCell align="right">Carpetas</TableCell>
											<TableCell align="right">%</TableCell>
											<TableCell align="right">Usuarios</TableCell>
											<TableCell>Anomalías</TableCell>
											<TableCell align="center">Ver</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{combos.map((c, i) => {
											const rowKey = c.view.hiddenFromList ? "hidden_archived" : c.view.list;
											const gate = c.view.detail.gate || "none";
											const open = !!expanded[i];
											return (
												<Fragment key={i}>
													<TableRow hover sx={{ "& td": { borderBottom: open ? "none" : undefined } }}>
														<TableCell>
															<IconButton size="small" onClick={() => setExpanded((p) => ({ ...p, [i]: !open }))}>
																{open ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
															</IconButton>
														</TableCell>
														<TableCell sx={{ minWidth: 340 }}>
															<Box sx={{ opacity: c.view.hiddenFromList ? 0.45 : 1 }}>
																<ListRowReplica entry={comboToEntry(c)} />
															</Box>
															<Typography variant="caption" color="text.secondary">
																{ROW_LABEL[rowKey] || rowKey}
															</Typography>
														</TableCell>
														<TableCell>
															<Chip
																size="small"
																variant="outlined"
																color={gate === "none" ? "default" : "warning"}
																label={GATE_LABEL[gate] || gate}
															/>
														</TableCell>
														<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
															{c.n}
														</TableCell>
														<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
															{c.pct}%
														</TableCell>
														<TableCell align="right">{c.users}</TableCell>
														<TableCell sx={{ maxWidth: 360 }}>
															{c.flags.length === 0 ? (
																<Typography variant="caption" color="text.disabled">
																	—
																</Typography>
															) : (
																<Stack spacing={0.25}>
																	{c.flags.map((f) => (
																		<Stack key={f} direction="row" spacing={0.5} alignItems="flex-start">
																			<Warning2 size={12} variant="Bold" color={STALE_AMBER} style={{ flexShrink: 0, marginTop: 2 }} />
																			<Typography variant="caption" sx={{ lineHeight: 1.3 }}>
																				{f}
																			</Typography>
																		</Stack>
																	))}
																</Stack>
															)}
														</TableCell>
														<TableCell align="center">
															{c.sampleFolderId && (
																<Tooltip title="Abrir vista del usuario de una carpeta de ejemplo con esta combinación">
																	<IconButton size="small" onClick={() => setViewFolderId(c.sampleFolderId)}>
																		<UserSquare size={16} />
																	</IconButton>
																</Tooltip>
															)}
														</TableCell>
													</TableRow>
													<TableRow>
														<TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
															<Collapse in={open} unmountOnExit>
																<Box sx={{ py: 1 }}>
																	<ComboTuple k={c.key} />
																</Box>
															</Collapse>
														</TableCell>
													</TableRow>
												</Fragment>
											);
										})}
									</TableBody>
								</Table>
							</Box>
						</Box>
					</Stack>
				) : null}
			</MainCard>

			<MainCard
				title={
					<Stack spacing={0.25}>
						<Typography variant="h5">Hallazgos de código</Typography>
						<Typography variant="caption" color="text.secondary">
							Lo que está mal o incompleto entre lo que escriben los workers y lo que dibuja el front — con la referencia para corregirlo.
						</Typography>
					</Stack>
				}
			>
				<Stack spacing={1.5}>
					{GUIDE_FINDINGS.map((f) => (
						<Stack key={f.id} direction="row" spacing={1.5} alignItems="flex-start">
							<Chip
								size="small"
								label={f.id}
								color={f.severity === "alta" ? "error" : f.severity === "media" ? "warning" : "default"}
								sx={{ fontFamily: "monospace", minWidth: 44 }}
							/>
							<Stack spacing={0.25} sx={{ minWidth: 0 }}>
								<Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{f.title}</Typography>
								<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
									{f.detail}
								</Typography>
								<Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
									{f.where}
								</Typography>
							</Stack>
						</Stack>
					))}
				</Stack>
			</MainCard>

			<CausaUserViewDialog open={!!viewFolderId} onClose={() => setViewFolderId(null)} folderId={viewFolderId} />
		</Stack>
	);
}
