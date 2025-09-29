// useSnackbarMessage.js
import { useSnackbar } from "notistack";

export default function useToaster() {
  const { enqueueSnackbar } = useSnackbar();

  const showMessage = (message, variant = "default") => {
    enqueueSnackbar(message, { variant });
  };

  return {
    success: (msg) => showMessage(msg, "success"),
    error: (msg) => showMessage(msg, "error"),
    info: (msg) => showMessage(msg, "info"),
    warning: (msg) => showMessage(msg, "warning"),
  };
}
