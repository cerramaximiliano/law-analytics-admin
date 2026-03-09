// assets
import { Book, HierarchySquare3, Chart, DocumentText } from "iconsax-react";

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
			type: "collapse",
			icon: Book,
			breadcrumbs: true,
			children: [
				{
					id: "jurisprudencia-eldial",
					title: "El Dial",
					type: "item",
					url: "/recursos/jurisprudencia",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "tasas-interes",
			title: "Tasas de Interés",
			type: "item",
			icon: Chart,
			url: "/recursos/tasas",
			breadcrumbs: true,
		},
		{
			id: "datos-previsionales",
			title: "Datos Previsionales",
			type: "item",
			icon: DocumentText,
			url: "/recursos/datos-previsionales",
			breadcrumbs: true,
		},
	],
};

export default recursos;
