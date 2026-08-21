// Copiar y descargar imágenes servidas desde S3.
//
// Las dos operaciones necesitan el BLOB, no la URL:
//   - copiar al portapapeles requiere `ClipboardItem`, que recibe un Blob;
//   - `<a download>` ignora el atributo en URLs cross-origin, así que para
//     forzar la descarga hay que crear un object URL local.
//
// Y para conseguir el blob hace falta poder leer la imagen con fetch, que sí
// pasa por CORS (a diferencia de `<img src>`, que no lo pide). De ahí que cada
// origen tenga su camino:
//
//   - bucket pjn-rag-documents  → tiene CORS para dashboard.lawanalytics.app,
//                                 se puede hacer fetch directo a la presigned URL.
//   - bucket scba-docs          → NO tiene CORS, hay que pedir los bytes a
//                                 mev-api, que sí manda las cabeceras.
//
// Por eso las funciones reciben un `getBlob` y no una URL: quien llama decide
// de dónde salen los bytes.

/** Lee una imagen accesible por CORS y devuelve su blob. */
export async function fetchImageBlob(url: string): Promise<Blob> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`No se pudo leer la imagen (HTTP ${res.status})`);
	return res.blob();
}

/** Sanitiza para nombre de archivo: Windows rechaza \ / : * ? " < > | */
export function safeFileName(label: string, ext = "png"): string {
	const base = label.replace(/[\\/:*?"<>|]/g, "-").trim() || "imagen";
	return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Revocar en el próximo tick: hacerlo de inmediato puede abortar la descarga.
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copia la imagen al portapapeles. Solo PNG tiene soporte amplio; si viene otro
 * tipo se reconvierte por canvas, porque `ClipboardItem` con image/jpeg falla
 * en Chrome.
 */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
	if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
		throw new Error("El navegador no permite copiar imágenes al portapapeles");
	}
	let png = blob;
	if (blob.type !== "image/png") {
		png = await new Promise<Blob>((resolve, reject) => {
			const img = new Image();
			const src = URL.createObjectURL(blob);
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.naturalWidth;
				canvas.height = img.naturalHeight;
				const ctx = canvas.getContext("2d");
				if (!ctx) return reject(new Error("No se pudo convertir la imagen"));
				ctx.drawImage(img, 0, 0);
				canvas.toBlob((b) => {
					URL.revokeObjectURL(src);
					b ? resolve(b) : reject(new Error("No se pudo convertir la imagen"));
				}, "image/png");
			};
			img.onerror = () => {
				URL.revokeObjectURL(src);
				reject(new Error("No se pudo leer la imagen"));
			};
			img.src = src;
		});
	}
	await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

/** Copia texto plano (emails, ids). Con fallback para contextos sin permiso. */
export async function copyText(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}
	// execCommand está deprecado pero es el único camino en HTTP o iframes sin
	// permiso de portapapeles; el admin corre en HTTPS, así que es solo un seguro.
	const ta = document.createElement("textarea");
	ta.value = text;
	ta.style.position = "fixed";
	ta.style.opacity = "0";
	document.body.appendChild(ta);
	ta.select();
	const ok = document.execCommand("copy");
	ta.remove();
	if (!ok) throw new Error("No se pudo copiar");
}
