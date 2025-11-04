import { ComponentClass, FunctionComponent } from "react";

// material-ui
import { SvgIconTypeMap } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";

// third-party
import { Icon } from "iconsax-react";

// ==============================|| TYPES - ROOT  ||============================== //

export type KeyedObject = {
	[key: string]: string | number | KeyedObject | any;
};

export type OverrideIcon =
	| (OverridableComponent<SvgIconTypeMap<{}, "svg">> & {
			muiName: string;
	  })
	| ComponentClass<any>
	| FunctionComponent<any>
	| Icon;

export interface GenericCardProps {
	title?: string;
	primary?: string | number | undefined;
	secondary?: string;
	content?: string;
	image?: string;
	dateTime?: string;
	iconPrimary?: OverrideIcon;
	color?: string;
	size?: string;
}

export interface DefaultRootStateProps {
	chat: any;
	calendar: any;
	menu: any;
	snackbar: any;
	cart: any;
	product: any;
	kanban: any;
	invoice: any;
	folder: any;
	notifications: any;
	calculator: any;
	movements: any;
	auth: any;
	alerts: any;
	contacts: any;
	folders: any;
	events: any;
	tasksReducer: any;
	userStats: any;
	users: any;
}
