import React from "react";
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { Add, Trash } from "iconsax-react";
import { AiAgent, AiContext, AiSession } from "types/admin-task";
import { AI_AGENT_LABELS, isSafeSessionId } from "utils/aiSessions";

interface AiContextEditorProps {
	value: AiContext;
	onChange: (value: AiContext) => void;
}

const AGENTS = Object.keys(AI_AGENT_LABELS) as AiAgent[];
const PROMPT_MAX = 20000;

/** Edita el prompt de la consulta IA y las sesiones (Claude / Codex) para continuarla. */
const AiContextEditor: React.FC<AiContextEditorProps> = ({ value, onChange }) => {
	const sessions = value.sessions ?? [];
	const prompt = value.prompt ?? "";

	const updateSession = (index: number, patch: Partial<AiSession>) => {
		onChange({ ...value, sessions: sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
	};

	const addSession = () => {
		onChange({ ...value, sessions: [...sessions, { agent: value.agent ?? "claude", sessionId: "", label: "" }] });
	};

	const removeSession = (index: number) => {
		onChange({ ...value, sessions: sessions.filter((_, i) => i !== index) });
	};

	return (
		<Stack spacing={2}>
			<FormControl size="small" sx={{ maxWidth: 220 }}>
				<InputLabel shrink>Agente del prompt</InputLabel>
				<Select
					value={value.agent ?? ""}
					label="Agente del prompt"
					notched
					displayEmpty
					onChange={(e) => onChange({ ...value, agent: (e.target.value || undefined) as AiAgent | undefined })}
				>
					<MenuItem value="">Sin definir</MenuItem>
					{AGENTS.map((a) => (
						<MenuItem key={a} value={a}>
							{AI_AGENT_LABELS[a]}
						</MenuItem>
					))}
				</Select>
			</FormControl>
			<TextField
				label="Prompt"
				placeholder="La consulta o instrucción para el agente de IA…"
				value={prompt}
				onChange={(e) => onChange({ ...value, prompt: e.target.value })}
				fullWidth
				multiline
				minRows={4}
				maxRows={12}
				helperText={`${prompt.length.toLocaleString("es-AR")} / ${PROMPT_MAX.toLocaleString("es-AR")}`}
				inputProps={{ maxLength: PROMPT_MAX }}
				InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.8125rem" } }}
			/>

			<Box>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Sesiones para continuar
				</Typography>
				<Stack spacing={1.5}>
					{sessions.map((session, index) => {
						const invalid = session.sessionId.length > 0 && !isSafeSessionId(session.sessionId);
						return (
							<Box
								key={session._id ?? index}
								sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr auto", sm: "130px 1fr 1fr auto" }, alignItems: "start" }}
							>
								<FormControl size="small" sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
									<InputLabel>Agente</InputLabel>
									<Select value={session.agent} label="Agente" onChange={(e) => updateSession(index, { agent: e.target.value as AiAgent })}>
										{AGENTS.map((a) => (
											<MenuItem key={a} value={a}>
												{AI_AGENT_LABELS[a]}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<TextField
									size="small"
									label="ID de sesión"
									value={session.sessionId}
									onChange={(e) => updateSession(index, { sessionId: e.target.value.trim() })}
									error={invalid}
									helperText={invalid ? "Solo letras, números, . _ : -" : undefined}
									inputProps={{ style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.8125rem" } }}
								/>
								<TextField
									size="small"
									label="Rótulo (opcional)"
									value={session.label ?? ""}
									onChange={(e) => updateSession(index, { label: e.target.value })}
									inputProps={{ maxLength: 200 }}
								/>
								<IconButton size="small" aria-label="Quitar sesión" onClick={() => removeSession(index)} sx={{ mt: 0.5 }}>
									<Trash size={18} />
								</IconButton>
							</Box>
						);
					})}
					<Box>
						<Button size="small" startIcon={<Add size={16} />} onClick={addSession}>
							Agregar sesión
						</Button>
					</Box>
				</Stack>
			</Box>
		</Stack>
	);
};

export default AiContextEditor;
