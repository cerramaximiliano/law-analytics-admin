// Repositorios de GitHub del ecosistema Law Analytics (cuenta `cerramaximiliano`).
// Lista curada a mano: no se consulta la API de GitHub desde el navegador para no
// exponer un token. Al crear un repo nuevo del ecosistema, agregarlo acá.

export const GITHUB_OWNER = "cerramaximiliano";

export interface EcosystemRepo {
	name: string;
	group: string;
}

const group = (label: string, names: string[]): EcosystemRepo[] => names.map((name) => ({ name, group: label }));

export const ECOSYSTEM_REPOS: EcosystemRepo[] = [
	...group("Plataforma", [
		"law-analytics-server",
		"law-analytics-front",
		"law-analytics-admin",
		"la-subscriptions",
		"la-notification",
		"la-marketing-service",
		"la-user-lifecycle",
		"la-mcp-server",
		"la-public-site",
		"law-analytics-static",
		"law-analytics-tasas",
		"postal-tracking-service",
	]),
	...group("PJN", [
		"pjn-api",
		"pjn-models",
		"pjn-workers",
		"pjn-workers-scraping",
		"pjn-mis-causas",
		"pjn-email-workers",
		"pjn-liquidacion-worker",
		"pjn-captcha-ocr",
		"pjn-etapa-model",
		"pjn-conceptos",
		"pjn-legal-query",
		"pjn-escritos-worker",
		"pjn-rag-service",
		"pjn-rag-workers",
		"pjn-rag-shared",
	]),
	...group("EJE (CABA)", ["eje-api", "eje-models", "eje-workers"]),
	...group("MEV (CABA)", ["mev-api", "mev-workers"]),
	...group("SCBA", ["scba-models", "scba-workers"]),
	...group("PJ Salta", ["pjsalta-api", "pjsalta-models", "pjsalta-workers"]),
	...group("PJ Catamarca", ["pjcatamarca-api", "pjcatamarca-models", "pjcatamarca-workers"]),
	...group("PJ Mendoza", ["pjmendoza-api", "pjmendoza-models", "pjmendoza-workers"]),
	...group("Otros workers", ["saij-workers", "cijur-workers", "trabajo-worker", "legal-scraping-workers"]),
	...group("Infra y docs", ["la-infra-docs", "la-log-shipper", "worker-monitoring", "server-maintenance", "la-ads"]),
];

export const ECOSYSTEM_REPO_NAMES: string[] = ECOSYSTEM_REPOS.map((r) => r.name);

export const repoGroup = (name: string): string => ECOSYSTEM_REPOS.find((r) => r.name === name)?.group ?? "Otros";

export const githubUrl = (name: string): string => `https://github.com/${GITHUB_OWNER}/${name}`;

/** Carpeta local donde viven los repos (convención del ecosistema: ~/www/<repo>). */
export const localRepoPath = (name: string): string => `~/www/${name}`;
