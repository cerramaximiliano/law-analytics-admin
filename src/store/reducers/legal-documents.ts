import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import authAxios from "utils/authAxios";
import { LegalDocument, LegalDocumentsState } from "types/legal-document";

const initialState: LegalDocumentsState = {
	documents: [],
	selectedDocument: null,
	loading: false,
	loadingDetail: false,
	error: null,
};

// Async thunk para obtener la lista de documentos legales
export const fetchLegalDocuments = createAsyncThunk("legalDocuments/fetchAll", async (_, { rejectWithValue }) => {
	try {
		const response = await authAxios.get("/api/legal/admin/list");
		if (response.data.success) {
			return response.data.documents;
		}
		return rejectWithValue(response.data.message || "Error al obtener documentos legales");
	} catch (error: any) {
		const message = error.response?.data?.message || error.message || "Error al obtener documentos legales";
		return rejectWithValue(message);
	}
});

// Async thunk para obtener un documento legal por ID (documento completo)
export const fetchLegalDocumentById = createAsyncThunk("legalDocuments/fetchById", async (documentId: string, { rejectWithValue }) => {
	try {
		const response = await authAxios.get(`/api/legal/admin/${documentId}`);
		if (response.data.success) {
			return response.data.document;
		}
		return rejectWithValue(response.data.message || "Error al obtener documento legal");
	} catch (error: any) {
		const message = error.response?.data?.message || error.message || "Error al obtener documento legal";
		return rejectWithValue(message);
	}
});

// Async thunk para actualizar un documento legal
export const updateLegalDocument = createAsyncThunk(
	"legalDocuments/update",
	async ({ documentId, data }: { documentId: string; data: Partial<LegalDocument> }, { rejectWithValue }) => {
		try {
			const response = await authAxios.put(`/api/legal/admin/update/${documentId}`, data);
			if (response.data.success) {
				return response.data.document;
			}
			return rejectWithValue(response.data.message || "Error al actualizar documento legal");
		} catch (error: any) {
			const message = error.response?.data?.message || error.message || "Error al actualizar documento legal";
			return rejectWithValue(message);
		}
	}
);

// Async thunk para activar/desactivar un documento legal
export const toggleLegalDocument = createAsyncThunk("legalDocuments/toggle", async (documentId: string, { rejectWithValue }) => {
	try {
		const response = await authAxios.patch(`/api/legal/admin/toggle/${documentId}`);
		if (response.data.success) {
			return response.data.document;
		}
		return rejectWithValue(response.data.message || "Error al cambiar estado del documento");
	} catch (error: any) {
		const message = error.response?.data?.message || error.message || "Error al cambiar estado del documento";
		return rejectWithValue(message);
	}
});

// Async thunk para eliminar un documento legal
export const deleteLegalDocument = createAsyncThunk("legalDocuments/delete", async (documentId: string, { rejectWithValue }) => {
	try {
		const response = await authAxios.delete(`/api/legal/admin/delete/${documentId}`);
		if (response.data.success) {
			return documentId;
		}
		return rejectWithValue(response.data.message || "Error al eliminar documento legal");
	} catch (error: any) {
		const message = error.response?.data?.message || error.message || "Error al eliminar documento legal";
		return rejectWithValue(message);
	}
});

const legalDocumentsSlice = createSlice({
	name: "legalDocuments",
	initialState,
	reducers: {
		clearSelectedDocument: (state) => {
			state.selectedDocument = null;
		},
		clearError: (state) => {
			state.error = null;
		},
		setSelectedDocument: (state, action: PayloadAction<LegalDocument | null>) => {
			state.selectedDocument = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder
			// Fetch all documents
			.addCase(fetchLegalDocuments.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchLegalDocuments.fulfilled, (state, action: PayloadAction<LegalDocument[]>) => {
				state.loading = false;
				state.documents = action.payload;
			})
			.addCase(fetchLegalDocuments.rejected, (state, action) => {
				state.loading = false;
				state.error = action.payload as string;
			})
			// Fetch document by ID
			.addCase(fetchLegalDocumentById.pending, (state) => {
				state.loadingDetail = true;
				state.error = null;
			})
			.addCase(fetchLegalDocumentById.fulfilled, (state, action: PayloadAction<LegalDocument>) => {
				state.loadingDetail = false;
				state.selectedDocument = action.payload;
			})
			.addCase(fetchLegalDocumentById.rejected, (state, action) => {
				state.loadingDetail = false;
				state.error = action.payload as string;
			})
			// Update document
			.addCase(updateLegalDocument.pending, (state) => {
				state.loadingDetail = true;
				state.error = null;
			})
			.addCase(updateLegalDocument.fulfilled, (state, action: PayloadAction<LegalDocument>) => {
				state.loadingDetail = false;
				state.selectedDocument = action.payload;
				// Actualizar en la lista también
				const index = state.documents.findIndex((doc) => doc._id === action.payload._id);
				if (index !== -1) {
					state.documents[index] = action.payload;
				}
			})
			.addCase(updateLegalDocument.rejected, (state, action) => {
				state.loadingDetail = false;
				state.error = action.payload as string;
			})
			// Toggle document status
			.addCase(toggleLegalDocument.pending, (state) => {
				state.loadingDetail = true;
				state.error = null;
			})
			.addCase(toggleLegalDocument.fulfilled, (state, action: PayloadAction<LegalDocument>) => {
				state.loadingDetail = false;
				// Actualizar en la lista
				const index = state.documents.findIndex((doc) => doc._id === action.payload._id);
				if (index !== -1) {
					state.documents[index] = action.payload;
				}
				// Actualizar selectedDocument si es el mismo
				if (state.selectedDocument && state.selectedDocument._id === action.payload._id) {
					state.selectedDocument = action.payload;
				}
			})
			.addCase(toggleLegalDocument.rejected, (state, action) => {
				state.loadingDetail = false;
				state.error = action.payload as string;
			})
			// Delete document
			.addCase(deleteLegalDocument.pending, (state) => {
				state.loadingDetail = true;
				state.error = null;
			})
			.addCase(deleteLegalDocument.fulfilled, (state, action: PayloadAction<string>) => {
				state.loadingDetail = false;
				// Eliminar de la lista
				state.documents = state.documents.filter((doc) => doc._id !== action.payload);
				// Limpiar selectedDocument si es el eliminado
				if (state.selectedDocument && state.selectedDocument._id === action.payload) {
					state.selectedDocument = null;
				}
			})
			.addCase(deleteLegalDocument.rejected, (state, action) => {
				state.loadingDetail = false;
				state.error = action.payload as string;
			});
	},
});

export const { clearSelectedDocument, clearError, setSelectedDocument } = legalDocumentsSlice.actions;
export default legalDocumentsSlice.reducer;
