import { useRef, useState } from "react";
import { Button, Chip, CircularProgress, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { DocumentUpload } from "iconsax-react";
import { useSnackbar } from "notistack";
import HcRelevamientoService, { Carga, ESTADO_CARGA_LABEL } from "api/hcRelevamiento";
import { EstadoChip, fmtFechaHora } from "./comun";
import { formatBytes } from "utils/format";

const MAX_MB = 30;
const ACEPTA = "application/pdf,image/jpeg,image/png";

interface SubirProps {
	/** Caso existente: el resultado reemplaza a su lectura. Sin prpaId se pide número y año de la causa. */
	prpaId?: string;
	onSubida: (c: Carga) => void;
}

/** Botón para subir el PRPA original (PDF digital o escaneado, o foto) de un caso o de una causa. */
export function SubirPrpa({ prpaId, onSubida }: SubirProps) {
	const { enqueueSnackbar } = useSnackbar();
	const input = useRef<HTMLInputElement>(null);
	const [subiendo, setSubiendo] = useState(false);
	const [numero, setNumero] = useState("");
	const [anio, setAnio] = useState("");
	const [nota, setNota] = useState("");

	const subir = async (archivo: File) => {
		if (archivo.size > MAX_MB * 1024 * 1024) {
			enqueueSnackbar(`El archivo supera los ${MAX_MB} MB`, { variant: "warning" });
			return;
		}
		if (!prpaId && (!Number(numero) || !Number(anio))) {
			enqueueSnackbar("Indicá el número y el año de la causa", { variant: "warning" });
			return;
		}
		try {
			setSubiendo(true);
			const destino = prpaId
				? { prpaId, nota: nota || undefined }
				: { causaNumber: Number(numero), causaYear: Number(anio), nota: nota || undefined };
			const { carga, duplicada } = await HcRelevamientoService.subirCarga(archivo, destino);
			enqueueSnackbar(duplicada ? "Ese archivo ya estaba cargado para este caso" : "PRPA subido. Se procesa en los próximos 5 minutos.", {
				variant: duplicada ? "info" : "success",
			});
			setNota("");
			onSubida(carga);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error subiendo el PRPA", { variant: "error" });
		} finally {
			setSubiendo(false);
			if (input.current) input.current.value = "";
		}
	};

	return (
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
			{!prpaId && (
				<>
					<TextField
						size="small"
						label="N° de causa"
						value={numero}
						onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
						sx={{ width: 130 }}
					/>
					<TextField
						size="small"
						label="Año"
						value={anio}
						onChange={(e) => setAnio(e.target.value.replace(/\D/g, "").slice(0, 4))}
						sx={{ width: 90 }}
					/>
				</>
			)}
			<TextField
				size="small"
				label="Nota (opcional)"
				value={nota}
				onChange={(e) => setNota(e.target.value)}
				sx={{ minWidth: 200, flex: 1 }}
			/>
			<input
				ref={input}
				type="file"
				accept={ACEPTA}
				hidden
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (f) subir(f);
				}}
			/>
			<Tooltip title="PDF digital o escaneado de ANSES, o foto (JPG/PNG), hasta 30 MB">
				<span>
					<Button
						variant="outlined"
						disabled={subiendo}
						startIcon={subiendo ? <CircularProgress size={14} /> : <DocumentUpload size={16} />}
						onClick={() => input.current?.click()}
					>
						{prpaId ? "Cargar PRPA original" : "Elegir archivo y cargar"}
					</Button>
				</span>
			</Tooltip>
		</Stack>
	);
}

interface ListaProps {
	cargas: Carga[];
	isDark: boolean;
	onAbrir?: (prpaId: string) => void;
}

/** Cargas de PRPA originales con su estado y los casos que generaron. */
export function ListaCargas({ cargas, isDark, onAbrir }: ListaProps) {
	if (!cargas.length) return null;
	return (
		<Stack spacing={0.75}>
			{cargas.map((c) => (
				<Stack key={c._id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					<EstadoChip estado={c.estado} isDark={isDark} label={ESTADO_CARGA_LABEL[c.estado] || c.estado} />
					<Typography variant="caption" color="text.secondary">
						{fmtFechaHora(c.subidoEn)} · {c.tipo.replace("application/", "").replace("image/", "")} · {formatBytes(c.bytes)}
						{c.resultado
							? ` · ${c.resultado.hojasSica || 0} hojas SICA, ${c.resultado.detalleBeneficio || 0} constancias${
									c.resultado.calidadOk !== undefined ? ` (${c.resultado.calidadOk} con lectura completa)` : ""
							  } · ${c.resultado.segundos ?? "—"} s`
							: ""}
						{c.error ? ` · ${c.error}` : ""}
						{c.nota ? ` · ${c.nota}` : ""}
					</Typography>
					{(c.prpaIds || []).map((id) => (
						<Chip
							key={id}
							size="small"
							label={`caso ${id.slice(-6)}`}
							onClick={onAbrir ? () => onAbrir(id) : undefined}
							sx={{ height: 20, fontSize: "0.66rem", fontFamily: "monospace" }}
						/>
					))}
				</Stack>
			))}
		</Stack>
	);
}
