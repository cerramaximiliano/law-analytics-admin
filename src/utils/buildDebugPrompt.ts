// Construye prompts listos para pegar en Claude Code a partir de un health
// report. La idea: la admin UI hace el triage (qué servicio, qué error), y
// Claude Code hace la investigación y el fix en el código real.

import type { HealthReport, LogEntry } from "api/logs";

// Mapeo de service name a repo probable.
// Patrones:
// - Prefijo exacto (ej: "la-marketing-service-prod" → "la-marketing-service")
// - Match por regex para familias (ej: "pjn-verify-*" → "pjn-workers")
const REPO_MAPPING: { matcher: RegExp; repo: string; notes?: string }[] = [
	{
		matcher: /^la-marketing-service/,
		repo: "la-marketing-service",
		notes: "Microservicio de campañas de email (Express + OpenAI + Mongo)",
	},
	{ matcher: /^email-scheduler/, repo: "la-marketing-service", notes: "Scheduler de campañas dentro de la-marketing-service" },
	{ matcher: /^segment-sync/, repo: "la-marketing-service", notes: "Cron de sync de segmentos dentro de la-marketing-service" },
	{ matcher: /^law-analytics-server/, repo: "law-analytics-server", notes: "API principal del ecosistema (Express + Mongo)" },
	{
		matcher: /^law-analytics-admin-api/,
		repo: "law-analytics-server",
		notes: "Sub-app admin-api dentro de law-analytics-server (admin-api/)",
	},
	{ matcher: /^law-analytics-tasas/, repo: "law-analytics-tasas" },
	{ matcher: /^legal-scraping/, repo: "legal-scraping-workers" },
	{ matcher: /^pjn-rag/, repo: "pjn-rag-api", notes: "RAG con causas del PJN (Socket.io + Bull MQ + Pinecone)" },
	{ matcher: /^pjn-api$|^pjn\/api/, repo: "pjn-api", notes: "API de causas PJN. Si corre en local-worker-01 puede ser un proceso viejo" },
	{
		matcher: /^pjn-verify-|^pjn-app-update-|^pjn-scraping-manager|^pjn-extra-info/,
		repo: "pjn-workers",
		notes: "Workers de scraping PJN (Puppeteer + PM2 cron)",
	},
	{ matcher: /^pjn-email/, repo: "pjn-email-workers" },
	{ matcher: /^pjn-mis-causas/, repo: "pjn-mis-causas" },
	{ matcher: /^eje-api/, repo: "eje-api" },
	{ matcher: /^eje-/, repo: "eje-workers", notes: "Workers EJE (TypeScript + Puppeteer)" },
	{ matcher: /^mev-api/, repo: "mev-api" },
	{
		matcher: /^mev-|^update-cluster|^verify-cluster|^worker-manager/,
		repo: "mev-workers",
		notes: "Workers MEV (Puppeteer + auto-escalado dinámico con worker-manager.js)",
	},
	{ matcher: /^la-notification/, repo: "la-notification", notes: "Notificaciones tiempo real (Socket.io)" },
	{ matcher: /^la-subscriptions|^grace-period|^stripe-webhooks/, repo: "la-subscriptions", notes: "Billing + Stripe + grace periods" },
	{ matcher: /^worker-SAIJ/, repo: "legal-scraping-workers", notes: "Worker que scrapea SAIJ" },
	{ matcher: /^sentencias-/, repo: "legal-scraping-workers" },
	{ matcher: /^scraper-manager/, repo: "pjn-workers" },
	{ matcher: /^cross-monitor|^monitor-dashboard/, repo: "legal-scraping-workers", notes: "Monitores de workers de scraping" },
	{ matcher: /^retry-worker/, repo: "legal-scraping-workers" },
	{
		matcher: /^scraping-(CIV|CNT|COM|CSS)-worker/,
		repo: "pjn-workers-scraping",
		notes: "Workers de scraping PJN por fuero (CIV/CNT/COM/CSS)",
	},
	{ matcher: /^legal-discovery/, repo: "legal-scraping-workers" },
	{ matcher: /^infoleg-/, repo: "legal-scraping-workers" },
	{ matcher: /^pjn-escritos/, repo: "pjn-workers-scraping" },
	{ matcher: /^telegram-bot/, repo: "?", notes: "No identificado — buscar en /home/mcerra/www/ cuál tiene telegram-bot" },
];

function guessRepo(service: string): { repo: string; notes?: string } {
	for (const { matcher, repo, notes } of REPO_MAPPING) {
		if (matcher.test(service)) return { repo, notes };
	}
	return { repo: "?", notes: "Service no mapeado — buscá en /home/mcerra/www/" };
}

