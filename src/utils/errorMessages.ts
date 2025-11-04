// Utility to extract error messages from API responses

export const extractErrorMessage = (error: any): string => {
	// If error has a response with a message
	if (error.response?.data?.message) {
		return error.response.data.message;
	}

	// If error has a message directly
	if (error.message) {
		return error.message;
	}

	// Default error message
	return "Ocurrió un error inesperado";
};
