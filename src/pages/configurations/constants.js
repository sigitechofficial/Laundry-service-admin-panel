export const generateStrings = (type) => {
  switch (type) {
    case "Cancellation policy":
      return {
        title: "Cancellation policy",
        text: "Set the minimum notice period required for cancellations. A stricter policy reduces last-minute cancellations, while a flexible one improves customer experience.",
        label: "Enter the number of hours before pickup a customer can cancel",
        subtext:
          "Customers must cancel within this timeframe to avoid penalties or late cancellation fees.",
        placeholder: "Hours...",
      };

    case "Reschedule Policy":
      return {
        title: "Reschedule policy",
        text: "Control how often a customer can modify their pickup or drop-off schedule. A lower limit reduces operational disruptions, while a higher limit gives more flexibility.",
        label: "Enter the maximum number of reschedules allowed",
        subtext:
          "Once the limit is reached, customers will not be able to change their pickup/drop-off times.",
        placeholder: "5 times",
      };

    case "Schedule policy":
      return {
        title: "Schedule Booking policy",
        text: "Define how many days in advance a customer can schedule a pickup.",
        label: "Enter the maximum number of days before pickup",
        subtext:
          "Customers will not be able to select a pickup date beyond this limit.",
        placeholder: "Days...",
      };

    case "No show policy":
      return {
        title: "no show policy",
        text: "Set the rules for handling customers who fail to be available for pickup. This helps reduce lost time and ensures better service management.",
        label: "Enter a fixed penalty amount",
        subtext:
          "The driver arrived for pickup/drop-off, but the customer was unavailable. The booking remains active, but penalties may apply based on the no-show policy.",
        placeholder: "Amount...",
      };

    default:
      return "Schedule Booking policy";
  }
};
