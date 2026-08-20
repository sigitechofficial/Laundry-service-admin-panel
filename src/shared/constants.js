// xs, extra-small: 0px
// sm, small: 600px
// md, medium: 900px
// lg, large: 1200px
// xl, extra-large: 1536px

export const breakPoints = {
  desktop: "(min-width:1536px)",
  laptop: "(min-width:1020px)",
  Tablet: "(min-width:640px)",
  mobile: "(min-width:320px)",
};

export const sidebarHide = "(max-width:1020px)";

export const dateTimeFormat = "DD MMM YYYY HH:mm";

/** Order list tables: stay visible while scrolling horizontally */
export const ORDER_TABLE_STICKY_LEFT_FIELDS = ["orderId", "orderPlacedAt"];
export const ORDER_TABLE_STICKY_RIGHT_FIELDS = ["OrderStatus", "actions"];

/** Shop list tables: stay visible while scrolling horizontally */
export const SHOP_TABLE_STICKY_LEFT_FIELDS = ["name"];
export const SHOP_TABLE_STICKY_RIGHT_FIELDS = ["status", "actions"];
