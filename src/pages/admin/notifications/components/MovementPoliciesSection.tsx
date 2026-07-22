import React from "react";
import {
	Box,
	Chip,
	Divider,
	FormControl,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	FormControlLabel,
	Typography,
	Tooltip,
	Alert,
} from "@mui/material";
import { MovementPolicies, MovementPolicy, KNOWN_MOVEMENT_SOURCES, FirstSyncPolicy, OffDayMode } from "api/judicialNotificationConfig";

// ----------------------------------------------------------------------
// Sección "Políticas de movimientos" (movementPolicies del doc global).
// Semántica sparse: cada campo vacío = heredar de la capa anterior
// (source → defaults → fallback hardcodeado del worker). El componente
// mantiene el objeto sparse: setear "heredar" ELIMINA la clave.
// ----------------------------------------------------------------------

interface Props {
	value: MovementPolicies | null | undefined;
	onChange: (next: MovementPolicies) => void;
}

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const FIRST_SYNC_OPTIONS: { value: FirstSyncPolicy; label: string; description: string }[] = [
	{ value: "silent-baseline", label: "Baseline silenciosa", description: "La primera corrida no notifica nada (histórico completo)" },
	{ value: "today-only", label: "Solo movimientos de hoy", description: "En primera corrida notifica únicamente los de fecha de hoy" },
	{ value: "notify-all", label: "Notificar todo", description: "⚠️ Notifica el histórico completo en la primera corrida" },
];

const OFF_DAY_OPTIONS: { value: OffDayMode; label: string; description: string }[] = [
	{ value: "skip", label: "Descartar", description: "Capturado en día no activo → no se notifica nunca" },
	{ value: "send", label: "Enviar igual", description: "Ignora los días activos para este source" },
	{ value: "defer", label: "Diferir (no implementado)", description: "Reservado — hoy se comporta como Descartar" },
];

const INHERIT = "__inherit__";

/** Setea o elimina una clave de una policy, manteniéndola sparse. */
function setPolicyField(policy: MovementPolicy | undefined, field: keyof MovementPolicy, value: unknown | undefined): MovementPolicy {
	const next: Record<string, unknown> = { ...(policy || {}) };
	if (value === undefined) {
		delete next[field];
	} else {
		next[field] = value;
	}
	return next as MovementPolicy;
}

function isEmptyPolicy(policy: MovementPolicy | undefined): boolean {
	return !policy || Object.keys(policy).length === 0;
}

interface PolicyFormProps {
	policy: MovementPolicy | undefined;
	onPolicyChange: (next: MovementPolicy) => void;
	/** Texto de la opción heredar (difiere entre defaults y sources) */
	inheritLabel: string;
	/** Mostrar el campo cacheSourceTodayOnly (solo aplica a PJN app-update) */
	showCacheField?: boolean;
}

