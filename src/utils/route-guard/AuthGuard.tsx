import React from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";

// ==============================|| AUTH GUARD ||============================== //

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
	const { isLoggedIn, needsVerification } = useAuth();

	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		if (isLoggedIn && needsVerification) {
			navigate("/code-verification", { replace: true });
		} else if (!isLoggedIn) {
			navigate("/login", {
				state: { from: location.pathname },
				replace: true,
			});
		}
	}, [isLoggedIn, needsVerification, navigate, location]);

	if (!isLoggedIn || needsVerification) {
		return null;
	}

	return <>{children}</>;
};

export default AuthGuard;
