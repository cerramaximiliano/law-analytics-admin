import React, { useEffect, useState } from "react";
import { alpha } from "@mui/material/styles";
import {
	Box,
	Chip,
	CircularProgress,
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
import { Cpu } from "iconsax-react";
import {
	JudicialNotificationConfig,
	WORKER_REGISTRY,
	DELIVERY_MOVEMENT_SOURCES,
	resolveEffectivePolicy,
	ResolvedField,
	PolicyLayer,
} from "api/judicialNotificationConfig";
import { LiveJudicialConfig } from "./useLiveJudicialConfig";
import ScbaManagerService from "api/scbaManager";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Política efectiva por worker, EN VIVO. Toma el doc de configuración
// (compartido vía useLiveJudicialConfig) y aplica la misma cascada de
// resolución que corre en cada worker: override → defaults → fallback
// hardcodeado → base. Cada valor indica de qué capa salió.
// ----------------------------------------------------------------------

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const LAYER_META: Record<PolicyLayer, { label: string; color: string; hint: string }> = {
	override: { label: "override", color: STALE_AMBER, hint: "Seteado en movementPolicies.sources para esta clave" },
	defaults: { label: "defaults", color: BRAND_BLUE, hint: "Heredado de movementPolicies.defaults" },
	fallback: { label: "código", color: "#8B5CF6", hint: "Fallback hardcodeado en el código del worker" },
	base: { label: "base", color: "#94A3B8", hint: "Valor base del sistema (nada configurado)" },
};

const FIRST_SYNC_LABEL: Record<string, string> = {
	"silent-baseline": "Silenciosa",
	"today-only": "Solo hoy",
	"notify-all": "Todo ⚠️",
};

const OFF_DAY_LABEL: Record<string, string> = {
	skip: "Descartar",
	send: "Enviar igual",
	defer: "Diferir",
};

function FieldCell({ field, render }: { field: ResolvedField<any>; render: (v: any) => React.ReactNode }) {
	const meta = LAYER_META[field.layer];
	return (
		<Stack direction="row" spacing={0.75} alignItems="center">
			<span>{render(field.value)}</span>
			<Tooltip title={meta.hint} arrow>
				<Chip
					label={meta.label}
					size="small"
					sx={{
						height: 16,
						fontSize: 9.5,
						bgcolor: alpha(meta.color, 0.12),
						color: meta.color,
						border: `1px solid ${alpha(meta.color, 0.3)}`,
						"& .MuiChip-label": { px: 0.6 },
					}}
				/>
			</Tooltip>
		</Stack>
	);
}

function globalDaysLabel(config: JudicialNotificationConfig | null): string {
	const days = config?.notificationSchedule?.activeDays;
	return Array.isArray(days) && days.length > 0 ? days.map((d) => dayNames[d] ?? String(d)).join(", ") : "Lun–Vie";
}

const EffectiveWorkerPolicies: React.FC<{ live: LiveJudicialConfig }> = ({ live }) => {
	const { config, loading, error } = live;

	// Modo vigente de la partición de update SCBA (configuracion-scba vía mev-api).
	// Define el alcance real de las filas scba-update-*: en 'unified' el worker
	// principal cubre también las archivadas y el archived queda ocioso.
	const [scbaUpdateMode, setScbaUpdateMode] = useState<"split" | "unified" | null>(null);
	useEffect(() => {
		let cancelled = false;
		ScbaManagerService.getConfig()
			.then((r) => {
				if (!cancelled) setScbaUpdateMode(r.data?.config?.updatePolicy?.mode ?? "split");
			})
			.catch(() => {
				if (!cancelled) setScbaUpdateMode(null);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (loading) {
		return (
			<Stack alignItems="center" sx={{ py: 3 }}>
				<CircularProgress size={28} />
			</Stack>
		);
	}

	if (error && !config) {
		return <Alert severity="error">No se pudo cargar la configuración para resolver las políticas: {error}</Alert>;
	}

	const policies = config?.movementPolicies;
	const globalDays = globalDaysLabel(config);

	const renderDays = (v: number[] | null) => (v === null ? `global (${globalDays})` : v.map((d) => dayNames[d] ?? String(d)).join(", "));
	const renderBool = (labelOn: string, labelOff: string) => (v: boolean | undefined) =>
		v === false ? (
			<Box component="span" sx={{ color: STALE_AMBER, fontWeight: 600 }}>
				{labelOff}
			</Box>
		) : (
			labelOn
		);
	const renderFilters = (v: any) => (v === null || v === undefined ? "globales" : "propios");

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
				<Cpu size={20} color={BRAND_BLUE} />
				<Typography variant="h5">Política efectiva por worker (en vivo)</Typography>
			</Stack>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Resolución en vivo con la misma cascada que corre cada worker: <b>override</b> (sources[clave]) → <b>defaults</b> →{" "}
				<b>código</b> (fallback hardcodeado) → <b>base</b>. La etiqueta junto a cada valor indica de qué capa sale. Los workers
				refrescan el documento cada 5 minutos; esta tabla, cada 60 segundos. Para <b>folders archivados</b> el sistema tiene{" "}
				<b>doble barrera</b>: la 1ª es el worker (hoy solo SCBA filtra de su lado) y la 2ª es la entrega central de la-notification,
				que re-aplica la política para todas las fuentes — la columna indica qué barreras actúan en cada proceso.
			</Typography>

			<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
				<Table size="small">
					<TableHead>
						<TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}>
							<TableCell>Proceso (PM2)</TableCell>
							<TableCell>Clave de política</TableCell>
							<TableCell>Habilitado</TableCell>
							<TableCell>1ª sincronización</TableCell>
							<TableCell>Día no activo</TableCell>
							<TableCell>Días activos</TableCell>
							<TableCell>Folders archivados</TableCell>
							<TableCell>Filtros</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{WORKER_REGISTRY.map((w) => {
							if (!w.supportsPolicies) {
								return (
									<TableRow key={w.proceso} sx={{ bgcolor: alpha(STALE_AMBER, 0.06) }}>
										<TableCell>
											<Tooltip title={`${w.repo} · ${w.server}${w.nota ? ` — ${w.nota}` : ""}`} arrow>
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
													{w.proceso}
												</Typography>
											</Tooltip>
										</TableCell>
										<TableCell>
											<Chip label={w.sourceKey} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
										</TableCell>
										<TableCell colSpan={6}>
											<Typography variant="caption" sx={{ color: STALE_AMBER, fontWeight: 600 }}>
												Sin soporte de políticas (legacy) — no lee esta configuración; debe permanecer apagado. La entrega central igual le
												aplica los defaults por jurisdicción.
											</Typography>
										</TableCell>
									</TableRow>
								);
							}
							const p = resolveEffectivePolicy(policies, w.sourceKey, w.fallback);
							const isScbaMain = w.proceso === "scba-update-worker";
							const isScbaArchived = w.proceso === "scba-update-archived-worker";
							const scbaArchivedIdle = isScbaArchived && scbaUpdateMode === "unified";
							return (
								<TableRow key={w.proceso} sx={scbaArchivedIdle ? { bgcolor: alpha(STALE_AMBER, 0.06) } : undefined}>
									<TableCell>
										<Tooltip title={`${w.repo} · ${w.server}${w.nota ? ` — ${w.nota}` : ""}`} arrow>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
												{w.proceso}
											</Typography>
										</Tooltip>
										{isScbaMain && scbaUpdateMode === "unified" && (
											<Tooltip
												title="configuracion-scba.updatePolicy.mode='unified': este worker procesa TODAS las causas con folder (archivadas incluidas) en horario laboral. Configurable en Workers → SCBA manager → Configuración."
												arrow
											>
												<Chip
													label="unified: cubre archivadas"
													size="small"
													sx={{
														mt: 0.25,
														height: 16,
														fontSize: 9.5,
														bgcolor: alpha(BRAND_BLUE, 0.1),
														color: BRAND_BLUE,
														border: `1px solid ${alpha(BRAND_BLUE, 0.3)}`,
														"& .MuiChip-label": { px: 0.6 },
													}}
												/>
											</Tooltip>
										)}
										{scbaArchivedIdle && (
											<Tooltip
												title="configuracion-scba.updatePolicy.mode='unified': este worker no procesa causas (el update principal cubre las archivadas). Cambiá a 'split' en Workers → SCBA manager → Configuración para reactivarlo."
												arrow
											>
												<Chip
													label="ocioso (unified)"
													size="small"
													sx={{
														mt: 0.25,
														height: 16,
														fontSize: 9.5,
														bgcolor: alpha(STALE_AMBER, 0.12),
														color: STALE_AMBER,
														border: `1px solid ${alpha(STALE_AMBER, 0.3)}`,
														"& .MuiChip-label": { px: 0.6 },
													}}
												/>
											</Tooltip>
										)}
									</TableCell>
									<TableCell>
										<Chip label={w.sourceKey} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.enabled} render={renderBool("Sí", "NO (kill-switch)")} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.firstSyncPolicy} render={(v) => FIRST_SYNC_LABEL[v] || v} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.offDayMode} render={(v) => OFF_DAY_LABEL[v] || v} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.activeDays} render={renderDays} />
									</TableCell>
									<TableCell>
										<Stack spacing={0.5}>
											<FieldCell field={p.notifyArchivedFolders} render={renderBool("Notificar", "No notificar")} />
											<Tooltip
												title={
													w.archivedBarrier
														? `1ª barrera (worker): ${w.archivedBarrier}. 2ª barrera: la entrega central re-aplica la política.`
														: "El worker NO filtra archivados de su lado — la única barrera es la entrega central de la-notification."
												}
												arrow
											>
												<Chip
													label={w.archivedBarrier ? "1ª + 2ª barrera" : "solo 2ª (entrega)"}
													size="small"
													sx={{
														height: 16,
														fontSize: 9.5,
														width: "fit-content",
														bgcolor: alpha(w.archivedBarrier ? LIVE_GREEN : BRAND_BLUE, 0.1),
														color: w.archivedBarrier ? LIVE_GREEN : BRAND_BLUE,
														border: `1px solid ${alpha(w.archivedBarrier ? LIVE_GREEN : BRAND_BLUE, 0.3)}`,
														"& .MuiChip-label": { px: 0.6 },
													}}
												/>
											</Tooltip>
										</Stack>
									</TableCell>
									<TableCell>
										<Stack direction="row" spacing={1} alignItems="center">
											<FieldCell field={p.filters} render={renderFilters} />
											{w.sourceKey === "pjn-app-update-worker" && p.cacheSourceTodayOnly.value !== undefined && (
												<Tooltip title="Docs desde cache: notificar solo movimientos de hoy" arrow>
													<Chip
														label={`cache: ${p.cacheSourceTodayOnly.value ? "solo hoy" : "sin filtro"}`}
														size="small"
														variant="outlined"
														sx={{ height: 18, fontSize: 10 }}
													/>
												</Tooltip>
											)}
										</Stack>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>

			<Typography variant="subtitle2" sx={{ mb: 0.75 }}>
				Entrega central (la-notification) — 2ª barrera, resolución por jurisdicción
			</Typography>
			<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
				Lo que llega al webhook o crea el coordinador se filtra DE NUEVO en la entrega con estas políticas (sources[jurisdicción] →
				defaults → base; sin fallback de worker). Es la barrera final: aplica aunque el worker no haya filtrado (PJN/MEV/EJE) o
				haya sido bypasseado (pjn-api manual, legacy).
			</Typography>
			<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
				<Table size="small">
					<TableHead>
						<TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}>
							<TableCell>Jurisdicción</TableCell>
							<TableCell>Habilitada</TableCell>
							<TableCell>Día no activo</TableCell>
							<TableCell>Días activos</TableCell>
							<TableCell>Folders archivados</TableCell>
							<TableCell>Filtros</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{DELIVERY_MOVEMENT_SOURCES.map((s) => {
							const p = resolveEffectivePolicy(policies, s.key);
							return (
								<TableRow key={s.key}>
									<TableCell>
										<Tooltip title={s.hint || ""} arrow>
											<Chip label={s.key} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
										</Tooltip>
									</TableCell>
									<TableCell>
										<FieldCell field={p.enabled} render={renderBool("Sí", "NO (kill-switch)")} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.offDayMode} render={(v) => OFF_DAY_LABEL[v] || v} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.activeDays} render={renderDays} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.notifyArchivedFolders} render={renderBool("Notificar", "No notificar")} />
									</TableCell>
									<TableCell>
										<FieldCell field={p.filters} render={renderFilters} />
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>
			<Stack direction="row" spacing={1.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
				{(Object.keys(LAYER_META) as PolicyLayer[]).map((l) => (
					<Stack key={l} direction="row" spacing={0.5} alignItems="center">
						<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: LAYER_META[l].color }} />
						<Typography variant="caption" color="text.secondary">
							{LAYER_META[l].label}: {LAYER_META[l].hint.toLowerCase()}
						</Typography>
					</Stack>
				))}
			</Stack>
		</Box>
	);
};

export default EffectiveWorkerPolicies;
