import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import { api } from "./services/api";
import apiDataReducer from "./services/apiReducer";
import { setupListeners } from "@reduxjs/toolkit/query";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    ui: uiReducer,
    apiData: apiDataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

// Enables refetchOnFocus / refetchOnReconnect when those flags are set on createApi.
setupListeners(store.dispatch);
