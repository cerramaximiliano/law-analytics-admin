import React, { useEffect, useState, useCallback } from "react";
import { Box, Stack, Typography, Paper, Skeleton, Tooltip, IconButton, useTheme, alpha, Chip, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Refresh, TaskSquare, MessageQuestion, MessageText1, Archive } from "iconsax-react";
import AdminTasksService from "api/adminTasks";
import SupportContactsService, { SupportContact } from "api/supportContacts";
import FeedbackService, { UserFeedback } from "api/feedback";
import { AdminTask } from "types/admin-task";
import { useSnackbar } from "notistack";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Pendientes del equipo: tareas próximas a vencer (o vencidas), consultas de
// soporte sin resolver y feedback de usuarios sin moderar. Cada columna carga
// por separado: si una falla, las otras se siguen mostrando.
// ----------------------------------------------------------------------

const DUE_WINDOW_DAYS = 7;
const MAX_ROWS = 5;
const CLOSED_TASK_STATUSES = ["completed", "cancelled"];

const PRIORITY_LABEL: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente" };
const FEEDBACK_TYPE_LABEL: Record<string, string> = {
	comment: "Comentario",
	survey_response: "Encuesta",
	nps: "NPS",
	rating: "Valoración",
	suggestion: "Sugerencia",
	bug: "Bug",
};

interface ColumnState<T> {
	loading: boolean;
	error: string | null;
	items: T[];
	total: number;
}

const initialColumn = <T,>(): ColumnState<T> => ({ loading: true, error: null, items: [], total: 0 });

