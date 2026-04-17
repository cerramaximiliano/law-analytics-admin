import adminAxios from 'utils/adminAxios';
import type {
  InfolegConfigResponse,
  InfolegStatsResponse,
  InfolegNormasResponse,
  InfolegNormaResponse,
  InfolegWorkersResponse,
  InfolegNormaFilters,
  InfolegWorkerConfig,
  InfolegScrapingConfig,
  InfolegEmailConfig,
} from 'types/infoleg';

const BASE = '/api/infoleg';

// ── Config ────────────────────────────────────────────────────

const getConfig = async (): Promise<InfolegConfigResponse> => {
  const res = await adminAxios.get<InfolegConfigResponse>(`${BASE}/config`);
  return res.data;
};

interface UpdateConfigPayload {
  scraping?:      Partial<InfolegScrapingConfig>;
  workers?:       { scraper?: Partial<InfolegWorkerConfig>; vinculaciones?: Partial<InfolegWorkerConfig> };
  email?:         Partial<InfolegEmailConfig>;
  checkInterval?: number;
}

const updateConfig = async (payload: UpdateConfigPayload): Promise<InfolegConfigResponse> => {
  const res = await adminAxios.put<InfolegConfigResponse>(`${BASE}/config`, payload);
  return res.data;
};

// ── Stats ─────────────────────────────────────────────────────

const getStats = async (): Promise<InfolegStatsResponse> => {
  const res = await adminAxios.get<InfolegStatsResponse>(`${BASE}/stats`);
  return res.data;
};

const getHistory = async (limit = 60) => {
  const res = await adminAxios.get(`${BASE}/history`, { params: { limit } });
  return res.data;
};

const getAlerts = async () => {
  const res = await adminAxios.get(`${BASE}/alerts`);
  return res.data;
};

// ── Normas ────────────────────────────────────────────────────

const listNormas = async (filters: InfolegNormaFilters = {}): Promise<InfolegNormasResponse> => {
  const res = await adminAxios.get<InfolegNormasResponse>(`${BASE}/normas`, { params: filters });
  return res.data;
};

const getNorma = async (
  id: number | string,
  options: { includeText?: boolean; includeVinculaciones?: boolean } = {}
): Promise<InfolegNormaResponse> => {
  const res = await adminAxios.get<InfolegNormaResponse>(`${BASE}/normas/${id}`, {
    params: {
      includeText:         options.includeText         ?? true,
      includeVinculaciones: options.includeVinculaciones ?? true,
    },
  });
  return res.data;
};

// ── Workers ───────────────────────────────────────────────────

const getWorkers = async (): Promise<InfolegWorkersResponse> => {
  const res = await adminAxios.get<InfolegWorkersResponse>(`${BASE}/workers`);
  return res.data;
};

const restartWorker = async (name: string): Promise<{ success: boolean; message: string }> => {
  const res = await adminAxios.post(`${BASE}/workers/${name}/restart`);
  return res.data;
};

const scaleWorker = async (name: string, instances: number): Promise<{ success: boolean; message: string }> => {
  const res = await adminAxios.post(`${BASE}/workers/${name}/scale`, { instances });
  return res.data;
};

// ── Mantenimiento ─────────────────────────────────────────────

const seedRange = async (
  fromId: number,
  toId: number
): Promise<{ success: boolean; message: string; data: { fromId: number; toId: number; inserted: number; total: number } }> => {
  const res = await adminAxios.post(`${BASE}/seed`, { fromId, toId });
  return res.data;
};

const InfolegService = {
  getConfig,
  updateConfig,
  getStats,
  getHistory,
  getAlerts,
  listNormas,
  getNorma,
  getWorkers,
  restartWorker,
  scaleWorker,
  seedRange,
};

export default InfolegService;
