// assets
import { Book, HierarchySquare3 } from "iconsax-react";

// type
import { NavItemType } from "types/menu";

// ==============================|| RECURSOS MENU ITEMS ||============================== //

const recursos: NavItemType = {
	id: "recursos",
	title: "Recursos",
	type: "group",
	children: [
		{
			id: "jurisprudencia",
			title: "Jurisprudencia",
			type: "item",
			icon: Book,
			url: "/recursos/jurisprudencia",
			breadcrumbs: true,
		},
	],
};

export default recursos;
