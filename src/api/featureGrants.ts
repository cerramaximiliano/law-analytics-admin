import adminAxios from "utils/adminAxios";

export type KnownFeature = "mcp_access";

export interface FeatureGrantMeta {
	granted: boolean;
	grantedAt?: string;
	grantedBy?: string;
	revokedAt?: string;
	revokedBy?: string;
	reason?: string | null;
}

// El backend acepta tanto `true` literal como un objeto con metadata.
export type FeatureGrantValue = boolean | FeatureGrantMeta;

export interface UserFeatureGrants {
	[feature: string]: FeatureGrantValue;
}

export interface UserWithGrants {
	_id: string;
	email?: string;
	name?: string;
	featureGrants?: UserFeatureGrants;
}

export interface ListResponse {
	success: boolean;
	data: {
		items: UserWithGrants[];
		page: number;
		limit: number;
		total: number;
		knownFeatures: KnownFeature[];
	};
}

export interface GetUserResponse {
	success: boolean;
	data: {
		userId: string;
		email?: string;
		name?: string;
		featureGrants: UserFeatureGrants;
		knownFeatures: KnownFeature[];
	};
}

export interface SetGrantResponse {
	success: boolean;
	data: { userId: string; featureGrants: UserFeatureGrants };
}

/**
 * Lista users con feature grants. Si se pasa `feature`, filtra solo los que tengan
 * ese feature granteado (o revocado pero con flag presente).
 */
export async function listUsersWithGrants(params: {
	feature?: KnownFeature;
	page?: number;
	limit?: number;
}): Promise<ListResponse["data"]> {
	const res = await adminAxios.get<ListResponse>("/api/feature-grants", { params });
	return res.data.data;
}

/**
 * Trae los grants de un user específico.
 */
export async function getUserGrants(userId: string): Promise<GetUserResponse["data"]> {
	const res = await adminAxios.get<GetUserResponse>(`/api/feature-grants/${userId}`);
	return res.data.data;
}

/**
 * Setea/actualiza el grant de un feature para un user.
 */
export async function setUserGrant(
	userId: string,
	feature: KnownFeature,
	body: { granted: boolean; reason?: string | null }
): Promise<SetGrantResponse["data"]> {
	const res = await adminAxios.put<SetGrantResponse>(`/api/feature-grants/${userId}/${feature}`, body);
	return res.data.data;
}

/**
 * Elimina el grant (lo borra del documento — distinto de revocar con granted:false).
 */
export async function deleteUserGrant(
	userId: string,
	feature: KnownFeature
): Promise<SetGrantResponse["data"]> {
	const res = await adminAxios.delete<SetGrantResponse>(`/api/feature-grants/${userId}/${feature}`);
	return res.data.data;
}

/**
 * Helper: extrae si un grant está activo (acepta los dos formatos del backend).
 */
export function isGrantActive(value: FeatureGrantValue | undefined): boolean {
	if (value === true) return true;
	if (typeof value === "object" && value !== null) return value.granted === true;
	return false;
}
