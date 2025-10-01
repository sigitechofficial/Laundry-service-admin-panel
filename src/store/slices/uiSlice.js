import { createSlice } from "@reduxjs/toolkit";
import { INITIAL_STATE_API, INITIAL_UI_STATE } from "./constants";

const uiSlice = createSlice({
  name: "ui",
  initialState: INITIAL_UI_STATE,
  reducers: {
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenu: (state, action) => {
      state.mobileMenuOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebar: (state, action) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleMobileMenu, setMobileMenu, toggleSidebar, setSidebar } =
  uiSlice.actions;

export default uiSlice.reducer;
