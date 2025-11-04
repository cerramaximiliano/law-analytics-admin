// third-party
import { combineReducers } from "redux";

// project-imports
import menu from "./menu";
import snackbar from "./snackbar";
import auth from "./auth";
import alerts from "./alerts";
import search from "./search";

// ==============================|| COMBINE REDUCERS ||============================== //

const reducers = combineReducers({
	menu,
	snackbar,
	auth,
	alerts,
	search,
});

export default reducers;
