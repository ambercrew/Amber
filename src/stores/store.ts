import { combineReducers, configureStore } from "@reduxjs/toolkit";
import fileSystemReducer from "./fileSystem/fileSystemReducers";

const reducers = combineReducers({
	fileSystem: fileSystemReducer,
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
