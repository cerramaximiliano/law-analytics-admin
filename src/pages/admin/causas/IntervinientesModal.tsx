/**
 * Modal para mostrar los intervinientes de una causa
 * Muestra partes (ACTOR, DEMANDADO, etc.) y letrados vinculados
 */
import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Stack,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress,
    Alert,
    Divider,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from "@mui/material";
import { CloseCircle, UserSquare, User, ArrowDown2 } from "iconsax-react";
import { Interviniente } from "../../../api/intervinientes";
import { Causa } from "../../../api/causasPjn";

interface IntervinientesModalProps {
    open: boolean;
    onClose: () => void;
    causa: Causa | null;
    intervinientes: {
        partes: Interviniente[];
        letrados: Interviniente[];
        all: Interviniente[];
    } | null;
    loading: boolean;
    error: string;
}

const IntervinientesModal: React.FC<IntervinientesModalProps> = ({
    open,
    onClose,
    causa,
    intervinientes,
    loading,
    error,
}) => {
    // Obtener el ID de la causa
    const getCausaId = (id: string | { $oid: string } | undefined): string => {
        if (!id) return "";
        return typeof id === "string" ? id : id.$oid;
    };

    // Agrupar letrados por parte representada
    const getLetradosPorParte = (parteNombre: string) => {
        if (!intervinientes?.letrados) return [];
        return intervinientes.letrados.filter(
            (l) => l.letrado?.parteRepresentada?.nombre === parteNombre
        );
    };

    // Color del chip según tipo de parte
    const getChipColor = (tipo: string): "primary" | "secondary" | "success" | "warning" | "error" | "info" => {
        switch (tipo?.toUpperCase()) {
            case "ACTOR":
                return "primary";
            case "DEMANDADO":
                return "error";
            case "TERCERO":
                return "warning";
            default:
                return "info";
        }
    };

    // Color del chip según tipo de letrado
    const getLetradoChipColor = (tipo: string): "primary" | "secondary" | "success" | "warning" => {
        if (tipo?.includes("APODERADO")) return "primary";
        if (tipo?.includes("PATROCINANTE")) return "secondary";
        return "success";
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <UserSquare size={24} variant="Bold" />
                            <Typography variant="h5">Intervinientes</Typography>
                            {intervinientes && (
                                <Chip
                                    label={`${intervinientes.all?.length || 0} encontrados`}
                                    color="primary"
                                    size="small"
                                />
                            )}
                        </Stack>
                        {causa && (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                Expediente {causa.number}/{causa.year} - {causa.fuero}
                            </Typography>
                        )}
                        {causa?.caratula && (
                            <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{
                                    mt: 0.5,
                                    maxWidth: "500px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {causa.caratula}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ minHeight: "300px", maxHeight: "500px", overflowY: "auto" }}>
                {/* Loading state */}
                {loading && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "200px",
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}

                {/* Error state */}
                {error && !loading && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Empty state */}
                {!loading && !error && (!intervinientes || intervinientes.all?.length === 0) && (
                    <Alert severity="info">
                        No se encontraron intervinientes para esta causa.
                        <br />
                        <Typography variant="caption" color="textSecondary">
                            Es posible que los datos de intervinientes aún no hayan sido extraídos.
                        </Typography>
                    </Alert>
                )}

                {/* Partes y Letrados */}
                {!loading && !error && intervinientes && intervinientes.partes?.length > 0 && (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Partes del Expediente
                        </Typography>

                        {intervinientes.partes.map((parte, index) => {
                            const letradosDeParte = getLetradosPorParte(parte.parte?.nombre || "");

                            return (
                                <Accordion key={parte._id || index} defaultExpanded={index === 0}>
                                    <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <User size={20} />
                                            <Chip
                                                label={parte.parte?.tipo || "PARTE"}
                                                color={getChipColor(parte.parte?.tipo || "")}
                                                size="small"
                                            />
                                            <Typography variant="subtitle1" fontWeight="medium">
                                                {parte.parte?.nombre || "Sin nombre"}
                                            </Typography>
                                        </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        {/* Datos de la parte */}
                                        <Box sx={{ mb: 2 }}>
                                            <Stack direction="row" spacing={4}>
                                                {parte.parte?.tomoFolio && (
                                                    <Typography variant="body2" color="textSecondary">
                                                        <strong>Tomo/Folio:</strong> {parte.parte.tomoFolio}
                                                    </Typography>
                                                )}
                                                {parte.parte?.iej && (
                                                    <Typography variant="body2" color="textSecondary">
                                                        <strong>IEJ:</strong> {parte.parte.iej}
                                                    </Typography>
                                                )}
                                            </Stack>
                                        </Box>

                                        {/* Letrados de esta parte */}
                                        {letradosDeParte.length > 0 && (
                                            <Box>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography
                                                    variant="subtitle2"
                                                    color="textSecondary"
                                                    sx={{ mb: 1 }}
                                                >
                                                    Letrados ({letradosDeParte.length})
                                                </Typography>
                                                <TableContainer component={Paper} variant="outlined">
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell>Tipo</TableCell>
                                                                <TableCell>Nombre</TableCell>
                                                                <TableCell>Matrícula</TableCell>
                                                                <TableCell>Estado IEJ</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {letradosDeParte.map((letrado, idx) => (
                                                                <TableRow key={letrado._id || idx}>
                                                                    <TableCell>
                                                                        <Chip
                                                                            label={
                                                                                letrado.letrado?.tipo || "LETRADO"
                                                                            }
                                                                            color={getLetradoChipColor(
                                                                                letrado.letrado?.tipo || ""
                                                                            )}
                                                                            size="small"
                                                                            variant="outlined"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {letrado.letrado?.nombre || "Sin nombre"}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Typography
                                                                            variant="body2"
                                                                            sx={{ fontSize: "0.75rem" }}
                                                                        >
                                                                            {letrado.letrado?.matricula || "-"}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {letrado.letrado?.estadoIej ? (
                                                                            <Chip
                                                                                label={letrado.letrado.estadoIej}
                                                                                size="small"
                                                                                color={
                                                                                    letrado.letrado.estadoIej ===
                                                                                    "CONSTITUIDO"
                                                                                        ? "success"
                                                                                        : "warning"
                                                                                }
                                                                                variant="outlined"
                                                                            />
                                                                        ) : (
                                                                            "-"
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </Box>
                                        )}

                                        {letradosDeParte.length === 0 && (
                                            <Typography variant="body2" color="textSecondary" fontStyle="italic">
                                                Sin letrados registrados para esta parte
                                            </Typography>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}

                        {/* Letrados sin parte asignada */}
                        {intervinientes.letrados?.filter(
                            (l) => !l.letrado?.parteRepresentada?.nombre
                        ).length > 0 && (
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>
                                    Otros Letrados
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Tipo</TableCell>
                                                <TableCell>Nombre</TableCell>
                                                <TableCell>Matrícula</TableCell>
                                                <TableCell>Estado IEJ</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {intervinientes.letrados
                                                .filter((l) => !l.letrado?.parteRepresentada?.nombre)
                                                .map((letrado, idx) => (
                                                    <TableRow key={letrado._id || idx}>
                                                        <TableCell>
                                                            <Chip
                                                                label={letrado.letrado?.tipo || "LETRADO"}
                                                                color={getLetradoChipColor(
                                                                    letrado.letrado?.tipo || ""
                                                                )}
                                                                size="small"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {letrado.letrado?.nombre || "Sin nombre"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontSize: "0.75rem" }}
                                                            >
                                                                {letrado.letrado?.matricula || "-"}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {letrado.letrado?.estadoIej ? (
                                                                <Chip
                                                                    label={letrado.letrado.estadoIej}
                                                                    size="small"
                                                                    color={
                                                                        letrado.letrado.estadoIej === "CONSTITUIDO"
                                                                            ? "success"
                                                                            : "warning"
                                                                    }
                                                                    variant="outlined"
                                                                />
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={onClose}
                    startIcon={<CloseCircle size={18} />}
                    variant="outlined"
                    color="primary"
                >
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default IntervinientesModal;
