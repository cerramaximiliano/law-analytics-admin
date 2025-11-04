import { useContext } from "react";
import { AuthContext } from "contexts/ServerContext";
import { ServerContextType } from "types/auth";

// ==============================|| AUTH HOOK ||============================== //

const useAuth = (): ServerContextType => {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}

	return context;
};

export default useAuth;
