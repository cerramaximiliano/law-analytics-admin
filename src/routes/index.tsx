import lazyWithRetry from "utils/lazyWithRetry";
import { useRoutes, Navigate } from "react-router-dom";
import Loadable from "components/Loadable";

// Route guards
import GuestGuard from "utils/route-guard/GuestGuard";
import AuthGuard from "utils/route-guard/AuthGuard";
import AdminRoleGuard from "utils/route-guard/AdminRoleGuard";

// Layout
import MainLayout from "layout/MainLayout";

// Auth pages
const AuthLogin = Loadable(lazyWithRetry(() => import("pages/auth/login")));
const AuthCodeVerification = Loadable(lazyWithRetry(() => import("pages/auth/code-verification")));

// Admin pages
const WorkersPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/workers")));
const WorkersMEVPage = Loadable(lazyWithRetry(() => import("pages/workers/WorkersMEV")));
const MEVLoginFailuresPage = Loadable(lazyWithRetry(() => import("pages/workers/MEVLoginFailures")));
const WorkerLogsPage = Loadable(lazyWithRetry(() => import("pages/workers/WorkerLogs")));
const EmailVerificationWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/email-verification")));
const CarpetasVerificadas = Loadable(lazyWithRetry(() => import("pages/admin/causas/CarpetasVerificadas")));
const TrayectoriasPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/Trayectorias")));
const EtapasPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/Etapas")));
const EtapaStatsPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/EtapaStats")));
const EtapaArbolPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/EtapaArbol")));
const EtiquetadoDatasetPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/EtiquetadoDataset")));
const EtiquetadoEditorPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/EtiquetadoEditor")));
const CarpetasVerificadasApp = Loadable(lazyWithRetry(() => import("pages/admin/causas/CarpetasVerificadasApp")));
const CarpetasNoVerificadas = Loadable(lazyWithRetry(() => import("pages/admin/causas/CarpetasNoVerificadas")));
const FlujosCausas = Loadable(lazyWithRetry(() => import("pages/admin/causas/flujos/FlujosCausas")));
const FlujosEcosistema = Loadable(lazyWithRetry(() => import("pages/admin/flujos")));
const CausasPendientes = Loadable(lazyWithRetry(() => import("pages/admin/causas/CausasPendientes")));
const CredencialesPJN = Loadable(lazyWithRetry(() => import("pages/admin/causas/CredencialesPJN")));
const CausasSyncCredentials = Loadable(lazyWithRetry(() => import("pages/admin/causas/CausasSyncCredentials")));
const CausasUpdateEligible = Loadable(lazyWithRetry(() => import("pages/admin/causas/update-eligible")));

// MEV pages
const CarpetasMEVVerificadas = Loadable(lazyWithRetry(() => import("pages/admin/mev/CarpetasMEVVerificadas")));
const CarpetasMEVNoVerificadas = Loadable(lazyWithRetry(() => import("pages/admin/mev/CarpetasMEVNoVerificadas")));
const CredencialesSCBA = Loadable(lazyWithRetry(() => import("pages/admin/mev/CredencialesSCBA")));
const CausasMEVByCredential = Loadable(lazyWithRetry(() => import("pages/admin/mev/CausasMEVByCredential")));

// EJE pages
const CarpetasVerificadasEje = Loadable(lazyWithRetry(() => import("pages/admin/eje/CarpetasVerificadasEje")));
const CarpetasNoVerificadasEje = Loadable(lazyWithRetry(() => import("pages/admin/eje/CarpetasNoVerificadasEje")));
const CarpetasPivotsEje = Loadable(lazyWithRetry(() => import("pages/admin/eje/CarpetasPivotsEje")));
const EjeWorkersConfig = Loadable(lazyWithRetry(() => import("pages/admin/eje/workers")));

