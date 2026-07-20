// assets
import { Book, HierarchySquare3, Chart, DocumentText, DollarCircle, Calendar } from "iconsax-react";

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
				{
					id: "jurisprudencia-saij",
					title: "SAIJ",
					type: "item",
					url: "/recursos/jurisprudencia/saij",
					breadcrumbs: true,
				},
				{
					id: "jurisprudencia-pjn",
					title: "Jurisprudencia PJN",
					type: "item",
					url: "/recursos/jurisprudencia/pjn",
					breadcrumbs: true,
				},
				{
					id: "jurisprudencia-pjn-ask",
					title: "PJN — Búsqueda /ask",
					type: "item",
					url: "/recursos/jurisprudencia/pjn-ask",
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
		{
			id: "valores-arancelarios",
			title: "Datos Arancelarios",
			type: "item",
			icon: DollarCircle,
			url: "/recursos/valores-arancelarios",
			breadcrumbs: true,
		},
		{
			id: "efemerides",
			title: "Efemérides",
			type: "item",
			icon: Calendar,
			url: "/recursos/efemerides",
			breadcrumbs: true,
		},
	],
};

export default recursos;
