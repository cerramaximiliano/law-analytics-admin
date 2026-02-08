import { useState } from "react";
import { TablePagination, Box, TextField, IconButton, Tooltip } from "@mui/material";
import { Send2 } from "iconsax-react";

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
	const [goToPage, setGoToPage] = useState("");
	const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));

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
		<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
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
			<TablePagination
				component="div"
				count={count}
				page={page}
				rowsPerPage={rowsPerPage}
				rowsPerPageOptions={rowsPerPageOptions}
				onPageChange={onPageChange}
				onRowsPerPageChange={onRowsPerPageChange}
				showFirstButton
				showLastButton
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>
		</Box>
	);
};

export default EnhancedTablePagination;
