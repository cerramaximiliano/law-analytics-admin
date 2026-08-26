// Reparto de las causas con credencial vinculada, en tortas: por vía de acceso
// y por quién las actualiza.
//
// Las categorías de cada torta son MUTUAMENTE EXCLUYENTES y suman el universo —
// una torta cuyos gajos no suman el total miente sobre la cobertura, que es
// justamente el dato que se viene a mirar acá. Por eso el panel muestra la
// suma y marca si no cierra en vez de dibujar igual.
//
// Paleta categórica validada (contraste, piso de croma y separación para
// daltonismo, en claro y oscuro). Cada gajo lleva además su valor como etiqueta
// y hay tabla debajo: la identidad nunca depende solo del color.
import React, { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Grid,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	useTheme,
} from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import pjnCredentialsService, { CausaCoverageData } from "api/pjnCredentials";

// Orden FIJO: el color sigue a la categoría, no a su tamaño. Si un gajo cambia
// de tamaño entre corridas no debe cambiar de color.
const PALETA = ["#3A7BFF", "#0E9F8C", "#D97706", "#8B5CF6"];
// Par de estado para el primer corte: verde-azulado = la credencial sirve,
// ámbar = no la actualiza nadie. Sale de la misma paleta validada, así que
// mantiene el contraste y la separación para daltonismo.
const PALETA_ESTADO = ["#0E9F8C", "#D97706"];

interface Gajo {
	name: string;
	value: number;
	desc: string;
}

