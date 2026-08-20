import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineBanner from "./components/shared/OfflineBanner";
import Component from "./routes/Component";
import { GoogleMapsProvider } from "./utilities/GoogleMapsProvider";
import SnackbarProviderWrapper from "./utilities/SnackbarProvider";

function App() {
  return (
    <div className="w-full">
      <GoogleMapsProvider>
        <BrowserRouter>
          <SnackbarProviderWrapper>
            <ErrorBoundary>
              <OfflineBanner />
              <Component />
            </ErrorBoundary>
          </SnackbarProviderWrapper>
        </BrowserRouter>
      </GoogleMapsProvider>
    </div>
  );
}

export default App;
