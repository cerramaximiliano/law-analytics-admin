// Placeholder for BreadcrumbContext - not used in admin project
import { createContext, useContext } from "react";

export const BreadcrumbContext = createContext({});

// Placeholder hook for compatibility
export const useBreadcrumb = () => {
	return useContext(BreadcrumbContext);
};

export default BreadcrumbContext;