const CausaCoveragePanel: React.FC = () => {
	const theme = useTheme();
	const [data, setData] = useState<CausaCoverageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const r = await pjnCredentialsService.getCausaCoverage();
			if (r.success) {
				setData(r as unknown as CausaCoverageData);
				setError(null);
			} else setError("No se pudo calcular la cobertura");
		} catch (e: any) {
			setError(e?.message || "Error consultando la cobertura");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	if (loading) {
		return (
			<Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
				<CircularProgress size={18} />
				<Typography variant="body2" color="text.secondary">
					Calculando el reparto de causas…
				</Typography>
			</Stack>
		);
	}
	if (error || !data) return <Alert severity="warning">{error || "Sin datos de cobertura"}</Alert>;

	// Primer corte: ¿la credencial sirve? Una causa vinculada a una credencial
	// deshabilitada o inválida no la actualiza nadie — repartirla por vía de
	// acceso junto al resto sobreestimaba la cobertura.
	const estadoCredencial: Gajo[] = [
		{ name: "Con credencial válida", value: data.porEstadoCredencial.validas, desc: `las actualiza el worker privado (${data.credencialesEnabled} credenciales activas)` },
		{ name: "Sin credencial usable", value: data.porEstadoCredencial.sinCredencialViva, desc: "credencial deshabilitada o inválida: no las actualiza nadie por credencial" },
	].filter((g) => g.value > 0);

	// Segundo corte del universo: ¿sigue en el listado del portal? Una causa que
	// salió (todos sus vínculos con removedFromSync) ya no está en Mis Causas —
	// es distinto de "no tiene credencial": acá la credencial anda, la causa se fue.
	const estadoListado: Gajo[] = [
		{ name: "En el listado", value: data.porEstadoListado.activas, desc: "aparece en Mis Causas de al menos una credencial" },
		{ name: "Salidas del listado", value: data.porEstadoListado.salidas, desc: "todos sus vínculos marcados removedFromSync: el portal ya no la lista" },
	].filter((g) => g.value > 0);

	const via: Gajo[] = [
		{ name: "Por lista", value: data.via.lista, desc: "solo se llega entrando al listado de Mis Causas" },
		{ name: "Por número", value: data.via.numero, desc: "el buscador en sesión las resuelve, sin captcha" },
	];

	const actualizador: Gajo[] = [
		{ name: "Privado · lista", value: data.actualizador["privado-lista"], desc: "worker con credencial, entrando al listado" },
		{ name: "Privado · número", value: data.actualizador["privado-numero"], desc: "worker con credencial, buscador en sesión" },
		{ name: "Privado + público", value: data.actualizador["privado+publico"], desc: "ruteo dual: si el privado se atrasa, las toma el público con captcha" },
	];

	const motivos: Gajo[] = [
		{ name: "Privada", value: data.motivo.privada || 0, desc: "el buscador por número nunca la devuelve" },
		{ name: "Incidente", value: data.motivo.incidente || 0, desc: "el buscador cae en el expediente principal" },
		{ name: "Solo-listado", value: data.motivo["solo-listado"] || 0, desc: "sin prefijo de fuero: no hay número con qué buscarla" },
	].filter((g) => g.value > 0);

	const base = data.porEstadoCredencial.validas;
	// Los porcentajes del reparto son sobre las causas con credencial usable, que
	// es el universo que el worker privado puede recorrer.
	const pct = (n: number) => (base ? Math.round((n / base) * 1000) / 10 : 0);

	const Torta: React.FC<{ titulo: string; sub: string; datos: Gajo[]; total: number; paleta?: string[] }> = ({ titulo, sub, datos, total, paleta = PALETA }) => (
		<Card variant="outlined" sx={{ height: "100%" }}>
			<CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
				<Typography variant="subtitle2" fontWeight="bold">
					{titulo}
				</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
					{sub}
				</Typography>
				<ResponsiveContainer width="100%" height={210}>
					<PieChart>
						<Pie
							data={datos as any[]}
							dataKey="value"
							nameKey="name"
							cx="50%"
							cy="50%"
							outerRadius={72}
							// Valor sobre el gajo: la identidad no depende solo del color.
							label={({ value }) => `${value}`}
							labelLine={false}
							// Separación de 2px entre gajos: el borde del surface los divide
							// sin agregar una línea de más.
							paddingAngle={2}
							stroke={theme.palette.background.paper}
							strokeWidth={2}
						>
							{datos.map((_g, i) => (
								<Cell key={i} fill={paleta[i % paleta.length]} />
							))}
						</Pie>
						<RechartsTooltip
							formatter={(v: any, n: any) => [`${v} causas (${total ? Math.round((Number(v) / total) * 1000) / 10 : 0}%)`, n]}
							contentStyle={{
								backgroundColor: theme.palette.background.paper,
								border: `1px solid ${theme.palette.divider}`,
								borderRadius: 8,
								fontSize: "0.78rem",
							}}
						/>
						<Legend
							verticalAlign="bottom"
							height={30}
							iconType="circle"
							iconSize={9}
							formatter={(v: any) => <span style={{ fontSize: "0.72rem", color: theme.palette.text.secondary }}>{v}</span>}
						/>
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
				<Typography variant="h5">{data.universo.toLocaleString("es-AR")}</Typography>
				<Typography variant="body2" color="text.secondary">
					causas con credencial vinculada, de las cuales
				</Typography>
				<Typography variant="h5" sx={{ color: PALETA_ESTADO[0] }}>
					{base.toLocaleString("es-AR")}
				</Typography>
				<Typography variant="body2" color="text.secondary">
					tienen una credencial que sirve
				</Typography>
				<Chip
					size="small"
					color={data.invariante.cierra ? "success" : "error"}
					label={data.invariante.cierra ? `reparto: ${data.via.lista} + ${data.via.numero} = ${base}` : `NO CIERRA: ${data.invariante.suma} de ${base}`}
					sx={{ fontSize: "0.68rem", fontFamily: "monospace" }}
				/>
			</Stack>

			{!data.invariante.cierra && (
				<Alert severity="error" variant="outlined">
					El reparto no suma las causas con credencial válida: hay {data.invariante.base - data.invariante.suma} causa(s) que no caen en
					ninguna vía. Es un caso sin clasificar, no un problema de conteo.
				</Alert>
			)}

			<Grid container spacing={2}>
				<Grid item xs={12} md={2.4}>
					<Torta
						titulo="En el listado"
						sub={`de las ${data.universo}, cuáles sigue listando el portal`}
						datos={estadoListado}
						total={data.universo}
						paleta={PALETA_ESTADO}
					/>
				</Grid>
				<Grid item xs={12} md={2.4}>
					<Torta
						titulo="Estado de la credencial"
						sub={`las ${data.universo} del universo, según si su credencial sirve`}
						datos={estadoCredencial}
						total={data.universo}
						paleta={PALETA_ESTADO}
					/>
				</Grid>
				<Grid item xs={12} md={2.4}>
					<Torta titulo="Vía de acceso" sub={`de las ${base} con credencial válida`} datos={via} total={base} />
				</Grid>
				<Grid item xs={12} md={2.4}>
					<Torta titulo="Quién la actualiza" sub={`de las ${base} con credencial válida`} datos={actualizador} total={base} />
				</Grid>
				<Grid item xs={12} md={2.4}>
					<Torta titulo="Por qué van por lista" sub={`desglose de las ${data.via.lista} no buscables`} datos={motivos} total={data.via.lista} />
				</Grid>
			</Grid>

			{data.huerfanas.length > 0 && (
				<Card variant="outlined" sx={{ borderColor: PALETA_ESTADO[1] }}>
					<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
						<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
							Las {data.porEstadoCredencial.sinCredencialViva} causas que no actualiza nadie
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
							Su credencial no sirve, así que el worker privado las trae y las descarta al agrupar. El worker público solo alcanza a las
							que además sean buscables por número.
						</Typography>
						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Credencial</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Causas</TableCell>
										<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Por qué no sirve</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.huerfanas.map((h) => (
										<TableRow key={h.credentialId}>
											<TableCell sx={{ fontSize: "0.8rem" }}>{h.email || <code>{h.credentialId.slice(-8)}</code>}</TableCell>
											<TableCell align="right" sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{h.causas}</TableCell>
											<TableCell sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{h.motivo}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Vista de tabla: los mismos números sin depender del color ni del hover. */}
			<Card variant="outlined">
				<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Los mismos números, en tabla
					</Typography>
					<TableContainer sx={{ overflowX: "auto" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Grupo</TableCell>
									<TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Causas</TableCell>
									<TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>% del total</TableCell>
									<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Qué significa</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{actualizador.map((g, i) => (
									<TableRow key={g.name}>
										<TableCell sx={{ fontSize: "0.8rem" }}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PALETA[i % PALETA.length], flexShrink: 0 }} />
												{g.name}
											</Stack>
										</TableCell>
										<TableCell align="right" sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{g.value.toLocaleString("es-AR")}</TableCell>
										<TableCell align="right" sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{pct(g.value)}%</TableCell>
										<TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{g.desc}</TableCell>
									</TableRow>
								))}
								{motivos.map((g, i) => (
									<TableRow key={`m-${g.name}`}>
										<TableCell sx={{ fontSize: "0.8rem", pl: 3 }}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: PALETA[i % PALETA.length], flexShrink: 0 }} />
												<span style={{ color: theme.palette.text.secondary }}>lista → {g.name}</span>
											</Stack>
										</TableCell>
										<TableCell align="right" sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{g.value.toLocaleString("es-AR")}</TableCell>
										<TableCell align="right" sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{pct(g.value)}%</TableCell>
										<TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{g.desc}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
						Los porcentajes de esta tabla son sobre las {base} causas con credencial válida, no sobre el universo. El reparto lo decide{" "}
						<code>viaDeAcceso</code> en private-causas-update, con el mismo criterio que se registra en cada corrida (<code>viaLista</code> /{" "}
						<code>viaNumero</code> / <code>reclasificadas</code>). “Privado + público” es el ruteo dual: esas causas las mantiene frescas el
						worker con credencial y solo caen al público con captcha si el privado se atrasa.
					</Typography>
				</CardContent>
			</Card>
		</Stack>
	);
};

export default CausaCoveragePanel;
