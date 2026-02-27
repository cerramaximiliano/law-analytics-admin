import React from "react";
import { Box, Card, CardContent, Typography, Stack, Chip, Divider, Alert, useTheme, alpha } from "@mui/material";
import { InfoCircle, Setting2, Timer1, Warning2, Folder2, CloseCircle, MinusCirlce } from "iconsax-react";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
	<Box sx={{ mt: 3 }}>
		<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
			{title}
		</Typography>
		{children}
	</Box>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
	<Box sx={{ pl: 2 }}>
		{items.map((item, i) => (
			<Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
				{item}
			</Typography>
		))}
	</Box>
);

const CodeBlock: React.FC<{ children: string }> = ({ children }) => (
	<Box
		sx={{
			bgcolor: "grey.900",
			color: "grey.100",
			p: 1.5,
			borderRadius: 1,
			fontFamily: "monospace",
			fontSize: "0.75rem",
			whiteSpace: "pre-wrap",
			overflowX: "auto",
			mt: 1,
			mb: 1,
		}}
	>
		{children}
	</Box>
);

const MisCausasHelpTab: React.FC = () => {
	const theme = useTheme();

	return (
		<Stack spacing={3}>
			{/* Descripción General */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<InfoCircle size={20} color={theme.palette.info.main} />
						<Typography variant="h6">Descripción General del Sistema</Typography>
					</Stack>

					<Typography variant="body2" paragraph>
						El <strong>Scraping Worker Manager</strong> es un proceso orquestador que controla el ciclo de vida de todos los workers
						de scraping del sistema "Mis Causas" del Poder Judicial de la Nación (PJN). Opera como un proceso PM2 independiente
						que monitoriza la cola de trabajo pendiente en MongoDB y usa la API programática de PM2 para iniciar, detener y escalar
						workers automáticamente.
					</Typography>
					<Typography variant="body2" paragraph>
						Toda la configuración se gestiona desde MongoDB (colección <code>scraping-manager-state</code>, documento <code>config</code>) y se
						recarga periódicamente: los cambios se aplican sin necesidad de reiniciar el manager.
					</Typography>

					<Section title="Arquitectura">
						<BulletList
							items={[
								"El Manager es un proceso PM2 (pjn-scraping-manager) que corre permanentemente con autorestart",
								"Cada worker es un proceso PM2 en fork mode (no cluster) porque usa Puppeteer (Chrome headless)",
								"El escalado se logra creando procesos PM2 adicionales con nombre sufijado (ej: pjn-credentials-processor-2)",
								"No hay sistema de colas (Bull/BullMQ): los workers pollan MongoDB directamente",
								"El estado del manager se persiste en la colección 'scraping-manager-state' de MongoDB",
							]}
						/>
					</Section>

					<Section title="Precedencia de Configuración">
						<Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
							<Typography variant="body2">
								<code>global.enabled = false</code> anula todo &rarr; <code>worker.enabled = false</code> anula ese worker &rarr;{" "}
								<code>schedule</code> restringe horario &rarr; <code>scaling thresholds</code> deciden cantidad de instancias
							</Typography>
						</Alert>
					</Section>
				</CardContent>
			</Card>

			{/* Worker: credentials-processor */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Chip label="credentials-processor" size="small" color="primary" sx={{ fontFamily: "monospace" }} />
						<Typography variant="h6">Verificación de Credenciales</Typography>
					</Stack>

					<Section title="Función">
						<Typography variant="body2">
							Procesa credenciales PJN que aún no han sido verificadas. Realiza el login SSO, confirma la identidad y cantidad
							de causas del usuario, extrae todas las causas y crea las carpetas correspondientes.
						</Typography>
					</Section>

					<Section title="Flujo de Procesamiento">
						<BulletList
							items={[
								"1. Buscar credenciales pendientes (prioridad: sync interrumpido > sin verificar > incompletas)",
								"2. Iniciar navegador Puppeteer",
								"3. Login SSO en portal SCW del PJN con CUIL y password",
								"4. Navegar a 'Mis Causas' y confirmar total de expedientes",
								"5. Marcar credencial como verified: true",
								"6. Ordenar por CARATULA y extraer todas las causas página por página",
								"7. Generar snapshots (checksum MD5) de cada página para sync incremental futuro",
								"8. Cerrar sesión PJN y navegador",
								"9. Procesar causas: crear/vincular folders en BD (modo production) o simular (modo development)",
								"10. Marcar credencial como isValid: true",
								"11. Setear initialMovementsSync: 'pending' (solo en production) para que causas-update descargue movimientos inmediatamente",
								"12. Registrar éxito con recordSuccess()",
							]}
						/>
					</Section>

					<Section title="Elegibilidad">
						<CodeBlock>{`PjnCredentials donde:
  enabled: true
  AND (
    verified: false                                    // Nunca verificada
    OR (isValid: false AND syncStatus != 'in_progress')  // Verificada pero incompleta
    OR (syncStatus: 'in_progress' + tiene snapshots)     // Sync interrumpida
  )`}</CodeBlock>
					</Section>

					<Section title="Modos de Ejecución">
						<BulletList
							items={[
								"DEVELOPMENT (WORKER_MODE=development): Simula el procesamiento sin guardar causas ni folders en BD. Guarda datos en campo simulationData",
								"PRODUCTION (WORKER_MODE=production): Procesa normalmente, crea causas y folders en la base de datos",
							]}
						/>
					</Section>

					<Section title="Configuración Recomendada">
						<BulletList
							items={[
								"Schedule: 24/7 (schedule.enabled: false) - Este worker debe procesar credenciales nuevas lo antes posible",
								"Scaling: 1-3 instancias. ScaleUp cuando hay 5+ pendientes, ScaleDown cuando hay 1 o menos",
								"Health Check: Max 120 min de procesamiento, auto-restart si se cuelga",
							]}
						/>
					</Section>
				</CardContent>
			</Card>

			{/* Worker: mis-causas */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Chip label="mis-causas" size="small" color="secondary" sx={{ fontFamily: "monospace" }} />
						<Typography variant="h6">Sync Completa (on-demand)</Typography>
					</Stack>

					<Section title="Función">
						<Typography variant="body2">
							Realiza una sincronización completa de todas las causas de un usuario específico. Generalmente se ejecuta a pedido
							(triggered por la API cuando un usuario solicita re-sincronización).
						</Typography>
					</Section>

					<Section title="Flujo de Procesamiento">
						<BulletList
							items={[
								"1. Recibir userId como argumento",
								"2. Cargar credenciales del usuario",
								"3. Login SSO con Puppeteer",
								"4. Extraer todas las causas con progress callbacks",
								"5. Generar snapshots (checksums MD5 por página) para futuro sync incremental",
								"6. Cerrar navegador",
								"7. Procesar causas por lotes de 50 (crear/vincular folders, usar caché PJN)",
								"8. Registrar estadísticas por fuero y actualizar syncHistory",
							]}
						/>
					</Section>

					<Section title="Elegibilidad">
						<CodeBlock>{`PjnCredentials donde:
  syncStatus: 'pending'
  enabled: true`}</CodeBlock>
					</Section>

					<Section title="Snapshots">
						<Typography variant="body2">
							Genera checksums MD5 de cada página de resultados, guardando <code>firstCaratula</code> y{" "}
							<code>lastCaratula</code> por página. Estos snapshots permiten al worker de actualización incremental detectar
							cambios sin re-extraer todo. Requiere ordenamiento por CARATULA para funcionar correctamente.
						</Typography>
					</Section>
				</CardContent>
			</Card>

			{/* Worker: update-sync */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Chip label="update-sync" size="small" color="info" sx={{ fontFamily: "monospace" }} />
						<Typography variant="h6">Detección de Nuevas Causas</Typography>
					</Stack>

					<Section title="Función">
						<Typography variant="body2">
							Detecta causas nuevas de forma eficiente sin re-extraer todas las causas. Compara checksums de páginas
							con los snapshots guardados previamente para identificar solo los cambios.
						</Typography>
					</Section>

					<Section title="Flujo de Procesamiento">
						<BulletList
							items={[
								"1. Buscar usuarios elegibles (con snapshots previos y sortMethod CARATULA)",
								"2. Login SSO, verificar total de expedientes",
								"3. Si el total cambió: hay causas nuevas, proceder al escaneo",
								"4. Comparar checksum de la primera página con el snapshot guardado",
								"5. Si cambió: escanear páginas comparando rangos de carátula para encontrar nuevas causas",
								"6. Procesar solo las causas nuevas encontradas",
								"7. Actualizar snapshots con los datos actuales",
							]}
						/>
					</Section>

					<Section title="Elegibilidad">
						<CodeBlock>{`PjnCredentials donde:
  enabled: true
  isValid: true
  syncStatus: NOT IN ['in_progress', 'pending']
  syncMetadata.pageSnapshots: existe y no vacío
  syncMetadata.sortMethod: 'CARATULA' o 'CARÁTULA'`}</CodeBlock>
					</Section>

					<Section title="Configuración Interna">
						<BulletList
							items={[
								"MIN_HOURS_BETWEEN_UPDATES: 1 hora mínima entre actualizaciones por usuario",
								"MAX_USERS_PER_BATCH: 10 usuarios por ejecución",
								"MAX_MINUTES_PER_USER: 15 minutos máximo por usuario",
								"PAUSE_BETWEEN_USERS: 10 segundos entre usuarios",
							]}
						/>
					</Section>
				</CardContent>
			</Card>

			{/* Worker: private-causas-update */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Chip label="private-causas-update" size="small" color="warning" sx={{ fontFamily: "monospace" }} />
						<Typography variant="h6">Actualización de Movimientos</Typography>
					</Stack>

					<Section title="Función">
						<Typography variant="body2">
							Actualiza los movimientos de causas marcadas como <code>isPrivate: true</code>. Estas causas no son accesibles
							sin autenticación, por lo que requiere login SSO para consultar cada una individualmente.
						</Typography>
					</Section>

					<Section title="Flujo de Procesamiento">
						<BulletList
							items={[
								"1. Buscar causas privadas con linkedCredentials en todas las colecciones de fueros (CIV, COM, CNT, CSS, etc.)",
								"2. Agrupar causas por credencial vinculada",
								"3. Por cada credencial: Login SSO con Puppeteer",
								"4. Por cada causa de esa credencial: buscar y extraer movimientos nuevos",
								"5. Comparar con movimientos existentes y guardar los nuevos",
								"6. Delay de 2 segundos entre causas, 5 segundos entre credenciales",
								"7. Cerrar sesión y navegador",
							]}
						/>
					</Section>

					<Section title="Elegibilidad">
						<CodeBlock>{`Causas donde:
  isPrivate: true
  linkedCredentials: tiene al menos una
  lastUpdate: anterior a updateThresholdHours (24h) o no existe

Credenciales donde:
  enabled: true
  (para cada credencial vinculada a las causas)`}</CodeBlock>
					</Section>

					<Section title="Configuración Interna">
						<BulletList
							items={[
								"maxCredentialsPerRun: 10 credenciales por ejecución",
								"maxCausasPerCredential: 50 causas por credencial",
								"delayBetweenCausas: 2000ms entre cada causa",
								"delayBetweenCredentials: 5000ms entre cada credencial",
								"updateThresholdHours: 24 horas mínimo entre actualizaciones",
							]}
						/>
					</Section>
				</CardContent>
			</Card>

			{/* Worker: causas-update */}
		<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
			<CardContent>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
					<Chip label="causas-update" size="small" color="success" sx={{ fontFamily: "monospace" }} />
					<Typography variant="h6">Actualización de Movimientos (Causas Update)</Typography>
				</Stack>

				<Section title="Función">
					<Typography variant="body2">
						Actualiza los movimientos de TODAS las causas vinculadas a credenciales de usuario mediante login SSO
						al portal PJN. Usa un algoritmo de comparación por cantidad para detectar movimientos nuevos de forma eficiente.
						Opera en 3 fases con prioridad decreciente.
					</Typography>
				</Section>

				<Section title="Fases de Ejecución">
					<Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>
						Fase 0 — Sync Inicial de Movimientos (prioridad máxima)
					</Typography>
					<Typography variant="body2" sx={{ mb: 0.5 }}>
						Cuando el <code>credentials-processor</code> termina de verificar una credencial y crear causas/folders,
						las causas quedan sin movimientos. Esta fase los descarga inmediatamente.
					</Typography>
					<BulletList
						items={[
							"• Busca credenciales con initialMovementsSync: 'pending' o 'in_progress'",
							"• Obtiene TODAS las causas de la credencial SIN filtro de lastUpdate (threshold bypass)",
							"• Marca la credencial como 'in_progress' durante el procesamiento",
							"• Login SSO, scrape de movimientos para cada causa, actualización de folders",
							"• Si completa: marca initialMovementsSync: 'completed'",
							"• Si falla o se interrumpe: queda en 'in_progress' para reintentar en próxima ejecución",
						]}
					/>

					<Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }}>
						Fase 1 — Resume de Runs Interrumpidos
					</Typography>
					<BulletList
						items={[
							"• Busca CausasUpdateRun con status 'in_progress', 'error' o 'interrupted'",
							"• Filtra causas ya procesadas exitosamente del run anterior",
							"• Continúa procesando solo las causas restantes",
							"• Máximo de reintentos configurable (maxResumeAttempts, default 3)",
						]}
					/>

					<Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2 }}>
						Fase 2 — Actualización Regular
					</Typography>
					<BulletList
						items={[
							"• Busca causas con linkedCredentials y lastUpdate anterior al threshold (default 3h)",
							"• Agrupa por credencial, verifica thresholds por credencial (minTimeBetweenRunsMinutes)",
							"• Login SSO, búsqueda en portal, comparación de movimientos, actualización en BD",
							"• Registra detalle del run en CausasUpdateRun para tracking y resume futuro",
						]}
					/>
				</Section>

				<Section title="Sync Inicial — Detalle">
					<Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
						<Typography variant="body2">
							El campo <code>initialMovementsSync</code> en PjnCredentials funciona como flag de estado:
							<code> null</code> (no aplica) → <code>pending</code> (espera descarga) → <code>in_progress</code> (descargando)
							→ <code>completed</code> (listo). El manager bypasea el schedule cuando hay syncs iniciales pendientes,
							permitiendo que el worker arranque fuera de horario.
						</Typography>
					</Alert>
					<CodeBlock>{`Flujo completo:
1. credentials-processor verifica credencial → crea causas + folders
2. credentials-processor setea initialMovementsSync = 'pending'
3. scraping-manager detecta initialSyncPending > 0 en queue depth
4. scraping-manager bypasea schedule → arranca causas-update worker
5. causas-update Fase 0: procesa credencial sin threshold
6. causas-update marca initialMovementsSync = 'completed'
7. Siguiente poll: initialSyncPending = 0, schedule normal aplica`}</CodeBlock>
				</Section>

				<Section title="Configuración">
					<BulletList
						items={[
							"Thresholds: updateThresholdHours define horas mínimas antes de reprocesar una causa (NO aplica en Fase 0). minTimeBetweenRunsMinutes controla intervalo entre runs de la misma credencial.",
							"Concurrencia: waitForCausaCreation hace que el worker espere al worker de creación de causas antes de procesar una credencial.",
							"Resume: Si un run es interrumpido (error, shutdown), se retoma automáticamente en Fase 1 procesando solo las causas faltantes.",
						]}
					/>
				</Section>

				<Section title="Elegibilidad">
					<CodeBlock>{`Fase 0 (sync inicial):
  PjnCredentials donde:
    enabled: true, isValid: true
    initialMovementsSync: 'pending' o 'in_progress'
  → Obtiene TODAS las causas (sin filtro de lastUpdate)

Fase 1 (resume):
  CausasUpdateRun donde:
    status: 'in_progress', 'error' o 'interrupted'
    resumeAttempts < maxResumeAttempts

Fase 2 (regular):
  Causas donde:
    linkedCredentials: tiene al menos una
    lastUpdate: anterior a updateThresholdHours o no existe
  Credenciales donde:
    enabled: true, isValid: true
    última ejecución: hace más de minTimeBetweenRunsMinutes`}</CodeBlock>
				</Section>
			</CardContent>
		</Card>

		{/* Ciclo de vida: causas y carpetas */}
		<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
			<CardContent>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
					<Folder2 size={20} color={theme.palette.info.main} />
					<Typography variant="h6">Ciclo de vida: causas y carpetas</Typography>
				</Stack>

				<Section title="Conceptos clave">
					<Box sx={{ overflowX: "auto", mt: 1 }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
							<thead>
								<tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Término</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Colección MongoDB</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Descripción</th>
								</tr>
							</thead>
							<tbody>
								{[
									["Causa", "causas-civil, causas-segsocial, etc.", "Documento del expediente judicial. Puede existir independientemente de cualquier usuario."],
									["Carpeta", "folders", "Vínculo entre un usuario y una causa. Siempre pertenece a un único userId."],
									["source en causa", "—", "'pjn-login' = creado por el sync. 'scraping' = encontrado por búsqueda. 'cache' = desde caché PJN."],
									["source en carpeta", "—", "'pjn-login' = creada por el sync. Otros valores = creada manualmente por el usuario."],
									["linkedCredentials", "campo en causa", "Array de credenciales que vincularon esa causa. Permite saber qué usuarios/syncs la crearon."],
									["folderIds", "campo en causa", "Array de IDs de carpetas que apuntan a esa causa (de cualquier usuario)."],
								].map(([term, coll, desc], i) => (
									<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.03) }}>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", whiteSpace: "nowrap" }}>{term}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", whiteSpace: "nowrap", fontSize: "0.72rem" }}>{coll}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{desc}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>
				</Section>

				<Section title="Flujo de creación (sync PJN)">
					<Typography variant="body2" sx={{ mb: 1 }}>
						El proceso tiene dos fases ejecutadas por workers distintos:
					</Typography>
					<BulletList
						items={[
							"1. credentials-processor extrae expedientes por página → escribe docs en pjn-sync-queue",
							"2. sync-queue-processor lee la cola y ejecuta upsertCausa + ensureFolder por cada expediente",
						]}
					/>
					<CodeBlock>{`upsertCausa:
  Si la causa NO existe en DB → Crear con source='pjn-login', linkedCredentials=[credA]
  Si la causa YA existe en DB → Mantiene source original, agrega credA a linkedCredentials

ensureFolder:
  Búsqueda 1: busca carpeta por causaId exacto
    → Encontrada: retorna existente (isNew=false)
  Búsqueda 2: busca carpeta por número de expediente
    → Sin causaId: vincula causaId a esa carpeta (isNew=false)
    → Con causaId distinto (mismo nro, otro fuero): crea nueva carpeta (isNew=true)
    → No encontrada: crea nueva carpeta source='pjn-login' (isNew=true)`}</CodeBlock>
				</Section>

				<Alert severity="info" variant="outlined" sx={{ mt: 2, mb: 1 }}>
					<Typography variant="body2">
						<strong>Regla de propiedad:</strong> una causa con <code>source: 'pjn-login'</code> fue{" "}
						<strong>creada</strong> por el sync. Una causa con otro <code>source</code> fue{" "}
						<strong>vinculada</strong> por el sync (ya existía; el sync solo la encontró y la referencia). Esta
						distinción es crítica en el proceso de limpieza.
					</Typography>
				</Alert>

				<Section title="Tabla de decisiones de limpieza">
					<Box sx={{ overflowX: "auto", mt: 1 }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
							<thead>
								<tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>source de la causa</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Otros vínculos externos</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Acción</th>
								</tr>
							</thead>
							<tbody>
								{[
									["pjn-login", "No", "Eliminar documento completo"],
									["pjn-login", "Sí (otro usuario o credencial)", "Desvincular — quitar referencia a esta credencial"],
									["scraping / cache / otro", "No", "Desvincular — el sync no es dueño de esta causa"],
									["scraping / cache / otro", "Sí", "Desvincular"],
								].map(([source, otros, accion], i) => (
									<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.03) }}>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace" }}>{source}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{otros}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontWeight: i === 0 ? 600 : 400 }}>{accion}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>
				</Section>

				<Section title="Bloque A vs. Bloque B en el análisis de impacto">
					<Box sx={{ overflowX: "auto", mt: 1 }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
							<thead>
								<tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}></th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Bloque A</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Bloque B</th>
								</tr>
							</thead>
							<tbody>
								{[
									["Punto de entrada", "Carpetas pjn-login del usuario", "linkedCredentials.credentialsId en causas"],
									["Causas cubiertas", "Las que tienen carpeta activa", "Las que quedaron sin carpeta (syncs parciales, cleanups previos)"],
									["Por qué existe", "Ruta principal de análisis", "Una causa puede quedar 'huérfana' si su carpeta fue eliminada sin limpiar linkedCredentials. Sin el Bloque B quedaría en DB para siempre."],
								].map(([label, a, b], i) => (
									<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.03) }}>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontWeight: 600 }}>{label}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{a}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{b}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>
				</Section>

				<Section title="Ejemplo">
					<CodeBlock>{`Antes del cleanup (credencial: credX):
  Causa A: source='pjn-login', linkedCredentials=[credX],        folderIds=[carpeta1]
  Causa B: source='pjn-login', linkedCredentials=[credX, credY], folderIds=[carpeta2, carpeta3]
  Causa C: source='scraping',  linkedCredentials=[credX],        folderIds=[carpeta4]
  Causa D: source='pjn-login', linkedCredentials=[credX],        folderIds=[]  ← huérfana
  Carpetas del usuario: carpeta1 (pjn-login), carpeta4 (pjn-login)
  Carpetas de otro usuario: carpeta2, carpeta3

Clasificación:
  Causa A → toDelete          (pjn-login, sin otros vínculos)
  Causa B → toUnlink          (pjn-login, pero credY también la usa)
  Causa C → toUnlink          (source != pjn-login, el sync no la creó)
  Causa D → orphanedToDelete  (pjn-login, huérfana, sin otros vínculos)

Después:
  Causa A → ELIMINADA
  Causa B → linkedCredentials=[credY], folderIds=[carpeta2, carpeta3]
  Causa C → linkedCredentials=[],      folderIds=[]
  Causa D → ELIMINADA
  Carpeta1, Carpeta4 → ELIMINADAS`}</CodeBlock>
				</Section>
			</CardContent>
		</Card>

		{/* Desvinculación de cuenta PJN */}
		<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
			<CardContent>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
					<CloseCircle size={20} color={theme.palette.error.main} />
					<Typography variant="h6">Desvinculación de cuenta PJN</Typography>
				</Stack>

				<Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
					<Typography variant="body2">
						La credencial <strong>no se elimina</strong> — se desactiva (<code>enabled: false</code>). Los workers
						filtran por <code>enabled: true</code> al buscar credenciales, por lo que dejan de procesar esas causas
						en el próximo ciclo <strong>sin necesidad de cambios en pjn-mis-causas</strong>.
					</Typography>
				</Alert>

				<Section title="Modos disponibles">
					<Stack spacing={1.5} sx={{ mt: 1 }}>
						<Box sx={{ p: 1.5, border: `1px solid ${theme.palette.warning.light}`, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
								<Chip label="keep" size="small" color="warning" sx={{ fontFamily: "monospace" }} />
								<Typography variant="subtitle2">Conservar sin sincronización</Typography>
							</Stack>
							<BulletList
								items={[
									"Carpetas pjn-login → source='manual', pjn=false, causaId=null, judFolder=null, causaAssociationStatus=null",
									"Las causas vinculadas NO se tocan (linkedCredentials permanece intacto)",
									"Se limpian: mis-causas-syncs, causas-update-runs, pjn-sync-queue",
									"Los datos quedan accesibles para el usuario como carpetas manuales",
								]}
							/>
						</Box>
						<Box sx={{ p: 1.5, border: `1px solid ${theme.palette.error.light}`, borderRadius: 1, bgcolor: alpha(theme.palette.error.main, 0.04) }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
								<Chip label="delete" size="small" color="error" sx={{ fontFamily: "monospace" }} />
								<Typography variant="subtitle2">Eliminar carpetas y causas</Typography>
							</Stack>
							<BulletList
								items={[
									"$pull linkedCredentials y folderIds de causas en todas las colecciones",
									"Elimina causas source='pjn-login' sin otros vínculos (Bloque A + Bloque B)",
									"Elimina carpetas source='pjn-login' del usuario",
									"Se limpian: mis-causas-syncs, causas-update-runs, pjn-sync-queue",
									"Ajusta userstats: counts.folders, counts.foldersTotal, storage.total, storage.folders",
								]}
							/>
						</Box>
					</Stack>
				</Section>

				<Section title="Flujo de ejecución (ambos modos)">
					<CodeBlock>{`DELETE /api/pjn-credentials { mode: "keep" | "delete" }

1. analyzePjnImpact()   → clasifica carpetas y causas en toDelete / toUnlink / orphanedToDelete
2. executeKeepMode()    → updateMany folders (source→manual) + deleteMany historial
   o executeDeleteMode() → $pull en causas + deleteMany causas/carpetas/historial + userstats
3. PjnCredentials.updateOne → enabled: false, syncStatus: "idle", verified: false, isValid: false
4. Frontend: setHasCredentials(false) + dispatch(getFoldersByUserId(userId, true))`}</CodeBlock>
				</Section>

				<Section title="Comportamiento post-desvinculación">
					<BulletList
						items={[
							"GET /api/pjn-credentials → 404 (el handler verifica !credentials.enabled)",
							"La UI muestra el formulario de vinculación (hasCredentials=false)",
							"El usuario puede re-vincular: POST /api/pjn-credentials encuentra el documento desactivado y lo actualiza con enabled=true",
							"Workers: dejan de encontrar la credencial porque filtran por enabled:true — sin cambios en pjn-mis-causas",
							"Las causas en modo 'keep' conservan linkedCredentials.credentialsId apuntando al documento desactivado (referencia válida, sin huérfanos en DB)",
						]}
					/>
				</Section>

				<Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
					<Typography variant="body2">
						Para hacer un reset completo desde el admin (equivalente al script <code>cleanup-pjn-data.js</code>),
						usar la sección de Credenciales PJN → detalle de credencial → botón Reset Sync. Esa operación
						resetea la credencial pero la mantiene activa (<code>enabled: true</code>), a diferencia de la
						desvinculación que la desactiva.
					</Typography>
				</Alert>
			</CardContent>
		</Card>

		{/* Exclusión manual de causas */}
		<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
			<CardContent>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
					<MinusCirlce size={20} color={theme.palette.warning.main} />
					<Typography variant="h6">Exclusión manual de causas (<code>excludedCausas</code>)</Typography>
				</Stack>

				<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
					<Typography variant="body2">
						<strong>Problema:</strong> cuando un usuario elimina una carpeta PJN desde la UI, el worker la
						recreaba en el próximo sync porque <code>ensureFolder()</code> no tenía forma de distinguir "carpeta
						eliminada intencionalmente" de "carpeta que aún no existe". El campo <code>excludedCausas</code> en{" "}
						<code>PjnCredentials</code> resuelve esto.
					</Typography>
				</Alert>

				<Section title="Flujo al eliminar una carpeta PJN">
					<CodeBlock>{`DELETE /api/folders/:id  (folder.source === "pjn-login")

1. dissociateFolderFromCausa()
   → $pull folderIds, userCausaIds, userUpdatesEnabled de la causa

2. PjnCredentials.updateOne
   → $addToSet excludedCausas: { causaId, causaType, excludedAt }

3. CausaModel.updateOne
   → $pull linkedCredentials where credentialsId === pjnCred._id
     (private-causas-update deja de rastrear la causa para este usuario)

4. Folder.findByIdAndDelete(id) + actualización de userstats`}</CodeBlock>
				</Section>

				<Section title="Cómo el worker respeta la exclusión">
					<Typography variant="body2" sx={{ mb: 1 }}>
						Al inicio de cada batch, <code>processCausasBatch</code> construye un <code>Set</code> con los IDs
						excluidos. Si <code>existingCausa._id</code> está en el Set, la causa se salta sin crear carpeta
						ni vincular <code>linkedCredentials</code>.
					</Typography>
					<CodeBlock>{`// processCausasBatch — inicio del batch
const excludedSet = new Set(
  credentialsInfo.excludedCausas.map(e => e.causaId.toString())
);

// Para cada causa de la lista PJN
if (existingCausa && excludedSet.has(existingCausa._id.toString())) {
  stats.processed++;
  continue;  // sin carpeta, sin linkedCredentials
}`}</CodeBlock>
				</Section>

				<Section title="Tabla de escenarios">
					<Box sx={{ overflowX: "auto", mt: 1 }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
							<thead>
								<tr style={{ backgroundColor: alpha(theme.palette.warning.main, 0.08) }}>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Escenario</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Comportamiento</th>
								</tr>
							</thead>
							<tbody>
								{[
									["Usuario elimina carpeta PJN → próximo sync", "Causa en excludedSet → continue, no se recrea la carpeta"],
									["Otro usuario tiene la misma causa", "Cada credencial tiene su propia lista de exclusiones → no afecta a otros"],
									["Usuario re-vincula la misma cuenta PJN", "excludedCausas persiste → las causas eliminadas siguen excluidas (comportamiento esperado)"],
									["Usuario quiere volver a ver la causa", "Eliminar la entrada en excludedCausas directamente en MongoDB (no hay UI aún)"],
									["Eliminación en bulk (hasta 50 carpetas)", "Carga credenciales PJN antes del loop, aplica exclusiones en batch al final"],
								].map(([esc, comp], i) => (
									<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.warning.main, 0.03) }}>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.72rem" }}>{esc}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{comp}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>
				</Section>

				<Section title="Diferencia con la desvinculación de cuenta">
					<Box sx={{ overflowX: "auto", mt: 1 }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
							<thead>
								<tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Mecanismo</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Trigger</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Scope</th>
									<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Estado credencial</th>
								</tr>
							</thead>
							<tbody>
								{[
									["Desvinculación de cuenta", "Usuario desvincula cuenta completa", "Todas las carpetas PJN", "enabled: false"],
									["Exclusión manual", "Usuario elimina una carpeta PJN", "Una causa específica", "Credencial sigue activa"],
								].map(([mec, trig, scope, estado], i) => (
									<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.03) }}>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontWeight: 600 }}>{mec}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{trig}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{scope}</td>
										<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.72rem" }}>{estado}</td>
									</tr>
								))}
							</tbody>
						</table>
					</Box>
				</Section>

				<Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
					<Typography variant="body2">
						Para revertir una exclusión (que el sync vuelva a crear la carpeta), eliminar la entrada en MongoDB:
						<code style={{ display: "block", marginTop: 4 }}>
							{"db['pjn-credentials'].updateOne({ userId }, { $pull: { excludedCausas: { causaId: ObjectId('...') } } })"}
						</code>
					</Typography>
				</Alert>
			</CardContent>
		</Card>


	{/* Causas no encontradas en el portal */}
	<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
		<CardContent>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
				<Warning2 size={20} color={theme.palette.warning.main} />
				<Typography variant="h6">Causas no encontradas en el portal (<code>pjnNotFound</code>)</Typography>
			</Stack>

			<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
				<Typography variant="body2">
					Cuando una causa desaparece del portal "Mis Causas" del PJN (archivada, desvinculada por el tribunal, etc.),
					el usuario tiene un folder activo sin correspondencia en el portal. El campo <code>pjnNotFound</code> en{" "}
					<code>Folder</code> permite detectarlo y mostrarlo en la UI con un indicador ámbar.
				</Typography>
			</Alert>

			<Section title="Cuándo se activa la detección">
				<Typography variant="body2" sx={{ mb: 1 }}>
					La detección ocurre en el worker <code>update-sync</code> únicamente cuando{" "}
					<strong>el total de causas en el portal disminuye</strong> (<code>currentTotal &lt; previousTotal</code>).
					En ese caso, el loop de escaneo elimina su condición de early-stop y recorre{" "}
					<strong>todas las páginas</strong>, acumulando las claves de todas las causas visibles.
					El sync inicial (<code>processFromSyncQueue</code>) también llama automáticamente a{" "}
					<code>syncPjnNotFoundStatus</code> al finalizar con la lista completa de la cola.
				</Typography>
				<CodeBlock>{`// update-sync-worker.js
const countDropped = currentTotal < previousTotal;
const allScrapedKeys = countDropped ? new Set() : null;

// Loop sin early-stop cuando el total bajó
while (currentPage <= maxPages && (countDropped || consecutiveKnownPages < 3)) {
  for (const causa of pageSnapshot.causas) {
    if (allScrapedKeys) {
      allScrapedKeys.add(\`\${causa.fuero}/\${causa.numero}/\${causa.anio}/\${causa.incidente || ''}\`);
    }
  }
}

// Tras el escaneo completo
if (allScrapedKeys) {
  await causaSyncService.syncPjnNotFoundStatus(userId, allScrapedKeys);
}`}</CodeBlock>
			</Section>

			<Section title="Función syncPjnNotFoundStatus">
				<CodeBlock>{`// causa-sync-service.js — scrapedCausaKeys: Set<"fuero/numero/anio/incidente">
1. Obtiene todos los folders PJN del usuario con causaId set
2. Batch-lookup de causas por tipo → construye mapa causaId → clave
3. Compara cada folder contra scrapedCausaKeys:
   - causa NO en portal y pjnNotFound=false → $set { pjnNotFound: true }
   - causa SÍ en portal y pjnNotFound=true  → $unset { pjnNotFound }
4. Aplica todas las actualizaciones en un único bulkWrite`}</CodeBlock>
				<Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
					<Typography variant="body2">
						<code>scrapedCausaKeys</code> debe ser la lista <strong>completa</strong> del portal.
						Llamar con listas parciales marcaría incorrectamente como "no encontradas" las causas
						de páginas no escaneadas.
					</Typography>
				</Alert>
			</Section>

			<Section title="Tabla de escenarios">
				<Box sx={{ overflowX: "auto", mt: 1 }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
						<thead>
							<tr style={{ backgroundColor: alpha(theme.palette.warning.main, 0.08) }}>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Escenario</th>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Worker</th>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>pjnNotFound resultante</th>
							</tr>
						</thead>
						<tbody>
							{[
								["Total baja, causa desapareció del portal", "update-sync: escaneo completo", "true (marcado)"],
								["Total baja, causa reapareció (temporal)", "update-sync: escaneo completo", "false (limpiado)"],
								["Total igual o sube", "update-sync: sin escaneo completo", "Sin cambio"],
								["Re-vinculación (sync desde queue)", "sync-queue-processor: lista completa", "Marca/limpia correctamente"],
								["Causa en excludedCausas (sin folder)", "N/A", "No aplica"],
							].map(([esc, worker, result], i) => (
								<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.warning.main, 0.03) }}>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontSize: "0.72rem" }}>{esc}</td>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontSize: "0.72rem" }}>{worker}</td>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontWeight: i < 2 ? 600 : 400 }}>{result}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Box>
			</Section>

			<Section title="Indicadores en la UI del usuario">
				<Box sx={{ overflowX: "auto", mt: 1 }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
						<thead>
							<tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Vista</th>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Indicador</th>
							</tr>
						</thead>
						<tbody>
							{[
								["Tabla de carpetas (Carátula)", "Warning2 ámbar al final de la fila con tooltip explicativo"],
								["Vista detalle (FolderView)", "Badge 'Vinculado con PJN' en ámbar + ícono Warning2 en esquina inferior"],
							].map(([vista, ind], i) => (
								<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.03) }}>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", whiteSpace: "nowrap", fontSize: "0.72rem" }}>{vista}</td>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{ind}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Box>
			</Section>

			<Section title="Diferencia con excludedCausas">
				<Box sx={{ overflowX: "auto", mt: 1 }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
						<thead>
							<tr style={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Mecanismo</th>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Trigger</th>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Quién actúa</th>
								<th style={{ padding: "6px 12px", textAlign: "left", border: `1px solid ${theme.palette.divider}` }}>Reversión</th>
							</tr>
						</thead>
						<tbody>
							{[
								["excludedCausas", "Usuario elimina carpeta PJN", "Worker omite la causa en el próximo sync", "Admin/MongoDB: $pull excludedCausas"],
								["pjnNotFound", "Causa desaparece del portal", "Worker marca el folder (no lo borra)", "Automática en el próximo escaneo completo"],
							].map(([mec, trig, quien, rev], i) => (
								<tr key={i} style={{ backgroundColor: i % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.03) }}>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}`, fontFamily: "monospace", fontWeight: 600 }}>{mec}</td>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{trig}</td>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{quien}</td>
									<td style={{ padding: "6px 12px", border: `1px solid ${theme.palette.divider}` }}>{rev}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Box>
			</Section>

			<Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
				<Typography variant="body2">
					Para limpiar el flag manualmente sin esperar al próximo sync:
					<code style={{ display: "block", marginTop: 4 }}>
						{"db.folders.updateOne({ _id: ObjectId('...') }, { $unset: { pjnNotFound: 1 } })"}
					</code>
				</Typography>
			</Alert>
		</CardContent>
	</Card>

		{/* Configuración del Manager */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Setting2 size={20} color={theme.palette.primary.main} />
						<Typography variant="h6">Configuración del Manager</Typography>
					</Stack>

					<Section title="global.enabled vs global.serviceAvailable">
						<BulletList
							items={[
								"global.enabled = false: El manager detiene TODOS los workers. Ningún proceso de scraping se ejecuta.",
								"global.serviceAvailable = false: La API indica a los usuarios que el servicio no está disponible. Los workers PUEDEN seguir ejecutándose (ej: terminando trabajo pendiente).",
								"Caso de uso: Poner serviceAvailable=false y enabled=true permite terminar trabajo en progreso mientras se informa a los usuarios que el servicio está en mantenimiento.",
							]}
						/>
					</Section>

					<Section title="Auto-Escalado">
						<Typography variant="body2" paragraph>
							El manager consulta la profundidad de la cola (documentos pendientes en MongoDB) y decide cuántas instancias
							necesita cada worker:
						</Typography>
						<BulletList
							items={[
								"Si cola > scaleUpThreshold y instancias < maxInstances: agrega instancias (de a scaleUpStep)",
								"Si cola <= scaleDownThreshold y instancias > minInstances: reduce instancias (de a scaleDownStep)",
								"Si cola > 0 y instancias = 0: inicia al menos 1 instancia",
								"Cooldown: espera cooldownMs (por defecto 5 min) entre acciones de escalado para evitar thrashing",
								"Fork mode: escalar = crear procesos PM2 adicionales con sufijo numérico",
							]}
						/>
					</Section>

					<Section title="Schedule (Horarios)">
						<BulletList
							items={[
								"Cada worker tiene su propio horario independiente",
								"schedule.enabled = false: el worker funciona 24/7 (sin restricción de horario)",
								"schedule.enabled = true: el worker solo corre dentro de workingDays + workingHoursStart/End",
								"workingDays usa ISO weekday: 1=Lunes, 2=Martes, ..., 7=Domingo",
								"Timezone configurable por worker (default: America/Argentina/Buenos_Aires)",
								"Fuera de horario: el manager reduce instancias a 0",
								"Excepción: si hay syncs iniciales pendientes (initialMovementsSync = 'pending'), el worker causas-update bypasea el schedule y arranca igualmente para descargar movimientos de credenciales recién verificadas",
							]}
						/>
					</Section>

					<Section title="Health Checks">
						<BulletList
							items={[
								"maxProcessingMinutes: Si un worker lleva más tiempo corriendo, se considera colgado",
								"autoRestartOnStuck: Si es true, el manager reinicia automáticamente workers colgados",
								"Se ejecutan cada healthCheckIntervalMs (configurable, default 60s)",
								"También monitoriza uso de memoria (alerta si > 800MB)",
							]}
						/>
					</Section>
				</CardContent>
			</Card>
		</Stack>
	);
};

export default MisCausasHelpTab;