// PJ Salta pages
const CarpetasVerificadasPjSalta = Loadable(lazyWithRetry(() => import("pages/admin/pjsalta/CarpetasVerificadasPjSalta")));
const CarpetasNoVerificadasPjSalta = Loadable(lazyWithRetry(() => import("pages/admin/pjsalta/CarpetasNoVerificadasPjSalta")));
const CarpetasPivotsPjSalta = Loadable(lazyWithRetry(() => import("pages/admin/pjsalta/CarpetasPivotsPjSalta")));
const PjSaltaWorkersConfig = Loadable(lazyWithRetry(() => import("pages/admin/pjsalta/workers")));
// PJ Catamarca pages
const CarpetasVerificadasPjCatamarca = Loadable(lazyWithRetry(() => import("pages/admin/pjcatamarca/CarpetasVerificadasPjCatamarca")));
const CarpetasNoVerificadasPjCatamarca = Loadable(lazyWithRetry(() => import("pages/admin/pjcatamarca/CarpetasNoVerificadasPjCatamarca")));
const CarpetasPivotsPjCatamarca = Loadable(lazyWithRetry(() => import("pages/admin/pjcatamarca/CarpetasPivotsPjCatamarca")));
const PjCatamarcaWorkersConfig = Loadable(lazyWithRetry(() => import("pages/admin/pjcatamarca/workers")));
// PJ Mendoza pages
const CarpetasVerificadasPjMendoza = Loadable(lazyWithRetry(() => import("pages/admin/pjmendoza/CarpetasVerificadasPjMendoza")));
const CarpetasNoVerificadasPjMendoza = Loadable(lazyWithRetry(() => import("pages/admin/pjmendoza/CarpetasNoVerificadasPjMendoza")));
const CarpetasPivotsPjMendoza = Loadable(lazyWithRetry(() => import("pages/admin/pjmendoza/CarpetasPivotsPjMendoza")));
const PjMendozaWorkersConfig = Loadable(lazyWithRetry(() => import("pages/admin/pjmendoza/workers")));
const RagWorkersPage = Loadable(lazyWithRetry(() => import("pages/admin/rag-workers")));
const CorpusWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/corpus")));
const EscritosWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/escritos")));
const MovimientosWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/movimientos")));
const SentenciasWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/sentencias")));
const LiquidacionWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/liquidacion")));
const PlazosWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/plazos")));
const PlazosDatasetWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/plazos-dataset")));
const PlazosPage = Loadable(lazyWithRetry(() => import("pages/admin/causas/plazos")));
const SaijWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/saij")));
const SecloWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/seclo")));
const InfolegWorkersPage = Loadable(lazyWithRetry(() => import("pages/admin/workers/infoleg")));
const InfolegNormasPage = Loadable(lazyWithRetry(() => import("pages/admin/normas/infoleg")));
const JurisprudenciaSaijPage = Loadable(lazyWithRetry(() => import("pages/recursos/jurisprudencia-saij")));
const JurisprudenciaPjnPage = Loadable(lazyWithRetry(() => import("pages/recursos/jurisprudencia-pjn")));
const JurisprudenciaPjnAskPage = Loadable(lazyWithRetry(() => import("pages/recursos/jurisprudencia-pjn-ask")));

// Subscriptions pages
const StripeWebhooks = Loadable(lazyWithRetry(() => import("pages/subscriptions/StripeWebhooks")));
const CronConfig = Loadable(lazyWithRetry(() => import("pages/subscriptions/CronConfig")));
const TrialsPage = Loadable(lazyWithRetry(() => import("pages/admin/subscriptions/Trials")));

// Usuarios pages
const Suscripciones = Loadable(lazyWithRetry(() => import("pages/usuarios/Suscripciones")));
const PaymentFailures = Loadable(lazyWithRetry(() => import("pages/usuarios/PaymentFailures")));

// Server Status
const ServerStatus = Loadable(lazyWithRetry(() => import("pages/admin/server-status")));

// Infrastructure (Cloud Failover)
const InfrastructurePage = Loadable(lazyWithRetry(() => import("pages/admin/infrastructure")));
const DatabasesMonitoring = Loadable(lazyWithRetry(() => import("pages/admin/infrastructure/databases")));
const PortalesStatus = Loadable(lazyWithRetry(() => import("pages/admin/infrastructure/portales")));
const DataFlowPage = Loadable(lazyWithRetry(() => import("pages/admin/infrastructure/dataflow")));

