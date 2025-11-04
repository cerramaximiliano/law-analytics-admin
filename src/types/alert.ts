// Placeholder alert types - not used in admin project
export interface Alert {
	_id: string;
	id: string;
	message: string;
	type: "success" | "error" | "warning" | "info";
	read?: boolean;
	primaryText?: string;
	secondaryText?: string;
	expirationDate?: string;
	avatarIcon?: string;
	avatarInitial?: string;
	avatarSize?: string;
	avatarType?: string;
	sourceType?: string;
	sourceId?: string;
	folderId?: string;
}
