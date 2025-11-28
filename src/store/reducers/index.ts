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
import legalDocuments from "./legal-documents";
import notificationMonitoring from "./notificationMonitoring";

// ==============================|| COMBINE REDUCERS ||============================== //

const reducers = combineReducers({
	menu,
	snackbar,
	auth,
	alerts,
	search,
	users,
	stripeSubscriptions,
	legalDocuments,
	notificationMonitoring,
});

export default reducers;
