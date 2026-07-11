import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

import PublicRoutes from "./routes/PublicRoutes";
import CustomerRoutes from "./routes/CustomerRoutes";
import CompanyRoutes from "./routes/CompanyRoutes";
import PrivateRoute from "./components/PrivateRoute";
import Layout from "./components/layout/Layout";
import PublicCompanyProfile from "./pages/company/PublicCompanyProfile";

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);

      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <Routes>

            {/* PUBLIC */}
            {PublicRoutes()}

            {/* CUSTOMER */}
            <Route path="/customer/*" element={<CustomerRoutes />} />

            {/* COMPANY */}
            <Route path="/company/*" element={<CompanyRoutes />} />

            <Route element={<PrivateRoute roles={["customer", "company", "admin"]} />}>
              <Route element={<Layout />}>
                <Route path="/companies/:companyId" element={<PublicCompanyProfile />} />
              </Route>
            </Route>

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
