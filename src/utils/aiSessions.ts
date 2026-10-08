import { AiAgent, AiSession } from "types/admin-task";
import { localRepoPath } from "utils/ecosystemRepos";

export const AI_AGENT_LABELS: Record<AiAgent, string> = {
	claude: "Claude Code",
	codex: "Codex",
	other: "Otro",
};

// Los ids se pegan en una terminal: solo se arma el comando si el id es "seguro".
const SAFE_SESSION_ID = /^[\w.:-]+$/;

export const isSafeSessionId = (id: string): boolean => SAFE_SESSION_ID.test(id);

/**
 * Comando para retomar una sesión. Claude Code guarda las sesiones por carpeta de
 * proyecto, así que si la tarea tiene un único repo se antepone el `cd` a ese repo.
 */
export const resumeCommand = (session: AiSession, repos: string[] = []): string | null => {
	if (!isSafeSessionId(session.sessionId)) return null;
	let command: string;
	if (session.agent === "claude") command = `claude --resume ${session.sessionId}`;
	else if (session.agent === "codex") command = `codex resume ${session.sessionId}`;
	else return null;
	return repos.length === 1 ? `cd ${localRepoPath(repos[0])} && ${command}` : command;
};
