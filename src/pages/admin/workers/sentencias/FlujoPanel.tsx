import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	FormControlLabel,
	IconButton,
	Paper,
	Stack,
	Switch,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { ArrowDown2, ArrowRight2, InfoCircle, Pause, Refresh, Warning2 } from "iconsax-react";
import { FlujoEtapa, FlujoResponse, getFlujoSentencias, setSoloSaij } from "api/sentenciasCapturadas";
import { BRAND_BLUE, STALE_AMBER } from "themes/dashboardTokens";

/**
 * Radiografía del pipeline de sentencias: en qué etapa está parado el material
 * y qué interruptor lo frena.
 *
 * Nació de un incidente concreto: se apagó el worker de embeddings desde el
 * panel para frenar el re-indexado del corpus PJN, y eso frenó también el
 * material nuevo — sin que nada en la pantalla mostrara ni el atasco ni su
 * causa. Por eso cada etapa muestra su cola separando SAIJ (lo nuevo, que el
 * usuario espera poder buscar) de PJN (el re-indexado masivo de fondo).
 */

const fmt = (n: number) => n.toLocaleString("es-AR");

function Conteo({ label, valor, color }: { label: string; valor: { saij: number; pjn: number }; color: string }) {
	return (
		// En pantallas chicas el desglose va escrito: el tooltip no existe en
		// una pantalla táctil, y el desglose SAIJ/PJN es justamente el dato que
		// explica el atasco.
		<Tooltip title={`SAIJ ${fmt(valor.saij)} · PJN ${fmt(valor.pjn)}`} arrow enterTouchDelay={0}>
			<Box sx={{ cursor: "help", minWidth: 0 }}>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
					{label}
				</Typography>
				<Typography variant="body2" sx={{ color, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}>
					{fmt(valor.saij + valor.pjn)}
				</Typography>
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{ display: { xs: "block", md: "none" }, fontSize: 10, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}
				>
					SAIJ {fmt(valor.saij)} · PJN {fmt(valor.pjn)}
				</Typography>
			</Box>
		</Tooltip>
	);
}

/**
 * Versión compacta para pantallas chicas. Las tarjetas de escritorio miden
 * ~165px cada una: cinco etapas eran 900px de scroll —una pantalla entera de
 * teléfono— para leer cinco números. La fila dice lo mismo en ~90px.
 */
function EtapaFila({ etapa, esCuelloDeBotella }: { etapa: FlujoEtapa; esCuelloDeBotella: boolean }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const acento = etapa.pausada ? theme.palette.error.main : esCuelloDeBotella ? STALE_AMBER : BRAND_BLUE;
	const total = etapa.total.saij + etapa.total.pjn;

	return (
		<Box
			sx={{
				display: "flex",
				gap: 1.25,
				py: 1,
				px: 1.25,
				borderLeft: `3px solid ${acento}`,
				borderRadius: 0.5,
				bgcolor: alpha(acento, isDark ? 0.07 : 0.035),
			}}
		>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
					<Typography variant="subtitle2" sx={{ color: acento, lineHeight: 1.3 }}>
						{etapa.label}
					</Typography>
					{etapa.pausada && (
						<Box sx={{ display: "inline-flex", color: theme.palette.error.main }}>
							<Pause size={13} variant="Bold" />
						</Box>
					)}
					{etapa.pausadaParcial && !etapa.pausada && (
						<Chip size="small" label="parcial" sx={{ height: 16, fontSize: 9 }} color="warning" variant="outlined" />
					)}
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10.5, lineHeight: 1.35 }}>
					SAIJ {fmt(etapa.total.saij)} · PJN {fmt(etapa.total.pjn)}
				</Typography>
				<Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
					{etapa.enCola.total > 0 && (
						<Typography
							variant="caption"
							sx={{ fontSize: 10.5, color: esCuelloDeBotella ? STALE_AMBER : "text.secondary", fontWeight: 600 }}
						>
							{fmt(etapa.enCola.total)} en cola
						</Typography>
					)}
					{etapa.errores.total > 0 && (
						<Typography variant="caption" sx={{ fontSize: 10.5, color: theme.palette.error.main, fontWeight: 600 }}>
							{fmt(etapa.errores.total)} {etapa.id === "publicada" ? "de baja" : "errores"}
						</Typography>
					)}
				</Stack>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: 10.5, lineHeight: 1.35 }}>
					{etapa.nota}
				</Typography>
			</Box>
			<Typography
				variant="h5"
				sx={{ color: acento, fontVariantNumeric: "tabular-nums", lineHeight: 1.2, flexShrink: 0, alignSelf: "flex-start" }}
			>
				{fmt(total)}
			</Typography>
		</Box>
	);
}

