// Diagrama del flujo dual-write de movimientos PJN (workers públicos).
// Presentacional puro; estilos y animaciones en flow-diagrams.css (scope .flowdoc).

import type { CSSProperties } from "react";

const DualWritePublicFlow = () => (
	<>
		<header className="fd-header">
			<h1>Flujo dual-write de movimientos</h1>
			<p className="fd-lede">
				Cada vez que un worker detecta movimientos nuevos en una causa del PJN, esos movimientos se escriben en{" "}
				<strong>dos destinos a la vez</strong>: un archivo documental permanente (con su PDF) y una cola de avisos para los usuarios que
				siguen esa causa.
			</p>
			<div className="fd-legend">
				<span>
					<i className="fd-swatch" style={{ background: "var(--fd-mirror)" }} /> Rama A — Archivo documental
				</span>
				<span>
					<i className="fd-swatch" style={{ background: "var(--fd-notif)" }} /> Rama B — Avisos al usuario
				</span>
				<span>
					<i className="fd-swatch" style={{ background: "var(--fd-cache)" }} /> Camino alternativo — caché
				</span>
				<span>
					<i className="fd-swatch" style={{ background: "var(--fd-good)" }} /> Resultado final
				</span>
			</div>
		</header>

		{/* ETAPA 1 */}
		<section>
			<div className="fd-step-label">
				<span className="fd-step-num">1</span>
				<h2>Los workers rastrean el portal del PJN</h2>
				<span className="fd-hint">corren todo el día, cada uno con su cadencia</span>
			</div>
			<div className="fd-workers">
				<div className="fd-worker">
					<span className="fd-name">verify-worker</span>
					<span className="fd-repo">pjn-workers</span>
				</div>
				<div className="fd-worker">
					<span className="fd-name">app-update-worker</span>
					<span className="fd-repo">pjn-workers · scraping</span>
				</div>
				<div className="fd-worker">
					<span className="fd-name">recovery-worker</span>
					<span className="fd-repo">pjn-workers</span>
				</div>
				<div className="fd-worker">
					<span className="fd-name">stuck-documents</span>
					<span className="fd-repo">pjn-workers</span>
				</div>
			</div>
		</section>

		<div className="fd-flow" />

		{/* ETAPA 2 */}
		<section>
			<div className="fd-step-label">
				<span className="fd-step-num">2</span>
				<h2>Los movimientos nuevos se guardan en la causa</h2>
			</div>
			<div className="fd-card fd-causa-card">
				<strong>Documento de la causa</strong>
				<div className="fd-colls fd-mono">causas-civil · causas-trabajo · causas-segsocial · causas_caf …</div>
				<span className="fd-field fd-mono">movimiento[ ]</span>
				<div className="fd-colls">El worker compara lo scrapeado contra lo guardado y detecta solo lo nuevo.</div>
			</div>
		</section>

		{/* CAMINO ALTERNATIVO: CACHÉ */}
		<section className="fd-cache-card">
			<span className="fd-cache-tag">Camino alternativo · caché</span>
			<h3>La causa ya estaba en el caché del ecosistema</h3>
			<div className="fd-d">
				Cuando un usuario vincula una causa que el sistema ya conocía (reutiliza una existente o la importa del caché de scraping), no se
				scrapea nada: la causa nace con su historial completo de movimientos, pero sin espejo en <code>pjn-movements</code>.
			</div>
			<div className="fd-cache-row">
				<div className="fd-cache-item">
					<span className="fd-name">Hub vincula del caché</span>
					<span className="fd-sub">la causa nace con todo el historial</span>
				</div>
				<span className="fd-cache-arrow">→</span>
				<div className="fd-cache-item">
					<span className="fd-name fd-mono">needsPdfBackfill</span>
					<span className="fd-sub">solo deja la marca, no bloquea al usuario</span>
				</div>
				<span className="fd-cache-arrow">→</span>
				<div className="fd-cache-item">
					<span className="fd-name">pjn-pdf-backfill</span>
					<span className="fd-sub">worker always-on, sin navegador</span>
				</div>
			</div>
			<div className="fd-d">
				El worker toma la marca y espeja el historial <strong>completo</strong> a <code>pjn-movements</code> + PDFs a S3, una única vez —
				idempotente y con un candado compartido para no chocar con los demás workers. Desde ahí, el app-update-worker cubre solo lo nuevo.
			</div>
			<div className="fd-cache-note">Avisos: las causas nacidas del caché solo notifican movimientos del día — el historial viejo no genera spam.</div>
		</section>

		<div className="fd-flow fd-flow--delay" />
		<div className="fd-split" />

		{/* ETAPA 3: BIFURCACIÓN */}
		<div className="fd-branches">
			{/* RAMA A: ESPEJO */}
			<div className="fd-branch fd-b-mirror">
				<div className="fd-step-label">
					<span className="fd-step-num" style={{ background: "var(--fd-mirror)" }}>
						3A
					</span>
					<h2>Archivo documental</h2>
				</div>

				<div className="fd-branch-head">
					<span className="fd-tag">Rama A · siempre</span>
					<h3>Espejo permanente del movimiento</h3>
					<p>Un registro por movimiento, independiente del usuario. Acá no se notifica a nadie: se preserva el dato y su PDF.</p>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⚙</span> <code>processPjnMovements()</code>
					</div>
					<div className="fd-d">
						Genera una identidad estable para cada movimiento: <code>_id = causaId : hash-del-contenido</code>. Repetir el proceso nunca
						duplica registros.
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⬇</span> Descarga del PDF → Amazon S3
					</div>
					<div className="fd-d">
						Si el movimiento tiene link al escrito, se baja el PDF y se guarda en S3 antes de que el link del PJN expire. Si falla, queda
						marcado para reintentar.
					</div>
					<div className="fd-chips">
						<span className="fd-chip">downloaded</span>
						<span className="fd-chip">failed → reintento</span>
						<span className="fd-chip">sin PDF → not_applicable</span>
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">📝</span> Extracción de texto → <code>pjn-movement-texts</code>
					</div>
					<div className="fd-d">
						Si el documento es una <strong>resolución del organismo</strong> (no escritos de parte, cédulas ni oficios), se extrae el texto
						plano del PDF recién descargado. El texto vive en una colección satélite con la misma identidad; en el espejo queda solo el
						estado.
					</div>
					<div className="fd-chips">
						<span className="fd-chip">extracted</span>
						<span className="fd-chip">escaneado → needs_ocr</span>
						<span className="fd-chip">parte/cédula → not_applicable</span>
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-doc">
					<div className="fd-doc-head">
						<span className="fd-coll fd-mono">pjn-movements</span>
						<span className="fd-note">1 documento = 1 movimiento de una causa</span>
					</div>
					<ul>
						<li>
							<span className="fd-k fd-mono">_id</span>
							<span className="fd-v">causaId : hash — identidad estable</span>
						</li>
						<li>
							<span className="fd-k fd-mono">causaId / fuero</span>
							<span className="fd-v">a qué causa y fuero pertenece</span>
						</li>
						<li>
							<span className="fd-k fd-mono">fecha, tipo, detalle</span>
							<span className="fd-v">el contenido del movimiento</span>
						</li>
						<li>
							<span className="fd-k fd-mono">pdfS3Key / pdfStatus</span>
							<span className="fd-v">dónde quedó el PDF y en qué estado</span>
						</li>
						<li>
							<span className="fd-k fd-mono">firstSeenAt / lastSeenAt</span>
							<span className="fd-v">cuándo apareció y cuándo se confirmó por última vez</span>
						</li>
						<li>
							<span className="fd-k fd-mono">scrapingSource</span>
							<span className="fd-v">qué worker lo trajo</span>
						</li>
						<li>
							<span className="fd-k fd-mono">textoStatus</span>
							<span className="fd-v">estado del texto (el texto vive en pjn-movement-texts)</span>
						</li>
					</ul>
				</div>

				<div className="fd-flow" />

				<div className="fd-safety" style={{ "--fd-s-color": "var(--fd-mirror)" } as CSSProperties}>
					<div className="fd-t">
						<span className="fd-pulse" /> Backfill de texto histórico
					</div>
					El worker pjn-pdf-backfill recorre además, en paralelo, los PDFs ya guardados en S3 que aún no tienen texto y completa el corpus
					histórico leyendo directo de S3 — cero carga sobre el portal del PJN.
				</div>
			</div>

			{/* RAMA B: NOTIFICACIONES */}
			<div className="fd-branch fd-b-notif">
				<div className="fd-step-label">
					<span className="fd-step-num" style={{ background: "var(--fd-notif)" }}>
						3B
					</span>
					<h2>Avisos al usuario</h2>
				</div>

				<div className="fd-branch-head">
					<span className="fd-tag">Rama B · si hay seguidores</span>
					<h3>Cola de notificaciones</h3>
					<p>Un aviso por cada usuario que sigue la causa. El mismo movimiento puede generar varios avisos.</p>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⚖</span> Filtros y políticas
					</div>
					<div className="fd-d">
						Antes de avisar se decide qué merece aviso: una causa recién agregada no dispara su historial completo, y ciertos tipos de
						movimiento se excluyen.
					</div>
					<div className="fd-chips">
						<span className="fd-chip">primera sync: silenciosa</span>
						<span className="fd-chip">solo lo de hoy</span>
						<span className="fd-chip">tipos excluidos</span>
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">📨</span> Webhook → servicio de notificaciones
					</div>
					<div className="fd-d">
						El worker envía el lote a <code>la-notification</code>, que crea un aviso por usuario y descarta duplicados.
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-doc">
					<div className="fd-doc-head">
						<span className="fd-coll fd-mono">judicialmovements</span>
						<span className="fd-note">1 documento = 1 aviso para 1 usuario</span>
					</div>
					<ul>
						<li>
							<span className="fd-k fd-mono">userId</span>
							<span className="fd-v">a quién se le avisa</span>
						</li>
						<li>
							<span className="fd-k fd-mono">expediente</span>
							<span className="fd-v">carátula, fuero, número — copia para el email</span>
						</li>
						<li>
							<span className="fd-k fd-mono">movimiento</span>
							<span className="fd-v">fecha, tipo, detalle, link</span>
						</li>
						<li>
							<span className="fd-k fd-mono">notificationStatus</span>
							<span className="fd-v">pending → sent / failed</span>
						</li>
						<li>
							<span className="fd-k fd-mono">notifyAt / channels</span>
							<span className="fd-v">cuándo avisar y por qué canal</span>
						</li>
						<li>
							<span className="fd-k fd-mono">uniqueKey</span>
							<span className="fd-v">candado anti-duplicados (usuario + causa + fecha + contenido)</span>
						</li>
					</ul>
				</div>

				<div className="fd-flow" />

				<div className="fd-safety">
					<div className="fd-t">
						<span className="fd-pulse" /> Red de seguridad
					</div>
					Un proceso interno revisa cada día las causas con movimientos de hoy y crea los avisos que los workers no hayan reportado. Nada se
					pierde si un webhook falla.
				</div>

				<div className="fd-flow" />

				{/* ETAPA 4 */}
				<div className="fd-step-label">
					<span className="fd-step-num" style={{ background: "var(--fd-good)" }}>
						4
					</span>
					<h2>Envío programado</h2>
				</div>

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⏱</span> Cron cada 15 minutos
					</div>
					<div className="fd-d">
						Toma los avisos <code>pending</code> cuya hora ya llegó, agrupa todo lo del usuario en un solo resumen y lo envía.
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-outcomes">
					<div className="fd-outcome">
						<div className="fd-t">✉ Email</div>
						<div className="fd-d">un resumen por usuario, agrupado por expediente</div>
					</div>
					<div className="fd-outcome">
						<div className="fd-t">🔔 Navegador</div>
						<div className="fd-d">notificación en tiempo real vía Socket.io</div>
					</div>
				</div>
			</div>
		</div>

		{/* CLAVES */}
		<div className="fd-keys">
			<div className="fd-card fd-key-card" style={{ "--fd-k-color": "var(--fd-mirror)" } as CSSProperties}>
				<h4>Por qué nunca hay duplicados en el archivo</h4>
				<p>
					El <code>_id</code> de cada registro se calcula a partir del contenido del movimiento. Si dos workers procesan lo mismo, escriben
					sobre el mismo registro — el proceso es idempotente por diseño.
				</p>
			</div>
			<div className="fd-card fd-key-card" style={{ "--fd-k-color": "var(--fd-notif)" } as CSSProperties}>
				<h4>Por qué nunca se avisa dos veces</h4>
				<p>
					Cada aviso lleva un <code>uniqueKey</code> (usuario + causa + fecha + tipo + huella del texto). Si el aviso ya fue enviado, se
					ignora; si quedó pendiente o falló, se reintenta.
				</p>
			</div>
		</div>
	</>
);

export default DualWritePublicFlow;
