import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	Box,
	Stack,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Chip,
	TextField,
	IconButton,
	Skeleton,
	Collapse,
	useTheme,
	useMediaQuery,
	alpha,
	CircularProgress,
	InputAdornment,
	Tooltip,
	Paper,
} from "@mui/material";
import { ArrowLeft2, Send2, SearchNormal1, InfoCircle, Refresh2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { IndexationCausa, CausaSummaryData } from "api/ragWorkers";
import { getAuthToken, refreshAuthToken } from "utils/ragAxios";

const RAG_URL = import.meta.env.VITE_RAG_URL || "http://localhost:5005";

// ── Types ────────────────────────────────────────────────────────────────────

interface Citation {
	documentId: string;
	sourceType: string;
	sourceUrl?: string | null;
	page?: number;
	chunkIndex?: number;
	chunkText?: string;
	relevanceScore?: number;
	docDate?: string;
	docType?: string;
}

interface MessageMetadata {
	model?: string;
	tokensPrompt?: number;
	tokensCompletion?: number;
	latencyMs?: number;
	chunksUsed?: number;
	chunksRetrieved?: number;
}

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	citations?: Citation[];
	metadata?: MessageMetadata;
	streaming?: boolean;
	error?: boolean;
}

// ── ChatRagTab ───────────────────────────────────────────────────────────────

const ChatRagTab = () => {
	const [selectedCausa, setSelectedCausa] = useState<IndexationCausa | null>(null);

	return selectedCausa ? (
		<ChatInterface causa={selectedCausa} onBack={() => setSelectedCausa(null)} />
	) : (
		<CausaSelector onSelect={setSelectedCausa} />
	);
};

// ── Causa Selector ───────────────────────────────────────────────────────────

const CausaSelector: React.FC<{ onSelect: (causa: IndexationCausa) => void }> = ({ onSelect }) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();
	const [causas, setCausas] = useState<IndexationCausa[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [search, setSearch] = useState("");

	const fetchCausas = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getIndexationCausas("indexed", page + 1, rowsPerPage);
			setCausas(data.causas);
			setTotal(data.pagination.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar causas indexadas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, enqueueSnackbar]);

	useEffect(() => {
		fetchCausas();
	}, [fetchCausas]);

	const filtered = search
		? causas.filter((c) => c.caratula?.toLowerCase().includes(search.toLowerCase()))
		: causas;

	return (
		<Stack spacing={2}>
			<Typography variant="h5">Seleccionar causa indexada</Typography>
			<Typography variant="body2" color="text.secondary">
				Selecciona una causa para iniciar un chat con el sistema RAG
			</Typography>

			<TextField
				size="small"
				placeholder="Buscar por caratula..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				InputProps={{
					startAdornment: (
						<InputAdornment position="start">
							<SearchNormal1 size={16} />
						</InputAdornment>
					),
				}}
				sx={{ maxWidth: 400 }}
			/>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ tableLayout: "fixed", minWidth: isMobile ? 360 : undefined }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: isMobile ? "55%" : "40%" }}>Caratula</TableCell>
							<TableCell sx={{ width: "8%", display: { xs: "none", md: "table-cell" } }}>Fuero</TableCell>
							<TableCell sx={{ width: "10%", display: { xs: "none", md: "table-cell" } }}>Juzgado</TableCell>
							<TableCell sx={{ width: "8%", display: { xs: "none", md: "table-cell" } }}>Tipo</TableCell>
							<TableCell sx={{ width: isMobile ? "20%" : "10%" }} align="right">Docs</TableCell>
							<TableCell sx={{ width: isMobile ? "25%" : "14%", display: { xs: "none", sm: "table-cell" } }}>Ultima indexacion</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							[...Array(5)].map((_, i) => (
								<TableRow key={i}>
									{[...Array(isMobile ? 2 : 6)].map((__, j) => (
										<TableCell key={j}>
											<Skeleton variant="text" />
										</TableCell>
									))}
								</TableRow>
							))
						) : filtered.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
									<Typography variant="body2" color="text.secondary">
										{search ? "No se encontraron causas para la busqueda" : "No hay causas indexadas"}
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							filtered.map((c) => (
								<TableRow
									key={`${c.causaType}-${c.causaId}`}
									hover
									sx={{ cursor: "pointer" }}
									onClick={() => onSelect(c)}
								>
									<TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.caratula}>
										<Typography variant="caption" noWrap>{c.caratula || "-"}</Typography>
									</TableCell>
									<TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
										<Typography variant="caption" color="text.secondary">{c.fuero || "-"}</Typography>
									</TableCell>
									<TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
										<Typography variant="caption" color="text.secondary">{c.juzgado ?? "-"}</Typography>
									</TableCell>
									<TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
										<Chip label={c.causaType} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
									</TableCell>
									<TableCell align="right">
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{c.documentsProcessed ?? 0}
										</Typography>
									</TableCell>
									<TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{c.lastIndexedAt ? new Date(c.lastIndexedAt).toLocaleDateString("es-AR") : "-"}
										</Typography>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>

			<TablePagination
				component="div"
				count={total}
				page={page}
				rowsPerPage={rowsPerPage}
				onPageChange={(_, newPage) => setPage(newPage)}
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50]}
				labelRowsPerPage="Filas por pagina:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>
		</Stack>
	);
};

