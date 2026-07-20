import { useCallback, useEffect, useState } from "react";

// material-ui
import {
	Box,
	Chip,
	CircularProgress,
	Collapse,
	IconButton,
	Link,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";

// project imports
import MainCard from "components/MainCard";
import { useSnackbar } from "notistack";

// icons
import { ArrowDown2, ArrowRight2, DollarCircle, TickCircle, CloseCircle, ExportSquare, Refresh } from "iconsax-react";

// api
import { getResumen, getSerie, ResumenJurisdiccion, ValorArancelario } from "api/valoresArancelariosService";

// ─── Helpers ────────────────────────────────────────────────────────────────

const pesos = (n: number) =>
	"$" + Number(n).toLocaleString("es-AR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

const fecha = (iso?: string) =>
	iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fechaHora = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

// ─── Fila expandible por jurisdicción ─────────────────────────────────────────

const FilaJurisdiccion = ({ fila }: { fila: ResumenJurisdiccion }) => {
	const [abierta, setAbierta] = useState(false);
	const [serie, setSerie] = useState<ValorArancelario[]>([]);
	const [cargandoSerie, setCargandoSerie] = useState(false);
	const { enqueueSnackbar } = useSnackbar();

	const toggle = useCallback(async () => {
		const nueva = !abierta;
		setAbierta(nueva);
		// La serie se pide una sola vez, al abrir por primera vez.
		if (nueva && serie.length === 0) {
			try {
				setCargandoSerie(true);
				const { data } = await getSerie(fila.unidad, fila.ambito, { limit: 500 });
				setSerie(data);
			} catch {
				enqueueSnackbar(`No se pudo cargar la serie de ${fila.unidad} ${fila.ambito}`, { variant: "error" });
			} finally {
				setCargandoSerie(false);
			}
		}
	}, [abierta, serie.length, fila.unidad, fila.ambito, enqueueSnackbar]);

	const estado = fila.estado;
	const tareaOk = estado?.ultimoEstado === "ok";

	return (
		<>
			<TableRow hover sx={{ "& > td": { borderBottom: abierta ? "none" : undefined } }}>
				<TableCell padding="checkbox">
					<IconButton size="small" onClick={toggle}>
						{abierta ? <ArrowDown2 size={16} /> : <ArrowRight2 size={16} />}
					</IconButton>
				</TableCell>
				<TableCell>
					<Stack direction="row" spacing={1} alignItems="center">
						<Chip label={fila.unidad} size="small" color="primary" variant="outlined" />
						<Typography variant="subtitle2">{fila.ambito}</Typography>
					</Stack>
					<Typography variant="caption" color="text.secondary">
						{fila.descripcion}
					</Typography>
				</TableCell>
				<TableCell align="right">
					<Typography variant="subtitle1">{fila.vigente ? pesos(fila.vigente.valor) : "—"}</Typography>
				</TableCell>
				<TableCell>{fila.vigente?.periodo ?? "—"}</TableCell>
				<TableCell>{fecha(fila.vigente?.vigenciaDesde)}</TableCell>
				<TableCell align="center">{fila.total}</TableCell>
				<TableCell>
					{estado ? (
						<Tooltip
							title={
								tareaOk
									? `Última sincronización: ${fechaHora(estado.ultimaEjecucion)}`
									: `Error: ${estado.ultimoError ?? "desconocido"}`
							}
						>
							<Stack direction="row" spacing={0.5} alignItems="center">
								{tareaOk ? <TickCircle size={16} color="#22C55E" /> : <CloseCircle size={16} color="#EF4444" />}
								<Typography variant="caption" color="text.secondary">
									{fechaHora(estado.ultimaEjecucion)}
								</Typography>
							</Stack>
						</Tooltip>
					) : (
						<Typography variant="caption" color="text.secondary">
							—
						</Typography>
					)}
				</TableCell>
				<TableCell>
					{fila.fuente && (
						<Tooltip title="Abrir la fuente oficial">
							<IconButton size="small" component={Link} href={fila.fuente} target="_blank" rel="noopener">
								<ExportSquare size={16} />
							</IconButton>
						</Tooltip>
					)}
				</TableCell>
			</TableRow>
			<TableRow>
				<TableCell sx={{ py: 0, borderBottom: abierta ? undefined : "none" }} colSpan={8}>
					<Collapse in={abierta} timeout="auto" unmountOnExit>
						<Box sx={{ my: 2, mx: 1 }}>
							{cargandoSerie ? (
								<Stack alignItems="center" sx={{ py: 3 }}>
									<CircularProgress size={22} />
								</Stack>
							) : (
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Período</TableCell>
											<TableCell align="right">Valor</TableCell>
											<TableCell>Vigente desde</TableCell>
											<TableCell>Norma</TableCell>
											<TableCell>Publicada</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{serie.map((v) => (
											<TableRow key={v._id} hover>
												<TableCell>{v.periodo}</TableCell>
												<TableCell align="right">{pesos(v.valor)}</TableCell>
												<TableCell>{fecha(v.vigenciaDesde)}</TableCell>
												<TableCell>
													<Typography variant="caption">{v.norma ?? "—"}</Typography>
												</TableCell>
												<TableCell>{v.fechaPublicacion ? fecha(v.fechaPublicacion) : "—"}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</>
	);
};

// ─── Página ───────────────────────────────────────────────────────────────────

const ValoresArancelarios = () => {
	const [filas, setFilas] = useState<ResumenJurisdiccion[]>([]);
	const [cargando, setCargando] = useState(false);
	const { enqueueSnackbar } = useSnackbar();

	const cargar = useCallback(async () => {
		try {
			setCargando(true);
			setFilas(await getResumen());
		} catch {
			enqueueSnackbar("No se pudo cargar el resumen de valores arancelarios", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	return (
		<MainCard
			title={
				<Stack direction="row" spacing={1} alignItems="center">
					<DollarCircle size={22} />
					<Typography variant="h4">Datos Arancelarios</Typography>
				</Stack>
			}
			secondary={
				<Tooltip title="Actualizar">
					<IconButton onClick={cargar} disabled={cargando}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Valores de UMA, JUS e IUS por jurisdicción. Se sincronizan automáticamente desde las fuentes oficiales de lunes a viernes.
				Al aparecer un valor nuevo se genera un post en borrador y se avisa por correo.
			</Typography>

			{cargando ? (
				<Stack alignItems="center" sx={{ py: 6 }}>
					<CircularProgress />
				</Stack>
			) : (
				<TableContainer sx={{ overflowX: "auto" }}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell padding="checkbox" />
								<TableCell>Unidad / Jurisdicción</TableCell>
								<TableCell align="right">Valor vigente</TableCell>
								<TableCell>Período</TableCell>
								<TableCell>Vigente desde</TableCell>
								<TableCell align="center">Escalones</TableCell>
								<TableCell>Última sync</TableCell>
								<TableCell>Fuente</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{filas.map((f) => (
								<FilaJurisdiccion key={`${f.unidad}-${f.ambito}`} fila={f} />
							))}
							{filas.length === 0 && (
								<TableRow>
									<TableCell colSpan={8}>
										<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
											No hay datos arancelarios cargados.
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</MainCard>
	);
};

export default ValoresArancelarios;
