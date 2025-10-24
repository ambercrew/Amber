import { combineReducers, configureStore } from "@reduxjs/toolkit";
import fileSystemReducer from "./fileSystem/fileSystemReducers";
import userReducer from "./user/userReducer";
import syncReducer from "./sync/syncReducer";

const reducers = combineReducers({
	fileSystem: fileSystemReducer,
	user: userReducer,
	sync: syncReducer,
});

export const store = configureStore({
	reducer: reducers,
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware({
			serializableCheck: false,
		}),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