// Marketing pages
const MailingCampaigns = Loadable(lazyWithRetry(() => import("pages/admin/marketing/mailing")));
const EmailComposer = Loadable(lazyWithRetry(() => import("pages/admin/marketing/composer")));
const EmailTemplates = Loadable(lazyWithRetry(() => import("pages/admin/marketing/templates")));
const EmailModules = Loadable(lazyWithRetry(() => import("pages/admin/marketing/modules")));
const MarketingContacts = Loadable(lazyWithRetry(() => import("pages/admin/marketing/contacts")));
const MarketingSuppression = Loadable(lazyWithRetry(() => import("pages/admin/marketing/suppression")));

// Social pages
const SocialStudio = Loadable(lazyWithRetry(() => import("pages/admin/social")));
const ArticulosBlog = Loadable(lazyWithRetry(() => import("pages/admin/social/articulos")));

// Plans page
const PlansManagement = Loadable(lazyWithRetry(() => import("pages/admin/plans")));
const PromotionsManagement = Loadable(lazyWithRetry(() => import("pages/admin/promotions")));

// Users page
const UsersManagement = Loadable(lazyWithRetry(() => import("pages/admin/users")));
const TokenConfig = Loadable(lazyWithRetry(() => import("pages/admin/users/TokenConfig")));
const EmailLogs = Loadable(lazyWithRetry(() => import("pages/admin/users/EmailLogs")));
const SystemLogs = Loadable(lazyWithRetry(() => import("pages/admin/logs/SystemLogs")));
const ServiceHealthDashboard = Loadable(lazyWithRetry(() => import("pages/admin/logs/ServiceHealthDashboard")));
const OnboardingAnalytics = Loadable(lazyWithRetry(() => import("pages/admin/users/OnboardingAnalytics")));
const UserResources = Loadable(lazyWithRetry(() => import("pages/admin/users/resources")));
const UsersDashboard = Loadable(lazyWithRetry(() => import("pages/admin/users/dashboard")));
const FeatureGrants = Loadable(lazyWithRetry(() => import("pages/admin/users/FeatureGrants")));

// Recursos pages
const Jurisprudencia = Loadable(lazyWithRetry(() => import("pages/recursos/Jurisprudencia")));
const TasasInteres = Loadable(lazyWithRetry(() => import("pages/recursos/tasas")));
const DatosPrevisionales = Loadable(lazyWithRetry(() => import("pages/recursos/datos-previsionales")));
const ValoresArancelarios = Loadable(lazyWithRetry(() => import("pages/recursos/valores-arancelarios")));
const Efemerides = Loadable(lazyWithRetry(() => import("pages/recursos/efemerides")));

// Documentation pages
const LegalDocuments = Loadable(lazyWithRetry(() => import("pages/documentation/legal-documents")));

// Notifications pages
const NotificationsMonitoring = Loadable(lazyWithRetry(() => import("pages/admin/notifications")));

// Dashboard page
const Dashboard = Loadable(lazyWithRetry(() => import("pages/admin/dashboard")));

// GA4 Analytics page
const GA4Analytics = Loadable(lazyWithRetry(() => import("pages/admin/ga4-analytics")));

// Funnel Snapshots page (data persistida por la-ads cron)
const FunnelSnapshots = Loadable(lazyWithRetry(() => import("pages/admin/funnel-snapshots")));

// Expenses page
const ExpensesPage = Loadable(lazyWithRetry(() => import("pages/admin/expenses")));

// Support page
const SupportContactsPage = Loadable(lazyWithRetry(() => import("pages/admin/support")));

// Feedback page
const FeedbackAdminPage = Loadable(lazyWithRetry(() => import("pages/admin/feedback")));

// Surveys page
const SurveysAdminPage = Loadable(lazyWithRetry(() => import("pages/admin/surveys")));

// Feedback invites page
const FeedbackInvitesPage = Loadable(lazyWithRetry(() => import("pages/admin/feedback-invites")));

// Tasks page
const AdminTasksPage = Loadable(lazyWithRetry(() => import("pages/admin/tasks")));

