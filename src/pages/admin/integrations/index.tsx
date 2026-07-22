import React, { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	Skeleton,
	Stack,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Code1, Copy, Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";

import IntegrationsConfigService, {
	IntegrationsConfigDoc,
	ReleaseStage,
	ServiceKey,
	Environment,
	UpdateServicePayload,
} from "api/integrationsConfig";
import { ScrapingManagerService, ScrapingManagerConfig } from "api/scrapingManager";
import ScbaManagerService, { ScbaManagerConfig } from "api/scbaManager";
import judicialNotificationConfigService from "api/judicialNotificationConfig";

import ServiceAvailabilityCard from "./ServiceAvailabilityCard";

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
