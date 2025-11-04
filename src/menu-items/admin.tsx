// assets
import { Setting3, Folder2 } from "iconsax-react";

// type
import { NavItemType } from "types/menu";

// ==============================|| ADMIN MENU ITEMS ||============================== //

const admin: NavItemType = {
	id: "admin",
	title: "Administración",
	type: "group",
	children: [
		{
			id: "workers",
			title: "Workers",
			type: "collapse",
			icon: Setting3,
			breadcrumbs: true,
			children: [
				{
					id: "workers-pjn",
					title: "Workers PJN",
					type: "item",
					url: "/admin/causas/workers",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "causas",
			title: "Carpetas",
			type: "collapse",
			icon: Folder2,
			breadcrumbs: true,
			children: [
				{
					id: "causas-verified",
					title: "Carpetas Verificadas",
					type: "item",
					url: "/admin/causas/verified",
					breadcrumbs: true,
				},
			],
		},
	],
};

export default admin;
