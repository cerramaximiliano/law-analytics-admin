import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { ScrapingManagerService, FueroStats, FueroStat } from "api/scrapingManager";

/**
 * `getFueroStats` compartido entre los dos paneles del corpus.
 *
 * La pestaña Corpus llegó a tener cuatro secciones —tarjetas de totales, tres
 * gráficos, una tabla de cobertura de siete columnas y el detalle de los 21
 * fueros con su barra y sus tres métricas—. Son dos preguntas distintas: "qué
 * hay y cuánto costó barrerlo" y "cómo se reparte fuero por fuero". Se
 * separaron en dos pestañas, y las dos leen el mismo endpoint, así que la
 * carga y los agregados viven acá en vez de duplicarse.
 */

export interface UniversoFuero {
	code: string;
	docs: number;
	validas: number;
	verificadas: number;
	sinVerificar: number;
	inexistentes: number;
	rendimiento: number;
}

export function useFueroStats() {
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<FueroStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchStats = useCallback(
		async (showLoading = true) => {
			if (showLoading) setLoading(true);
			setError(null);
			try {
				const res = await ScrapingManagerService.getFueroStats();
				if (res.success) {
					setStats(res.data);
				}
			} catch (err: any) {
				const msg = err.response?.data?.message || "Error al cargar estadísticas por fuero";
				setError(msg);
				if (showLoading) {
					enqueueSnackbar(msg, { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
				}
			} finally {
				if (showLoading) setLoading(false);
			}
		},
		[enqueueSnackbar],
	);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const fueroEntries: [string, FueroStat][] = stats ? Object.entries(stats.fueros) : [];
	const totalSentenciasHistorico = fueroEntries.reduce((acc, [, s]) => acc + s.sentencias.count, 0);
	const totalSentenciasActivas = stats?.sentenciasActivas?.total ?? null;
	const totalEscritos = fueroEntries.reduce((acc, [, s]) => acc + s.escritos.count, 0);

	// Universo por fuero. Solo los que tienen documentos: los fueros cableados
	// pero nunca barridos aportarían filas en cero que no dicen nada.
	const universo: UniversoFuero[] = fueroEntries
		.map(([code, s]) => ({
			code,
			docs: s.causas.docs ?? 0,
			validas: s.causas.count ?? 0,
			verificadas: s.causas.verificadas ?? 0,
			sinVerificar: s.causas.sinVerificar ?? 0,
			inexistentes: s.causas.inexistentes ?? 0,
			rendimiento: s.causas.rendimiento ?? 0,
		}))
		.filter((f) => f.docs > 0)
		.sort((a, b) => b.docs - a.docs);

	const tot = universo.reduce(
		(a, f) => ({
			docs: a.docs + f.docs,
			validas: a.validas + f.validas,
			verificadas: a.verificadas + f.verificadas,
			sinVerificar: a.sinVerificar + f.sinVerificar,
			inexistentes: a.inexistentes + f.inexistentes,
		}),
		{ docs: 0, validas: 0, verificadas: 0, sinVerificar: 0, inexistentes: 0 },
	);

	return {
		stats,
		loading,
		error,
		setError,
		fetchStats,
		fueroEntries,
		totalSentenciasHistorico,
		totalSentenciasActivas,
		totalEscritos,
		universo,
		tot,
	};
}

export function formatNumber(n: number): string {
	return n.toLocaleString("es-AR");
}

// Para el eje de los gráficos: "1,2 M" en vez de "1.234.567", que a 10px se
// superpone con el tick de al lado.
export function formatCompact(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
	if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
	return String(n);
}

export function formatTimeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	if (diff < 60000) return "Hace segundos";
	if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
	if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
	return `Hace ${Math.floor(diff / 86400000)} d`;
}
