import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Chip,
	FormControlLabel,
	IconButton,
	Slider,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import { ArrowDown2, ArrowRight2, RotateLeft, SearchNormal1, TickCircle } from "iconsax-react";

import MainCard from "components/MainCard";
import { Campaign, CampaignDeferredCount, FrequencyPolicy, SchedulerFrequencyState } from "types/campaign";
import { CampaignService } from "store/reducers/campaign";
import { BRAND_BLUE } from "themes/dashboardTokens";
import {
	DEFAULT_FREQUENCY_CONFIG,
	clampPriority,
	getPolicy,
	isExemptByCategory,
	isSaijEdition,
	policiesEqual,
	reasonLabel,
	toPolicyPayload,
} from "utils/campaignCoordination";
import { COL_MD, COL_SM } from "utils/responsiveColumns";
import { CAMPAIGN_STATUS_CHIP, CAMPAIGN_TYPE_LABEL, WARNING_CHIP_SX } from "./labels";

interface PrioritiesTableProps {
	campaigns: Campaign[];
	frequency: SchedulerFrequencyState | null;
	onCampaignUpdated: (campaign: Campaign) => void;
}

const OPEN_STATUSES = ["active", "draft", "paused"];
const COLUMN_COUNT = 10;

// Diferidos que corresponde mostrar: reales con el coordinador activo, "habría diferido" en modo prueba.
const useDeferredSource = (frequency: SchedulerFrequencyState | null) =>
	useMemo(() => {
		if (!frequency) return { counts: {} as Record<string, CampaignDeferredCount>, label: "Diferidos" };
		const dry = frequency.config.dryRun || !frequency.config.enabled;
		// Modo prueba: suma de lo que habría diferido en los días con contadores (hasta 14).
		// Activo: contactos con un paso diferido ahora mismo.
		return dry
			? { counts: frequency.wouldDefer, label: "Habría diferido (14 d)" }
			: { counts: frequency.deferred, label: "Diferidos ahora" };
	}, [frequency]);

const PriorityInput = ({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) => (
	<Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: { xs: 70, md: 190 } }}>
		<Slider
			size="small"
			value={value}
			min={0}
			max={100}
			step={5}
			onChange={(_, v) => onChange(v as number)}
			disabled={disabled}
			aria-label="Prioridad"
			sx={{ width: 110, display: { xs: "none", md: "block" } }}
		/>
		<TextField
			size="small"
			type="number"
			value={value}
			onChange={(e) => onChange(clampPriority(Number(e.target.value)))}
			inputProps={{ min: 0, max: 100, "aria-label": "Prioridad", style: { textAlign: "right", fontVariantNumeric: "tabular-nums" } }}
			disabled={disabled}
			sx={{ width: 72 }}
		/>
	</Stack>
);

const DeferredCell = ({
	count,
	label,
	resolveName,
}: {
	count?: CampaignDeferredCount;
	label: string;
	resolveName: (id: string) => string | undefined;
}) => {
	if (!count || count.total === 0) {
		return (
			<Typography variant="body2" color="text.secondary">
				0
			</Typography>
		);
	}
	return (
		<Tooltip
			title={
				<Box>
					<Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
						{label}
					</Typography>
					{Object.entries(count.byReason).map(([reason, n]) => (
						<Typography key={reason} variant="caption" sx={{ display: "block" }}>
							{reasonLabel(reason, resolveName)}: {n}
						</Typography>
					))}
				</Box>
			}
		>
			<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", textDecoration: "underline dotted", cursor: "help" }}>
				{count.total.toLocaleString("es-AR")}
			</Typography>
		</Tooltip>
	);
};

const ExemptControl = ({
	checked,
	byCategory,
	category,
	onChange,
	disabled,
}: {
	checked: boolean;
	byCategory: boolean;
	category?: string;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}) => {
	if (byCategory) {
		return (
			<Stack direction="row" spacing={0.5} alignItems="center">
				<Tooltip
					title={`Exenta porque su categoría (${category}) está en las categorías exentas de las reglas generales. Para que cuente, sacala de esa lista.`}
				>
					<span>
						<Switch size="small" checked disabled />
					</span>
				</Tooltip>
				<Chip size="small" label="Exenta por categoría" variant="outlined" color="secondary" />
			</Stack>
		);
	}
	return (
		<Switch
			size="small"
			checked={checked}
			onChange={(e) => onChange(e.target.checked)}
			disabled={disabled}
			inputProps={{ "aria-label": "Exenta" }}
		/>
	);
};