// Extrae paths de archivo mencionados en un texto (stack traces, mensajes)
function extractFilePaths(text: string): string[] {
	const paths = new Set<string>();
	// Patrón 1: "at .../file.js:123:45"
	for (const m of text.matchAll(/\/(?:[\w.-]+\/)*[\w.-]+\.(js|ts|jsx|tsx)(?::\d+)?/g)) {
		if (!m[0].includes("node_modules")) paths.add(m[0]);
	}
	return [...paths].slice(0, 10);
}

interface BuildFromReportArgs {
	report: HealthReport;
	recentLogs?: LogEntry[]; // opcional — si los tenés agrega stacks reales
}

export function buildDebugPromptFromReport({ report, recentLogs = [] }: BuildFromReportArgs): string {
	const { repo, notes } = guessRepo(report.service);
	const scoreIcon = report.healthScore === "red" ? "🔴" : report.healthScore === "yellow" ? "🟡" : "🟢";

	const errorRatePct = (report.metrics.errorRate24h * 100).toFixed(2);
	const topIssue = report.topIssues[0];

	// Extraer paths de los alerts + top issue root causes + sample logs
	const textBlob = [
		...report.alerts,
		...(report.topIssues || []).flatMap((i) => [i.rootCause, i.fix]),
		...recentLogs.map((l) => l.message),
	].join("\n");
	const paths = extractFilePaths(textBlob);

	const sampleLogs = recentLogs
		.filter((l) => l.level === "error" || l.level === "fatal")
		.slice(0, 10)
		.map((l) => `- [${new Date(l.timestamp).toISOString().slice(0, 19)}] ${(l.message || "").slice(0, 300)}`);

	const lines: string[] = [];
	lines.push(`# Bug detectado en producción — Law Analytics`);
	lines.push("");
	lines.push(`## Contexto`);
	lines.push(`- **Servicio**: \`${report.service}\` @ \`${report.host}\``);
	lines.push(`- **Repo probable**: \`${repo}\` (estimado — path absoluto: \`/home/mcerra/www/${repo}\`)`);
	if (notes) lines.push(`- **Notas del repo**: ${notes}`);
	lines.push(`- **Score actual**: ${scoreIcon} ${report.healthScore.toUpperCase()}`);
	lines.push(`- **Error rate 24h**: ${errorRatePct}% (${report.metrics.errorCount24h} errores en ${report.metrics.logCount24h} logs)`);
	lines.push(`- **Generado por AI**: ${report.aiModel} (${new Date(report.createdAt).toISOString()})`);
	lines.push("");

	lines.push(`## Resumen del AI scan`);
	lines.push(report.summary || "(sin summary)");
	lines.push("");

	if (topIssue) {
		lines.push(`## Top issue detectado — ${topIssue.severity.toUpperCase()}`);
		lines.push(`**${topIssue.title}** (${topIssue.count} ocurrencias)`);
		lines.push("");
		lines.push(`**Root cause propuesto:**`);
		lines.push(topIssue.rootCause);
		lines.push("");
		if (topIssue.fix) {
			lines.push(`**Fix sugerido (hipótesis):**`);
			lines.push(topIssue.fix);
			lines.push("");
		}
	}

	if (report.topIssues.length > 1) {
		lines.push(`## Otros issues secundarios`);
		report.topIssues.slice(1).forEach((i) => {
			lines.push(`- **${i.title}** (${i.count}, ${i.severity}): ${i.rootCause.slice(0, 200)}`);
		});
		lines.push("");
	}

	if (report.alerts.length > 0) {
		lines.push(`## Alertas accionables`);
		report.alerts.forEach((a) => lines.push(`- ${a}`));
		lines.push("");
	}

	if (paths.length > 0) {
		lines.push(`## Paths mencionados (posibles archivos a revisar)`);
		paths.forEach((p) => lines.push(`- \`${p}\``));
		lines.push("");
	}

	if (sampleLogs.length > 0) {
		lines.push(`## Sample de errores recientes`);
		lines.push("```");
		sampleLogs.forEach((l) => lines.push(l));
		lines.push("```");
		lines.push("");
	}

	lines.push(`## Tu tarea`);
	lines.push(`1. Ubicá el código relacionado en \`${repo}\` (Grep/Read según el tipo de error).`);
	lines.push(`2. Verificá si el root cause propuesto por la AI es correcto o si hay algo más.`);
	lines.push(`3. Proponé un fix concreto. Si hay tests, corrélos antes y después del cambio.`);
	lines.push(`4. Mostrame el diff antes de aplicarlo para revisión.`);
	lines.push(`5. Si el fix implica cambios en más de un repo (ej: deprecated endpoint consumido por varios), listalos.`);
	lines.push("");
	lines.push(`## Info adicional`);
	lines.push(`- Admin dashboard: https://dashboard.lawanalytics.app/admin/logs/health`);
	lines.push(
		`- Logs crudos del servicio: https://dashboard.lawanalytics.app/admin/logs?service=${encodeURIComponent(
			report.service,
		)}&host=${encodeURIComponent(report.host)}`,
	);

	return lines.join("\n");
}
