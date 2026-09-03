// Configuración del worker, editable en caliente: el worker relee su config en
// cada ciclo, así que los cambios de páginas, canales o notificaciones aplican
// sin reiniciar. El cron es la excepción — node-cron lo lee al arrancar.

import { useState } from "react";
import { Alert, Button, Chip, Divider, FormControlLabel, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { CijurWorkerConfig, setCijurEnabled, updateCijurNotification, updateCijurScraping } from "api/cijur";
import { Ayuda } from "./EstadoTab";

const CANALES: ("PROVINCIAL" | "NACIONAL")[] = ["PROVINCIAL", "NACIONAL"];

export default function ConfigTab({ config, onChange }: { config: CijurWorkerConfig | null; onChange: () => void }) {
	const [guardando, setGuardando] = useState(false);
	const [msg, setMsg] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
	const [form, setForm] = useState<Partial<CijurWorkerConfig["scraping"]>>({});
	const [notif, setNotif] = useState<Partial<CijurWorkerConfig["notification"]>>({});

	if (!config) return null;

	const s = { ...config.scraping, ...form };
	const n = { ...config.notification, ...notif };

	const guardar = async () => {
		setGuardando(true);
		setMsg(null);
		try {
			if (Object.keys(form).length) await updateCijurScraping(config.worker_id, form);
			if (Object.keys(notif).length) await updateCijurNotification(config.worker_id, notif);
			setForm({});
			setNotif({});
			setMsg({ tipo: "success", texto: "Configuración guardada. El worker la toma en su próximo ciclo." });
			onChange();
		} catch (e: any) {
			setMsg({ tipo: "error", texto: e?.message || "No se pudo guardar" });
		} finally {
			setGuardando(false);
		}
	};

	const toggleCanal = (c: "PROVINCIAL" | "NACIONAL") => {
		const actuales = s.canales || [];
		const nuevos = actuales.includes(c) ? actuales.filter((x) => x !== c) : [...actuales, c];
		setForm({ ...form, canales: nuevos });
	};

	const hayCambios = Object.keys(form).length > 0 || Object.keys(notif).length > 0;

	return (
		<Stack spacing={2}>
			{msg && <Alert severity={msg.tipo}>{msg.texto}</Alert>}

			<Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack>
						<Typography variant="subtitle2">{config.worker_id}</Typography>
						<Typography variant="caption" color="text.secondary">
							Última actualización: {config.lastUpdate ? new Date(config.lastUpdate).toLocaleString("es-AR") : "—"}
						</Typography>
					</Stack>
					<FormControlLabel
						control={
							<Switch
								checked={config.enabled}
								onChange={async (e) => {
									await setCijurEnabled(config.worker_id, e.target.checked);
									onChange();
								}}
							/>
						}
						label={config.enabled ? "Activo" : "Detenido"}
					/>
				</Stack>
			</Paper>

			<Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1.5 }}>
					Captura
				</Typography>

				<Stack spacing={2}>
					<Stack>
						<Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
							Canales a vigilar
						</Typography>
						<Stack direction="row" spacing={1}>
							{CANALES.map((c) => (
								<Chip
									key={c}
									label={c}
									size="small"
									color={(s.canales || []).includes(c) ? "primary" : "default"}
									variant={(s.canales || []).includes(c) ? "filled" : "outlined"}
									onClick={() => toggleCanal(c)}
									sx={{ cursor: "pointer" }}
								/>
							))}
						</Stack>
					</Stack>

					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<TextField
							size="small"
							label="Cron (UTC)"
							value={s.cronPattern || ""}
							onChange={(e) => setForm({ ...form, cronPattern: e.target.value })}
							helperText="Requiere reiniciar el worker: node-cron lo lee al arrancar"
							sx={{ minWidth: 200 }}
						/>
						<TextField
							size="small"
							type="number"
							label="Páginas por ciclo"
							value={s.paginasPorCiclo ?? ""}
							onChange={(e) => setForm({ ...form, paginasPorCiclo: Number(e.target.value) })}
							helperText="Más de 1 por si publican varias juntas"
							sx={{ minWidth: 180 }}
						/>
						<TextField
							size="small"
							type="number"
							label="Ritmo (req/min)"
							value={s.rateLimit ?? ""}
							onChange={(e) => setForm({ ...form, rateLimit: Number(e.target.value) })}
							sx={{ minWidth: 160 }}
						/>
					</Stack>

					<FormControlLabel
						control={<Switch checked={s.descargarPdf !== false} onChange={(e) => setForm({ ...form, descargarPdf: e.target.checked })} />}
						label={
							<Typography variant="body2">
								Descargar y extraer el texto del PDF
								<Ayuda texto="Sin esto se guarda el fallo con sus metadatos pero sin texto: no sirve para resumir ni indexar." />
							</Typography>
						}
					/>
				</Stack>
			</Paper>

			<Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1.5 }}>
					Notificaciones
				</Typography>
				<Stack spacing={1.5}>
					<FormControlLabel
						control={
							<Switch
								checked={n.newDocumentsEmail !== false}
								onChange={(e) => setNotif({ ...notif, newDocumentsEmail: e.target.checked })}
							/>
						}
						label={<Typography variant="body2">Avisar cuando aparezcan fallos nuevos</Typography>}
					/>
					<FormControlLabel
						control={<Switch checked={n.errorEmail !== false} onChange={(e) => setNotif({ ...notif, errorEmail: e.target.checked })} />}
						label={<Typography variant="body2">Avisar errores</Typography>}
					/>
					<TextField
						size="small"
						label="Destinatarios"
						value={n.recipientEmail || ""}
						onChange={(e) => setNotif({ ...notif, recipientEmail: e.target.value })}
						helperText="Separados por coma"
						fullWidth
					/>
				</Stack>
			</Paper>

			<Divider />

			<Stack direction="row" spacing={1.5}>
				<Button variant="contained" disabled={!hayCambios || guardando} onClick={guardar}>
					{guardando ? "Guardando…" : "Guardar cambios"}
				</Button>
				{hayCambios && (
					<Button
						variant="outlined"
						onClick={() => {
							setForm({});
							setNotif({});
						}}
					>
						Descartar
					</Button>
				)}
			</Stack>
		</Stack>
	);
}
