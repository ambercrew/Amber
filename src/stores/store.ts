import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer from "./user/userReducer";
import syncReducer from "./sync/syncReducer";
import settingsReducer from "./settings/settingsReducer";
import appReducer from "./app/appReducer.ts";
import elementsReducer from "./elements/elementsReducer";

const reducers = combineReducers({
	user: userReducer,
	sync: syncReducer,
	settings: settingsReducer,
	app: appReducer,
	elements: elementsReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
	return configureStore({
		reducer: reducers,
		middleware: getDefaultMiddleware =>
			getDefaultMiddleware({
				serializableCheck: false,
			}),
		preloadedState,
	});
};

export type RootState = ReturnType<typeof reducers>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore["dispatch"];
