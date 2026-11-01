import { JourneyFlujo, JourneyMapData } from "api/journey";

// Flujos con caja propia en el mapa (1/11/2026). Vienen de `data.flujos`, que arma la-marketing-service desde el
// bloque `journey` de cada campaña. Una foto cacheada anterior a ese cambio no los trae: entonces se arma la caja
// de Interesados con los datos viejos, para que el mapa no la pierda mientras se renueva la foto.
export function flujosDe(data: JourneyMapData): JourneyFlujo[] {
	if (data.flujos) return data.flujos;
	const inter = data.captacion.interesados;
	if (!inter) return [];
	const campaigns = (data.captacion.campaigns.interesados ?? []).map((c) => ({
		_id: c._id,
		name: c.name,
		status: c.status,
		subtipo: c.subtipo ?? null,
		active: c.active,
	}));
	return [
		{
			id: "flujo:interesados",
			nodo: "Interesados",
			despuesDe: "captacion",
			descripcion:
				"Hicieron clic en una captación activa hace más de 72 h y no se registraron: salen de su variante y entran a esta campaña.",
			color: null,
			campos: { marca: "customFields.capInteresado", desde: "customFields.capInteresadoDesde", listo: null },
			campaigns,
			enCampania: campaigns.reduce((a, c) => a + c.active, 0),
			marcados: inter.marked,
			byPeriod: inter.byPeriod,
			esperando: null,
			terminaron: null,
			registrados: null,
			fromCampaign: inter.fromVariant,
		},
	];
}

export const estadoCampanias = (f: JourneyFlujo) =>
	!f.campaigns.length
		? "sin campaña"
		: f.campaigns.some((c) => c.status === "active")
		? "activa"
		: f.campaigns.every((c) => c.status === "draft")
		? "en borrador"
		: "pausada";