const PolicyForm: React.FC<PolicyFormProps> = ({ policy, onPolicyChange, inheritLabel, showCacheField }) => {
	const boolValue = (field: keyof MovementPolicy): string => {
		const v = policy?.[field];
		return v === undefined ? INHERIT : v ? "true" : "false";
	};

	const handleBool = (field: keyof MovementPolicy) => (value: string) => {
		onPolicyChange(setPolicyField(policy, field, value === INHERIT ? undefined : value === "true"));
	};

	const activeDaysOverridden = policy?.activeDays !== undefined && policy?.activeDays !== null;

	const toggleDay = (day: number) => {
		const current = policy?.activeDays ?? [];
		const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
		onPolicyChange(setPolicyField(policy, "activeDays", next));
	};

	return (
		<Grid container spacing={{ xs: 1.5, sm: 2 }}>
			<Grid item xs={12} sm={6} md={3}>
				<FormControl fullWidth size="small">
					<InputLabel>Primera corrida</InputLabel>
					<Select
						label="Primera corrida"
						value={policy?.firstSyncPolicy ?? INHERIT}
						onChange={(e) =>
							onPolicyChange(setPolicyField(policy, "firstSyncPolicy", e.target.value === INHERIT ? undefined : e.target.value))
						}
					>
						<MenuItem value={INHERIT}>
							<em>{inheritLabel}</em>
						</MenuItem>
						{FIRST_SYNC_OPTIONS.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>
								<Tooltip title={opt.description} placement="right">
									<span>{opt.label}</span>
								</Tooltip>
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid>
			<Grid item xs={12} sm={6} md={3}>
				<FormControl fullWidth size="small">
					<InputLabel>Día no activo</InputLabel>
					<Select
						label="Día no activo"
						value={policy?.offDayMode ?? INHERIT}
						onChange={(e) => onPolicyChange(setPolicyField(policy, "offDayMode", e.target.value === INHERIT ? undefined : e.target.value))}
					>
						<MenuItem value={INHERIT}>
							<em>{inheritLabel}</em>
						</MenuItem>
						{OFF_DAY_OPTIONS.map((opt) => (
							<MenuItem key={opt.value} value={opt.value} disabled={opt.value === "defer"}>
								<Tooltip title={opt.description} placement="right">
									<span>{opt.label}</span>
								</Tooltip>
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid>
			<Grid item xs={12} sm={6} md={3}>
				<FormControl fullWidth size="small">
					<InputLabel>Notificaciones</InputLabel>
					<Select label="Notificaciones" value={boolValue("enabled")} onChange={(e) => handleBool("enabled")(e.target.value)}>
						<MenuItem value={INHERIT}>
							<em>{inheritLabel}</em>
						</MenuItem>
						<MenuItem value="true">Habilitadas</MenuItem>
						<MenuItem value="false">Deshabilitadas (kill-switch)</MenuItem>
					</Select>
				</FormControl>
			</Grid>
			<Grid item xs={12} sm={6} md={3}>
				<FormControl fullWidth size="small">
					<InputLabel>Folders archivados</InputLabel>
					<Select
						label="Folders archivados"
						value={boolValue("notifyArchivedFolders")}
						onChange={(e) => handleBool("notifyArchivedFolders")(e.target.value)}
					>
						<MenuItem value={INHERIT}>
							<em>{inheritLabel}</em>
						</MenuItem>
						<MenuItem value="true">Notificar siempre</MenuItem>
						<MenuItem value="false">No notificar archivados</MenuItem>
					</Select>
				</FormControl>
			</Grid>
			{showCacheField && (
				<Grid item xs={12} sm={6} md={3}>
					<FormControl fullWidth size="small">
						<InputLabel>Docs desde cache</InputLabel>
						<Select
							label="Docs desde cache"
							value={boolValue("cacheSourceTodayOnly")}
							onChange={(e) => handleBool("cacheSourceTodayOnly")(e.target.value)}
						>
							<MenuItem value={INHERIT}>
								<em>{inheritLabel}</em>
							</MenuItem>
							<MenuItem value="true">Solo movs de hoy</MenuItem>
							<MenuItem value="false">Sin filtro</MenuItem>
						</Select>
					</FormControl>
				</Grid>
			)}
			<Grid item xs={12}>
				<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
					<FormControlLabel
						control={
							<Switch
								size="small"
								checked={activeDaysOverridden}
								onChange={(e) => onPolicyChange(setPolicyField(policy, "activeDays", e.target.checked ? [1, 2, 3, 4, 5] : undefined))}
							/>
						}
						label={
							<Typography variant="body2">
								Personalizar días activos {!activeDaysOverridden && "(hereda los días globales del cronograma)"}
							</Typography>
						}
					/>
					{activeDaysOverridden && (
						<Stack direction="row" spacing={0.5}>
							{dayNames.map((name, day) => {
								const selected = (policy?.activeDays ?? []).includes(day);
								return (
									<Chip
										key={day}
										label={name}
										size="small"
										color={selected ? "primary" : "default"}
										variant={selected ? "filled" : "outlined"}
										onClick={() => toggleDay(day)}
									/>
								);
							})}
						</Stack>
					)}
				</Stack>
			</Grid>
		</Grid>
	);
};

const MovementPoliciesSection: React.FC<Props> = ({ value, onChange }) => {
	const policies: MovementPolicies = value || {};

	const handleDefaultsChange = (next: MovementPolicy) => {
		onChange({ version: policies.version ?? 1, ...policies, defaults: next });
	};

	const handleSourceChange = (sourceKey: string) => (next: MovementPolicy) => {
		const sources = { ...(policies.sources || {}) };
		if (isEmptyPolicy(next)) {
			delete sources[sourceKey];
		} else {
			sources[sourceKey] = next;
		}
		onChange({ version: policies.version ?? 1, ...policies, sources });
	};

	return (
		<Box>
			<Alert severity="info" sx={{ mb: 2 }}>
				Resolución por capas: <strong>override del worker → defaults → fallback hardcodeado en el código del worker</strong>. Un campo en
				"heredar" no se guarda en el documento y deja actuar a la capa siguiente. Los workers refrescan esta configuración cada 5 minutos.
			</Alert>

			<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
				Defaults (todos los workers)
			</Typography>
			<PolicyForm
				policy={policies.defaults}
				onPolicyChange={handleDefaultsChange}
				inheritLabel="Heredar (fallback del worker)"
				showCacheField
			/>

			<Divider sx={{ my: 3 }} />

			<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
				Overrides por worker
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Cada worker se identifica por el <code>source</code> que envía junto a los movimientos. Los overrides de filtros de contenido por
				worker no tienen UI — editarlos vía API si hace falta.
			</Typography>

			<Stack spacing={2.5}>
				{KNOWN_MOVEMENT_SOURCES.map(({ key, label, hint }) => {
					const hasOverrides = !isEmptyPolicy(policies.sources?.[key]);
					return (
						<Box key={key} sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap">
								<Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
									{label}
								</Typography>
								<Chip label={key} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
								{hasOverrides ? (
									<Chip label="con overrides" size="small" color="warning" variant="outlined" />
								) : (
									<Chip label="hereda defaults" size="small" color="default" variant="outlined" />
								)}
								{hint && (
									<Typography variant="caption" color="text.secondary">
										{hint}
									</Typography>
								)}
							</Stack>
							<PolicyForm
								policy={policies.sources?.[key]}
								onPolicyChange={handleSourceChange(key)}
								inheritLabel="Heredar defaults"
								showCacheField={key === "pjn-app-update-worker"}
							/>
						</Box>
					);
				})}
			</Stack>
		</Box>
	);
};

export default MovementPoliciesSection;
