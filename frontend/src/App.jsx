import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { MetricsProvider } from "./context/MetricsContext.jsx";
import { CrawlerPage } from "./pages/CrawlerPage.jsx";
import { LogsPage } from "./pages/LogsPage.jsx";
import { SearchPage } from "./pages/SearchPage.jsx";

export default function App() {
  return (
    <MetricsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<CrawlerPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="crawler" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MetricsProvider>
  );
}