// ── Chat Interface ───────────────────────────────────────────────────────────

const ChatInterface: React.FC<{ causa: IndexationCausa; onBack: () => void }> = ({ causa, onBack }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	const executeSend = useCallback(async (text: string, userMsgId?: string) => {
		if (streaming) return;

		// Si es retry, limpiar el mensaje fallido y su burbuja assistant vacia
		if (userMsgId) {
			setMessages((prev) => {
				const idx = prev.findIndex((m) => m.id === userMsgId);
				if (idx === -1) return prev;
				const copy = [...prev];
				// Marcar el mensaje user como no-error (se reenvia)
				copy[idx] = { ...copy[idx], error: false };
				// Si el siguiente es un assistant vacio/con error, eliminarlo
				if (idx + 1 < copy.length && copy[idx + 1].role === "assistant" && !copy[idx + 1].content) {
					copy.splice(idx + 1, 1);
				}
				return copy;
			});
		}

		const userMsg: ChatMessage = userMsgId
			? { id: userMsgId, role: "user", content: text }
			: { id: `user-${Date.now()}`, role: "user", content: text };
		const assistantMsg: ChatMessage = { id: `assistant-${Date.now()}`, role: "assistant", content: "", streaming: true };

		if (!userMsgId) {
			setMessages((prev) => [...prev, userMsg, assistantMsg]);
		} else {
			setMessages((prev) => {
				const idx = prev.findIndex((m) => m.id === userMsgId);
				if (idx === -1) return [...prev, assistantMsg];
				const copy = [...prev];
				copy.splice(idx + 1, 0, assistantMsg);
				return copy;
			});
		}

		setInput("");
		setStreaming(true);

		const controller = new AbortController();
		abortRef.current = controller;
		const currentUserMsgId = userMsg.id;

		try {
			const doFetch = async (retry = false): Promise<Response> => {
				const token = getAuthToken();
				const headers: Record<string, string> = { "Content-Type": "application/json" };
				if (token) headers["Authorization"] = `Bearer ${token}`;

				const res = await fetch(`${RAG_URL}/rag/chat/message`, {
					method: "POST",
					headers,
					credentials: "include",
					body: JSON.stringify({
						message: text,
						causaId: causa.causaId,
						causaType: causa.causaType,
						conversationId,
						stream: true,
					}),
					signal: controller.signal,
				});

				if (res.status === 401 && !retry) {
					try {
						await refreshAuthToken();
						return doFetch(true);
					} catch {
						window.dispatchEvent(new CustomEvent("showUnauthorizedModal"));
						throw new Error("Sesion expirada");
					}
				}

				if (!res.ok) {
					const errorData = await res.json().catch(() => ({}));
					throw new Error(errorData.error || `Error ${res.status}`);
				}

				return res;
			};

			const response = await doFetch();
			if (!response.body) throw new Error("ReadableStream no soportado");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let accumulatedText = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					const raw = line.slice(6);
					let data: any;
					try {
						data = JSON.parse(raw);
					} catch {
						continue;
					}

					const eventType = data.type;

					if (eventType === "start") {
						if (data.conversationId) setConversationId(data.conversationId);
					} else if (eventType === "chunk") {
						accumulatedText += data.text || "";
						const snapshot = accumulatedText;
						setMessages((prev) => {
							const copy = [...prev];
							const last = copy[copy.length - 1];
							if (last?.role === "assistant") {
								copy[copy.length - 1] = { ...last, content: snapshot };
							}
							return copy;
						});
					} else if (eventType === "done") {
						const finalText = accumulatedText;
						// Mapear metadata del servidor al formato de la UI
						const rawMeta = data.metadata || {};
						const mappedMetadata: MessageMetadata = {
							model: rawMeta.model,
							tokensPrompt: rawMeta.tokensUsed?.prompt,
							tokensCompletion: rawMeta.tokensUsed?.completion,
							latencyMs: rawMeta.latencyMs,
							chunksUsed: rawMeta.chunksUsed,
							chunksRetrieved: rawMeta.chunksRetrieved,
						};
						setMessages((prev) => {
							const copy = [...prev];
							const last = copy[copy.length - 1];
							if (last?.role === "assistant") {
								copy[copy.length - 1] = {
									...last,
									id: data.assistantMessageId || last.id,
									content: finalText,
									citations: data.citations || [],
									metadata: mappedMetadata,
									streaming: false,
								};
							}
							return copy;
						});
					} else if (eventType === "error") {
						throw new Error(data.error || "Error del servidor");
					}
				}
			}

			// Si el stream termina sin evento "done", marcar como no-streaming
			setMessages((prev) => {
				const last = prev[prev.length - 1];
				if (last?.role === "assistant" && last.streaming) {
					const copy = [...prev];
					copy[copy.length - 1] = { ...last, streaming: false };
					return copy;
				}
				return prev;
			});
		} catch (err: any) {
			if (err.name === "AbortError") return;
			enqueueSnackbar(err.message || "Error al enviar mensaje", { variant: "error" });
			setMessages((prev) => {
				const copy = [...prev];
				// Marcar el mensaje user como error
				const userIdx = copy.findIndex((m) => m.id === currentUserMsgId);
				if (userIdx !== -1) {
					copy[userIdx] = { ...copy[userIdx], error: true };
				}
				// Eliminar burbuja assistant vacia, o marcar como no-streaming si tiene contenido
				const last = copy[copy.length - 1];
				if (last?.role === "assistant" && !last.content) {
					copy.pop();
				} else if (last?.role === "assistant" && last.streaming) {
					copy[copy.length - 1] = { ...last, streaming: false };
				}
				return copy;
			});
		} finally {
			setStreaming(false);
			abortRef.current = null;
		}
	}, [streaming, causa, conversationId, enqueueSnackbar]);

	const sendMessage = useCallback(() => {
		const text = input.trim();
		if (!text || streaming) return;
		executeSend(text);
	}, [input, streaming, executeSend]);

	const retryMessage = useCallback((msgId: string, text: string) => {
		if (streaming) return;
		executeSend(text, msgId);
	}, [streaming, executeSend]);

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	return (
		<Stack sx={{ height: "calc(100vh - 300px)", minHeight: 500 }}>
			{/* Header */}
			<Stack direction="row" spacing={1} alignItems="center" sx={{ pb: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
				<Tooltip title="Cambiar causa">
					<IconButton size="small" onClick={onBack}>
						<ArrowLeft2 size={18} />
					</IconButton>
				</Tooltip>
				<Chip
					label={causa.caratula}
					size="small"
					color="primary"
					variant="outlined"
					sx={{ maxWidth: 400 }}
				/>
				<Typography variant="caption" color="text.secondary">
					{causa.fuero} · {causa.causaType}
				</Typography>
			</Stack>

			{/* Messages */}
			<Box
				sx={{
					flex: 1,
					overflow: "auto",
					py: 2,
					display: "flex",
					flexDirection: "column",
					gap: 2,
				}}
			>
				{messages.length === 0 && (
					<ChatWelcome causa={causa} onSuggestionClick={(text) => executeSend(text)} />
				)}
				{messages.map((msg) => (
					<MessageBubble key={msg.id} message={msg} theme={theme} onRetry={retryMessage} />
				))}
				<div ref={messagesEndRef} />
			</Box>

			{/* Input */}
			<Stack direction="row" spacing={1} alignItems="flex-end" sx={{ pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
				<TextField
					fullWidth
					multiline
					maxRows={4}
					size="small"
					placeholder="Escribe tu mensaje..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={streaming}
				/>
				<IconButton
					color="primary"
					onClick={sendMessage}
					disabled={!input.trim() || streaming}
					sx={{
						bgcolor: alpha(theme.palette.primary.main, 0.1),
						"&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.2) },
					}}
				>
					{streaming ? <CircularProgress size={18} /> : <Send2 size={18} />}
				</IconButton>
			</Stack>
		</Stack>
	);
};

// ── Chat Welcome ─────────────────────────────────────────────────────────────

const ChatWelcome: React.FC<{
	causa: IndexationCausa;
	onSuggestionClick: (text: string) => void;
}> = ({ causa, onSuggestionClick }) => {
	const theme = useTheme();
	const [summary, setSummary] = useState<CausaSummaryData | null>(null);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [loadingSummary, setLoadingSummary] = useState(true);
	const [loadingSuggestions, setLoadingSuggestions] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [summaryRes, suggestionsRes] = await Promise.all([
					RagWorkersService.getChatSummary(causa.causaId).catch(() => null),
					RagWorkersService.getChatSuggestions(causa.causaId).catch(() => []),
				]);
				setSummary(summaryRes);
				setSuggestions(suggestionsRes);
			} finally {
				setLoadingSummary(false);
				setLoadingSuggestions(false);
			}
		};
		fetchData();
	}, [causa.causaId]);

	const s = summary?.summary;

	return (
		<Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, py: 2 }}>
			{/* Resumen ejecutivo */}
			<Paper variant="outlined" sx={{ maxWidth: 600, width: "100%", p: 2.5 }}>
				{loadingSummary ? (
					<Stack spacing={1.5}>
						<Skeleton variant="text" width="40%" height={28} />
						<Skeleton variant="text" width="80%" />
						<Skeleton variant="text" width="60%" />
						<Skeleton variant="rectangular" height={60} />
					</Stack>
				) : !s ? (
					<Typography variant="body2" color="text.secondary" textAlign="center">
						No hay resumen disponible para esta causa
					</Typography>
				) : (
					<Stack spacing={1.5}>
						{/* Estado actual */}
						{s.estadoActual && (
							<Box>
								<Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
									Estado actual
								</Typography>
								<Typography variant="body2">{s.estadoActual}</Typography>
							</Box>
						)}

						{/* Partes */}
						{s.partes && (s.partes.actor || s.partes.demandado) && (
							<Box>
								<Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
									Partes
								</Typography>
								<Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
									{s.partes.actor && (
										<Box sx={{ flex: 1 }}>
											<Typography variant="caption" color="text.disabled">Actor</Typography>
											<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{s.partes.actor}</Typography>
										</Box>
									)}
									{s.partes.demandado && (
										<Box sx={{ flex: 1 }}>
											<Typography variant="caption" color="text.disabled">Demandado</Typography>
											<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{s.partes.demandado}</Typography>
										</Box>
									)}
								</Stack>
							</Box>
						)}

						{/* Decisiones judiciales */}
						{s.decisionesJudiciales && s.decisionesJudiciales.length > 0 && (
							<Box>
								<Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
									Ultimas decisiones
								</Typography>
								<Stack spacing={0.5} sx={{ mt: 0.5 }}>
									{s.decisionesJudiciales.slice(-3).map((d, i) => (
										<Box key={i} sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
											<Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
												{d.fecha ? new Date(d.fecha).toLocaleDateString("es-AR") : "-"}
											</Typography>
											<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
												{d.tipo && <Box component="span" sx={{ fontWeight: 600 }}>{d.tipo}: </Box>}
												{d.resumen}
											</Typography>
										</Box>
									))}
								</Stack>
							</Box>
						)}

						{/* Pendientes */}
						{s.pendientes && s.pendientes.length > 0 && (
							<Box>
								<Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
									Pendientes
								</Typography>
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
									{s.pendientes.map((p, i) => (
										<Chip key={i} label={p} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 22 }} />
									))}
								</Stack>
							</Box>
						)}
					</Stack>
				)}
			</Paper>

			{/* Preguntas sugeridas */}
			{loadingSuggestions ? (
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ maxWidth: 600 }}>
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} variant="rounded" width={180} height={32} sx={{ borderRadius: 4 }} />
					))}
				</Stack>
			) : suggestions.length > 0 ? (
				<Box sx={{ maxWidth: 600, width: "100%", textAlign: "center" }}>
					<Typography variant="caption" color="text.disabled" sx={{ mb: 1, display: "block" }}>
						Preguntas sugeridas
					</Typography>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent="center">
						{suggestions.map((q, i) => (
							<Chip
								key={i}
								label={q}
								variant="outlined"
								clickable
								onClick={() => onSuggestionClick(q)}
								sx={{
									fontSize: "0.75rem",
									height: "auto",
									py: 0.5,
									"& .MuiChip-label": { whiteSpace: "normal", textAlign: "left" },
									maxWidth: 280,
									borderColor: alpha(theme.palette.primary.main, 0.3),
									"&:hover": {
										bgcolor: alpha(theme.palette.primary.main, 0.08),
										borderColor: theme.palette.primary.main,
									},
								}}
							/>
						))}
					</Stack>
				</Box>
			) : null}
		</Box>
	);
};

