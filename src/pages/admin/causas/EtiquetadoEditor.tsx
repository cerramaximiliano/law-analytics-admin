import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	Box,
	Card,
	Typography,
	Chip,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
	TextField,
	Button,
	ToggleButton,
	ToggleButtonGroup,
	Switch,
	FormControlLabel,
	Select,
	MenuItem,
	Divider,
	useTheme,
	alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { ArrowLeft, DocumentText, DocumentDownload, TickCircle, Trash, Warning2 } from "iconsax-react";
import EtapaAnotacionesService, {
	AnotacionMovimiento,
	CausaParaAnotar,
	CuerpoOnDemand,
	Decision,
	EstadoAnotacion,
} from "api/etapaAnotaciones";
import { BRAND_BLUE } from "themes/dashboardTokens";
import Autocomplete from "@mui/material/Autocomplete";
import {
	ACCIONES_REQUERIDAS,
	ACTOS_PROCESALES,
	ACTO_AUTOFILL,
	DESTINATARIOS,
	DIM_CHIP_COLOR,
	DIM_LABELS,
	DIMENSIONES_ORDEN,
	DimKey,
	ETIQUETAS_FINALES,
} from "./etiquetadoTaxonomia";

// Movimientos con pinta de resolución (se resaltan en la lista)
const RE_RESOLUCION = /SENTENCIA|RESOLUCION|RESUELVE|FALLO|HOMOLOG|INTERLOCUTOR|DECLARATORIA|DESIERTO|CADUCIDAD|INCOMPETENCIA|ARCHIV/i;
// Documento de organismo: con URL, excluyendo escritos de parte y notificaciones
// (mismo criterio que el pipeline de corpus). El filtro por defecto muestra
// SOLO estos — el paradigma v2 anota resoluciones, no títulos.
const RE_PARTE = /^ESCRITO/i;
const RE_NOTIF = /tipoDoc=(cedula|deo)\b|^CEDULA|^DEO$|^RETORNO CEDULA/i;
const esDocOrganismo = (m: { url: string | null; tipo: string }) =>
	!!m.url && !RE_PARTE.test(m.tipo) && !RE_NOTIF.test(m.url) && !RE_NOTIF.test(m.tipo);

// Heurística de instancia por metadatos/encabezado (sugerencia, no inferencia
// del texto): "LA SALA"/"EL TRIBUNAL" en el encabezado del cuerpo → segunda.
const RE_ORGANO_SEGUNDA = /\b(LA\s+SALA|EL\s+TRIBUNAL|ESTA\s+SALA|CAMARA\s+NACIONAL|C[ÁA]MARA\s+FEDERAL)\b/i;

// Tabs de la barra de modo: las 6 dimensiones principales + Modo term. y Firmeza.
const MODOS_BARRA: (DimKey | "actoProcesal" | "decisiones" | "cargas")[] = [
	"actoProcesal",
	...DIMENSIONES_ORDEN,
	"modoTerminacion",
	"estadoImpugnatorio",
	"decisiones",
	"cargas",
];

// Semáforo de dimensiones en la lista: un cuadradito por campo, en el mismo
// orden y color que el panel derecho — apagado si no está marcado.
const DIMS_CUADROS: [DimKey | "actoProcesal", string][] = [
	["actoProcesal", "Acto"],
	["tipoResolucion", "Tipo"],
	["instancia", "Instancia"],
	["materia", "Materia"],
	["contexto", "Contexto"],
	["funcion", "Función"],
	["modoTerminacion", "Modo term."],
	["estadoImpugnatorio", "Firmeza"],
	["resultado", "Resultado"],
];

const ESTADO_COLOR: Record<EstadoAnotacion, "default" | "warning" | "info" | "success" | "error"> = {
	pendiente: "default",
	en_progreso: "warning",
	anotada: "info",
	verificada: "success",
	descartada: "error",
};

