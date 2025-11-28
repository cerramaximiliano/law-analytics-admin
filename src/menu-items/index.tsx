// project-imports
import admin from "./admin";
import recursos from "./recursos";
import documentation from "./documentation";

// types
import { NavItemType } from "types/menu";

// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
	items: [admin, documentation, recursos],
};

export default menuItems;
