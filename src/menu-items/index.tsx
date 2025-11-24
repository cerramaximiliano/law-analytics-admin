// project-imports
import admin from "./admin";
import recursos from "./recursos";

// types
import { NavItemType } from "types/menu";

// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
	items: [admin, recursos],
};

export default menuItems;
