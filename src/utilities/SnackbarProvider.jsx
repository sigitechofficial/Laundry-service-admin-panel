// SnackbarProviderWrapper.js

import { SnackbarProvider } from "notistack";

export default function SnackbarProviderWrapper({ children }) {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      autoHideDuration={3000}
    >
      {children}
    </SnackbarProvider>
  );
}
