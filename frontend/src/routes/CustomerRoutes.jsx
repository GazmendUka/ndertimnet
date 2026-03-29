import { Routes, Route } from "react-router-dom";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/layout/Layout";
import OnboardingGuard from "./OnboardingGuard";

import CustomerDashboard from "../pages/customer/CustomerDashboard";
import CustomerProfile from "../pages/profile/CustomerProfile";
import JobRequestCreate from "../pages/jobrequests/JobRequestCreate";
import JobRequestEdit from "../pages/jobrequests/JobRequestEdit";
import CustomerOfferDetailsPage from "../pages/customer/CustomerOfferDetailsPage";

export default function CustomerRoutes() {
  return (
    <PrivateRoute roles={["customer"]}>
      <OnboardingGuard>
        <Layout>
          <Routes>
            {/* ✅ DASHBOARD */}
            <Route path="/" element={<CustomerDashboard />} />

            {/* PROFILE */}
            <Route path="profile" element={<CustomerProfile />} />

            {/* JOB REQUESTS */}
            <Route path="jobrequests/create" element={<JobRequestCreate />} />
            <Route path="jobrequests/:id/edit" element={<JobRequestEdit />} />

            {/* OFFERS */}
            <Route path="offers/:id" element={<CustomerOfferDetailsPage />} />
          </Routes>
        </Layout>
      </OnboardingGuard>
    </PrivateRoute>
  );
}