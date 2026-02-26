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
  totalFoldersLinked?: number;
  extractionStatus?: "idle" | "completed";
  extractedCausasCount?: number;
  stats?: {
    totalCausasFound: number;
    newCausasCreated: number;
    foldersCreated: number;
    lastCausasCount: number;
    byFuero: Record<string, number>;
  };
  successfulSyncs: number;
  firstSync: string | null;
  initialMovementsSync: string | null;
  initialMovementsSyncAt: string | null;
  totalMovements: number;
  lastMovementDate: string | null;
  lastSyncDuration: number | null;
  byFuero: Record<string, number>;
  currentSyncProgress?: {
    startedAt: string;
    currentPage: number;
    totalPages: number;
    causasProcessed: number;
    totalExpected: number;
    progress: number;
    lastBatchSample?: string[];
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
    syncActivity: {
      syncsLast24h: number;
      syncsLast7d: number;
      successRate: number;
      avgDurationMs: number;
    };
    updateActivity: {
      runsLast24h: number;
      runsLast7d: number;
      newMovements24h: number;
      newMovements7d: number;
    };
    movementTotals: {
      totalMovements: number;
      avgPerFolder: number;
      foldersWithMovements: number;
      lastGlobalMovement: string | null;
    };
    byFuero: Array<{ fuero: string; total: number }>;
  };
}

export interface SyncRun {
  _id: string;
  userName: string;
  userEmail: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  results: {
    totalCausasInPJN: number;
    causasNuevas: number;
    foldersCreados: number;
    errores: number;
  };
  metadata: { tiempoEjecucionMs: number; triggeredBy: string };
  error: { message: string; code: string } | null;
  createdAt: string;
}

export interface UpdateRun {
  _id: string;
  credentialsId?: string;
  userName: string;
  userEmail: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  results: {
    totalCausas: number;
    causasProcessed: number;
    causasUpdated: number;
    newMovimientos: number;
    causasError: number;
  };
  metadata: {
    triggeredBy: string;
    isResumedRun: boolean;
    previousRunId?: string;
    resumeAttempts?: number;
  };
  error: { message: string; code: string; phase: string } | null;
  createdAt: string;
}

export interface SyncError {
  type: "sync" | "update";
  userName: string;
  userEmail: string;
  status: string;
  error: { message: string; code?: string; phase?: string } | null;
  errorCount: number;
  createdAt: string;
}

export interface SyncActivityResponse {
  success: boolean;
  data: {
    additionalMetrics: {
      syncStatusBreakdown7d: Record<string, number>;
      avgCausasPerSync: number;
      cacheVsScraping: { cache: number; scraping: number };
      updateStatusBreakdown7d: Record<string, number>;
    };
    recentSyncs: SyncRun[];
    recentUpdateRuns: UpdateRun[];
    recentErrors: SyncError[];
  };
}

// Interfaces para causas sincronizadas por credenciales
export interface SyncedCausa {
  _id: string;
  number: number;
  year: number;
  incidente?: string | null;
  fuero: string;
  caratula: string;
  objeto: string;
  juzgado: string;
  secretaria: string;
  source: string;
  movimientosCount: number;
  fechaUltimoMovimiento: string | null;
  lastUpdate: string | null;
  updateStats?: {
    count?: number;
    last?: string;
    today?: { date: string; count: number; hours: number[] };
  };
  createdAt: string;
  credential: {
    credentialId?: string;
    userName: string;
    userEmail: string;
    initialMovementsSync: string | null;
    initialMovementsSyncAt: string | null;
  };
}

export interface SyncedCausasSummary {
  totalCausas: number;
  withMovements: number;
  withoutMovements: number;
  byFuero: Record<string, { total: number; withMovements: number }>;
  credentialsCount: number;
  initialSyncStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    none: number;
  };
}

export interface SyncedCausasFilters {
  credentialId?: string;
  fuero?: string;
  hasMovements?: string;
  soloElegibles?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SyncedCausasResponse {
  success: boolean;
  data: SyncedCausa[];
  summary: SyncedCausasSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PortalIncidentErrorSample {
  code: string;
  message: string;
  timestamp: string;
  credentialId?: string;
}

export interface PortalIncident {
  _id: string;
  type: "portal_down" | "portal_degraded" | "login_service_error";
  status: "active" | "resolved";
  startedAt: string;
  resolvedAt?: string | null;
  durationMinutes?: number | null;
  detectedBy: string;
  affectedWorkers: string[];
  affectedCredentialsCount: number;
  errorSamples: PortalIncidentErrorSample[];
  totalErrors: number;
}

export interface PortalStatusResponse {
  success: boolean;
  data: {
    activeIncident: PortalIncident | null;
    recentIncidents: PortalIncident[];
    credentialsWithPortalErrors: number;
    portalHealthy: boolean;
    lastSuccessfulConnection: string | null;
    lastResolvedIncident: PortalIncident | null;
  };
}

export interface MisCausasCoverage {
  total: number;
  updatedToday: number;
  pending: number;
  withErrors: number;
  coveragePercent: number;
  byFuero: Array<{ fuero: string; total: number; updatedToday: number; withErrors: number }>;
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
   * Obtener actividad detallada de syncs y updates
   */
  async getSyncActivity(): Promise<SyncActivityResponse> {
    const response = await adminAxios.get("/api/pjn-credentials/sync-activity");
    return response.data;
  }

  /**
   * Obtener causas sincronizadas por credenciales PJN
   */
  async getSyncedCausas(filters: SyncedCausasFilters = {}): Promise<SyncedCausasResponse> {
    const response = await adminAxios.get("/api/pjn-credentials/synced-causas", { params: filters });
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
   * Obtener folders vinculados a una credencial (source=pjn-login)
   */
  async getCredentialFolders(id: string, page = 1, limit = 100): Promise<GenericResponse> {
    const response = await adminAxios.get(`/api/pjn-credentials/${id}/folders`, { params: { page, limit } });
    return response.data;
  }

  /**
   * Eliminar credencial
   */
  async deleteCredential(id: string): Promise<GenericResponse> {
    const response = await adminAxios.delete(`/api/pjn-credentials/${id}`);
    return response.data;
  }

  /**
   * Obtener estado del portal PJN (incidentes activos y recientes)
   */
  async getPortalStatus(): Promise<PortalStatusResponse> {
    const response = await adminAxios.get("/api/pjn-credentials/portal-status");
    return response.data;
  }

  /**
   * Obtener cobertura de actualización de causas vinculadas (private-causas-update)
   */
  async getUpdateCoverage(): Promise<{ success: boolean; data: MisCausasCoverage }> {
    const response = await adminAxios.get("/api/pjn-credentials/update-coverage");
    return response.data;
  }
}

export default new PjnCredentialsService();
