// assets
import { Category, Chart, Filter } from "iconsax-react";

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
		{
			id: "ga4-analytics",
			title: "Analytics GA4",
			type: "item",
			icon: Chart,
			url: "/admin/ga4-analytics",
			breadcrumbs: true,
		},
		{
			id: "funnel-snapshots",
			title: "Funnel Snapshots",
			type: "item",
			icon: Filter,
			url: "/admin/funnel-snapshots",
			breadcrumbs: true,
		},
	],
};

export default dashboard;
