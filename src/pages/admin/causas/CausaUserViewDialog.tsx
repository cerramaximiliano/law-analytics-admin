import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Stack,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Archive, Clock, CloseCircle, ExportSquare, InfoCircle, Lock1, Refresh, SearchNormal1, TickCircle, Warning2 } from "iconsax-react";
import dayjs from "dayjs";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";
import pjnCredentialsService, { CausaUserViewData, CausaUserViewEntry, UserViewGate } from "api/pjnCredentials";

/**
 * Réplica visual de lo que el USUARIO ve para una causa PJN en su app:
 * (1) la fila de la lista de carpetas (columna Carátula), (2) la fila
 * expandida y (3) el detalle (chip + gate). Los textos, colores e íconos
 * están copiados del front (folders.tsx / FolderView.tsx / details.tsx /
 * PendingVerificationView.tsx / ArchivedFolderView.tsx); el estado lo
 * computa admin-api con la misma lógica (`computeUserView`).
 */

interface Props {
	open: boolean;
	onClose: () => void;
	/** Modo causa: todos los folders de la causa */
	collection?: string | null;
	causaId?: string | null;
	/** Modo folder: un folder concreto (con o sin causa asociada) */
	folderId?: string | null;
}

const RED = "#EF4444";
const accentHex = (a: "red" | "amber" | "green" | "blue") =>
	a === "red" ? RED : a === "amber" ? STALE_AMBER : a === "blue" ? BRAND_BLUE : LIVE_GREEN;

const formatFolderName = (name: string | undefined, max: number) => {
	const n = name || "Carpeta sin nombre";
	return n.length > max ? n.slice(0, max - 1) + "…" : n;
};

// ---------- LISTA: columna Carátula (folders.tsx:2685-3167) ----------

const MiniChip = ({ color, text, dot = true }: { color: string; text: string; dot?: boolean }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Box
			sx={{
				display: "inline-flex",
				alignItems: "center",
				gap: 0.625,
				px: 0.875,
				py: 0.25,
				borderRadius: 0.75,
				bgcolor: alpha(color, isDark ? 0.16 : 0.1),
				border: `1px solid ${alpha(color, isDark ? 0.32 : 0.22)}`,
			}}
		>
			{dot ? (
				<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color }} />
			) : (
				<Warning2 size={12} variant="Bulk" color={color} />
			)}
			<Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color, letterSpacing: "0.01em", lineHeight: 1 }}>{text}</Typography>
		</Box>
	);
};

export const LIST_TOOLTIPS: Record<string, string> = {
	reserved: "Causa reservada — el tribunal restringió la consulta web pública. El sistema sigue verificando si vuelve a estar accesible.",
	list_removed:
		"Esta causa ya no aparece en tu lista de Mis Causas del portal PJN. Puede haber sido archivada o desvinculada por el tribunal.",
	pending_selection: "Se encontraron múltiples expedientes - Haz clic para seleccionar",
	failed: "No se pudo vincular la causa - Verifique los datos ingresados",
	pending: "Actualizar estado de verificación",
	invalid: "Causa inválida - No se pudo verificar en el Poder Judicial",
	ok: "Causa vinculada a PJN",
	ok_cred_error: "PJN — Sincronización pausada: tus credenciales fueron rechazadas. Actualizalas desde Perfil → Cuentas Judiciales.",
	cred_status: "Credencial MEV: cargala/actualizala en tu perfil → Integraciones → MEV.",
};

const MEV_CRED_LABEL: Record<string, string> = {
	missing: "Credencial requerida",
	invalid: "Credencial inválida",
	expired: "Contraseña expirada",
	disabled: "Credencial desactivada",
};

