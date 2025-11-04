// Placeholder search reducer - not used in admin project
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	query: "",
	results: [],
	isOpen: false,
};

const search = createSlice({
	name: "search",
	initialState,
	reducers: {
		openSearch(state) {
			state.isOpen = true;
		},
		closeSearch(state) {
			state.isOpen = false;
		},
	},
});

export const { openSearch, closeSearch } = search.actions;
export default search.reducer;
