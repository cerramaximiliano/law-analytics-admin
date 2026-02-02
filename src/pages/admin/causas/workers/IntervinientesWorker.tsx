import React from "react";
import { useState } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Alert,
	Stack,
	Chip,
	Tabs,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Divider,
	useTheme,
	alpha,
} from "@mui/material";
import { Setting2, InfoCircle, Chart, MessageQuestion, TickCircle, CloseCircle, DocumentText } from "iconsax-react";

// Interfaz para tabs laterales
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`intervinientes-tabpanel-${index}`}
			aria-labelledby={`intervinientes-tab-${index}`}
			style={{ width: "100%" }}
			{...other}
		>
			{value === index && <Box sx={{ pl: { xs: 0, md: 3 }, pt: { xs: 2, md: 0 } }}>{children}</Box>}
		</div>
	);
}

const IntervinientesWorker = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState(0);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Criterios de elegibilidad
	const eligibilityCriteria = [
		{ field: "verified", condition: "=== true", description: "Documento verificado en PJN", required: true },
		{ field: "isValid", condition: "=== true", description: "Expediente existe y es accesible", required: true },
		{ field: "isPrivate", condition: "!== true", description: "No es documento privado", required: true },
		{ field: "lastUpdate", condition: "exists", description: "Tiene actualización registrada", required: true },
		{ field: "detailsLoaded", condition: "false/null/undefined", description: "No procesado por extra-info", required: true },
	];

	// Flujo del worker
	const workerFlow = [
		{
			phase: "1. Extracción",
			description: "Siempre se ejecuta",
			steps: [
				"Busca documentos elegibles según criterios",
				"Navega al expediente en PJN (Puppeteer)",
				"Resuelve captcha (reCAPTCHA o PJN custom)",
				"Click en pestaña 'Intervinientes'",
				"Extrae PARTES: tipo, nombre, tomo/folio, IEJ",
				"Extrae LETRADOS: tipo, nombre, matrícula, estado IEJ",
				"Guarda en colección 'intervinientes'",
			],
			color: theme.palette.info.main,
		},
		{
			phase: "2. Sincronización",
			description: "Condicional (opt-in)",
			steps: [
				"Busca folders vinculados a la causa",
				"Para cada usuario verifica preferencia:",
				"  → preferences.pjn.syncContactsFromIntervinientes",
				"  → Solo si === true sincroniza contactos",
				"Obtiene límites de suscripción del usuario",
				"Crea/actualiza contactos respetando límites",
				"Actualiza folder.contactsCount",
			],
			color: theme.palette.warning.main,
		},
		{
			phase: "3. Finalización",
			description: "Marca documento procesado",
			steps: ["Actualiza detailsLoaded = true", "Actualiza detailsLastUpdate = new Date()"],
			color: theme.palette.success.main,
		},
	];

	// Contenido del tab de Información
	const InfoContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Descripción general */}
			<Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.02) }}>
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Descripción General
					</Typography>
					<Typography variant="body2" paragraph>
						El <strong>Extra-Info Worker</strong> es el proceso encargado de extraer información adicional de los expedientes
						desde el sitio web del PJN. Su principal función es obtener los <strong>intervinientes</strong> (partes y letrados)
						de cada causa judicial.
					</Typography>
					<Typography variant="body2">
						Los intervinientes extraídos se guardan en la colección <code>intervinientes</code> y opcionalmente se sincronizan
						como contactos en los folders de los usuarios que tienen habilitada esta funcionalidad.
					</Typography>
				</CardContent>
			</Card>

			{/* Configuración del worker */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Configuración del Worker
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Cron Schedule
								</Typography>
								<Chip label="*/30 * * * *" size="small" sx={{ fontFamily: "monospace" }} />
								<Typography variant="caption" color="text.secondary">
									Cada 30 minutos
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Batch Size
								</Typography>
								<Chip label="5" size="small" color="primary" />
								<Typography variant="caption" color="text.secondary">
									Documentos por ciclo
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Modos disponibles
								</Typography>
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
									<Chip label="civil" size="small" variant="outlined" />
									<Chip label="ss" size="small" variant="outlined" />
									<Chip label="trabajo" size="small" variant="outlined" />
									<Chip label="comercial" size="small" variant="outlined" />
									<Chip label="all" size="small" variant="outlined" />
								</Stack>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Captcha Provider
								</Typography>
								<Chip label="2Captcha" size="small" color="secondary" />
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Criterios de elegibilidad */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Criterios de Elegibilidad
					</Typography>
					<Typography variant="body2" color="text.secondary" paragraph>
						Un documento debe cumplir <strong>todos</strong> estos criterios para ser procesado:
					</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Campo</TableCell>
									<TableCell>Condición</TableCell>
									<TableCell>Descripción</TableCell>
									<TableCell align="center">Requerido</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{eligibilityCriteria.map((criteria, index) => (
									<TableRow key={index}>
										<TableCell>
											<Chip label={criteria.field} size="small" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }} />
										</TableCell>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
												{criteria.condition}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{criteria.description}</Typography>
										</TableCell>
										<TableCell align="center">
											{criteria.required ? (
												<TickCircle size={18} color={theme.palette.success.main} />
											) : (
												<CloseCircle size={18} color={theme.palette.grey[400]} />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>
		</Stack>
	);

	// Contenido del tab de Flujo
	const FlowContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Diagrama del flujo */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Flujo del Worker
					</Typography>

					{workerFlow.map((phase, phaseIndex) => (
						<Box key={phaseIndex} sx={{ mb: 3 }}>
							<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
								<Box
									sx={{
										width: 32,
										height: 32,
										borderRadius: "50%",
										backgroundColor: alpha(phase.color, 0.1),
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Typography variant="body2" fontWeight="bold" sx={{ color: phase.color }}>
										{phaseIndex + 1}
									</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" fontWeight="bold">
										{phase.phase}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{phase.description}
									</Typography>
								</Box>
							</Stack>

							<Box
								sx={{
									ml: 2,
									pl: 3,
									borderLeft: `2px solid ${alpha(phase.color, 0.3)}`,
								}}
							>
								{phase.steps.map((step, stepIndex) => (
									<Stack key={stepIndex} direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 0.75 }}>
										<Box
											sx={{
												width: 6,
												height: 6,
												borderRadius: "50%",
												backgroundColor: phase.color,
												mt: 0.75,
												flexShrink: 0,
											}}
										/>
										<Typography variant="body2" sx={{ fontFamily: step.startsWith("  →") ? "monospace" : "inherit" }}>
											{step}
										</Typography>
									</Stack>
								))}
							</Box>

							{phaseIndex < workerFlow.length - 1 && <Divider sx={{ mt: 2 }} />}
						</Box>
					))}
				</CardContent>
			</Card>

			{/* Nota sobre sincronización */}
			<Alert severity="info" variant="outlined">
				<Typography variant="body2">
					<strong>Importante:</strong> La extracción de intervinientes <strong>siempre ocurre</strong> y se guardan en la
					colección <code>intervinientes</code>. Solo la sincronización a contactos está condicionada a la preferencia
					del usuario (<code>preferences.pjn.syncContactsFromIntervinientes === true</code>).
				</Typography>
			</Alert>
		</Stack>
	);

	// Contenido del tab de Estadísticas (placeholder)
	const StatsContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Alert severity="warning" variant="outlined">
				<Typography variant="body2">
					Las estadísticas del worker extra-info estarán disponibles próximamente.
				</Typography>
			</Alert>

			{/* Placeholder para estadísticas futuras */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Documentos Procesados
							</Typography>
							<Typography variant="h5">-</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Intervinientes Extraídos
							</Typography>
							<Typography variant="h5">-</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Contactos Sincronizados
							</Typography>
							<Typography variant="h5">-</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Usuarios con Sync Habilitado
							</Typography>
							<Typography variant="h5">-</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</Stack>
	);

	// Contenido del tab de Ayuda
	const HelpContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<InfoCircle size={20} color="#1890ff" />
						<Typography variant="h6">Guía del Extra-Info Worker</Typography>
					</Stack>

					{/* Archivos principales */}
					<Box sx={{ mt: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Archivos Principales
						</Typography>
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Archivo</TableCell>
										<TableCell>Función</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									<TableRow>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
												extra-info-worker.js
											</Typography>
										</TableCell>
										<TableCell>Worker principal, orquesta el proceso</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
												extra-info-navigation.js
											</Typography>
										</TableCell>
										<TableCell>Navegación a PJN y resolución de captcha</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
												extra-info-extraction.js
											</Typography>
										</TableCell>
										<TableCell>Extracción de datos de la tabla de intervinientes</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
												intervinientes-contact-sync.js
											</Typography>
										</TableCell>
										<TableCell>Sincronización a contactos</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
												nombre-normalization.js
											</Typography>
										</TableCell>
										<TableCell>Normalización de nombres para deduplicación</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</TableContainer>
					</Box>

					{/* Preferencia del usuario */}
					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Preferencia del Usuario
						</Typography>
						<Alert severity="info" sx={{ mb: 2 }}>
							<Typography variant="body2">
								Los usuarios deben habilitar explícitamente la sincronización de contactos.
							</Typography>
						</Alert>
						<Paper variant="outlined" sx={{ p: 2, backgroundColor: alpha(theme.palette.grey[500], 0.05) }}>
							<Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
								{`// Ubicación: User.preferences.pjn
{
  pjn: {
    syncContactsFromIntervinientes: true  // default: false
  }
}`}
							</Typography>
						</Paper>
						<Box sx={{ mt: 2 }}>
							<Typography variant="body2" gutterBottom>
								<strong>Comportamiento:</strong>
							</Typography>
							<Box sx={{ pl: 2 }}>
								<Typography variant="body2">
									• <code>true</code> → Sincroniza contactos
								</Typography>
								<Typography variant="body2">
									• <code>false</code> / <code>undefined</code> / no existe → NO sincroniza
								</Typography>
							</Box>
						</Box>
					</Box>

					{/* Ejecución manual */}
					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Ejecución Manual
						</Typography>
						<Paper variant="outlined" sx={{ p: 2, backgroundColor: alpha(theme.palette.grey[500], 0.05) }}>
							<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
								# Ejecutar una vez (modo testing)
								<br />
								SINGLE_RUN=true node src/tasks/extra-info-worker.js
							</Typography>
						</Paper>
					</Box>

					{/* Documentación */}
					<Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
						<Typography variant="body2" color="text.secondary">
							Para más información, consultar la documentación completa en:
							<br />
							<code>pjn-workers/docs/SINCRONIZACION_INTERVINIENTES_CONTACTOS.md</code>
						</Typography>
					</Box>
				</CardContent>
			</Card>
		</Stack>
	);

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Worker de Intervinientes (Extra-Info)</Typography>
				<Chip label="En desarrollo" color="warning" size="small" />
			</Box>

			{/* Información del worker */}
			<Alert severity="info" variant="outlined" sx={{ py: 1 }}>
				<Typography variant="body2">
					Este worker extrae los intervinientes (partes y letrados) de las causas judiciales desde el sitio web del PJN
					y opcionalmente los sincroniza como contactos en los folders de los usuarios.
				</Typography>
			</Alert>

			{/* Layout con tabs laterales */}
			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
				{/* Tabs laterales */}
				<Tabs
					orientation="vertical"
					variant="scrollable"
					value={activeTab}
					onChange={handleTabChange}
					sx={{
						borderRight: { md: 1 },
						borderBottom: { xs: 1, md: 0 },
						borderColor: "divider",
						minWidth: { md: 200 },
						"& .MuiTab-root": {
							alignItems: "flex-start",
							textAlign: "left",
							minHeight: 60,
							px: 2,
						},
					}}
				>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Setting2 size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Información
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Config. y elegibilidad
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<DocumentText size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Flujo
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Proceso del worker
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Chart size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Estadísticas
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Métricas del worker
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<MessageQuestion size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Ayuda
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Guía y archivos
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
				</Tabs>

				{/* Contenido de los tabs */}
				<TabPanel value={activeTab} index={0}>
					<InfoContent />
				</TabPanel>
				<TabPanel value={activeTab} index={1}>
					<FlowContent />
				</TabPanel>
				<TabPanel value={activeTab} index={2}>
					<StatsContent />
				</TabPanel>
				<TabPanel value={activeTab} index={3}>
					<HelpContent />
				</TabPanel>
			</Box>
		</Stack>
	);
};

export default IntervinientesWorker;