export function ListRowReplica({ entry }: { entry: CausaUserViewEntry }) {
	const { folder, view } = entry;
	const name = <span style={{ flex: 1 }}>{formatFolderName(folder.folderName, 50)}</span>;
	const right = (() => {
		switch (view.list) {
			case "reserved":
				return <Warning2 size={16} variant="Bold" color={RED} />;
			case "list_removed":
				return <Warning2 size={16} variant="Bold" color={STALE_AMBER} />;
			case "pending_selection":
				return <Warning2 size={16} variant="Bold" color={STALE_AMBER} />;
			case "failed":
			case "invalid":
				return <CloseCircle size={16} variant="Bold" color={RED} />;
			case "pending":
				return <Refresh size={16} />;
			case "ok":
				return <TickCircle size={16} variant="Bold" color={BRAND_BLUE} />;
			case "ok_cred_error":
				return <Warning2 size={16} variant="Bold" color={STALE_AMBER} />;
			case "cred_status":
				return <Warning2 size={16} variant="Bold" color={STALE_AMBER} />;
			default:
				return null;
		}
	})();
	const left = (() => {
		switch (view.list) {
			case "pending_selection":
				return <MiniChip color={STALE_AMBER} text="Seleccionar expediente" dot={false} />;
			case "failed":
				return <MiniChip color={RED} text="Asociación fallida" />;
			case "pending":
				return <MiniChip color={STALE_AMBER} text="Pendiente de verificación" />;
			case "invalid":
				return <MiniChip color={RED} text="Causa inválida" />;
			case "cred_status":
				return (
					<MiniChip color={STALE_AMBER} text={MEV_CRED_LABEL[folder.mevCredentialStatus || ""] || "Credencial requerida"} dot={false} />
				);
			default:
				return name;
		}
	})();
	const lastMov = folder.lastMovementDate ? dayjs(folder.lastMovementDate) : null;
	const isToday = !!lastMov && lastMov.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
	const statusDot =
		folder.status === "Nueva"
			? LIVE_GREEN
			: folder.status === "En Proceso"
			? BRAND_BLUE
			: folder.status === "Pendiente"
			? STALE_AMBER
			: undefined;
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	return (
		<Box
			sx={{
				display: "grid",
				gridTemplateColumns: "minmax(0, 3fr) 1.2fr 1fr 1fr",
				gap: 1.5,
				alignItems: "center",
				px: 1.5,
				py: 1,
				borderRadius: 1,
				border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
				bgcolor: theme.palette.background.paper,
				fontSize: "0.82rem",
			}}
		>
			<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ minWidth: 0 }}>
				<Box sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{left}</Box>
				{right && (
					<Tooltip title={LIST_TOOLTIPS[view.list] || ""}>
						<Box sx={{ display: "inline-flex", width: 18, height: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
							{right}
						</Box>
					</Tooltip>
				)}
			</Stack>
			<Typography variant="body2" sx={{ fontSize: "0.8rem" }} noWrap>
				{folder.materia || "-"}
			</Typography>
			{lastMov ? (
				<Stack direction="row" alignItems="center" spacing={0.5}>
					{isToday && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: LIVE_GREEN }} />}
					<Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: isToday ? 600 : 400, color: isToday ? LIVE_GREEN : "inherit" }}>
						{lastMov.format("DD/MM/YYYY")}
					</Typography>
				</Stack>
			) : (
				<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
					-
				</Typography>
			)}
			{statusDot ? (
				<Box
					sx={{
						display: "inline-flex",
						alignItems: "center",
						gap: 0.625,
						px: 0.875,
						py: 0.375,
						borderRadius: 0.875,
						bgcolor: alpha(statusDot, isDark ? 0.14 : 0.08),
						border: `1px solid ${alpha(statusDot, isDark ? 0.3 : 0.2)}`,
						width: "fit-content",
					}}
				>
					<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: statusDot }} />
					<Typography sx={{ fontSize: "0.7rem", fontWeight: 600 }}>{folder.status}</Typography>
				</Box>
			) : (
				<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
					{folder.status || "-"}
				</Typography>
			)}
		</Box>
	);
}

// ---------- PILL con badge (FolderView.tsx BindingPill / details.tsx renderJudicialLink) ----------

const BADGE_META: Record<string, { icon: JSX.Element; tooltip: string }> = {
	reserved: { icon: <Warning2 size={14} variant="Bold" color={RED} />, tooltip: LIST_TOOLTIPS.reserved },
	list_removed: { icon: <Warning2 size={14} variant="Bold" color={STALE_AMBER} />, tooltip: LIST_TOOLTIPS.list_removed },
	pending: { icon: <InfoCircle size={14} variant="Bold" color={STALE_AMBER} />, tooltip: "Pendiente de verificación" },
	valid: { icon: <TickCircle size={14} variant="Bold" color={LIVE_GREEN} />, tooltip: "Causa válida" },
	invalid: { icon: <CloseCircle size={14} variant="Bold" color={RED} />, tooltip: "Causa inválida" },
};

