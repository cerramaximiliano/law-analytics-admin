import { Dialog, DialogProps, useTheme, useMediaQuery } from "@mui/material";
import { FC } from "react";

/**
 * ResponsiveDialog - Wrapper component for Dialog that automatically adapts to mobile devices
 *
 * Features:
 * - Automatically goes fullScreen on small devices (sm breakpoint and below)
 * - Removes fixed widths on mobile to prevent overflow
 * - Maintains provided maxWidth on larger screens
 * - Fully compatible with standard Dialog props
 *
 * Usage:
 * ```tsx
 * <ResponsiveDialog maxWidth="md" open={open} onClose={handleClose}>
 *   <DialogTitle>Title</DialogTitle>
 *   <DialogContent>Content</DialogContent>
 * </ResponsiveDialog>
 * ```
 *
 * @param maxWidth - Maximum width of dialog on desktop ('xs' | 'sm' | 'md' | 'lg' | 'xl')
 * @param props - All standard MUI Dialog props are supported
 */
export const ResponsiveDialog: FC<DialogProps> = ({ maxWidth = "md", fullWidth = true, PaperProps, sx, ...props }) => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

	return (
		<Dialog
			{...props}
			maxWidth={maxWidth}
			fullWidth={fullWidth}
			fullScreen={isMobile}
			PaperProps={{
				...PaperProps,
				sx: {
					...(PaperProps?.sx || {}),
					// Remove fixed widths on mobile to prevent overflow
					...(isMobile && {
						width: "100%",
						maxWidth: "100%",
						height: "100%",
						maxHeight: "100%",
						margin: 0,
					}),
				},
			}}
			sx={{
				...sx,
			}}
		/>
	);
};

export default ResponsiveDialog;
