import adminAxios from "utils/adminAxios";

export interface TrialResources {
  folders: { current: number; limit: number; atRisk: number };
  calculators: { current: number; limit: number; atRisk: number };
  contacts: { current: number; limit: number; atRisk: number };
  totalAtRisk: number;
}

export type TrialUrgency = "ok" | "attention" | "warning" | "critical" | "expired" | "unknown";

export interface TrialSubscription {
  _id: string;
  user: { _id: string; email: string; name: string } | null;
  plan: string;
  status: string;
  trialStart: string | null;
  trialEnd: string | null;
  daysRemaining: number | null;
  urgency: TrialUrgency;
  resources: TrialResources | null;
  paymentMethod: string | null;
  testMode: boolean;
  createdAt: string;
}

export interface TrialStats {
  total: number;
  active: number;
  expired: number;
  expiring1d: number;
  expiring3d: number;
  expiring7d: number;
}

export interface GetTrialSubscriptionsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  expiringSoon?: "1" | "3" | "7";
  testMode?: boolean;
}

export interface TrialSubscriptionsResponse {
  success: boolean;
  data: TrialSubscription[];
  stats: { total: number; page: number; limit: number; totalPages: number };
}

export interface TrialStatsResponse {
  success: boolean;
  data: TrialStats;
}

class TrialsService {
  async getTrialSubscriptions(params: GetTrialSubscriptionsParams = {}): Promise<TrialSubscriptionsResponse> {
    const response = await adminAxios.get("/api/trials", { params });
    return response.data;
  }

  async getTrialStats(): Promise<TrialStatsResponse> {
    const response = await adminAxios.get("/api/trials/stats");
    return response.data;
  }
}

export default new TrialsService();
