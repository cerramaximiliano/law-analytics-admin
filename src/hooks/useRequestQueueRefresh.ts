import { useEffect, useCallback } from "react";

/**
 * Hook personalizado que escucha cuando se procesan las peticiones encoladas
 * y ejecuta una función de callback para refrescar los datos del componente.
 *
 * @param refreshCallback - Función que se ejecuta cuando se procesan las peticiones
 * @param dependencies - Array de dependencias para el callback (opcional)
 */
export const useRequestQueueRefresh = (refreshCallback: () => void | Promise<void>, dependencies: React.DependencyList = []) => {
	const memoizedCallback = useCallback(refreshCallback, dependencies);

	useEffect(() => {
		const handleQueueProcessed = () => {
			// Ejecutar el callback después de un pequeño delay para asegurar
			// que todas las peticiones se hayan completado
			setTimeout(() => {
				memoizedCallback();
			}, 100);
		};

		// Escuchar el evento personalizado
		window.addEventListener("requestQueueProcessed", handleQueueProcessed);

		// Limpiar el listener al desmontar
		return () => {
			window.removeEventListener("requestQueueProcessed", handleQueueProcessed);
		};
	}, [memoizedCallback]);
};
