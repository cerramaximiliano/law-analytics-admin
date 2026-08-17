import React from "react";
import { ElementType, Suspense } from "react";

// project-imports
import Loader from "./Loader";
import RouteErrorBoundary from "./RouteErrorBoundary";

// ==============================|| LOADABLE - LAZY LOADING ||============================== //

// El boundary envuelve al Suspense: cubre tanto un fallo de render de la vista
// como un rechazo del import dinámico que lazyWithRetry no haya podido salvar.
const Loadable = (Component: ElementType) => (props: any) =>
	(
		<RouteErrorBoundary>
			<Suspense fallback={<Loader />}>
				<Component {...props} />
			</Suspense>
		</RouteErrorBoundary>
	);

export default Loadable;
