import React, { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Divider,
	IconButton,
	MenuItem,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add, Trash } from "iconsax-react";
import { MarketingContact, ExpedienteDetalle } from "types/marketing-contact";
import { MarketingContactService } from "store/reducers/marketing-contacts";

// Colecciones de causas PJN cubiertas por el email-extraction-worker
const COLECCIONES = [
	{ value: "causas-civil", label: "Civil", fuero: "judicial_civil" },
	{ value: "causas-segsocial", label: "Seguridad Social", fuero: "judicial_seguridad_social" },
	{ value: "causas-trabajo", label: "Trabajo", fuero: "judicial_trabajo" },
];

const FUERO_TO_COLECCION: Record<string, string> = {
	judicial_civil: "causas-civil",
	judicial_seguridad_social: "causas-segsocial",
	judicial_ss: "causas-segsocial",
	judicial_trabajo: "causas-trabajo",
};

type RowOrigen = "guardado" | "sugerido" | "sin datos" | "manual";

interface ExpedienteRow {
	expediente: string;
	coleccion: string; // "" = sin asignar
	causaId?: string;
	origen: RowOrigen;
}

interface ExpedientesEditorProps {
	contact: MarketingContact;
	onSaved: () => void;
}

const buildRows = (contact: MarketingContact): ExpedienteRow[] => {
	const cf = (contact.customFields || {}) as Record<string, any>;

	// Detalle ya guardado (worker nuevo o edición manual previa)
	const saved = new Map<string, { coleccion: string; causaId?: string }>();
	if (Array.isArray(cf.expedientesDetalle)) {
		for (const d of cf.expedientesDetalle as ExpedienteDetalle[]) {
			if (d?.expediente) {
				saved.set(String(d.expediente), {
					coleccion: d.coleccion || FUERO_TO_COLECCION[d.fuero || ""] || "",
					causaId: d.causaId ? String(d.causaId) : undefined,
				});
			}
		}
	}

	// Sugerencias desde activities: cada captura registró {expediente, fuero, causaId?}
	const suggested = new Map<string, { coleccion: string; causaId?: string }>();
	for (const activity of contact.activities || []) {
		const meta = activity.metadata || {};
		const exp = meta.expediente ? String(meta.expediente) : "";
		const coleccion = FUERO_TO_COLECCION[String(meta.fuero || "")] || "";
		if (exp && coleccion && !suggested.has(exp)) {
			suggested.set(exp, { coleccion, causaId: meta.causaId ? String(meta.causaId) : undefined });
		}
	}

	const expedientes = Array.isArray(cf.expedientes) ? cf.expedientes.filter(Boolean).map(String) : [];
	const all = Array.from(new Set([...expedientes, ...saved.keys()]));

	return all.map((expediente) => {
		const fromSaved = saved.get(expediente);
		if (fromSaved) {
			return { expediente, coleccion: fromSaved.coleccion, causaId: fromSaved.causaId, origen: "guardado" as RowOrigen };
		}
		const fromSuggestion = suggested.get(expediente);
		if (fromSuggestion) {
			return { expediente, coleccion: fromSuggestion.coleccion, causaId: fromSuggestion.causaId, origen: "sugerido" as RowOrigen };
		}
		return { expediente, coleccion: "", origen: "sin datos" as RowOrigen };
	});
};

const origenChip = (origen: RowOrigen) => {
	switch (origen) {
		case "guardado":
			return <Chip label="Guardado" size="small" color="success" variant="outlined" />;
		case "sugerido":
			return (
				<Tooltip title="Colección inferida del historial de capturas (activities). Guardá para persistirla.">
					<Chip label="Sugerido" size="small" color="info" variant="outlined" />
				</Tooltip>
			);
		case "manual":
			return <Chip label="Manual" size="small" color="warning" variant="outlined" />;
		default:
			return <Chip label="Sin datos" size="small" variant="outlined" />;
	}
};

