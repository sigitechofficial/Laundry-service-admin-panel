import { Box, ThemeProvider } from "@mui/material";
import { theme } from "./shared/theme";
import { BrowserRouter } from "react-router-dom";
import Component from "./routes/Component";
import SnackbarProviderWrapper from "./utilities/SnackbarProvider";

function App() {
  return (
    <div className="w-full">
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <SnackbarProviderWrapper>
            <Component />
          </SnackbarProviderWrapper>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
