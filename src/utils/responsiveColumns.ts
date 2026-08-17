// Prioridad de columnas para tablas anchas en mobile: en xs solo entran las
// esenciales y el resto aparece por breakpoint. Se aplica al <TableCell> del
// header y al de la fila (los dos, o la tabla se desalinea).
//
// Criterio: dejar visible en xs lo que identifica la fila y sus acciones;
// el detalle completo queda a un toque, en el modal o vista de detalle.
export const COL_SM = { display: { xs: "none", sm: "table-cell" } } as const;
export const COL_MD = { display: { xs: "none", md: "table-cell" } } as const;
export const COL_LG = { display: { xs: "none", lg: "table-cell" } } as const;
