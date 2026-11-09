import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { CausasUpdateConfig, CausasUpdateService } from "api/causasUpdate";

// Interruptor global del listado Relacionados por la API del SCW nuevo (pjn-mis-causas,
// update-sync). La lista de credenciales alcanzadas (listadoApiScwBetaCredenciales) se edita
// por credencial en Credenciales PJN (columna "Listado API"); acá solo se muestra cuántas hay.

interface Props {
	config: CausasUpdateConfig;
	onConfigUpdate: () => void;
}

const ListadoApiScwCard = ({ config, onConfigUpdate }: Props) => {
	const [saving, setSaving] = useState(false);
	const [confirm, setConfirm] = useState<boolean | null>(null);

	const enabled = config.worker?.listadoApiScwBeta === true;
	const lista = Array.isArray(config.worker?.listadoApiScwBetaCredenciales) ? config.worker.listadoApiScwBetaCredenciales : [];
	const updatedAt = config.worker?.listadoApiScwBetaUpdatedAt;
	const updatedBy = config.worker?.listadoApiScwBetaUpdatedBy;

	const setFlag = async (value: boolean) => {
		setSaving(true);
		try {
			await CausasUpdateService.updateConfig({ worker: { listadoApiScwBeta: value } } as unknown as Partial<CausasUpdateConfig>);
			enqueueSnackbar(value ? "Listado por API activado" : "Listado por API desactivado: todas las credenciales vuelven al browser", {
				variant: value ? "success" : "info",
			});
			onConfigUpdate();
		} catch (e) {
			console.error("Error actualizando listadoApiScwBeta:", e);
			enqueueSnackbar("No se pudo guardar el cambio", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card variant="outlined">
			<CardContent>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 150 }}>
						<Switch
							checked={enabled}
							disabled={saving}
							onChange={(e) => setConfirm(e.target.checked)}
							inputProps={{ "aria-label": "Listado Relacionados por la API del SCW nuevo (update-sync)" }}
						/>
						<Chip size="small" label={enabled ? "Activo" : "Apagado"} color={enabled ? "info" : "default"} />
					</Stack>
					<Box sx={{ flex: 1 }}>
						<Typography variant="body2" fontWeight={600}>
							Listado Relacionados por la API del SCW nuevo (update-sync)
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block">
							El sync diario lee el listado de cada credencial por la API JSON de <code>scw-beta.pjn.gov.ar</code> en vez de paginar el
							browser: las mismas filas, ~1 minuto en vez de 1–21. Si la API falla o el listado llega incompleto, esa corrida vuelve al
							browser. La API pide también «Ver todos» (archivados) solo para no generar discordancias (una causa que pasó a archivo no
							cuenta como baja); la sincronización inicial y las carpetas siguen cubriendo solo expedientes en trámite.
						</Typography>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
							<Chip
								size="small"
								variant="outlined"
								color={lista.length === 0 && enabled ? "warning" : "default"}
								label={
									lista.length === 0
										? "Lista vacía: alcanza a todas las credenciales"
										: `${lista.length} ${lista.length === 1 ? "credencial" : "credenciales"} en la lista`
								}
							/>
							<Button size="small" component={RouterLink} to="/admin/causas/credentials">
								Elegir credenciales
							</Button>
							{(updatedAt || updatedBy) && (
								<Typography variant="caption" color="text.disabled">
									lista modificada {updatedAt ? new Date(updatedAt).toLocaleString("es-AR") : ""}
									{updatedBy ? ` por ${updatedBy}` : ""}
								</Typography>
							)}
						</Stack>
					</Box>
				</Stack>

				<Dialog open={confirm !== null} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
					<DialogTitle>{confirm ? "Activar listado por API" : "Desactivar listado por API"}</DialogTitle>
					<DialogContent>
						<DialogContentText component="div">
							{confirm ? (
								<Typography variant="body2">
									Desde la próxima corrida de update-sync,{" "}
									{lista.length === 0 ? (
										<>
											<strong>todas</strong> las credenciales (la lista está vacía)
										</>
									) : (
										<>
											las <strong>{lista.length}</strong> credenciales de la lista
										</>
									)}{" "}
									leen el listado por la API del SCW nuevo, con vuelta automática al browser si falla. La evidencia pasa a ser un JSON por
									corrida en vez de capturas por página.
								</Typography>
							) : (
								<Typography variant="body2">
									Todas las credenciales vuelven a leer el listado por el browser desde la próxima corrida. La lista de credenciales se
									conserva.
								</Typography>
							)}
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setConfirm(null)}>Cancelar</Button>
						<Button
							variant="contained"
							color={confirm ? "primary" : "warning"}
							onClick={() => {
								if (confirm !== null) setFlag(confirm);
								setConfirm(null);
							}}
						>
							{confirm ? "Activar" : "Desactivar"}
						</Button>
					</DialogActions>
				</Dialog>
			</CardContent>
		</Card>
	);
};

export default ListadoApiScwCard;
