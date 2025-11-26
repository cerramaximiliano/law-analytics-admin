import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dispatch } from "../index";
import ApiService from "./ApiService";
import { StripeCustomer, StripeCustomersResponse } from "types/stripe-subscription";

interface StripeCustomersState {
	customers: StripeCustomer[];
	stats: {
		totalCustomers: number;
		customersWithActiveSubscriptions: number;
		customersWithoutSubscriptions: number;
		customersWithCanceledSubscriptions: number;
	};
	hasMore: boolean;
	nextCursor?: string;
	loading: boolean;
	error: string | null;
}

const initialState: StripeCustomersState = {
	customers: [],
	stats: {
		totalCustomers: 0,
		customersWithActiveSubscriptions: 0,
		customersWithoutSubscriptions: 0,
		customersWithCanceledSubscriptions: 0,
	},
	hasMore: false,
	nextCursor: undefined,
	loading: false,
	error: null,
};

const stripeSubscriptionsSlice = createSlice({
	name: "stripeSubscriptions",
	initialState,
	reducers: {
		setCustomers(state, action: PayloadAction<StripeCustomersResponse>) {
			state.customers = action.payload.customers;
			state.stats = action.payload.stats;
			state.hasMore = action.payload.has_more;
			state.nextCursor = action.payload.next_cursor;
			state.loading = false;
			state.error = null;
		},
		appendCustomers(state, action: PayloadAction<StripeCustomersResponse>) {
			state.customers = [...state.customers, ...action.payload.customers];
			state.stats = action.payload.stats;
			state.hasMore = action.payload.has_more;
			state.nextCursor = action.payload.next_cursor;
			state.loading = false;
			state.error = null;
		},
		setLoading(state, action: PayloadAction<boolean>) {
			state.loading = action.payload;
		},
		setError(state, action: PayloadAction<string>) {
			state.error = action.payload;
			state.loading = false;
		},
		clearError(state) {
			state.error = null;
		},
		resetState(state) {
			Object.assign(state, initialState);
		},
	},
});

export const { setCustomers, appendCustomers, setLoading, setError, clearError, resetState } = stripeSubscriptionsSlice.actions;

export const fetchStripeCustomers = (cursor?: string) => async () => {
	dispatch(setLoading(true));
	try {
		const response = await ApiService.getStripeCustomers(cursor);
		if (cursor) {
			dispatch(appendCustomers(response));
		} else {
			dispatch(setCustomers(response));
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Error al cargar los clientes de Stripe";
		dispatch(setError(errorMessage));
	}
};

export default stripeSubscriptionsSlice.reducer;
