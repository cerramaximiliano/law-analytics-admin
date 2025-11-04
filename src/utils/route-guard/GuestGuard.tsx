import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// project-imports
import { APP_DEFAULT_PATH } from "config";
import useAuth from "hooks/useAuth";

// types
import { GuardProps } from "types/auth";

// ==============================|| GUEST GUARD ||============================== //

const GuestGuard = ({ children }: GuardProps) => {
	const { isLoggedIn } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		// Si es la página de verificación de código, permitir acceso incluso si está autenticado
		if (location.pathname === "/code-verification") {
			return;
		}

		// De lo contrario, redirigir a la ruta por defecto si está autenticado
		if (isLoggedIn) {
			navigate(location?.state?.from ? location?.state?.from : APP_DEFAULT_PATH, {
				state: {
					from: "",
				},
				replace: true,
			});
		}
	}, [isLoggedIn, navigate, location]);

	return children;
};

export default GuestGuard;
