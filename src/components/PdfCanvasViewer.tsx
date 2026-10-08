/**
 * Visor de PDF dibujado en <canvas> con pdfjs-dist.
 *
 * Existe porque el visor nativo del navegador no siempre se muestra dentro de un
 * <iframe>: si Chrome tiene desactivado el visor de PDF (o en mobile) pinta un
 * recuadro con un botón "Abrir" y nada más. Dibujando las páginas nosotros, el
 * documento se ve siempre.
 *
 * Recibe los bytes del PDF (ya bajados con el token del admin), no una URL.
 * El worker de pdf.js sale del CDN, igual que en law-analytics-front.
 */
import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

interface PdfCanvasViewerProps {
	data: ArrayBuffer;
	// Máximo de páginas a dibujar (los PDFs con muchos anexos escaneados pesan).
	maxPaginas?: number;
}

const PdfCanvasViewer = ({ data, maxPaginas = 60 }: PdfCanvasViewerProps) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
	const [paginas, setPaginas] = useState<{ dibujadas: number; total: number }>({ dibujadas: 0, total: 0 });

	useEffect(() => {
		let cancelado = false;
		let pdfDoc: any = null;
		(async () => {
			try {
				setEstado("cargando");
				// @ts-ignore — sin types para el import dinámico
				const pdfjsLib = await import("pdfjs-dist");
				pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
				// pdf.js toma posesión del buffer: se le pasa una copia.
				const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise;
				if (cancelado) return;
				pdfDoc = pdf;
				const contenedor = containerRef.current;
				if (!contenedor) return;
				contenedor.innerHTML = "";
				const total = Math.min(pdf.numPages, maxPaginas);
				setPaginas({ dibujadas: 0, total: pdf.numPages });
				const ancho = contenedor.clientWidth || 700;
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				for (let i = 1; i <= total; i++) {
					if (cancelado) return;
					const page = await pdf.getPage(i);
					const base = page.getViewport({ scale: 1 });
					const viewport = page.getViewport({ scale: (ancho / base.width) * dpr });
					const etiqueta = document.createElement("div");
					etiqueta.textContent = `Página ${i} de ${pdf.numPages}`;
					etiqueta.style.cssText = "font-size:12px;opacity:.7;margin:4px 0";
					const canvas = document.createElement("canvas");
					canvas.width = viewport.width;
					canvas.height = viewport.height;
					canvas.style.cssText = "width:100%;display:block;margin-bottom:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25)";
					const ctx = canvas.getContext("2d");
					if (!ctx) continue;
					contenedor.appendChild(etiqueta);
					contenedor.appendChild(canvas);
					await page.render({ canvasContext: ctx, viewport }).promise;
					if (!cancelado) setPaginas({ dibujadas: i, total: pdf.numPages });
					if (i === 1 && !cancelado) setEstado("listo");
				}
				if (!cancelado) setEstado("listo");
			} catch (e) {
				console.error("[PdfCanvasViewer]", e);
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
	}, [data, maxPaginas]);

	return (
		<Box sx={{ position: "relative", width: "100%" }}>
			{estado === "cargando" && (
				<Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
					<CircularProgress size={28} />
					<Typography variant="caption" color="text.secondary">
						Dibujando el documento…
					</Typography>
				</Stack>
			)}
			{estado === "error" && <Alert severity="error">No se pudo mostrar el PDF. Probá descargarlo.</Alert>}
			{paginas.total > maxPaginas && paginas.dibujadas >= maxPaginas && (
				<Alert severity="info" sx={{ mb: 1 }}>
					Se muestran las primeras {maxPaginas} de {paginas.total} páginas. Descargalo para verlo completo.
				</Alert>
			)}
			<Box ref={containerRef} sx={{ width: "100%" }} />
		</Box>
	);
};

export default PdfCanvasViewer;
