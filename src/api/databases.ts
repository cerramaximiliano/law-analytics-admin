// Inventario de bases de datos: cuáles hay, dónde viven, cuánto ocupan y el
// detalle de cada colección.
//
// Lo arma el admin-api consultando cada base (Mongo por `dbStats` + `$collStats`,
// Qdrant por su API) y cruzándolo con el monitor de los boxes de datos, que es
// de donde sale el espacio libre del volumen y el tamaño en disco de cada
// colección de Qdrant (su API no lo expone).
import adminAxios from "utils/adminAxios";

export interface DbCollection {
	name: string;
	documents: number;
	/** Mongo: tamaño lógico de los documentos. Qdrant no lo reporta. */
	sizeBytes?: number;
	/** Ocupación real en disco. */
	storageBytes: number | null;
	indexBytes?: number;
	indexes?: number;
	// Solo Qdrant
	indexed?: number;
	segments?: number;
	status?: string;
	dim?: number | null;
	distance?: string | null;
	onDisk?: boolean;
	quantization?: string | null;
}

export interface DbLocation {
	label: string;
	detail: string;
	/** Box del inventario de infraestructura, cuando la base vive en uno nuestro. */
	boxKey?: string;
}

export interface DbVolume {
	mount: string;
	sizeHuman: string | null;
	percent: number;
	availHuman: string | null;
}

export interface DatabaseEntry {
	key: string;
	name: string;
	/** Etiqueta corta para la pestaña. */
	shortName: string;
	engine: string;
	role: string;
	uri: string | null;
	hosting: "propio" | "gestionado";
	location: DbLocation[];
	/** Box de /admin/infrastructure al que enlaza esta base. */
	infraBoxKey: string | null;
	volume: DbVolume | null;
	volumeNote?: string;
	/** Por qué esta base no tiene métricas, cuando no las tiene. */
	notInstrumented?: string;
	dbName?: string;
	totals?: {
		documents: number;
		dataBytes?: number;
		storageBytes: number;
		indexBytes?: number;
		collections: number;
	};
	collections?: DbCollection[];
	replicaSet?: { name: string; primary: string | null; members: { host: string; state: string }[]; error?: string } | null;
	error?: string;
}

export interface DatabasesInventory {
	success: boolean;
	generatedAt: string;
	cached: boolean;
	databases: DatabaseEntry[];
}

const DatabasesService = {
	/** `force` saltea la caché de 2 minutos del backend. */
	getInventory: async (force = false): Promise<DatabasesInventory> => {
		const res = await adminAxios.get("/api/infrastructure/databases", { params: force ? { refresh: 1 } : undefined });
		return res.data;
	},
};

export default DatabasesService;
