export const formatCurrency = (amount: number, currency: string = "COP"): string => {
	const formatter = new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency: currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	return formatter.format(amount);
};
