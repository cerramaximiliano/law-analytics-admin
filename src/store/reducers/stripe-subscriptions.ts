import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { dispatch } from "../index";
import ApiService from "./ApiService";
import {
	StripeCustomer,
	StripeCustomersResponse,
	DeleteStripeCustomerRequest,
	DeleteStripeCustomerResponse,
	StripeStats,
	StripePaginationEnv,
} from "types/stripe-subscription";

interface StripeCustomersState {
	customers: StripeCustomer[];
	stats: {
		combined: StripeStats;
		test: StripeStats;
		live: StripeStats;
	};
	pagination: {
		test: StripePaginationEnv;
		live: StripePaginationEnv;
	};
	loading: boolean;
	error: string | null;
	deleting: boolean;
	deleteError: string | null;
}

const defaultStats: StripeStats = {
	totalCustomers: 0,
	customersWithActiveSubscriptions: 0,
	customersWithoutSubscriptions: 0,
	customersWithCanceledSubscriptions: 0,
};

const defaultPagination: StripePaginationEnv = {
	has_more: false,
	next_cursor: null,
	error: null,
};

const initialState: StripeCustomersState = {
	customers: [],
	stats: {
		combined: { ...defaultStats },
		test: { ...defaultStats },
		live: { ...defaultStats },
	},
	pagination: {
		test: { ...defaultPagination },
		live: { ...defaultPagination },
	},
	loading: false,
	error: null,
	deleting: false,
	deleteError: null,
};

const stripeSubscriptionsSlice = createSlice({
	name: "stripeSubscriptions",
	initialState,
	reducers: {
		setCustomers(state, action: PayloadAction<StripeCustomersResponse>) {
			state.customers = action.payload.customers;
			state.stats = action.payload.stats;
			state.pagination = action.payload.pagination;
			state.loading = false;
			state.error = null;
		},
		appendCustomers(state, action: PayloadAction<StripeCustomersResponse>) {
			state.customers = [...state.customers, ...action.payload.customers];
			state.stats = action.payload.stats;
			state.pagination = action.payload.pagination;
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
		setDeleting(state, action: PayloadAction<boolean>) {
			state.deleting = action.payload;
		},
		setDeleteError(state, action: PayloadAction<string | null>) {
			state.deleteError = action.payload;
			state.deleting = false;
		},
		removeCustomer(state, action: PayloadAction<string>) {
			const customer = state.customers.find((c) => c.id === action.payload);
			state.customers = state.customers.filter((c) => c.id !== action.payload);
			if (customer) {
				state.stats.combined.totalCustomers = Math.max(0, state.stats.combined.totalCustomers - 1);
				state.stats[customer.environment].totalCustomers = Math.max(0, state.stats[customer.environment].totalCustomers - 1);
			}
		},
	},
});

export const { setCustomers, appendCustomers, setLoading, setError, clearError, resetState, setDeleting, setDeleteError, removeCustomer } =
	stripeSubscriptionsSlice.actions;

export const fetchStripeCustomers = (cursor?: string) => async () => {
	dispatch(setLoading(true));
	try {
		const response = await ApiService.getStripeCustomers(cursor);
		console.log("[stripe-subscriptions] API Response:", response);
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

export const deleteStripeCustomer =
	(request: DeleteStripeCustomerRequest, customerId: string) =>
	async (): Promise<DeleteStripeCustomerResponse> => {
		dispatch(setDeleting(true));
		dispatch(setDeleteError(null));
		try {
			const response = await ApiService.deleteStripeCustomer(request);
			if (response.success) {
				dispatch(removeCustomer(customerId));
			}
			dispatch(setDeleting(false));
			return response;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Error al eliminar el cliente de Stripe";
			dispatch(setDeleteError(errorMessage));
			throw error;
		}
	};

export default stripeSubscriptionsSlice.reducer;