const EtiquetadoEditor = () => {
	const { fuero, id } = useParams<{ fuero: string; id: string }>();
	const navigate = useNavigate();
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	const [data, setData] = useState<CausaParaAnotar | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [anotaciones, setAnotaciones] = useState<Record<string, AnotacionMovimiento>>({});
	const [dirty, setDirty] = useState<Set<string>>(new Set());
	const [seleccionado, setSeleccionado] = useState<number | null>(null);
	const [soloRelevantes, setSoloRelevantes] = useState(true);
	const [notasCausa, setNotasCausa] = useState("");
	const [estado, setEstado] = useState<EstadoAnotacion>("pendiente");
	const [guardando, setGuardando] = useState(false);
	// Modo de anotación: "libre" (todas las dimensiones) o una dimensión foco
	const [modo, setModo] = useState<"libre" | DimKey | "actoProcesal" | "decisiones" | "cargas">("libre");
	// Cuerpos traídos bajo demanda, por idx de movimiento
	const [cuerposOnDemand, setCuerposOnDemand] = useState<Record<number, CuerpoOnDemand>>({});
	const [trayendoCuerpo, setTrayendoCuerpo] = useState(false);
	// Vinculación de réplicas: idx del movimiento ORIGINAL en espera del click destino
	const [vinculando, setVinculando] = useState<number | null>(null);
	const listaRef = useRef<HTMLDivElement | null>(null);

	const cargar = useCallback(async () => {
		if (!fuero || !id) return;
		setLoading(true);
		setError(null);
		try {
			await EtapaAnotacionesService.agregarACola(fuero, id).catch(() => {});
			const d = await EtapaAnotacionesService.getCausa(fuero, id);
			setData(d);
			setAnotaciones((d.anotacion?.anotaciones as Record<string, AnotacionMovimiento>) || {});
			setNotasCausa(d.anotacion?.notasCausa || "");
			setEstado((d.anotacion?.estado as EstadoAnotacion) || "pendiente");
			// Arranca en el primer documento de organismo (lo que se anota en v2)
			const primero = [...d.movimientos]
				.filter((m) => esDocOrganismo(m))
				.sort((a, b) => (a.dia || "").localeCompare(b.dia || ""))[0];
			setSeleccionado(primero ? primero.idx : d.movimientos.length ? d.movimientos[0].idx : null);
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message);
		} finally {
			setLoading(false);
		}
	}, [fuero, id]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const movimientosVisibles = useMemo(() => {
		if (!data) return [];
		const ms = [...data.movimientos].sort((a, b) => (a.dia || "").localeCompare(b.dia || "") || a.idx - b.idx);
		// Filtro por defecto: solo documentos de organismo (+ los ya anotados).
		// Con el switch apagado ("ruido") se muestra absolutamente todo.
		return soloRelevantes
			? ms.filter((m) => esDocOrganismo(m) || (anotaciones[String(m.idx)] && Object.keys(anotaciones[String(m.idx)]).length))
			: ms;
	}, [data, soloRelevantes, anotaciones]);

	// Dimensiones completas: todos los documentos de organismo de la causa
	// tienen el campo marcado (o el movimiento está descartado) → tilde verde
	// en el tab del modo.
	const dimsCompletas = useMemo(() => {
		const completas = new Set<string>();
		if (!data) return completas;
		const organismo = data.movimientos.filter((m) => esDocOrganismo(m));
		if (!organismo.length) return completas;
		for (const dim of DIMENSIONES_ORDEN) {
			const ok = organismo.every((m) => {
				const a = anotaciones[String(m.idx)];
				return a && ((a as any)[dim] || a.descartar);
			});
			if (ok) completas.add(dim);
		}
		// Acto procesal: completo cuando todos los docs de organismo lo tienen.
		if (organismo.every((m) => {
			const a = anotaciones[String(m.idx)];
			return a && (a.actoProcesal || a.descartar);
		})) {
			completas.add("actoProcesal");
		}
		// Modo de terminación: solo exigible en los docs con Función = terminación.
		const conTerminacion = organismo.filter((m) => anotaciones[String(m.idx)]?.funcion === "terminacion");
		if (conTerminacion.length && conTerminacion.every((m) => anotaciones[String(m.idx)]?.modoTerminacion)) {
			completas.add("modoTerminacion");
		}
		// Firmeza: por convención queda vacía (la deriva el motor) — sin tilde.
		return completas;
	}, [data, anotaciones]);

	const cuerpoDe = useCallback(
		(idx: number) => {
			if (cuerposOnDemand[idx]) return { ...cuerposOnDemand[idx], detalle: "", dia: null };
			if (!data) return null;
			const m = data.movimientos.find((x) => x.idx === idx);
			if (!m) return null;
			return (
				data.cuerpos.find((c) => c.dia === m.dia && c.detalle === m.detalle) ||
				data.cuerpos.find((c) => c.dia === m.dia) ||
				null
			);
		},
		[data, cuerposOnDemand],
	);

	const marcarDirty = (k: string) => setDirty((prev) => new Set(prev).add(k));

	// Número de posición en la lista visible (el que ve el usuario). Fallback: #idx.
	const numeroVisible = (idx: number): string => {
		const i = movimientosVisibles.findIndex((m) => m.idx === idx);
		return i >= 0 ? String(i + 1) : `#${idx}`;
	};
	// Originales que tienen réplicas apuntándoles (para el indicador ⇄).
	const replicasDe = useMemo(() => {
		const mapa = new Map<number, number[]>();
		for (const [k, a] of Object.entries(anotaciones)) {
			if (a?.replicaDe !== null && a?.replicaDe !== undefined) {
				const arr = mapa.get(a.replicaDe) || [];
				arr.push(parseInt(k, 10));
				mapa.set(a.replicaDe, arr);
			}
		}
		return mapa;
	}, [anotaciones]);

	// Funciones sin resultado propio: el resultado se auto-setea a "no_aplica".
	const FUNCIONES_SIN_RESULTADO = ["impulso", "ordenacion", "suspension", "reanudacion"];
	const estadoResultado = (a: AnotacionMovimiento): "sin_funcion" | "auto_no_aplica" | "habilitado" => {
		if (!a.funcion) return "sin_funcion";
		if (FUNCIONES_SIN_RESULTADO.includes(a.funcion)) return "auto_no_aplica";
		return "habilitado";
	};

	const setDim = useCallback(
		(idx: number, dim: DimKey, valor: string, avanzar = false) => {
			const k = String(idx);
			setAnotaciones((prev) => {
				const actual = { ...(prev[k] || {}) };
				(actual as any)[dim] = (actual as any)[dim] === valor ? null : valor;
				// Consistencia Función → Resultado (validación pedida 2026-07-31):
				// impulso/ordenación/suspensión/reanudación fijan resultado="no_aplica";
				// decisión/terminación limpian el "no_aplica" para forzar elección real.
				if (dim === "funcion") {
					const f = (actual as any).funcion;
					if (f && FUNCIONES_SIN_RESULTADO.includes(f)) actual.resultado = "no_aplica";
					else if (f && actual.resultado === "no_aplica") actual.resultado = null;
				}
				return { ...prev, [k]: actual };
			});
			marcarDirty(k);
			if (avanzar) irA(1, idx);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[movimientosVisibles],
	);

	const setCampo = (idx: number, campo: keyof AnotacionMovimiento, valor: any) => {
		const k = String(idx);
		setAnotaciones((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [campo]: valor } }));
		marcarDirty(k);
	};

	// Acto-primero (modo SUGERENCIA, 2026-07-31): elegir el acto marca SOLO el
	// acto. La combinación típica se muestra como sugerencias visuales (borde
	// punteado ✦) sobre los campos vacíos — se aceptan una por una con click, o
	// todas juntas con "Aplicar sugerencias". Nada se escribe solo.
	const aplicarActo = (idx: number, acto: string | null) => {
		setCampo(idx, "actoProcesal", acto);
	};

	// Sugerencias para el movimiento seleccionado: combinación típica del acto
	// (solo sobre campos vacíos) + instancia sugerida por el encabezado.
	const sugerencias = useMemo((): Partial<Record<string, string>> => {
		if (seleccionado === null) return {};
		const a = anotaciones[String(seleccionado)] || {};
		if (!a.actoProcesal) return {};
		const s: Partial<Record<string, string>> = {};
		const base = ACTO_AUTOFILL[a.actoProcesal] || {};
		for (const [dim, valor] of Object.entries(base)) {
			if (!(a as any)[dim]) s[dim] = valor;
		}
		if (!a.instancia) {
			const cuerpo = cuerpoDe(seleccionado);
			s.instancia = cuerpo && RE_ORGANO_SEGUNDA.test(cuerpo.encabezado || "") ? "segunda_instancia" : "primera_instancia";
		}
		return s;
	}, [seleccionado, anotaciones, cuerpoDe]);

	const aplicarSugerencias = () => {
		if (seleccionado === null || !Object.keys(sugerencias).length) return;
		const k = String(seleccionado);
		setAnotaciones((prev) => {
			const actual = { ...(prev[k] || {}) };
			for (const [dim, valor] of Object.entries(sugerencias)) {
				if (!(actual as any)[dim]) (actual as any)[dim] = valor;
			}
			return { ...prev, [k]: actual };
		});
		marcarDirty(k);
		enqueueSnackbar(`Sugerencias aplicadas: ${Object.keys(sugerencias).map((d) => DIM_LABELS[d as DimKey]?.corto || d).join(", ")}`, {
			variant: "success",
			autoHideDuration: 2500,
		});
	};

	const setDecisiones = (idx: number, decisiones: Decision[]) => {
		setCampo(idx, "decisiones", decisiones);
	};

	const limpiarMovimiento = (idx: number) => {
		const k = String(idx);
		setAnotaciones((prev) => {
			const nuevo = { ...prev };
			delete nuevo[k];
			return nuevo;
		});
		marcarDirty(k);
	};

	// Navegación relativa dentro de la lista visible
	const irA = useCallback(
		(delta: number, desde?: number) => {
			const base = desde !== undefined ? desde : seleccionado;
			if (base === null || !movimientosVisibles.length) return;
			const i = movimientosVisibles.findIndex((m) => m.idx === base);
			const destino = movimientosVisibles[Math.min(Math.max(i + delta, 0), movimientosVisibles.length - 1)];
			if (destino) {
				setSeleccionado(destino.idx);
				// Mantener visible en el scroll
				const el = document.getElementById(`mov-${destino.idx}`);
				if (el && listaRef.current) el.scrollIntoView({ block: "nearest" });
			}
		},
		[seleccionado, movimientosVisibles],
	);

	// Atajos de teclado: ↑/↓ navegan; en modo foco, 1..9 asignan y avanzan; 0 limpia la dimensión
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
			if (e.key === "Escape") {
				setVinculando(null);
				return;
			}
			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				e.preventDefault();
				irA(1);
			} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				e.preventDefault();
				irA(-1);
			} else if (modo !== "libre" && seleccionado !== null && /^[0-9]$/.test(e.key)) {
				e.preventDefault();
				const n = parseInt(e.key, 10);
				if (modo === "actoProcesal" || modo === "decisiones" || modo === "cargas") return; // se cargan con el mouse
				// Validación Función → Resultado / Modo de terminación por teclado
				if (modo === "resultado") {
					const est = estadoResultado(anotaciones[String(seleccionado)] || {});
					if (est === "sin_funcion") return; // el panel muestra el aviso
					if (est === "auto_no_aplica") {
						setDim(seleccionado, "resultado", "no_aplica", true);
						return;
					}
				}
				if (modo === "modoTerminacion" && anotaciones[String(seleccionado)]?.funcion !== "terminacion") {
					irA(1); // no aplica a este movimiento — avanzar
					return;
				}
				if (n === 0) {
					setCampoDim(seleccionado, modo, null);
				} else {
					const opcion = DIM_LABELS[modo].opciones[n - 1];
					if (opcion) setDim(seleccionado, modo, opcion[0], true);
				}
			}
		};
		const setCampoDim = (idx: number, dim: DimKey, valor: null) => {
			const k = String(idx);
			setAnotaciones((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [dim]: valor } }));
			marcarDirty(k);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [modo, seleccionado, irA, setDim, anotaciones]);

	const traerCuerpo = async (idx: number, completo = false) => {
		if (!fuero || !id) return;
		setTrayendoCuerpo(true);
		try {
			const r = await EtapaAnotacionesService.getCuerpo(fuero, id, idx, completo);
			setCuerposOnDemand((prev) => ({ ...prev, [idx]: r.cuerpo }));
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "warning" });
		} finally {
			setTrayendoCuerpo(false);
		}
	};

	const guardar = async (nuevoEstado?: EstadoAnotacion) => {
		if (!fuero || !id) return;
		setGuardando(true);
		try {
			const cambios: Record<string, AnotacionMovimiento | null> = {};
			dirty.forEach((k) => {
				if (/^\d+$/.test(k)) cambios[k] = anotaciones[k] && Object.keys(anotaciones[k]).length ? anotaciones[k] : null;
			});
			await EtapaAnotacionesService.guardar(fuero, id, {
				anotaciones: cambios,
				notasCausa,
				estado: nuevoEstado || estado,
			});
			if (nuevoEstado) setEstado(nuevoEstado);
			setDirty(new Set());
			enqueueSnackbar("Anotaciones guardadas", { variant: "success" });
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const limpiarTodo = async () => {
		if (!fuero || !id) return;
		if (!window.confirm("¿Borrar TODAS las anotaciones de esta causa?")) return;
		setGuardando(true);
		try {
			await EtapaAnotacionesService.guardar(fuero, id, { limpiarTodo: true, estado: "pendiente" });
			setAnotaciones({});
			setDirty(new Set());
			setEstado("pendiente");
			enqueueSnackbar("Anotaciones borradas", { variant: "info" });
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	if (loading)
		return (
			<MainCard title="Etiquetado de dataset">
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			</MainCard>
		);
	if (error || !data)
		return (
			<MainCard title="Etiquetado de dataset">
				<Alert severity="error">{error || "Sin datos"}</Alert>
			</MainCard>
		);

	const mSel = seleccionado !== null ? data.movimientos.find((m) => m.idx === seleccionado) : null;
	const aSel: AnotacionMovimiento = seleccionado !== null ? anotaciones[String(seleccionado)] || {} : {};
	const cuerpoSel = seleccionado !== null ? cuerpoDe(seleccionado) : null;
	const anotadosCount = Object.keys(anotaciones).filter((k) => Object.keys(anotaciones[k] || {}).length).length;

	return (
		<MainCard
			title={
				<Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
					<IconButton size="small" onClick={() => navigate("/admin/causas/etiquetado")}>
						<ArrowLeft size={18} />
					</IconButton>
					<Typography variant="h5">
						{data.causa.fuero} {data.causa.number}/{data.causa.year}
					</Typography>
					<Chip size="small" label={estado} color={ESTADO_COLOR[estado]} />
					<Chip size="small" variant="outlined" label={`${anotadosCount} anotados`} />
					{data.causa.familia && <Chip size="small" variant="outlined" label={`familia: ${data.causa.familia}`} />}
					{!data.cuerposDisponibles && (
						<Tooltip title="Sin conexión a Atlas — cuerpos capturados no disponibles (la descarga directa sigue funcionando)">
							<Warning2 size={18} color={theme.palette.warning.main} />
						</Tooltip>
					)}
				</Stack>
			}
			secondary={
				<Stack direction="row" spacing={1}>
					<Tooltip title="Borrar todas las anotaciones de la causa">
						<span>
							<IconButton size="small" color="error" disabled={guardando} onClick={limpiarTodo}>
								<Trash size={18} />
							</IconButton>
						</span>
					</Tooltip>
					<Button size="small" variant="outlined" disabled={guardando || dirty.size === 0} onClick={() => guardar()}>
						Guardar {dirty.size > 0 ? `(${dirty.size})` : ""}
					</Button>
					<Button
						size="small"
						variant="contained"
						color="success"
						startIcon={<TickCircle size={16} />}
						disabled={guardando}
						onClick={() => guardar("anotada")}
					>
						Guardar y marcar anotada
					</Button>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
				{data.causa.caratula}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{data.causa.objeto} · Juz. {data.causa.juzgado ?? "—"}
				{data.causa.sala ? ` · Sala ${data.causa.sala}` : ""} · {data.movimientos.length} movimientos · {data.cuerpos.length}{" "}
				cuerpos capturados
			</Typography>

			{/* ── Modo de anotación (foco por dimensión, con atajos) ── */}
			<Card variant="outlined" sx={{ p: 1, mt: 1.5, mb: 1.5, bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.03) }}>
				<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
					<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
						Modo
					</Typography>
					<ToggleButtonGroup size="small" exclusive value={modo} onChange={(_e, v) => v && setModo(v)}>
						<ToggleButton value="libre" sx={{ py: 0.25, px: 1.25, textTransform: "none", fontSize: "0.74rem" }}>
							Libre
						</ToggleButton>
						{MODOS_BARRA.map((d) => (
							<ToggleButton key={d} value={d} sx={{ py: 0.25, px: 1.25, textTransform: "none", fontSize: "0.74rem", gap: 0.4 }}>
								{d === "actoProcesal" ? "Acto" : d === "decisiones" ? "Decisiones" : d === "cargas" ? "Cargas" : DIM_LABELS[d].corto}
								{dimsCompletas.has(d) && <TickCircle size={13} variant="Bold" color={theme.palette.success.main} />}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Typography variant="caption" color="text.secondary">
						{modo === "libre"
							? "↑/↓ navegan movimientos. Elegí una dimensión para anotar en serie con las teclas 1-9 (0 limpia)."
							: modo === "actoProcesal"
							? "Anotando el Acto procesal: elegí el principal y, si hay, los secundarios · ↑/↓ navegan movimientos."
							: modo === "decisiones"
							? "Cargando Decisiones (una por disposición de la parte resolutiva) · ↑/↓ navegan movimientos."
							: modo === "cargas"
							? "Cargando Cargas procesales (destinatario · acción · plazo · apercibimiento) · ↑/↓ navegan movimientos."
							: `Anotando "${DIM_LABELS[modo as DimKey].titulo}": teclas 1-${DIM_LABELS[modo as DimKey].opciones.length} asignan y avanzan · 0 limpia · ↑/↓ navegan.`}
					</Typography>
				</Stack>
			</Card>

			<Grid container spacing={2}>
				{/* ── Columna izquierda: movimientos ── */}
				<Grid item xs={12} md={5} lg={4}>
					<Card variant="outlined" sx={{ p: 1 }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, pb: 0.5 }}>
							<Typography variant="subtitle2">
								Movimientos ({movimientosVisibles.length})
								{vinculando !== null && (
									<Typography component="span" variant="caption" sx={{ ml: 1, color: "info.main", fontWeight: 700 }}>
										→ click en la réplica del movimiento {numeroVisible(vinculando)} (Esc cancela)
									</Typography>
								)}
							</Typography>
							<Tooltip title="Encendido: solo movimientos con documento de organismo (resoluciones). Apagado: todos los movimientos, incluido el ruido.">
								<FormControlLabel
									control={<Switch size="small" checked={soloRelevantes} onChange={(e) => setSoloRelevantes(e.target.checked)} />}
									label={<Typography variant="caption">solo resoluciones</Typography>}
								/>
							</Tooltip>
						</Stack>
						<Box ref={listaRef} sx={{ maxHeight: "64vh", overflowY: "auto" }}>
							{movimientosVisibles.map((m, vi) => {
								const a = anotaciones[String(m.idx)];
								const anotado = !!a && Object.keys(a).length > 0;
								const esEstado = /CAMBIO DE ESTADO/i.test(m.tipo);
								const esResol = !esEstado && RE_RESOLUCION.test(m.detalle);
								const tieneCuerpo = !!cuerpoDe(m.idx);
								const sel = m.idx === seleccionado;
								return (
									<Box
										key={m.idx}
										id={`mov-${m.idx}`}
									onClick={() => {
											if (vinculando !== null && vinculando !== m.idx) {
												// Copia la anotación del original y marca la réplica
												const src = anotaciones[String(vinculando)];
												if (src) {
													const { notas, ...resto } = src;
													setAnotaciones((prev) => ({ ...prev, [String(m.idx)]: { ...resto, replicaDe: vinculando } }));
													marcarDirty(String(m.idx));
													enqueueSnackbar(`Movimiento ${numeroVisible(m.idx)} marcado como réplica del ${numeroVisible(vinculando)} — campos copiados`, { variant: "success" });
												}
												setVinculando(null);
												return;
											}
											if (vinculando === m.idx) {
												setVinculando(null);
												return;
											}
											setSeleccionado(m.idx);
										}}
										sx={{
											px: 1,
											py: 0.6,
											mb: 0.25,
											borderRadius: 1,
											cursor: "pointer",
											borderLeft: `4px solid ${sel ? BRAND_BLUE : anotado ? theme.palette.success.main : "transparent"}`,
											outline: sel ? `1.5px solid ${alpha(BRAND_BLUE, 0.6)}` : "none",
											bgcolor: sel
												? alpha(BRAND_BLUE, isDark ? 0.2 : 0.1)
												: esResol
													? alpha(theme.palette.warning.main, isDark ? 0.1 : 0.06)
													: esEstado
														? alpha(theme.palette.info.main, isDark ? 0.07 : 0.04)
														: "transparent",
											"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.12 : 0.06) },
										}}
									>
										<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
											<Typography
												variant="caption"
												fontWeight={700}
												sx={{ fontVariantNumeric: "tabular-nums", color: sel ? "primary.main" : "text.disabled", minWidth: 22, textAlign: "right" }}
											>
												{vi + 1}
											</Typography>
											<Typography
												variant="caption"
												sx={{ fontVariantNumeric: "tabular-nums", color: "text.secondary", minWidth: 72 }}
											>
												{m.dia}
											</Typography>
											<Chip size="small" variant="outlined" label={m.tipo.slice(0, 16)} sx={{ height: 17, fontSize: "0.6rem" }} />
											{a?.replicaDe !== null && a?.replicaDe !== undefined && (
											<Tooltip title={`Réplica del movimiento ${numeroVisible(a.replicaDe)} — desvinculá desde el panel`}>
												<Chip
													size="small"
													color="info"
													label={`⇄ ${numeroVisible(a.replicaDe)}`}
													sx={{ height: 16, fontSize: "0.6rem" }}
												/>
											</Tooltip>
										)}
										{replicasDe.has(m.idx) && (
											<Tooltip title={`Tiene réplicas: ${replicasDe.get(m.idx)!.map((r) => numeroVisible(r)).join(", ")}`}>
												<Chip size="small" variant="outlined" color="info" label="⇄" sx={{ height: 16, fontSize: "0.6rem" }} />
											</Tooltip>
										)}
										{m.etiquetaDebil && (
												<Tooltip title="Etiqueta débil del motor (v17) — informativa, no es tu anotación">
													<Chip
														size="small"
														variant="outlined"
														color="info"
														label={`⚙ ${m.etiquetaDebil}`}
														sx={{ height: 17, fontSize: "0.6rem" }}
													/>
												</Tooltip>
											)}
											{m.url &&
												(() => {
													// Punto discreto de estado del documento: relleno verde = texto
													// disponible; anillo verde = solo PDF; ámbar = OCR pendiente;
													// anillo gris = sin espejar aún.
													const ocr = m.corpus?.texto === "needs_ocr";
													const conTexto = m.corpus?.texto === "extracted" || m.corpus?.texto === "ocr_done" || tieneCuerpo;
													const conPdf = m.corpus?.pdf === "downloaded";
													const col = ocr
														? theme.palette.warning.main
														: conTexto || conPdf
															? theme.palette.success.main
															: theme.palette.text.disabled;
													const titulo = ocr
														? "PDF escaneado — en cola de OCR"
														: conTexto
															? "Texto disponible"
															: conPdf
																? "PDF en S3 (sin texto aún)"
																: "Documento sin espejar aún";
													return (
														<Tooltip title={titulo}>
															<Box
																sx={{
																	width: 7,
																	height: 7,
																	borderRadius: "50%",
																	flex: "none",
																	bgcolor: conTexto || ocr ? col : "transparent",
																	border: `1.5px solid ${col}`,
																}}
															/>
														</Tooltip>
													);
												})()}
										</Stack>
										<Typography variant="caption" sx={{ display: "block", lineHeight: 1.3, fontWeight: esResol ? 600 : 400 }}>
											{m.detalle.slice(0, 110)}
										</Typography>
										<Stack direction="row" spacing={0.45} alignItems="center" sx={{ mt: 0.35 }}>
											{DIMS_CUADROS.map(([d, nombre]) => {
												const valor = (a as any)?.[d] || null;
												const cName = DIM_CHIP_COLOR[d];
												const col =
													cName && cName !== "default" ? (theme.palette as any)[cName].main : theme.palette.text.secondary;
												const valorLabel = valor
													? (d === "actoProcesal"
															? ACTOS_PROCESALES.find(([v]) => v === valor)?.[1]
															: DIM_LABELS[d as DimKey]?.opciones.find(([v]) => v === valor)?.[1]) || valor
													: "sin marcar";
												return (
													<Tooltip key={d} title={`${nombre}: ${valorLabel}`}>
														<Box
															sx={{
																width: 9,
																height: 9,
																borderRadius: "2px",
																bgcolor: valor ? col : alpha(col, isDark ? 0.14 : 0.12),
																border: `1px solid ${alpha(col, valor ? 1 : 0.35)}`,
															}}
														/>
													</Tooltip>
												);
											})}
											<Tooltip title={`Decisiones: ${a?.decisiones?.length || 0}`}>
												<Box
													sx={{
														width: 9,
														height: 9,
														borderRadius: "2px",
														bgcolor: (a?.decisiones?.length || 0) > 0 ? theme.palette.secondary.main : alpha(theme.palette.secondary.main, isDark ? 0.14 : 0.12),
														border: `1px solid ${alpha(theme.palette.secondary.main, (a?.decisiones?.length || 0) > 0 ? 1 : 0.35)}`,
													}}
												/>
											</Tooltip>
											<Tooltip title={`Cargas procesales: ${a?.cargas?.length || 0}`}>
												<Box
													sx={{
														width: 9,
														height: 9,
														borderRadius: "2px",
														bgcolor: (a?.cargas?.length || 0) > 0 ? theme.palette.info.main : alpha(theme.palette.info.main, isDark ? 0.14 : 0.12),
														border: `1px solid ${alpha(theme.palette.info.main, (a?.cargas?.length || 0) > 0 ? 1 : 0.35)}`,
													}}
												/>
											</Tooltip>
											{a?.descartar && (
												<Tooltip title="Descartado del entrenamiento">
													<Typography variant="caption" sx={{ fontSize: "0.62rem", fontWeight: 700, color: "error.main", lineHeight: 1 }}>
														✕
													</Typography>
												</Tooltip>
											)}
										</Stack>
									</Box>
								);
							})}
						</Box>
					</Card>
				</Grid>

				{/* ── Columna derecha: anotación + cuerpo ── */}
				<Grid item xs={12} md={7} lg={8}>
					{mSel ? (
						<Stack spacing={2}>
							<Card
								variant="outlined"
								sx={{ p: 2, borderLeft: `4px solid ${BRAND_BLUE}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.05 : 0.02) }}
							>
								<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
									<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
										#{mSel.idx} · {mSel.dia} · {mSel.tipo}
									</Typography>
									{mSel.etiquetaDebil && (
										<Tooltip title="Etiqueta débil del motor (informativa)">
											<Chip size="small" variant="outlined" color="info" label={`⚙ ${mSel.etiquetaDebil}`} />
										</Tooltip>
									)}
									<Box sx={{ flex: 1 }} />
									{aSel.replicaDe !== null && aSel.replicaDe !== undefined && (
									<Tooltip title="Quitar el vínculo de réplica (los campos copiados se conservan)">
										<Chip
											size="small"
											color="info"
											label={`⇄ Réplica del ${numeroVisible(aSel.replicaDe)}`}
											onDelete={() => setCampo(mSel.idx, "replicaDe", null)}
											sx={{ height: 20, fontSize: "0.66rem" }}
										/>
									</Tooltip>
								)}
								<Tooltip title={vinculando === mSel.idx ? "Cancelar vinculación" : "Vincular réplica: el próximo click en la lista copia estos campos y marca la réplica"}>
									<span>
										<Button
											size="small"
											variant={vinculando === mSel.idx ? "contained" : "text"}
											color="info"
											disabled={!Object.keys(aSel).length}
											onClick={() => {
												if (vinculando === mSel.idx) setVinculando(null);
												else {
													setVinculando(mSel.idx);
													enqueueSnackbar(`Modo réplica: hacé click en el movimiento que es copia del ${numeroVisible(mSel.idx)} (Esc cancela)`, { variant: "info" });
												}
											}}
											sx={{ py: 0, px: 1, fontSize: "0.68rem", textTransform: "none" }}
										>
											{vinculando === mSel.idx ? "Cancelar vínculo" : "Vincular réplica"}
										</Button>
									</span>
								</Tooltip>
								<Tooltip title="Limpiar anotaciones de este movimiento">
										<span>
											<IconButton
												size="small"
												color="error"
												disabled={!Object.keys(aSel).length}
												onClick={() => limpiarMovimiento(mSel.idx)}
											>
												<Trash size={15} />
											</IconButton>
										</span>
									</Tooltip>
								</Stack>
								<Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, mb: 1.5, lineHeight: 1.35 }}>
									{mSel.detalle}
								</Typography>

								{/* Acto-primero: elegir el acto autocompleta las demás dimensiones (solo vacías) */}
								{(modo === "libre" || modo === "actoProcesal") && (
									<Box sx={{ mb: 1.5 }}>
										<Typography
											variant="caption"
											fontWeight={700}
											sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "primary.main" }}
										>
											Acto procesal (sugiere la combinación típica — nada se escribe solo)
										</Typography>
										<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
											<Autocomplete
												size="small"
												options={ACTOS_PROCESALES.map(([v]) => v)}
												getOptionLabel={(v) => ACTOS_PROCESALES.find(([x]) => x === v)?.[1] || v}
												value={aSel.actoProcesal || null}
												onChange={(_e, v) => aplicarActo(mSel.idx, v)}
												renderInput={(params) => <TextField {...params} placeholder="Buscar acto… (corre traslado, homologa, resuelve fondo…)" />}
												sx={{ flex: 1, maxWidth: 460 }}
											/>
											{Object.keys(sugerencias).length > 0 && (
												<Tooltip title="Acepta todas las sugerencias ✦ de una vez (solo campos vacíos)">
													<Button size="small" variant="outlined" onClick={aplicarSugerencias}>
														Aplicar sugerencias ({Object.keys(sugerencias).length})
													</Button>
												</Tooltip>
											)}
										</Stack>
										{(modo === "libre" || modo === "actoProcesal") && aSel.actoProcesal && (
											<Autocomplete
												multiple
												size="small"
												options={ACTOS_PROCESALES.map(([v]) => v).filter((v) => v !== aSel.actoProcesal)}
												getOptionLabel={(v) => ACTOS_PROCESALES.find(([x]) => x === v)?.[1] || v}
												value={aSel.actosSecundarios || []}
												onChange={(_e, v) => setCampo(mSel.idx, "actosSecundarios", v)}
												renderInput={(params) => (
													<TextField {...params} label="Actos secundarios (opcional)" placeholder="otros actos del mismo documento…" />
												)}
												sx={{ mt: 1, maxWidth: 620 }}
											/>
										)}
									</Box>
								)}
								{(modo === "actoProcesal" || modo === "decisiones" || modo === "cargas"
									? ([] as DimKey[])
									: modo === "libre"
									? ([...DIMENSIONES_ORDEN, ...(aSel.funcion === "terminacion" ? (["modoTerminacion"] as DimKey[]) : []), "estadoImpugnatorio"] as DimKey[])
									: [modo as DimKey]
								).map((dim) => {
									const def = DIM_LABELS[dim];
									const colorTitulo =
										DIM_CHIP_COLOR[dim] && DIM_CHIP_COLOR[dim] !== "default" ? `${DIM_CHIP_COLOR[dim]}.main` : "text.secondary";
									const etiquetaDe = (valor: string) => def.opciones.find(([v]) => v === valor)?.[1] || valor;
									const numeroDe = (valor: string) => def.opciones.findIndex(([v]) => v === valor) + 1;
									// Validación Función → Resultado / Modo de terminación
									const estResultado = dim === "resultado" ? estadoResultado(aSel) : null;
									const modoTermBloqueado = dim === "modoTerminacion" && aSel.funcion !== "terminacion";
									const botonDeshabilitado = (valor: string) =>
										(dim === "resultado" && (estResultado === "sin_funcion" || (estResultado === "auto_no_aplica" && valor !== "no_aplica"))) ||
										modoTermBloqueado;
									const renderBotones = (valores: string[]) => (
										<ToggleButtonGroup size="small" exclusive value={(aSel as any)[dim] || null} sx={{ flexWrap: "wrap" }}>
											{valores.map((valor) => {
												const esSugerido = !(aSel as any)[dim] && (sugerencias as any)[dim] === valor;
												return (
												<ToggleButton
													key={valor}
													value={valor}
													disabled={botonDeshabilitado(valor)}
													onClick={() => setDim(mSel.idx, dim, valor, modo !== "libre")}
													sx={{
														py: modo === "libre" ? 0.25 : 0.75,
														px: modo === "libre" ? 1 : 1.75,
														fontSize: modo === "libre" ? "0.72rem" : "0.85rem",
														textTransform: "none",
														...(esSugerido && {
															border: `1.5px dashed ${theme.palette.warning.main} !important`,
														}),
													}}
												>
													{modo !== "libre" && (
														<Typography
															component="span"
															variant="caption"
															sx={{ mr: 0.6, opacity: 0.55, fontVariantNumeric: "tabular-nums" }}
														>
															{numeroDe(valor)}
														</Typography>
													)}
													{esSugerido && (
														<Typography component="span" variant="caption" sx={{ mr: 0.4, color: "warning.main" }}>
															✦
														</Typography>
													)}
													{etiquetaDe(valor)}
												</ToggleButton>
												);
											})}
										</ToggleButtonGroup>
									);
									return (
										<Box key={dim} sx={{ mb: 1.25 }}>
											<Typography
												variant="caption"
												fontWeight={700}
												sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: colorTitulo }}
											>
												{def.titulo}
											</Typography>
											{dim === "modoTerminacion" && modoTermBloqueado ? (
												<Typography variant="caption" sx={{ display: "block", color: "warning.main", fontStyle: "italic", mb: 0.25 }}>
													Solo aplica cuando <b>Función = terminación</b>.
												</Typography>
											) : dim === "resultado" && estResultado === "sin_funcion" ? (
												<Typography variant="caption" sx={{ display: "block", color: "warning.main", fontStyle: "italic", mb: 0.25 }}>
													Primero marcá <b>Función</b> — el resultado depende de ella.
												</Typography>
											) : dim === "resultado" && estResultado === "auto_no_aplica" ? (
												<Typography variant="caption" sx={{ display: "block", color: "success.main", fontStyle: "italic", mb: 0.25 }}>
													Función = {DIM_LABELS.funcion.opciones.find(([v]) => v === aSel.funcion)?.[1]?.toLowerCase()}: el
													resultado es "No aplica" (automático).
												</Typography>
											) : (
												def.ayuda && (
													<Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontStyle: "italic", mb: 0.25 }}>
														{def.ayuda}
													</Typography>
												)
											)}
											{def.grupos && modo === "libre" ? (
												<Stack spacing={0.5}>
													{def.grupos.map((g) => (
														<Box key={g.titulo}>
															<Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.62rem" }}>
																{g.titulo}
															</Typography>
															<Box>{renderBotones(g.valores)}</Box>
														</Box>
													))}
												</Stack>
											) : (
												<Box>{renderBotones(def.opciones.map(([v]) => v))}</Box>
											)}
										</Box>
									);
								})}

								{/* Decisiones múltiples: una fila por disposición de la parte resolutiva */}
								{modo === "decisiones" && (
									<Box sx={{ mb: 1.25 }}>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
												Decisiones (una por disposición)
											</Typography>
											<Button
												size="small"
												variant="text"
												sx={{ py: 0, minWidth: 0 }}
												onClick={() => setDecisiones(mSel.idx, [...(aSel.decisiones || []), { objetoDecidido: "", resultado: null }])}
											>
												+ agregar
											</Button>
										</Stack>
										<Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontStyle: "italic" }}>
											Opcional — solo para resoluciones con parte dispositiva múltiple ("confirma y modifica costas", "concede apelación
											y deniega REX"). En la mayoría de los documentos queda vacía.
										</Typography>
										{(aSel.decisiones || []).map((dec, di) => (
											<Stack key={di} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
												<TextField
													size="small"
													placeholder="objeto decidido (ej. recurso_apelacion, costas)"
													value={dec.objetoDecidido}
													onChange={(e) => {
														const nuevas = [...(aSel.decisiones || [])];
														nuevas[di] = { ...nuevas[di], objetoDecidido: e.target.value };
														setDecisiones(mSel.idx, nuevas);
													}}
													sx={{ flex: 1, maxWidth: 320 }}
												/>
												<Select
													size="small"
													displayEmpty
													value={dec.resultado || ""}
													onChange={(e) => {
														const nuevas = [...(aSel.decisiones || [])];
														nuevas[di] = { ...nuevas[di], resultado: e.target.value || null };
														setDecisiones(mSel.idx, nuevas);
													}}
													renderValue={(v) =>
														v ? DIM_LABELS.resultado.opciones.find(([x]) => x === v)?.[1] || v : (
															<Typography variant="caption" color="text.secondary">resultado…</Typography>
														)
													}
													sx={{ minWidth: 170 }}
												>
													{DIM_LABELS.resultado.opciones.map(([v, l]) => (
														<MenuItem key={v} value={v}>{l}</MenuItem>
													))}
												</Select>
												<IconButton
													size="small"
													color="error"
													onClick={() => setDecisiones(mSel.idx, (aSel.decisiones || []).filter((_x, i) => i !== di))}
												>
													<Trash size={14} />
												</IconButton>
											</Stack>
										))}
									</Box>
								)}

								{/* Cargas procesales del acto: quién debe hacer qué, plazo y apercibimiento.
								    Un acto puede imponer VARIAS (traslado a la demandada + intimación al
								    letrado en el mismo proveído) — una fila por carga. */}
								{modo === "cargas" && (
									<Box sx={{ mb: 1.25 }}>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
												Cargas procesales (destinatario · acción · plazo · apercibimiento)
											</Typography>
											<Button
												size="small"
												variant="text"
												sx={{ py: 0, minWidth: 0 }}
												onClick={() => setCampo(mSel.idx, "cargas", [...(aSel.cargas || []), { destinatarios: [], accion: null, plazo: null, apercibimiento: "" }])}
											>
												+ agregar carga
											</Button>
										</Stack>
										<Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontStyle: "italic" }}>
											La carga NO repite el acto: el acto clasifica ("este documento intima"), la carga extrae el contenido (a quién, qué,
											plazo, apercibimiento). Opcional y selectivo: completar cuando el acto impone conductas con plazo, una fila por carga.
											En resoluciones largas, cargá las 2-3 de mayor peso — calidad y variedad valen más que exhaustividad.
										</Typography>
										{(aSel.cargas || []).map((carga, ci) => {
											const actualizar = (parche: Partial<typeof carga>) => {
												const nuevas = [...(aSel.cargas || [])];
												nuevas[ci] = { ...nuevas[ci], ...parche };
												setCampo(mSel.idx, "cargas", nuevas);
											};
											return (
												<Grid container spacing={1} key={ci} sx={{ mt: 0.25, pl: 1, borderLeft: "2px solid", borderColor: "divider" }}>
													<Grid item xs={12} sm={4}>
														<Autocomplete
															multiple
															size="small"
															options={DESTINATARIOS.map(([v]) => v)}
															getOptionLabel={(v) => DESTINATARIOS.find(([x]) => x === v)?.[1] || v}
															value={carga.destinatarios}
															onChange={(_e, v) => actualizar({ destinatarios: v })}
															renderInput={(params) => <TextField {...params} label="Destinatario/s" />}
														/>
													</Grid>
													<Grid item xs={12} sm={4}>
														<Autocomplete
															size="small"
															options={ACCIONES_REQUERIDAS.map(([v]) => v)}
															getOptionLabel={(v) => ACCIONES_REQUERIDAS.find(([x]) => x === v)?.[1] || v}
															value={carga.accion}
															onChange={(_e, v) => actualizar({ accion: v })}
															renderInput={(params) => <TextField {...params} label="Acción requerida" />}
														/>
													</Grid>
													<Grid item xs={4} sm={1.3}>
														<TextField
															fullWidth
															size="small"
															type="number"
															label="Plazo"
															value={carga.plazo?.cantidad ?? ""}
															onChange={(e) =>
																actualizar({
																	plazo: e.target.value === ""
																		? null
																		: { cantidad: parseInt(e.target.value, 10), unidad: carga.plazo?.unidad || "dias", tipo: carga.plazo?.tipo || "procesales" },
																})
															}
														/>
													</Grid>
													<Grid item xs={4} sm={1.3}>
														<Select
															fullWidth
															size="small"
															value={carga.plazo?.unidad || "dias"}
															onChange={(e) => carga.plazo && actualizar({ plazo: { ...carga.plazo, unidad: e.target.value as any } })}
														>
															<MenuItem value="dias">días</MenuItem>
															<MenuItem value="horas">horas</MenuItem>
															<MenuItem value="meses">meses</MenuItem>
														</Select>
													</Grid>
													<Grid item xs={4} sm={1.4}>
														<Select
															fullWidth
															size="small"
															value={carga.plazo?.tipo || "procesales"}
															onChange={(e) => carga.plazo && actualizar({ plazo: { ...carga.plazo, tipo: e.target.value as any } })}
														>
															<MenuItem value="procesales">procesales</MenuItem>
															<MenuItem value="corridos">corridos</MenuItem>
														</Select>
													</Grid>
													<Grid item xs={10} sm={5}>
														<TextField
															fullWidth
															size="small"
															label="Apercibimiento"
															value={carga.apercibimiento || ""}
															onChange={(e) => actualizar({ apercibimiento: e.target.value })}
														/>
													</Grid>
													<Grid item xs={2} sm={1}>
														<IconButton
															size="small"
															color="error"
															onClick={() => setCampo(mSel.idx, "cargas", (aSel.cargas || []).filter((_x, i) => i !== ci))}
														>
															<Trash size={14} />
														</IconButton>
													</Grid>
												</Grid>
											);
										})}
									</Box>
								)}

								{modo === "libre" && (
									<Grid container spacing={1.5} sx={{ mt: 0.25 }}>
										<Grid item xs={12} sm={4}>
											<Autocomplete
												size="small"
												options={ETIQUETAS_FINALES.map(([v]) => v)}
												getOptionLabel={(v) => ETIQUETAS_FINALES.find(([x]) => x === v)?.[1] || v}
												value={aSel.etiqueta || null}
												onChange={(_e, v) => setCampo(mSel.idx, "etiqueta", v)}
												renderInput={(params) => (
													<TextField {...params} label="Etiqueta final (etapa/hito)" helperText="Opcional — solo para dejar explícito qué etapa/hito marca este documento" />
												)}
											/>
										</Grid>
										<Grid item xs={6} sm={3}>
											<TextField
												fullWidth
												size="small"
												type="number"
												label="Réplica de #"
												helperText="El # del movimiento ORIGINAL (el número tras '#' en el encabezado de este panel). Anotá completo el primero; en sus copias poné ese #."
												value={aSel.replicaDe ?? ""}
												onChange={(e) =>
													setCampo(mSel.idx, "replicaDe", e.target.value === "" ? null : parseInt(e.target.value, 10))
												}
											/>
										</Grid>
										<Grid item xs={6} sm={2}>
											<FormControlLabel
												control={
													<Switch
														size="small"
														checked={!!aSel.descartar}
														onChange={(e) => setCampo(mSel.idx, "descartar", e.target.checked)}
													/>
												}
												label={<Typography variant="caption">Descartar</Typography>}
											/>
										</Grid>
										<Grid item xs={12} sm={3}>
											<Select
												fullWidth
												size="small"
												displayEmpty
												value=""
												onChange={(e) => {
													const desde = e.target.value as string;
													if (desde !== "") {
														const src = anotaciones[desde];
														if (src) {
															setAnotaciones((prev) => ({ ...prev, [String(mSel.idx)]: { ...src, notas: "" } }));
															marcarDirty(String(mSel.idx));
														}
													}
												}}
												renderValue={() => (
													<Typography variant="caption" color="text.secondary">
														Copiar de…
													</Typography>
												)}
											>
												{Object.keys(anotaciones)
													.filter((k) => k !== String(mSel.idx) && Object.keys(anotaciones[k]).length)
													.map((k) => (
														<MenuItem key={k} value={k}>
															#{k}
														</MenuItem>
													))}
											</Select>
										</Grid>
										<Grid item xs={12}>
											<TextField
												fullWidth
												size="small"
												multiline
												minRows={1}
												label="Notas del movimiento"
												value={aSel.notas || ""}
												onChange={(e) => setCampo(mSel.idx, "notas", e.target.value)}
											/>
										</Grid>
									</Grid>
								)}
							</Card>

							{/* ── Cuerpo del documento ── */}
							{cuerpoSel ? (
								<Card variant="outlined" sx={{ p: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
										<DocumentText size={16} color={theme.palette.success.main} />
										<Typography variant="subtitle2" sx={{ flex: 1 }}>
											Cuerpo · {cuerpoSel.caracteres.toLocaleString("es-AR")} caracteres
											{"detalle" in cuerpoSel && cuerpoSel.detalle && cuerpoSel.detalle !== mSel.detalle
												? ` · doc del mismo día: "${(cuerpoSel as any).detalle.slice(0, 50)}"`
												: ""}
										</Typography>
										{!cuerpoSel.completo && mSel.url && (
											<Button
												size="small"
												variant="text"
												disabled={trayendoCuerpo}
												onClick={() => traerCuerpo(mSel.idx, true)}
											>
												Ver documento completo
											</Button>
										)}
									</Stack>
									{cuerpoSel.completo ? (
										<>
											<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
												Documento completo
											</Typography>
											<Box
												sx={{
													fontFamily: "monospace",
													fontSize: "0.78rem",
													whiteSpace: "pre-wrap",
													bgcolor: alpha(theme.palette.success.main, isDark ? 0.1 : 0.05),
													borderLeft: `3px solid ${theme.palette.success.main}`,
													p: 1.25,
													borderRadius: 1,
													maxHeight: "48vh",
													overflowY: "auto",
												}}
											>
												{cuerpoSel.completo}
											</Box>
										</>
									) : (
										<>
											<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
												{cuerpoSel.tieneDispositiva && (cuerpoSel.encabezado || "").length > 500
													? "Documento (previo a la parte dispositiva)"
													: "Encabezado"}
											</Typography>
											<Box
												sx={{
													fontFamily: "monospace",
													fontSize: "0.74rem",
													whiteSpace: "pre-wrap",
													bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.04),
													p: 1.25,
													borderRadius: 1,
													mb: 1.25,
													maxHeight: "36vh",
													overflowY: "auto",
												}}
											>
												{cuerpoSel.encabezado}
											</Box>
											<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
												{cuerpoSel.tieneDispositiva ? "Parte dispositiva" : "Cuerpo (desde el fin del encabezado)"}
											</Typography>
											<Box
												sx={{
													fontFamily: "monospace",
													fontSize: "0.78rem",
													whiteSpace: "pre-wrap",
													bgcolor: alpha(theme.palette.success.main, isDark ? 0.1 : 0.05),
													borderLeft: `3px solid ${theme.palette.success.main}`,
													p: 1.25,
													borderRadius: 1,
													maxHeight: "48vh",
													overflowY: "auto",
												}}
											>
												{cuerpoSel.tieneDispositiva ? cuerpoSel.dispositiva : cuerpoSel.colaTexto}
											</Box>
										</>
									)}
								</Card>
							) : mSel.url ? (
								<Card variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Button
										variant="outlined"
										size="small"
										startIcon={trayendoCuerpo ? <CircularProgress size={14} /> : <DocumentDownload size={16} />}
										disabled={trayendoCuerpo}
										onClick={() => traerCuerpo(mSel.idx)}
									>
										Traer documento del PJN
									</Button>
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
										El movimiento tiene documento asociado — se descarga del viewer y se segmenta al momento.
									</Typography>
								</Card>
							) : (
								<Alert severity="info" variant="outlined">
									Este movimiento no tiene documento asociado (solo título).
								</Alert>
							)}
						</Stack>
					) : (
						<Alert severity="info">Seleccioná un movimiento de la lista.</Alert>
					)}

					<Card variant="outlined" sx={{ p: 2, mt: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Notas de la causa
						</Typography>
						<TextField
							fullWidth
							size="small"
							multiline
							minRows={2}
							value={notasCausa}
							onChange={(e) => {
								setNotasCausa(e.target.value);
								marcarDirty("__notas__");
							}}
							placeholder="Observaciones generales, criterios aplicados, dudas para verificación…"
						/>
					</Card>
					<Divider sx={{ my: 2 }} />
					<Stack direction="row" spacing={1} justifyContent="flex-end">
						<Button size="small" color="error" variant="text" disabled={guardando} onClick={limpiarTodo}>
							Limpiar todo
						</Button>
						<Button size="small" variant="outlined" disabled={guardando || dirty.size === 0} onClick={() => guardar()}>
							Guardar {dirty.size > 0 ? `(${dirty.size})` : ""}
						</Button>
						<Button size="small" variant="contained" color="success" disabled={guardando} onClick={() => guardar("anotada")}>
							Guardar y marcar anotada
						</Button>
					</Stack>
				</Grid>
			</Grid>
		</MainCard>
	);
};

export default EtiquetadoEditor;
