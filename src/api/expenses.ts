import adminAxios from "utils/adminAxios";

// Interfaces
export interface Expense {
	_id: string;
	date: string;
	amount: number;
	currency: "USD" | "ARS" | "EUR";
	type: string;
	description: string;
	notes?: string;
	provider?: string;
	reference?: string;
	isRecurring: boolean;
	recurringPeriod?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | null;
	status: "pending" | "paid" | "cancelled";
	tags?: string[];
	createdBy?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ExpenseType {
	value: string;
	label: string;
}

export interface ExpenseFilters {
	page?: number;
	limit?: number;
	type?: string;
	status?: string;
	startDate?: string;
	endDate?: string;
	minAmount?: number;
	maxAmount?: number;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ExpenseListResponse {
	success: boolean;
	data: Expense[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface ExpenseResponse {
	success: boolean;
	data: Expense;
	message?: string;
}

export interface ExpenseTypesResponse {
	success: boolean;
	data: ExpenseType[];
}

export interface ExpenseStatsResponse {
	success: boolean;
	data: {
		totals: {
			totalAmount: number;
			totalCount: number;
			avgAmount: number;
			minAmount: number;
			maxAmount: number;
		};
		byType: Array<{
			_id: string;
			total: number;
			count: number;
			avgAmount: number;
		}>;
		byMonth: Array<{
			_id: number;
			total: number;
			count: number;
		}>;
		byCurrency: Array<{
			_id: string;
			total: number;
			count: number;
		}>;
		byStatus: Array<{
			_id: string;
			total: number;
			count: number;
		}>;
		recentExpenses: Expense[];
		year: number;
	};
}

export interface CreateExpenseData {
	date: string;
	amount: number;
	currency?: string;
	type: string;
	description: string;
	notes?: string;
	provider?: string;
	reference?: string;
	isRecurring?: boolean;
	recurringPeriod?: string;
	status?: string;
	tags?: string[];
	createdBy?: string;
}

// Service
export const ExpensesService = {
	// Get all expenses with pagination and filters
	async getExpenses(filters: ExpenseFilters = {}): Promise<ExpenseListResponse> {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== "") {
				params.append(key, String(value));
			}
		});
		const response = await adminAxios.get(`/api/expenses?${params.toString()}`);
		return response.data;
	},

	// Get expense by ID
	async getExpenseById(id: string): Promise<ExpenseResponse> {
		const response = await adminAxios.get(`/api/expenses/${id}`);
		return response.data;
	},

	// Create expense
	async createExpense(data: CreateExpenseData): Promise<ExpenseResponse> {
		const response = await adminAxios.post("/api/expenses", data);
		return response.data;
	},

	// Update expense
	async updateExpense(id: string, data: Partial<CreateExpenseData>): Promise<ExpenseResponse> {
		const response = await adminAxios.put(`/api/expenses/${id}`, data);
		return response.data;
	},

	// Delete expense
	async deleteExpense(id: string): Promise<ExpenseResponse> {
		const response = await adminAxios.delete(`/api/expenses/${id}`);
		return response.data;
	},

	// Get expense types
	async getExpenseTypes(): Promise<ExpenseTypesResponse> {
		const response = await adminAxios.get("/api/expenses/types");
		return response.data;
	},

	// Get expense statistics
	async getExpenseStats(params?: { startDate?: string; endDate?: string; year?: number }): Promise<ExpenseStatsResponse> {
		const queryParams = new URLSearchParams();
		if (params?.startDate) queryParams.append("startDate", params.startDate);
		if (params?.endDate) queryParams.append("endDate", params.endDate);
		if (params?.year) queryParams.append("year", String(params.year));
		const response = await adminAxios.get(`/api/expenses/stats?${queryParams.toString()}`);
		return response.data;
	},

	// Bulk create expenses
	async bulkCreateExpenses(expenses: CreateExpenseData[]): Promise<{ success: boolean; message: string; data: Expense[] }> {
		const response = await adminAxios.post("/api/expenses/bulk", { expenses });
		return response.data;
	},
};

export default ExpensesService;
