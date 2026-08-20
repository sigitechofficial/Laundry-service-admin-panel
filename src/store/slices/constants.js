// Initial states for Redux store

export const INITIAL_STATE_API = {
  services: [],
  addOnServices: [],
  preferences: [],
  categories: [],
  subCategories: [],
  customers: [],
  dashboard: [],
  zones: [],
  countries: [],
  cities: [],
  units: {},
  shops: [],
  employees: [],
};

export const INITIAL_UI_STATE = {
  sidebarOpen: true,
  isOffline: typeof navigator !== "undefined" && navigator.onLine === false,
};
