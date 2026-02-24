// frontend/src/App.js 

import { Toaster } from "react-hot-toast";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";

/* ROUTE GUARDS */
import PrivateRoute from "./components/PrivateRoute";

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
import PublicOnlyRoute from "./auth/PublicOnlyRoute";
import OnboardingGuard from "./routes/OnboardingGuard";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

/* CUSTOMER PAGES */
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerProfile from "./pages/profile/CustomerProfile";
import JobRequestCreate from "./pages/jobrequests/JobRequestCreate";
import JobRequestList from "./pages/jobrequests/JobRequestList";
import RoleBasedJobRequestDetail from "./pages/jobrequests/RoleBasedJobRequestDetail";
import CustomerOfferDetailsPage from "./pages/customer/CustomerOfferDetailsPage";

/* COMPANY PAGES */
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyProfile from "./pages/profile/CompanyProfile";
import MyLeads from "./pages/company/MyLeads";
import LeadDetailsPage from "./pages/leads/LeadDetailsPage";
import OfferEdit from "./pages/company/OfferEdit";
import OfferDetails from "./pages/company/OfferDetails";

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            zIndex: 99999,
          },
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
        <Routes>

          {/* ======================================
              PUBLIC ROUTES
          ====================================== */}
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/register" element={<RegisterChoice />} />
          <Route path="/register/company" element={<RegisterCompany />} />
          <Route path="/register/customer" element={<RegisterCustomer />} />
          <Route path="/register/success" element={<RegisterSuccess />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
                    
          {/* ======================================
              SHARED ROUTES (CUSTOMER + COMPANY)
              BOTH CAN SEE JOBREQUEST LIST
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
                <Route path="/offers/:id" element={<OfferDetails />} />
              </Route>
            </Route>
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
