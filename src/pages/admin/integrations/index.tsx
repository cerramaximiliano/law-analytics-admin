import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Grid,
	IconButton,
	MenuItem,
	Skeleton,
	Stack,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Add, Code1, Copy, Edit2, Refresh, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { JURISDICTION_LOGOS } from "assets/images/logos/jurisdictions";

import IntegrationsConfigService, {
	IntegrationsConfigDoc,
	ReleaseStage,
	ServiceKey,
	Environment,
	UpdateServicePayload,
	LandingIntegrationKey,
	LandingIntegrationStatus,
	LandingCatalogEntry,
	UpsertLandingCatalogPayload,
	CORE_LANDING_KEYS,
} from "api/integrationsConfig";
import { ScrapingManagerService, ScrapingManagerConfig } from "api/scrapingManager";
import ScbaManagerService, { ScbaManagerConfig } from "api/scbaManager";
import judicialNotificationConfigService from "api/judicialNotificationConfig";

import ServiceAvailabilityCard from "./ServiceAvailabilityCard";

// Jurisdicciones del strip "Integrado con" de la landing pública. La metadata
// visual (logo/color) vive en el front; acá solo el estado por jurisdicción.
const LANDING_ITEMS: Array<{ key: LandingIntegrationKey; label: string; defaultOrder: number }> = [
	{ key: "pjn", label: "PJN — Poder Judicial de la Nación", defaultOrder: 1 },
	{ key: "mev", label: "MEV — Prov. de Buenos Aires", defaultOrder: 2 },
	{ key: "eje", label: "EJE — Ciudad de Buenos Aires", defaultOrder: 3 },
	{ key: "seclo", label: "SECLO", defaultOrder: 4 },
	{ key: "pjsalta", label: "Poder Judicial de Salta", defaultOrder: 5 },
	{ key: "pjcatamarca", label: "Poder Judicial de Catamarca", defaultOrder: 6 },
];

const LANDING_STATUS_OPTIONS: Array<{ value: LandingIntegrationStatus; label: string }> = [
	{ value: "available", label: "Disponible" },
	{ value: "comingSoon", label: "Próximamente" },
	{ value: "hidden", label: "Oculto" },
];

// Metadata visual del strip — espejo de INTEGRATIONS en el Header de la
// landing (law-analytics-front). Solo para la previsualización del admin.
const LANDING_VISUALS: Record<LandingIntegrationKey, { shortName: string; logoSrc: string; bgColor: string; hasBorder: boolean }> = {
	pjn: { shortName: "PJN", logoSrc: JURISDICTION_LOGOS.pjn, bgColor: "#232D4F", hasBorder: false },
	mev: { shortName: "MEV", logoSrc: JURISDICTION_LOGOS.mev, bgColor: "#ffffff", hasBorder: true },
	eje: {
		shortName: "EJE",
		logoSrc: JURISDICTION_LOGOS.eje,
		bgColor: "#ffffff",
		hasBorder: true,
	},
	seclo: {
		shortName: "SECLO",
		logoSrc: JURISDICTION_LOGOS.seclo,
		bgColor: "#ffffff",
		hasBorder: true,
	},
	pjsalta: {
		shortName: "SALTA",
		logoSrc: JURISDICTION_LOGOS.pjsalta,
		bgColor: "#ffffff",
		hasBorder: true,
	},
	pjcatamarca: { shortName: "CATAMARCA", logoSrc: JURISDICTION_LOGOS.pjcatamarca, bgColor: "#ffffff", hasBorder: true },
};

// ====================================
// TYPES
// ====================================

interface ServiceState<T = unknown> {
	loading: boolean;
	saving: boolean;
	error: string | null;
	data: T | null;
}

const initialServiceState = <T,>(): ServiceState<T> => ({ loading: true, saving: false, error: null, data: null });

// ====================================
// MAIN PAGE
// ====================================

