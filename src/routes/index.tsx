import { lazy } from "react";
import { useRoutes, Navigate } from "react-router-dom";
import Loadable from "components/Loadable";

// Route guards
import GuestGuard from "utils/route-guard/GuestGuard";
import AuthGuard from "utils/route-guard/AuthGuard";
import AdminRoleGuard from "utils/route-guard/AdminRoleGuard";

// Layout
import MainLayout from "layout/MainLayout";

// Auth pages
const AuthLogin = Loadable(lazy(() => import("pages/auth/login")));
const AuthCodeVerification = Loadable(lazy(() => import("pages/auth/code-verification")));

// Admin pages
const WorkersPage = Loadable(lazy(() => import("pages/admin/causas/workers")));
const WorkersMEVPage = Loadable(lazy(() => import("pages/workers/WorkersMEV")));
const WorkerLogsPage = Loadable(lazy(() => import("pages/workers/WorkerLogs")));
const EmailVerificationWorkerPage = Loadable(lazy(() => import("pages/admin/workers/email-verification")));
const CarpetasVerificadas = Loadable(lazy(() => import("pages/admin/causas/CarpetasVerificadas")));
const CarpetasVerificadasApp = Loadable(lazy(() => import("pages/admin/causas/CarpetasVerificadasApp")));
const CarpetasNoVerificadas = Loadable(lazy(() => import("pages/admin/causas/CarpetasNoVerificadas")));

// MEV pages
const CarpetasMEVVerificadas = Loadable(lazy(() => import("pages/admin/mev/CarpetasMEVVerificadas")));
const CarpetasMEVNoVerificadas = Loadable(lazy(() => import("pages/admin/mev/CarpetasMEVNoVerificadas")));

// Subscriptions pages
const StripeWebhooks = Loadable(lazy(() => import("pages/subscriptions/StripeWebhooks")));
const CronConfig = Loadable(lazy(() => import("pages/subscriptions/CronConfig")));

// Usuarios pages
const Suscripciones = Loadable(lazy(() => import("pages/usuarios/Suscripciones")));

// Server Status
const ServerStatus = Loadable(lazy(() => import("pages/admin/server-status")));

// Marketing pages
const MailingCampaigns = Loadable(lazy(() => import("pages/admin/marketing/mailing")));
const EmailTemplates = Loadable(lazy(() => import("pages/admin/marketing/templates")));
const EmailModules = Loadable(lazy(() => import("pages/admin/marketing/modules")));
const MarketingContacts = Loadable(lazy(() => import("pages/admin/marketing/contacts")));
const MarketingSuppression = Loadable(lazy(() => import("pages/admin/marketing/suppression")));

// Plans page
const PlansManagement = Loadable(lazy(() => import("pages/admin/plans")));
const PromotionsManagement = Loadable(lazy(() => import("pages/admin/promotions")));

// Users page
const UsersManagement = Loadable(lazy(() => import("pages/admin/users")));
const TokenConfig = Loadable(lazy(() => import("pages/admin/users/TokenConfig")));
const EmailLogs = Loadable(lazy(() => import("pages/admin/users/EmailLogs")));
const OnboardingAnalytics = Loadable(lazy(() => import("pages/admin/users/OnboardingAnalytics")));
const UserResources = Loadable(lazy(() => import("pages/admin/users/resources")));

// Recursos pages
const Jurisprudencia = Loadable(lazy(() => import("pages/recursos/Jurisprudencia")));

// Documentation pages
const LegalDocuments = Loadable(lazy(() => import("pages/documentation/legal-documents")));

// Notifications pages
const NotificationsMonitoring = Loadable(lazy(() => import("pages/admin/notifications")));
const NotificationsJudicialMovements = Loadable(lazy(() => import("pages/admin/notifications/judicial-movements")));
const FolderInactivity = Loadable(lazy(() => import("pages/admin/notifications/folder-inactivity")));

// Dashboard page
const Dashboard = Loadable(lazy(() => import("pages/admin/dashboard")));

// GA4 Analytics page
const GA4Analytics = Loadable(lazy(() => import("pages/admin/ga4-analytics")));

// Expenses page
const ExpensesPage = Loadable(lazy(() => import("pages/admin/expenses")));

// Support page
const SupportContactsPage = Loadable(lazy(() => import("pages/admin/support")));

// Tasks page
const AdminTasksPage = Loadable(lazy(() => import("pages/admin/tasks")));

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
							path: "notifications",
							element: (
								<AdminRoleGuard>
									<NotificationsMonitoring />
								</AdminRoleGuard>
							),
						},
						{
							path: "notifications/judicial-movements",
							element: (
								<AdminRoleGuard>
									<NotificationsJudicialMovements />
								</AdminRoleGuard>
							),
						},
						{
							path: "notifications/folder-inactivity",
							element: (
								<AdminRoleGuard>
									<FolderInactivity />
								</AdminRoleGuard>
							),
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
							path: "tasks",
							element: (
								<AdminRoleGuard>
									<AdminTasksPage />
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
