// Placeholder temporal para tipos de API Service
// Este archivo será implementado completamente en Fase 2

export interface ApiServiceState {
	isLoading: boolean;
	error: string | null;
}

export const initialState: ApiServiceState = {
	isLoading: false,
	error: null,
};

// Tipos temporales para soporte de auth
export interface Payment {
	id: string;
	amount: number;
	currency: string;
	status: string;
	created: number;
	description?: string;
}
