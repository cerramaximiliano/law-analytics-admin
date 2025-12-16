// assets
import { Category } from "iconsax-react";

// type
import { NavItemType } from "types/menu";

// ==============================|| DASHBOARD MENU ITEM ||============================== //

const dashboard: NavItemType = {
	id: "dashboard",
	title: "Dashboard",
	type: "group",
	children: [
		{
			id: "dashboard-main",
			title: "Dashboard",
			type: "item",
			icon: Category,
			url: "/dashboard",
			breadcrumbs: true,
		},
	],
};

export default dashboard;