// ── Message Bubble ───────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage; theme: any; onRetry: (msgId: string, text: string) => void }> = ({ message, theme, onRetry }) => {
	const [metadataOpen, setMetadataOpen] = useState(false);
	const isUser = message.role === "user";
	const meta = message.metadata;
	const hasError = isUser && message.error;

	return (
		<Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "center", gap: 0.5, px: 1 }}>
			{hasError && (
				<Tooltip title="Reintentar envio">
					<IconButton
						size="small"
						onClick={() => onRetry(message.id, message.content)}
						sx={{ color: theme.palette.error.main }}
					>
						<Refresh2 size={16} />
					</IconButton>
				</Tooltip>
			)}
			<Box
				sx={{
					maxWidth: "75%",
					px: 2,
					py: 1.5,
					borderRadius: 2,
					bgcolor: hasError
						? alpha(theme.palette.error.main, 0.06)
						: isUser
							? alpha(theme.palette.primary.main, 0.1)
							: alpha(theme.palette.grey[500], 0.08),
					border: `1px solid ${hasError ? alpha(theme.palette.error.main, 0.3) : isUser ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.grey[500], 0.15)}`,
				}}
			>
				<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6, color: hasError ? theme.palette.error.main : undefined }}>
					{message.content}
					{message.streaming && !message.content && "..."}
					{message.streaming && message.content && (
						<Box
							component="span"
							sx={{
								display: "inline-block",
								width: 6,
								height: 14,
								ml: 0.5,
								bgcolor: theme.palette.text.primary,
								animation: "blink 1s infinite",
								"@keyframes blink": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
								verticalAlign: "text-bottom",
							}}
						/>
					)}
				</Typography>

				{hasError && (
					<Typography variant="caption" color="error" sx={{ fontSize: "0.65rem", mt: 0.5, display: "block" }}>
						No se pudo enviar. Usa el boton para reintentar.
					</Typography>
				)}

				{/* Citations */}
				{message.citations && message.citations.length > 0 && (
					<Stack
						direction="row"
						spacing={0.5}
						flexWrap="wrap"
						useFlexGap
						sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}
					>
						<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", width: "100%", mb: 0.25 }}>
							Fuentes:
						</Typography>
						{message.citations.map((cit, i) => {
							// Label legible: "Sentencia · 15/01/2024 · pág 3"
							const parts: string[] = [];
							if (cit.docType) parts.push(cit.docType);
							if (cit.docDate) {
								try { parts.push(new Date(cit.docDate).toLocaleDateString("es-AR")); } catch { /* ignore */ }
							}
							if (cit.page) parts.push(`pág ${cit.page}`);
							const label = parts.length > 0 ? parts.join(" · ") : `Fuente ${i + 1}`;

							// Tooltip: preview del texto del chunk
							const tooltipText = cit.chunkText
								? `${cit.chunkText.substring(0, 150)}${cit.chunkText.length > 150 ? "..." : ""}`
								: label;

							const isClickable = !!cit.sourceUrl;

							return (
								<Tooltip key={i} title={tooltipText}>
									<Chip
										label={label}
										size="small"
										variant="outlined"
										clickable={isClickable}
										onClick={isClickable ? () => window.open(cit.sourceUrl!, "_blank", "noopener") : undefined}
										sx={{
											fontSize: "0.65rem",
											height: 22,
											maxWidth: 280,
											color: isClickable ? theme.palette.info.main : theme.palette.text.secondary,
											borderColor: alpha(isClickable ? theme.palette.info.main : theme.palette.grey[500], 0.3),
											cursor: isClickable ? "pointer" : "default",
											textDecoration: isClickable ? "underline" : "none",
											"&:hover": isClickable ? { bgcolor: alpha(theme.palette.info.main, 0.08) } : {},
										}}
									/>
								</Tooltip>
							);
						})}
					</Stack>
				)}

				{/* Metadata */}
				{meta && !message.streaming && (
					<Box sx={{ mt: 1 }}>
						<Box
							sx={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 0.5 }}
							onClick={() => setMetadataOpen(!metadataOpen)}
						>
							<InfoCircle size={12} color={theme.palette.text.disabled} />
							<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
								{metadataOpen ? "Ocultar detalles" : "Ver detalles"}
							</Typography>
						</Box>
						<Collapse in={metadataOpen}>
							<Stack spacing={0.25} sx={{ mt: 0.5, pl: 0.5 }}>
								{meta.model && (
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", fontFamily: "monospace" }}>
										Modelo: {meta.model}
									</Typography>
								)}
								{(meta.tokensPrompt != null || meta.tokensCompletion != null) && (
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", fontFamily: "monospace" }}>
										Tokens: {meta.tokensPrompt ?? "-"} prompt + {meta.tokensCompletion ?? "-"} completion
									</Typography>
								)}
								{meta.latencyMs != null && (
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", fontFamily: "monospace" }}>
										Latencia: {((meta.latencyMs as number) / 1000).toFixed(1)}s
									</Typography>
								)}
								{(meta.chunksUsed != null || meta.chunksRetrieved != null) && (
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", fontFamily: "monospace" }}>
										Chunks: {meta.chunksUsed ?? "-"} usados{meta.chunksRetrieved != null ? ` / ${meta.chunksRetrieved} recuperados` : ""}
									</Typography>
								)}
							</Stack>
						</Collapse>
					</Box>
				)}
			</Box>
		</Box>
	);
};

export default ChatRagTab;
