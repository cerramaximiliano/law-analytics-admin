import { useCallback, useEffect, useState } from "react";
import {
	Chip,
	Paper,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { getDatasetStats, getDatasetCandidatos, DatasetStats, DatasetCandidato } from "api/plazos";

/**
 * Dataset de plazos expresos: cada cédula cuyo texto fija el plazo es un
 * ejemplo etiquetado por el propio tribunal. Acá se ven los CANDIDATOS a
 * regla empírica por (fuero, objeto, acto) — para crear la regla, usar la
 * tab Normativa con los datos del candidato.
 */
export default function DatasetTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<DatasetStats | null>(null);
	const [candidatos, setCandidatos] = useState<DatasetCandidato[]>([]);
	const [loading, setLoading] = useState(true);
	const [minN, setMinN] = useState(5);
	const [minShare, setMinShare] = useState(0.8);

	const fetchAll = useCallback(async () => {
		try {
			setLoading(true);
			const [s, c] = await Promise.all([getDatasetStats(), getDatasetCandidatos({ minN, minShare })]);
			setStats(s);
			setCandidatos(c);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando dataset", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [minN, minShare, enqueueSnackbar]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				{stats && (
					<>
						<Chip size="small" label={`${stats.total} ejemplos`} />
						<Chip size="small" color="success" variant="outlined" label={`${stats.conPlazo} con plazo expreso`} />
						<Chip size="small" variant="outlined" label={`${stats.sinPlazo} sin plazo`} />
						{stats.porFuero.map((f) => (
							<Chip key={f.fuero} size="small" variant="outlined" label={`${f.fuero}: ${f.conPlazo}/${f.total}`} />
						))}
					</>
				)}
				<TextField
					size="small"
					type="number"
					label="n mínimo"
					value={minN}
					onChange={(e) => setMinN(Math.max(2, Number(e.target.value)))}
					sx={{ width: 110, ml: "auto" }}
				/>
				<TextField
					size="small"
					type="number"
					label="Consistencia mín."
					inputProps={{ step: 0.05, min: 0.5, max: 1 }}
					value={minShare}
					onChange={(e) => setMinShare(Number(e.target.value))}
					sx={{ width: 140 }}
				/>
			</Stack>

			<Typography variant="body2" color="text.secondary">
				Candidatos a regla empírica por (fuero, objeto, acto): combinaciones donde el plazo dominante alcanza la consistencia mínima.
				El dataset es evidencia, no autoridad — para aplicar un candidato, creá/ajustá la regla en la tab Normativa citando estos números.
			</Typography>

			<TableContainer component={Paper} elevation={0} sx={{ maxHeight: "calc(100dvh - 460px)" }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Fuero</TableCell>
							<TableCell>Objeto</TableCell>
							<TableCell>Acto</TableCell>
							<TableCell>Plazo dominante</TableCell>
							<TableCell>n</TableCell>
							<TableCell>Consist.</TableCell>
							<TableCell>Variantes</TableCell>
							<TableCell>Regla vigente</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: 6 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={8}>
										<Skeleton />
									</TableCell>
								</TableRow>
							))
						) : (
							candidatos.map((c, i) => (
								<TableRow key={i} hover>
									<TableCell>{c.fuero}</TableCell>
									<TableCell sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{c.objeto || "—"}
									</TableCell>
									<TableCell>{c.acto}</TableCell>
									<TableCell>
										<Tooltip
											title={
												c.ejemplos.length ? (
													<Stack spacing={1}>
														{c.ejemplos.map((e, j) => (
															<Typography key={j} variant="caption" sx={{ fontFamily: "monospace" }}>
																«{e}»
															</Typography>
														))}
													</Stack>
												) : (
													""
												)
											}
										>
											<Chip size="small" color="primary" variant="outlined" label={`${c.plazoDias}d ${c.tipoPlazo || "habiles"}`} />
										</Tooltip>
									</TableCell>
									<TableCell>{c.n}</TableCell>
									<TableCell>{Math.round(c.share * 100)}%</TableCell>
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{c.variantes.map((v) => `${v.plazoDias}d×${v.n}`).join(" · ")}
										</Typography>
									</TableCell>
									<TableCell>
										{c.reglaExistente ? (
											<Chip
												size="small"
												color={c.reglaExistente.coincide ? "success" : "warning"}
												variant="outlined"
												label={
													c.reglaExistente.coincide
														? `✓ ${c.reglaExistente.clave}`
														: `⚠ ${c.reglaExistente.clave}: ${c.reglaExistente.plazoDias}d ≠ ${c.plazoDias}d`
												}
											/>
										) : (
											<Chip size="small" color="info" variant="outlined" label="SIN REGLA — candidato nuevo" />
										)}
									</TableCell>
								</TableRow>
							))
						)}
						{!loading && candidatos.length === 0 && (
							<TableRow>
								<TableCell colSpan={8}>
									<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
										Aún no hay combinaciones que superen los umbrales — el dataset se está cosechando (worker plazos-dataset).
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
		</Stack>
	);
}
