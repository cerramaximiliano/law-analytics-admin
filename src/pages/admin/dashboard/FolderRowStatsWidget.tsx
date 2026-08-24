import { useEffect, useState } from "react";
import {
	Box,
	Chip,
	IconButton,
	Paper,
	Skeleton,
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
import { Link as RouterLink } from "react-router-dom";
import { Refresh, Book1 } from "iconsax-react";
import pjnCredentialsService, { FolderRowStatsData } from "api/pjnCredentials";
import { LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";

/**
 * Estado de las carpetas vinculadas a un poder judicial, por jurisdicción,
 * medido con la misma lógica que dibuja la lista del usuario (tipo de fila).
 * Barra apilada por tono (OK / Atención / Problema / Archivada) + tabla con
 * el desglose completo por tipo de fila.
 */

const JUR_LABEL: Record<string, string> = {
	pjn: "PJN",
	mev: "MEV",
	eje: "EJE (CABA)",
	scba: "SCBA",
	pjsalta: "PJ Salta",
	pjcatamarca: "PJ Catamarca",
	pjmendoza: "PJ Mendoza",
	none: "Sin jurisdicción",
};

const ROW_LABEL: Record<string, string> = {
	ok: "OK",
	ok_cred_error: "OK · credencial rechazada",
	pending: "Pendiente de verificación",
	pending_selection: "Seleccionar expediente",
	failed: "Asociación fallida",
	invalid: "Causa inválida",
	reserved: "Causa reservada",
	list_removed: "Ya no en la lista",
	cred_status: "Credencial MEV requerida/inválida",
	plain: "Sin indicador",
	hidden_archived: "Archivada (no aparece)",
};

const ROW_ORDER = [
	"ok",
	"ok_cred_error",
	"pending",
	"pending_selection",
	"cred_status",
	"list_removed",
	"failed",
	"invalid",
	"reserved",
	"plain",
	"hidden_archived",
];

type Tone = "ok" | "warn" | "bad" | "neutral";
const ROW_TONE: Record<string, Tone> = {
	ok: "ok",
	ok_cred_error: "warn",
	pending: "warn",
	pending_selection: "warn",
	cred_status: "warn",
	list_removed: "warn",
	failed: "bad",
	invalid: "bad",
	reserved: "bad",
	plain: "neutral",
	hidden_archived: "neutral",
};
const TONE_LABEL: Record<Tone, string> = { ok: "OK", warn: "Requiere atención", bad: "Problema", neutral: "Archivada / sin indicador" };

export default function FolderRowStatsWidget() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const RED = theme.palette.error.main;
	const toneColor = (t: Tone) =>
		t === "ok" ? LIVE_GREEN : t === "warn" ? STALE_AMBER : t === "bad" ? RED : alpha(theme.palette.text.secondary, 0.45);

	const [archived, setArchived] = useState<"all" | "true" | "false">("false");
	const [data, setData] = useState<FolderRowStatsData | null>(null);
	const [loading, setLoading] = useState(false);

	const load = () => {
		setLoading(true);
		pjnCredentialsService
			.getFolderRowStats({ archived })
			.then((r: { data: FolderRowStatsData }) => setData(r.data))
			.catch(() => setData(null))
			.finally(() => setLoading(false));
	};
	useEffect(load, [archived]); // eslint-disable-line react-hooks/exhaustive-deps

	const rowsPresent = data ? ROW_ORDER.filter((r) => data.byRow.some((x) => x.row === r)) : [];

	return (
		<Paper variant="outlined" sx={{ p: 2, borderColor: headerBorder(isDark), borderRadius: 2 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
				<Stack spacing={0.25}>
					<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
						Carpetas por jurisdicción — cómo las ve el usuario
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{data ? `${data.total} carpetas vinculadas · tipo de fila calculado con la lógica de la lista del usuario` : "—"}
					</Typography>
				</Stack>
				<Stack direction="row" spacing={1} alignItems="center">
					<ToggleButtonGroup size="small" exclusive value={archived} onChange={(_, v) => v && setArchived(v)}>
						<ToggleButton value="false">No archivadas</ToggleButton>
						<ToggleButton value="all">Todas</ToggleButton>
					</ToggleButtonGroup>
					<Tooltip title="Guía: todas las filas posibles y por qué">
						<IconButton size="small" component={RouterLink} to="/admin/causas/user-view-guide">
							<Book1 size={18} />
						</IconButton>
					</Tooltip>
					<Tooltip title="Actualizar">
						<IconButton size="small" onClick={load} disabled={loading}>
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			{loading && !data ? (
				<Skeleton variant="rounded" height={160} />
			) : !data ? (
				<Typography variant="body2" color="text.secondary">
					No se pudo cargar.
				</Typography>
			) : (
				<Stack spacing={2}>
					<Stack spacing={0.75}>
						{data.jurisdictions.map((j) => {
							const byTone: Record<Tone, number> = { ok: 0, warn: 0, bad: 0, neutral: 0 };
							for (const r of j.rows) byTone[ROW_TONE[r.row] || "neutral"] += r.n;
							const tones: Tone[] = ["ok", "warn", "bad", "neutral"];
							return (
								<Box key={j.jurisdiction} sx={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", alignItems: "center", gap: 1.5 }}>
									<Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 600 }} noWrap>
										{JUR_LABEL[j.jurisdiction] || j.jurisdiction}
									</Typography>
									<Tooltip
										placement="top-start"
										title={
											<Box sx={{ fontSize: "0.72rem" }}>
												{j.rows.map((r) => (
													<div key={r.row}>
														{ROW_LABEL[r.row] || r.row}: <b>{r.n}</b> ({r.pct}%)
													</div>
												))}
											</Box>
										}
									>
										<Box
											sx={{
												display: "flex",
												height: 14,
												borderRadius: 0.5,
												overflow: "hidden",
												gap: "2px",
												bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.05),
											}}
										>
											{tones.map((t) =>
												byTone[t] > 0 ? (
													<Box key={t} sx={{ width: `${(byTone[t] / j.total) * 100}%`, bgcolor: toneColor(t), minWidth: 2 }} />
												) : null,
											)}
										</Box>
									</Tooltip>
									<Typography variant="body2" sx={{ fontSize: "0.78rem", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
										<b>{j.total}</b> <span style={{ color: theme.palette.text.secondary }}>· {j.pct}%</span>
									</Typography>
								</Box>
							);
						})}
						<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
							{(["ok", "warn", "bad", "neutral"] as Tone[]).map((t) => (
								<Stack key={t} direction="row" spacing={0.5} alignItems="center">
									<Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: toneColor(t) }} />
									<Typography variant="caption" color="text.secondary">
										{TONE_LABEL[t]}
									</Typography>
								</Stack>
							))}
						</Stack>
					</Stack>

					<Box sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ "& td, & th": { fontSize: "0.72rem", py: 0.5, whiteSpace: "nowrap" } }}>
							<TableHead>
								<TableRow>
									<TableCell>Jurisdicción</TableCell>
									<TableCell align="right">Total</TableCell>
									{rowsPresent.map((r) => (
										<TableCell key={r} align="right">
											<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
												<Box
													sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: toneColor(ROW_TONE[r] || "neutral"), flexShrink: 0 }}
												/>
												<span>{ROW_LABEL[r] || r}</span>
											</Stack>
										</TableCell>
									))}
								</TableRow>
							</TableHead>
							<TableBody>
								{data.jurisdictions.map((j) => (
									<TableRow key={j.jurisdiction} hover>
										<TableCell sx={{ fontWeight: 600 }}>{JUR_LABEL[j.jurisdiction] || j.jurisdiction}</TableCell>
										<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{j.total}
										</TableCell>
										{rowsPresent.map((r) => {
											const x = j.rows.find((y) => y.row === r);
											return (
												<TableCell
													key={r}
													align="right"
													sx={{ fontVariantNumeric: "tabular-nums", color: x ? "inherit" : "text.disabled" }}
												>
													{x ? (
														<>
															<b>{x.pct}%</b> <span style={{ color: theme.palette.text.secondary }}>({x.n})</span>
														</>
													) : (
														"—"
													)}
												</TableCell>
											);
										})}
									</TableRow>
								))}
								<TableRow>
									<TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
									<TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
										{data.total}
									</TableCell>
									{rowsPresent.map((r) => {
										const x = data.byRow.find((y) => y.row === r);
										return (
											<TableCell key={r} align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												{x ? (
													<>
														<b>{x.pct}%</b> <span style={{ color: theme.palette.text.secondary }}>({x.n})</span>
													</>
												) : (
													"—"
												)}
											</TableCell>
										);
									})}
								</TableRow>
							</TableBody>
						</Table>
					</Box>
					<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
						<Chip
							size="small"
							variant="outlined"
							label="Los % de cada fila son sobre el total de esa jurisdicción"
							sx={{ height: 20, fontSize: "0.66rem" }}
						/>
						<Chip
							size="small"
							variant="outlined"
							label="“Requiere atención” = pendiente, selección, credencial, ya-no-en-lista"
							sx={{ height: 20, fontSize: "0.66rem" }}
						/>
						<Chip
							size="small"
							variant="outlined"
							label="“Problema” = fallida, inválida, reservada"
							sx={{ height: 20, fontSize: "0.66rem" }}
						/>
					</Stack>
				</Stack>
			)}
		</Paper>
	);
}