function EtapaCard({ etapa, esCuelloDeBotella }: { etapa: FlujoEtapa; esCuelloDeBotella: boolean }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	// El color cuenta la historia: rojo si está frenada, ámbar si es el cuello
	// de botella, azul si fluye.
	const acento = etapa.pausada ? theme.palette.error.main : esCuelloDeBotella ? STALE_AMBER : BRAND_BLUE;

	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
				width: "100%",
				minWidth: { xs: 0, md: 190 },
				flex: { xs: "1 1 auto", md: "1 1 190px" },
				borderColor: alpha(acento, isDark ? 0.45 : 0.32),
				bgcolor: alpha(acento, isDark ? 0.08 : 0.04),
			}}
		>
			<Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
				<Typography variant="subtitle2" sx={{ color: acento, flexGrow: 1 }}>
					{etapa.label}
				</Typography>
				{etapa.pausada && (
					<Tooltip title="Etapa detenida: su worker está apagado">
						<Box sx={{ display: "inline-flex", color: theme.palette.error.main }}>
							<Pause size={14} variant="Bold" />
						</Box>
					</Tooltip>
				)}
				{etapa.pausadaParcial && !etapa.pausada && (
					<Tooltip title="Corre solo para SAIJ: el corpus PJN está en pausa">
						<Chip size="small" label="parcial" sx={{ height: 17, fontSize: 9 }} color="warning" variant="outlined" />
					</Tooltip>
				)}
			</Stack>

			<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
				<Conteo label="procesadas" valor={etapa.total} color={theme.palette.text.primary} />
				{etapa.enCola.total > 0 && (
					<Conteo label="en cola" valor={etapa.enCola} color={esCuelloDeBotella ? STALE_AMBER : theme.palette.text.secondary} />
				)}
				{etapa.errores.total > 0 && (
					<Conteo label={etapa.id === "publicada" ? "de baja" : "errores"} valor={etapa.errores} color={theme.palette.error.main} />
				)}
			</Stack>

			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.4 }}>
				{etapa.nota}
			</Typography>
		</Paper>
	);
}

export default function FlujoPanel() {
	const theme = useTheme();
	// Abajo de md el pipeline se dibuja como lista compacta, no como tarjetas.
	const esEscritorio = useMediaQuery(theme.breakpoints.up("md"));
	const [data, setData] = useState<FlujoResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setData(await getFlujoSentencias());
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message || "No se pudo leer el flujo");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);

	if (loading && !data) {
		return (
			<Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
				<CircularProgress size={22} />
			</Paper>
		);
	}
	if (error) {
		return (
			<Alert
				severity="error"
				action={
					<IconButton size="small" onClick={cargar}>
						<Refresh size={15} />
					</IconButton>
				}
			>
				{error}
			</Alert>
		);
	}
	if (!data) return null;

	// El cuello de botella es la etapa con más material esperando. Se marca una
	// sola: si todo está en ámbar, no se distingue nada.
	const mayorCola = Math.max(...data.etapas.map((e) => e.enCola.total));
	const detenidas = data.etapas.filter((e) => e.pausada);

	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
				<Typography variant="subtitle2">Flujo del pipeline</Typography>
				<Box sx={{ flexGrow: { xs: 0, sm: 1 } }} />
				<FormControlLabel
					control={
						<Switch
							size="small"
							checked={data.interruptores.soloSaij}
							disabled={guardando}
							onChange={async (e) => {
								setGuardando(true);
								try {
									await setSoloSaij(e.target.checked);
									await cargar();
								} finally {
									setGuardando(false);
								}
							}}
						/>
					}
					label={
						<Typography variant="caption">
							Solo SAIJ
							<Tooltip title="Pausa el re-indexado del corpus PJN sin frenar el material nuevo. Es la alternativa fina a apagar el worker entero, que detiene todo.">
								<Box component="span" sx={{ display: "inline-flex", ml: 0.5, color: "text.disabled", verticalAlign: "middle" }}>
									<InfoCircle size={13} />
								</Box>
							</Tooltip>
						</Typography>
					}
					sx={{ ml: 0 }}
				/>
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={cargar} disabled={loading}>
						<Refresh size={15} />
					</IconButton>
				</Tooltip>
			</Stack>

			{detenidas.length > 0 && (
				<Alert severity="warning" variant="outlined" icon={<Warning2 size={16} />} sx={{ mb: 1.5, py: 0.25 }}>
					{detenidas.length === 1 ? "La etapa " : "Las etapas "}
					<strong>{detenidas.map((e) => e.label).join(", ")}</strong>
					{detenidas.length === 1 ? " está detenida" : " están detenidas"}: su worker está apagado, así que lo que llegue se acumula.
				</Alert>
			)}
			{data.interruptores.soloSaij && (
				<Alert severity="info" variant="outlined" sx={{ mb: 1.5, py: 0.25 }}>
					Modo <strong>solo SAIJ</strong>: los embeddings procesan el material nuevo y el corpus PJN espera. Apagá el interruptor para
					reanudarlo.
				</Alert>
			)}

			{/* En escritorio el pipeline se lee de izquierda a derecha en tarjetas;
			    en pantallas chicas, como lista compacta de arriba hacia abajo (las
			    tarjetas costaban 900px de scroll para cinco números). */}
			{esEscritorio ? (
				<Stack direction="row" spacing={1} alignItems="stretch" flexWrap="wrap" useFlexGap>
					{data.etapas.map((e, i) => (
						<Stack key={e.id} direction="row" spacing={1} alignItems="center" sx={{ flex: "1 1 190px" }}>
							<EtapaCard etapa={e} esCuelloDeBotella={e.enCola.total > 0 && e.enCola.total === mayorCola} />
							{i < data.etapas.length - 1 && (
								<Box sx={{ display: "inline-flex", color: theme.palette.text.disabled }}>
									<ArrowRight2 size={14} />
								</Box>
							)}
						</Stack>
					))}
				</Stack>
			) : (
				<Stack spacing={0.5}>
					{data.etapas.map((e, i) => (
						<Box key={e.id}>
							<EtapaFila etapa={e} esCuelloDeBotella={e.enCola.total > 0 && e.enCola.total === mayorCola} />
							{i < data.etapas.length - 1 && (
								<Box sx={{ display: "flex", justifyContent: "center", color: theme.palette.text.disabled, mt: 0.25 }}>
									<ArrowDown2 size={12} />
								</Box>
							)}
						</Box>
					))}
				</Stack>
			)}

			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
				Cada número suma SAIJ y PJN. La etapa en ámbar es donde hay más material esperando.
			</Typography>
		</Paper>
	);
}
