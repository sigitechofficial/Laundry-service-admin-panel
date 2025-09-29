import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import searchReducer from "./slices/searchSlice";
import { api } from "./services/api";
import apiDataReducer from "./services/apiReducer";
import { setupListeners } from "@reduxjs/toolkit/query";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    ui: uiReducer,
    search: searchReducer,
    apiData: apiDataReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch);
