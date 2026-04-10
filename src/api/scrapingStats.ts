import workersAxios from "utils/workersAxios";

// ====== Interfaces ======

export interface CaptchaStats {
  resolved: number;
  failed: number;
}

export interface DocStats {
  valid: number;
  invalid: number;
  error: number;
  total: number;
}

export interface StatsTotals {
  captcha: CaptchaStats;
  docs: DocStats;
}

export interface FueroBreakdown {
  [fuero: string]: StatsTotals;
}

export interface HourBreakdown {
  [hour: number]: StatsTotals;
}

export interface DayBreakdown {
  [date: string]: StatsTotals & { byFuero: FueroBreakdown };
}

// GET /api/scraping-stats/today
export interface ScrapingStatsTodayResponse {
  success: boolean;
  data: {
    date: string;
    totals: StatsTotals;
    byFuero: FueroBreakdown;
    byHour: HourBreakdown;
  };
}

// GET /api/scraping-stats/day/:date
export interface ScrapingStatsDayResponse {
  success: boolean;
  data: {
    date: string;
    totals: StatsTotals;
    byFuero: FueroBreakdown;
    byHour: HourBreakdown;
  };
}

// GET /api/scraping-stats/month/:yearMonth
export interface ScrapingStatsMonthResponse {
  success: boolean;
  data: {
    month: string;
    totals: StatsTotals;
    byDay: DayBreakdown;
  };
}

// GET /api/scraping-stats/range
export interface ScrapingStatsRangeResponse {
  success: boolean;
  data: {
    from: string;
    to: string;
    totals: StatsTotals;
    byDay: DayBreakdown;
  };
}

// ====== Service ======

export const ScrapingStatsService = {
  getToday(fuero?: string): Promise<ScrapingStatsTodayResponse> {
    const params = fuero ? { fuero } : {};
    return workersAxios.get("/api/scraping-stats/today", { params }).then((r) => r.data);
  },

  getDay(date: string, fuero?: string): Promise<ScrapingStatsDayResponse> {
    const params = fuero ? { fuero } : {};
    return workersAxios.get(`/api/scraping-stats/day/${date}`, { params }).then((r) => r.data);
  },

  getMonth(yearMonth: string, fuero?: string): Promise<ScrapingStatsMonthResponse> {
    const params = fuero ? { fuero } : {};
    return workersAxios.get(`/api/scraping-stats/month/${yearMonth}`, { params }).then((r) => r.data);
  },

  getRange(from: string, to: string, fuero?: string): Promise<ScrapingStatsRangeResponse> {
    const params: Record<string, string> = { from, to };
    if (fuero) params.fuero = fuero;
    return workersAxios.get("/api/scraping-stats/range", { params }).then((r) => r.data);
  },
};
