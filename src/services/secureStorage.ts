import Cookies from "js-cookie";

interface SecureStorageOptions {
	expires?: number; // días
	secure?: boolean;
	sameSite?: "strict" | "lax" | "none";
}

class SecureStorageService {
	private readonly defaultOptions: SecureStorageOptions = {
		expires: 7, // 7 días por defecto
		secure: import.meta.env.MODE === "production",
		sameSite: "strict",
	};

	// Almacenar token de forma segura
	setAuthToken(token: string, remember: boolean = false): void {
		const options = {
			...this.defaultOptions,
			expires: remember ? 30 : 1, // 30 días si "recordar", 1 día si no
			// NOTA: httpOnly no se puede setear desde JavaScript
			// El backend debe setear la cookie con httpOnly=true
		};

		// Este es un almacenamiento temporal hasta que el backend implemente cookies httpOnly
		Cookies.set("auth_token_temp", token, options);
	}

	// Obtener token
	getAuthToken(): string | undefined {
		return Cookies.get("auth_token_temp");
	}

	// Eliminar token
	removeAuthToken(): void {
		Cookies.remove("auth_token_temp");
		// También intentar eliminar cualquier token que el backend haya seteado
		Cookies.remove("auth_token");
	}

	// Para datos no sensibles, usar sessionStorage
	setSessionData(key: string, value: any): void {
		try {
			sessionStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.error("Error storing session data:", error);
		}
	}

	getSessionData<T = any>(key: string): T | null {
		try {
			const data = sessionStorage.getItem(key);
			return data ? JSON.parse(data) : null;
		} catch (error) {
			console.error("Error reading session data:", error);
			return null;
		}
	}

	removeSessionData(key: string): void {
		sessionStorage.removeItem(key);
	}

	// Limpiar toda la sesión
	clearSession(): void {
		// Limpiar cookies
		this.removeAuthToken();

		// Limpiar sessionStorage
		sessionStorage.clear();

		// Limpiar localStorage (por si quedó algo)
		this.clearLegacyStorage();
	}

	// Limpiar datos legacy de localStorage
	private clearLegacyStorage(): void {
		const keysToRemove = ["token", "auth_token", "googleToken", "reset_code", "reset_email", "user", "userInfo"];

		keysToRemove.forEach((key) => {
			localStorage.removeItem(key);
		});
	}

	// Migrar datos de localStorage a cookies/sessionStorage
	migrateFromLocalStorage(): void {
		// Migrar token si existe
		const oldToken = localStorage.getItem("token") || localStorage.getItem("auth_token");
		if (oldToken) {
			this.setAuthToken(oldToken);
			localStorage.removeItem("token");
			localStorage.removeItem("auth_token");
		}

		// Migrar otros datos no sensibles a sessionStorage
		const resetEmail = localStorage.getItem("reset_email");
		if (resetEmail) {
			this.setSessionData("reset_email", resetEmail);
			localStorage.removeItem("reset_email");
		}

		// Limpiar cualquier otro dato sensible
		this.clearLegacyStorage();
	}

	// Verificar si hay datos en localStorage (para debugging)
	checkLegacyStorage(): string[] {
		const foundKeys: string[] = [];
		const sensitiveKeys = ["token", "auth_token", "googleToken", "password", "reset_code"];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
				foundKeys.push(key);
			}
		}

		if (foundKeys.length > 0) {
			console.warn("⚠️ Se encontraron datos sensibles en localStorage:", foundKeys);
		}

		return foundKeys;
	}
}

const secureStorageService = new SecureStorageService();
export default secureStorageService;
