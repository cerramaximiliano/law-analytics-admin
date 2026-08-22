// Spec del diagrama de workers SCBA para el motor FlowDiagram (causas/flujos).
// Es MODE-AWARE: la partición del update (updatePolicy.mode en configuracion-scba)
// cambia nodos y aristas — en 'unified' el update principal cubre también las
// causas archivadas y el worker archived queda ocioso.

import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";
import { ScbaUpdatePolicyMode } from "api/scbaManager";

export function buildScbaWorkersSpec(mode: ScbaUpdatePolicyMode): FlowSpec {
	const unified = mode === "unified";

	const nodes: FlowNode[] = [
		{ id: "user", x: 40, y: 30, w: 200, h: 60, kind: "actor", label: "Usuario", sub: ["alta / actualización de credencial"] },
		{
			id: "creds",
			x: 40,
			y: 150,
			w: 200,
			h: 96,
			kind: "db",
			label: "scba-credentials",
			sub: ["syncStatus · verified · isExpired", "confirmación de rechazos", "(credentialPolicy, data-driven)"],
		},
		{
			id: "manager",
			x: 40,
			y: 330,
			w: 200,
			h: 96,
			kind: "hub",
			label: "scba-manager",
			sub: ["escala por pending cada 30s", "watchdog credenciales 30 min", "recordatorios + reconciliador"],
		},
		{
			id: "verification",
			x: 320,
			y: 30,
			w: 230,
			h: 72,
			kind: "private",
			label: "Verificación de Lista",
			sub: ["24/7 · sync de credenciales", "recovery → email restablecidas"],
		},
		{
			id: "initial",
			x: 320,
			y: 140,
			w: 230,
			h: 60,
			kind: "private",
			label: "Extracción Inicial",
			sub: ["24/7 · causas pending → completed"],
		},
		{
			id: "update",
			x: 320,
			y: 240,
			w: 230,
			h: unified ? 84 : 72,
			kind: "private",
			label: "Actualización Periódica",
			sub: unified
				? ["8-20 ART · threshold 2h", "TODAS las causas con folder", "(archivadas incluidas — unified)"]
				: ["8-20 ART · threshold 2h", "solo causas con ≥1 folder activo"],
		},
		{
			id: "updateArchived",
			x: 320,
			y: unified ? 364 : 352,
			w: 230,
			h: 60,
			kind: unified ? "ext" : "private",
			label: "Actualización Archivadas",
			sub: unified ? ["OCIOSA — modo unified", "rollback: updatePolicy.mode='split'"] : ["4-6 ART · threshold 24h", "causas 100% archivadas"],
		},
		{
			id: "listAudit",
			x: 320,
			y: 458,
			w: 230,
			h: 60,
			kind: "private",
			label: "Auditoría Diaria",
			sub: ["3 ART · altas/bajas + snapshot"],
		},
		{
			id: "portal",
			x: 640,
			y: 120,
			w: 210,
			h: 108,
			kind: "ext",
			label: "Portal SCBA",
			sub: ["notificaciones.scba.gov.ar", "login por credencial", "higiene de sesión (anti-contaminación)"],
		},
		{
			id: "causas",
			x: 640,
			y: 300,
			w: 210,
			h: 96,
			kind: "db",
			label: "causas-scba",
			sub: ["movimiento[] (merge estable)", "espejo scba-movements", "PDFs → S3 scba-docs"],
		},
		{
			id: "snapshots",
			x: 640,
			y: 458,
			w: 210,
			h: 60,
			kind: "db",
			label: "scba-list-snapshots",
			sub: ["evidencia visual diaria (S3)"],
		},
		{
			id: "notif",
			x: 930,
			y: 300,
			w: 170,
			h: 84,
			kind: "ok",
			label: "la-notification",
			sub: ["webhook movimientos", "policy notifyArchivedFolders", "→ email al usuario"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e-user-creds", from: "user", to: "creds", label: "alta / recovery" },
		{ id: "e-creds-verif", from: "creds", to: "verification", kind: "handoff", label: "pending sync", fromSide: "right", toSide: "left" },
		{ id: "e-manager-workers", from: "manager", to: "updateArchived", kind: "handoff", label: "escala los 5 workers", fromSide: "right", toSide: "left", labelDy: -16 },
		{ id: "e-verif-portal", from: "verification", to: "portal", label: "login + lista Mis Causas", fromSide: "right", toSide: "top" },
		{ id: "e-verif-causas", from: "verification", to: "causas", kind: "ok", label: "upsert (pending)", fromSide: "right", toSide: "left", labelDy: -10 },
		{ id: "e-init-portal", from: "initial", to: "portal", label: "trámites 1ª vez", fromSide: "right", toSide: "left" },
		{ id: "e-init-causas", from: "initial", to: "causas", kind: "ok", label: "completed", fromSide: "right", toSide: "left" },
		{ id: "e-upd-portal", from: "update", to: "portal", label: "refresh", fromSide: "right", toSide: "bottom", labelDx: -14 },
		{ id: "e-upd-causas", from: "update", to: "causas", kind: "ok", label: "merge movimientos", fromSide: "right", toSide: "left", labelDy: 10 },
		{ id: "e-causas-notif", from: "causas", to: "notif", kind: "ok", label: "movs nuevos", fromSide: "right", toSide: "left" },
		{ id: "e-audit-portal", from: "listAudit", to: "portal", label: "diff altas/bajas", fromSide: "right", toSide: "bottom", labelDx: 40, labelDy: 16 },
		{ id: "e-audit-snap", from: "listAudit", to: "snapshots", kind: "ok", label: "snapshot", fromSide: "right", toSide: "left" },
	];

	if (!unified) {
		edges.push(
			{ id: "e-arch-portal", from: "updateArchived", to: "portal", label: "archivadas 4 ART", fromSide: "right", toSide: "bottom", labelDx: 30 },
			{ id: "e-arch-causas", from: "updateArchived", to: "causas", kind: "ok", fromSide: "right", toSide: "bottom" },
		);
	}

	return {
		id: `scba-workers-${mode}`,
		title: "Workers SCBA",
		intro: "",
		width: 1120,
		height: 545,
		nodes,
		edges,
		steps: [],
	};
}
