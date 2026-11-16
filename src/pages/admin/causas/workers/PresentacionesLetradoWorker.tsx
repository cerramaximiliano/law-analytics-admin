// Worker "Presentaciones del letrado" (pjn-mis-causas: lectura en pjn-bandeja-sync + recálculo
// pjn-actos-letrado). Tres sub-tabs: Estado (relevamiento por día, credenciales, alertas),
// Bugs y pendientes (lista curada + alertas en vivo) y Flujo (diagrama).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Grid,
	LinearProgress,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Chart, DocumentText, Refresh, TaskSquare } from "iconsax-react";
import { useTabIndexParam } from "hooks/useTabParam";
import WorkerSubTabs, { SubTabDef } from "./WorkerSubTabs";
import PresentacionesLetradoFlow from "../../flujos/PresentacionesLetradoFlow";
import ActosLetradoService, { Alerta, CorridaDia, EstadoActosLetrado } from "api/actosLetrado";
import { ITEMS_PRESENTACIONES, ItemSeguimiento } from "./presentacionesLetradoPendientes";

const SUB_TABS = ["estado", "pendientes", "flujo"] as const;
const TAB_DEFS: SubTabDef[] = [
	{ label: "Estado", icon: <Chart size={18} />, hint: "Corridas por día, credenciales y alertas" },
	{ label: "Bugs y pendientes", icon: <TaskSquare size={18} />, hint: "Problemas conocidos y trabajo pendiente" },
	{ label: "Flujo", icon: <DocumentText size={18} />, hint: "Del escrito presentado al contador" },
];

const fmt = (n?: number | null) => (n == null ? "—" : n.toLocaleString("es-AR"));
const fechaHora = (iso?: string | null) =>
	iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const hace = (iso?: string | null) => {
	if (!iso) return "sin registro";
	const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (min < 60) return `hace ${min} min`;
	const h = Math.round(min / 60);
	return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
};
const diaCorto = (dia: string) => {
	const [y, m, d] = dia.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d, 12));
	return dt.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
};

const NIVEL_COLOR: Record<Alerta["nivel"], "error" | "warning" | "info"> = { error: "error", warning: "warning", info: "info" };

function estadoGeneral(e: EstadoActosLetrado): { color: "success" | "warning" | "error"; texto: string } {
	if (e.alertas.some((a) => a.nivel === "error")) return { color: "error", texto: "Con fallas" };
	if (e.alertas.some((a) => a.nivel === "warning")) return { color: "warning", texto: "Requiere atención" };
	return { color: "success", texto: "Funcionando" };
}

// ── Componentes chicos ────────────────────────────────────────────────────

const Kpi = ({ titulo, valor, detalle, tono }: { titulo: string; valor: React.ReactNode; detalle?: React.ReactNode; tono?: string }) => (
	<Card variant="outlined" sx={{ height: "100%" }}>
		<CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
			<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
				{titulo}
			</Typography>
			<Typography variant="h4" sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums", color: tono }}>
				{valor}
			</Typography>
			{detalle && (
				<Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.25 }}>
					{detalle}
				</Typography>
			)}
		</CardContent>
	</Card>
);

const Cumplimiento = ({ hechas, esperadas, fallas }: { hechas: number; esperadas: number; fallas?: number }) => {
	const theme = useTheme();
	const ok = hechas >= esperadas && !fallas;
	const color = esperadas === 0 ? theme.palette.text.secondary : ok ? theme.palette.success.main : hechas === 0 ? theme.palette.error.main : theme.palette.warning.main;
	return (
		<Box component="span" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color }}>
			{hechas}/{esperadas}
			{fallas ? (
				<Typography component="span" variant="caption" color="error" sx={{ ml: 0.5 }}>
					({fallas} con error)
				</Typography>
			) : null}
		</Box>
	);
};

const Barra = ({ valor, max, color }: { valor: number; max: number; color: string }) => (
	<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
		<Box sx={{ flex: 1, minWidth: 40, height: 6, borderRadius: 3, bgcolor: alpha(color, 0.12) }}>
			<Box sx={{ width: `${max ? Math.min(100, (valor / max) * 100) : 0}%`, height: "100%", borderRadius: 3, bgcolor: color }} />
		</Box>
		<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>
			{fmt(valor)}
		</Typography>
	</Box>
);

