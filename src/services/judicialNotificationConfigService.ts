import axios from "axios";

interface JudicialNotificationConfig {
	_id?: string;
	configKey: string;
	notificationSchedule: {
		dailyNotificationHour: number;
		dailyNotificationMinute: number;
		timezone: string;
		activeDays: number[];
	};
	limits: {
		maxMovementsPerBatch: number;
		maxNotificationsPerUserPerDay: number;
		minHoursBetweenSameExpediente: number;
	};
	retryConfig: {
		maxRetries: number;
		initialRetryDelay: number;
		backoffMultiplier: number;
		webhookTimeout: number;
	};
	contentConfig: {
		includeFullCaratula: boolean;
		maxDetalleLength: number;
		includeExpedienteLink: boolean;
		groupMovementsByExpediente: boolean;
	};
	filters: {
		excludedMovementTypes: string[];
		excludedKeywords: string[];
		includedMovementTypes: string[];
	};
	dataRetention: {
		judicialMovementRetentionDays: number;
		notificationLogRetentionDays: number;
		alertRetentionDays: number;
		autoCleanupEnabled: boolean;
		cleanupHour: number;
	};
	endpoints: {
		notificationServiceUrl: string;
		judicialMovementsEndpoint: string;
		fallbackServiceUrl: string | null;
	};
	status: {
		enabled: boolean;
		mode: string;
		maintenanceMessage: string;
	};
	stats?: {
		lastNotificationSentAt: string | null;
		totalNotificationsSent: number;
		totalMovementsProcessed: number;
		lastError?: {
			message: string;
			timestamp: string;
			count: number;
		} | null;
	};
	metadata?: {
		createdBy: string;
		lastModifiedBy: string;
		version: string;
		notes: string;
	};
	createdAt?: string;
	updatedAt?: string;
}

class JudicialNotificationConfigService {
	private getEndpoint(): string {
		const apiBase = import.meta.env.VITE_NOTIFICATION_URL || import.meta.env.VITE_API_PJN || "";
		return `${apiBase}/api/judicial-notification-config`;
	}

	async getConfig(): Promise<JudicialNotificationConfig> {
		try {
			const response = await axios.get(this.getEndpoint());

			if (response.data && response.data.success) {
				return response.data.data;
			} else {
				throw new Error(response.data?.message || "No se pudo cargar la configuración. Por favor, intente nuevamente.");
			}
		} catch (error: any) {
			console.error("Error fetching judicial notification config:", error);

			// Handle different error scenarios with user-friendly messages
			if (error.response) {
				// Server responded with an error
				if (error.response.status === 404) {
					throw new Error("La configuración no existe. Se creará una nueva configuración por defecto.");
				} else if (error.response.status === 403) {
					throw new Error("No tiene permisos para ver esta configuración.");
				} else if (error.response.status === 500) {
					throw new Error("Error en el servidor. Por favor, contacte al administrador.");
				} else if (error.response.data?.message) {
					throw new Error(error.response.data.message);
				}
			} else if (error.request) {
				// Request was made but no response
				throw new Error("No se pudo conectar con el servidor. Verifique su conexión a internet.");
			}

			throw new Error("Error inesperado al cargar la configuración. Por favor, intente nuevamente.");
		}
	}

	async updateConfig(updates: Partial<JudicialNotificationConfig>): Promise<JudicialNotificationConfig> {
		try {
			const response = await axios.patch(this.getEndpoint(), updates);

			if (response.data && response.data.success) {
				return response.data.data;
			} else {
				throw new Error(response.data?.message || "No se pudo actualizar la configuración. Por favor, intente nuevamente.");
			}
		} catch (error: any) {
			console.error("Error updating judicial notification config:", error);

			// Handle different error scenarios with user-friendly messages
			if (error.response) {
				// Server responded with an error
				if (error.response.status === 400) {
					throw new Error("Los datos enviados no son válidos. Por favor, revise los campos.");
				} else if (error.response.status === 403) {
					throw new Error("No tiene permisos para modificar esta configuración.");
				} else if (error.response.status === 404) {
					throw new Error("La configuración no existe. Por favor, recargue la página.");
				} else if (error.response.status === 422) {
					throw new Error("Los valores ingresados no cumplen con el formato requerido.");
				} else if (error.response.status === 500) {
					throw new Error("Error en el servidor al guardar los cambios. Por favor, contacte al administrador.");
				} else if (error.response.data?.message) {
					throw new Error(error.response.data.message);
				}
			} else if (error.request) {
				// Request was made but no response
				throw new Error("No se pudo conectar con el servidor. Verifique su conexión y vuelva a intentar.");
			}

			throw new Error("Error inesperado al guardar los cambios. Por favor, intente nuevamente.");
		}
	}

	async toggleNotifications(): Promise<{ enabled: boolean; mode: string }> {
		try {
			const response = await axios.post(`${this.getEndpoint()}/toggle`);

			if (response.data && response.data.success) {
				return response.data.data;
			} else {
				throw new Error(response.data?.message || "No se pudo cambiar el estado de las notificaciones.");
			}
		} catch (error: any) {
			console.error("Error toggling judicial notifications:", error);

			// Handle different error scenarios with user-friendly messages
			if (error.response) {
				// Server responded with an error
				if (error.response.status === 403) {
					throw new Error("No tiene permisos para cambiar el estado de las notificaciones.");
				} else if (error.response.status === 404) {
					throw new Error("La configuración no existe. Por favor, recargue la página.");
				} else if (error.response.status === 409) {
					throw new Error("No se puede cambiar el estado en este momento. Hay procesos en ejecución.");
				} else if (error.response.status === 500) {
					throw new Error("Error en el servidor. Por favor, contacte al administrador.");
				} else if (error.response.data?.message) {
					throw new Error(error.response.data.message);
				}
			} else if (error.request) {
				// Request was made but no response
				throw new Error("No se pudo conectar con el servidor. Verifique su conexión.");
			}

			throw new Error("Error inesperado al cambiar el estado. Por favor, intente nuevamente.");
		}
	}
}

const judicialNotificationConfigService = new JudicialNotificationConfigService();
export default judicialNotificationConfigService;
