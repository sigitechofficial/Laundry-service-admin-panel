// Initial states for Redux store

export const INITIAL_STATE_API = {
  services: [],
  preferences: [],
  categories: [],
  subCategories: [],
  servicesLinkedPreferences: [],
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
};

export const SEARCH_ACTION_TYPES = {
  SET_SEARCH_VALUE: "search/setSearchValue",
  CLEAR_SEARCH: "search/clearSearch",
  ADD_TO_HISTORY: "search/addToHistory",
  CLEAR_HISTORY: "search/clearHistory",
};
