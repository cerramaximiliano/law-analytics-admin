import { useState } from "react";
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

// Interruptor de la contingencia pública del updater de Mis Causas (pjn-mis-causas,
// causas-update-config.worker.contingenciaPublica). Con un incidente de portal activo nadie hace login;
// encendida, el updater lee sin login las causas públicas comprobadas por la consulta pública del PJN.

interface ContingenciaPublica {
	enabled?: boolean;
	minutosIncidente?: number;
	carriles?: number;
	maxPorCredencial?: number;
	vigenciaDias?: number;
	fallosSeguidos?: number;
}

interface Props {
	config: CausasUpdateConfig;
	onConfigUpdate: () => void;
}

const DEFECTOS: Required<Omit<ContingenciaPublica, "enabled">> = {
	minutosIncidente: 10,
	carriles: 3,
	maxPorCredencial: 300,
	vigenciaDias: 30,
	fallosSeguidos: 5,
};

const ContingenciaPublicaCard = ({ config, onConfigUpdate }: Props) => {
	const [saving, setSaving] = useState(false);
	const [confirm, setConfirm] = useState<boolean | null>(null);

	const actual = ((config.worker as unknown as { contingenciaPublica?: ContingenciaPublica } | undefined)?.contingenciaPublica ||
		{}) as ContingenciaPublica;
	const enabled = actual.enabled === true;
	const minutos = actual.minutosIncidente ?? DEFECTOS.minutosIncidente;
	const carriles = actual.carriles ?? DEFECTOS.carriles;
	const maxPorCredencial = actual.maxPorCredencial ?? DEFECTOS.maxPorCredencial;

	const setFlag = async (value: boolean) => {
		setSaving(true);
		try {
			// El PATCH reemplaza worker.contingenciaPublica entero: se manda el objeto completo para no perder los parámetros.
			await CausasUpdateService.updateConfig({
				worker: { contingenciaPublica: { ...DEFECTOS, ...actual, enabled: value } },
			} as unknown as Partial<CausasUpdateConfig>);
			enqueueSnackbar(
				value
					? "Contingencia pública encendida: se activa sola en el próximo incidente de portal"
					: "Contingencia pública apagada: durante un incidente las causas esperan al login",
				{ variant: value ? "success" : "info" },
			);
			onConfigUpdate();
		} catch (e) {
			console.error("Error actualizando contingenciaPublica:", e);
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
							inputProps={{ "aria-label": "Contingencia pública cuando el login del PJN está caído" }}
						/>
						<Chip size="small" label={enabled ? "Encendida" : "Apagada"} color={enabled ? "info" : "default"} />
					</Stack>
					<Box sx={{ flex: 1 }}>
						<Typography variant="body2" fontWeight={600}>
							Contingencia pública cuando el login del PJN está caído
						</Typography>
						<Typography variant="caption" color="text.secondary" display="block">
							Sirve para que el día no se atrase cuando el portal no deja entrar. Con un incidente de portal activo nadie hace login;
							si esta opción está encendida y el incidente lleva más de {minutos} minutos, el updater lee <strong>sin login</strong>,
							por la consulta pública del PJN, las causas públicas comprobadas que están pendientes, de todas las credenciales:
							primero las carpetas activas y, dentro de ellas, los usuarios con plan pago. Se detiene sola cuando el portal vuelve o si
							la consulta pública también falla, y avisa al admin cuántas causas leyó. No cubre causas privadas, incidentes ni causas
							nunca leídas: esas esperan al login. Mientras el portal funciona no hace nada.
						</Typography>
						<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
							<Chip size="small" variant="outlined" label={`Se activa a los ${minutos} min de incidente`} />
							<Chip size="small" variant="outlined" label={`${carriles} consultas en paralelo por proceso`} />
							<Chip size="small" variant="outlined" label={`Hasta ${maxPorCredencial} causas por credencial y vuelta`} />
						</Stack>
					</Box>
				</Stack>

				<Dialog open={confirm !== null} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
					<DialogTitle>{confirm ? "Encender la contingencia pública" : "Apagar la contingencia pública"}</DialogTitle>
					<DialogContent>
						<DialogContentText component="div">
							{confirm ? (
								<Typography variant="body2">
									Desde el próximo incidente de portal de más de {minutos} minutos, el updater va a leer sin login las causas públicas
									pendientes. Escribe movimientos y dispara notificaciones igual que una franja normal.
								</Typography>
							) : (
								<Typography variant="body2">
									Durante un incidente de portal no se va a leer ninguna causa: todas esperan a que vuelva el login. Si hay una
									contingencia corriendo en este momento, esa pasada sigue hasta terminar; la siguiente ya no arranca.
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
							{confirm ? "Encender" : "Apagar"}
						</Button>
					</DialogActions>
				</Dialog>
			</CardContent>
		</Card>
	);
};

export default ContingenciaPublicaCard;