// ── Pestaña Estado ────────────────────────────────────────────────────────

const TablaDias = ({ dias }: { dias: CorridaDia[] }) => {
	const theme = useTheme();
	const filas = [...dias].reverse();
	const sumar = (o: { escrito: number; cedula: number; deox: number }) => o.escrito + o.cedula + o.deox;
	const maxLeidos = Math.max(1, ...dias.map((d) => sumar(d.leidos)));
	const maxVinc = Math.max(1, ...dias.map((d) => sumar(d.vinculados)));
	return (
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Día (UTC)</TableCell>
						<TableCell align="center">Lecturas</TableCell>
						<TableCell align="center">Recálculos</TableCell>
						<TableCell sx={{ minWidth: 140 }}>Presentaciones leídas</TableCell>
						<TableCell sx={{ minWidth: 140 }}>Vinculadas al expediente</TableCell>
						<TableCell align="right">Choques</TableCell>
						<TableCell align="right">Carpetas cambiadas</TableCell>
						<TableCell align="right">Duración máx.</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{filas.map((d) => (
						<TableRow key={d.dia} hover>
							<TableCell sx={{ whiteSpace: "nowrap" }}>
								{diaCorto(d.dia)}
								{d.parcial && <Chip size="small" label="en curso" sx={{ ml: 1, height: 18, fontSize: "0.65rem" }} />}
							</TableCell>
							<TableCell align="center">
								<Cumplimiento hechas={d.lectura.corridas} esperadas={d.lectura.esperadas} fallas={d.lectura.credFallidas + d.lectura.actosFallidas} />
							</TableCell>
							<TableCell align="center">
								<Cumplimiento hechas={d.recalculo.corridas} esperadas={d.recalculo.esperadas} fallas={d.recalculo.fallidas} />
							</TableCell>
							<TableCell>
								<Tooltip title={`${d.leidos.escrito} escritos · ${d.leidos.cedula} cédulas · ${d.leidos.deox} DEOX`}>
									<Box>
										<Barra valor={sumar(d.leidos)} max={maxLeidos} color={theme.palette.primary.main} />
									</Box>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Tooltip title={`${d.vinculados.escrito} escritos · ${d.vinculados.cedula} cédulas · ${d.vinculados.deox} DEOX`}>
									<Box>
										<Barra valor={sumar(d.vinculados)} max={maxVinc} color={theme.palette.success.main} />
									</Box>
								</Tooltip>
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{d.recalculo.corridas ? fmt(d.recalculo.choques) : "—"}
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{d.recalculo.corridas ? fmt(d.recalculo.carpetasCambiadas) : "—"}
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
								{d.lectura.msMax || d.recalculo.msMax
									? `${d.lectura.msMax ? `${Math.round(d.lectura.msMax / 60000)} min` : "—"} / ${d.recalculo.msMax ? `${Math.round(d.recalculo.msMax / 1000)} s` : "—"}`
									: "—"}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, py: 1 }}>
				Esperadas: 3 lecturas (10, 16 y 22 UTC) y 12 recálculos (cada 2 h, :40) por día. "Leídas" cuenta las presentaciones que entraron por
				primera vez ese día; "vinculadas", las que ese día encontraron su movimiento. Duración: lectura completa / recálculo.
			</Typography>
		</TableContainer>
	);
};

const TablaCredenciales = ({ e }: { e: EstadoActosLetrado }) => (
	<TableContainer>
		<Table size="small">
			<TableHead>
				<TableRow>
					<TableCell>Cuenta</TableCell>
					<TableCell>Última lectura</TableCell>
					<TableCell align="right">Leídas / nuevas</TableCell>
					<TableCell>Estado</TableCell>
					<TableCell align="right">Presentaciones</TableCell>
					<TableCell align="right">Carpetas activas</TableCell>
					<TableCell align="center">Widget</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{e.credenciales.map((c) => {
					const al = c.actosLast;
					const conError = al && (al.ok === false || (al.errores && Object.keys(al.errores).length > 0));
					return (
						<TableRow key={c.credentialsId} hover>
							<TableCell>
								<Typography variant="body2">{c.email || c.credentialsId}</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
									…{String(c.credentialsId).slice(-6)} · {c.perfil || "perfil ?"}
								</Typography>
							</TableCell>
							<TableCell sx={{ whiteSpace: "nowrap" }}>
								<Tooltip title={fechaHora(c.lastRunAt)}>
									<span>{hace(c.lastRunAt)}</span>
								</Tooltip>
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								{al ? `${fmt(al.total)} / ${fmt(al.nuevos)}` : "—"}
							</TableCell>
							<TableCell>
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
									{c.excludedUntil ? (
										<Chip size="small" label={`excluida (${c.excludedReason || "?"})`} />
									) : conError ? (
										<Tooltip title={JSON.stringify(al?.errores || {})}>
											<Chip size="small" color="warning" label="lectura con errores" />
										</Tooltip>
									) : (
										<Chip size="small" color="success" variant="outlined" label="ok" />
									)}
									{c.consecutiveErrors > 0 && <Chip size="small" color="error" label={`${c.consecutiveErrors} fallas (${c.lastError?.code})`} />}
									{!c.actosBackfillAt && !c.excludedUntil && <Chip size="small" color="info" variant="outlined" label="sin histórico" />}
								</Stack>
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								<Tooltip title={c.ultimoActo ? `última: ${fechaHora(c.ultimoActo)}` : ""}>
									<span>{fmt(c.actos)}</span>
								</Tooltip>
							</TableCell>
							<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
								<Tooltip title={`${c.carpetas.conFecha} con contador · ${c.carpetas.soloSinConfirmar} solo sin proveer`}>
									<span>
										{fmt(c.carpetas.conFecha)} / {fmt(c.carpetas.activas)}
									</span>
								</Tooltip>
							</TableCell>
							<TableCell align="center">
								<Chip size="small" variant="outlined" color={c.widgetVisible ? "success" : "default"} label={c.widgetVisible ? "sí" : "no"} />
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	</TableContainer>
);

const ListaAlertas = ({ alertas }: { alertas: Alerta[] }) =>
	alertas.length === 0 ? (
		<Alert severity="success">Sin alertas: las corridas esperadas se cumplieron y ninguna credencial tiene errores.</Alert>
	) : (
		<Stack spacing={1}>
			{alertas.map((a, i) => (
				<Alert key={`${a.codigo}-${i}`} severity={NIVEL_COLOR[a.nivel]} sx={{ py: 0.25 }}>
					{a.texto}
				</Alert>
			))}
		</Stack>
	);

const EstadoContent = ({ e, dias, setDias, recargar, cargando }: { e: EstadoActosLetrado | null; dias: number; setDias: (d: number) => void; recargar: () => void; cargando: boolean }) => {
	const theme = useTheme();
	if (!e) return <Skeleton variant="rectangular" height={480} sx={{ borderRadius: 2 }} />;

	const general = estadoGeneral(e);
	const cerrados = e.porDia.filter((d) => !d.parcial);
	const sum = (f: (d: CorridaDia) => number) => e.porDia.reduce((a, d) => a + f(d), 0);
	const lect = { hechas: sum((d) => d.lectura.corridas), esperadas: sum((d) => d.lectura.esperadas) };
	const rec = { hechas: sum((d) => d.recalculo.corridas), esperadas: sum((d) => d.recalculo.esperadas) };
	const diasCompletos = cerrados.filter((d) => d.lectura.corridas >= d.lectura.esperadas && d.recalculo.corridas >= d.recalculo.esperadas).length;
	const leidas = sum((d) => d.leidos.escrito + d.leidos.cedula + d.leidos.deox);
	const vinculadas = sum((d) => d.vinculados.escrito + d.vinculados.cedula + d.vinculados.deox);
	const esc = e.totales.escrito;

	return (
		<Stack spacing={2.5}>
			<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<Chip color={general.color} label={general.texto} />
					<Typography variant="body2" color="text.secondary">
						Última lectura {hace(e.ultima.lectura?.fin)} · último recálculo {hace(e.ultima.recalculo?.fin)}
					</Typography>
					{!e.config.lecturaActos && <Chip size="small" color="error" label="lectura de actos apagada" />}
				</Stack>
				<Stack direction="row" spacing={1} alignItems="center">
					<ToggleButtonGroup size="small" exclusive value={dias} onChange={(_, v) => v && setDias(v)} aria-label="Días del relevamiento">
						{[7, 14, 30].map((d) => (
							<ToggleButton key={d} value={d} sx={{ px: 1.5, textTransform: "none" }}>
								{d} días
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Button size="small" variant="outlined" startIcon={<Refresh size={16} />} onClick={recargar} disabled={cargando}>
						Actualizar
					</Button>
				</Stack>
			</Stack>
			{cargando && <LinearProgress />}

			<Grid container spacing={2}>
				<Grid item xs={6} md={3}>
					<Kpi
						titulo={`Corridas · ${e.dias} días`}
						valor={
							<>
								<Cumplimiento hechas={lect.hechas} esperadas={lect.esperadas} />
								<Typography component="span" variant="body2" color="text.secondary" sx={{ mx: 1 }}>
									·
								</Typography>
								<Cumplimiento hechas={rec.hechas} esperadas={rec.esperadas} />
							</>
						}
						detalle={`lecturas · recálculos — ${diasCompletos} de ${cerrados.length} días completos`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Kpi titulo="Presentaciones" valor={fmt(leidas)} detalle={`leídas en el período · ${fmt(vinculadas)} vinculadas`} />
				</Grid>
				<Grid item xs={6} md={3}>
					<Kpi
						titulo="Demora hasta el movimiento"
						valor={e.demora.mediana != null ? `${e.demora.mediana} d` : "—"}
						detalle={`mediana · p90 ${e.demora.p90 ?? "—"} d (${fmt(e.demora.n)} escritos, 30 días)`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Kpi
						titulo="Cobertura"
						valor={`${e.cobertura.usuariosWidget}/${e.cobertura.usuariosConBandeja}`}
						detalle={`usuarios con widget · ${fmt(e.cobertura.conFecha)} de ${fmt(e.cobertura.activas)} carpetas con contador`}
					/>
				</Grid>
			</Grid>

			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
						Alertas
					</Typography>
					<ListaAlertas alertas={e.alertas} />
				</CardContent>
			</Card>

			<Card variant="outlined">
				<CardContent sx={{ px: 0, pb: 0 }}>
					<Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, mb: 1 }}>
						Relevamiento por día
					</Typography>
					<TablaDias dias={e.porDia} />
				</CardContent>
			</Card>

			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Card variant="outlined" sx={{ height: "100%" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
								Escritos sin movimiento, por antigüedad
							</Typography>
							<Stack spacing={1}>
								{Object.entries(e.pendientes.porEdad).map(([tramo, n]) => (
									<Stack key={tramo} direction="row" spacing={1.5} alignItems="center">
										<Typography variant="body2" sx={{ width: 72 }}>
											{tramo} días
										</Typography>
										<Box sx={{ flex: 1 }}>
											<Barra valor={n} max={Math.max(1, ...Object.values(e.pendientes.porEdad))} color={tramo === ">200" ? theme.palette.text.disabled : theme.palette.warning.main} />
										</Box>
									</Stack>
								))}
							</Stack>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
								Los recientes son lo normal (el juzgado todavía no los proveyó). De los de más de 200 días, {fmt(e.pendientes.sinAceptacionViejos)} siguen
								"enviados" sin aceptación del juzgado y ya no se reintentan.
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} md={6}>
					<Card variant="outlined" sx={{ height: "100%" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
								Base de presentaciones
							</Typography>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell />
										<TableCell align="right">Total</TableCell>
										<TableCell align="right">Vinculadas</TableCell>
										<TableCell align="right">Pendientes</TableCell>
										<TableCell align="right">Sin causa</TableCell>
										<TableCell align="right">Inválidas</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{(["escrito", "cedula", "deox"] as const).map((t) => {
										const x = e.totales[t];
										if (!x) return null;
										return (
											<TableRow key={t}>
												<TableCell>{t === "escrito" ? "Escritos" : t === "cedula" ? "Cédulas" : "DEOX"}</TableCell>
												<TableCell align="right">{fmt(x.total)}</TableCell>
												<TableCell align="right">{fmt(x.matcheado)}</TableCell>
												<TableCell align="right">{fmt(x.pendiente)}</TableCell>
												<TableCell align="right">{fmt(x.sin_causa)}</TableCell>
												<TableCell align="right">{fmt(x.invalidos)}</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
							{esc && (
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
									{Math.round((esc.matcheado / Math.max(1, esc.total - esc.invalidos - esc.sin_causa)) * 100)} % de los escritos válidos de
									causas que tenemos ya está vinculado a su movimiento.
								</Typography>
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			<Card variant="outlined">
				<CardContent sx={{ px: 0, pb: 0 }}>
					<Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, mb: 1 }}>
						Credenciales con bandeja ({e.credenciales.length})
					</Typography>
					<TablaCredenciales e={e} />
				</CardContent>
			</Card>

			<Card variant="outlined">
				<CardContent sx={{ px: 0, pb: 0 }}>
					<Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, mb: 1 }}>
						Últimas corridas
					</Typography>
					<TableContainer sx={{ maxHeight: 360 }}>
						<Table size="small" stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell>Fin</TableCell>
									<TableCell>Proceso</TableCell>
									<TableCell align="right">Duración</TableCell>
									<TableCell>Resultado</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{e.corridas.map((r) => (
									<TableRow key={r._id} hover>
										<TableCell sx={{ whiteSpace: "nowrap" }}>{fechaHora(r.fin)}</TableCell>
										<TableCell>
											{r.proceso === "lectura" ? "Lectura de bandeja" : "Recálculo"}
											{r.manual && <Chip size="small" label="manual" sx={{ ml: 1, height: 18 }} />}
											{r.backfillLogs && (
												<Tooltip title="Reconstruida desde los logs de PM2">
													<Chip size="small" variant="outlined" label="log" sx={{ ml: 1, height: 18 }} />
												</Tooltip>
											)}
										</TableCell>
										<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{r.proceso === "lectura" ? `${(r.ms / 60000).toFixed(1)} min` : `${(r.ms / 1000).toFixed(1)} s`}
										</TableCell>
										<TableCell>
											<Typography variant="body2" color={r.ok === false || (r.errores || 0) > 0 || (r.actos?.fallidas || 0) > 0 ? "error" : "text.primary"}>
												{r.ok === false
													? `falló: ${r.error || "sin detalle"}`
													: r.proceso === "lectura"
													? `${r.procesadas} credenciales · ${r.errores || 0} con error · ${r.actos ? `${fmt(r.actos.nuevos)} presentaciones nuevas` : "actos apagados"}`
													: `${fmt(r.revisados)} revisadas · ${fmt(r.nuevosMatch)} vinculadas · ${fmt(r.choques)} choques · ${fmt(r.carpetasCambiadas)} carpetas cambiadas`}
											</Typography>
										</TableCell>
									</TableRow>
								))}
								{e.corridas.length === 0 && (
									<TableRow>
										<TableCell colSpan={4}>
											<Typography variant="body2" color="text.secondary">
												Todavía no hay corridas registradas en pjn-actos-letrado-runs.
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>
		</Stack>
	);
};

// ── Pestaña Bugs y pendientes ─────────────────────────────────────────────

const TIPO_LABEL: Record<ItemSeguimiento["tipo"], string> = { bug: "Bug", limitacion: "Limitación", pendiente: "Pendiente" };
const ESTADO_CHIP: Record<ItemSeguimiento["estado"], { label: string; color: "error" | "warning" | "success" | "default" | "info" }> = {
	abierto: { label: "abierto", color: "warning" },
	en_curso: { label: "en curso", color: "info" },
	resuelto: { label: "resuelto", color: "success" },
	decidido: { label: "decidido", color: "default" },
};

const PendientesContent = ({ e }: { e: EstadoActosLetrado | null }) => {
	const orden: ItemSeguimiento["estado"][] = ["en_curso", "abierto", "decidido", "resuelto"];
	const items = [...ITEMS_PRESENTACIONES].sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado));
	const grupos: ItemSeguimiento["tipo"][] = ["bug", "pendiente", "limitacion"];
	return (
		<Stack spacing={2.5}>
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
						Alertas en vivo
					</Typography>
					{e ? <ListaAlertas alertas={e.alertas} /> : <Skeleton height={60} />}
				</CardContent>
			</Card>
			{grupos.map((g) => {
				const lista = items.filter((i) => i.tipo === g);
				if (!lista.length) return null;
				return (
					<Card key={g} variant="outlined">
						<CardContent>
							<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
								{g === "bug" ? "Bugs" : g === "pendiente" ? "Trabajos pendientes" : "Limitaciones conocidas"}
							</Typography>
							<Stack spacing={1.5}>
								{lista.map((i) => (
									<Box key={i.titulo} sx={{ opacity: i.estado === "resuelto" ? 0.7 : 1 }}>
										<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
											<Typography variant="body2" fontWeight={600}>
												{i.titulo}
											</Typography>
											<Chip size="small" color={ESTADO_CHIP[i.estado].color} label={ESTADO_CHIP[i.estado].label} sx={{ height: 20 }} />
											<Typography variant="caption" color="text.secondary">
												{TIPO_LABEL[i.tipo]} · {i.fecha}
											</Typography>
										</Stack>
										<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
											{i.detalle}
										</Typography>
										{i.referencia && (
											<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
												{i.referencia}
											</Typography>
										)}
									</Box>
								))}
							</Stack>
						</CardContent>
					</Card>
				);
			})}
			<Typography variant="caption" color="text.secondary">
				Lista curada en <code>src/pages/admin/causas/workers/presentacionesLetradoPendientes.ts</code>; las alertas en vivo salen de{" "}
				<code>/api/actos-letrado/estado</code>.
			</Typography>
		</Stack>
	);
};

// ── Página ────────────────────────────────────────────────────────────────

const PresentacionesLetradoWorker = () => {
	const [activeTab, setActiveTab] = useTabIndexParam("tab", SUB_TABS);
	const [dias, setDias] = useState(14);
	const [estado, setEstado] = useState<EstadoActosLetrado | null>(null);
	const [cargando, setCargando] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const cargar = useCallback(
		(fresh = false) => {
			setCargando(true);
			setError(null);
			ActosLetradoService.getEstado(dias, fresh)
				.then(setEstado)
				.catch((e) => setError(e?.response?.data?.message || e?.message || "No se pudo leer el estado"))
				.finally(() => setCargando(false));
		},
		[dias]
	);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const abiertos = useMemo(() => ITEMS_PRESENTACIONES.filter((i) => i.estado === "abierto" || i.estado === "en_curso").length, []);
	const tabs = useMemo(
		() => TAB_DEFS.map((t, i) => (i === 1 ? { ...t, label: `Bugs y pendientes (${abiertos})` } : t)),
		[abiertos]
	);

	return (
		<Stack spacing={2}>
			<Alert severity="info" variant="outlined">
				<Typography variant="body2">
					Escritos, cédulas y DEOX que el letrado presentó con su credencial PJN, vinculados al movimiento del expediente que los registra. La
					lectura corre dentro de <code>pjn-bandeja-sync</code> y el cruce en <code>pjn-actos-letrado</code> (worker-cloud-01).
				</Typography>
			</Alert>
			<WorkerSubTabs value={activeTab} onChange={setActiveTab} tabs={tabs} aria-label="Secciones de presentaciones del letrado" />
			{error && <Alert severity="error">{error}</Alert>}
			<Box>
				{activeTab === 0 && <EstadoContent e={estado} dias={dias} setDias={setDias} recargar={() => cargar(true)} cargando={cargando} />}
				{activeTab === 1 && <PendientesContent e={estado} />}
				{activeTab === 2 && <PresentacionesLetradoFlow />}
			</Box>
		</Stack>
	);
};

export default PresentacionesLetradoWorker;
