// Placeholder MessageCard - not used in admin project
import { ReactNode } from "react";

export interface MessageCardProps {
	children?: ReactNode;
	status?: { label: string; color: string };
	time?: string;
	title?: string;
	message?: string;
	src?: string;
	actions?: Array<{
		label: string;
		button: {
			variant: string;
			color?: string;
			fullWidth: boolean;
		};
	}>;
}

const MessageCard = ({ children }: MessageCardProps) => {
	return <div>{children}</div>;
};

export default MessageCard;
