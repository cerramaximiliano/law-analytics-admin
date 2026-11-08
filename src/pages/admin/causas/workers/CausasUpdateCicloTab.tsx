import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Grid,
	IconButton,
	LinearProgress,
	MenuItem,
	Radio,
	Select,
	Skeleton,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Add, ArrowDown2, ArrowUp2, Refresh, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	CausasUpdateCicloService,
	CicloConfig,
	CicloResponse,
	ClaseCiclo,
	EstadoCarpeta,
	FranjaProyectada,
	Rango,
} from "api/causasUpdateCiclo";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const ESTADOS_CARPETA: { value: EstadoCarpeta; label: string }[] = [
	{ value: "seguimiento", label: "En seguimiento" },
	{ value: "activa", label: "Activa" },
	{ value: "archivada", label: "Solo archivadas" },
	{ value: "ninguna", label: "Sin carpeta" },
];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const snack = { anchorOrigin: { vertical: "bottom" as const, horizontal: "right" as const } };

const hora = (iso?: string) =>
	iso
		? new Date(iso).toLocaleTimeString("es-AR", {
				timeZone: "America/Argentina/Buenos_Aires",
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23",
		  })
		: "—";
const fecha = (iso?: string | null) =>
	iso ? new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hourCycle: "h23" }) : "—";
const listaCarpeta = (c: ClaseCiclo["regla"]["carpeta"]): EstadoCarpeta[] => (!c ? [] : Array.isArray(c) ? c : [c]);
const clonar = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const numOrNull = (v: string) => (v === "" ? null : Number(v));

const CausasUpdateCicloTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [data, setData] = useState<CicloResponse | null>(null);
	const [draft, setDraft] = useState<CicloConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [nuevaFranja, setNuevaFranja] = useState<Record<number, string>>({});

	const cargar = useCallback(
		async (resetDraft = false) => {
			try {
				const r = await CausasUpdateCicloService.get();
				setData(r);
				setDraft((d) => (d && !resetDraft ? d : clonar(r.ciclo)));
			} catch (e: any) {
				enqueueSnackbar(e?.response?.data?.message || "Error cargando el ciclo", { variant: "error", ...snack });
			} finally {
				setLoading(false);
			}
		},
		[enqueueSnackbar],
	);

	useEffect(() => {
		cargar(true);
		const t = setInterval(() => cargar(false), 60000);
		return () => clearInterval(t);
	}, [cargar]);

	const cambios = useMemo(() => !!data && !!draft && JSON.stringify(draft) !== JSON.stringify(data.ciclo), [data, draft]);

	if (loading || !draft || !data) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	const estado = data.estado;
	const set = (fn: (c: CicloConfig) => void) =>
		setDraft((d) => {
			const c = clonar(d as CicloConfig);
			fn(c);
			return c;
		});
	const setClase = (i: number, fn: (k: ClaseCiclo) => void) => set((c) => fn(c.clases[i]));
	const setRango = (i: number, campo: "ultimoMovimientoDias" | "movimientosCount", lado: keyof Rango, v: string) =>
		setClase(i, (k) => {
			const r = { ...(k.regla[campo] || {}), [lado]: numOrNull(v) };
			if (r.min == null && r.max == null) delete k.regla[campo];
			else k.regla[campo] = r;
		});
	const mover = (i: number, d: -1 | 1) =>
		set((c) => {
			const j = i + d;
			if (j < 0 || j >= c.clases.length) return;
			[c.clases[i], c.clases[j]] = [c.clases[j], c.clases[i]];
			c.clases.forEach((k, n) => (k.orden = n + 1));
		});
	const agregarClase = () =>
		set((c) => {
			let n = c.clases.length + 1;
			while (c.clases.some((k) => k.id === `clase-${n}`)) n++;
			c.clases.push({ id: `clase-${n}`, nombre: `Clase ${n}`, orden: c.clases.length + 1, activa: true, regla: {}, franjas: ["17:30"] });
		});
	const borrarClase = (i: number) =>
		set((c) => {
			c.clases.splice(i, 1);
			c.clases.forEach((k, n) => (k.orden = n + 1));
		});
	const agregarFranja = (i: number) => {
		const f = (nuevaFranja[i] || "").trim();
		if (!HHMM.test(f)) {
			enqueueSnackbar("Franja inválida: usá HH:MM (por ejemplo 09:30)", { variant: "warning", ...snack });
			return;
		}
		setClase(i, (k) => {
			k.franjas = [...new Set([...k.franjas, f])].sort();
		});
		setNuevaFranja((x) => ({ ...x, [i]: "" }));
	};

	const guardar = async () => {
		try {
			setSaving(true);
			const r = await CausasUpdateCicloService.save(draft);
			enqueueSnackbar(r.message, { variant: "success", ...snack });
			await cargar(true);
		} catch (e: any) {
			const errs: string[] = e?.response?.data?.errores || [];
			enqueueSnackbar(errs.length > 1 ? `${errs[0]} (y ${errs.length - 1} más)` : e?.response?.data?.message || "Error al guardar", {
				variant: "error",
				...snack,
			});
		} finally {
			setSaving(false);
		}
	};

	const colorEstado = (e: FranjaProyectada["estado"]) =>
		e === "rojo" ? theme.palette.error.main : e === "amarillo" ? theme.palette.warning.main : theme.palette.success.main;

	return (
		<Stack spacing={3}>
			{/* Encabezado: activación, días, guardado */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
						<Box>
							<Stack direction="row" spacing={1} alignItems="center">
								<Switch checked={draft.enabled} onChange={(e) => set((c) => (c.enabled = e.target.checked))} />
								<Typography variant="h6">Ciclo por clases y franjas</Typography>
								<Chip size="small" label={data.ciclo.enabled ? "Activo" : "Apagado"} color={data.ciclo.enabled ? "success" : "default"} />
							</Stack>
							<Typography variant="body2" color="text.secondary">
								Apagado, el worker usa el umbral de horas de la pestaña Configuración. Los cambios se aplican en el próximo minuto.
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{data.guardado
									? `Última edición ${fecha(data.updatedAt)} por ${data.updatedBy || "—"}`
									: "Todavía no se guardó: se muestran los valores iniciales."}
							</Typography>
						</Box>
						<Stack direction="row" spacing={1}>
							<Button
								variant="outlined"
								startIcon={<Refresh size={18} />}
								disabled={!cambios || saving}
								onClick={() => setDraft(clonar(data.ciclo))}
							>
								Descartar
							</Button>
							<Button variant="contained" disabled={!cambios || saving} onClick={guardar}>
								{saving ? "Guardando…" : "Guardar"}
							</Button>
						</Stack>
					</Stack>
					<Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap alignItems="center">
						<Typography variant="body2" sx={{ mr: 1 }}>
							Días:
						</Typography>
						{DIAS.map((d, i) => (
							<Chip
								key={d}
								label={d}
								size="small"
								color={draft.dias.includes(i) ? "primary" : "default"}
								variant={draft.dias.includes(i) ? "filled" : "outlined"}
								onClick={() => set((c) => (c.dias = c.dias.includes(i) ? c.dias.filter((x) => x !== i) : [...c.dias, i].sort()))}
							/>
						))}
						<TextField
							size="small"
							label="Hora de corte"
							value={draft.capacidad.horaCorte}
							onChange={(e) => set((c) => (c.capacidad.horaCorte = e.target.value))}
							error={!HHMM.test(draft.capacidad.horaCorte)}
							helperText="Todo leído antes del resumen"
							sx={{ width: 160, ml: 2 }}
						/>
					</Stack>
				</CardContent>
			</Card>

			{/* Estado en vivo y proyección */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
						<Typography variant="subtitle1" fontWeight={600}>
							Proyección del día {estado?.proyeccion?.dia || ""}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Actualizado {fecha(estado?.updatedAt)}
						</Typography>
					</Stack>
					{!estado?.enabled || !estado.proyeccion ? (
						<Alert severity="info" variant="outlined">
							El manager calcula la proyección cuando el ciclo está activo. Para verla antes de activarlo:{" "}
							<code>node scripts/ciclo.js</code> en worker-cloud-01.
						</Alert>
					) : (
						<>
							<Stack direction="row" spacing={3} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
								<Dato label="Franja en curso" valor={estado.franjaActual?.split(" ")[1] || "fuera de franja"} />
								<Dato label="Causas vencidas ahora" valor={estado.pendientes ?? "—"} />
								<Dato label="Causas en el ciclo" valor={estado.totalCausas ?? "—"} />
								<Dato label="Instancias · carriles" valor={`${estado.proyeccion.instancias} · ${estado.proyeccion.carriles}`} />
								<Dato label="Ritmo" valor={`${estado.ritmo?.global ?? "—"} s/causa${estado.ritmo?.manual ? " (manual)" : ""}`} />
								<Dato label="Box (load · RAM libre)" valor={estado.box ? `${estado.box.load1} · ${estado.box.ramLibreGb} GB` : "—"} />
							</Stack>
							{(estado.alertas || []).map((a, i) => (
								<Alert key={i} severity="warning" variant="outlined" sx={{ mb: 1 }}>
									{a.message}
								</Alert>
							))}
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Franja</TableCell>
										<TableCell>Clases</TableCell>
										<TableCell align="right">Causas</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell align="right">Fin estimado</TableCell>
										<TableCell sx={{ width: 180 }}>Ocupación</TableCell>
										<TableCell>Cuello de botella</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{estado.proyeccion.franjas.map((f) => (
										<TableRow key={f.franja}>
											<TableCell>
												<Stack direction="row" spacing={1} alignItems="center">
													<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colorEstado(f.estado) }} />
													<span>{f.franja}</span>
												</Stack>
											</TableCell>
											<TableCell>
												<Typography variant="caption">{f.clases.join(", ")}</Typography>
											</TableCell>
											<TableCell align="right">{f.causas.toLocaleString("es-AR")}</TableCell>
											<TableCell align="right">{f.duracionMin} min</TableCell>
											<TableCell align="right">{hora(f.finAt)}</TableCell>
											<TableCell>
												<Stack direction="row" spacing={1} alignItems="center">
													<LinearProgress
														variant="determinate"
														value={Math.min(100, (f.ocupacion || 0) * 100)}
														sx={{
															flex: 1,
															height: 6,
															borderRadius: 3,
															bgcolor: alpha(colorEstado(f.estado), 0.15),
															"& .MuiLinearProgress-bar": { bgcolor: colorEstado(f.estado) },
														}}
													/>
													<Typography variant="caption">{f.ocupacion != null ? `${Math.round(f.ocupacion * 100)}%` : "—"}</Typography>
												</Stack>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{f.dominante === "credencial" && f.credencialMax
														? `Credencial …${f.credencialMax.id.slice(-6)} (${f.credencialMax.causas} causas, ${f.credencialMax.min} min)`
														: `Trabajo total ${f.trabajoMin} min`}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</>
					)}
				</CardContent>
			</Card>

			{/* Clases */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
						<Box>
							<Typography variant="subtitle1" fontWeight={600}>
								Clases
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Se evalúan en orden: la causa queda en la primera clase cuyas condiciones cumple. Lo que no cumple ninguna va a la clase por
								defecto. Una clase sin franjas queda pausada.
							</Typography>
						</Box>
						<Button startIcon={<Add size={18} />} onClick={agregarClase}>
							Nueva clase
						</Button>
					</Stack>
					<Stack spacing={2}>
						{draft.clases.map((k, i) => (
							<Box key={i} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2, opacity: k.activa ? 1 : 0.6 }}>
								<Grid container spacing={2} alignItems="center">
									<Grid item xs={12} md={4}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Stack>
												<IconButton size="small" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
													<ArrowUp2 size={16} />
												</IconButton>
												<IconButton size="small" disabled={i === draft.clases.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar">
													<ArrowDown2 size={16} />
												</IconButton>
											</Stack>
											<Stack spacing={1} sx={{ flex: 1 }}>
												<TextField
													size="small"
													label="Nombre"
													value={k.nombre}
													onChange={(e) => setClase(i, (x) => (x.nombre = e.target.value))}
												/>
												<TextField
													size="small"
													label="Id"
													value={k.id}
													onChange={(e) => {
														const nuevo = e.target.value.toLowerCase();
														set((c) => {
															if (c.claseDefault === c.clases[i].id) c.claseDefault = nuevo;
															c.clases[i].id = nuevo;
														});
													}}
												/>
											</Stack>
										</Stack>
									</Grid>
									<Grid item xs={12} md={5}>
										<Stack spacing={1}>
											<Select
												size="small"
												multiple
												displayEmpty
												value={listaCarpeta(k.regla.carpeta)}
												onChange={(e) =>
													setClase(i, (x) => {
														const v = e.target.value as EstadoCarpeta[];
														if (!v.length) delete x.regla.carpeta;
														else x.regla.carpeta = v.length === 1 ? v[0] : v;
													})
												}
												renderValue={(v) =>
													(v as EstadoCarpeta[]).length
														? (v as EstadoCarpeta[]).map((s) => ESTADOS_CARPETA.find((e) => e.value === s)?.label).join(" o ")
														: "Carpeta: cualquiera"
												}
											>
												{ESTADOS_CARPETA.map((e) => (
													<MenuItem key={e.value} value={e.value}>
														{e.label}
													</MenuItem>
												))}
											</Select>
											<Stack direction="row" spacing={1}>
												<TextField
													size="small"
													type="number"
													label="Últ. mov. desde (días)"
													value={k.regla.ultimoMovimientoDias?.min ?? ""}
													onChange={(e) => setRango(i, "ultimoMovimientoDias", "min", e.target.value)}
												/>
												<TextField
													size="small"
													type="number"
													label="hasta (días)"
													value={k.regla.ultimoMovimientoDias?.max ?? ""}
													onChange={(e) => setRango(i, "ultimoMovimientoDias", "max", e.target.value)}
												/>
											</Stack>
											<Stack direction="row" spacing={1}>
												<TextField
													size="small"
													label="Fueros (colecciones, coma)"
													value={(k.regla.fueros || []).join(", ")}
													onChange={(e) =>
														setClase(i, (x) => {
															const v = e.target.value
																.split(",")
																.map((s) => s.trim())
																.filter(Boolean);
															if (v.length) x.regla.fueros = v;
															else delete x.regla.fueros;
														})
													}
													sx={{ flex: 1 }}
												/>
												<TextField
													size="small"
													label="Credenciales (ids, coma)"
													value={(k.regla.credenciales || []).join(", ")}
													onChange={(e) =>
														setClase(i, (x) => {
															const v = e.target.value
																.split(",")
																.map((s) => s.trim())
																.filter(Boolean);
															if (v.length) x.regla.credenciales = v;
															else delete x.regla.credenciales;
														})
													}
													sx={{ flex: 1 }}
												/>
											</Stack>
										</Stack>
									</Grid>
									<Grid item xs={12} md={3}>
										<Stack spacing={1}>
											<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
												{k.franjas.length === 0 && <Chip size="small" label="Pausada" color="warning" variant="outlined" />}
												{k.franjas.map((f) => (
													<Chip
														key={f}
														size="small"
														label={f}
														onDelete={() => setClase(i, (x) => (x.franjas = x.franjas.filter((y) => y !== f)))}
													/>
												))}
											</Stack>
											<Stack direction="row" spacing={1}>
												<TextField
													size="small"
													placeholder="HH:MM"
													value={nuevaFranja[i] || ""}
													onChange={(e) => setNuevaFranja((x) => ({ ...x, [i]: e.target.value }))}
													onKeyDown={(e) => e.key === "Enter" && agregarFranja(i)}
													sx={{ width: 100 }}
												/>
												<Button size="small" onClick={() => agregarFranja(i)}>
													Agregar
												</Button>
											</Stack>
											<Stack direction="row" alignItems="center" justifyContent="space-between">
												<Tooltip title="Clase por defecto: recibe lo que no cumple ninguna regla">
													<Stack direction="row" alignItems="center">
														<Radio
															size="small"
															checked={draft.claseDefault === k.id}
															onChange={() => set((c) => (c.claseDefault = k.id))}
														/>
														<Typography variant="caption">Por defecto</Typography>
													</Stack>
												</Tooltip>
												<Stack direction="row" alignItems="center">
													<Tooltip title="Desactivar sin borrar">
														<Switch size="small" checked={k.activa} onChange={(e) => setClase(i, (x) => (x.activa = e.target.checked))} />
													</Tooltip>
													<IconButton
														size="small"
														color="error"
														onClick={() => borrarClase(i)}
														disabled={draft.clases.length <= 1}
														aria-label="Borrar clase"
													>
														<Trash size={16} />
													</IconButton>
												</Stack>
											</Stack>
											<Typography variant="caption" color="text.secondary">
												{estado?.porClase?.[k.id] != null
													? `${estado.porClase[k.id].toLocaleString("es-AR")} causas hoy`
													: "Sin conteo todavía"}
											</Typography>
										</Stack>
									</Grid>
								</Grid>
							</Box>
						))}
					</Stack>
				</CardContent>
			</Card>

			{/* Parámetros de capacidad */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight={600}>
						Capacidad y alertas
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						El manager proyecta cada franja con el ritmo medido y avisa al admin si una franja se pisa con la siguiente o si el día no entra
						antes de la hora de corte, indicando si conviene subir carriles, instancias o recursos del box.
					</Typography>
					<Grid container spacing={2}>
						<Campo
							label="Margen antes del corte (min)"
							value={draft.capacidad.margenMin}
							onChange={(v) => set((c) => (c.capacidad.margenMin = Number(v)))}
						/>
						<Campo
							label="Login fijo por corrida (s)"
							value={draft.capacidad.overheadSegPorCorrida}
							onChange={(v) => set((c) => (c.capacidad.overheadSegPorCorrida = Number(v)))}
						/>
						<Campo
							label="Seg. por causa manual (vacío = medido)"
							value={draft.capacidad.segPorCausaManual ?? ""}
							onChange={(v) => set((c) => (c.capacidad.segPorCausaManual = numOrNull(v)))}
						/>
						<Campo
							label="Días para medir el ritmo"
							value={draft.capacidad.ritmoDias}
							onChange={(v) => set((c) => (c.capacidad.ritmoDias = Number(v)))}
						/>
						<Campo
							label="Load máximo del box"
							value={draft.capacidad.boxLoadMax}
							onChange={(v) => set((c) => (c.capacidad.boxLoadMax = Number(v)))}
						/>
						<Campo
							label="RAM libre mínima (GB)"
							value={draft.capacidad.boxRamLibreMinGb}
							onChange={(v) => set((c) => (c.capacidad.boxRamLibreMinGb = Number(v)))}
						/>
						<Campo
							label="Min. mínimos entre lecturas"
							value={draft.minutosMinEntreLecturas}
							onChange={(v) => set((c) => (c.minutosMinEntreLecturas = Number(v)))}
						/>
						<Campo
							label="Reclasificar cada (min)"
							value={draft.reclasificarCadaMin}
							onChange={(v) => set((c) => (c.reclasificarCadaMin = Number(v)))}
						/>
					</Grid>
				</CardContent>
			</Card>

			{/* Historial */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
						Franjas ejecutadas
					</Typography>
					{data.franjas.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Todavía no corrió ninguna franja.
						</Typography>
					) : (
						<Box sx={{ overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Día</TableCell>
										<TableCell>Franja</TableCell>
										<TableCell align="right">Planificadas</TableCell>
										<TableCell align="right">Leídas</TableCell>
										<TableCell align="right">Errores</TableCell>
										<TableCell align="right">Mov. nuevos</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell>Cierre</TableCell>
										<TableCell align="right">Load máx · RAM mín</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.franjas.map((f) => (
										<TableRow key={f._id}>
											<TableCell>{f.dia}</TableCell>
											<TableCell>{f.franja}</TableCell>
											<TableCell align="right">{f.planificadas}</TableCell>
											<TableCell align="right">{f.procesadas ?? "—"}</TableCell>
											<TableCell align="right">{f.errores ?? "—"}</TableCell>
											<TableCell align="right">{f.newMovimientos ?? "—"}</TableCell>
											<TableCell align="right">{f.duracionSeg != null ? `${Math.round(f.duracionSeg / 60)} min` : "—"}</TableCell>
											<TableCell>
												{f.estado === "en-curso" ? (
													<Chip
														size="small"
														label={f.finAt ? "vaciada" : `en curso · ${f.pendientes ?? "?"} pendientes`}
														color="info"
														variant="outlined"
													/>
												) : f.incumplida ? (
													<Chip size="small" label="incumplida" color="error" variant="outlined" />
												) : (
													<Chip
														size="small"
														label={f.cerradaPor === "vaciada" ? "completa" : "pisada por la siguiente"}
														color={f.cerradaPor === "vaciada" ? "success" : "warning"}
														variant="outlined"
													/>
												)}
											</TableCell>
											<TableCell align="right">
												{f.box?.load1Max ?? "—"} · {f.box?.ramLibreMinGb ?? "—"} GB
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>
					)}
				</CardContent>
			</Card>
		</Stack>
	);
};

const Dato: React.FC<{ label: string; valor: React.ReactNode }> = ({ label, valor }) => (
	<Box>
		<Typography variant="caption" color="text.secondary">
			{label}
		</Typography>
		<Typography variant="body1" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
			{valor}
		</Typography>
	</Box>
);

const Campo: React.FC<{ label: string; value: number | string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
	<Grid item xs={12} sm={6} md={3}>
		<TextField fullWidth size="small" type="number" label={label} value={value} onChange={(e) => onChange(e.target.value)} />
	</Grid>
);

export default CausasUpdateCicloTab;
