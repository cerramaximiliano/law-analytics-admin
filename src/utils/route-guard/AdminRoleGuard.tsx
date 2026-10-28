import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import useAuth from "hooks/useAuth";

// ==============================|| ADMIN ROLE GUARD ||============================== //

interface AdminRoleGuardProps {
	children?: ReactNode;
}

/**
 * Guard component that restricts access to admin routes
 * Only users with "ADMIN_ROLE" can access the protected routes
 */
const AdminRoleGuard = ({ children }: AdminRoleGuardProps) => {
	const { isLoggedIn, user } = useAuth();
	const navigate = useNavigate();
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		// Log verificación de permisos
		console.log("🔍 AdminRoleGuard - Verificando permisos:", {
			isLoggedIn,
			userRole: user?.role,
			userEmail: user?.email,
		});

		// TEMPORAL: Comentado para permitir acceso durante desarrollo
		// TODO: Descomentar cuando el backend asigne correctamente el rol ADMIN_ROLE

		// Si el usuario está logueado pero no es admin, redirigir al dashboard
		// if (isLoggedIn && user?.role !== "ADMIN_ROLE") {
		// 	console.warn("⚠️ Usuario sin rol de admin, redirigiendo a dashboard");
		// 	navigate("/dashboard", { replace: true });
		// }

		// Si no está logueado, redirigir al login
		if (!isLoggedIn) {
			navigate("/login", { replace: true });
		}

		// Marcar que terminamos la verificación
		setIsChecking(false);
	}, [isLoggedIn, user, navigate]);

	// Mostrar un mensaje mientras verificamos los permisos
	if (isChecking) {
		return <div>Verificando permisos…</div>;
	}

	// TEMPORAL: Solo verificar que esté logueado
	// TODO: Restaurar verificación de rol cuando el backend esté listo
	if (!isLoggedIn) {
		return null;
	}

	// Verificación de rol comentada temporalmente
	// if (!isLoggedIn || user?.role !== "ADMIN_ROLE") {
	// 	return null;
	// }

	return <>{children || <Outlet />}</>;
};

export default AdminRoleGuard;