// ---------------- Fila editable de una campaña ----------------

interface PolicyRowProps {
	campaign: Campaign;
	exemptCategories: string[];
	deferred?: CampaignDeferredCount;
	deferredLabel: string;
	resolveName: (id: string) => string | undefined;
	onSaved: (c: Campaign) => void;
	nested?: boolean;
}

const PolicyRow = ({ campaign, exemptCategories, deferred, deferredLabel, resolveName, onSaved, nested }: PolicyRowProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const original = useMemo(() => getPolicy(campaign), [campaign]);
	const [draft, setDraft] = useState<FrequencyPolicy>(original);
	const [saving, setSaving] = useState(false);

	useEffect(() => setDraft(original), [original]);

	const dirty = !policiesEqual(original, draft);
	const byCategory = isExemptByCategory(campaign, exemptCategories);
	const status = CAMPAIGN_STATUS_CHIP[campaign.status] || { label: campaign.status, color: "default" as const };

	const save = async () => {
		if (!campaign._id) return;
		setSaving(true);
		try {
			const updated = await CampaignService.updateCampaign(campaign._id, { frequencyPolicy: toPolicyPayload(draft) });
			if (updated && !updated.frequencyPolicy) {
				enqueueSnackbar("El servicio guardó la campaña pero no devolvió la política: puede que todavía no tenga el campo frequencyPolicy", {
					variant: "warning",
				});
			} else {
				enqueueSnackbar(`Prioridad de "${campaign.name}" guardada`, { variant: "success" });
			}
			onSaved({ ...campaign, ...(updated || {}), frequencyPolicy: updated?.frequencyPolicy ?? draft });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || err?.response?.data?.message || "No se pudo guardar la prioridad", {
				variant: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<TableRow
			hover
			sx={{
				...(dirty && { bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.1 : 0.05) }),
				...(nested && { "& > td:first-of-type": { pl: 6 } }),
			}}
		>
			<TableCell sx={{ maxWidth: 320 }}>
				<Typography variant="subtitle2" noWrap title={campaign.name}>
					{campaign.name}
				</Typography>
			</TableCell>
			<TableCell sx={COL_SM}>{CAMPAIGN_TYPE_LABEL[campaign.type] || campaign.type}</TableCell>
			<TableCell>
				<Chip size="small" label={status.label} color={status.color} sx={status.color === "warning" ? WARNING_CHIP_SX : undefined} />
			</TableCell>
			<TableCell sx={COL_MD}>{campaign.category || "-"}</TableCell>
			<TableCell>
				<PriorityInput value={draft.priority} onChange={(v) => setDraft((d) => ({ ...d, priority: v }))} disabled={saving} />
			</TableCell>
			<TableCell>
				<ExemptControl
					checked={draft.exempt}
					byCategory={byCategory}
					category={campaign.category}
					onChange={(v) => setDraft((d) => ({ ...d, exempt: v }))}
					disabled={saving}
				/>
			</TableCell>
			<TableCell>
				<Switch
					size="small"
					checked={draft.pausesLowerPriority}
					onChange={(e) => setDraft((d) => ({ ...d, pausesLowerPriority: e.target.checked }))}
					disabled={saving}
					inputProps={{ "aria-label": "Pausa a las de menor prioridad" }}
				/>
			</TableCell>
			<TableCell>
				<Switch
					size="small"
					checked={draft.perishable}
					onChange={(e) => setDraft((d) => ({ ...d, perishable: e.target.checked }))}
					disabled={saving}
					inputProps={{ "aria-label": "Perecedera" }}
				/>
			</TableCell>
			<TableCell align="right">
				<DeferredCell count={deferred} label={deferredLabel} resolveName={resolveName} />
			</TableCell>
			<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
				<Tooltip title="Descartar cambios">
					<span>
						<IconButton size="small" disabled={!dirty || saving} onClick={() => setDraft(original)}>
							<RotateLeft size={16} />
						</IconButton>
					</span>
				</Tooltip>
				<LoadingButton
					size="small"
					variant={dirty ? "contained" : "outlined"}
					disabled={!dirty}
					loading={saving}
					onClick={save}
					startIcon={<TickCircle size={16} />}
					sx={{ textTransform: "none", ml: 0.5 }}
				>
					Guardar
				</LoadingButton>
			</TableCell>
		</TableRow>
	);
};

// ---------------- Fila resumen de los boletines SAIJ ----------------

interface SaijGroupProps {
	editions: Campaign[];
	exemptCategories: string[];
	deferredCounts: Record<string, CampaignDeferredCount>;
	deferredLabel: string;
	resolveName: (id: string) => string | undefined;
	onSaved: (c: Campaign) => void;
}

const SaijGroupRows = ({ editions, exemptCategories, deferredCounts, deferredLabel, resolveName, onSaved }: SaijGroupProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [open, setOpen] = useState(false);
	const [bulk, setBulk] = useState<FrequencyPolicy>(() => getPolicy(editions[0]));
	const [applying, setApplying] = useState(false);

	// Al abrir el grupo, el editor masivo arranca con la política de la edición más nueva.
	const toggle = () => {
		if (!open) setBulk(getPolicy(editions[0]));
		setOpen((o) => !o);
	};

	const priorities = editions.map((c) => getPolicy(c).priority);
	const minP = Math.min(...priorities);
	const maxP = Math.max(...priorities);
	const categories = Array.from(new Set(editions.map((c) => c.category || "-")));
	const allExemptByCategory = editions.every((c) => isExemptByCategory(c, exemptCategories));
	const statusCounts = editions.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }), {});
	const deferredTotal = editions.reduce((sum, c) => sum + (deferredCounts[c._id || ""]?.total || 0), 0);
	const mergedDeferred: CampaignDeferredCount | undefined =
		deferredTotal > 0
			? editions.reduce<CampaignDeferredCount>(
					(acc, c) => {
						const d = deferredCounts[c._id || ""];
						if (!d) return acc;
						acc.total += d.total;
						Object.entries(d.byReason).forEach(([r, n]) => (acc.byReason[r] = (acc.byReason[r] || 0) + n));
						return acc;
					},
					{ campaignId: "saij", total: 0, byReason: {} },
			  )
			: undefined;

	const pending = editions.filter((c) => !policiesEqual(getPolicy(c), bulk));

	const applyAll = async () => {
		setApplying(true);
		let ok = 0;
		let failed = 0;
		for (const c of pending) {
			if (!c._id) continue;
			try {
				const updated = await CampaignService.updateCampaign(c._id, { frequencyPolicy: toPolicyPayload(bulk) });
				onSaved({ ...c, ...(updated || {}), frequencyPolicy: updated?.frequencyPolicy ?? bulk });
				ok += 1;
			} catch {
				failed += 1;
			}
		}
		setApplying(false);
		if (failed === 0) enqueueSnackbar(`Política aplicada a ${ok} ediciones de SAIJ`, { variant: "success" });
		else enqueueSnackbar(`Aplicada a ${ok} ediciones; ${failed} fallaron`, { variant: "warning" });
	};

	return (
		<>
			<TableRow hover onClick={toggle} sx={{ cursor: "pointer", bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.06 : 0.03) }}>
				<TableCell sx={{ maxWidth: 320 }}>
					<Stack direction="row" spacing={0.5} alignItems="center">
						<IconButton size="small" aria-label={open ? "Contraer ediciones" : "Ver ediciones"}>
							{open ? <ArrowDown2 size={16} /> : <ArrowRight2 size={16} />}
						</IconButton>
						<Box sx={{ minWidth: 0 }}>
							<Typography variant="subtitle2" noWrap>
								Jurisprudencia SAIJ
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{editions.length} ediciones (una campaña única por boletín)
							</Typography>
						</Box>
					</Stack>
				</TableCell>
				<TableCell sx={COL_SM}>Única</TableCell>
				<TableCell>
					<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
						{Object.entries(statusCounts).map(([s, n]) => {
							const info = CAMPAIGN_STATUS_CHIP[s as Campaign["status"]] || { label: s, color: "default" as const };
							return (
								<Chip
									key={s}
									size="small"
									label={`${n} ${info.label.toLowerCase()}`}
									color={info.color}
									sx={info.color === "warning" ? WARNING_CHIP_SX : undefined}
								/>
							);
						})}
					</Stack>
				</TableCell>
				<TableCell sx={COL_MD}>{categories.join(", ")}</TableCell>
				<TableCell>
					<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
						{minP === maxP ? minP : `${minP}–${maxP}`}
					</Typography>
				</TableCell>
				<TableCell>
					{allExemptByCategory ? (
						<Chip size="small" label="Exenta por categoría" variant="outlined" color="secondary" />
					) : (
						<Typography variant="body2" color="text.secondary">
							{editions.filter((c) => getPolicy(c).exempt).length} de {editions.length}
						</Typography>
					)}
				</TableCell>
				<TableCell>
					<Typography variant="body2" color="text.secondary">
						{editions.filter((c) => getPolicy(c).pausesLowerPriority).length}
					</Typography>
				</TableCell>
				<TableCell>
					<Typography variant="body2" color="text.secondary">
						{editions.filter((c) => getPolicy(c).perishable).length}
					</Typography>
				</TableCell>
				<TableCell align="right">
					<DeferredCell count={mergedDeferred} label={deferredLabel} resolveName={resolveName} />
				</TableCell>
				<TableCell align="right">
					<Typography variant="caption" color="primary">
						{open ? "Ocultar" : "Ver ediciones"}
					</Typography>
				</TableCell>
			</TableRow>
			{open && (
				<TableRow>
					<TableCell colSpan={COLUMN_COUNT} sx={{ bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.04 : 0.02) }}>
						<Typography variant="subtitle2" gutterBottom>
							Misma política para todas las ediciones
						</Typography>
						<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
							<PriorityInput value={bulk.priority} onChange={(v) => setBulk((b) => ({ ...b, priority: v }))} disabled={applying} />
							{!allExemptByCategory && (
								<FormControlLabel
									control={
										<Switch size="small" checked={bulk.exempt} onChange={(e) => setBulk((b) => ({ ...b, exempt: e.target.checked }))} />
									}
									label="Exenta"
								/>
							)}
							<FormControlLabel
								control={
									<Switch
										size="small"
										checked={bulk.pausesLowerPriority}
										onChange={(e) => setBulk((b) => ({ ...b, pausesLowerPriority: e.target.checked }))}
									/>
								}
								label="Pausa a las de menor prioridad"
							/>
							<FormControlLabel
								control={
									<Switch
										size="small"
										checked={bulk.perishable}
										onChange={(e) => setBulk((b) => ({ ...b, perishable: e.target.checked }))}
									/>
								}
								label="Perecedera"
							/>
							<LoadingButton
								size="small"
								variant="contained"
								loading={applying}
								disabled={pending.length === 0}
								onClick={applyAll}
								sx={{ textTransform: "none" }}
							>
								{pending.length === 0 ? "Todas iguales" : `Aplicar a ${pending.length} ediciones`}
							</LoadingButton>
						</Stack>
						<Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
							Las ediciones nuevas las crea worker_SAIJ_0 con la política por defecto; si su categoría es exenta, igual quedan fuera del
							tope. Abajo, cada edición por separado.
						</Typography>
					</TableCell>
				</TableRow>
			)}
			{open &&
				editions.map((c) => (
					<PolicyRow
						key={c._id}
						campaign={c}
						exemptCategories={exemptCategories}
						deferred={deferredCounts[c._id || ""]}
						deferredLabel={deferredLabel}
						resolveName={resolveName}
						onSaved={onSaved}
						nested
					/>
				))}
		</>
	);
};

