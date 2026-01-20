import adminAxios from "utils/adminAxios";
import {
	AdminTask,
	TaskResponse,
	TasksResponse,
	TaskStatsResponse,
	TaskFilterOptionsResponse,
	BulkActionResponse,
	CreateTaskRequest,
	UpdateTaskRequest,
	TasksQueryParams,
	TaskStatus,
} from "types/admin-task";

/**
 * Servicio para gestionar las tareas administrativas
 */
class AdminTasksService {
	/**
	 * Crear una nueva tarea
	 */
	static async createTask(data: CreateTaskRequest): Promise<TaskResponse> {
		try {
			const response = await adminAxios.post<TaskResponse>("/api/admin-tasks", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al crear la tarea");
		}
	}

	/**
	 * Obtener todas las tareas con filtros y paginación
	 */
	static async getTasks(params: TasksQueryParams = {}): Promise<TasksResponse> {
		try {
			const response = await adminAxios.get<TasksResponse>("/api/admin-tasks", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener las tareas");
		}
	}

	/**
	 * Obtener una tarea por ID
	 */
	static async getTaskById(id: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.get<TaskResponse>(`/api/admin-tasks/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener la tarea");
		}
	}

	/**
	 * Actualizar una tarea
	 */
	static async updateTask(id: string, data: UpdateTaskRequest): Promise<TaskResponse> {
		try {
			const response = await adminAxios.put<TaskResponse>(`/api/admin-tasks/${id}`, data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar la tarea");
		}
	}

	/**
	 * Eliminar una tarea
	 */
	static async deleteTask(id: string): Promise<BulkActionResponse> {
		try {
			const response = await adminAxios.delete<BulkActionResponse>(`/api/admin-tasks/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar la tarea");
		}
	}

	/**
	 * Cambiar estado de una tarea
	 */
	static async updateTaskStatus(id: string, status: TaskStatus): Promise<TaskResponse> {
		try {
			const response = await adminAxios.patch<TaskResponse>(`/api/admin-tasks/${id}/status`, { status });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar el estado");
		}
	}

	/**
	 * Archivar/Desarchivar una tarea
	 */
	static async toggleArchive(id: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.patch<TaskResponse>(`/api/admin-tasks/${id}/archive`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al archivar/desarchivar");
		}
	}

	/**
	 * Pinear/Despinear una tarea
	 */
	static async togglePin(id: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.patch<TaskResponse>(`/api/admin-tasks/${id}/pin`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al fijar/desfijar");
		}
	}

	/**
	 * Agregar subtarea
	 */
	static async addSubtask(taskId: string, title: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.post<TaskResponse>(`/api/admin-tasks/${taskId}/subtasks`, { title });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al agregar subtarea");
		}
	}

	/**
	 * Actualizar subtarea
	 */
	static async updateSubtask(
		taskId: string,
		subtaskId: string,
		data: { title?: string; completed?: boolean }
	): Promise<TaskResponse> {
		try {
			const response = await adminAxios.patch<TaskResponse>(`/api/admin-tasks/${taskId}/subtasks/${subtaskId}`, data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar subtarea");
		}
	}

	/**
	 * Eliminar subtarea
	 */
	static async deleteSubtask(taskId: string, subtaskId: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.delete<TaskResponse>(`/api/admin-tasks/${taskId}/subtasks/${subtaskId}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar subtarea");
		}
	}

	/**
	 * Agregar comentario
	 */
	static async addComment(taskId: string, content: string, createdBy?: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.post<TaskResponse>(`/api/admin-tasks/${taskId}/comments`, {
				content,
				createdBy,
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al agregar comentario");
		}
	}

	/**
	 * Eliminar comentario
	 */
	static async deleteComment(taskId: string, commentId: string): Promise<TaskResponse> {
		try {
			const response = await adminAxios.delete<TaskResponse>(`/api/admin-tasks/${taskId}/comments/${commentId}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar comentario");
		}
	}

	/**
	 * Obtener estadísticas
	 */
	static async getStats(params: { project?: string; assignedTo?: string; createdBy?: string } = {}): Promise<TaskStatsResponse> {
		try {
			const response = await adminAxios.get<TaskStatsResponse>("/api/admin-tasks/stats", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas");
		}
	}

	/**
	 * Obtener tareas próximas a vencer
	 */
	static async getUpcoming(days: number = 7, limit: number = 10): Promise<{ success: boolean; data: AdminTask[] }> {
		try {
			const response = await adminAxios.get<{ success: boolean; data: AdminTask[] }>("/api/admin-tasks/upcoming", {
				params: { days, limit },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener tareas próximas");
		}
	}

	/**
	 * Obtener tareas vencidas
	 */
	static async getOverdue(limit: number = 20): Promise<{ success: boolean; data: AdminTask[] }> {
		try {
			const response = await adminAxios.get<{ success: boolean; data: AdminTask[] }>("/api/admin-tasks/overdue", {
				params: { limit },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener tareas vencidas");
		}
	}

	/**
	 * Obtener opciones para filtros
	 */
	static async getFilterOptions(): Promise<TaskFilterOptionsResponse> {
		try {
			const response = await adminAxios.get<TaskFilterOptionsResponse>("/api/admin-tasks/options");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener opciones de filtro");
		}
	}

	/**
	 * Eliminar múltiples tareas
	 */
	static async bulkDelete(ids: string[]): Promise<BulkActionResponse> {
		try {
			const response = await adminAxios.post<BulkActionResponse>("/api/admin-tasks/bulk-delete", { ids });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar tareas");
		}
	}

	/**
	 * Actualizar estado de múltiples tareas
	 */
	static async bulkUpdateStatus(ids: string[], status: TaskStatus): Promise<BulkActionResponse> {
		try {
			const response = await adminAxios.patch<BulkActionResponse>("/api/admin-tasks/bulk-status", { ids, status });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar estado de tareas");
		}
	}
}

export default AdminTasksService;
