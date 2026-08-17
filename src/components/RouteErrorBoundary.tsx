import React, { Component, ErrorInfo, ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography, alpha } from "@mui/material";
import { Refresh, Warning2 } from "iconsax-react";

// Hasta ahora un error en el render de una vista dejaba la pantalla en blanco
// sin ningún mensaje: Loadable solo envuelve en <Suspense>, que cubre la carga
// pero no las excepciones. Este boundary muestra qué pasó y ofrece recargar,
// para que un bug futuro sea diagnosticable en vez de mudo.
interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

class RouteErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		// Queda en consola para poder diagnosticarlo desde el navegador del admin.
		console.error("[RouteErrorBoundary] Error al renderizar la vista:", error, info.componentStack);
	}

	handleReload = () => window.location.reload();

	render() {
		const { error } = this.state;
		if (!error) return this.props.children;

		return (
			<Paper
				elevation={0}
				sx={{
					p: { xs: 3, sm: 5 },
					borderRadius: 2,
					border: (t) => `1px solid ${alpha(t.palette.error.main, 0.4)}`,
					textAlign: "center",
				}}
			>
				<Box
					sx={{
						width: 44,
						height: 44,
						mx: "auto",
						mb: 2,
						borderRadius: 1.5,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						bgcolor: (t) => alpha(t.palette.error.main, t.palette.mode === "dark" ? 0.18 : 0.1),
						border: (t) => `1px solid ${alpha(t.palette.error.main, t.palette.mode === "dark" ? 0.32 : 0.18)}`,
						color: "error.main",
					}}
				>
					<Warning2 size={20} />
				</Box>
				<Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
					No pudimos mostrar esta vista
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
					La vista falló al renderizar. El detalle quedó en la consola del navegador.
				</Typography>
				<Typography
					variant="caption"
					color="text.secondary"
					sx={{
						display: "block",
						mb: 2.5,
						fontFamily: "monospace",
						wordBreak: "break-word",
						maxWidth: 560,
						mx: "auto",
					}}
				>
					{error.message}
				</Typography>
				<Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
					<Button variant="contained" size="small" startIcon={<Refresh size={16} />} onClick={this.handleReload}>
						Recargar
					</Button>
					<Button variant="outlined" size="small" onClick={() => window.history.back()}>
						Volver
					</Button>
				</Stack>
			</Paper>
		);
	}
}

export default RouteErrorBoundary;
