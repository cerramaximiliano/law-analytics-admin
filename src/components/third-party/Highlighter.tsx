// Placeholder Highlighter component - not used in admin project
import { ReactNode } from "react";

export interface HighlighterProps {
	children?: ReactNode;
	codeString?: string;
	codeHighlight?: boolean;
}

const Highlighter = ({ children, codeString }: HighlighterProps) => {
	return <>{children || codeString}</>;
};

export default Highlighter;
