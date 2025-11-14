// Interfaces for Segment schema structure
export type SegmentType = "static" | "dynamic";
export type ConditionOperator = "and" | "or";
export type FilterOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "greater_than"
	| "less_than"
	| "starts_with"
	| "ends_with"
	| "exists"
	| "not_exists"
	| "between"
	| "not_between"
	| "in"
	| "not_in";

export interface SegmentFilter {
	field: string;
	operator: FilterOperator;
	value?: any;
	values?: any[];
}

export interface SegmentConditions {
	operator: ConditionOperator;
	filters: SegmentFilter[];
}

export interface AutoUpdate {
	enabled: boolean;
	frequency: {
		value: number;
		unit: "minutes" | "hours" | "days";
	};
}

export interface SegmentMetrics {
	contactCount: number;
	openRate?: number;
	clickRate?: number;
	conversionRate?: number;
}

export interface Segment {
	_id?: string;
	name: string;
	description?: string;
	type: SegmentType;
	conditions: SegmentConditions;
	contacts?: string[]; // IDs de los contactos para segmentos estáticos
	estimatedCount: number;
	lastCalculated?: Date | string;
	autoUpdate: AutoUpdate;
	createdBy?: string;
	lastModifiedBy?: string;
	isActive: boolean;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}

// Interface for API responses
export interface SegmentResponse {
	success: boolean;
	data: Segment[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
	message?: string;
}

// Interface for single segment response
export interface SingleSegmentResponse {
	success: boolean;
	data: Segment;
	message?: string;
}

// Interface for segment creation/update
export interface SegmentInput {
	name: string;
	description?: string;
	type?: SegmentType;
	isActive?: boolean;
	conditions?: SegmentConditions;
	contacts?: string[]; // Para segmentos estáticos
	autoUpdate?: {
		enabled?: boolean;
		frequency?: {
			value?: number;
			unit?: "minutes" | "hours" | "days";
		};
	};
}
