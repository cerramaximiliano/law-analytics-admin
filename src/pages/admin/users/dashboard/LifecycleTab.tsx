import React, { useEffect, useState, useCallback } from "react";
import {
	Grid,
	Typography,
	Box,
	Skeleton,
	IconButton,
	Tooltip,
	useTheme,
	alpha,
	Paper,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Stack,
	Alert,
	LinearProgress,
	FormControlLabel,
	Switch,
	Select,
	MenuItem,
	TextField,
	Button,
	Divider,
} from "@mui/material";
import { Refresh, UserRemove, Sms, Trash, Setting2, Save2, Warning2 } from "iconsax-react";
import dayjs from "dayjs";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";
import UserLifecycleService, {
	UserLifecycleAction,
	UserLifecycleConfig,
	UserLifecycleOverview,
	UserLifecycleSnapshot,
} from "api/userLifecycle";
import { useSnackbar } from "notistack";

const fmtNum = (n: number | undefined | null): string => new Intl.NumberFormat("es-AR").format(n || 0);

const ACTION_LABELS: Record<UserLifecycleAction["action"], { label: string; color: "info" | "error" | "warning" }> = {
	reminder_sent: { label: "Reminder enviado", color: "info" },
	user_purged: { label: "Usuario purgado", color: "error" },
	purge_skipped_has_data: { label: "Purga salteada (tiene datos)", color: "warning" },
};

const ROWS_PER_PAGE = 10;

interface MiniStatProps {
	title: string;
	value: string;
	subtitle?: React.ReactNode;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const MiniStat: React.FC<MiniStatProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper variant="outlined" sx={{ p: 2, height: "100%", borderColor: theme.palette.divider }}>
			{loading ? (
				<Skeleton variant="rounded" height={64} />
			) : (
				<Stack direction="row" spacing={1.5} alignItems="flex-start">
					<Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(color, 0.1), color, display: "flex" }}>{icon}</Box>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
							{title}
						</Typography>
						<Typography variant="h3">{value}</Typography>
						{subtitle && (
							<Typography variant="caption" color="text.secondary" component="div">
								{subtitle}
							</Typography>
						)}
					</Box>
				</Stack>
			)}
		</Paper>
	);
};

// Draft del form: números como string para permitir edición libre antes de validar
interface ConfigDraft {
	enabled: boolean;
	dryRun: boolean;
	excludeEmailPatterns: string;
	reminderEnabled: boolean;
	reminderMinAgeDays: string;
	reminderMaxAgeDays: string;
	reminderBatchLimit: string;
	purgeNoticeGraceDays: string;
	purgeEnabled: boolean;
	purgeMinAgeDays: string;
	purgeBatchLimit: string;
	purgeHoldUntil: string;
	updateMarketingContact: boolean;
	statsEnabled: boolean;
}

const configToDraft = (config: UserLifecycleConfig): ConfigDraft => ({
	enabled: config.enabled,
	dryRun: config.dryRun,
	excludeEmailPatterns: (config.excludeEmailPatterns || []).join("\n"),
	reminderEnabled: config.verificationReminder.enabled,
	reminderMinAgeDays: String(config.verificationReminder.minAgeDays),
	reminderMaxAgeDays: String(config.verificationReminder.maxAgeDays),
	reminderBatchLimit: String(config.verificationReminder.batchLimit),
	purgeNoticeGraceDays: String(config.verificationReminder.purgeNoticeGraceDays),
	purgeEnabled: config.purge.enabled,
	purgeMinAgeDays: String(config.purge.minAgeDays),
	purgeBatchLimit: String(config.purge.batchLimit),
	purgeHoldUntil: config.purge.holdUntil ? dayjs(config.purge.holdUntil).format("YYYY-MM-DD") : "",
	updateMarketingContact: config.purge.updateMarketingContact,
	statsEnabled: config.stats.enabled,
});

