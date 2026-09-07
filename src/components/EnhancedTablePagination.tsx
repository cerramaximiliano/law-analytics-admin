import { useState } from "react";
import { TablePagination, Box, TextField, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import { Send2 } from "iconsax-react";

/**
 * El paginador con salto directo a una página.
 *
 * El campo "Ir a página" existe para las tablas largas del panel, donde llegar
 * a la página 40 a fuerza de flechas no es una opción. Pero es caro en ancho, y
 * en un teléfono competía por lugar con lo único imprescindible: las flechas y
 * el rango. Ahora aparece solo cuando sirve —de sm para arriba y si hay más de
 * una página—, así que en mobile y en tablas cortas el paginador queda limpio.
 *
 * Las etiquetas en castellano y los botones de primera/última página ya no se
 * declaran acá: son el default del tema (ver overrides/TablePagination), que
 * los aplica también a los paginadores sueltos del resto del panel.
 */
interface EnhancedTablePaginationProps {
	count: number;
	page: number;
	rowsPerPage: number;
	rowsPerPageOptions: number[];
	onPageChange: (event: unknown, newPage: number) => void;
	onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EnhancedTablePagination = ({
	count,
	page,
	rowsPerPage,
	rowsPerPageOptions,
	onPageChange,
	onRowsPerPageChange,
}: EnhancedTablePaginationProps) => {
	const theme = useTheme();
	const esEscritorio = useMediaQuery(theme.breakpoints.up("sm"));
	const [goToPage, setGoToPage] = useState("");
	const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));
	const mostrarSalto = esEscritorio && totalPages > 1;

	const handleGoToPage = () => {
		const pageNumber = parseInt(goToPage, 10);
		if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
			onPageChange(null, pageNumber - 1);
			setGoToPage("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleGoToPage();
		}
	};

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: mostrarSalto ? "space-between" : "flex-end",
				flexWrap: "wrap",
				gap: 1,
			}}
		>
			{mostrarSalto && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 2, py: 1 }}>
					<TextField
						size="small"
						label="Ir a página"
						type="number"
						value={goToPage}
						onChange={(e) => setGoToPage(e.target.value)}
						onKeyDown={handleKeyDown}
						inputProps={{ min: 1, max: totalPages }}
						sx={{ width: 120 }}
						helperText={`de ${totalPages}`}
					/>
					<Tooltip title="Ir a página">
						<span>
							<IconButton
								size="small"
								onClick={handleGoToPage}
								disabled={!goToPage || isNaN(parseInt(goToPage, 10)) || parseInt(goToPage, 10) < 1 || parseInt(goToPage, 10) > totalPages}
								color="primary"
							>
								<Send2 size={18} />
							</IconButton>
						</span>
					</Tooltip>
				</Box>
			)}
			<TablePagination
				component="div"
				count={count}
				page={page}
				rowsPerPage={rowsPerPage}
				rowsPerPageOptions={rowsPerPageOptions}
				onPageChange={onPageChange}
				onRowsPerPageChange={onRowsPerPageChange}
			/>
		</Box>
	);
};

export default EnhancedTablePagination;