// ---------------- Tabla ----------------

const PrioritiesTable: React.FC<PrioritiesTableProps> = ({ campaigns, frequency, onCampaignUpdated }) => {
	const [showClosed, setShowClosed] = useState(false);
	const [search, setSearch] = useState("");
	const exemptCategories = frequency?.config.exemptCategories ?? DEFAULT_FREQUENCY_CONFIG.exemptCategories;
	const { counts: deferredCounts, label: deferredLabel } = useDeferredSource(frequency);

	const nameById = useMemo(() => new Map(campaigns.map((c) => [c._id || "", c.name])), [campaigns]);
	const resolveName = (id: string) => nameById.get(id) || frequency?.campaignNames[id];

	const { rows, saij } = useMemo(() => {
		const term = search.trim().toLowerCase();
		const visible = campaigns.filter(
			(c) =>
				(showClosed || OPEN_STATUSES.includes(c.status)) &&
				(!term || c.name.toLowerCase().includes(term) || (c.category || "").toLowerCase().includes(term)),
		);
		const byPriority = (a: Campaign, b: Campaign) => getPolicy(b).priority - getPolicy(a).priority || a.name.localeCompare(b.name, "es");
		const saijEditions = visible
			.filter(isSaijEdition)
			.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
		return { rows: visible.filter((c) => !isSaijEdition(c)).sort(byPriority), saij: saijEditions };
	}, [campaigns, showClosed, search]);

	// Posición del grupo SAIJ dentro del orden por prioridad (según su prioridad máxima).
	const saijPriority = saij.length > 0 ? Math.max(...saij.map((c) => getPolicy(c).priority)) : -1;
	const saijIndex = saij.length > 0 ? rows.findIndex((c) => getPolicy(c).priority < saijPriority) : -1;
	const insertAt = saijIndex === -1 ? rows.length : saijIndex;

	const renderRow = (c: Campaign) => (
		<PolicyRow
			key={c._id}
			campaign={c}
			exemptCategories={exemptCategories}
			deferred={deferredCounts[c._id || ""]}
			deferredLabel={deferredLabel}
			resolveName={resolveName}
			onSaved={onCampaignUpdated}
		/>
	);

	return (
		<MainCard
			content={false}
			title={<Typography variant="h5">Prioridades</Typography>}
			secondary={
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
					<TextField
						size="small"
						placeholder="Buscar campaña"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						InputProps={{ startAdornment: <SearchNormal1 size={16} style={{ marginRight: 6 }} /> }}
						sx={{ width: 190 }}
					/>
					<FormControlLabel
						control={<Switch size="small" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />}
						label={<Typography variant="body2">Completadas y archivadas</Typography>}
					/>
				</Stack>
			}
		>
			<Box sx={{ px: 2.5, py: 1.5 }}>
				<Typography variant="body2" color="text.secondary">
					De mayor a menor prioridad. Cuando dos campañas quieren escribirle a la misma persona el mismo día, gana la de mayor prioridad y
					la otra se difiere. Cada fila se guarda por separado.{" "}
					{frequency && (
						<>
							{!frequency.config.enabled
								? "Con el coordinador apagado no se cuenta nada nuevo; la última columna muestra lo que quedó de los últimos 14 días."
								: frequency.config.dryRun
								? "La última columna suma lo que el coordinador habría diferido en los últimos 14 días (modo prueba)."
								: "La última columna cuenta los contactos que tienen un paso diferido ahora mismo."}
						</>
					)}
				</Typography>
			</Box>
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 980 }}>
					<TableHead>
						<TableRow>
							<TableCell>Campaña</TableCell>
							<TableCell sx={COL_SM}>Tipo</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell sx={COL_MD}>Categoría</TableCell>
							<TableCell>
								<Tooltip title="0 a 100. Por defecto 50. La de mayor prioridad gana el lugar del día y lo reserva si su paso vence pronto.">
									<span>Prioridad</span>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Tooltip title="No cuenta para el tope por persona ni se difiere. Para avisos legales u operativos que tienen que salir sí o sí.">
									<span>Exenta</span>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Tooltip title="Mientras el contacto esté activo en esta campaña, las de menor prioridad no exentas no le envían: sus pasos esperan y retoman al terminar.">
									<span>Pausa a menores</span>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Tooltip title="Si el correo no entra por el tope, se saltea para ese contacto en vez de diferirse (boletines con fecha).">
									<span>Perecedera</span>
								</Tooltip>
							</TableCell>
							<TableCell align="right">{deferredLabel}</TableCell>
							<TableCell align="right" />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.length === 0 && saij.length === 0 ? (
							<TableRow>
								<TableCell colSpan={COLUMN_COUNT} align="center" sx={{ py: 3 }}>
									<Typography variant="body2" color="text.secondary">
										No hay campañas para mostrar
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							<>
								{rows.slice(0, insertAt).map(renderRow)}
								{saij.length > 0 && (
									<SaijGroupRows
										editions={saij}
										exemptCategories={exemptCategories}
										deferredCounts={deferredCounts}
										deferredLabel={deferredLabel}
										resolveName={resolveName}
										onSaved={onCampaignUpdated}
									/>
								)}
								{rows.slice(insertAt).map(renderRow)}
							</>
						)}
					</TableBody>
				</Table>
			</TableContainer>
		</MainCard>
	);
};

export default PrioritiesTable;
