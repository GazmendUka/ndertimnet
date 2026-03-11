import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./auth/AuthContext";

/* ERROR HANDLING */
import ErrorBoundary from "./components/ErrorBoundary";

/* ROUTE GUARDS */
import PrivateRoute from "./components/PrivateRoute";
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import OnboardingGuard from "./routes/OnboardingGuard";

/* LAYOUT */
import Layout from "./components/layout/Layout";

/* AUTH PAGES */
import Login from "./auth/Login";
import RegisterChoice from "./auth/RegisterChoice";
import RegisterCompany from "./auth/RegisterCompany";
import RegisterCustomer from "./auth/RegisterCustomer";
import RegisterSuccess from "./auth/RegisterSuccess";
import VerifyEmail from "./auth/VerifyEmail";
import AuthRedirect from "./auth/AuthRedirect";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

/* LAZY LOADED PAGES */

// CUSTOMER
const CustomerDashboard = lazy(() =>
  import("./pages/customer/CustomerDashboard")
);

const CustomerProfile = lazy(() =>
  import("./pages/profile/CustomerProfile")
);

const CustomerOfferDetailsPage = lazy(() =>
  import("./pages/customer/CustomerOfferDetailsPage")
);

// JOBREQUESTS
const JobRequestCreate = lazy(() =>
  import("./pages/jobrequests/JobRequestCreate")
);

const JobRequestEdit = lazy(() =>
  import("./pages/jobrequests/JobRequestEdit")
);

const JobRequestList = lazy(() =>
  import("./pages/jobrequests/JobRequestList")
);

const RoleBasedJobRequestDetail = lazy(() =>
  import("./pages/jobrequests/RoleBasedJobRequestDetail")
);

// COMPANY
const CompanyDashboard = lazy(() =>
  import("./pages/company/CompanyDashboard")
);

const CompanyProfile = lazy(() =>
  import("./pages/profile/CompanyProfile")
);

const MyLeads = lazy(() =>
  import("./pages/company/MyLeads")
);

const LeadDetailsPage = lazy(() =>
  import("./pages/leads/LeadDetailsPage")
);

const OfferEdit = lazy(() =>
  import("./pages/company/OfferEdit")
);

const OfferDetails = lazy(() =>
  import("./pages/company/OfferDetails")
);

function App() {
  return (
    <AuthProvider>

      <ErrorBoundary>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { zIndex: 99999 },
            error: {
              style: {
                background: "#FEE2E2",
                color: "#991B1B",
              },
            },
            success: {
              style: {
                background: "#DCFCE7",
                color: "#166534",
              },
            },
          }}
        />

        <Router>

          <Suspense fallback={<div style={{ padding: 40 }}>Loading page...</div>}>

            <Routes>

              {/* ======================================
                  PUBLIC ROUTES
              ====================================== */}

              <Route path="/" element={<AuthRedirect />} />
              <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

              <Route path="/register" element={<RegisterChoice />} />
              <Route path="/register/company" element={<RegisterCompany />} />
              <Route path="/register/customer" element={<RegisterCustomer />} />
              <Route path="/register/success" element={<RegisterSuccess />} />

              <Route path="/verify-email" element={<VerifyEmail />} />

              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />


              {/* ======================================
                  SHARED ROUTES (CUSTOMER + COMPANY)
              ====================================== */}

              <Route element={<OnboardingGuard />}>
                <Route element={<PrivateRoute />}>
                  <Route element={<Layout />}>

                    <Route path="/jobrequests" element={<JobRequestList />} />
                    <Route path="/jobrequests/:id" element={<RoleBasedJobRequestDetail />} />

                  </Route>
                </Route>
              </Route>


              {/* ======================================
                  CUSTOMER ROUTES
              ====================================== */}

              <Route element={<OnboardingGuard />}>
                <Route element={<PrivateRoute roles={["customer"]} />}>
                  <Route element={<Layout />}>

                    <Route path="/dashboard/customer" element={<CustomerDashboard />} />

                    <Route path="/profile/customer" element={<CustomerProfile />} />

                    <Route path="/jobrequests/create" element={<JobRequestCreate />} />

                    <Route path="/jobrequests/:id/edit" element={<JobRequestEdit />} />

                    <Route path="/customer/offers/:id" element={<CustomerOfferDetailsPage />} />

                  </Route>
                </Route>
              </Route>


              {/* ======================================
                  COMPANY ROUTES
              ====================================== */}

              <Route element={<OnboardingGuard />}>
                <Route element={<PrivateRoute roles={["company"]} />}>
                  <Route element={<Layout />}>

                    <Route path="/dashboard/company" element={<CompanyDashboard />} />

                    <Route path="/profile/company" element={<CompanyProfile />} />

                    <Route path="/company/jobrequests/:jobId/offer/edit" element={<OfferEdit />} />

                    <Route path="/leads/mine" element={<MyLeads />} />

                    <Route path="/leads/:id" element={<LeadDetailsPage />} />

                    <Route path="/company/offers/:id" element={<OfferDetails />} />

                  </Route>
                </Route>
              </Route>


              {/* ======================================
                  404 FALLBACK
              ====================================== */}

              <Route
                path="*"
                element={<div style={{ padding: 40 }}>Page not found</div>}
              />

            </Routes>

          </Suspense>

        </Router>

      </ErrorBoundary>

    </AuthProvider>
  );
}

export default App;