// assets
import { Setting3, Folder2, MoneyRecive, Status, Sms } from "iconsax-react";

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
				{
					id: "workers-mev",
					title: "Workers MEV",
					type: "item",
					url: "/admin/workers/mev",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "causas",
			title: "Carpetas PJN",
			type: "collapse",
			icon: Folder2,
			breadcrumbs: true,
			children: [
				{
					id: "causas-verified-worker",
					title: "Carpetas Verificadas (Worker)",
					type: "item",
					url: "/admin/causas/verified",
					breadcrumbs: true,
				},
				{
					id: "causas-verified-app",
					title: "Carpetas Verificadas (App)",
					type: "item",
					url: "/admin/causas/verified-app",
					breadcrumbs: true,
				},
				{
					id: "causas-non-verified",
					title: "Carpetas No Verificadas (App)",
					type: "item",
					url: "/admin/causas/non-verified",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "carpetas-mev",
			title: "Carpetas MEV",
			type: "collapse",
			icon: Folder2,
			breadcrumbs: true,
			children: [
				{
					id: "mev-verified-app",
					title: "Carpetas Verificadas (App)",
					type: "item",
					url: "/admin/mev/verified-app",
					breadcrumbs: true,
				},
				{
					id: "mev-non-verified",
					title: "Carpetas No Verificadas (App)",
					type: "item",
					url: "/admin/mev/non-verified",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "subscriptions",
			title: "Suscripciones",
			type: "collapse",
			icon: MoneyRecive,
			breadcrumbs: true,
			children: [
				{
					id: "usuarios-suscripciones",
					title: "Suscripciones de Usuarios",
					type: "item",
					url: "/admin/usuarios/suscripciones",
					breadcrumbs: true,
				},
				{
					id: "stripe-webhooks",
					title: "Stripe Webhooks",
					type: "item",
					url: "/admin/subscriptions/stripe-webhooks",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "marketing",
			title: "Marketing",
			type: "collapse",
			icon: Sms,
			breadcrumbs: true,
			children: [
				{
					id: "mailing",
					title: "Campañas de Email",
					type: "item",
					url: "/admin/marketing/mailing",
					breadcrumbs: true,
				},
				{
					id: "templates",
					title: "Plantillas de Email",
					type: "item",
					url: "/admin/marketing/templates",
					breadcrumbs: true,
				},
				{
					id: "contacts",
					title: "Contactos",
					type: "item",
					url: "/admin/marketing/contacts",
					breadcrumbs: true,
				},
			],
		},
		{
			id: "server-status",
			title: "Estado del Servidor",
			type: "item",
			icon: Status,
			url: "/admin/server-status",
			breadcrumbs: true,
		},
	],
};

export default admin;
