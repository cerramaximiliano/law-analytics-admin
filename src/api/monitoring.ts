// Monitoreo de infraestructura (Qdrant + Mongo local/Atlas + host).
// Usa workersAxios → pjn-api de worker_01 (instancia local que ve Qdrant y recolecta
// los snapshots). NO usar pjnAxios: el hub no recolecta (solo serviría snapshots si
// se le despliega el código). Endpoints: /api/monitoring/{overview,history,refresh}.
import workersAxios from "utils/workersAxios";

export interface QdrantCollection {
	name: string;
	points: number;
	indexed: number;
	segments: number;
	status: string;
	dim: number | null;
	distance: string | null;
	onDisk: boolean;
	quantization: string | null;
	diskBytes: number | null;
}

export interface MongoCollectionStat {
	name: string;
	count: number;
	sizeBytes: number;
	storageBytes: number;
	indexBytes: number;
}

export interface MongoStats {
	label: string;
	dbName?: string;
	dataSize?: number;
	storageSize?: number;
	indexSize?: number;
	totalSize?: number;
	objects?: number;
	collectionsCount?: number;
	topCollections?: MongoCollectionStat[];
	error?: string;
}

export interface HostDisk {
	path: string;
	totalBytes: number;
	freeBytes: number;
	usedBytes: number;
	usedPct: number;
}

export interface HostStats {
	hostname: string;
	loadavg: number[];
	memTotal: number;
	memFree: number;
	uptimeSec: number;
	disk?: HostDisk;
	diskError?: string;
}

export interface MonitoringSnapshot {
	source: string;
	createdAt: string;
	ageSeconds?: number;
	stale?: boolean;
	qdrant: {
		healthy: boolean;
		totalVectors?: number;
		collectionsCount?: number;
		collections?: QdrantCollection[];
		error?: string;
	};
	mongoLocal: MongoStats;
	mongoCloud: MongoStats;
	host: HostStats;
}

export interface HistoryPoint {
	createdAt: string;
	qdrant?: { totalVectors?: number; collections?: { name: string; points: number }[] };
	host?: { disk?: { usedBytes?: number; freeBytes?: number } };
	mongoCloud?: { totalSize?: number };
	mongoLocal?: { totalSize?: number };
}

export const MonitoringService = {
	async getOverview(): Promise<MonitoringSnapshot | null> {
		const { data } = await workersAxios.get("/api/monitoring/overview");
		return data.data ?? null;
	},
	async getHistory(hours = 168): Promise<HistoryPoint[]> {
		const { data } = await workersAxios.get("/api/monitoring/history", { params: { hours } });
		return (data.data as HistoryPoint[]) ?? [];
	},
	async refresh(): Promise<MonitoringSnapshot> {
		const { data } = await workersAxios.post("/api/monitoring/refresh");
		return data.data;
	},
};
