import { useCallback, useEffect, useState } from "react";
import judicialNotificationConfigService, { JudicialNotificationConfig } from "api/judicialNotificationConfig";

// ----------------------------------------------------------------------
// Hook compartido: config de judicial-notification-configs con polling.
// Un solo fetcher por página — los componentes que muestran estado en vivo
// (LiveConfigSummary, EffectiveWorkerPolicies) reciben el resultado por props.
// ----------------------------------------------------------------------

const REFRESH_MS = 60_000;

export interface LiveJudicialConfig {
	config: JudicialNotificationConfig | null;
	loading: boolean;
	error: string | null;
	lastFetch: Date | null;
	refresh: () => void;
}

export function useLiveJudicialConfig(): LiveJudicialConfig {
	const [config, setConfig] = useState<JudicialNotificationConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastFetch, setLastFetch] = useState<Date | null>(null);

	const refresh = useCallback(async () => {
		try {
			const data = await judicialNotificationConfigService.getConfig();
			setConfig(data);
			setError(null);
			setLastFetch(new Date());
		} catch (e: any) {
			setError(e?.message || "Error cargando la configuración");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
		const interval = setInterval(refresh, REFRESH_MS);
		return () => clearInterval(interval);
	}, [refresh]);

	return { config, loading, error, lastFetch, refresh };
}

export default useLiveJudicialConfig;
