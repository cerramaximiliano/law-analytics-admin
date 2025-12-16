// project-imports
import dashboard from "./dashboard";
import admin from "./admin";
import recursos from "./recursos";
import documentation from "./documentation";

// types
import { NavItemType } from "types/menu";

// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
	items: [dashboard, admin, documentation, recursos],
};

export default menuItems;
