// third-party
import { combineReducers } from "redux";

// project-imports
import menu from "./menu";
import snackbar from "./snackbar";
import auth from "./auth";
import alerts from "./alerts";
import search from "./search";
import users from "./users";
import stripeSubscriptions from "./stripe-subscriptions";

// ==============================|| COMBINE REDUCERS ||============================== //

const reducers = combineReducers({
	menu,
	snackbar,
	auth,
	alerts,
	search,
	users,
	stripeSubscriptions,
});

export default reducers;
