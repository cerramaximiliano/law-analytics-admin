// Service to manage authentication tokens for cross-domain API calls
class AuthTokenService {
	private token: string | null = null;
	private tokenExpiry: number | null = null;

	// Store token in memory (not in localStorage for security)
	setToken(token: string, expiresIn?: number) {
		this.token = token;
		if (expiresIn) {
			this.tokenExpiry = Date.now() + expiresIn * 1000;
		}
	}

	// Get token if not expired
	getToken(): string | null {
		if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
			this.clearToken();
			return null;
		}
		return this.token;
	}

	// Clear token
	clearToken() {
		this.token = null;
		this.tokenExpiry = null;
	}

	// Remove token (alias for clearToken)
	removeToken() {
		this.clearToken();
	}

	// Check if token is valid
	isTokenValid(): boolean {
		return !!this.getToken();
	}
}

const authTokenService = new AuthTokenService();
export default authTokenService;
