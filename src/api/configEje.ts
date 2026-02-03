/**
 * API service for EJE worker configuration and statistics
 */
import ejeAxios from "../utils/ejeAxios";

// ========== INTERFACES ==========

export interface IWorkerConfig {
  enabled: boolean;
  batchSize: number;
  delayBetweenRequests: number;
  maxRetries: number;
  retryDelay: number;
}

export interface ISchedule {
  cronExpression: string;
  workStartHour: number;
  workEndHour: number;
  workDays: number[];
  timezone: string;
  respectWorkingHours: boolean;
}

export interface IRateLimiting {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
}

export interface IConfiguracionEje {
  _id: string;
  workerId: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  workers: {
    verification: IWorkerConfig;
    update: IWorkerConfig;
    stuck: IWorkerConfig;
  };
  schedule: ISchedule;
  rateLimiting: IRateLimiting;
  stats: {
    documentsProcessed: number;
    documentsSuccess: number;
    documentsError: number;
    movimientosExtracted: number;
    lastReset: string;
  };
  state: {
    isRunning: boolean;
    lastCycleAt?: string;
    cycleCount: number;
    lastError?: {
      message: string;
      timestamp: string;
      documentId?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// Manager Config Types
export interface IManagerSettings {
  checkInterval: number;
  lockTimeoutMinutes: number;
  maxWorkers: number;
  minWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  updateThresholdHours: number;
  cpuThreshold: number;
  memoryThreshold: number;
  workStartHour: number;
  workEndHour: number;
  workDays: number[];
  timezone: string;
  workerNames: {
    verification: string;
    update: string;
    stuck: string;
  };
}

export interface IWorkerCount {
  verification: number;
  update: number;
  stuck: number;
  total: number;
}

export interface IPendingCount {
  verification: number;
  update: number;
  stuck: number;
  total: number;
}

export interface ISystemResources {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryFree: number;
  loadAvg: number[];
}

export interface IManagerState {
  isRunning: boolean;
  isPaused: boolean;
  lastCycleAt?: string;
  cycleCount: number;
  workers: IWorkerCount;
  pending: IPendingCount;
  optimalWorkers: IWorkerCount;
  systemResources: ISystemResources;
  lastScaleAction?: {
    timestamp: string;
    workerType: string;
    action: 'scale_up' | 'scale_down';
    from: number;
    to: number;
    reason: string;
  };
}

export interface IAlert {
  type: 'high_cpu' | 'high_memory' | 'no_workers' | 'high_pending' | 'manager_stopped' | 'stuck_documents';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  value?: number;
  threshold?: number;
}

export interface IDailyStats {
  date: string;
  totalEligible: number;
  processed: number;
  success: number;
  errors: number;
  movimientosFound: number;
  avgProcessingTime: number;
  peakPending: number;
  peakWorkers: number;
  cyclesRun: number;
}

export interface IHistorySnapshot {
  timestamp: string;
  workers: IWorkerCount;
  pending: IPendingCount;
  systemResources: ISystemResources;
  scaleChanges: number;
}

export interface IManagerConfig {
  config: IManagerSettings;
  currentState: IManagerState;
  alerts: IAlert[];
  dailyStats: IDailyStats[];
}

// Worker Stats Types
export interface IRunStats {
  runId: string;
  workerType: 'verification' | 'update' | 'stuck';
  workerId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalToProcess: number;
  processed: number;
  success: number;
  errors: number;
  skipped: number;
  movimientosFound: number;
  privateCausas: number;
  publicCausas: number;
}

export interface IHourlyStats {
  hour: number;
  processed: number;
  success: number;
  errors: number;
  movimientosFound: number;
  avgProcessingTime: number;
  runsCount: number;
}

export interface IDailyWorkerStats {
  date: string;
  workerType: 'verification' | 'update' | 'stuck' | 'all';
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
  totalSkipped: number;
  totalMovimientosFound: number;
  totalPrivateCausas: number;
  totalPublicCausas: number;
  runsCompleted: number;
  runsFailed: number;
  runsCancelled: number;
  totalRunTime: number;
  avgRunTime: number;
  hourlyStats: IHourlyStats[];
  topErrors: {
    errorType: string;
    count: number;
    lastOccurrence: string;
  }[];
  avgProcessingTime: number;
  peakProcessingHour: number;
  peakProcessingCount: number;
}

// ========== API FUNCTIONS ==========

// Configuration
export const getConfig = async (): Promise<IConfiguracionEje> => {
  const response = await ejeAxios.get('/config');
  return response.data.data;
};

export const updateConfig = async (updates: Partial<IConfiguracionEje>): Promise<IConfiguracionEje> => {
  const response = await ejeAxios.patch('/config', updates);
  return response.data.data;
};

export const toggleEnabled = async (): Promise<{ enabled: boolean }> => {
  const response = await ejeAxios.post('/config/toggle');
  return response.data;
};

// Manager Configuration
export const getManagerConfig = async (): Promise<IManagerConfig> => {
  const response = await ejeAxios.get('/config/manager');
  return response.data.data;
};

export const getManagerConfigFull = async (): Promise<any> => {
  const response = await ejeAxios.get('/config/manager/full');
  return response.data.data;
};

export const updateManagerConfig = async (updates: Partial<IManagerSettings>): Promise<IManagerSettings> => {
  const response = await ejeAxios.patch('/config/manager', updates);
  return response.data.data;
};

export const toggleManager = async (): Promise<{ isRunning: boolean }> => {
  const response = await ejeAxios.post('/config/manager/toggle');
  return response.data;
};

export const pauseManager = async (): Promise<{ isPaused: boolean }> => {
  const response = await ejeAxios.post('/config/manager/pause');
  return response.data;
};

export const getManagerHistory = async (hours: number = 24): Promise<IHistorySnapshot[]> => {
  const response = await ejeAxios.get('/config/manager/history', { params: { hours } });
  return response.data.data;
};

export const getAlerts = async (acknowledged: boolean = false): Promise<IAlert[]> => {
  const response = await ejeAxios.get('/config/manager/alerts', { params: { acknowledged } });
  return response.data.data;
};

export const acknowledgeAlert = async (index: number): Promise<void> => {
  await ejeAxios.post(`/config/manager/alerts/${index}/acknowledge`);
};

export const getDailyStats = async (days: number = 30): Promise<IDailyStats[]> => {
  const response = await ejeAxios.get('/config/manager/daily-stats', { params: { days } });
  return response.data.data;
};

// Worker Stats
export const getWorkerStats = async (workerType?: 'verification' | 'update' | 'stuck'): Promise<any[]> => {
  const response = await ejeAxios.get('/config/worker-stats', { params: { workerType } });
  return response.data.data;
};

export const getTodaySummary = async (workerType?: 'verification' | 'update' | 'stuck'): Promise<IDailyWorkerStats[]> => {
  const response = await ejeAxios.get('/config/worker-stats/today', { params: { workerType } });
  return response.data.data;
};

export const getRunHistory = async (
  workerType: 'verification' | 'update' | 'stuck',
  workerId: string,
  limit: number = 20
): Promise<{ currentRun: IRunStats | null; runHistory: IRunStats[] }> => {
  const response = await ejeAxios.get(`/config/worker-stats/${workerType}/${workerId}/runs`, { params: { limit } });
  return response.data.data;
};

export default {
  getConfig,
  updateConfig,
  toggleEnabled,
  getManagerConfig,
  getManagerConfigFull,
  updateManagerConfig,
  toggleManager,
  pauseManager,
  getManagerHistory,
  getAlerts,
  acknowledgeAlert,
  getDailyStats,
  getWorkerStats,
  getTodaySummary,
  getRunHistory
};
