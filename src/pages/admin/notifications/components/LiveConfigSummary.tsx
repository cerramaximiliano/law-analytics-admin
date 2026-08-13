import React from "react";
import { useTheme, alpha } from "@mui/material/styles";
import {
	Box,
	Chip,
	CircularProgress,
	Grid,
	IconButton,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
	Alert,
} from "@mui/material";
import { Refresh, Setting2 } from "iconsax-react";
import { JudicialNotificationConfig } from "api/judicialNotificationConfig";
import { LiveJudicialConfig } from "./useLiveJudicialConfig";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Resumen EN VIVO de judicial-notification-configs. El fetch/polling vive
// en useLiveJudicialConfig (compartido con EffectiveWorkerPolicies): siempre
// muestra lo que el documento dice AHORA, sin importar desde dónde se haya
// editado (UI, API o Mongo directo).
// ----------------------------------------------------------------------

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const fmtDays = (days?: number[] | null) =>
	Array.isArray(days) && days.length > 0 ? days.map((d) => dayNames[d] ?? String(d)).join(", ") : "—";
const fmtList = (arr?: string[]) => (Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : "ninguno");
const onOff = (v: boolean | undefined, def = true) => (v === undefined ? def : v !== false);

const BoolChip = ({ value, labelOn, labelOff }: { value: boolean; labelOn: string; labelOff: string }) => (
	<Chip
		size="small"
		label={value ? labelOn : labelOff}
		sx={{
			bgcolor: alpha(value ? LIVE_GREEN : STALE_AMBER, 0.12),
			color: value ? LIVE_GREEN : STALE_AMBER,
			fontWeight: 600,
			border: `1px solid ${alpha(value ? LIVE_GREEN : STALE_AMBER, 0.35)}`,
		}}
	/>
);

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
		<Typography variant="caption" color="text.secondary" sx={{ minWidth: 170 }}>
			{label}
		</Typography>
		<Typography variant="body2" component="div">
			{children}
		</Typography>
	</Stack>
);