const daysUntil = (iso: string): number => {
	const due = new Date(iso);
	const today = new Date();
	due.setHours(0, 0, 0, 0);
	today.setHours(0, 0, 0, 0);
	return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const PendingWorkWidget: React.FC = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();

	const [tasks, setTasks] = useState<ColumnState<AdminTask>>(initialColumn<AdminTask>());
	const [support, setSupport] = useState<ColumnState<SupportContact>>(initialColumn<SupportContact>());
	const [feedback, setFeedback] = useState<ColumnState<UserFeedback>>(initialColumn<UserFeedback>());

	const fetchTasks = useCallback(async () => {
		setTasks((s) => ({ ...s, loading: true, error: null }));
		try {
			const dueTo = new Date();
			dueTo.setDate(dueTo.getDate() + DUE_WINDOW_DAYS);
			dueTo.setHours(23, 59, 59, 999);
			const res = await AdminTasksService.getTasks({
				limit: 50,
				sortBy: "dueDate",
				sortOrder: "asc",
				dueDateTo: dueTo.toISOString(),
			});
			const open = (res.data || []).filter((t) => t.dueDate && !CLOSED_TASK_STATUSES.includes(t.status));
			setTasks({ loading: false, error: null, items: open.slice(0, MAX_ROWS), total: open.length });
		} catch (e: any) {
			setTasks({ loading: false, error: e?.message || "Error al cargar tareas", items: [], total: 0 });
		}
	}, []);

	const fetchSupport = useCallback(async () => {
		setSupport((s) => ({ ...s, loading: true, error: null }));
		try {
			const res = await SupportContactsService.getSupportContacts({
				status: "pending",
				limit: MAX_ROWS,
				sortBy: "createdAt",
				sortOrder: "asc",
			});
			setSupport({ loading: false, error: null, items: res.data || [], total: res.pagination?.totalItems ?? (res.data || []).length });
		} catch (e: any) {
			setSupport({ loading: false, error: e?.message || "Error al cargar soporte", items: [], total: 0 });
		}
	}, []);

	const fetchFeedback = useCallback(async () => {
		setFeedback((s) => ({ ...s, loading: true, error: null }));
		try {
			const res = await FeedbackService.list({ status: "pending", limit: MAX_ROWS, sortBy: "createdAt", sortOrder: "asc" });
			setFeedback({ loading: false, error: null, items: res.items || [], total: res.total ?? (res.items || []).length });
		} catch (e: any) {
			setFeedback({ loading: false, error: e?.message || "Error al cargar feedback", items: [], total: 0 });
		}
	}, []);

	// Archivar = salir de "pendientes" sin borrar el registro (reversible desde /admin/feedback).
	const archiveFeedback = useCallback(
		async (id: string) => {
			try {
				await FeedbackService.bulkStatus([id], "archived");
				setFeedback((s) => ({ ...s, items: s.items.filter((f) => f._id !== id), total: Math.max(0, s.total - 1) }));
				enqueueSnackbar("Feedback archivado", { variant: "success" });
			} catch (e: any) {
				enqueueSnackbar(e?.message || "No se pudo archivar el feedback", { variant: "error" });
			}
		},
		[enqueueSnackbar],
	);

	const refreshAll = useCallback(() => {
		fetchTasks();
		fetchSupport();
		fetchFeedback();
	}, [fetchTasks, fetchSupport, fetchFeedback]);

	useEffect(() => {
		refreshAll();
	}, [refreshAll]);

	const anyLoading = tasks.loading || support.loading || feedback.loading;

	const dueAccent = (iso: string): string | undefined => {
		const d = daysUntil(iso);
		return d < 0 ? theme.palette.error.main : d <= 1 ? theme.palette.warning.main : undefined;
	};

	const dueChip = (iso: string) => {
		const d = daysUntil(iso);
		const label = d < 0 ? `Vencida hace ${-d} d` : d === 0 ? "Vence hoy" : d === 1 ? "Vence mañana" : `En ${d} d`;
		const color = d < 0 ? theme.palette.error.main : d <= 1 ? theme.palette.warning.main : theme.palette.text.secondary;
		return (
			<Chip
				size="small"
				label={label}
				sx={{ height: 18, fontSize: "0.65rem", bgcolor: alpha(color, 0.12), color, fontWeight: 600, flexShrink: 0 }}
			/>
		);
	};

	const renderColumn = <T,>(opts: {
		title: string;
		icon: React.ReactNode;
		state: ColumnState<T>;
		linkTo: string;
		empty: string;
		row: (item: T) => { key: string; primary: string; secondary: string; trailing: React.ReactNode; accent?: string };
		onDismiss?: (item: T) => void;
		dismissLabel?: string;
	}) => {
		const { title, icon, state, linkTo, empty, row, onDismiss, dismissLabel } = opts;
		return (
			<Box sx={{ height: "100%" }}>
				<Box
					onClick={() => navigate(linkTo)}
					sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, cursor: "pointer" }}
					title={`Ir a ${title}`}
				>
					<Box
						sx={{
							width: 24,
							height: 24,
							borderRadius: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.08),
							color: BRAND_BLUE,
						}}
					>
						{icon}
					</Box>
					<Typography variant="subtitle2" fontWeight="bold">
						{title}
					</Typography>
					{!state.loading && !state.error && state.total > 0 && (
						<Chip
							size="small"
							label={state.total}
							sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
						/>
					)}
				</Box>
				{state.loading ? (
					<Skeleton variant="rectangular" height={110} sx={{ borderRadius: 1 }} />
				) : state.error ? (
					<Typography color="error" variant="caption">
						{state.error}
					</Typography>
				) : state.items.length === 0 ? (
					<Stack direction="row" alignItems="center" spacing={0.75}>
						<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: theme.palette.success.main, flexShrink: 0 }} />
						<Typography variant="caption" color="text.secondary">
							{empty}
						</Typography>
					</Stack>
				) : (
					<Stack spacing={0.75}>
						{state.items.map((item) => {
							const r = row(item);
							return (
								<Box
									key={r.key}
									onClick={() => navigate(linkTo)}
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 1,
										px: 1,
										py: 0.5,
										borderRadius: 1,
										cursor: "pointer",
										border: `1px solid ${headerBorder(isDark)}`,
										borderLeft: `3px solid ${r.accent || headerBorder(isDark)}`,
										transition: "background-color 200ms ease, transform 200ms ease",
										"&:active": { transform: "scale(0.995)" },
										"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.12 : 0.05) },
									}}
								>
									<Box sx={{ minWidth: 0 }}>
										<Typography variant="caption" fontWeight={600} noWrap display="block" sx={{ letterSpacing: "-0.005em" }}>
											{r.primary}
										</Typography>
										<Typography variant="caption" color="text.secondary" noWrap display="block">
											{r.secondary}
										</Typography>
									</Box>
									<Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
										{r.trailing}
										{onDismiss && (
											<Tooltip title={dismissLabel || "Quitar de la lista"}>
												<IconButton
													size="small"
													onClick={(e) => {
														e.stopPropagation();
														onDismiss(item);
													}}
													sx={{ p: 0.25 }}
												>
													<Archive size={14} />
												</IconButton>
											</Tooltip>
										)}
									</Stack>
								</Box>
							);
						})}
						{state.total > state.items.length && (
							<Typography variant="caption" color="primary" sx={{ cursor: "pointer" }} onClick={() => navigate(linkTo)}>
								Ver {state.total - state.items.length} más
							</Typography>
						)}
					</Stack>
				)}
			</Box>
		);
	};

	return (
		<Paper
			elevation={0}
			sx={{ position: "relative", p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, border: `1px solid ${headerBorder(isDark)}`, height: "100%" }}
		>
			<Tooltip title="Actualizar">
				<IconButton size="small" onClick={refreshAll} disabled={anyLoading} sx={{ position: "absolute", top: 8, right: 8 }}>
					<Refresh size={18} />
				</IconButton>
			</Tooltip>
			<Grid container spacing={{ xs: 2, md: 3 }}>
				<Grid item xs={12} md={4}>
					{renderColumn<AdminTask>({
						title: "Tareas por vencer",
						icon: <TaskSquare size={14} />,
						state: tasks,
						linkTo: "/admin/tasks",
						empty: `Nada vence en los próximos ${DUE_WINDOW_DAYS} días.`,
						row: (t) => ({
							key: t._id,
							primary: t.title,
							secondary: PRIORITY_LABEL[t.priority] ? `Prioridad ${PRIORITY_LABEL[t.priority].toLowerCase()}` : t.priority,
							trailing: t.dueDate ? dueChip(t.dueDate) : null,
							accent: t.dueDate ? dueAccent(t.dueDate) : undefined,
						}),
					})}
				</Grid>
				<Grid item xs={12} md={4}>
					{renderColumn<SupportContact>({
						title: "Soporte pendiente",
						icon: <MessageQuestion size={14} />,
						state: support,
						linkTo: "/admin/support",
						empty: "Soporte al día, sin consultas pendientes.",
						row: (c) => ({
							key: c._id,
							primary: c.subject,
							secondary: `${c.name || c.email} · ${new Date(c.createdAt).toLocaleDateString("es-AR")}`,
							accent: c.priority === "urgent" ? theme.palette.error.main : c.priority === "high" ? theme.palette.warning.main : undefined,
							trailing: (
								<Chip
									size="small"
									label={PRIORITY_LABEL[c.priority] || c.priority}
									color={c.priority === "urgent" ? "error" : c.priority === "high" ? "warning" : "default"}
									sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }}
								/>
							),
						}),
					})}
				</Grid>
				<Grid item xs={12} md={4}>
					{renderColumn<UserFeedback>({
						title: "Feedback sin moderar",
						icon: <MessageText1 size={14} />,
						state: feedback,
						linkTo: "/admin/feedback",
						empty: "Todo el feedback está moderado.",
						dismissLabel: "Archivar (sale de pendientes, no se borra)",
						onDismiss: (f) => archiveFeedback(f._id),
						row: (f) => {
							const author =
								f.authorSnapshot?.name ||
								f.authorSnapshot?.email ||
								(typeof f.userId === "object" && f.userId ? f.userId.email : "") ||
								"Anónimo";
							return {
								key: f._id,
								primary: f.title || f.content.slice(0, 60),
								secondary: `${author} · ${new Date(f.createdAt).toLocaleDateString("es-AR")}`,
								trailing: (
									<Chip
										size="small"
										label={FEEDBACK_TYPE_LABEL[f.type] || f.type}
										variant="outlined"
										sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }}
									/>
								),
							};
						},
					})}
				</Grid>
			</Grid>
		</Paper>
	);
};

export default PendingWorkWidget;
