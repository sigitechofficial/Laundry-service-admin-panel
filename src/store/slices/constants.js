// Initial states for Redux store

export const INITIAL_STATE_API = {
  services: [],
  preferences: [],
  categories: [],
  subCategories: [],
  customers: [],
  dashboard: [],
  zones: [],
  countries: [],
};

export const INITIAL_UI_STATE = {
  mobileMenuOpen: false,
  sidebarOpen: true,
};

export const INITIAL_SEARCH_STATE = {
  searchValue: "",
  searchHistory: [],
};

// Action types
export const UI_ACTION_TYPES = {
  TOGGLE_MOBILE_MENU: "ui/toggleMobileMenu",
  SET_MOBILE_MENU: "ui/setMobileMenu",
  TOGGLE_SIDEBAR: "ui/toggleSidebar",
  SET_SIDEBAR: "ui/setSidebar",
  RESET_UI_STATE: "ui/resetUiState",
};

export const SEARCH_ACTION_TYPES = {
  SET_SEARCH_VALUE: "search/setSearchValue",
  CLEAR_SEARCH: "search/clearSearch",
  ADD_TO_HISTORY: "search/addToHistory",
  CLEAR_HISTORY: "search/clearHistory",
  RESET_SEARCH_STATE: "search/resetSearchState",
};

export const API_ACTION_TYPES = {
  RESET_API_STATE: "apiData/resetApiState",
};
