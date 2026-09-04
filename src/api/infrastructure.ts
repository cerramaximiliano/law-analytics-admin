// Inventario de infraestructura: los boxes del ecosistema y lo que corre en cada uno.
//
// El admin-api lo arma juntando el catálogo curado (qué es cada box, qué repo
// es dueño de cada proceso) con el estado en vivo que publica la malla de
// worker-monitoring en cada nodo. Los boxes sin ese agente (worker-002 y
// worker-003) vienen con `live.reachable: false` y su señal de vida es
// `lastLogAt` / la actividad de logs de cada proceso.
import adminAxios from "utils/adminAxios";

export type BoxAgent = "malla" | "logs" | "ninguno";
export type ProcessStatus = "online" | "stopped" | "errored" | "desconocido" | string;

export interface InfraProcess {
	name: string;
	status: ProcessStatus;
	restarts: number | null;
	cpu: number | null;
	memoryMb: number | null;
	uptimeMs: number | null;
	repo: string | null;
	/** Proyecto de GitHub del repo dueño. `null` cuando no tiene repo publicado
	 *  (infoleg y la-mcp-server se deployan sin git; `infra` agrupa módulos de
	 *  PM2 y binarios de terceros). Lo resuelve el admin-api. */
	github: { name: string; url: string } | null;
	role: string | null;
	cron: boolean;
	/** "failover" marca al proceso que sostiene el respaldo en la nube. */
	highlight: string | null;
	catalogued: boolean;
	/** Proceso ajeno al ecosistema que comparte el box. */
	foreign: boolean;
	logs: { count: number; errors: number; lastSeen: string } | null;
}

export interface InfraLive {
	reachable: boolean;
	error?: string | null;
	at?: string | null;
	hostname?: string | null;
	uptimeSec?: number | null;
	cpu?: { cores: number; load1: string; load5: string; load15: string } | null;
	memory?: { totalGB: string; usedGB: string; freeGB?: string; percent: string } | null;
	disk?: { percent: number; availHuman: string } | null;
	tailscale?: { running: boolean; online: boolean; peersOnline: number; peersTotal: number } | null;
	mongo?: { running: boolean; responsive: boolean } | null;
	rs?: Record<string, any> | null;
	systemd?: Record<string, any> | null;
	connectivity?: string | null;
	alerts?: string[];
}

export interface InfraBox {
	key: string;
	name: string;
	label: string;
	group: string;
	role: string;
	detail?: string;
	provider: string;
	instanceType: string;
	zone: string;
	monthlyCostUsd: number | null;
	publicIp: string | null;
	tailscaleIp: string | null;
	privateIp?: string | null;
	hostname: string | null;
	logHost: string | null;
	critical?: boolean;
	/** Base de datos que hospeda, para el link cruzado con /admin/infrastructure/databases. */
	databaseKey?: string | null;
	retired?: boolean;
	hasFailover?: boolean;
	sshHint?: string;
	systemdUnits?: { name: string; role: string }[];
	notes?: string[];
	agent: BoxAgent;
	live: InfraLive;
	processes: InfraProcess[];
	processSummary: { total: number; online: number; stopped: number; errored: number; unknown: number; foreign: number };
	lastLogAt: string | null;
}

export interface InfraInventory {
	success: boolean;
	generatedAt: string;
	cached: boolean;
	boxes: InfraBox[];
}

const InfrastructureService = {
	/** `force` saltea la caché de 30s del backend (botón de refrescar). */
	getInventory: async (force = false): Promise<InfraInventory> => {
		const res = await adminAxios.get("/api/infrastructure/inventory", { params: force ? { refresh: 1 } : undefined });
		return res.data;
	},
};

export default InfrastructureService;
