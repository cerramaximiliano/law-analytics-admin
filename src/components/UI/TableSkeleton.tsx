import React from "react";
// material-ui
import { Skeleton, TableRow, TableCell } from "@mui/material";

interface TableSkeletonProps {
	rows?: number;
	columns: number;
}

const TableSkeleton = ({ rows = 15, columns }: TableSkeletonProps) => {
	return (
		<>
			{Array.from({ length: rows }, (_, rowIndex) => (
				<TableRow key={`skeleton-row-${rowIndex}`}>
					{Array.from({ length: columns }, (_, cellIndex) => (
						<TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
							<Skeleton width="100%" height={24} />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	);
};

export default TableSkeleton;
