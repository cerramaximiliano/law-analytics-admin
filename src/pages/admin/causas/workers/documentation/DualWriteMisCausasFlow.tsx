// Diagrama del flujo dual-write de movimientos en pjn-mis-causas (portal autenticado).
// Presentacional puro; estilos y animaciones en flow-diagrams.css (scope .flowdoc).

import type { CSSProperties } from "react";

const DualWriteMisCausasFlow = () => (
	<>
		<header className="fd-header">
			<span className="fd-eyebrow">🔐 Portal autenticado · pjn-mis-causas</span>
			<h1>Flujo dual-write de movimientos — Mis Causas</h1>
			<p className="fd-lede">
				A diferencia del rastreo público, acá los movimientos llegan desde el portal <strong>"Mis Causas" del PJN con la sesión del usuario</strong>
				: el worker entra con las credenciales guardadas, sin captcha, y actualiza todas las causas vinculadas a cada credencial. Lo detectado
				se escribe en los mismos <strong>dos destinos</strong>: el archivo documental y la cola de avisos.
			</p>
			<div className="fd-legend">
				<span>
					<i className="fd-swatch" style={{ background: "var(--fd-auth)" }} /> Sesión autenticada
				</span>
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
				<h2>Login con las credenciales del usuario</h2>
				<span className="fd-hint">worker: pjn-private-causas-update · orquestado por el manager</span>
			</div>
			<div className="fd-session">
				<div className="fd-session-head">
					<span>🔐</span>
					<span className="fd-t">Sesión SSO del PJN</span>
					<span className="fd-n">sin captcha — el portal confía en el login</span>
				</div>
				<div className="fd-session-body">
					<div className="fd-session-row">
						<div className="fd-session-item">
							<span className="fd-name">Credenciales</span>
							<span className="fd-sub">guardadas y verificadas</span>
						</div>
						<span className="fd-session-arrow">→</span>
						<div className="fd-session-item">
							<span className="fd-name">Login al portal</span>
							<span className="fd-sub">una sesión por credencial</span>
						</div>
						<span className="fd-session-arrow">→</span>
						<div className="fd-session-item">
							<span className="fd-name">Causas vinculadas</span>
							<span className="fd-sub">todas, no solo las privadas</span>
						</div>
					</div>
					<div className="fd-session-note">
						Las causas se agrupan <strong>por credencial</strong>: un solo login alcanza para actualizar todo el paquete de causas de ese
						usuario, incluidas las de acceso restringido.
					</div>
				</div>
			</div>
		</section>

		<div className="fd-flow" />

		{/* ETAPA 2 */}
		<section>
			<div className="fd-step-label">
				<span className="fd-step-num">2</span>
				<h2>Comparación contra lo guardado</h2>
			</div>
			<div className="fd-card fd-compare-card">
				<div className="fd-intro">
					<strong>Documento de la causa</strong> — <span className="fd-mono">movimiento[ ]</span>
					<div className="fd-colls fd-mono">causas-civil · causas-trabajo · causas-segsocial · causas_caf …</div>
				</div>
				<div className="fd-cases">
					<div className="fd-case">
						<div className="fd-t">🆕 Movimientos nuevos</div>
						<div className="fd-d">Se agregan al inicio del historial de la causa.</div>
					</div>
					<div className="fd-case">
						<div className="fd-t">🔁 Cambió el último día</div>
						<div className="fd-d">Se reemplaza solo ese día, conservando los links a PDFs ya conocidos.</div>
					</div>
					<div className="fd-case">
						<div className="fd-t">✓ Sin cambios</div>
						<div className="fd-d">Solo se refresca la metadata de la causa.</div>
					</div>
				</div>
				<div className="fd-guards-label">Protecciones que evitan destruir datos buenos con un scrape malo:</div>
				<div className="fd-guards">
					<span className="fd-guard">portal devuelve 0 → no se borra nada</span>
					<span className="fd-guard">movimientos "esqueleto" → se descarta el reemplazo</span>
					<span className="fd-guard">se preservan las URLs existentes</span>
				</div>
			</div>
		</section>

		{/* CAMINO ALTERNATIVO: CACHÉ */}
		<section className="fd-cache-card">
			<span className="fd-cache-tag">Camino alternativo · caché</span>
			<h3>La causa ya estaba en el caché del ecosistema</h3>
			<div className="fd-d">
				En la sincronización inicial de Mis Causas, antes de scrapear cada causa nueva se consulta el caché del ecosistema. Si está, la causa
				nace con el historial completo (<code>source: cache</code>) sin pasar por el portal — pero sin espejo en <code>pjn-movements</code>.
			</div>
			<div className="fd-cache-row">
				<div className="fd-cache-item">
					<span className="fd-name">Sync inicial</span>
					<span className="fd-sub">consulta el caché antes de scrapear</span>
				</div>
				<span className="fd-cache-arrow">→</span>
				<div className="fd-cache-item">
					<span className="fd-name">Causa desde el caché</span>
					<span className="fd-sub">historial completo, sin portal</span>
				</div>
				<span className="fd-cache-arrow">→</span>
				<div className="fd-cache-item">
					<span className="fd-name">Reconciliación diaria</span>
					<span className="fd-sub">detecta el faltante y lo espeja</span>
				</div>
			</div>
			<div className="fd-d">
				El espejo se completa después: el job diario de reconciliación (la misma red de seguridad de la Rama A) detecta que a la causa le
				faltan registros en <code>pjn-movements</code> y re-espeja el historial completo con sus PDFs. Las pasadas del updater cubren desde
				entonces solo lo nuevo.
			</div>
			<div className="fd-cache-note">
				Avisos: la primera pasada del updater sobre una causa nacida del caché es silenciosa (establece la línea de base) — el historial viejo
				no genera spam.
			</div>
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
					<p>Mismo destino que el flujo público, con un orden pensado para sobrevivir cortes: primero el registro, después el PDF.</p>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⚙</span> <code>processPjnMovements()</code> — registro primero
					</div>
					<div className="fd-d">
						La metadata se espeja <strong>antes</strong> de tocar ningún PDF (escritura instantánea). Si el proceso se corta a mitad de
						descarga, el archivo ya quedó completo y los PDFs pendientes se reintentan después.
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⬇</span> PDFs con la sesión abierta → Amazon S3
					</div>
					<div className="fd-d">
						Los escritos de causas privadas requieren estar logueado: se descargan con la cookie de la sesión y, si el portal devuelve HTML
						en vez del PDF, se baja directo desde el navegador.
					</div>
					<div className="fd-chips">
						<span className="fd-chip fd-chip--auth">🔐 cookie de sesión</span>
						<span className="fd-chip fd-chip--auth">fallback vía navegador</span>
						<span className="fd-chip">4 descargas en paralelo</span>
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
							<span className="fd-v">cuándo apareció y cuándo se confirmó</span>
						</li>
						<li>
							<span className="fd-k fd-mono">scrapingSource</span>
							<span className="fd-v">pjn-login — vino del portal autenticado</span>
						</li>
					</ul>
				</div>

				<div className="fd-flow" />

				<div className="fd-safety" style={{ "--fd-s-color": "var(--fd-mirror)" } as CSSProperties}>
					<div className="fd-t">
						<span className="fd-pulse" /> Doble red de seguridad
					</div>
					Antes de cerrar la sesión se <strong>reintentan los PDFs fallidos</strong> aprovechando el login abierto. Y un job diario (06:00)
					compara el archivo contra cada causa: si detecta que falta algo, lo re-espeja y avisa al monitoreo.
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
					<p>Un aviso por cada usuario que sigue la causa. Mismo webhook y misma cola que el flujo público.</p>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">⚖</span> Política de primera vez
					</div>
					<div className="fd-d">
						Cada causa guarda la marca de su primera sincronización. El primer poblado trae el historial completo — y por defecto{" "}
						<strong>no dispara ningún aviso</strong>: sería spam de movimientos viejos.
					</div>
					<div className="fd-chips">
						<span className="fd-chip">primera sync: silenciosa (default)</span>
						<span className="fd-chip">o solo lo de hoy</span>
						<span className="fd-chip">luego: se avisa todo lo nuevo</span>
					</div>
				</div>

				<div className="fd-flow" />

				<div className="fd-stage">
					<div className="fd-t">
						<span className="fd-ico">📨</span> Webhook → servicio de notificaciones
					</div>
					<div className="fd-d">
						El worker envía el lote a <code>la-notification</code> identificado como origen <code>pjn-mis-causas</code>. El servicio crea un
						aviso por usuario y descarta duplicados.
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
					El mismo proceso diario del flujo público también cubre estas causas: si un webhook falló, los avisos faltantes del día se crean
					igual.
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
			<div className="fd-card fd-key-card" style={{ "--fd-k-color": "var(--fd-auth)" } as CSSProperties}>
				<h4>Qué cambia respecto del flujo público</h4>
				<p>
					La fuente es el portal autenticado: login con credenciales del usuario (sin captcha), acceso a causas privadas, y PDFs que solo se
					pueden bajar con la sesión abierta. Los destinos — <code>pjn-movements</code> y <code>judicialmovements</code> — son exactamente los
					mismos.
				</p>
			</div>
			<div className="fd-card fd-key-card" style={{ "--fd-k-color": "var(--fd-mirror)" } as CSSProperties}>
				<h4>Por qué un corte no pierde datos</h4>
				<p>
					El registro se escribe antes que su PDF, cada identidad es estable (<code>causaId : hash</code>), y una reconciliación diaria
					detecta y repara cualquier deriva entre el archivo y las causas. Reprocesar nunca duplica.
				</p>
			</div>
		</div>
	</>
);

export default DualWriteMisCausasFlow;
