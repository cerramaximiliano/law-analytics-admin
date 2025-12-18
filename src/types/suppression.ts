// AWS SES Suppression List Types

export interface SuppressedEmail {
	EmailAddress: string;
	Reason: "BOUNCE" | "COMPLAINT";
	LastUpdateTime: string;
}

export interface SuppressionListResponse {
	success: boolean;
	count: number;
	data: SuppressedEmail[];
}

export interface SuppressionCheckResponse {
	success: boolean;
	email: string;
	isSuppressed: boolean;
	data: {
		EmailAddress: string;
		Reason: "BOUNCE" | "COMPLAINT";
		LastUpdateTime: string;
		Attributes?: {
			MessageId?: string;
			FeedbackId?: string;
		};
	} | null;
}

export interface SuppressionCheckAndUpdateResponse {
	success: boolean;
	email: string;
	isSuppressed: boolean;
	reason?: "BOUNCE" | "COMPLAINT";
	lastUpdateTime?: string;
	contactFound?: boolean;
	contactUpdated?: boolean;
	previousStatus?: string;
	newStatus?: string;
	message?: string;
}

export interface SuppressionSyncResults {
	totalSuppressed: number;
	bounces: number;
	complaints: number;
	contactsUpdated: number;
	contactsNotFound: number;
	contactsAlreadyBounced: number;
	errors: Array<{
		email: string;
		error: string;
	}>;
	dryRun: boolean;
	duration: number;
}

export interface SuppressionSyncResponse {
	success: boolean;
	message: string;
	results: SuppressionSyncResults;
}
