/**
 * Una página de un PDF dibujada con pdf.js, con recuadros encima que se dibujan arrastrando el
 * mouse (o el dedo). Los recuadros se expresan relativos a la página: [x0, y0, x1, y1] en 0..1,
 * así no dependen del tamaño en pantalla ni de la resolución.
 */
import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

export type Recuadro = [number, number, number, number];

interface Props {
	data: ArrayBuffer;
	pagina: number;
	recuadros: Array<{ caja: Recuadro; etiqueta: string; activo: boolean }>;
	onDibujar?: (caja: Recuadro) => void;
	onPaginas?: (total: number) => void;
}

const COLORES = ["#1e88e5", "#e53935", "#43a047", "#fb8c00", "#8e24aa", "#00897b"];

const PdfPaginaRecuadros = ({ data, pagina, recuadros, onDibujar, onPaginas }: Props) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const capaRef = useRef<HTMLDivElement | null>(null);
	const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
	const [arrastre, setArrastre] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

	useEffect(() => {
		let cancelado = false;
		let pdfDoc: any = null;
		(async () => {
			try {
				setEstado("cargando");
				// @ts-ignore — sin types para el import dinámico
				const pdfjsLib = await import("pdfjs-dist");
				pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
				const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
				if (cancelado) return;
				pdfDoc = pdf;
				onPaginas?.(pdf.numPages);
				const page = await pdf.getPage(Math.min(Math.max(1, pagina), pdf.numPages));
				const canvas = canvasRef.current;
				if (!canvas || cancelado) return;
				const ancho = canvas.parentElement?.clientWidth || 800;
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				const base = page.getViewport({ scale: 1 });
				const viewport = page.getViewport({ scale: (ancho / base.width) * dpr });
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				const ctx = canvas.getContext("2d");
				if (!ctx) return;
				await page.render({ canvasContext: ctx, viewport }).promise;
				if (!cancelado) setEstado("listo");
			} catch (e) {
				console.error("[PdfPaginaRecuadros]", e);
				if (!cancelado) setEstado("error");
			}
		})();
		return () => {
			cancelado = true;
			try {
				pdfDoc?.destroy();
			} catch {
				// best-effort
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, pagina]);

	const relativo = (e: React.PointerEvent) => {
		const r = capaRef.current!.getBoundingClientRect();
		return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
	};
	const bajar = (e: React.PointerEvent) => {
		if (!onDibujar) return;
		capaRef.current?.setPointerCapture(e.pointerId);
		const p = relativo(e);
		setArrastre({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
	};
	const mover = (e: React.PointerEvent) => {
		if (!arrastre) return;
		const p = relativo(e);
		setArrastre({ ...arrastre, x1: p.x, y1: p.y });
	};
	const soltar = () => {
		if (!arrastre) return;
		const caja: Recuadro = [
			Math.min(arrastre.x0, arrastre.x1),
			Math.min(arrastre.y0, arrastre.y1),
			Math.max(arrastre.x0, arrastre.x1),
			Math.max(arrastre.y0, arrastre.y1),
		];
		setArrastre(null);
		// Un clic sin arrastrar no es un recuadro.
		if (caja[2] - caja[0] > 0.02 && caja[3] - caja[1] > 0.01) onDibujar?.(caja);
	};

	const estilo = (c: Recuadro, color: string, activo: boolean): React.CSSProperties => ({
		position: "absolute",
		left: `${c[0] * 100}%`,
		top: `${c[1] * 100}%`,
		width: `${(c[2] - c[0]) * 100}%`,
		height: `${(c[3] - c[1]) * 100}%`,
		border: `${activo ? 3 : 2}px solid ${color}`,
		background: activo ? `${color}22` : "transparent",
		pointerEvents: "none",
	});

	return (
		<Box sx={{ position: "relative", width: "100%" }}>
			{estado === "cargando" && (
				<Stack alignItems="center" spacing={1} sx={{ py: 4 }}>
					<CircularProgress size={24} />
					<Typography variant="caption" color="text.secondary">
						Dibujando la página {pagina}…
					</Typography>
				</Stack>
			)}
			{estado === "error" && <Alert severity="error">No se pudo dibujar la página.</Alert>}
			<Box sx={{ position: "relative", width: "100%" }}>
				<canvas ref={canvasRef} style={{ width: "100%", display: "block", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
				<div
					ref={capaRef}
					onPointerDown={bajar}
					onPointerMove={mover}
					onPointerUp={soltar}
					onPointerCancel={() => setArrastre(null)}
					style={{ position: "absolute", inset: 0, cursor: onDibujar ? "crosshair" : "default", touchAction: onDibujar ? "none" : "auto" }}
				>
					{recuadros.map((r, i) => (
						<div key={i} style={estilo(r.caja, COLORES[i % COLORES.length], r.activo)}>
							<span
								style={{
									position: "absolute",
									top: -20,
									left: 0,
									fontSize: 12,
									fontWeight: 600,
									color: "#fff",
									background: COLORES[i % COLORES.length],
									padding: "1px 6px",
									borderRadius: 3,
								}}
							>
								{r.etiqueta}
							</span>
						</div>
					))}
					{arrastre && (
						<div
							style={estilo(
								[
									Math.min(arrastre.x0, arrastre.x1),
									Math.min(arrastre.y0, arrastre.y1),
									Math.max(arrastre.x0, arrastre.x1),
									Math.max(arrastre.y0, arrastre.y1),
								],
								"#ffb300",
								true,
							)}
						/>
					)}
				</div>
			</Box>
		</Box>
	);
};

export default PdfPaginaRecuadros;
