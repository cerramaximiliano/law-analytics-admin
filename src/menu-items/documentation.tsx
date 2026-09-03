// assets
import { DocumentText1 } from "iconsax-react";

// type
import { NavItemType } from "types/menu";

// ==============================|| DOCUMENTATION MENU ITEMS ||============================== //

const documentation: NavItemType = {
	id: "documentation",
	title: "Documentación",
	type: "group",
	children: [
		{
			id: "legal-documents",
			title: "Documentos Legales",
			type: "item",
			icon: DocumentText1,
			url: "/documentation/legal-documents",
			breadcrumbs: true,
		},
	],
};

export default documentation;
