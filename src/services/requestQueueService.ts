import { AxiosRequestConfig, AxiosResponse } from "axios";

interface QueuedRequest {
	config: AxiosRequestConfig;
	resolve: (value: AxiosResponse) => void;
	reject: (reason: any) => void;
}

class RequestQueueService {
	private queue: QueuedRequest[] = [];
	private isProcessing = false;
	private subscribers: Set<() => void> = new Set();

	// Agregar una petición a la cola
	public enqueue(config: AxiosRequestConfig): Promise<AxiosResponse> {
		return new Promise((resolve, reject) => {
			this.queue.push({ config, resolve, reject });
		});
	}

	// Procesar todas las peticiones en cola
	public async processQueue(axiosInstance: any): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;
		const pendingRequests = [...this.queue];
		this.queue = [];

		for (const request of pendingRequests) {
			try {
				// Reintentar la petición original
				const response = await axiosInstance({
					...request.config,
					_retry: true,
					_queued: true,
				});
				request.resolve(response);
			} catch (error) {
				request.reject(error);
			}
		}

		this.isProcessing = false;
		this.notifySubscribers();
	}

	// Limpiar la cola sin procesar
	public clearQueue(): void {
		const error = new Error("Por favor, vuelva a iniciar sesión para continuar");
		this.queue.forEach((request) => {
			request.reject(error);
		});
		this.queue = [];
		this.isProcessing = false;
		this.notifySubscribers();
	}

	// Suscribirse a cambios en la cola
	public subscribe(callback: () => void): () => void {
		this.subscribers.add(callback);
		return () => {
			this.subscribers.delete(callback);
		};
	}

	// Notificar a los suscriptores
	private notifySubscribers(): void {
		this.subscribers.forEach((callback) => callback());
	}

	// Obtener el número de peticiones en cola
	public getQueueLength(): number {
		return this.queue.length;
	}

	// Verificar si hay peticiones en cola
	public hasQueuedRequests(): boolean {
		return this.queue.length > 0;
	}

	// Alias for clearQueue
	public clear(): void {
		this.clearQueue();
	}
}

export const requestQueueService = new RequestQueueService();
