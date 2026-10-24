# Coordinación de campañas (2026-10-24)

Página `/admin/marketing/coordinacion` (`src/pages/admin/marketing/coordinacion.tsx`), botón "Coordinación" en
`MarketingQuickNav` y entrada de menú después de "Campañas de Email". Consume la-marketing-service: el coordinador está
descripto en `la-marketing-service/docs/coordinador-campanas.md`; diseño y decisiones en
`la-ads/analysis/2026-10-24-coordinador-campanas.md`.

| Sección | Componente | Qué hace |
|---|---|---|
| Reglas generales | `sections/admin/marketing/coordination/GeneralRulesCard.tsx` | Edita `enabled`, `dryRun`, `maxPerDay`, `maxPerWeek`, `maxDeferralDays`, `reserveHours`, `exemptCategories` (`PUT /api/scheduler/frequency`). Apagar el modo prueba o cambiar `enabled` pide confirmación en la página |
| Últimos 14 días | `…/coordination/DailyDeferredCard.tsx` | Barras por día y motivo: habría diferido (modo prueba), diferido, salteado. Tocar un día da el desglose por campaña |
| Prioridades | `…/coordination/PrioritiesTable.tsx` | Prioridad 0–100, exenta, pausa a las de menor prioridad, perecedera; guardado por fila (`PUT /api/campaigns/:id {frequencyPolicy}`). Las ediciones SAIJ se agrupan en una fila con edición masiva. Exentas por categoría: interruptor bloqueado |
| Flujos | `…/coordination/FlowsChart.tsx` | Un carril por campaña automática/secuencia (borradores opcionales), en días desde el ingreso; pasos condicionales punteados; días con posibles choques en ocre; fila "Fuera de secuencia" para únicas y recurrentes |

También: columna de prioridad en Mailing (`pages/admin/marketing/mailing.tsx`) y bloque "Coordinación" en
`sections/admin/marketing/CampaignFormModal.tsx`. Lógica compartida en `utils/campaignCoordination.ts`; tipos en
`types/campaign.ts` (`FrequencyPolicy`, `SchedulerFrequency*`); servicio `SchedulerFrequencyService` en
`store/reducers/campaign.ts`.

El gráfico de flujos supone que el contacto entra a todas las campañas el mismo día: marca choques **posibles**, no reales.