export function BindingPill({
	label,
	accent,
	badge,
	tooltip,
	warnIcon,
}: {
	label: string;
	accent: string;
	badge?: string;
	tooltip?: string;
	warnIcon?: boolean;
}) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const b = badge ? BADGE_META[badge] : null;
	return (
		<Box sx={{ position: "relative", display: "inline-flex" }}>
			<Tooltip title={tooltip || ""}>
				<Box
					sx={{
						display: "inline-flex",
						alignItems: "center",
						gap: 0.75,
						px: 1.25,
						py: 0.625,
						borderRadius: 1,
						bgcolor: alpha(accent, isDark ? 0.14 : 0.08),
						border: `1px solid ${alpha(accent, isDark ? 0.32 : 0.22)}`,
					}}
				>
					{warnIcon ? <Warning2 size={14} variant="Bulk" color={accent} /> : <ExportSquare size={14} variant="Bulk" color={accent} />}
					<Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: accent, lineHeight: 1.4 }}>{label}</Typography>
				</Box>
			</Tooltip>
			{b && (
				<Tooltip title={b.tooltip}>
					<Box
						sx={{
							position: "absolute",
							bottom: -6,
							right: -6,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: 18,
							height: 18,
							bgcolor: theme.palette.background.paper,
							borderRadius: "50%",
							border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.22 : 0.14)}`,
							boxShadow: `0 2px 4px ${alpha("#000", 0.08)}`,
						}}
					>
						{b.icon}
					</Box>
				</Tooltip>
			)}
		</Box>
	);
}

// ---------- DETALLE: gates (PendingVerificationView.tsx / ArchivedFolderView.tsx) ----------

export const GATE_META: Record<
	Exclude<UserViewGate, null>,
	{ label: string; title: string; description: string; tone: "amber" | "red" | "blue"; icon: JSX.Element; cta?: string; note?: string }
> = {
	archived: {
		label: "Carpeta archivada",
		title: "Esta carpeta está archivada",
		description:
			"El contenido de la carpeta (movimientos, tareas, notas, cálculos y documentos) se conserva pero permanece oculto mientras esté archivada, y la carpeta no aparece en tu listado de causas. Desarchivala para volver a verla y operarla.",
		tone: "amber",
		icon: <Archive size={20} variant="Bulk" />,
		cta: "Desarchivar carpeta",
	},
	pending: {
		label: "Pendiente de verificación",
		title: "Estamos buscando este expediente",
		description:
			"Un worker está consultando el portal judicial para confirmar que el expediente existe y que el sistema puede acceder a sus movimientos. Esto puede tardar unos minutos.",
		tone: "amber",
		icon: <Clock size={20} variant="Bulk" />,
		cta: "Actualizar",
	},
	pending_selection: {
		label: "Hay varias coincidencias",
		title: "Encontramos más de un expediente",
		description:
			"El número y año coinciden con varios expedientes en el portal. Necesitamos que elijas cuál es el correcto para empezar a sincronizar.",
		tone: "blue",
		icon: <SearchNormal1 size={20} variant="Bulk" />,
		cta: "Elegir expediente",
	},
	failed: {
		label: "Asociación fallida",
		title: "No pudimos encontrar este expediente",
		description:
			"La búsqueda en el portal judicial no devolvió resultados. Suele pasar cuando hay un error de tipeo en el número, la jurisdicción o el año. Revisá los datos y, si están bien, pedile a soporte que lo revise manualmente.",
		tone: "red",
		icon: <CloseCircle size={20} variant="Bulk" />,
		cta: "Verificar ahora",
	},
	invalid: {
		label: "Causa inválida",
		title: "El expediente no es accesible",
		description:
			"El portal devolvió el expediente, pero está marcado como no público o no existe en el sistema judicial. No vamos a poder sincronizar sus movimientos.",
		tone: "red",
		icon: <Warning2 size={20} variant="Bulk" />,
		cta: "Verificar ahora",
	},
	reserved: {
		label: "Causa reservada",
		title: "El tribunal reservó este expediente",
		description:
			"La consulta pública de esta causa está restringida por el tribunal. El expediente existe y sus movimientos se sincronizan, pero solo pueden verlos los usuarios que la tengan asignada en su credencial del Poder Judicial. Vinculá tu credencial PJN para acceder.",
		tone: "blue",
		icon: <Lock1 size={20} variant="Bulk" />,
		cta: "Vincular credencial",
		note: "La reserva la dispone el tribunal, no Law Analytics. Mientras esté vigente, el contenido solo es accesible mediante una credencial autorizada.",
	},
	reserved_revoked: {
		label: "Acceso restringido",
		title: "Tu credencial ya no accede a este expediente",
		description:
			"El tribunal reservó esta causa y ya no figura entre las asignadas a tu credencial del Poder Judicial. Si creés que es un error, verificá el estado de tu credencial o consultá en el tribunal; el acceso se restablece solo si la causa vuelve a aparecer en tu listado de Mis Causas.",
		tone: "amber",
		icon: <Lock1 size={20} variant="Bulk" />,
		note: "El sistema revisa a diario si la causa reaparece en el listado de tu credencial; si vuelve, el acceso se restablece automáticamente.",
	},
};

export function GateReplica({ gate, folderName }: { gate: Exclude<UserViewGate, null>; folderName?: string }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const meta = GATE_META[gate];
	const tone = accentHex(meta.tone);
	return (
		<Box sx={{ border: `1px solid ${alpha(tone, isDark ? 0.32 : 0.22)}`, borderRadius: 1.5, overflow: "hidden" }}>
			<Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 1.5, bgcolor: alpha(tone, isDark ? 0.1 : 0.05) }}>
				<Box
					sx={{
						width: 40,
						height: 40,
						borderRadius: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						bgcolor: alpha(tone, isDark ? 0.18 : 0.1),
						color: tone,
						flexShrink: 0,
					}}
				>
					{meta.icon}
				</Box>
				<Stack spacing={0.25} sx={{ minWidth: 0 }}>
					<Stack direction="row" alignItems="center" spacing={0.75}>
						<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tone }} />
						<Typography sx={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: tone }}>
							{meta.label}
						</Typography>
					</Stack>
					<Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>{meta.title}</Typography>
					<Typography variant="caption" color="text.secondary">
						{formatFolderName(folderName, 80)}
					</Typography>
				</Stack>
			</Stack>
			<Stack spacing={1.25} sx={{ p: 1.5 }}>
				<Stack direction="row" spacing={1} sx={{ p: 1.25, borderRadius: 1, bgcolor: alpha(BRAND_BLUE, isDark ? 0.1 : 0.05) }}>
					<InfoCircle size={16} color={BRAND_BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
					<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
						{meta.description}
					</Typography>
				</Stack>
				{meta.note && (
					<Stack
						direction="row"
						spacing={1}
						sx={{ p: 1.25, borderRadius: 1, border: `1px dashed ${alpha(theme.palette.text.primary, 0.2)}` }}
					>
						<InfoCircle size={16} color={theme.palette.text.secondary} style={{ flexShrink: 0, marginTop: 2 }} />
						<Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.78rem" }}>
							{meta.note}
						</Typography>
					</Stack>
				)}
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
					{meta.cta && (
						<Button
							size="small"
							variant="contained"
							disableElevation
							sx={{ pointerEvents: "none", bgcolor: gate === "archived" ? BRAND_BLUE : tone }}
						>
							{meta.cta}
						</Button>
					)}
					{gate !== "pending" && gate !== "archived" && (
						<>
							<Button size="small" variant="outlined" sx={{ pointerEvents: "none" }}>
								Contactar a soporte
							</Button>
							<Button size="small" variant="outlined" color="error" sx={{ pointerEvents: "none" }}>
								Eliminar
							</Button>
						</>
					)}
					{gate === "archived" && (
						<Button size="small" variant="outlined" sx={{ pointerEvents: "none" }}>
							Volver a Carpetas
						</Button>
					)}
				</Stack>
			</Stack>
		</Box>
	);
}

// ---------- Panel por usuario ----------

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
	<Stack spacing={0.75}>
		<Stack direction="row" alignItems="baseline" spacing={1}>
			<Typography
				sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary" }}
			>
				{title}
			</Typography>
			{hint && (
				<Typography variant="caption" color="text.disabled">
					{hint}
				</Typography>
			)}
		</Stack>
		{children}
	</Stack>
);

const fmt = (d?: string | null) => (d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—");
const flag = (v: unknown) => (v === undefined || v === null ? "—" : String(v));

export function EntryPanel({ entry }: { entry: CausaUserViewEntry }) {
	const theme = useTheme();
	const { folder, view, links, user } = entry;
	const chipAccent = accentHex(view.detail.chip.accent);
	const expAccent = accentHex(view.expanded.accent);
	const chipTooltip =
		view.detail.chip.label === "PJN — Causa reservada"
			? "Esta causa fue marcada como reservada — el tribunal restringió la consulta web pública. El sistema sigue verificando si vuelve a estar accesible."
			: view.detail.chip.label === "PJN — Reservada (con acceso)"
			? "Causa reservada por el tribunal — accedés a sus movimientos a través de tu credencial PJN vinculada."
			: view.detail.chip.label === "PJN — Ya no en la lista"
			? LIST_TOOLTIPS.list_removed
			: "";

	return (
		<Stack spacing={2}>
			<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
				<Typography sx={{ fontWeight: 600 }}>{user.email || "(usuario sin email)"}</Typography>
				{user.name && (
					<Typography variant="caption" color="text.secondary">
						{user.name}
					</Typography>
				)}
				<Chip
					size="small"
					variant="outlined"
					label={`folder ${folder._id.slice(-6)} · ${folder.source || "?"}`}
					sx={{ fontFamily: "monospace" }}
				/>
				{view.contentBlocked && <Chip size="small" color="error" label="403 CAUSA_RESERVED en movimientos/PDFs" />}
				{view.credError && <Chip size="small" color="warning" label={`credencial: ${view.credError.code}`} />}
			</Stack>

			<Section
				title="1 · Lista de carpetas"
				hint={
					view.hiddenFromList
						? "no aparece: está archivada (solo en el modal Archivadas)"
						: view.inAttentionTable
						? "aparece en “Carpetas que requieren tu atención”"
						: "aparece en la tabla principal"
				}
			>
				<Box sx={{ opacity: view.hiddenFromList ? 0.45 : 1 }}>
					<ListRowReplica entry={entry} />
				</Box>
			</Section>

			<Section title="2 · Fila expandida" hint="pill de vinculación (FolderView)">
				<Box sx={{ p: 1.5, borderRadius: 1, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}` }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
						<Stack spacing={0.25} sx={{ minWidth: 0 }}>
							<Typography sx={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary" }}>
								Detalle de la carpeta
							</Typography>
							<Typography sx={{ fontSize: "0.95rem", fontWeight: 600 }} noWrap>
								{folder.folderName || "Carpeta sin nombre"}
							</Typography>
						</Stack>
						<BindingPill
							label={view.expanded.label}
							accent={expAccent}
							badge={view.expanded.badge}
							warnIcon={view.expanded.accent !== "green"}
							tooltip={
								view.expanded.accent === "red" ? LIST_TOOLTIPS.reserved : view.expanded.accent === "amber" ? LIST_TOOLTIPS.list_removed : ""
							}
						/>
					</Stack>
				</Box>
			</Section>

			<Section
				title="3 · Detalle de la carpeta"
				hint={view.detail.gate ? `gate: ${view.detail.gate} (bloquea el contenido)` : "sin gate: ve el detalle completo"}
			>
				{view.detail.gate ? (
					<GateReplica gate={view.detail.gate} folderName={folder.folderName} />
				) : (
					<Box sx={{ p: 1.5, borderRadius: 1, border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}` }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
							<Typography sx={{ fontSize: "0.95rem", fontWeight: 600 }} noWrap>
								{folder.folderName || "Carpeta sin nombre"}
							</Typography>
							<BindingPill
								label={view.detail.chip.label}
								accent={chipAccent}
								badge={view.detail.chip.badge}
								warnIcon={view.detail.chip.accent !== "green"}
								tooltip={chipTooltip}
							/>
						</Stack>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
							Tabs Movimientos / Tareas / Notas / Documentos visibles con contenido.
						</Typography>
					</Box>
				)}
			</Section>

			<Section title="Por qué" hint="campos que determinan el render">
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
						gap: 0.5,
						fontFamily: "monospace",
						fontSize: "0.72rem",
					}}
				>
					<span>pjn = {flag(folder.pjn)}</span>
					<span>source = {flag(folder.source)}</span>
					<span>archived = {flag(folder.archived)}</span>
					<span>causaVerified = {flag(folder.causaVerified)}</span>
					<span>causaIsValid = {flag(folder.causaIsValid)}</span>
					<span>causaAssociationStatus = {flag(folder.causaAssociationStatus)}</span>
					<span>causaIsPrivate = {flag(folder.causaIsPrivate)}</span>
					<span>causaCredentialCovered = {flag(folder.causaCredentialCovered)}</span>
					<span>
						listRemoved = {flag(folder.listRemoved)} {folder.listRemovedAt ? `(${fmt(folder.listRemovedAt)})` : ""}
					</span>
					<span>pjnNotFound = {flag(folder.pjnNotFound)}</span>
					{links.map((l) => (
						<span key={l.credentialId || "x"} style={{ gridColumn: "1 / -1" }}>
							link cred …{(l.credentialId || "").slice(-6)}: removedFromSync = {flag(l.removedFromSync)}
							{l.removedAt ? ` (${fmt(l.removedAt)})` : ""} · access = {flag(l.access)} · credencial enabled = {flag(l.credentialEnabled)} ·
							válida = {flag(l.credentialValid)} · syncStatus = {flag(l.credentialSyncStatus)}
							{l.credentialLastErrorCode ? ` · lastError = ${l.credentialLastErrorCode}` : ""}
						</span>
					))}
				</Box>
			</Section>
		</Stack>
	);
}

// ---------- Catálogo de casos (entradas sintéticas) ----------

interface CatalogCase {
	key: string;
	title: string;
	producer: string;
	entry: CausaUserViewEntry;
}

export const baseFolder = (over: Partial<CausaUserViewEntry["folder"]>): CausaUserViewEntry["folder"] => ({
	_id: "000000000000000000000000",
	userId: "u",
	folderName: "PÉREZ, JUAN c/ GÓMEZ, MARÍA s/DAÑOS Y PERJUICIOS",
	materia: "Civil",
	status: "Nueva",
	source: "auto",
	pjn: true,
	causaVerified: true,
	causaIsValid: true,
	causaAssociationStatus: "success",
	lastMovementDate: null,
	...over,
});

const mk = (
	key: string,
	title: string,
	producer: string,
	folder: Partial<CausaUserViewEntry["folder"]>,
	view: CausaUserViewEntry["view"],
	links: CausaUserViewEntry["links"] = [],
): CatalogCase => ({
	key,
	title,
	producer,
	entry: { user: { id: "u", email: "usuario@ejemplo.com", name: null }, folder: baseFolder(folder), links, view },
});

export const okView = (over: Partial<CausaUserViewEntry["view"]> = {}): CausaUserViewEntry["view"] => ({
	list: "ok",
	expanded: { label: "Vinculado con PJN", accent: "green", badge: "valid" },
	detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: null },
	hiddenFromList: false,
	inAttentionTable: false,
	contentBlocked: false,
	credError: null,
	isPjnPrivateCovered: false,
	...over,
});

export const CATALOG_CASES: CatalogCase[] = [
	mk(
		"ok",
		"Verificada y válida",
		"pjn-workers verify-worker → causa verified+isValid → folder causaVerified:true, causaIsValid:true, causaAssociationStatus:'success'",
		{},
		okView(),
	),
	mk(
		"pending",
		"Pendiente de verificación",
		"Alta de carpeta (hub createFolder): causaVerified:false hasta que pjn-workers verify-worker la procese",
		{ causaVerified: false, causaIsValid: undefined, causaAssociationStatus: "pending" },
		okView({
			list: "pending",
			expanded: { label: "Vinculado con PJN", accent: "green", badge: "pending" },
			detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "pending" }, gate: "pending" },
			inAttentionTable: true,
		}),
	),
	mk(
		"pending_selection",
		"Múltiples coincidencias",
		"hub causaService: la búsqueda por número/año devolvió varios expedientes → causaAssociationStatus:'pending_selection' (pivote)",
		{ causaVerified: false, causaAssociationStatus: "pending_selection" },
		okView({
			list: "pending_selection",
			expanded: { label: "Vinculado con PJN", accent: "green", badge: "pending" },
			detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "pending" }, gate: "pending_selection" },
			inAttentionTable: true,
		}),
	),
	mk(
		"failed",
		"Asociación fallida",
		"pjn-workers verify-worker: la búsqueda no devolvió resultados → causaAssociationStatus:'failed', causaVerified:false, causaIsValid:false",
		{ causaVerified: false, causaIsValid: false, causaAssociationStatus: "failed" },
		okView({
			list: "failed",
			expanded: { label: "Vinculado con PJN", accent: "green", badge: "pending" },
			detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "pending" }, gate: "failed" },
			inAttentionTable: true,
		}),
	),
	mk(
		"invalid",
		"Causa inválida",
		"pjn-workers verify-worker: error al verificar sin credencial vinculada → causa verified:true, isValid:false → folder causaVerified:true, causaIsValid:false",
		{ causaVerified: true, causaIsValid: false, causaAssociationStatus: "failed" },
		okView({
			list: "invalid",
			expanded: { label: "Vinculado con PJN", accent: "green", badge: "invalid" },
			detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "invalid" }, gate: "invalid" },
			inAttentionTable: true,
		}),
	),
	mk(
		"reserved",
		"Reservada sin credencial (carpeta pública)",
		"pjn-workers privacy-checker: accessFailureCount ≥ umbral → causa isPrivate:true + folder causaIsPrivate:true; pjn-mis-causas recomputeFolderCoverage → causaCredentialCovered:false (sin credencial que la cubra)",
		{ source: "auto", causaIsPrivate: true, causaCredentialCovered: false },
		okView({
			list: "reserved",
			expanded: { label: "PJN — Causa reservada", accent: "red", badge: "reserved" },
			detail: { chip: { label: "PJN — Causa reservada", accent: "red", badge: "valid" }, gate: "reserved" },
			contentBlocked: true,
		}),
	),
	mk(
		"reserved_covered",
		"Reservada con acceso (credencial cubre)",
		"causa isPrivate:true pero el usuario tiene credencial habilitada vinculada (linkedCredentials sin removedFromSync/revoked) → causaCredentialCovered:true",
		{ source: "auto", causaIsPrivate: true, causaCredentialCovered: true },
		okView({
			list: "reserved",
			expanded: { label: "PJN — Causa reservada", accent: "red", badge: "reserved" },
			detail: { chip: { label: "PJN — Reservada (con acceso)", accent: "green", badge: "valid" }, gate: null },
			isPjnPrivateCovered: true,
		}),
		[
			{
				credentialId: "abcdef",
				removedFromSync: false,
				removedAt: null,
				access: "full",
				accessChangedAt: null,
				credentialEnabled: true,
				credentialValid: true,
				credentialSyncStatus: "completed",
				credentialLastErrorCode: null,
			},
		],
	),
	mk(
		"reserved_revoked",
		"Acceso revocado (carpeta de Mis Causas)",
		"pjn-mis-causas private-causas-update: causa privada no hallada en Relacionados → linkedCredentials removedFromSync:true + access:'revoked' → causaCredentialCovered:false",
		{ source: "pjn-login", causaIsPrivate: true, causaCredentialCovered: false },
		okView({
			detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "reserved_revoked" },
			contentBlocked: true,
		}),
		[
			{
				credentialId: "abcdef",
				removedFromSync: true,
				removedAt: new Date().toISOString(),
				access: "revoked",
				accessChangedAt: new Date().toISOString(),
				credentialEnabled: true,
				credentialValid: true,
				credentialSyncStatus: "completed",
				credentialLastErrorCode: null,
			},
		],
	),
	mk(
		"list_removed",
		"Ya no en la lista (carpeta de Mis Causas)",
		"pjn-mis-causas: la causa PÚBLICA dejó de aparecer en Mis Causas → folder listRemoved:true, listRemovedSource:'pjn' (no bloquea el contenido)",
		{ source: "pjn-login", listRemoved: true, listRemovedSource: "pjn", listRemovedAt: new Date().toISOString() },
		okView({
			list: "list_removed",
			expanded: { label: "PJN — Ya no en la lista", accent: "amber", badge: "list_removed" },
			detail: { chip: { label: "PJN — Ya no en la lista", accent: "amber", badge: "valid" }, gate: null },
		}),
	),
	mk(
		"ok_cred_error",
		"Credencial rechazada (badge global)",
		"pjn-mis-causas: credencial syncStatus:'error' con code CREDENTIAL_INVALID | REQUIRED_ACTION → el front (usePjnCredentialError) pinta ámbar todas las carpetas source:'pjn-login'",
		{ source: "pjn-login" },
		okView({
			list: "ok_cred_error",
			credError: { code: "CREDENTIAL_INVALID", message: "Error de login: CUIT/CUIL o contraseña incorrectos." },
		}),
		[
			{
				credentialId: "abcdef",
				removedFromSync: false,
				removedAt: null,
				access: "full",
				accessChangedAt: null,
				credentialEnabled: true,
				credentialValid: false,
				credentialSyncStatus: "error",
				credentialLastErrorCode: "CREDENTIAL_INVALID",
			},
		],
	),
	mk(
		"archived",
		"Archivada",
		"Usuario (o límite de plan) archiva la carpeta → archived:true. Prevalece sobre cualquier otro gate; no aparece en la lista principal",
		{ archived: true },
		okView({ hiddenFromList: true, detail: { chip: { label: "Vinculado con PJN", accent: "green", badge: "valid" }, gate: "archived" } }),
	),
];

function CatalogView() {
	const theme = useTheme();
	return (
		<Stack spacing={3} divider={<Divider />}>
			{CATALOG_CASES.map((c) => (
				<Stack key={c.key} spacing={1.5}>
					<Stack spacing={0.25}>
						<Stack direction="row" alignItems="center" spacing={1}>
							<Chip size="small" label={c.key} sx={{ fontFamily: "monospace" }} />
							<Typography sx={{ fontWeight: 700 }}>{c.title}</Typography>
						</Stack>
						<Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
							Lo produce: {c.producer}
						</Typography>
					</Stack>
					<EntryPanel entry={c.entry} />
				</Stack>
			))}
		</Stack>
	);
}

// ---------- Dialog ----------

export default function CausaUserViewDialog({ open, onClose, collection = null, causaId = null, folderId = null }: Props) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<CausaUserViewData | null>(null);
	const [catalog, setCatalog] = useState(false);

	useEffect(() => {
		if (!open || (!folderId && (!collection || !causaId))) return;
		let cancelled = false;
		setLoading(true);
		setError(null);
		setData(null);
		pjnCredentialsService
			.getCausaUserView(folderId ? { folderId } : { collection: collection || undefined, causaId: causaId || undefined })
			.then((r: { data: CausaUserViewData }) => {
				if (!cancelled) setData(r.data);
			})
			.catch((e: { response?: { data?: { message?: string } }; message?: string }) => {
				if (!cancelled) setError(e?.response?.data?.message || e?.message || "Error");
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, collection, causaId, folderId]);

	const c = data?.causa;
	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
					<Stack spacing={0.25}>
						<Typography variant="h6" sx={{ fontFamily: "monospace" }}>
							Vista del usuario
							{c
								? ` — ${c.fuero} ${c.number}/${c.year}${c.incidente ? "/" + c.incidente : ""}`
								: data && !loading
								? " — carpeta sin causa asociada"
								: ""}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{c
								? c.caratula
								: data?.entries?.[0]?.folder.folderName || "Lo que cada usuario vinculado ve en su lista y en el detalle de la carpeta"}
						</Typography>
						{c && (
							<Stack direction="row" spacing={1} sx={{ pt: 0.5 }} flexWrap="wrap" useFlexGap>
								<Chip size="small" variant="outlined" label={`isPrivate: ${flag(c.isPrivate)}`} />
								<Chip size="small" variant="outlined" label={`source: ${c.source || "—"}`} />
								<Chip size="small" variant="outlined" label={`${c.movimientosCount ?? 0} movs`} />
								<Chip size="small" variant="outlined" label={`lastUpdate: ${fmt(c.lastUpdate)}`} />
								{c.lastError && (
									<Chip
										size="small"
										color="error"
										variant="outlined"
										label={`lastError (${c.lastError.phase || "?"}): ${c.lastError.message}`}
									/>
								)}
							</Stack>
						)}
					</Stack>
					<Button size="small" variant={catalog ? "contained" : "outlined"} onClick={() => setCatalog((v) => !v)} sx={{ flexShrink: 0 }}>
						{catalog ? "Volver al caso real" : "Catálogo de casos"}
					</Button>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				{catalog ? (
					<CatalogView />
				) : loading ? (
					<Stack alignItems="center" sx={{ py: 4 }}>
						<CircularProgress size={28} />
					</Stack>
				) : error ? (
					<Alert severity="error">{error}</Alert>
				) : !data || data.entries.length === 0 ? (
					<Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
						Ningún usuario tiene una carpeta para esta causa — nadie la ve en la app.
					</Typography>
				) : (
					<Stack spacing={3} divider={<Divider />}>
						{data.entries.map((e) => (
							<EntryPanel key={e.folder._id} entry={e} />
						))}
					</Stack>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} variant="outlined" size="small">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
}
