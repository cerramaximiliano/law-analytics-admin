import adminAxios from "utils/adminAxios";
import {
	McpUsageQueryParams,
	McpUsageSummaryResponse,
	McpUsageListResponse,
	McpUsageByToolItem,
	McpUsageByUserItem,
	McpUsageErrorItem,
	McpUsageTimeseriesResponse,
	McpUsageByClientResponse,
} from "types/mcpUsage";

// ==============================|| MCP USAGE SERVICE ||============================== //
//
// Métricas de uso de la-mcp-server (tool calls de Claude.ai / ChatGPT). Lee de
// admin-api /api/mcp-usage/* (solo admin).

async function get<T>(path: string, params: McpUsageQueryParams | undefined, fallback: string): Promise<T> {
	try {
		const response = await adminAxios.get(`/api/mcp-usage${path}`, { params });
		return response.data;
	} catch (error: any) {
		throw new Error(error.response?.data?.message || fallback);
	}
}

class McpUsageService {
	static getSummary(params?: McpUsageQueryParams): Promise<McpUsageSummaryResponse> {
		return get("/summary", params, "Error al obtener el resumen de uso del MCP");
	}

	static getByTool(params?: McpUsageQueryParams): Promise<McpUsageListResponse<McpUsageByToolItem>> {
		return get("/by-tool", params, "Error al obtener el uso por tool");
	}

	static getByUser(params?: McpUsageQueryParams): Promise<McpUsageListResponse<McpUsageByUserItem>> {
		return get("/by-user", params, "Error al obtener el uso por usuario");
	}

	static getErrors(params?: McpUsageQueryParams): Promise<McpUsageListResponse<McpUsageErrorItem>> {
		return get("/errors", params, "Error al obtener los errores recientes");
	}

	static getTimeseries(params?: McpUsageQueryParams): Promise<McpUsageTimeseriesResponse> {
		return get("/timeseries", params, "Error al obtener la serie diaria");
	}

	static getByClient(params?: McpUsageQueryParams): Promise<McpUsageByClientResponse> {
		return get("/by-client", params, "Error al obtener el uso por cliente");
	}
}

export default McpUsageService;