const LifecycleTab: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [error, setError] = useState<string | null>(null);

	const [overview, setOverview] = useState<UserLifecycleOverview | null>(null);
	const [overviewLoading, setOverviewLoading] = useState<boolean>(true);

	const [config, setConfig] = useState<UserLifecycleConfig | null>(null);
	const [draft, setDraft] = useState<ConfigDraft | null>(null);
	const [configLoading, setConfigLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);

	const [snapshots, setSnapshots] = useState<UserLifecycleSnapshot[]>([]);
	const [snapshotsLoading, setSnapshotsLoading] = useState<boolean>(true);

	const [actions, setActions] = useState<UserLifecycleAction[]>([]);
	const [actionsTotal, setActionsTotal] = useState<number>(0);
	const [actionsPage, setActionsPage] = useState<number>(0);
	const [actionsFilter, setActionsFilter] = useState<string>("");
	const [actionsLoading, setActionsLoading] = useState<boolean>(true);

	const fetchOverview = useCallback(async () => {
		try {
			setOverviewLoading(true);
			setOverview(await UserLifecycleService.getOverview());
		} catch (err: any) {
			setError(err.message);
		} finally {
			setOverviewLoading(false);
		}
	}, []);

	const fetchConfig = useCallback(async () => {
		try {
			setConfigLoading(true);
			const data = await UserLifecycleService.getConfig();
			setConfig(data);
			setDraft(configToDraft(data));
		} catch (err: any) {
			setError(err.message);
		} finally {
			setConfigLoading(false);
		}
	}, []);

	const fetchSnapshots = useCallback(async () => {
		try {
			setSnapshotsLoading(true);
			setSnapshots(await UserLifecycleService.getStats(14));
		} catch (err: any) {
			setError(err.message);
		} finally {
			setSnapshotsLoading(false);
		}
	}, []);

	const fetchActions = useCallback(async () => {
		try {
			setActionsLoading(true);
			const { data, pagination } = await UserLifecycleService.getActions({
				action: (actionsFilter || undefined) as UserLifecycleAction["action"] | undefined,
				page: actionsPage + 1,
				limit: ROWS_PER_PAGE,
			});
			setActions(data);
			setActionsTotal(pagination.total);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setActionsLoading(false);
		}
	}, [actionsFilter, actionsPage]);

	useEffect(() => {
		fetchOverview();
		fetchConfig();
		fetchSnapshots();
	}, [fetchOverview, fetchConfig, fetchSnapshots]);

	useEffect(() => {
		fetchActions();
	}, [fetchActions]);

	const handleRefresh = () => {
		fetchOverview();
		fetchConfig();
		fetchSnapshots();
		fetchActions();
	};

	const handleSave = async () => {
		if (!draft) return;
		const numbers: Record<string, number> = {};
		for (const [key, raw] of Object.entries({
			reminderMinAgeDays: draft.reminderMinAgeDays,
			reminderMaxAgeDays: draft.reminderMaxAgeDays,
			reminderBatchLimit: draft.reminderBatchLimit,
			purgeNoticeGraceDays: draft.purgeNoticeGraceDays,
			purgeMinAgeDays: draft.purgeMinAgeDays,
			purgeBatchLimit: draft.purgeBatchLimit,
		})) {
			const n = parseInt(raw, 10);
			if (Number.isNaN(n) || n < 1) {
				enqueueSnackbar("Todos los campos numéricos deben ser enteros positivos", { variant: "error" });
				return;
			}
			numbers[key] = n;
		}
		if (numbers.reminderMinAgeDays >= numbers.reminderMaxAgeDays) {
			enqueueSnackbar("La edad mínima del reminder debe ser menor que la máxima", { variant: "error" });
			return;
		}

		try {
			setSaving(true);
			const updated = await UserLifecycleService.updateConfig({
				enabled: draft.enabled,
				dryRun: draft.dryRun,
				excludeEmailPatterns: draft.excludeEmailPatterns
					.split(/[\n,]/)
					.map((p) => p.trim())
					.filter(Boolean),
				verificationReminder: {
					enabled: draft.reminderEnabled,
					minAgeDays: numbers.reminderMinAgeDays,
					maxAgeDays: numbers.reminderMaxAgeDays,
					batchLimit: numbers.reminderBatchLimit,
					purgeNoticeGraceDays: numbers.purgeNoticeGraceDays,
				},
				purge: {
					enabled: draft.purgeEnabled,
					minAgeDays: numbers.purgeMinAgeDays,
					batchLimit: numbers.purgeBatchLimit,
					holdUntil: draft.purgeHoldUntil ? dayjs(draft.purgeHoldUntil).endOf("day").toISOString() : null,
					updateMarketingContact: draft.updateMarketingContact,
				},
				stats: { enabled: draft.statsEnabled },
			});
			setConfig(updated);
			setDraft(configToDraft(updated));
			enqueueSnackbar("Configuración del ciclo de vida actualizada", { variant: "success" });
			fetchOverview();
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al guardar la configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const dirty = config !== null && draft !== null && JSON.stringify(configToDraft(config)) !== JSON.stringify(draft);
	const buckets = overview?.unverifiedByAge;

	const numberField = (label: string, key: keyof ConfigDraft, helper?: string) => (
		<TextField
			label={label}
			size="small"
			type="number"
			fullWidth
			value={draft ? (draft[key] as string) : ""}
			onChange={(e) => draft && setDraft({ ...draft, [key]: e.target.value })}
			helperText={helper}
			inputProps={{ min: 1 }}
		/>
	);

	return (
		<Box>
			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
				<Typography variant="caption" color="text.secondary">
					Cron diario la-user-lifecycle (09:00 ART en el hub) — reminder de verificación, purga de cuentas muertas y snapshot de stats.
					Los cambios de configuración aplican en la próxima corrida.
				</Typography>
				<Tooltip title="Refrescar">
					<IconButton onClick={handleRefresh}>
						<Refresh size={20} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* Estado vivo */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<MiniStat
						title="Sin verificar"
						value={fmtNum(overview?.totals.unverified)}
						subtitle={
							buckets
								? `7-30d: ${buckets.d7to30} · 30-90d: ${buckets.d30to90} · +90d: ${buckets.d90to180 + buckets.over180d + buckets.noCreatedAt}`
								: undefined
						}
						icon={<UserRemove size={22} variant="Bold" />}
						color={STALE_AMBER}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MiniStat
						title="Elegibles reminder hoy"
						value={fmtNum(overview?.eligibleNow.reminder)}
						subtitle={`${fmtNum(overview?.lifetime.remindersSent)} enviados en total`}
						icon={<Sms size={22} variant="Bold" />}
						color={BRAND_BLUE}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MiniStat
						title="Elegibles purga hoy"
						value={fmtNum(overview?.eligibleNow.purge)}
						subtitle={
							overview?.purgeOnHold ? (
								<Chip
									size="small"
									icon={<Warning2 size={14} />}
									label={`En espera hasta ${dayjs(overview.holdUntil).format("DD/MM/YY")}`}
									color="warning"
									variant="outlined"
								/>
							) : (
								`${fmtNum(overview?.lifetime.usersPurged)} purgados en total`
							)
						}
						icon={<Trash size={22} variant="Bold" />}
						color={STALE_AMBER}
						loading={overviewLoading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<MiniStat
						title="Cuentas test excluidas"
						value={fmtNum(overview?.totals.testAccounts)}
						subtitle={`${fmtNum(overview?.totals.users)} usuarios reales`}
						icon={<Setting2 size={22} variant="Bold" />}
						color={LIVE_GREEN}
						loading={overviewLoading}
					/>
				</Grid>
			</Grid>

			{/* Configuración */}
			<Paper variant="outlined" sx={{ p: 2.5, mt: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
					<Typography variant="h5">Configuración del cron</Typography>
					<Button
						variant="contained"
						size="small"
						startIcon={<Save2 size={16} />}
						onClick={handleSave}
						disabled={!dirty || saving || configLoading}
					>
						{saving ? "Guardando..." : "Guardar cambios"}
					</Button>
				</Stack>
				{configLoading || !draft ? (
					<Skeleton variant="rounded" height={220} />
				) : (
					<Grid container spacing={2}>
						<Grid item xs={12}>
							<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
								<FormControlLabel
									control={<Switch checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />}
									label="Servicio habilitado"
								/>
								<FormControlLabel
									control={<Switch checked={draft.dryRun} onChange={(e) => setDraft({ ...draft, dryRun: e.target.checked })} />}
									label="Dry-run (simular sin enviar ni borrar)"
								/>
								<FormControlLabel
									control={<Switch checked={draft.statsEnabled} onChange={(e) => setDraft({ ...draft, statsEnabled: e.target.checked })} />}
									label="Snapshot de stats"
								/>
							</Stack>
						</Grid>

						<Grid item xs={12} md={6}>
							<Divider textAlign="left" sx={{ mb: 1.5 }}>
								<Chip size="small" label="Reminder de verificación" />
							</Divider>
							<Stack spacing={1.5}>
								<FormControlLabel
									control={
										<Switch checked={draft.reminderEnabled} onChange={(e) => setDraft({ ...draft, reminderEnabled: e.target.checked })} />
									}
									label="Enviar reminders"
								/>
								<Stack direction="row" spacing={1.5}>
									{numberField("Edad mínima (días)", "reminderMinAgeDays")}
									{numberField("Edad máxima (días)", "reminderMaxAgeDays")}
								</Stack>
								<Stack direction="row" spacing={1.5}>
									{numberField("Batch por corrida", "reminderBatchLimit")}
									{numberField("Gracia post-aviso (días)", "purgeNoticeGraceDays", "Días prometidos en el email antes de purgar")}
								</Stack>
							</Stack>
						</Grid>

						<Grid item xs={12} md={6}>
							<Divider textAlign="left" sx={{ mb: 1.5 }}>
								<Chip size="small" label="Purga de no verificados" />
							</Divider>
							<Stack spacing={1.5}>
								<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
									<FormControlLabel
										control={<Switch checked={draft.purgeEnabled} onChange={(e) => setDraft({ ...draft, purgeEnabled: e.target.checked })} />}
										label="Purgar"
									/>
									<FormControlLabel
										control={
											<Switch
												checked={draft.updateMarketingContact}
												onChange={(e) => setDraft({ ...draft, updateMarketingContact: e.target.checked })}
											/>
										}
										label="Desactivar contacto de marketing"
									/>
								</Stack>
								<Stack direction="row" spacing={1.5}>
									{numberField("Edad mínima (días)", "purgeMinAgeDays")}
									{numberField("Batch por corrida", "purgeBatchLimit")}
								</Stack>
								<TextField
									label="Purga en espera hasta"
									size="small"
									type="date"
									fullWidth
									value={draft.purgeHoldUntil}
									onChange={(e) => setDraft({ ...draft, purgeHoldUntil: e.target.value })}
									InputLabelProps={{ shrink: true }}
									helperText="Vacío = sin espera. La purga no corre antes de esta fecha."
								/>
							</Stack>
						</Grid>

						<Grid item xs={12}>
							<TextField
								label="Exclusiones (emails o patrones, uno por línea)"
								size="small"
								fullWidth
								multiline
								minRows={2}
								value={draft.excludeEmailPatterns}
								onChange={(e) => setDraft({ ...draft, excludeEmailPatterns: e.target.value })}
								helperText="Match por substring, case-insensitive. Además se excluyen automáticamente las cuentas con isTestAccount=true."
							/>
						</Grid>
					</Grid>
				)}
			</Paper>

			{/* Auditoría */}
			<Paper variant="outlined" sx={{ p: 2.5, mt: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
					<Typography variant="h5">Auditoría</Typography>
					<Select
						size="small"
						displayEmpty
						value={actionsFilter}
						onChange={(e) => {
							setActionsPage(0);
							setActionsFilter(e.target.value);
						}}
						sx={{ minWidth: 220 }}
					>
						<MenuItem value="">Todas las acciones</MenuItem>
						<MenuItem value="reminder_sent">Reminders enviados</MenuItem>
						<MenuItem value="user_purged">Usuarios purgados</MenuItem>
						<MenuItem value="purge_skipped_has_data">Purgas salteadas</MenuItem>
					</Select>
				</Stack>
				{actionsLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Acción</TableCell>
								<TableCell>Email</TableCell>
								<TableCell>Detalle</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!actionsLoading && actions.length === 0 && (
								<TableRow>
									<TableCell colSpan={4} align="center">
										<Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
											Sin acciones registradas
										</Typography>
									</TableCell>
								</TableRow>
							)}
							{actions.map((a) => (
								<TableRow key={a._id} hover>
									<TableCell>{dayjs(a.at).format("DD/MM/YY HH:mm")}</TableCell>
									<TableCell>
										<Chip size="small" label={ACTION_LABELS[a.action]?.label || a.action} color={ACTION_LABELS[a.action]?.color} variant="outlined" />
									</TableCell>
									<TableCell>{a.email}</TableCell>
									<TableCell>
										<Typography variant="caption" color="text.secondary">
											{a.meta ? JSON.stringify(a.meta) : "—"}
										</Typography>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				<TablePagination
					component="div"
					count={actionsTotal}
					page={actionsPage}
					onPageChange={(_, p) => setActionsPage(p)}
					rowsPerPage={ROWS_PER_PAGE}
					rowsPerPageOptions={[ROWS_PER_PAGE]}
				/>
			</Paper>

			{/* Snapshots */}
			<Paper variant="outlined" sx={{ p: 2.5, mt: 3 }}>
				<Typography variant="h5" sx={{ mb: 1.5 }}>
					Snapshots diarios
				</Typography>
				{snapshotsLoading && <LinearProgress sx={{ mb: 1 }} />}
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell align="right">Usuarios</TableCell>
								<TableCell align="right">Verificados</TableCell>
								<TableCell align="right">Sin verificar</TableCell>
								<TableCell align="right">Reminders (día)</TableCell>
								<TableCell align="right">Purgados (día)</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!snapshotsLoading && snapshots.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} align="center">
										<Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
											Todavía no hay snapshots — el cron los genera a diario
										</Typography>
									</TableCell>
								</TableRow>
							)}
							{snapshots.map((s) => (
								<TableRow key={s._id} hover>
									<TableCell>{dayjs(s.date).format("DD/MM/YY")}</TableCell>
									<TableCell align="right">{fmtNum(s.totals.users)}</TableCell>
									<TableCell align="right">{fmtNum(s.totals.verified)}</TableCell>
									<TableCell align="right">{fmtNum(s.totals.unverified)}</TableCell>
									<TableCell align="right">{fmtNum(s.today.remindersSent)}</TableCell>
									<TableCell align="right">{fmtNum(s.today.usersPurged)}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			</Paper>
		</Box>
	);
};

export default LifecycleTab;
