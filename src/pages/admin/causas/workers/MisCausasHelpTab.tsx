import React from "react";
import { Box, Card, CardContent, Typography, Stack, Chip, Divider, Alert, useTheme, alpha } from "@mui/material";
import { InfoCircle, Setting2, Timer1, Warning2 } from "iconsax-react";

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
						<Typography variant="h6">Verificación Inicial</Typography>
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
						<Typography variant="h6">Sincronización Completa</Typography>
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
						<Typography variant="h6">Actualización Incremental</Typography>
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
						<Typography variant="h6">Actualización de Causas Privadas</Typography>
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
