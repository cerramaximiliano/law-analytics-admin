import React, { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Checkbox,
	Chip,
	Divider,
	Drawer,
	IconButton,
	LinearProgress,
	Link,
	Skeleton,
	Stack,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, Code1, Copy, Edit2, ExportSquare, MagicStar, Send2, TickCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";
import AdminTasksService from "api/adminTasks";
import { AdminTask, AiSession, TaskPriority, TaskStatus, CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "types/admin-task";
import { AI_AGENT_LABELS, isSafeSessionId, resumeCommand } from "utils/aiSessions";
import { githubUrl } from "utils/ecosystemRepos";

interface TaskDetailDrawerProps {
	open: boolean;
	/** Tarea tal como viene de la lista; se refresca contra el backend al abrir. */
	task: AdminTask | null;
	currentUser?: string;
	getStatusColor: (status: TaskStatus) => string;
	getPriorityColor: (priority: TaskPriority) => string;
	onClose: () => void;
	onEdit: (task: AdminTask) => void;
	/** Se llama tras cualquier cambio hecho desde el panel (subtareas, comentarios). */
	onChanged: () => void;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const SectionLabel: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
	<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
		<Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6, lineHeight: 1.6 }}>
			{children}
		</Typography>
		{action}
	</Box>
);

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
	open,
	task,
	currentUser,
	getStatusColor,
	getPriorityColor,
	onClose,
	onEdit,
	onChanged,
}) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [detail, setDetail] = useState<AdminTask | null>(task);
	const [loading, setLoading] = useState(false);
	const [commentText, setCommentText] = useState("");
	const [sendingComment, setSendingComment] = useState(false);

	const taskId = task?._id;

	// Al abrir (o cambiar de tarea) se pide la versión fresca; mientras tanto se muestra la de la lista.
	useEffect(() => {
		setDetail(task);
		setCommentText("");
		if (!open || !taskId) return;
		let cancelled = false;
		setLoading(true);
		AdminTasksService.getTaskById(taskId)
			.then((res) => {
				if (!cancelled && res.success) setDetail(res.data);
			})
			.catch(() => {
				// se queda con la versión de la lista
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, taskId]);

	const copy = useCallback(
		async (text: string, what: string) => {
			try {
				await navigator.clipboard.writeText(text);
				enqueueSnackbar(`${what} copiado`, { variant: "success", autoHideDuration: 1800 });
			} catch {
				enqueueSnackbar("No se pudo copiar al portapapeles", { variant: "error" });
			}
		},
		[enqueueSnackbar],
	);

	const toggleSubtask = async (subtaskId: string, completed: boolean) => {
		if (!detail) return;
		try {
			const res = await AdminTasksService.updateSubtask(detail._id, subtaskId, { completed });
			if (res.success) setDetail(res.data);
			onChanged();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "No se pudo actualizar la subtarea", { variant: "error" });
		}
	};

	const sendComment = async () => {
		if (!detail || !commentText.trim()) return;
		setSendingComment(true);
		try {
			const res = await AdminTasksService.addComment(detail._id, commentText.trim(), currentUser);
			if (res.success) setDetail(res.data);
			setCommentText("");
			onChanged();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "No se pudo agregar el comentario", { variant: "error" });
		} finally {
			setSendingComment(false);
		}
	};

	const t = detail;
	const repos = t?.repos ?? [];
	const sessions: AiSession[] = t?.aiContext?.sessions ?? [];
	const prompt = t?.aiContext?.prompt?.trim() ?? "";
	const hasAi = Boolean(prompt) || sessions.length > 0;
	const completedSubtasks = t?.subtasks.filter((s) => s.completed).length ?? 0;
	const mono = { fontFamily: MONO, fontSize: "0.8125rem" } as const;

	const chip = (label: string, color: string) => (
		<Chip size="small" label={label} sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 600 }} />
	);

	return (
		<Drawer
			anchor="right"
			open={open}
			onClose={onClose}
			PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, maxWidth: "100%" }, role: "dialog", "aria-label": "Detalle de la tarea" }}
		>
			<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
				{/* Cabecera */}
				<Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
					<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
						<Typography variant="h5" sx={{ flexGrow: 1, minWidth: 0, textWrap: "balance", wordBreak: "break-word" }}>
							{t?.title ?? <Skeleton width="70%" />}
						</Typography>
						{t && (
							<Tooltip title="Editar">
								<IconButton size="small" aria-label="Editar tarea" onClick={() => onEdit(t)}>
									<Edit2 size={18} />
								</IconButton>
							</Tooltip>
						)}
						<IconButton size="small" aria-label="Cerrar" onClick={onClose}>
							<CloseCircle size={20} />
						</IconButton>
					</Box>
					{t && (
						<Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
							{chip(STATUS_LABELS[t.status], getStatusColor(t.status))}
							{chip(PRIORITY_LABELS[t.priority], getPriorityColor(t.priority))}
							<Chip size="small" variant="outlined" label={CATEGORY_LABELS[t.category]} />
							{t.dueDate && (
								<Chip
									size="small"
									variant="outlined"
									color={t.isOverdue ? "error" : "default"}
									label={`Vence ${dayjs(t.dueDate).format("DD/MM/YY")} · ${dayjs(t.dueDate).fromNow()}`}
								/>
							)}
						</Stack>
					)}
					{loading && <LinearProgress sx={{ mt: 1.25, height: 2 }} />}
				</Box>

				{/* Contenido */}
				<Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
					{!t ? (
						<Skeleton variant="rounded" height={160} />
					) : (
						<Stack spacing={2.5}>
							<Box>
								<SectionLabel>Descripción</SectionLabel>
								{t.description ? (
									<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
										{t.description}
									</Typography>
								) : (
									<Typography variant="body2" color="text.secondary">
										Sin descripción.
									</Typography>
								)}
							</Box>

							{repos.length > 0 && (
								<Box>
									<SectionLabel>Repositorios</SectionLabel>
									<Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
										{repos.map((name) => (
											<Chip
												key={name}
												size="small"
												icon={<Code1 size={14} />}
												label={name}
												component="a"
												href={githubUrl(name)}
												target="_blank"
												rel="noopener noreferrer"
												clickable
												deleteIcon={<ExportSquare size={13} />}
												onDelete={() => window.open(githubUrl(name), "_blank", "noopener,noreferrer")}
												sx={{ fontFamily: MONO, fontSize: "0.75rem" }}
											/>
										))}
									</Stack>
								</Box>
							)}

							{hasAi && (
								<Box
									sx={{
										p: 1.5,
										borderRadius: 2,
										border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
										bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.03),
									}}
								>
									<SectionLabel>
										<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
											<MagicStar size={14} /> Consulta IA
											{t.aiContext?.agent && ` · ${AI_AGENT_LABELS[t.aiContext.agent]}`}
										</Box>
									</SectionLabel>

									{prompt && (
										<Box sx={{ mb: sessions.length ? 1.5 : 0 }}>
											<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
												<Typography variant="caption" color="text.secondary">
													Prompt
												</Typography>
												<Button size="small" startIcon={<Copy size={14} />} onClick={() => copy(prompt, "Prompt")}>
													Copiar
												</Button>
											</Box>
											<Box
												component="pre"
												sx={{
													m: 0,
													p: 1.25,
													maxHeight: 300,
													overflow: "auto",
													whiteSpace: "pre-wrap",
													wordBreak: "break-word",
													borderRadius: 1.5,
													bgcolor: theme.palette.background.default,
													border: `1px solid ${theme.palette.divider}`,
													...mono,
													lineHeight: 1.55,
												}}
											>
												{prompt}
											</Box>
										</Box>
									)}

									{sessions.length > 0 && (
										<Box>
											<Typography variant="caption" color="text.secondary">
												Sesiones para continuar
											</Typography>
											<Stack spacing={1} sx={{ mt: 0.5 }}>
												{sessions.map((s, i) => {
													const command = resumeCommand(s, repos);
													return (
														<Box
															key={s._id ?? i}
															sx={{ p: 1, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: "background.paper" }}
														>
															<Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
																<Chip size="small" label={AI_AGENT_LABELS[s.agent]} color={s.agent === "other" ? "default" : "primary"} />
																{s.label && (
																	<Typography variant="body2" fontWeight={600}>
																		{s.label}
																	</Typography>
																)}
															</Box>
															<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
																<Typography sx={{ ...mono, flexGrow: 1, minWidth: 0, wordBreak: "break-all" }}>{s.sessionId}</Typography>
																<Tooltip title="Copiar ID">
																	<IconButton size="small" aria-label="Copiar ID de sesión" onClick={() => copy(s.sessionId, "ID")}>
																		<Copy size={16} />
																	</IconButton>
																</Tooltip>
															</Box>
															{command ? (
																<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
																	<Box
																		sx={{
																			...mono,
																			flexGrow: 1,
																			minWidth: 0,
																			p: 0.75,
																			borderRadius: 1,
																			bgcolor: theme.palette.background.default,
																			wordBreak: "break-all",
																		}}
																	>
																		{command}
																	</Box>
																	<Button size="small" variant="outlined" onClick={() => copy(command, "Comando")}>
																		Copiar comando
																	</Button>
																</Box>
															) : (
																<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
																	{isSafeSessionId(s.sessionId)
																		? "Este agente no tiene comando de reanudación; usá el ID."
																		: "El ID tiene caracteres no válidos: no se genera comando."}
																</Typography>
															)}
														</Box>
													);
												})}
											</Stack>
										</Box>
									)}
								</Box>
							)}

							{t.subtasks.length > 0 && (
								<Box>
									<SectionLabel>
										Subtareas · {completedSubtasks}/{t.subtasks.length}
									</SectionLabel>
									<Stack>
										{[...t.subtasks]
											.sort((a, b) => a.order - b.order)
											.map((s) => (
												<Box key={s._id} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
													<Checkbox
														size="small"
														checked={s.completed}
														onChange={(e) => toggleSubtask(s._id, e.target.checked)}
														inputProps={{ "aria-label": s.title }}
													/>
													<Typography
														variant="body2"
														sx={{
															textDecoration: s.completed ? "line-through" : "none",
															color: s.completed ? "text.secondary" : "text.primary",
														}}
													>
														{s.title}
													</Typography>
												</Box>
											))}
									</Stack>
								</Box>
							)}

							{t.externalLinks?.length > 0 && (
								<Box>
									<SectionLabel>Enlaces</SectionLabel>
									<Stack spacing={0.5}>
										{t.externalLinks.map((l, i) => (
											<Link key={`${l.url}-${i}`} href={l.url} target="_blank" rel="noopener noreferrer" variant="body2" underline="hover">
												{l.label || l.url}
											</Link>
										))}
									</Stack>
								</Box>
							)}

							<Box>
								<SectionLabel>Comentarios · {t.comments.length}</SectionLabel>
								<Stack spacing={1.25}>
									{t.comments.map((c) => (
										<Box key={c._id}>
											<Typography variant="caption" color="text.secondary">
												{c.createdBy} · {dayjs(c.createdAt).format("DD/MM/YY HH:mm")}
											</Typography>
											<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
												{c.content}
											</Typography>
										</Box>
									))}
									<Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
										<TextField
											size="small"
											fullWidth
											multiline
											maxRows={5}
											placeholder="Agregar un comentario…"
											value={commentText}
											onChange={(e) => setCommentText(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
													e.preventDefault();
													sendComment();
												}
											}}
										/>
										<Tooltip title="Enviar (Ctrl+Enter)">
											<span>
												<IconButton
													color="primary"
													aria-label="Enviar comentario"
													onClick={sendComment}
													disabled={sendingComment || !commentText.trim()}
												>
													<Send2 size={20} />
												</IconButton>
											</span>
										</Tooltip>
									</Box>
								</Stack>
							</Box>

							<Divider />
							<Box>
								<SectionLabel>Datos</SectionLabel>
								<Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.5 }}>
									{[
										["Progreso", `${t.progress}%`],
										["Proyecto", t.project],
										["Módulo", t.module],
										["Asignado a", t.assignedTo],
										["Creada por", t.createdBy],
										["Creada", dayjs(t.createdAt).format("DD/MM/YY HH:mm")],
										["Actualizada", dayjs(t.updatedAt).format("DD/MM/YY HH:mm")],
										["Completada", t.completedAt ? dayjs(t.completedAt).format("DD/MM/YY HH:mm") : undefined],
									]
										.filter(([, value]) => value)
										.map(([label, value]) => (
											<React.Fragment key={label}>
												<Typography variant="caption" color="text.secondary">
													{label}
												</Typography>
												<Typography variant="body2">{value}</Typography>
											</React.Fragment>
										))}
								</Box>
								{t.tags.length > 0 && (
									<Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
										{t.tags.map((tag) => (
											<Chip key={tag} size="small" variant="outlined" label={tag} />
										))}
									</Stack>
								)}
							</Box>
						</Stack>
					)}
				</Box>

				{/* Pie */}
				{t && (
					<Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider", display: "flex", gap: 1, justifyContent: "flex-end" }}>
						<Button startIcon={<Edit2 size={16} />} onClick={() => onEdit(t)}>
							Editar
						</Button>
						{t.status !== "completed" && (
							<Button
								variant="contained"
								color="success"
								startIcon={<TickCircle size={16} />}
								onClick={async () => {
									try {
										const res = await AdminTasksService.updateTaskStatus(t._id, "completed");
										if (res.success) setDetail(res.data);
										onChanged();
									} catch (e: any) {
										enqueueSnackbar(e?.message || "No se pudo completar la tarea", { variant: "error" });
									}
								}}
							>
								Completar
							</Button>
						)}
					</Box>
				)}
			</Box>
		</Drawer>
	);
};

export default TaskDetailDrawer;
