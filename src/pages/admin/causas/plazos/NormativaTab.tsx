import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Paper,
	Skeleton,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { getNormativa, createNormativa, updateNormativa, PlazoNormativaRegla } from "api/plazos";

const EMPTY: Partial<PlazoNormativaRegla> & { _id: string } = {
	_id: "",
	label: "",
	acto: "",
	fuero: ["*"],
	objetos: ["*"] as any,
	matchers: [],
	matchersDetalle: [],
	plazoDias: 5,
	tipoPlazo: "habiles",
	norma: "",
	prioridad: 100,
	habilitado: true,
	verificado: false,
	notas: "",
};

const lines = (arr?: string[]) => (arr || []).join("\n");
const fromLines = (s: string) =>
	s
		.split("\n")
		.map((x) => x.trim())
		.filter(Boolean);

export function ReglaDialog({
	regla,
	esNueva,
	onClose,
	onSaved,
}: {
	regla: (Partial<PlazoNormativaRegla> & { _id: string }) | null;
	esNueva?: boolean;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const isNew = esNueva ?? (!!regla && !regla.label && regla._id === "");
	const [form, setForm] = useState<any>(null);

	useEffect(() => {
		if (regla) {
			setForm({
				...regla,
				fueroStr: (regla.fuero || ["*"]).join(","),
				objetosStr: ((regla as any).objetos || ["*"]).join(","),
				matchersStr: lines(regla.matchers),
				matchersDetalleStr: lines(regla.matchersDetalle),
			});
		}
	}, [regla]);

	if (!regla || !form) return null;

	const save = async () => {
		const payload: any = {
			label: form.label,
			acto: form.acto,
			fuero: form.fueroStr
				.split(",")
				.map((x: string) => x.trim())
				.filter(Boolean),
			objetos: form.objetosStr
				.split(",")
				.map((x: string) => x.trim())
				.filter(Boolean),
			matchers: fromLines(form.matchersStr),
			matchersDetalle: fromLines(form.matchersDetalleStr),
			plazoDias: Number(form.plazoDias),
			tipoPlazo: form.tipoPlazo,
			norma: form.norma,
			prioridad: Number(form.prioridad),
			habilitado: form.habilitado,
			verificado: form.verificado,
			notas: form.notas,
		};
		try {
			if (isNew) await createNormativa({ _id: form._id, ...payload });
			else await updateNormativa(regla._id, payload);
			enqueueSnackbar("Regla guardada (el worker la toma en ≤10 min o al reprocesar)", { variant: "success" });
			onSaved();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error guardando regla", { variant: "error" });
		}
	};

	const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

	return (
		<Dialog open onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>{isNew ? "Nueva regla" : `Editar regla: ${regla._id}`}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 0.5 }}>
					{isNew && <TextField size="small" label="_id (slug snake_case)" value={form._id} onChange={set("_id")} />}
					<TextField size="small" label="Label" value={form.label} onChange={set("label")} />
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						<TextField size="small" label="Acto (slug)" value={form.acto} onChange={set("acto")} sx={{ flex: 1 }} />
						<TextField size="small" label="Fueros (coma, * = todos)" value={form.fueroStr} onChange={set("fueroStr")} sx={{ flex: 1 }} />
						<TextField
							size="small"
							label="Objetos (regex, coma, * = todos)"
							value={form.objetosStr}
							onChange={set("objetosStr")}
							sx={{ flex: 1 }}
						/>
					</Stack>
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						<TextField size="small" type="number" label="Plazo (días)" value={form.plazoDias} onChange={set("plazoDias")} />
						<TextField size="small" select SelectProps={{ native: true }} label="Tipo" value={form.tipoPlazo} onChange={set("tipoPlazo")}>
							<option value="habiles">hábiles</option>
							<option value="corridos">corridos</option>
						</TextField>
						<TextField size="small" type="number" label="Prioridad (menor = antes)" value={form.prioridad} onChange={set("prioridad")} />
					</Stack>
					<TextField size="small" label="Norma (cita legal — obligatoria)" value={form.norma} onChange={set("norma")} />
					<TextField
						size="small"
						label="Matchers sobre TEXTO (una regex por línea, texto normalizado sin tildes en MAYÚSCULAS)"
						value={form.matchersStr}
						onChange={set("matchersStr")}
						multiline
						minRows={3}
					/>
					<TextField
						size="small"
						label="Matchers sobre DETALLE del movimiento (para cédulas sin PDF)"
						value={form.matchersDetalleStr}
						onChange={set("matchersDetalleStr")}
						multiline
						minRows={2}
					/>
					<TextField size="small" label="Notas" value={form.notas} onChange={set("notas")} multiline minRows={2} />
					<Stack direction="row" spacing={3}>
						<Stack direction="row" alignItems="center">
							<Switch checked={form.habilitado} onChange={(e) => setForm({ ...form, habilitado: e.target.checked })} />
							<Typography variant="body2">Habilitada</Typography>
						</Stack>
						<Stack direction="row" alignItems="center">
							<Switch checked={form.verificado} onChange={(e) => setForm({ ...form, verificado: e.target.checked })} />
							<Typography variant="body2">Verificada jurídicamente</Typography>
						</Stack>
					</Stack>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" onClick={save}>
					Guardar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default function NormativaTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<PlazoNormativaRegla[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<(Partial<PlazoNormativaRegla> & { _id: string }) | null>(null);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			setRows(await getNormativa());
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando normativa", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const toggle = async (r: PlazoNormativaRegla, field: "habilitado" | "verificado", value: boolean) => {
		try {
			await updateNormativa(r._id, { [field]: value });
			setRows((prev) => prev.map((x) => (x._id === r._id ? { ...x, [field]: value } : x)));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	return (
		<Stack spacing={2}>
			<Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
				<Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
					¿Quién crea esta tabla?
				</Typography>
				<Typography variant="body2" component="div">
					<b>1) El seed inicial</b> sembró las reglas base (insert-only: re-ejecutarlo nunca pisa tus ediciones).{" "}
					<b>2) El admin — dueño de la tabla —</b> crea, edita, verifica y deshabilita reglas desde esta vista; cada regla exige cita legal
					y el worker toma los cambios en ≤10 minutos, sin deploy. <b>3) El dataset propone</b>: la tab Dataset muestra candidatos con
					evidencia (n, consistencia, normas citadas) y el botón «Crear regla» pre-carga este formulario — pero nunca crea reglas solo.
					Recordá: el plazo expreso del documento siempre manda; estas reglas aplican <i>en subsidio</i>, y el clasificador que se entrene
					con el dataset solo identificará el acto — el plazo lo pone siempre esta tabla.
				</Typography>
			</Alert>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="body2" color="text.secondary">
					First-match-wins por prioridad ascendente. Las reglas específicas (fuero/objeto) deben tener prioridad menor que las genéricas.
				</Typography>
				<Button size="small" variant="contained" onClick={() => setEditing({ ...EMPTY })}>
					Nueva regla
				</Button>
			</Stack>
			<TableContainer component={Paper} elevation={0}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Prior.</TableCell>
							<TableCell>Regla</TableCell>
							<TableCell>Fuero</TableCell>
							<TableCell>Objetos</TableCell>
							<TableCell>Plazo</TableCell>
							<TableCell>Norma</TableCell>
							<TableCell>Verif.</TableCell>
							<TableCell>Habil.</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 6 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={8}>
											<Skeleton />
										</TableCell>
									</TableRow>
							  ))
							: rows.map((r) => (
									<TableRow key={r._id} hover>
										<TableCell>{r.prioridad}</TableCell>
										<TableCell sx={{ cursor: "pointer" }} onClick={() => setEditing(r)}>
											<Typography variant="body2" sx={{ fontWeight: 600 }}>
												{r.label}
											</Typography>
											<Typography variant="caption" sx={{ fontFamily: "monospace" }} color="text.secondary">
												{r._id}
											</Typography>
										</TableCell>
										<TableCell>{(r.fuero || []).join(",")}</TableCell>
										<TableCell>{(((r as any).objetos as string[]) || ["*"]).join(",")}</TableCell>
										<TableCell>
											{r.plazoDias}d {r.tipoPlazo}
										</TableCell>
										<TableCell>
											<Chip size="small" variant="outlined" label={r.norma} />
										</TableCell>
										<TableCell>
											<Switch size="small" checked={r.verificado} onChange={(e) => toggle(r, "verificado", e.target.checked)} />
										</TableCell>
										<TableCell>
											<Switch size="small" checked={r.habilitado} onChange={(e) => toggle(r, "habilitado", e.target.checked)} />
										</TableCell>
									</TableRow>
							  ))}
					</TableBody>
				</Table>
			</TableContainer>
			{editing && <ReglaDialog regla={editing} onClose={() => setEditing(null)} onSaved={fetchList} />}
		</Stack>
	);
}
