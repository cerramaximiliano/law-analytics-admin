/**
 * Pestaña "Vinculados" del portal PJN (2026-09-30): cada cuánto se relee la lista de incidentes de
 * un principal, en los dos proyectos que la leen:
 *  - pjn-workers app-update (causas públicas): se aplica a todos los docs de configuracion-app-update.
 *  - pjn-mis-causas (causas que llegan por credencial): causas-update-config.worker.vinculados.
 * La lectura va en la misma sesión que actualiza el principal (sin captcha extra, ~0,4 s por
 * página); no baja movimientos de los incidentes.
 */
import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Switch, TextField, Typography, alpha, useTheme } from "@mui/material";
import { useSnackbar } from "notistack";
import { CausasUpdateService, VinculadosConfig } from "api/causasUpdate";

type Foco = "appUpdate" | "misCausas";

export default function VinculadosConfigCard({ foco }: { foco?: Foco }) {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [cfg, setCfg] = useState<VinculadosConfig | null>(null);
	const [draft, setDraft] = useState<VinculadosConfig | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cargar = async () => {
		try {
			const r = await CausasUpdateService.getVinculadosConfig();
			setCfg(r.data);
			setDraft(r.data);
			setError(null);
		} catch (e: any) {
			setError(e?.message || "No se pudo leer la configuración");
		}
	};
	useEffect(() => {
		cargar();
	}, []);

	const guardar = async () => {
		if (!draft || !cfg) return;
		setSaving(true);
		try {
			const body: any = {};
			const a = draft.appUpdate;
			const m = draft.misCausas;
			if (JSON.stringify(a) !== JSON.stringify(cfg.appUpdate))
				body.appUpdate = {
					capturarEnAppUpdate: a.capturarEnAppUpdate,
					leerIncidentes: a.leerIncidentes,
					refreshDays: a.refreshDays,
					maxPaginas: a.maxPaginas,
				};
			if (JSON.stringify(m) !== JSON.stringify(cfg.misCausas))
				body.misCausas = { enabled: m.enabled, refreshDays: m.refreshDays, maxPaginas: m.maxPaginas };
			const r = await CausasUpdateService.updateVinculadosConfig(body);
			setCfg(r.data);
			setDraft(r.data);
			enqueueSnackbar("Configuración de Vinculados guardada", { variant: "success" });
		} catch (e: any) {
			enqueueSnackbar(e?.message || "No se pudo guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const cambiado = !!cfg && !!draft && JSON.stringify(cfg) !== JSON.stringify(draft);
	const frecuencia = (d: number) => (d === 1 ? "diaria" : d < 1 ? `cada ${Math.round(d * 24)} h` : `cada ${d} días`);

	const bloque = (titulo: string, sub: string, activo: boolean, children: React.ReactNode, key: Foco) => (
		<Grid item xs={12} md={6}>
			<Box
				sx={{
					p: 2,
					height: "100%",
					borderRadius: 1.5,
					border: `1px solid ${foco === key ? theme.palette.primary.main : theme.palette.divider}`,
					bgcolor: foco === key ? alpha(theme.palette.primary.main, 0.04) : "transparent",
				}}
			>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
					<Typography variant="subtitle1" fontWeight={600}>
						{titulo}
					</Typography>
					<Chip size="small" label={activo ? "Activo" : "Apagado"} color={activo ? "success" : "default"} variant="outlined" />
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
					{sub}
				</Typography>
				<Stack spacing={1.5}>{children}</Stack>
			</Box>
		</Grid>
	);

	const numero = (label: string, value: number, onChange: (n: number) => void, help: string, min: number, max: number, step: number) => (
		<TextField
			size="small"
			type="number"
			label={label}
			value={value}
			inputProps={{ min, max, step }}
			onChange={(e) => onChange(Number(e.target.value))}
			helperText={help}
		/>
	);

	return (
		<Card variant="outlined">
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
					<Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
						Pestaña Vinculados (incidentes del principal)
					</Typography>
					<Button variant="contained" size="small" disabled={!cambiado || saving} onClick={guardar}>
						Guardar
					</Button>
				</Stack>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Cada cuánto se relee la lista de incidentes de cada causa principal. Se lee en la misma sesión en que se actualiza la causa (sin
					captcha extra) y no descarga movimientos de los incidentes: solo la lista que muestra “Expedientes relacionados”.
				</Typography>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}
				{draft && (
					<Grid container spacing={2}>
						{bloque(
							"pjn-workers · app-update",
							`Causas públicas (agregadas sin credencial). Se aplica a los ${
								draft.appUpdate.documentos ?? "—"
							} documentos de configuración${
								draft.appUpdate.uniforme === false ? " (hoy tienen valores distintos; al guardar quedan iguales)" : ""
							}.`,
							draft.appUpdate.capturarEnAppUpdate,
							<>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Typography variant="body2">Leer la pestaña Vinculados</Typography>
									<Switch
										checked={draft.appUpdate.capturarEnAppUpdate}
										onChange={(e) => setDraft({ ...draft, appUpdate: { ...draft.appUpdate, capturarEnAppUpdate: e.target.checked } })}
									/>
								</Stack>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Typography variant="body2">Actualizar incidentes seguidos entrando desde el principal</Typography>
									<Switch
										checked={draft.appUpdate.leerIncidentes}
										onChange={(e) => setDraft({ ...draft, appUpdate: { ...draft.appUpdate, leerIncidentes: e.target.checked } })}
									/>
								</Stack>
								{numero(
									"Releer cada (días)",
									draft.appUpdate.refreshDays,
									(n) => setDraft({ ...draft, appUpdate: { ...draft.appUpdate, refreshDays: n } }),
									`Frecuencia ${frecuencia(draft.appUpdate.refreshDays)}. Admite fracciones (0,25 = 6 h).`,
									0.25,
									30,
									0.25,
								)}
								{numero(
									"Páginas máximas por lectura",
									draft.appUpdate.maxPaginas,
									(n) => setDraft({ ...draft, appUpdate: { ...draft.appUpdate, maxPaginas: n } }),
									"15 incidentes por página del portal.",
									1,
									20,
									1,
								)}
							</>,
							"appUpdate",
						)}
						{bloque(
							"pjn-mis-causas",
							"Causas que llegan por credencial (lista Relacionados). Lo lee private-causas-update-worker; toma el cambio en su próxima corrida.",
							draft.misCausas.enabled,
							<>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Typography variant="body2">Leer la pestaña Vinculados</Typography>
									<Switch
										checked={draft.misCausas.enabled}
										onChange={(e) => setDraft({ ...draft, misCausas: { ...draft.misCausas, enabled: e.target.checked } })}
									/>
								</Stack>
								{numero(
									"Releer cada (días)",
									draft.misCausas.refreshDays,
									(n) => setDraft({ ...draft, misCausas: { ...draft.misCausas, refreshDays: n } }),
									`Frecuencia ${frecuencia(draft.misCausas.refreshDays)}. Admite fracciones (0,25 = 6 h).`,
									0.25,
									30,
									0.25,
								)}
								{numero(
									"Páginas máximas por lectura",
									draft.misCausas.maxPaginas,
									(n) => setDraft({ ...draft, misCausas: { ...draft.misCausas, maxPaginas: n } }),
									"15 incidentes por página del portal.",
									1,
									20,
									1,
								)}
							</>,
							"misCausas",
						)}
					</Grid>
				)}
			</CardContent>
		</Card>
	);
}
