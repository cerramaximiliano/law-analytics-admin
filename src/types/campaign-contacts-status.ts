// Response status interfaces for campaign contact operations

export interface AddAllActiveContactsResponse {
	success: boolean;
	message: string;
	data?: {
		addedCount?: number;
		total?: number;
		totalToAdd?: number;
		status?: string;
		campaignId?: string;
		processedCount?: number;
		startedAt?: string;
		updatedAt?: string;
	};
}

export interface AddAllActiveContactsStatusResponse {
	success: boolean;
	message: string;
	data: {
		status: string;
		processedCount?: number;
		addedCount?: number;
		totalToAdd?: number;
		message?: string;
		completedAt?: string;
		startedAt?: string;
		updatedAt?: string;
		errors?: string[];
		// Backwards compatibility fields
		processed?: number;
		total?: number;
		added?: number;
		failed?: number;
	};
}

export interface RemoveAllContactsResponse {
	success: boolean;
	message: string;
	data?: {
		totalToRemove?: number;
		status?: string;
		campaignId?: string;
	};
}

export interface RemoveAllContactsStatusResponse {
	success: boolean;
	message?: string;
	data: {
		status: string;
		processedCount?: number;
		totalRemoved?: number;
		message?: string;
		completedAt?: string;
		// Backwards compatibility
		totalProcessed?: number;
	};
}

// Process status interface for local component state
export interface ContactsProcessStatus {
	status: string;
	processedCount?: number;
	totalAdded?: number;
	totalToAdd?: number;
	message?: string;
	completedAt?: string;
	// Compatibility with the implementation
	processed?: number;
	total?: number;
	added?: number;
	failed?: number;
}
