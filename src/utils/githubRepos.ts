/**
 * El proyecto de GitHub detrás del repo que el catálogo le asigna a un proceso.
 *
 * El campo `repo` del inventario es una etiqueta para leer, no un
 * identificador: trae anotaciones entre paréntesis ("law-analytics-server
 * (admin-api)"), nombra cosas que no son repos ("infra (módulo PM2)") y en dos
 * casos el nombre local no es el de GitHub. Esta función traduce esa etiqueta
 * al proyecto real, o dice que no hay ninguno.
 *
 * Las excepciones salen de los remotes reales de los checkouts en
 * /home/mcerra/www, no de memoria:
 *
 *   admin          → law-analytics-tasas   (el directorio se llama distinto)
 *   pjn-rag-api    → pjn-rag-service       (ya anotado en el propio catálogo)
 *   infoleg        → sin remote
 *   la-mcp-server  → sin remote; se deploya con tar+scp+pm2, no por git
 *   infra…         → no son repos: módulos de PM2 y binarios de terceros
 *
 * El resto mapea 1:1, así que la tabla lista sólo lo que se aparta. Un repo
 * nuevo funciona sin tocar nada; sólo hay que venir acá si su nombre de GitHub
 * difiere del local.
 *
 * Vive en el front y no en el catálogo del admin-api —que sería su lugar
 * natural— para no acoplar este cambio a un deploy de law-analytics-server.
 * Si el catálogo algún día expone un campo `github`, esto se borra.
 */

const OWNER = "cerramaximiliano";

/** Nombre local → nombre en GitHub, sólo donde difieren. */
const RENOMBRADOS: Record<string, string> = {
	admin: "law-analytics-tasas",
	"pjn-rag-api": "pjn-rag-service",
};

/** Corren en producción pero no tienen repo publicado. */
const SIN_REPO = new Set(["infoleg", "la-mcp-server", "infra"]);

export interface GithubRepo {
	name: string;
	url: string;
}

export function githubRepo(repoLabel: string | null | undefined): GithubRepo | null {
	if (!repoLabel) return null;

	// "pjn-rag-api (github pjn-rag-service)" — el propio catálogo ya trae la
	// traducción escrita; se respeta antes que cualquier otra regla.
	const anotado = repoLabel.match(/\(github\s+([^)]+)\)/i);
	if (anotado) return { name: anotado[1].trim(), url: `https://github.com/${OWNER}/${anotado[1].trim()}` };

	// "law-analytics-server (admin-api)" → el repo es lo que va antes del paréntesis.
	const base = repoLabel.replace(/\s*\(.*\)\s*$/, "").trim();
	if (!base || SIN_REPO.has(base)) return null;

	const name = RENOMBRADOS[base] ?? base;
	return { name, url: `https://github.com/${OWNER}/${name}` };
}