const LiveConfigSummary: React.FC<{ live: LiveJudicialConfig }> = ({ live }) => {
	const theme = useTheme();
	const { config, loading, error, lastFetch, refresh: fetchConfig } = live;

	if (loading) {
		return (
			<Stack alignItems="center" sx={{ py: 3 }}>
				<CircularProgress size={28} />
			</Stack>
		);
	}

	if (error && !config) {
		return <Alert severity="error">No se pudo cargar la configuración vigente: {error}</Alert>;
	}

	if (!config) return null;

	const status = config.status || ({} as JudicialNotificationConfig["status"]);
	const sched = config.notificationSchedule || ({} as JudicialNotificationConfig["notificationSchedule"]);
	const limits = config.limits || ({} as JudicialNotificationConfig["limits"]);
	const filters = config.filters || ({} as JudicialNotificationConfig["filters"]);
	const retention = config.dataRetention || ({} as JudicialNotificationConfig["dataRetention"]);
	const defaults = config.movementPolicies?.defaults || {};
	const sources = config.movementPolicies?.sources || {};
	const sourceEntries = Object.entries(sources);

	const globallyOn = status.enabled !== false && status.mode !== "maintenance";

	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2.5,
				borderRadius: 2,
				borderColor: alpha(BRAND_BLUE, 0.35),
				bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.06 : 0.03),
			}}
		>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
				<Setting2 size={20} color={BRAND_BLUE} />
				<Typography variant="h6">Configuración vigente</Typography>
				<BoolChip value={globallyOn} labelOn="Sistema activo" labelOff={status.mode === "maintenance" ? "Mantenimiento" : "Deshabilitado"} />
				<Chip label={status.mode || "production"} size="small" variant="outlined" />
				<Box sx={{ flexGrow: 1 }} />
				{lastFetch && (
					<Typography variant="caption" color="text.secondary">
						Actualizado {lastFetch.toLocaleTimeString("es-AR")} · refresca cada 60 s
					</Typography>
				)}
				<Tooltip title="Refrescar ahora">
					<IconButton size="small" onClick={fetchConfig}>
						<Refresh size={16} />
					</IconButton>
				</Tooltip>
			</Stack>

			{error && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Último refresh falló ({error}) — mostrando la última configuración conocida.
				</Alert>
			)}

			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Stack spacing={0.75}>
						<InfoRow label="Coordinador interno PJN">
							<BoolChip value={onOff(status.coordinatorEnabled)} labelOn="Habilitado" labelOff="Deshabilitado" />
						</InfoRow>
						<InfoRow label="Cédulas (bandeja PJN)">
							<BoolChip value={onOff(status.cedulasEnabled)} labelOn="Habilitadas" labelOff="Deshabilitadas" />
						</InfoRow>
						<InfoRow label="Hora de entrega">
							{sched.dailyNotificationHour ?? 19}:{String(sched.dailyNotificationMinute ?? 0).padStart(2, "0")} ({sched.timezone})
						</InfoRow>
						<InfoRow label="Días activos">{fmtDays(sched.activeDays)}</InfoRow>
						<InfoRow label="Horas de reporte admin">{fmtList(sched.reportHours)}</InfoRow>
						<InfoRow label="Límites por usuario (entrega)">
							{limits.enforcePerUserLimits === true ? (
								<>
									<BoolChip value labelOn="Activos" labelOff="" /> máx {limits.maxNotificationsPerUserPerDay ?? 50}/día ·{" "}
									{limits.minHoursBetweenSameExpediente ?? 24} h entre mismo expediente
								</>
							) : (
								<BoolChip value={false} labelOn="" labelOff="Desactivados (declarativos)" />
							)}
						</InfoRow>
						<InfoRow label="Máx. movimientos por batch">{limits.maxMovementsPerBatch ?? 100}</InfoRow>
						<InfoRow label="Banner de upgrade">
							{config.planBanner?.enabled !== false ? (
								<>
									<BoolChip value labelOn="Activo" labelOff="" /> cooldown {config.planBanner?.cooldownDays ?? 7} d · mín.{" "}
									{config.planBanner?.minArchivedFolders ?? 1} archivadas
									{config.planBanner?.promo?.enabled === true && config.planBanner?.promo?.code
										? ` · promo ${config.planBanner.promo.code}`
										: ""}
								</>
							) : (
								<BoolChip value={false} labelOn="" labelOff="Apagado" />
							)}
						</InfoRow>
						<InfoRow label="Banner de anuncios">
							{config.featureBanner?.enabled === true ? (
								<>
									<BoolChip value labelOn="Activo" labelOff="" /> "{config.featureBanner?.title || "(sin título)"}"
								</>
							) : (
								<BoolChip value={false} labelOn="" labelOff="Apagado" />
							)}
						</InfoRow>
					</Stack>
				</Grid>
				<Grid item xs={12} md={6}>
					<Stack spacing={0.75}>
						<InfoRow label="Tipos excluidos">{fmtList(filters.excludedMovementTypes)}</InfoRow>
						<InfoRow label="Keywords excluidas">{fmtList(filters.excludedKeywords)}</InfoRow>
						<InfoRow label="Whitelist de tipos">{fmtList(filters.includedMovementTypes)}</InfoRow>
						<InfoRow label="Política default">
							1ª sync: <b>{defaults.firstSyncPolicy || "(fallback worker)"}</b> · día no activo: <b>{defaults.offDayMode || "skip"}</b> ·
							folders archivados:{" "}
							<Box component="span" sx={{ display: "inline-flex", verticalAlign: "middle" }}>
								<BoolChip value={onOff(defaults.notifyArchivedFolders)} labelOn="Notificar" labelOff="No notificar" />
							</Box>
						</InfoRow>
						<InfoRow label="Retención">
							sent {retention.judicialMovementRetentionDays ?? 60} d · skipped {retention.skippedRetentionDays ?? 30} d · logs{" "}
							{retention.notificationLogRetentionDays ?? 30} d
						</InfoRow>
						<InfoRow label="Última edición del doc">
							{config.updatedAt ? new Date(config.updatedAt).toLocaleString("es-AR") : "—"}
							{config.metadata?.lastModifiedBy ? ` (por ${config.metadata.lastModifiedBy})` : ""}
						</InfoRow>
					</Stack>
				</Grid>

				{sourceEntries.length > 0 && (
					<Grid item xs={12}>
						<Typography variant="subtitle2" sx={{ mb: 0.75 }}>
							Overrides por source / jurisdicción
						</Typography>
						<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
							<Table size="small">
								<TableHead>
									<TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}>
										<TableCell>Source</TableCell>
										<TableCell>Habilitada</TableCell>
										<TableCell>1ª sync</TableCell>
										<TableCell>Día no activo</TableCell>
										<TableCell>Archivados</TableCell>
										<TableCell>Otros</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{sourceEntries.map(([key, pol]) => {
										const otros = [
											pol.cacheSourceTodayOnly !== undefined ? `cache solo hoy: ${pol.cacheSourceTodayOnly ? "sí" : "no"}` : null,
											pol.activeDays ? `días: ${fmtDays(pol.activeDays)}` : null,
											pol.filters ? "filtros propios" : null,
										]
											.filter(Boolean)
											.join(" · ");
										const inherit = <em style={{ opacity: 0.55 }}>hereda</em>;
										return (
											<TableRow key={key}>
												<TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{key}</TableCell>
												<TableCell>{pol.enabled === undefined ? inherit : pol.enabled ? "Sí" : "NO (kill-switch)"}</TableCell>
												<TableCell>{pol.firstSyncPolicy || inherit}</TableCell>
												<TableCell>{pol.offDayMode || inherit}</TableCell>
												<TableCell>
													{pol.notifyArchivedFolders === undefined ? inherit : pol.notifyArchivedFolders ? "Notificar" : "No notificar"}
												</TableCell>
												<TableCell>{otros || "—"}</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</Grid>
				)}
			</Grid>
		</Paper>
	);
};

export default LiveConfigSummary;
