import { Plan, PlanPricingInfo } from "types/plan";

/**
 * Obtiene el entorno actual basado en variable de entorno VITE_ENVIRONMENT
 * Si no está definida, intenta detectarlo basado en la URL
 */
export function getCurrentEnvironment(): "development" | "production" {
	// Primero verificar la variable de entorno VITE_ENVIRONMENT
	const envVariable = import.meta.env.VITE_ENVIRONMENT;

	// Si la variable está definida, usarla directamente
	if (envVariable === "production" || envVariable === "development") {
		return envVariable;
	}

	// Fallback: detectar basado en URL (para compatibilidad)
	const baseUrl = import.meta.env.VITE_BASE_URL || "";
	const currentUrl = window.location.hostname;

	// Es desarrollo SOLO si las URLs son localhost o 127.0.0.1
	const isLocalhost =
		(baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) && (currentUrl === "localhost" || currentUrl === "127.0.0.1");

	const detectedEnv = isLocalhost ? "development" : "production";

	// Por defecto, asumimos producción si no es claramente localhost
	return detectedEnv;
}

/**
 * Obtiene la configuración de precios de un plan según el entorno actual
 * Si existe información en environments para el entorno actual, la usa
 * De lo contrario, recurre a pricingInfo (legacy)
 */
export function getPlanPricing(plan: Plan): PlanPricingInfo {
	const environment = getCurrentEnvironment();

	// Si existe configuración de environments para el entorno actual
	if (plan.environments && plan.environments[environment]) {
		const envConfig = plan.environments[environment];
		if (envConfig) {
			return {
				basePrice: envConfig.basePrice ?? plan.pricingInfo.basePrice,
				currency: envConfig.currency ?? plan.pricingInfo.currency,
				billingPeriod: envConfig.billingPeriod ?? plan.pricingInfo.billingPeriod,
				stripePriceId: envConfig.stripePriceId ?? plan.pricingInfo.stripePriceId,
			};
		}
	}

	// Solución temporal: Si estamos en desarrollo y no hay configuración de environments,
	// usar valores predefinidos para desarrollo
	if (
		environment === "development" &&
		!plan.environments &&
		(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
	) {
		const developmentPrices: Record<string, number> = {
			free: 0,
			standard: 1.99,
			premium: 4.99,
		};

		if (developmentPrices[plan.planId] !== undefined) {
			return {
				basePrice: developmentPrices[plan.planId],
				currency: "USD",
				billingPeriod: "daily",
				stripePriceId: plan.pricingInfo.stripePriceId,
			};
		}
	}

	// Fallback a pricingInfo (legacy)
	return plan.pricingInfo;
}

/**
 * Obtiene el ID de Stripe del plan según el entorno actual
 */
export function getStripePriceId(plan: Plan): string | undefined {
	const environment = getCurrentEnvironment();

	// Primero intentar obtener del entorno específico
	if (plan.environments && plan.environments[environment]) {
		const envConfig = plan.environments[environment];
		if (envConfig && envConfig.stripePriceId) {
			return envConfig.stripePriceId;
		}
	}

	// Fallback a stripePriceId directo o pricingInfo
	return plan.stripePriceId || plan.pricingInfo.stripePriceId;
}

/**
 * Obtiene el ID del producto de Stripe según el entorno actual
 */
export function getStripeProductId(plan: Plan): string | undefined {
	const environment = getCurrentEnvironment();

	// Primero intentar obtener del entorno específico
	if (plan.environments && plan.environments[environment]) {
		const envConfig = plan.environments[environment];
		if (envConfig && envConfig.stripeProductId) {
			return envConfig.stripeProductId;
		}
	}

	// Fallback a stripeProductId directo
	return plan.stripeProductId;
}

/**
 * Formatea el precio para mostrar
 */
export function formatPrice(price: number, currency: string = "USD"): string {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: currency,
		minimumFractionDigits: price % 1 === 0 ? 0 : 2,
		maximumFractionDigits: 2,
	}).format(price);
}

/**
 * Obtiene el texto del período de facturación
 */
export function getBillingPeriodText(period: string): string {
	const periods: Record<string, string> = {
		daily: "por día",
		weekly: "por semana",
		monthly: "por mes",
		annual: "por año",
		yearly: "por año",
	};

	return periods[period] || period;
}

/**
 * Limpia el nombre del plan quitando indicadores de entorno
 * Ej: "Plan Estándar (production)" -> "Plan Estándar"
 */
export function cleanPlanDisplayName(displayName: string): string {
	// Quitar (development), (production), (staging), etc.
	return displayName.replace(/\s*\((development|production|staging|test|dev|prod)\)\s*/gi, "").trim();
}
