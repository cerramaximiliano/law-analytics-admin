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
							path: "causas/workers",
							element: (
								<AdminRoleGuard>
									<WorkersPage />
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
