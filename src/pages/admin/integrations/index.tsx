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

import IntegrationsConfigService, { IntegrationsConfigDoc } from "api/integrationsConfig";
import { ScrapingManagerService, ScrapingManagerConfig } from "api/scrapingManager";
import ScbaManagerService, { ScbaManagerConfig } from "api/scbaManager";

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

	const refreshAll = useCallback(() => {
		fetchIntegrations();
		fetchPjn();
		fetchScba();
	}, [fetchIntegrations, fetchPjn, fetchScba]);

	useEffect(() => {
		refreshAll();
	}, [refreshAll]);

	// ---- Handlers ----

	const handleGroupsToggle = async (enabled: boolean) => {
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			const res = await IntegrationsConfigService.updateService("groups", { enabled });
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar(enabled ? "Grupos habilitado" : "Grupos deshabilitado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al actualizar Grupos", { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
		}
	};

	const handleGroupsMessage = async (message: string | null) => {
		setIntegrations((s) => ({ ...s, saving: true }));
		try {
			const res = await IntegrationsConfigService.updateService("groups", { maintenanceMessage: message });
			setIntegrations({ loading: false, saving: false, error: null, data: res.data });
			enqueueSnackbar("Mensaje de mantenimiento actualizado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error al guardar mensaje", { variant: "error" });
			setIntegrations((s) => ({ ...s, saving: false }));
		}
	};

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
			</Grid>

			<Box sx={{ mt: 4 }}>
				<Stack spacing={1}>
					<Typography variant="caption" color="text.secondary">
						Las configuraciones de PJN y SCBA viven en sus propios servicios (pjn-api, mev-api) y se sincronizan via API. La configuración
						de Grupos se almacena en <code>integrationsconfigs</code> en la base de datos principal.
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
