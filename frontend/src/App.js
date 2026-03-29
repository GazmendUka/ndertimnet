import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

import PublicRoutes from "./routes/PublicRoutes";
import CustomerRoutes from "./routes/CustomerRoutes";
import CompanyRoutes from "./routes/CompanyRoutes";

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <Routes>

            {/* PUBLIC */}
            {PublicRoutes()}

            {/* CUSTOMER */}
            <Route index element={<CustomerDashboard />} />

            {/* COMPANY */}
            <Route index element={<CompanyDashboard />} />

            {/* FALLBACK */}
            <Route
              path="*"
              element={<div style={{ padding: 40 }}>Page not found</div>}
            />

          </Routes>
        </Router>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;