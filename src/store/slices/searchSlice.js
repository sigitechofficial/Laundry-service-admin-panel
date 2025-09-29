import { createSlice } from "@reduxjs/toolkit";
import { INITIAL_SEARCH_STATE } from "./constants";

const searchSlice = createSlice({
  name: "search",
  initialState: INITIAL_SEARCH_STATE,
  reducers: {
    setSearchValue: (state, action) => {
      state.searchValue = action.payload;
    },

    clearSearch: (state) => {
      state.searchValue = "";
    },

    addToHistory: (state, action) => {
      const value = action.payload;
      if (value && !state.searchHistory.includes(value)) {
        state.searchHistory.unshift(value);
        if (state.searchHistory.length > 10) {
          state.searchHistory.pop();
        }
      }
    },

    clearHistory: (state) => {
      state.searchHistory = [];
    },
  },
});

export const { setSearchValue, clearSearch, addToHistory, clearHistory } =
  searchSlice.actions;

export default searchSlice.reducer;