// Folders page
const FoldersPage = Loadable(lazyWithRetry(() => import("pages/admin/folders")));

// Scraper worker page
const ScraperWorkerPage = Loadable(lazyWithRetry(() => import("pages/admin/scraper")));

// Postal tracking page
const PostalTrackingPage = Loadable(lazyWithRetry(() => import("pages/admin/postal-tracking")));

// Groups page
const GroupsPage = Loadable(lazyWithRetry(() => import("pages/admin/groups")));

// Integrations page
const IntegrationsPage = Loadable(lazyWithRetry(() => import("pages/admin/integrations")));
const MovementLinkAnalytics = Loadable(lazyWithRetry(() => import("pages/admin/integrations/MovementLinkAnalytics")));

// PDF Templates page
const PdfTemplatesPage = Loadable(lazyWithRetry(() => import("pages/admin/pdf-templates")));

// SECLO page
const SecloPage = Loadable(lazyWithRetry(() => import("pages/admin/seclo")));

// ==============================|| ROUTES ||============================== //

export default function Routes() {
	return useRoutes([
		{
			path: "/",
			children: [
				{
					path: "/",
					element: <Navigate to="/login" replace />,
				},
				{
					path: "login",
					element: (
						<GuestGuard>
							<AuthLogin />
						</GuestGuard>
					),
				},
				{
					path: "code-verification",
					element: (
						<GuestGuard>
							<AuthCodeVerification />
						</GuestGuard>
					),
				},
			],
		},
		{
			path: "/",
			element: (
				<AuthGuard>
					<MainLayout />
				</AuthGuard>
			),
			children: [
				{
					path: "dashboard",
					element: (
						<AdminRoleGuard>
							<Dashboard />
						</AdminRoleGuard>
					),
				},
				{
					path: "admin",
					children: [
						{
							path: "",
							element: <Navigate to="/admin/causas/workers" replace />,
						},
						{
							path: "usuarios/suscripciones",
							element: (
								<AdminRoleGuard>
									<Suscripciones />
								</AdminRoleGuard>
							),
						},
						{
							path: "usuarios/payment-failures",
							element: (
								<AdminRoleGuard>
									<PaymentFailures />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/workers",
							element: (
								<AdminRoleGuard>
									<WorkersPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/mev",
							element: (
								<AdminRoleGuard>
									<WorkersMEVPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/mev-login-failures",
							element: (
								<AdminRoleGuard>
									<MEVLoginFailuresPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/logs",
							element: (
								<AdminRoleGuard>
									<WorkerLogsPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/email-verification",
							element: (
								<AdminRoleGuard>
									<EmailVerificationWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/rag",
							element: (
								<AdminRoleGuard>
									<RagWorkersPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/corpus",
							element: (
								<AdminRoleGuard>
									<CorpusWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/escritos",
							element: (
								<AdminRoleGuard>
									<EscritosWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/movimientos",
							element: (
								<AdminRoleGuard>
									<MovimientosWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/sentencias",
							element: (
								<AdminRoleGuard>
									<SentenciasWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/liquidacion",
							element: (
								<AdminRoleGuard>
									<LiquidacionWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/plazos",
							element: (
								<AdminRoleGuard>
									<PlazosWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/plazos-dataset",
							element: (
								<AdminRoleGuard>
									<PlazosDatasetWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/saij",
							element: (
								<AdminRoleGuard>
									<SaijWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/seclo",
							element: (
								<AdminRoleGuard>
									<SecloWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/infoleg",
							element: (
								<AdminRoleGuard>
									<InfolegWorkersPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "normas/infoleg",
							element: (
								<AdminRoleGuard>
									<InfolegNormasPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/credentials",
							element: (
								<AdminRoleGuard>
									<CredencialesPJN />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/verified",
							element: (
								<AdminRoleGuard>
									<CarpetasVerificadas />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/verified-app",
							element: (
								<AdminRoleGuard>
									<CarpetasVerificadasApp />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/non-verified",
							element: (
								<AdminRoleGuard>
									<CarpetasNoVerificadas />
								</AdminRoleGuard>
							),
						},
						{
							path: "flujos",
							element: (
								<AdminRoleGuard>
									<FlujosEcosistema />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/flujos",
							element: (
								<AdminRoleGuard>
									<FlujosCausas />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/pending",
							element: (
								<AdminRoleGuard>
									<CausasPendientes />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/synced-credentials",
							element: (
								<AdminRoleGuard>
									<CausasSyncCredentials />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/update-eligible",
							element: (
								<AdminRoleGuard>
									<CausasUpdateEligible />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/trayectorias",
							element: (
								<AdminRoleGuard>
									<TrayectoriasPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/etapas",
							element: (
								<AdminRoleGuard>
									<EtapasPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/etapa-stats",
							element: (
								<AdminRoleGuard>
									<EtapaStatsPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/etapa-arbol",
							element: (
								<AdminRoleGuard>
									<EtapaArbolPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/etiquetado",
							element: (
								<AdminRoleGuard>
									<EtiquetadoDatasetPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/etiquetado/:fuero/:id",
							element: (
								<AdminRoleGuard>
									<EtiquetadoEditorPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "causas/plazos",
							element: (
								<AdminRoleGuard>
									<PlazosPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "mev/scba-credentials",
							element: (
								<AdminRoleGuard>
									<CredencialesSCBA />
								</AdminRoleGuard>
							),
						},
						{
							path: "mev/verified-app",
							element: (
								<AdminRoleGuard>
									<CarpetasMEVVerificadas />
								</AdminRoleGuard>
							),
						},
						{
							path: "mev/non-verified",
							element: (
								<AdminRoleGuard>
									<CarpetasMEVNoVerificadas />
								</AdminRoleGuard>
							),
						},
						{
							path: "mev/causes-by-credential",
							element: (
								<AdminRoleGuard>
									<CausasMEVByCredential />
								</AdminRoleGuard>
							),
						},
						{
							path: "eje/verified-app",
							element: (
								<AdminRoleGuard>
									<CarpetasVerificadasEje />
								</AdminRoleGuard>
							),
						},
						{
							path: "eje/non-verified",
							element: (
								<AdminRoleGuard>
									<CarpetasNoVerificadasEje />
								</AdminRoleGuard>
							),
						},
						{
							path: "eje/pivots",
							element: (
								<AdminRoleGuard>
									<CarpetasPivotsEje />
								</AdminRoleGuard>
							),
						},
						{
							path: "eje/workers",
							element: (
								<AdminRoleGuard>
									<EjeWorkersConfig />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjsalta/verified-app",
							element: (
								<AdminRoleGuard>
									<CarpetasVerificadasPjSalta />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjsalta/non-verified",
							element: (
								<AdminRoleGuard>
									<CarpetasNoVerificadasPjSalta />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjsalta/pivots",
							element: (
								<AdminRoleGuard>
									<CarpetasPivotsPjSalta />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjsalta/workers",
							element: (
								<AdminRoleGuard>
									<PjSaltaWorkersConfig />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjcatamarca/verified-app",
							element: (
								<AdminRoleGuard>
									<CarpetasVerificadasPjCatamarca />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjcatamarca/non-verified",
							element: (
								<AdminRoleGuard>
									<CarpetasNoVerificadasPjCatamarca />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjcatamarca/pivots",
							element: (
								<AdminRoleGuard>
									<CarpetasPivotsPjCatamarca />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjcatamarca/workers",
							element: (
								<AdminRoleGuard>
									<PjCatamarcaWorkersConfig />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjmendoza/verified-app",
							element: (
								<AdminRoleGuard>
									<CarpetasVerificadasPjMendoza />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjmendoza/non-verified",
							element: (
								<AdminRoleGuard>
									<CarpetasNoVerificadasPjMendoza />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjmendoza/pivots",
							element: (
								<AdminRoleGuard>
									<CarpetasPivotsPjMendoza />
								</AdminRoleGuard>
							),
						},
						{
							path: "pjmendoza/workers",
							element: (
								<AdminRoleGuard>
									<PjMendozaWorkersConfig />
								</AdminRoleGuard>
							),
						},
						{
							path: "subscriptions/stripe-webhooks",
							element: (
								<AdminRoleGuard>
									<StripeWebhooks />
								</AdminRoleGuard>
							),
						},
						{
							path: "subscriptions/cron-config",
							element: (
								<AdminRoleGuard>
									<CronConfig />
								</AdminRoleGuard>
							),
						},
						{
							path: "subscriptions/trials",
							element: (
								<AdminRoleGuard>
									<TrialsPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "server-status",
							element: (
								<AdminRoleGuard>
									<ServerStatus />
								</AdminRoleGuard>
							),
						},
						{
							path: "marketing/mailing",
							element: (
								<AdminRoleGuard>
									<MailingCampaigns />
								</AdminRoleGuard>
							),
						},
						{
							path: "marketing/composer",
							element: (
								<AdminRoleGuard>
									<EmailComposer />
								</AdminRoleGuard>
							),
						},
						{
							path: "marketing/templates",
							element: (
								<AdminRoleGuard>
									<EmailTemplates />
								</AdminRoleGuard>
							),
						},
						{
							path: "marketing/modules",
							element: (
								<AdminRoleGuard>
									<EmailModules />
								</AdminRoleGuard>
							),
						},
						{
							path: "marketing/contacts",
							element: (
								<AdminRoleGuard>
									<MarketingContacts />
								</AdminRoleGuard>
							),
						},
						{
							path: "marketing/suppression",
							element: (
								<AdminRoleGuard>
									<MarketingSuppression />
								</AdminRoleGuard>
							),
						},
						{
							path: "social/studio",
							element: (
								<AdminRoleGuard>
									<SocialStudio />
								</AdminRoleGuard>
							),
						},
						{
							path: "social/articulos",
							element: (
								<AdminRoleGuard>
									<ArticulosBlog />
								</AdminRoleGuard>
							),
						},
						{
							path: "plans",
							element: (
								<AdminRoleGuard>
									<PlansManagement />
								</AdminRoleGuard>
							),
						},
						{
							path: "plans/promotions",
							element: (
								<AdminRoleGuard>
									<PromotionsManagement />
								</AdminRoleGuard>
							),
						},
						{
							path: "users",
							element: (
								<AdminRoleGuard>
									<UsersManagement />
								</AdminRoleGuard>
							),
						},
						{
							path: "users/dashboard",
							element: (
								<AdminRoleGuard>
									<UsersDashboard />
								</AdminRoleGuard>
							),
						},
						{
							path: "users/config",
							element: (
								<AdminRoleGuard>
									<TokenConfig />
								</AdminRoleGuard>
							),
						},
						{
							path: "users/email-logs",
							element: (
								<AdminRoleGuard>
									<EmailLogs />
								</AdminRoleGuard>
							),
						},
						{
							path: "users/onboarding",
							element: (
								<AdminRoleGuard>
									<OnboardingAnalytics />
								</AdminRoleGuard>
							),
						},
						{
							path: "users/resources",
							element: (
								<AdminRoleGuard>
									<UserResources />
								</AdminRoleGuard>
							),
						},
						{
							path: "users/feature-grants",
							element: (
								<AdminRoleGuard>
									<FeatureGrants />
								</AdminRoleGuard>
							),
						},
						{
							path: "notifications",
							element: (
								<AdminRoleGuard>
									<NotificationsMonitoring />
								</AdminRoleGuard>
							),
						},
						{
							// Reemplazada por el centro de notificaciones (tab "Movimientos judiciales")
							path: "notifications/judicial-movements",
							element: <Navigate to="/admin/notifications?tab=judicial" replace />,
						},
						{
							// Reemplazada por el tab "Recordatorios del usuario"
							path: "notifications/folder-inactivity",
							element: <Navigate to="/admin/notifications?tab=recordatorios" replace />,
						},
						{
							// Reemplazada por el tab "Diagnóstico"
							path: "notifications/flow",
							element: <Navigate to="/admin/notifications?tab=diagnostico" replace />,
						},
						{
							path: "ga4-analytics",
							element: (
								<AdminRoleGuard>
									<GA4Analytics />
								</AdminRoleGuard>
							),
						},
						{
							path: "funnel-snapshots",
							element: (
								<AdminRoleGuard>
									<FunnelSnapshots />
								</AdminRoleGuard>
							),
						},
						{
							path: "expenses",
							element: (
								<AdminRoleGuard>
									<ExpensesPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "support",
							element: (
								<AdminRoleGuard>
									<SupportContactsPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "feedback",
							element: (
								<AdminRoleGuard>
									<FeedbackAdminPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "surveys",
							element: (
								<AdminRoleGuard>
									<SurveysAdminPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "feedback-invites",
							element: (
								<AdminRoleGuard>
									<FeedbackInvitesPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "tasks",
							element: (
								<AdminRoleGuard>
									<AdminTasksPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "folders",
							element: (
								<AdminRoleGuard>
									<FoldersPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "infrastructure",
							element: (
								<AdminRoleGuard>
									<InfrastructurePage />
								</AdminRoleGuard>
							),
						},
						{
							path: "infrastructure/databases",
							element: (
								<AdminRoleGuard>
									<DatabasesMonitoring />
								</AdminRoleGuard>
							),
						},
						{
							path: "infrastructure/portales",
							element: (
								<AdminRoleGuard>
									<PortalesStatus />
								</AdminRoleGuard>
							),
						},
						{
							path: "infrastructure/dataflow",
							element: (
								<AdminRoleGuard>
									<DataFlowPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "logs",
							element: (
								<AdminRoleGuard>
									<SystemLogs />
								</AdminRoleGuard>
							),
						},
						{
							path: "logs/health",
							element: (
								<AdminRoleGuard>
									<ServiceHealthDashboard />
								</AdminRoleGuard>
							),
						},
						{
							path: "workers/scraper",
							element: (
								<AdminRoleGuard>
									<ScraperWorkerPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "postal-tracking",
							element: (
								<AdminRoleGuard>
									<PostalTrackingPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "groups",
							element: (
								<AdminRoleGuard>
									<GroupsPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "integrations",
							element: (
								<AdminRoleGuard>
									<IntegrationsPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "integrations/movement-link-analytics",
							element: (
								<AdminRoleGuard>
									<MovementLinkAnalytics />
								</AdminRoleGuard>
							),
						},
						{
							path: "pdf-templates",
							element: (
								<AdminRoleGuard>
									<PdfTemplatesPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "seclo",
							element: (
								<AdminRoleGuard>
									<SecloPage />
								</AdminRoleGuard>
							),
						},
					],
				},
				{
					path: "recursos",
					children: [
						{
							path: "jurisprudencia",
							element: (
								<AdminRoleGuard>
									<Jurisprudencia />
								</AdminRoleGuard>
							),
						},
						{
							path: "jurisprudencia/saij",
							element: (
								<AdminRoleGuard>
									<JurisprudenciaSaijPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "jurisprudencia/pjn",
							element: (
								<AdminRoleGuard>
									<JurisprudenciaPjnPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "jurisprudencia/pjn-ask",
							element: (
								<AdminRoleGuard>
									<JurisprudenciaPjnAskPage />
								</AdminRoleGuard>
							),
						},
						{
							path: "tasas",
							element: (
								<AdminRoleGuard>
									<TasasInteres />
								</AdminRoleGuard>
							),
						},
						{
							path: "datos-previsionales",
							element: (
								<AdminRoleGuard>
									<DatosPrevisionales />
								</AdminRoleGuard>
							),
						},
						{
							path: "valores-arancelarios",
							element: (
								<AdminRoleGuard>
									<ValoresArancelarios />
								</AdminRoleGuard>
							),
						},
						{
							path: "efemerides",
							element: (
								<AdminRoleGuard>
									<Efemerides />
								</AdminRoleGuard>
							),
						},
					],
				},
				{
					path: "documentation",
					children: [
						{
							path: "legal-documents",
							element: (
								<AdminRoleGuard>
									<LegalDocuments />
								</AdminRoleGuard>
							),
						},
					],
				},
			],
		},
		{
			path: "*",
			element: <Navigate to="/login" replace />,
		},
	]);
}
