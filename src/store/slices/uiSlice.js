import { createSlice } from "@reduxjs/toolkit";
import { INITIAL_UI_STATE } from "./constants";

const uiSlice = createSlice({
  name: "ui",
  initialState: INITIAL_UI_STATE,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setNetworkOffline: (state, action) => {
      state.isOffline = Boolean(action.payload);
    },
  },
});

export const { toggleSidebar, setNetworkOffline } = uiSlice.actions;

export default uiSlice.reducer;
