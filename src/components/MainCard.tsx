import React from "react";
import { forwardRef, CSSProperties, ReactNode, Ref } from "react";

// material-ui
import { useTheme } from "@mui/material/styles";
import { Card, CardContent, CardHeader, Divider, Typography, CardProps, CardHeaderProps, CardContentProps } from "@mui/material";

// project-imports
import Highlighter from "components/third-party/Highlighter";
import useConfig from "hooks/useConfig";

// types
import { KeyedObject } from "types/root";

// header style
// El CardHeader de MUI mantiene título y acciones en una fila que no envuelve
// y cuyo slot `action` no se encoge (flex: 0 0 auto): con dos o más botones de
// texto el bloque desborda la tarjeta en mobile. Acotamos el slot al ancho
// disponible y dejamos que su contenido envuelva; si aun así no entra, baja a
// su propia fila. Las acciones chicas (un icono) siguen alineadas a la derecha.
const headerSX = {
	p: 2.5,
	flexWrap: { xs: "wrap", sm: "nowrap" },
	rowGap: 1,
	"& .MuiCardHeader-content": { minWidth: 0 },
	"& .MuiCardHeader-action": {
		m: "0px auto",
		alignSelf: "center",
		maxWidth: "100%",
		"& > *": { flexWrap: "wrap" },
	},
};

// ==============================|| CUSTOM - MAIN CARD ||============================== //

export interface MainCardProps extends KeyedObject {
	border?: boolean;
	boxShadow?: boolean;
	children?: ReactNode | string;
	subheader?: ReactNode | string;
	style?: CSSProperties;
	content?: boolean;
	contentSX?: CardContentProps["sx"];
	darkTitle?: boolean;
	divider?: boolean;
	sx?: CardProps["sx"];
	secondary?: CardHeaderProps["action"];
	shadow?: string;
	elevation?: number;
	title?: ReactNode | string;
	codeHighlight?: boolean;
	codeString?: string;
	modal?: boolean;
}

const MainCard = forwardRef(
	(
		{
			border = true,
			boxShadow = true,
			children,
			subheader,
			content = true,
			contentSX = {},
			darkTitle,
			divider = true,
			elevation,
			secondary,
			shadow,
			sx = {},
			title,
			codeHighlight = false,
			codeString,
			modal = false,
			...others
		}: MainCardProps,
		ref: Ref<HTMLDivElement>,
	) => {
		const theme = useTheme();
		const { themeContrast } = useConfig();

		return (
			<Card
				elevation={elevation || 0}
				ref={ref}
				{...others}
				sx={{
					position: "relative",
					border: border ? "1px solid" : "none",
					borderRadius: 1.5,
					borderColor: theme.palette.divider,
					...(((themeContrast && boxShadow) || shadow) && {
						boxShadow: shadow ? shadow : theme.customShadows.z1,
					}),
					...(codeHighlight && {
						"& pre": {
							m: 0,
							p: "12px !important",
							fontFamily: theme.typography.fontFamily,
							fontSize: "0.75rem",
						},
					}),
					...(modal && {
						position: "absolute" as "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						width: { xs: `calc( 100% - 50px)`, sm: "auto" },
						"& .MuiCardContent-root": {
							overflowY: "auto",
							minHeight: "auto",
							maxHeight: `calc(100vh - 200px)`,
						},
					}),
					...sx,
				}}
			>
				{/* card header and action */}
				{!darkTitle && title && (
					<CardHeader
						sx={headerSX}
						titleTypographyProps={{ variant: "subtitle1" }}
						title={title}
						action={secondary}
						subheader={subheader}
					/>
				)}
				{darkTitle && title && <CardHeader sx={headerSX} title={<Typography variant="h4">{title}</Typography>} action={secondary} />}

				{/* content & header divider */}
				{title && divider && <Divider />}

				{/* card content */}
				{content && <CardContent sx={contentSX}>{children}</CardContent>}
				{!content && children}

				{/* card footer - clipboard & highlighter  */}
				{codeString && (
					<>
						<Divider sx={{ borderStyle: "dashed" }} />
						<Highlighter codeString={codeString} codeHighlight={codeHighlight} />
					</>
				)}
			</Card>
		);
	},
);

export default MainCard;
