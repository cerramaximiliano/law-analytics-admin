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
const CarpetasVerificadas = Loadable(lazy(() => import("pages/admin/causas/CarpetasVerificadas")));
const CarpetasVerificadasApp = Loadable(lazy(() => import("pages/admin/causas/CarpetasVerificadasApp")));
const CarpetasNoVerificadas = Loadable(lazy(() => import("pages/admin/causas/CarpetasNoVerificadas")));

// MEV pages
const CarpetasMEVVerificadas = Loadable(lazy(() => import("pages/admin/mev/CarpetasMEVVerificadas")));
const CarpetasMEVNoVerificadas = Loadable(lazy(() => import("pages/admin/mev/CarpetasMEVNoVerificadas")));

// Subscriptions pages
const StripeWebhooks = Loadable(lazy(() => import("pages/subscriptions/StripeWebhooks")));

// Usuarios pages
const Suscripciones = Loadable(lazy(() => import("pages/usuarios/Suscripciones")));

// Server Status
const ServerStatus = Loadable(lazy(() => import("pages/admin/server-status")));

// Marketing pages
const MailingCampaigns = Loadable(lazy(() => import("pages/admin/marketing/mailing")));
const EmailTemplates = Loadable(lazy(() => import("pages/admin/marketing/templates")));
const MarketingContacts = Loadable(lazy(() => import("pages/admin/marketing/contacts")));

// Placeholder pages
const Dashboard = () => (
	<div style={{ padding: "2rem", textAlign: "center" }}>
		<h1>Dashboard</h1>
		<p>Panel de administración - Dashboard</p>
		<p style={{ color: "#666", marginTop: "1rem" }}>✅ Proyecto Completado - Fase 4</p>
	</div>
);

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
					element: <Dashboard />,
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
							path: "marketing/contacts",
							element: (
								<AdminRoleGuard>
									<MarketingContacts />
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
