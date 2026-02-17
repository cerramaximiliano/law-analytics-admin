import adminAxios from "utils/adminAxios";

// Interfaces
export interface PjnCredential {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  cuilMasked: string;
  enabled: boolean;
  verified: boolean;
  verifiedAt: string | null;
  isValid: boolean;
  isValidAt: string | null;
  syncStatus: "pending" | "in_progress" | "completed" | "error" | "never_synced";
  lastSync: string | null;
  lastSyncAttempt: string | null;
  consecutiveErrors: number;
  lastError: {
    message: string;
    code: string;
    timestamp: string;
  } | null;
  expectedCausasCount: number;
  processedCausasCount: number;
  foldersCreatedCount: number;
  stats?: {
    totalCausasFound: number;
    newCausasCreated: number;
    foldersCreated: number;
    lastCausasCount: number;
    byFuero: Record<string, number>;
  };
  successfulSyncs: number;
  firstSync: string | null;
  currentSyncProgress?: {
    startedAt: string;
    currentPage: number;
    totalPages: number;
    causasProcessed: number;
    totalExpected: number;
    progress: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PjnCredentialDetail extends PjnCredential {
  userCreatedAt?: string;
  evolution?: any;
  syncHistory?: any[];
  simulationData?: any;
}

export interface PjnCredentialsFilters {
  page?: number;
  limit?: number;
  syncStatus?: string;
  verified?: string;
  isValid?: string;
  enabled?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PjnCredentialsListResponse {
  success: boolean;
  data: PjnCredential[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PjnCredentialResponse {
  success: boolean;
  data: PjnCredentialDetail;
  message?: string;
}

export interface PjnCredentialsStatsResponse {
  success: boolean;
  data: {
    total: number;
    enabled: number;
    disabled: number;
    verified: number;
    notVerified: number;
    isValid: number;
    notValid: number;
    syncStatus: {
      pending: number;
      inProgress: number;
      completed: number;
      error: number;
      neverSynced: number;
    };
    totals: {
      causas: number;
      folders: number;
      avgCausasPerUser: number;
    };
  };
}

export interface GenericResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface CreatePjnCredentialPayload {
  userId: string;
  cuil: string;
  password: string;
}

// Servicio de Credenciales PJN
class PjnCredentialsService {
  /**
   * Crear credenciales PJN para un usuario
   */
  async createCredential(payload: CreatePjnCredentialPayload): Promise<GenericResponse> {
    const response = await adminAxios.post("/api/pjn-credentials", payload);
    return response.data;
  }

  /**
   * Obtener lista de credenciales con paginación y filtros
   */
  async getCredentials(filters: PjnCredentialsFilters = {}): Promise<PjnCredentialsListResponse> {
    const response = await adminAxios.get("/api/pjn-credentials", { params: filters });
    return response.data;
  }

  /**
   * Obtener estadísticas de credenciales
   */
  async getStats(): Promise<PjnCredentialsStatsResponse> {
    const response = await adminAxios.get("/api/pjn-credentials/stats");
    return response.data;
  }

  /**
   * Obtener detalle de una credencial
   */
  async getCredentialById(id: string): Promise<PjnCredentialResponse> {
    const response = await adminAxios.get(`/api/pjn-credentials/${id}`);
    return response.data;
  }

  /**
   * Habilitar o deshabilitar credencial
   */
  async toggleCredential(id: string, enabled: boolean): Promise<GenericResponse> {
    const response = await adminAxios.patch(`/api/pjn-credentials/${id}/toggle`, { enabled });
    return response.data;
  }

  /**
   * Resetear credencial para re-sincronización
   */
  async resetCredential(id: string): Promise<GenericResponse> {
    const response = await adminAxios.post(`/api/pjn-credentials/${id}/reset`);
    return response.data;
  }

  /**
   * Resetear sincronización completa (folders, causas, syncs, credencial)
   */
  async resetSyncData(id: string, dryRun: boolean = true): Promise<GenericResponse> {
    const response = await adminAxios.post(`/api/pjn-credentials/${id}/reset-sync`, { dryRun });
    return response.data;
  }

  /**
   * Obtener documento raw de una credencial (sin datos sensibles)
   */
  async getRawCredential(id: string): Promise<GenericResponse> {
    const response = await adminAxios.get(`/api/pjn-credentials/${id}`, { params: { raw: true } });
    return response.data;
  }

  /**
   * Eliminar credencial
   */
  async deleteCredential(id: string): Promise<GenericResponse> {
    const response = await adminAxios.delete(`/api/pjn-credentials/${id}`);
    return response.data;
  }
}

export default new PjnCredentialsService();
