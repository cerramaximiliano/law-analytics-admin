/**
 * Exporta la guía "Vista del usuario" (userViewGuideData.ts) a Markdown para
 * la-infra-docs, así la matriz estado → render no se desfasa del código.
 *
 *   npm run export:user-view-guide -- mev > ../la-infra-docs/flujos/estado-actual/generado/mev-user-view.md
 *   npm run export:user-view-guide -- all   (imprime todas las jurisdicciones)
 */
import { GUIDE_BY_JURISDICTION, GuideFinding, GuideGroup } from "../src/pages/admin/causas/userViewGuideData";
import { CausaUserViewEntry } from "../src/api/pjnCredentials";

const JURIS_LABEL: Record<string, string> = {
	pjn: "PJN",
	mev: "MEV",
	eje: "EJE (CABA)",
	scba: "SCBA",
	pjsalta: "PJ Salta",
	pjcatamarca: "PJ Catamarca",
	pjmendoza: "PJ Mendoza",
};

const cell = (s: string | null | undefined) => (s ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");

const pill = (p: { label: string; accent: string; badge: string | null }) =>
	`${p.label} (${p.accent}${p.badge ? `, badge ${p.badge}` : ""})`;

const viewRow = (v: CausaUserViewEntry["view"]) => {
	const flags: string[] = [];
	if (v.hiddenFromList) flags.push("oculta de la lista");
	if (v.inAttentionTable) flags.push("tabla 'requiere atención'");
	if (v.contentBlocked) flags.push("contenido bloqueado");
	if (v.credError) flags.push(`credError=${v.credError.code}`);
	return {
		list: v.list,
		expanded: pill(v.expanded),
		detail: `${pill(v.detail.chip)}${v.detail.gate ? ` · gate=${v.detail.gate}` : " · sin gate"}`,
		flags: flags.length ? flags.join(", ") : "—",
	};
};

const renderGroups = (groups: GuideGroup[]) =>
	groups
		.map((g) => {
			const head = `### \`${g.row}\` — ${g.title}\n\n${g.whatUserSees}\n\n`;
			const table = [
				"| Caso | Lo produce | Campos | Lista | Fila expandida | Detalle | Flags |",
				"|---|---|---|---|---|---|---|",
				...g.cases.map((c) => {
					const v = viewRow(c.entry.view);
					return `| **${cell(c.title)}**${c.warn ? ` ⚠️ ${cell(c.warn)}` : ""} | ${cell(c.producer)} | \`${cell(c.fields)}\` | \`${
						v.list
					}\` | ${cell(v.expanded)} | ${cell(v.detail)} | ${cell(v.flags)} |`;
				}),
			].join("\n");
			return head + table + "\n";
		})
		.join("\n");

const renderFindings = (findings: GuideFinding[]) =>
	findings.length
		? [
				"| Id | Sev. | Hallazgo | Dónde |",
				"|---|---|---|---|",
				...findings.map((f) => `| ${f.id} | ${f.severity} | **${cell(f.title)}** — ${cell(f.detail)} | \`${cell(f.where)}\` |`),
		  ].join("\n")
		: "_Sin hallazgos._";

const renderJuris = (key: string) => {
	const j = GUIDE_BY_JURISDICTION[key];
	if (!j) throw new Error(`Jurisdicción desconocida: ${key} (válidas: ${Object.keys(GUIDE_BY_JURISDICTION).join(", ")})`);
	const out: string[] = [];
	out.push(`# Vista del usuario — ${JURIS_LABEL[key] ?? key}`);
	out.push("");
	out.push(
		`> Generado por \`law-analytics-admin/scripts/export-user-view-guide.ts\` desde \`src/pages/admin/causas/userViewGuideData.ts\` el ${new Date()
			.toISOString()
			.slice(
				0,
				10,
			)}. **No editar a mano**: regenerar con \`npm run export:user-view-guide -- ${key}\`. Réplica servidor: \`admin-api pjnCredentialsController.js computeListRowAny / computeUserView\`.`,
	);
	out.push("");
	if (j.note) out.push(j.note, "");
	if (j.caption) out.push(`_${j.caption}_`, "");
	out.push("## Estados de la carpeta y qué renderiza cada vista", "");
	out.push(
		"`Lista` es la rama de `folders.tsx` (`plain`, `ok`, `pending`, `failed`, `invalid`, `cred_status`, `unlinked`, …); `Fila expandida` es el pill de `FolderView.tsx`; `Detalle` es el chip de `details.tsx` y su gate (bloquea las tabs de contenido).",
		"",
	);
	out.push(renderGroups(j.groups));
	out.push("## Hallazgos", "");
	out.push(renderFindings(j.findings));
	out.push("");
	return out.join("\n");
};

const arg = (process.argv[2] || "all").toLowerCase();
const keys = arg === "all" ? Object.keys(GUIDE_BY_JURISDICTION) : [arg];
process.stdout.write(keys.map(renderJuris).join("\n\n---\n\n"));