const IntegrationsPage: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();

	const [integrations, setIntegrations] = useState<ServiceState<IntegrationsConfigDoc>>(initialServiceState());
	const [pjn, setPjn] = useState<ServiceState<ScrapingManagerConfig>>(initialServiceState());
	const [scba, setScba] = useState<ServiceState<ScbaManagerConfig>>(initialServiceState());
	// Visor de documentos en emails (/m/:token). Fuente: JudicialNotificationConfig
	// (contentConfig.usePublicMovementLinks). Lo lee la-notification al armar el mail.
	const [movViewer, setMovViewer] = useState<ServiceState<{ enabled: boolean; updatedAt?: string; updatedBy?: string }>>(
		initialServiceState(),
	);
	const [rawOpen, setRawOpen] = useState(false);

	// ---- Fetchers ----

	const fetchIntegrations = useCallback(async () => {
		setIntegrations((s) => ({ ...s, loading: true, error: null }));
		try {
			const res = await IntegrationsConfigService.getConfig();
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
		} catch (err: any) {
			setIntegrations({ loading: false, saving: false, error: err?.message || "Error", data: null });
		}
	}, []);

	const fetchPjn = useCallback(async () => {
		setPjn((s) => ({ ...s, loading: true, error: null }));
		try {
			const res = await ScrapingManagerService.getConfig();
			setPjn({ loading: false, saving: false, error: null, data: res.data });
		} catch (err: any) {
			setPjn({ loading: false, saving: false, error: err?.message || "Error", data: null });
		}
	}, []);

	const fetchScba = useCallback(async () => {
		setScba((s) => ({ ...s, loading: true, error: null }));
		try {
			const res = await ScbaManagerService.getConfig();
			setScba({ loading: false, saving: false, error: null, data: res.data });
		} catch (err: any) {
			setScba({ loading: false, saving: false, error: err?.message || "Error", data: null });
		}
	}, []);

	const fetchMovViewer = useCallback(async () => {
		setMovViewer((s) => ({ ...s, loading: true, error: null }));
		try {
			const cfg = await judicialNotificationConfigService.getConfig();
			setMovViewer({
				loading: false,
				saving: false,
				error: null,
				data: {
					enabled: !!cfg.contentConfig?.usePublicMovementLinks,
					updatedAt: cfg.updatedAt,
					updatedBy: cfg.metadata?.lastModifiedBy,
				},
			});
		} catch (err: any) {
			setMovViewer({ loading: false, saving: false, error: err?.message || "Error", data: null });
		}
	}, []);

	const refreshAll = useCallback(() => {
		fetchIntegrations();
		fetchPjn();
		fetchScba();
		fetchMovViewer();
	}, [fetchIntegrations, fetchPjn, fetchScba, fetchMovViewer]);

	useEffect(() => {
		refreshAll();
	}, [refreshAll]);

	// ---- Handlers ----

	// Handler genérico para cualquier service de IntegrationsConfig — devuelve
	// fn que el card invoca según el tipo de cambio. Reusa el setIntegrations
	// y respeta el shape de respuesta (siempre devuelve el doc completo).
	const updateIntegrationService = async (serviceKey: ServiceKey, payload: UpdateServicePayload, successMsg: string) => {
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			const res = await IntegrationsConfigService.updateService(serviceKey, payload);
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar(successMsg, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || `Error al actualizar ${serviceKey}`, { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
		}
	};

	// Strip "Integrado con" de la landing pública — status y orden por jurisdicción
	const handleLandingUpdate = async (key: LandingIntegrationKey, payload: { status?: LandingIntegrationStatus; order?: number }) => {
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			const res = await IntegrationsConfigService.updateLandingIntegration(key, payload);
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
			const detail = payload.status !== undefined ? payload.status : `orden ${payload.order}`;
			enqueueSnackbar(`Landing: ${key} → ${detail}`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || `Error al actualizar ${key}`, { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
		}
	};

	// ── Catálogo dinámico de jurisdicciones (fuente de verdad) ──
	// El backend lo seedea en getSingleton; el fallback (backend previo al
	// catálogo) lo reconstruye desde los items core + el mapa legacy.
	const catalogEntries: LandingCatalogEntry[] = (() => {
		const cat = integrations.data?.landingCatalog;
		if (cat && cat.length > 0) return [...cat].sort((a, b) => a.order - b.order);
		return LANDING_ITEMS.map((item) => {
			const flag = integrations.data?.landingIntegrations?.[item.key];
			return {
				key: item.key,
				shortName: LANDING_VISUALS[item.key]?.shortName,
				name: item.label,
				status: flag?.status ?? (item.key === "pjn" || item.key === "mev" || item.key === "eje" ? "available" : "comingSoon"),
				order: flag?.order ?? item.defaultOrder,
			} as LandingCatalogEntry;
		}).sort((a, b) => a.order - b.order);
	})();
	const entryOf = (key: string) => catalogEntries.find((e) => e.key === key);
	const isCoreKey = (key: string) => (CORE_LANDING_KEYS as readonly string[]).includes(key);
	// Metadata visual para la previsualización: las core usan el asset local;
	// las agregadas por admin, su logoUrl remoto.
	const visualOf = (entry: LandingCatalogEntry) => {
		const core = LANDING_VISUALS[entry.key];
		return {
			shortName: entry.shortName || core?.shortName || entry.key.toUpperCase(),
			logoSrc: core?.logoSrc || entry.logoUrl || "",
			bgColor: core?.bgColor || entry.bgColor || "#ffffff",
			hasBorder: core ? core.hasBorder : entry.hasBorder !== false,
		};
	};

	// Alta/edición/baja de jurisdicciones del catálogo
	const emptyDraft: UpsertLandingCatalogPayload & { key: string } = {
		key: "",
		shortName: "",
		name: "",
		listLabel: "",
		logoUrl: "",
		bgColor: "#ffffff",
		hasBorder: true,
		status: "hidden",
		capabilities: { credentialSync: false, individualCauses: true },
	};
	const [catalogDialog, setCatalogDialog] = useState<{ mode: "create" | "edit"; draft: typeof emptyDraft } | null>(null);

	const handleCatalogUpsert = async (key: string, payload: UpsertLandingCatalogPayload, successMsg: string) => {
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			const res = await IntegrationsConfigService.upsertLandingCatalogEntry(key, payload);
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar(successMsg, { variant: "success" });
			return true;
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || `Error al guardar ${key}`, { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
			return false;
		}
	};
	const handleCatalogDelete = async (key: string) => {
		if (!window.confirm(`¿Eliminar la jurisdicción "${key}" del catálogo? Desaparece de la landing y de los textos de marketing.`)) return;
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			const res = await IntegrationsConfigService.deleteLandingCatalogEntry(key);
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar(`Jurisdicción ${key} eliminada`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || `Error al eliminar ${key}`, { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
		}
	};
	const openCatalogDialog = (entry?: LandingCatalogEntry) => {
		if (!entry) {
			setCatalogDialog({ mode: "create", draft: { ...emptyDraft } });
			return;
		}
		setCatalogDialog({
			mode: "edit",
			draft: {
				key: entry.key,
				shortName: entry.shortName || "",
				name: entry.name || "",
				listLabel: entry.listLabel || "",
				logoUrl: entry.logoUrl || "",
				bgColor: entry.bgColor || "#ffffff",
				hasBorder: entry.hasBorder !== false,
				status: entry.status,
				capabilities: {
					credentialSync: entry.capabilities?.credentialSync === true,
					individualCauses: entry.capabilities?.individualCauses !== false,
				},
			},
		});
	};
	const submitCatalogDialog = async () => {
		if (!catalogDialog) return;
		const { key, ...payload } = catalogDialog.draft;
		if (!key.trim()) {
			enqueueSnackbar("La key es obligatoria (ej: pjmendoza)", { variant: "warning" });
			return;
		}
		const ok = await handleCatalogUpsert(
			key.trim(),
			{ ...payload, logoUrl: payload.logoUrl?.trim() || null },
			catalogDialog.mode === "create" ? `Jurisdicción ${key} agregada` : `Jurisdicción ${key} actualizada`,
		);
		if (ok) setCatalogDialog(null);
	};

	// ── Preview + reordenamiento drag & drop del strip de la landing ──
	// orderDraft = null → sin cambios locales (se deriva del doc); array →
	// orden en edición pendiente de "Guardar orden".
	const [orderDraft, setOrderDraft] = useState<string[] | null>(null);
	const dragKeyRef = useRef<string | null>(null);

	const landingStatusOf = (key: string): LandingIntegrationStatus => entryOf(key)?.status ?? "comingSoon";
	const landingOrderFromConfig = (): string[] => catalogEntries.map((e) => e.key);
	const effectiveOrder = orderDraft ?? landingOrderFromConfig();
	const orderDirty = orderDraft !== null && JSON.stringify(orderDraft) !== JSON.stringify(landingOrderFromConfig());

	const handleTileDragStart = (key: string) => {
		dragKeyRef.current = key;
	};
	const handleTileDragOver = (e: React.DragEvent, overKey: string) => {
		e.preventDefault();
		const from = dragKeyRef.current;
		if (!from || from === overKey) return;
		setOrderDraft((prev) => {
			const list = [...(prev ?? landingOrderFromConfig())];
			const fi = list.indexOf(from);
			const ti = list.indexOf(overKey);
			if (fi < 0 || ti < 0 || fi === ti) return prev ?? list;
			list.splice(fi, 1);
			list.splice(ti, 0, from);
			return list;
		});
	};
	const handleSaveOrder = async () => {
		if (!orderDraft) return;
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			let lastDoc: IntegrationsConfigDoc | null = null;
			for (let i = 0; i < orderDraft.length; i++) {
				const key = orderDraft[i];
				const current = entryOf(key)?.order;
				if (current !== i + 1) {
					const res = await IntegrationsConfigService.updateLandingIntegration(key, { order: i + 1 });
					lastDoc = res.data;
				}
			}
			setIntegrations((s) => ({ loading: false, saving: false, error: null, data: lastDoc ?? s.data }));
			setOrderDraft(null);
			enqueueSnackbar("Orden del strip guardado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al guardar el orden", { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
		}
	};

	// Grupos (sin releaseStage)
	const handleGroupsToggle = (enabled: boolean) =>
		updateIntegrationService("groups", { enabled }, enabled ? "Grupos habilitado" : "Grupos deshabilitado");
	const handleGroupsMessage = (message: string | null) =>
		updateIntegrationService("groups", { maintenanceMessage: message }, "Mensaje de mantenimiento actualizado");

	// Claude.ai — per-env (development / production independientes).
	// handleClaudeAiToggle (full boolean) se mantiene por compat de la prop
	// onToggle requerida del card; en práctica no se invoca porque pasamos
	// enabledByEnv + onToggleEnv.
	const handleClaudeAiToggle = (enabled: boolean) =>
		updateIntegrationService("claudeAi", { enabled }, enabled ? "Claude.ai habilitado" : "Claude.ai deshabilitado");
	const handleClaudeAiToggleEnv = (env: Environment, value: boolean) =>
		updateIntegrationService("claudeAi", { enabled: { [env]: value } }, `Claude.ai ${env} ${value ? "habilitado" : "deshabilitado"}`);
	const handleClaudeAiMessage = (message: string | null) =>
		updateIntegrationService("claudeAi", { maintenanceMessage: message }, "Mensaje Claude.ai actualizado");
	const handleClaudeAiReleaseStage = (stage: ReleaseStage) =>
		updateIntegrationService("claudeAi", { releaseStage: stage }, `Claude.ai marcado como ${stage}`);

	// ChatGPT — mismo patrón per-env
	const handleChatGptToggle = (enabled: boolean) =>
		updateIntegrationService("chatGpt", { enabled }, enabled ? "ChatGPT habilitado" : "ChatGPT deshabilitado");
	const handleChatGptToggleEnv = (env: Environment, value: boolean) =>
		updateIntegrationService("chatGpt", { enabled: { [env]: value } }, `ChatGPT ${env} ${value ? "habilitado" : "deshabilitado"}`);
	const handleChatGptMessage = (message: string | null) =>
		updateIntegrationService("chatGpt", { maintenanceMessage: message }, "Mensaje ChatGPT actualizado");
	const handleChatGptReleaseStage = (stage: ReleaseStage) =>
		updateIntegrationService("chatGpt", { releaseStage: stage }, `ChatGPT marcado como ${stage}`);

	const handlePjnToggle = async (enabled: boolean) => {
		if (!pjn.data) return;
		setPjn((s) => ({ ...s, saving: true }));
		try {
			const res = await ScrapingManagerService.updateGlobal({ serviceAvailable: enabled });
			setPjn({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar(enabled ? "Servicio PJN habilitado" : "Servicio PJN deshabilitado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al actualizar PJN", { variant: "error" });
			setPjn((s) => ({ ...s, saving: false }));
		}
	};

	const handlePjnMessage = async (message: string | null) => {
		if (!pjn.data) return;
		setPjn((s) => ({ ...s, saving: true }));
		try {
			const res = await ScrapingManagerService.updateGlobal({ maintenanceMessage: message });
			setPjn({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar("Mensaje PJN actualizado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al guardar mensaje PJN", { variant: "error" });
			setPjn((s) => ({ ...s, saving: false }));
		}
	};

	const handleScbaToggle = async (enabled: boolean) => {
		if (!scba.data) return;
		setScba((s) => ({ ...s, saving: true }));
		try {
			await ScbaManagerService.updateSettings({ serviceAvailable: enabled });
			await fetchScba();
			enqueueSnackbar(enabled ? "Servicio SCBA habilitado" : "Servicio SCBA deshabilitado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al actualizar SCBA", { variant: "error" });
			setScba((s) => ({ ...s, saving: false }));
		}
	};

	const handleScbaMessage = async (message: string | null) => {
		if (!scba.data) return;
		setScba((s) => ({ ...s, saving: true }));
		try {
			await ScbaManagerService.updateSettings({ maintenanceMessage: message || "" });
			await fetchScba();
			enqueueSnackbar("Mensaje SCBA actualizado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al guardar mensaje SCBA", { variant: "error" });
			setScba((s) => ({ ...s, saving: false }));
		}
	};

	const handleMovViewerToggle = async (enabled: boolean) => {
		setMovViewer((s) => ({ ...s, saving: true }));
		try {
			await judicialNotificationConfigService.updateContentConfig({ usePublicMovementLinks: enabled });
			await fetchMovViewer();
			enqueueSnackbar(enabled ? "Visor de documentos en emails habilitado" : "Visor de documentos en emails deshabilitado", {
				variant: "success",
			});
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al actualizar el visor de documentos", { variant: "error" });
			setMovViewer((s) => ({ ...s, saving: false }));
		}
	};

	const handleCopyRaw = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(integrations.data, null, 2));
			enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
		} catch {
			enqueueSnackbar("No se pudo copiar al portapapeles", { variant: "error" });
		}
	};

	// ---- Render helpers ----

	const groupsFlag = integrations.data?.services.groups;
	const claudeAiFlag = integrations.data?.services.claudeAi;
	const chatGptFlag = integrations.data?.services.chatGpt;

	// Normaliza el shape de enabled — el doc viejo puede tener boolean, el
	// nuevo tiene { development, production }. Devolvemos siempre el shape
	// nuevo para que la card no tenga que ramificar.
	const toEnabledByEnv = (e: unknown): { development: boolean; production: boolean } => {
		if (typeof e === "boolean") return { development: e, production: e };
		if (e && typeof e === "object") {
			const obj = e as { development?: unknown; production?: unknown };
			return { development: obj.development === true, production: obj.production === true };
		}
		return { development: false, production: false };
	};
	const claudeAiEnabled = toEnabledByEnv(claudeAiFlag?.enabled);
	const chatGptEnabled = toEnabledByEnv(chatGptFlag?.enabled);
	const pjnGlobal = pjn.data?.global;
	const scbaSettings = scba.data?.config;

	return (
		<MainCard
			title="Integraciones"
			secondary={
				<Stack direction="row" spacing={0.5}>
					<Tooltip title="Ver IntegrationsConfig (RAW JSON)">
						<span>
							<IconButton onClick={() => setRawOpen(true)} size="small" disabled={!integrations.data}>
								<Code1 size={18} />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title="Actualizar todo">
						<IconButton onClick={refreshAll} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 820, lineHeight: 1.55 }}>
				Disponibilidad de los servicios principales para los usuarios. Cuando un servicio está deshabilitado, los usuarios verán un aviso de
				mantenimiento aunque los workers internos sigan operando.
			</Typography>

			<Grid container spacing={2}>
				{/* PJN Mis Causas */}
				<Grid item xs={12} md={6}>
					{pjn.loading ? (
						<Skeleton variant="rounded" height={140} />
					) : pjn.error ? (
						<Alert severity="error">No se pudo cargar el servicio PJN: {pjn.error}</Alert>
					) : pjnGlobal ? (
						<ServiceAvailabilityCard
							title="Mis Causas PJN"
							description="Sincronización del portal Mis Causas del Poder Judicial de la Nación"
							enabled={!!pjnGlobal.serviceAvailable}
							maintenanceMessage={pjnGlobal.maintenanceMessage}
							saving={pjn.saving}
							editableMessage
							updatedAt={(pjn.data as any)?.updatedAt}
							updatedBy={(pjn.data as any)?.updatedBy}
							helperOff="El servicio PJN está deshabilitado. La API responderá indicando que el servicio no está disponible."
							onToggle={handlePjnToggle}
							onSaveMessage={handlePjnMessage}
						/>
					) : null}
				</Grid>

				{/* MEV SCBA */}
				<Grid item xs={12} md={6}>
					{scba.loading ? (
						<Skeleton variant="rounded" height={140} />
					) : scba.error ? (
						<Alert severity="error">No se pudo cargar el servicio SCBA: {scba.error}</Alert>
					) : scbaSettings ? (
						<ServiceAvailabilityCard
							title="Mis Causas SCBA"
							description="Sincronización del portal Mis Causas de la Suprema Corte de Buenos Aires"
							enabled={!!scbaSettings.serviceAvailable}
							maintenanceMessage={scbaSettings.maintenanceMessage}
							saving={scba.saving}
							editableMessage
							updatedAt={scba.data?.updatedAt}
							helperOff="El servicio SCBA está deshabilitado. La API responderá indicando que el servicio no está disponible."
							onToggle={handleScbaToggle}
							onSaveMessage={handleScbaMessage}
						/>
					) : null}
				</Grid>

				{/* Grupos */}
				<Grid item xs={12} md={6}>
					{integrations.loading ? (
						<Skeleton variant="rounded" height={140} />
					) : integrations.error ? (
						<Alert severity="error">No se pudo cargar Grupos: {integrations.error}</Alert>
					) : groupsFlag ? (
						<ServiceAvailabilityCard
							title="Grupos / Teams"
							description="Creación y administración de grupos colaborativos"
							enabled={groupsFlag.enabled}
							maintenanceMessage={groupsFlag.maintenanceMessage}
							saving={integrations.saving}
							editableMessage
							updatedAt={groupsFlag.updatedAt}
							updatedBy={groupsFlag.updatedBy}
							helperOff="El servicio de Grupos está deshabilitado. Los usuarios verán un aviso al intentar usar la funcionalidad."
							onToggle={handleGroupsToggle}
							onSaveMessage={handleGroupsMessage}
						/>
					) : null}
				</Grid>

				{/* Claude.ai — MCP integration */}
				<Grid item xs={12} md={6}>
					{integrations.loading ? (
						<Skeleton variant="rounded" height={180} />
					) : integrations.error ? (
						<Alert severity="error">No se pudo cargar Claude.ai: {integrations.error}</Alert>
					) : (
						<ServiceAvailabilityCard
							title="Claude.ai (MCP)"
							description="Conector MCP para que usuarios accedan a Law Analytics desde Claude.ai"
							enabled={claudeAiEnabled.production}
							enabledByEnv={claudeAiEnabled}
							maintenanceMessage={claudeAiFlag?.maintenanceMessage ?? null}
							releaseStage={(claudeAiFlag?.releaseStage as ReleaseStage) ?? "beta"}
							saving={integrations.saving}
							editableMessage
							updatedAt={claudeAiFlag?.updatedAt}
							updatedBy={claudeAiFlag?.updatedBy}
							helperOff="La integración Claude.ai está oculta del landing público en producción. Habilitá 'Dev' para testear localmente sin exponer a usuarios reales."
							onToggle={handleClaudeAiToggle}
							onToggleEnv={handleClaudeAiToggleEnv}
							onSaveMessage={handleClaudeAiMessage}
							onChangeReleaseStage={handleClaudeAiReleaseStage}
						/>
					)}
				</Grid>

				{/* ChatGPT — MCP integration (placeholder UI hasta que tenga vista propia) */}
				<Grid item xs={12} md={6}>
					{integrations.loading ? (
						<Skeleton variant="rounded" height={180} />
					) : integrations.error ? (
						<Alert severity="error">No se pudo cargar ChatGPT: {integrations.error}</Alert>
					) : (
						<ServiceAvailabilityCard
							title="ChatGPT (MCP)"
							description="Conector MCP para que usuarios accedan a Law Analytics desde ChatGPT"
							enabled={chatGptEnabled.production}
							enabledByEnv={chatGptEnabled}
							maintenanceMessage={chatGptFlag?.maintenanceMessage ?? null}
							releaseStage={(chatGptFlag?.releaseStage as ReleaseStage) ?? "beta"}
							saving={integrations.saving}
							editableMessage
							updatedAt={chatGptFlag?.updatedAt}
							updatedBy={chatGptFlag?.updatedBy}
							helperOff="ChatGPT MCP oculto en producción. Habilitá 'Dev' para validar el flow en desarrollo antes de exponerlo."
							onToggle={handleChatGptToggle}
							onToggleEnv={handleChatGptToggleEnv}
							onSaveMessage={handleChatGptMessage}
							onChangeReleaseStage={handleChatGptReleaseStage}
						/>
					)}
				</Grid>
				{/* Visor de documentos en emails (/m/:token) */}
				<Grid item xs={12} md={6}>
					{movViewer.loading ? (
						<Skeleton variant="rounded" height={140} />
					) : movViewer.error ? (
						<Alert severity="error">No se pudo cargar el visor de documentos: {movViewer.error}</Alert>
					) : movViewer.data ? (
						<ServiceAvailabilityCard
							title="Visor de documentos (emails)"
							description="Los links 'Ver documento' de los emails de movimientos apuntan a la página propia /m/:token (PDF desde S3 + tracking) en vez del portal judicial"
							enabled={movViewer.data.enabled}
							saving={movViewer.saving}
							updatedAt={movViewer.data.updatedAt}
							updatedBy={movViewer.data.updatedBy}
							helperOff="Deshabilitado: los emails siguen linkeando al portal judicial. Al habilitarlo, el usuario abre el documento desde nuestra página pública (sirve también para causas privadas cuyo doc ya no es accesible en el portal)."
							onToggle={handleMovViewerToggle}
						/>
					) : null}
				</Grid>
			</Grid>

			{/* Strip "Integrado con" de la landing pública */}
			<Box sx={{ mt: 4 }}>
				<Typography variant="h5" sx={{ mb: 0.5 }}>
					Landing — "Integrado con"
				</Typography>
				<Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
						Catálogo de jurisdicciones de la landing pública (lawanalytics.app). "Disponible" = ícono pleno con pulso verde · "Próximamente"
						= atenuado · "Oculto" = no se muestra. Las capacidades (sync de credenciales / alta individual de causas) alimentan los textos
						de marketing ("Empezá en 3 pasos", hero, planes). Impacta sin deploy (la landing lo lee de /plan-configs/public).
					</Typography>
					<Button size="small" variant="outlined" startIcon={<Add size={16} />} onClick={() => openCatalogDialog()} sx={{ flexShrink: 0 }}>
						Agregar jurisdicción
					</Button>
				</Stack>
				{integrations.loading ? (
					<Skeleton variant="rounded" height={120} />
				) : (
					<Grid container spacing={1.5}>
						{catalogEntries.map((entry) => {
							const visual = visualOf(entry);
							const core = isCoreKey(entry.key);
							return (
								<Grid item xs={12} sm={6} md={4} key={entry.key}>
									<Stack spacing={0.75} sx={{ p: 1.25, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
										<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
											<Box sx={{ minWidth: 0, flex: 1 }}>
												<Typography variant="body2" fontWeight={600} noWrap>
													{entry.name || visual.shortName}
												</Typography>
												{entry.updatedBy && (
													<Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
														{entry.updatedBy}
													</Typography>
												)}
											</Box>
											<Tooltip title="Posición en el strip (menor = más a la izquierda). El orden se refleja en la landing y en este listado.">
												<TextField
													size="small"
													type="number"
													label="Orden"
													defaultValue={entry.order}
													key={`${entry.key}-order-${entry.order}`}
													inputProps={{ min: 1, max: 99, style: { width: 44 } }}
													disabled={integrations.saving}
													onBlur={(e) => {
														const next = parseInt(e.target.value, 10);
														if (!isNaN(next) && next >= 1 && next <= 99 && next !== entry.order) {
															handleLandingUpdate(entry.key, { order: next });
														}
													}}
													sx={{ flexShrink: 0 }}
												/>
											</Tooltip>
											<TextField
												select
												size="small"
												value={entry.status}
												onChange={(e) => handleLandingUpdate(entry.key, { status: e.target.value as LandingIntegrationStatus })}
												disabled={integrations.saving}
												sx={{ minWidth: 150, flexShrink: 0 }}
											>
												{LANDING_STATUS_OPTIONS.map((o) => (
													<MenuItem key={o.value} value={o.value}>
														{o.label}
													</MenuItem>
												))}
											</TextField>
										</Stack>
										<Stack direction="row" alignItems="center" spacing={0.5}>
											<Tooltip title="Permite vincular credenciales y sincronizar causas automáticamente (aparece en 'Conectá tus credenciales…').">
												<FormControlLabel
													control={
														<Checkbox
															size="small"
															checked={entry.capabilities?.credentialSync === true}
															disabled={integrations.saving}
															onChange={(e) =>
																handleCatalogUpsert(
																	entry.key,
																	{ capabilities: { credentialSync: e.target.checked } },
																	`${visual.shortName}: sync de credenciales ${e.target.checked ? "habilitado" : "deshabilitado"}`,
																)
															}
														/>
													}
													label={<Typography variant="caption">Sync credenciales</Typography>}
													sx={{ mr: 0.5 }}
												/>
											</Tooltip>
											<Tooltip title="Permite agregar causas individualmente por N° de expediente, sin credenciales.">
												<FormControlLabel
													control={
														<Checkbox
															size="small"
															checked={entry.capabilities?.individualCauses !== false}
															disabled={integrations.saving}
															onChange={(e) =>
																handleCatalogUpsert(
																	entry.key,
																	{ capabilities: { individualCauses: e.target.checked } },
																	`${visual.shortName}: alta individual ${e.target.checked ? "habilitada" : "deshabilitada"}`,
																)
															}
														/>
													}
													label={<Typography variant="caption">Alta individual</Typography>}
												/>
											</Tooltip>
											<Box sx={{ flex: 1 }} />
											<Tooltip title="Editar metadata (nombres, logo, color)">
												<IconButton size="small" onClick={() => openCatalogDialog(entry)} disabled={integrations.saving}>
													<Edit2 size={16} />
												</IconButton>
											</Tooltip>
											{!core && (
												<Tooltip title="Eliminar del catálogo">
													<IconButton
														size="small"
														color="error"
														onClick={() => handleCatalogDelete(entry.key)}
														disabled={integrations.saving}
													>
														<Trash size={16} />
													</IconButton>
												</Tooltip>
											)}
										</Stack>
									</Stack>
								</Grid>
							);
						})}
					</Grid>
				)}

				{/* Previsualización del strip como se ve en la landing — arrastrá los
				    íconos para reordenar y guardá. Los ocultos aparecen punteados
				    (no se muestran al público) pero se pueden posicionar igual. */}
				{!integrations.loading && (
					<Box sx={{ mt: 3 }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" rowGap={1} sx={{ mb: 1.5 }}>
							<Box>
								<Typography variant="subtitle2">Previsualización — así se ve en la landing</Typography>
								<Typography variant="caption" color="text.secondary">
									Arrastrá los íconos para cambiar el orden y guardalo con el botón.
								</Typography>
							</Box>
							{orderDirty && (
								<Stack direction="row" spacing={1}>
									<Button size="small" onClick={() => setOrderDraft(null)} disabled={integrations.saving}>
										Descartar
									</Button>
									<Button size="small" variant="contained" onClick={handleSaveOrder} disabled={integrations.saving}>
										{integrations.saving ? "Guardando…" : "Guardar orden"}
									</Button>
								</Stack>
							)}
						</Stack>
						<Box
							sx={{
								p: 2.5,
								borderRadius: 2,
								border: `1px dashed ${theme.palette.divider}`,
								bgcolor: alpha(theme.palette.text.primary, 0.02),
							}}
						>
							<Typography
								sx={{
									textAlign: "center",
									color: "text.secondary",
									fontSize: "0.72rem",
									textTransform: "uppercase",
									letterSpacing: "0.1em",
									mb: 2,
								}}
							>
								Integrado con
							</Typography>
							<Stack direction="row" spacing={3} justifyContent="center" alignItems="flex-start" flexWrap="wrap" rowGap={2} useFlexGap>
								{effectiveOrder.map((key) => {
									const entry = entryOf(key);
									if (!entry) return null;
									const visual = visualOf(entry);
									const status = landingStatusOf(key);
									const isAvailable = status === "available";
									const isHidden = status === "hidden";
									return (
										<Tooltip key={key} title={`${entry.name || visual.shortName} — arrastrar para reordenar`}>
											<Box
												draggable
												onDragStart={() => handleTileDragStart(key)}
												onDragOver={(e) => handleTileDragOver(e, key)}
												onDragEnd={() => (dragKeyRef.current = null)}
												sx={{
													display: "flex",
													flexDirection: "column",
													alignItems: "center",
													gap: 0.75,
													width: 110,
													cursor: "grab",
													"&:active": { cursor: "grabbing" },
													opacity: isHidden ? 0.35 : isAvailable ? 1 : 0.55,
												}}
											>
												<Box
													sx={{
														position: "relative",
														width: 64,
														height: 64,
														borderRadius: 2,
														bgcolor: visual.bgColor,
														border: isHidden
															? `2px dashed ${theme.palette.error.main}`
															: visual.hasBorder
															? "1px solid rgba(0,0,0,0.1)"
															: "none",
														boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														p: 0.75,
														filter: isAvailable ? "none" : "grayscale(40%)",
													}}
												>
													{visual.logoSrc ? (
														<Box
															component="img"
															src={visual.logoSrc}
															alt={entry.name || visual.shortName}
															draggable={false}
															sx={{ width: "100%", height: "100%", objectFit: "contain" }}
														/>
													) : (
														<Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
															{visual.shortName}
														</Typography>
													)}
													{isAvailable && (
														<Box
															sx={{
																position: "absolute",
																top: -3,
																right: -3,
																width: 10,
																height: 10,
																borderRadius: "50%",
																bgcolor: "#22C55E",
																border: `2px solid ${theme.palette.background.paper}`,
															}}
														/>
													)}
												</Box>
												<Typography variant="caption" sx={{ textAlign: "center", lineHeight: 1.2, color: "text.secondary" }}>
													{visual.shortName}
													{isHidden && (
														<Box component="span" sx={{ display: "block", color: theme.palette.error.main, fontSize: "0.62rem" }}>
															Oculto
														</Box>
													)}
													{!isHidden && !isAvailable && (
														<Box component="span" sx={{ display: "block", fontSize: "0.62rem" }}>
															Próximamente
														</Box>
													)}
												</Typography>
											</Box>
										</Tooltip>
									);
								})}
							</Stack>
						</Box>
					</Box>
				)}
			</Box>

			<Box sx={{ mt: 4 }}>
				<Stack spacing={1}>
					<Typography variant="caption" color="text.secondary">
						Las configuraciones de PJN y SCBA viven en sus propios servicios (pjn-api, mev-api) y se sincronizan via API. Grupos, Claude.ai
						y ChatGPT se almacenan en <code>integrationsconfigs</code> en la base de datos principal. Las integraciones AI (Claude/ChatGPT)
						tienen además un <em>estado de lanzamiento</em> (Beta / Estable) que controla cómo se renderea el chip y el CTA en la landing
						pública.
					</Typography>
				</Stack>
			</Box>

			{/* Alta / edición de jurisdicción del catálogo */}
			<Dialog open={!!catalogDialog} onClose={() => setCatalogDialog(null)} maxWidth="sm" fullWidth>
				<DialogTitle>
					{catalogDialog?.mode === "create" ? "Agregar jurisdicción" : `Editar jurisdicción — ${catalogDialog?.draft.key}`}
				</DialogTitle>
				{catalogDialog && (
					<DialogContent dividers>
						<Stack spacing={2} sx={{ mt: 0.5 }}>
							<TextField
								size="small"
								label="Key (identificador único)"
								value={catalogDialog.draft.key}
								disabled={catalogDialog.mode === "edit"}
								onChange={(e) =>
									setCatalogDialog((d) =>
										d ? { ...d, draft: { ...d.draft, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") } } : d,
									)
								}
								helperText="Minúsculas, sin espacios. Ej: pjmendoza, pjsanluis. No se puede cambiar después."
							/>
							<Stack direction="row" spacing={2}>
								<TextField
									size="small"
									label="Nombre corto (bajo el ícono)"
									value={catalogDialog.draft.shortName}
									onChange={(e) => setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, shortName: e.target.value } } : d))}
									helperText="Ej: MENDOZA"
									fullWidth
								/>
								<TextField
									size="small"
									label="Etiqueta en listas de texto"
									value={catalogDialog.draft.listLabel}
									onChange={(e) => setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, listLabel: e.target.value } } : d))}
									helperText='Ej: Mendoza → "PJN, MEV y Mendoza"'
									fullWidth
								/>
							</Stack>
							<TextField
								size="small"
								label="Nombre completo (tooltip)"
								value={catalogDialog.draft.name}
								onChange={(e) => setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, name: e.target.value } } : d))}
								helperText="Ej: Poder Judicial de la Provincia de Mendoza"
							/>
							<TextField
								size="small"
								label="Logo URL (https)"
								value={catalogDialog.draft.logoUrl || ""}
								onChange={(e) => setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, logoUrl: e.target.value } } : d))}
								helperText={
									isCoreKey(catalogDialog.draft.key)
										? "Las jurisdicciones core usan el asset local del front — este campo se ignora para ellas."
										: "Obligatorio para que el ícono aparezca en la landing. Ej: URL de Cloudinary con fondo transparente."
								}
							/>
							<Stack direction="row" spacing={2} alignItems="center">
								<TextField
									size="small"
									label="Color de fondo"
									value={catalogDialog.draft.bgColor}
									onChange={(e) => setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, bgColor: e.target.value } } : d))}
									sx={{ width: 140 }}
								/>
								<FormControlLabel
									control={
										<Checkbox
											size="small"
											checked={catalogDialog.draft.hasBorder !== false}
											onChange={(e) => setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, hasBorder: e.target.checked } } : d))}
										/>
									}
									label={<Typography variant="caption">Borde en el tile</Typography>}
								/>
								<TextField
									select
									size="small"
									label="Estado inicial"
									value={catalogDialog.draft.status}
									onChange={(e) =>
										setCatalogDialog((d) => (d ? { ...d, draft: { ...d.draft, status: e.target.value as LandingIntegrationStatus } } : d))
									}
									sx={{ minWidth: 150 }}
								>
									{LANDING_STATUS_OPTIONS.map((o) => (
										<MenuItem key={o.value} value={o.value}>
											{o.label}
										</MenuItem>
									))}
								</TextField>
							</Stack>
							<Stack direction="row" spacing={1}>
								<FormControlLabel
									control={
										<Checkbox
											size="small"
											checked={catalogDialog.draft.capabilities?.credentialSync === true}
											onChange={(e) =>
												setCatalogDialog((d) =>
													d
														? { ...d, draft: { ...d.draft, capabilities: { ...d.draft.capabilities, credentialSync: e.target.checked } } }
														: d,
												)
											}
										/>
									}
									label={<Typography variant="caption">Sync de credenciales</Typography>}
								/>
								<FormControlLabel
									control={
										<Checkbox
											size="small"
											checked={catalogDialog.draft.capabilities?.individualCauses !== false}
											onChange={(e) =>
												setCatalogDialog((d) =>
													d
														? { ...d, draft: { ...d.draft, capabilities: { ...d.draft.capabilities, individualCauses: e.target.checked } } }
														: d,
												)
											}
										/>
									}
									label={<Typography variant="caption">Alta individual de causas</Typography>}
								/>
							</Stack>
						</Stack>
					</DialogContent>
				)}
				<DialogActions>
					<Button onClick={() => setCatalogDialog(null)}>Cancelar</Button>
					<Button variant="contained" onClick={submitCatalogDialog} disabled={integrations.saving}>
						{integrations.saving ? "Guardando…" : catalogDialog?.mode === "create" ? "Agregar" : "Guardar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* RAW JSON dialog */}
			<Dialog open={rawOpen} onClose={() => setRawOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Code1 size={20} />
					IntegrationsConfig — RAW JSON
				</DialogTitle>
				<DialogContent dividers>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
						Colección: <code>integrationsconfigs</code> · Documento singleton con <code>key: "config"</code>
					</Typography>
					<Box
						component="pre"
						sx={{
							m: 0,
							p: 2,
							borderRadius: 1,
							bgcolor: alpha(theme.palette.text.primary, 0.04),
							border: `1px solid ${theme.palette.divider}`,
							fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
							fontSize: 12,
							lineHeight: 1.6,
							overflow: "auto",
							maxHeight: "60vh",
							whiteSpace: "pre",
						}}
					>
						{integrations.data ? JSON.stringify(integrations.data, null, 2) : "(sin datos)"}
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCopyRaw} startIcon={<Copy size={16} />} disabled={!integrations.data}>
						Copiar JSON
					</Button>
					<Button onClick={() => setRawOpen(false)} variant="contained">
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default IntegrationsPage;
