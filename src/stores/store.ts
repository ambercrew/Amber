import { combineReducers, configureStore } from "@reduxjs/toolkit";
import fileSystemReducer from "./fileSystem/fileSystemReducers";
import userReducer from "./user/userReducer";
import syncReducer from "./sync/syncReducer";
import settingsReducer from "./settings/settingsReducer";

const reducers = combineReducers({
	fileSystem: fileSystemReducer,
	user: userReducer,
	sync: syncReducer,
	settings: settingsReducer,
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