const ExpedientesEditor: React.FC<ExpedientesEditorProps> = ({ contact, onSaved }) => {
	const [rows, setRows] = useState<ExpedienteRow[]>([]);
	const [newExpediente, setNewExpediente] = useState<string>("");
	const [newColeccion, setNewColeccion] = useState<string>("");
	const [saving, setSaving] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		setRows(buildRows(contact));
		setError(null);
		setSuccess(null);
	}, [contact]);

	const pendingSuggestions = useMemo(() => rows.filter((r) => r.origen === "sugerido").length, [rows]);
	const dirty = useMemo(() => rows.some((r) => r.origen !== "guardado" && r.coleccion) || false, [rows]);

	const handleColeccionChange = (index: number, coleccion: string) => {
		setRows((prev) => prev.map((r, i) => (i === index ? { ...r, coleccion, origen: coleccion ? "manual" : "sin datos" } : r)));
	};

	const handleAddRow = () => {
		const expediente = newExpediente.trim();
		if (!expediente || !/^\d+\/\d{4}$/.test(expediente)) {
			setError('Formato de expediente inválido. Usá "numero/año", por ejemplo 13119/2017.');
			return;
		}
		if (rows.some((r) => r.expediente === expediente)) {
			setError(`El expediente ${expediente} ya está en la lista.`);
			return;
		}
		setError(null);
		setRows((prev) => [...prev, { expediente, coleccion: newColeccion, origen: "manual" }]);
		setNewExpediente("");
		setNewColeccion("");
	};

	const handleRemoveRow = (index: number) => {
		setRows((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			setError(null);
			setSuccess(null);

			const expedientesDetalle = rows
				.filter((r) => r.coleccion)
				.map((r) => {
					const coleccionInfo = COLECCIONES.find((c) => c.value === r.coleccion);
					return {
						expediente: r.expediente,
						fuero: coleccionInfo?.fuero,
						coleccion: r.coleccion,
						...(r.causaId ? { causaId: r.causaId } : {}),
					};
				});

			await MarketingContactService.updateContactCustomFields(contact._id || "", { expedientesDetalle });
			setSuccess(`Se guardaron ${expedientesDetalle.length} expedientes con colección asignada.`);
			onSaved();
		} catch (err) {
			setError("Error al guardar los expedientes. Por favor, intente de nuevo.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
				<Typography variant="subtitle1" fontWeight="bold">
					Expedientes y colección de origen
				</Typography>
				<Button variant="contained" size="small" onClick={handleSave} disabled={saving || rows.length === 0}>
					{saving ? "Guardando..." : "Guardar cambios"}
				</Button>
			</Stack>
			<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
				El scraping histórico guardó los expedientes sin indicar de qué colección provienen. Asigná la colección manualmente o aceptá las
				sugerencias inferidas del historial de capturas y guardá.
			</Typography>
			<Divider sx={{ mb: 2 }} />

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{success && (
				<Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
					{success}
				</Alert>
			)}
			{pendingSuggestions > 0 && (
				<Alert severity="info" sx={{ mb: 2 }}>
					Hay {pendingSuggestions} expedientes con colección sugerida desde el historial de capturas. Revisá y presioná "Guardar cambios"
					para persistirlas.
				</Alert>
			)}

			{rows.length === 0 ? (
				<Typography variant="body2" color="textSecondary">
					Este contacto no tiene expedientes registrados.
				</Typography>
			) : (
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Expediente</TableCell>
							<TableCell>Colección</TableCell>
							<TableCell>Origen</TableCell>
							<TableCell>Causa ID</TableCell>
							<TableCell align="center">Quitar</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((row, index) => (
							<TableRow key={row.expediente} hover>
								<TableCell>
									<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
										{row.expediente}
									</Typography>
								</TableCell>
								<TableCell sx={{ minWidth: 190 }}>
									<TextField
										select
										fullWidth
										size="small"
										value={row.coleccion}
										onChange={(e) => handleColeccionChange(index, e.target.value)}
									>
										<MenuItem value="">Sin asignar</MenuItem>
										{COLECCIONES.map((c) => (
											<MenuItem key={c.value} value={c.value}>
												{c.label} ({c.value})
											</MenuItem>
										))}
									</TextField>
								</TableCell>
								<TableCell>{origenChip(row.origen)}</TableCell>
								<TableCell>
									<Typography variant="caption" color="textSecondary" sx={{ fontFamily: "monospace" }}>
										{row.causaId || "-"}
									</Typography>
								</TableCell>
								<TableCell align="center">
									<Tooltip title="Quitar de la lista (solo se persisten las filas con colección al guardar)">
										<IconButton size="small" color="error" onClick={() => handleRemoveRow(index)}>
											<Trash size={16} />
										</IconButton>
									</Tooltip>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<Divider sx={{ my: 2 }} />
			<Typography variant="subtitle2" gutterBottom>
				Agregar expediente manualmente
			</Typography>
			<Stack direction="row" spacing={1} alignItems="center">
				<TextField
					size="small"
					label="Expediente (numero/año)"
					placeholder="13119/2017"
					value={newExpediente}
					onChange={(e) => setNewExpediente(e.target.value)}
					sx={{ width: 220 }}
				/>
				<TextField
					select
					size="small"
					label="Colección"
					value={newColeccion}
					onChange={(e) => setNewColeccion(e.target.value)}
					sx={{ width: 260 }}
				>
					<MenuItem value="">Sin asignar</MenuItem>
					{COLECCIONES.map((c) => (
						<MenuItem key={c.value} value={c.value}>
							{c.label} ({c.value})
						</MenuItem>
					))}
				</TextField>
				<Button variant="outlined" size="small" startIcon={<Add size={16} />} onClick={handleAddRow}>
					Agregar
				</Button>
			</Stack>
			{!dirty && rows.length > 0 && (
				<Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 2 }}>
					Los cambios se guardan en customFields.expedientesDetalle del contacto.
				</Typography>
			)}
		</Box>
	);
};

export default ExpedientesEditor;
